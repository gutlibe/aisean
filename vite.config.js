import { defineConfig } from 'vite';
// Change the import style: Use a default import
import vitePluginJavascriptObfuscator from 'vite-plugin-javascript-obfuscator';

// Obfuscator options remain the same
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
    renamePropertiesMode: 'unsafe',
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
    transformTemplateLiterals: true,
    unicodeEscapeSequence: true,
};

export default defineConfig({
    root: '.',
    publicDir: 'public',
    plugins: [
        // Use the default import variable here
        vitePluginJavascriptObfuscator({
            options: obfuscatorOptions,
            apply: 'build',
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
            plugins: []
        }
    },
    server: {
        open: true
    }
});