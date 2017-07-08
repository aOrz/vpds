const u = require('../lib/utils.js');
const path = require('path');
const config = require('../../config/index.js');
const mysql = require('./mysql.js');
async function cpModule(fromName, params, fromPath = path.resolve(config.srcPath, '../node_modules')) {
  let toPath = path.resolve(config.srcPath, 'modules', params.name || params);
  fromPath = path.resolve(fromPath, fromName);
  let exits = u.moduleExits(params.name || params);
  if (exits.code == 1) {
    return;
  }
  mysql.save('module', params.name || params);
  return u.cpModule(fromPath, toPath, {name: params.name || params, author:  config.user.name});
}

async function cpPage(fromName, params, fromPath = path.resolve(config.srcPath, '../node_modules')) {
  let toPath = path.resolve(config.srcPath, 'pages', params.name || params);
  fromPath = path.resolve(fromPath, fromName);
  let exits = u.moduleExits(params.name || params);
  if (exits.code == 1) {
    return;
  }
  mysql.save('page', params.name || params);
  return u.cpModule(fromPath, toPath, {name: params.name || params, author:  config.user.name});
}

module.exports = {
  cpModule,
  cpPage
} 