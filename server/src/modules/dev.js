const path = require('path');
const config = require('../../config/index.js');
const childProcess = require('child_process');
const validation = require('../lib/validation.js');

let current;
let pending = Promise.resolve();

function start(kind, name) {
  const project = validation.projectPath(config.srcPath, kind, name);
  // Serialize switches, and only stop a child this process actually owns.
  pending = pending.catch(() => {}).then(async () => {
    if (current && current.pid && current.exitCode === null && current.signalCode === null) {
      await new Promise(resolve => {
        const child = current;
        const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
        child.once('exit', () => { clearTimeout(timer); resolve(); });
        child.kill();
      });
    }
    current = childProcess.spawn(process.execPath, [path.join(config.serverPath, 'dev/build/dev-server.js')], {
      cwd: path.resolve(config.srcPath, '..'),
      env: Object.assign({}, process.env, {dev_path: project}),
      stdio: ['ignore', 'inherit', 'inherit']
    });
    const child = current;
    // spawn errors are asynchronous; never allow an unhandled 'error' event.
    child.on('error', error => console.error('Development server:', error.message));
    return new Promise(resolve => {
      child.once('error', error => resolve({code: 1, stderr: error.message}));
      // Node assigns pid only when the executable was successfully started.
      if (child.pid) resolve({code: 0, stdout: 'Development server starting'});
    });
  });
  return pending;
}

process.once('exit', () => {
  if (current && current.exitCode === null) current.kill();
});

module.exports = start;
