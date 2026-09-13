import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react({jsxImportSource:'@pixellift/ui'})],
  resolve: {
    alias: {
      '@pixellift/types': path.resolve(__dirname, '../../packages/types/src'),
      '@pixellift/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@pixellift/config': path.resolve(__dirname, '../../packages/config'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.PIXELIFT_API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
