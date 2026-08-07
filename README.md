# 名古屋・金澤・白川鄉 8天7夜旅程網站

## GitHub Pages 更新方式

把這個資料夾內的所有檔案與資料夾放到 Repository 根目錄：

- `index.html`
- `manifest.webmanifest`
- `service-worker.js`
- `social-preview.png`
- `icons/`

如果目前 GitHub Pages 已設定為 `main / (root)`，不需要重新設定 Pages；Commit 後會自動部署。

## 這版新增

- 行前預約 Dashboard（與訂位頁同步）
- 單日／今日模式
- 全日雨雪與交通延誤備案
- 每日 Google Maps 交通資訊
- 餐飲 A/B 備援
- 每日可編輯預算與總預算
- PWA 安裝與 Service Worker 離線快取
- Open Graph / Twitter 分享 metadata
- 手機固定底部導航

## PWA 注意事項

Service Worker 必須透過 `https://` 或 localhost 才能運作，因此直接雙擊本機 `index.html` 時不會啟用離線快取；部署到 GitHub Pages 後即可正常註冊。

## 分享預覽圖片

HTML 目前以 `./social-preview.png` 指定預覽圖。若 LINE、Discord 等平台沒有顯示圖片，可把 `og:image` 與 `twitter:image` 改為完整網址，例如：

`https://你的帳號.github.io/你的Repository/social-preview.png`
