# 名古屋・金澤・白川鄉 8天7夜互動行程

一個以 **GitHub Pages** 部署的純前端旅行行程網站，整理 2026 年 2 月「小松 → 金澤 → 白川鄉 → 名古屋 → 犬山」8 天 7 夜行程。

網站以手機旅途中實際操作為優先，整合每日行程、Google Maps 交通、預約管理、雨雪備案、預算、餐廳替代方案與 PWA 離線功能。

## 功能

- Day 1～Day 8 每日互動行程
- 單日模式與每日交通摘要
- Google Maps 大眾運輸、步行與道路資訊捷徑
- 行前預約 Dashboard
- 白川鄉濃飛／北鐵高速巴士預約提醒
- 每日雨雪與交通延誤備案
- 熱門餐廳 A / B 替代方案
- 每日預算與全旅程預算統計
- 行程完成勾選與本機狀態保存
- 深色模式
- 手機 Responsive Design
- 手機固定底部導覽
- PWA 安裝支援
- 基本離線閱讀
- Open Graph / Social Preview 分享預覽

## 行程概覽

| Day | 地區 | 重點 |
|---|---|---|
| Day 1 | 小松・金澤 | 小松機場、金澤站、Pokémon Center KANAZAWA |
| Day 2 | 金澤 | 近江町市場、東茶屋街、兼六園、金澤城、Animate |
| Day 3 | 白川鄉 | 金澤 ⇄ 白川鄉合掌村 |
| Day 4 | 金澤 → 名古屋 | 北陸新幹線、敦賀轉乘、榮、Oasis 21 |
| Day 5 | 犬山・大須 | 犬山城、三光稻荷神社、大須商店街 |
| Day 6 | 名古屋 | 熱田神宮、白鳥庭園、Animate、Canal Resort |
| Day 7 | 名古屋 | 名古屋城、則武之森、自由採買／補漏 |
| Day 8 | 名古屋 → 中部國際機場 | 機場移動、伴手禮、返台 |

## 專案結構

```text
/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── social-preview.png
├── README.md
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 使用技術

此專案目前刻意維持輕量，不使用 React 或後端服務。

- HTML
- CSS
- Vanilla JavaScript
- `localStorage`：保存勾選、預約與預算等本機狀態
- Google Maps URLs：開啟導航與交通資訊
- Web App Manifest：PWA 安裝資訊
- Service Worker：基本離線快取
- GitHub Pages：靜態網站部署

## GitHub Pages 部署

### 1. 建立 Repository

建立一個 Public repository，例如：

```text
nagoya-kanazawa-trip
```

### 2. 上傳檔案

將本專案所有檔案放在 Repository 根目錄。

確認 `index.html` 不要包在額外的子資料夾中。

### 3. 開啟 GitHub Pages

進入：

```text
Settings
→ Pages
```

設定：

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

按下 `Save`。

之後每次修改並 Commit 到 `main`，GitHub Pages 都會自動重新部署，不需要重新設定 Pages。

網站網址通常會是：

```text
https://<你的 GitHub 帳號>.github.io/<Repository 名稱>/
```

## 更新網站

如果只是修改行程內容：

1. 更新 `index.html`
2. 上傳／Commit 到 `main`
3. 等待 GitHub Pages 自動部署完成

若修改 PWA 快取內容，建議同時更新 `service-worker.js` 的 cache version，避免使用者長時間看到舊版資源。

## PWA 與離線功能

網站可在支援的瀏覽器中加入手機主畫面。

離線後仍可閱讀已快取的網站內容，但下列功能仍需要網路：

- Google Maps
- 即時路況
- 即時大眾運輸班次
- 外部官方網站
- 最新營業時間與交通公告

> 建議在旅行開始前，先使用手機打開網站一次，讓靜態資源完成快取。

## Google Maps

每日交通卡使用 Google Maps URL 開啟：

- 大眾運輸
- 步行
- 開車／道路資訊
- 指定起點與終點

白川鄉高速巴士等需要預約的交通工具，Google Maps 僅作為位置與交通參考，**不能取代正式訂位**。

## 資料保存

預約狀態、行程勾選與預算資料主要存於瀏覽器的 `localStorage`。

因此：

- 不同裝置之間不會自動同步
- 無痕模式可能不會長期保存
- 清除瀏覽器網站資料後，紀錄可能消失

此專案目前沒有後端資料庫，也不會把使用者的勾選狀態上傳至伺服器。

## 手機版

網站採 Responsive Web Design，主要針對旅途中手機操作設計：

- 320px 以上螢幕可使用
- 行程卡片自動改為單欄
- 導航與 Tabs 支援窄螢幕
- 手機底部提供主要功能快捷入口
- Google Maps 導航可直接交由手機 App 處理

## 重要提醒

此行程內容以規劃版本為主。交通班次、票價、營業時間、休館日、積雪與道路狀況都可能變動。

特別是：

- 金澤 ⇄ 白川鄉高速巴士
- 北陸新幹線與特急列車
- 冬季道路狀況
- 熱門餐廳營業與候位
- 溫泉設施接駁車

實際出發前請再以官方資訊確認。

## 隱私

這是一個可公開部署的 GitHub Pages 網站。

請不要把以下資訊直接寫進 Repository：

- 護照號碼
- 航空公司訂位代碼
- 飯店訂房編號
- 個人電話
- 信用卡資訊
- 其他敏感個資

## License

此 Repository 主要供私人旅行規劃與分享使用。

若未另外加入開源授權文件，預設不代表任何人可自由複製、修改或重新散布專案內容。
