import test from "node:test";
import assert from "node:assert/strict";
import { hotelOptions,initialDays } from "../src/lib/trip-data.ts";
import { replaceKanazawaHotel } from "../src/lib/kanazawa-hotel.ts";
test("hotel update replaces all old anchors, adds only five evening minutes once",()=>{
 const days=structuredClone(initialDays);
 days[0].items.find(i=>i.id==="d1-8").place={id:"dormy-kanazawa"};
 days[0].items.find(i=>i.id==="d1-8").title="Dormy Inn Kanazawa 入住＋休息";
 const next=replaceKanazawaHotel(days,hotelOptions[0].place);
 assert.equal(next[0].items.find(i=>i.id==="d1-8").time,"18:05–19:05");
 assert.equal(next[0].items.find(i=>i.id==="d1-8").place.id,"torifito-kanazawa");
 assert.deepEqual(replaceKanazawaHotel(next,hotelOptions[0].place),next);
 assert.deepEqual(next.slice(3),days.slice(3));
});
