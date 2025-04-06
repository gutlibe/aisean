import { defineConfig } from 'vite';
import { obfuscator } from 'vite-plugin-obfuscator'; // Use named import
import path from 'path';

// Basic options for testing stability - less likely to break JSON parsing
const basicObfuscatorOptions = {
  compact: true,
  simplify: true,
  // Explicitly disable features known to potentially interfere more heavily
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false, // Keep console logs enabled for debugging!
  identifierNamesGenerator: 'hexadecimal', // Simple name mangling
  log: false,
  numbersToExpressions: false,
  renameGlobals: false, // Safer
  renameProperties: false, // Safer
  rotateStringArray: false,
  selfDefending: false,
  shuffleStringArray: false,
  splitStrings: false,
  stringArray: false, // Disable string array manipulation
  // stringArrayEncoding: [], // Not needed
  // stringArrayThreshold: 0, // Not needed
  target: 'browser',
  transformObjectKeys: false, // Safer
  unicodeEscapeSequence: false
};

// Your desired full obfuscation options (keep for later)
/*
const fullObfuscatorOptions = {
  compact: true, controlFlowFlattening: true, controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true, deadCodeInjectionThreshold: 0.4, debugProtection: false,
  debugProtectionInterval: 0, disableConsoleOutput: true, domainLock: [],
  domainLockRedirectUrl: 'about:blank', forceTransformStrings: [], identifierNamesCache: null,
  identifierNamesGenerator: 'hexadecimal', identifiersDictionary: [], identifiersPrefix: '',
  ignoreImports: false, inputFileName: '', log: false, numbersToExpressions: false,
  optionsPreset: 'default', renameGlobals: true, renameProperties: true,
  renamePropertiesMode: 'safe', reservedNames: [], reservedStrings: [], seed: 0,
  selfDefending: true, simplify: true, sourceMap: false, sourceMapBaseUrl: '',
  sourceMapFileName: '', sourceMapMode: 'separate', sourceMapSourcesMode: 'sources-content',
  splitStrings: true, splitStringsChunkLength: 10, stringArray: true,
  stringArrayCallsTransform: true, stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['base64'], stringArrayIndexesType: ['hexadecimal-number'],
  stringArrayIndexShift: true, stringArrayRotate: true, stringArrayShuffle: true,
  stringArrayWrappersCount: 2, stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 2, stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.75, target: 'browser', transformObjectKeys: true,
  unicodeEscapeSequence: true
};
*/

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  console.log(`Vite running in ${command} mode.`);
  // Decide which options to use based on testing needs
  const currentObfuscatorOptions = basicObfuscatorOptions; // START WITH BASIC
  // const currentObfuscatorOptions = fullObfuscatorOptions; // Switch back later if basic works

  if (isBuild) {
    console.log(`Applying ${currentObfuscatorOptions === basicObfuscatorOptions ? 'BASIC' : 'FULL'} Obfuscation via Vite plugin...`);
  }

  return {
    root: '.',
    publicDir: 'public',
    build: {
      outDir: 'dist',
      sourcemap: false, // Keep false
      rollupOptions: {
        input: { main: 'index.html' },
        output: {
          entryFileNames: `assets/js/[name].[hash].js`,
          chunkFileNames: `assets/js/[name].[hash].js`,
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name?.split('.').pop() ?? '';
            if (/\.(css)$/.test(assetInfo.name ?? '')) {
              return `assets/css/[name].[hash][extname]`;
            }
            if (/\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.name ?? '')) {
              return `assets/img/[name].[hash][extname]`;
            }
            if (/\.(woff|woff2|eot|ttf|otf)$/.test(assetInfo.name ?? '')) {
              return `assets/fonts/[name].[hash][extname]`;
            }
            return `assets/[ext]/[name].[hash][extname]`;
          },
        },
      },
    },
    plugins: [
      isBuild
        ? obfuscator({
            options: currentObfuscatorOptions,
            apply: 'build',
            exclude: [
              /node_modules/,
              // Keep excluding LibraryLoader just in case
              path.resolve(__dirname, 'assets/js/chunks/LibraryLoader.js'),
            ],
          })
        : null,
    ].filter(Boolean),
    css: {},
    server: {
      open: true,
    },
  }
});
