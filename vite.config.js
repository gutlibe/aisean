import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: true,
  domainLock: [],
  domainLockRedirectUrl: 'about:blank',
  forceTransformStrings: [ // Using strings for patterns now
    "notfound-container",
    "notfound-illustration",
    "Oops! Lost in Space"
  ],
  identifierNamesCache: null,
  identifierNamesGenerator: 'hexadecimal',
  identifiersDictionary: [],
  identifiersPrefix: '',
  ignoreImports: false,
  inputFileName: '',
  log: false,
  numbersToExpressions: false,
  optionsPreset: 'default',
  renameGlobals: true,
  renameProperties: true,
  renamePropertiesMode: 'safe',
  reservedNames: [],
  reservedStrings: [],
  seed: 0,
  selfDefending: true,
  simplify: true,
  sourceMap: false,
  sourceMapBaseUrl: '',
  sourceMapFileName: '',
  sourceMapMode: 'separate',
  sourceMapSourcesMode: 'sources-content',
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['base64'],
  stringArrayIndexesType: ['hexadecimal-number'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.1,
  target: 'browser',
  transformObjectKeys: true,
  unicodeEscapeSequence: true
};

// Log the options *before* passing to defineConfig to ensure they look right
console.log("Obfuscator Options Object:", obfuscatorOptions);

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
          include: ["**/assets/js/**/*.js"],
          exclude: ["node_modules/**"],
          options: obfuscatorOptions // Pass the options object
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