const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const crypto = require('crypto');
const qiniu = require('qiniu');

const credentials = {
  test: {ak: 'test-access', sk: 'test-secret', bucketName: 'test-bucket'},
  release: {ak: 'release-access', sk: 'release-secret', bucketName: 'release-bucket'}
};
function load(putFile, config = credentials) {
  const module = {exports: {}};
  class FormUploader {
    constructor(options) { assert.equal(options.useHttpsDomain, true); }
    putFile(...args) { return putFile(...args); }
  }
  const sdk = Object.assign({}, qiniu, {
    form_up: Object.assign({}, qiniu.form_up, {FormUploader})
  });
  const filename = path.join(__dirname, '../server/src/lib/pub.js');
  const requireMock = name => name === 'qiniu' ? sdk :
    name === '../../../config/index.js' ? {qiniu: config} : require(name);
  vm.runInThisContext('(function(require, module) {' + fs.readFileSync(filename, 'utf8') + '\n})', {filename})(requireMock, module);
  return module.exports;
}
function project(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vpds-qiniu-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, 'dist'));
  files.forEach(name => {
    const file = path.join(root, 'dist', name);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, name);
  });
  return root;
}
const ok = () => ({resp: {statusCode: 200}, data: {key: 'ok'}});
const tick = () => new Promise(resolve => setImmediate(resolve));

test('SDK v7 signs per-environment tokens without global credential races', async t => {
  const root = project(t, ['LICENSE', '.well-known/config', 'index.html']);
  const calls = [];
  const globalAK = qiniu.conf.ACCESS_KEY;
  const globalSK = qiniu.conf.SECRET_KEY;
  const pub = load(async (token, key, file, extra) => {
    await tick();
    const [ak, signature, encoded] = token.split(':');
    const environment = ak === credentials.test.ak ? 'test' : 'release';
    const config = credentials[environment];
    assert.equal(ak, config.ak);
    const expected = crypto.createHmac('sha1', config.sk).update(encoded).digest('base64').replace(/\+/g, '-').replace(/\//g, '_');
    assert.equal(signature, expected);
    const policy = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    assert.equal(policy.scope, config.bucketName + ':' + key);
    assert.ok(policy.deadline > Date.now() / 1000);
    assert.ok(extra instanceof qiniu.form_up.PutExtra);
    assert.ok(fs.statSync(file).isFile());
    calls.push({environment, key});
    return ok();
  });
  await Promise.all([pub.pub(root, 'demo', 'test'), pub.pub(root, 'demo', 'release')]);
  assert.equal(calls.length, 6);
  for (const environment of ['test', 'release']) {
    const keys = calls.filter(call => call.environment === environment).map(call => call.key);
    assert.deepEqual(keys, ['demo/dist/.well-known/config', 'demo/dist/LICENSE', 'demo/dist/index.html']);
  }
  assert.equal(qiniu.conf.ACCESS_KEY, globalAK);
  assert.equal(qiniu.conf.SECRET_KEY, globalSK);
});

test('HTML starts only after all assets complete', async t => {
  const root = project(t, ['index.HTML', 'LICENSE']);
  const uploaded = [];
  let finishAsset;
  const pub = load((token, key) => {
    uploaded.push(key);
    if (key.endsWith('LICENSE')) return new Promise(resolve => { finishAsset = resolve; });
    return Promise.resolve(ok());
  });
  const waiting = pub.pub(root, 'demo', 'test');
  assert.deepEqual(uploaded, ['demo/dist/LICENSE']);
  finishAsset(ok());
  assert.deepEqual(await waiting, {code: 0});
  assert.deepEqual(uploaded, ['demo/dist/LICENSE', 'demo/dist/index.HTML']);
});

test('HTTP failures and transport errors reject without leaking credentials or publishing HTML', async t => {
  const root = project(t, ['asset.js', 'index.html']);
  for (const result of [{resp: {statusCode: 401}}, {resp: {statusCode: 500}}, {resp: {statusCode: 302}}, {}]) {
    const uploaded = [];
    const pub = load(async (token, key) => {
      uploaded.push(key);
      return Object.assign({data: {error: token + credentials.test.sk}}, result);
    });
    await assert.rejects(pub.pub(root, 'demo', 'test'), error => error.message === 'Upload failed: demo/dist/asset.js');
    assert.deepEqual(uploaded, ['demo/dist/asset.js']);
  }
  const pub = load(async token => { throw new Error(token + credentials.test.sk); });
  await assert.rejects(pub.pub(root, 'demo', 'test'), error => error.message === 'Upload failed: demo/dist/asset.js');
});

test('symlinked dist, files and directories are refused before any upload', async t => {
  for (const kind of ['dist', 'file', 'directory']) {
    const root = project(t, []);
    const outside = path.join(root, 'private');
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'secret'), 'private');
    if (kind === 'dist') {
      fs.rmdirSync(path.join(root, 'dist'));
      fs.symlinkSync(outside, path.join(root, 'dist'));
    } else {
      fs.symlinkSync(kind === 'file' ? path.join(outside, 'secret') : outside, path.join(root, 'dist/link'));
    }
    const pub = load(() => assert.fail('must not upload'));
    await assert.rejects(pub.pub(root, 'demo', 'test'), /symbolic links/);
  }
});

test('empty outputs and missing credentials fail without calling the uploader', async t => {
  const root = project(t, []);
  const pub = load(() => assert.fail('must not upload'));
  await assert.rejects(pub.pub(root, 'demo', 'test'), /No build output/);
  await assert.rejects(pub.pub(root, 'demo', '__proto__'), /Invalid publishing environment/);
  const missing = load(() => assert.fail('must not upload'), {test: {ak: 'one'}});
  await assert.rejects(missing.pub(root, 'demo', 'test'), /Incomplete publishing credentials/);
});
