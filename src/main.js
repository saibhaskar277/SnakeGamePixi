import { Application } from "pixi.js";
import { sceneManager, SceneName } from "./SceneManager.js";
import { GameScene } from "./GameScenes/GameScene.js";

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
  await sceneManager.changeScene(SceneName.Game);

  app.ticker.add((ticker) => sceneManager.update(ticker));

  window.addEventListener("resize", () => {
    sceneManager.onResize(app.screen.width, app.screen.height);
  });
}

start();
