import { Scene, SceneName } from "../SceneManager";
import { Text, Graphics, Container, Application } from "pixi.js";
import { Button } from "@pixi/ui";

export class MenuScene extends Scene {
  constructor(app: Application) {
    super(SceneName.MainMenu, app);
  }

  override async init(): Promise<void> {
    const screenCenter = {
      x: this.app.screen.width / 2,
      y: this.app.screen.height / 2
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

    // 3. Button Setup
    const btnWidth = 200;
    const btnHeight = 60;
    const btnContainer = new Container();
    
    const bg = new Graphics()
      .fill("#444")
      .roundRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 10) 
      .fill();

    const label = new Text({
      text: "PLAY",
      style: { fill: "#ffffff", fontSize: 20 },
    });
    label.anchor.set(0.5); 

    btnContainer.addChild(bg, label);
    
    btnContainer.y = 50; 

    const playButton = new Button(btnContainer);
    playButton.onPress.connect(() => {
      (this.parent as any).changeScene(SceneName.Game);
    });

    mainUI.addChild(btnContainer);
    this.addChild(mainUI);
  }
}