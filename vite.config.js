import { defineConfig } from 'vite';
import vitePluginJavascriptObfuscator from 'vite-plugin-javascript-obfuscator';

/**
 * JavaScript Obfuscator Configuration
 * All options set to maximum security settings
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
  stringArrayEncoding: ['rc4', 'base64'],
  stringArrayIndexesType: ['hexadecimal-number'],
  stringArrayIndexShift: true,
  rotateStringArray: true,
  shuffleStringArray: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  
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
 * Custom Build Logging Plugin
 * Provides visibility into the build process
 */
function buildLoggerPlugin() {
  return {
    name: 'build-logger-plugin',
    
    buildStart() {
      console.log('[Logger] Build starting...');
    },
    
    generateBundle(options, bundle) {
      const filenames = Object.keys(bundle);
      const jsFiles = filenames.filter(f => f.startsWith('assets/js/') && f.endsWith('.js'));
      
      console.log(`[Logger] Generating ${filenames.length} files (${jsFiles.length} JS files)`);
      
      if (jsFiles.length <= 1 && filenames.some(f => f.endsWith('.js'))) {
        console.warn('[Logger] WARNING: Possible code splitting issue with obfuscation');
      }
    },
    
    writeBundle(options, bundle) {
      console.log(`[Logger] Build complete. ${Object.keys(bundle).length} files written`);
    }
  };
}

/**
 * Vite Configuration
 */
export default defineConfig(({ command }) => {
  console.log(`[Vite] Running in ${command} mode`);
  
  return {
    root: '.',
    publicDir: 'public',
    
    plugins: [
      // JavaScript obfuscator (production builds only)
      vitePluginJavascriptObfuscator({
        options: obfuscatorOptions,
        apply: 'build',
        enforce: 'post',
      }),
      
      // Build logger
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
        }
      }
    },
    
    server: {
      open: true
    }
  };
});