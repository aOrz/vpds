# VPDS

> Vue 项目开发系统

## 什么是 VPDS ？

> VPDS 是一个基于 Vue.js 的全流程，前端研发系统，包括项目的初始化，构建脚本，项目发布等前端开发流程，而且 VPDS 利用私有的 NPM 仓库实现了一套模块管理平台，使得项目的开发，从面向页面到面向模块的的转变。

## 安装 VPDS

1. 安装 Node.js 22.15 以上和 npm 10 以上（本次验证使用 Node.js 24.22.1）
2. `git clone https://github.com/aOrz/vpds.git`
3. `cd vpds`
4. `npm ci` 安装服务依赖，再执行 `npm --prefix server/src/app ci` 安装管理界面依赖（两层 npm 锁文件均包含在源码中；不再使用旧 Yarn 锁）
5. 将 `sql`文件夹下的 sql 导入数据库
6. `cp config/index.demo.js config/index.js` 修改 config/index.js，配置七牛云 ak,sk,bucketName,url等，以及配置数据库。
7. 安装 Sinopia npm 私有仓库，或者直接使用 npmjs.org，在命令行中登陆 npm 账号
8. `npm run build:ui` 构建管理界面（生成 `server/src/app/dist`），然后 `npm start` 启动。
9. 修改服务代码可用 `npm run dev`；运行 `npm test` 会先重新构建管理界面，再执行不依赖真实数据库/云服务的完整回归测试。
10. `npm run audit` 检查两层完整依赖；`npm run audit:production` 检查生产依赖。
11. 管理界面热更新：保持后端运行，执行 `npm run dev:ui` 后访问 `http://127.0.0.1:8010`。

当前管理界面、共享构建工具及四种模板已升级为 **Vue 3.5.44 / Webpack 5.112.2**，UI 使用 **Element Plus 2.14.7**。这是一次不向后兼容的主版本迁移；现有 Vue 2 项目不能不经修改直接使用新工具链。详见 [升级说明](UPGRADE.md)。后续已将两层 npm 审计告警清零（含生产与开发依赖），详见 [依赖审计修复](DEPENDENCY_AUDIT.md)。审计为零不等于全面生产安全认证，本工具仍不应作为多用户线上服务。

## 安全说明

服务默认仅监听 `127.0.0.1:3000`。此工具可执行依赖安装、构建及发布，且没有用户认证；不要将它直接暴露到公网。`VPDS_HOST` 仅允许 `127.0.0.1`、`::1` 或 `localhost`，不支持远程访问。服务会拒绝不受信任的 Host 和跨源 API 请求；这不能替代本机操作系统的访问控制。不要提交 `config/index.js` 中的数据库和七牛凭据。

安装、复制、创建、发布、构建和启动开发服务的 API 请求必须携带 `X-VPDS-Request: 1`；前端会自动添加。命令行脚本也需显式设置该请求头，例如 `curl -H 'X-VPDS-Request: 1' http://localhost:3000/api/page/build/example`。服务不提供 CORS 支持，请勿添加允许跨源请求的代理配置；自定义请求头用于防止其他网站通过浏览器触发本机操作，不是用户身份认证。

## 分享交流

打赏|加小助手进微信群
:---:|:---:
<img src="https://fddcn.cn/wp-content/uploads/2017/12/WechatIMG117.jpeg" width="200"/>  |  <img src="https://fddcn.cn/wp-content/uploads/2017/12/WechatIMG116.jpeg" width="200"/>
