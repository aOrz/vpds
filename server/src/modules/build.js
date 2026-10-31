const path = require('path');
const config = require('../../config/index.js');
const processRunner = require('../lib/process.js');
const validation = require('../lib/validation.js');

function build(kind, name) {
  const project = validation.projectPath(config.srcPath, kind, name);
  return processRunner.run(process.execPath, [path.join(config.serverPath, 'dev/build/build.js')], {
    cwd: path.resolve(config.srcPath, '..'),
    env: Object.assign({}, process.env, {dev_path: project})
  });
}

module.exports = {
  buildModule: name => build('module', name),
  buildPage: name => build('page', name)
};
