const killP = require('../lib/killProgress.js');
const config = require('../../config/index.js');
const child_process = require('child_process');

module.exports = function  (kind, name) {
    killP();
    process.env.dev_path = `${config.srcPath}/${kind}s/${name}`; 
    console.log(process.env.dev_path);
    s = child_process.exec(`node ${config.serverPath}/dev/build/dev-server.js`, {async:true});
     s.stdout.on('data', function (data) {
      console.log('dev: ' + data);
    });
}