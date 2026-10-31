const u = require('../lib/utils.js');
const cp = require('./cp.js');

async function install(kind, name) {
  const result = await u.installNpm(name);
  if (result.code !== 0) return result;
  return kind === 'module' ? cp.cpModule(name, name) : cp.cpPage(name, name);
}

module.exports = {
  installModule: name => install('module', name),
  installPage: name => install('page', name)
};
