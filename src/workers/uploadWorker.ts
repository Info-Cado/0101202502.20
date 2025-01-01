// Web Worker for handling file uploads
const CHUNK_SIZE = 1024 * 1024 * 2; // 2MB chunks

self.onmessage = async (e: MessageEvent) => {
  const { file, id } = e.data;
  
  try {
    const chunks = Math.ceil(file.size / CHUNK_SIZE);
    
    for (let i = 0; i < chunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      // Report progress
      self.postMessage({
        type: 'progress',
        id,
        progress: Math.round((i / chunks) * 100),
        chunk: i + 1,
        totalChunks: chunks
      });
      
      // Process chunk
      await processChunk(chunk);
    }
    
    self.postMessage({ type: 'complete', id });
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      id,
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
};

async function processChunk(chunk: Blob): Promise<void> {
  // Simulate chunk processing time
  await new Promise(resolve => setTimeout(resolve, 100));
}
