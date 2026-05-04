import { Application, Container, Graphics, Text } from "pixi.js";

// --- CONFIGURATION ---
const GRID_SIZE = 20;
const GAME_SPEED = 100;
const COLUMNS = 60;
const ROWS = 30;
const snakeXcenter = Math.floor(COLUMNS / 2);
const snakeYcenter = Math.floor(ROWS / 2);

const app = new Application();
globalThis.__PIXI_APP__ = app;
// Game State
let snake = [
  { x: snakeXcenter, y: snakeYcenter },
  { x: snakeXcenter, y: snakeYcenter + 1 },
  { x: snakeXcenter, y: snakeYcenter + 2 },
];
let direction = { x: 0, y: -1 };
let nextDirection = { x: 0, y: -1 };
let food = { x: 5, y: 5 };
let lastMoveTime = 0;

// Graphics objects
const snakeGraphics = new Graphics();
const foodGraphics = new Graphics();

async function setup() {
  // 1. Initialize Application
  await app.init({
    width: COLUMNS * GRID_SIZE,
    height: ROWS * GRID_SIZE,
    backgroundColor: "#e00c0c",
  });
  document.body.appendChild(app.canvas);

  // 2. Setup Layers
  app.stage.addChild(foodGraphics);
  app.stage.addChild(snakeGraphics);

  // 3. Reset Button
  const button = new Container();
  const btnBg = new Graphics()
    .fill("#333333")
    .rect(-75, -25, 150, 50, 10)
    .fill();

  const btnText = new Text({
    text: "RESET SNAKE",
    style: { fill: "#ffffff", fontSize: 16, fontWeight: "bold" },
  });
  btnText.anchor.set(0.5);
  button.addChild(btnBg, btnText);
  button.x = app.screen.width / 2;
  button.y = app.screen.height - 40;
  button.eventMode = "static";
  button.cursor = "pointer";

  button.on("pointerdown", (e) => {
    e.stopPropagation();
    resetGame();
  });
  app.stage.addChild(button);

  // 4. Input Handling
  window.addEventListener("keydown", (e) => {
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

  // 5. The Game Loop
  app.ticker.add(() => {
    const now = Date.now();

    // Only update logic based on GAME_SPEED
    if (now - lastMoveTime > GAME_SPEED) {
      updateSnake();
      lastMoveTime = now;
    }

    // Always draw every frame to ensure visibility
    draw();
  });

  spawnFood();
  draw(); // Initial draw
}

function spawnFood() {
  food = {
    // Math.random() returns a float between 0 and 1
    x: Math.floor(Math.random() * COLUMNS),
    y: Math.floor(Math.random() * ROWS),
  };

  // Recursion check: if food lands on the snake, try again
  if (snake.some((s) => s.x === food.x && s.y === food.y)) {
    spawnFood();
  }
}

function updateSnake() {
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // Wall/Self Collision
  if (
    head.x < 0 ||
    head.x >= COLUMNS ||
    head.y < 0 ||
    head.y >= ROWS ||
    snake.some((s) => s.x === head.x && s.y === head.y)
  ) {
    return resetGame();
  }

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    spawnFood();
  } else {
    snake.pop();
  }
}

function draw() {
  snakeGraphics.clear();
  foodGraphics.clear();

  // Draw Food
  foodGraphics
    .fill("#ffffff")
    .rect(food.x * GRID_SIZE, food.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2)
    .fill();

  // Draw Snake
  snake.forEach((segment, i) => {
    snakeGraphics
      .fill(i === 0 ? 0x2ed573 : 0x7bed9f)
      .rect(
        segment.x * GRID_SIZE,
        segment.y * GRID_SIZE,
        GRID_SIZE - 2,
        GRID_SIZE - 2,
      )
      .fill();
  });
}

function resetGame() {
  snake = [
    { x: snakeXcenter, y: snakeYcenter },
    { x: snakeXcenter, y: snakeYcenter + 1 },
    { x: snakeXcenter, y: snakeYcenter + 2 },
  ];
  direction = { x: 0, y: -1 };
  nextDirection = { x: 0, y: -1 };
  spawnFood();
}

setup();
