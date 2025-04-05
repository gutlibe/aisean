import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';
import { resolve } from 'path';
import fs from 'fs';

// Utility to ensure directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Plugin to handle CSS properly
const cssPlugin = () => {
  return {
    name: 'vite-plugin-css-handler',
    generateBundle(options, bundle) {
      // Look for CSS files in the bundle
      Object.keys(bundle).forEach(key => {
        const asset = bundle[key];
        if (key.endsWith('.css')) {
          // Rename asset with proper path
          const newFileName = `assets/css/${asset.name || 'style'}${asset.fileName.includes('.') ? '.' + asset.fileName.split('.').pop() : ''}`;
          asset.fileName = newFileName;
        }
      });
    }
  };
};

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser', // Using terser for better JS minification
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    cssMinify: 'lightningcss', // Use lightningcss for CSS minification
    cssCodeSplit: true, // Enable code splitting for CSS
    assetsInlineLimit: 4096, // Only inline assets smaller than 4KB
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        // Organize JS files
        entryFileNames: `assets/js/[name].[hash].js`,
        chunkFileNames: `assets/js/chunks/[name].[hash].js`,
        // Organize all other assets (including CSS)
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return `assets/img/[name].[hash].[ext]`;
          }
          
          if (/\.(css)$/i.test(assetInfo.name)) {
            return `assets/css/[name].[hash].[ext]`;
          }
          
          if (/\.(woff|woff2|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `assets/fonts/[name].[hash].[ext]`;
          }
          
          return `assets/[ext]/[name].[hash].[ext]`;
        },
        // Prevent mangling of certain variable names if needed
        manualChunks: (id) => {
          // Separate chunks for better caching
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          
          // Split your app code into logical chunks
          if (id.includes('/core/')) {
            return 'core';
          }
          if (id.includes('/chunks/')) {
            return 'app-chunks';
          }
          // Add more conditions as needed
        }
      },
      // Preserve system-critical variable names (if any)
      preserveEntrySignatures: 'strict', 
    }
  },
  plugins: [
    // Custom CSS handling
    cssPlugin(),
    
    // Post-build cleanup and organizing hook
    {
      name: 'post-build',
      closeBundle: async () => {
        // Ensure required directories exist
        ensureDir('./dist/assets/css');
        ensureDir('./dist/assets/js');
        ensureDir('./dist/assets/img');
      }
    },
    
    // JavaScript obfuscation with balanced settings
    {
      ...javascriptObfuscator({
        include: ["**/assets/js/**/*.js"],
        exclude: ["node_modules/**"],
        options: {
          // More balanced obfuscation settings
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.5, // Reduced from 0.9 for better performance
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.3, // Reduced from 0.6 for better performance
          debugProtection: false,
          disableConsoleOutput: true,
          identifierNamesGenerator: 'hexadecimal',
          log: false,
          numbersToExpressions: true,
          renameGlobals: false,
          selfDefending: true,
          simplify: true,
          splitStrings: true,
          splitStringsChunkLength: 10, // Reduced from 15
          stringArray: true,
          stringArrayCallsTransform: true,
          stringArrayEncoding: ['base64'],
          stringArrayIndexShift: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayWrappersCount: 2, // Reduced from 3
          stringArrayWrappersChainedCalls: true,
          stringArrayWrappersParametersMaxCount: 3, // Reduced from 5
          stringArrayWrappersType: 'function',
          stringArrayThreshold: 0.75, // Reduced from 0.9
          transformObjectKeys: true,
          unicodeEscapeSequence: false,
          target: 'browser',
          sourceMap: false,
        }
      }),
      apply: 'build', // Only apply in production builds
    }
  ],
  css: {
    // Use Lightning CSS for proper minification
    transformer: 'lightningcss',
    lightningcss: {
      drafts: {
        customMedia: true,
      },
      include: /\.css$/,
      exclude: /node_modules/,
      // Browser targeting
      browserslist: '> 0.25%, not dead',
    },
    // Make sure we don't break sourcemaps
    devSourcemap: true,
  },
  // Development server config
  server: {
    open: true,
    watch: {
      usePolling: true,
    }
  }
});