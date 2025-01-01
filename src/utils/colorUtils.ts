// Convert RGB color values to hexadecimal format
export const rgbToHex = (r: number, g: number, b: number): string => {
  // Convert each component to hex and pad with zeros if needed
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Convert hexadecimal color to RGB format
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  // Extract RGB components using regex
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        // Convert hex to decimal
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }; // Default to black if invalid hex
};

// Check if two colors are similar within a tolerance range
export const colorsAreClose = (
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  tolerance = 5 // Default tolerance of 5 units per channel
): boolean => {
  // Compare each RGB channel within tolerance
  return (
    Math.abs(color1.r - color2.r) <= tolerance &&
    Math.abs(color1.g - color2.g) <= tolerance &&
    Math.abs(color1.b - color2.b) <= tolerance
  );
};
