export const GameConfig = {
  GRID_SIZE: 20,
  GAME_SPEED: 120,
  COLUMNS: 36,
  ROWS: 22,
  SCREEN_OFFSET: 60,
  FOOD_COUNT: 3,
  FOOD_MOVE_EVERY: 4,
  INITIAL_LIVES: 3,
  MAX_LIVES: 6,
  BLINK_DURATION: 1500,
  LIFE_FOOD_DURATION: 5000,
  get CENTER_X() {
    return Math.floor(this.COLUMNS / 2);
  },
  get CENTER_Y() {
    return Math.floor(this.ROWS / 2);
  },
};
