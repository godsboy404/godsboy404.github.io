# 沁·拾遗轩

悟已往之不谏，知来者之可追。

本站使用 **Hexo 8.1.2 + Stellar 2.0.0 轻博客**。顶部导航，首页直接显示文章列表，保留代码高亮、代码复制、目录、公式、本地搜索和深浅色设置。

## 本地预览

安装 Node.js **22 或更高版本**，然后运行：

```sh
git clone https://github.com/godsboy404/godsboy404.github.io.git
cd godsboy404.github.io
npm ci
npm run dev
```

打开终端显示的本地地址。修改文章后会自动刷新。按 `Ctrl+C` 停止预览。预览会显示草稿，但正式构建不发布草稿。

已存在的仓库在没有未提交修改时，先 `git pull --ff-only`，依赖锁文件更新后再运行 `npm ci`。现在通过 npm 安装主题，不再需要 Hugo、`hugo.exe` 或 Git 子模块。

## 创建新文章

```sh
npx hexo new post "my-first-post"
```

编辑生成的 `source/_posts/my-first-post.md`：

```yaml
---
title: 我的新文章
date: 2026-11-01 18:00:00
description: 这篇文章的简短介绍
tags: [学习]
disableNunjucks: true
---

正文从这里开始。
```

新文章默认网址为 `/posts/年份/文件名/`。`disableNunjucks` 让程序代码中的模板符号按原样显示，脚手架已经自动填写。

要先写草稿：

```sh
npx hexo new draft "my-first-post"
npm run dev
```

草稿位于 `source/_drafts/`。准备发布时：

```sh
npx hexo publish "my-first-post"
```

Hexo 使用草稿目录或 `published: false` 控制发布；不要继续使用 Hugo 的 `draft: true`。

## 修改旧文章与图片

- 迁移的旧文章位于 `source/_posts/2024/`、`2025/`、`2026/`；直接编辑对应 Markdown。
- 保留旧文章的 `permalink`，它决定既有访问地址；`date` 保留原发表时间，需要时添加 `updated`。
- 旧订阅标识保存在 `source/_data/legacy_rss_guids.yml`，无需日常编辑。
- 原有兼容跳转保存在 `source/_data/legacy_redirects.yml`；普通新文章会自动获得对应 `.html` 跳转地址。
- 图片放到 `source/images/`，例如 `source/images/posts/example.png`，在文章中写 `![说明](/images/posts/example.png)`。
- 围栏代码块写明语言，例如 `java`、`cpp`、`python` 或 `bash`，即可进行语法高亮。
- 数学公式使用 `$...$`（行内）和独立成行的 `$$...$$`（块级），构建时生成 SVG，不依赖访客加载 MathJax。兼容旧文章 `$ n $` 的空格写法；普通美元符号请写成 `\$`。

## 修改站点

| 内容 | 编辑入口 |
| --- | --- |
| 站点名称、描述、网址、文章路径和 Markdown 配置 | `_config.yml` |
| 顶部导航、轻博客布局、动效、主题颜色、页脚 | `_config.stellar.yml` |
| 关于、友链、项目、赞助等页面 | `source/pages/` |
| 额外样式 | `source/css/site.css` |
| 代码配色 | `source/css/code-highlight.css` |
| RSS、旧链接和 sitemap 生成 | `scripts/site-compat.js` |

Stellar 按照官方轻博客蓝图配置，使用技术文章排版。关闭常驻侧栏、首屏大图与 3D 倾斜效果，保留轻量滚动显现和默认交互。主题 npm 包不作直接修改，升级时修改版本并重新验证。

## 检查与上线

```sh
npm run doctor
npm run build
python tools/check_site.py
npm test
```

检查通过后：

```sh
git add -A
git commit -m "Update blog content"
git push origin main
```

GitHub Actions 自动安装锁定依赖、检查配置、构建并运行回归，再把通过检查的同一份产物发布到 `pages` 分支。PR 只运行检查。查看仓库 Actions 确认成功后，再访问 `https://coderama.top/`。

GitHub **Settings → Pages** 保持 **Deploy from a branch → pages → / (root)**，域名保持 `coderama.top`，无需修改既有 DNS。`public/` 是生成目录，不要在这里写文章，也不用手动提交它。

`vercel.json` 同步改为 Hexo 构建，主发布方式仍是 GitHub Pages；Vercel 未作为本次实际发布目标验证。

## 兼容与外部服务

25 篇文章、图片、友链和独立页面保留；RSS 地址仍为 `/rss.xml`，只提供最近 10 篇博文。旧文章网址、旧 `.html` 地址、标签及归档入口保持可访问。`source/sw.js` 用于退役原站缓存，请保留。

原友圈组件保留安全修复和失败重试；该页依赖原第三方 API。外部图床、灯箱和懒加载资源的可用性仍取决于提供方。本站没有配置评论或统计服务。

当前迁移验证记录见 `MIGRATION-CHECK.md`，先前 Bear Blog 迁移记录见 `docs/migrations/bearblog-2026-11-01.md`。
