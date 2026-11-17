import test from "node:test";
import assert from "node:assert/strict";
import { initialDays, hotelOptions, placeCatalog } from "../src/lib/trip-data.ts";
import { withHotelEndpoints, reviewStayDurations, correctNavigation, readTime } from "../src/lib/timing.ts";
import { planEarlyStarts } from "../src/lib/early-starts.ts";
import { reviewRouteSchedule } from "../src/lib/route-schedule-review.ts";
test("route review keeps D2 gate only and schedules meals, train buffers and flight safely",()=>{
 const base=correctNavigation({days:planEarlyStarts(reviewStayDurations(withHotelEndpoints(initialDays,hotelOptions))),travelLegs:{}},placeCatalog).days;
 const days=reviewRouteSchedule(base), get=id=>days.flatMap(d=>d.items).find(i=>i.id===id);
 assert.equal(get("d3-gate-morning"),undefined);assert.ok(get("d2-gate-morning"));
 assert.equal(get("d3-hotel-start").time,"約 07:00");
 assert.equal(get("d4-10").durationMinutes,120);assert.equal(get("d4-10").checkpoint,undefined);
 assert.equal(get("d8-5").time,"13:15");assert.equal(get("d8-4").time,"10:25–12:05");
 assert.deepEqual(days[6],base[6]);assert.deepEqual(reviewRouteSchedule(days),days);
 for(const d of days)for(let n=1;n<d.items.length;n++){
  const previous=readTime(d.items[n-1].time), current=readTime(d.items[n].time);
  assert.ok(current[0]>=(previous[1]??previous[0]),`Overlap ${d.items[n-1].id} → ${d.items[n].id}`);
 }
});
