import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Completely remove Vite's default CSS processing attempts
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    modulePreload: {
      polyfill: false // May reduce startup code if not needed
    },
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        // Let publicDir handle CSS/IMG. This handles other assets if any.
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
            renameGlobals: false,

            // --- Obfuscation Strength (Harder) ---
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.85, // Increased slightly
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.5, // Increased slightly
            selfDefending: true, // Makes tampering harder

            // --- Identifier/Variable Naming ---
            identifierNamesGenerator: 'hexadecimal',
            transformObjectKeys: true, // Renames object keys where possible

            // --- String Manipulation (More Aggressive for HTML etc.) ---
            stringArray: true,
            stringArrayThreshold: 1, // Force most strings into the array
            splitStrings: true,
            splitStringsChunkLength: 8, // Smaller chunks for HTML/long strings
            stringArrayEncoding: ['base64'],
            stringArrayWrappersCount: 4, // More wrappers
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 4,
            stringArrayWrappersType: 'function',
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            unicodeEscapeSequence: true, // Makes string content less readable

            // --- Protecting CSS Paths ---
            reservedStrings: [
              '\\.css$', // Reserve strings ENDING with .css
              '\\/assets\\/css\\/' // Reserve strings containing the CSS path base
            ],

            // --- Other ---
            numbersToExpressions: true,
            disableConsoleOutput: true,
            debugProtection: false, // Keep false for performance unless needed
            debugProtectionInterval: 0,
            sourceMap: false,
          }
        })
      ]
    }
  },
  // Remove Vite's explicit CSS block entirely to prevent interference
  // css: { ... },
  server: {
    open: true
  }
});