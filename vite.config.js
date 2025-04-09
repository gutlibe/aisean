import { defineConfig } from 'vite';
import { resolve } from 'path';
import stylelint from 'vite-plugin-stylelint';
import fs from 'fs';
import path from 'path';

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

// Create a plugin to clean up original CSS files after build
const cleanupOriginalFiles = () => {
  return {
    name: 'cleanup-original-files',
    closeBundle: async () => {
      const distCssDir = path.join(__dirname, 'dist/assets/css');
      
      try {
        // Get all CSS files in the dist directory
        const files = await fs.promises.readdir(distCssDir);
        
        for (const file of files) {
          // Skip hashed files
          if (hashedCssFiles.has(file)) continue;
          
          // Skip files that match our hashed pattern (name.hash.css)
          if (/\.[a-f0-9]{8}\.css$/.test(file)) continue;
          
          // If it's an original file that we've hashed, remove it
          const originalPath = path.join(distCssDir, file);
          if (Object.keys(cssMapping).some(key => key.endsWith(file))) {
            console.log(`Removing original CSS file: ${file}`);
            await fs.promises.unlink(originalPath);
          }
        }
      } catch (error) {
        console.error('Error cleaning up original CSS files:', error);
      }
    }
  };
};

export default defineConfig({
  root: '.',
  publicDir: 'public',
  
  plugins: [
    stylelint({
      fix: false,
      quiet: false,
    }),
    cleanupOriginalFiles()
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
            
            // For any other CSS files, use the default hashing
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