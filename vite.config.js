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
    minify: 'terser', // Add Terser for additional minification
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      },
      mangle: {
        properties: {
          regex: /^_/  // Mangle property names starting with underscore
        }
      }
    },
    modulePreload: {
      polyfill: false
    },
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
            // --- General Settings ---
            compact: true,
            simplify: true,
            target: 'browser',
            log: false,
            renameGlobals: true, // Changed to true to rename global variables
            
            // --- Obfuscation Strength (Maximum) ---
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 1, // Maximum control flow obfuscation
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.7, // More dead code
            selfDefending: true,
            
            // --- Identifier/Variable Naming ---
            identifierNamesGenerator: 'mangled', // 'mangled' creates shorter, confusing names
            identifiersPrefix: '_0x', // Prefix all variables with confusing sequence
            transformObjectKeys: true,
            
            // --- String Manipulation (Maximum Obfuscation) ---
            stringArray: true,
            stringArrayThreshold: 1,
            splitStrings: true,
            splitStringsChunkLength: 3, // Even smaller chunks for maximum obfuscation
            stringArrayEncoding: ['rc4'], // More complex encoding
            stringArrayWrappersCount: 5, // More wrappers
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 5,
            stringArrayWrappersType: 'variable',
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            unicodeEscapeSequence: true,
            
            // --- Protecting CSS Paths ---
            reservedStrings: [
              '\\.css$',
              '\\/assets\\/css\\/'
            ],
            
            // --- Other Advanced Obfuscation ---
            numbersToExpressions: true,
            disableConsoleOutput: true,
            domainLock: [], // Optionally add domains where code is allowed to run
            forceTransformStrings: [], // Force transform specific strings
            debugProtection: true, // Enable to prevent debugging
            debugProtectionInterval: 4000, // Aggressive debug protection
            sourceMap: false,
            seed: Math.random() * 10000000, // Random seed for more unpredictable obfuscation
            
            // --- New Options ---
            transformObjectKeys: true, // Obfuscate object keys too
            optionsPreset: 'high-obfuscation' // Use preset high obfuscation
          }
        })
      ]
    }
  },
  server: {
    open: true
  }
});