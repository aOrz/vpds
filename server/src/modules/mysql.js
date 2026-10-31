const fs = require('fs');
const path = require('path');
const connection = require('../lib/mysql.js').connection;
const config = require('../../config/index.js');
const validation = require('../lib/validation.js');

async function save(kind, name) {
  const directory = validation.projectPath(config.srcPath, kind, name);
  const params = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  const existing = await gets(kind, '`package_name` = ?', [name]);
  const data = encodeURIComponent(JSON.stringify(params));
  let result;
  if (existing.length) {
    [result] = await connection.query(
      'UPDATE package SET `package_string` = ? WHERE `package_name` = ? AND `kind` = ?',
      [data, name, kind]
    );
  } else {
    [result] = await connection.query(
      'INSERT INTO package (`package_name`, `package_string`, `kind`) VALUES (?, ?, ?)',
      [name, data, kind]
    );
  }
  return result.fieldCount;
}

// The predicate is application-controlled SQL; user input belongs in values.
async function gets(kind, predicate, values = []) {
  const [rows] = await connection.query(
    'SELECT * FROM package WHERE ' + predicate + ' AND `kind` = ?',
    values.concat(kind)
  );
  return rows;
}

async function select(sql, values = []) {
  const [rows] = await connection.query(sql, values);
  return rows;
}
module.exports = {save, gets, select};
