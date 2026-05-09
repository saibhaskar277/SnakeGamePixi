import { Application, Ticker } from "pixi.js";
import { sceneManager, SceneName } from "./SceneManager";
import { GameScene } from "../src/GameScenes/GameScene";
import { MenuScene } from "../src/GameScenes/MenuSecne";

// Declare global properties for TypeScript
declare global {
  var __PIXI_APP__: Application;
}

async function start() {
  const app = new Application();
  globalThis.__PIXI_APP__ = app;

  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#1d1a1a",
    antialias: true,
    resizeTo: window,
  });

  document.body.appendChild(app.canvas);

  sceneManager.init(app);
  app.stage.addChild(sceneManager);

  // Add and change scene
  const gameScene = new GameScene(app);

  sceneManager.addScene(gameScene);
  sceneManager.addScene(new MenuScene(app));
  await sceneManager.changeScene(SceneName.MainMenu);

  app.ticker.add((ticker: Ticker) => sceneManager.update(ticker));

  window.addEventListener("resize", () => {
    sceneManager.onResize();
  });
}

start();
