import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

export default defineConfig({
  root: '.',
  publicDir: 'public', // Vite copies contents of 'public' to the root of 'dist'

  build: {
    outDir: 'dist',
    sourcemap: false, // Ensure no sourcemaps are generated
    cssCodeSplit: false, // Prevent Vite from splitting CSS (handled separately)
    assetsInlineLimit: 0, // Prevent inlining of small assets

    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        // JS output file naming with hashing for cache busting
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        // Generic rule for non-JS/non-CSS assets (fonts, images, etc.)
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`,
      },
      plugins: [
        javascriptObfuscator({
  include: ["**/assets/js/**/*.js"],
  exclude: ["node_modules/**"],
  options: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.9,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.6,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    selfDefending: true,
    simplify: true,
    splitStrings: true, // <-- already enabled
    splitStringsChunkLength: 5, // <-- reduce this to make HTML unreadable
    stringArray: true,
    stringArrayEncoding: ['base64'], // <-- ensure string array is encoded
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 5, // <-- higher wrapper count adds complexity
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 5,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 1, // <-- 100% of strings should be obfuscated
    transformObjectKeys: true,
    unicodeEscapeSequence: true, // <-- convert characters to unicode escapes
    target: 'browser',
    sourceMap: false,
  }
})

      ]
    }
  },

  // Prevent CSS preprocessor interference during development
  css: {
    preprocessorOptions: {}
  },

  server: {
    open: true
  }
});
