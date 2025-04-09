import { defineConfig } from 'vite';
import { resolve } from 'path';
import stylelint from 'vite-plugin-stylelint';
import fs from 'fs';

let cssMapping = {};
try {
  const mappingPath = resolve(__dirname, 'css-mapping.json');
  if (fs.existsSync(mappingPath)) {
    cssMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  }
} catch (error) {
  console.warn('Could not load CSS mapping:', error);
}

const hashedCssFiles = new Set(Object.values(cssMapping));

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
            if (hashedCssFiles.has(assetInfo.name)) {
              return 'assets/css/[name]';
            }
            
            if (/\.[a-f0-9]{8}\.css$/.test(assetInfo.name)) {
              return 'assets/css/[name]';
            }
            
            return 'assets/css/[hash:20][extname]';
          }
          
          return 'assets/[ext]/[hash:20][extname]';
        },
      },
    }
  },
  
  server: {
    open: true
  }
});