import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import WebpackObfuscator from 'webpack-obfuscator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// *** Simplified Obfuscation Options ***
const basicObfuscatorOptions = {
  compact: true, // Minifies code like a basic minifier
  // controlFlowFlattening: false, // Disabled
  // deadCodeInjection: false, // Disabled
  debugProtection: false, // Disabled for easier debugging if needed
  debugProtectionInterval: 0, // Disabled
  disableConsoleOutput: false, // Keep console logs for easier debugging
  // identifierNamesGenerator: 'hexadecimal', // Keep simple names initially
  log: false,
  numbersToExpressions: false, // Disabled
  // renameGlobals: false, // Disabled - Less likely to break global dependencies
  // renameProperties: false, // Disabled - Less likely to break property access
  rotateStringArray: false, // Not using string array
  // selfDefending: false, // Disabled
  shuffleStringArray: false, // Not using string array
  simplify: true, // Basic simplification
  splitStrings: false, // Disabled
  // stringArray: false, // Disabled - Major simplification
  // stringArrayEncoding: [], // Disabled
  // stringArrayThreshold: 0, // Disabled
  target: 'browser',
  // transformObjectKeys: false, // Disabled
  unicodeEscapeSequence: false // Disabled - Improves readability slightly
};

export default (env, argv) => {
  const isProduction = argv.mode === 'production';

  console.log(`Running Webpack in ${isProduction ? 'production' : 'development'} mode`);
  if (isProduction) {
      console.log("Applying BASIC JavaScript Obfuscation...");
  }

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './assets/js/app.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'assets/js/[name].[contenthash].js',
      chunkFilename: 'assets/js/[name].[contenthash].js',
      assetModuleFilename: 'assets/[path][name].[contenthash][ext]',
      clean: true,
    },
    devtool: isProduction ? false : 'eval-source-map',
    devServer: {
      static: './dist',
      open: true,
      hot: true,
      historyApiFallback: true,
      port: 8080,
      watchFiles: ['public/**/*', 'assets/**/*'],
    },
    module: {
      rules: [
        {
          test: /\.(png|svg|jpg|jpeg|gif|woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
           generator: {
               filename: (pathData) => {
                   const relativePath = path.relative(path.resolve(__dirname, 'assets'), pathData.filename);
                   return `assets/${relativePath.replace(/\\/g, '/')}`; // Ensure forward slashes
               },
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
            from: 'public',
            to: '.',
            globOptions: {
              ignore: ['**/index.html'],
            },
            noErrorOnMissing: true,
          },
          {
            from: 'assets',
            to: 'assets',
            globOptions: {
              ignore: ['**/js/**'],
            },
            noErrorOnMissing: true
          },
        ],
      }),
      isProduction && new WebpackObfuscator(basicObfuscatorOptions, [
          // Exclude files here if needed, e.g., specific vendor chunks
      ]),
    ].filter(Boolean),
    optimization: {
      minimize: isProduction, // Use Terser for basic JS minification
      minimizer: [
        `...`, // Default TerserPlugin
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