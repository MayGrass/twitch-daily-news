# Twitch 日報

> 本專案由 Claude AI 輔助完成

## 專案說明

這是一個純前端的 Twitch 聊天室每日摘要展示頁面，將原系統的管理功能完全移除，僅保留瀏覽功能。

**架構設計：**

- **前端**：靜態 HTML/JS，部署於 GitHub Pages
- **資料源**：Google Sheets（透過 Apps Script 提供 JSON API）
- **資料更新**：由獨立的機器人系統自動更新 Google Sheets

## 檔案結構

```
twitch-daily-news/
├── index.html       # 頁面主體
├── daily-report.js  # 前端邏輯
└── Code.gs          # Google Apps Script API
```

## 部署流程

### 1. 設定 Google Sheets API

1. 建立 Google Sheets 試算表
2. 每個 Twitch 頻道建立一個分頁（分頁名稱 = 頻道英文 ID）
3. 格式：
   - A 欄：`date`（YYYY-MM-DD）
   - B 欄：`summary_json`（完整 JSON 字串）

4. 開啟「擴充功能」→「Apps Script」
5. 貼上 `Code.gs` 內容
6. 部署為「網頁應用程式」：
   - 執行身分：我
   - 存取權限：**任何人**
7. 複製部署 URL

### 2. 部署前端

1. 修改 `daily-report.js` 中的 `API_BASE_URL`
2. 推送到 GitHub Repository
3. 啟用 GitHub Pages（Settings → Pages → 選擇 main 分支）

## 使用方式

```
https://YOUR_USERNAME.github.io/twitch-daily-news/?channel=godjj
```

預設頻道：`godjj`（無 URL 參數時自動載入）

## Google Sheets 資料格式

| date       | summary_json                                    |
|------------|-------------------------------------------------|
| 2026-02-09 | `{"hot_topics":[...],"new_memes":[...],...}`   |
| 2026-02-08 | `{"hot_topics":[...],"new_memes":[...],...}`   |

## 測試

在 Apps Script 編輯器中執行 `testApi()` 函數，檢查執行記錄確認 API 正常運作。
