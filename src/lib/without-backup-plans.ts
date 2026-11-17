import type { TripDay } from "./trip-data";

// Retire old saved contingency content without changing the actual itinerary or times.
export function withoutBackupPlans(days: TripDay[]): TripDay[] {
  return days.map(day => {
    const { backup: _backup, ...rest } = day as TripDay & { backup?: string };
    return { ...rest, items: day.items.map(item => {
      const next = { ...item };
      if (next.checkpoint && /雪|延誤/.test(next.checkpoint.title)) delete next.checkpoint;
      if (next.id === "d3-4" && next.notes) next.notes = next.notes.replace("雪況影響時縮短觀光，不以準點抵達為保證。", "");
      if (next.id === "d4-4" && next.notes === "彈性項目；候車或雪況需要額外時間時優先略過。") delete next.notes;
      if (next.id === "d4-11" && /遇雪或延誤須改用/.test(next.notes ?? "")) next.notes = "確認已選班次、轉乘與末班車。";
      return next;
    }) };
  });
}
