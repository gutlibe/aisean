import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false, // Creates one CSS file, making the naming simpler
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
        login: resolve(__dirname, 'login/index.html')
      },
      output: {
        // Use [hash] only for JS entry points and chunks
        entryFileNames: `assets/js/[hash].js`,
        chunkFileNames: `assets/js/[hash].js`,
        // Use [hash] only for other assets like CSS, images etc.
        assetFileNames: (assetInfo) => {
          // Ensure CSS files also use hash-only naming
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/css/[hash][extname]';
          }
          // Default for other assets (images, fonts, etc.)
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