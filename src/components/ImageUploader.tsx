import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  isUploading?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  isUploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  return (
    <div
      onClick={isUploading ? undefined : handleClick}
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 ${
        isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleChange}
        disabled={isUploading}
        className="hidden"
      />
      <Upload className="mb-2 h-8 w-8 text-gray-400" />
      <p className="mb-2 text-sm text-gray-500">
        <span className="font-semibold">Click to upload a design</span>
      </p>
      <p className="text-xs text-gray-500">High resolution PNG or JPG up to 50MB</p>
    </div>
  );
};
