import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { googleRouteUrl } from "../src/lib/google-route.ts";
import { initialDays } from "../src/lib/trip-data.ts";
import { reviewStayDurations, durationOf, readTime } from "../src/lib/timing.ts";

test("Google Maps link supplies both endpoints but lets Google offer transport modes", () => {
  const from = { latitude: 36.1, longitude: 136.2 }, to = { latitude: 35.3, longitude: 137.4 };
  const url = new URL(googleRouteUrl(from, to));
  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.pathname, "/maps/dir/");
  assert.equal(url.searchParams.get("origin"), "36.1,136.2");
  assert.equal(url.searchParams.get("destination"), "35.3,137.4");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.has("travelmode"), false);
  assert.equal(url.searchParams.has("dir_action"), false);
});
test("between-point UI contains only one external route action", () => {
  const source = readFileSync(new URL("../src/components/trip-planner.tsx", import.meta.url), "utf8");
  const row = source.match(/<div className="route-link-row">[\s\S]*?<\/div>/)?.[0];
  assert.ok(row);
  assert.equal((row.match(/<a /g) ?? []).length, 1);
  assert.ok(row.includes("googleRouteUrl(previousMapped.place, entry.place)"));
  for (const feature of ['className="travel-mode"', 'className="travel-duration"', 'className="route-reference"', 'className="transit-help"', 'const setTravelLeg', 'cacheRouteReferences(']) assert.ok(!source.includes(feature));
});
test("stay recommendations keep core Pokémon, Shirakawago, hot-spring and airport time", () => {
  const result = reviewStayDurations(initialDays);
  const get = id => result.flatMap(d=>d.items).find(i=>i.id===id);
  for (const [id, minutes] of [["d1-6",120],["d6-5",120],["d3-4",270],["d7-8",105],["d6-3",60],["d7-3",105],["d7-5",150]]) assert.equal(durationOf(get(id)), minutes);
  assert.strictEqual(result[7], initialDays[7]);
  assert.equal(get("d8-5").time, "13:15");
  assert.deepEqual(reviewStayDurations(result), result);
});
test("review preserves existing inter-stop gaps and custom durations", () => {
  const days = structuredClone(initialDays);
  days[5].items.find(i=>i.id==='d6-1').durationMinutes = 80;
  const result = reviewStayDurations(days);
  assert.equal(result[5].items.find(i=>i.id==='d6-1').durationMinutes, 80);
  for (const number of [1, 2, 3, 5, 6, 7]) {
    const old = days[number - 1].items, next = result[number - 1].items;
    for (let i=1;i<old.length;i++) {
      const oldGap = readTime(old[i].time)[0] - (readTime(old[i-1].time)[1] ?? readTime(old[i-1].time)[0] + durationOf(old[i-1]));
      const newGap = readTime(next[i].time)[0] - (readTime(next[i-1].time)[1] ?? readTime(next[i-1].time)[0] + durationOf(next[i-1]));
      if (oldGap >= 0) assert.equal(newGap, oldGap, `${old[i].id} lost its travel buffer`);
    }
  }
});
