const mysql = require('mysql2/promise');
const config = require('../../config/index.js');

let pool = mysql.createPool(config.mysql);
// create the connection to database
// var connection = await mysql.createConnection(config.mysql);

module.exports = {
  connection: pool
}