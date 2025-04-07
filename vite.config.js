import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  
  build: {
    outDir: 'dist',
    sourcemap: false, // Set to true if you want source maps for debugging production builds
    cssCodeSplit: false, // Keep CSS as one file if desired
    assetsInlineLimit: 0, // Ensure assets are not inlined as base64
    
    rollupOptions: {
      input: {
        main: 'index.html'
        // If you still have the separate login page, add it here
        // login: 'login/index.html'
      },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`,
      },
      plugins: [
        // Obfuscator plugin removed
      ]
    }
  },
  
  css: {
    preprocessorOptions: {}
    // If you want Vite to handle CSS minification instead of lightningcss:
    // postcss: {
    //   plugins: [
    //     require('cssnano')({ // You might need to npm install --save-dev cssnano
    //       preset: 'default',
    //     }),
    //   ],
    // },
  },
  
  server: {
    open: true
  }
});