import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration
export default defineConfig({
  // Enable React plugin for JSX support and Fast Refresh
  plugins: [react()],
  
  // Optimization settings
  optimizeDeps: {
    // Exclude packages that cause optimization issues
    exclude: ['lucide-react'],
  },
});
