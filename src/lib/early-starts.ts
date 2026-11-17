import type { TripDay, TripItem, Place } from "./trip-data";

const gate: Place = { id: "kanazawa-tsuzumimon", name: "金澤站鼓門・款待巨蛋", latitude: 36.5785, longitude: 136.6494, city: "金澤", category: "景點", verification: "provisional", googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=金沢駅鼓門" };
const gateSource = { label: "金澤觀光官方介紹", url: "https://www.kanazawa-kankoukyoukai.or.jp/everyone/spot/detail_10050.html" };

// Explicit planning update, not a migration on every load: subsequent user edits stay intact.
export function planEarlyStarts(days: TripDay[]): TripDay[] {
  return days.map(day => {
    if (![2, 3, 5, 6].includes(day.day)) return day;
    let items = day.items.map(item => ({ ...item }));
    const patch = (id: string, value: Partial<TripItem>) => { items = items.map(item => item.id === id ? { ...item, ...value } : item); };
    const stop = (id: string, time: string): TripItem => ({ id, day: day.day, order: 0, time, title: "金澤站鼓門・款待巨蛋晨間拍照", type: "place", priority: "flexible", completed: false, verification: "provisional", durationMinutes: 15, place: gate, notes: "戶外短暫拍照，座標為站東口概略位置；雪天路滑或延誤可略過。", source: gateSource });
    if (day.day === 2) {
      patch("d2-hotel-start", { time: "約 07:45" });
      if (!items.some(i => i.id === "d2-gate-morning")) items.splice(Math.max(0, items.findIndex(i => i.id === "d2-1")), 0, stop("d2-gate-morning", "08:00–08:15"));
      patch("d2-1", { time: "09:00–10:00", durationMinutes: 60, notes: "市場官方一般營業時間為9點起，各店不同；從鼓門到市場含步行與雪天緩衝留45分鐘。2027年休市與店家營業請出發前再確認。", source: { label: "近江町市場官方營業說明", url: "https://ohmicho-ichiba.com/contact02/" } });
    }
    if (day.day === 3) {
      patch("d3-hotel-start", { time: "約 06:35" });
      if (!items.some(i => i.id === "d3-gate-morning")) items.splice(Math.max(0, items.findIndex(i => i.id === "d3-1")), 0, stop("d3-gate-morning", "06:50–07:05"));
      // Keep 07:20 west-side check-in and the unconfirmed 08:00 bus untouched.
    }
    if (day.day === 5) {
      patch("d5-hotel-start", { time: "約 06:15" });
      patch("d5-1", { time: "06:15–06:45", durationMinutes: 30, title: "飯店簡單早餐／前晚預購", place: items.find(i => i.id === "d5-hotel-start")?.place, notes: "為提早到犬山，改在飯店吃前晚買好的早餐，不假設Komeda清晨已開門。" });
      patch("d5-2", { time: "約 07:10–08:10", durationMinutes: 60, notes: "含候車與乘車暫留60分鐘；07:10是規劃出發時間，並非已核實的2027班次。抵達犬山站後另留30分鐘前往神社。" });
      patch("d5-4", { time: "08:40–09:10", durationMinutes: 30, notes: "官方現行開放時間8:30起；2027臨時休業與御朱印受理時間仍須再確認。", source: { label: "犬山觀光官方資訊", url: "https://inuyama.gr.jp/experience/detail/15/" } });
      patch("d5-3", { time: "09:20–10:20", durationMinutes: 60, notes: "先街景散策，店家各自營業；未開門的店可在犬山城後或午餐時再逛。" });
      patch("d5-5", { time: "10:30–11:30", durationMinutes: 60 });
      patch("d5-6", { time: "11:30–12:30", durationMinutes: 60 });
      patch("d5-7", { time: "約 12:30–13:35", durationMinutes: 60 });
      patch("d5-8", { time: "13:35–15:25", durationMinutes: 110 });
      const shrine = items.find(i => i.id === "d5-4");
      if (shrine) { items = items.filter(i => i.id !== shrine.id); items.splice(items.findIndex(i => i.id === "d5-3"), 0, shrine); }
    }
    if (day.day === 6) {
      patch("d6-hotel-start", { time: "約 07:45" });
      patch("d6-1", { time: "08:30–09:45", durationMinutes: 75, notes: "神宮官方說明可24小時參拜；此時段只排境內參拜，不包含寶物館等另有開館時間的設施。後續原定午餐與購物時段保留。", source: { label: "熱田神宮官方參拜說明", url: "https://www.atsutajingu.or.jp/jingu/qa/" } });
    }
    return { ...day, items: items.map((item, index) => ({ ...item, order: index + 1 })) };
  });
}
