let file = require('fs');

file.pReadFile = function (fileName, o) {
  return new Promise(function (resolve, reject) {
    file.readFile(fileName, o, (error, data) => {
      if (error) {
        reject(error)
      } else {
        resolve(data);
      }
    });
  })
}
module.exports = file;