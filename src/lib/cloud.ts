export const TOKEN_KEY = "nagoya-hokuriku-2027-v6-cloud-share-token";
export type CloudConfig = { functionUrl?: string; namespace?: string; syncIntervalMs?: number; requestTimeoutMs?: number };
declare global { interface Window { TRIP_CLOUD_CONFIG?: CloudConfig } }
export type CloudDocument<T> = { version: 1; state: T; revision: string; updatedAt: string };
export function cloudKey(code: string) {
  const base = (window.TRIP_CLOUD_CONFIG?.namespace || "nagoya-hokuriku-v6-2027").replace(/[^a-zA-Z0-9._-]/g, "");
  return `${base}:map-planner:${code}`;
}
export function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } }
export async function cloudRequest(token: string, changes?: Record<string, unknown>) {
  const config = window.TRIP_CLOUD_CONFIG || {};
  const url = String(config.functionUrl || "").trim().replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/trip-state$/i.test(url)) throw new Error("尚未設定有效的 Supabase 連線網址");
  if (!token) throw new Error("請輸入原本的旅行共享碼");
  const response = await fetch(url, { method: changes ? "POST" : "GET", headers: { "Content-Type": "application/json", "x-trip-share-token": token }, body: changes ? JSON.stringify({ changes }) : undefined, cache: "no-store", signal: AbortSignal.timeout(config.requestTimeoutMs || 12000) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `同步失敗（${response.status}）`);
  return body as { states?: Record<string, unknown> };
}
export function parseCloudDocument<T>(value: unknown): CloudDocument<T> | null {
  if (value == null) return null;
  if (typeof value !== "object" || !("state" in value) || !("revision" in value) || typeof value.revision !== "string" || !("version" in value) || value.version !== 1) throw new Error("雲端行程格式無法讀取，未覆蓋本機資料");
  return value as CloudDocument<T>;
}
