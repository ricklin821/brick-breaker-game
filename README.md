# 100關敲磚塊遊戲

這是一個具有100個關卡的敲磚塊遊戲，支持排行榜功能並可以將分數保存到Google Sheets。

## 遊戲特色

- 100個漸進式難度的關卡
- 多種磚塊類型（普通、堅固、超級、爆炸性、不可破壞）
- 多種藥丸道具（額外生命、擴大球拍、縮小球拍、減慢球速、加快球速、多重球）
- 本地和雲端排行榜系統
- 響應式設計，適應不同螢幕大小
- 美觀的視覺效果和動畫

## 如何設置Google Sheets整合

### 步驟1：創建Google Sheets

1. 前往 [Google Sheets](https://sheets.google.com/) 並創建一個新的電子表格
2. 將電子表格命名為「Breakout Game Leaderboard」或任何你喜歡的名稱
3. 在第一行添加以下標題：`name`, `score`, `level`, `date`

### 步驟2：設置Google Apps Script

1. 在你的Google Sheets中，點擊「擴充功能」>「Apps Script」
2. 刪除編輯器中的所有默認代碼
3. 複製 `google_sheet_script.js` 中的所有代碼並粘貼到Apps Script編輯器中
4. 將 `SPREADSHEET_ID` 變量的值替換為你的Google Sheets的ID（可以從URL中獲取，格式如：`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`）
5. 點擊「保存」按鈕

### 步驟3：部署為Web App

1. 點擊「部署」>「新增部署」
2. 在「選擇類型」下拉菜單中選擇「網頁應用程式」
3. 設置以下選項：
   - 執行身份：「以我的身份執行」
   - 誰可以存取：「任何人」（這允許遊戲發送數據到你的Google Sheets）
4. 點擊「部署」按鈕
5. 複製生成的Web App URL

### 步驟4：更新遊戲代碼

1. 打開 `game.js` 文件
2. 找到 `saveScoreToGoogleSheets` 和 `loadLeaderboardFromGoogleSheets` 函數
3. 將 `googleSheetsURL` 變量的值替換為你在步驟3中獲得的Web App URL

## 遊戲控制

- **滑鼠移動**：控制球拍左右移動
- **左右方向鍵**：控制球拍左右移動
- **空格鍵**：開始遊戲/暫停遊戲

## 開發者信息

這個遊戲使用純JavaScript、HTML和CSS開發，不依賴任何外部庫或框架。

## 授權

本遊戲代碼可自由使用和修改。