# Google Sheets 排行榜安全設定指南

這份指南說明如何用 Google Apps Script 儲存敲磚塊遊戲排行榜，同時避免把 Spreadsheet ID、Web App URL 或 token 提交到公開 GitHub。

> 安全提醒：靜態前端網站無法真正保護任何寫在 JavaScript 裡的 secret。此專案預設只使用瀏覽器本機排行榜。若要公開雲端排行榜，建議改用自己的後端或 serverless proxy 做驗證與限速。

## 目前安全預設

- `game.js` 不再硬編碼任何 Google Apps Script URL。
- `google_sheet_script.js` 不再硬編碼 Spreadsheet ID。
- Apps Script 需要 `LEADERBOARD_TOKEN` 才會接受讀取或寫入請求。
- 玩家名稱、分數與關卡會在後端驗證，並避免 Google Sheets 公式注入。
- PWA 快取不再快取 Apps Script 範例檔，避免瀏覽器長期留住舊設定。

## 步驟 1：建立 Google Sheets

1. 開啟 Google Sheets 並建立新的試算表。
2. 建立或保留一個名為 `Leaderboard` 的工作表。
3. 第一列請放以下欄位：
   - A1: `name`
   - B1: `score`
   - C1: `level`
   - D1: `date`
4. 從試算表網址取得 Spreadsheet ID：
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

## 步驟 2：設定 Apps Script

1. 在 Google Sheets 中選擇「擴充功能」>「Apps Script」。
2. 刪除預設程式碼。
3. 複製本 repo 的 `google_sheet_script.js` 到 Apps Script 編輯器。
4. 開啟 Apps Script 的「專案設定」>「Script Properties」。
5. 新增以下屬性：

| Property | 說明 |
|---|---|
| `SPREADSHEET_ID` | 你的 Google Sheets ID。不要放進 GitHub。 |
| `LEADERBOARD_TOKEN` | 自行產生的長隨機字串。建議至少 32 字元。不要放進 GitHub。 |

可以用以下方式產生 token：

```bash
openssl rand -hex 32
```

## 步驟 3：部署為 Web App

1. 點擊「部署」>「新增部署」。
2. 類型選擇「網頁應用程式」。
3. 執行身分選擇「以我的身份執行」。
4. 存取權限若設定為「任何人」，請務必保留 `LEADERBOARD_TOKEN` 驗證。
5. 部署後複製 Web App URL。

## 步驟 4：前端設定方式

不要把真正的 Web App URL 或 token commit 到公開 repo。

若只是自己測試，可以在瀏覽器 console 暫時設定：

```javascript
window.BREAKOUT_LEADERBOARD_ENDPOINT = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
window.BREAKOUT_LEADERBOARD_TOKEN = 'YOUR_RANDOM_TOKEN';
```

如果要正式公開，建議建立自己的後端 proxy，讓前端只呼叫你的後端，由後端保存 Apps Script URL 和 token，並加入：

- rate limit
- 驗證來源
- 分數合理範圍檢查
- reCAPTCHA 或其他濫用防護

## 不建議的做法

請不要把以下內容放進公開檔案：

```javascript
const googleSheetsURL = 'https://script.google.com/macros/s/.../exec';
const token = '...';
const spreadsheetId = '...';
```

公開前端程式碼就像玻璃展示櫃，能執行的字串大家都看得到。

## 故障排除

- 如果排行榜只顯示本機資料，代表沒有設定 `window.BREAKOUT_LEADERBOARD_ENDPOINT`。
- 如果雲端讀寫失敗，確認 Apps Script 的 `SPREADSHEET_ID` 和 `LEADERBOARD_TOKEN` 是否正確。
- 如果舊版仍出現，請重新整理頁面或清除 PWA 快取。
