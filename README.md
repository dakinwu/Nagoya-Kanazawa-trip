# 名古屋・金澤・白川鄉 8天7夜互動行程

GitHub Pages 靜態旅行網站，包含每日行程、Google Maps 交通、預約 Dashboard、住宿候選、預算、雨雪備案、PWA 離線快取，以及可選的 Supabase 多人共用同步。

## 多人同步範圍

啟用旅行共享碼後，以下資料會同步到 Supabase：

- 行程完成勾選
- 訂位／準備狀態
- 住宿決選
- 每日預算

以下仍只保存在各自瀏覽器：

- 冬季行李勾選
- 深色模式
- 單日顯示模式
- 其他個人 UI 偏好

## 網站檔案

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

## Supabase 後台參考檔

這三個檔案是設定 Supabase 用的，不一定要上傳 GitHub Pages：

```text
supabase-setup.sql
edge-function-trip-state.ts
supabase-config.toml
```

## Supabase 設定摘要

1. 在 Supabase SQL Editor 執行 `supabase-setup.sql`。
2. 在 Edge Functions 建立 `trip-state`，貼上 `edge-function-trip-state.ts`。
3. 新增 Secret：`TRIP_SHARE_SECRET`。
4. 可選新增 `TRIP_ALLOWED_ORIGIN=https://你的帳號.github.io`。
5. 將 `trip-state` 的 JWT verification 關閉；CLI 對應設定為 `supabase-config.toml` 中的 `verify_jwt = false`。
6. 在 `cloud-config.js` 把 `YOUR_PROJECT_REF` 換成 Supabase Project Reference。
7. 把網站檔案 Commit 到 GitHub Pages。

## 共用方式

網站仍可在沒有共享碼時正常使用，此時資料只存在本機；輸入正確共享碼後，網站會在開啟、回到前景、恢復網路以及固定週期同步雲端資料。

修改會先寫入本機，因此短暫離線時仍可操作；恢復網路後會嘗試補同步。

## 安全提醒

- 不要把 `TRIP_SHARE_SECRET` 寫進 GitHub Repository。
- 不要把 Supabase Secret Key / `service_role` 放進瀏覽器程式。
- 持有旅行共享碼的人具有共同編輯權限。
- 不要在共用網站儲存護照號碼、信用卡、訂位密碼等敏感資訊。
