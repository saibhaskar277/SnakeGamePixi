import { Scene, SceneName } from "../SceneManager.js";
import { Text, Graphics, Container } from "pixi.js";
import { Button } from "@pixi/ui";

export class MenuScene extends Scene {
  constructor() {
    super(SceneName.MainMenu);
  }

  init() {
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

    playButton.view.x = 300;
    playButton.view.y = 350;

    playButton.onPress.connect(() => {
      this.parent.changeScene(SceneName.Game);
    });
    titleContainer.addChild(playButton.view);
    this.addChild(titleContainer);
  }
}
