const u = require('../lib/utils.js');
const path = require('path');
const config = require('../../config/index.js');
const mysql = require('./mysql.js');
const validation = require('../lib/validation.js');

async function copy(kind, fromName, params, fromPath) {
  const name = params.name || params;
  const toPath = validation.projectPath(config.srcPath, kind, name);
  const source = validation.within(fromPath, fromName);
  const result = u.cpModule(source, toPath, {name, author: config.user.name});
  if (result.code !== 0) return result;
  // save() reads the completed, renamed manifest; never record a failed copy.
  try {
    await mysql.save(kind, name);
  } catch (error) {
    return {code: 1, stderr: '文件已复制，但数据库保存失败: ' + error.message};
  }
  return result;
}

function cpModule(fromName, params, fromPath = path.resolve(config.srcPath, '../node_modules')) {
  return copy('module', fromName, params, fromPath);
}

function cpPage(fromName, params, fromPath = path.resolve(config.srcPath, '../node_modules')) {
  return copy('page', fromName, params, fromPath);
}
module.exports = {cpModule, cpPage};
