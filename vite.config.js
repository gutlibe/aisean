import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

export default defineConfig({
  root: '.',
  publicDir: 'public', // Vite copies contents of 'public' to the root of 'dist'

  build: {
    outDir: 'dist',
    sourcemap: false,
    // We are disabling Vite's CSS handling here since we copy it manually
    // and minify with a separate script.
    cssCodeSplit: false, // Prevent Vite from trying to split CSS
    assetsInlineLimit: 0, // Prevent inlining small assets

    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        // JS output hashing remains
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        // Generic rule for non-JS/non-CSS assets (fonts, etc.) IF processed by Rollup
        // CSS is handled by the publicDir copy + minify script
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`,
      },
      plugins: [
        javascriptObfuscator({
          // Target ONLY JS files
          include: ["**/assets/js/**/*.js"],
          exclude: ["node_modules/**"],
          // Your original obfuscation options
          options: {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.9,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.6,
            debugProtection: false,
            debugProtectionInterval: 0,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: true,
            renameGlobals: false, // Safer
            selfDefending: true,
            simplify: true,
            splitStrings: true,
            splitStringsChunkLength: 15,
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayEncoding: ['base64'],
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 3,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 5,
            stringArrayWrappersType: 'function',
            stringArrayThreshold: 0.9,
            transformObjectKeys: true,
            unicodeEscapeSequence: false,
            target: 'browser',
            sourceMap: false,
          }
        })
      ]
    }
  },
  // Ensure CSS isn't processed in dev server in a way that breaks build logic
  css: {
    preprocessorOptions: {}, // Avoid specific preprocessor actions
  },
  server: {
    open: true
  }
});