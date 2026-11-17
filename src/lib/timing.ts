import type { TripItem, TripDay, Place } from "./trip-data";
import type { SavedLeg } from "./travel-leg";

// Apply explicitly to seeds or a revision-checked shared-state update, never on every load.
export function correctNavigation<T extends { days: TripDay[]; travelLegs: Record<string, SavedLeg> }>(state: T, catalog: Place[]): T {
  const travelLegs = { ...state.travelLegs };
  const place = (id: string) => {
    const value = catalog.find(p => p.id === id);
    if (!value) throw new Error(`Missing navigation place: ${id}`);
    return value;
  };
  const leg = (from: string, to: string, mode: "walk" | "transit", minutes: number) => {
    travelLegs[`${from}>${to}`] = { mode, minutes, confirmed: false };
  };
  const days = state.days.map(day => {
    if (![1, 3, 4, 8].includes(day.day)) return day;
    let items = day.items.map(item => ({ ...item }));
    const patch = (id: string, value: Partial<TripItem>) => { items = items.map(item => item.id === id ? { ...item, ...value } : item); };
    if (day.day === 1) {
      items = items.map(item => item.place && ["pokemon-kanazawa", "kanazawa-forus"].includes(item.place.id) ? { ...item, place: place(item.place.id) } : item);
      patch("d1-6", { title: "Pokémon Center KANAZAWA · FORUS 5F", notes: "位於金澤 FORUS 5 樓。Hotel Torifito 至 FORUS 暫估步行10分鐘，另留約5分鐘上樓；雨雪與實際出入口可能增加時間。", source: { label: "寶可夢中心官方店舖資訊", url: "https://shop.pokemon.co.jp/ja/shop/pokemoncenter-kanazawa/" } });
      patch("d1-7", { notes: "與寶可夢中心同棟；此段為館內移動，暫留 5 分鐘，不需步行到另一個商場。" });
      leg("d1-4", "d1-6", "walk", 15);
      leg("d1-6", "d1-7", "walk", 5);
      leg("d1-7", "d1-8", "walk", 10);
      const shop = items.find(item => item.id === "d1-6");
      let cursor = shop ? (readTime(shop.time)[0] ?? 840) + durationOf(shop) : 960;
      for (const id of ["d1-7", "d1-8", "d1-9", "d1-hotel-end"]) {
        const current = items.find(item => item.id === id);
        if (!current) continue;
        cursor += id === "d1-7" ? 5 : id === "d1-8" ? 10 : id === "d1-hotel-end" ? 30 : 0;
        const duration = durationOf(current);
        patch(id, { time: `${formatClock(cursor)}${duration ? `–${formatClock(cursor + duration)}` : ""}`, durationMinutes: duration });
        cursor += duration;
      }
    }
    if (day.day === 3) {
      patch("d3-1", { title: "金澤站西口候車 · 核對月台與預約", time: "07:20–08:00", durationMinutes: 40, place: place("kanazawa-west-bus"), verification: "recheck", notes: "先按現行 08:00 班次規劃；2027 年班次與乘車處仍須預約時再次核對。" });
      patch("d3-2", { title: "金澤 → 白川鄉 · 高速巴士（班次待確認）", time: "約 08:00–09:15", durationMinutes: 75, verification: "recheck", reservation: "pending", notes: "2026-11-16 查閱現行官方時刻：08:00 發、09:15 抵達。這是規劃參考，不是已預訂的 2027 班次；雪天可能延誤。", source: { label: "北陸鐵道官方時刻表", url: "https://www.hokutetsu.co.jp/highway-bus/shirakawa/" } });
      patch("d3-3", { title: "抵達白川鄉 · 下車與整理", time: "約 09:15–09:30", durationMinutes: 15, verification: "provisional" });
      patch("d3-4", { time: "09:30–14:30", durationMinutes: 300 });
      const busIndex = items.findIndex(item => item.id === "d3-2");
      const arrivalIndex = items.findIndex(item => item.id === "d3-3");
      if (arrivalIndex >= 0 && busIndex >= 0 && arrivalIndex < busIndex) {
        const [arrival] = items.splice(arrivalIndex, 1);
        items.splice(items.findIndex(item => item.id === "d3-2") + 1, 0, arrival);
      }
      leg("d3-1", "d3-2", "transit", 75);
    }
    if (day.day === 4) {
      patch("d4-11", { title: "正常行程返程判斷 · 核對回名古屋班次", time: "17:25–17:40", durationMinutes: 15, notes: "確認已選班次、轉乘與末班車。" });
    }
    if (day.day === 8) {
      const airport = items.find(item => item.id === "d8-3");
      if (airport) {
        const newItem = (id: string, title: string, time: string, durationMinutes: number, type: TripItem["type"], location?: Place): TripItem => ({ id, day: 8, order: 0, title, time, durationMinutes, type, place: location, priority: "core", completed: false, verification: "provisional" });
        if (!items.some(item => item.id === "d8-hotel-walk")) items.splice(items.indexOf(airport), 0,
          { ...newItem("d8-hotel-walk", "飯店 → 名鐵名古屋站 · 步行", "約 09:20–09:40", 20, "transport", place("meitetsu-nagoya")), notes: "攜帶行李暫留 20 分鐘；導航目的地是名鐵名古屋站，不是 JR 名古屋站。" },
          { ...newItem("d8-station-wait", "購票、進站與候車", "約 09:40–09:55", 15, "buffer"), notes: "暫留 15 分鐘；需依實際選定班次調整。" });
        patch("d8-3", { title: "名鐵名古屋站 → 中部國際機場 · 班次待選", time: "約 09:55–10:30", durationMinutes: 35, verification: "recheck", notes: "35 分鐘為列車段暫估，不含前面的步行 20 分鐘與候車 15 分鐘。09:55 不是已確認的發車時間；須依 2027-02-16 實際班次調整，目標 10:30 前抵達。", source: { label: "名鐵官方班次查詢", url: "https://www.meitetsu.co.jp/train/station_info/line01/station/1201.html" } });
        patch("d8-4", { notes: "暫以 10:30 抵達車站規劃；含步行至航廈、報到與安檢。實際報到截止時間以航空公司規定為準。" });
        leg("d8-2", "d8-hotel-walk", "walk", 20);
        leg("d8-hotel-walk", "d8-3", "transit", 35);
        delete travelLegs["d8-2>d8-3"];
      }
    }
    return { ...day, items: items.map((item, index) => ({ ...item, order: index + 1 })) };
  });
  return { ...state, days, travelLegs };
}

// Explicit, idempotent migration/seed operation, not forced on every sync.
export function withHotelEndpoints(days: TripDay[], hotels: { name: string; days: number[]; place: Place }[]): TripDay[] {
  return days.map(day => {
    const previous = hotels.find(hotel => hotel.days.includes(day.day - 1));
    const tonight = hotels.find(hotel => hotel.days.includes(day.day));
    const items = day.items.map(item => ({ ...item }));
    if (!items.length) return day;
    const anchor = (kind: "start" | "end", hotel: NonNullable<typeof tonight>, minutes: number): TripItem => ({
      id: `d${day.day}-hotel-${kind}`, day: day.day, order: 0,
      title: `${kind === "start" ? "飯店出發" : "回飯店休息"} · ${hotel.name}`,
      time: `約 ${formatClock(minutes)}`, durationMinutes: 0, priority: "core", type: "lodging",
      place: hotel.place, completed: false, verification: "provisional",
      notes: "新增起終點的時間為暫估；請依實際交通與出發安排調整。",
    });
    if (previous && !items.some(item => item.id === `d${day.day}-hotel-start`)) {
      // Breakfast/luggage preparation already happens at the departure hotel.
      if (!items[0].place && /早餐|整理|行李/.test(items[0].title)) items[0].place = previous.place;
      const time = readTime(items[0].time)[0] ?? 540;
      items.unshift(anchor("start", previous, Math.max(0, time - (items[0].place?.id === previous.place.id ? 0 : 30))));
    }
    if (tonight) {
      const last = items[items.length - 1];
      if (!last.place && /回飯店/.test(last.title)) last.place = tonight.place;
      if (last.place?.id !== tonight.place.id && !items.some(item => item.id === `d${day.day}-hotel-end`)) {
        const [start, end] = readTime(last.time);
        items.push(anchor("end", tonight, (end ?? ((start ?? 1200) + durationOf(last))) + 30));
      }
    }
    return { ...day, items: items.map((item, index) => ({ ...item, order: index + 1 })) };
  });
}

const defaults: Record<TripItem["type"], number> = {
  place: 90, meal: 60, lodging: 30, transport: 60, airport_station: 0,
  reservation: 15, buffer: 45, rest: 60, note: 45,
};

// Preserve day offsets across repeated reorders after midnight.
export function readTime(value: string): number[] {
  return [...value.matchAll(/(?:(翌日|第(\d+)天)\s*)?(\d{1,2}):(\d{2})/g)]
    .filter((m) => Number(m[3]) < 24 && Number(m[4]) < 60)
    .map((m) => (m[1] === "翌日" ? 1 : m[2] ? Number(m[2]) - 1 : 0) * 1440 + Number(m[3]) * 60 + Number(m[4]));
}

export function formatClock(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const day = Math.floor(total / 1440);
  const clock = `${String(Math.floor(total % 1440 / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  return `${day === 1 ? "翌日 " : day > 1 ? `第${day + 1}天 ` : ""}${clock}`;
}

export function durationOf(item: TripItem): number {
  if (Number.isFinite(item.durationMinutes) && item.durationMinutes! >= 0) return Math.round(item.durationMinutes!);
  const [start, end] = readTime(item.time);
  if (start !== undefined && end !== undefined) return Math.max(5, end < start ? end + 1440 - start : end - start);
  return defaults[item.type] ?? 45;
}

export function dayStart(items: TripItem[]): number {
  const times = items.flatMap((item) => readTime(item.time).slice(0, 1));
  return times.length ? Math.min(...times) : 540;
}

export type TravelMinutes = (from: TripItem, to: TripItem) => number;

// Planning recommendations, not mandatory visit durations. Preserve custom user edits.
export const stayDurationReview: Record<string, { from: number; to: number; reason: string }> = {
  "d1-7": { from: 120, to: 90, reason: "已另留寶可夢中心2小時，商場與站周邊購物先排90分鐘。" },
  "d2-2": { from: 105, to: 90, reason: "東茶屋街與主計町先排90分鐘，避免與午餐休息重疊過多。" },
  "d2-5": { from: 120, to: 90, reason: "商圈先排90分鐘，保留逛街彈性而不壓晚餐。" },
  "d3-7": { from: 60, to: 30, reason: "隔天另有三町老街正式行程，雪夜散步先排30分鐘。" },
  "d3-9": { from: 60, to: 30, reason: "晚餐後自由散步先排30分鐘，遇雪可略過。" },
  "d4-10": { from: 180, to: 150, reason: "以車站與町內重點巡禮先排2.5小時，預留較早返名古屋的空間；冬季店家可能提早結束營業。" },
  "d5-3": { from: 90, to: 60, reason: "城下町先排60分鐘，午餐與犬山城另有獨立時間。" },
  "d5-5": { from: 90, to: 60, reason: "犬山城先排60分鐘；現場入城排隊較長時再延長。" },
  "d6-1": { from: 105, to: 75, reason: "熱田神宮參拜先排75分鐘；若加看寶物館，可自行延長。" },
  "d6-3": { from: 90, to: 60, reason: "白鳥庭園冬季散策先排60分鐘，茶席另視現場加時。" },
  "d6-6": { from: 90, to: 60, reason: "寶可夢中心已另留2小時，PARCO與榮商圈先排60分鐘。" },
  "d6-8": { from: 90, to: 45, reason: "以Oasis 21與塔周邊夜景為主先排45分鐘；不含排隊登塔。" },
  "d6-9": { from: 60, to: 30, reason: "夜景後自由活動先排30分鐘，避免回飯店太晚。" },
  "d7-3": { from: 135, to: 105, reason: "名古屋城與本丸御殿先排105分鐘，保留排隊及拍照緩衝。" },
  "d7-5": { from: 210, to: 150, reason: "大須購物先排2.5小時，下午整理與晚餐另有時間。" },
  "d7-6": { from: 90, to: 45, reason: "整理戰利品與休息先排45分鐘，避免重複計入自由購物。" },
  "d7-7": { from: 90, to: 75, reason: "一般晚餐先排75分鐘；熱門店候位需另外加時。" },
};

export function reviewStayDurations(days: TripDay[]): TripDay[] {
  return days.map(day => {
    const changes = day.items.some(item => stayDurationReview[item.id]?.from === durationOf(item));
    if (!changes) return day;
    let saved = 0;
    let cursor = 0;
    const items = day.items.map(item => {
      const review = stayDurationReview[item.id];
      const apply = review && durationOf(item) === review.from;
      const times = readTime(item.time);
      const start = times[0] ?? cursor;
      // Preserve existing travel/meal gaps; only reclaim time explicitly removed from stops.
      const newStart = Math.max(cursor, item.id === "d4-11" ? 17 * 60 + 25 : start - saved);
      const originalDuration = times.length > 1 ? Math.max(0, times[1] - start) : durationOf(item);
      const duration = apply ? review.to : originalDuration;
      const end = newStart + duration;
      saved = start + originalDuration - end;
      cursor = end;
      const time = `${item.time.includes("約") ? "約 " : ""}${formatClock(newStart)}${times.length > 1 || (apply && duration) ? `–${formatClock(end)}` : ""}`;
      return { ...item, time, ...(apply ? { durationMinutes: review.to, notes: `${item.notes ? `${item.notes}\n` : ""}停留建議：${review.reason}` } : {}) };
    });
    return { ...day, items };
  });
}

// Reference import consumes existing gaps first; never silently moves a planned departure earlier.
export function reflowWithGaps(items: TripItem[], travel: TravelMinutes): TripItem[] {
  let cursor = dayStart(items);
  let previous: TripItem | undefined;
  return items.map((item, index) => {
    const original = readTime(item.time);
    const milestone = index === items.length - 1 && item.type === "transport" && original.length === 1 && item.place?.id === previous?.place?.id;
    const duration = milestone ? 0 : durationOf(item);
    const movement = previous && item.place ? Math.max(0, travel(previous, item)) : 0;
    const scheduled = item.type === "transport" ? Math.max(duration, movement) : duration;
    const start = Math.max(original[0] ?? cursor, cursor + (item.type === "transport" ? 0 : movement));
    cursor = start + scheduled;
    if (item.place) previous = item;
    return { ...item, order: index + 1, durationMinutes: duration, time: `${item.time.includes("約") ? "約 " : ""}${formatClock(start)}${scheduled ? `–${formatClock(cursor)}` : ""}` };
  });
}

export function reflow(items: TripItem[], start = dayStart(items), travel: TravelMinutes = () => 0): TripItem[] {
  let cursor = start;
  let previousPlace: TripItem | undefined;
  return items.map((item, index) => {
    const duration = durationOf(item);
    const minutes = previousPlace && item.place ? Math.max(0, Math.round(travel(previousPlace, item))) : 0;
    // Transport cards already represent the journey: count it only once.
    const scheduledDuration = item.type === "transport" ? Math.max(duration, minutes) : duration;
    if (item.type !== "transport") cursor += minutes;
    const startAt = cursor;
    cursor += scheduledDuration;
    if (item.place) previousPlace = item;
    return {
      ...item, order: index + 1, durationMinutes: duration,
      time: `${item.time.includes("約") ? "約 " : ""}${formatClock(startAt)}${scheduledDuration ? `–${formatClock(cursor)}` : ""}`,
    };
  });
}

export function reorderAndReflow(items: TripItem[], fromId: string, toId: string, travel?: TravelMinutes): TripItem[] {
  const from = items.findIndex((item) => item.id === fromId);
  const to = items.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return reflow(next, dayStart(items), travel);
}
