import { defineConfig } from 'vite';
import obfuscator from 'rollup-plugin-obfuscator';

/**
 * JavaScript Obfuscator Configuration
 * Maximum security settings for production build
 */
const obfuscatorOptions = {
  // Core obfuscation
  compact: true,
  simplify: true,
  target: 'browser',
  
  // Control flow manipulation
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1.0,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 1.0,
  
  // String protection
  stringArray: true,
  stringArrayThreshold: 1.0,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  rotateStringArray: true,
  shuffleStringArray: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  
  // String array encoding and indexing
  stringArrayEncoding: ['rc4', 'base64'],
  stringArrayIndexesType: ['hexadecimal-number'],
  stringArrayIndexShift: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 1.0,
  
  // String array wrappers
  stringArrayWrappersCount: 5,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 5,
  stringArrayWrappersType: 'function',
  
  // Identifier transformation
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: true,
  renameProperties: true,
  renamePropertiesMode: 'unsafe',
  transformObjectKeys: true,
  
  // Advanced transformations
  numbersToExpressions: true,
  unicodeEscapeSequence: true,
  transformTemplateLiterals: true,
  
  // Debug protection
  debugProtection: true,
  debugProtectionInterval: 4000,
  disableConsoleOutput: true,
  selfDefending: true,
  
  // Others
  log: false,
  reservedStrings: []
};

/**
 * Build Logger Plugin
 * Tracks output files and code splitting
 */
function buildLoggerPlugin() {
  return {
    name: 'build-logger-plugin',
    
    generateBundle(options, bundle) {
      const filenames = Object.keys(bundle);
      const jsFiles = filenames.filter(f => f.startsWith('assets/js/') && f.endsWith('.js'));
      
      console.log(`[Logger] Generated ${filenames.length} files (${jsFiles.length} JavaScript files)`);
      
      if (jsFiles.length <= 1 && filenames.some(f => f.endsWith('.js'))) {
        console.warn('[Logger] WARNING: Possible code splitting issue detected');
      } else if (jsFiles.length > 1) {
        console.log('[Logger] Code splitting confirmed - multiple JS chunks generated');
      }
    }
  };
}

/**
 * Vite Configuration
 */
export default defineConfig({
  root: '.',
  publicDir: 'public',
  
  plugins: [
    buildLoggerPlugin()
  ],
  
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
        obfuscator({ options: obfuscatorOptions })
      ]
    }
  },
  
  server: {
    open: true
  }
});