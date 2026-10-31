# 依赖审计告警修复

日期：2026-10-31。继 Vue 3 / Webpack 5 迁移后，针对根项目 10 项、UI 3 项 npm audit 告警逐项处理。没有使用 `--force`、忽略 advisory 或降低 audit 等级来隐藏问题；未部署或执行 npm/七牛发布；代码通过独立升级 PR 接受审查。

## 修复清单

| 告警来源 | 处理 |
| --- | --- |
| mysql2 1.x（critical） | 升级并锁定 3.24.6；保留 Promise pool / 参数化 query，验证真实 SDK 的惰性建池与关闭，以及存取数据回归 |
| qiniu 6.x / urllib / debug / formstream / mime | 升级并锁定 qiniu 7.15.2；迁移实例化 Mac / PutPolicy / FormUploader 的 Promise API；HTTPS、非 2xx 失败判定、凭据隔离与错误脱敏 |
| shelljs / glob / minimatch | 删除旧依赖和无调用 shell 封装；目录、模板、项目与上传文件枚举使用 Node 原生 fs，保留路径和符号链接保护并支持 scoped 包 |
| rimraf 的旧 glob 依赖 | 改用 `fs.rm` 清理经过校验的整个 dist，继续验证外部软链接目标不会被删除/覆盖 |
| webpack-dev-server 5 / SockJS / uuid | 升级并锁定 webpack-dev-server 6.1.0、webpack-cli 7.3.1；适配 ESM 与 HPM 4 代理接口，移除旧 SockJS 链 |

最低环境更新为 **Node.js 22.15+ / npm 10+**。本次实际验证 Node.js 24.22.1。UI 开发代理使用 `pathFilter` 与 `on.proxyReq`，继续先校验本机 Host / Origin，再转发到受保护的后端；未放宽跨站边界。

## 审计结果

以下命令均返回 **0 vulnerabilities**，覆盖生产及开发依赖：

```sh
npm audit
npm --prefix server/src/app audit
npm audit --omit=dev
npm --prefix server/src/app audit --omit=dev
```

可运行 `npm run audit` 与 `npm run audit:production` 重查。未来 advisory 数据会变化；零审计告警不是项目不存在安全问题的证明。

## 验证

- `npm test` 在重新构建 UI 后执行全量回归，**60/60 通过**；包括真实 DOM、SSR、嵌套资源/动态 chunk 以及原有安全测试。
- 四种模板真实 Webpack 生产构建。
- 实际 webpack-cli 7 / dev-server 6 启动，首页、同源 Origin 的 API 代理正常；恶意 Host / Origin 被拒绝。
- 新七牛 SDK 本地签名校验、并发环境不串密钥、无扩展名/隐藏资源上传顺序、HTTP/网络失败脱敏与符号链接拒绝（transport 替身，不真实上传）。
- 原生文件系统的 scoped 项目枚举、manifest 读取与符号链接边界；真实 mysql2 3.x pool 创建/关闭（不连接数据库）。
- 依赖树、锁文件一致性与差异检查。

## 未执行的外部操作

没有真实 MySQL、七牛凭据；未对真实数据库查询或写入，未上传云文件，未执行 npm publish。升级后的数据库/云服务联调仍需在用户环境验收。Chromium 视觉验收受容器限制，DOM 测试不等于像素级验收。

## 参考

- [mysql2 Promise pool](https://sidorares.github.io/node-mysql2/docs/examples/connections/create-pool)
- [七牛 Node.js SDK](https://developer.qiniu.com/kodo/sdk/nodejs)
- [WebpackDevServer 6 迁移](https://github.com/webpack/webpack-dev-server/blob/main/migration-v6.md)
