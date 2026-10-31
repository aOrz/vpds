const path = require('path');
const config = require('../../config/index.js');
const utils = require('../lib/utils.js');
const pub = require('../lib/pub.js');
const validation = require('../lib/validation.js');

module.exports = async function (params) {
  const {name, pub_type} = params;
  validation.packageName(name);
  if (!Object.prototype.hasOwnProperty.call(config.qiniu || {}, pub_type)) {
    const error = new Error('Invalid publishing environment');
    error.status = 400;
    throw error;
  }
  const result = await utils.installNpm(name);
  if (result.code === 0) {
    await pub.pub(validation.within(path.resolve(config.srcPath, '../node_modules'), name), name, pub_type);
  }
  return result;
};
