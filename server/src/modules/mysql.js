const shell = require('shelljs');
const fs= require('fs');
const path = require('path');
const rootPath = path.resolve(__dirname, '../../template/src/modules/');
const connection = require('../lib/mysql.js').connection;
const config = require('../../config/index.js');

async function save (kind, name) {
  // console.log(kind, 'kind')
  let parms = require( config.srcPath + `/${kind}s/` + name + '/package.json');
  // console.log(parms)
  // connection.connect();
  let isExist = await gets(kind, `\`package_name\` = '${name}'`);
  let fields;
  if (isExist.length) {
    fields = await connection.query("UPDATE package set `package_string` = '" +  encodeURIComponent(JSON.stringify(parms)) + "' where \`package_name\` = '" + name + "'");
  } else {
    fields = await connection.query("INSERT into package (`package_name`, `package_string`, `kind`) VALUES ('" + parms.name + "', '" + encodeURIComponent(JSON.stringify(parms)) + "', '" + kind + "')");
  }
  return fields[0].fieldCount
  // connection.end();
}

async function gets (kind, str) {
  // connection.connect();
  // console.log(`select * from package where \`package_string\` like '%${name}%'  and \`kind\` = '${kind}'`);
  let [rows, fields] = await connection.query(`select * from package where ${str}  and \`kind\` = '${kind}'`);
  // connection.end();
  console.log(rows.length);
  return rows;
}

async function select(sql) {
  let [rows, fields] = await connection.query(sql);
  return rows;
}
// save('', 'test1').then((data) => {
//   console.log(data)
// }).catch(e => console.log(e));
module.exports = {
  save: save,
  gets: gets,
  select
}