// Interface representing a saved color in the color palette
export interface SavedColor {
  // Unique identifier for the color (optional for new colors)
  id?: string;
  
  // Hexadecimal color value (e.g., "#FF0000")
  hex: string;
  
  // Human-readable name for the color
  name: string;
  
  // Array of categories this color belongs to
  categories: string[];
  
  // Timestamp when the color was created
  createdAt: Date;
  
  // Unix timestamp for sorting/comparison
  timestamp: number;
  
  // Position in the color palette for ordering
  position: number;
  
  // ID of the user who created the color
  userId: string;
}
