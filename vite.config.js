/**
 * Vite Configuration
 * Handles build optimization, asset management, and development server settings
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';
import stylelint from 'vite-plugin-stylelint';

export default defineConfig({
  // Project root directory
  root: '.',
  
  // Static asset directory
  publicDir: 'public',
  
  // Plugins
  plugins: [
    stylelint({
      fix: false,
      quiet: false,
    }),
  ],
  
  // Build configuration
  build: {
    // Output directory
    outDir: 'dist',
    
    // Disable source maps in production
    sourcemap: false,
    
    // Combine all CSS into a single file
    cssCodeSplit: false,
    
    // Don't inline any assets
    assetsInlineLimit: 0,
    
    // Use Terser for minification
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
    
    // Rollup-specific options
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      
      output: {
        // File naming patterns with longer hash for better uniqueness
        entryFileNames: 'assets/js/[hash:20].js',
        chunkFileNames: 'assets/js/[hash:20].js',
        
        // Asset organization with extended hash length
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/css/[hash:20][extname]';
          }
          return 'assets/[ext]/[hash:20][extname]';
        },
      },
      
      // Additional Rollup plugins
      plugins: []
    }
  },
  
  // CSS processing options
  css: {
    preprocessorOptions: {},
  },
  
  // Development server configuration
  server: {
    open: true
  }
});