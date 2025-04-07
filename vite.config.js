// vite.config.js
import { defineConfig } from 'vite';
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

// Define obfuscator options separately for clarity
const obfuscatorOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1, // Maximize flattening
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 1, // Maximize dead code
    debugProtection: true, // Add anti-debugging measures
    debugProtectionInterval: 4000, // Anti-debugging interval
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal', // 'mangled' is shorter, 'hexadecimal' looks more obfuscated
    log: false,
    numbersToExpressions: true, // Obfuscate numbers
    renameGlobals: true, // Be careful if you rely on specific global names interacting with external scripts
    renameProperties: true, // Aggressive renaming (can break code if not careful)
    // renamePropertiesMode: 'safe', // Start with 'safe', consider 'unsafe' for MAX obfuscation but test thoroughly
    renamePropertiesMode: 'unsafe', // TRY THIS FOR MAX OBFUSCATION, BUT TEST CAREFULLY! It *can* break things.
    rotateStringArray: true, // Alias for stringArrayRotate
    selfDefending: true,
    shuffleStringArray: true, // Alias for stringArrayShuffle
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 2, // Make chunks very small
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 1, // Always transform calls
    stringArrayEncoding: ['rc4'], // Use rc4 or base64. rc4 is generally stronger obfuscation.
    stringArrayIndexesType: ['hexadecimal-number'],
    stringArrayIndexShift: true, // Shifts indices
    stringArrayRotate: true, // Rotates the array on access
    stringArrayShuffle: true, // Shuffles the array initially
    stringArrayThreshold: 1, // Process all strings meeting criteria
    target: 'browser', // Ensure browser compatibility
    transformObjectKeys: true, // Obfuscate object keys where possible
    transformTemplateLiterals: true, // ***** CRITICAL FOR HTML TEMPLATES *****
    unicodeEscapeSequence: true, // Obfuscate strings using unicode escapes
    // reservedStrings: [], // Keep empty as requested
    // reservedNames: [] // Add any variable/function names you MUST preserve
};

export default defineConfig({
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        sourcemap: false, // Keep false for production obfuscation
        cssCodeSplit: false, // As per your original config
        assetsInlineLimit: 0, // As per your original config
        rollupOptions: {
            input: { main: 'index.html' },
            output: {
                entryFileNames: `assets/js/[name].[hash].js`,
                chunkFileNames: `assets/js/[name].[hash].js`,
                assetFileNames: `assets/[ext]/[name].[hash].[ext]`
            },
            plugins: [
                // Apply obfuscation AFTER Rollup has processed the chunks
                // but BEFORE final code generation.
                javascriptObfuscator({
                    // *** KEY CHANGE HERE: Use a RegEx to target JS files during the build process ***
                    // This will match .js, .mjs, .cjs files.
                    include: [/\.[cm]?js$/],
                    exclude: [/node_modules/], // Exclude node_modules more reliably
                    options: obfuscatorOptions,
                    // Ensure it runs at the end of the Rollup build pipeline
                    enforce: 'post',
                })
            ]
        }
    },
    server: {
        open: true
    }
});
