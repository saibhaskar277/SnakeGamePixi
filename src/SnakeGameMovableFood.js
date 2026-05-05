import {
  Application,
  Container,
  Assets,
  Sprite,
  Graphics,
  Text,
} from "pixi.js";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const GRID_SIZE = 20;
const GAME_SPEED = 120; // Snake moves every 120ms
const COLUMNS = 36;
const ROWS = 22;
const SCREEN_OFFSET = 60; // Gap at the top for Score/Lives
const FOOD_COUNT = 3; // Number of regular eggs
const FOOD_MOVE_EVERY = 4; // Eggs move every 4 snake steps
const INITIAL_LIVES = 3;
const MAX_LIVES = 6;
const BLINK_DURATION = 1500; // Snake invulnerability time after hit

// LIFE PICKUP CONSTANTS
const LIFE_FOOD_DURATION = 5000; // Heart stays for 5 seconds (5000ms)

const CENTER_X = Math.floor(COLUMNS / 2);
const CENTER_Y = Math.floor(ROWS / 2);

// ─── APP SETUP ───────────────────────────────────────────────────────────────
const app = new Application();
globalThis.__PIXI_APP__ = app;

// ─── GAME STATE ──────────────────────────────────────────────────────────────
let snake, direction, nextDirection;
let foods; // Array: { x, y }
let lifeFood = null; // Position: { x, y } or null
let lifeFoodTimer = 0; // Remaining time for the heart
let lifeFoodPhase = 0; // Tracks the smooth scaling animation phase
let score, lives;
let isPaused,
  isGameOver,
  isWrapMode = false;
let foodCollected, foodForNextLife, tickCounter;
let accumulator = 0; // Tracks time for snake movement
let isBlinking = false; // Is the snake currently flashing?
let blinkTimer = 0; // How long the snake has flashed

// ─── SCENE GRAPH ─────────────────────────────────────────────────────────────
const gameContainer = new Container();
const bodyContainer = new Container();
const foodContainer = new Container();

let bodySprites = []; // Pool for snake parts
let foodSprites = []; // Pool for eggs
let lifeFoodSprite; // The heart sprite

let headTexture, bodyTexture, foodTexture, lifeFoodTexture;
let resetButton, pauseButton, wrapButton;
let scoreText, livesText, uiGraphics;

// ─── MAIN INITIALIZATION ─────────────────────────────────────────────────────
/** Initializes Pixi, loads assets, and starts the game loop */
async function setup() {
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#111111",
    antialias: true,
  });
  document.body.appendChild(app.canvas);

  // Load Textures. Bunnies and Flowers in Pixi assets face UP by default.
  headTexture = await Assets.load("https://pixijs.com/assets/bunny.png");
  bodyTexture = await Assets.load("https://pixijs.com/assets/flowerTop.png");
  foodTexture = await Assets.load("https://pixijs.com/assets/eggHead.png");
  lifeFoodTexture = await Assets.load(
    "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/2764.png",
  );

  // Create Food Pool
  for (let i = 0; i < FOOD_COUNT; i++) {
    const s = new Sprite(foodTexture);
    s.anchor.set(0.5);
    foodContainer.addChild(s);
    foodSprites.push(s);
  }

  // Create Life Food Sprite
  lifeFoodSprite = new Sprite(lifeFoodTexture);
  lifeFoodSprite.anchor.set(0.5);
  lifeFoodSprite.visible = false;
  foodContainer.addChild(lifeFoodSprite);

  // Setup UI Layer
  uiGraphics = new Graphics();
  app.stage.addChild(uiGraphics);
  gameContainer.addChild(bodyContainer);
  gameContainer.addChild(foodContainer);
  app.stage.addChild(gameContainer);

  createUI();
  resetGame();
  handleResize();

  // Listeners
  window.addEventListener("keydown", handleKey);
  window.addEventListener("resize", () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    handleResize();
  });

  app.ticker.add(gameLoop);
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────
/** Linear Interpolation: Returns a value between 'start' and 'end' based on 't' (0 to 1) */
function lerp(start, end, t) {
  return start + (end - start) * t;
}

/** Generates a grid key string for easy comparison */
function cellKey(x, y) {
  return `${x},${y}`;
}

/** Builds a Set of all currently blocked grid cells */
function buildOccupied(excludeFood = null) {
  const s = new Set();
  for (const seg of snake) s.add(cellKey(seg.x, seg.y));
  for (const f of foods) if (f !== excludeFood) s.add(cellKey(f.x, f.y));
  if (lifeFood) s.add(cellKey(lifeFood.x, lifeFood.y));
  return s;
}

/** Finds a coordinate not currently occupied */
function randomEmpty(occupied) {
  const pool = [];
  for (let x = 0; x < COLUMNS; x++)
    for (let y = 0; y < ROWS; y++)
      if (!occupied.has(cellKey(x, y))) pool.push({ x, y });
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

/** Determines rotation angle based on direction vector {x, y} */
function getOrientation(dir) {
  // If texture faces UP by default (0 radians)
  if (dir.x === 0 && dir.y === -1) return 0; // Up
  if (dir.x === 0 && dir.y === 1) return Math.PI; // Down
  if (dir.x === -1 && dir.y === 0) return -Math.PI / 2; // Left
  if (dir.x === 1 && dir.y === 0) return Math.PI / 2; // Right
  return 0;
}

// ─── GAME LOGIC ──────────────────────────────────────────────────────────────

/** The heartbeat of the game; updates logic and visual effects */
function gameLoop(ticker) {
  if (isPaused && !isBlinking) return;

  const dt = ticker.deltaMS;

  // 1. Update the Heart Timer and Animation Phase
  if (lifeFood) {
    lifeFoodTimer -= dt;

    // Calculate progress: 0.0 (just spawned) to 1.0 (about to expire)
    const progress = 1 - lifeFoodTimer / LIFE_FOOD_DURATION;

    // Speed goes from 0.005 (slower than regular food) to 0.04 (very fast)
    const currentSpeed = lerp(0.005, 0.04, progress);

    // Smoothly accumulate the animation phase
    lifeFoodPhase += dt * currentSpeed;

    if (lifeFoodTimer <= 0) {
      lifeFood = null; // Heart disappears after 5 seconds
    }
  }

  // 2. Handle Snake Damage Blinking (Post-hit invulnerability)
  if (isBlinking) {
    blinkTimer += dt;
    // Hard switching alpha is appropriate here to simulate "damage flicker"
    const show = Math.floor(blinkTimer / 150) % 2 === 0;
    for (const s of bodySprites) s.alpha = show ? 1 : 0.1;

    if (blinkTimer >= BLINK_DURATION) {
      isBlinking = false;
      blinkTimer = 0;
      for (const s of bodySprites) s.alpha = 1;
      if (lives <= 0) {
        triggerGameOver();
        return;
      }
      accumulator = 0;
    }
    draw();
    return;
  }

  // 3. Update Snake Physics based on ticks
  accumulator += dt;
  if (!isGameOver && accumulator >= GAME_SPEED) {
    accumulator -= GAME_SPEED;
    updateSnake();
  }
  draw();
}

/** Moves the snake and checks for eating or dying */
function updateSnake() {
  direction = nextDirection;
  tickCounter++;

  // Move eggs every few steps
  if (tickCounter % FOOD_MOVE_EVERY === 0) moveFoods();

  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // Boundary Handling
  if (isWrapMode) {
    if (head.x < 0) head.x = COLUMNS - 1;
    else if (head.x >= COLUMNS) head.x = 0;
    if (head.y < 0) head.y = ROWS - 1;
    else if (head.y >= ROWS) head.y = 0;
  } else if (head.x < 0 || head.x >= COLUMNS || head.y < 0 || head.y >= ROWS) {
    loseLife();
    return;
  }

  // Self Collision
  if (snake.some((s) => s.x === head.x && s.y === head.y)) {
    loseLife();
    return;
  }

  snake.unshift(head);
  let grow = false;

  // Eating Regular Food
  for (let i = 0; i < foods.length; i++) {
    if (foods[i].x === head.x && foods[i].y === head.y) {
      score += 10;
      scoreText.text = `SCORE: ${score}`;
      foodCollected++;
      grow = true;

      // Check if we should spawn a heart pickup
      if (!lifeFood && foodCollected >= foodForNextLife) {
        spawnLifeFood();
      }
      respawnFood(i);
      break;
    }
  }

  // Eating Life Food
  if (lifeFood && head.x === lifeFood.x && head.y === lifeFood.y) {
    lives = Math.min(lives + 1, MAX_LIVES);
    updateLivesText();
    lifeFood = null; // Remove heart immediately
  }

  if (!grow) snake.pop();
}

/** Spawns the heart and sets its 5-second lifetime */
function spawnLifeFood() {
  const pos = randomEmpty(buildOccupied());
  if (pos) {
    lifeFood = { x: pos.x, y: pos.y };
    lifeFoodTimer = LIFE_FOOD_DURATION; // Reset the 5s timer
    lifeFoodPhase = 0; // Reset animation phase
    // Set next spawn goal (collect 5-10 more eggs)
    foodForNextLife = foodCollected + 5 + Math.floor(Math.random() * 6);
  }
}

/** Moves all eggs to an adjacent empty cell */
function moveFoods() {
  const DIRS = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];
  for (const f of foods) {
    const occ = buildOccupied(f);
    const shuffled = DIRS.slice().sort(() => Math.random() - 0.5);
    for (const d of shuffled) {
      const nx = f.x + d.x,
        ny = f.y + d.y;
      if (
        nx >= 0 &&
        nx < COLUMNS &&
        ny >= 0 &&
        ny < ROWS &&
        !occ.has(cellKey(nx, ny))
      ) {
        f.x = nx;
        f.y = ny;
        break;
      }
    }
  }
}

// ─── RENDERING ───────────────────────────────────────────────────────────────

/** Handles all visual updates per frame */
function draw() {
  const now = Date.now();

  // Update Egg Visuals
  const pulse = 1 + Math.sin(now * 0.01) * 0.1;
  foodSprites.forEach((spr, i) => {
    if (i < foods.length) {
      spr.visible = true;
      spr.position.set(
        foods[i].x * GRID_SIZE + GRID_SIZE / 2,
        foods[i].y * GRID_SIZE + GRID_SIZE / 2,
      );
      spr.width = spr.height = GRID_SIZE * pulse;
    } else {
      spr.visible = false;
    }
  });

  // Smooth Life Food Blinking
  if (lifeFood) {
    lifeFoodSprite.visible = true;

    // Create a pulsing scale multiplier similar to regular food
    // Base size is 1, oscillating between 0.85 and 1.15
    const lifePulse = 1 + Math.sin(lifeFoodPhase) * 0.15;

    lifeFoodSprite.position.set(
      lifeFood.x * GRID_SIZE + GRID_SIZE / 2,
      lifeFood.y * GRID_SIZE + GRID_SIZE / 2,
    );

    // Apply the pulse scale directly to the width/height
    // We multiply by 1.2 to keep the heart slightly larger than normal eggs
    lifeFoodSprite.width = lifeFoodSprite.height = GRID_SIZE * 1.2 * lifePulse;
  } else {
    lifeFoodSprite.visible = false;
  }

  // Update Snake Body Pool
  while (bodySprites.length < snake.length) {
    const isHead = bodySprites.length === 0;
    const s = new Sprite(isHead ? headTexture : bodyTexture);
    s.anchor.set(0.5); // Required for correct rotation around center
    bodyContainer.addChild(s);
    bodySprites.push(s);
  }
  while (bodySprites.length > snake.length) {
    bodyContainer.removeChild(bodySprites.pop()).destroy();
  }

  // Snake Sprite Rotation
  snake.forEach((seg, i) => {
    const spr = bodySprites[i];
    spr.position.set(
      seg.x * GRID_SIZE + GRID_SIZE / 2,
      seg.y * GRID_SIZE + GRID_SIZE / 2,
    );

    // Determine the vector this specific segment is moving
    let segDir;
    if (i === 0) {
      segDir = direction; // Head uses global next direction
    } else {
      // Body parts use the vector pointing to the segment ahead of them
      const prev = snake[i - 1];
      segDir = {
        x: Math.sign(prev.x - seg.x),
        y: Math.sign(prev.y - seg.y),
      };

      // Handle Wrap Mode logic for body rotation:
      // If distance > 1, it implies movement wrapped around the screen.
      // We must invert direction calculation so rotation doesn't flip 180° wrongly.
      if (Math.abs(prev.x - seg.x) > 1) segDir.x = -segDir.x;
      if (Math.abs(prev.y - seg.y) > 1) segDir.y = -segDir.y;
    }

    // Apply calculated rotation
    spr.rotation = getOrientation(segDir);

    // Apply scale (ensure anchor 0.5 was set in pool creation above)
    spr.scale.set(GRID_SIZE / spr.texture.width);

    if (!isBlinking) spr.alpha = i === 0 ? 1 : 0.8;
  });
}

// ─── UI & CONTROLS ───────────────────────────────────────────────────────────

function handleKey(e) {
  if (e.key === " ") togglePause();
  if (isPaused || isGameOver) return;
  const keys = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };
  if (keys[e.key]) {
    const move = keys[e.key];
    // Prevent 180 degree instant turns
    if (move.x !== -direction.x && move.y !== -direction.y)
      nextDirection = move;
  }
}

function createUI() {
  scoreText = new Text({
    text: "SCORE: 0",
    style: { fill: "#ffffff", fontSize: 20 },
  });
  livesText = new Text({ text: "", style: { fill: "#ff4444", fontSize: 20 } });
  app.stage.addChild(scoreText, livesText);

  pauseButton = createButton("PAUSE", 80, () =>
    isGameOver ? resetGame() : togglePause(),
  );
  wrapButton = createButton("WRAP: OFF", 130, toggleWrap);
  resetButton = createButton("RESET", 100, resetGame);
}

function toggleWrap() {
  isWrapMode = !isWrapMode;
  wrapButton.children[1].text = isWrapMode ? "WRAP: ON" : "WRAP: OFF";
}

function createButton(label, width, onClick) {
  const btn = new Container();
  const bg = new Graphics()
    .fill("#444444")
    .roundRect(0, 0, width, 30, 6)
    .fill();
  const txt = new Text({
    text: label,
    style: { fill: "#ffffff", fontSize: 14 },
  });
  txt.anchor.set(0.5);
  txt.position.set(width / 2, 15);
  btn.addChild(bg, txt);
  btn.eventMode = "static";
  btn.cursor = "pointer";
  btn.on("pointerdown", onClick);
  app.stage.addChild(btn);
  return btn;
}

function updateLivesText() {
  livesText.text = "LIVES: " + "♥".repeat(Math.max(0, lives));
}

function handleResize() {
  const gameW = COLUMNS * GRID_SIZE,
    gameH = ROWS * GRID_SIZE;
  gameContainer.x = (app.screen.width - gameW) / 2;
  gameContainer.y = SCREEN_OFFSET;

  uiGraphics
    .clear()
    .fill("#181818")
    .rect(gameContainer.x, gameContainer.y, gameW, gameH)
    .fill()
    .setStrokeStyle({ width: 3, color: 0xffffff })
    .rect(gameContainer.x, gameContainer.y, gameW, gameH)
    .stroke();

  scoreText.position.set(gameContainer.x, 20);
  livesText.position.set(gameContainer.x + 200, 20);
  pauseButton.position.set(gameContainer.x + gameW - 90, 20);
  wrapButton.position.set(gameContainer.x + gameW - 240, 20);
  resetButton.position.set(app.screen.width / 2 - 50, app.screen.height - 50);
}

function loseLife() {
  lives--;
  updateLivesText();
  isBlinking = true;
  blinkTimer = 0;
}

function triggerGameOver() {
  isGameOver = true;
  isPaused = true;
  pauseButton.children[1].text = "RESTART";
}

function togglePause() {
  if (isGameOver || isBlinking) return;
  isPaused = !isPaused;
  pauseButton.children[1].text = isPaused ? "RESUME" : "PAUSE";
}

function resetGame() {
  // Start with 2 segments to avoid instant self-collision on wrap modes
  snake = [
    { x: CENTER_X, y: CENTER_Y },
    { x: CENTER_X, y: CENTER_Y + 1 },
  ];
  direction = nextDirection = { x: 0, y: -1 };
  score = 0;
  lives = INITIAL_LIVES;
  isPaused = isGameOver = isBlinking = false;
  accumulator = tickCounter = foodCollected = 0;
  lifeFood = null;
  lifeFoodPhase = 0;
  foodForNextLife = 5 + Math.floor(Math.random() * 5);
  foods = [];
  for (let i = 0; i < FOOD_COUNT; i++) {
    const pos = randomEmpty(buildOccupied());
    if (pos) foods.push({ x: pos.x, y: pos.y });
  }
  updateLivesText();
  scoreText.text = "SCORE: 0";
  pauseButton.children[1].text = "PAUSE";
}

function respawnFood(index) {
  const pos = randomEmpty(buildOccupied());
  if (pos) {
    foods[index].x = pos.x;
    foods[index].y = pos.y;
  }
}

setup();
