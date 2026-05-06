import { Scene, SceneName } from "../SceneManager";
import { Text, Graphics, Container, Application } from "pixi.js";
import { Button } from "@pixi/ui";

export class MenuScene extends Scene {
  constructor(app: Application) {
    super(SceneName.MainMenu, app);
  }

  override async init(): Promise<void> {
    const titleContainer = new Container();
    titleContainer.x = 500;
    titleContainer.y = 200;

    const title = new Text({
      text: "🐍 Snake Game",
      style: {
        fill: "#ffffff",
        fontSize: 48,
        fontWeight: "bold",
      },
    });

    title.anchor.set(0.5);
    title.x = 400;
    title.y = 200;
    titleContainer.addChild(title);

    const btnContainer = new Container();
    const bg = new Graphics().fill("#444").roundRect(0, 0, 200, 60, 10).fill();

    const label = new Text({
      text: "PLAY",
      style: { fill: "#ffffff", fontSize: 20 },
    });

    label.anchor.set(0.5);
    label.x = 100;
    label.y = 30;

    btnContainer.addChild(bg, label);

    const playButton = new Button(btnContainer);

    btnContainer.x = 300;
    btnContainer.y = 350;

    playButton.onPress.connect(() => {
      // Need to cast to any or your SceneManager type here because standard Container parent doesn't have changeScene
      (this.parent as any).changeScene(SceneName.Game);
    });

    titleContainer.addChild(btnContainer);
    this.addChild(titleContainer);
  }
}
