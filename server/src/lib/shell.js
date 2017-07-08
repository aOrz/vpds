const shell = require('shelljs');
let exec = shell.exec;
shell.exec = function (commond) {
  return new Promise(function (resolve, reject) {
    exec(commond, function (code, stdout, stderr) {
      resolve({
        code: code,
        stderr,
        stdout
      });
    })
  })
}

module.exports = shell;
