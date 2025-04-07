import { defineConfig } from 'vite';
import { obfuscate } from 'javascript-obfuscator';

const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: true,
  renameProperties: true,
  renamePropertiesMode: 'unsafe',
  selfDefending: true,
  splitStrings: true,
  splitStringsChunkLength: 3,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 0.5,
  transformTemplateLiterals: true,
  unicodeEscapeSequence: true
};

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: false, // Important: Disable default minification
    rollupOptions: {
      input: { main: 'index.html' },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`,
        manualChunks: undefined // Let Rollup decide chunking
      },
      plugins: [{
        name: 'custom-obfuscation',
        renderChunk(code) {
          const result = obfuscate(code, obfuscatorOptions);
          return result.getObfuscatedCode();
        }
      }]
    }
  }
});
