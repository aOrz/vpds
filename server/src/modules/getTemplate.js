const shell = require('../lib/shell.js');
const path = require('path');
const config = require('../../config/index.js');

async function getTemplate  () {
    let arr = shell.ls(path.resolve(config.serverPath, './template'));
   // console.log(o.stdout.splite('\n'))
    return arr;
}
module.exports = {
  getTemplate
}