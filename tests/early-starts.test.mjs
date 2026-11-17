import test from "node:test";
import assert from "node:assert/strict";
import { initialDays, hotelOptions } from "../src/lib/trip-data.ts";
import { withHotelEndpoints, correctNavigation, reviewStayDurations, readTime } from "../src/lib/timing.ts";
import { placeCatalog } from "../src/lib/trip-data.ts";
import { planEarlyStarts } from "../src/lib/early-starts.ts";
test("D2–D7 each has a sightseeing stop before 09:00 without changing D1/D8", () => {
  const days = correctNavigation({ days: reviewStayDurations(withHotelEndpoints(initialDays, hotelOptions)), travelLegs: {} }, placeCatalog).days;
  const result = planEarlyStarts(days);
  for (const day of result.filter(d => d.day > 1 && d.day < 8)) assert.ok(day.items.some(i => i.type === "place" && readTime(i.time)[0] < 540), `D${day.day}`);
  assert.deepEqual(result[0], days[0]); assert.deepEqual(result[7], days[7]);
  assert.deepEqual(planEarlyStarts(result), result);
  for (const id of ["d3-1", "d3-2", "d3-3"]) assert.deepEqual(result[2].items.find(i=>i.id===id), {...days[2].items.find(i=>i.id===id),order:days[2].items.find(i=>i.id===id).order+1});
  for (const day of result) for (let n=1;n<day.items.length;n++) assert.ok(readTime(day.items[n].time)[0] >= readTime(day.items[n-1].time)[0], `order D${day.day}`);
});
