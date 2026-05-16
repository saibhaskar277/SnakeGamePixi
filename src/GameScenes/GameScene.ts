import { Scene, SceneName } from "../SceneManager";
import {
  Container,
  Assets,
  Sprite,
  Graphics,
  Text,
  Application,
  Texture,
  Ticker,
} from "pixi.js";
import { GameConfig as Config, Point } from "../GameConfig";
import { InputManager } from "../InputManager";
import { UIFactory, CustomButton } from "../UIFactory";

// ─── Module-level constants ───────────────────────────────────────────────────

/** Cached grid dimensions to avoid property lookups during hot-path loops */
const COLS = Config.COLUMNS;
const ROWS = Config.ROWS;
const GRID = Config.GRID_SIZE;
const HALF = GRID / 2;

/**
 * Generates a unique integer key for a grid coordinate.
 * Used for O(1) Set lookups instead of expensive string concatenation.
 */
const key = (x: number, y: number): number => y * COLS + x;

/**
 * Performs an in-place shuffle of an array.
 * Used here to randomize food movement directions without allocating new memory.
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    // Bitwise OR (| 0) is a high-performance alternative to Math.floor()
    const j = (Math.random() * (i + 1)) | 0;
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/** Static movement vectors for Up, Down, Left, Right */
const DIRS: Readonly<Point[]> = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

/** Pre-allocated array reused for direction shuffling to prevent Garbage Collection (GC) pressure */
const SHUFFLED_DIRS: Point[] = [...DIRS];

/** Map to convert direction vectors directly into sprite rotation radians */
const ROTATION = new Map<number, number>([
  [key(0, -1), 0],
  [key(0, 1), Math.PI],
  [key(-1, 0), -Math.PI / 2],
  [key(1, 0), Math.PI / 2],
]);

// ─────────────────────────────────────────────────────────────────────────────

export class GameScene extends Scene {
  // --- Asset Textures ---
  private headTexture!: Texture;
  private bodyTexture!: Texture;
  private foodTexture!: Texture;
  private lifeFoodTexture!: Texture;

  // --- Display Objects ---
  private uiGraphics!: Graphics; // Background and borders
  private gameContainer!: Container; // Main gameplay wrapper
  private bodyContainer!: Container; // Layer for snake segments
  private foodContainer!: Container; // Layer for food items
  private scoreText!: Text;
  private livesText!: Text;
  private fpsText!: Text;

  // --- Sprites & Pooling ---
  private bodySprites: Sprite[] = []; // Pool of segment sprites
  private foodSprites: Sprite[] = []; // Pool of food sprites
  private lifeFoodSprite!: Sprite; // Special health item sprite

  /** Base scale to fit textures into the grid size, calculated once at init */
  private foodBaseScale: number = 1;
  private lifeFoodBaseScale: number = 1;

  // --- UI Elements ---
  private pauseButton!: CustomButton;
  private resetButton!: CustomButton;
  private wrapToggle!: Container;

  // --- Core Game State ---
  private inputManager!: InputManager;
  private snake: Point[] = []; // Logic coordinates for snake segments
  /** Fast lookup set containing keys of all cells occupied by the snake */
  private snakeSet = new Set<number>();
  private foods: Point[] = []; // Current food positions
  private direction: Point = { x: 0, y: -1 }; // Active move direction
  private nextDirection: Point = { x: 0, y: -1 }; // Buffering input for the next tick

  private score: number = 0;
  private lives: number = Config.INITIAL_LIVES;
  private isPaused: boolean = false;
  private isGameOver: boolean = false;
  private isWrapMode: boolean = false; // Whether snake wraps around screen borders
  private isBlinking: boolean = false; // State when snake takes damage

  // --- Timers & Accumulators ---
  private accumulator: number = 0; // Tracks time between logic ticks
  private tickCounter: number = 0; // Counts total game steps
  private blinkTimer: number = 0; // Duration of the damage blink effect
  private fpsTimer: number = 0; // Throttle for updating the FPS display text

  // --- Life Food Mechanics ---
  private foodCollected: number = 0; // Counter for spawning special food
  private lifeFood: Point | null = null; // Position of active health item
  private lifeFoodTimer: number = 0; // Remaining time for health item to exist
  private lifeFoodPhase: number = 0; // Animation phase for pulsing effect
  private foodForNextLife: number = 0; // Target score to spawn next health item

  constructor(app: Application) {
    super(SceneName.Game, app);
  }

  /**
   * Loads assets, initializes UI, and prepares sprite pools.
   */
  override async init(): Promise<void> {
    // Load image assets
    this.headTexture = await Assets.load(
      "assets/SnakeGameSprites/snakeHead.png",
    );
    this.bodyTexture = await Assets.load(
      "assets/SnakeGameSprites/snakeBody.png",
    );
    this.foodTexture = await Assets.load("assets/SnakeGameSprites/food.png");
    this.lifeFoodTexture = await Assets.load(
      "assets/SnakeGameSprites/health.png",
    );

    // Cache scales to avoid repeated divisions in the render loop
    this.foodBaseScale = GRID / this.foodTexture.width;
    this.lifeFoodBaseScale = (GRID * 1.2) / this.lifeFoodTexture.width;

    // Setup rendering hierarchy
    this.uiGraphics = new Graphics();
    this.gameContainer = new Container();
    this.bodyContainer = new Container();
    this.foodContainer = new Container();
    this.gameContainer.addChild(this.bodyContainer, this.foodContainer);
    this.addChild(this.uiGraphics, this.gameContainer);

    // Pre-create food sprites for the pool
    for (let i = 0; i < Config.FOOD_COUNT; i++) {
      const s = new Sprite(this.foodTexture);
      s.anchor.set(0.5);
      s.scale.set(this.foodBaseScale);
      this.foodContainer.addChild(s);
      this.foodSprites.push(s);
    }

    this.lifeFoodSprite = new Sprite(this.lifeFoodTexture);
    this.lifeFoodSprite.anchor.set(0.5);
    this.lifeFoodSprite.visible = false;
    this.foodContainer.addChild(this.lifeFoodSprite);

    // UI Text initialization
    this.scoreText = new Text({
      text: "SCORE: 0",
      style: { fill: "#ffffff", fontSize: 20 },
    });
    this.livesText = new Text({
      text: "",
      style: { fill: "#ff4444", fontSize: 20 },
    });
    this.fpsText = new Text({
      text: "FPS: 0",
      style: { fill: "#00ff00", fontSize: 16, fontWeight: "bold" },
    });
    this.fpsText.position.set(10, 10);
    this.addChild(this.scoreText, this.livesText, this.fpsText);

    // Button and Toggle creation via factory
    this.pauseButton = UIFactory.createButton("PAUSE", 80, 30, () =>
      this.isGameOver ? this.resetGame() : this.togglePause(),
    );
    this.resetButton = UIFactory.createButton("RESET", 100, 30, () =>
      this.resetGame(),
    );
    this.wrapToggle = UIFactory.createToggle(
      "WRAP",
      this.isWrapMode,
      (v: boolean) => {
        this.isWrapMode = v;
      },
    );
    this.addChild(this.pauseButton, this.resetButton, this.wrapToggle);

    // Input initialization
    this.inputManager = new InputManager({
      onPauseToggle: () => this.togglePause(),
      onDirectionChange: (move: Point) => this.handleDirectionInput(move),
    });
    this.inputManager.start();

    this.resetGame();
    this.handleResize();
  }

  /** Called when the scene is switched to */
  override onEnter() {
    this.handleResize();
  }
  /** Called when the window/renderer is resized */
  override onResize() {
    this.handleResize();
  }
  /** Called when leaving the scene to clean up listeners */
  override onExit() {
    this.inputManager.stop();
    this.clearLifeFood();
  }

  /** Validates and buffers movement input to prevent 180-degree self-collisions */
  handleDirectionInput(move: Point) {
    if (this.isPaused || this.isGameOver) return;
    // Ensure the new direction isn't exactly opposite to the current one
    if (move.x !== -this.direction.x || move.y !== -this.direction.y) {
      this.nextDirection = move;
    }
  }

  /** Ticker function specifically for animating and timing out the health food */
  private updateLifeFood = (ticker: Ticker) => {
    if (this.isPaused || !this.lifeFood) return;
    this.lifeFoodTimer -= ticker.deltaMS;
    const progress = 1 - this.lifeFoodTimer / Config.LIFE_FOOD_DURATION;
    // Speed up the pulse animation as the food gets closer to disappearing
    this.lifeFoodPhase += ticker.deltaMS * this._lerp(0.005, 0.04, progress);
    if (this.lifeFoodTimer <= 0) this.clearLifeFood();
  };

  /** Removes health food from the map and detaches its animation ticker */
  private clearLifeFood() {
    this.lifeFood = null;
    this.app.ticker.remove(this.updateLifeFood);
  }

  /** Main update loop called every frame */
  override update(ticker: Ticker) {
    // Throttled FPS text update
    this.fpsTimer += ticker.deltaMS;
    if (this.fpsTimer >= 500) {
      this.fpsText.text = `FPS: ${Math.round(ticker.FPS)}`;
      this.fpsTimer = 0;
    }

    if (this.isPaused && !this.isBlinking) return;

    const dt = ticker.deltaMS;

    // Handle damage-taking animation (blinking)
    if (this.isBlinking) {
      this.blinkTimer += dt;
      const show = ((this.blinkTimer / 150) | 0) % 2 === 0;
      for (let i = 0; i < this.snake.length; i++) {
        if (this.bodySprites[i]) this.bodySprites[i].alpha = show ? 1 : 0.1;
      }
      if (this.blinkTimer >= Config.BLINK_DURATION) {
        this.isBlinking = false;
        this.blinkTimer = 0;
        for (let i = 0; i < this.snake.length; i++) {
          if (this.bodySprites[i]) this.bodySprites[i].alpha = 1;
        }
        if (this.lives <= 0) {
          this.triggerGameOver();
          return;
        }
        this.accumulator = 0;
      }
      this.draw(); // Still draw to see the blinking
      return;
    }

    // Accumulate time for fixed-step logic ticks
    this.accumulator += dt;
    if (!this.isGameOver && this.accumulator >= Config.GAME_SPEED) {
      this.accumulator -= Config.GAME_SPEED;
      this.updateSnake();
    }
    this.draw();
  }

  /** Core logic: movement, collisions, and eating */
  updateSnake() {
    this.direction = this.nextDirection;
    this.tickCounter++;

    // Randomly shift food positions based on config interval
    if (this.tickCounter % Config.FOOD_MOVE_EVERY === 0) this.moveFoods();

    // Calculate new head position
    const head: Point = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y,
    };

    // Boundary check / Wrap logic
    if (this.isWrapMode) {
      if (head.x < 0) head.x = COLS - 1;
      else if (head.x >= COLS) head.x = 0;
      if (head.y < 0) head.y = ROWS - 1;
      else if (head.y >= ROWS) head.y = 0;
    } else if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      this.loseLife();
      return;
    }

    // Self-collision check using the O(1) Set lookup
    if (this.snakeSet.has(key(head.x, head.y))) {
      this.loseLife();
      return;
    }

    // Move snake forward logic
    this.snake.unshift(head);
    this.snakeSet.add(key(head.x, head.y));

    let grow = false;
    // Check for food collision
    for (let i = 0; i < this.foods.length; i++) {
      if (this.foods[i].x === head.x && this.foods[i].y === head.y) {
        this.score += 10;
        this.scoreText.text = `SCORE: ${this.score}`;
        this.foodCollected++;
        grow = true;
        // Check if it's time to spawn a health item
        if (!this.lifeFood && this.foodCollected >= this.foodForNextLife) {
          this.spawnLifeFood();
        }
        this.respawnFood(i);
        break;
      }
    }

    // Check for health item collision
    if (
      this.lifeFood &&
      head.x === this.lifeFood.x &&
      head.y === this.lifeFood.y
    ) {
      this.lives = Math.min(this.lives + 1, Config.MAX_LIVES);
      this.updateLivesText();
      this.clearLifeFood();
    }

    // If no food was eaten, remove the tail (maintain length)
    if (!grow) {
      const tail = this.snake.pop()!;
      this.snakeSet.delete(key(tail.x, tail.y));
    }
  }

  /** Places a health food item on a random empty grid cell */
  spawnLifeFood() {
    const pos = this._randomEmpty(this._buildOccupied());
    if (pos) {
      this.lifeFood = pos;
      this.lifeFoodTimer = Config.LIFE_FOOD_DURATION;
      this.lifeFoodPhase = 0;
      // Randomize the interval until the next life food appears
      this.foodForNextLife = this.foodCollected + 5 + ((Math.random() * 6) | 0);
      this.app.ticker.add(this.updateLifeFood);
    }
  }

  /** Logic for foods that move autonomously around the board */
  moveFoods() {
    const occ = this._buildOccupied();

    for (const f of this.foods) {
      occ.delete(key(f.x, f.y)); // Vacate current spot temporarily

      // Reset and shuffle movement directions
      SHUFFLED_DIRS[0] = DIRS[0];
      SHUFFLED_DIRS[1] = DIRS[1];
      SHUFFLED_DIRS[2] = DIRS[2];
      SHUFFLED_DIRS[3] = DIRS[3];
      shuffle(SHUFFLED_DIRS);

      for (const d of SHUFFLED_DIRS) {
        const nx = f.x + d.x,
          ny = f.y + d.y;
        const nk = key(nx, ny);
        // Ensure new position is within bounds and not occupied
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !occ.has(nk)) {
          f.x = nx;
          f.y = ny;
          break;
        }
      }
      occ.add(key(f.x, f.y)); // Lock new position
    }
  }

  /** Updates all sprites positions, scales, and rotations based on logic state */
  draw() {
    // Global pulse animation for all foods
    const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.1;
    const foodScale = this.foodBaseScale * pulse;

    // Update food sprites
    for (let i = 0; i < this.foodSprites.length; i++) {
      const spr = this.foodSprites[i];
      if (i < this.foods.length) {
        spr.visible = true;
        spr.position.set(
          this.foods[i].x * GRID + HALF,
          this.foods[i].y * GRID + HALF,
        );
        spr.scale.set(foodScale);
      } else {
        spr.visible = false;
      }
    }

    // Update life food sprite
    if (this.lifeFood) {
      this.lifeFoodSprite.visible = true;
      this.lifeFoodSprite.position.set(
        this.lifeFood.x * GRID + HALF,
        this.lifeFood.y * GRID + HALF,
      );
      this.lifeFoodSprite.scale.set(
        this.lifeFoodBaseScale * (1 + Math.sin(this.lifeFoodPhase) * 0.15),
      );
    } else {
      this.lifeFoodSprite.visible = false;
    }

    // Dynamically grow the sprite pool if the snake grows longer than current pool
    while (this.bodySprites.length < this.snake.length) {
      const isHead = this.bodySprites.length === 0;
      const s = new Sprite(isHead ? this.headTexture : this.bodyTexture);
      s.anchor.set(0.5);
      s.scale.set(GRID / s.texture.width);
      this.bodyContainer.addChild(s);
      this.bodySprites.push(s);
    }

    // Update snake segment sprites
    for (let i = 0; i < this.bodySprites.length; i++) {
      const spr = this.bodySprites[i];
      if (i < this.snake.length) {
        spr.visible = true;
        const seg = this.snake[i];
        spr.position.set(seg.x * GRID + HALF, seg.y * GRID + HALF);

        // Calculate rotation based on the vector to the previous segment
        let dx: number, dy: number;
        if (i === 0) {
          dx = this.direction.x;
          dy = this.direction.y;
        } else {
          const prev = this.snake[i - 1];
          dx = Math.sign(prev.x - seg.x);
          dy = Math.sign(prev.y - seg.y);
          // Handle rotation correctly when wrapping around screen edges
          if (Math.abs(prev.x - seg.x) > 1) dx = -dx;
          if (Math.abs(prev.y - seg.y) > 1) dy = -dy;
        }

        spr.rotation = ROTATION.get(key(dx, dy)) ?? 0;
        if (!this.isBlinking) spr.alpha = i === 0 ? 1 : 0.8;
      } else {
        spr.visible = false;
      }
    }
  }

  /** Recenters the game board and UI elements when the screen size changes */
  handleResize() {
    const gameW = COLS * GRID;
    const gameH = ROWS * GRID;
    this.gameContainer.x = (this.app.screen.width - gameW) / 2;
    this.gameContainer.y = (this.app.screen.height - gameH) / 2;

    this.uiGraphics
      .clear()
      .rect(this.gameContainer.x, this.gameContainer.y, gameW, gameH)
      .fill("#181818")
      .stroke({ width: 3, color: 0xffffff });

    this.scoreText.position.set(this.gameContainer.x, 20);
    this.livesText.position.set(this.gameContainer.x + 200, 20);
    this.pauseButton.position.set(this.gameContainer.x + gameW - 90, 20);
    this.wrapToggle.position.set(this.gameContainer.x + gameW - 200, 22);
    this.resetButton.position.set(
      this.app.screen.width / 2 - 50,
      this.app.screen.height - 50,
    );
  }

  /** Decrements life and triggers the damage blink effect */
  loseLife() {
    this.lives--;
    this.updateLivesText();
    this.isBlinking = true;
    this.blinkTimer = 0;
  }

  /** Stops the game and updates the UI to Game Over state */
  triggerGameOver() {
    this.isGameOver = true;
    this.isPaused = true;
    this.pauseButton.labelTxt.text = "RESTART";
  }

  /** Toggles the game's paused state */
  togglePause() {
    if (this.isGameOver || this.isBlinking) return;
    this.isPaused = !this.isPaused;
    this.pauseButton.labelTxt.text = this.isPaused ? "RESUME" : "PAUSE";
  }

  /** Updates the visual Heart string in the UI */
  updateLivesText() {
    this.livesText.text = "LIVES: " + "♥".repeat(Math.max(0, this.lives));
  }

  /** Resets all variables and positions for a fresh game start */
  resetGame() {
    this.clearLifeFood();
    this.snake = [
      { x: Config.CENTER_X, y: Config.CENTER_Y },
      { x: Config.CENTER_X, y: Config.CENTER_Y + 1 },
    ];
    this.snakeSet.clear();
    this.snakeSet.add(key(Config.CENTER_X, Config.CENTER_Y));
    this.snakeSet.add(key(Config.CENTER_X, Config.CENTER_Y + 1));

    this.direction = this.nextDirection = { x: 0, y: -1 };
    this.score = 0;
    this.lives = Config.INITIAL_LIVES;
    this.isPaused = false;
    this.isGameOver = false;
    this.isBlinking = false;
    this.accumulator = 0;
    this.tickCounter = 0;
    this.foodCollected = 0;
    this.lifeFoodPhase = 0;
    this.foodForNextLife = 5 + ((Math.random() * 5) | 0);
    this.foods = [];

    const occ = this._buildOccupied();
    for (let i = 0; i < Config.FOOD_COUNT; i++) {
      const pos = this._randomEmpty(occ);
      if (pos) {
        this.foods.push(pos);
        occ.add(key(pos.x, pos.y));
      }
    }

    this.updateLivesText();
    this.scoreText.text = "SCORE: 0";
    if (this.pauseButton) this.pauseButton.labelTxt.text = "PAUSE";
  }

  /** Repositions a specific food item after it's eaten */
  respawnFood(index: number) {
    const pos = this._randomEmpty(this._buildOccupied());
    if (pos) {
      this.foods[index].x = pos.x;
      this.foods[index].y = pos.y;
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Simple linear interpolation utility */
  private _lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /** Aggregates all occupied grid cells into a single Set for collision avoidance */
  private _buildOccupied(): Set<number> {
    const s = new Set<number>();
    for (const seg of this.snake) s.add(key(seg.x, seg.y));
    for (const f of this.foods) s.add(key(f.x, f.y));
    if (this.lifeFood) s.add(key(this.lifeFood.x, this.lifeFood.y));
    return s;
  }

  /**
   * Finds a random empty cell using Reservoir Sampling.
   * This is O(N) where N is board size, but uses constant memory O(1)
   * compared to the naive approach of building a massive array of every empty cell.
   */
  private _randomEmpty(occupied: Set<number>): Point | null {
    let result: Point | null = null;
    let count = 0;
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (!occupied.has(key(x, y))) {
          count++;
          // Mathematical trick: Replace previous choice with 1/n probability
          // ensures every empty cell has an equal chance of being picked.
          if (Math.random() * count < 1) result = { x, y };
        }
      }
    }
    return result;
  }
}
