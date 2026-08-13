# 名古屋・金澤・白川鄉 8天7夜互動行程

2026/2/9–2/16 的小松進、金澤・白川鄉・名古屋・犬山行程網站。此版本已依 2026 年 2 月當期日本國定假日、期間活動與重要交通資料重新校正。

## 本版重點

- Day 1 改為 **10:25 抵達小松機場**，直接搭機場巴士前往金澤。
- Pokémon Center 全程只排 **Pokémon Center KANAZAWA** 一次。
- Day 2 加入期間限定的片町雪吊燈飾，晚餐以祝日前夕規格處理。
- Day 3 明確使用 **金澤站西口 4 號乘車處**；白川鄉高速巴士去回程皆需先預約。
- Day 3 回程校正為 **13:50 白川鄉 → 15:05 金澤** 的對應班次，並標註 **2/11 無白川鄉點燈**。
- Day 4 校正為 **Tsurugi 25（14:05→15:02）＋Shirasagi 10（15:10→16:49）**。
- Day 5 改為先登犬山城，再逛城下町；大須刪除不在該區的 BANDAI NAMCO Cross Store。
- Day 6 改為熱田神宮、白鳥庭園、可選情人節活動與 Canal Resort 溫泉。
- Day 7 安排名古屋城本丸御殿、則武之森與最後採買，下午兼作全旅程補漏 buffer。
- Day 8 不再硬寫歷史 μ-SKY 列車號，機場手羽先改用官方可確認的世界の山ちゃん作備選。

## 功能

- 每日互動行程與勾選進度
- Google Maps 每日交通捷徑
- 預約 Dashboard
- 雨雪／延誤備案
- 餐飲 A/B Plan
- 每日與總旅費估算
- 深色模式與手機版固定導航
- PWA 安裝與基本離線快取
- Open Graph 社群分享預覽

## 檔案結構（全放根目錄）

```text
/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── social-preview.png
├── icon-192.png
├── icon-512.png
└── README.md
```

特別採用**無資料夾結構**，方便直接使用 GitHub 網頁介面的 `Add file → Upload files` 一次上傳。

## GitHub Pages 更新

如果 Repository 已經設定為：

```text
Settings → Pages
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

之後不需要重新設定 Pages。把以上檔案上傳到 Repository 根目錄並 `Commit changes`，GitHub Pages 會自動重新部署。

若舊版曾使用 `icons/` 資料夾，本版已改成根目錄的 `icon-192.png` 與 `icon-512.png`，不需要再建立資料夾。

## PWA / 離線

第一次在線開啟網站後，Service Worker 會快取核心檔案。行程頁可基本離線閱讀，但以下功能仍需要網路：

- Google Maps
- 即時道路與交通資訊
- 外部官方網站
- 最新班次、營業資訊與活動公告

## 重要提醒

這是一份歷史日期行程。若未來照此路線再走一次，交通班次、票價、店舖營業時間、接駁車與活動日期都要重新查證。

GitHub Pages 為公開網站，請勿把護照號碼、航空訂位代碼、飯店訂房編號、電話、信用卡等敏感資料寫入公開 Repository。
