const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, ResourceLoader, VirtualConsole} = require('jsdom');

const dist = path.join(__dirname, '../server/src/app/dist');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, message, timeout = 5000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = check();
    if (value) return value;
    await delay(10);
  }
  throw new Error(message || 'Timed out waiting for UI');
}
function visible(element) {
  for (let current = element; current; current = current.parentElement) {
    if (current.hidden || current.style.display === 'none') return false;
  }
  return true;
}
function buttons(document, text) {
  return Array.from(document.querySelectorAll('button')).filter(button => visible(button) && button.textContent.replace(/\s/g, '') === text.replace(/\s/g, ''));
}
function dialog(document, title) {
  return Array.from(document.querySelectorAll('[role="dialog"]')).find(element => visible(element) && element.textContent.includes(title));
}
function enter(window, input, value) {
  assert(input, 'Expected an input');
  input.value = value;
  input.dispatchEvent(new window.Event('input', {bubbles: true}));
}
async function app(t, override) {
  assert(fs.existsSync(path.join(dist, 'index.html')), 'Run npm run build:ui before the UI tests');
  const requests = [];
  const errors = [];
  class LocalAssets extends ResourceLoader {
    fetch(url) {
      const pathname = new URL(url).pathname.replace(/^\/nested\//, '');
      const filename = path.resolve(dist, pathname);
      assert(filename.startsWith(dist + path.sep), 'Asset must stay in built dist');
      if (!fs.existsSync(filename)) return Promise.reject(new Error('Missing asset: ' + pathname));
      return Promise.resolve(fs.readFileSync(filename));
    }
  }
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => {
    // jsdom does not implement every modern CSS construct used by Element Plus.
    if (!/Could not parse CSS stylesheet/.test(error.message)) errors.push(error);
  });
  const dom = new JSDOM(fs.readFileSync(path.join(dist, 'index.html'), 'utf8'), {
    url: 'http://localhost:3000/nested/', runScripts: 'dangerously', resources: new LocalAssets(),
    pretendToBeVisual: true, virtualConsole,
    beforeParse(window) {
      window.ResizeObserver = class {observe() {} unobserve() {} disconnect() {}};
      window.matchMedia = () => ({matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}});
      window.scrollTo = () => {};
      window.fetch = async (url, options) => {
        requests.push({url, options});
        assert.equal(options.headers['X-VPDS-Request'], '1');
        assert.equal(options.credentials, 'same-origin');
        let body = override && await override(url, requests);
        if (body === undefined) {
          if (url === '/api/getTemplate') body = {status: 0, stdout: 'pc-module\npc-page\n'};
          else if (url === '/api/getConfig') body = {code: 0, data: {qiniu: {test: {}, release: {}}}};
          else if (/\/(local\/all|search\/)/.test(url)) body = {status: 0, data: {rows: [{name: '@scope/demo', version: '1.0.0', description: 'Vue 3 fixture', local: true}]}};
          else body = {status: 0};
        }
        return {ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(body)};
      };
    }
  });
  t.after(async () => {
    // Let Element Plus transition/focus promises settle before removing window.
    await delay(400);
    const mounted = dom.window.document.querySelector('#app').__vue_app__;
    if (mounted) mounted.unmount();
    await delay(100);
    dom.window.close();
    assert.deepEqual(errors.map(e => e.message), []);
  });
  await waitFor(() => dom.window.document.querySelector('.vpds-app'), 'Vue 3 application did not mount');
  await waitFor(() => buttons(dom.window.document, '复制')[0], 'Module cards did not render');
  return {window: dom.window, document: dom.window.document, requests};
}

test('production Vue 3 UI mounts under nested path and supports tabs and encoded searches', async t => {
  const {window, document, requests} = await app(t);
  assert.match(document.body.textContent, /@scope\/demo@1\.0\.0/);
  const page = Array.from(document.querySelectorAll('[role="menuitem"]')).find(item => item.textContent.trim() === '页面');
  page.click();
  await waitFor(() => requests.some(item => item.url === '/api/page/local/all'), 'Page tab did not load');
  enter(window, document.querySelector('input[placeholder="请输入内容"]'), 'name/#?');
  await waitFor(() => requests.some(item => item.url === '/api/page/search/name%2F%23%3F'), 'Search path was not encoded');
});

test('real Element Plus creation dialog cancels, resets, submits once and refreshes after completion', async t => {
  let finish;
  const {window, document, requests} = await app(t, url => url.includes('/create/') ? new Promise(resolve => {finish = resolve;}) : undefined);
  buttons(document, '新建')[0].click();
  let create = await waitFor(() => dialog(document, '新建'), 'Creation dialog did not open');
  enter(window, create.querySelector('input'), 'discarded');
  buttons(create, '取消')[0].click();
  await delay(350);
  buttons(document, '新建')[0].click();
  create = await waitFor(() => dialog(document, '新建'), 'Creation dialog did not reopen');
  assert.equal(create.querySelector('input').value, '');
  enter(window, create.querySelector('input'), '@scope/new-demo');
  create.querySelector('.el-select__wrapper').click();
  const option = await waitFor(() => Array.from(document.querySelectorAll('.el-select-dropdown__item')).find(item => item.textContent.trim() === 'pc-module'), 'Template options not rendered');
  option.click();
  const confirm = await waitFor(() => buttons(create, '确定').find(button => !button.disabled), 'Confirm never enabled');
  const before = requests.filter(item => item.url.endsWith('/local/all')).length;
  confirm.click();
  confirm.click();
  await waitFor(() => finish, 'Create request not sent');
  assert.equal(requests.filter(item => item.url.includes('/create/')).length, 1);
  assert(requests.some(item => item.url === '/api/module/create/%40scope%2Fnew-demo/pc-module'));
  assert.equal(requests.filter(item => item.url.endsWith('/local/all')).length, before);
  finish({status: 0});
  await waitFor(() => requests.filter(item => item.url.endsWith('/local/all')).length > before, 'List was not refreshed after creation');
});

test('copy and publish dialogs preserve failed input and recover loading state', async t => {
  let publishAttempts = 0;
  const {window, document, requests} = await app(t, url => {
    if (url.includes('/publish/')) return ++publishAttempts === 1 ? {status: 1, stderr: 'simulated publication failure'} : {status: 0};
  });
  buttons(document, '复制')[0].click();
  const copy = await waitFor(() => dialog(document, '复制'), 'Copy dialog missing');
  enter(window, copy.querySelector('input'), '@scope/copy');
  await waitFor(() => !buttons(copy, '确定')[0].disabled);
  buttons(copy, '确定')[0].click();
  await waitFor(() => requests.some(item => item.url === '/api/module/copy/%40scope%2Fdemo/%40scope%2Fcopy'), 'Copy params not encoded');
  await delay(350);
  buttons(document, '发布')[0].click();
  const publish = await waitFor(() => dialog(document, '版本号'), 'Publish dialog missing');
  assert.equal(publish.querySelector('input').value, '1.0.1');
  buttons(publish, '确定')[0].click();
  const error = await waitFor(() => dialog(document, '出错啦'), 'Publication failure was not shown');
  assert.match(error.textContent, /simulated publication failure/);
  assert.equal(publish.querySelector('input').value, '1.0.1');
  buttons(error, '确定')[0].click();
  await delay(350);
  await waitFor(() => !buttons(publish, '确定')[0].disabled, 'Failed operation left dialog disabled');
  buttons(publish, '确定')[0].click();
  await waitFor(() => publishAttempts === 2, 'Publication retry did not execute');
  assert(requests.some(item => item.url === '/api/module/publish/%40scope%2Fdemo/1.0.1/test'));
});
