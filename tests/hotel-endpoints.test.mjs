import test from "node:test";
import assert from "node:assert/strict";
import { initialDays, hotelOptions, hotelsForDay } from "../src/lib/trip-data.ts";
import { withHotelEndpoints } from "../src/lib/timing.ts";

test("hotel endpoints preserve airport exceptions, original times and repeat safely", () => {
  const result = withHotelEndpoints(initialDays, hotelOptions);
  assert.equal(result[0].items[0].place.id, "komatsu-airport");
  assert.equal(result[7].items.at(-1).place.id, "centrair");
  for (const day of result) {
    if (day.day > 1) assert.equal(day.items[0].place.id, hotelOptions.find(h => h.days.includes(day.day - 1)).place.id);
    if (day.day < 8) assert.equal(day.items.at(-1).place.id, hotelOptions.find(h => h.days.includes(day.day)).place.id);
    for (const original of initialDays.find(d => d.day === day.day).items) assert.equal(day.items.find(i => i.id === original.id).time, original.time);
  }
  assert.deepEqual(withHotelEndpoints(result, hotelOptions), result);
  assert.equal(result[2].items.filter(i => i.title.includes("回飯店")).length, 1);
});
test("only tonight's hotel is purple, including hotel-change and departure days", () => {
  assert.deepEqual(hotelsForDay(2).map(h => [h.hotel.id, h.current]), [["torifito-kanazawa", true]]);
  assert.deepEqual(hotelsForDay(3).map(h => [h.hotel.id, h.current]), [["torifito-kanazawa", false], ["gift-takayama", true]]);
  assert.deepEqual(hotelsForDay(4).map(h => [h.hotel.id, h.current]), [["gift-takayama", false], ["grand-base-nagoya", true]]);
  assert.deepEqual(hotelsForDay(8).map(h => [h.hotel.id, h.current]), [["grand-base-nagoya", false]]);
  assert.equal(hotelsForDay(3, true).filter(h => h.current).length, 1);
});
