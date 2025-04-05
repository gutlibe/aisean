import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

export default defineConfig({
  root: '.',
  publicDir: 'public', // This is your top-level public dir, copied as-is
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
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
          if (assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name].[ext]';
          }
          return `assets/[ext]/[name].[hash].[ext]`;
        },
      },
      plugins: [
        javascriptObfuscator({
          // --- CORRECTED PATH ---
          // Target all JS files within your source 'assets/js/' directory
          include: ["assets/js/**/*.js"],
          // ----------------------
          exclude: ["node_modules/**"], // Keep excluding node_modules
          options: {
            // Your extensive obfuscation options here...
            compact: true,
            simplify: true,
            target: 'browser',
            log: false,
            renameGlobals: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 1,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.7,
            selfDefending: true,
            identifierNamesGenerator: 'mangled',
            identifiersPrefix: '_0x',
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
            reservedStrings: [
              '\\.css$',
              '\\/assets\\/css\\/'
            ],
            numbersToExpressions: true,
            disableConsoleOutput: true,
            transformObjectKeys: true,
            debugProtection: true,
            debugProtectionInterval: 4000,
            sourceMap: false,
            seed: Math.random() * 10000000,
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