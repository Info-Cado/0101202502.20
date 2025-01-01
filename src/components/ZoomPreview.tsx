import React, { useEffect, useRef, useState } from 'react';

interface ZoomPreviewProps {
  x: number;
  y: number;
  sourceX: number;
  sourceY: number;
  ctx: CanvasRenderingContext2D | null;
}

export const ZoomPreview: React.FC<ZoomPreviewProps> = ({
  x,
  y,
  sourceX,
  sourceY,
  ctx,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(8); // Start with 8x zoom
  const size = 210; // Increased diameter of the circular preview by 40% (150 * 1.4)

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      setZoom(prev => Math.min(Math.max(prev + delta, 2), 20));
    };

    canvas.addEventListener('wheel', wheelHandler, { passive: false });
    return () => canvas.removeEventListener('wheel', wheelHandler);
  }, []);

  useEffect(() => {
    const previewCanvas = canvasRef.current;
    if (!previewCanvas || !ctx) return;

    const previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) return;

    previewCtx.clearRect(0, 0, size, size);

    // Create circular clip
    previewCtx.beginPath();
    previewCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    previewCtx.clip();

    // Get source dimensions
    const sourceSize = Math.ceil(size / zoom);
    const sourceX1 = Math.max(0, Math.min(ctx.canvas.width - sourceSize, sourceX - sourceSize / 2));
    const sourceY1 = Math.max(0, Math.min(ctx.canvas.height - sourceSize, sourceY - sourceSize / 2));

    // Get the image data from the source
    const imageData = ctx.getImageData(
      sourceX1,
      sourceY1,
      sourceSize,
      sourceSize
    );

    // Create a temporary canvas to handle the zoomed image data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sourceSize;
    tempCanvas.height = sourceSize;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.putImageData(imageData, 0, 0);

    // Draw zoomed image
    previewCtx.imageSmoothingEnabled = false;
    previewCtx.drawImage(tempCanvas, 0, 0, sourceSize, sourceSize, 0, 0, size, size);

    // Add crosshair
    const centerX = size / 2;
    const centerY = size / 2;

    // Draw white outline first
    previewCtx.strokeStyle = '#FFFFFF';
    previewCtx.lineWidth = 3;

    // Horizontal line
    previewCtx.beginPath();
    previewCtx.moveTo(centerX - 8, centerY);
    previewCtx.lineTo(centerX + 8, centerY);
    previewCtx.stroke();

    // Vertical line
    previewCtx.beginPath();
    previewCtx.moveTo(centerX, centerY - 8);
    previewCtx.lineTo(centerX, centerY + 8);
    previewCtx.stroke();

    // Draw black crosshair on top
    previewCtx.strokeStyle = '#000000';
    previewCtx.lineWidth = 1;
    previewCtx.beginPath();
    previewCtx.moveTo(centerX - 8, centerY);
    previewCtx.lineTo(centerX + 8, centerY);
    previewCtx.moveTo(centerX, centerY - 8);
    previewCtx.lineTo(centerX, centerY + 8);
    previewCtx.stroke();

    // Draw border
    previewCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    previewCtx.lineWidth = 2;
    previewCtx.beginPath();
    previewCtx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    previewCtx.stroke();
  }, [ctx, sourceX, sourceY, x, y, size, zoom]);

  const previewStyle: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'auto',
    left: Math.min(x + 20, window.innerWidth - size - 20),
    top: Math.min(y + 20, window.innerHeight - size - 20),
    width: size,
    height: size,
    borderRadius: '50%',
    zIndex: 50,
  };

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={previewStyle}
    />
  );
};
