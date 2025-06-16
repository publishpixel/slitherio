const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let gameRunning = false;
let paused = false;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const world = { width: 5000, height: 5000 };
let camera = { x: 0, y: 0 };
let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
document.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

let isBoosting = false;
document.addEventListener("mousedown", () => isBoosting = true);
document.addEventListener("mouseup", () => isBoosting = false);

let player, aiSnakes, foods, coins;
let foodCount = 300;

function createSnake(isAI = false) {
  const snake = {
    id: Math.random().toString(36).substring(2),
    x: Math.random() * world.width,
    y: Math.random() * world.height,
    angle: 0,
    speed: 2,
    boostSpeed: 4,
    segments: [],
    segmentLength: 10,
    maxSegments: 100,
    dead: false,
    score: 0,
    color: `hsl(${Math.random() * 360}, 100%, 50%)`,
    isAI: isAI,
    targetFood: null
  };
  for (let i = 0; i < snake.maxSegments; i++) {
    snake.segments.push({ x: snake.x, y: snake.y });
  }
  return snake;
}

function resetGame() {
  player = createSnake();
  aiSnakes = Array.from({ length: 5 }, () => createSnake(true));
  spawnFood();
  coins = 0;
}

function spawnFood() {
  foods = [];
  for (let i = 0; i < foodCount; i++) {
    foods.push({
      x: Math.random() * world.width,
      y: Math.random() * world.height,
      radius: 6 + Math.random() * 4,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`
    });
  }
}

function updateSnake(snake) {
  if (snake.isAI) {
    if (!snake.targetFood || Math.random() < 0.01) {
      snake.targetFood = foods[Math.floor(Math.random() * foods.length)];
    }
    if (snake.targetFood) {
      const dx = snake.targetFood.x - snake.x;
      const dy = snake.targetFood.y - snake.y;
      snake.angle = Math.atan2(dy, dx);
    }
  } else {
    let dx = mouse.x - canvas.width / 2;
    let dy = mouse.y - canvas.height / 2;
    snake.angle = Math.atan2(dy, dx);
  }

  let speed = (!snake.dead && !snake.isAI && isBoosting) ? snake.boostSpeed : snake.speed;
  snake.x += Math.cos(snake.angle) * speed;
  snake.y += Math.sin(snake.angle) * speed;
  snake.x = Math.max(0, Math.min(world.width, snake.x));
  snake.y = Math.max(0, Math.min(world.height, snake.y));
  snake.segments.unshift({ x: snake.x, y: snake.y });
  if (snake.segments.length > snake.maxSegments) snake.segments.pop();

  foods = foods.filter(food => {
    const dist = Math.hypot(snake.x - food.x, snake.y - food.y);
    if (dist < food.radius + 10) {
      snake.maxSegments += 5;
      snake.score += 10;
      if (!snake.isAI) coins += 1;
      return false;
    }
    return true;
  });

  while (foods.length < foodCount) {
    foods.push({
      x: Math.random() * world.width,
      y: Math.random() * world.height,
      radius: 6 + Math.random() * 4,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`
    });
  }
}

function checkCollisions() {
  for (let ai of aiSnakes) {
    if (!ai.dead && Math.hypot(player.x - ai.x, player.y - ai.y) < 10) {
      player.dead = true;
      showGameOver();
    }
  }
}

function drawSnake(snake) {
  for (let i = snake.segments.length - 1; i >= 0; i--) {
    const seg = snake.segments[i];
    const alpha = i / snake.segments.length;
    const screenX = seg.x - camera.x;
    const screenY = seg.y - camera.y;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  const head = snake.segments[0];
  const screenHeadX = head.x - camera.x;
  const screenHeadY = head.y - camera.y;

  ctx.fillStyle = "white";
  const eyeOffsetX = Math.cos(snake.angle + Math.PI / 4) * 6;
  const eyeOffsetY = Math.sin(snake.angle + Math.PI / 4) * 6;
  ctx.beginPath();
  ctx.arc(screenHeadX + eyeOffsetX, screenHeadY + eyeOffsetY, 3, 0, Math.PI * 2);
  ctx.arc(screenHeadX - eyeOffsetX, screenHeadY - eyeOffsetY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(screenHeadX + eyeOffsetX, screenHeadY + eyeOffsetY, 1.5, 0, Math.PI * 2);
  ctx.arc(screenHeadX - eyeOffsetX, screenHeadY - eyeOffsetY, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawFood() {
  for (const food of foods) {
    const screenX = food.x - camera.x;
    const screenY = food.y - camera.y;
    const gradient = ctx.createRadialGradient(screenX, screenY, 1, screenX, screenY, food.radius);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(1, food.color);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, food.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMinimap() {
  const size = 150;
  const margin = 20;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(canvas.width - size - margin, margin, size, size);
  ctx.strokeStyle = "white";
  ctx.strokeRect(canvas.width - size - margin, margin, size, size);
  ctx.fillStyle = "red";
  const scaleX = size / world.width;
  const scaleY = size / world.height;
  ctx.beginPath();
  ctx.arc(canvas.width - size - margin + player.x * scaleX, margin + player.y * scaleY, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText(`Score: ${player.score}`, 20, 30);
  ctx.fillText(`Coins: ${coins}`, 20, 55);
  if (isBoosting) ctx.fillText("BOOSTING!", 20, 80);
}

function gameLoop() {
  if (!gameRunning || paused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;

  updateSnake(player);
  for (let ai of aiSnakes) updateSnake(ai);
  checkCollisions();

  drawFood();
  for (let ai of aiSnakes) drawSnake(ai);
  if (!player.dead) drawSnake(player);
  drawMinimap();
  drawHUD();
  requestAnimationFrame(gameLoop);
}

// === MENU LOGIC ===

function startGame() {
  document.getElementById("mainMenu").classList.remove("active");
  resetGame();
  gameRunning = true;
  paused = false;
  requestAnimationFrame(gameLoop);
}

function pauseGame() {
  paused = true;
  document.getElementById("pauseMenu").classList.add("active");
}
function resumeGame() {
  paused = false;
  document.getElementById("pauseMenu").classList.remove("active");
  requestAnimationFrame(gameLoop);
}
function showGameOver() {
  document.getElementById("finalScore").innerText = `Your Score: ${player.score}`;
  document.getElementById("gameOverMenu").classList.add("active");
  gameRunning = false;
}
function restartGame() {
  document.getElementById("gameOverMenu").classList.remove("active");
  startGame();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!paused) pauseGame();
    else resumeGame();
  }
});
