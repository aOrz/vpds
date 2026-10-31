const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const validation = require('../server/src/lib/validation');
const guard = require('../server/src/lib/requestGuard');

test('public configuration exposes only publishing environment names', () => {
  const config = {mysql: {password: 'secret'}, user: {name: 'private'}, srcPath: '/private',
    qiniu: {test: {ak: 'secret-ak', sk: 'secret-sk', bucketName: 'private', url: 'url'}, release: {}}};
  const sandbox = {module: {exports: {}}, require: () => config};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../server/src/modules/getConfig.js'), 'utf8'), sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.module.exports())), {qiniu: {test: {}, release: {}}});
});

test('package names reject traversal, shell syntax, and npm options', () => {
  ['hello', 'hello.world', '@scope/my-package'].forEach(name => assert.equal(validation.packageName(name), name));
  ['', '..', '../escape', '/tmp/escape', '-g', 'foo;id', 'foo$(id)', 'foo bar', 'foo\\bar', '@scope/../escape', 'a\n', null]
    .forEach(name => assert.throws(() => validation.packageName(name), {status: 400}));
});

test('project paths support scopes and reject symlink escapes', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpds-validation-'));
  try {
    const root = path.join(temp, 'src');
    fs.mkdirSync(root);
    assert.equal(validation.projectPath(root, 'module', '@scope/name'), path.join(root, 'modules/@scope/name'));
    assert.throws(() => validation.projectPath(root, 'unknown', 'name'), {status: 400});
    fs.symlinkSync(temp, path.join(root, 'modules'));
    assert.throws(() => validation.projectPath(root, 'module', 'name'), {status: 400});
    fs.mkdirSync(path.join(root, 'pages'));
    fs.symlinkSync(path.join(temp, 'missing'), path.join(root, 'pages/dangling'));
    assert.throws(() => validation.projectPath(root, 'page', 'dangling'), {status: 400});
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
});

function request(headers, route = '/api/page/create/a/b') {
  let called = false;
  guard.requestGuard({path: route, get: name => headers[name] || '', throw: status => {
    const error = new Error('denied'); error.status = status; throw error;
  }}, () => { called = true; });
  return called;
}

test('API guard allows local requests and rejects rebinding and cross-origin calls', () => {
  assert.equal(request({host: 'localhost:3000', origin: 'http://localhost:3000', 'x-vpds-request': '1'}), true);
  assert.equal(request({host: '127.0.0.1:3000', 'x-vpds-request': '1'}), true);
  assert.equal(request({host: '[::1]:3000', 'x-vpds-request': '1'}), true);
  [
    {host: 'attacker.test:3000'},
    {host: 'localhost:3000', origin: 'https://attacker.test'},
    {host: 'localhost:3000', origin: 'null'},
    {host: 'localhost:3000', 'sec-fetch-site': 'cross-site'},
    {host: 'localhost:3000', 'sec-fetch-site': 'same-site'},
    {host: 'localhost:3000.attacker.test'},
    {}
  ].forEach(headers => assert.throws(() => request(Object.assign({'x-vpds-request': '1'}, headers)), {status: 403}));
  assert.throws(() => request({host: 'attacker.test:3000'}, '/'), {status: 403});
});

test('listener cannot be exposed beyond loopback', () => {
  assert.equal(guard.listenHost(), '127.0.0.1');
  assert.equal(guard.listenHost('::1'), '::1');
  assert.throws(() => guard.listenHost('0.0.0.0'), /loopback/);
  assert.throws(() => guard.listenHost('192.168.1.2'), /loopback/);
});


test('mutating GET endpoints require a custom header even without browser metadata', () => {
  ['module', 'page'].forEach(kind => {
    ['install', 'copy', 'create', 'publish', 'build', 'dev'].forEach(action => {
      const route = '/api/' + kind + '/' + action + '/name';
      assert.throws(() => request({host: 'localhost:3000'}, route), {status: 403});
      assert.throws(() => request({host: 'localhost:3000'}, route.toUpperCase()), {status: 403});
      assert.throws(() => request({host: 'localhost:3000', 'x-vpds-request': '0'}, route), {status: 403});
      assert.equal(request({host: 'localhost:3000', 'x-vpds-request': '1'}, route), true);
    });
  });
  assert.equal(request({host: 'localhost:3000'}, '/api/module/local/all'), true);
});
