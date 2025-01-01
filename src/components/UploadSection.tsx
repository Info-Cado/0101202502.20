import React from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface UploadSectionProps {
  onImageUpload: (file: File) => void;
  isUploading: boolean;
  error: string | null;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onImageUpload,
  isUploading,
  error
}) => {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onImageUpload(file);
      }
    };
    input.click();
  };

  return (
    <div 
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`
        relative flex flex-col items-center justify-center
        border-2 border-dashed border-gray-300 rounded-lg
        bg-gray-50 p-12 text-center cursor-pointer
        transition-colors duration-200 h-48
        ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}
      `}
    >
      <div className="mb-4">
        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-500">
          <span className="font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">
          PNG, JPG, GIF up to 300MB
        </p>
      </div>
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-gray-500">Uploading...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};
