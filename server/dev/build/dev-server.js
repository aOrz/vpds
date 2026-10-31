var config = require('../config')
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = JSON.parse(config.dev.env.NODE_ENV)
}

var opn = require('opn')
var path = require('path')
var express = require('express')
var webpack = require('webpack')
var createProxyMiddleware = require('http-proxy-middleware').createProxyMiddleware
var HtmlWebpackPlugin = require('html-webpack-plugin')
var webpackConfig = require('./webpack.dev.conf')

// default port where dev server listens for incoming traffic
var port = process.env.PORT || config.dev.port
// automatically open browser, if not set will be false
var autoOpenBrowser = !!config.dev.autoOpenBrowser
// Define HTTP proxies to your custom API backend
// https://github.com/chimurai/http-proxy-middleware
var proxyTable = config.dev.proxyTable

var app = express()
// The development bundle and source maps are local too: block DNS rebinding
// and foreign browser origins before webpack/static/HMR middleware runs.
app.use(function (req, res, next) {
  var host = req.headers.host
  var allowed = ['localhost', '127.0.0.1', '[::1]'].some(function (name) {
    return host === name + ':' + port
  })
  var origin = req.headers.origin
  var site = req.headers['sec-fetch-site']
  if (!allowed || (origin && origin !== 'http://' + host) ||
      (site && site !== 'same-origin' && site !== 'none')) {
    res.status(403).end('Untrusted development request')
    return
  }
  next()
})
var compiler = webpack(webpackConfig)
var devMiddleware = require('webpack-dev-middleware')(compiler, {
  publicPath: webpackConfig.output.publicPath,
  index: "index.html"
})

var hotMiddleware = require('webpack-hot-middleware')(compiler, {
  log: () => {}
})
// force page reload when html-webpack-plugin template changes
compiler.hooks.compilation.tap('VpdsHtmlReload', function (compilation) {
  HtmlWebpackPlugin.getHooks(compilation).afterEmit.tap('VpdsHtmlReload', function (data) {
    hotMiddleware.publish({ action: 'reload' })
    return data
  })
})

// proxy api requests
Object.keys(proxyTable).forEach(function (context) {
  var options = proxyTable[context]
  if (typeof options === 'string') {
    options = { target: options }
  }
  var proxyOptions = Object.assign({}, options, { pathFilter: options.pathFilter || options.filter || context })
  delete proxyOptions.filter
  app.use(createProxyMiddleware(proxyOptions))
})

// handle fallback for HTML5 history API
app.use(require('connect-history-api-fallback')())

// serve webpack bundle output
app.use(devMiddleware)

// enable hot-reload and state-preserving
// compilation error display
app.use(hotMiddleware)

// serve pure static assets
var staticPath = path.posix.join(config.dev.assetsPublicPath, config.dev.assetsSubDirectory)
app.use(staticPath, express.static(path.join(config.dev.dev_path, 'assets')))

var uri = 'http://localhost:' + port

devMiddleware.waitUntilValid(function () {
  console.log('> Listening at ' + uri + '\n')
})

var server = app.listen(port, '127.0.0.1', function (err) {
  if (err) {
    console.log(err)
    return
  }

  // when env is testing, don't need open it
  if (autoOpenBrowser && process.env.NODE_ENV !== 'testing') {
    opn(uri);
  }
})

// Dispose file watchers and HMR heartbeat when the server is stopped in-process.
server.on('close', function () {
  hotMiddleware.close()
  devMiddleware.close(function () { compiler.close(function () {}) })
})
module.exports = server
