const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth * 0.95;
canvas.height = window.innerHeight * 0.9;


/* ---------------- TUTORIAL SYSTEM ---------------- */

let tutorialCompleted =
  localStorage.getItem("shadowTutorialDone") === "true";



let tutorialStep = 0;
let tutorialMessage = "";
let tutorialOverlayAlpha = 0.75;
let tutorialTimer = 0;
let tutorialTextVisible = true;



/* ---------------- DIFFICULTY SYSTEM ---------------- */

let difficulty = null;

const difficultySettings = {
  novice: {
    baseObstacles: 2,
    roundDuration: 20,
    baseScoreCap: 15
  },
  standard: {
    baseObstacles: 3,
    roundDuration: 16,
    baseScoreCap: 30
  },
  expert: {
    baseObstacles: 4,
    roundDuration: 13,
    baseScoreCap: 45
  },
  hell: {
    baseObstacles: 5,
    roundDuration: 10,
    baseScoreCap: 60
  }
};

let gameState = "loading";
// possible states:
// "loading"
// "tutorial"
// "difficulty"
// "playing"
// "gameover"

/* ---------------- GAME STATE ---------------- */

let round = 1;
let roundDuration = 10;
let roundStartTime = Date.now();

let gameRunning = true;
let hasDied = false;

let score = 0;
let multiplier = 1;
let roundScore = 0;
let roundScoreCap = 30;
let totalScoreFromCompletedRounds = 0;
let slowMotion = false;
let shakeIntensity = 0;

/* ---------------- LAST SCORE FX ---------------- */

let highScore = parseInt(localStorage.getItem("shadowHighScore")) || 0;
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
canvas.style.pointerEvents = "none";
let playerPath = [];
let clones = [];
let obstacles = [];
let trailParticles = [];
let deathFragments = [];
let touchTarget = null;

/* ---------------- BACKGROUND DECOR ---------------- */

let backgroundTrees = [];
let backgroundHouses = [];
let bgOffset = 0;

function createBackground() {
  backgroundTrees = [];
  backgroundHouses = [];

  for (let i = 0; i < 15; i++) {
    backgroundTrees.push({
      x: Math.random() * canvas.width,
      y: canvas.height - 120 - Math.random() * 80,
      size: 40 + Math.random() * 40
    });
  }

  for (let i = 0; i < 6; i++) {
    backgroundHouses.push({
      x: Math.random() * canvas.width,
      y: canvas.height - 100,
      width: 60,
      height: 60
    });
  }
}

/* ---------------- STAGE SYSTEM ---------------- */

let currentStage = 0;
let stageElements = [];

const stageThemes = [
  "stars",
  "clouds",
  "fog",
  "city",
  "lightning",
  "forest",
  "cyberpunk",
  "horror",
  "minimal",
  "storm"
];


function generateStageElements() {

  stageElements = [];

  const theme = stageThemes[currentStage % stageThemes.length];

  for (let i = 0; i < 15; i++) {
    stageElements.push({
      x: Math.random() * canvas.width,
      y: canvas.height - 100 - Math.random() * 150,
      size: 40 + Math.random() * 60,
      type: theme
    });
  }
}


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

  const base = difficultySettings[difficulty].baseObstacles;
  const totalObstacles = base + (round - 1);

  for (let i = 0; i < totalObstacles; i++) {
    obstacles.push({
      x: Math.random() * (canvas.width - 40),
      y: Math.random() * (canvas.height - 40),
      size: 40
    });
  }
}


function drawBackgroundDecor() {

  bgOffset += 0.2; // slow parallax movement

  ctx.save();
  ctx.globalAlpha = 0.15;

  // Draw Trees
  backgroundTrees.forEach(tree => {
    let x = (tree.x - bgOffset) % canvas.width;
    if (x < 0) x += canvas.width;

    ctx.fillStyle = "rgba(0,255,255,0.4)";

    // trunk
    ctx.fillRect(x, tree.y, 6, tree.size);

    // top
    ctx.beginPath();
    ctx.arc(x + 3, tree.y, tree.size / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw Houses
  backgroundHouses.forEach(house => {
    let x = (house.x - bgOffset * 0.5) % canvas.width;
    if (x < 0) x += canvas.width;

    ctx.fillStyle = "rgba(0,255,255,0.4)";

    ctx.fillRect(x, house.y, house.width, house.height);

    // roof
    ctx.beginPath();
    ctx.moveTo(x, house.y);
    ctx.lineTo(x + house.width / 2, house.y - 30);
    ctx.lineTo(x + house.width, house.y);
    ctx.closePath();
    ctx.fill();
  });

  ctx.restore();
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

/* ---------------- ROUND BACKGROUND THEME ---------------- */

function updateRoundTheme() {

  currentStage = Math.floor((round - 1) / 5);
  const hue = (currentStage * 50) % 360;

  document.body.style.background = `
    radial-gradient(circle at center,
      hsl(${hue}, 50%, 12%) 0%,
      hsl(${hue}, 60%, 6%) 100%)
  `;

  generateStageElements();
}




/* ---------------- DRAW STAGE ENVIRONMENT ---------------- */

function drawStageEnvironment() {

  ctx.save();
  ctx.globalAlpha = 0.06;

  stageElements.forEach(e => {

    ctx.fillStyle = "rgba(0,255,255,0.4)";

    switch (e.type) {

      case "stars":
        ctx.fillRect(e.x, e.y - 200, 3, 3);
        break;

      case "clouds":
        ctx.beginPath();
        ctx.arc(e.x, e.y - 150, 40, 0, Math.PI * 2);
        ctx.arc(e.x + 40, e.y - 150, 40, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "fog":
        ctx.fillRect(0, canvas.height - 120, canvas.width, 80);
        break;

      case "city":
      case "minimal":
      case "cyberpunk":
      case "horror":
        ctx.fillRect(e.x, canvas.height - e.size, 40, e.size);
        break;

      case "forest":
        ctx.fillRect(e.x, canvas.height - e.size, 6, e.size);
        ctx.beginPath();
        ctx.arc(e.x + 3, canvas.height - e.size, e.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "lightning":
      case "storm":
        ctx.beginPath();
        ctx.moveTo(e.x, 0);
        ctx.lineTo(e.x + 10, 150);
        ctx.lineTo(e.x - 10, 300);
        ctx.stroke();
        break;
    }
  });

  ctx.restore();
}



/* ---------------- ROUND ---------------- */

function nextRound() {
  totalScoreFromCompletedRounds += roundScoreCap;
  clones.push({
    x: 0,
    y: 0,
    path: [...playerPath],
    frame: Math.random() * playerPath.length,
    speed: gameState === "tutorial" ? 0.5 : 1 + round * 0.2
  });

  multiplier++;
  round++;
  playerPath = [];
  roundStartTime = Date.now();
  createObstacles();

  document.getElementById("round").innerText = round;
  document.getElementById("multiplier").innerText = multiplier;
  roundScore = 0;
roundScoreCap =
  difficultySettings[difficulty].baseScoreCap + round * 8; // increases each round
updateRoundTheme(); // 🔥 Dynamic color shift
}


/* ---------------- DEATH TRIGGER ---------------- */

function triggerDeath() {
  if (hasDied) return;

  hasDied = true;
  gameRunning = false;

  lastScore = Math.floor(score);

  document.getElementById("finalScoreDisplay").innerText =
    "Last Score: " + lastScore;

    // -------- HIGH SCORE SYSTEM --------

if (lastScore > highScore) {
  highScore = lastScore;
  localStorage.setItem("shadowHighScore", highScore);
}

if (lastScore > highScore) {
  document.getElementById("highScoreDisplay").innerText =
    "🔥 NEW HIGH SCORE: " + highScore;
}

document.getElementById("highScoreDisplay").innerText =
  "Highest Score: " + highScore;

// -----------------------------------

  shakeIntensity = 50;
  createDeathFragments();
}



/* ---------------- GAME LOOP ---------------- */

function gameLoop() {

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawStageEnvironment();
  drawBackgroundDecor();
  applyCameraShake();

  /* ---------------- FREEZE STATES ---------------- */

  if (gameState === "difficulty") {
    drawDeathFragments();
    ctx.restore();
    requestAnimationFrame(gameLoop);
    return;
  }

  if (gameState === "tutorial") {

    // Tutorial progression logic
    if (tutorialStep === 2 && Date.now() - tutorialTimer > 5000) {
      nextRound();
      tutorialStep = 3;
      tutorialTimer = Date.now();
      updateTutorial();
    }

    if (tutorialStep === 3 && Date.now() - tutorialTimer > 2000) {
      tutorialStep = 4;
      updateTutorial();
    }

    runTutorial();

    drawDeathFragments();
    ctx.restore();
    requestAnimationFrame(gameLoop);
    return;
  }

  /* ---------------- PLAYING STATE ---------------- */

  if (gameState === "playing" && !hasDied) {

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

    /* --------- ADD BOUNDARY HERE --------- */
    player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
    /* -------------------------------------- */


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

    const progress = Math.min(elapsed / roundDuration, 1);
    roundScore = progress * roundScoreCap;
    score = totalScoreFromCompletedRounds + roundScore;
    document.getElementById("score").innerText = Math.floor(score);

    if (elapsed >= roundDuration) nextRound();
  }

  drawDeathFragments();
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
totalScoreFromCompletedRounds = 0;

  document.getElementById("gameOver").classList.add("hidden");
  document.getElementById("round").innerText = 1;
  document.getElementById("multiplier").innerText = 1;
roundScore = 0;
if (difficulty) {
  roundScoreCap = difficultySettings[difficulty].baseScoreCap;
}


  createObstacles();
  createBackground(); 
  updateRoundTheme();
}

/* ---------------- TOUCH ---------------- */

canvas.addEventListener("touchstart", e => {

  if (gameState === "tutorial") {

    if (tutorialStep === 0) {
      tutorialStep = 1;
      updateTutorial();
      return;
    }

    if (tutorialStep === 1) {
      tutorialStep = 2;
      tutorialTimer = Date.now();
      roundStartTime = Date.now();
      updateTutorial();
      return;
    }

  }

  if (gameState !== "playing") return;

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

  createBackground();
  updateRoundTheme();

  // Always show difficulty first
  gameState = "difficulty";
  showDifficultySelector();

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
  }, 260);
}

runLoading();
function runTutorial() {

  if (!tutorialTextVisible) return;

  ctx.save();

  ctx.fillStyle = `rgba(0,0,0,${tutorialOverlayAlpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = "28px Segoe UI";

  ctx.fillText(
    tutorialMessage,
    canvas.width / 2,
    canvas.height / 2
  );

  ctx.restore();
}


function updateTutorial() {

  switch (tutorialStep) {

    case 0:
      tutorialMessage = "Touch anywhere to move";
      break;

    case 1:
      tutorialMessage = "Hold to activate slow motion";
      break;

    case 2:
      tutorialMessage = "Survive until timer ends";
      break;

    case 3:
      tutorialMessage = "Your past self hunts you!";
      break;

   case 4:

  tutorialTextVisible = false;

  setTimeout(() => {

    tutorialCompleted = true;
    localStorage.setItem("shadowTutorialDone", "true");

    tutorialStep = 0;
    gameState = "playing";
    roundStartTime = Date.now();

  }, 800);

  break;


  }
}


function applyDifficultySettings() {

  const settings = difficultySettings[difficulty];

  roundDuration = settings.roundDuration;
  roundScoreCap = settings.baseScoreCap;

}


/* ---------------- DIFFICULTY WHEEL LOGIC ---------------- */

function showDifficultySelector() {
  const overlay = document.getElementById("difficultyOverlay");
  overlay.classList.remove("difficulty-hidden");
  overlay.style.display = "flex";   // Force show
}

function hideDifficultySelector() {
  const overlay = document.getElementById("difficultyOverlay");
  overlay.classList.add("difficulty-hidden");
  overlay.style.display = "none";   // Force hide
}


document.querySelectorAll(".difficulty-btn").forEach(btn => {
  btn.addEventListener("click", () => {

    if (gameState !== "difficulty") return;

    difficulty = btn.dataset.level;

    applyDifficultySettings();

    // HIDE IMMEDIATELY
    hideDifficultySelector();

    round = 1;
    roundScore = 0;
    totalScoreFromCompletedRounds = 0;
    roundStartTime = Date.now();

    createObstacles();

    canvas.style.pointerEvents = "auto";

    if (!tutorialCompleted) {
      gameState = "tutorial";
      tutorialStep = 0;
      tutorialTextVisible = true;
      updateTutorial();
    } else {
      gameState = "playing";
    }

  });
});



