import { Point } from "./GameConfig";

export interface InputManagerCallbacks {
  onDirectionChange?: (move: Point) => void;
  onPauseToggle?: () => void;
}

export class InputManager {
  private onDirectionChange: (move: Point) => void;
  private onPauseToggle: () => void;
  private _keyHandler: (e: KeyboardEvent) => void;

  constructor(callbacks: InputManagerCallbacks = {}) {
    this.onDirectionChange = callbacks.onDirectionChange || (() => {});
    this.onPauseToggle = callbacks.onPauseToggle || (() => {});
    this._keyHandler = this.handleKey.bind(this);
  }

  start() {
    window.addEventListener("keydown", this._keyHandler);
  }

  stop() {
    window.removeEventListener("keydown", this._keyHandler);
  }

  handleKey(e: KeyboardEvent) {
    if (e.key === " ") {
      this.onPauseToggle();
      return;
    }

    const keys: Record<string, Point> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };

    if (keys[e.key]) {
      this.onDirectionChange(keys[e.key]);
    }
  }
}