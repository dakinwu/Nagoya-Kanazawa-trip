# 中部・北陸 2027｜旅行地圖（GitHub Pages）

以原旅遊網站 2026-11-17 的最新程式版本為基礎，移植為可直接部署在 GitHub Pages 的地圖行程工具。日期為 2027/2/9–2/16。

- 桌機雙欄地圖、手機底部行程面板、D1–D8 日期切換、拖曳排序與停留時間編輯。
- 保留最新住宿與行程修正：D1/D2 Hotel Torifito Kanazawa、FORUS 5F、D2 鼓門、飯店 Google Maps 地點資訊連結、刪除備援方案。
- 美食時段篩選、私人商店地圖選點、待買清單、行前準備、預算及官方現地影像入口。
- OpenStreetMap 底圖；兩點交通由按鈕開啟 Google Maps，不使用 Google Maps Platform。

## 儲存與同步

行程、準備與預算先保存在本機；頂部顯示「已存本機」。點頂部儲存狀態，在「Supabase 旅行共享碼」輸入舊版使用的共享碼，即可連接既有後端。**旅程代碼不是共享碼**，不會把公開的 `HOKURIKU-2027` 當成驗證密碼。

保留原 `cloud-config.js` 及後端，不需修改資料表或重新部署 Supabase。新地圖行程寫入原 namespace 下的 `map-planner:<旅程代碼>` 欄位，保留舊版勾選與預算欄位；舊版完整頁面仍可從儲存設定開啟 `legacy.html`。

既有後端沒有原子版本比對，因此前端會在寫入前讀取並比較版本；偵測到差異時停止自動覆蓋，讓使用者選擇本機或雲端。此機制無法保證兩人同一瞬間寫入時完全沒有競爭，建議避免同時修改同一旅程。

商店、個人待買清單及自行新增的美食只保存在目前瀏覽器，不會傳到共用 Supabase。此版本沒有 ChatGPT 帳號登入，也不會同步原 ChatGPT 網站的 D1 資料庫。共用同一瀏覽器設定檔的人可以讀到同一份本機清單；清除網站資料會移除本機資料。儲存設定內可匯出包含行程與私人清單的 JSON 備份。

Google Maps 含精確座標的長連結可定位；分享短網址在純靜態網站無法可靠展開，會提示改用地圖選點。含店名的地點網址仍會自動帶入店名。

## 開發與更新

需要 Node.js 22.13 以上。

```bash
npm ci
npm test
npm run build
npm run publish:files
```

`src/` 保存完整 React/TypeScript 原始碼。`npm run build` 產生 `dist/`；`npm run publish:files` 把建置結果複製到儲存庫根目錄。將根目錄輸出與原始碼一起提交到 `main`，即可沿用 Pages 的 `main / (root)` 設定。正式 `cloud-config.js` 與 `cloud-sync.js` 不會被此步驟覆蓋。

```bash
npm run dev
```

開發伺服器使用同一套響應式介面。PWA（可加入手機主畫面的網站）使用相對路徑，支援 `/Nagoya-Kanazawa-trip/` 專案子目錄；離線快取介面與程式，不快取私人雲端請求或外部地圖圖磚。

---

<details><summary>舊版更新紀錄</summary>

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


## V13 Config Cache Fix

- `cloud-config.js` is no longer precached as a fixed app-shell asset. Online loads explicitly bypass the HTTP cache and refresh the PWA fallback copy.
- `index.html` cache-busts `cloud-config.js`, `cloud-sync.js`, and Service Worker registration (`v=13`).
- `cloud-sync.js` reads `window.TRIP_CLOUD_CONFIG` dynamically instead of freezing `configured` at startup.
- This fixes the case where GitHub already contains a valid Supabase Function URL but the UI still says the Function URL is not configured.


## V14 Layout Completion

- Added the missing `stay-card`, `stay-head`, `stay-rank`, and `stay-facts` styles so the Takayama lodging criteria card no longer renders as raw unpadded text.
- Added the previously missing `grid-3` layout used by the itinerary flexibility legend; it becomes one column on mobile.
- Verified the accommodation tab DOM structure: the Takayama card remains inside `#stay`, and the following Onsen tab is not nested incorrectly.
- Corrected one stale Kanazawa lodging warning from `2027/2/9–2/12` to the current two-night stay `2027/2/9–2/11`.
- PWA cache bumped to `nagoya-hokuriku-trip-v14-2027-v6-layout-completion`.
## V15 Mobile Navigation + Lodging Decision

- Mobile bottom navigation now jumps **directly to the current Day card** instead of only returning to the tab bar.
- Mobile map action opens the current Day, expands `當日工具`, and scrolls to that Day's Google Maps block; a hidden Day caused by search/filter is restored automatically.
- Mobile `資訊` opens the secondary-tab menu instead of forcing the App/offline page.
- On mobile, normal tab changes scroll to the activated panel so `住宿` / `預算` / secondary tabs visibly change content.
- Kanazawa lodging was re-ranked using the user-provided 19-property price snapshot plus route fit: 6 main finalists, 4 secondary options, and explicit reasons for deprioritizing the rest.
- Lodging shortlist checkboxes remain **recommendation-only**; they do not automatically rewrite itinerary events or Google Maps.
- PWA cache: `nagoya-hokuriku-trip-v15-2027-v6-mobile-nav-lodging`.



## V16：最終住宿 → 行程／地圖連動

- 「保留候選」仍可多選，只作 shortlist。
- 新增「金澤最終住宿」：只能指定 1 間，狀態寫入 `hotel-final-kanazawa` 並可透過 Supabase 多人同步。
- 選定後自動更新 D1／D2 的住宿名稱，以及 D1 金澤站→飯店、飯店→Pokémon Center、D2 飯店→近江町、D3 飯店→金澤站的 Google Maps 連結。
- 「已完成預訂」沿用 `book-hotel-k`，與「最終住宿」分開，避免把「決定」誤當成「已下訂」。
- 清除最終住宿只會移除單一最終選擇，不會刪除 shortlist 或已預訂勾選。
- `cloud-sync.js` 新增字串型 shared state 支援；`cloud-config.js` 不需修改。


</details>
