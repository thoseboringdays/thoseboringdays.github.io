const player = document.getElementById('player');
const target = document.getElementById('target');
const asteroidBelt = document.getElementById('asteroidBelt');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const shareButton = document.getElementById('shareButton');
let score = 0;
let gameActive = true;
let timeLeft = 30;

// 对象池
const bulletPool = [];
const sparkPool = [];
const asteroidPool = [];

// 获取玩家当前中心位置
function getGunPosition() {
    const rect = player.getBoundingClientRect();
    return {
        x: rect.left + rect.width * 0.8,
        y: rect.top
    };
}

// 创建子弹
function shoot() {
    let bullet = bulletPool.find(b => !b.active);
    if (!bullet) {
        bullet = document.createElement('div');
        bullet.className = 'bullet';
        document.body.appendChild(bullet);
        bulletPool.push(bullet);
    }

    const { x, y } = getGunPosition();
    bullet.style.left = x + 'px';
    bullet.style.top = y + 'px';
    bullet.active = true;
}

// 子弹运动逻辑
function updateBullets() {
    if (!gameActive) return;

    bulletPool.forEach((bullet) => {
        if (!bullet.active) return;

        const top = parseFloat(bullet.style.top) || 0;
        bullet.style.top = (top - 10) + 'px';

        // 检测子弹是否击中目标
        if (checkCollision(bullet, target)) {
            bullet.active = false;
            addScore(50, target);
        }

        // 检测子弹是否击中小行星
        asteroidPool.forEach((asteroid) => {
            if (asteroid.active && checkCollision(bullet, asteroid)) {
                bullet.active = false;
                addScore(-200, asteroid);
            }
        });

        // 移出屏幕后重置
        if (top < -20) {
            bullet.active = false;
        }
    });

    requestAnimationFrame(updateBullets);
}

// 检测碰撞
function checkCollision(bullet, target) {
    const bulletRect = bullet.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    return (
        bulletRect.left < targetRect.right &&
        bulletRect.right > targetRect.left &&
        bulletRect.top < targetRect.bottom &&
        bulletRect.bottom > targetRect.top
    );
}

// 增加分数
function addScore(points, target) {
    if (!gameActive) return;

    score += points;
    score = Math.max(score, 0);

    // 显示分数变化提示
    const feedback = document.createElement('div');
    feedback.className = 'score-feedback';
    feedback.textContent = (points > 0 ? '+' : '') + points;
    feedback.style.color = points > 0 ? '#00ff00' : '#ff0000';
    feedback.style.left = target.getBoundingClientRect().left + 'px';
    feedback.style.top = target.getBoundingClientRect().bottom + 'px';
    document.body.appendChild(feedback);

    // 提示文案0.5秒后消失
    setTimeout(() => {
        feedback.remove();
    }, 500);

    // 分数为负时的特殊处理
    if (score <= 0) {
        score = 0;
        gameActive = false;
        showGameOver("你激怒了领导！");
    }

    scoreElement.textContent = `得分: ${score}`;
}

// 小行星带区域
const asteroidPositions = [];

// 创建小行星
function createAsteroid() {
    let asteroid = asteroidPool.find(a => !a.active);
    if (!asteroid) {
        asteroid = document.createElement('div');
        asteroid.className = 'asteroid';
        asteroid.textContent = '领导经过 ...';
        asteroidBelt.appendChild(asteroid);
        asteroidPool.push(asteroid);
    }

    let positionValid = false;
    let newTop, newLeft;

    // 确保小行星的位置不与其他小行星重叠
    while (!positionValid) {
        // 随机生成一个新的位置
        newTop = Math.random() * 250;
        newLeft = '100%';

        // 检查新的位置是否与已有的小行星位置重叠
        positionValid = !asteroidPositions.some(position => 
            Math.abs(position.top - newTop) < 60);  // 60px为避免重叠的距离

        // 如果没有重叠，则记录新的位置
        if (positionValid) {
            asteroidPositions.push({ top: newTop, left: newLeft });
        }
    }

    asteroid.style.top = `${newTop}px`;
    asteroid.style.left = newLeft;
    asteroid.active = true;

    // 设置小行星的有效期，6秒后失效
    setTimeout(() => {
        asteroid.active = false;
        // 清理已失效的小行星位置
        const index = asteroidPositions.findIndex(position => position.top === newTop);
        if (index !== -1) {
            asteroidPositions.splice(index, 1);
        }
    }, 6000);
}

// 显示游戏结束弹窗
function showGameOver(message) {
    finalScoreElement.textContent = score;
    gameOverElement.innerHTML = `
        <h2>游戏结束</h2>
        <p>${message}</p>
        <button onclick="location.reload()">再玩一次</button>
        ${score > 0 ? '<button id="shareButton">分享成绩</button>' : ''}
    `;
    gameOverElement.style.display = 'block';

    if (score > 0) {
        const shareButton = document.getElementById('shareButton');
        shareButton.addEventListener('click', () => {
            const shareText = `我在维亚大作战中取得了 ${score} 分的好成绩，你最好小心点`;
            navigator.clipboard.writeText(shareText).then(() => {
                alert('分享信息已拷贝至剪切板，去飞书发送给陈涛吧～');
            });
        });
    }

    clearInterval(asteroidInterval);
    cancelAnimationFrame(animationFrame);
}

// 启动倒计时
function startTimer() {
    const timer = setInterval(() => {
        if (!gameActive) return;
        timeLeft--;
        timerElement.textContent = `时间: ${timeLeft}`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            gameActive = false;
            gameOverText = score > 0 ? `您取得了 ${score} 分的好成绩，快去分享给陈涛吧！` : `很遗憾，您未能取得积分`
            showGameOver(gameOverText);
        }
    }, 1000);
}

// 启动游戏
startTimer();
const asteroidInterval = setInterval(createAsteroid, 2500);
const animationFrame = requestAnimationFrame(updateBullets);

// 键盘事件监听
let shootInterval;
document.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    if (e.code === 'Space' && !shootInterval) {
        shoot(); // 按下空格立即发射
        shootInterval = setInterval(shoot, 100); // 每100ms发射一颗子弹
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        clearInterval(shootInterval); // 松开空格停止发射
        shootInterval = null;
    }
});

// 监听鼠标点击事件发射子弹
document.addEventListener('click', () => {
    if (gameActive) {
        shoot(); // 点击时发射子弹
    }
});