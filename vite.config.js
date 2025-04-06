import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

export default defineConfig({
  root: '.',
  publicDir: 'public', // Ensure assets/img is moved here -> public/assets/img

  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for production/obfuscation

    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        // Hashed filenames for JS (entry and chunks)
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        // Hashed filenames for other assets (like CSS)
        // CSS will be output as separate files in dist/assets/css/
        assetFileNames: (assetInfo) => {
          // Separate CSS into its own folder structure
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name].[hash].[ext]';
          }
          // Handle other assets like fonts or images processed by rollup
          return 'assets/[ext]/[name].[hash].[ext]';
        },
      },
      plugins: [
        // Obfuscator plugin - configured to ONLY target your JS
        javascriptObfuscator({
          include: ["**/assets/js/**/*.js"], // IMPORTANT: Target only your JS files
          exclude: ["node_modules/**"],     // Exclude dependencies

          // Strong Obfuscation Options (Test Thoroughly!)
          options: {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.9,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.6,
            debugProtection: false,
            debugProtectionInterval: 0,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: true,
            renameGlobals: false, // Safer
            selfDefending: true,
            simplify: true,
            splitStrings: true,
            splitStringsChunkLength: 15,
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayEncoding: ['base64'],
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 3,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 5,
            stringArrayWrappersType: 'function',
            stringArrayThreshold: 0.9,
            transformObjectKeys: true,
            unicodeEscapeSequence: false,
            target: 'browser',
            sourceMap: false, // Ensure no sourcemap for obfuscated code
          }
        })
      ]
    }
  },
  server: {
    open: true
  }
});