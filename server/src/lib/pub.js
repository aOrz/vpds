const glob = require('glob');
const qiniu = require('qiniu');
const path = require('path');
const qiniuConf = require('../../../config/index.js').qiniu;

function uploadQiniu(file, name, config) {
  qiniu.conf.ACCESS_KEY = config.ak;
  qiniu.conf.SECRET_KEY = config.sk;
  const policy = new qiniu.rs.PutPolicy(config.bucketName + ':' + name);
  const token = policy.token();
  return new Promise((resolve, reject) => {
    qiniu.io.putFile(token, name, file, new qiniu.io.PutExtra(), error => {
      if (error) return reject(new Error('Upload failed: ' + name));
      resolve({code: 0, status: 'success'});
    });
  });
}

async function pub(project, name, environment) {
  if (!Object.prototype.hasOwnProperty.call(qiniuConf, environment)) {
    throw new Error('Invalid publishing environment');
  }
  // Include extensionless assets, and publish HTML only after every asset exists.
  const files = glob.sync(path.join(project, 'dist/**/*'), {dot: true, nodir: true});
  if (!files.length) throw new Error('No build output to publish');
  const upload = file => uploadQiniu(file, name + '/' + path.relative(project, file).split(path.sep).join('/'), qiniuConf[environment]);
  await Promise.all(files.filter(file => !/\.html$/i.test(file)).map(upload));
  await Promise.all(files.filter(file => /\.html$/i.test(file)).map(upload));
  return {code: 0};
}

module.exports = {pub};
