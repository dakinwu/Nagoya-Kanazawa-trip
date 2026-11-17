"use client";
import { useState } from "react";
import { MapPin, Plus, ShoppingBag, Store } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { StorePlace } from "@/lib/store-data";

export function StoreDirectory({ open, onOpenChange, stores, onLocate, onShopping, onAdd }: {
  open: boolean; onOpenChange: (open: boolean) => void; stores: StorePlace[];
  onLocate: (store: StorePlace) => void; onShopping: (store: StorePlace) => void; onAdd: () => void;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(30);
  const filtered = stores.filter(store => [store.name, store.city, store.address, store.notes].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="store-directory">
      <DialogHeader><DialogTitle><Store size={22}/>我的商店 · {stores.length}</DialogTitle><DialogDescription>只有你看得到，包含地圖目前範圍外的商店。</DialogDescription></DialogHeader>
      <Input aria-label="搜尋我的商店" placeholder="搜尋商店、城市或地址" value={query} onChange={event => { setQuery(event.target.value); setLimit(30); }}/>
      <div className="store-directory-list">
        {filtered.slice(0, limit).map(store => <article key={store.id}><h3>{store.name}</h3><p>{store.city}{store.address ? ` · ${store.address}` : ""}</p>
          <div><Button variant="outline" onClick={() => onLocate(store)}><MapPin/>地圖定位</Button><Button variant="outline" onClick={() => onShopping(store)}><ShoppingBag/>待買清單</Button></div>
        </article>)}
        {!filtered.length && <p className="empty-state">沒有符合的商店</p>}
        {filtered.length > limit && <Button variant="outline" onClick={() => setLimit(value => value + 30)}>再顯示 30 間（共 {filtered.length} 間）</Button>}
      </div>
      <Button onClick={onAdd}><Plus/>新增私人商店</Button>
    </DialogContent>
  </Dialog>;
}
