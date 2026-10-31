const fs = require('fs');
const qiniu = require('qiniu');
const path = require('path');
const qiniuConf = require('../../../config/index.js').qiniu;

function outputFiles(project) {
  const files = [];
  function visit(location) {
    const stat = fs.lstatSync(location);
    // Never follow links: a build artifact must not upload a file outside dist,
    // and rejecting directory links also prevents cycles and duplicate uploads.
    if (stat.isSymbolicLink()) throw new Error('Build output must not contain symbolic links');
    if (stat.isDirectory()) {
      fs.readdirSync(location).sort().forEach(name => visit(path.join(location, name)));
    } else if (stat.isFile()) {
      files.push(location);
    } else {
      throw new Error('Build output must contain only regular files and directories');
    }
  }
  const dist = path.join(project, 'dist');
  if (!fs.existsSync(dist)) throw new Error('No build output to publish');
  if (!fs.lstatSync(dist).isDirectory()) throw new Error('Build output must be a directory without symbolic links');
  visit(dist);
  if (!files.length) throw new Error('No build output to publish');
  return files;
}

async function pub(project, name, environment) {
  if (!Object.prototype.hasOwnProperty.call(qiniuConf, environment)) {
    throw new Error('Invalid publishing environment');
  }
  const config = qiniuConf[environment];
  if (!config || !['ak', 'sk', 'bucketName'].every(key =>
    typeof config[key] === 'string' && config[key].trim())) {
    throw new Error('Incomplete publishing credentials');
  }
  // Snapshot credentials for this publication; never mutate SDK global keys.
  const mac = new qiniu.auth.digest.Mac(config.ak, config.sk);
  const bucket = config.bucketName;
  const uploader = new qiniu.form_up.FormUploader(new qiniu.conf.Config({useHttpsDomain: true}));
  const files = outputFiles(project);
  async function upload(file) {
    const key = name + '/' + path.relative(project, file).split(path.sep).join('/');
    try {
      const token = new qiniu.rs.PutPolicy({scope: bucket + ':' + key}).uploadToken(mac);
      const result = await uploader.putFile(token, key, file, new qiniu.form_up.PutExtra());
      // SDK v7 resolves HTTP error responses too; transport success alone is not
      // successful publication. Do not include response bodies/tokens in errors.
      const status = result && result.resp && result.resp.statusCode;
      if (!Number.isInteger(status) || status < 200 || status >= 300) throw new Error('Upload rejected');
    } catch (_) {
      throw new Error('Upload failed: ' + key);
    }
  }
  // Include extensionless/dot files; never expose HTML before its assets exist.
  await Promise.all(files.filter(file => !/\.html$/i.test(file)).map(upload));
  await Promise.all(files.filter(file => /\.html$/i.test(file)).map(upload));
  return {code: 0};
}

module.exports = {pub};
