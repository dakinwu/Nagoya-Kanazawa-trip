import { exportBackup } from "@/lib/local-api";
import { localApi } from "@/lib/local-api";
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { Map as LeafletMap, LayerGroup, TileLayer } from "leaflet";
import {
  AlertTriangle, BedDouble, CalendarDays, Check, ChevronDown, ChevronUp, CircleDollarSign,
  ChefHat, Clock3, CloudSun, ExternalLink, GripVertical, Hotel, ListChecks, LoaderCircle, LocateFixed,
  MapPin, Moon, Navigation, PackageCheck, Plus, RotateCcw, Search, Share2, Sun,
  ShoppingBag, Star, Store, Trash2, Video, X,
} from "lucide-react";
import { toast } from "sonner";
import { ShoppingSheet } from "@/components/shopping-hub";
import { StoreDirectory } from "@/components/store-directory";
import { LiveCameras } from "@/components/live-cameras";
import { applicableTravelLeg, type SavedLeg } from "@/lib/travel-leg";
import { googleRouteUrl } from "@/lib/google-route";
import { clusterStores } from "@/lib/store-clusters";
import { AddStoreDialog } from "@/components/store-dialog";
import type { StorePlace } from "@/lib/store-data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { importedFoodPlaces, mealPeriods, type FoodPlace } from "@/lib/food-data";
import { reorderAndReflow, reflow, durationOf, dayStart, formatClock, readTime, withHotelEndpoints, correctNavigation, reviewStayDurations } from "@/lib/timing";
import { planEarlyStarts } from "@/lib/early-starts";
import { withoutBackupPlans } from "@/lib/without-backup-plans";
import { replaceKanazawaHotel } from "@/lib/kanazawa-hotel";
import { reviewRouteSchedule } from "@/lib/route-schedule-review";
import { useTripSync } from "@/lib/use-trip-sync";
import { budgetCategories, hotelOptions, hotelsForDay, initialDays, placeCatalog, type Place, type Priority, type TripDay, type TripItem } from "@/lib/trip-data";

type Budget = Record<string, number>;
type TravelLeg = SavedLeg;
type PlannerState = {
  days: TripDay[];
  hotelBooked: boolean;
  packing: { id: string; label: string; done: boolean }[];
  reservations: { id: string; label: string; day: number; status: "pending" | "booked" }[];
  budgets: Record<number, Budget>;
  travelLegs: Record<string, TravelLeg>;
};

const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));

const makeBudgets = () => Object.fromEntries(initialDays.map((d) => [d.day, Object.fromEntries(budgetCategories.map((c) => [c, 0]))]));
const defaultState: PlannerState = correctNavigation({
  days: planEarlyStarts(reviewStayDurations(withHotelEndpoints(initialDays, hotelOptions))), hotelBooked: false,
  packing: ["護照／Visit Japan Web", "保暖防水外套", "雪地止滑鞋", "行動電源", "常備藥", "行李宅配資料"].map((label, i) => ({ id: `pack-${i}`, label, done: false })),
  reservations: [
    { id: "r1", label: "金澤 → 白川鄉高速巴士", day: 3, status: "pending" },
    { id: "r2", label: "白川鄉 → 高山高速巴士", day: 3, status: "pending" },
    { id: "r3", label: "高山／飛驒古川 → 名古屋", day: 4, status: "pending" },
    { id: "r4", label: "Pokémon Center NAGOYA 入場規則", day: 6, status: "pending" },
  ],
  budgets: makeBudgets(),
  travelLegs: {},
}, placeCatalog);
defaultState.days = withoutBackupPlans(reviewRouteSchedule(defaultState.days));

const hotelItemAssignments = Object.fromEntries([
  ["d1-4", "金澤站 → Hotel Torifito 寄放行李", "torifito-kanazawa"],
  ["d1-8", "Hotel Torifito Kanazawa 入住＋休息", "torifito-kanazawa"],
  ["d3-6", "Hotel and Spa Gift TAKAYAMA 入住", "gift-takayama"],
  ["d4-13", "GRAND BASE Nagoya Eki Nishi 入住", "grand-base-nagoya"],
  ["d8-2", "GRAND BASE Nagoya Eki Nishi 退房", "grand-base-nagoya"],
].map(([id, title, hotelId]) => [id, { title, place: hotelOptions.find((hotel) => hotel.id === hotelId)!.place }])) as Record<string, { title: string; place: Place }>;

const applyHotelAssignments = (days: TripDay[]) => days.map((tripDay) => ({
  ...tripDay,
  items: tripDay.items.map((tripItem) => {
    const assignment = hotelItemAssignments[tripItem.id];
    return assignment ? { ...tripItem, ...assignment, verification: "confirmed" as const, notes: undefined } : tripItem;
  }),
}));

const normalizeState = (value: Partial<PlannerState>): PlannerState => ({
  hotelBooked: Boolean(value.hotelBooked),
  days: withoutBackupPlans(applyHotelAssignments(replaceKanazawaHotel(Array.isArray(value.days) ? value.days : defaultState.days, hotelOptions[0].place))),
  packing: Array.isArray(value.packing) ? value.packing : defaultState.packing,
  reservations: Array.isArray(value.reservations) ? value.reservations : defaultState.reservations,
  budgets: value.budgets ?? defaultState.budgets,
  travelLegs: value.travelLegs ?? {},
});

const priorityLabel: Record<Priority, string> = { core: "核心", flexible: "彈性", cut: "可略過" };
const priorityClass: Record<Priority, string> = { core: "priority-core", flexible: "priority-flexible", cut: "priority-cut" };
const travelLegKey = (from: TripItem, to: TripItem) => `${from.id}>${to.id}`;
const scheduleTravel = (legs: Record<string, TravelLeg>) => (from: TripItem, to: TripItem) => {
  if (!from.place || !to.place) return 0;
  const saved = applicableTravelLeg(legs[travelLegKey(from, to)], from, to);
  if (saved) return saved.minutes;
  // Retain previously allocated buffers, but do not invent estimates for new routes.
  return 0;
};

const mapTile = { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors" };

function TripMap({ days, activeDay, dayFocusKey, items, selectedId, onSelect, activeHotel, hotelFocus, onSelectHotel, allTrip, foodPlaces, selectedFoodId, onSelectFood, showFood, stores, selectedStoreId, onSelectStore, showStores, pickingStore, onPickStore }: {
  hotelFocus: { id: string; key: number } | null; onSelectHotel: (id: string) => void;
  stores: StorePlace[]; selectedStoreId: string | null; onSelectStore: (id: string) => void; showStores: boolean;
  pickingStore: boolean; onPickStore: (position: { latitude: number; longitude: number }) => void;
  dayFocusKey: number;
  days: TripDay[]; activeDay: number; items: TripItem[]; selectedId: string | null; onSelect: (id: string) => void;
  activeHotel: (typeof hotelOptions)[number] | undefined; allTrip: boolean;
  foodPlaces: FoodPlace[]; selectedFoodId: string | null; onSelectFood: (id: string) => void; showFood: boolean;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const tileRef = useRef<TileLayer | null>(null);
  const fitSignatureRef = useRef("");
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const handlers = useRef({ onSelect, onSelectFood, onSelectStore, onSelectHotel, onPickStore, pickingStore });
  handlers.current = { onSelect, onSelectFood, onSelectStore, onSelectHotel, onPickStore, pickingStore };

  const render = useCallback(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    layerRef.current?.remove();
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;
    const mapped = (allTrip ? days.flatMap((d) => d.items) : items).filter((x) => x.place);
    const points: [number, number][] = [];
    mapped.forEach((entry, mappedIndex) => {
      const place = entry.place!;
      points.push([place.latitude, place.longitude]);
      // Hotels have their own permanent layer, independent of itinerary filters.
      if (hotelOptions.some(hotel => hotel.place.id === place.id)) return;
      const isHotelStop = !allTrip && entry.type === "lodging" && place.id === activeHotel?.place.id;
      const dayIndex = days.find((day) => day.day === entry.day)?.items.filter((item) => item.place).findIndex((item) => item.id === entry.id) ?? mappedIndex;
      const markerText = allTrip ? `D${entry.day}` : isHotelStop ? "H" : String(dayIndex + 1);
      const icon = L.divIcon({
        className: "trip-marker-wrap",
        html: `<button class="trip-marker ${entry.id === selectedId ? "is-selected" : ""} ${isHotelStop ? "hotel-marker" : priorityClass[entry.priority]}" aria-label="${escapeHtml(entry.title)}"><span>${markerText}</span></button>`,
        iconSize: [44, 48], iconAnchor: [22, 43],
      });
      L.marker([place.latitude, place.longitude], { icon, zIndexOffset: entry.id === selectedId ? 2000 : 200 }).addTo(group).on("click", () => handlers.current.pickingStore ? map.panTo([place.latitude, place.longitude], { animate: false }) : handlers.current.onSelect(entry.id));
    });
    if (!allTrip && mapped.length > 1) {
      L.polyline(mapped.map((x) => [x.place!.latitude, x.place!.longitude] as [number, number]), {
        color: "#1d4ed8", weight: 4, opacity: .85, dashArray: "9 9",
      }).addTo(group);
    }
    const mapHotels = hotelsForDay(activeDay, allTrip);
    mapHotels.forEach(({ hotel, current, label }) => {
      const { latitude, longitude } = hotel.place;
      points.push([latitude, longitude]);
      const selected = hotelFocus?.id === hotel.id || mapped.some(entry => entry.id === selectedId && entry.place?.id === hotel.place.id);
      const icon = L.divIcon({ className: "trip-marker-wrap", html: `<button class="trip-marker hotel-marker ${current ? "" : "hotel-previous"} ${selected ? "is-selected" : ""}" aria-label="${label} · ${hotel.name}"><span>H</span></button>`, iconSize: [44, 48], iconAnchor: [22, 43] });
      L.marker([latitude, longitude], { icon, zIndexOffset: selected ? 2000 : 300 }).addTo(group).bindTooltip(`${label} · ${hotel.name}`).on("click", () => { if (handlers.current.pickingStore) map.panTo([latitude, longitude], { animate: false }); else handlers.current.onSelectHotel(hotel.id); });
    });
    if (showFood) foodPlaces.forEach((place, index) => {
      if (place.latitude === null || place.longitude === null) return;
      points.push([place.latitude, place.longitude]);
      const icon = L.divIcon({
        className: "trip-marker-wrap",
        html: `<span class="food-marker ${place.id === selectedFoodId ? "is-selected" : ""}" role="button" aria-label="美食 F${index + 1}"><b>F${index + 1}</b></span>`,
        iconSize: [44, 44], iconAnchor: [22, 22],
      });
      L.marker([place.latitude, place.longitude], { icon, zIndexOffset: place.id === selectedFoodId ? 2000 : 100 }).addTo(group).on("click", () => handlers.current.pickingStore ? map.panTo([place.latitude!, place.longitude!], { animate: false }) : handlers.current.onSelectFood(place.id));
    });
    const firstPlace = days.find((day) => day.day === activeDay)?.items.find((entry) => entry.place)?.place;
    const fitSignature = allTrip ? ["all", ...mapped.map((entry) => entry.id)].join("|") : `day-${activeDay}-${dayFocusKey}-${firstPlace?.id ?? "empty"}`;
    if (fitSignatureRef.current !== fitSignature) {
      fitSignatureRef.current = fitSignature;
      map.stop();
      if (!allTrip && firstPlace) map.setView([firstPlace.latitude, firstPlace.longitude], 15, { animate: false });
      else if (allTrip && points.length === 1) map.setView(points[0], 14);
      else if (allTrip && points.length) map.fitBounds(points, { padding: [54, 54], maxZoom: 14 });
    }
  }, [activeDay, dayFocusKey, activeHotel, hotelFocus, allTrip, days, foodPlaces, items, selectedFoodId, selectedId, showFood]);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !nodeRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(nodeRef.current, { zoomControl: false, attributionControl: true }).setView([36.0, 137.0], 7);
      tileRef.current = L.tileLayer(mapTile.url, { maxZoom: 19, attribution: mapTile.attribution }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;
      map.invalidateSize();
      setMapReady(true);
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize({ pan: false }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { if (mapReady) render(); }, [render, mapReady]);
  useEffect(() => {
    const map = mapRef.current, L = leafletRef.current;
    if (!mapReady || !map || !L || !showStores) return;
    const group = L.layerGroup().addTo(map);
    let closed = false, refreshFrame = 0;
    const draw = () => {
      if (closed || group.getLayers().some(layer => layer.isPopupOpen())) return;
      group.clearLayers();
      const bounds = map.getBounds().pad(.15);
      const visible = stores.filter(store => bounds.contains([store.latitude, store.longitude]));
      const clusters = clusterStores(visible.filter(store => store.id !== selectedStoreId), store => map.latLngToContainerPoint([store.latitude, store.longitude]));
      const selected = visible.find(store => store.id === selectedStoreId);
      if (selected) clusters.push([selected]);
      for (const cluster of clusters) {
        const store = cluster[0];
        const latitude = cluster.reduce((sum, item) => sum + item.latitude, 0) / cluster.length;
        const longitude = cluster.reduce((sum, item) => sum + item.longitude, 0) / cluster.length;
        const element = document.createElement("span");
        element.className = `store-marker ${cluster.length > 1 ? "store-cluster" : ""} ${store.id === selectedStoreId ? "is-selected" : ""}`;
        const title = cluster.length > 1 ? `${cluster.length} 間商店，點擊展開` : store.name;
        element.setAttribute("aria-label", title);
        if (cluster.length > 1) element.textContent = String(cluster.length);
        else element.innerHTML = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l2-6h14l2 6M3 9h18M4 9v12h16V9M9 21v-8h6v8M3 9c0 4 6 4 6 0 0 4 6 4 6 0 0 4 6 4 6 0"/></svg>';
        const icon = L.divIcon({ className: "trip-marker-wrap", html: element, iconSize: [40, 40], iconAnchor: [20, 20] });
        const marker = L.marker([latitude, longitude], { icon, title, zIndexOffset: store.id === selectedStoreId ? 1000 : 100 }).addTo(group);
        if (cluster.length === 1) marker.on("click", () => {
          if (handlers.current.pickingStore) map.panTo([latitude, longitude], { animate: false });
          else handlers.current.onSelectStore(store.id);
        });
        else {
          // A scrollable list also works for several shops at identical coordinates.
          marker.bindPopup(() => {
            const list = document.createElement("div");
            list.className = "store-cluster-list";
            let offset = 0;
            const more = document.createElement("button");
            const append = () => {
              more.remove();
              for (const item of cluster.slice(offset, offset + 30)) {
                const button = document.createElement("button");
                button.textContent = item.name;
                button.onclick = () => { map.closePopup(); handlers.current.onSelectStore(item.id); };
                list.append(button);
              }
              offset += 30;
              if (offset < cluster.length) { more.textContent = "顯示更多商店"; list.append(more); }
            };
            more.onclick = append;
            append();
            return list;
          }, { maxHeight: Math.max(80, Math.min(240, map.getSize().y - 120)), maxWidth: 280, autoPanPaddingTopLeft: L.point(12, 20), autoPanPaddingBottomRight: L.point(12, 28) });
        }
      }
    };
    draw();
    const afterPopupClose = () => { cancelAnimationFrame(refreshFrame); refreshFrame = requestAnimationFrame(draw); };
    map.on("moveend resize", draw);
    map.on("popupclose", afterPopupClose);
    return () => { closed = true; cancelAnimationFrame(refreshFrame); map.off("moveend resize", draw); map.off("popupclose", afterPopupClose); group.remove(); };
  }, [mapReady, stores, showStores, selectedStoreId]);
  useEffect(() => {
    const entry = days.flatMap((d) => d.items).find((x) => x.id === selectedId);
    if (!allTrip && entry?.place && entry.day === activeDay && mapRef.current) mapRef.current.panTo([entry.place.latitude, entry.place.longitude], { animate: true, duration: .45 });
  }, [activeDay, days, selectedId]);
  useEffect(() => {
    const place = foodPlaces.find((entry) => entry.id === selectedFoodId);
    if (place && place.latitude !== null && place.longitude !== null && mapRef.current) mapRef.current.panTo([place.latitude, place.longitude], { animate: true, duration: .45 });
  }, [foodPlaces, selectedFoodId]);

  useEffect(() => {
    if (!mapReady || !showStores || pickingStore) return;
    const store = stores.find((entry) => entry.id === selectedStoreId);
    if (store) {
      const map = mapRef.current!;
      if (!map.getBounds().contains([store.latitude, store.longitude]) || map.getZoom() < 14) map.setView([store.latitude, store.longitude], 16);
      else map.panTo([store.latitude, store.longitude], { animate: true, duration: .45 });
    }
  }, [selectedStoreId, stores, showStores, mapReady, pickingStore]);
  useEffect(() => {
    if (!mapReady || pickingStore || !hotelFocus) return;
    const hotel = hotelOptions.find(item => item.id === hotelFocus.id);
    const map = mapRef.current;
    if (!hotel || !map) return;
    const point: [number, number] = [hotel.place.latitude, hotel.place.longitude];
    map.stop();
    if (map.getZoom() < 15 || !map.getBounds().contains(point)) map.setView(point, 16, { animate: false });
    else map.panTo(point, { animate: true, duration: .45 });
  }, [hotelFocus, mapReady, pickingStore]);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !pickingStore) return;
    const update = () => { const center = map.getCenter(); handlers.current.onPickStore({ latitude: center.lat, longitude: center.lng }); };
    const pick = (event: import("leaflet").LeafletMouseEvent) => { map.panTo(event.latlng, { animate: false }); update(); };
    update();
    map.on("click", pick);
    map.on("moveend resize", update);
    return () => { map.off("click", pick); map.off("moveend resize", update); };
  }, [mapReady, pickingStore]);
  // Leaflet adds its own classes: keep React's className constant across mode changes.
  return <div ref={nodeRef} className="trip-map" data-picking={pickingStore || undefined} aria-label="互動式行程地圖" />;
}

function FoodMap({ places, selectedId, onSelect }: { places: FoodPlace[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const render = useCallback(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    layerRef.current?.remove();
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;
    const mapped = places.filter((place) => place.latitude !== null && place.longitude !== null);
    mapped.forEach((place, index) => {
      const icon = L.divIcon({
        className: "trip-marker-wrap",
        html: `<span class="food-marker ${place.id === selectedId ? "is-selected" : ""}" role="button" aria-label="美食 F${index + 1}"><b>F${index + 1}</b></span>`,
        iconSize: [44, 44], iconAnchor: [22, 22],
      });
      const marker = L.marker([place.latitude!, place.longitude!], { icon, zIndexOffset: place.id === selectedId ? 2000 : 100 }).addTo(group);
      marker.getElement()?.addEventListener("click", (event) => { event.stopPropagation(); onSelect(place.id); });
    });
    if (mapped.length === 1) map.setView([mapped[0].latitude!, mapped[0].longitude!], 15);
    else if (mapped.length) map.fitBounds(mapped.map((place) => [place.latitude!, place.longitude!] as [number, number]), { padding: [60, 60], maxZoom: 14 });
  }, [onSelect, places, selectedId]);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !nodeRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(nodeRef.current, { zoomControl: false, attributionControl: true }).setView([35.55, 136.75], 8);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;
      setTimeout(() => { map.invalidateSize(); render(); }, 60);
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);
  useEffect(() => { render(); }, [render]);
  useEffect(() => {
    const place = places.find((entry) => entry.id === selectedId);
    if (place && place.latitude !== null && place.longitude !== null && mapRef.current) {
      mapRef.current.flyTo([place.latitude, place.longitude], Math.max(mapRef.current.getZoom(), 15), { duration: .55 });
    }
  }, [places, selectedId]);
  return <div ref={nodeRef} className="trip-map" aria-label="互動式美食地圖" />;
}

function AddFoodDialog({ open, onOpenChange, canEdit, onAdded }: {
  open: boolean; onOpenChange: (value: boolean) => void; canEdit: boolean; onAdded: (place: FoodPlace) => void;
}) {
  const [form, setForm] = useState({ name: "", googleMapsUrl: "", city: "名古屋" as FoodPlace["city"], category: "晚餐" as FoodPlace["category"], notes: "" });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.name.trim() || !form.googleMapsUrl.trim()) return toast.error("請填寫店名與 Google Maps 連結");
    setSaving(true);
    try {
      const response = await localApi("/api/places", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "儲存失敗");
      onAdded(data.place as FoodPlace);
      setForm({ name: "", googleMapsUrl: "", city: "名古屋", category: "晚餐", notes: "" });
      onOpenChange(false);
      toast.success("地點已加入這個瀏覽器的美食地圖");
    } catch (error) { toast.error(error instanceof Error ? error.message : "暫時無法儲存地點"); }
    finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="add-dialog">
      <DialogHeader><DialogTitle>自行新增地點</DialogTitle><DialogDescription>新增地點儲存在這個瀏覽器，不會自動分享給旅伴。</DialogDescription></DialogHeader>
      {!canEdit ? <div className="signin-panel"><Store/><strong>目前無法新增地點</strong><span>請確認瀏覽器允許儲存網站資料，再重新載入。</span></div>
        : <div className="food-form">
          <label><span>店名</span><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如：世界の山ちゃん"/></label>
          <label><span>Google Maps 連結</span><Input value={form.googleMapsUrl} onChange={(event) => setForm({ ...form, googleMapsUrl: event.target.value })} placeholder="https://maps.app.goo.gl/…" inputMode="url"/></label>
          <div className="two-fields"><label><span>城市</span><select value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value as FoodPlace["city"] })}><option>名古屋</option><option>金澤</option><option>其他</option></select></label><label><span>用餐時段</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as FoodPlace["category"] })}>{mealPeriods.map((period) => <option key={period}>{period}</option>)}</select></label></div>
          <label><span>備註（選填）</span><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="想點的餐點、營業時間提醒…"/></label>
          <Button onClick={submit} disabled={saving}>{saving ? <><LoaderCircle className="animate-spin"/>儲存中</> : <><Plus/>加入美食地圖</>}</Button>
        </div>}
    </DialogContent>
  </Dialog>;
}


function AddItemDialog({ open, onOpenChange, day, afterId, onAdd, foodPlaces }: { open: boolean; onOpenChange: (v: boolean) => void; day: number; afterId: string | null; onAdd: (item: Omit<TripItem, "id" | "order" | "completed">) => void; foodPlaces: FoodPlace[] }) {
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState({ name: "", lat: "", lng: "", address: "", url: "" });
  const [note, setNote] = useState({ title: "", time: "", type: "note" as TripItem["type"] });
  const [priority, setPriority] = useState<Priority>("flexible");
  const foodCatalog: Place[] = foodPlaces.filter((place) => place.latitude !== null && place.longitude !== null).map((place) => ({
    id: place.id, name: place.name, latitude: place.latitude!, longitude: place.longitude!, address: place.address,
    city: place.city, category: place.category, verification: "confirmed", googleMapsUrl: place.googleMapsUrl,
  }));
  const results = [...foodCatalog, ...placeCatalog].filter((x) => !query || `${x.name}${x.city}${x.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const finishPlace = (place: Place) => {
    onAdd({ day, time: "時間待定", title: place.name, priority, type: "place", place, verification: place.verification, notes: afterId ? "已插入所選行程之後" : undefined });
    onOpenChange(false); setQuery(""); toast.success("地點已加入，地圖路線已更新");
  };
  const finishManual = () => {
    const lat = Number(manual.lat), lng = Number(manual.lng);
    if (!manual.name || !Number.isFinite(lat) || !Number.isFinite(lng)) return toast.error("請填寫名稱與有效座標");
    finishPlace({ id: `manual-${Date.now()}`, name: manual.name, latitude: lat, longitude: lng, address: manual.address, city: "自訂", category: "自訂", verification: "provisional", googleMapsUrl: manual.url || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` });
    setManual({ name: "", lat: "", lng: "", address: "", url: "" });
  };
  const finishNote = () => {
    if (!note.title.trim()) return toast.error("請輸入項目名稱");
    onAdd({ day, time: note.time || "時間待定", title: note.title.trim(), priority, type: note.type, verification: "provisional" });
    onOpenChange(false); setNote({ title: "", time: "", type: "note" }); toast.success("非地點項目已加入");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="add-dialog">
        <DialogHeader><DialogTitle>新增到 D{day}</DialogTitle><DialogDescription>{afterId ? "會插入在目前選取項目之後" : "會加入目前行程最後方"}</DialogDescription></DialogHeader>
        <div className="priority-picker" aria-label="優先順序">
          {(["core", "flexible", "cut"] as Priority[]).map((p) => <button key={p} className={`${priorityClass[p]} ${priority === p ? "active" : ""}`} onClick={() => setPriority(p)}>{priorityLabel[p]}</button>)}
        </div>
        <Tabs defaultValue="search">
          <TabsList className="w-full"><TabsTrigger value="search">搜尋地點</TabsTrigger><TabsTrigger value="manual">手動地點</TabsTrigger><TabsTrigger value="note">非地點項目</TabsTrigger></TabsList>
          <TabsContent value="search" className="add-panel">
            <div className="search-field"><Search size={17}/><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋兼六園、車站、商店…" /></div>
            <div className="place-results">{results.map((place) => <button key={place.id} onClick={() => finishPlace(place)}><span className="result-icon"><MapPin size={17}/></span><span><strong>{place.name}</strong><small>{place.city} · {place.category}</small></span><Plus size={18}/></button>)}</div>
          </TabsContent>
          <TabsContent value="manual" className="add-panel form-grid">
            <Input placeholder="地點名稱" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })}/>
            <div className="two-fields"><Input placeholder="緯度 Latitude" inputMode="decimal" value={manual.lat} onChange={(e) => setManual({ ...manual, lat: e.target.value })}/><Input placeholder="經度 Longitude" inputMode="decimal" value={manual.lng} onChange={(e) => setManual({ ...manual, lng: e.target.value })}/></div>
            <Input placeholder="地址（選填）" value={manual.address} onChange={(e) => setManual({ ...manual, address: e.target.value })}/><Input placeholder="Google Maps URL（選填）" value={manual.url} onChange={(e) => setManual({ ...manual, url: e.target.value })}/>
            <Button onClick={finishManual}>加入手動地點</Button>
          </TabsContent>
          <TabsContent value="note" className="add-panel form-grid">
            <Input placeholder="項目名稱" value={note.title} onChange={(e) => setNote({ ...note, title: e.target.value })}/><Input placeholder="時間，例如 15:30" value={note.time} onChange={(e) => setNote({ ...note, time: e.target.value })}/>
            <select value={note.type} onChange={(e) => setNote({ ...note, type: e.target.value as TripItem["type"] })}><option value="meal">用餐預留</option><option value="transport">交通備註</option><option value="rest">休息／緩衝</option><option value="reservation">預約提醒</option><option value="note">自由筆記</option></select>
            <Button onClick={finishNote}>加入非地點項目</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function TripPlanner() {
  const [state, setState] = useState<PlannerState>(defaultState);
  const [surface, setSurface] = useState<"trip" | "food">("trip");
  const [foods, setFoods] = useState<FoodPlace[]>(importedFoodPlaces);
  const [foodCity, setFoodCity] = useState<"全部" | FoodPlace["city"]>("全部");
  const [foodMealPeriod, setFoodMealPeriod] = useState("全部");
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [foodLoading, setFoodLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [shoppingScope, setShoppingScope] = useState("all");
  const [stores, setStores] = useState<StorePlace[]>([]);
  const [storesError, setStoresError] = useState("");
  const [storesRetry, setStoresRetry] = useState(0);
  const [showStores, setShowStores] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const [pickingStore, setPickingStore] = useState(false);
  const [pickCandidate, setPickCandidate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [hotelFocus, setHotelFocus] = useState<{ id: string; key: number } | null>(null);
  const previousSheetRatio = useRef(.43);
  const [pickedStore, setPickedStore] = useState<{ latitude: number; longitude: number } | null>(null);
  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const openStore = (id: string) => { setHotelFocus(null); setSelectedStoreId(id); setSelectedId(null); setSelectedFoodId(null); setShowStores(true); };
  const locateHotel = (id: string) => { setSelectedId(null); setSelectedFoodId(null); setSelectedStoreId(null); setHotelFocus(previous => ({ id, key: (previous?.key ?? 0) + 1 })); };
  useEffect(() => {
    const controller = new AbortController();
    setStoresError("");
    setStores([]);
    setSelectedStoreId(null);
    localApi("/api/stores", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (response.status === 401) return;
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!controller.signal.aborted) setStores(data.stores);
    }).catch(() => { if (!controller.signal.aborted) setStoresError("商店暫時無法載入"); });
    return () => controller.abort();
  }, [storesRetry]);
  const [activeDay, setActiveDay] = useState(1);
  const [dayFocusKey, setDayFocusKey] = useState(0);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [allTrip, setAllTrip] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>("d1-1");
  const [priorities, setPriorities] = useState<Priority[]>(["core", "flexible", "cut"]);
  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [camerasOpen, setCamerasOpen] = useState(false);
  const [codeDraft, setCodeDraft] = useState("");
  const [tokenDraft, setTokenDraft] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [panel, setPanel] = useState<"plan" | "today" | "prep" | "budget">("plan");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sheetTopRatio, setSheetTopRatio] = useState(.43);
  const [sheetDragging, setSheetDragging] = useState(false);
  const [showFood, setShowFood] = useState(true);
  const [dark, setDark] = useState(false);
  const [sharedCode, setSharedCode] = useState("HOKURIKU-2027");
  const [hydrated, setHydrated] = useState(false);
  const sync = useTripSync(sharedCode, state, setState, normalizeState, defaultState, hydrated);
  const syncState = sync.status;
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const undoRef = useRef<PlannerState | null>(null);
  const listRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const itineraryDragRef = useRef<{ pointerId: number; itemId: string; targetId: string; startX: number; startY: number; x: number; y: number; moved: boolean; pane: HTMLElement | null; frame: number; button: HTMLButtonElement } | null>(null);
  const sheetDragRef = useRef<{ pointerId: number; startY: number; startRatio: number; height: number; moved: boolean } | null>(null);
  const suppressSheetClickRef = useRef(false);

  const day = state.days.find((d) => d.day === activeDay)!;
  const visibleItems = useMemo(() => day.items.filter((x) => priorities.includes(x.priority)), [day.items, priorities]);
  const selectedItem = state.days.flatMap((d) => d.items).find((x) => x.id === selectedId);
  const activeHotel = hotelOptions.find((hotel) => hotel.days.includes(activeDay));
  const displayedHotel = !allTrip ? activeHotel : undefined;
  const visibleFoods = useMemo(() => foods.filter((place) =>
    (foodCity === "全部" || place.city === foodCity) &&
    (foodMealPeriod === "全部" || place.category === foodMealPeriod)
  ), [foodMealPeriod, foodCity, foods]);
  const selectedFood = visibleFoods.find((place) => place.id === selectedFoodId) ?? null;
  const dayFoodCity: FoodPlace["city"] | null = day.area.includes("金澤") ? "金澤" : day.area.includes("名古屋") ? "名古屋" : null;
  const mapFoods = useMemo(() => foods.filter((place) =>
    place.latitude !== null && place.longitude !== null &&
    (allTrip || (dayFoodCity !== null && place.city === dayFoodCity)) &&
    (foodMealPeriod === "全部" || place.category === foodMealPeriod)
  ), [allTrip, dayFoodCity, foodMealPeriod, foods]);
  const mapSelectedFood = mapFoods.find((place) => place.id === selectedFoodId) ?? null;

  useEffect(() => {
    const savedCode = localStorage.getItem("trip-shared-code");
    const savedTheme = localStorage.getItem("trip-theme");
    if (savedCode) setSharedCode(savedCode);
    if (savedTheme === "dark") setDark(true);
    setHydrated(true);
    navigator.serviceWorker?.register(new URL("./service-worker.js?v=19", document.baseURI)).catch(() => undefined);
  }, []);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("trip-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => {
    let cancelled = false;
    localApi("/api/places").then(async (response) => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!cancelled) { setFoods(data.places ?? importedFoodPlaces); setCanEdit(Boolean(data.canEdit)); }
    }).catch(() => { if (!cancelled) toast.error("自訂地點暫時無法載入，仍可瀏覽匯入清單"); })
      .finally(() => { if (!cancelled) setFoodLoading(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (selectedItem && !priorities.includes(selectedItem.priority)) setSelectedId(null); }, [priorities, selectedItem]);
  useEffect(() => { if (hydrated) localStorage.setItem("trip-shared-code", sharedCode); }, [hydrated, sharedCode]);

  const mutate = (fn: (current: PlannerState) => PlannerState, remember = false) => {
    if (!sync.ready) { toast.warning("請先完成共用行程載入，再開始編輯"); return; }
    setState((current) => { if (remember) undoRef.current = current; return fn(current); });
  };
  const chooseDay = (dayNumber: number) => {
    setHotelFocus(null);
    setSelectedStoreId(null);
    const first = state.days.find((d) => d.day === dayNumber)?.items.find((entry) => entry.place);
    setSurface("trip"); setAllTrip(false); setActiveDay(dayNumber); setPanel("plan");
    setPriorities(["core", "flexible", "cut"]);
    setSelectedFoodId(null); setEditingTimeId(null); setSelectedId(first?.id ?? null);
    setDayFocusKey((value) => value + 1);
    workspaceRef.current?.querySelector(".pane-scroll")?.scrollTo({ top: 0, behavior: "instant" });
  };
  const selectItem = useCallback((id: string, scroll = true) => {
    setHotelFocus(null);
    setSelectedStoreId(null);
    const found = state.days.flatMap((d) => d.items).find((x) => x.id === id);
    if (found && found.day !== activeDay && !allTrip) setActiveDay(found.day);
    setSelectedId(id);
    if (scroll) setTimeout(() => {
      const item = listRefs.current[id];
      const pane = item?.closest<HTMLElement>(".pane-scroll");
      if (!item || !pane) return;
      // Only move the itinerary pane, never the page/date strip or other ancestors.
      const top = pane.scrollTop + item.getBoundingClientRect().top - pane.getBoundingClientRect().top - (pane.clientHeight - item.offsetHeight) / 2;
      pane.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, 80);
  }, [activeDay, allTrip, state.days]);

  const reorder = (fromId: string, toId: string) => mutate((current) => ({ ...current, days: current.days.map((d) => {
    if (d.day !== activeDay) return d;
    return { ...d, items: reorderAndReflow(d.items, fromId, toId, scheduleTravel(current.travelLegs)) };
  }) }), true);

  const moveItem = (id: string, delta: number) => {
    const idx = visibleItems.findIndex((x) => x.id === id), target = visibleItems[idx + delta];
    if (target) { reorder(id, target.id); toast.success("順序、時間與地圖標記已更新", { action: { label: "復原", onClick: () => undo() } }); }
  };
  const handleItineraryPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, itemId: string) => {
    if (event.button !== 0 || !event.isPrimary || itineraryDragRef.current) return;
    itineraryDragRef.current = { pointerId: event.pointerId, itemId, targetId: itemId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false, pane: event.currentTarget.closest<HTMLElement>(".pane-scroll"), frame: 0, button: event.currentTarget };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragId(itemId);
    setDragOverId(itemId);
    const tick = () => {
      const drag = itineraryDragRef.current;
      if (!drag) return;
      if (drag.moved && drag.pane) {
        const bounds = drag.pane.getBoundingClientRect();
        const speed = drag.y < bounds.top + 56 ? -8 : drag.y > bounds.bottom - 56 ? 8 : 0;
        drag.pane.scrollTop += speed;
        const target = document.elementFromPoint(drag.x, drag.y)?.closest<HTMLElement>("[data-itinerary-id]");
        const id = target?.dataset.itineraryId;
        drag.targetId = id ?? drag.itemId;
        setDragOverId(drag.targetId);
      }
      drag.frame = requestAnimationFrame(tick);
    };
    itineraryDragRef.current.frame = requestAnimationFrame(tick);
  };
  const handleItineraryPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = itineraryDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
    drag.moved = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-itinerary-id]");
    const targetId = target?.dataset.itineraryId;
    if (targetId) { drag.targetId = targetId; setDragOverId(targetId); }
  };
  const finishItineraryDrag = (event: ReactPointerEvent<HTMLButtonElement>, commit: boolean) => {
    const drag = itineraryDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-itinerary-id]");
    if (commit) drag.targetId = dropTarget && drag.pane?.contains(dropTarget) ? dropTarget.dataset.itineraryId ?? drag.itemId : drag.itemId;
    if (commit && drag.moved && drag.targetId !== drag.itemId) {
      reorder(drag.itemId, drag.targetId);
      toast.success("順序、時間與地圖標記已更新", { action: { label: "復原", onClick: () => undo() } });
    }
    cancelAnimationFrame(drag.frame);
    itineraryDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragId(null);
    setDragOverId(null);
  };
  useEffect(() => {
    const cancel = () => {
      const drag = itineraryDragRef.current;
      itineraryDragRef.current = null;
      if (drag) {
        cancelAnimationFrame(drag.frame);
        if (drag.button.hasPointerCapture(drag.pointerId)) drag.button.releasePointerCapture(drag.pointerId);
      }
      setDragId(null); setDragOverId(null);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") cancel(); };
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", escape);
    return () => { cancel(); window.removeEventListener("blur", cancel); window.removeEventListener("keydown", escape); };
  }, [activeDay, panel, allTrip, priorities]);
  const setDuration = (id: string, minutes: number) => mutate((current) => ({ ...current, days: current.days.map((d) => d.day !== activeDay ? d : {
    ...d, items: reflow(d.items.map((item) => item.id === id ? { ...item, durationMinutes: minutes } : item), dayStart(d.items), scheduleTravel(current.travelLegs)),
  }) }), true);
  const setDayStart = (value: string) => {
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    const [hours, minutes] = value.split(":").map(Number);
    mutate((current) => ({ ...current, days: current.days.map((d) => d.day !== activeDay ? d : { ...d, items: reflow(d.items, hours * 60 + minutes, scheduleTravel(current.travelLegs)) }) }), true);
  };
  const undo = () => { if (undoRef.current) { setState(undoRef.current); undoRef.current = null; toast.success("已復原上一個動作"); } };
  const deleteItem = (id: string) => {
    mutate((current) => ({ ...current, days: current.days.map((d) => !d.items.some((x) => x.id === id) ? d : ({ ...d, items: reflow(d.items.filter((x) => x.id !== id), dayStart(d.items), scheduleTravel(current.travelLegs)) })) }), true);
    setSelectedId(null); toast.success("項目與地圖標記已移除", { action: { label: "復原", onClick: () => undo() } });
  };
  const addItem = (entry: Omit<TripItem, "id" | "order" | "completed">) => mutate((current) => ({ ...current, days: current.days.map((d) => {
    if (d.day !== activeDay) return d;
    const next = [...d.items]; const selectedIndex = next.findIndex((x) => x.id === selectedId); const index = selectedIndex >= 0 ? selectedIndex + 1 : next.length;
    next.splice(index, 0, { ...entry, id: `custom-${Date.now()}`, order: index + 1, completed: false });
    return { ...d, items: reflow(next, dayStart(d.items), scheduleTravel(current.travelLegs)) };
  }) }), true);
  const setCompleted = (id: string, completed: boolean) => mutate((current) => ({ ...current, days: current.days.map((d) => ({ ...d, items: d.items.map((x) => x.id === id ? { ...x, completed } : x) })) }));
  const togglePriority = (p: Priority) => setPriorities((current) => current.includes(p) ? current.filter((x) => x !== p) : [...current, p]);
  const syncLabel = { loading: "讀取中", saved: "已同步雲端", local: "已存本機", saving: "同步中", offline: "本機已存・待同步", conflict: "版本待確認", error: "儲存異常" }[syncState];
  const tripTotal = Object.values(state.budgets).reduce((total, budget) => total + Object.values(budget).reduce((a, b) => a + Number(b || 0), 0), 0);
  const deleteFood = async (id: string) => {
    const response = await localApi("/api/places", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    if (!response.ok) return toast.error("暫時無法刪除地點");
    setFoods((current) => current.filter((place) => place.id !== id));
    setSelectedFoodId(null);
    toast.success("自訂地點已刪除");
  };
  const addFoodToDay = (place: FoodPlace) => {
    if (place.latitude === null || place.longitude === null) return toast.error("這個地點尚未取得座標");
    addItem({
      day: activeDay, time: "時間待定", title: place.name, priority: "flexible", type: "meal",
      place: { id: place.id, name: place.name, latitude: place.latitude, longitude: place.longitude, address: place.address, city: place.city, category: place.category, verification: "confirmed", googleMapsUrl: place.googleMapsUrl },
      verification: "confirmed", notes: place.notes || undefined,
    });
    toast.success(`${place.name} 已加入 D${activeDay}`);
  };
  const expandSheet = () => { setSheetExpanded(true); setSheetTopRatio(.06); };
  const handleSheetPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (window.innerWidth > 760 || !workspaceRef.current) return;
    const height = workspaceRef.current.getBoundingClientRect().height;
    sheetDragRef.current = { pointerId: event.pointerId, startY: event.clientY, startRatio: sheetTopRatio, height, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSheetDragging(true);
  };
  const handleSheetPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = (event.clientY - drag.startY) / drag.height;
    if (Math.abs(event.clientY - drag.startY) > 4) drag.moved = true;
    setSheetTopRatio(Math.max(.06, Math.min(.72, drag.startRatio + delta)));
  };
  const handleSheetPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const current = Math.max(.06, Math.min(.72, drag.startRatio + (event.clientY - drag.startY) / drag.height));
    const snap = [.06, .43, .72].reduce((closest, value) => Math.abs(value - current) < Math.abs(closest - current) ? value : closest);
    suppressSheetClickRef.current = drag.moved;
    setSheetTopRatio(snap);
    setSheetExpanded(snap === .06);
    setSheetDragging(false);
    sheetDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const toggleSheet = () => {
    if (suppressSheetClickRef.current) { suppressSheetClickRef.current = false; return; }
    const next = !sheetExpanded;
    setSheetExpanded(next);
    setSheetTopRatio(next ? .06 : .43);
  };

  const itineraryContent = (
    <>
      <div className="day-heading">
        <div><span className="eyebrow">D{activeDay} · {day.date.replaceAll("-", "/")}</span><h2>{day.title}</h2><p>{day.area} · {day.items.filter((x) => x.place).length} 個地圖點</p></div>
        <Button size="icon" variant="outline" onClick={() => setAddOpen(true)} aria-label="新增行程"><Plus/></Button>
      </div>
      <div className="schedule-toolbar">
        <label>每日開始<input type="time" aria-label="每日行程開始時間" value={formatClock(dayStart(day.items)).slice(-5)} onChange={(event) => setDayStart(event.target.value)}/></label>
        <span>{day.items.filter((item) => item.completed).length} / {day.items.length} 已完成</span>
      </div>
      {day.items.some(item => (readTime(item.time).at(-1) ?? 0) >= 22 * 60) && <div className="day-alert"><AlertTriangle/><span><strong>晚間交通待核對</strong>暫排行程已到 22:00 之後。請核對營業時間與末班車，時間表不是已確認的搭車安排。</span></div>}
      {day.items.some((item) => /翌日|第\d+天/.test(item.time)) && <div className="day-alert" role="status"><AlertTriangle/><span>行程已排到隔日，請縮短停留或刪減項目。</span></div>}
      {day.warning && <div className="day-alert"><AlertTriangle size={17}/><span><strong>行程提醒</strong>{day.warning}</span></div>}
      <div className="filter-row">
        {(["core", "flexible", "cut"] as Priority[]).map((p) => <button key={p} aria-pressed={priorities.includes(p)} onClick={() => togglePriority(p)} className={`${priorityClass[p]} ${priorities.includes(p) ? "on" : "off"}`}>{priorityLabel[p]}</button>)}
        {priorities.length < 3 && <button onClick={() => setPriorities(["core", "flexible", "cut"])}>清除篩選</button>}
      </div>
      {day.items.filter(item => item.checkpoint).map(item => <aside className="timed-checkpoint" key={item.id}><AlertTriangle size={18}/><div><strong>{item.checkpoint!.time} · {item.checkpoint!.title}</strong><p>{item.checkpoint!.notes}</p></div></aside>)}
      <div className="itinerary-list">
        {visibleItems.map((entry, index) => {
          const mappedIndex = day.items.slice(0, day.items.findIndex((x) => x.id === entry.id) + 1).filter((x) => x.place).length;
          const previousMapped = day.items.slice(0, day.items.findIndex((item) => item.id === entry.id)).reverse().find((item) => item.place);
          const selected = selectedId === entry.id;
          return <div key={entry.id} data-itinerary-id={entry.id} ref={(node) => { listRefs.current[entry.id] = node; }} className={`itinerary-wrap ${selected ? "selected" : ""} ${dragId === entry.id ? "dragging" : ""} ${dragId && dragOverId === entry.id && dragId !== entry.id ? "drag-over" : ""}`}>
            {previousMapped?.place && entry.place && previousMapped.place.id !== entry.place.id && <div className="route-link-row"><a href={googleRouteUrl(previousMapped.place, entry.place)} target="_blank" rel="noopener noreferrer" aria-label={`從${previousMapped.title}到${entry.title}，在 Google Maps 規劃路線`}><Navigation size={16}/>Google Maps 規劃路線<ExternalLink size={12}/></a></div>}
            <article onClick={() => selectItem(entry.id, false)}>
              <div className="order-column">
                <button className="drag-handle" type="button" aria-label={`拖曳調整 ${entry.title} 的順序，也可使用上下方向鍵`} title="拖曳排序；上下方向鍵移動" onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); moveItem(entry.id, event.key === "ArrowUp" ? -1 : 1); } }} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => handleItineraryPointerDown(event, entry.id)} onPointerMove={handleItineraryPointerMove} onPointerUp={(event) => finishItineraryDrag(event, true)} onPointerCancel={(event) => finishItineraryDrag(event, false)} onLostPointerCapture={(event) => finishItineraryDrag(event, false)}><GripVertical size={18}/></button>
                {entry.place ? <span className={`map-order ${priorityClass[entry.priority]}`}>{mappedIndex}</span> : <span className="no-marker">—</span>}
              </div>
              <div className="item-main">
                <div className="item-top"><button className="time-toggle" aria-label={`調整 ${entry.title} 的停留時間`} aria-expanded={selected && editingTimeId === entry.id} onClick={(event) => { event.stopPropagation(); selectItem(entry.id, false); setEditingTimeId(editingTimeId === entry.id ? null : entry.id); }}><time>{entry.time}</time><Clock3 size={13}/></button><span className={priorityClass[entry.priority]}>{priorityLabel[entry.priority]}</span>{entry.verification !== "confirmed" && <span className="recheck">{entry.verification === "recheck" ? "待複查" : "暫定"}</span>}</div>
                <h3><button className="item-title-button" aria-expanded={selected} onClick={(event) => { event.stopPropagation(); selectItem(entry.id, false); }}>{entry.title}</button></h3>
                {selected && entry.notes && <p>{entry.notes}</p>}
                {selected && entry.source && <a className="item-source" href={entry.source.url} target="_blank" rel="noopener noreferrer">{entry.source.label}<ExternalLink size={12}/></a>}
                {selected && editingTimeId === entry.id && <label className="duration-editor" onClick={(event) => event.stopPropagation()}>停留／活動<input key={`${entry.id}-${durationOf(entry)}`} type="number" min="0" max="1440" step="5" defaultValue={durationOf(entry)} aria-label={`${entry.title} 的停留分鐘數`} onBlur={(event) => { const value = Number(event.currentTarget.value); if (event.currentTarget.value && Number.isFinite(value) && value >= 0 && value <= 1440) { if (value !== durationOf(entry)) setDuration(entry.id, value); } else event.currentTarget.value = String(durationOf(entry)); }}/><span>分鐘</span></label>}
                {selected && <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                  {entry.place && <a href={entry.place.googleMapsUrl} target="_blank" rel="noreferrer"><Navigation size={16}/>導航</a>}
                  <button onClick={() => moveItem(entry.id, -1)} disabled={index === 0} aria-label="往前移"><ChevronUp size={17}/></button>
                  <button onClick={() => moveItem(entry.id, 1)} disabled={index === visibleItems.length - 1} aria-label="往後移"><ChevronDown size={17}/></button>
                  <button className="delete" onClick={() => deleteItem(entry.id)} aria-label="刪除"><Trash2 size={16}/></button>
                </div>}
              </div>
            </article>
          </div>;
        })}
        {!visibleItems.length && <div className="empty-state"><ListChecks/><strong>沒有符合的行程</strong><span>調整優先級篩選。</span></div>}
      </div>
    </>
  );

  const prepContent = (
    <div className="utility-panel">
      <div className="day-heading"><div><span className="eyebrow">PREPARATION</span><h2>出發準備</h2><p>未解決項目與預約集中管理</p></div></div>
      <section className="prep-section"><div className="section-title"><Hotel size={18}/><h3>每日住宿</h3></div><p className="helper">住宿地點已按日期固定；切換日期時，地圖會顯示當晚飯店的 H 標記。</p>
        {hotelOptions.map((hotel) => <div className="hotel-row" key={hotel.id}><span className="hotel-days">{hotel.dayLabel}</span><div><strong>{hotel.name}</strong><small>{hotel.place.address}</small></div><a href={hotel.place.googleMapsUrl} target="_blank" rel="noreferrer" aria-label={`在 Google Maps 開啟 ${hotel.name}`}><Navigation/></a></div>)}
        <label className="booked-toggle"><Checkbox checked={state.hotelBooked} onCheckedChange={(v) => mutate((s) => ({ ...s, hotelBooked: Boolean(v) }))}/><span>三間住宿皆已完成訂房</span></label>
      </section>
      <section className="prep-section"><div className="section-title"><CalendarDays size={18}/><h3>預約與複查</h3></div>{state.reservations.map((r) => <div className="reservation-row" key={r.id}><button className="reservation-link" onClick={() => { setActiveDay(r.day); setPanel("plan"); }}><span>D{r.day}</span><div><strong>{r.label}</strong><small>{r.status === "booked" ? "已預約" : "待處理"}</small></div></button><button onClick={() => mutate((s) => ({ ...s, reservations: s.reservations.map((x) => x.id === r.id ? { ...x, status: x.status === "booked" ? "pending" : "booked" } : x) }))}>{r.status === "booked" ? <Check/> : "標記完成"}</button></div>)}</section>
      <section className="prep-section"><div className="section-title"><PackageCheck size={18}/><h3>行李清單</h3></div>{state.packing.map((p) => <label className="check-row" key={p.id}><Checkbox checked={p.done} onCheckedChange={(v) => mutate((s) => ({ ...s, packing: s.packing.map((x) => x.id === p.id ? { ...x, done: Boolean(v) } : x) }))}/><span className={p.done ? "done" : ""}>{p.label}</span></label>)}</section>
    </div>
  );

  const budgetContent = (
    <div className="utility-panel">
      <div className="day-heading"><div><span className="eyebrow">BUDGET · JPY</span><h2>每日預算</h2><p>機票與住宿預設不列入觀光預算</p></div><div className="trip-total"><small>全程合計</small><strong>¥{tripTotal.toLocaleString()}</strong></div></div>
      {state.days.map((d) => { const total = Object.values(state.budgets[d.day] ?? {}).reduce((a, b) => a + Number(b || 0), 0); return <section className="budget-day" key={d.day}><header><div><strong>D{d.day}</strong><span>{d.shortDate} · {d.area}</span></div><b>¥{total.toLocaleString()}</b></header><div className="budget-grid">{budgetCategories.map((category) => <label key={category}><span>{category}</span><input type="number" min="0" inputMode="numeric" value={state.budgets[d.day]?.[category] ?? 0} onChange={(e) => mutate((s) => ({ ...s, budgets: { ...s.budgets, [d.day]: { ...s.budgets[d.day], [category]: Number(e.target.value) } } }))}/></label>)}</div></section>; })}
    </div>
  );

  const foodContent = (
    <div className="food-panel">
      <div className="day-heading"><div><span className="eyebrow">FOOD MAP · {foods.length} PLACES</span><h2>名古屋・金澤美食地圖</h2><p>匯入美食清單；自行新增的地點保存在這個瀏覽器。</p></div><Button size="icon" onClick={() => setAddFoodOpen(true)} aria-label="自行新增地點"><Plus/></Button></div>
      <div className="food-filters">
        <div className="city-filter" aria-label="城市篩選">{(["全部", "名古屋", "金澤"] as const).map((city) => <button className={foodCity === city ? "active" : ""} key={city} onClick={() => setFoodCity(city)}>{city}</button>)}</div>
        <label><span>用餐時段</span><select value={foodMealPeriod} onChange={(event) => setFoodMealPeriod(event.target.value)}><option>全部</option>{mealPeriods.map((period) => <option key={period}>{period}</option>)}</select></label>
      </div>
      {foodLoading && <div className="food-loading"><LoaderCircle className="animate-spin"/>同步自訂地點中</div>}
      <div className="food-list">
        {visibleFoods.map((place, index) => <article key={place.id} className={`food-card ${selectedFood?.id === place.id ? "selected" : ""}`} onClick={() => setSelectedFoodId(place.id)}>
          <span className="food-number">F{index + 1}</span><div><div className="food-card-meta"><span>{place.city}</span><span>{place.category}</span>{place.source === "custom" && <span className="custom-label">本機新增</span>}</div><h3>{place.name}</h3><p>{place.address || place.notes || "已儲存 Google Maps 連結"}</p><div className="food-rating">{place.rating !== null ? <><Star/> <b>{place.rating.toFixed(1)}</b><span>（{place.reviews}）</span></> : <span>自訂地點</span>}{place.latitude === null && <em>尚未取得地圖座標</em>}</div></div>
          {place.canDelete && <button className="food-delete" onClick={(event) => { event.stopPropagation(); void deleteFood(place.id); }} aria-label={`刪除 ${place.name}`}><Trash2/></button>}
        </article>)}
        {!visibleFoods.length && <div className="empty-state"><ChefHat/><strong>沒有符合的餐廳</strong><span>調整城市或用餐時段。</span></div>}
      </div>
    </div>
  );

  return (
    <main className="planner-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><MapPin/></span><div><strong>中部・北陸 2027</strong><small>2/09–2/16 · 8天7夜</small></div></div>
        <div className="top-actions">
          <button aria-label={`共用旅程設定，${syncLabel}`} className={`sync-pill ${syncState}`} onClick={() => { setCodeDraft(sharedCode); setShareOpen(true); }}><Share2/><span>{syncLabel}</span><small>{sharedCode}</small></button>
          <button className="shopping-button" aria-label="開啟個人購物清單" onClick={() => { setShoppingScope("all"); setShoppingOpen(true); }}><ShoppingBag/><span>購物清單</span></button>
          <button className="icon-button" onClick={() => setDark((v) => !v)} aria-label="切換深色模式">{dark ? <Sun/> : <Moon/>}</button>
        </div>
      </header>
      <nav className="day-strip" aria-label="選擇日期">
        <button className={`all-trip-tab ${surface === "trip" && allTrip ? "active" : ""}`} onClick={() => { setSurface("trip"); setAllTrip(true); setSelectedId(null); }}><strong>全程</strong><span>ALL</span></button>
        {state.days.map((d) => <button key={d.day} className={surface === "trip" && !allTrip && activeDay === d.day ? "active" : ""} onClick={() => chooseDay(d.day)}><strong>D{d.day}</strong><span>{d.shortDate}</span><small>{d.area}</small></button>)}
      </nav>
      <div ref={workspaceRef} className={`workspace ${sheetExpanded ? "sheet-expanded" : ""} ${sheetDragging ? "sheet-dragging" : ""}`} style={{ "--sheet-top": `${sheetTopRatio * 100}%` } as CSSProperties}>
        <section className="left-pane">
          {surface === "trip" && !allTrip && <div className="desktop-mode-tabs"><button className={panel === "plan" ? "active" : ""} onClick={() => setPanel("plan")}><ListChecks/>行程</button><button className={panel === "today" ? "active" : ""} onClick={() => setPanel("today")}><LocateFixed/>今日</button><button className={panel === "prep" ? "active" : ""} onClick={() => setPanel("prep")}><PackageCheck/>準備</button><button className={panel === "budget" ? "active" : ""} onClick={() => setPanel("budget")}><CircleDollarSign/>預算</button></div>}
          <button className="sheet-handle" onPointerDown={handleSheetPointerDown} onPointerMove={handleSheetPointerMove} onPointerUp={handleSheetPointerUp} onPointerCancel={handleSheetPointerUp} onClick={toggleSheet} aria-label="上下拖曳行程面板"><span></span>{sheetTopRatio <= .2 ? <ChevronDown/> : <ChevronUp/>}</button>
          <div className="pane-scroll">
            <div className={`sync-status ${syncState}`} role="status"><span>{syncLabel}{syncState === "conflict" ? " · 旅伴已修改，未覆蓋雲端" : syncState === "offline" ? " · 本機已保留，連線後可重試" : ""}</span>{(syncState === "offline" || syncState === "error") && <button onClick={sync.retry}>重試</button>}{syncState === "conflict" && <button onClick={() => { setCodeDraft(sharedCode); setShareOpen(true); }}>處理</button>}</div>
            {surface === "food" ? foodContent : allTrip ? <div className="all-trip-panel"><span className="eyebrow">ALL TRIP</span><h2>8 天路線總覽</h2><p>地圖以 D1–D8 標籤顯示全部已定位地點。選擇上方日期即可回到每日編輯。</p><div className="all-trip-stats"><div><strong>{state.days.reduce((count, d) => count + d.items.length, 0)}</strong><span>行程項目</span></div><div><strong>{state.days.flatMap((d) => d.items).filter((x) => x.place).length}</strong><span>已定位地點</span></div><div><strong>{state.days.flatMap((d) => d.items).filter((x) => x.verification === "recheck").length}</strong><span>待複查</span></div></div>{state.days.map((d) => <button key={d.day} onClick={() => chooseDay(d.day)}><b>D{d.day}</b><span>{d.title}</span><small>{d.items.filter((x) => x.place).length} 點</small></button>)}</div>
              : panel === "prep" ? prepContent : panel === "budget" ? budgetContent : panel === "today" ? <div className="today-panel"><span className="eyebrow">TRAVEL MODE</span><div className="today-date"><CloudSun/><div><h2>D{activeDay} 旅行模式</h2><p>{day.date} · 依完成狀態顯示下一站</p></div></div>{day.warning && <div className="day-alert"><AlertTriangle/><span><strong>注意</strong>{day.warning}</span></div>}<div className="next-card"><small>下一站</small><strong>{day.items.find((x) => !x.completed)?.title ?? "今日行程已完成"}</strong><span>{day.items.find((x) => !x.completed)?.time}</span>{day.items.find((x) => !x.completed)?.place && <a href={day.items.find((x) => !x.completed)!.place!.googleMapsUrl} target="_blank" rel="noreferrer"><Navigation/>開始導航</a>}</div><div className="today-list">{day.items.map((x) => <label key={x.id}><Checkbox checked={x.completed} onCheckedChange={(v) => setCompleted(x.id, Boolean(v))}/><span><time>{x.time}</time><strong>{x.title}</strong></span></label>)}</div></div> : itineraryContent}
          </div>
        </section>
        <section className="map-pane">
          <TripMap days={state.days} activeDay={activeDay} dayFocusKey={dayFocusKey} items={visibleItems} selectedId={selectedId} onSelect={(id) => { setSelectedFoodId(null); selectItem(id); }} activeHotel={activeHotel} hotelFocus={hotelFocus} onSelectHotel={locateHotel} allTrip={allTrip} foodPlaces={mapFoods} selectedFoodId={mapSelectedFood?.id ?? null} onSelectFood={(id) => { setHotelFocus(null); setSelectedStoreId(null); setSelectedId(null); setSelectedFoodId(id); }} showFood={showFood} stores={stores} selectedStoreId={selectedStoreId} onSelectStore={openStore} showStores={showStores} pickingStore={pickingStore} onPickStore={setPickCandidate}/>
          <Dialog open={legendOpen} onOpenChange={setLegendOpen}><DialogContent className="map-legend-dialog map-tools-dialog"><DialogHeader><DialogTitle>地圖工具與圖例</DialogTitle><DialogDescription>管理地點顯示、新增地點與查看圖例。</DialogDescription></DialogHeader>
          <section className="map-tools-panel" aria-label="地圖工具">
            <div className="map-tools-grid">
              <button className={showFood ? "food-tool active" : "food-tool"} aria-label={showFood ? "隱藏美食地點" : "顯示美食地點"} aria-pressed={showFood} onClick={() => setShowFood(value => !value)}><ChefHat/><span><strong>美食 {mapFoods.length}</strong><small>{showFood ? "地標顯示中" : "地標已隱藏"}</small></span></button>
              <button className={showStores ? "store-tool active" : "store-tool"} aria-pressed={showStores} aria-label={`${showStores ? "隱藏" : "顯示"}我的商店，共 ${stores.length} 間`} onClick={() => { setShowStores(value => !value); setSelectedStoreId(null); }}><Store/><span><strong>商店 {stores.length}</strong><small>僅自己看得到</small></span></button>
              <button onClick={() => { setLegendOpen(false); setAddPlaceOpen(true); }}><Plus/><span><strong>新增地點</strong><small>美食或私人商店</small></span></button>
              <button aria-label="開啟金澤與白川鄉現地影像" onClick={() => { setLegendOpen(false); setCamerasOpen(true); }}><Video/><span><strong>現地影像</strong><small>金澤・白川鄉</small></span></button>
            </div>
            <label className="map-tools-filter"><span>美食用餐時段</span><select aria-label="用餐時段篩選" value={foodMealPeriod} onChange={event => setFoodMealPeriod(event.target.value)}><option value="全部">全部時段</option>{mealPeriods.map(period => <option key={period} value={period}>{period}</option>)}</select></label>
            {storesError && <button className="map-tools-retry" onClick={() => setStoresRetry(v => v + 1)}>商店載入失敗 · 重新載入</button>}
          </section>
          <details className="tools-legend"><summary><MapPin size={16}/>查看地圖標記圖例<ChevronDown size={16}/></summary><div className="map-legend-body">
            <strong>地圖標記</strong>
            <div><i className="legend-pin core">1</i><span>核心行程</span></div>
            <div><i className="legend-pin flexible">2</i><span>彈性行程</span></div>
            <div><i className="legend-pin cut">3</i><span>可略過 · 並非已刪除</span></div>
            <div><i className="legend-pin hotel">H</i><span>當晚住宿</span></div>
            <div><i className="legend-pin hotel-previous">H</i><span>前晚住宿／其他日期住宿</span></div>
            <div><i className="legend-pin food">F1</i><span>美食 · F 為美食編號</span></div>
            <div><i className="legend-store"><Store size={17}/></i><span>我的商店 · 個人待買</span></div>
            <p>顏色表示行程優先級或地點類型，不表示完成或刪除。行程數字對應左側清單；全程以 D1–D8 表示日期。黑白外框代表目前選取的地點。</p>
            <p>虛線為行程順序示意，並非實際道路。</p>

          </div></details></DialogContent></Dialog>
          <LiveCameras area={day.area} open={camerasOpen} onOpenChange={setCamerasOpen}/>
          {pickingStore && <>
            <div className="store-pick-pin" aria-label="待新增商店的位置圖釘"><MapPin size={44}/></div>
            <div className="store-pick-banner"><div><strong>將圖釘尖端對準商店</strong><span>拖動地圖或點選位置，確認後再填寫商店資料。</span></div><button onClick={() => { setPickingStore(false); setSheetTopRatio(previousSheetRatio.current); setAddStoreOpen(true); }}>取消</button></div>
            <div className="store-pick-confirm"><small role="status">{pickCandidate ? `${pickCandidate.latitude.toFixed(5)}, ${pickCandidate.longitude.toFixed(5)}` : "正在取得位置…"}</small><Button disabled={!pickCandidate} onClick={() => { if (!pickCandidate) return; setPickedStore({ ...pickCandidate }); setPickingStore(false); setSheetTopRatio(previousSheetRatio.current); setAddStoreOpen(true); }}><Check/>使用這個位置</Button></div>
          </>}
          {!pickingStore && showStores && selectedStore && <div className="store-map-card">
            <button className="store-card-close" aria-label="關閉商店資訊" onClick={() => setSelectedStoreId(null)}><X size={18}/></button>
            <span className="store-badge"><Store size={16}/>我的商店 · {selectedStore.city}</span><h3>{selectedStore.name}</h3>
            {selectedStore.address && <p>{selectedStore.address}</p>}{selectedStore.notes && <p>{selectedStore.notes}</p>}
            <div className="store-card-actions"><Button onClick={() => { setShoppingScope(selectedStore.id); setShoppingOpen(true); }}><ShoppingBag/>我的待買清單</Button><a href={selectedStore.googleMapsUrl} target="_blank" rel="noreferrer"><Navigation size={16}/>導航</a></div>
            <small>商店與待買商品只有你看得到</small>
          </div>}
          <div className="map-overlay-top"><div className="map-overlay-actions" role="toolbar" aria-label="地圖工具入口"><button className="map-tools-trigger" aria-label="開啟地圖工具與圖例" title="地圖工具與圖例" onClick={() => setLegendOpen(true)}><ListChecks/><span>地圖工具</span></button></div></div>
          {!pickingStore && surface === "trip" && displayedHotel && <div className="hotel-anchor"><button className="hotel-anchor-locate" onClick={() => locateHotel(displayedHotel.id)} aria-label={`在本地圖定位 ${displayedHotel.name}`}><BedDouble/><span><small>{displayedHotel.dayLabel} · 點名稱定位</small><strong>{displayedHotel.name}</strong></span><LocateFixed size={18}/></button><a className="hotel-external" href={displayedHotel.place.googleMapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`在 Google Maps 查看 ${displayedHotel.name} 的地點資訊`} title="Google Maps 飯店資訊"><MapPin size={18}/></a></div>}
          {!pickingStore && showFood && mapSelectedFood && <div className="food-map-card"><div><span>{mapSelectedFood.city} · {mapSelectedFood.category}</span><h3>{mapSelectedFood.name}</h3></div>{mapSelectedFood.rating !== null && <div className="map-rating"><Star/><strong>{mapSelectedFood.rating.toFixed(1)}</strong></div>}<p>{mapSelectedFood.address || mapSelectedFood.notes || "自訂地點"}</p>{mapSelectedFood.notes && mapSelectedFood.address && <small>{mapSelectedFood.notes}</small>}<div className="food-map-actions"><button onClick={() => addFoodToDay(mapSelectedFood)}><Plus/>加入 D{activeDay}</button><a href={mapSelectedFood.googleMapsUrl} target="_blank" rel="noreferrer"><ExternalLink/>Google Maps</a>{mapSelectedFood.canDelete && <button className="delete" onClick={() => void deleteFood(mapSelectedFood.id)}><Trash2/>刪除</button>}</div></div>}
        </section>
      </div>
      <nav className="mobile-nav"><button className={surface === "trip" && panel === "today" ? "active" : ""} onClick={() => { setSurface("trip"); setAllTrip(false); setPanel("today"); }}><LocateFixed/><span>今日</span></button><button className={surface === "trip" && panel === "plan" ? "active" : ""} onClick={() => { setSurface("trip"); setAllTrip(false); setPanel("plan"); }}><ListChecks/><span>行程</span></button><button className="add-main" onClick={() => { setSurface("trip"); setAllTrip(false); setPanel("plan"); setAddOpen(true); }}><Plus/><span>新增</span></button><button className={surface === "trip" && panel === "prep" ? "active" : ""} onClick={() => { setSurface("trip"); setAllTrip(false); setPanel("prep"); expandSheet(); }}><PackageCheck/><span>準備</span></button><button className={surface === "trip" && panel === "budget" ? "active" : ""} onClick={() => { setSurface("trip"); setAllTrip(false); setPanel("budget"); expandSheet(); }}><CircleDollarSign/><span>預算</span></button></nav>
      {undoRef.current && <button className="undo-fab" onClick={undo}><RotateCcw/>復原上一步</button>}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="share-dialog"><DialogHeader><DialogTitle>儲存與共用旅程</DialogTitle><DialogDescription>行程先儲存在本機。連接原本的 Supabase 共享碼後，可與旅伴同步行程、準備與預算。</DialogDescription></DialogHeader>
          <p className="local-data-note">商店、美食新增與購物清單只儲存在這個瀏覽器；不會上傳到共用旅程，也不會與原 ChatGPT 網站同步。</p>
          <label className="form-grid">旅程代碼<Input aria-label="共用旅程代碼" maxLength={32} value={codeDraft} onChange={event => setCodeDraft(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}/></label>
          <Button disabled={!codeDraft || cloudBusy || syncState === "saving" || !sync.ready} onClick={() => { undoRef.current = null; setSharedCode(codeDraft); setShareOpen(false); }}>切換旅程</Button>
          <label className="form-grid">Supabase 旅行共享碼<Input aria-label="Supabase 旅行共享碼" type="password" autoComplete="off" value={tokenDraft} onChange={event => setTokenDraft(event.target.value)} placeholder="輸入舊版使用的旅行共享碼"/></label>
          <Button disabled={!tokenDraft.trim() || cloudBusy || !sync.ready} onClick={async () => { setCloudBusy(true); try { if (await sync.connect(tokenDraft.trim())) { setTokenDraft(""); toast.success("已連接並同步雲端行程"); } } finally { setCloudBusy(false); } }}>{cloudBusy ? <LoaderCircle className="animate-spin"/> : <Share2/>}連接並同步</Button>
          {sync.message && <p className="schedule-hint" role="alert">{sync.message}</p>}
          {sync.connected && <Button variant="outline" disabled={cloudBusy || syncState === "saving"} onClick={sync.retry}>立即同步</Button>}
          <Button variant="outline" disabled={cloudBusy || syncState === "saving"} onClick={sync.disconnect}>只使用本機儲存／移除共享碼</Button>
          {syncState === "conflict" && <><Button variant="outline" onClick={sync.reload}>使用雲端行程（取代本機版本）</Button>{sync.connected && <Button variant="outline" onClick={() => { if (window.confirm("要用目前本機行程取代雲端行程嗎？建議先匯出備份。")) sync.useLocal(); }}>使用本機行程（取代雲端版本）</Button>}</>}
          <Button variant="outline" onClick={() => { try { const data = exportBackup(sharedCode, state); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `hokuriku-2027-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch { toast.error("無法讀取本機資料以匯出備份"); } }}>匯出行程與私人清單備份</Button>
          <a href="./legacy.html" target="_blank" rel="noreferrer">查看舊版行程與同步紀錄</a>
        </DialogContent>
      </Dialog>
      <Dialog open={addPlaceOpen} onOpenChange={setAddPlaceOpen}><DialogContent className="place-kind-dialog"><DialogHeader><DialogTitle>新增地點</DialogTitle><DialogDescription>選擇地點類型與誰可以看見。</DialogDescription></DialogHeader>
        <Button variant="outline" onClick={() => { setAddPlaceOpen(false); setAddFoodOpen(true); }}><ChefHat/><span><strong>美食地點</strong><small>新增資料保存在本機</small></span></Button>
        <Button variant="outline" onClick={() => { setAddPlaceOpen(false); setAddStoreOpen(true); }}><Store/><span><strong>私人商店</strong><small>只有你看得到，可建立待買清單</small></span></Button>
      </DialogContent></Dialog>
      <StoreDirectory open={directoryOpen} onOpenChange={setDirectoryOpen} stores={stores} onLocate={(store) => { setDirectoryOpen(false); openStore(store.id); }} onShopping={(store) => { setDirectoryOpen(false); setShoppingScope(store.id); setShoppingOpen(true); }} onAdd={() => { setDirectoryOpen(false); setAddStoreOpen(true); }}/>
      <AddItemDialog open={addOpen} onOpenChange={setAddOpen} day={activeDay} afterId={selectedId} onAdd={addItem} foodPlaces={foods}/>
      <AddFoodDialog open={addFoodOpen} onOpenChange={setAddFoodOpen} canEdit={canEdit} onAdded={(place) => { setFoods((current) => [...current, place]); setSelectedFoodId(place.id); setShowFood(true); }}/>
      <ShoppingSheet open={shoppingOpen} onOpenChange={setShoppingOpen} stores={stores} storesError={storesError} initialScope={shoppingScope} onLocate={(store) => { setShoppingOpen(false); openStore(store.id); }}/>
      <AddStoreDialog open={addStoreOpen} onOpenChange={setAddStoreOpen} canEdit={canEdit} picked={pickedStore} onPick={() => { previousSheetRatio.current = sheetTopRatio; setPickCandidate(null); setAddStoreOpen(false); setSelectedStoreId(null); setSelectedFoodId(null); setPickingStore(true); setSheetTopRatio(.78); }} onAdded={(store) => { setStores((current) => [store, ...current]); setPickedStore(null); openStore(store.id); }}/>
      <Toaster theme={dark ? "dark" : "light"} position="top-center" richColors/>
    </main>
  );
}
