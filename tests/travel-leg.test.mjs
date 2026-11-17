import test from "node:test";
import assert from "node:assert/strict";
import { updateTravelLeg } from "../src/lib/travel-leg.ts";

test("switch modes and JSON reload retain independently entered times", () => {
  const estimate = () => 10;
  let leg = updateTravelLeg({ mode: "transit", minutes: 15 }, { minutes: 75 }, estimate);
  leg = updateTravelLeg(leg, { mode: "walk" }, estimate);
  assert.equal(leg.confirmed, false);
  leg = updateTravelLeg(leg, { minutes: 120 }, estimate);
  leg = updateTravelLeg(JSON.parse(JSON.stringify(leg)), { mode: "transit" }, estimate);
  assert.equal(leg.minutes, 75);
  assert.equal(leg.confirmed, true);
  leg = updateTravelLeg(leg, { mode: "walk" }, estimate);
  assert.equal(leg.minutes, 120);
  assert.equal(leg.confirmed, true);
});

test("legacy records are retained but not automatically treated as checked", () => {
  const leg = updateTravelLeg({ mode: "transit", minutes: 55 }, { mode: "transit" }, () => 10);
  assert.equal(leg.minutes, 55);
  assert.equal(leg.confirmed, false);
  assert.equal(updateTravelLeg(leg, { minutes: 0 }, () => 10).confirmed, true);
});
