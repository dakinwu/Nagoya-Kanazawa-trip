import { localApi } from "@/lib/local-api";
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, MapPin, Pencil, Plus, ShoppingBag, Store, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { StorePlace } from "@/lib/store-data";

type Item = { id: string; label: string; quantity: string; note: string | null; done: boolean; storeId: string | null };
const blank = { label: "", quantity: "1", note: "", storeId: "" };

export function ShoppingSheet({ open, onOpenChange, stores, initialScope, onLocate, storesError }: {
  open: boolean; onOpenChange: (open: boolean) => void; stores: StorePlace[];
  initialScope: string; onLocate: (store: StorePlace) => void; storesError: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [scope, setScope] = useState(initialScope);
  const [status, setStatus] = useState<"loading" | "ready" | "auth" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!open) return;
    setScope(initialScope);
    setEditing(null); setShowForm(false);
    setForm({ ...blank, storeId: initialScope === "all" || initialScope === "general" ? "" : initialScope });
  }, [open, initialScope]);
  useEffect(() => {
    if (!open) { setItems([]); return; }
    const controller = new AbortController();
    setStatus("loading");
    localApi("/api/shopping", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (response.status === 401) { setItems([]); setStatus("auth"); return; }
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!controller.signal.aborted) { setItems(data.items); setStatus("ready"); }
    }).catch(() => { if (!controller.signal.aborted) { setItems([]); setStatus("error"); } });
    return () => controller.abort();
  }, [open, retry]);

  const request = async (method: string, payload: object, key: string) => {
    if (busy.current) return null;
    busy.current = true; setPending(key);
    try {
      const response = await localApi("/api/shopping", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (response.status === 401) { setItems([]); setStatus("auth"); }
      if (!response.ok) throw new Error(data.error || "未儲存，請重試");
      return data;
    } catch (error) { toast.error(error instanceof Error ? error.message : "連線失敗，請重試"); return null; }
    finally { busy.current = false; setPending(null); }
  };
  const save = async () => {
    const data = await request(editing ? "PATCH" : "POST", { ...form, storeId: form.storeId || null, ...(editing ? { id: editing } : {}) }, "form");
    if (!data) return;
    setItems((old) => editing ? old.map((item) => item.id === editing ? data.item : item) : [...old, data.item]);
    setScope(form.storeId || "general"); setEditing(null); setShowForm(false);
    setForm({ ...blank, storeId: form.storeId });
    toast.success("已儲存到你的購物清單");
  };
  const toggle = async (item: Item) => {
    const data = await request("PATCH", { id: item.id, done: !item.done }, item.id);
    if (data) setItems((old) => old.map((entry) => entry.id === item.id ? data.item : entry));
  };
  const remove = async (item: Item) => {
    if (!await request("DELETE", { id: item.id }, item.id)) return;
    setItems((old) => old.filter((entry) => entry.id !== item.id));
    toast.success("已刪除品項");
  };
  const selectedStore = stores.find((store) => store.id === scope);
  const scoped = items.filter((item) => scope === "all" || (scope === "general" ? !item.storeId : item.storeId === scope));
  const count = (id: string | null) => items.filter((item) => item.storeId === id && !item.done).length;
  const filtered = scoped.filter((item) => !item.done || showDone).sort((a, b) => Number(a.done) - Number(b.done));
  const groups = scope === "all"
    ? [{ id: null, name: "一般待買" }, ...Array.from(new Set(items.map((item) => item.storeId).filter((id): id is string => Boolean(id)))).map((id) => ({ id, name: stores.find((store) => store.id === id)?.name || "指定商店（資料載入中）" }))]
    : [{ id: scope === "general" ? null : scope, name: selectedStore?.name || "一般待買" }];

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="shopping-sheet shopping-hub">
      <SheetHeader><SheetTitle className="shopping-title"><ShoppingBag/>我的購物清單</SheetTitle><SheetDescription>商店、待買商品與勾選紀錄只保存在這個瀏覽器，不會上傳到共用行程。</SheetDescription></SheetHeader>
      <div className="shopping-body">
        {status === "loading" ? <div className="sheet-loading"><LoaderCircle className="animate-spin"/>讀取你的清單中</div>
        : status === "auth" ? <div className="signin-panel"><ShoppingBag/><strong>登入後查看自己的待買商品</strong><a href="/signin-with-chatgpt?return_to=%2F" target="_top">使用 ChatGPT 登入</a></div>
        : status === "error" ? <div className="shopping-empty" role="alert"><strong>清單暫時無法載入</strong><Button onClick={() => setRetry((v) => v + 1)}>重新載入</Button></div>
        : <>
          <div className="shopping-scope">
            <label htmlFor="shopping-scope">購買地點</label>
            <NativeSelect id="shopping-scope" value={scope} onChange={(e) => setScope(e.target.value)} disabled={showForm}>
              <option value="all">全部待買 · {items.filter((item) => !item.done).length}</option>
              <option value="general">一般待買 · {count(null)}</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name} · {count(store.id)}</option>)}
            </NativeSelect>
            {storesError && <p role="alert">{storesError}</p>}
            {selectedStore ? <div className="shopping-store-context"><Store/><div><strong>{selectedStore.name}</strong><small>{selectedStore.city} · {selectedStore.address || "指定分店"}</small></div><Button variant="outline" aria-label="在地圖查看這間商店" onClick={() => onLocate(selectedStore)}><MapPin/></Button></div>
              : <p>藥妝、伴手禮不必綁定分店，直接放「一般待買」。</p>}
          </div>
          <div className="shopping-toolbar"><span>{scoped.filter((item) => !item.done).length} 項待買</span><label><Checkbox checked={showDone} onCheckedChange={(v) => setShowDone(Boolean(v))}/>顯示已買（{scoped.filter((item) => item.done).length}）</label></div>
          {!showForm ? <Button className="shopping-new" onClick={() => { setEditing(null); setForm({ ...blank, storeId: selectedStore?.id || "" }); setShowForm(true); }}><Plus/>新增待買商品</Button>
          : <form className="shopping-editor" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="shopping-editor-title"><strong>{editing ? "編輯商品" : "新增商品"}</strong><button type="button" disabled={!!pending} aria-label="收起商品表單" onClick={() => setShowForm(false)}><X size={18}/></button></div>
            <label>品名<Input required maxLength={120} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="例如：限定色唇膏"/></label>
            <label>數量<Input required maxLength={30} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}/></label>
            <label>購買商店（選填）<NativeSelect value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}><option value="">一般待買 · 不指定商店</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</NativeSelect></label>
            <label>私人備註<Input maxLength={300} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="色號、規格、想買的品牌…"/></label>
            <Button type="submit" disabled={!!pending || !form.label.trim() || !form.quantity.trim()}>{pending === "form" ? <LoaderCircle className="animate-spin"/> : <Check/>}儲存</Button>
          </form>}
          <div className="shopping-groups">
            {groups.map((group) => {
              const rows = filtered.filter((item) => item.storeId === group.id);
              if (!rows.length) return null;
              return <section key={group.id || "general"}><h3>{group.id ? <Store size={16}/> : <ShoppingBag size={16}/>} {group.name}</h3>
                {rows.map((item) => <div className={`shopping-product ${item.done ? "done" : ""}`} key={item.id}>
                  <Checkbox disabled={!!pending} checked={item.done} aria-label={`${item.done ? "改回待買" : "標記已買"}：${item.label}`} onCheckedChange={() => void toggle(item)}/>
                  <div><strong>{item.label}</strong><small>數量：{item.quantity}</small>{item.note && <p>{item.note}</p>}</div>
                  <button disabled={!!pending} aria-label={`編輯 ${item.label}`} onClick={() => { setEditing(item.id); setForm({ label: item.label, quantity: item.quantity, note: item.note || "", storeId: item.storeId || "" }); setShowForm(true); }}><Pencil size={17}/></button>
                  <button disabled={!!pending} aria-label={`刪除 ${item.label}`} onClick={() => void remove(item)}><Trash2 size={17}/></button>
                </div>)}
              </section>;
            })}
            {!filtered.length && <div className="shopping-empty"><ShoppingBag/><strong>{scoped.length ? "這裡的商品都買齊了" : "還沒有待買商品"}</strong><span>{selectedStore ? "新增後會自動指定這間商店。" : "一般待買也能隨時改成指定商店。"}</span></div>}
          </div>
        </>}
      </div>
    </SheetContent>
  </Sheet>;
}
