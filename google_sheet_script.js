/**
 * Google Apps Script for Breakout Game Leaderboard
 *
 * 安全預設：
 * 1. 不把 Spreadsheet ID 或 token 寫在公開程式碼裡。
 * 2. 透過 Script Properties 設定 SPREADSHEET_ID 與 LEADERBOARD_TOKEN。
 * 3. 驗證輸入、限制欄位長度、避免 Google Sheets 公式注入。
 */

const SHEET_NAME = 'Leaderboard';
const MAX_NAME_LENGTH = 24;
const MAX_SCORE = 1000000;
const MAX_LEVEL = 100;
const MAX_ROWS_TO_KEEP = 100;

function doGet(e) {
  try {
    if (!isAuthorized_(e)) return json_({ error: 'unauthorized' }, 403);

    const action = e && e.parameter ? e.parameter.action : '';
    if (action === 'getScores') return getScores_();
    return json_({ error: 'unknown action' }, 400);
  } catch (error) {
    return json_({ error: 'server configuration error' }, 500);
  }
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    if (!isAuthorized_(e, payload)) return json_({ error: 'unauthorized' }, 403);

    if (payload.action === 'addScore') {
      return addScore_(payload.data);
    }

    return json_({ error: 'unknown action' }, 400);
  } catch (error) {
    return json_({ error: 'bad request or server configuration error' }, 400);
  }
}

function getScores_() {
  const sheet = getLeaderboardSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return json_([]);

  const scores = values.slice(1)
    .map(row => ({
      name: sanitizeName_(row[0]),
      score: sanitizeInteger_(row[1], 0, MAX_SCORE, 0),
      level: sanitizeInteger_(row[2], 1, MAX_LEVEL, 1),
      date: row[3] || ''
    }))
    .filter(row => row.name && Number.isFinite(row.score))
    .sort((a, b) => b.score - a.score || b.level - a.level)
    .slice(0, MAX_ROWS_TO_KEEP);

  return json_(scores);
}

function addScore_(scoreData) {
  const score = validateScore_(scoreData);
  if (!score) return json_({ error: 'invalid score' }, 400);

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    const sheet = getLeaderboardSheet_();
    sheet.appendRow([score.name, score.score, score.level, score.date]);
    trimAndSort_(sheet);
  } finally {
    lock.releaseLock();
  }

  return json_({ success: true });
}

function getLeaderboardSheet_() {
  const spreadsheetId = getRequiredProperty_('SPREADSHEET_ID');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(['name', 'score', 'level', 'date']);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['name', 'score', 'level', 'date']);
  }

  return sheet;
}

function trimAndSort_(sheet) {
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1)
    .map(row => [
      sanitizeName_(row[0]),
      sanitizeInteger_(row[1], 0, MAX_SCORE, 0),
      sanitizeInteger_(row[2], 1, MAX_LEVEL, 1),
      row[3] || new Date().toISOString()
    ])
    .filter(row => row[0])
    .sort((a, b) => b[1] - a[1] || b[2] - a[2])
    .slice(0, MAX_ROWS_TO_KEEP);

  sheet.clear();
  sheet.appendRow(['name', 'score', 'level', 'date']);
  if (rows.length) sheet.getRange(2, 1, rows.length, 4).setValues(rows);
}

function validateScore_(scoreData) {
  if (!scoreData || typeof scoreData !== 'object') return null;

  const name = sanitizeName_(scoreData.name);
  const score = sanitizeInteger_(scoreData.score, 0, MAX_SCORE, NaN);
  const level = sanitizeInteger_(scoreData.level, 1, MAX_LEVEL, NaN);

  if (!name || !Number.isFinite(score) || !Number.isFinite(level)) return null;

  return {
    name,
    score,
    level,
    date: new Date().toISOString()
  };
}

function sanitizeName_(value) {
  let name = String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MAX_NAME_LENGTH);

  if (!name) name = '匿名玩家';
  if (/^[=+\-@]/.test(name)) name = "'" + name;
  return name;
}

function sanitizeInteger_(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function isAuthorized_(e, payload) {
  const expectedToken = getRequiredProperty_('LEADERBOARD_TOKEN');
  const queryToken = e && e.parameter ? e.parameter.token : '';
  const bodyToken = payload && payload.token ? payload.token : '';
  return Boolean(expectedToken && (queryToken === expectedToken || bodyToken === expectedToken));
}

function getRequiredProperty_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error('Missing required Script Property: ' + name);
  return value;
}

function json_(payload, statusCode) {
  const body = Object.assign({}, Array.isArray(payload) ? { data: payload } : payload);
  if (statusCode) body.status = statusCode;

  if (Array.isArray(payload)) {
    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
