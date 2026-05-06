import { Container } from "pixi.js";

export const SceneName = {
  Game: "Game",
  MainMenu: "MainMenu",
};

export class Scene extends Container {
  constructor(name, app) {
    super();
    this.name = name;
    this.app = app;
    this.initialized = false;
  }
  async init() {}
  onEnter() {}
  update(ticker) {}
  onExit() {}
  onResize(w, h) {}
}

class SceneManager extends Container {
  constructor() {
    super();
    this.scenes = new Map();
    this.currentScene = null;
    this.app = null;
  }

  init(app) {
    this.app = app;
  }

  addScene(scene) {
    this.scenes.set(scene.name, scene);
  }

  async changeScene(name) {
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

  update(ticker) {
    if (this.currentScene) this.currentScene.update(ticker);
  }

  onResize(w, h) {
    if (this.currentScene) this.currentScene.onResize(w, h);
  }
}

export const sceneManager = new SceneManager();
