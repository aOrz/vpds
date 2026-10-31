const mysql = require('./mysql.js');
const config = require('../../config/index.js');
const validation = require('../lib/validation.js');
const projects = require('../lib/localProjects.js');

async function search(kind, str) {
  const records = await mysql.gets(kind, '`package_string` like ?', ['%' + str + '%']);
  const root = validation.within(config.srcPath, kind + 's');
  const localNames = new Set((await projects.list(root)).map(project => project.name));
  const rows = records.map(record => {
    const item = JSON.parse(decodeURIComponent(record.package_string));
    item.local = localNames.has(item.name);
    return item;
  });
  return {status: 0, body: rows, data: {rows}};
}

module.exports = {
  searchModule: str => search('module', str),
  searchPage: str => search('page', str)
};
