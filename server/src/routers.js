const Router = require('koa-router');
const path = require('path');
const config = require('../config/index.js');
const validation = require('./lib/validation.js');
const u = require('./lib/utils.js');
const install = require('./modules/install.js');
const info = require('./modules/getInfo.js');
const search = require('./modules/search.js');
const cp = require('./modules/cp.js');
const publish = require('./modules/publish.js');
const build = require('./modules/build.js');
const mysql = require('./modules/mysql.js');
const dev = require('./modules/dev.js');
const template = require('./modules/getTemplate.js');
const getConfig = require('./modules/getConfig.js');
const router = new Router();
const operations = new Map();

// Requests for different projects may run concurrently, but two mutations of
// the same project's output/manifest must not overlap.
async function withProject(kind, name, action) {
  const key = kind + ':' + name;
  const previous = operations.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(action);
  operations.set(key, current);
  try {
    return await current;
  } finally {
    if (operations.get(key) === current) operations.delete(key);
  }
}

function route(url, handler) {
  router.get(url, async ctx => {
    try {
      ['name', 'fromname', 'toname', 'template'].forEach(key => {
        if (ctx.params[key] !== undefined) validation.packageName(ctx.params[key]);
      });
      await handler(ctx);
    } catch (error) {
      ctx.status = error.status || 500;
      // Do not serialize database credentials, queries, paths or raw errors.
      ctx.body = {status: 1, stderr: ctx.status === 400 ? error.message : 'Operation failed; check the server logs'};
      if (ctx.status !== 400) console.error('VPDS operation failed:', error.code || error.name || 'Error');
    }
  });
}

['module', 'page'].forEach(kind => {
  const title = kind === 'module' ? 'Module' : 'Page';
  route(`/api/${kind}/install/:name`, async ctx => {
    ctx.body = u.parseOut(await withProject(kind, ctx.params.name, () => install['install' + title](ctx.params.name)));
  });
  route(`/api/${kind}/local/all`, async ctx => {
    ctx.body = {status: 0, data: {rows: await info['getLocal' + title + 'sInfo']()}};
  });
  route(`/api/${kind}/search/:str`, async ctx => {
    ctx.body = await search['search' + title](ctx.params.str);
  });
  route(`/api/${kind}/copy/:fromname/:toname`, async ctx => {
    const params = ctx.params;
    ctx.body = u.parseOut(await withProject(kind, params.toname, () =>
      cp['cp' + title](params.fromname, params.toname, path.join(config.srcPath, kind + 's'))));
  });
  route(`/api/${kind}/create/:name/:template`, async ctx => {
    const params = ctx.params;
    ctx.body = u.parseOut(await withProject(kind, params.name, () =>
      cp['cp' + title](params.template, params, path.join(config.serverPath, 'template'))));
  });
  route(`/api/${kind}/publish/:name/:version/:pub_type`, async ctx => {
    const params = ctx.params;
    publish.validate(params);
    const result = await withProject(kind, params.name, async () => {
      const built = await build['build' + title](params.name);
      if (built.code !== 0) return built;
      const published = await publish['publish' + title](params);
      if (published.code === 0) await mysql.save(kind, params.name);
      return published;
    });
    ctx.body = u.parseOut(result);
  });
  route(`/api/${kind}/build/:name`, async ctx => {
    ctx.body = u.parseOut(await withProject(kind, ctx.params.name, () => build['build' + title](ctx.params.name)));
  });
  route(`/api/${kind}/dev/:name`, async ctx => {
    ctx.body = u.parseOut(await dev(kind, ctx.params.name));
  });
});

route('/api/getTemplate', async ctx => {
  ctx.body = u.parseOut(await template.getTemplate());
});
route('/api/getConfig', async ctx => {
  ctx.body = {code: 0, data: getConfig()};
});

module.exports = () => router;
