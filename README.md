# 沁·拾遗轩

悟已往之不谏，知来者之可追。

本站使用 [Hugo](https://gohugo.io/) 和 [Hugo Bear Blog](https://github.com/janraasch/hugo-bearblog/)，保留中文文章、标签、友链和 RSS。

## 本地预览

安装 Hugo **0.169.0**，然后运行：

```sh
git clone --recurse-submodules https://github.com/godsboy404/godsboy404.github.io.git
cd godsboy404.github.io
hugo server
```

浏览器打开终端显示的本地地址。已有克隆可以先运行 `git submodule update --init --recursive`。

## 写文章和修改页面

- 文章：`content/blog/年份/文章编号.md`。
- 首页：`content/_index.md`。
- 独立页面：`content/pages/`。
- 图片等静态资源：`static/`，引用地址仍为 `/images/...`。
- 站点名称、域名和导航：`hugo.toml`。
- 少量样式和数学公式支持：`layouts/partials/custom_head.html`。

文章示例：

```yaml
---
title: 新文章
date: 2026-11-01
tags: [学习]
url: /posts/2026/261101/
aliases: ["/posts/2026/261101.html"]
---

正文从这里开始。
```

文章按日期倒序排列。文章内容保留，修正了 Tmux 引用的格式和 OS 笔记目录的锚点；旧 `/posts/年份/编号` 地址继续可用，`.html` 地址生成跳转页。RSS 仍为 `/rss.xml`，仅包含最近 10 篇博客文章。迁移文章的 `rss_guid` 保留旧订阅标识，请勿修改。公式页按需加载固定版本 MathJax；外部图片和友圈 API 仍依赖原来的服务。

## 构建与部署

```sh
hugo --gc --minify --panicOnWarning
python scripts/check_site.py
```

构建结果位于 `public/`，不要在这里放源文件。

GitHub Actions 在推送 `main` 或手动触发时构建，并发布到原来的 `pages` 分支；PR 只检查构建。GitHub 仓库的 **Settings → Pages** 应继续选择 **Deploy from a branch → pages → / (root)**。自定义域名保留 `coderama.top`，无需改变现有 DNS。

若仍使用 Vercel，`vercel.json` 已改为 Hugo 构建，版本同为 0.169.0；导入仓库时需启用子模块拉取。

## 从 Curve 迁移

原站使用 VitePress Curve，此次切换为 Hugo，原 Vue 组件页面改为静态页面。文章、友链、项目链接、赞助页和静态资源保留；标签页及归档旧地址提供跳转，分类旧入口指向标签。原站没有配置评论后端，本次没有添加评论服务。音乐馆原本无内容，保留原地址。友圈保留原 API，页面显示取决于该服务是否可用。

原 Curve 自动同步工作流已移除，避免把旧主题合回 Hugo 站点。旧源码可以从 Git 历史恢复。Bear Blog 通过 Git 子模块固定版本，升级时单独审阅主题变更。`static/sw.js` 用于退役原站的 Service Worker，请保留此地址。

## 回归检查

Python 检查会验证空链接、链接文字、相对资源路径、页内锚点、RSS、图标和站点地图。GitHub Actions 会先完成检查，再发布同一份构建产物；只有 `main` 分支可以触发发布，PR 只运行检查。

安全脚本测试需要 Node.js 20 或更高版本。测试依赖只安装在本地测试目录，不参与博客构建：

```sh
npm install --prefix .test-deps --no-save --ignore-scripts --package-lock=false linkedom@0.18.12
node --test tests/browser-scripts.test.cjs
```

测试覆盖不安全跳转、域名仿冒、接口数据注入、空数据、网络失败、损坏或禁用的缓存、分页、弹窗重复打开及旧 Service Worker 退役。`tests/fixtures/legacy-rss-guids.json` 来自迁移前 `pages` 分支实际发布的 RSS。
