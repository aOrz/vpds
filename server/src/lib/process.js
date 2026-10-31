const childProcess = require('child_process');

// Never pass request-controlled values through a command shell. Keep cwd/env
// local to the child so concurrent requests cannot change each other's build.
function run(file, args, options) {
  return new Promise(resolve => {
    childProcess.execFile(file, args, Object.assign({maxBuffer: 10 * 1024 * 1024}, options), (error, stdout, stderr) => {
      resolve({
        code: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
        stdout: stdout || '',
        stderr: stderr || (error ? error.message : '')
      });
    });
  });
}

module.exports = {run};
