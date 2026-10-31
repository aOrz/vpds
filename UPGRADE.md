# Vue 3 / Webpack 5 升级

## 范围和版本

基于已合并的第一轮修复 PR #4（修复提交 `c61e9d6`）继续迁移，使用独立分支 `upgrade/vue3-webpack5` 对最新 `master` 提交审查；没有执行 npm/七牛发布或部署。

| 组件 | 原版 | 当前 |
| --- | --- | --- |
| Vue / SFC 编译器 | Vue 2.x | 3.5.44（两个应用与四模板一致） |
| Webpack | 2.x | 5.112.2 |
| vue-loader | 11.x | 17.4.2 |
| UI 组件库 | Element UI 1.x | Element Plus 2.14.7 |
| UI 请求 | vue-resource | 原生 fetch，保留本地安全请求头 |
| Babel | 6.x | core / preset-env 7.29.7、loader 9.2.1 |
| UI 开发服务器 | 2.x | webpack-dev-server 6.1.0（审计修复阶段升级，CLI 7.3.1） |

Node.js 最低 22.15，npm 最低 10；验证环境为 Node.js 24.22.1。依赖以根目录和 UI 目录的 `package-lock.json` 为准，旧 Yarn 锁已移除。

版本由 npm 官方 registry 与 Vue / Webpack / Element Plus 官方迁移文档核实。选择已发布稳定系列，不使用 Vue compat 或 beta。Webpack 辅助插件已迁移为 VueLoaderPlugin、MiniCssExtractPlugin、CssMinimizerPlugin、Asset Modules、splitChunks 与现代编译 hooks。

## 兼容性变化

- 四个模板改用 `createApp(App).mount('#app')`；两个 module 模板通过默认 ES module 导出组件。
- 已有自定义 Vue 2 项目需要单独迁移：更新 Vue 依赖、`new Vue`/全局插件 API、slots、v-model 和组件库，移除旧 Babel 6 `.babelrc`。没有自动修改 `src/pages` / `src/modules` 中的用户项目。
- 不支持 IE11。模板仍使用 Options API，不强制改成 Composition API。
- UI 原有模块/页面、搜索、创建、复制、安装、开发、发布功能均保留；迁移时修复参数编码、请求竞态、重复提交和失败后 loading 恢复。
- 样式外观按原布局保留，但 Element Plus 的控件视觉不是 Element UI 1.x 的像素级复刻。
- 共享构建默认支持 CSS。旧的、未安装依赖的 Sass/Less/Stylus 隐式 loader 声明及 gzip/analyzer 开关已移除；如需它们，应显式配置兼容 Webpack 5 的插件。
- 保留本地 Host/Origin、跨站请求头、路径和符号链接校验。UI 开发代理先验证 8010 请求，再重写已验证的 Origin 为 3000；没有放宽后端防护。

## 安装和验证

```sh
npm ci
npm --prefix server/src/app ci
npm test
# npm test 会重新构建 UI，避免测试旧 dist。
npm start
# 另一个终端：npm run dev:ui
```

已验证：

- UI 与 pc-page、m-page、pc-module、m-module 生产构建。
- 四模板 8 个 SFC 编译、两个模块被独立消费者默认导入并进行 Vue 3 SSR。
- 大于 10KB 的 CSS 背景图、动态 import chunk 在 `/nested/` 部署下的资源路径与执行。
- 真实生产 bundle + Element Plus 的 jsdom DOM 测试：tab/编码搜索、创建取消与重开、重复提交抑制、创建后刷新、复制、发布失败和重试。
- 实际 WebpackDevServer 6 / CLI 7 启动/页面/带 Origin 的代理 API；恶意 Host/Origin 被拒绝。
- 项目开发服务 HMR SSE 初始连接，以及修改组件后重编译通知。
- 之前的 SQL/命令/路径/发布短路安全回归继续覆盖。

jsdom 验证不是 Chromium 视觉验收；此容器的 Chromium socket/crashpad 限制仍在。没有真实 MySQL、npm 发布或七牛写入验收。

## 剩余风险

Vue/Webpack 迁移完成时 UI 审计由 175 降到 3 项，根项目尚余 10 项。随后按要求进一步升级 mysql2 / qiniu / 开发服务器，移除旧文件系统依赖；当前两层全量及生产依赖审计均为零，详见 [依赖审计修复](DEPENDENCY_AUDIT.md)。

开发服务器已升级 WebpackDevServer 6 / CLI 7，使用 HPM 4 的 `pathFilter` / `on.proxyReq`，最低 Node.js 提升至 22.15。真实 MySQL 与七牛服务仍需用户环境验收；测试不会使用真实凭据、发布包或上传云端内容。

## 官方参考

- [Vue 3 应用 API](https://vuejs.org/guide/essentials/application.html)
- [Vue 3 迁移指南](https://v3-migration.vuejs.org/)
- [Webpack 5 迁移指南](https://webpack.js.org/migrate/5/)
- [Vue Loader](https://vue-loader.vuejs.org/guide/)
- [Element Plus 安装](https://element-plus.org/en-US/guide/installation)
