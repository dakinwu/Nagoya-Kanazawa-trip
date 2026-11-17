import type { Place, TripDay } from "./trip-data";
import { formatClock, readTime } from "./timing.ts";

export function replaceKanazawaHotel(days: TripDay[], hotel: Place): TripDay[] {
  return days.map(day => {
    if (![1,2,3].includes(day.day)) return day;
    const replacing = day.items.some(i => i.place?.id === "dormy-kanazawa");
    return { ...day, items: day.items.map(item => {
      let next = { ...item };
      if (next.place?.id === "dormy-kanazawa") next.place = hotel;
      next.title = next.title.replace(/Dormy Inn Kanazawa Natural Hot Spring|Dormy Inn Kanazawa|Dormy Inn/g, "Hotel Torifito Kanazawa");
      if (next.notes) next.notes = next.notes.replace(/Dormy Inn Kanazawa Natural Hot Spring|Dormy Inn Kanazawa|Dormy Inn/g, "Hotel Torifito Kanazawa");
      if (next.id === "d1-6") next.notes = "位於金澤 FORUS 5 樓。Hotel Torifito 至 FORUS 暫估步行10分鐘，另留約5分鐘上樓；雨雪與實際出入口可能增加時間。";
      if (replacing && day.day === 1 && ["d1-8","d1-9","d1-hotel-end"].includes(next.id)) {
        next.time = readTime(next.time).map(t=>formatClock(t+5)).join("–");
      }
      return next;
    }) };
  });
}
