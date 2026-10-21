# 灰灰的小厨房

给女朋友使用的可爱点单网页。顾客页面部署在 GitHub Pages，订单通过 Cloudflare Pages Functions 写入 D1 数据库，主理人可以在独立收件箱中实时查看并更新状态。

- 点单页：`index.html`
- 主理人收件箱：`owner.html`
- 浏览器端后台地址：`config.js`
- Pages Functions 源码：`pages-api/_worker.js`
- D1 建表脚本：`worker/schema.sql`

## 数据流程

1. 顾客在点单页选择心愿并提交。
2. 页面将订单同步到 Worker，同时生成一份微信分享消息作为备份。
3. 主理人使用口令打开 `owner.html`，查看最新订单。
4. 收件箱每 15 秒自动刷新，可以将订单从“待接单”更新为“准备中”和“已完成”。

## 安全说明

主理人口令仅保存在 Cloudflare Pages Secret 中，不提交到 GitHub。前端只在当前浏览器会话中暂存已输入的口令。

## 部署

1. 创建 D1 数据库，执行 `worker/schema.sql`。
2. 将数据库 ID 填入根目录的 `wrangler.jsonc`。
3. 用 Wrangler 设置 Pages 项目的 `ADMIN_KEY` secret，并部署 `pages-api`。
4. 把 Pages API 地址写入 `config.js`，提交到 GitHub Pages。
