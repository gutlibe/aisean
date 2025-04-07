import { defineConfig } from 'vite';
import { obfuscator } from 'rollup-obfuscator';

export default defineConfig({
  plugins: [
    obfuscator({
      optionsPreset: 'medium-obfuscation',
      sourceMap: false
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
        main: 'index.html',
        // login: 'login/index.html'
      },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`,
      },
      plugins: []
    }
  },
  css: {
    preprocessorOptions: {},
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