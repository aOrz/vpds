const fs = require('../lib/fs.js');
const config = require('../../config/index.js');
const path = require('path');
const shell = require('../lib/shell.js');
const modulePath = path.resolve(config.srcPath, 'modules');
const pagePath = path.resolve(config.srcPath, 'pages');

async function getLocalModulesInfo() {
  let filesArr = shell.ls(modulePath + '/*/package.json');
  let promises = [];
  for (var i = filesArr.length - 1; i >= 0; i--) {
    promises.unshift(fs.pReadFile(filesArr[i], 'utf8'));
  }
  let o = await Promise.all(promises);
  for (var i = o.length - 1; i >= 0; i--) {
    o[i] = JSON.parse(o[i]);
  }
  return o;
  // .then((data) => {
  //   return {
  //     status: 0,
  //     stdout: data,
  //     stderr: ''
  //   }
  // }).catch(e => {
  //   console.error(e);
  //   return {
  //     status: 1,
  //     stderr: '读取数据失败'
  //   }
  // })
}

async function getLocalPagesInfo() {
  let filesArr = shell.ls(pagePath + '/*/package.json');
  let promises = [];
  for (var i = filesArr.length - 1; i >= 0; i--) {
    promises.unshift(fs.pReadFile(filesArr[i], 'utf8'));
  }
  let o = await Promise.all(promises);
  for (var i = o.length - 1; i >= 0; i--) {
    o[i] = JSON.parse(o[i]);
  }
  return o;
  // .then((data) => {
  //   return {
  //     status: 0,
  //     stdout: data,
  //     stderr: ''
  //   }
  // }).catch(e => {
  //   console.error(e);
  //   return {
  //     status: 1,
  //     stderr: '读取数据失败'
  //   }
  // })
}

module.exports = {
  getLocalModulesInfo: getLocalModulesInfo,
  getLocalPagesInfo: getLocalPagesInfo
}