const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

function load(relative, dependencies) {
  const filename = path.join(__dirname, '..', relative);
  const module = {exports: {}};
  vm.runInThisContext('(function(require, module, exports) {' + fs.readFileSync(filename, 'utf8') + '\n})', {filename})(
    name => Object.prototype.hasOwnProperty.call(dependencies, name) ? dependencies[name] : require(name),
    module, module.exports
  );
  return module.exports;
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vpds-copy-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, 'source'));
  fs.writeFileSync(path.join(root, 'source/package.json'), JSON.stringify({name: 'original', version: '1.0.0'}));
  return root;
}
function utils(root, mysql = {}) {
  return load('server/src/lib/utils.js', {
    '../../config/index.js': {srcPath: root},
    '../lib/fs.js': fs,
    '../modules/mysql.js': mysql,
    './validation.js': {packageName: () => {}}
  });
}

test('copy completes and renames manifest before returning; never overwrites existing target', t => {
  const root = fixture(t);
  const u = utils(root);
  const destination = path.join(root, 'copy');
  assert.equal(u.cpModule(path.join(root, 'source'), destination, {name: 'new', author: 'a'}).code, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(destination, 'package.json')));
  assert.equal(manifest.name, 'new');
  assert.equal(manifest.author, 'a');
  assert.equal(u.cpModule(path.join(root, 'source'), destination, {name: 'overwrite'}).code, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(destination, 'package.json'))).name, 'new');
});

test('JSON updates and database save read fresh on-disk manifests', async t => {
  const root = fixture(t);
  const file = path.join(root, 'source/package.json');
  const u = utils(root);
  u.alterJson(file, {version: '2.0.0'});
  fs.writeFileSync(file, JSON.stringify({name: 'source', version: '3.0.0', extra: true}));
  u.alterJson(file, {author: 'updated'});
  const calls = [];
  const mysql = load('server/src/modules/mysql.js', {
    '../lib/mysql.js': {connection: {query: async (sql, values) => {
      calls.push({sql, values});
      return sql.startsWith('SELECT') ? [[{package_name: 'source'}]] : [{fieldCount: 0}];
    }}},
    '../../config/index.js': {srcPath: root},
    '../lib/validation.js': {projectPath: () => path.join(root, 'source')}
  });
  await mysql.save('module', 'source');
  const updated = JSON.parse(decodeURIComponent(calls[1].values[0]));
  assert.equal(updated.version, '3.0.0');
  assert.equal(updated.extra, true);
  assert.match(calls[1].sql, /AND `kind` = \?/);
  assert.deepEqual(calls[1].values.slice(1), ['source', 'module']);
});

test('existence checks await query and keep hostile input out of SQL', async () => {
  const name = "x' OR 1=1 --";
  const u = utils('/unused', {select: async (sql, values) => {
    assert(!sql.includes(name));
    assert.deepEqual(values, [name]);
    return [{package_name: name}];
  }});
  assert.equal((await u.moduleExits(name)).code, 1);
});

test('search values are parameterized for both package kinds', async () => {
  const str = "' OR 1=1 --";
  const searches = [];
  const search = load('server/src/modules/search.js', {
    './mysql.js': {gets: async (kind, predicate, values) => {
      searches.push(kind);
      assert.equal(predicate, '`package_string` like ?');
      assert.deepEqual(values, ['%' + str + '%']);
      return [];
    }},
    '../lib/localProjects.js': {list: async () => []},
    '../lib/validation.js': {within: (root, name) => path.join(root, name)},
    '../../config/index.js': {srcPath: '/unused'}
  });
  await search.searchModule(str);
  await search.searchPage(str);
  assert.deepEqual(searches, ['module', 'page']);
});

test('copy persists only after completed filesystem work and awaits database completion', async () => {
  const events = [];
  let copyResult = {code: 0};
  const cp = load('server/src/modules/cp.js', {
    '../lib/utils.js': {cpModule: () => { events.push('copy'); return copyResult; }},
    '../../config/index.js': {srcPath: '/root/src', user: {name: 'a'}},
    './mysql.js': {save: async () => { await Promise.resolve(); events.push('save'); }},
    '../lib/validation.js': {projectPath: () => '/root/src/modules/test', within: () => '/source'}
  });
  assert.equal((await cp.cpModule('source', 'test')).code, 0);
  assert.deepEqual(events, ['copy', 'save']);
  events.length = 0;
  copyResult = {code: 1, stderr: 'exists'};
  assert.equal((await cp.cpPage('source', 'test')).code, 1);
  assert.deepEqual(events, ['copy']);
});

test('database failure is reported without claiming successful creation', async () => {
  const cp = load('server/src/modules/cp.js', {
    '../lib/utils.js': {cpModule: () => ({code: 0})},
    '../../config/index.js': {srcPath: '/root/src', user: {name: 'a'}},
    './mysql.js': {save: async () => { throw new Error('offline'); }},
    '../lib/validation.js': {projectPath: () => '/target', within: () => '/source'}
  });
  const result = await cp.cpModule('source', 'test');
  assert.equal(result.code, 1);
  assert.match(result.stderr, /offline/);
});

test('failed copy cleans only its newly created directory', t => {
  const root = fixture(t);
  const u = utils(root);
  fs.symlinkSync('/outside', path.join(root, 'source/link'));
  const target = path.join(root, 'copy');
  assert.equal(u.cpModule(path.join(root, 'source'), target, {name: 'copy'}).code, 1);
  assert.equal(fs.existsSync(target), false);
  assert.equal(fs.existsSync(path.join(root, 'source/package.json')), true);
});

test('npm installation uses argv and a per-process cwd without a shell', async () => {
  let invocation;
  const u = load('server/src/lib/utils.js', {
    child_process: {execFile: (command, args, options, callback) => {
      invocation = {command, args, options};
      callback(null, 'installed', '');
    }},
    '../../config/index.js': {srcPath: '/project/src', npmType: 'npm'},
    '../lib/fs.js': fs,
    '../modules/mysql.js': {},
    './validation.js': {packageName: value => assert.equal(value, 'example')}
  });
  assert.equal((await u.installNpm('example')).code, 0);
  assert.equal(invocation.command, 'npm');
  assert.deepEqual(invocation.args, ['install', '--', 'example']);
  assert.deepEqual(invocation.options, {cwd: '/project'});
});

test('new manifests and search filters are bound as database values', async t => {
  const root = fixture(t);
  const calls = [];
  const mysql = load('server/src/modules/mysql.js', {
    '../lib/mysql.js': {connection: {query: async (sql, values) => {
      calls.push({sql, values});
      return sql.startsWith('SELECT') ? [[]] : [{fieldCount: 0}];
    }}},
    '../../config/index.js': {srcPath: root},
    '../lib/validation.js': {projectPath: () => path.join(root, 'source')}
  });
  const name = "hostile'";
  await mysql.save('page', name);
  assert.equal(calls[0].sql, 'SELECT * FROM package WHERE `package_name` = ? AND `kind` = ?');
  assert.deepEqual(calls[0].values, [name, 'page']);
  assert.equal(calls[1].sql, 'INSERT INTO package (`package_name`, `package_string`, `kind`) VALUES (?, ?, ?)');
  assert.equal(calls[1].values[0], name);
  assert.equal(calls[1].values[2], 'page');
});

test('scoped package copies create their scope directory without overwriting siblings', t => {
  const root = fixture(t);
  const u = utils(root);
  const scope = path.join(root, '@scope');
  assert.equal(u.cpModule(path.join(root, 'source'), path.join(scope, 'first'), {name: '@scope/first'}).code, 0);
  assert.equal(u.cpModule(path.join(root, 'source'), path.join(scope, 'second'), {name: '@scope/second'}).code, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(scope, 'first/package.json'))).name, '@scope/first');
  assert.equal(JSON.parse(fs.readFileSync(path.join(scope, 'second/package.json'))).name, '@scope/second');
});
