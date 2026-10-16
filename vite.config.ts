import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative assets support repository paths and custom domains; --base overrides it.
export default defineConfig({
  base: './', plugins: [react()],
  build: { rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom'], validation: ['ajv/dist/2020'], zip: ['jszip'] } } } },
});
