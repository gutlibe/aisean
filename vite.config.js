import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

export default defineConfig({
  // Root directory where index.html is located
  root: '.',

  // Directory for static assets that should be copied directly to the build output root
  // Your CSS and images MUST be moved here: public/assets/css and public/assets/img
  publicDir: 'public',

  build: {
    // Output directory
    outDir: 'dist',
    // Disable Vite's source maps for production
    sourcemap: false,
    // Disable Vite's default CSS handling as we manage it manually
    cssCodeSplit: false,
    assetsInlineLimit: 0, // Don't inline assets

    rollupOptions: {
      input: {
        // Entry point
        main: 'index.html'
      },
      output: {
        // Hashed JS file names
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        // Asset file names (excluding CSS, which is copied via publicDir)
        // Applies to fonts, etc., if processed by Rollup
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`,
      },
      plugins: [
        // Obfuscator Plugin targeting ONLY your JS files
        javascriptObfuscator({
          include: ["**/assets/js/**/*.js"], // Process files in assets/js/**
          exclude: ["node_modules/**"],     // Ignore dependencies

          // BALANCED OBFUSCATION OPTIONS (Harder but more performant than max)
          options: {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75, // Slightly reduced threshold
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4, // Slightly reduced threshold
            debugProtection: false, // Keep false unless specifically needed
            debugProtectionInterval: 0,
            disableConsoleOutput: true, // Good deterrent
            identifierNamesGenerator: 'hexadecimal', // Makes reading hard
            log: false,
            numbersToExpressions: true, // Obscures numbers
            renameGlobals: false, // Safer default
            selfDefending: true, // Adds resilience
            simplify: true,
            splitStrings: true, // Breaks up strings
            splitStringsChunkLength: 12, // Moderate chunk length
            stringArray: true, // Central array for strings
            stringArrayCallsTransform: true,
            stringArrayEncoding: ['base64'], // Base64 is safer than rc4
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 2, // Reduced number of wrappers
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 4, // Reduced parameter count
            stringArrayWrappersType: 'function',
            stringArrayThreshold: 0.8, // Apply to most strings
            transformObjectKeys: true, // Renames object keys
            unicodeEscapeSequence: false, // Avoid unnecessary escaping
            target: 'browser',
            sourceMap: false, // No sourcemaps for obfuscated code
          }
        })
      ]
    }
  },
  // Explicitly disable Vite's CSS transformer if needed, although publicDir should handle it
  css: {
    transformer: 'postcss', // Use standard postcss, or remove if causing issues
  },
  server: {
    // For local development
    open: true
  }
});