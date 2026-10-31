const path = require('path')
const config = require('../config')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

exports.assetsPath = function (file) {
  const subdirectory = process.env.NODE_ENV === 'production'
    ? config.build.assetsSubDirectory : config.dev.assetsSubDirectory
  return path.posix.join(subdirectory, file)
}

exports.styleLoaders = function (options = {}) {
  return [{
    test: /\.css$/i,
    use: [
      options.extract
        ? { loader: MiniCssExtractPlugin.loader, options: { publicPath: '../../' } }
        : 'style-loader',
      { loader: 'css-loader', options: { sourceMap: !!options.sourceMap } }
    ]
  }]
}
