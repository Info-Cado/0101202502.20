import React, { useState, useEffect } from 'react';
import { ColorPicker } from './ColorPicker';
import { ArrowLeft } from 'lucide-react';
import { Canvas } from './Canvas';
import { rgbToHex } from '../utils/colorUtils';
import { Point } from '../types/image';
import { PoweredBy } from './PoweredBy';

interface DefaultColorButtonProps {
  color: { hex: string; name: string };
  isSelected: boolean;
  currentColor?: string;
  onClick: () => void;
}

const DefaultColorButton: React.FC<DefaultColorButtonProps> = ({ color, isSelected, currentColor, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
      isSelected 
        ? 'border-indigo-500 bg-indigo-50' 
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`}
  >
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-md border border-gray-200"
        style={{ backgroundColor: color.hex }}
        title={color.hex}
      />
      <span className="text-sm text-gray-700">{color.name}</span>
      {currentColor && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">→</span>
          <div
            className="w-6 h-6 rounded-md border border-gray-200"
            style={{ backgroundColor: currentColor }}
            title={currentColor}
          />
        </div>
      )}
    </div>
  </button>
);

interface DefaultColorSelectorProps {
  colors: Array<{ hex: string; name: string }>;
  selectedColor: string | null;
  currentColors?: Record<string, string>;
  onColorSelect: (hex: string) => void;
}

export const DefaultColorList: React.FC<DefaultColorSelectorProps> = ({ 
  colors,
  selectedColor,
  currentColors = {},
  onColorSelect,
}) => {
  if (colors.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Select screen color to change</h3>
      <div className="flex flex-col gap-2">
        {colors.map((color, index) => (
          <DefaultColorButton
            key={index}
            color={color}
            isSelected={selectedColor === color.hex}
            currentColor={currentColors[color.hex]}
            onClick={() => onColorSelect(color.hex)}
          />
        ))}
      </div>
    </div>
  );
};

interface DefaultColorSelectorProps {
  designNumber: string;
  imageUrl: string;
  defaultColors?: Array<{ hex: string; name: string }>;
  onSave: (colors: Array<{ hex: string; name: string }>) => void;
  onBack: () => void;
}

export const DefaultColorSelector: React.FC<DefaultColorSelectorProps> = ({
  designNumber,
  imageUrl,
  defaultColors = [],
  onSave,
  onBack,
}) => {
  const [colors, setColors] = useState<Array<{ hex: string; name: string }>>(defaultColors);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [colorName, setColorName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => setOriginalImage(img);
  }, [imageUrl]);

  const handlePixelClick = (point: Point) => {
    if (!point.ctx) return;
    
    const pixel = point.ctx.getImageData(point.sourceX, point.sourceY, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    setSelectedColor(hex);
    setSelectedPoint(point);
  };

  const handleAddColor = () => {
    if (!colorName.trim()) {
      setError('Please enter a screen name');
      return;
    }

    // Check for duplicate hex color
    const isDuplicateHex = colors.some(color => color.hex.toLowerCase() === selectedColor.toLowerCase());
    if (isDuplicateHex) {
      setError('This color has already been added');
      return;
    }

    setColors([...colors, { hex: selectedColor, name: colorName.trim() }]);
    setColorName('');
    setSelectedPoint(null);
    setError(null);
  };

  const handleRemoveColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  const handleSave = async (colors: Array<{ hex: string; name: string }>) => {
    setIsSaving(true);
    setError(null);

    if (colors.length === 0) {
      setError('Please add at least one screen color before saving');
      setIsSaving(false);
      return;
    }
    
    try {
      // Validate colors before saving
      colors.forEach(color => {
        if (!color.hex.match(/^#[0-9A-Fa-f]{6}$/)) {
          throw new Error(`Invalid hex color format: ${color.hex}`);
        }
        if (!color.name.trim()) {
          throw new Error('Color name cannot be empty');
        }
      });

      await onSave(colors);
    } catch (err) {
      console.error('Error saving colors:', err);
      const message = err instanceof Error ? err.message : 'Failed to save default colors';
      setError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {isSaving && (
        <div className="fixed inset-x-0 top-0 z-50">
         
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-lg font-semibold">
          Screen Details - #{designNumber}
        </h2>
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0 overflow-y-auto max-h-full">
          {colors.length > 0 && (
            <div className="space-y-2">
              {colors.map((color, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 w-6">#{i + 1}</span>
                    <div
                      className="w-6 h-6 rounded border border-gray-200"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-sm text-gray-700">{color.name}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveColor(i)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0 flex items-center justify-center h-[85vh]">
          <Canvas
            image={originalImage}
            onPixelClick={handlePixelClick}
            selectedPoint={selectedPoint}
            showZoom={true}
            className="h-full w-auto object-contain"
          />

        </div>
        
        <div className="w-80 flex-shrink-0 space-y-6 overflow-y-auto max-h-full">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Screen Details</h3>
            
            <div className="space-y-4">
              <div className="w-full h-32 rounded-lg border border-gray-200 mb-4" style={{ backgroundColor: selectedColor }} />
              <ColorPicker
                label="Color"
                color={selectedColor}
                onChange={setSelectedColor}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Screen Name
                </label>
                <input
                  type="text"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  placeholder="e.g., Dark Blue"
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>

              <button
                onClick={handleAddColor}
                disabled={!colorName.trim() || !selectedColor}
                className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Screen
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={() => handleSave(colors)}
            disabled={colors.length === 0 || isSaving}
            className={`w-full rounded-lg px-3 py-2 text-sm font-medium text-white 
              ${colors.length === 0 || isSaving 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gray-800 hover:bg-gray-700'} 
              transition-colors duration-200`}
          >
            {isSaving ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              'Save Details'
            )}
          </button>
        </div>
        <PoweredBy />
      </div>
    </div>
  );
};
