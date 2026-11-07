/* global hexo */
'use strict';
const { escapeHTML } = require('hexo-util');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const cssVersions = Object.fromEntries(['site', 'code-highlight'].map(name => [name,
  createHash('sha256').update(readFileSync(path.join(hexo.base_dir, 'source/css', name + '.css'))).digest('hex').slice(0, 12)]));
const xml = value => escapeHTML(String(value ?? '')).replace(/'/g, '&apos;');
const absolute = value => {
  const url = new URL('/' + String(value).replace(/^\/+/, ''), hexo.config.url + '/');
  return url.href;
};
const outputPath = route => {
  const clean = decodeURI(route).replace(/^\//, '');
  return !clean || clean.endsWith('/') ? clean + 'index.html' : clean;
};

// Hexo's explicit front-matter permalinks gain a leading slash; Stellar's
// search index expects the usual relative Post.path before adding root.
hexo.extend.filter.register('post_permalink', function (route) {
  return typeof route === 'string' ? route.replace(/^\/+/, '') : route;
}, 100);

// Supply accessible names for icon-only theme navigation without forking Stellar.
hexo.extend.filter.register('after_render:html', function (html) {
  return html.replace(/<a\b([^>]*)>/g, (tag, attrs) => {
    if (/aria-label\s*=/.test(attrs)) return tag;
    if (/class="[^"]*\bbrand-image\b/.test(attrs)) return `<a${attrs} aria-label="${xml(hexo.config.title)}首页">`;
    if (/rel="next"/.test(attrs)) return `<a${attrs} aria-label="下一页">`;
    if (/rel="prev"/.test(attrs)) return `<a${attrs} aria-label="上一页">`;
    return tag;
  }).replace(/(<link\b[^>]*\bhref=")\/css\/(site|code-highlight)\.css(")/g,
    (_tag, prefix, name, suffix) => `${prefix}/css/${name}.css?v=${cssVersions[name]}${suffix}`)
    .replace(/src="\/js\/main\.js(?:\?[^"]*)?"/, 'src="/js/main.js?v=topbar-offset-96-v2"');
}, 100);

// Stellar 2.0 scrolls TOC links with its own animation, which ignores CSS
// scroll-margin. Keep both its click offset and active-heading offset aligned
// with the fixed lightblog topbar, without editing the installed dependency.
hexo.extend.filter.register('after_generate', async function () {
  const chunks = [];
  for await (const chunk of hexo.route.get('js/main.js')) chunks.push(Buffer.from(chunk));
  const original = Buffer.concat(chunks).toString();
  const patched = original.replace('const offset = 32;', 'const offset = 96;')
    .replace('const scrollOffset = 32;', 'const scrollOffset = 96;')
    .replace("const offset = id === 'start' ? 0 : 32;", "const offset = id === 'start' ? 0 : 96;");
  if (!['const offset = 96;', 'const scrollOffset = 96;', "const offset = id === 'start' ? 0 : 96;"].every(line => patched.includes(line))) {
    throw new Error('Stellar TOC offset compatibility patch needs review');
  }
  hexo.route.set('js/main.js', patched);
});

hexo.extend.generator.register('blog-compatibility', function (locals) {
  const posts = locals.posts.sort('date', -1).toArray();
  const pages = locals.pages.toArray();
  const siteData = hexo.locals.get('data');
  const redirects = { ...(siteData.legacy_redirects || {}) };
  for (const page of [...posts, ...pages]) {
    const route = '/' + page.path.replace(/^\/+/, '').replace(/index\.html$/, '');
    if (route.endsWith('/')) redirects[route.slice(0, -1) + '.html'] = route;
  }
  const routes = Object.entries(redirects).map(([from, to]) => ({
    path: outputPath(from),
    data: '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>正在跳转</title><link rel="canonical" href="' + xml(absolute(to)) + '">' +
      '<meta http-equiv="refresh" content="0; url=' + xml(absolute(to)) + '"></head>' +
      '<body><p><a href="' + xml(absolute(to)) + '">前往当前页面</a></p></body></html>'
  }));
  function feed(items, feedPath, title, link) {
    return '<?xml version="1.0" encoding="utf-8"?>' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>' +
    `<title>${xml(title)}</title><link>${xml(link)}</link>` +
    `<description>${xml(hexo.config.description)}</description><language>zh-CN</language>` +
    `<atom:link href="${xml(absolute(feedPath))}" rel="self" type="application/rss+xml"/>` +
    items.slice(0, 10).map(post => `<item><title>${xml(post.title)}</title>` +
      `<link>${xml(post.permalink)}</link><guid>${xml(siteData.legacy_rss_guids?.[post.permalink] || post.permalink)}</guid>` +
      `<pubDate>${post.date.toDate().toUTCString()}</pubDate><description>${xml(post.description)}</description></item>`).join('') +
    '</channel></rss>';
  }
  routes.push({ path: 'rss.xml', data: feed(posts, '/rss.xml', hexo.config.title, absolute('/')) });
  for (const tag of locals.tags.toArray()) {
    const prefix = tag.path.replace(/^\/+/, '').replace(/index\.html$/, '').replace(/\/?$/, '/');
    const feedPath = prefix + 'rss.xml';
    routes.push({ path: feedPath, data: feed(tag.posts.sort('date', -1).toArray(), feedPath, `${hexo.config.title} - ${tag.name}`, absolute(prefix)) });
  }
  const urls = new Set([absolute('/'), absolute('/blog/'), absolute('/tags/'), absolute('/blog/archives/'),
    ...posts.map(post => post.permalink), ...pages.map(page => page.permalink),
    ...locals.tags.toArray().map(tag => absolute(tag.path))]);
  routes.push({ path: 'sitemap.xml', data: '<?xml version="1.0" encoding="utf-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    [...urls].map(url => `<url><loc>${xml(url)}</loc></url>`).join('') + '</urlset>' });
  routes.push({ path: 'robots.txt', data: `User-agent: *\nAllow: /\nSitemap: ${absolute('/sitemap.xml')}\n` });
  return routes;
});
