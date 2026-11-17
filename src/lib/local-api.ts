import { z } from "zod";
import { importedFoodPlaces, mealPeriods } from "./food-data.ts";
import { isGoogleMapLink, mapCoordinates, mapPlaceName } from "./store-data.ts";

// One record makes creating a store together with its shopping items atomic locally.
export const PRIVATE_KEY = "nagoya-hokuriku-pages:private:v1";
const text = (max: number) => z.string().trim().min(1).max(max);
const mapsUrl = z.string().trim().max(2000).refine(isGoogleMapLink, "請使用有效的 Google Maps 連結");
const storeFields = z.object({
  name: text(120), city: z.enum(["名古屋", "金澤", "高山", "白川鄉", "其他"]),
  address: z.string().max(300).default(""), notes: z.string().max(500).default(""),
  googleMapsUrl: mapsUrl, latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180),
});
const shoppingFields = z.object({ label: text(120), quantity: text(30).default("1"), note: z.string().max(300).default(""), storeId: z.string().uuid().nullable().default(null) });
const shoppingRow = shoppingFields.extend({ id: z.string().uuid(), done: z.boolean() });
const foodFields = z.object({ name: text(120), googleMapsUrl: mapsUrl, city: z.enum(["名古屋", "金澤", "其他"]), category: z.enum(mealPeriods), notes: z.string().max(500).default("") });
const foodRow = foodFields.extend({ id: z.string().uuid(), latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(), address: z.string(), rating: z.null(), reviews: z.null(), source: z.literal("custom"), canDelete: z.literal(true) });
const privateSchema = z.object({ version: z.literal(1), stores: z.array(storeFields.extend({ id: z.string().uuid() })), shopping: z.array(shoppingRow), places: z.array(foodRow) });
type PrivateData = z.infer<typeof privateSchema>;
const empty = (): PrivateData => ({ version: 1, stores: [], shopping: [], places: [] });
function readPrivate(): PrivateData {
  const saved = localStorage.getItem(PRIVATE_KEY);
  return saved ? privateSchema.parse(JSON.parse(saved)) : empty();
}
function writePrivate(data: PrivateData) { localStorage.setItem(PRIVATE_KEY, JSON.stringify(data)); }
const json = (data: unknown, status = 200) => Response.json(data, { status });

/** Local persistence for Pages. This never sends private records to the shared backend. */
export async function localApi(path: string, init: RequestInit = {}): Promise<Response> {
  if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  try {
    const method = init.method || "GET";
    const payload = init.body ? JSON.parse(String(init.body)) : {};
    if (path === "/api/stores/resolve") {
      const url = mapsUrl.parse(payload.url);
      const position = mapCoordinates(url);
      if (!position) return json({ error: "分享短網址無法直接取得精確位置，請用「在地圖上直接標點」選定商店。" }, 422);
      return json({ name: mapPlaceName(url), position });
    }
    const data = readPrivate();
    if (path === "/api/places") {
      if (method === "GET") return json({ places: [...importedFoodPlaces, ...data.places], canEdit: true });
      if (method === "POST") {
        const fields = foodFields.parse(payload);
        const position = mapCoordinates(fields.googleMapsUrl);
        const place = { ...fields, id: crypto.randomUUID(), latitude: position?.latitude ?? null, longitude: position?.longitude ?? null, address: "", rating: null, reviews: null, source: "custom" as const, canDelete: true as const };
        data.places.push(place); writePrivate(data); return json({ place }, 201);
      }
      if (method === "DELETE") {
        const { id } = z.object({ id: z.string().uuid() }).parse(payload);
        if (!data.places.some(place => place.id === id)) return json({ error: "找不到此自訂地點" }, 404);
        data.places = data.places.filter(place => place.id !== id); writePrivate(data); return json({ ok: true });
      }
    }
    if (path === "/api/stores") {
      if (method === "GET") return json({ stores: data.stores });
      if (method === "POST") {
        const { shoppingItems, ...fields } = storeFields.extend({ shoppingItems: z.array(text(120)).max(30).default([]) }).parse(payload);
        const store = { ...fields, id: crypto.randomUUID() };
        data.stores.unshift(store);
        data.shopping.push(...shoppingItems.map(label => ({ id: crypto.randomUUID(), label, quantity: "1", note: "", done: false, storeId: store.id })));
        writePrivate(data); return json({ store }, 201);
      }
    }
    if (path === "/api/shopping") {
      if (method === "GET") return json({ items: data.shopping });
      if (method === "POST") {
        const fields = shoppingFields.parse(payload);
        if (fields.storeId && !data.stores.some(store => store.id === fields.storeId)) return json({ error: "找不到指定商店" }, 400);
        const item = { ...fields, id: crypto.randomUUID(), done: false };
        data.shopping.push(item); writePrivate(data); return json({ item }, 201);
      }
      if (method === "PATCH") {
        const { id, ...fields } = shoppingFields.partial().extend({ id: z.string().uuid(), done: z.boolean().optional() }).parse(payload);
        const index = data.shopping.findIndex(item => item.id === id);
        if (index < 0) return json({ error: "找不到此項目" }, 404);
        if (fields.storeId && !data.stores.some(store => store.id === fields.storeId)) return json({ error: "找不到指定商店" }, 400);
        const item = { ...data.shopping[index], ...fields };
        data.shopping[index] = item; writePrivate(data); return json({ item });
      }
      if (method === "DELETE") {
        const { id } = z.object({ id: z.string().uuid() }).parse(payload);
        if (!data.shopping.some(item => item.id === id)) return json({ error: "找不到此項目" }, 404);
        data.shopping = data.shopping.filter(item => item.id !== id); writePrivate(data); return json({ ok: true });
      }
    }
    return json({ error: "無法執行此操作" }, 405);
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: "請確認輸入內容與 Google Maps 連結" }, 400);
    console.error("Local storage failed", error);
    return json({ error: "瀏覽器資料無法讀取或儲存；請檢查儲存空間與瀏覽器設定。原資料仍保留。" }, 503);
  }
}

export function exportBackup(code: string, state: unknown) {
  return { app: "nagoya-hokuriku-pages", version: 1, exportedAt: new Date().toISOString(), code, state, privateData: readPrivate() };
}
