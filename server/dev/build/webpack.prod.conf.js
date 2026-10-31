const path = require('path')
const { merge } = require('webpack-merge')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const config = require('../config')
const utils = require('./utils')
const baseWebpackConfig = require('./webpack.base.conf')

module.exports = merge(baseWebpackConfig, {
  mode: 'production',
  module: {
    rules: utils.styleLoaders({ sourceMap: config.build.productionSourceMap, extract: true })
  },
  devtool: config.build.productionSourceMap ? 'source-map' : false,
  output: {
    filename: utils.assetsPath('js/[name].[contenthash:8].js'),
    chunkFilename: utils.assetsPath('js/[name].[contenthash:8].js')
  },
  optimization: {
    // Keep Webpack's default JavaScript minimizer alongside CSS minimization.
    minimizer: ['...', new CssMinimizerPlugin()],
    splitChunks: { chunks: 'all' },
    runtimeChunk: 'single'
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: utils.assetsPath('css/[name].[contenthash:8].css') }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.join(config.build.dev_path, 'index.html'),
      inject: true,
      minify: { removeComments: true, collapseWhitespace: true, removeAttributeQuotes: true }
    }),
    new CopyWebpackPlugin({
      patterns: [{
        from: path.join(config.build.dev_path, 'assets'),
        to: config.build.assetsSubDirectory,
        noErrorOnMissing: true,
        globOptions: { dot: false }
      }]
    })
  ]
})
