const path = require('path');
const config = require('../../config/index.js');
const shell = require('../lib/shell.js');
const u = require('../lib/utils.js');

async function initModule(name) {
  let modulesPath = path.resolve(config.serverPath, '../src/modules/', name);
  let arr = shell.ls(path.resolve(modulesPath, '..'));
  let state = u.moduleExits(name);
  if (arr.indexOf(name) > -1 || state.code == 1) {
    return {
      code: 1,
      stderr: '模块已存在'
    }
  }
  mysql.save('module', name);

  return shell.cp('-R', path.resolve(config.serverPath, 'template/module'), modulesPath);
}

async function initPage(name) {
  let arr = shell.ls(path.resolve(config.serverPath, '../src/pages/'));
  let state = u.moduleExits(name);
  if (arr.indexOf(name) > -1 || state.code == 1) {
    return {
      code: 1,
      stderr: '模块已存在'
    }
  }
  mysql.save('page', name);

  return shell.cp('-R', path.resolve(config.serverPath, 'template/page/'), path.resolve(config.serverPath, '../src/pages/', name));
}

module.exports = {
  initModule: initModule,
  initPage: initPage
}