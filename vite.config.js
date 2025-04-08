// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false, // Keep as one main CSS file for simplicity unless needed otherwise
    assetsInlineLimit: 0,
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 2,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login/index.html') // Your login entry point
      },
      output: {
        // Function to determine output path based on entry chunk name
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'login') {
            return 'login/assets/js/[hash].js'; // Specific path for login JS
          }
          return 'assets/js/[hash].js'; // Default path for other entries (main)
        },
        // Chunks might be shared, place them in the main assets folder
        chunkFileNames: 'assets/js/[hash].js',
        // Keep assets like CSS, images in the main assets folder
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/css/[hash][extname]';
          }
          return 'assets/[ext]/[hash][extname]';
        },
      },
      plugins: []
    }
  },
  css: {
    preprocessorOptions: {},
  },
  server: {
    open: true
  }
});