import { Scene, SceneName } from "../SceneManager.js";
import { Container, Assets, Sprite, Graphics, Text } from "pixi.js";

const GRID_SIZE = 20;
const GAME_SPEED = 120;
const COLUMNS = 36;
const ROWS = 22;
const SCREEN_OFFSET = 60;
const FOOD_COUNT = 3;
const FOOD_MOVE_EVERY = 4;
const INITIAL_LIVES = 3;
const MAX_LIVES = 6;
const BLINK_DURATION = 1500;
const LIFE_FOOD_DURATION = 5000;
const CENTER_X = Math.floor(COLUMNS / 2);
const CENTER_Y = Math.floor(ROWS / 2);

export class GameScene extends Scene {
  constructor(app) {
    super(SceneName.Game, app);
  }

  async init() {
    this.headTexture = await Assets.load(
      "/src/Assets/SnakeGameSprites/snakeHead.png",
    );
    this.bodyTexture = await Assets.load(
      "/src/Assets/SnakeGameSprites/snakeBody.png",
    );
    this.foodTexture = await Assets.load(
      "/src/Assets/SnakeGameSprites/food.png",
    );
    this.lifeFoodTexture = await Assets.load(
      "/src/Assets/SnakeGameSprites/health.png",
    );

    this.uiGraphics = new Graphics();
    this.gameContainer = new Container();
    this.bodyContainer = new Container();
    this.foodContainer = new Container();

    this.gameContainer.addChild(this.bodyContainer);
    this.gameContainer.addChild(this.foodContainer);
    this.addChild(this.uiGraphics);
    this.addChild(this.gameContainer);

    this.bodySprites = [];
    this.foodSprites = [];

    for (let i = 0; i < FOOD_COUNT; i++) {
      const s = new Sprite(this.foodTexture);
      s.anchor.set(0.5);
      this.foodContainer.addChild(s);
      this.foodSprites.push(s);
    }

    this.lifeFoodSprite = new Sprite(this.lifeFoodTexture);
    this.lifeFoodSprite.anchor.set(0.5);
    this.lifeFoodSprite.visible = false;
    this.foodContainer.addChild(this.lifeFoodSprite);

    this.scoreText = new Text({
      text: "SCORE: 0",
      style: { fill: "#ffffff", fontSize: 20 },
    });
    this.livesText = new Text({
      text: "",
      style: { fill: "#ff4444", fontSize: 20 },
    });
    this.addChild(this.scoreText, this.livesText);

    this.pauseButton = this._createButton("PAUSE", 80, () =>
      this.isGameOver ? this.resetGame() : this.togglePause(),
    );
    this.wrapButton = this._createButton("WRAP: OFF", 130, () =>
      this.toggleWrap(),
    );
    this.resetButton = this._createButton("RESET", 100, () => this.resetGame());

    this._keyHandler = (e) => this.handleKey(e);
    window.addEventListener("keydown", this._keyHandler);

    this.resetGame();
    this.handleResize();
  }

  onEnter() {
    console.log("Entered Game Scene");
    this.handleResize();
  }

  onExit() {
    console.log("Leaving Game Scene");
  }

  onResize() {
    this.handleResize();
  }

  destroyScene() {
    window.removeEventListener("keydown", this._keyHandler);
    super.destroyScene();
  }

  update(ticker) {
    if (this.isPaused && !this.isBlinking) return;

    const dt = ticker.deltaMS;

    if (this.lifeFood) {
      this.lifeFoodTimer -= dt;
      const progress = 1 - this.lifeFoodTimer / LIFE_FOOD_DURATION;
      const currentSpeed = this._lerp(0.005, 0.04, progress);
      this.lifeFoodPhase += dt * currentSpeed;
      if (this.lifeFoodTimer <= 0) this.lifeFood = null;
    }

    if (this.isBlinking) {
      this.blinkTimer += dt;
      const show = Math.floor(this.blinkTimer / 150) % 2 === 0;
      for (const s of this.bodySprites) s.alpha = show ? 1 : 0.1;

      if (this.blinkTimer >= BLINK_DURATION) {
        this.isBlinking = false;
        this.blinkTimer = 0;
        for (const s of this.bodySprites) s.alpha = 1;
        if (this.lives <= 0) {
          this.triggerGameOver();
          return;
        }
        this.accumulator = 0;
      }
      this.draw();
      return;
    }

    this.accumulator += dt;
    if (!this.isGameOver && this.accumulator >= GAME_SPEED) {
      this.accumulator -= GAME_SPEED;
      this.updateSnake();
    }
    this.draw();
  }

  updateSnake() {
    this.direction = this.nextDirection;
    this.tickCounter++;

    if (this.tickCounter % FOOD_MOVE_EVERY === 0) this.moveFoods();

    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y,
    };

    if (this.isWrapMode) {
      if (head.x < 0) head.x = COLUMNS - 1;
      else if (head.x >= COLUMNS) head.x = 0;
      if (head.y < 0) head.y = ROWS - 1;
      else if (head.y >= ROWS) head.y = 0;
    } else if (
      head.x < 0 ||
      head.x >= COLUMNS ||
      head.y < 0 ||
      head.y >= ROWS
    ) {
      this.loseLife();
      return;
    }

    if (this.snake.some((s) => s.x === head.x && s.y === head.y)) {
      this.loseLife();
      return;
    }

    this.snake.unshift(head);
    let grow = false;

    for (let i = 0; i < this.foods.length; i++) {
      if (this.foods[i].x === head.x && this.foods[i].y === head.y) {
        this.score += 10;
        this.scoreText.text = `SCORE: ${this.score}`;
        this.foodCollected++;
        grow = true;
        if (!this.lifeFood && this.foodCollected >= this.foodForNextLife) {
          this.spawnLifeFood();
        }
        this.respawnFood(i);
        break;
      }
    }

    if (
      this.lifeFood &&
      head.x === this.lifeFood.x &&
      head.y === this.lifeFood.y
    ) {
      this.lives = Math.min(this.lives + 1, MAX_LIVES);
      this.updateLivesText();
      this.lifeFood = null;
    }

    if (!grow) this.snake.pop();
  }

  spawnLifeFood() {
    const pos = this._randomEmpty(this._buildOccupied());
    if (pos) {
      this.lifeFood = { x: pos.x, y: pos.y };
      this.lifeFoodTimer = LIFE_FOOD_DURATION;
      this.lifeFoodPhase = 0;
      this.foodForNextLife =
        this.foodCollected + 5 + Math.floor(Math.random() * 6);
    }
  }

  moveFoods() {
    const DIRS = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    for (const f of this.foods) {
      const occ = this._buildOccupied(f);
      const shuffled = DIRS.slice().sort(() => Math.random() - 0.5);
      for (const d of shuffled) {
        const nx = f.x + d.x,
          ny = f.y + d.y;
        if (
          nx >= 0 &&
          nx < COLUMNS &&
          ny >= 0 &&
          ny < ROWS &&
          !occ.has(this._cellKey(nx, ny))
        ) {
          f.x = nx;
          f.y = ny;
          break;
        }
      }
    }
  }

  draw() {
    const now = Date.now();
    const pulse = 1 + Math.sin(now * 0.01) * 0.1;

    this.foodSprites.forEach((spr, i) => {
      if (i < this.foods.length) {
        spr.visible = true;
        spr.position.set(
          this.foods[i].x * GRID_SIZE + GRID_SIZE / 2,
          this.foods[i].y * GRID_SIZE + GRID_SIZE / 2,
        );
        spr.width = spr.height = GRID_SIZE * pulse;
      } else {
        spr.visible = false;
      }
    });

    if (this.lifeFood) {
      this.lifeFoodSprite.visible = true;
      const lifePulse = 1 + Math.sin(this.lifeFoodPhase) * 0.15;
      this.lifeFoodSprite.position.set(
        this.lifeFood.x * GRID_SIZE + GRID_SIZE / 2,
        this.lifeFood.y * GRID_SIZE + GRID_SIZE / 2,
      );
      this.lifeFoodSprite.width = this.lifeFoodSprite.height =
        GRID_SIZE * 1.2 * lifePulse;
    } else {
      this.lifeFoodSprite.visible = false;
    }

    while (this.bodySprites.length < this.snake.length) {
      const isHead = this.bodySprites.length === 0;
      const s = new Sprite(isHead ? this.headTexture : this.bodyTexture);
      s.anchor.set(0.5);
      this.bodyContainer.addChild(s);
      this.bodySprites.push(s);
    }
    while (this.bodySprites.length > this.snake.length) {
      this.bodyContainer.removeChild(this.bodySprites.pop()).destroy();
    }

    this.snake.forEach((seg, i) => {
      const spr = this.bodySprites[i];
      spr.position.set(
        seg.x * GRID_SIZE + GRID_SIZE / 2,
        seg.y * GRID_SIZE + GRID_SIZE / 2,
      );

      let segDir;
      if (i === 0) {
        segDir = this.direction;
      } else {
        const prev = this.snake[i - 1];
        segDir = { x: Math.sign(prev.x - seg.x), y: Math.sign(prev.y - seg.y) };
        if (Math.abs(prev.x - seg.x) > 1) segDir.x = -segDir.x;
        if (Math.abs(prev.y - seg.y) > 1) segDir.y = -segDir.y;
      }

      spr.rotation = this._getOrientation(segDir);
      spr.scale.set(GRID_SIZE / spr.texture.width);
      if (!this.isBlinking) spr.alpha = i === 0 ? 1 : 0.8;
    });
  }

  handleResize() {
    const gameW = COLUMNS * GRID_SIZE;
    const gameH = ROWS * GRID_SIZE;

    this.gameContainer.x = (this.app.screen.width - gameW) / 2;
    this.gameContainer.y = (this.app.screen.height - gameH) / 2;

    // FIXED: PixiJS v8 syntax for drawing and filling/stroking shapes
    this.uiGraphics
      .clear()
      .rect(this.gameContainer.x, this.gameContainer.y, gameW, gameH)
      .fill("#181818")
      .stroke({ width: 3, color: 0xffffff });

    this.scoreText.position.set(this.gameContainer.x, 20);
    this.livesText.position.set(this.gameContainer.x + 200, 20);
    this.pauseButton.position.set(this.gameContainer.x + gameW - 90, 20);
    this.wrapButton.position.set(this.gameContainer.x + gameW - 240, 20);
    this.resetButton.position.set(
      this.app.screen.width / 2 - 50,
      this.app.screen.height - 50,
    );
  }

  handleKey(e) {
    if (e.key === " ") this.togglePause();
    if (this.isPaused || this.isGameOver) return;
    const keys = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };
    if (keys[e.key]) {
      const move = keys[e.key];
      if (move.x !== -this.direction.x && move.y !== -this.direction.y)
        this.nextDirection = move;
    }
  }

  loseLife() {
    this.lives--;
    this.updateLivesText();
    this.isBlinking = true;
    this.blinkTimer = 0;
  }

  triggerGameOver() {
    this.isGameOver = true;
    this.isPaused = true;
    this.pauseButton.children[1].text = "RESTART";
  }

  togglePause() {
    if (this.isGameOver || this.isBlinking) return;
    this.isPaused = !this.isPaused;
    this.pauseButton.children[1].text = this.isPaused ? "RESUME" : "PAUSE";
  }

  toggleWrap() {
    this.isWrapMode = !this.isWrapMode;
    this.wrapButton.children[1].text = this.isWrapMode
      ? "WRAP: ON"
      : "WRAP: OFF";
  }

  updateLivesText() {
    this.livesText.text = "LIVES: " + "♥".repeat(Math.max(0, this.lives));
  }

  resetGame() {
    this.snake = [
      { x: CENTER_X, y: CENTER_Y },
      { x: CENTER_X, y: CENTER_Y + 1 },
    ];
    this.direction = this.nextDirection = { x: 0, y: -1 };
    this.score = 0;
    this.lives = INITIAL_LIVES;
    this.isPaused = false;
    this.isGameOver = false;
    this.isBlinking = false;
    this.accumulator = 0;
    this.tickCounter = 0;
    this.foodCollected = 0;
    this.lifeFood = null;
    this.lifeFoodPhase = 0;
    this.foodForNextLife = 5 + Math.floor(Math.random() * 5);
    this.foods = [];

    for (let i = 0; i < FOOD_COUNT; i++) {
      const pos = this._randomEmpty(this._buildOccupied());
      if (pos) this.foods.push({ x: pos.x, y: pos.y });
    }

    this.updateLivesText();
    this.scoreText.text = "SCORE: 0";
    if (this.pauseButton) this.pauseButton.children[1].text = "PAUSE";
  }

  respawnFood(index) {
    const pos = this._randomEmpty(this._buildOccupied());
    if (pos) {
      this.foods[index].x = pos.x;
      this.foods[index].y = pos.y;
    }
  }

  _lerp(start, end, t) {
    return start + (end - start) * t;
  }

  _cellKey(x, y) {
    return `${x},${y}`;
  }

  _buildOccupied(excludeFood = null) {
    const s = new Set();
    for (const seg of this.snake) s.add(this._cellKey(seg.x, seg.y));
    for (const f of this.foods)
      if (f !== excludeFood) s.add(this._cellKey(f.x, f.y));
    if (this.lifeFood) s.add(this._cellKey(this.lifeFood.x, this.lifeFood.y));
    return s;
  }

  _randomEmpty(occupied) {
    const pool = [];
    for (let x = 0; x < COLUMNS; x++)
      for (let y = 0; y < ROWS; y++)
        if (!occupied.has(this._cellKey(x, y))) pool.push({ x, y });
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  _getOrientation(dir) {
    if (dir.x === 0 && dir.y === -1) return 0;
    if (dir.x === 0 && dir.y === 1) return Math.PI;
    if (dir.x === -1 && dir.y === 0) return -Math.PI / 2;
    if (dir.x === 1 && dir.y === 0) return Math.PI / 2;
    return 0;
  }

  _createButton(label, width, onClick) {
    const btn = new Container();

    // FIXED: PixiJS v8 chaining sequence. Call roundRect, then fill.
    const bg = new Graphics().roundRect(0, 0, width, 30, 6).fill("#444444");

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
    this.addChild(btn);
    return btn;
  }
}
