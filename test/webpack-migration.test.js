'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const directory = path.resolve(__dirname, '../server/dev/build');
function evaluate(filename, dependencies, extra = {}) {
  const context = Object.assign({
    __dirname: directory,
    module: { exports: {} },
    process: { env: {} },
    require(name) {
      if (name === 'path') return path;
      if (!(name in dependencies)) throw new Error('Unexpected dependency: ' + name);
      return dependencies[name];
    }
  }, extra);
  context.exports = context.module.exports;
  vm.runInNewContext(fs.readFileSync(path.join(directory, filename), 'utf8'), context);
  return context.module.exports;
}
function Plugin(options) { this.options = options; }
const config = {
  build: { productionSourceMap: true, assetsSubDirectory: 'assets', dev_path: '/project' },
  dev: { cssSourceMap: false, dev_path: '/project' }
};
const common = {
  '../config': config,
  './utils': { assetsPath: value => 'assets/' + value, styleLoaders: options => [{ options }] },
  './webpack.base.conf': { entry: { app: '/project/index.js' } },
  'webpack-merge': { merge: (base, overrides) => ({ base, overrides }) },
  'html-webpack-plugin': Plugin
};

test('production uses Webpack 5 minimization, chunking and current plugin constructors', () => {
  const result = evaluate('webpack.prod.conf.js', Object.assign({}, common, {
    'copy-webpack-plugin': Plugin,
    'mini-css-extract-plugin': Plugin,
    'css-minimizer-webpack-plugin': Plugin
  })).overrides;
  assert.equal(result.mode, 'production');
  assert.equal(result.devtool, 'source-map');
  assert.equal(result.optimization.minimizer[0], '...');
  assert.equal(result.optimization.splitChunks.chunks, 'all');
  assert.equal(result.optimization.runtimeChunk, 'single');
  const copy = result.plugins.find(plugin => plugin.options.patterns);
  assert.equal(copy.options.patterns[0].from, '/project/assets');
  assert.equal(copy.options.patterns[0].noErrorOnMissing, true);
});

test('development retains the project entry and installs HMR with modern source maps', () => {
  const result = evaluate('webpack.dev.conf.js', Object.assign({}, common, {
    webpack: { HotModuleReplacementPlugin: Plugin }
  })).overrides;
  assert.equal(result.mode, 'development');
  assert.equal(result.devtool, 'eval-cheap-module-source-map');
  assert.equal(result.entry.app[1], '/project/index.js');
  assert.ok(result.entry.app[0].endsWith('/dev-client.js'));
  assert.equal(result.optimization.emitOnErrors, false);
});

test('CSS loaders use style-loader in development and extraction in production', () => {
  const tools = evaluate('utils.js', {
    '../config': config,
    'mini-css-extract-plugin': { loader: 'extract-loader' }
  });
  const development = tools.styleLoaders()[0];
  const production = tools.styleLoaders({ extract: true, sourceMap: true })[0];
  assert.equal(development.use[0], 'style-loader');
  assert.equal(production.use[0].loader, 'extract-loader');
  assert.equal(production.use[0].options.publicPath, '../../');
  assert.equal(production.use[1].options.sourceMap, true);
  assert.equal(production.use[1].options.minimize, undefined);
});

test('development middleware keeps loopback boundary and uses current HTML/proxy hooks', () => {
  const middleware = [];
  const events = {};
  const calls = [];
  let compilationHook;
  const compiler = {
    hooks: { compilation: { tap(name, callback) { compilationHook = callback; } } },
    close(callback) { calls.push('compiler-close'); callback(); }
  };
  const server = { on(name, callback) { events[name] = callback; } };
  const app = {
    use(fn) { middleware.push(fn); },
    listen(port, host, callback) {
      assert.equal(port, 8083);
      assert.equal(host, '127.0.0.1');
      callback();
      return server;
    }
  };
  const express = () => app;
  express.static = () => () => {};
  const development = () => {};
  development.waitUntilValid = callback => callback();
  development.close = callback => { calls.push('middleware-close'); callback(); };
  const hot = () => {};
  hot.publish = value => calls.push(value.action);
  hot.close = () => calls.push('hot-close');
  evaluate('dev-server.js', {
    '../config': { dev: {
      env: { NODE_ENV: '"development"' }, port: 8083, autoOpenBrowser: false,
      assetsPublicPath: '/', assetsSubDirectory: 'assets', dev_path: '/project',
      proxyTable: { '/api': 'http://127.0.0.1:3000' }
    } },
    opn: () => {}, express, webpack: () => compiler,
    'http-proxy-middleware': { createProxyMiddleware(options) {
      assert.equal(options.pathFilter, '/api');
      assert.equal(options.target, 'http://127.0.0.1:3000');
      return () => {};
    } },
    'html-webpack-plugin': { getHooks: () => ({ afterEmit: { tap(name, callback) {
      callback({});
    } } }) },
    './webpack.dev.conf': { output: { publicPath: '/' } },
    'webpack-dev-middleware': () => development,
    'webpack-hot-middleware': () => hot,
    'connect-history-api-fallback': () => () => {}
  }, { console: { log() {} } });
  const guard = middleware[0];
  function request(headers) {
    let outcome;
    const response = { status(code) { outcome = code; return this; }, end() {} };
    guard({ headers }, response, () => { outcome = 'allowed'; });
    return outcome;
  }
  assert.equal(request({ host: 'localhost:8083' }), 'allowed');
  assert.equal(request({ host: 'localhost:8083', origin: 'http://localhost:8083' }), 'allowed');
  assert.equal(request({ host: 'attacker.example:8083' }), 403);
  assert.equal(request({ host: 'localhost:8083', origin: 'https://attacker.example' }), 403);
  assert.equal(request({ host: 'localhost:8083', 'sec-fetch-site': 'cross-site' }), 403);
  compilationHook({});
  assert.ok(calls.includes('reload'));
  events.close();
  assert.deepEqual(calls.slice(-3), ['hot-close', 'middleware-close', 'compiler-close']);
});

// This integration case exercises the installed toolchain, not configuration mocks.
test('real production build preserves CSS assets and lazy chunks under a nested deployment', { timeout: 90000 }, async () => {
  const { spawnSync } = require('node:child_process');
  const repository = path.resolve(__dirname, '..');
  const project = fs.mkdtempSync(path.join(repository, '.webpack-integration-'));
  try {
    fs.writeFileSync(path.join(project, 'index.html'), '<!doctype html><html><head></head><body><div id="app"></div></body></html>');
    fs.writeFileSync(path.join(project, 'index.js'), "import './style.css'; import('./lazy').then(module => { globalThis.loadedValue = module.default });");
    fs.writeFileSync(path.join(project, 'lazy.js'), "export default 'lazy-chunk-loaded';");
    fs.writeFileSync(path.join(project, 'style.css'), '.hero { background-image: url("./background.png"); }');
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6i1cAAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(path.join(project, 'background.png'), Buffer.concat([pixel, Buffer.alloc(20000)]));
    const result = spawnSync(process.execPath, ['server/dev/build/build.js'], {
      cwd: repository,
      env: Object.assign({}, process.env, { dev_path: project }),
      encoding: 'utf8', timeout: 80000
    });
    assert.equal(result.status, 0, result.stdout + '\n' + result.stderr);
    const output = path.join(project, 'dist');
    const documentUrl = 'https://example.test/nested/index.html';
    function localResource(url, base = documentUrl) {
      const resolved = new URL(url, base);
      assert.ok(resolved.pathname.startsWith('/nested/'), 'resource escaped nested deployment: ' + resolved.href);
      const file = path.join(output, resolved.pathname.slice('/nested/'.length));
      assert.ok(fs.existsSync(file), 'missing built resource: ' + resolved.href);
      return { resolved, file };
    }
    const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    const stylesheet = [...html.matchAll(/href=["']?([^"'\s>]+\.css)/g)][0];
    assert.ok(stylesheet, 'extracted stylesheet is linked');
    const css = localResource(stylesheet[1]);
    const cssText = fs.readFileSync(css.file, 'utf8');
    const background = /url\((?:["']?)([^)'"\s]+)(?:["']?)\)/.exec(cssText);
    assert.ok(background, 'large background must be emitted rather than dropped');
    assert.ok(!background[1].startsWith('data:'), 'fixture must exercise external asset paths');
    const image = localResource(background[1], css.resolved.href);
    assert.ok(fs.statSync(image.file).size > 10000);

    // Execute generated runtime/main/lazy chunks with a minimal script-loading DOM.
    // URL resolution follows a browser document deployed below /nested/.
    const requested = [];
    let context;
    const document = {
      getElementsByTagName() { return []; },
      createElement() { return { setAttribute() {}, getAttribute() {} }; },
      head: { appendChild(script) {
        const resource = localResource(script.src);
        requested.push(resource.resolved.pathname);
        vm.runInContext(fs.readFileSync(resource.file, 'utf8'), context);
        if (script.onload) script.onload({ type: 'load', target: script });
      } }
    };
    context = vm.createContext({ document, self: {}, setTimeout, clearTimeout, console });
    const scripts = [...html.matchAll(/src=["']?([^"'\s>]+\.js)/g)];
    assert.ok(scripts.length >= 2, 'runtime and main scripts are generated');
    for (const script of scripts) {
      vm.runInContext(fs.readFileSync(localResource(script[1]).file, 'utf8'), context);
    }
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(context.loadedValue, 'lazy-chunk-loaded');
    assert.ok(requested.some(url => url.startsWith('/nested/assets/js/')), 'dynamic chunk loads relative to nested deployment');
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});
