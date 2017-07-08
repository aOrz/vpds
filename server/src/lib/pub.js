var glob = require('glob');
var chalk = require('chalk');
var qiniu = require("qiniu");
var path = require('path');
var shell = require('shelljs');
var qiniuConf = require('../../../config/index.js').qiniu;

function upploadQiniu(file, name, config) {
  //需要填写你的 Access Key 和 Secret Key
  qiniu.conf.ACCESS_KEY = config.ak;
  qiniu.conf.SECRET_KEY = config.sk;
  //要上传的空间
  bucket = config.bucketName;
  //上传到七牛后保存的文件名
  key = name;
  function uptoken(bucket, key) {
  var putPolicy = new qiniu.rs.PutPolicy(bucket+":"+key);
  return putPolicy.token();
}
//生成上传 Token
token = uptoken(bucket, key);
//要上传文件的本地路径
filePath = file;
//构造上传函数

//调用uploadFile上传
  return new Promise(function (resolve, reject) {
    var extra = new qiniu.io.PutExtra();
      qiniu.io.putFile(token, key, filePath, extra, function(err, ret) {
        if(!err) {
          // 上传成功， 处理返回值
          console.log(chalk.green(name + '  success! \n'), new Date().getTime());
          resolve({code: 0, status: 'success'});
        } else {
          // 上传失败， 处理返回代码
          console.log(chalk.red(name + 'error'));
          reject({code: 1, status: name + 'error'})
        }
    });
  })
}

function pub(path, name, pub_type) {
  var files = glob.sync(path + '/dist/**/*.*', {
    ignore: '**/*.html',
    dot: true
  });
  let p = [];
  for (var i = files.length - 1; i >= 0; i--) {
    p.push(upploadQiniu(files[i], name + files[i].replace(/\.\//, '').replace(path, ''), qiniuConf[pub_type]));
  }
  return Promise.all(p).then(() => {
    let html = [];
    let htmls = glob.sync(path + '/dist/**/*.html');
    for (var i = htmls.length - 1; i >= 0; i--) {
      html.push(upploadQiniu(htmls[i], name + htmls[i].replace(/\.\//, '').replace(path, ''), qiniuConf[pub_type]));
    }
    console.log('页面发布完成')
    return Promise.all(html);
  })
}
module.exports = {pub};