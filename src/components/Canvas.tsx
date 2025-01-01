import React, { useEffect, useRef, useState } from 'react';
import { Point } from '../types/image';
import { ZoomPreview } from './ZoomPreview';

interface CanvasProps {
  image: HTMLImageElement | HTMLCanvasElement | null;
  onPixelClick: (point: Point) => void;
  selectedPoint: Point | null;
  showZoom?: boolean;
  className?: string;
}

/**
 * Canvas component for displaying and interacting with images
 * Provides pixel-level interaction and zoom preview functionality
 */
export const Canvas: React.FC<CanvasProps> = ({
  image,
  onPixelClick,
  selectedPoint,
  showZoom = false,
  className = '',
}) => {
  // State for tracking cursor position
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);
  
  // Refs for canvas and context
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Initialize canvas and draw image
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const MAX_CANVAS_SIZE = 16384; // Maximum canvas size supported by browsers
    
    // Calculate scaled dimensions if image is too large
    let targetWidth = image.width;
    let targetHeight = image.height;
    
    if (targetWidth > MAX_CANVAS_SIZE || targetHeight > MAX_CANVAS_SIZE) {
      const scale = Math.min(MAX_CANVAS_SIZE / targetWidth, MAX_CANVAS_SIZE / targetHeight);
      targetWidth = Math.floor(targetWidth * scale);
      targetHeight = Math.floor(targetHeight * scale);
    }
    
    const ctx = canvas.getContext('2d', { 
      willReadFrequently: true,
      alpha: true
    });
    if (!ctx) return;
    mainCtxRef.current = ctx;
    
    try {
      // Set canvas dimensions to target size
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Get container dimensions
      const containerWidth = canvas.parentElement?.clientWidth || window.innerWidth;
      const containerHeight = canvas.parentElement?.clientHeight || window.innerHeight;
    
      // Calculate scale to fit container while preserving aspect ratio
      const displayScale = Math.min(
        containerWidth / targetWidth,
        containerHeight / targetHeight,
      );
    
      // Calculate display dimensions while maintaining aspect ratio
      const displayWidth = targetWidth * displayScale;
      const displayHeight = targetHeight * displayScale;

      // Apply display dimensions without affecting canvas resolution
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';

      // Clear canvas and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Use better image rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement) {
        // Draw image with proper scaling
        ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
      }
    } catch (error) {
      console.error('Error drawing image:', error);
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Error loading image. Please try again.';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }, [image]);

  /**
   * Handles click events on the canvas
   * Converts screen coordinates to canvas coordinates
   */
  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scaling factors
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    const imageWidth = canvas.width;
    const imageHeight = canvas.height;
    
    // Calculate scale and offsets
    const scaleX = displayWidth / imageWidth;
    const scaleY = displayHeight / imageHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate image offset within canvas
    const offsetX = (displayWidth - imageWidth * scale) / 2;
    const offsetY = (displayHeight - imageHeight * scale) / 2;
    
    // Convert to canvas coordinates
    const x = Math.floor((event.clientX - rect.left - offsetX) / scale);
    const y = Math.floor((event.clientY - rect.top - offsetY) / scale);
    
    // Ensure coordinates are within bounds
    if (x < 0 || x >= imageWidth || y < 0 || y >= imageHeight) return;
    
    onPixelClick({ x, y, sourceX: x, sourceY: y, ctx: mainCtxRef.current });
  };

  /**
   * Handles mouse movement over the canvas
   * Updates cursor position for zoom preview
   */
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scaling factors
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    const imageWidth = canvas.width;
    const imageHeight = canvas.height;
    
    // Calculate scale and offsets
    const scaleX = displayWidth / imageWidth;
    const scaleY = displayHeight / imageHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate offset
    const offsetX = (displayWidth - imageWidth * scale) / 2;
    const offsetY = (displayHeight - imageHeight * scale) / 2;
    
    // Convert coordinates
    const x = Math.floor((event.clientX - rect.left - offsetX) / scale);
    const y = Math.floor((event.clientY - rect.top - offsetY) / scale);
    
    // Ensure coordinates are within bounds
    if (x < 0 || x >= imageWidth || y < 0 || y >= imageHeight) return;
    
    setCursorPosition({
      x: event.clientX,
      y: event.clientY,
      sourceX: x,
      sourceY: y,
      ctx: mainCtxRef.current
    });
  };

  // Reset cursor position when mouse leaves canvas
  const handleMouseLeave = () => {
    setCursorPosition(null);
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`rounded-lg w-full h-full bg-white ${className}`}
        style={{ objectFit: 'contain' }}
      />
      {selectedPoint && (
        <div
          className="absolute border-2 border-blue-500 rounded-full w-6 h-6 pointer-events-none"
          style={{
            left: selectedPoint.x - 12,
            top: selectedPoint.y - 12,
            transform: 'translate(-50%, -50%)'
          }}
        />
      )}
      {showZoom && cursorPosition && (
        <ZoomPreview
          x={cursorPosition.x}
          y={cursorPosition.y}
          sourceX={cursorPosition.sourceX}
          sourceY={cursorPosition.sourceY}
          ctx={cursorPosition.ctx}
        />
      )}
    </div>
  );
};
