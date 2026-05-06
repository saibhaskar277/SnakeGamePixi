export class InputManager {
  constructor(callbacks = {}) {
    // Callbacks provided by the scene
    this.onDirectionChange = callbacks.onDirectionChange || (() => {});
    this.onPauseToggle = callbacks.onPauseToggle || (() => {});

    // Bind the handler to maintain 'this' context
    this._keyHandler = this.handleKey.bind(this);
  }

  // Start listening to events
  start() {
    window.addEventListener("keydown", this._keyHandler);
  }

  stop() {
    window.removeEventListener("keydown", this._keyHandler);
  }

  handleKey(e) {
    // Handle Pause
    if (e.key === " ") {
      this.onPauseToggle();
      return;
    }

    // Handle Movement
    const keys = {
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
