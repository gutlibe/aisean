import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [],
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
        login: resolve(__dirname, 'login/index.html')
      },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name].[hash][extname]';
          }
          return 'assets/[ext]/[name].[hash][extname]';
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