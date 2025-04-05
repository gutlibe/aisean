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
    // Remove terser minification since it's not installed
    minify: false,
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
          // Don't process CSS files - just copy them
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name].[ext]';
          }
          return `assets/[ext]/[name].[hash].[ext]`;
        },
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
            renameGlobals: true,
            
            // --- Obfuscation Strength (Maximum) ---
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 1,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.7,
            selfDefending: true,
            
            // --- Identifier/Variable Naming ---
            identifierNamesGenerator: 'mangled',
            identifiersPrefix: '_0x',
            
            // --- String Manipulation (Maximum Obfuscation) ---
            stringArray: true,
            stringArrayThreshold: 1,
            splitStrings: true,
            splitStringsChunkLength: 3,
            stringArrayEncoding: ['rc4'],
            stringArrayWrappersCount: 5,
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
            transformObjectKeys: true, // Now only appears once
            debugProtection: true,
            debugProtectionInterval: 4000,
            sourceMap: false,
            seed: Math.random() * 10000000,
          }
        })
      ]
    },
    // Copy CSS files directly without processing them
    emptyOutDir: true, // Make sure dist is clean before building
  },
  server: {
    open: true
  }
});