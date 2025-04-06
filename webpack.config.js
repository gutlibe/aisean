import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import WebpackObfuscator from 'webpack-obfuscator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic Obfuscation Options (as before)
const basicObfuscatorOptions = {
  compact: true, simplify: true, controlFlowFlattening: false,
  deadCodeInjection: false, debugProtection: false, disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal', log: false, numbersToExpressions: false,
  renameGlobals: false, renameProperties: false, rotateStringArray: false,
  selfDefending: false, shuffleStringArray: false, splitStrings: false,
  stringArray: false, target: 'browser', transformObjectKeys: false,
  unicodeEscapeSequence: false
};

export default (env, argv) => {
  const isProduction = argv.mode === 'production';

  console.log(`Webpack mode: ${isProduction ? 'production' : 'development'}`);
  if (isProduction) {
      console.log("Applying BASIC JavaScript Obfuscation (excluding LibraryLoader)...");
  }

  return {
    mode: isProduction ? 'production' : 'development',
    // Entry point - Webpack starts bundling from here
    entry: './assets/js/app.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'assets/js/bundle.[contenthash].js',
      chunkFilename: 'assets/js/chunk.[contenthash].js',
      assetModuleFilename: (pathData) => {
          const relativePath = path.relative(path.resolve(__dirname, 'assets'), pathData.filename);
          return `assets/${relativePath.replace(/\\/g, '/')}`;
      },
      clean: true,
    },
    devtool: isProduction ? false : 'eval-source-map',
    devServer: {
      static: './dist', open: true, hot: true, historyApiFallback: true, port: 8080,
      watchFiles: { paths: ['public/**/*', 'assets/**/*'], options: { usePolling: false } },
    },
    // ** Crucial: Tell Webpack Firebase is external **
    // This prevents Webpack from trying to bundle Firebase itself, letting
    // your unmodified LibraryLoader handle it (via CDN fetch, etc.)
    externalsType: 'global',
    externals: {
      'firebase/app': 'firebase',
      'firebase/auth': 'firebase',
      'firebase/database': 'firebase',
      'firebase/firestore': 'firebase',
    },
    module: {
      rules: [
        { // Rule for assets potentially imported by bundled JS
          test: /\.(png|svg|jpg|jpeg|gif|woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
           generator: {
               filename: (pathData) => {
                   const relativePath = path.relative(path.resolve(__dirname, 'assets'), pathData.filename);
                   return `assets/${relativePath.replace(/\\/g, '/')}`;
               },
           }
        },
        // No CSS loaders needed
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: './index.html', inject: 'body' }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'public', to: '.', globOptions: { ignore: ['**/index.html'] }, noErrorOnMissing: true },
          {
            from: 'assets',
            to: 'assets',
            globOptions: {
              // ** IMPORTANT: Ignore ALL JS source files in the copy **
              // Webpack handles bundling JS starting from app.js.
              // We don't want to copy the original .js files from assets/js.
              ignore: ['**/js/**'],
            },
            noErrorOnMissing: true
          },
        ],
      }),
      // ** Obfuscator with Exclusion **
      isProduction && new WebpackObfuscator(
        basicObfuscatorOptions,
        [
            // ** Exclude LibraryLoader.js source file from obfuscation **
            // Use path.resolve for reliability across environments
            path.resolve(__dirname, 'assets/js/chunks/LibraryLoader.js'),

            // You could also try excluding based on chunk name if LibraryLoader
            // consistently ends up in a specific chunk, but excluding the source
            // file path is generally more direct.
            // Example: '**/chunk.LibraryLoader.*.js' // Might need adjustment
        ]
      ),
    ].filter(Boolean),
    optimization: {
      minimize: isProduction, // Terser minification for JS
      minimizer: [ `...` ],
    },
    resolve: { extensions: ['.js', '.json'] },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 1536000,
      maxAssetSize: 1536000,
    },
    target: 'web',
  };
};