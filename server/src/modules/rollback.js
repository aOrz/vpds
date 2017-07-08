const config = require('../../config/index.js');
const shell = require('../lib/shell.js');
const path = require('path');
const pub = require('../lib/pub.js');

module.exports = function  (parms) {
  let {name} = parms;
  shll.cd(path.resolve(serverPath, '..'));
  let o = await shell.exec(`npm isntall ${name}`);
  if (o.code === 0) {
    await pub.pub(path.resolve(serverPath, '../node_modules', name), name, pub_type);
  };
  return o;
} 