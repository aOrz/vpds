const config = require('../../config/index.js');

function getConfig() {
  // The publishing dialog only needs environment names. Explicitly allowlist
  // public fields instead of serializing server credentials and local paths.
  const qiniu = Object.create(null);
  Object.keys(config.qiniu || {}).forEach(function (name) {
    qiniu[name] = {};
  });
  return {qiniu};
}

module.exports = getConfig;
