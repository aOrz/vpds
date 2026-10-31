const config = require('../../config/index.js');
const validation = require('../lib/validation.js');
const projects = require('../lib/localProjects.js');

async function getTemplate() {
  const root = validation.within(config.serverPath, 'template');
  const templates = await projects.list(root);
  return {code: 0, stdout: templates.map(template => template.name).join('\n')};
}

module.exports = {getTemplate};
