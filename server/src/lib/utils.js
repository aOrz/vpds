const shell = require('./shell.js');
const config = require('../../config/index.js');
const path = require('path');
const fs = require('../lib/fs.js');
const mysql = require('../modules/mysql.js');

let u ={};
u.installNpm = function (name) {
  shell.cd(config.srcPath);
  return shell.exec(`${config.npmType} install ${name}`);
}

u.moduleExits = function (name) {
  let arr = mysql.select(`select * from  package where \`package_name\` = ${name}`);
  if (arr.length > 0) {
    return {
      code: 1,
      stderr: '模块已存在'
    }
  }

  return {
      code: 0,
      stderr: '模块不存在'
    };
}
u.cpModule = function (from, to, info) {
  let o = shell.cd(from);
  if (o.code != 0) {
    return {
      code: 1,
      stderr: '要复制的模块不存在'
    }
  }
  o = shell.cd(to);
  if (o.code == 0) {
    return {
      code: 1,
      stderr: '模块已存在'
    }
  }
  o = shell.cp('-Rf', from, to);
  if (o.code == 0) {
    let str = fs.readFileSync(from + '/package.json', 'utf8');
    json = JSON.parse(str);
    json.name = info.name;
    json.createTime = new Date().getTime();
    json.author = info.author || json.author;
    fs.writeFile(to + '/package.json', JSON.stringify(json, null, '\t'));
  }
  return o;
}

u.alterJson = function (filePath, data, toPath) {
  let json = require(filePath);
  for(let i in data) {
    json[i] = data[i];
  }
  if (!toPath) {
    toPath = filePath;
  }
  fs.writeFile(toPath, JSON.stringify(json, null, '\t'));
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