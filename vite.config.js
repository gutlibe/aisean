import { defineConfig } from 'vite';
import obfuscator from 'rollup-plugin-obfuscator'; // Corrected: Use default import

const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1.0,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 1.0,
  debugProtection: true,
  debugProtectionInterval: 4000,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: true,
  renameProperties: true,
  renamePropertiesMode: 'unsafe',
  rotateStringArray: true,
  selfDefending: true,
  shuffleStringArray: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 1.0,
  stringArrayEncoding: ['rc4', 'base64'],
  stringArrayIndexesType: ['hexadecimal-number'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 5,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 5,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 1.0,
  target: 'browser',
  transformObjectKeys: true,
  transformTemplateLiterals: true,
  unicodeEscapeSequence: true,
  reservedStrings: []
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
      input: { main: 'index.html' },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`
      },
      plugins: [
        obfuscator({ // Use the default import variable name
          options: obfuscatorOptions
        })
      ]
    }
  },
  server: {
    open: true
  }
});