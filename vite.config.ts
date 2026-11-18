import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-calc': ['decimal.js'],
        },
      },
    },
  },
});
