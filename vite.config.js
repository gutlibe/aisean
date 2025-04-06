import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: true,
  renameProperties: true,
  renamePropertiesMode: 'safe',
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 3,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: true
};

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: { main: 'index.html' },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`,
        preserveModules: true,
        preserveEntrySignatures: 'allow-extension' // Critical fix
      },
      plugins: [
        javascriptObfuscator({
          include: ["assets/js/**/*.js"], // Match your actual source path
          exclude: ["node_modules/**"],
          options: obfuscatorOptions
        })
      ]
    }
  },
  server: { open: true }
});