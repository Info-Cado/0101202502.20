import React from 'react';

interface UploadIndicatorProps {
  isUploading: boolean;
}

export const UploadIndicator: React.FC<UploadIndicatorProps> = ({ isUploading }) => {
  if (!isUploading) return null;

  return (
    <div 
      className="fixed top-5 right-5 w-2 h-2 rounded-full bg-blue-500 animate-pulse"
      style={{
        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }}
    />
  );
};
