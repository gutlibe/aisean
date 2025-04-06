// vite.config.js
import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false, // MUST be false for obfuscation
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    minify: false, // Obfuscator handles compacting
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
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name].[ext]'; // Keep original CSS names
          }
          return `assets/[ext]/[name].[hash].[ext]`;
        },
      },
      plugins: [
        javascriptObfuscator({
          include: ["assets/js/**/*.js"],
          exclude: ["node_modules/**"],
          options: {
            // --- Aggressive Obfuscation Settings ---
            compact: true,
            simplify: true,
            target: 'browser',

            // Renaming & Identifiers (Key for variable obfuscation)
            identifierNamesGenerator: 'mangled', // Short, hard-to-track names (a, b, c...)
            renameGlobals: true, // !!! IMPORTANT: Rename globals. Test thoroughly! Needs reservedNames/Strings.
            // renameProperties: true, // !!! USE WITH EXTREME CAUTION !!! Renames object properties. High risk of breaking code. Test extensively if enabled.
            // renamePropertiesMode: 'safe', // Or 'unsafe'

            // Control Flow
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 1, // Apply maximally

            // String Obfuscation (Max settings)
            stringArray: true,
            stringArrayThreshold: 1, // Affect all strings possible
            splitStrings: true,
            splitStringsChunkLength: 5, // Split into smaller chunks
            stringArrayEncoding: ['rc4'], // Use RC4 encoding
            stringArrayCallsTransform: true, // Transform calls to string array
            stringArrayWrappersCount: 5, // More wrappers
            stringArrayWrappersType: 'function', // Function wrappers
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 5,
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            unicodeEscapeSequence: true, // Make strings harder to read directly

            // Make sure critical strings are NOT obfuscated/renamed
            reservedStrings: [
              '\\.css$', // Regex for anything ending in .css
              '\\/assets\\/css\\/', // Regex for the CSS asset path
              'page-content', // Example DOM ID
              'page-header',  // Example DOM class
              'menu-toggle',
              'back-arrow',
              'click', // Example event name string
              // Add ALL strings used in querySelector, getElementById, classList.add/remove, setAttribute, etc.
              // Add any property names accessed via strings obj['propertyName'] if renameProperties is true.
            ],
            // If renameGlobals is true, you might need reservedNames for specific global functions/variables
            // reservedNames: ['myGlobalFunction', 'myGlobalVar'],

            // Anti-Debugging / Tampering
            selfDefending: true, // Code resists modification
            debugProtection: true, // Add anti-debugging measures
            debugProtectionInterval: 4000, // Re-insert anti-debugging periodically
            disableConsoleOutput: true, // Remove console logs

            // Other Obfuscation
            numbersToExpressions: true,
            transformObjectKeys: true,

            // Build Settings
            log: false,
            sourceMap: false,
            seed: 0, // Use 0 for consistent builds, or remove for random builds
            // --- End of Aggressive Settings ---
          }
        })
      ]
    },
    emptyOutDir: true,
  },
  server: {
    open: true
  }
});