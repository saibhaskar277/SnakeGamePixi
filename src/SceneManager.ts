import { Container, Application, Ticker } from "pixi.js";

export const SceneName = {
  Game: "Game",
  MainMenu: "MainMenu",
} as const;

export class Scene extends Container {
  public name: string;
  public app: Application;
  public initialized: boolean = false;

  constructor(name: string, app: Application) {
    super();
    this.name = name;
    this.app = app;
  }

  async init(): Promise<void> {}
  onEnter(): void {}
  update(ticker: Ticker): void {}
  onExit(): void {}
  onResize(): void {}
}

class SceneManager extends Container {
  private scenes: Map<string, Scene>;
  public currentScene: Scene | null;
  public app: Application | null;

  constructor() {
    super();
    this.scenes = new Map();
    this.currentScene = null;
    this.app = null;
  }

  init(app: Application) {
    this.app = app;
  }

  addScene(scene: Scene) {
    this.scenes.set(scene.name, scene);
  }

  async changeScene(name: string) {
    if (this.currentScene) {
      this.currentScene.onExit();
      this.removeChild(this.currentScene);
    }

    const newScene = this.scenes.get(name);
    if (!newScene) return;

    if (!newScene.initialized) {
      await newScene.init();
      newScene.initialized = true;
    }

    this.currentScene = newScene;
    this.addChild(newScene);
    newScene.onEnter();
  }

  update(ticker: Ticker) {
    if (this.currentScene) this.currentScene.update(ticker);
  }

  onResize() {
    if (this.currentScene) this.currentScene.onResize();
  }
}

export const sceneManager = new SceneManager();