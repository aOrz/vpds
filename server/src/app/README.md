# VPDS 管理界面

使用 Vue 3、Element Plus 和 Webpack 5。Node.js 22.15+ / npm 10+。

在仓库根目录执行：

```sh
npm install
npm --prefix server/src/app install
npm run build:ui
npm start
```

UI 开发：先启动后端，再运行 `npm run dev:ui`，访问 `http://127.0.0.1:8010`。
开发代理只接受可信本机请求，再将已验证的 Origin 转换为后端地址；不要删除 Host/Origin 防护或配置公共代理。

Element UI / vue-resource 已替换为 Element Plus / 原生 fetch；所有 API 请求仍携带 `X-VPDS-Request: 1`。不支持 IE11。
