/**
 * Google Apps Script for Breakout Game Leaderboard
 * 
 * 這個腳本用於處理敲磚塊遊戲的排行榜數據
 * 將其部署為Web App後，可以通過遊戲將分數保存到Google Sheets
 */

// 設置Google Sheets ID (需要替換為你的實際Sheets ID)
const SPREADSHEET_ID = 'AKfycbww-tH1PAJ0YWb4VRbfxGParQDW_J9dFx5hOdhuFYLt_s4LIVBtCI2hVVPR3-RPg3qlPg';
const SHEET_NAME = 'Leaderboard';

/**
 * 處理Web請求的主函數
 */
function doGet(e) {
  // 檢查是否有action參數
  if (!e.parameter.action) {
    return ContentService.createTextOutput(JSON.stringify({
      'error': '缺少action參數'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 根據action參數執行不同操作
  switch (e.parameter.action) {
    case 'getScores':
      return getScores();
    default:
      return ContentService.createTextOutput(JSON.stringify({
        'error': '未知的action參數: ' + e.parameter.action
      })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 處理POST請求
 */
function doPost(e) {
  try {
    // 解析請求數據
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        'error': '無效的JSON數據'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 檢查action參數
    if (!data.action) {
      return ContentService.createTextOutput(JSON.stringify({
        'error': '缺少action參數'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 根據action參數執行不同操作
    switch (data.action) {
      case 'addScore':
        return addScore(data.data);
      default:
        return ContentService.createTextOutput(JSON.stringify({
          'error': '未知的action參數: ' + data.action
        })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'error': '處理請求時發生錯誤: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 獲取排行榜數據
 */
function getScores() {
  try {
    // 獲取電子表格和工作表
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // 檢查工作表是否存在
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        'error': '找不到指定的工作表'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 獲取數據範圍
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // 檢查是否有數據
    if (values.length <= 1) { // 只有標題行或沒有數據
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 提取標題行
    const headers = values[0];
    
    // 將數據轉換為對象數組
    const scores = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const score = {};
      
      // 將每一列與對應的標題關聯
      for (let j = 0; j < headers.length; j++) {
        score[headers[j]] = row[j];
      }
      
      scores.push(score);
    }
    
    // 返回JSON格式的數據
    return ContentService.createTextOutput(JSON.stringify(scores))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'error': '獲取排行榜數據時發生錯誤: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 添加分數到排行榜
 */
function addScore(scoreData) {
  try {
    // 驗證分數數據
    if (!scoreData || !scoreData.name || !scoreData.score || !scoreData.level) {
      return ContentService.createTextOutput(JSON.stringify({
        'error': '缺少必要的分數數據'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 獲取電子表格和工作表
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // 如果工作表不存在，則創建一個
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      // 添加標題行
      sheet.appendRow(['name', 'score', 'level', 'date']);
    }
    
    // 添加分數數據
    sheet.appendRow([
      scoreData.name,
      scoreData.score,
      scoreData.level,
      new Date().toISOString()
    ]);
    
    // 排序數據（按分數降序）
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // 提取標題行
    const headers = values.shift();
    
    // 按分數降序排序
    values.sort((a, b) => b[1] - a[1]); // 假設分數在第2列（索引1）
    
    // 清除工作表並重新填充數據
    sheet.clear();
    sheet.appendRow(headers);
    values.forEach(row => sheet.appendRow(row));
    
    // 返回成功消息
    return ContentService.createTextOutput(JSON.stringify({
      'success': true,
      'message': '分數已成功添加到排行榜'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'error': '添加分數時發生錯誤: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}