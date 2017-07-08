const path = require('path');
const config = require('../../config/index.js');

let conf = {
  serverPath: path.resolve(__dirname, '..'),
  srcPath: path.resolve(__dirname, '../../', 'src/'),
  npmType: 'npm'
}

module.exports = Object.assign(config, conf);