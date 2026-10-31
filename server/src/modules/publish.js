const fs = require('fs');
const path = require('path');
const semver = require('semver');
const config = require('../../config/index.js');
const utils = require('../lib/utils.js');
const pub = require('../lib/pub.js');
const processRunner = require('../lib/process.js');
const validation = require('../lib/validation.js');

function validate(params) {
  validation.packageName(params.name);
  if (!semver.valid(params.version) || !Object.prototype.hasOwnProperty.call(config.qiniu || {}, params.pub_type)) {
    const error = new Error('Invalid version or publishing environment');
    error.status = 400;
    throw error;
  }
}

async function publish(kind, params) {
  validate(params);
  const {name, version, pub_type} = params;
  const project = validation.projectPath(config.srcPath, kind, name);
  const manifestPath = path.join(project, 'package.json');
  if (fs.lstatSync(manifestPath).isSymbolicLink()) {
    const error = new Error('Project manifest must not be a symbolic link');
    error.status = 400;
    throw error;
  }
  const original = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(original);
  const url = config.qiniu[pub_type].url + `/${name}/dist/index.html`;
  const changes = {
    version,
    lastVersion: pub_type === 'release' ? manifest.version : manifest.lastVersion
  };
  if (kind === 'module') changes.demo = url;
  if (kind === 'page' || pub_type === 'release') changes.release_url = url;
  await utils.alterJson(manifestPath, changes);

  const result = await processRunner.run('npm', ['publish'], {cwd: project});
  if (result.code !== 0) {
    // A failed npm publish must not leave the local project at an unpublished version.
    fs.writeFileSync(manifestPath, original);
    return result;
  }
  await pub.pub(project, name, pub_type);
  if (kind === 'module' && pub_type === 'release') {
    const installed = await utils.installNpm(name);
    if (installed.code !== 0) return installed;
  }
  return result;
}

module.exports = {
  validate,
  publishModule: params => publish('module', params),
  publishPage: params => publish('page', params)
};
