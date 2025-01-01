import React from 'react';

interface DefaultColorListProps {
  colors: Array<{ hex: string; name: string }>;
  selectedColor: string | null;
  currentColors: Record<string, { hex: string; name: string }>;
  onColorSelect: (hex: string) => void;
}

export const DefaultColorList: React.FC<DefaultColorListProps> = ({ 
  colors,
  selectedColor,
  currentColors,
  onColorSelect,
}) => {
  if (colors.length === 0) return null;

  return (
    <div className="p-4 bg-gray-50 rounded-lg h-full overflow-y-auto">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Select screen color to change</h3>
      <div className="flex flex-col gap-3">
        {colors.map((color, index) => (
          <button
            key={index}
            onClick={() => onColorSelect(color.hex)}
            className={`flex flex-col w-full p-4 rounded-lg border transition-all ${
              selectedColor === color.hex
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">#{index + 1}</span>
                <div
                  className="w-6 h-6 rounded border border-gray-200 flex-shrink-0"
                  style={{ backgroundColor: color.hex }}
                  title={color.hex}
                />
                <span className="text-sm text-gray-700 font-medium">{color.name}</span>
              </div>
              {currentColors[color.hex] && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">→</span>
                  <div
                    className="w-6 h-6 rounded border border-gray-200 flex-shrink-0"
                    style={{ backgroundColor: currentColors[color.hex].hex }}
                    title={currentColors[color.hex].hex}
                  />
                  <span className="text-sm text-gray-600">{currentColors[color.hex].name}</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
