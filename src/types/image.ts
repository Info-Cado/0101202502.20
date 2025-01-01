// Interface representing a point on the canvas
export interface Point {
  // X coordinate in canvas space
  x: number;
  
  // Y coordinate in canvas space
  y: number;
  
  // Original X coordinate before any transformations
  sourceX: number;
  
  // Original Y coordinate before any transformations
  sourceY: number;
  
  // Canvas rendering context for drawing operations
  ctx: CanvasRenderingContext2D | null;
}

// Interface for color replacement operations
export interface ColorSelection {
  // Original color to be replaced
  originalColor: string;
  
  // New color to replace with
  newColor: string;
}

// Interface for tracking image state
export interface ImageState {
  // Original unmodified image
  original: HTMLImageElement | null;
  
  // Modified canvas with color changes
  modified: HTMLCanvasElement | null;
}

// Interface for storing canvas history states
export interface HistoryState {
  // Snapshot of canvas pixel data
  imageData: ImageData;
}

// Interface for tracking color changes
export interface ColorChange {
  // Original color that was replaced
  originalColor: string;
  
  // New color that replaced the original
  newColor: string;
}
