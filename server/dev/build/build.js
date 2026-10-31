// require('./check-versions')()

process.env.NODE_ENV = 'production'

var ora = require('ora')
var fs = require('fs')
var chalk = require('chalk')
var webpack = require('webpack')
var config = require('../config')
config.requireProjectPath()
var webpackConfig = require('./webpack.prod.conf')

var spinner = ora('building for production...')
spinner.start()

// Remove the complete validated output tree, including stale HTML and symlinks.
fs.rm(config.build.assetsRoot, { recursive: true, force: true }, err => {
  if (err) throw err
  webpack(webpackConfig, function (err, stats) {
    spinner.stop()
    if (err) throw err
    process.stdout.write(stats.toString({
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false
    }) + '\n\n')

    if (stats.hasErrors()) {
      process.exitCode = 1
      console.error(chalk.red('  Build failed.\n'))
      return
    }

    console.log(chalk.cyan('  Build complete.\n'))
    console.log(chalk.yellow(
      '  Tip: built files are meant to be served over an HTTP server.\n' +
      '  Opening index.html over file:// won\'t work.\n'
    ))
  })
})
