import type { TripItem } from "@/lib/trip-data";

type TimeShape = "range" | "single" | "after" | "unknown";
type ParsedTime = {
  start: number | null;
  duration: number;
  shape: TimeShape;
  approximate: boolean;
  around: boolean;
};

const defaultDuration: Record<TripItem["type"], number> = {
  place: 90,
  meal: 60,
  lodging: 30,
  transport: 60,
  airport_station: 15,
  reservation: 15,
  buffer: 45,
  rest: 60,
  note: 45,
};

const clockToMinutes = (hour: string, minute: string) => Number(hour) * 60 + Number(minute);

const parseTime = (item: TripItem): ParsedTime => {
  const matches = [...item.time.matchAll(/(\d{1,2}):(\d{2})/g)];
  if (!matches.length) return { start: null, duration: defaultDuration[item.type], shape: "unknown", approximate: false, around: false };

  const start = clockToMinutes(matches[0][1], matches[0][2]);
  const approximate = item.time.includes("約");
  const around = item.time.includes("前後");
  if (matches.length >= 2) {
    let end = clockToMinutes(matches[1][1], matches[1][2]);
    if (end < start) end += 24 * 60;
    return { start, duration: Math.max(5, end - start), shape: "range", approximate, around };
  }
  if (item.time.includes("之後")) return { start, duration: defaultDuration[item.type], shape: "after", approximate, around };
  return { start, duration: 0, shape: "single", approximate, around };
};

const formatClock = (minutes: number) => {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(normalized / 60).toString().padStart(2, "0");
  const minute = (normalized % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
};

const formatTime = (start: number, timing: ParsedTime, isLast: boolean) => {
  const prefix = timing.approximate ? "約 " : "";
  if (timing.shape === "single") return `${prefix}${formatClock(start)}${timing.around ? " 前後" : ""}`;
  if (timing.shape === "after" && isLast) return `${prefix}${formatClock(start)} 之後`;
  const duration = Math.max(5, timing.duration);
  return `${prefix}${formatClock(start)}–${formatClock(start + duration)}`;
};

export const reorderAndReflow = (items: TripItem[], fromId: string, toId: string) => {
  const from = items.findIndex((item) => item.id === fromId);
  const to = items.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0 || from === to) return items;

  const originalTimings = items.map(parseTime);
  const timingById = new Map(items.map((item, index) => [item.id, originalTimings[index]]));
  const anchor = Math.min(...originalTimings.flatMap((timing) => timing.start === null ? [] : [timing.start]));
  const startMinute = Number.isFinite(anchor) ? anchor : 9 * 60;
  const positionGaps = originalTimings.map((timing, index) => {
    const nextStart = originalTimings[index + 1]?.start;
    if (timing.start === null || nextStart === null || nextStart === undefined) return 15;
    return Math.max(0, Math.min(90, nextStart - timing.start - timing.duration));
  });

  const reordered = [...items];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);

  let cursor = startMinute;
  return reordered.map((item, index) => {
    const timing = timingById.get(item.id) ?? parseTime(item);
    const scheduled = { ...item, order: index + 1, time: formatTime(cursor, timing, index === reordered.length - 1) };
    cursor += timing.duration + (positionGaps[index] ?? 15);
    return scheduled;
  });
};
