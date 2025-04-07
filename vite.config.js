import { defineConfig } from 'vite';
import { obfuscator } from 'rollup-obfuscator';

export default defineConfig({
  plugins: [
    obfuscator({
      optionsPreset: 'medium-obfuscation',
      sourceMap: false,
      exclude: ['node_modules/**'] // Optional: excludes node_modules from obfuscation
    })
  ],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false, // No source maps for production
    cssCodeSplit: false, // Single CSS file
    assetsInlineLimit: 0, // Prevent asset inlining
    rollupOptions: {
      input: {
        main: 'index.html'
        // Uncomment if you have a login page: 
        // login: 'login/index.html'
      },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`
      }
    }
  },
  css: {
    preprocessorOptions: {}
  },
  server: {
    open: true
  }
});