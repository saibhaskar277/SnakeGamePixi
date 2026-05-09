import { Container, Graphics, Text } from "pixi.js";
import { FancyButton, CheckBox } from "@pixi/ui";

// Extend FancyButton to type the custom labelTxt property you attached
export interface CustomButton extends FancyButton {
  labelTxt: Text;
}

export class UIFactory {
  static createButton(
    label: string,
    width: number,
    height: number,
    onClick: () => void,
    fontSize: number = 14,
  ): CustomButton {
    const defaultView = new Graphics()
      .roundRect(0, 0, width, height, 6)
      .fill("#444444");
    const hoverView = new Graphics()
      .roundRect(0, 0, width, height, 6)
      .fill("#555555");
    const pressedView = new Graphics()
      .roundRect(0, 0, width, height, 6)
      .fill("#222222");

    const txt = new Text({
      text: label,
      style: { fill: "#ffffff", fontSize: fontSize },
    });

    const btn = new FancyButton({
      defaultView,
      hoverView,
      pressedView,
      text: txt,
    }) as CustomButton;

    btn.labelTxt = txt;
    btn.onPress.connect(onClick);

    return btn;
  }

  static createToggle(
    labelText: string,
    initialState: boolean,
    onChange: (checked: boolean) => void,
  ): Container {
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
    checkBox.onChange.connect(() => onChange(checkBox.checked));

    const label = new Text({
      text: labelText,
      style: { fill: "#ffffff", fontSize: 14 },
    });
    label.position.set(-60, 2);

    toggleContainer.addChild(label, checkBox);
    return toggleContainer;
  }
}
