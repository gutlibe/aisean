import { defineConfig } from 'vite';
import { resolve } from 'path';
import stylelint from 'vite-plugin-stylelint';

export default defineConfig({
  plugins: [
    stylelint({
      fix: false,
      quiet: false,
    }),
  ],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false,
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
      },
      output: {
        entryFileNames: 'assets/js/[hash].js',
        chunkFileNames: 'assets/js/[hash].js',
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