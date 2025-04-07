import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

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
    log: false,
    numbersToExpressions: true,
    renameGlobals: true,
    renameProperties: true,
    renamePropertiesMode: 'unsafe', // Most aggressive, TEST THOROUGHLY! Revert to 'safe' if build breaks.
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
    transformTemplateLiterals: true, // Essential for HTML templates
    unicodeEscapeSequence: true,
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
                assetFileNames: `assets/[ext]/[name].[hash].[ext]`
            },
            plugins: [
                javascriptObfuscator({
                    include: [/\.[cm]?js$/], // Target JS files during build
                    exclude: [/node_modules/],
                    options: obfuscatorOptions,
                    enforce: 'post', // Run after other plugins
                })
            ]
        }
    },
    server: {
        open: true
    }
});