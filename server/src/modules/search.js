const mysql = require('./mysql.js');
const glob = require('glob');
const config = require('../../config/index.js');
const path = require('path');

async function searchModule (str) {
  let rows = await mysql.gets('module', `\`package_string\` like '%${str}%'`);
  let modules = glob.sync('/*', {
    root: path.resolve(config.srcPath, 'modules')
  });
  modules = modules.map((item) => {
    return item.replace(path.resolve(config.srcPath, 'modules') + '/', '');
  })
  for(let i = 0; i < rows.length; i++) {
    let row = JSON.parse(decodeURIComponent(rows[i].package_string));
    if (modules.indexOf(row.name) > -1) {
      row.local = true;
    } else {
      row.local = false;
    }
    rows[i] = row;
  }
  let o = {
    status: 0,
    body: rows,
    data: {
      rows
    }
  }

  return o;
}
async function searchPage (str) {
  let rows = await mysql.gets('page', `\`package_string\` like '%${str}%'`);
  let modules = glob.sync('/*', {
    root: path.resolve(config.srcPath, 'pages')
  });
  modules = modules.map((item) => {
    return item.replace(path.resolve(config.srcPath, 'pages') + '/', '');
  });
  console.log(modules)
  for(let i = 0; i < rows.length; i++) {
    let row = JSON.parse(decodeURIComponent(rows[i].package_string));
    if (modules.indexOf(row.name) > -1) {
      row.local = true;
    } else {
      row.local = false;
    }
    rows[i] = row;
  }

  let o = {
    status: 0,
    body: rows,
    data: {
      rows
    }
  }

  return o;
}
module.exports = {
  searchModule,
  searchPage
}