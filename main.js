import {
  Application,
  Assets,
  Sprite,
  Container,
  Graphics,
  Text,
} from "pixi.js";

// --- CONFIGURATION ---
const GRID_SIZE = 20;
const GAME_SPEED = 100;
const COLUMNS = 20;
const ROWS = 20;

const app = new Application();

// Game State
let snake = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
let direction = { x: 0, y: -1 };
let nextDirection = { x: 0, y: -1 };
let food = { x: 5, y: 5 };
let lastMoveTime = 0;

// Graphics objects (v8 style)
const snakeGraphics = new Graphics();
const foodGraphics = new Graphics();

async function setup() {
  // 1. Initialize Application
  await app.init({
    width: COLUMNS * GRID_SIZE,
    height: ROWS * GRID_SIZE,
    backgroundColor: 0x1a1a1a,
  });
  document.body.appendChild(app.canvas);

  // 2. Load Bunny Asset
  const texture = await Assets.load("https://pixijs.com/assets/bunny.png");
  const bunny = new Sprite(texture);
  bunny.anchor.set(0.5);
  bunny.x = app.screen.width / 2;
  bunny.y = app.screen.height / 2;
  bunny.alpha = 0.5; // Make it a ghost bunny so we can see the snake
  app.stage.addChild(bunny);

  // 3. Setup Snake Layers
  app.stage.addChild(foodGraphics);
  app.stage.addChild(snakeGraphics);

  // 4. Reset Button (v8 Graphics API)
  const button = new Container();
  const btnBg = new Graphics()
    .fill(0x333333)
    .roundRect(-75, -25, 150, 50, 10)
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

  // 5. Input Handling
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

  // 6. The Game Loop
  app.ticker.add((ticker) => {
    // Spin the bunny
    bunny.rotation += 0.05 * ticker.deltaTime;

    const now = Date.now();
    if (now - lastMoveTime > GAME_SPEED) {
      updateSnake();
      draw();
      lastMoveTime = now;
    }
  });

  spawnFood();
}

function spawnFood() {
  food = {
    x: Math.floor(Math.random() * COLUMNS),
    y: Math.floor(Math.random() * ROWS),
  };
  if (snake.some((s) => s.x === food.x && s.y === food.y)) spawnFood();
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

  // Draw Food (v8 uses fill() before/after the shape)
  foodGraphics
    .fill(0xff4757)
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
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ];
  direction = { x: 0, y: -1 };
  nextDirection = { x: 0, y: -1 };
  spawnFood();
}

// Start the app
setup();
