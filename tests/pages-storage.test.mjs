import test from "node:test";
import assert from "node:assert/strict";
import { localApi, PRIVATE_KEY, exportBackup } from "../src/lib/local-api.ts";
import { cloudKey, cloudRequest, parseCloudDocument } from "../src/lib/cloud.ts";

const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
globalThis.window = { TRIP_CLOUD_CONFIG: { functionUrl: "https://test.supabase.co/functions/v1/trip-state", namespace: "nagoya-hokuriku-v6-2027" } };
const call = async (path, method = "GET", body) => { const response = await localApi(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: response.status, data: await response.json() }; };

test("private shop and linked shopping items persist together, outside shared snapshots", async () => {
  memory.clear();
  const result = await call("/api/stores", "POST", { name: "測試商店", city: "金澤", googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=36.57,136.65", latitude: 36.57, longitude: 136.65, shoppingItems: ["防曬乳", "伴手禮"] });
  assert.equal(result.status, 201);
  assert.equal((await call("/api/stores")).data.stores[0].id, result.data.store.id);
  const items = (await call("/api/shopping")).data.items;
  assert.equal(items.length, 2);
  assert.equal(items[0].storeId, result.data.store.id);
  const checked = await call("/api/shopping", "PATCH", { id: items[0].id, done: true });
  assert.equal(checked.data.item.done, true);
  assert.equal(exportBackup("TEST", {}).privateData.shopping[0].done, true);
  await call("/api/shopping", "DELETE", { id: items[0].id });
  assert.equal((await call("/api/shopping")).data.items.length, 1);
  assert.equal(memory.size, 1);
  assert.ok(memory.has(PRIVATE_KEY));
});

test("invalid shop data never leaves orphan shopping items", async () => {
  memory.clear();
  const result = await call("/api/stores", "POST", { name: "bad", city: "金澤", googleMapsUrl: "javascript:alert(1)", latitude: 200, longitude: 0, shoppingItems: ["should not exist"] });
  assert.equal(result.status, 400);
  assert.equal(memory.size, 0);
  assert.equal((await call("/api/shopping", "POST", { label: "bad store", storeId: crypto.randomUUID() })).status, 400);
});

test("food coordinates use place coordinates, never the map viewport center", async () => {
  memory.clear();
  const result = await call("/api/places", "POST", { name: "測試餐廳", city: "金澤", category: "午餐", googleMapsUrl: "https://www.google.com/maps/place/Test/@1,2,15z/data=!3d36.57!4d136.65" });
  assert.equal(result.status, 201);
  assert.equal(result.data.place.latitude, 36.57);
  assert.equal(result.data.place.longitude, 136.65);
  const short = await call("/api/stores/resolve", "POST", { url: "https://maps.app.goo.gl/example" });
  assert.equal(short.status, 422);
  assert.match(short.data.error, /地圖/);
});

test("unreadable browser data returns an error without overwriting it", async () => {
  memory.set(PRIVATE_KEY, "damaged");
  const old = console.error; console.error = () => {};
  try { assert.equal((await call("/api/shopping")).status, 503); assert.equal(memory.get(PRIVATE_KEY), "damaged"); }
  finally { console.error = old; memory.clear(); }
});

test("cloud uses the existing namespace and request protocol, with no private payload", async () => {
  const previous = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, init) => { request = { url, init }; return Response.json({ ok: true }); };
  try {
    const key = cloudKey("TEST");
    const value = { version: 1, state: { days: [] }, revision: "1", updatedAt: "now" };
    await cloudRequest("test-token", { [key]: value });
    assert.equal(request.init.headers["x-trip-share-token"], "test-token");
    assert.deepEqual(JSON.parse(request.init.body), { changes: { "nagoya-hokuriku-v6-2027:map-planner:TEST": value } });
    assert.equal(request.init.cache, "no-store");
    assert.equal(parseCloudDocument(value).revision, "1");
    assert.throws(() => parseCloudDocument({ state: {} }));
  } finally { globalThis.fetch = previous; }
});
