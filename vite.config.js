import { defineConfig } from 'vite';
import { obfuscator } from 'rollup-obfuscator';

export default defineConfig({
  // Project root directory (adjust if your structure differs)
  root: '.',
  
  // Directory for static public assets (e.g., favicon.ico, robots.txt)
  publicDir: 'public',
  
  // Build configuration
  build: {
    // Output directory for the build
    outDir: 'dist',
    
    // Disable source maps for production (especially with obfuscation)
    sourcemap: false,
    
    // Rollup options for customizing the build
    rollupOptions: {
      // Define the entry point(s)
      input: {
        main: 'index.html', // Adjust if your entry HTML file has a different name or path
      },
      
      // Customize output file names
      output: {
        // Entry file naming (e.g., main.[hash].js)
        entryFileNames: 'assets/js/[name].[hash].js',
        
        // Chunk file naming for dynamically imported modules (e.g., freenode.[hash].js)
        chunkFileNames: 'assets/js/[name].[hash].js',
        
        // Asset file naming for CSS, images, etc. (e.g., style.[hash].css)
        assetFileNames: 'assets/[ext]/[name].[hash].[ext]',
      },
    },
  },
  
  // Plugins for additional functionality
  plugins: [
    // Obfuscation plugin for Rollup
    obfuscator({
      // Use medium-level obfuscation (adjust to 'low-obfuscation' or 'high-obfuscation' as needed)
      optionsPreset: 'medium-obfuscation',
      
      // No source maps for obfuscated code
      sourceMap: false,
      
      // Exclude node_modules to avoid breaking dependencies
      exclude: ['node_modules/**'],
    }),
  ],
});