const player = document.getElementById('player');
const target = document.getElementById('target');
const leaderBelt = document.getElementById('leaderBelt');
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
const leaderPool = [];

// 获取玩家当前中心位置
function getGunPosition() {
    const rect = player.getBoundingClientRect();
    return {
        x: rect.left + rect.width * 0.85,
        y: rect.top - rect.height * 0.6
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

        // 领导碰撞检测
        for (let i = leaderPool.length - 1; i >= 0; i--) {
            const leader = leaderPool[i];
            if (leader.active && checkCollision(bullet, leader)) {
                if (leader.isBoss) {
                    gameActive = false;
                    showGameOver("你激怒了总裁！", true);
                    return;
                }
                addScore(-200, leader);
                isHit = true;
                break;
            }
        }

        // 边界检测或碰撞后隐藏
        if (top < 80 || isHit) {
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

// 领导带区域
const leaderPositions = [];

// 创建领导
function createLeader() {
    let leader = leaderPool.find(a => !a.active);
    if (!leader) {
        leader = document.createElement('div');
        leader.className = 'leader';
        leaderBelt.appendChild(leader);
        leaderPool.push(leader);
    }

    // 重置领导状态
    const isBoss = Math.random() < 0.05;
    leader.textContent = isBoss ? '总裁经过 ...' : '领导经过 ...';
    leader.style.backgroundColor = isBoss ? '#FF0000' : '#607D8B';
    leader.isBoss = isBoss;
    leader.active = true;

    // 生成随机参数
    const duration = Math.random() * 3 + 2;
    let positionValid = false;
    let newTop;

    // 位置冲突检测
    while (!positionValid) {
        newTop = Math.random() * 250;
        positionValid = !leaderPositions.some(position => 
            Math.abs(position.top - newTop) < 60);
    }

    // 强制重置位置和动画
    leader.style.animation = 'none';
    leader.style.left = '100%';
    leader.style.top = `${newTop}px`;
    void leader.offsetWidth; // 触发重绘

    // 应用新动画
    leader.style.animation = `leaderMove ${duration}s linear forwards`;
    leaderPositions.push({ top: newTop });

    // 动画结束处理
    const onAnimationEnd = () => {
        leader.active = false;
        const index = leaderPositions.findIndex(p => p.top === newTop);
        if (index !== -1) leaderPositions.splice(index, 1);
        leader.removeEventListener('animationend', onAnimationEnd);
    };
    leader.addEventListener('animationend', onAnimationEnd, { once: true });
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
            const shareText = `我在维亚大作战中取得了 ${score} 分的好成绩，你最好小心点`;
            navigator.clipboard.writeText(shareText).then(() => {
                alert('分享信息已拷贝至剪切板，去发送给陈涛吧～');
            });
        });
    }

    clearInterval(leaderInterval);
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
    "\" 你这个需求我做不了 \"",
    "\" 这个至少要排 10 PD \"",
    "\" 让 QA 测吧, 懒得点了 \"",
    "\" 现在很忙, 晚点帮你看 \"",
    "\" 这个找热线看, 我不查 \"",
    "\" 太复杂了, 走变更吧 \""
];

let currentMessageIndex = 0;

// 更新顶部文案
function updateTalksMessage() {
    const sceneElement = document.getElementById('talks');
    sceneElement.textContent = messages[currentMessageIndex];
    currentMessageIndex = (currentMessageIndex + 1) % messages.length;
}

// 启动游戏
startTimer();
updateTalksMessage();
const leaderInterval = setInterval(createLeader, 3000);
const animationFrame = requestAnimationFrame(updateBullets);
setInterval(updateTalksMessage, 3000);

// 键盘事件监听
let shootInterval;
document.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    if (e.code === 'Space' && !shootInterval) {
        shoot();
        shootInterval = setInterval(shoot, 100);
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        clearInterval(shootInterval);
        shootInterval = null;
    }
});

// 监听鼠标点击事件发射子弹
document.addEventListener('click', () => {
    if (gameActive) {
        shoot();
    }
});