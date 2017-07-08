const shell = require('../lib/shell.js');
const config = require('../../config/index.js');
const path = require('path');

async function buildModule (name) {
  process.env.dev_path = config.srcPath + '/modules/' + name
  shell.cd(config.srcPath + '/modules/' + name);
  // await shell.exec('npm i');
  shell.cd(path.resolve(config.srcPath, '..'));
  return shell.exec(`node ${config.serverPath}/dev/build/build.js`);
}

async function buildPage (name) {
  process.env.dev_path = config.srcPath + '/pages/' + name
  shell.cd(config.srcPath + '/pages/' + name);
  // await shell.exec('npm i');
  shell.cd(path.resolve(config.srcPath, '..'));
  return shell.exec(`node ${config.serverPath}/dev/build/build.js`);
}

module.exports = {
  buildModule,
  buildPage
}