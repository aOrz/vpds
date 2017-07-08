let config  = require('../../dev/config/index.js');
let shell = require('./shell');

module.exports = async function  () {
  let o = await shell.exec('lsof -i:' + config.dev.port);
  o.stdout.split('\n').filter(function(line){
    let p=line.trim().split(/\s+/);
    if (p[0] === 'node' && p[1]) {
         shell.exec('kill ' + p[1]);
      };
  })
}
