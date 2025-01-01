import React from 'react';

interface ColorPickerProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  color,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-8 w-14 cursor-pointer rounded border border-gray-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span className="text-sm text-gray-500">{color}</span>
    </div>
  );
};
