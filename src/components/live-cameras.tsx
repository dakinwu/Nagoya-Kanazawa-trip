"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const kanazawaSource = "https://www4.city.kanazawa.lg.jp/shiseijoho/koho_kocho/koho/9809.html";
const cameras = [
  { id: "kenrokuen", name: "兼六園", region: "金澤", video: "5uNwdsIUZOw", url: kanazawaSource, note: "金澤市官方影像；僅開園時間播放。可觀察園內積雪與天氣。" },
  { id: "station", name: "金澤站", region: "金澤", video: "ZvpzzHKDUL0", url: kanazawaSource, note: "金澤市官方影像；可觀察車站周邊天氣與現場狀況。" },
  { id: "museum", name: "21 世紀美術館", region: "金澤", video: "ZWT_bUOOU1M", url: kanazawaSource, note: "金澤市官方影像；可觀察市中心天氣與地面狀況。" },
  { id: "shirakawa", name: "合掌村展望台", region: "白川鄉", video: null, url: "https://kankou.shirakawa-go.org/livecam/", note: "白川村官方影像，從荻町城跡展望台拍攝。照片約每分鐘更新；日本時間 19:00–05:00 停止自動更新。" },
];

export function LiveCameras({ area, open, onOpenChange }: { area: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [selected, setSelected] = useState("kenrokuen");
  useEffect(() => { if (open) setSelected(area.includes("白川") ? "shirakawa" : "kenrokuen"); }, [open, area]);
  const camera = cameras.find(item => item.id === selected)!;
  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="live-camera-dialog">
        <DialogHeader><DialogTitle>現地影像</DialogTitle><DialogDescription>出發前看看積雪、天氣與現場狀況；影像不代表交通是否正常運行。</DialogDescription></DialogHeader>
        <label className="live-camera-selector"><span>選擇鏡頭</span><select value={selected} onChange={event => setSelected(event.target.value)}>{cameras.map(item => <option value={item.id} key={item.id}>{item.region} · {item.name}</option>)}</select></label>
        {open && camera.video ? <iframe key={camera.id} className="live-camera-player" src={`https://www.youtube-nocookie.com/embed/${camera.video}?playsinline=1`} title={`${camera.name}官方即時影像`} allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/> : <div className="live-camera-external"><Video size={32}/><strong>白川鄉 · 合掌村全景</strong><p>依官方要求，不直接引用影像檔。請開啟官方頁面觀看最新照片。</p></div>}
        <p className="live-camera-note">{camera.note}</p>
        <a className="live-camera-source" href={camera.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={18}/>{camera.video ? "無法播放？開啟官方頁面" : "開啟白川村官方即時影像"}</a>
        <p className="live-camera-note">時間皆以日本時間為準。配信可能因維護、天候或網路中斷；請確認畫面上的日期與時間。關閉此視窗即停止載入影片。</p>
      </DialogContent>
    </Dialog>
  </>;
}
