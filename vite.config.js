import { defineConfig } from 'vite';
import { resolve } from 'path';
import stylelint from 'vite-plugin-stylelint';
import fs from 'fs';

// Check if css-mapping.json exists
let cssMapping = {};
try {
  const mappingPath = resolve(__dirname, 'css-mapping.json');
  if (fs.existsSync(mappingPath)) {
    cssMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  }
} catch (error) {
  console.warn('Could not load CSS mapping:', error);
}

// Create a set of hashed filenames for quick lookup
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
            // Check if this is one of our pre-hashed CSS files
            if (hashedCssFiles.has(assetInfo.name)) {
              return 'assets/css/[name]';
            }
            
            // For core CSS files that shouldn't be hashed
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