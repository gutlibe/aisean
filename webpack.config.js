import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import WebpackObfuscator from 'webpack-obfuscator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  console.log(`Running in ${isProduction ? 'production' : 'development'} mode`);
  if (isProduction) {
      console.log("Applying Obfuscation...");
  }

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './assets/js/app.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'assets/js/[name].[contenthash].js',
      chunkFilename: 'assets/js/[name].[contenthash].js',
      assetModuleFilename: 'assets/[name].[contenthash][ext]',
      clean: true,
    },
    devtool: isProduction ? false : 'eval-source-map',
    devServer: {
      static: './dist',
      open: true,
      hot: true,
      historyApiFallback: true,
      port: 8080,
      watchFiles: ['public/**/*', 'assets/**/*'], // Watch all assets
    },
    module: {
      rules: [
        // No CSS rules - CSS will be copied as-is
        { // Rule to handle assets referenced in JS/HTML if any
          test: /\.(png|svg|jpg|jpeg|gif|woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
           generator: {
               // Keep original structure within assets folder
               filename: 'assets/[path][name][ext]'
           }
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: 'body',
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public', // Copies content of public/ to dist/
            to: '.',
            globOptions: {
              ignore: ['**/index.html'], // Handled by HtmlWebpackPlugin
            },
          },
          {
            from: 'assets',    // Copy the *entire* assets directory
            to: 'assets',      // To dist/assets
            globOptions: {
              // Ignore JS files because Webpack bundles them
              ignore: ['**/js/**'],
            },
            noErrorOnMissing: true // Don't error if assets dir is empty initially
          },
        ],
      }),
      // Obfuscator plugin (production only)
      isProduction && new WebpackObfuscator(obfuscatorOptions, []),
    ].filter(Boolean),
    optimization: {
      minimize: isProduction, // Only minimize JS (Terser is default)
      minimizer: [
        `...`, // Keep default JS minimizer
        // No CssMinimizerPlugin needed
      ],
    },
    resolve: {
      extensions: ['.js', '.json'],
    },
    performance: {
       hints: isProduction ? 'warning' : false,
       maxEntrypointSize: isProduction ? 1024000 : 512000,
       maxAssetSize: isProduction ? 1024000 : 512000,
    },
  };
};