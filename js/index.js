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

let lastUpdate = 0;
const FPS_LIMIT = 60;
const FRAME_DELAY = 1000 / FPS_LIMIT;   // 添加帧率控制变量
const MAX_BULLETS = 50; // 在全局定义子弹池上限

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
    if (bulletPool.length >= MAX_BULLETS) return; // 限制数量

    let bullet = bulletPool.find(b => !b.active);
    if (!bullet) {
        bullet = document.createElement('div');
        bullet.className = 'bullet';
        document.body.appendChild(bullet);
        bulletPool.push(bullet);
    }

    // 重置状态
    bullet.style.display = 'block';
    const { x, y } = getGunPosition();
    bullet.style.left = x + 'px';
    bullet.style.top = y + 'px';
    bullet.active = true;
}

// 子弹运动逻辑
function updateBullets(timestamp) {
    if (!gameActive) return;

    // 帧率控制
    if (timestamp - lastUpdate < FRAME_DELAY) {
        requestAnimationFrame(updateBullets);
        return;
    }
    lastUpdate = timestamp;
    
    bulletPool.forEach((bullet) => {
        if (!bullet.active) {
            bullet.style.display = 'none';
            return;
        }

        const top = parseFloat(bullet.style.top) || 0;
        bullet.style.top = (top - 20) + 'px';

        // 先检测碰撞，再处理隐藏
        let isHit = false;

        // 目标碰撞检测
        if (checkCollision(bullet, target)) {
            addScore(50, target);
            isHit = true;
        }

        // 小行星碰撞检测
        for (let i = asteroidPool.length - 1; i >= 0; i--) {
            const asteroid = asteroidPool[i];
            if (asteroid.active && checkCollision(bullet, asteroid)) {
                if (asteroid.isBoss) {
                    gameActive = false;
                    showGameOver("你激怒了总裁！", true);
                    return;
                }
                addScore(-200, asteroid);
                isHit = true;
                break;
            }
        }

        // 边界检测或碰撞后隐藏
        if (top < 100 || isHit) {
            bullet.active = false;
            bullet.style.display = 'none';
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
    }, 300);

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
        asteroidBelt.appendChild(asteroid);
        asteroidPool.push(asteroid);
    }

    // 随机生成总裁或普通领导
    const isBoss = Math.random() < 0.1;
    if (isBoss) {
        asteroid.textContent = '总裁经过 ...';
        asteroid.style.backgroundColor = '#FF0000';
        asteroid.isBoss = true;
    } else {
        asteroid.textContent = '领导经过 ...';
        asteroid.style.backgroundColor = '#607D8B';
        asteroid.isBoss = false;
    }

    let positionValid = false;
    let newTop, newLeft;

    while (!positionValid) {
        newTop = Math.random() * 250;
        newLeft = '100%';

        positionValid = !asteroidPositions.some(position => 
            Math.abs(position.top - newTop) < 60);

        if (positionValid) {
            asteroidPositions.push({ top: newTop, left: newLeft });
        }
    }

    asteroid.style.top = `${newTop}px`;
    asteroid.style.left = newLeft;
    asteroid.active = true;

    const asteroidDuration = window.innerWidth < 600 ? 1000 : 6000;
    setTimeout(() => {
        asteroid.active = false;
        const index = asteroidPositions.findIndex(position => position.top === newTop);
        if (index !== -1) {
            asteroidPositions.splice(index, 1);
        }
    }, asteroidDuration);
}

// 显示游戏结束弹窗
function showGameOver(message, isBoss = false) {
    finalScoreElement.textContent = score;
    const showShare = !isBoss && score > 0;
    
    gameOverElement.innerHTML = `
        <h2>游戏结束</h2>
        <p>${message}</p>
        <button onclick="location.reload()">再玩一次</button>
        ${showShare ? '<button id="shareButton">分享成绩</button>' : ''}
    `;
    gameOverElement.style.display = 'block';

    if (score > 0) {
        const shareButton = document.getElementById('shareButton');
        shareButton.addEventListener('click', () => {
            const shareText = `我在痛扁陈涛大赛中取得了 ${score} 分的好成绩，你最好小心点`;
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

// 定义轮播数组
const messages = [
    "“ 这个需求我真的做不了 ”",
    "“ 这个至少要排 10PD ”",
    "“ 现在很忙，晚点帮你看 ”",
    "“ 这个找热线看，我不查 ”",
    "“ 你这个改动太复杂了，走变更吧 ”"
];

let currentMessageIndex = 0;

// 更新顶部文案
function updateSceneMessage() {
    const sceneElement = document.getElementById('scene');
    sceneElement.textContent = messages[currentMessageIndex];
    currentMessageIndex = (currentMessageIndex + 1) % messages.length;
}

// 启动游戏
startTimer();
updateSceneMessage();
const asteroidInterval = setInterval(createAsteroid, 2500);
const animationFrame = requestAnimationFrame(updateBullets);
setInterval(updateSceneMessage, 2000); // 每2秒切换一次文案

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