import { Container, Graphics, Text } from "pixi.js";
import { FancyButton, CheckBox } from "@pixi/ui";

export class UIFactory {
  static createButton(label, width, onClick) {
    const defaultView = new Graphics()
      .roundRect(0, 0, width, 30, 6)
      .fill("#444444");
    const hoverView = new Graphics()
      .roundRect(0, 0, width, 30, 6)
      .fill("#555555");
    const pressedView = new Graphics()
      .roundRect(0, 0, width, 30, 6)
      .fill("#222222");

    const txt = new Text({
      text: label,
      style: { fill: "#ffffff", fontSize: 14 },
    });

    const btn = new FancyButton({
      defaultView,
      hoverView,
      pressedView,
      text: txt,
    });

    btn.labelTxt = txt;
    btn.onPress.connect(onClick);

    return btn;
  }

  static createToggle(labelText, initialState, onChange) {
    const toggleContainer = new Container();

    const uncheckedView = new Container();
    uncheckedView.addChild(
      new Graphics().roundRect(0, 0, 46, 24, 12).fill("#444444"),
    );
    uncheckedView.addChild(new Graphics().circle(12, 12, 9).fill("#aaaaaa"));

    const checkedView = new Container();
    checkedView.addChild(
      new Graphics().roundRect(0, 0, 46, 24, 12).fill("#4CAF50"),
    );
    checkedView.addChild(new Graphics().circle(34, 12, 9).fill("#ffffff"));

    const checkBox = new CheckBox({
      style: { unchecked: uncheckedView, checked: checkedView },
      checked: initialState,
    });
    checkBox.onChange.connect(onChange);

    const label = new Text({
      text: labelText,
      style: { fill: "#ffffff", fontSize: 14 },
    });
    label.position.set(-60, 2);

    toggleContainer.addChild(label, checkBox);
    return toggleContainer;
  }
}
