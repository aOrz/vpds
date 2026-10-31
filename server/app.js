const Koa = require('koa');
const path = require('path');
const opn = require('opn');
const routers = require('./src/routers');
const guard = require('./src/lib/requestGuard');
const connection = require('./src/lib/mysql.js').connection;

const app = new Koa();
let router = routers();
app.context.db = connection;

app.use(guard.requestGuard);
app.use(require('koa-static')(path.join(__dirname, 'src/app/dist')));

app
  .use(router.routes())
  .use(router.allowedMethods());

// Package installation and publishing are privileged, local-only operations.
const host = guard.listenHost(process.env.VPDS_HOST);
app.listen(3000, host, function () {
  if (process.env.VPDS_OPEN_BROWSER !== 'false') {
    opn('http://localhost:3000').catch(() => console.warn('Open http://localhost:3000 in your browser'));
  }
  console.log('listening on ' + host + ':3000');
});
