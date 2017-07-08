const shell = require('../lib/shell.js');
const path = require('path');
const config = require('../../config/index.js');
const until = require('../lib/utils.js');
const pub = require('../lib/pub.js');

async function publishModule(params) {
  let {name, version, pub_type} = params;
  shell.cd(config.srcPath);
  shell.cd('./modules/' + name);
  let packageJson = require(path.resolve(config.srcPath, 'modules', name, 'package.json'));
  let lastVersion = pub_type === 'release'  ? packageJson.version : packageJson.lastVersion;
  until.alterJson(path.resolve(config.srcPath, 'modules', name, 'package.json'), {
      version: version,
      lastVersion: lastVersion,
      demo: config.qiniu[pub_type].url + `/${name}/dist/index.html`,
      release_url: pub_type === 'release' ? config.qiniu[pub_type].url + `/${name}/dist/index.html` : packageJson.release_url
    })
  let o = await shell.exec('npm publish');
  if (pub_type && o.code === 0) {
    if (pub_type === 'release') {
      shell.cd('..');
      shell.exec('npm install ' + name )
    };
    await pub.pub(path.resolve(config.srcPath, 'modules', name), name, pub_type);
  }
  return  Promise.resolve(o);
}

async function publishPage(params) {
  let {name, version, pub_type} = params;
  shell.cd(config.srcPath);
  shell.cd('./pages/' + name);
  let packageJson = require(path.resolve(config.srcPath, 'pages', name, 'package.json'));
  let lastVersion = pub_type === 'release'  ? packageJson.version : packageJson.lastVersion;
  until.alterJson(path.resolve(config.srcPath, 'pages', name, 'package.json'), {
      version: version,
      lastVersion: lastVersion,
      release_url:  config.qiniu[pub_type].url + `/${name}/dist/index.html`
    })
  let o = await shell.exec('npm publish');
  if (pub_type && o.code === 0) {
    await pub.pub(path.resolve(config.srcPath, 'pages', name), name, pub_type);
    console.log(config.qiniu[pub_type].url + `/${name}/dist/index.html`);
  }
  return  Promise.resolve(o);
}


module.exports = {
  publishModule: publishModule,
  publishPage: publishPage
}