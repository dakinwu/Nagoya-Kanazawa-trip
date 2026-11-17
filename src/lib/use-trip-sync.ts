import { useEffect, useRef, useState } from "react";
import { cloudKey, cloudRequest, getToken, parseCloudDocument, TOKEN_KEY, type CloudDocument } from "./cloud.ts";
type Status = "loading" | "saved" | "local" | "saving" | "offline" | "conflict" | "error";
type Session = { code: string; local: string; remote: string | null; loaded: boolean; busy: boolean; blocked: boolean; dirty: boolean };
const keyFor = (code: string) => `nagoya-hokuriku-pages:trip:${code}`;
const fresh = (code: string): Session => ({ code, local: "", remote: null, loaded: false, busy: false, blocked: false, dirty: false });

export function useTripSync<T>(code: string, state: T, setState: (state: T) => void, normalize: (state: Partial<T>) => T, seed: T, enabled: boolean) {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [readyCode, setReadyCode] = useState("");
  const [tick, setTick] = useState(0);
  const [connected, setConnected] = useState(false);
  const session = useRef(fresh(""));
  const latest = useRef(state); latest.current = state;
  const norm = useRef(normalize); norm.current = normalize;

  useEffect(() => {
    if (!enabled) return;
    const current = fresh(code); session.current = current;
    setReadyCode(""); setConnected(false); setMessage("");
    try {
      const raw = localStorage.getItem(keyFor(code));
      const loaded = norm.current(raw ? JSON.parse(raw) : seed);
      const document = JSON.stringify(loaded);
      localStorage.setItem(keyFor(code), document);
      current.local = document; current.dirty = Boolean(raw);
      setState(loaded); setReadyCode(code); setStatus("local");
    } catch { setStatus("error"); setMessage("本機行程無法讀取或儲存，原資料仍保留；請檢查瀏覽器儲存設定。"); }
  }, [code, enabled]);

  useEffect(() => {
    const current = session.current;
    if (!enabled || readyCode !== code) return;
    const document = JSON.stringify(state);
    if (document === current.local) return;
    try {
      localStorage.setItem(keyFor(code), document);
      current.local = document; current.dirty = true;
      if (!current.blocked) setStatus(connected ? "saving" : "local");
    } catch { setStatus("error"); setMessage("本機儲存失敗，請先匯出備份再關閉頁面。"); return; }
    if (current.blocked || !connected) return;
    const timer = setTimeout(() => setTick(n => n + 1), 900);
    return () => clearTimeout(timer);
  }, [state, enabled, readyCode, code, connected]);

  const synchronize = async (token: string, mode: "normal" | "remote" | "local" = "normal") => {
    const current = session.current;
    if (current.code !== code || readyCode !== code || current.busy || (current.blocked && mode === "normal")) return false;
    current.busy = true; setStatus("saving"); setMessage("");
    try {
      const result = await cloudRequest(token);
      if (session.current !== current) return false;
      const remote = parseCloudDocument<T>(result.states?.[cloudKey(code)]);
      if (remote) {
        const loaded = norm.current(remote.state), document = JSON.stringify(loaded);
        if (document === JSON.stringify(latest.current)) { current.remote = remote.revision; current.dirty = false; }
        else if (mode === "remote" || (!current.dirty && mode !== "local")) {
          localStorage.setItem(keyFor(code), document);
          current.local = document; current.remote = remote.revision; current.dirty = false; setState(loaded);
        } else if (mode !== "local" && (!current.loaded || current.remote !== remote.revision)) {
          current.blocked = true; setConnected(true); setStatus("conflict");
          setMessage("雲端與本機行程不同，兩份都已保留。請選擇要使用的版本。"); return false;
        }
      } else if (mode === "remote") throw new Error("此旅程尚無雲端行程，已保留本機版本");
      if (mode !== "remote" && (!remote || current.dirty || mode === "local")) {
        const saving = JSON.stringify(latest.current);
        const document: CloudDocument<T> = { version: 1, state: JSON.parse(saving), revision: crypto.randomUUID(), updatedAt: new Date().toISOString() };
        await cloudRequest(token, { [cloudKey(code)]: document });
        if (session.current !== current) return false;
        current.remote = document.revision; current.dirty = JSON.stringify(latest.current) !== saving;
      }
      current.loaded = true; current.blocked = false;
      setConnected(true); setStatus(current.dirty ? "saving" : "saved");
      if (current.dirty) setTick(n => n + 1);
      return true;
    } catch (error) {
      if (session.current === current) { setStatus("offline"); setMessage(error instanceof Error ? error.message : "無法連線，行程已保存在本機"); }
      return false;
    } finally { current.busy = false; }
  };
  const syncRef = useRef(synchronize); syncRef.current = synchronize;
  useEffect(() => { if (enabled && readyCode === code && getToken()) void syncRef.current(getToken()); }, [enabled, readyCode, code, tick]);
  useEffect(() => {
    if (readyCode !== code) return;
    const sync = () => { if (getToken() && document.visibilityState === "visible") setTick(n => n + 1); };
    const timer = setInterval(sync, Math.max(10000, window.TRIP_CLOUD_CONFIG?.syncIntervalMs || 60000));
    window.addEventListener("online", sync); window.addEventListener("focus", sync); document.addEventListener("visibilitychange", sync);
    return () => { clearInterval(timer); window.removeEventListener("online", sync); window.removeEventListener("focus", sync); document.removeEventListener("visibilitychange", sync); };
  }, [readyCode, code]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === keyFor(code) && event.newValue && event.newValue !== session.current.local) {
        session.current.blocked = true; setStatus("conflict"); setMessage("另一個分頁修改了本機行程，請先匯出備份再重新載入。");
      }
    };
    window.addEventListener("storage", changed); return () => window.removeEventListener("storage", changed);
  }, [code]);
  return {
    status, message, connected, ready: readyCode === code,
    retry: () => { if (readyCode !== code) window.location.reload(); else setTick(n => n + 1); },
    reload: () => { if (getToken()) void syncRef.current(getToken(), "remote"); else window.location.reload(); },
    useLocal: () => { if (getToken()) void syncRef.current(getToken(), "local"); },
    connect: async (token: string) => {
      try { await cloudRequest(token); localStorage.setItem(TOKEN_KEY, token); }
      catch (error) { setMessage(error instanceof Error ? error.message : "無法驗證共享碼"); return false; }
      return syncRef.current(token);
    },
    disconnect: () => { localStorage.removeItem(TOKEN_KEY); session.current = { ...session.current, busy: false, blocked: false, loaded: false }; setConnected(false); setStatus("local"); setMessage(""); },
  };
}
