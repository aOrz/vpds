const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const express = require('express');
const Koa = require('koa');
const guard = require('../server/src/lib/requestGuard');

function listen(server) { return new Promise(resolve => server.once('listening', resolve)); }
function close(server) { return new Promise(resolve => server.close(resolve)); }

test('UI dev proxy uses webpack-dev-server actual middleware API and preserves local-only guard', async t => {
  const ui = path.join(__dirname, '../server/src/app');
  const wds = require.resolve('webpack-dev-server', {paths: [ui]});
  const actualProxyPath = require.resolve('http-proxy-middleware', {paths: [path.dirname(wds)]});
  const {createProxyMiddleware} = require(actualProxyPath);
  const config = require('../server/src/app/webpack.config')({}, {mode: 'development'});
  let mutations = 0;
  let receivedOrigin;
  const backend = new Koa();
  backend.use(guard.requestGuard);
  backend.use(ctx => { mutations++; receivedOrigin = ctx.get('origin'); ctx.body = {status: 0}; });
  const backendServer = backend.listen(0, '127.0.0.1');
  await listen(backendServer);
  t.after(() => close(backendServer));
  const frontend = express();
  config.devServer.setupMiddlewares([]).forEach(entry => frontend.use(entry.middleware));
  const proxy = config.devServer.proxy[0];
  frontend.use(createProxyMiddleware(Object.assign({}, proxy, {
    target: 'http://127.0.0.1:' + backendServer.address().port,
    on: {proxyReq(req, incoming) {
      // The test backend binds an ephemeral port; give its fixed-port guard the
      // production backend Host while executing the unmodified origin hook.
      req.setHeader('host', '127.0.0.1:3000');
      proxy.on.proxyReq(req, incoming);
    }}
  })));
  const frontendServer = frontend.listen(0, '127.0.0.1');
  await listen(frontendServer);
  t.after(() => close(frontendServer));
  const request = headers => new Promise((resolve, reject) => {
    http.get({host: '127.0.0.1', port: frontendServer.address().port, path: '/api/page/build/demo', headers: Object.assign({Host: 'localhost:8010', 'X-VPDS-Request': '1'}, headers)}, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    }).on('error', reject);
  });
  assert.equal(await request({Origin: 'http://localhost:8010'}), 200);
  assert.equal(receivedOrigin, 'http://127.0.0.1:3000');
  assert.equal(await request({Origin: 'https://evil.invalid'}), 403);
  assert.equal(await request({Host: 'evil.invalid:8010'}), 403);
  assert.equal(await request({'Sec-Fetch-Site': 'cross-site'}), 403);
  assert.equal(await request({'X-VPDS-Request': ''}), 403);
  assert.equal(mutations, 1);
});
