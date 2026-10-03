/**
 * Game configuration with responsive settings for mobile and desktop
 */

export const GameConfig = {
  // Base grid cell size - will be adjusted on mobile
  GRID_SIZE: 20,
  
  // Board dimensions - adjusted dynamically based on screen size
  COLUMNS: 36,
  ROWS: 22,
  
  // Game speed (milliseconds per tick)
  GAME_SPEED: 120,
  
  // UI and gameplay constants
  SCREEN_OFFSET: 60,
  FOOD_COUNT: 3,
  FOOD_MOVE_EVERY: 4,
  INITIAL_LIVES: 3,
  MAX_LIVES: 6,
  BLINK_DURATION: 1500,
  LIFE_FOOD_DURATION: 5000,

  // Center positions
  get CENTER_X() {
    return Math.floor(this.COLUMNS / 2);
  },
  get CENTER_Y() {
    return Math.floor(this.ROWS / 2);
  },

  /**
   * Calculate responsive grid size and board dimensions based on viewport
   */
  getResponsiveDimensions() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Detect mobile (portrait) vs desktop
    const isMobile = width < 768 || height < 600;
    
    if (isMobile) {
      // Mobile: smaller board, tighter margins
      // Use 90% of viewport with 5% padding on each side
      const maxBoardWidth = width * 0.9;
      const maxBoardHeight = height * 0.85; // Leave room for UI at top
      
      // Calculate optimal grid size and dimensions
      let gridSize = 12; // Start smaller
      let cols = 20;
      let rows = 15;
      
      // Try to maximize board while fitting screen
      for (let g = 12; g <= 18; g++) {
        for (let c = 15; c <= 30; c++) {
          for (let r = 12; r <= 20; r++) {
            if (c * g <= maxBoardWidth && r * g <= maxBoardHeight) {
              if (c * g > cols * gridSize || (c * g === cols * gridSize && r * g > rows * gridSize)) {
                gridSize = g;
                cols = c;
                rows = r;
              }
            }
          }
        }
      }
      
      return { gridSize, columns: cols, rows };
    } else {
      // Desktop: use default large board
      return { gridSize: 20, columns: 36, rows: 22 };
    }
  },
} as const;

export interface Point {
  x: number;
  y: number;
}
