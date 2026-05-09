import { Scene, SceneName } from "../SceneManager";
import { Text, Container, Application } from "pixi.js";
import { UIFactory } from "../UIFactory";

export class MenuScene extends Scene {
  constructor(app: Application) {
    super(SceneName.MainMenu, app);
  }

  override async init(): Promise<void> {
    const screenCenter = {
      x: this.app.screen.width / 2,
      y: this.app.screen.height / 2,
    };

    // 1. Create a Main Wrapper
    const mainUI = new Container();
    mainUI.x = screenCenter.x;
    mainUI.y = screenCenter.y;

    // 2. Title Setup
    const title = new Text({
      text: "🐍 Snake Game",
      style: { fill: "#ffffff", fontSize: 48, fontWeight: "bold" },
    });
    title.anchor.set(0.5);
    title.y = -80;
    mainUI.addChild(title);

    const subtitle = new Text({
      text: "Made with PixiJS",
      style: { fill: "#aaaaaa", fontSize: 18 },
    });
    subtitle.anchor.set(0.5);
    subtitle.y = -40;
    mainUI.addChild(subtitle);
    const button = UIFactory.createButton(
      "Start Game",
      250,
      50,
      () => (this.parent as any).changeScene(SceneName.Game),
      24,
    );
    button.anchor.set(0.5);
    button.y = 40;
    mainUI.addChild(button);
    this.addChild(mainUI);
  }
}
