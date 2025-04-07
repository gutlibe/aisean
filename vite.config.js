import { defineConfig } from 'vite';
import { obfuscator } from 'rollup-obfuscator';

export default defineConfig({
  plugins: [
    obfuscator({
      optionsPreset: 'medium-obfuscation',
      sourceMap: false,
      exclude: ['node_modules/**'] // Default, can be omitted
    })
  ],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`,
      },
      plugins: [] // No plugins needed here, as obfuscator is in top-level
    }
  },
  css: {
    preprocessorOptions: {}
  },
  server: {
    open: true
  }
});