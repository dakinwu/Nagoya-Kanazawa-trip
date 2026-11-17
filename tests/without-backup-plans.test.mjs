import test from "node:test";
import assert from "node:assert/strict";
import { withoutBackupPlans } from "../src/lib/without-backup-plans.ts";
import { initialDays } from "../src/lib/trip-data.ts";

test("legacy saved backup plans are removed without losing itinerary items or times", () => {
  const input = structuredClone(initialDays);
  for (const day of input) day.backup = "大雪時取消觀光";
  const day = input[3];
  day.items[0].checkpoint = { time: "15:30", title: "雪況與返程班次提前確認", notes: "遇雪縮短巡禮" };
  const before = structuredClone(input);
  const cleaned = withoutBackupPlans(input);
  for (const [i, result] of cleaned.entries()) {
    assert.ok(!Object.hasOwn(result, "backup"));
    assert.deepEqual(result.items.map(x => [x.id,x.title,x.time,x.durationMinutes,x.place,x.completed]), before[i].items.map(x => [x.id,x.title,x.time,x.durationMinutes,x.place,x.completed]));
  }
  assert.equal(cleaned[3].items[0].checkpoint, undefined);
  assert.deepEqual(input, before, "do not mutate a loaded shared document");
  assert.deepEqual(withoutBackupPlans(cleaned), cleaned);
});
