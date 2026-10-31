const path = require('path')
const webpack = require('webpack')
const { VueLoaderPlugin } = require('vue-loader')
const config = require('../config')
const projectPath = config.requireProjectPath()

module.exports = {
  context: projectPath,
  entry: { app: path.join(projectPath, 'index.js') },
  output: {
    path: config.build.assetsRoot,
    filename: '[name].js',
    publicPath: process.env.NODE_ENV === 'production'
      ? config.build.assetsPublicPath
      : config.dev.assetsPublicPath
  },
  resolve: {
    extensions: ['.js', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm-bundler.js',
      '@': projectPath
    }
  },
  module: {
    rules: [
      { test: /\.vue$/, loader: 'vue-loader' },
      {
        test: /\.m?js$/,
        loader: 'babel-loader',
        include: [projectPath],
        exclude: /node_modules/,
        options: {
          // Use the project's Babel 7 configuration, never the legacy Babel 6 defaults.
          presets: [['@babel/preset-env', { modules: false }]]
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 10000 } },
        generator: { filename: 'assets/img/[name].[contenthash:8][ext]' }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 10000 } },
        generator: { filename: 'assets/fonts/[name].[contenthash:8][ext]' }
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
    })
  ]
}
