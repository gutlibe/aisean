import { defineConfig } from 'vite';
import { resolve } from 'path';
import stylelint from 'vite-plugin-stylelint';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  
  plugins: [
    stylelint({
      fix: false,
      quiet: false,
    }),
  ],
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 0,
    
    minify: 'terser',
    terserOptions: {
      compress: { passes: 2 },
      mangle: true,
      format: { comments: false },
    },
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      
      output: {
        entryFileNames: 'assets/js/[hash:20].js',
        chunkFileNames: 'assets/js/[hash:20].js',
        
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            // Pre-hashed CSS files (from our script)
            if (/\.[a-f0-9]{8}\.css$/.test(assetInfo.name)) {
              return 'assets/css/[name]';
            }
            
            // Core CSS files that shouldn't be hashed
            if (/^(base|theme|loader|page)\.css$/.test(assetInfo.name)) {
              return 'assets/css/[name]';
            }
            
            // Default for other CSS files
            return 'assets/css/[hash:20][extname]';
          }
          
          // Non-CSS assets
          return 'assets/[ext]/[hash:20][extname]';
        },
      },
    }
  },
  
  server: {
    open: true
  }
});