// vite.config.js
import { defineConfig } from 'vite';
// Import the Vite-specific plugin
import { javascriptObfuscator } from 'vite-plugin-javascript-obfuscator';

// Keep the same aggressive options
const obfuscatorOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 1,
    debugProtection: true,
    debugProtectionInterval: 4000,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false, // Set to true temporarily if you need verbose logs from the obfuscator itself
    numbersToExpressions: true,
    renameGlobals: true,
    renameProperties: true,
    renamePropertiesMode: 'unsafe', // Still the most aggressive - TEST CAREFULLY!
    rotateStringArray: true,
    selfDefending: true,
    shuffleStringArray: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 2,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 1,
    stringArrayEncoding: ['rc4'],
    stringArrayIndexesType: ['hexadecimal-number'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayThreshold: 1,
    target: 'browser',
    transformObjectKeys: true,
    transformTemplateLiterals: true, // Still crucial
    unicodeEscapeSequence: true,
};

export default defineConfig({
    root: '.',
    publicDir: 'public',
    // Add the plugin to the main plugins array
    plugins: [
        // Add other Vite plugins here if you have any (e.g., vue(), react())
        javascriptObfuscator({
            options: obfuscatorOptions,
            // Apply only during the 'build' command
            apply: 'build',
            // Optional: You might experiment with 'include' and 'exclude' here too,
            // but the default often works better with Vite plugins.
            // include: ["**/*.js"], // Example: If needed, adjust pattern
            // exclude: [/node_modules/],
        })
    ],
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
                assetFileNames: `assets/[ext]/[name].[hash].[ext]`
            },
            // Remove the obfuscator from rollupOptions.plugins
            plugins: []
        }
    },
    server: {
        open: true
    }
});