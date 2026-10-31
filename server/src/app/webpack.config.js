const path = require('path');
const webpack = require('webpack');
const {VueLoaderPlugin} = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = (env = {}, argv = {}) => {
  const production = argv.mode === 'production';
  return {
    context: __dirname,
    mode: production ? 'production' : 'development',
    entry: {index: './src/main.js'},
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'assets/js/[name].[contenthash:8].js',
      chunkFilename: 'assets/js/[name].[contenthash:8].js',
      assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
      publicPath: 'auto',
      clean: true
    },
    module: {rules: [
      {test: /\.vue$/, loader: 'vue-loader'},
      {test: /\.m?js$/, exclude: /node_modules/, use: {loader: 'babel-loader', options: {
        babelrc: false, configFile: false, presets: [['@babel/preset-env', {modules: false}]]
      }}},
      {test: /\.css$/, use: [production ? {loader: MiniCssExtractPlugin.loader, options: {publicPath: '../../'}} : 'style-loader', 'css-loader']},
      {test: /\.(png|jpe?g|gif|svg|webp|ico|woff2?|eot|ttf|otf)$/i, type: 'asset', parser: {dataUrlCondition: {maxSize: 10000}}}
    ]},
    plugins: [
      new VueLoaderPlugin(),
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: false,
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
      }),
      new HtmlWebpackPlugin({template: './src/index.html', publicPath: './'}),
      new MiniCssExtractPlugin({filename: 'assets/css/[name].[contenthash:8].css'})
    ],
    resolve: {
      extensions: ['.js', '.vue', '.json'],
      alias: {'~': path.resolve(__dirname, 'src'), 'vue$': 'vue/dist/vue.runtime.esm-bundler.js'}
    },
    optimization: {
      runtimeChunk: 'single',
      splitChunks: {chunks: 'all'},
      minimizer: ['...', new CssMinimizerPlugin()]
    },
    devtool: production ? 'source-map' : 'eval-cheap-module-source-map',
    devServer: {
      host: '127.0.0.1',
      port: 8010,
      allowedHosts: ['localhost', '127.0.0.1', '[::1]'],
      hot: true,
      historyApiFallback: true,
      setupMiddlewares(middlewares) {
        middlewares.unshift({name: 'vpds-local-ui-guard', middleware(req, res, next) {
          const host = req.headers.host;
          const allowed = ['localhost', '127.0.0.1', '[::1]'].some(name => host === name + ':8010');
          const origin = req.headers.origin;
          const site = req.headers['sec-fetch-site'];
          if (!allowed || (origin && origin !== 'http://' + host) ||
              (site && site !== 'same-origin' && site !== 'none')) {
            res.statusCode = 403;
            res.end('Untrusted development request');
            return;
          }
          next();
        }});
        return middlewares;
      },
      proxy: [{
        pathFilter: '/api',
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        on: {proxyReq(proxyReq, req) {
          // Only requests accepted by the local guard reach this proxy. Align
          // the validated dev origin with the backend without relaxing its guard.
          if (req.headers.origin) proxyReq.setHeader('origin', 'http://127.0.0.1:3000');
        }}
      }]
    },
    performance: {hints: false}
  };
};
