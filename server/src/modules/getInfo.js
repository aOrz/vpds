const config = require('../../config/index.js');
const validation = require('../lib/validation.js');
const projects = require('../lib/localProjects.js');

async function getLocalInfo(kind) {
  const root = validation.within(config.srcPath, kind + 's');
  return Promise.all((await projects.list(root)).map(projects.readManifest));
}

module.exports = {
  getLocalModulesInfo: () => getLocalInfo('module'),
  getLocalPagesInfo: () => getLocalInfo('page')
};
