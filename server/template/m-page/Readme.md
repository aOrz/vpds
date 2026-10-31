# VPDS Vue 3 页面模板

本模板使用 Vue 3，通过 VPDS 的共享 webpack 构建工具编译单文件组件。
`index.js` 使用 `createApp(App).mount('#app')` 启动演示页面；Options API 组件仍可继续使用。

本模板不兼容 Vue 2 运行时。既有 Vue 2 项目及第三方组件需先迁移，不能仅替换依赖版本。
Babel 配置由 VPDS 共享构建工具管理，不再使用旧版 `es2015` preset。

参考：[Vue 3 应用入口](https://vuejs.org/guide/essentials/application.html)、[Vue 2 迁移指南](https://v3-migration.vuejs.org/)。
