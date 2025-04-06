import { defineConfig } from 'vite';
// Try importing the default export or a specific named export if 'default' doesn't work
// Common patterns are { obfuscator } or just the default import.
// Let's assume it's the default export based on common plugin patterns.
import obfuscatorPlugin from 'vite-plugin-obfuscator'; // Using a different variable name for clarity
import path from 'path';

// Basic options for testing stability
const basicObfuscatorOptions = {
   compact: true, simplify: true, controlFlowFlattening: false,
   deadCodeInjection: false, debugProtection: false, disableConsoleOutput: false,
   identifierNamesGenerator: 'hexadecimal', log: false, numbersToExpressions: false,
   renameGlobals: false, renameProperties: false, rotateStringArray: false,
   selfDefending: false, shuffleStringArray: false, splitStrings: false,
   stringArray: false, target: 'browser', transformObjectKeys: false,
   unicodeEscapeSequence: false
};

// Your full options (commented out for now)
/*
const fullObfuscatorOptions = {
   // ... your full options ...
};
*/

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  console.log(`Vite running in ${command} mode.`);
  // Select options (start with basic)
  const currentObfuscatorOptions = basicObfuscatorOptions;

  if (isBuild) {
      console.log(`Applying ${currentObfuscatorOptions === basicObfuscatorOptions ? 'BASIC' : 'FULL'} Obfuscation via Vite plugin...`);
  }

  return {
    root: '.',
    publicDir: 'public',
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        input: { main: 'index.html' },
        output: {
          entryFileNames: `assets/js/[name].[hash].js`,
          chunkFileNames: `assets/js/[name].[hash].js`,
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name?.split('.').pop() ?? '';
            if (/\.(css)$/.test(assetInfo.name ?? '')) {
              return `assets/css/[name].[hash][extname]`;
            }
            if (/\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.name ?? '')) {
                return `assets/img/[name].[hash][extname]`;
            }
            if (/\.(woff|woff2|eot|ttf|otf)$/.test(assetInfo.name ?? '')) {
                 return `assets/fonts/[name].[hash][extname]`;
            }
            return `assets/[ext]/[name].[hash][extname]`;
          },
        },
      },
    },
    plugins: [
      // Use the imported plugin variable correctly
      isBuild ? obfuscatorPlugin({ // <--- Use the imported variable name
        options: currentObfuscatorOptions,
        apply: 'build',
        exclude: [
             /node_modules/,
             path.resolve(__dirname, 'assets/js/chunks/LibraryLoader.js'),
        ],
      }) : null,
    ].filter(Boolean),
    css: {},
    server: {
      open: true,
    },
  }
});