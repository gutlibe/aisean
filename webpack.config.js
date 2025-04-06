import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import WebpackObfuscator from 'webpack-obfuscator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Obfuscation options (ensure this is complete from your original)
const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: true,
  domainLock: [],
  domainLockRedirectUrl: 'about:blank',
  forceTransformStrings: [],
  identifierNamesCache: null,
  identifierNamesGenerator: 'hexadecimal',
  identifiersDictionary: [],
  identifiersPrefix: '',
  ignoreImports: false,
  inputFileName: '',
  log: false,
  numbersToExpressions: false,
  optionsPreset: 'default',
  renameGlobals: true,
  renameProperties: true,
  renamePropertiesMode: 'safe',
  reservedNames: [],
  reservedStrings: [],
  seed: 0,
  selfDefending: true,
  simplify: true,
  sourceMap: false,
  sourceMapBaseUrl: '',
  sourceMapFileName: '',
  sourceMapMode: 'separate',
  sourceMapSourcesMode: 'sources-content',
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['base64'],
  stringArrayIndexesType: ['hexadecimal-number'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.75,
  target: 'browser',
  transformObjectKeys: true,
  unicodeEscapeSequence: true
};

export default (env, argv) => {
  const isProduction = argv.mode === 'production';

  console.log(`Running Webpack in ${isProduction ? 'production' : 'development'} mode`);
  if (isProduction) {
      console.log("Applying JavaScript Obfuscation...");
  }

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './assets/js/app.js', // Your main JS entry point
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'assets/js/[name].[contenthash].js', // Hashed JS bundles
      chunkFilename: 'assets/js/[name].[contenthash].js', // Hashed JS chunks
      assetModuleFilename: 'assets/[path][name].[contenthash][ext]', // Keep original asset paths
      clean: true, // Clean dist before build
    },
    devtool: isProduction ? false : 'eval-source-map',
    devServer: {
      static: './dist', // Serve from dist
      open: true,
      hot: true,
      historyApiFallback: true, // For client-side routing
      port: 8080,
      watchFiles: ['public/**/*', 'assets/**/*'], // Watch source assets & public
    },
    module: {
      rules: [
        // We only need rules for assets Webpack might encounter during JS bundling
        // or if you import assets directly in JS.
        {
          test: /\.(png|svg|jpg|jpeg|gif|woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource', // Copies the asset and provides the URL
           generator: {
                // Place assets in their respective folders within dist/assets
               filename: (pathData) => {
                   const relativePath = path.relative(path.resolve(__dirname, 'assets'), pathData.filename);
                   return `assets/${relativePath}`;
               },
           }
        },
        // Add JS loaders (like Babel) here if needed for compatibility
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html', // Your HTML template
        inject: 'body', // Inject JS bundle into body
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public', // Copy everything from public to dist root
            to: '.',
            globOptions: {
              ignore: ['**/index.html'], // Ignore index.html (HtmlWebpackPlugin handles it)
            },
            noErrorOnMissing: true, // Don't fail if public dir is missing/empty
          },
          {
            from: 'assets',    // Copy the entire assets directory
            to: 'assets',      // To dist/assets
            globOptions: {
              // CRITICAL: Ignore the JS directory, as Webpack handles JS bundling
              ignore: ['**/js/**'],
            },
            noErrorOnMissing: true
          },
        ],
      }),
      // Conditionally add Obfuscator plugin for production builds
      isProduction && new WebpackObfuscator(obfuscatorOptions, [
          // Optional: Exclude specific files/chunks if obfuscation breaks them
          // 'vendors.js' // Example if you had vendor chunking
      ]),
    ].filter(Boolean), // Removes falsy entries (like the obfuscator in dev)
    optimization: {
      minimize: isProduction, // Enable JS minification in production (Terser is default)
      minimizer: [
        `...`, // Use Webpack's default minimizers (TerserPlugin for JS)
        // No CSS minimizer needed here
      ],
    },
    resolve: {
      extensions: ['.js', '.json'], // Allow importing .js files without the extension
    },
    performance: {
       hints: isProduction ? 'warning' : false,
       maxEntrypointSize: isProduction ? 1024000 : 512000, // Adjust as needed
       maxAssetSize: isProduction ? 1024000 : 512000,
    },
  };
};