const Koa = require('koa');
const path = require('path');
const opn = require('opn');
const routers = require('./src/routers');
const connection = require('./src/lib/mysql.js').connection;

const app = new Koa();
let router = routers();
app.context.db = connection;

app.use(require('koa-static')('./server/src/app/dist/'));

app
  .use(router.routes())
  .use(router.allowedMethods());

// app.use(ctx => {
//   ctx.body = 'Hello World';
// });

app.listen(3000);
opn('http://localhost:3000');
console.log('listening on port 3000');