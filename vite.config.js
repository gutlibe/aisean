import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

const obfuscatorOptions = {
  // Core obfuscation settings
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1,  // Maximum obfuscation
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.5,
  
  // String and template literal protection
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 1,
  stringArrayEncoding: ['rc4'],
  stringArrayIndexShift: true,
  stringArrayIndexesType: ['hexadecimal-number'],
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 5,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 1,  // Process ALL strings
  transformObjectKeys: true,
  unicodeEscapeSequence: true,
  
  // Template literals specific enhancement
  transformTemplateLiterals: true,  // Enable template literal transformation
  splitStrings: true,
  splitStringsChunkLength: 3,
  
  // Identifier protection
  identifierNamesGenerator: 'hexadecimal',
  identifiersPrefix: '_',  // Adds prefix to all variables
  renameGlobals: true,
  renameProperties: true,
  renamePropertiesMode: 'unsafe',  // For maximum obfuscation
  
  // Self-protection mechanisms
  selfDefending: true,
  simplify: true,
  target: 'browser',
  
  // Force processing of all strings without exceptions
  reservedStrings: [],
  reservedNames: [],
  
  // Console output removal
  disableConsoleOutput: true
};

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    minify: 'terser',  // Use terser for pre-obfuscation minification
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      input: { main: 'index.html' },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`,
        // Ensure minimal code transformations before obfuscation
        format: 'es',
        generatedCode: {
          preset: 'es2015',
          symbols: false
        }
      },
      plugins: [
        // Apply obfuscator as the final step
        javascriptObfuscator({
          include: ["**/assets/js/**/*.js"],  // More inclusive pattern
          exclude: ["node_modules/**"],
          options: obfuscatorOptions
        })
      ]
    }
  },
  server: { open: true }
});