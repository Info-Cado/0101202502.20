import React, { useCallback } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';
import { UploadIndicator } from './UploadIndicator';

interface FileUploaderProps {
  onUploadComplete?: (file: File, url: string) => void;
  onUploadError?: (file: File, error: Error) => void;
  maxSizeMB?: number;
  allowedTypes?: string[];
  children?: React.ReactNode;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadComplete,
  onUploadError,
  maxSizeMB = 300,
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
  children
}) => {
  const {
    uploads,
    hasActiveUploads,
    addFile,
    uploadFile,
    cancelUpload,
    retryUpload
  } = useFileUpload({
    onUploadComplete,
    onUploadError,
    maxSizeMB,
    allowedTypes
  });

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;

    try {
      for (const file of Array.from(files)) {
        const uploadId = addFile(file);
        await uploadFile(uploadId);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, [addFile, uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative"
      >
        {children}
      </div>
      
      <UploadIndicator isUploading={hasActiveUploads} />
      
      {/* Upload Progress List */}
      <div className="fixed bottom-4 right-4 space-y-2">
        {uploads.map(upload => (
          <div
            key={upload.id}
            className="bg-white rounded-lg shadow-lg p-4 max-w-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium truncate">
                  {upload.file.name}
                </div>
                <div className="text-xs text-gray-500">
                  {upload.chunks.total > 0 && (
                    `Processing chunk ${upload.chunks.processed} of ${upload.chunks.total}`
                  )}
                </div>
                {upload.status === 'uploading' && (
                  <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.status === 'error' && (
                  <div className="mt-1 text-xs text-red-500">
                    {upload.error}
                    <button
                      onClick={() => retryUpload(upload.id)}
                      className="ml-2 text-blue-500 hover:text-blue-600"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
              {upload.status === 'uploading' && (
                <button
                  onClick={() => cancelUpload(upload.id)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
