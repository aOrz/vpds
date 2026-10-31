const childProcess = require('child_process');
const validation = require('./validation.js');
const config = require('../../config/index.js');
const path = require('path');
const fs = require('../lib/fs.js');
const mysql = require('../modules/mysql.js');

let u ={};
u.installNpm = function (name) {
  validation.packageName(name);
  const command = config.npmType || 'npm';
  if (command !== 'npm' && command !== 'yarn') {
    throw new Error('Unsupported package manager');
  }
  const args = command === 'yarn' ? ['add', '--', name] : ['install', '--', name];
  return new Promise(resolve => {
    childProcess.execFile(command, args, {cwd: path.resolve(config.srcPath, '..')},
      (error, stdout, stderr) => resolve({code: error ? (error.code || 1) : 0, stdout, stderr}));
  });
}

u.moduleExits = async function (name) {
  const rows = await mysql.select('SELECT * FROM package WHERE `package_name` = ?', [name]);
  return {code: rows.length ? 1 : 0, stderr: rows.length ? '模块已存在' : '模块不存在'};
}

function copyTree(from, to) {
  fs.readdirSync(from).forEach(name => {
    const source = path.join(from, name);
    const target = path.join(to, name);
    const stat = fs.lstatSync(source);
    if (stat.isSymbolicLink()) throw new Error('不支持复制符号链接: ' + source);
    if (stat.isDirectory()) {
      fs.mkdirSync(target, stat.mode);
      copyTree(source, target);
    } else if (stat.isFile()) {
      fs.writeFileSync(target, fs.readFileSync(source), {flag: 'wx', mode: stat.mode});
    } else {
      throw new Error('不支持复制特殊文件: ' + source);
    }
  });
}

function removeTree(directory) {
  fs.readdirSync(directory).forEach(name => {
    const filename = path.join(directory, name);
    if (fs.lstatSync(filename).isDirectory()) removeTree(filename);
    else fs.unlinkSync(filename);
  });
  fs.rmdirSync(directory);
}

u.cpModule = function (from, to, info) {
  let created = false;
  try {
    // Parse before creating a destination, then reserve the destination exclusively.
    const json = JSON.parse(fs.readFileSync(path.join(from, 'package.json'), 'utf8'));
    // Scoped npm packages occupy @scope/name under their category directory.
    if (info.name.charAt(0) === '@') {
      try { fs.mkdirSync(path.dirname(to)); } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
    }
    fs.mkdirSync(to);
    created = true;
    copyTree(from, to);
    json.name = info.name;
    json.createTime = Date.now();
    json.author = info.author || json.author;
    fs.writeFileSync(path.join(to, 'package.json'), JSON.stringify(json, null, '\t'));
    return {code: 0, stdout: '', stderr: ''};
  } catch (error) {
    if (created) {
      try { removeTree(to); } catch (cleanupError) {
        return {code: 1, stderr: error.message + '; 清理未完成: ' + cleanupError.message};
      }
    }
    return {code: 1, stderr: error.code === 'EEXIST' ? '模块已存在' : error.message};
  }
}

u.alterJson = function (filePath, data, toPath) {
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  Object.keys(data).forEach(key => { json[key] = data[key]; });
  fs.writeFileSync(toPath || filePath, JSON.stringify(json, null, '\t'));
}

u.error = function (e) {
  return JSON.stringify({
    status: 1,
    stderr: e
  });
}

u.parseOut = function (data) {
  return JSON.stringify({
    status: data.code,
    stdout: data.stdout,
    stderr: data.stderr
  });
}
u.out = function (o, ctx) {
  o.then((o) => {
    ctx.body = JSON.stringify({
      status: o.code,
      stdout: o.stdout,
      error: o.stderr
    });
  }).catch(e => {
    ctx.body = u.error(e);
  })
}
module.exports = u;