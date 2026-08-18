# 2027 名古屋・金澤・白川鄉・高山・飛驒古川 8天7夜 V6

GitHub Pages 靜態互動行程網站。行程日期：2027/2/9–2/16。

## V6 路線
小松 → 金澤（2 晚）→ 白川鄉 → 高山（1 晚）→ 飛驒古川 → 名古屋（4 晚）→ 犬山／名古屋市區 → 中部國際機場。

## 核心功能
- 【核心／彈性／可刪】三級行程標記
- 每日 Google Maps 交通捷徑
- 雨雪／延誤備案
- 預約 Dashboard、預算、住宿候選
- PWA 離線快取
- Supabase 共享碼多人同步

## V6 Semantic Color UI
核心＝藍、彈性＝琥珀、可刪＝灰；成功／同步完成＝綠、待處理＝琥珀、錯誤＝紅。主要按鈕使用品牌藍，其餘控制項維持中性色。

## V6 Mobile UI Cleanup
760px 以下維持手機專用 Bottom Navigation；已整理 Responsive CSS、Hero 間距、Day Meta、2×2 主分頁、iPhone/PWA safe-area、Bottom Sheet 與 sticky toolbar 捲動空間。

## V6 Desktop Workspace
1100px 以上啟用桌機旅行工作台：
- 左側 Sticky Navigation：主要功能、其他功能、D1–D8 與同步／完成狀態
- Journey Rail：路線圖同時作為 Day 導覽
- Context Bar：顯示目前正在閱讀的 Day／功能，以及核心・彈性・可刪數量
- Scroll Spy：全旅程模式向下閱讀時，左側與 Journey Rail 會跟著目前 Day 高亮
- Desktop Hover Guidance：核心／彈性／可刪標籤提供滑鼠提示
- 桌機頂部 Overview Grid：日期提醒、摘要、第一次使用與 Dashboard 重新排版，讓主要工作台更早進入視野

1100px 以下不啟用左側 Workspace，沿用既有平板／手機資訊架構，避免窄螢幕硬塞雙欄。

## 專案結構
```text
/
├── index.html
├── cloud-config.js
├── cloud-sync.js
├── manifest.webmanifest
├── service-worker.js
├── social-preview.png
├── README.md
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 2027 待確認
截至 2026/08/18，2027/2 的完整交通／活動資料尚未全部發布，網站刻意不寫死：
- 小松機場 → 金澤巴士
- 金澤 → 白川鄉 → 高山高速巴士
- 高山本線／特急ひだ
- 白川鄉 2027 冬季活動
- 柳橋中央市場營業日
- Pokémon Center NAGOYA 2/14 整理券
- Urban Quar 2/15 臨時休館

## GitHub Pages 更新
把網站檔案覆蓋到原 Repository，Commit 到 Pages 使用的 `main / (root)` 即可，不需要重新設定 Pages。

## Supabase
`cloud-config.js` 的 Function URL 要換成自己的 Supabase Edge Function；不要把 `TRIP_SHARE_SECRET`、`service_role` 或 Secret Key 放進 GitHub Repository。

## V11 Desktop Freeze Fix

本版修正 Desktop Workspace 的雲端狀態監聽造成頁面卡住的問題。

原因：舊版 `MutationObserver` 監聽整個 `document.body`，callback 又會修改 `#desktopCloudText`，因此該修改會再次觸發同一個 Observer，形成無限 microtask 迴圈。

修正：只監聽真正會變動的 `#tripCloudButton`；按鈕尚未掛載時使用一次性的 mount observer，找到按鈕後立即 disconnect，並且只有文字實際不同時才更新桌機狀態文字。

PWA Cache 已升級為 `nagoya-hokuriku-trip-v11-2027-v6-desktop-freeze-fix`。

## V12 Supabase Sync Fix

本版修正旅行共享碼「按下後像沒反應」以及多人資料 namespace 不一致問題。

- `cloud-sync.js` 現在會明確顯示：未設定 Function URL、共享碼錯誤、連線逾時、CORS／網路失敗、同步成功。
- 所有寫入的 state key 都會加上 `nagoya-hokuriku-v6-2027:` namespace，與讀取邏輯一致。
- 若資料庫內仍有 V11 以前的無 namespace 舊資料，第一次成功連線時會把能辨識的舊 key 自動搬到新 namespace。
- Edge Function 請求加入 12 秒 timeout，避免畫面長時間停在「同步中」。
- PWA Cache 已升級為 `nagoya-hokuriku-trip-v12-2027-v6-supabase-sync-fix`。

### 重要：不要覆蓋正式 `cloud-config.js`

若 GitHub 上的 `cloud-config.js` 已經填入真正的 Supabase Project Reference，更新時只上傳 V12 update-only ZIP 內的檔案。

若目前 `cloud-config.js` 已經變回以下佔位值：

```js
functionUrl: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/trip-state'
```

請先把 `YOUR_PROJECT_REF` 改回你的 Supabase Project Reference；Project Reference 不是 Secret，但 `TRIP_SHARE_SECRET`、Secret Key、`service_role` 絕對不要放到 GitHub Pages。

