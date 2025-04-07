import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75, // Your previous value
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4, // Your previous value
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true, // Consider enabling for more obfuscation
  renameGlobals: true,
  renameProperties: true,
  renamePropertiesMode: 'safe', // Keep 'safe' unless testing 'unsafe' carefully
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10, // Your previous value
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.75, // Adjusted from your prev 0.5
  stringArrayEncoding: ['rc4'], // Changed from base64 for potentially better obfuscation
  stringArrayIndexesType: ['hexadecimal-number'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2, // Your previous value
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4, // Adjusted from your prev 2
  stringArrayWrappersType: 'function', // Changed from 'variable' for more obfuscation
  stringArrayThreshold: 0.8, // Adjusted from your prev 0.75
  target: 'browser',
  transformObjectKeys: true,
  transformTemplateLiterals: true, // <<< --- ENSURE THIS IS TRUE --- <<<
  unicodeEscapeSequence: true,
  reservedNames: [], // Ensure empty unless needed
  reservedStrings: [] // Ensure empty unless needed
};


export default defineConfig({
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
      plugins: [
        javascriptObfuscator({
          // REMOVED include/exclude: Let the plugin use defaults
          options: obfuscatorOptions
        })
      ]
    }
  },

  css: {
    preprocessorOptions: {}
  },

  server: {
    open: true
  }
});