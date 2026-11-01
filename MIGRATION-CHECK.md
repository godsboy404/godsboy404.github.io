# Stellar 轻博客迁移检查

日期：2026-11-01。本记录为迁移发布前快照，实际发布结果以 GitHub Actions 和线上验证为准。日常草稿创建、发布命令已实测通过，临时测试文章已移除。

迁移基线：`c385aa2b71f2d56b572cd6d5d9389a906c9c0c3a`（Hugo Bear Blog 已部署版本）。当前使用 npm 稳定版 Stellar `2.0.0`、Hexo `8.1.2`，依赖通过 `package-lock.json` 固定。

| 项目 | 结果 |
| --- | --- |
| 轻博客布局 | 使用官方 lightblog 蓝图的顶部导航与无常驻侧栏结构；首页直接显示 10 篇文章，不生成 Hero 大图。针对代码文章使用 tech 排版和本地代码配色。静态结构检查通过，浏览器外观检查未完成。 |
| 正文与图片 | 25 篇正文与 Bear Blog 基线比对通过；仅 Java 笔记末尾增加一个空行，防止分隔线将图片误识别为标题；赞助页为两个 HTML 标题补充 id。26 个图片、字体文件校验一致。 |
| 地址 | 迁移文章使用 Hexo `permalink` 保留原路由；.html 与旧目录跳转、RSS 和 sitemap 由宿主生成器维护。120 个生成 HTML 的链接、页内锚点检查通过。 |
| RSS | 25 篇迁移文章的旧 GUID 单独保留，已发布 RSS 的 10 个固定样本检查通过；仍输出最近 10 篇博文，保留三个已发布标签 RSS。 |
| 固定链接与搜索 | 通过 Hexo 的 post_permalink 接口规范化相对路径，避免搜索索引和旧跳转出现双斜杠 URL。索引路径、跳转同源目标和本地文件检查通过。 |
| 引用、代码、公式 | 引用迁移为 Stellar 的 footer.references；静态产物含代码复制运行时与高亮代码块；数学公式在构建时生成 SVG，原公式写法保留。 |
| 旧安全修复 | 外链中转、友圈 DOM 文本显示、URL 协议限制、失败重试及旧 Service Worker 退役继续保留。7 组回归测试通过。 |
| 页面说明 | 更新隐私、代码许可说明与 README；保留原文章 CC BY-NC-ND 许可，不采用主题示例中的 CC BY-NC-SA 文案。 |
| 部署 | GitHub Actions 改为 Node 22 + npm ci；配置、构建、产物与回归检查通过后才发布 pages 分支。域名及 Pages 来源保持原设置。 |

验证命令：

```sh
npm run doctor
npm run build
python tools/check_site.py
npm test
```

Stellar doctor 通过，35 个 Markdown 文件的配置无警告；正常权限下完整构建通过。第一次在 Windows 沙箱内构建曾遇到 EPERM 目录创建失败，随后以正常权限重建，最终 252 个文件生成成功。严格检查覆盖 120 个 HTML、旧跳转、RSS、搜索索引、图标、sitemap、CNAME 和缓存退役地址。

本轮 Edge 自动化因无法可靠识别当前 URL 而停止，未完成 Stellar 的实际外观、窄屏与交互检查；没有将先前 Bear Blog 的截图当作当前主题证据。真实手机、第三方服务持续可用性和 Vercel 部署也未验证。发布后还需核对 GitHub Actions 与线上页面实际返回的主题。
