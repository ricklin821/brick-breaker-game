'use strict';

// 安全版敲磚塊遊戲
// 預設只使用瀏覽器本機排行榜，不在公開原始碼中硬編碼任何雲端端點。
// 如需雲端排行榜，請在未提交到 Git 的私有設定中指定 window.BREAKOUT_LEADERBOARD_ENDPOINT。

let canvas;
let ctx;
let paddleX = 0;
let rightPressed = false;
let leftPressed = false;
let score = 0;
let lives = 3;
let level = 1;
let gameStarted = false;
let gamePaused = false;
let gameOver = false;
let bricks = [];
let balls = [];
let animationId = null;
let lastFrameTime = 0;

const GAME_WIDTH = 480;
const GAME_HEIGHT = 480;
const MAX_LEVEL = 100;
const LEADERBOARD_STORAGE_KEY = 'breakoutLeaderboard';
const MAX_LEADERBOARD_ENTRIES = 10;
const MAX_PLAYER_NAME_LENGTH = 24;

let ballRadius = 8;
let paddleHeight = 10;
let paddleWidth = 75;
let brickRowCount = 3;
let brickColumnCount = 5;
let brickPadding = 10;
let brickOffsetTop = 42;
let brickOffsetLeft = 28;
let brickWidth = 0;
let brickHeight = 20;

const BRICK_TYPES = {
    NORMAL: { color: '#0095DD', points: 10, hits: 1 },
    STRONG: { color: '#8B0000', points: 20, hits: 2 },
    SUPER: { color: '#008800', points: 30, hits: 3 },
    EXPLOSIVE: { color: '#E65100', points: 50, hits: 1 }
};

function getCloudEndpoint() {
    const endpoint = String(window.BREAKOUT_LEADERBOARD_ENDPOINT || '').trim();
    if (!endpoint) return null;

    try {
        const url = new URL(endpoint, window.location.href);
        if (url.protocol !== 'https:') return null;
        return url.toString();
    } catch (error) {
        console.warn('排行榜雲端端點格式不正確，已停用雲端排行榜。');
        return null;
    }
}

function getCloudToken() {
    return String(window.BREAKOUT_LEADERBOARD_TOKEN || '').trim();
}

function sanitizeText(value, maxLength = MAX_PLAYER_NAME_LENGTH) {
    const text = String(value || '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .slice(0, maxLength);

    if (!text) return '匿名玩家';
    // 防止未來匯出到試算表時發生公式注入。
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(number)));
}

function normalizeScoreEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;

    const normalized = {
        name: sanitizeText(entry.name),
        score: clampNumber(entry.score, 0, 1000000, 0),
        level: clampNumber(entry.level, 1, MAX_LEVEL, 1),
        date: entry.date ? String(entry.date) : new Date().toISOString()
    };

    const timestamp = Date.parse(normalized.date);
    if (!Number.isFinite(timestamp)) normalized.date = new Date().toISOString();

    return normalized;
}

function getLocalLeaderboard() {
    try {
        const stored = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY)) || [];
        return stored.map(normalizeScoreEntry).filter(Boolean);
    } catch (error) {
        localStorage.removeItem(LEADERBOARD_STORAGE_KEY);
        return [];
    }
}

function saveLocalLeaderboard(entries) {
    const normalized = entries
        .map(normalizeScoreEntry)
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || b.level - a.level)
        .slice(0, MAX_LEADERBOARD_ENTRIES);

    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = String(message);
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

function resizeCanvas() {
    const container = document.querySelector('.game-container');
    const containerWidth = container ? container.clientWidth : GAME_WIDTH;
    const maxWidth = Math.min(containerWidth || GAME_WIDTH, GAME_WIDTH);
    const scale = maxWidth / GAME_WIDTH;

    canvas.width = maxWidth;
    canvas.height = GAME_HEIGHT * scale;
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';

    paddleWidth = canvas.width <= 480 ? Math.min(90, canvas.width / 4.8) : 75;
    ballRadius = canvas.width <= 480 ? 9 : 8;
    paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, paddleX || (canvas.width - paddleWidth) / 2));
    adjustBricksByLevel();

    const touchHint = document.getElementById('touchHint');
    if (touchHint) touchHint.style.display = canvas.width <= 480 ? 'block' : 'none';
}

function adjustBricksByLevel() {
    brickRowCount = Math.min(3 + Math.floor((level - 1) / 8), 9);
    brickColumnCount = Math.min(5 + Math.floor((level - 1) / 6), 11);
    brickOffsetLeft = Math.max(18, canvas.width * 0.06);
    brickWidth = (canvas.width - 2 * brickOffsetLeft - (brickColumnCount - 1) * brickPadding) / brickColumnCount;
    brickHeight = Math.max(16, Math.min(22, canvas.height * 0.045));
}

function getBrickTypeForLevel() {
    const roll = Math.random();
    if (level < 10) return roll < 0.86 ? 'NORMAL' : roll < 0.96 ? 'STRONG' : 'EXPLOSIVE';
    if (level < 35) return roll < 0.58 ? 'NORMAL' : roll < 0.82 ? 'STRONG' : roll < 0.96 ? 'SUPER' : 'EXPLOSIVE';
    return roll < 0.42 ? 'NORMAL' : roll < 0.70 ? 'STRONG' : roll < 0.90 ? 'SUPER' : 'EXPLOSIVE';
}

function initBricks() {
    bricks = [];
    adjustBricksByLevel();

    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            const type = getBrickTypeForLevel();
            bricks[c][r] = {
                x: 0,
                y: 0,
                status: 1,
                type,
                hits: BRICK_TYPES[type].hits
            };
        }
    }
}

function resetBall() {
    const speed = 2.8 + Math.min(level * 0.12, 4);
    balls = [{
        x: canvas.width / 2,
        y: canvas.height - 36,
        dx: speed * (Math.random() > 0.5 ? 1 : -1),
        dy: -speed,
        radius: ballRadius
    }];
}

function resetGameState() {
    score = 0;
    lives = 3;
    level = 1;
    gameStarted = false;
    gamePaused = false;
    gameOver = false;
    paddleX = (canvas.width - paddleWidth) / 2;
    resetBall();
    initBricks();
    updateScoreDisplay();
}

function updateScoreDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
    document.getElementById('level').textContent = level;
}

function startGame() {
    const startButton = document.getElementById('startButton');

    if (gameOver) {
        restartGame();
        return;
    }

    if (!gameStarted) {
        gameStarted = true;
        gamePaused = false;
        if (startButton) startButton.textContent = '暫停';
        startLoop();
        return;
    }

    gamePaused = !gamePaused;
    if (startButton) startButton.textContent = gamePaused ? '繼續' : '暫停';
    if (!gamePaused) startLoop();
}

function restartGame() {
    stopLoop();
    resetGameState();
    const modal = document.getElementById('gameOverModal');
    if (modal) modal.style.display = 'none';
    const saveButton = document.getElementById('saveScoreButton');
    if (saveButton) saveButton.disabled = false;
    const startButton = document.getElementById('startButton');
    if (startButton) startButton.textContent = '開始遊戲';
    drawScene();
}

function startLoop() {
    if (animationId !== null) return;
    lastFrameTime = performance.now();
    animationId = requestAnimationFrame(draw);
}

function stopLoop() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function draw(timestamp) {
    animationId = null;
    if (!gameStarted || gamePaused || gameOver) {
        drawScene();
        return;
    }

    const delta = Math.min((timestamp - lastFrameTime) / 16.67, 2);
    lastFrameTime = timestamp;

    updateBalls(delta);
    updatePaddle(delta);
    collisionDetection();
    drawScene();

    animationId = requestAnimationFrame(draw);
}

function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawPaddle();
    drawBalls();
    drawScoreOverlay();
}

function drawScoreOverlay() {
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 8, 8);
    ctx.textAlign = 'center';
    ctx.fillText(`Level: ${level}`, canvas.width / 2, 8);
    ctx.textAlign = 'right';
    ctx.fillText(`Lives: ${lives}`, canvas.width - 8, 8);
}

function drawPaddle() {
    ctx.beginPath();
    const gradient = ctx.createLinearGradient(paddleX, canvas.height - paddleHeight, paddleX, canvas.height);
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(1, '#2E7D32');
    ctx.fillStyle = gradient;
    ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.closePath();
}

function drawBalls() {
    balls.forEach((ball) => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.closePath();
    });
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const brick = bricks[c][r];
            if (!brick || brick.status <= 0) continue;

            const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
            const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
            brick.x = brickX;
            brick.y = brickY;

            ctx.beginPath();
            ctx.rect(brickX, brickY, brickWidth, brickHeight);
            ctx.fillStyle = getBrickColor(brick);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.75)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();

            if (brick.hits > 1) {
                ctx.font = '12px Arial';
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(brick.hits, brickX + brickWidth / 2, brickY + brickHeight / 2);
            }
        }
    }
}

function getBrickColor(brick) {
    const base = BRICK_TYPES[brick.type] || BRICK_TYPES.NORMAL;
    if (brick.hits >= base.hits) return base.color;

    const ratio = Math.max(0.45, brick.hits / base.hits);
    const r = Math.floor(parseInt(base.color.slice(1, 3), 16) * ratio);
    const g = Math.floor(parseInt(base.color.slice(3, 5), 16) * ratio);
    const b = Math.floor(parseInt(base.color.slice(5, 7), 16) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
}

function updateBalls(delta) {
    for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];
        ball.x += ball.dx * delta;
        ball.y += ball.dy * delta;

        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
            ball.x = Math.max(ball.radius, Math.min(canvas.width - ball.radius, ball.x));
        }

        if (ball.y - ball.radius < 0) {
            ball.dy = Math.abs(ball.dy);
        } else if (ball.y + ball.radius > canvas.height) {
            lives--;
            updateScoreDisplay();
            if (lives <= 0) {
                gameOverHandler();
            } else {
                resetBall();
                paddleX = (canvas.width - paddleWidth) / 2;
                gamePaused = true;
                document.getElementById('startButton').textContent = '繼續';
                showNotification('少一條命，按「繼續」再戰！', 'info');
            }
            return;
        }

        if (ball.y + ball.radius >= canvas.height - paddleHeight &&
            ball.y - ball.radius <= canvas.height &&
            ball.x >= paddleX &&
            ball.x <= paddleX + paddleWidth) {
            const hitPoint = (ball.x - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
            const angle = hitPoint * Math.PI / 3;
            const speed = Math.min(Math.hypot(ball.dx, ball.dy) * 1.003, 9.5);
            ball.dx = Math.sin(angle) * speed;
            ball.dy = -Math.cos(angle) * speed;
            ball.y = canvas.height - paddleHeight - ball.radius;
        }
    }
}

function updatePaddle(delta) {
    const speed = 7 * delta;
    if (rightPressed) paddleX += speed;
    if (leftPressed) paddleX -= speed;
    paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, paddleX));
}

function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const brick = bricks[c][r];
            if (!brick || brick.status <= 0) continue;

            for (const ball of balls) {
                const hit = ball.x > brick.x && ball.x < brick.x + brickWidth && ball.y > brick.y && ball.y < brick.y + brickHeight;
                if (!hit) continue;

                ball.dy = -ball.dy;
                brick.hits--;
                if (brick.hits <= 0) {
                    brick.status = 0;
                    score += BRICK_TYPES[brick.type].points;
                    if (brick.type === 'EXPLOSIVE') explodeBricks(c, r);
                }
                updateScoreDisplay();

                if (checkLevelComplete()) nextLevel();
                return;
            }
        }
    }
}

function explodeBricks(col, row) {
    for (let c = Math.max(0, col - 1); c <= Math.min(col + 1, brickColumnCount - 1); c++) {
        for (let r = Math.max(0, row - 1); r <= Math.min(row + 1, brickRowCount - 1); r++) {
            const brick = bricks[c][r];
            if (brick && brick.status > 0) {
                brick.status = 0;
                score += Math.floor(BRICK_TYPES[brick.type].points / 2);
            }
        }
    }
}

function checkLevelComplete() {
    return bricks.every((column) => column.every((brick) => brick.status <= 0));
}

function nextLevel() {
    if (level >= MAX_LEVEL) {
        score += 10000;
        updateScoreDisplay();
        gameOverHandler('恭喜破完 100 關！');
        return;
    }

    level++;
    score += Math.floor(level * 50 * (1 + level * 0.05));
    resetBall();
    initBricks();
    updateScoreDisplay();
    gamePaused = true;
    document.getElementById('startButton').textContent = '繼續';
    showNotification(`進入第 ${level} 關！`, 'success');
}

function gameOverHandler(message = '遊戲結束') {
    gameOver = true;
    gameStarted = false;
    gamePaused = false;
    stopLoop();

    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLevel').textContent = level;
    document.getElementById('gameOverModal').style.display = 'block';
    document.getElementById('saveScoreButton').disabled = false;
    document.getElementById('startButton').textContent = '開始遊戲';
    showNotification(message, 'info');
}

function keyDownHandler(event) {
    if (event.key === 'Right' || event.key === 'ArrowRight') rightPressed = true;
    if (event.key === 'Left' || event.key === 'ArrowLeft') leftPressed = true;
    if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        startGame();
    }
}

function keyUpHandler(event) {
    if (event.key === 'Right' || event.key === 'ArrowRight') rightPressed = false;
    if (event.key === 'Left' || event.key === 'ArrowLeft') leftPressed = false;
}

function mouseMoveHandler(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const relativeX = (event.clientX - rect.left) * scaleX;
    paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, relativeX - paddleWidth / 2));
}

function touchMoveHandler(event) {
    event.preventDefault();
    if (!event.touches || event.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const scaleX = canvas.width / rect.width;
    const relativeX = (touch.clientX - rect.left) * scaleX;
    paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, relativeX - paddleWidth / 2));
}

function touchStartHandler(event) {
    event.preventDefault();
    if (!gameStarted || gamePaused) startGame();
    touchMoveHandler(event);
}

function touchEndHandler() {
    // 保留函數供事件移除使用。
}

function saveScore() {
    const saveButton = document.getElementById('saveScoreButton');
    if (saveButton) saveButton.disabled = true;

    const scoreData = normalizeScoreEntry({
        name: document.getElementById('playerName').value,
        score,
        level,
        date: new Date().toISOString()
    });

    const localLeaderboard = getLocalLeaderboard();
    saveLocalLeaderboard([...localLeaderboard, scoreData]);

    const cloudSave = saveScoreToGoogleSheets(scoreData);
    document.getElementById('gameOverModal').style.display = 'none';

    cloudSave.finally(() => {
        showLeaderboard();
    });
}

function saveScoreToGoogleSheets(scoreData) {
    const endpoint = getCloudEndpoint();
    if (!endpoint) {
        showNotification('分數已保存到本機排行榜。', 'success');
        return Promise.resolve(false);
    }

    return fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addScore', token: getCloudToken(), data: normalizeScoreEntry(scoreData) })
    })
        .then((response) => {
            if (!response.ok) throw new Error('cloud save failed');
            return response.json();
        })
        .then((result) => {
            if (!result || result.success !== true) throw new Error('cloud rejected score');
            showNotification('分數已保存到雲端排行榜。', 'success');
            return true;
        })
        .catch(() => {
            showNotification('雲端保存失敗，已保留本機排行榜。', 'error');
            return false;
        });
}

function loadLeaderboard() {
    displayLeaderboard(getLocalLeaderboard());
    return loadLeaderboardFromGoogleSheets();
}

function loadLeaderboardFromGoogleSheets() {
    const endpoint = getCloudEndpoint();
    if (!endpoint) return Promise.resolve([]);

    const url = new URL(endpoint);
    url.searchParams.set('action', 'getScores');
    const token = getCloudToken();
    if (token) url.searchParams.set('token', token);

    return fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
    })
        .then((response) => {
            if (!response.ok) throw new Error('cloud load failed');
            return response.json();
        })
        .then((cloudEntries) => {
            const merged = [...getLocalLeaderboard(), ...(Array.isArray(cloudEntries) ? cloudEntries : [])]
                .map(normalizeScoreEntry)
                .filter(Boolean);
            const deduped = Array.from(new Map(merged.map((entry) => [`${entry.name}-${entry.score}-${entry.level}`, entry])).values());
            displayLeaderboard(deduped);
            return deduped;
        })
        .catch(() => {
            showNotification('雲端排行榜讀取失敗，目前只顯示本機資料。', 'error');
            return [];
        });
}

function displayLeaderboard(leaderboard) {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.textContent = '';

    const entries = leaderboard
        .map(normalizeScoreEntry)
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || b.level - a.level)
        .slice(0, MAX_LEADERBOARD_ENTRIES);

    if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.style.textAlign = 'center';
        empty.style.padding = '20px';
        empty.textContent = '暫無數據';
        leaderboardList.appendChild(empty);
        return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    ['排名', '玩家', '分數', '關卡', '日期'].forEach((headerText) => {
        const header = document.createElement('th');
        header.textContent = headerText;
        headerRow.appendChild(header);
    });

    const tbody = document.createElement('tbody');
    entries.forEach((entry, index) => {
        const row = document.createElement('tr');
        const values = [
            index + 1,
            entry.name,
            entry.score,
            entry.level,
            formatDate(entry.date)
        ];

        values.forEach((value) => {
            const cell = document.createElement('td');
            cell.textContent = String(value);
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody);
    leaderboardList.appendChild(table);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '未知';
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function showLeaderboard() {
    loadLeaderboard();
    document.getElementById('leaderboard').style.display = 'block';
}

function hideLeaderboard() {
    document.getElementById('leaderboard').style.display = 'none';
}

function bindControls() {
    document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('keyup', keyUpHandler);
    document.removeEventListener('mousemove', mouseMoveHandler);
    canvas.removeEventListener('touchmove', touchMoveHandler);
    canvas.removeEventListener('touchstart', touchStartHandler);
    document.removeEventListener('touchend', touchEndHandler);

    document.addEventListener('keydown', keyDownHandler, false);
    document.addEventListener('keyup', keyUpHandler, false);
    document.addEventListener('mousemove', mouseMoveHandler, false);
    canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
    canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
    document.addEventListener('touchend', touchEndHandler, false);

    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    document.getElementById('saveScoreButton').addEventListener('click', saveScore);
    document.getElementById('leaderboardButton').addEventListener('click', showLeaderboard);
    document.getElementById('closeLeaderboardButton').addEventListener('click', hideLeaderboard);
}

function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    resetGameState();
    bindControls();
    drawScene();
    window.addEventListener('resize', () => {
        resizeCanvas();
        drawScene();
    });
}

window.onload = initGame;
