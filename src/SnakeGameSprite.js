import {
  Application,
  Container,
  Assets,
  Sprite,
  Graphics,
  Text,
} from "pixi.js";

const GRID_SIZE = 20;
const GAME_SPEED = 120;
const COLUMNS = 36;
const ROWS = 22;
const screenOffset = 60;

const snakeXcenter = Math.floor(COLUMNS / 2);
const snakeYcenter = Math.floor(ROWS / 2);

const app = new Application();
globalThis.__PIXI_APP__ = app;

let snake, direction, nextDirection, food;
let score, isPaused, isGameOver, isWrapMode;
let accumulator = 0;

const gameContainer = new Container();
const bodyContainer = new Container();
let bodySprites = [];
let headTexture, bodyTexture, foodTexture, foodSprite;
let resetButton, pauseButton, wrapButton;
let scoreText, uiGraphics;

async function setup() {
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#111111",
    antialias: true,
  });

  document.body.appendChild(app.canvas);

  // Load assets
  headTexture = await Assets.load("https://pixijs.com/assets/bunny.png");
  bodyTexture = await Assets.load("https://pixijs.com/assets/flowerTop.png");
  foodTexture = await Assets.load("https://pixijs.com/assets/eggHead.png");

  foodSprite = new Sprite(foodTexture);
  foodSprite.anchor.set(0.5);
  foodSprite.width = GRID_SIZE;
  foodSprite.height = GRID_SIZE;

  uiGraphics = new Graphics();
  app.stage.addChild(uiGraphics);

  gameContainer.addChild(bodyContainer);
  gameContainer.addChild(foodSprite);
  app.stage.addChild(gameContainer);

  createUI();
  resetGame();
  handleResize();

  window.addEventListener("keydown", (e) => {
    if (e.key === " ") togglePause();
    if (isPaused || isGameOver) return;

    switch (e.key) {
      case "ArrowUp":
        if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
        break;
      case "ArrowDown":
        if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
        break;
      case "ArrowLeft":
        if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
        break;
      case "ArrowRight":
        if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
        break;
    }
  });

  window.addEventListener("resize", () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    handleResize();
  });

  app.ticker.add((ticker) => {
    if (isPaused) return;
    accumulator += ticker.deltaMS;
    if (!isGameOver && accumulator >= GAME_SPEED) {
      updateSnake();
      accumulator = 0;
    }
    draw();
  });
}

function createUI() {
  scoreText = new Text({
    text: "SCORE: 0",
    style: { fill: "#ffffff", fontSize: 20, fontWeight: "bold" },
  });
  app.stage.addChild(scoreText);

  pauseButton = createButton("PAUSE", 80, () => {
    if (isGameOver) resetGame();
    else togglePause();
  });

  wrapButton = createButton("WRAP: OFF", 130, () => {
    isWrapMode = !isWrapMode;
    wrapButton.children[1].text = isWrapMode ? "WRAP: ON" : "WRAP: OFF";
  });

  resetButton = createButton("RESET GAME", 160, resetGame);
}

function createButton(label, width, onClick) {
  const btn = new Container();
  const bg = new Graphics()
    .fill("#555555")
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

function handleResize() {
  const gameW = COLUMNS * GRID_SIZE;
  const gameH = ROWS * GRID_SIZE;
  gameContainer.x = (app.screen.width - gameW) / 2;
  gameContainer.y = screenOffset;
  uiGraphics.clear();
  uiGraphics
    .fill("#181818")
    .rect(gameContainer.x, gameContainer.y, gameW, gameH)
    .fill();
  uiGraphics
    .setStrokeStyle({ width: 3, color: 0xffffff })
    .rect(gameContainer.x, gameContainer.y, gameW, gameH)
    .stroke();
  uiGraphics
    .fill("#222")
    .rect(0, app.screen.height - 80, app.screen.width, 80)
    .fill();
  scoreText.position.set(gameContainer.x, 20);
  pauseButton.position.set(gameContainer.x + gameW - 90, 20);
  wrapButton.position.set(gameContainer.x + gameW - 240, 20);
  resetButton.position.set(app.screen.width / 2 - 80, app.screen.height - 50);
}

function spawnFood() {
  const empty = [];
  for (let x = 0; x < COLUMNS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (!snake.some((s) => s.x === x && s.y === y)) empty.push({ x, y });
    }
  }
  if (empty.length > 0) food = empty[Math.floor(Math.random() * empty.length)];
}

function updateSnake() {
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  if (isWrapMode) {
    if (head.x < 0) head.x = COLUMNS - 1;
    else if (head.x >= COLUMNS) head.x = 0;
    if (head.y < 0) head.y = ROWS - 1;
    else if (head.y >= ROWS) head.y = 0;
  } else if (head.x < 0 || head.x >= COLUMNS || head.y < 0 || head.y >= ROWS) {
    return gameOver();
  }

  if (snake.some((s) => s.x === head.x && s.y === head.y)) return gameOver();

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreText.text = `SCORE: ${score}`;
    spawnFood();
  } else {
    snake.pop();
  }
}

function getSpriteOrientation(dir) {
  if (dir.x === 0 && dir.y === -1) return { rotation: 0, scaleX: 1, scaleY: 1 };
  if (dir.x === 0 && dir.y === 1) return { rotation: 0, scaleX: 1, scaleY: -1 };
  if (dir.x === -1 && dir.y === 0)
    return { rotation: -Math.PI / 2, scaleX: 1, scaleY: 1 };
  if (dir.x === 1 && dir.y === 0)
    return { rotation: Math.PI / 2, scaleX: 1, scaleY: 1 };
  return { rotation: 0, scaleX: 1, scaleY: 1 };
}

function draw() {
  // Update food with pulse while maintaining grid scale
  const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
  foodSprite.x = food.x * GRID_SIZE + GRID_SIZE / 2;
  foodSprite.y = food.y * GRID_SIZE + GRID_SIZE / 2;
  foodSprite.width = GRID_SIZE * pulse;
  foodSprite.height = GRID_SIZE * pulse;

  // Manage Sprite pool
  while (bodySprites.length < snake.length) {
    const isHead = bodySprites.length === 0;
    const s = new Sprite(isHead ? headTexture : bodyTexture);
    s.anchor.set(0.5);
    s.width = GRID_SIZE;
    s.height = GRID_SIZE;
    bodyContainer.addChild(s);
    bodySprites.push(s);
  }
  while (bodySprites.length > snake.length) {
    const s = bodySprites.pop();
    bodyContainer.removeChild(s);
    s.destroy();
  }

  // Update segments
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    const spr = bodySprites[i];
    spr.x = seg.x * GRID_SIZE + GRID_SIZE / 2;
    spr.y = seg.y * GRID_SIZE + GRID_SIZE / 2;
    spr.width = GRID_SIZE; // Ensure size consistency
    spr.height = GRID_SIZE;

    if (i === 0) {
      const { rotation, scaleX, scaleY } = getSpriteOrientation(direction);
      spr.rotation = rotation;
      spr.scale.set(
        scaleX * (GRID_SIZE / spr.texture.width),
        scaleY * (GRID_SIZE / spr.texture.height),
      );
      spr.alpha = 1;
    } else {
      const prev = snake[i - 1];
      const segDir = {
        x: Math.sign(prev.x - seg.x),
        y: Math.sign(prev.y - seg.y),
      };
      const { rotation, scaleX, scaleY } = getSpriteOrientation(segDir);
      spr.rotation = rotation;
      spr.scale.set(
        scaleX * (GRID_SIZE / spr.texture.width),
        scaleY * (GRID_SIZE / spr.texture.height),
      );
      spr.alpha = 0.8;
    }
  }
}

function togglePause() {
  if (isGameOver) return;
  isPaused = !isPaused;
  pauseButton.children[1].text = isPaused ? "RESUME" : "PAUSE";
}

function gameOver() {
  isGameOver = true;
  isPaused = true;
  pauseButton.children[1].text = "RESTART";
}

function resetGame() {
  snake = [
    { x: snakeXcenter, y: snakeYcenter },
    { x: snakeXcenter, y: snakeYcenter + 1 },
    { x: snakeXcenter, y: snakeYcenter + 2 },
  ];
  direction = { x: 0, y: -1 };
  nextDirection = { x: 0, y: -1 };
  score = 0;
  isPaused = false;
  isGameOver = false;
  scoreText.text = "SCORE: 0";
  pauseButton.children[1].text = "PAUSE";
  spawnFood();
}

setup();
