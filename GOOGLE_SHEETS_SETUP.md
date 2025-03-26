# Google Sheets 整合設置指南

本文檔提供了詳細的步驟，幫助你設置 Google Sheets 以存儲敲磚塊遊戲的排行榜數據。

## 步驟 1: 創建 Google Sheets 電子表格

1. 前往 [Google Sheets](https://sheets.google.com/) 並登入你的 Google 帳戶
2. 點擊左上角的「+」按鈕創建一個新的電子表格
3. 將電子表格命名為「Breakout Game Leaderboard」（或任何你喜歡的名稱）
4. 在第一行（A1-D1）添加以下標題：
   - A1: `name`
   - B1: `score`
   - C1: `level`
   - D1: `date`

## 步驟 2: 設置 Google Apps Script

1. 在你的 Google Sheets 中，點擊頂部菜單的「擴充功能」>「Apps Script」
2. 這將打開 Google Apps Script 編輯器
3. 刪除編輯器中的所有默認代碼
4. 複製 `google_sheet_script.js` 中的所有代碼並粘貼到 Apps Script 編輯器中
5. 找到以下代碼行：
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```
6. 將 `YOUR_SPREADSHEET_ID_HERE` 替換為你的 Google Sheets 的 ID
   - 你可以從 Google Sheets 的 URL 中獲取 ID，URL 格式如：`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - 例如，如果 URL 是 `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`，則 ID 是 `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
7. 點擊頂部的「保存」按鈕（磁盤圖標）並為項目命名（例如「Breakout Game Leaderboard」）

## 步驟 3: 部署為 Web App

1. 點擊編輯器頂部的「部署」>「新增部署」
2. 在「選擇類型」下拉菜單中選擇「網頁應用程式」
3. 設置以下選項：
   - 執行身份：「以我的身份執行」
   - 誰可以存取：「任何人」（這允許遊戲發送數據到你的 Google Sheets）
4. 點擊「部署」按鈕
5. 系統會要求你授權應用程序訪問你的 Google 帳戶，請點擊「授權訪問」
6. 在彈出的窗口中，選擇你的 Google 帳戶
7. 你可能會看到一個警告說「Google 尚未驗證此應用」，點擊「進階」，然後點擊「前往 [你的項目名稱]（不安全）」
8. 點擊「允許」授予必要的權限
9. 部署完成後，你會看到一個 Web App URL，複製這個 URL

## 步驟 4: 更新遊戲代碼

1. 打開 `game.js` 文件
2. 找到以下兩個函數：
   - `saveScoreToGoogleSheets`
   - `loadLeaderboardFromGoogleSheets`
3. 在這兩個函數中，找到以下代碼行：
   ```javascript
   const googleSheetsURL = 'https://script.google.com/macros/s/AKfycbxyqes9bLwO0MmIOJeH2x0cSwmVSdSZ3HXa-Dsltnwk5uGfMQ5RVQaZVxJtn6_EaQGzQg/exec';
   ```
4. 將 URL 替換為你在步驟 3 中獲得的 Web App URL

## 測試整合

1. 打開遊戲並玩一局
2. 當遊戲結束時，輸入你的名字並點擊「保存分數」
3. 檢查你的 Google Sheets，確認分數已被添加
4. 點擊「排行榜」按鈕，確認排行榜顯示了來自 Google Sheets 的數據

## 故障排除

如果你遇到問題：

1. 確保你的 Web App URL 正確無誤
2. 檢查瀏覽器控制台是否有錯誤消息
3. 確保你已授予應用程序正確的權限
4. 如果使用 Chrome，可能需要允許第三方 Cookie

## 注意事項

- 此設置使用 Google Apps Script 的無伺服器功能，完全免費
- 每天有一定的配額限制，但對於一般使用足夠
- 如果你的遊戲有大量用戶，可能需要考慮更高級的解決方案