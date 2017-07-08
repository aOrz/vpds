const Router = require('koa-router');
const router = new Router();
const shell = require('shelljs');
const child_process = require('child_process');
const init = require('./modules/init.js');
const u = require('./lib/utils.js');
const config = require('../config/index.js');
const path = require('path');
const install = require('./modules/install.js');

router.get('/api/module/install/:name', async function (ctx) {
  let o = await install.installModule(ctx.params.name);
  ctx.body = u.parseOut(o);
});

router.get('/api/page/install/:name', async function (ctx) {
  let o = await install.installPage(ctx.params.name);
  ctx.body = u.parseOut(o);
});

const info = require('./modules/getInfo.js');

router.get('/api/module/local/all', async function (ctx) {
  let o = await info.getLocalModulesInfo();
  ctx.body = {status: 0,
    data:{
      rows: o}};
})
router.get('/api/page/local/all', async function (ctx) {
  let o = await info.getLocalPagesInfo();
  ctx.body = {status: 0,
    data:{
      rows: o}};
})

const search = require('./modules/search.js');

router.get('/api/module/search/:str', async function (ctx) {
  let o = await search.searchModule(ctx.params.str)
  ctx.body = JSON.stringify(o);
})
router.get('/api/page/search/:str', async function (ctx) {
  let o = await search.searchPage(ctx.params.str)
  ctx.body = JSON.stringify(o);
})

const cp = require('./modules/cp.js');

router.get('/api/module/copy/:fromname/:toname', async function (ctx) {
  let o = await cp.cpModule(ctx.params.fromname, ctx.params.toname, path.resolve(config.srcPath, 'modules/'));
  ctx.body = u.parseOut(o);
});
router.get('/api/page/copy/:fromname/:toname', async function (ctx) {
  let o = await cp.cpPage(ctx.params.fromname, ctx.params.toname, path.resolve(config.srcPath, 'pages/'));
  ctx.body = u.parseOut(o);
});

router.get('/api/module/create/:name/:template', async function (ctx) {
  let params = ctx.params;
  let o = await cp.cpModule(params.template, params, path.resolve(config.serverPath, 'template'));
  ctx.body = u.parseOut(o);
});
router.get('/api/page/create/:name/:template', async function (ctx) {
  let params = ctx.params;
  let o = await cp.cpPage(params.template, params, path.resolve(config.serverPath, 'template'));
  ctx.body = u.parseOut(o);
});

const publish = require('./modules/publish.js');
const build = require('./modules/build.js');
const mysql = require('./modules/mysql.js');
router.get('/api/module/publish/:name/:version/:pub_type', async function (ctx) {
  let params = ctx.params;
  process.env.dev_path = config.srcPath + '/modules/' + params.name
  shell.cd(process.env.dev_path);
  await build.buildModule(params.name);
  let o = await publish.publishModule(params);
  if (o.code === 0) {
    mysql.save('module', params.name).catch(e => {
      console.log(e);
    });
  }
  ctx.body = u.parseOut(o);
});
router.get('/api/page/publish/:name/:version/:pub_type', async function (ctx) {
  let params = ctx.params;
  process.env.dev_path = config.srcPath + '/pages/' + params.name
  shell.cd(process.env.dev_path);
  await build.buildPage(params.name);
  let o = await publish.publishPage(params);
  if (o.code === 0) {
    mysql.save('page', params.name).catch(e => {
      console.log(e);
    });
  }
  ctx.body = u.parseOut(o);
});

router.get('/api/module/build/:name',async function (ctx) {
  process.env.dev_path = config.srcPath + '/modules/' + ctx.params.name;
  let o = build.buildModule(ctx.params.name);
  ctx.body = u.parseOut(o);
});
router.get('/api/page/build/:name',async function (ctx) {
  process.env.dev_path = config.srcPath + '/pages/' + ctx.params.name;
  let o = build.buildPage(ctx.params.name);
  ctx.body = u.parseOut(o);
});
let dev = require('./modules/dev.js');
router.get('/api/module/dev/:name', function (ctx) {
  let {name} = ctx.params;
  dev('module', name);
  ctx.body = JSON.stringify({status:'0'});
});

router.get('/api/page/dev/:name', function (ctx) {
  let {name} = ctx.params;
  dev('page', name);
  ctx.body = JSON.stringify({status:'0'});
});
const template = require('./modules/getTemplate.js');
 router.get('/api/getTemplate',async function (ctx) {
    let arr = await template.getTemplate();
    ctx.body = u.parseOut(arr);
});
const getConfig = require('./modules/getConfig.js');
 router.get('/api/getConfig',async function (ctx) {
    let obj = getConfig();
    ctx.body = {
      code: 0,
      data: obj
      };
});
module.exports = function () {
  return router;
};