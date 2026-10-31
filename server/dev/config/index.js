// see http://vuejs-templates.github.io/webpack for documentation.
var path = require('path')
var fs = require('fs')
let dev_path = process.env.dev_path ? path.resolve(process.env.dev_path) : null;

// Loading the port configuration is safe without selecting a project. Builds are not.
function requireProjectPath () {
  if (!dev_path || !fs.statSync(dev_path).isDirectory() ||
      !fs.statSync(path.join(dev_path, 'index.js')).isFile()) {
    throw new Error('Set dev_path to a project directory containing index.js')
  }
  var root = fs.realpathSync(dev_path)
  ;['dist', path.join('dist', 'assets')].forEach(function (relative) {
    var target = path.join(dev_path, relative)
    var stat
    try {
      stat = fs.lstatSync(target)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    if (stat && (stat.isSymbolicLink() || fs.realpathSync(target) !== path.join(root, relative))) {
      throw new Error('Build output must not redirect through symbolic links')
    }
  })
  return dev_path
}
module.exports = {
  requireProjectPath: requireProjectPath,
  build: {
    env: require('./prod.env'),
    index: dev_path && path.resolve(dev_path, './dist/index.html'),
    assetsRoot: dev_path && path.resolve(dev_path, './dist'),
    assetsSubDirectory: 'assets',
    assetsPublicPath: './',
    productionSourceMap: true,
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
