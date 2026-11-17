import { localApi } from "@/lib/local-api";
"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, MapPin, Plus, Store } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { isGoogleMapLink, mapCoordinates, mapPlaceName, type StorePlace } from "@/lib/store-data";

export function AddStoreDialog({ open, onOpenChange, canEdit, picked, onPick, onAdded }: {
  open: boolean; onOpenChange: (value: boolean) => void; canEdit: boolean;
  picked: { latitude: number; longitude: number } | null;
  onPick: () => void; onAdded: (store: StorePlace) => void;
}) {
  const [form, setForm] = useState({ name: "", googleMapsUrl: "", city: "名古屋", shoppingText: "", notes: "" });
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");
  const resolutionRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (picked) {
      resolutionRef.current?.abort();
      setResolving(false);
      setLinkMessage("");
      setPosition(picked);
    }
  }, [picked]);
  useEffect(() => {
    const url = form.googleMapsUrl.trim();
    setLinkMessage("");
    setResolving(false);
    if (!url || !isGoogleMapLink(url)) return;
    setPosition(null);
    const applyName = (name: string | null) => { if (name) setForm((current) => current.name.trim() ? current : { ...current, name }); };
    applyName(mapPlaceName(url));
    const exact = mapCoordinates(url);
    if (exact) { setPosition(exact); return; }
    const controller = new AbortController();
    resolutionRef.current = controller;
    const timer = setTimeout(async () => {
      if (controller.signal.aborted) return;
      setResolving(true);
      try {
        const response = await localApi("/api/stores/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }), signal: controller.signal });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (response.ok) { applyName(data.name); if (data.position) setPosition(data.position); setLinkMessage(data.position ? "已從連結取得商店位置" : "已帶入店名，請在地圖上選擇位置"); }
        else setLinkMessage(data.error || "請在地圖上選擇位置");
      } catch {
        if (!controller.signal.aborted) setLinkMessage("暫時無法解析連結，可直接在地圖上選擇位置。");
      } finally { if (!controller.signal.aborted) setResolving(false); }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [form.googleMapsUrl]);
  const submit = async () => {
    if (!position) return toast.error("請先在地圖上選定商店位置");
    const googleMapsUrl = form.googleMapsUrl.trim() || `https://www.google.com/maps/search/?api=1&query=${position.latitude},${position.longitude}`;
    if (!isGoogleMapLink(googleMapsUrl)) return toast.error("請貼上有效的 Google Maps 連結，或清空連結使用地圖選點");
    const shoppingItems = form.shoppingText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    if (shoppingItems.length > 30 || shoppingItems.some((item) => item.length > 120)) return toast.error("最多 30 項商品，每項最多 120 字");
    setSaving(true);
    try {
      const response = await localApi("/api/stores", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.name, city: form.city, notes: form.notes, shoppingItems, googleMapsUrl, ...position }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "儲存失敗");
      onAdded(data.store);
      setForm({ name: "", googleMapsUrl: "", city: "名古屋", shoppingText: "", notes: "" }); setPosition(null);
      onOpenChange(false); toast.success("商店已加入你的地圖");
    } catch (error) { toast.error(error instanceof Error ? error.message : "儲存失敗，資料仍保留在表單"); }
    finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!saving) onOpenChange(value); }}>
    <DialogContent className="add-dialog store-dialog">
      <DialogHeader><DialogTitle className="shopping-title"><Store/>新增我的商店</DialogTitle><DialogDescription>商店、備註與待買商品只保存在這個瀏覽器，不會分享給旅伴。</DialogDescription></DialogHeader>
      {!canEdit ? <div className="signin-panel"><strong>目前無法儲存商店，請重新載入後再試。</strong></div>
      : <form className="food-form" onSubmit={(e) => { e.preventDefault(); if (!saving) void submit(); }}>
        <label>商店／分店名稱<Input required maxLength={120} value={form.name} placeholder="例如：名古屋 PARCO" onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
        <label>Google Maps 連結（可選）<Input type="url" maxLength={2000} value={form.googleMapsUrl} placeholder="貼上商店的分享連結，自動帶入可辨識的店名與位置" onChange={(e) => { setForm({ ...form, googleMapsUrl: e.target.value }); }}/></label>
        <div className="store-position">
          {position && <div className="position-confirmed" role="status"><CheckCircle2/><div><strong>已選定商店位置</strong><span>{position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}</span><small>位置已就緒，填好資料後按「確認新增商店」儲存。</small></div></div>}
          <Button type="button" variant="outline" onClick={onPick}><MapPin/>{position ? "重新選擇地圖位置" : "在地圖上直接標點"}</Button>
          {(resolving || linkMessage) && <small role="status">{resolving ? "正在解析 Google Maps 連結…" : linkMessage}</small>}
          {!position && <small>也可以直接標點，不必填連結。選好位置後會自動建立 Google Maps 連結。</small>}
        </div>
        <label>城市<NativeSelect value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{["名古屋", "金澤", "高山", "白川鄉", "其他"].map((city) => <option key={city}>{city}</option>)}</NativeSelect></label>
        <label className="store-detail-field"><span>購物清單（選填）</span><Textarea maxLength={3630} rows={3} value={form.shoppingText} placeholder={"每行一項，例如：\n防曬乳\n限定色唇膏"} onChange={(e) => setForm({ ...form, shoppingText: e.target.value })}/><small>每行一項，最多 30 項；會存入這間商店的個人待買清單。</small></label>
        <label className="store-detail-field"><span>私人備註（選填）</span><Textarea maxLength={500} value={form.notes} placeholder="樓層、入口或營業時間提醒…" onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label>
        <Button type="submit" disabled={saving || resolving || !position || !form.name.trim()}>{saving ? <LoaderCircle className="animate-spin"/> : <Plus/>}確認新增商店</Button>
      </form>}
    </DialogContent>
  </Dialog>;
}
