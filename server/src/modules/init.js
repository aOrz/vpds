const path = require('path');
const config = require('../../config/index.js');
const copy = require('./cp.js');

function initModule(name) {
  return copy.cpModule('pc-module', name, path.join(config.serverPath, 'template'));
}

function initPage(name) {
  return copy.cpPage('pc-page', name, path.join(config.serverPath, 'template'));
}
module.exports = {initModule, initPage};
