import { defineConfig } from 'vite';
import obfuscator from 'rollup-plugin-obfuscator'; // Default import for the modern plugin

// Aggressive options (similar to the ones that worked for obfuscation before)
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
  renamePropertiesMode: 'unsafe', // Use with caution, test thoroughly! Revert to 'safe' if breaks occur.
  rotateStringArray: true,
  selfDefending: true,
  shuffleStringArray: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5, // Smaller chunks for more splitting
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 1.0,
  stringArrayEncoding: ['rc4', 'base64'], // Multiple encodings
  stringArrayIndexesType: ['hexadecimal-number'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 5,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 5,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 1.0, // Process all eligible strings
  target: 'browser',
  transformObjectKeys: true,
  transformTemplateLiterals: true, // <<< Crucial for HTML
  unicodeEscapeSequence: true,
  reservedStrings: [] // Don't reserve strings unless absolutely necessary
};

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 0, // Ensure assets aren't inlined if not desired
    rollupOptions: {
      input: { main: 'index.html' },
      output: {
        // <<< THIS SECTION DEFINES THE OUTPUT STRUCTURE >>>
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`
      },
      plugins: [
        obfuscator({ // Use the modern plugin instance
          options: obfuscatorOptions,
          // No include/exclude needed usually, defaults should work.
          // Add them only if absolutely necessary:
          // include: ['**/*.js'],
          // exclude: ['node_modules/**']
        })
      ]
    }
  },
  server: {
    open: true
  }
});