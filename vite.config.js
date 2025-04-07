import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: true,
  renameProperties: true,
  renamePropertiesMode: 'unsafe',  // Changed to unsafe for better obfuscation
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 3,      // More aggressive string splitting
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.8,
  stringArrayEncoding: ['rc4'],    // Stronger encoding for strings
  stringArrayIndexesType: ['hexadecimal-number'],
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayThreshold: 0.5,       // Lower threshold to include more strings
  transformTemplateLiterals: true, // Critical for HTML template obfuscation
  unicodeEscapeSequence: true,
  reservedStrings: []              // Empty to ensure all strings are processed
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
        javascriptObfuscator({
          include: ["assets/js/**/*.js"],
          exclude: ["node_modules/**"],
          options: obfuscatorOptions
        })
      ]
    }
  },
  server: { open: true }
});