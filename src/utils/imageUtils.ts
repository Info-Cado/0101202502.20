import { ColorSelection, Point } from '../types/image';
import { colorsAreClose, hexToRgb } from './colorUtils';
import { activity } from '../lib/activity';

export const drawImageToCanvas = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | HTMLCanvasElement
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Clear the canvas first
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw the image
  ctx.drawImage(image, 0, 0);
};

export const getPixelColor = (
  canvas: HTMLCanvasElement,
  point: Point
): ImageData => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  return ctx.getImageData(point.x, point.y, 1, 1);
};

export const replaceColor = (
  canvas: HTMLCanvasElement,
  colorSelection: ColorSelection
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  
  const originalRgb = hexToRgb(colorSelection.originalColor);
  const newRgb = hexToRgb(colorSelection.newColor);

  for (let i = 0; i < data.length; i += 4) {
    const pixelColor = {
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
    };

    if (colorsAreClose(pixelColor, originalRgb)) {
      data[i] = newRgb.r;
      data[i + 1] = newRgb.g;
      data[i + 2] = newRgb.b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

export const downloadMatchingImage = async (
  imageUrl: string,
  designNumber: string,
  matchingNumber: number,
  colorChanges?: Array<{ name: string; newColor: string; hex: string; newHex: string }>
): Promise<void> => {
  const showError = (message: string) => {
    const errorToast = document.createElement('div');
    errorToast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    errorToast.textContent = message;
    document.body.appendChild(errorToast);
    setTimeout(() => errorToast.remove(), 3000);
  };

  try {
    // Create a temporary canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      showError('Could not initialize canvas context');
      return;
    }

    // Load the image with proper error handling
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Wait for image to load before proceeding
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        // Set canvas size after image loads with padding
        const headerHeight = Math.round(img.height * 0.03); // 3% of image height for header
        canvas.width = img.width;
        canvas.height = img.height + headerHeight; // Add header height
        resolve();
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = imageUrl;
    });

    // Calculate dimensions
    const headerHeight = Math.round(img.height * 0.03); // 3% header height
    const headerFontSize = Math.round(img.height * 0.02); // 2% text height for header

    // Draw white background for header
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, headerHeight);
    
    // Draw header text centered vertically
    ctx.font = `${headerFontSize}px Arial`;
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `Design #${designNumber} • Match #${matchingNumber}`,
      canvas.width / 2,
      headerHeight / 2 // Center text vertically in header
    );
    
    // Draw the image below header
    ctx.drawImage(img, 0, headerHeight);

    // Draw color changes if available
    if (colorChanges?.length) {
      const colorFontSize = Math.round(canvas.height * 0.014); // 3% text height for color changes
      const padding = colorFontSize * 0.5; // Reduced padding
      const rowHeight = colorFontSize * 1.5; // Slightly increased for swatches
      const swatchSize = colorFontSize * 0.8; // Size of color swatch
      
      ctx.font = `${colorFontSize}px Arial`;
      const columnPadding = colorFontSize * 0.5;
      
      // Calculate column widths including space for swatches
      const swatchPadding = swatchSize + (colorFontSize * 0.3); // Space between swatch and text
      const maxNameWidth = Math.max(...colorChanges.map(change => 
        ctx.measureText(change.name).width
      )) + swatchPadding;
      const maxColorWidth = Math.max(...colorChanges.map(change => 
        ctx.measureText(change.newColor).width
      )) + swatchPadding;
      const arrowWidth = ctx.measureText('→').width;
      
      // Calculate table dimensions
      const tableWidth = maxNameWidth + arrowWidth + maxColorWidth + (columnPadding * 4);
      const tableHeight = (rowHeight * colorChanges.length) + (padding * 2);
      
      // Draw table background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, headerHeight, tableWidth, tableHeight);

      // Draw color changes
      colorChanges.forEach((change, index) => {
        const y = headerHeight + padding + (index * rowHeight) + (colorFontSize * 0.5);
        
        // Draw original color swatch using hex value
        ctx.fillStyle = change.hex;
        ctx.fillRect(
          columnPadding, 
          y - (swatchSize / 2), 
          swatchSize, 
          swatchSize
        );
        
        // Draw swatch border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          columnPadding, 
          y - (swatchSize / 2), 
          swatchSize, 
          swatchSize
        );

        // Draw original color name
        ctx.textAlign = 'left';
        ctx.fillStyle = 'black';
        ctx.fillText(
          change.name, 
          columnPadding + swatchSize + (colorFontSize * 0.3), 
          y
        );

        // Draw arrow
        ctx.textAlign = 'center';
        ctx.fillText(
          '→', 
          maxNameWidth + columnPadding * 2 + arrowWidth/2, 
          y
        );

        // Draw new color swatch using hex value
        ctx.fillStyle = change.newHex;
        ctx.fillRect(
          maxNameWidth + columnPadding * 3 + arrowWidth,
          y - (swatchSize / 2),
          swatchSize,
          swatchSize
        );
        
        // Draw swatch border
        ctx.strokeRect(
          maxNameWidth + columnPadding * 3 + arrowWidth,
          y - (swatchSize / 2),
          swatchSize,
          swatchSize
        );

        // Draw new color name
        ctx.textAlign = 'left';
        ctx.fillStyle = 'black';
        ctx.fillText(
          change.newColor,
          maxNameWidth + columnPadding * 3 + arrowWidth + swatchSize + (colorFontSize * 0.3),
          y
        );
      });
    }

    // Create download link
    canvas.toBlob((blob) => {
      if (!blob) {
        showError('Failed to create image blob');
        return;
      }
      
      const link = document.createElement('a');
      link.download = `design_${designNumber}_match_${matchingNumber}.png`;
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 100);
    }, 'image/png', 1.0);

  } catch (error) {
    console.error('Download error:', error);
    showError(error instanceof Error ? error.message : 'Failed to download image');
  }
};
