# VPDS

> Vue 项目开发系统

## 什么是 VPDS ？

> VPDS 是一个基于 Vue.js 的全流程，前端研发系统，包括项目的初始化，构建脚本，项目发布等前端开发流程，而且 VPDS 利用私有的 NPM 仓库实现了一套模块管理平台，使得项目的开发，从面向页面到面向模块的的转变。

## 安装 VPDS

1. 安装 node.js （7.0以上）
2. `git clone git@github.com:4013465w/vpds.git`
3. `cd vpds`
4. `npm i` or `yarn` 安装依赖
5. 将 `sql`文件夹下的 sql 导入数据库
6. `cp config/index.demo.js index.js` 修改 index.js，配置七牛云 ak,sk,bucketName,url等，以及配置数据库。
7. 安装 Sinopia npm 私有仓库，或者直接使用 npmjs.org，在命令行中登陆 npm 账号
8. `npm run start` 开始你的开发之旅吧
![演示 gif](http://minikb.fddcn.cn/QQ20170708-231701-HD.gif)
