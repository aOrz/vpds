const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Koa = require('koa');
const Router = require('koa-router');
const guard = require('../server/src/lib/requestGuard');

test('real HTTP routing enforces mutation guard before calling a handler', async t => {
  const app = new Koa();
  const router = new Router();
  let mutations = 0;
  app.use(guard.requestGuard);
  router.get('/api/page/build/:name', ctx => {mutations++; ctx.body = {ok: true};});
  app.use(router.routes());
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;
  const get = (url, headers) => new Promise((resolve, reject) => {
    http.get({host: '127.0.0.1', port, path: url, headers: Object.assign({Host: 'localhost:3000'}, headers)}, response => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    }).on('error', reject);
  });
  assert.equal(await get('/api/page/build/demo'), 403);
  assert.equal(await get('/api/page/build/demo', {'X-VPDS-Request': '1', Origin: 'https://evil.invalid'}), 403);
  assert.equal(await get('/api/page/build/demo', {'X-VPDS-Request': '1', Origin: 'null'}), 403);
  assert.equal(await get('/api/page/build/demo', {'X-VPDS-Request': '1', Host: 'evil.invalid:3000'}), 403);
  assert.equal(await get('/API/PAGE/BUILD/demo'), 403);
  assert.equal(await get('/api%2Fpage/build/demo'), 404);
  assert.equal(await get('/api/page/build/demo', {'X-VPDS-Request': '1', Origin: 'http://localhost:3000'}), 200);
  assert.equal(mutations, 1);
});

test('development middleware rejects hostile Host/Origin before serving source', () => {
  const source = fs.readFileSync(path.join(__dirname, '../server/dev/build/dev-server.js'), 'utf8');
  const start = source.indexOf('app.use(function (req, res, next)');
  const end = source.indexOf('var compiler =');
  assert(start > 0 && end > start);
  let guard;
  vm.runInNewContext(source.slice(start, end), {port: 8083, app: {use: fn => {guard = fn;}}});
  function request(headers) {
    let result;
    guard({headers}, {status(code) {result = code; return this;}, end() {}}, () => {result = 200;});
    return result;
  }
  assert.equal(request({host: 'localhost:8083'}), 200);
  assert.equal(request({host: '127.0.0.1:8083', origin: 'http://127.0.0.1:8083'}), 200);
  assert.equal(request({host: 'evil.invalid:8083'}), 403);
  assert.equal(request({host: 'localhost:8083', origin: 'https://evil.invalid'}), 403);
  assert.equal(request({host: 'localhost:8083', 'sec-fetch-site': 'cross-site'}), 403);
});
