import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import WebpackObfuscator from 'webpack-obfuscator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the BASIC Obfuscation options for stability
const basicObfuscatorOptions = {
  compact: true,
  simplify: true,
  // Most features disabled to reduce potential conflicts
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false, // Keep logs for debugging
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,
  renameProperties: false,
  rotateStringArray: false,
  selfDefending: false,
  shuffleStringArray: false,
  splitStrings: false,
  stringArray: false,
  target: 'browser',
  transformObjectKeys: false,
  unicodeEscapeSequence: false
};

export default (env, argv) => {
  const isProduction = argv.mode === 'production';

  console.log(`Webpack mode: ${isProduction ? 'production' : 'development'}`);
  if (isProduction) {
    console.log("Applying BASIC JavaScript Obfuscation...");
  }

  return {
    mode: isProduction ? 'production' : 'development',
    // ENTRY POINT: Only bundle app.js and its direct imports
    entry: './assets/js/app.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      // Bundled JS output
      filename: 'assets/js/bundle.[contenthash].js',
      // Name for chunks dynamically imported *by the bundled code* (might not be used much here)
      chunkFilename: 'assets/js/chunk.[contenthash].js',
      // Asset module filename (less relevant if not importing assets in bundled JS)
      assetModuleFilename: 'assets/resources/[name].[contenthash][ext]',
      clean: true, // Clean dist/ before build
    },
    devtool: isProduction ? false : 'eval-source-map', // Source maps only for dev
    devServer: {
      static: './dist', // Serve files from dist
      open: true,
      hot: true, // Enable HMR for the bundled JS
      historyApiFallback: true, // For client-side routing
      port: 8080,
      // Watch the original assets and public folders for changes to trigger reloads
      watchFiles: {
          paths: ['public/**/*', 'assets/**/*'],
          options: {
              usePolling: false,
          },
      },
    },
    // MODULES: Define how Webpack processes files it encounters *during bundling*
    module: {
      rules: [
        // No CSS loader rules needed
        // No JS loader rules (like Babel) unless you need transpilation for compatibility
        // Rule for assets *if* they are directly imported in app.js or its bundled deps
        {
          test: /\.(png|svg|jpg|jpeg|gif|woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource', // Copies the file to output & provides URL
           generator: {
                // Try to place assets respecting original structure relative to 'assets'
               filename: (pathData) => {
                   const relativePath = path.relative(path.resolve(__dirname, 'assets'), pathData.filename);
                   return `assets/${relativePath.replace(/\\/g, '/')}`; // Ensure forward slashes
               },
           }
        },
      ],
    },
    // PLUGINS: Add extra capabilities
    plugins: [
      // Generates index.html and injects the main JS bundle
      new HtmlWebpackPlugin({
        template: './index.html', // Use your source index.html
        inject: 'body', // Inject the <script> tag into the <body>
      }),
      // Copies files/directories
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public', // Source: your public folder
            to: '.',        // Destination: root of dist/
            globOptions: {
              ignore: ['**/index.html'], // Don't copy index.html
            },
            noErrorOnMissing: true, // Don't break build if public is empty
          },
          {
            from: 'assets',    // Source: your entire assets folder
            to: 'assets',      // Destination: dist/assets/
            // IMPORTANT: Exclude the entry point JS and its dependencies that Webpack *is* bundling.
            // This prevents copying the source JS that gets bundled anyway.
            // We *keep* LibraryLoader.js etc. in the copied assets if app.js doesn't directly import them.
            globOptions: {
              // Adjust if your entry point or bundled chunks are different
              ignore: [
                  '**/js/app.js', // Ignore the main entry point source
                  // Add paths to other JS files *if* they are directly imported by app.js
                  // and thus included in the bundle. Chunks like LibraryLoader might
                  // be dynamically loaded by app.js (copied, not bundled), so don't ignore them here.
                  // Example: '**/js/chunks/auth.js' // Only if imported directly in app.js
              ],
            },
            noErrorOnMissing: true // Don't break build if assets is empty
          },
        ],
      }),
      // Apply obfuscation only in production
      isProduction && new WebpackObfuscator(basicObfuscatorOptions, [
         // Exclude specific files from obfuscation if necessary
         // 'chunk.xyz.js'
      ]),
    ].filter(Boolean), // Filter out null/false plugins (like obfuscator in dev)
    // OPTIMIZATION: Configure how output is optimized
    optimization: {
      minimize: isProduction, // Enable minification in production
      minimizer: [
        `...`, // Use Webpack's default JS minimizer (TerserPlugin)
               // No CSS minimizer needed
      ],
    },
    // RESOLVE: How modules are resolved (less critical here as we copy most JS)
    resolve: {
      extensions: ['.js', '.json'],
    },
    // PERFORMANCE: Hints about bundle sizes
    performance: {
       hints: isProduction ? 'warning' : false,
       maxEntrypointSize: isProduction ? 1024000 : 512000, // Larger limits
       maxAssetSize: isProduction ? 1024000 : 512000,
    },
    // EXTERNALS: Explicitly tell Webpack *not* to bundle Firebase.
    // This assumes LibraryLoader.js is fetching Firebase from a CDN.
    // Webpack will see `import 'firebase/...'` in the source code it bundles
    // and replace it with accessing the global `firebase` object.
    // If LibraryLoader *doesn't* use `import`, but relies purely on `fetch` + `eval`
    // or script tags, you might not even need `externals`. But it's safer to include it.
    externals: {
       'firebase/app': 'firebase',
       'firebase/auth': 'firebase',
       'firebase/database': 'firebase',
       'firebase/firestore': 'firebase',
       // Add other firebase modules if LibraryLoader imports them explicitly
    },
    // TARGET: Ensure output is browser-compatible
    target: 'web',
  };
};