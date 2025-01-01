import { useState, useEffect, useCallback, useRef } from 'react';

interface UploadState {
  id: string;
  file: File;
  chunks: {
    processed: number;
    total: number;
  };
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  localUrl: string;
  worker?: Worker;
}

interface UseFileUploadOptions {
  onUploadComplete?: (file: File, url: string) => void;
  onUploadError?: (file: File, error: Error) => void;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [hasActiveUploads, setHasActiveUploads] = useState(false);
  const uploadRefs = useRef<{ [key: string]: XMLHttpRequest }>({});

  // Handle tab close warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasActiveUploads) {
        e.preventDefault();
        e.returnValue = 'You have uploads in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasActiveUploads]);

  // Update active uploads status
  useEffect(() => {
    setHasActiveUploads(uploads.some(u => u.status === 'uploading'));
  }, [uploads]);

  // Cleanup local URLs on unmount
  useEffect(() => {
    return () => {
      uploads.forEach(upload => {
        URL.revokeObjectURL(upload.localUrl);
      });
    };
  }, []);

  const addFile = useCallback((file: File) => {
    // Validate file size
    if (options.maxSizeMB && file.size > options.maxSizeMB * 1024 * 1024) {
      throw new Error(`File size exceeds ${options.maxSizeMB}MB limit`);
    }

    // Validate file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      throw new Error('File type not supported');
    }

    const id = Math.random().toString(36).substring(2);
    const localUrl = URL.createObjectURL(file);
    const worker = new Worker(new URL('../workers/uploadWorker.ts', import.meta.url), { type: 'module' });
    
    worker.onmessage = (e) => {
      const { type, progress, chunk, totalChunks } = e.data;
      
      switch (type) {
        case 'progress':
          setUploads(prev => prev.map(u => 
            u.id === id ? {
              ...u,
              progress,
              chunks: { processed: chunk, total: totalChunks }
            } : u
          ));
          break;
          
        case 'complete':
          setUploads(prev => prev.map(u => 
            u.id === id ? { ...u, status: 'completed', progress: 100 } : u
          ));
          worker.terminate();
          break;
          
        case 'error':
          setUploads(prev => prev.map(u => 
            u.id === id ? { ...u, status: 'error', error: e.data.error } : u
          ));
          worker.terminate();
          break;
      }
    };

    setUploads(prev => [...prev, {
      id,
      file,
      progress: 0,
      chunks: { processed: 0, total: 0 },
      status: 'pending',
      localUrl,
      worker
    }]);

    return id;
  }, [options.maxSizeMB, options.allowedTypes]);

  const uploadFile = useCallback(async (id: string) => {
    const upload = uploads.find(u => u.id === id);
    if (!upload) return;

    setUploads(prev => prev.map(u => 
      u.id === id ? { ...u, status: 'uploading' } : u
    ));

    upload.worker.postMessage({ file: upload.file, id });

    return new Promise<string>((resolve, reject) => {
      const checkStatus = setInterval(() => {
        const currentUpload = uploads.find(u => u.id === id);
        if (!currentUpload) {
          clearInterval(checkStatus);
          reject(new Error('Upload cancelled'));
          return;
        }

        if (currentUpload.status === 'completed') {
          clearInterval(checkStatus);
          resolve('success');
        } else if (currentUpload.status === 'error') {
          clearInterval(checkStatus);
          reject(new Error(currentUpload.error));
        }
      }, 100);
    });
  }, [uploads, options.onUploadComplete, options.onUploadError]);

  const cancelUpload = useCallback((id: string) => {
    const upload = uploads.find(u => u.id === id);
    if (upload?.worker) {
      upload.worker.terminate();
    }
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  const retryUpload = useCallback((id: string) => {
    setUploads(prev => prev.map(u => 
      u.id === id ? { ...u, status: 'pending', progress: 0, error: undefined } : u
    ));
    return uploadFile(id);
  }, [uploadFile]);

  return {
    uploads,
    hasActiveUploads,
    addFile,
    uploadFile,
    cancelUpload,
    retryUpload
  };
}
