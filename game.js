const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
});

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let bombs = 3;
let nukes = 0;
let clusters = 0;
let lives = 3;
let wave = 1;

let scrollSpeed = 3;
let bgScroll = 0;

// Inputs
let keys = {};
let mousePos = { x: width * 0.2, y: height * 0.3 };

window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

window.addEventListener('pointermove', (e) => {
    // Only track if not clicking on UI buttons
    if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
        mousePos.x = e.clientX;
        mousePos.y = e.clientY;
    }
});

// UI Elements
const ui = {
    bombsText: document.getElementById('bombs-text'),
    nukesText: document.getElementById('nukes-text'),
    clustersText: document.getElementById('clusters-text'),
    scoreText: document.getElementById('score-text'),
    livesText: document.getElementById('lives-text'),
    waveText: document.getElementById('wave-text'),
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn'),
    bombBtn: document.getElementById('bomb-btn'),
    nukeBtn: document.getElementById('nuke-btn'),
    clusterBtn: document.getElementById('cluster-btn'),
    finalScore: document.getElementById('final-score')
};

function updateUI() {
    ui.bombsText.innerText = `💣 x ${Math.floor(bombs)}`;
    ui.nukesText.innerText = `☢️ x ${nukes}`;
    ui.clustersText.innerText = `🎇 x ${clusters}`;
    ui.scoreText.innerText = `⭐ x ${score}`;
    ui.livesText.innerText = `✈️ x ${lives}`;
    ui.waveText.innerText = `Wave ${wave}`;
    
    ui.nukeBtn.disabled = nukes <= 0;
    ui.clusterBtn.disabled = clusters <= 0;
}

ui.startBtn.addEventListener('click', startGame);
ui.restartBtn.addEventListener('click', startGame);

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    bombs = 3;
    nukes = 0;
    clusters = 0;
    lives = 3;
    wave = 1;
    scrollSpeed = 3;
    entities = [];
    particles = [];
    clouds = generateClouds();
    hills = generateHills();
    groundTargets = [];
    
    player.x = width * 0.2;
    player.y = height * 0.3;
    
    ui.startScreen.classList.add('hidden');
    ui.gameOverScreen.classList.add('hidden');
    updateUI();
}

function gameOver() {
    gameState = 'GAMEOVER';
    ui.gameOverScreen.classList.remove('hidden');
    ui.finalScore.innerText = `Score: ${score}`;
}

// Entities
const player = {
    x: width * 0.2,
    y: height * 0.3,
    width: 60,
    height: 20,
    speed: 5,
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Body
        ctx.fillStyle = '#777';
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Cockpit
        ctx.fillStyle = '#add8e6';
        ctx.beginPath();
        ctx.ellipse(10, -5, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tail
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(-35, -15);
        ctx.lineTo(-20, -10);
        ctx.fill();

        // Wing
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-20, 15);
        ctx.lineTo(5, 5);
        ctx.fill();

        // Engine exhaust
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(-30, 2);
        ctx.lineTo(-40 + Math.random()*5, 5);
        ctx.lineTo(-30, 8);
        ctx.fill();
        
        ctx.restore();
    },
    update() {
        // Move towards mouse/touch pos
        const dx = mousePos.x - this.x;
        const dy = mousePos.y - this.y;
        
        this.x += dx * 0.05;
        this.y += dy * 0.05;
        
        // Boundaries
        if (this.x < 30) this.x = 30;
        if (this.x > width - 30) this.x = width - 30;
        if (this.y < 20) this.y = 20;
        // Don't go below ground
        const groundY = height - 80;
        if (this.y > groundY - 20) this.y = groundY - 20;
    }
};

let entities = []; // bombs, missiles
let particles = [];
let clouds = [];
let hills = [];
let groundTargets = [];

function generateClouds() {
    let arr = [];
    for(let i=0; i<10; i++) {
        arr.push({
            x: Math.random() * width * 2,
            y: Math.random() * height * 0.5,
            size: 20 + Math.random() * 40,
            speed: 0.5 + Math.random() * 1
        });
    }
    return arr;
}

function generateHills() {
    let arr = [];
    let curX = 0;
    while(curX < width * 2) {
        let w = 150 + Math.random() * 200;
        let h = 50 + Math.random() * 100;
        arr.push({x: curX, width: w, height: h});
        curX += w * 0.8;
    }
    return arr;
}

class Bomb {
    constructor(x, y, type = 'regular', vx = scrollSpeed, vy = 0) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.vx = vx;
        this.vy = vy;
        this.gravity = 0.2;
        this.active = true;
    }
    update() {
        this.vy += this.gravity;
        this.x += this.vx - scrollSpeed; // Relative to screen
        this.y += this.vy;
        
        if (this.type === 'cluster' && this.y >= height - 150 && this.vy > 0) {
            this.explode();
        } else if (this.y >= height - 80) { // Ground level
            this.explode();
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx)); // Point in direction of velocity
        
        if (this.type === 'nuke') {
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath(); ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillRect(-18, -5, 6, 10);
            ctx.fillRect(-5, -8, 10, 16);
        } else if (this.type === 'cluster') {
            ctx.fillStyle = '#006600';
            ctx.beginPath(); ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#222';
            ctx.fillRect(-16, -4, 5, 8);
        } else if (this.type === 'mini') {
            ctx.fillStyle = '#444';
            ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(-15, -4, 5, 8);
        }
        
        ctx.restore();
    }
    explode() {
        this.active = false;
        
        if (this.type === 'cluster') {
            createExplosion(this.x, this.y, 20);
            for(let i=0; i<6; i++) {
                let scatterVx = this.vx + (Math.random() * 6 - 3);
                let scatterVy = -2 - Math.random() * 3;
                entities.push(new Bomb(this.x, this.y - 10, 'mini', scatterVx, scatterVy));
            }
            return;
        }

        let radius = this.type === 'nuke' ? 400 : (this.type === 'mini' ? 30 : 60);
        let expSize = this.type === 'nuke' ? 200 : (this.type === 'mini' ? 15 : 40);
        
        createExplosion(this.x, this.y, expSize);
        if (this.type === 'nuke') {
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(0,0,width,height);
        }
        
        // Check collisions with targets
        groundTargets.forEach(target => {
            if (target.active) {
                const dist = Math.hypot(target.x - this.x, target.y - this.y);
                if (dist < radius) {
                    target.active = false;
                    score += target.points;
                    createExplosion(target.x, target.y, 60);
                    
                    if (target.type === 'building') {
                        if (Math.random() > 0.5) {
                            nukes++;
                        } else {
                            clusters++;
                        }
                    }
                }
            }
        });
        updateUI();
    }
}

class GroundTarget {
    constructor(x, type) {
        this.x = x;
        this.y = height - 80; // ground level
        this.type = type; // 'truck', 'tank', 'building'
        this.active = true;
        this.points = type === 'building' ? 50 : 10;
        this.cooldown = Math.random() * 100;
    }
    update() {
        this.x -= scrollSpeed;
        if (this.x < -100) {
            this.active = false;
        }
        
        if (this.type === 'tank') {
            this.cooldown--;
            if (this.cooldown <= 0 && this.x > 0 && this.x < width) {
                // Fire missile
                entities.push(new Missile(this.x, this.y));
                this.cooldown = 150 + Math.random() * 100;
            }
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.type === 'truck') {
            ctx.fillStyle = '#556B2F';
            ctx.fillRect(-20, -15, 40, 15);
            ctx.fillStyle = '#333';
            ctx.beginPath(); ctx.arc(-10, 0, 5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(10, 0, 5, 0, Math.PI*2); ctx.fill();
        } else if (this.type === 'tank') {
            ctx.fillStyle = '#4B5320';
            ctx.fillRect(-20, -10, 40, 10);
            ctx.fillRect(-10, -20, 20, 10); // turret
            ctx.fillStyle = '#222';
            ctx.fillRect(-30, -15, 20, 4); // barrel pointing left
        } else if (this.type === 'building') {
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(-30, -40, 60, 40);
            ctx.fillStyle = '#000';
            ctx.fillRect(-10, -15, 10, 15); // door
        }
        
        // Draw red star flag
        ctx.fillStyle = 'red';
        ctx.fillRect(0, -50, 15, 10);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, -50, 2, 20); // pole
        
        ctx.restore();
    }
}

class Missile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.active = true;
        
        // Aim at player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angle = Math.atan2(dy, dx);
        const speed = 4;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }
    update() {
        this.x += this.vx - scrollSpeed;
        this.y += this.vy;
        
        // Particles for trail
        particles.push(new Particle(this.x, this.y, '#ccc', 1));
        
        if (this.y < 0 || this.x < 0 || this.x > width) {
            this.active = false;
        }
        
        // Check collision with player
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < 20) {
            this.active = false;
            lives--;
            createExplosion(player.x, player.y, 50);
            updateUI();
            if (lives <= 0) {
                gameOver();
            }
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx));
        
        ctx.fillStyle = '#aaa';
        ctx.fillRect(-10, -2, 20, 4);
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(-10, 0, 4, 0, Math.PI*2);
        ctx.fill();
        
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, sizeMultiplier = 1) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.color = color;
        this.size = (Math.random() * 10 + 5) * sizeMultiplier;
    }
    update() {
        this.x += this.vx - scrollSpeed;
        this.y += this.vy;
        this.life -= 0.05;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function createExplosion(x, y, size) {
    for(let i=0; i<size; i++) {
        let colors = ['#ff0000', '#ff8800', '#ffff00', '#444444'];
        let color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, color, size/40));
    }
}

function dropBomb(type = 'regular') {
    if (gameState !== 'PLAYING') return;
    
    if (type === 'nuke') {
        if (nukes <= 0) return;
        nukes--;
    } else if (type === 'cluster') {
        if (clusters <= 0) return;
        clusters--;
    } else {
        if (bombs <= 0) return;
        bombs--;
    }
    
    entities.push(new Bomb(player.x, player.y, type));
    updateUI();
}

ui.bombBtn.addEventListener('mousedown', () => dropBomb('regular'));
ui.bombBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    dropBomb('regular');
});

ui.nukeBtn.addEventListener('mousedown', () => dropBomb('nuke'));
ui.nukeBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    dropBomb('nuke');
});

ui.clusterBtn.addEventListener('mousedown', () => dropBomb('cluster'));
ui.clusterBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    dropBomb('cluster');
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') dropBomb('regular');
    if (e.code === 'KeyN') dropBomb('nuke');
    if (e.code === 'KeyC') dropBomb('cluster');
});

let spawnTimer = 0;

function update() {
    if (gameState !== 'PLAYING') return;
    
    player.update();
    
    // Bombs reload slowly
    if (bombs < 3) {
        bombs += 0.005; // recharge over time
        updateUI();
    }
    
    // Environment
    clouds.forEach(c => {
        c.x -= c.speed;
        if (c.x < -100) c.x = width + 100;
    });
    
    hills.forEach(h => {
        h.x -= scrollSpeed * 0.5;
        if (h.x + h.width < 0) {
            h.x = width;
            h.width = 150 + Math.random() * 200;
            h.height = 50 + Math.random() * 100;
        }
    });
    
    // Entities
    entities.forEach(e => e.update());
    entities = entities.filter(e => e.active);
    
    groundTargets.forEach(t => t.update());
    groundTargets = groundTargets.filter(t => t.active);
    
    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);
    
    // Spawning targets
    spawnTimer++;
    if (spawnTimer > 100 - wave * 5) {
        spawnTimer = 0;
        if (Math.random() < 0.3) {
            let type = Math.random() > 0.5 ? 'truck' : (Math.random() > 0.5 ? 'tank' : 'building');
            groundTargets.push(new GroundTarget(width + 50, type));
        }
    }
    
    // Wave progression
    if (score > wave * 200) {
        wave++;
        scrollSpeed += 0.5;
        updateUI();
    }
}

function draw() {
    // Sky
    let grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#4a90e2');
    grad.addColorStop(1, '#87ceeb');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    
    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI*2);
        ctx.arc(c.x + c.size*0.8, c.y + c.size*0.2, c.size*0.8, 0, Math.PI*2);
        ctx.arc(c.x - c.size*0.8, c.y + c.size*0.2, c.size*0.8, 0, Math.PI*2);
        ctx.fill();
    });
    
    // Hills
    ctx.fillStyle = '#228B22'; // forest green
    hills.forEach(h => {
        ctx.beginPath();
        ctx.moveTo(h.x, height - 80);
        ctx.quadraticCurveTo(h.x + h.width/2, height - 80 - h.height, h.x + h.width, height - 80);
        ctx.fill();
    });
    
    // Ground
    ctx.fillStyle = '#32CD32'; // lime green
    ctx.fillRect(0, height - 80, width, 80);
    // Ground texture lines
    ctx.fillStyle = '#228B22';
    for(let i=0; i<width; i+=40) {
        let offset = (bgScroll * scrollSpeed) % 40;
        ctx.fillRect(i - offset, height - 60, 5, 20);
    }
    bgScroll++;
    
    if (gameState === 'PLAYING' || gameState === 'GAMEOVER') {
        groundTargets.forEach(t => t.draw());
        entities.forEach(e => e.draw());
        particles.forEach(p => p.draw());
        if (lives > 0) {
            player.draw();
        }
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start loop
gameLoop();
