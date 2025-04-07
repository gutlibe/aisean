import { defineConfig } from 'vite';
import { obfuscator } from 'rollup-obfuscator';

export default defineConfig({
  plugins: [
    obfuscator({
      optionsPreset: 'medium-obfuscation', // Medium level of obfuscation
      sourceMap: false,
      exclude: ['node_modules/**'],
    }),
  ],
  root: '.', // Default root
  publicDir: 'public', // Default public directory
  build: {
    outDir: 'dist', // Output directory
    sourcemap: false, // No source maps
    rollupOptions: {
      input: {
        main: 'index.html', // Your entry point
      },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`, // Naming for entry files
        chunkFileNames: `assets/js/[name].[hash].js`, // Naming for chunks
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`, // Naming for assets
      },
    },
  },
});