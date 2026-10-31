const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const webpack = require('webpack');
const {VueLoaderPlugin} = require('vue-loader');
const compiler = require('@vue/compiler-sfc');
const {createSSRApp} = require('vue');
const {renderToString} = require('@vue/server-renderer');

const templates = path.resolve(__dirname, '../server/template');
const names = ['m-module', 'm-page', 'pc-module', 'pc-page'];

test('all template components compile with the installed Vue 3 compiler', () => {
  assert.match(require('vue/package.json').version, /^3\./);
  assert.equal(compiler.version, require('vue/package.json').version);
  for (const name of names) {
    const root = path.join(templates, name);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    assert.equal(manifest['vue-version'], '3');
    assert.equal(manifest.dependencies.vue, '^3.5.44');
    assert.equal(fs.existsSync(path.join(root, '.babelrc')), false);
    for (const file of ['App.vue', 'components/Hello.vue']) {
      const filename = path.join(root, file);
      const {descriptor, errors} = compiler.parse(fs.readFileSync(filename, 'utf8'), {filename});
      assert.deepEqual(errors, [], filename);
      const script = compiler.compileScript(descriptor, {id: name});
      assert.ok(script.content.includes('export default'), filename);
      const compiled = compiler.compileTemplate({
        source: descriptor.template.content, filename, id: name
      });
      assert.deepEqual(compiled.errors, [], filename);
      for (const style of descriptor.styles) {
        const compiledStyle = compiler.compileStyle({
          source: style.content, filename, id: name, scoped: style.scoped
        });
        assert.deepEqual(compiledStyle.errors, [], filename);
      }
    }
  }
});

function bundle(config) {
  return new Promise((resolve, reject) => {
    const build = webpack(config);
    build.run((error, stats) => {
      build.close(closeError => {
        if (error || closeError) return reject(error || closeError);
        if (stats.hasErrors()) return reject(new Error(stats.toString({all: false, errors: true})));
        resolve();
      });
    });
  });
}

for (const name of ['m-module', 'pc-module']) {
  test(name + ' package entry exports a component usable by a Vue 3 consumer', async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpds-module-consumer-'));
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(templates, name, 'package.json'), 'utf8'));
      const moduleEntry = path.join(templates, name, manifest.main);
      const consumer = path.join(temp, 'consumer.js');
      fs.writeFileSync(consumer, 'import Component from ' + JSON.stringify(moduleEntry) + ';\nexport default Component;\n');
      await bundle({
        mode: 'development',
        target: 'node',
        devtool: false,
        entry: consumer,
        output: {path: temp, filename: 'consumer.cjs', library: {type: 'commonjs2', export: 'default'}},
        externals: {vue: 'commonjs ' + require.resolve('vue')},
        resolve: {extensions: ['.js', '.vue', '.json']},
        module: {rules: [
          {test: /\.vue$/, loader: require.resolve('vue-loader')},
          // SSR does not insert styles, but still compile and resolve SFC imports.
          {test: /\.css$/, type: 'asset/source'},
          {test: /\.(png|jpe?g|gif|svg)$/, type: 'asset/inline'}
        ]},
        plugins: [new VueLoaderPlugin()],
        optimization: {minimize: false}
      });
      const entry = path.join(temp, 'consumer.cjs');
      const Component = require(entry);
      assert.ok(Component && typeof Component === 'object');
      assert.ok(typeof Component.ssrRender === 'function' || typeof Component.render === 'function',
        'Default import must be the component, not a {default: Component} namespace');
      const html = await renderToString(createSSRApp(Component));
      assert.match(html, /Welcome to Your Vue\.js App/);
      assert.match(html, /class="vpds-app"/);
      assert.match(html, /class="hello"/);
      delete require.cache[entry];
    } finally {
      fs.rmSync(temp, {recursive: true, force: true});
    }
  });
}
