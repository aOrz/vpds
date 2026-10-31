'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const configFile = path.resolve(__dirname, '../server/dev/config/index.js');
function loadConfig(env) {
  const context = {
    require: name => name.startsWith('./') ? {} : require(name),
    module: { exports: {} },
    process: { env }
  };
  vm.runInNewContext(fs.readFileSync(configFile, 'utf8'), context, { filename: configFile });
  return context.module.exports;
}

function runBuild(hasErrors, validate) {
  const calls = [];
  const process = { env: {}, stdout: { write: value => calls.push(value) } };
  const dependencies = {
    ora: () => ({ start() {}, stop() {} }),
    rimraf: (target, cb) => { calls.push('remove'); cb(null); },
    path,
    chalk: { cyan: value => value, yellow: value => value, red: value => value },
    webpack: (config, cb) => cb(null, { toString: () => 'stats', hasErrors: () => hasErrors }),
    '../config': { requireProjectPath: validate || (() => '/tmp/project'), build: { assetsRoot: '/tmp/project/dist', assetsSubDirectory: 'assets' } },
    './webpack.prod.conf': {}
  };
  const context = {
    require: name => dependencies[name], process,
    console: { log: value => calls.push(value), error: value => calls.push(value) }
  };
  const execute = () => vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../server/dev/build/build.js'), 'utf8'), context);
  return { execute, process, calls };
}

test('webpack compilation errors produce failure status, not build-complete message', () => {
  const build = runBuild(true);
  build.execute();
  assert.equal(build.process.exitCode, 1);
  assert.ok(build.calls.some(value => value.includes('Build failed')));
  assert.ok(!build.calls.some(value => value.includes('Build complete')));
});

test('successful compilation retains successful exit', () => {
  const build = runBuild(false);
  build.execute();
  assert.equal(build.process.exitCode, undefined);
  assert.ok(build.calls.some(value => value.includes('Build complete')));
});

test('invalid project stops before output cleanup', () => {
  const build = runBuild(false, () => { throw new Error('invalid project'); });
  assert.throws(build.execute, /invalid project/);
  assert.ok(!build.calls.includes('remove'));
});

test('config may supply dev port without a project but refuses to build', () => {
  const config = loadConfig({});
  assert.equal(config.dev.port, 8083);
  assert.equal(config.build.assetsRoot, null);
  assert.throws(() => config.requireProjectPath(), /dev_path/);
});

test('project validation requires entry file and rejects redirected output', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vpds-build-'));
  try {
    const config = loadConfig({ dev_path: root });
    assert.throws(() => config.requireProjectPath());
    fs.writeFileSync(path.join(root, 'index.js'), '');
    assert.equal(config.requireProjectPath(), root);
    fs.mkdirSync(path.join(root, 'other'));
    fs.symlinkSync(path.join(root, 'other'), path.join(root, 'dist'), 'dir');
    assert.throws(() => config.requireProjectPath(), /symbolic links/);
    fs.unlinkSync(path.join(root, 'dist'));
    fs.symlinkSync(path.join(root, 'missing'), path.join(root, 'dist'), 'dir');
    assert.throws(() => config.requireProjectPath(), /symbolic links/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('babel entry and alias target selected project rather than nonexistent server/dev/src', () => {
  const project = '/tmp/example-project';
  const context = {
    __dirname: path.resolve(__dirname, '../server/dev/build'),
    module: { exports: {} },
    process: { env: {} },
    require: name => {
      if (name === 'path') return path;
      if (name === '../config') return { requireProjectPath: () => project, build: { assetsRoot: '/tmp/example-project/dist' }, dev: {} };
      if (name === './utils') return { assetsPath: value => value };
      return {};
    }
  };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../server/dev/build/webpack.base.conf.js'), 'utf8'), context);
  const config = context.module.exports;
  assert.equal(config.entry.app, path.join(project, 'index.js'));
  assert.equal(config.resolve.alias['@'], project);
  const babel = config.module.rules.find(rule => rule.loader === 'babel-loader');
  assert.equal(babel.include[0], project);
  assert.ok(babel.exclude.test('/tmp/example-project/node_modules/dependency/index.js'));
});


test('build removes the whole output tree before writing HTML, without following stale symlinks', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vpds-build-symlink-'));
  try {
    fs.writeFileSync(path.join(root, 'index.js'), '');
    const outside = path.join(root, 'outside.html');
    fs.writeFileSync(outside, 'must remain unchanged');
    const output = path.join(root, 'dist');
    fs.mkdirSync(output);
    fs.symlinkSync(outside, path.join(output, 'index.html'));
    const config = loadConfig({ dev_path: root });
    const dependencies = {
      ora: () => ({ start() {}, stop() {} }),
      rimraf: (target, cb) => {
        assert.equal(target, output, 'cleanup must include stale HTML, not only assets');
        fs.rmSync(target, { recursive: true, force: true });
        cb(null);
      },
      chalk: { cyan: value => value, yellow: value => value, red: value => value },
      webpack: (options, cb) => {
        assert.ok(!fs.existsSync(output), 'output is removed before webpack runs');
        fs.mkdirSync(output);
        fs.writeFileSync(path.join(output, 'index.html'), 'new generated HTML');
        cb(null, { toString: () => 'stats', hasErrors: () => false });
      },
      '../config': config,
      './webpack.prod.conf': {}
    };
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../server/dev/build/build.js'), 'utf8'), {
      require: name => dependencies[name],
      process: { env: {}, stdout: { write() {} } },
      console: { log() {}, error() {} }
    });
    assert.equal(fs.readFileSync(outside, 'utf8'), 'must remain unchanged');
    assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), 'new generated HTML');
    assert.equal(fs.lstatSync(path.join(output, 'index.html')).isSymbolicLink(), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
