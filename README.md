# VPDS

> Vue 项目开发系统

## 什么是 VPDS ？

> VPDS 是一个基于 Vue.js 的全流程，前端研发系统，包括项目的初始化，构建脚本，项目发布等前端开发流程，而且 VPDS 利用私有的 NPM 仓库实现了一套模块管理平台，使得项目的开发，从面向页面到面向模块的的转变。

## 安装 VPDS

1. 安装 Node.js 18.11 以上（测试与 `dev` 热重启需要；本次验证使用 Node.js 24）
2. `git clone https://github.com/aOrz/vpds.git`
3. `cd vpds`
4. `npm install` 安装服务依赖，再执行 `npm --prefix server/src/app install` 安装管理界面依赖
5. 将 `sql`文件夹下的 sql 导入数据库
6. `cp config/index.demo.js config/index.js` 修改 config/index.js，配置七牛云 ak,sk,bucketName,url等，以及配置数据库。
7. 安装 Sinopia npm 私有仓库，或者直接使用 npmjs.org，在命令行中登陆 npm 账号
8. `npm run build:ui` 构建管理界面（生成 `server/src/app/dist`），然后 `npm start` 启动。
9. 修改服务代码可用 `npm run dev`；运行 `npm test` 执行不依赖真实数据库/云服务的回归测试。

这是使用 Vue 2 / Webpack 2 的旧项目，依赖仍有大量弃用组件；本次缺陷修复不等于已完成依赖现代化或生产安全认证。不要把此本地开发工具当作多用户线上服务。

## 安全说明

服务默认仅监听 `127.0.0.1:3000`。此工具可执行依赖安装、构建及发布，且没有用户认证；不要将它直接暴露到公网。`VPDS_HOST` 仅允许 `127.0.0.1`、`::1` 或 `localhost`，不支持远程访问。服务会拒绝不受信任的 Host 和跨源 API 请求；这不能替代本机操作系统的访问控制。不要提交 `config/index.js` 中的数据库和七牛凭据。

安装、复制、创建、发布、构建和启动开发服务的 API 请求必须携带 `X-VPDS-Request: 1`；前端会自动添加。命令行脚本也需显式设置该请求头，例如 `curl -H 'X-VPDS-Request: 1' http://localhost:3000/api/page/build/example`。服务不提供 CORS 支持，请勿添加允许跨源请求的代理配置；自定义请求头用于防止其他网站通过浏览器触发本机操作，不是用户身份认证。

## 分享交流

打赏|加小助手进微信群
:---:|:---:
<img src="https://fddcn.cn/wp-content/uploads/2017/12/WechatIMG117.jpeg" width="200"/>  |  <img src="https://fddcn.cn/wp-content/uploads/2017/12/WechatIMG116.jpeg" width="200"/>
