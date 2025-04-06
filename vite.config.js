import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

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
          options: {
            compact: true,
            // Enable control flow flattening to obscure the actual flow
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75,
            // Inject dead code to mislead reverse engineers
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            debugProtection: false,
            debugProtectionInterval: 0,
            // Disable console output to avoid hints during debugging
            disableConsoleOutput: true,
            // Domain lock is empty; if needed, add your domains
            domainLock: [],
            domainLockRedirectUrl: 'about:blank',
            forceTransformStrings: [],
            identifierNamesCache: null,
            // Use hexadecimal names for identifiers for better obfuscation
            identifierNamesGenerator: 'hexadecimal',
            identifiersDictionary: [],
            identifiersPrefix: '',
            ignoreImports: false,
            inputFileName: '',
            log: false,
            numbersToExpressions: false,
            optionsPreset: 'default',
            // Renaming globals and properties makes it harder to track functionality
            renameGlobals: true,
            renameProperties: true,
            renamePropertiesMode: 'safe',
            reservedNames: [],
            reservedStrings: [],
            seed: 0,
            // Self-defending mode makes the code resistant to tampering
            selfDefending: true,
            simplify: true,
            sourceMap: false,
            sourceMapBaseUrl: '',
            sourceMapFileName: '',
            sourceMapMode: 'separate',
            sourceMapSourcesMode: 'sources-content',
            // Split strings into chunks so that embedded HTML becomes fragmented
            splitStrings: true,
            splitStringsChunkLength: 10,
            // Use a string array with base64 encoding to obscure all string literals
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayCallsTransformThreshold: 0.5,
            stringArrayEncoding: ['base64'],
            stringArrayIndexesType: ['hexadecimal-number'],
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            // Increase the number of wrappers to add extra layers of indirection
            stringArrayWrappersCount: 2,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 2,
            stringArrayWrappersType: 'variable',
            // Ensure most strings are processed
            stringArrayThreshold: 0.75,
            target: 'browser',
            // Transform object keys to further confuse the structure
            transformObjectKeys: true,
            // Convert string characters into unicode escapes
            unicodeEscapeSequence: true
          }
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
