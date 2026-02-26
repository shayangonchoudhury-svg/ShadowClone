const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth * 0.95;
canvas.height = window.innerHeight * 0.9;

/* ---------------- GAME STATE ---------------- */

let round = 1;
let roundDuration = 10;
let roundStartTime = Date.now();

let gameRunning = true;
let hasDied = false;

let score = 0;
let multiplier = 1;
let slowMotion = false;
let shakeIntensity = 0;

/* ---------------- LAST SCORE FX ---------------- */

let lastScore = 0;
let showLastScore = false;
let lastScoreScale = 3;

/* ---------------- PLAYER ---------------- */

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 20,
  vx: 0,
  vy: 0,
  acceleration: 0.6,
  friction: 0.90
};

let playerPath = [];
let clones = [];
let obstacles = [];
let trailParticles = [];
let deathFragments = [];
let touchTarget = null;

/* ---------------- CAMERA SHAKE ---------------- */

function applyCameraShake() {
  if (shakeIntensity > 0) {
    const dx = (Math.random() - 0.5) * shakeIntensity;
    const dy = (Math.random() - 0.5) * shakeIntensity;
    ctx.translate(dx, dy);
    shakeIntensity *= 0.9;
  }
}

/* ---------------- TRAIL ---------------- */

function createTrail() {
  trailParticles.push({
    x: player.x,
    y: player.y,
    life: 20
  });
}

function drawTrail() {
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    const p = trailParticles[i];
    ctx.fillStyle = `rgba(0,255,255,${p.life / 20})`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00ffff";
    ctx.fillRect(p.x, p.y, 6, 6);
    p.life--;
    if (p.life <= 0) trailParticles.splice(i, 1);
  }
  ctx.shadowBlur = 0;
}

/* ---------------- DEATH FRAGMENTS ---------------- */

function createDeathFragments() {
  const pieceSize = player.size / 4;

  for (let i = 0; i < 16; i++) {
    deathFragments.push({
      x: player.x + (i % 4) * pieceSize,
      y: player.y + Math.floor(i / 4) * pieceSize,
      size: pieceSize,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 40
    });
  }
}

function drawDeathFragments() {
  for (let i = deathFragments.length - 1; i >= 0; i--) {
    const f = deathFragments[i];

    ctx.fillStyle = `rgba(0,255,255,${f.life / 40})`;
    ctx.fillRect(f.x, f.y, f.size, f.size);

    f.x += f.vx;
    f.y += f.vy;
    f.vx *= 0.95;
    f.vy *= 0.95;
    f.life--;

    if (f.life <= 0) deathFragments.splice(i, 1);
  }

  if (deathFragments.length === 0 && hasDied) {
    document.getElementById("gameOver").classList.remove("hidden");
  }
}

/* ---------------- OBSTACLES ---------------- */

function createObstacles() {
  obstacles = [];
  for (let i = 0; i < 3 + round; i++) {
    obstacles.push({
      x: Math.random() * (canvas.width - 40),
      y: Math.random() * (canvas.height - 40),
      size: 40
    });
  }
}

/* ---------------- CLONES ---------------- */

function updateClones() {
  clones.forEach(clone => {
    if (clone.path.length === 0) return;

    const index = Math.floor(clone.frame) % clone.path.length;
    clone.x = clone.path[index].x;
    clone.y = clone.path[index].y;

    clone.frame += clone.speed * (slowMotion ? 0.5 : 1);
  });
}

/* ---------------- COLLISION ---------------- */

function checkCollision(a, b, sizeA, sizeB) {
  return (
    a.x < b.x + sizeB &&
    a.x + sizeA > b.x &&
    a.y < b.y + sizeB &&
    a.y + sizeA > b.y
  );
}

/* ---------------- ROUND ---------------- */

function nextRound() {
  clones.push({
    x: 0,
    y: 0,
    path: [...playerPath],
    frame: Math.random() * playerPath.length,
    speed: 1 + round * 0.2
  });

  multiplier++;
  round++;
  playerPath = [];
  roundStartTime = Date.now();
  createObstacles();

  document.getElementById("round").innerText = round;
  document.getElementById("multiplier").innerText = multiplier;
}

/* ---------------- DEATH TRIGGER ---------------- */

function triggerDeath() {
  if (hasDied) return;

  hasDied = true;
  gameRunning = false;

  lastScore = Math.floor(score);
  showLastScore = true;
  lastScoreScale = 3;

  shakeIntensity = 50;
  createDeathFragments();
}

/* ---------------- GAME LOOP ---------------- */

function gameLoop() {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  applyCameraShake();

  if (!hasDied) {

    if (touchTarget) {
      const dx = touchTarget.x - player.x;
      const dy = touchTarget.y - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 5) {
        player.vx += (dx / dist) * player.acceleration;
        player.vy += (dy / dist) * player.acceleration;
      }
    }

    player.vx *= player.friction;
    player.vy *= player.friction;

    const maxSpeed = slowMotion ? 4 : 8;
    player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
    player.vy = Math.max(-maxSpeed, Math.min(maxSpeed, player.vy));

    player.x += player.vx;
    player.y += player.vy;

    if (Math.abs(player.vx) > 0.2 || Math.abs(player.vy) > 0.2) {
      createTrail();
    }

    playerPath.push({ x: player.x, y: player.y });

    drawTrail();

    clones.forEach(clone => {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#8888ff";
      ctx.fillRect(clone.x, clone.y, player.size, player.size);
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = "#00ffff";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#00ffff";
    ctx.fillRect(player.x, player.y, player.size, player.size);
    ctx.shadowBlur = 0;

    obstacles.forEach(o => {
      ctx.fillStyle = "#ff0044";
      ctx.fillRect(o.x, o.y, o.size, o.size);
    });

    updateClones();

    clones.forEach(clone => {
      if (checkCollision(player, clone, player.size, player.size)) {
        triggerDeath();
      }
    });

    obstacles.forEach(o => {
      if (checkCollision(player, o, player.size, o.size)) {
        triggerDeath();
      }
    });

    const elapsed = (Date.now() - roundStartTime) / 1000;
    const timeLeft = Math.max(0, roundDuration - Math.floor(elapsed));
    document.getElementById("timer").innerText = timeLeft;

    score += multiplier * (slowMotion ? 0.5 : 1);
    document.getElementById("score").innerText = Math.floor(score);

    if (elapsed >= roundDuration) nextRound();
  }

  drawDeathFragments();

  /* ---------------- DRAW LAST SCORE ---------------- */

  if (showLastScore) {
    ctx.fillStyle = "white";
    ctx.textAlign = "center";

    if (lastScoreScale > 1) {
      lastScoreScale *= 0.96;
    }

    ctx.font = `${50 * lastScoreScale}px Segoe UI`;
    ctx.fillText("LAST SCORE", canvas.width / 2, canvas.height / 2 - 70);

    ctx.font = `${70 * lastScoreScale}px Segoe UI`;
    ctx.fillText(lastScore, canvas.width / 2, canvas.height / 2 + 10);
  }

  ctx.restore();
  requestAnimationFrame(gameLoop);
}

/* ---------------- RESTART ---------------- */

function restartGame() {
  round = 1;
  clones = [];
  trailParticles = [];
  deathFragments = [];
  playerPath = [];
  score = 0;
  multiplier = 1;
  roundStartTime = Date.now();
  gameRunning = true;
  hasDied = false;

  showLastScore = false;
  lastScoreScale = 3;

  document.getElementById("gameOver").classList.add("hidden");
  document.getElementById("round").innerText = 1;
  document.getElementById("multiplier").innerText = 1;

  createObstacles();
}

/* ---------------- TOUCH ---------------- */

canvas.addEventListener("touchstart", e => {
  const t = e.touches[0];
  touchTarget = { x: t.clientX, y: t.clientY };
  slowMotion = true;
});

canvas.addEventListener("touchmove", e => {
  const t = e.touches[0];
  touchTarget = { x: t.clientX, y: t.clientY };
});

canvas.addEventListener("touchend", () => {
  touchTarget = null;
  slowMotion = false;
});

/* ---------------- LOADING SYSTEM ---------------- */

function startGameAfterLoading() {
  createObstacles();
  gameLoop();
}

function runLoading() {
  let progress = 0;
  const bar = document.getElementById("loadingBar");

  const interval = setInterval(() => {
    progress += 4;
    bar.style.width = progress + "%";

    if (progress >= 100) {
      clearInterval(interval);
      document.getElementById("loadingScreen").style.display = "none";
      startGameAfterLoading();
    }
  }, 60);
}

runLoading();
