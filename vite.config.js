// vite.config.js
import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false, // MUST be false for obfuscation
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    minify: false, // Obfuscator handles compacting
    modulePreload: {
      polyfill: false
    },
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name].[ext]'; // Keep original CSS names
          }
          return `assets/[ext]/[name].[hash].[ext]`;
        },
      },
      plugins: [
        javascriptObfuscator({
          include: ["assets/js/**/*.js"],
          exclude: ["node_modules/**"],
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
            sourceMap: false, // Ensure no sourcemap for obfuscated code
          }
        })
      ]
    },
    emptyOutDir: true,
  },
  server: {
    open: true
  }
});