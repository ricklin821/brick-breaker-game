// 遊戲變數
let canvas;
let ctx;
let ballRadius = 8;
let paddleHeight = 10;
let paddleWidth = 75;
let paddleX;
let rightPressed = false;
let leftPressed = false;
let brickRowCount = 3;
let brickColumnCount = 5;
let brickPadding = 10;
let brickOffsetTop = 30;
let brickOffsetLeft = 30;
let score = 0;
let lives = 3;
let level = 1;
let gameStarted = false;
let gamePaused = false;
let gameOver = false;
let bricks = [];
let powerups = [];
let balls = [];
let gameTimer = 0; // 遊戲計時器，用於隨時間增加球速
let lastSpeedIncreaseTime = 0; // 上次增加球速的時間
let brickWidth;
let brickHeight = 20;

// 磚塊類型
const BRICK_TYPES = {
    NORMAL: { color: '#0095DD', points: 10, hits: 1 },
    STRONG: { color: '#880000', points: 20, hits: 2 },
    SUPER: { color: '#008800', points: 30, hits: 3 },
    EXPLOSIVE: { color: '#FF0000', points: 50, hits: 1 },
    UNBREAKABLE: { color: '#333333', points: 0, hits: Infinity }
};

// 藥丸類型
const POWERUP_TYPES = [
    { type: 'extraLife', color: '#00FF00', effect: () => { lives++; showNotification('獲得額外生命！', 'success'); } },
    { type: 'expandPaddle', color: '#FFFF00', effect: () => { paddleWidth = Math.min(paddleWidth * 1.5, 150); showNotification('球拍變大！', 'success'); } },
    { type: 'shrinkPaddle', color: '#FF00FF', effect: () => { paddleWidth = Math.max(paddleWidth * 0.75, 50); showNotification('球拍變小！', 'error'); } },
    { type: 'slowBall', color: '#00FFFF', effect: () => { 
        balls.forEach(ball => {
            ball.dx = ball.dx > 0 ? Math.max(ball.dx * 0.75, 2) : Math.min(ball.dx * 0.75, -2);
            ball.dy = ball.dy > 0 ? Math.max(ball.dy * 0.75, 2) : Math.min(ball.dy * 0.75, -2);
        });
        showNotification('球速減慢！', 'success');
    } },
    { type: 'fastBall', color: '#FF8800', effect: () => { 
        balls.forEach(ball => {
            ball.dx = ball.dx > 0 ? Math.min(ball.dx * 1.25, 8) : Math.max(ball.dx * 1.25, -8);
            ball.dy = ball.dy > 0 ? Math.min(ball.dy * 1.25, 8) : Math.max(ball.dy * 1.25, -8);
        });
        showNotification('球速增加！', 'error');
    } },
    { type: 'multiBall', color: '#8800FF', effect: () => { 
        const currentBalls = [...balls];
        currentBalls.forEach(ball => {
            for (let i = 0; i < 2; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                const newBall = {
                    x: ball.x,
                    y: ball.y,
                    dx: Math.cos(angle) * speed,
                    dy: Math.sin(angle) * speed,
                    radius: ballRadius
                };
                balls.push(newBall);
            }
        });
        showNotification('多重球！', 'success');
    } }
];

// 顯示通知
function showNotification(message, type = 'info') {
    // 移除現有通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 創建新通知
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // 顯示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 2秒後隱藏通知
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 2000);
}

// 初始化遊戲
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    paddleX = (canvas.width - paddleWidth) / 2;
    resetBall();
    initBricks();
    
    // 移除現有的事件監聽器（如果有）
    document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('keyup', keyUpHandler);
    document.removeEventListener('mousemove', mouseMoveHandler);
    
    // 添加新的事件監聽器
    document.addEventListener('keydown', keyDownHandler, false);
    document.addEventListener('keyup', keyUpHandler, false);
    document.addEventListener('mousemove', mouseMoveHandler, false);
    
    // 移除按鈕的現有事件監聽器（如果有）
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const saveScoreButton = document.getElementById('saveScoreButton');
    const leaderboardButton = document.getElementById('leaderboardButton');
    const closeLeaderboardButton = document.getElementById('closeLeaderboardButton');
    
    // 清除現有事件監聽器
    startButton.replaceWith(startButton.cloneNode(true));
    restartButton.replaceWith(restartButton.cloneNode(true));
    saveScoreButton.replaceWith(saveScoreButton.cloneNode(true));
    leaderboardButton.replaceWith(leaderboardButton.cloneNode(true));
    closeLeaderboardButton.replaceWith(closeLeaderboardButton.cloneNode(true));
    
    // 重新獲取按鈕元素
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    document.getElementById('saveScoreButton').addEventListener('click', saveScore);
    document.getElementById('leaderboardButton').addEventListener('click', showLeaderboard);
    document.getElementById('closeLeaderboardButton').addEventListener('click', hideLeaderboard);
    
    updateScoreDisplay();
}

// 動態調整畫布大小
function resizeCanvas() {
    const container = document.querySelector('.game-container');
    const containerWidth = container.clientWidth;
    
    // 確保畫布不會超出容器寬度
    const maxWidth = Math.min(containerWidth, 480);
    const scale = maxWidth / 480;
    
    canvas.width = maxWidth;
    canvas.height = 320 * scale;
    
    // 調整畫布樣式，確保不會覆蓋其他元素
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    
    // 調整磚塊大小
    adjustBricksByLevel();
}


// 初始化磚塊
function initBricks() {
    bricks = [];
    adjustBricksByLevel();

    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            const brickType = getBrickTypeForLevel();
            bricks[c][r] = {
                x: 0,
                y: 0,
                status: 1,
                type: brickType,
                hits: BRICK_TYPES[brickType].hits,
                hasPowerup: Math.random() < 0.2 // 20% 機率生成藥丸
            };
        }
    }
}

// 根據關卡調整磚塊數量和類型
function adjustBricksByLevel() {
    brickRowCount = Math.min(3 + Math.floor(level / 10), 10);
    brickColumnCount = Math.min(5 + Math.floor(level / 5), 12);
    brickWidth = (canvas.width - 2 * brickOffsetLeft - (brickColumnCount - 1) * brickPadding) / brickColumnCount;
    brickHeight = 20;
}

// 根據關卡獲取磚塊類型
function getBrickTypeForLevel() {
    const rand = Math.random();
    if (level <= 10) {
        if (rand < 0.9) return 'NORMAL';
        else if (rand < 0.95) return 'STRONG';
        else return 'EXPLOSIVE';
    } else if (level <= 30) {
        if (rand < 0.6) return 'NORMAL';
        else if (rand < 0.8) return 'STRONG';
        else if (rand < 0.95) return 'SUPER';
        else return 'EXPLOSIVE';
    } else if (level <= 60) {
        if (rand < 0.4) return 'NORMAL';
        else if (rand < 0.7) return 'STRONG';
        else if (rand < 0.85) return 'SUPER';
        else if (rand < 0.95) return 'EXPLOSIVE';
        else return 'UNBREAKABLE';
    } else {
        if (rand < 0.3) return 'NORMAL';
        else if (rand < 0.5) return 'STRONG';
        else if (rand < 0.7) return 'SUPER';
        else if (rand < 0.9) return 'EXPLOSIVE';
        else return 'UNBREAKABLE';
    }
}

// 重置球
function resetBall() {
    balls = [];
    // 增加球的初始速度
    const initialSpeed = 3 + Math.min(level * 0.6, 6); // 根據關卡增加初始速度，最高增加6
    const newBall = {
        x: canvas.width / 2,
        y: canvas.height - 30,
        dx: initialSpeed,
        dy: -initialSpeed,
        radius: ballRadius
    };
    balls.push(newBall);
    paddleWidth = 75;
    paddleX = (canvas.width - paddleWidth) / 2;
}

// 開始遊戲
function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        gameTimer = 0; // 重置遊戲計時器
        lastSpeedIncreaseTime = 0; // 重置上次增加球速的時間
        balls[0].x = canvas.width / 2;
        balls[0].y = canvas.height - 30;
        // 使用resetBall中的邏輯設置初始速度
        const initialSpeed = 3 + Math.min(level * 0.6, 6); // 與resetBall保持一致
        balls[0].dx = initialSpeed;
        balls[0].dy = -initialSpeed;
        draw();
        document.getElementById('startButton').textContent = '暫停';
    } else {
        gamePaused = !gamePaused;
        document.getElementById('startButton').textContent = gamePaused ? '繼續' : '暫停';
        if (!gamePaused) {
            draw();
        }
    }
}

// 重新開始遊戲
function restartGame() {
    document.getElementById('gameOverModal').style.display = 'none';
    score = 0;
    lives = 3;
    level = 1;
    gameOver = false;
    powerups = [];
    resetBall();
    initBricks();
    updateScoreDisplay();
    gameStarted = false;
    gamePaused = false;
    document.getElementById('startButton').textContent = '開始遊戲';
}

// 遊戲結束處理
function gameOverHandler() {
    gameOver = true;
    gameStarted = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLevel').textContent = level;
    document.getElementById('gameOverModal').style.display = 'block';
    document.getElementById('saveScoreButton').disabled = false;
}

// 保存分數
function saveScore() {
    // 防止重複點擊
    document.getElementById('saveScoreButton').disabled = true;
    
    const playerName = document.getElementById('playerName').value || '匿名玩家';
    const scoreData = {
        name: playerName,
        score: score,
        level: level,
        date: new Date().toISOString()
    };
    
    // 保存到本地先
    saveScoreToLocal(scoreData);
    
    // 顯示保存中提示
    showNotification('正在保存分數...', 'info');
    
    // 嘗試保存到Google Sheets
    saveScoreToGoogleSheets(scoreData);
    
    document.getElementById('gameOverModal').style.display = 'none';
    // 顯示排行榜
    setTimeout(showLeaderboard, 500);
}

// 保存分數到本地
function saveScoreToLocal(scoreData) {
    let leaderboard = JSON.parse(localStorage.getItem('breakoutLeaderboard')) || [];
    leaderboard.push(scoreData);
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10); // 只保留前10名
    
    localStorage.setItem('breakoutLeaderboard', JSON.stringify(leaderboard));
}

// 保存分數到Google Sheets
function saveScoreToGoogleSheets(scoreData) {
    // 這裡使用Google Sheets API的Web App URL
    // 需要替換為你實際部署的Web App URL
    const googleSheetsURL = 'https://script.google.com/macros/s/AKfycbyV9_r0jBbwyQISPHRKDPlv33qCkQBra40QU4QdxHiitoD9_Fvl0i2qCIdPR_9ZUQyc0g/exec';
    
    // 顯示保存中動畫
    const savingIndicator = document.createElement('div');
    savingIndicator.className = 'saving-indicator';
    savingIndicator.innerHTML = `
        <div class="spinner"></div>
        <p>正在保存到雲端...</p>
    `;
    document.body.appendChild(savingIndicator);
    
    fetch(googleSheetsURL, {
        method: 'POST',
        mode: 'no-cors', // 重要：解決CORS問題
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'addScore',
            data: scoreData
        })
    })
    .then(() => {
        // 由於no-cors模式，無法讀取response內容
        console.log('分數已發送到Google Sheets');
        showNotification('分數已成功保存到雲端！', 'success');
        // 移除保存中動畫
        document.body.removeChild(savingIndicator);
    })
    .catch(error => {
        console.error('保存分數到Google Sheets時發生錯誤:', error);
        showNotification('保存到雲端失敗，已保存到本地', 'error');
        // 移除保存中動畫
        document.body.removeChild(savingIndicator);
    });
}
// 从Google Sheets读取排行榜数据
function loadLeaderboardFromGoogleSheets() {
    // 这里使用Google Sheets API的Web App URL
    const googleSheetsURL = 'https://script.google.com/macros/s/AKfycbyV9_r0jBbwyQISPHRKDPlv33qCkQBra40QU4QdxHiitoD9_Fvl0i2qCIdPR_9ZUQyc0g/exec';
    
    // 显示加载中动画
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = `
        <div class="spinner"></div>
        <p>正在从云端加载数据...</p>
    `;
    document.body.appendChild(loadingIndicator);
    
    // 设置超时处理
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 10000); // 10秒超时
    });
    
    // 实际的fetch请求
    const fetchPromise = fetch(googleSheetsURL + '?action=getScores', {
        method: 'GET',
        mode: 'cors' // 尝试使用cors模式
    });
    
    // 使用Promise.race来处理可能的超时情况
    Promise.race([fetchPromise, timeoutPromise])
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('从Google Sheets读取排行榜成功:', data);
            // 合并本地和云端数据
            const localLeaderboard = JSON.parse(localStorage.getItem('breakoutLeaderboard')) || [];
            const combinedLeaderboard = [...localLeaderboard, ...data];
            // 去重（基于名称和分数）
            const uniqueLeaderboard = Array.from(new Map(combinedLeaderboard.map(item => [
                item.name + '-' + item.score, item
            ])).values());
            
            displayLeaderboard(uniqueLeaderboard);
            // 移除加载中动画
            document.body.removeChild(loadingIndicator);
        })
        .catch(error => {
            console.error('从Google Sheets读取排行榜时发生错误:', error);
            // 已经显示本地数据，所以这里只需添加错误提示
            const leaderboardList = document.getElementById('leaderboardList');
            if (leaderboardList.innerHTML.includes('尝试从云端加载更多数据')) {
                leaderboardList.innerHTML = leaderboardList.innerHTML.replace(
                    '<div style="text-align: center; padding: 10px; color: #aaa;">尝试从云端加载更多数据...</div>',
                    '<div style="text-align: center; padding: 10px; color: #f77;">无法从云端加载数据，仅显示本地记录</div>'
                );
            }
            // 移除加载中动画
            if (document.body.contains(loadingIndicator)) {
                document.body.removeChild(loadingIndicator);
            }
        });
}

// 下一關
function nextLevel() {
    level++;
    resetBall();
    initBricks();
    updateScoreDisplay();
    
    // 顯示下一關提示
    showNotification(`進入第 ${level} 關！`, 'success');
    
    gamePaused = true;
    setTimeout(() => {
        gamePaused = false;
        draw();
    }, 2000);
}

// 更新分數顯示
function updateScoreDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
    document.getElementById('level').textContent = level;
}

// 碰撞檢測
function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status > 0) {
                for (let i = 0; i < balls.length; i++) {
                    const ball = balls[i];
                    if (ball.x > b.x && ball.x < b.x + brickWidth && ball.y > b.y && ball.y < b.y + brickHeight) {
                        ball.dy = -ball.dy;
                        b.hits--;
                        
                        if (b.hits <= 0) {
                            b.status = 0;
                            score += BRICK_TYPES[b.type].points;
                            
                            // 如果是爆炸磚塊，摧毀周圍磚塊
                            if (b.type === 'EXPLOSIVE') {
                                explodeBricks(c, r);
                            }
                            
                            // 如果磚塊有藥丸，釋放藥丸
                            if (b.hasPowerup) {
                                createPowerup(b.x + brickWidth / 2, b.y + brickHeight / 2);
                            }
                        }
                        
                        updateScoreDisplay();
                        
                        // 檢查是否所有磚塊都被摧毀
                        if (checkLevelComplete()) {
                            nextLevel();
                            return;
                        }
                    }
                }
            }
        }
    }
}

// 爆炸磚塊效果
function explodeBricks(col, row) {
    for (let c = Math.max(0, col - 1); c <= Math.min(col + 1, brickColumnCount - 1); c++) {
        for (let r = Math.max(0, row - 1); r <= Math.min(row + 1, brickRowCount - 1); r++) {
            if (bricks[c][r].status > 0 && bricks[c][r].type !== 'UNBREAKABLE') {
                bricks[c][r].status = 0;
                score += BRICK_TYPES[bricks[c][r].type].points / 2;
                if (bricks[c][r].hasPowerup) {
                    createPowerup(bricks[c][r].x + brickWidth / 2, bricks[c][r].y + brickHeight / 2);
                }
            }
        }
    }
}

// 創建藥丸
function createPowerup(x, y) {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    powerups.push({
        x: x,
        y: y,
        radius: 6,
        type: type,
        color: type.color,
        effect: type.effect
    });
}

// 藥丸效果處理
function handlePowerups() {
    // 計算當前球的平均速度，用於調整藥丸下落速度
    let avgBallSpeed = 3; // 默認值
    if (balls.length > 0) {
        let totalSpeed = 0;
        balls.forEach(ball => {
            totalSpeed += Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        });
        avgBallSpeed = totalSpeed / balls.length;
    }
    
    // 藥丸下落速度為球平均速度的60%，確保始終慢於球速，便於玩家接到
    const powerupFallSpeed = Math.max(avgBallSpeed * 0.6, 1.5);
    
    for (let i = 0; i < powerups.length; i++) {
        const p = powerups[i];
        p.y += powerupFallSpeed;
        if (p.y + p.radius > canvas.height) {
            powerups.splice(i, 1);
            i--;
        } else if (p.y + p.radius >= canvas.height - paddleHeight && p.y - p.radius <= canvas.height && p.x >= paddleX && p.x <= paddleX + paddleWidth) {
            p.effect();
            powerups.splice(i, 1);
            i--;
        }
    }
}

// 檢查關卡是否完成
function checkLevelComplete() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status > 0 && bricks[c][r].type !== 'UNBREAKABLE') {
                return false;
            }
        }
    }
    return true;
}

// 按鍵按下處理
function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (!gameOver) {
            if (!gameStarted) {
                startGame();
            } else {
                gamePaused = !gamePaused;
                if (!gamePaused) {
                    draw();
                }
            }
        }
    }
}

// 按鍵釋放處理
function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
}

// 滑鼠移動處理
function mouseMoveHandler(e) {
    const relativeX = e.clientX - canvas.offsetLeft;
    if (relativeX > paddleWidth / 2 && relativeX < canvas.width - paddleWidth / 2) {
        paddleX = relativeX - paddleWidth / 2;
    }
}

// 繪製球
function drawBalls() {
    balls.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.closePath();
    });
}

// 繪製球拍
function drawPaddle() {
    ctx.beginPath();
    
    // 繪製球拍主體
    const gradient = ctx.createLinearGradient(paddleX, canvas.height - paddleHeight, paddleX, canvas.height);
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(1, '#2E7D32');
    
    ctx.fillStyle = gradient;
    ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
    ctx.fill();
    
    // 繪製球拍邊緣
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 繪製球拍高光
    ctx.beginPath();
    ctx.rect(paddleX + 5, canvas.height - paddleHeight + 2, paddleWidth - 10, 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
    
    ctx.closePath();
}

// 繪製磚塊
function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status > 0) {
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                const brickType = bricks[c][r].type;
                const baseColor = BRICK_TYPES[brickType].color;
                
                // 繪製磚塊主體
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                
                // 根據剩餘生命值調整顏色
                if (brickType === 'STRONG' || brickType === 'SUPER') {
                    const hitRatio = bricks[c][r].hits / BRICK_TYPES[brickType].hits;
                    ctx.fillStyle = adjustBrickColor(baseColor, hitRatio);
                } else {
                    ctx.fillStyle = baseColor;
                }
                
                ctx.fill();
                
                // 繪製磚塊邊框
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // 為特殊磚塊添加標記
                if (brickType === 'EXPLOSIVE') {
                    drawExplosiveMarker(brickX, brickY);
                } else if (brickType === 'UNBREAKABLE') {
                    drawUnbreakableMarker(brickX, brickY);
                } else if (brickType === 'SUPER' || brickType === 'STRONG') {
                    drawStrongMarker(brickX, brickY, bricks[c][r].hits);
                }
                
                ctx.closePath();
            }
        }
    }
}

// 調整磚塊顏色
function adjustBrickColor(baseColor, hitRatio) {
    // 將基礎顏色轉換為RGB
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    
    // 根據剩餘生命值調整亮度
    const brightnessAdjust = 0.5 + (hitRatio * 0.5);
    
    const newR = Math.floor(r * brightnessAdjust);
    const newG = Math.floor(g * brightnessAdjust);
    const newB = Math.floor(b * brightnessAdjust);
    
    return `rgb(${newR}, ${newG}, ${newB})`;
}

// 繪製爆炸磚塊標記
function drawExplosiveMarker(x, y) {
    const centerX = x + brickWidth / 2;
    const centerY = y + brickHeight / 2;
    const radius = brickHeight / 3;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFF00';
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(centerX - radius / 2, centerY - radius / 2);
    ctx.lineTo(centerX + radius / 2, centerY + radius / 2);
    ctx.moveTo(centerX + radius / 2, centerY - radius / 2);
    ctx.lineTo(centerX - radius / 2, centerY + radius / 2);
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// 繪製堅固磚塊標記
function drawStrongMarker(x, y, hits) {
    const centerX = x + brickWidth / 2;
    const centerY = y + brickHeight / 2;
    
    ctx.font = '12px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hits, centerX, centerY);
}

// 繪製不可摧毀磚塊標記
function drawUnbreakableMarker(x, y) {
    const centerX = x + brickWidth / 2;
    const centerY = y + brickHeight / 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX - brickWidth / 4, centerY);
    ctx.lineTo(centerX + brickWidth / 4, centerY);
    ctx.moveTo(centerX, centerY - brickHeight / 4);
    ctx.lineTo(centerX, centerY + brickHeight / 4);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// 繪製藥丸
function drawPowerups() {
    for (let i = 0; i < powerups.length; i++) {
        const p = powerups[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.closePath();
        
        // 繪製藥丸光澤
        ctx.beginPath();
        ctx.arc(p.x - p.radius / 3, p.y - p.radius / 3, p.radius / 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
        ctx.closePath();
    }
}

// 繪製分數
function drawScore() {
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 8, 20);
}

// 繪製生命值
function drawLives() {
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText('Lives: ' + lives, canvas.width - 8, 20);
}

// 繪製關卡
function drawLevel() {
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('Level: ' + level, canvas.width / 2, 20);
}

// 更新球的位置
function updateBalls() {
    for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];
        
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // 碰撞檢測 - 牆壁
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
        }
        
        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
        } else if (ball.y + ball.radius > canvas.height) {
            // 球落下
            if (balls.length > 1) {
                // 如果有多個球，只移除這一個
                balls.splice(i, 1);
                i--;
            } else {
                // 最後一個球，扣除生命
                lives--;
                updateScoreDisplay();
                
                if (lives <= 0) {
                    gameOverHandler();
                } else {
                    resetBall();
                    paddleX = (canvas.width - paddleWidth) / 2;
                    
                    // 暫停一下再繼續
                    gamePaused = true;
                    setTimeout(() => {
                        gamePaused = false;
                        if (gameStarted) draw();
                    }, 1000);
                }
            }
        }
        
        // 碰撞檢測 - 球拍
        if (ball.y + ball.radius > canvas.height - paddleHeight && ball.y - ball.radius < canvas.height) {
            if (ball.x > paddleX && ball.x < paddleX + paddleWidth) {
                // 根據擊中球拍的位置調整反彈角度
                const hitPoint = (ball.x - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
                const angle = hitPoint * Math.PI / 3; // 最大±60度
                
                const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                ball.dx = Math.sin(angle) * speed;
                ball.dy = -Math.cos(angle) * speed;
                
                // 確保球不會卡在球拍裡
                ball.y = canvas.height - paddleHeight - ball.radius;
            }
        }
    }
}

// 更新球拍位置
function updatePaddle() {
    if (rightPressed && paddleX < canvas.width - paddleWidth) {
        paddleX += 7;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= 7;
    }
}

// 隨時間增加球速
function increaseBallSpeed() {
    gameTimer++;
    
    // 每30秒增加一次球速
    if (gameTimer - lastSpeedIncreaseTime >= 1800) { // 60fps * 30秒 = 1800幀
        lastSpeedIncreaseTime = gameTimer;
        
        balls.forEach(ball => {
            // 增加10%的速度
            ball.dx *= 1.1;
            ball.dy *= 1.1;
        });
        
        showNotification('球速增加！', 'info');
    }
}

// 主繪製函數
function draw() {
    if (gameOver || gamePaused) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBricks();
    drawPaddle();
    drawBalls();
    drawPowerups();
    
    collisionDetection();
    handlePowerups();
    updateBalls();
    updatePaddle();
    
    if (gameStarted) {
        increaseBallSpeed();
    }
    
    requestAnimationFrame(draw);
}

// 載入排行榜
function loadLeaderboard() {
    // 顯示載入中訊息
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '<div style="text-align: center; padding: 20px;">載入中...</div>';
    
    // 先顯示本地排行榜
    const localLeaderboard = JSON.parse(localStorage.getItem('breakoutLeaderboard')) || [];
    if (localLeaderboard.length > 0) {
        displayLeaderboard(localLeaderboard);
        leaderboardList.innerHTML += '<div style="text-align: center; padding: 10px; color: #aaa;">嘗試從雲端載入更多數據...</div>';
    }
    
    // 嘗試從Google Sheets讀取排行榜數據
    loadLeaderboardFromGoogleSheets();
}

// 從Google Sheets讀取排行榜數據
function loadLeaderboardFromGoogleSheets() {
    // 這裡使用Google Sheets API的Web App URL
    const googleSheetsURL = 'https://script.google.com/macros/s/AKfycbzX4HLiKfivX45OUlxJcOLCLoGx0BWzLaSrejitFqxTWrswH5wAi7NaTHq-CbrmFzm4Gg/exec';
    
    // 顯示載入中動畫
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = `
        <div class="spinner"></div>
        <p>正在從雲端載入數據...</p>
    `;
    document.body.appendChild(loadingIndicator);
    
    // 設置超時處理
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('請求超時')), 10000); // 10秒超時
    });
    
    // 實際的fetch請求
    const fetchPromise = fetch(googleSheetsURL + '?action=getScores', {
        method: 'GET',
        mode: 'cors' // 嘗試使用cors模式
    });
    
    // 使用Promise.race來處理可能的超時情況
    Promise.race([fetchPromise, timeoutPromise])
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('從Google Sheets讀取排行榜成功:', data);
            // 合併本地和雲端數據
            const localLeaderboard = JSON.parse(localStorage.getItem('breakoutLeaderboard')) || [];
            const combinedLeaderboard = [...localLeaderboard, ...data];
            // 去重（基於名稱和分數）
            const uniqueLeaderboard = Array.from(new Map(combinedLeaderboard.map(item => [
                item.name + '-' + item.score, item
            ])).values());
            
            displayLeaderboard(uniqueLeaderboard);
            // 移除載入中動畫
            document.body.removeChild(loadingIndicator);
        })
        .catch(error => {
            console.error('從Google Sheets讀取排行榜時發生錯誤:', error);
            // 已經顯示本地數據，所以這裡只需添加錯誤提示
            const leaderboardList = document.getElementById('leaderboardList');
            if (leaderboardList.innerHTML.includes('嘗試從雲端載入更多數據')) {
                leaderboardList.innerHTML = leaderboardList.innerHTML.replace(
                    '<div style="text-align: center; padding: 10px; color: #aaa;">嘗試從雲端載入更多數據...</div>',
                    '<div style="text-align: center; padding: 10px; color: #f77;">無法從雲端載入數據，僅顯示本地記錄</div>'
                );
            }
            // 移除載入中動畫
            if (document.body.contains(loadingIndicator)) {
                document.body.removeChild(loadingIndicator);
            }
        });
}
// 从Google Sheets读取排行榜数据
function loadLeaderboardFromGoogleSheets() {
    // 这里使用Google Sheets API的Web App URL
    const googleSheetsURL = 'https://script.google.com/macros/s/AKfycbx-VZwTura2Ye3egNIrMYVcoXbysyAthSERzAHLUr0yyiQVfxzS25ma6ZgbUIVrG9277g/exec';
    
    // 显示加载中动画
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = `
        <div class="spinner"></div>
        <p>正在从云端加载数据...</p>
    `;
    document.body.appendChild(loadingIndicator);
    
    // 设置超时处理
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 10000); // 10秒超时
    });
    
    // 实际的fetch请求
    const fetchPromise = fetch(googleSheetsURL + '?action=getScores', {
        method: 'GET',
        mode: 'cors' // 尝试使用cors模式
    });
    
    // 使用Promise.race来处理可能的超时情况
    Promise.race([fetchPromise, timeoutPromise])
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('从Google Sheets读取排行榜成功:', data);
            // 合并本地和云端数据
            const localLeaderboard = JSON.parse(localStorage.getItem('breakoutLeaderboard')) || [];
            const combinedLeaderboard = [...localLeaderboard, ...data];
            // 去重（基于名称和分数）
            const uniqueLeaderboard = Array.from(new Map(combinedLeaderboard.map(item => [
                item.name + '-' + item.score, item
            ])).values());
            
            displayLeaderboard(uniqueLeaderboard);
            // 移除加载中动画
            document.body.removeChild(loadingIndicator);
        })
        .catch(error => {
            console.error('从Google Sheets读取排行榜时发生错误:', error);
            // 已经显示本地数据，所以这里只需添加错误提示
            const leaderboardList = document.getElementById('leaderboardList');
            if (leaderboardList.innerHTML.includes('尝试从云端加载更多数据')) {
                leaderboardList.innerHTML = leaderboardList.innerHTML.replace(
                    '<div style="text-align: center; padding: 10px; color: #aaa;">尝试从云端加载更多数据...</div>',
                    '<div style="text-align: center; padding: 10px; color: #f77;">无法从云端加载数据，仅显示本地记录</div>'
                );
            }
            // 移除加载中动画
            if (document.body.contains(loadingIndicator)) {
                document.body.removeChild(loadingIndicator);
            }
        });
}

// 顯示排行榜
function displayLeaderboard(leaderboard) {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    
    if (!leaderboard || leaderboard.length === 0) {
        leaderboardList.innerHTML = '<div style="text-align: center; padding: 20px;">暫無數據</div>';
        return;
    }
    
    // 排序排行榜
    leaderboard.sort((a, b) => b.score - a.score);
    
    // 創建表格頭部
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '10px';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['排名', '玩家', '分數', '關卡', '日期'];
    headers.forEach(headerText => {
        const header = document.createElement('th');
        header.textContent = headerText;
        header.style.padding = '8px';
        header.style.borderBottom = '2px solid #ddd';
        header.style.textAlign = 'left';
        headerRow.appendChild(header);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 創建表格內容
    const tbody = document.createElement('tbody');
    
    leaderboard.slice(0, 10).forEach((entry, index) => {
        const row = document.createElement('tr');
        row.style.backgroundColor = index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent';
        
        // 排名
        const rankCell = document.createElement('td');
        rankCell.textContent = index + 1;
        rankCell.style.padding = '8px';
        
        // 玩家名稱
        const nameCell = document.createElement('td');
        nameCell.textContent = entry.name;
        nameCell.style.padding = '8px';
        
        // 分數
        const scoreCell = document.createElement('td');
        scoreCell.textContent = entry.score;
        scoreCell.style.padding = '8px';
        
        // 關卡
        const levelCell = document.createElement('td');
        levelCell.textContent = entry.level;
        levelCell.style.padding = '8px';
        
        // 日期
        const dateCell = document.createElement('td');
        try {
            const date = new Date(entry.date);
            dateCell.textContent = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        } catch (e) {
            dateCell.textContent = '未知';
        }
        dateCell.style.padding = '8px';
        
        row.appendChild(rankCell);
        row.appendChild(nameCell);
        row.appendChild(scoreCell);
        row.appendChild(levelCell);
        row.appendChild(dateCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    leaderboardList.appendChild(table);
}

// 顯示排行榜
function showLeaderboard() {
    loadLeaderboard();
    document.getElementById('leaderboard').style.display = 'block';
}

// 隱藏排行榜
function hideLeaderboard() {
    document.getElementById('leaderboard').style.display = 'none';
}

// 初始化遊戲
window.onload = function() {
    initGame();
};
