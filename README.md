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
截至 2026/08/17，2027/2 的完整交通／活動資料尚未全部發布，網站刻意不寫死：
- 小松機場 → 金澤巴士
- 金澤 → 白川鄉 → 高山高速巴士
- 高山本線／特急ひだ
- 白川鄉 2027 冬季活動
- 柳橋中央市場營業日
- Pokémon Center NAGOYA 2/14 整理券
- Urban Quar 2/15 臨時休館

## GitHub Pages 更新
把上述網站檔案覆蓋到原 Repository，Commit 到 Pages 使用的 `main / (root)` 即可，不需要重新設定 Pages。

## Supabase
`cloud-config.js` 的 Function URL 要換成自己的 Supabase Edge Function；不要把 `TRIP_SHARE_SECRET`、`service_role` 或 Secret Key 放進 GitHub Repository。
