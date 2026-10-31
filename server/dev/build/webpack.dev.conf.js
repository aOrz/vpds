const path = require('path')
const webpack = require('webpack')
const { merge } = require('webpack-merge')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const config = require('../config')
const utils = require('./utils')
const baseWebpackConfig = require('./webpack.base.conf')

module.exports = merge(baseWebpackConfig, {
  mode: 'development',
  entry: { app: [path.join(__dirname, 'dev-client.js'), baseWebpackConfig.entry.app] },
  module: { rules: utils.styleLoaders({ sourceMap: config.dev.cssSourceMap }) },
  devtool: 'eval-cheap-module-source-map',
  optimization: { emitOnErrors: false },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.join(config.dev.dev_path, 'index.html'),
      inject: true
    })
  ]
})
