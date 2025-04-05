import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

export default defineConfig({
  root: '.',
  publicDir: 'public', // This is your top-level public dir, copied as-is
  build: {
    outDir: 'dist',
    sourcemap: false, // Ensure sourcemaps are off for obfuscation effectiveness
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    minify: false, // Let the obfuscator handle minification/compacting if needed
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
          // Ensure other assets get hashes for cache busting
          return `assets/[ext]/[name].[hash].[ext]`;
        },
      },
      plugins: [
        javascriptObfuscator({
          // Target all JS files within your source 'assets/js/' directory
          include: ["assets/js/**/*.js"],
          exclude: ["node_modules/**"], // Keep excluding node_modules
          options: {
            // --- Stronger Obfuscation Settings ---

            // Compacting & Simplification
            compact: true,
            simplify: true,

            // Target Environment
            target: 'browser',

            // Renaming (Crucial for making variables hard to understand)
            identifierNamesGenerator: 'mangled', // Use short mangled names (a, b, c...)
            renameGlobals: true, // Attempt to rename global variables and functions
            // renameProperties: true, // !!! USE WITH CAUTION !!! Renames object properties. Can break code if properties are accessed dynamically (e.g., obj['propName']). Set to false if issues arise.
            // renamePropertiesMode: 'safe', // Or 'unsafe' for more renaming, but higher risk

            // Control Flow Obfuscation
            controlFlowFlattening: true, // Obscures program flow
            controlFlowFlatteningThreshold: 1, // Apply flattening aggressively

            // Code "Noise"
            deadCodeInjection: true, // Adds unused code blocks
            deadCodeInjectionThreshold: 1, // Inject dead code aggressively

            // String Obfuscation (Very Important)
            stringArray: true, // Move strings to an array
            stringArrayThreshold: 1, // Affect nearly all strings
            stringArrayEncoding: ['rc4'], // Encode the string array (rc4 or base64)
            stringArrayWrappersCount: 5, // Increase wrappers around string array access
            stringArrayWrappersType: 'function', // Use functions for wrappers (slightly harder to analyze)
            stringArrayWrappersChainedCalls: true, // Chain wrapper calls
            stringArrayRotate: true, // Rotate the string array
            stringArrayShuffle: true, // Shuffle the array initially
            splitStrings: true, // Split strings into smaller parts
            splitStringsChunkLength: 5, // Adjust chunk length as needed
            unicodeEscapeSequence: true, // Convert strings to unicode escape sequences

             // Prevent critical strings (like CSS paths) from being obfuscated
            reservedStrings: [
              '\\.css$', // Regex for anything ending in .css
              '\\/assets\\/css\\/', // Regex for the CSS asset path
              'page-content', // DOM IDs might be needed
              'page-header',
              'menu-toggle',
              'back-arrow',
              // Add any other strings that MUST NOT be changed (e.g., DOM IDs used in querySelector)
            ],

            // Other Obfuscation Techniques
            numbersToExpressions: true, // Converts numbers like 123 to complex expressions
            transformObjectKeys: true, // Renames keys in object literals

            // Anti-Tampering / Anti-Debugging
            selfDefending: true, // Makes the code resist modifications
            debugProtection: true, // Adds anti-debugging measures
            debugProtectionInterval: 4000, // Re-inserts anti-debugging code periodically (ms)
            disableConsoleOutput: true, // Disables console.log, console.warn etc.

            // Build Options
            log: false, // Don't log obfuscation details during build
            sourceMap: false, // Keep disabled
            seed: 0, // Use a fixed seed for consistent builds (or remove for random seed each time)

            // --- End of Stronger Obfuscation Settings ---
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