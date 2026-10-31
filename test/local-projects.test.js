const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const projects = require('../server/src/lib/localProjects.js');
const validation = require('../server/src/lib/validation.js');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vpds-projects-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return root;
}
function create(root, name, data = {name}) {
  const directory = path.join(root, name);
  fs.mkdirSync(directory, {recursive: true});
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify(data));
  return directory;
}
function load(relative, dependencies) {
  const filename = path.join(__dirname, '..', relative);
  const module = {exports: {}};
  vm.runInThisContext('(function(require,module,exports){' + fs.readFileSync(filename, 'utf8') + '\n})', {filename})(
    name => Object.prototype.hasOwnProperty.call(dependencies, name) ? dependencies[name] : require(name), module, module.exports
  );
  return module.exports;
}
function deps(root) {
  return {
    '../../config/index.js': {srcPath: path.join(root, 'src'), serverPath: path.join(root, 'server')},
    '../lib/validation.js': validation,
    '../lib/localProjects.js': projects
  };
}

test('native project discovery supports scoped packages and returns sorted complete projects only', async t => {
  const root = fixture(t);
  create(root, 'zeta');
  create(root, '@scope/widget');
  create(root, 'alpha');
  create(root, 'bad..name');
  create(root, '.hidden');
  fs.mkdirSync(path.join(root, 'incomplete'));
  fs.writeFileSync(path.join(root, 'README'), 'not a project');
  const result = await projects.list(root);
  assert.deepEqual(result.map(item => item.name), ['@scope/widget', 'alpha', 'zeta']);
  assert.deepEqual(await Promise.all(result.map(projects.readManifest)), [
    {name: '@scope/widget'}, {name: 'alpha'}, {name: 'zeta'}
  ]);
  assert.deepEqual(await projects.list(path.join(root, 'missing')), []);
});

test('discovery ignores symlinked packages, scopes and manifests', async t => {
  const root = fixture(t);
  const outside = fixture(t);
  const external = create(outside, 'external');
  fs.symlinkSync(external, path.join(root, 'linked'));
  fs.symlinkSync(outside, path.join(root, '@linked'));
  fs.mkdirSync(path.join(root, 'manifest-link'));
  fs.symlinkSync(path.join(external, 'package.json'), path.join(root, 'manifest-link/package.json'));
  fs.symlinkSync(path.join(outside, 'missing'), path.join(root, 'dangling'));
  assert.deepEqual(await projects.list(root), []);
});

test('getInfo preserves array payload and includes scoped page and module manifests', async t => {
  const root = fixture(t);
  create(root, 'src/modules/@team/module', {name: '@team/module', version: '1.0.0'});
  create(root, 'src/pages/page', {name: 'page', version: '2.0.0'});
  const info = load('server/src/modules/getInfo.js', deps(root));
  assert.deepEqual(await info.getLocalModulesInfo(), [{name: '@team/module', version: '1.0.0'}]);
  assert.deepEqual(await info.getLocalPagesInfo(), [{name: 'page', version: '2.0.0'}]);
});

test('template listing preserves code/stdout API with safe complete templates only', async t => {
  const root = fixture(t);
  create(root, 'server/template/pc-module');
  create(root, 'server/template/m-page');
  fs.writeFileSync(path.join(root, 'server/template/README'), 'docs');
  const template = load('server/src/modules/getTemplate.js', deps(root));
  assert.deepEqual(await template.getTemplate(), {code: 0, stdout: 'm-page\npc-module'});
});

test('search recognizes scoped local manifests and retains response aliases', async t => {
  const root = fixture(t);
  create(root, 'src/modules/@team/widget', {name: '@team/widget'});
  fs.mkdirSync(path.join(root, 'src/modules/incomplete'));
  const dependencies = deps(root);
  dependencies['./mysql.js'] = {gets: async (kind, predicate, values) => {
    assert.equal(kind, 'module');
    assert.equal(predicate, '`package_string` like ?');
    assert.deepEqual(values, ["%a'b%"]);
    return ['@team/widget', 'remote', 'incomplete'].map(name => ({package_string: encodeURIComponent(JSON.stringify({name}))}));
  }};
  const search = load('server/src/modules/search.js', dependencies);
  const response = await search.searchModule("a'b");
  assert.equal(response.status, 0);
  assert.equal(response.body, response.data.rows);
  assert.deepEqual(response.data.rows, [
    {name: '@team/widget', local: true}, {name: 'remote', local: false}, {name: 'incomplete', local: false}
  ]);
});

test('category and template directory symlinks cannot escape configured roots', async t => {
  const root = fixture(t);
  const outside = fixture(t);
  create(outside, 'external');
  fs.mkdirSync(path.join(root, 'src'));
  fs.mkdirSync(path.join(root, 'server'));
  fs.symlinkSync(outside, path.join(root, 'src/modules'));
  fs.symlinkSync(outside, path.join(root, 'server/template'));
  const info = load('server/src/modules/getInfo.js', deps(root));
  const template = load('server/src/modules/getTemplate.js', deps(root));
  await assert.rejects(info.getLocalModulesInfo(), /escapes/);
  await assert.rejects(template.getTemplate(), /escapes/);
});

test('malformed manifests are reported instead of silently hiding invalid JSON', async t => {
  const root = fixture(t);
  create(root, 'src/modules/broken');
  fs.writeFileSync(path.join(root, 'src/modules/broken/package.json'), '{');
  const info = load('server/src/modules/getInfo.js', deps(root));
  await assert.rejects(info.getLocalModulesInfo(), SyntaxError);
});

test('mysql pool setup forwards configuration to the promise API without opening connections', () => {
  const config = {host: 'localhost', user: 'test', database: 'test'};
  const pool = {query: async () => [[], []], end: async () => {}};
  const mysql = load('server/src/lib/mysql.js', {
    'mysql2/promise': {createPool: options => {assert.equal(options, config);return pool;}},
    '../../config/index.js': {mysql: config}
  });
  assert.equal(mysql.connection, pool);
});

test('manifest reads reject a symlink swapped in after discovery', {skip: !fs.constants.O_NOFOLLOW}, async t => {
  const root = fixture(t);
  const outside = fixture(t);
  const local = create(root, 'local');
  const external = create(outside, 'secret');
  const [project] = await projects.list(root);
  fs.unlinkSync(path.join(local, 'package.json'));
  fs.symlinkSync(path.join(external, 'package.json'), path.join(local, 'package.json'));
  await assert.rejects(projects.readManifest(project), error => error.code === 'ELOOP');
});

test('installed mysql2 v3 Promise pool remains lazy and can be closed without database access', async () => {
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({host: '127.0.0.1', user: 'vpds-test', database: 'vpds-test'});
  try {
    assert.equal(typeof pool.query, 'function');
    assert.equal(typeof pool.execute, 'function');
    assert.equal(pool.pool._allConnections.length, 0);
  } finally {
    await pool.end();
  }
});
