// see http://vuejs-templates.github.io/webpack for documentation.
var path = require('path')
let dev_path = process.env.dev_path || '';
module.exports = {
  build: {
    env: require('./prod.env'),
    index: path.resolve(dev_path, './dist/index.html'),
    assetsRoot: path.resolve(dev_path, './dist'),
    assetsSubDirectory: 'assets',
    assetsPublicPath: './',
    productionSourceMap: true,
    productionGzip: false,
    productionGzipExtensions: ['js', 'css'],
    bundleAnalyzerReport: process.env.npm_config_report,
    dev_path: dev_path
  },
  dev: {
    env: require('./dev.env'),
    port: 8083,
    autoOpenBrowser: true,
    assetsSubDirectory: 'assets',
    assetsPublicPath: '/',
    proxyTable: {},
    cssSourceMap: false,
    dev_path: dev_path
  }
}
