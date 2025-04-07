import { defineConfig } from 'vite';
import { obfuscator } from 'rollup-obfuscator';

export default defineConfig({
  plugins: [
    obfuscator({
      optionsPreset: 'medium-obfuscation',
      sourceMap: false,
      exclude: ['node_modules/**']
    })
  ],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/[name].[hash].js`,
        assetFileNames: `assets/[ext]/[name].[hash].[ext]`
      },
      // Manual chunking to split files
      manualChunks: (id) => {
        if (id.includes('assets/js/chunks')) {
          // Extract the filename (e.g., 'auth' from 'auth.js')
          const fileName = id.split('/').pop().replace('.js', '');
          return fileName; // e.g., 'auth', 'router'
        }
        if (id.includes('assets/js/core')) {
          return 'core'; // Group core files into a 'core' chunk
        }
        if (id.includes('assets/js/pages')) {
          // Split pages into sub-chunks based on directory
          const parts = id.split('/pages/')[1].split('/');
          if (parts.length > 1) {
            return `pages-${parts[0]}-${parts[1].replace('.js', '')}`; // e.g., 'pages-admin-dashboard'
          }
        }
        // Default: bundle into 'vendor' or leave as entry
        if (id.includes('node_modules')) {
          return 'vendor';
        }
      }
    }
  },
  css: {
    preprocessorOptions: {}
  },
  server: {
    open: true
  }
});