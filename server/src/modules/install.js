const u = require('../lib/utils.js');
const cp = require('./cp.js');

async function installModule(name) {
  await u.installNpm(name);
  return await cp.cpModule(name, name);
}
async function installPage(name) {
  await u.installNpm(name);
  return await cp.cpPage(name, name);
}
module.exports = {
  installModule,
  installPage
}