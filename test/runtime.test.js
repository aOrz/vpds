const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const validation = require('../server/src/lib/validation');

function load(relative, dependencies) {
  const filename = path.join(__dirname, '..', relative);
  const module = {exports: {}};
  vm.runInThisContext('(function(require, module, exports) {' + fs.readFileSync(filename, 'utf8') + '\n})', {filename})(
    name => Object.prototype.hasOwnProperty.call(dependencies, name) ? dependencies[name] : require(name),
    module, module.exports
  );
  return module.exports;
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function routes(overrides = {}) {
  const handlers = {};
  class Router { get(url, handler) { handlers[url] = handler; } }
  load('server/src/routers.js', Object.assign({
    'koa-router': Router,
    '../config/index.js': {srcPath: '/tmp/src', serverPath: '/tmp/server'},
    './lib/validation.js': validation,
    './lib/utils.js': {parseOut: JSON.stringify},
    './modules/install.js': {}, './modules/getInfo.js': {},
    './modules/search.js': {}, './modules/cp.js': {},
    './modules/publish.js': {validate: () => {}},
    './modules/build.js': {}, './modules/mysql.js': {},
    './modules/dev.js': () => {}, './modules/getTemplate.js': {},
    './modules/getConfig.js': () => ({})
  }, overrides));
  return handlers;
}

test('build endpoint waits for completion and reports the real exit status', async () => {
  let finish;
  const route = routes({'./modules/build.js': {buildPage: () => new Promise(resolve => { finish = resolve; })}})['/api/page/build/:name'];
  const ctx = {params: {name: 'demo'}};
  const waiting = route(ctx);
  await tick();
  assert.equal(ctx.body, undefined);
  finish({code: 2, stderr: 'compile error'});
  await waiting;
  assert.equal(JSON.parse(ctx.body).code, 2);
});

test('failed builds never publish or save metadata for either project kind', async () => {
  for (const kind of ['page', 'module']) {
    const title = kind === 'page' ? 'Page' : 'Module';
    const handler = routes({
      './modules/build.js': {['build' + title]: async () => ({code: 1, stderr: 'failed'})},
      './modules/publish.js': {validate: () => {}, ['publish' + title]: () => assert.fail('must not publish')},
      './modules/mysql.js': {save: () => assert.fail('must not save')}
    })[`/api/${kind}/publish/:name/:version/:pub_type`];
    const ctx = {params: {name: 'demo', version: '1.0.0', pub_type: 'test'}};
    await handler(ctx);
    assert.equal(JSON.parse(ctx.body).code, 1);
  }
});

test('successful publication waits for metadata persistence in order', async () => {
  const events = [];
  let save;
  const handler = routes({
    './modules/build.js': {buildPage: async () => {events.push('build'); return {code: 0};}},
    './modules/publish.js': {validate: () => {}, publishPage: async () => {events.push('publish'); return {code: 0};}},
    './modules/mysql.js': {save: () => new Promise(resolve => {events.push('save'); save = resolve;})}
  })['/api/page/publish/:name/:version/:pub_type'];
  const ctx = {params: {name: 'demo', version: '1.0.0', pub_type: 'test'}};
  const pending = handler(ctx);
  await tick();
  assert.deepEqual(events, ['build', 'publish', 'save']);
  assert.equal(ctx.body, undefined);
  save();
  await pending;
  assert.equal(JSON.parse(ctx.body).code, 0);
});

test('same-project builds serialize and invalid names never reach the builder', async () => {
  const completions = [];
  const handler = routes({'./modules/build.js': {buildPage: () => new Promise(resolve => completions.push(resolve))}})['/api/page/build/:name'];
  const one = handler({params: {name: 'demo'}});
  const two = handler({params: {name: 'demo'}});
  await tick();
  assert.equal(completions.length, 1);
  completions[0]({code: 0});
  await one;
  await tick();
  assert.equal(completions.length, 2);
  completions[1]({code: 0});
  await two;
  const bad = {params: {name: '../../outside;echo unsafe'}};
  await handler(bad);
  assert.equal(bad.status, 400);
  assert.equal(completions.length, 2);
});

test('builds use independent child cwd and environment, not shell/global state', async () => {
  const originalCwd = process.cwd();
  const originalPath = process.env.dev_path;
  const calls = [];
  const build = load('server/src/modules/build.js', {
    '../../config/index.js': {srcPath: '/tmp/source tree/src', serverPath: '/tmp/source tree/server'},
    '../lib/validation.js': validation,
    '../lib/process.js': {run: async (...args) => {calls.push(args); return {code: 0};}}
  });
  await Promise.all([build.buildModule('first'), build.buildPage('second')]);
  assert.equal(calls[0][0], process.execPath);
  assert.deepEqual(calls[0][1], ['/tmp/source tree/server/dev/build/build.js']);
  assert.equal(calls[0][2].env.dev_path, '/tmp/source tree/src/modules/first');
  assert.equal(calls[1][2].env.dev_path, '/tmp/source tree/src/pages/second');
  assert.equal(process.cwd(), originalCwd);
  assert.equal(process.env.dev_path, originalPath);
});

test('installation failure never copies a stale package', async () => {
  const install = load('server/src/modules/install.js', {
    '../lib/utils.js': {installNpm: async () => ({code: 7, stderr: 'not found'})},
    './cp.js': {cpModule: () => assert.fail(), cpPage: () => assert.fail()}
  });
  assert.equal((await install.installPage('demo')).code, 7);
  assert.equal((await install.installModule('demo')).code, 7);
});

test('failed npm publication restores the original manifest and skips upload', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vpds-publish-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const manifest = path.join(root, 'package.json');
  const original = '{"name":"demo","version":"1.0.0"}\n';
  fs.writeFileSync(manifest, original);
  const publish = load('server/src/modules/publish.js', {
    semver: {valid: value => value === '1.0.1'},
    '../../config/index.js': {srcPath: root, qiniu: {test: {url: 'https://example.invalid'}}},
    '../lib/validation.js': {packageName: validation.packageName, projectPath: () => root},
    '../lib/utils.js': {alterJson: async (file, changes) => fs.writeFileSync(file, JSON.stringify(Object.assign(JSON.parse(fs.readFileSync(file)), changes)))},
    '../lib/pub.js': {pub: () => assert.fail('must not upload')},
    '../lib/process.js': {run: async (file, args, options) => {
      assert.equal(file, 'npm');
      assert.deepEqual(args, ['publish']);
      assert.equal(options.cwd, root);
      assert.equal(JSON.parse(fs.readFileSync(manifest)).version, '1.0.1');
      return {code: 1};
    }}
  });
  assert.equal((await publish.publishModule({name: 'demo', version: '1.0.1', pub_type: 'test'})).code, 1);
  assert.equal(fs.readFileSync(manifest, 'utf8'), original);
  assert.throws(() => publish.validate({name: 'demo', version: 'bad', pub_type: 'test'}), /Invalid version/);
  assert.throws(() => publish.validate({name: 'demo', version: '1.0.1', pub_type: '__proto__'}), /Invalid version/);
});

test('upload includes extensionless assets and awaits assets before HTML', async () => {
  const uploaded = [];
  let finishAsset;
  const pub = load('server/src/lib/pub.js', {
    glob: {sync: (pattern, options) => {
      assert(pattern.endsWith('/dist/**/*'));
      assert.equal(options.nodir, true);
      return ['/project/dist/index.html', '/project/dist/LICENSE'];
    }},
    qiniu: {conf: {}, rs: {PutPolicy: function () {this.token = () => 'test-token';}}, io: {
      PutExtra: function () {}, putFile: (token, name, file, extra, done) => {
        uploaded.push(name);
        if (name.endsWith('LICENSE')) finishAsset = done;
        else done();
      }
    }},
    '../../../config/index.js': {qiniu: {test: {}}}
  });
  const waiting = pub.pub('/project', 'demo', 'test');
  assert.deepEqual(uploaded, ['demo/dist/LICENSE']);
  finishAsset();
  await waiting;
  assert.deepEqual(uploaded, ['demo/dist/LICENSE', 'demo/dist/index.html']);
});

test('publication refuses a manifest symlink before changing external files', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vpds-manifest-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const project = path.join(root, 'project');
  fs.mkdirSync(project);
  const external = path.join(root, 'external.json');
  const original = '{"name":"demo","version":"1.0.0"}';
  fs.writeFileSync(external, original);
  fs.symlinkSync(external, path.join(project, 'package.json'));
  const publish = load('server/src/modules/publish.js', {
    semver: {valid: () => true},
    '../../config/index.js': {srcPath: root, qiniu: {test: {}}},
    '../lib/validation.js': {packageName: validation.packageName, projectPath: () => project},
    '../lib/utils.js': {alterJson: () => assert.fail('must not write')},
    '../lib/pub.js': {pub: () => assert.fail('must not upload')},
    '../lib/process.js': {run: () => assert.fail('must not publish')}
  });
  await assert.rejects(publish.publishPage({name: 'demo', version: '1.0.1', pub_type: 'test'}), /symbolic link/);
  assert.equal(fs.readFileSync(external, 'utf8'), original);
});
