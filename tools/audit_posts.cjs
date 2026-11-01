'use strict';
// Compare each complete article's Markdown structure with the generated HTML.
// This checks content integrity; it does not measure browser layout or uptime.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { parseHTML } = require('linkedom');
const fm = require('hexo-front-matter');
const MarkdownIt = createRequire(require.resolve('hexo-renderer-markdown-it/package.json'))('markdown-it');
const md = new MarkdownIt({ html: true, linkify: true }).use(require('./markdown-math.cjs'));
const root = path.resolve(__dirname, '..');
const { withoutStyles } = require('./article-text.cjs');
const themeRoot = path.dirname(require.resolve('hexo-theme-stellar/package.json'));
const { countWords, readingMinutes } = require(path.join(themeRoot, 'scripts/lib/reading_time'));
const search = JSON.parse(fs.readFileSync(path.join(root, 'public/search.json'), 'utf8'));
const rows = [];
const images = new Map();
const failures = [];
const text = html => parseHTML(`<div>${html}</div>`).document.querySelector('div').textContent;
const count = (node, selector) => node.querySelectorAll(selector).length;
function check(id, label, actual, expected) {
  try { assert.deepEqual(actual, expected); }
  catch { failures.push({ id, label, actual, expected }); }
}
for (const year of fs.readdirSync(path.join(root, 'source/_posts')).sort()) {
  for (const name of fs.readdirSync(path.join(root, 'source/_posts', year)).filter(n => n.endsWith('.md')).sort()) {
    const id = `${year}/${name.slice(0, -3)}`;
    const source = fm.parse(fs.readFileSync(path.join(root, 'source/_posts', year, name), 'utf8'));
    const tokens = md.parse(source._content, {});
    const expected = parseHTML(`<article>${md.render(source._content)}</article>`).document.querySelector('article');
    const html = fs.readFileSync(path.join(root, 'public', source.permalink, 'index.html'), 'utf8');
    const document = parseHTML(html).document;
    const actual = document.querySelector('.md-text');
    assert.ok(actual, `${id}: missing article`);
    const ids = [...document.querySelectorAll('[id]')].map(n => n.id);
    check(id, 'unique document anchors', ids.filter((value, i) => ids.indexOf(value) !== i), []);
    const readingText = withoutStyles(html.match(/<article\b[^>]*class="[^"]*\bmd-text\b[^"]*"[^>]*>([\s\S]*?)<\/article>/)?.[1]);
    const readingMeta = `${countWords(readingText)} 字 · 预计阅读 ${readingMinutes(readingText)} 分钟`;
    check(id, 'visible reading statistics exclude CSS', document.querySelector('main').textContent.includes(readingMeta), true);
    const entry = search.find(e => e.path === '/' + source.permalink);
    check(id, 'search entry exists', Boolean(entry), true);
    check(id, 'search excludes formula CSS', /display:contents|mjx-assistive-mml/.test(entry?.content || ''), false);
    check(id, 'outline excludes formula CSS', /display:contents|mjx-assistive-mml/.test(document.querySelector('.topbar-toc')?.textContent || ''), false);
    const codes = [...actual.querySelectorAll('figure.highlight .code code, pre > code')]
      .map(n => text(n.innerHTML.replace(/<br\s*\/?>/g, '\n')).replace(/\n+$/, ''));
    const sourceCodes = tokens.filter(t => ['fence', 'code_block'].includes(t.type))
      .map(t => t.content.replace(/\n+$/, ''));
    check(id, 'code text including tabs and whitespace', codes, sourceCodes);
    check(id, 'MathJax errors', count(actual, '[data-mml-node="merror"]'), 0);
    const row = { id, title: source.title, url: `/${source.permalink}`, code: codes.length,
      images: count(actual, 'img'), math: count(actual, 'mjx-container'), headings: count(actual, 'h1,h2,h3,h4,h5,h6') };
    check(id, 'formula count', row.math,
      tokens.filter(t => t.type === 'math_block').length + tokens.flatMap(t => t.children || []).filter(t => t.type === 'math_inline').length);
    const urls = n => [...n.querySelectorAll('img')].map(img => img.getAttribute('data-src') || img.getAttribute('src'));
    check(id, 'image URLs and order', urls(actual), urls(expected));
    for (const url of urls(actual)) {
      if (!images.has(url)) images.set(url, []);
      images.get(url).push(id);
    }
    for (const n of actual.querySelectorAll('figure.highlight,pre > code,mjx-container,style,script,mjx-assistive-mml')) n.remove();
    for (const n of expected.querySelectorAll('pre > code,mjx-container,style,script,mjx-assistive-mml')) n.remove();
    for (const selector of ['h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','table','tr','th','td','strong','em','s','code','hr','br']) {
      check(id, `${selector} structure`, count(actual, selector), count(expected, selector));
    }
    row.tables = count(actual, 'table');
    const headings = n => [...n.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => h.textContent);
    check(id, 'heading text and order', headings(actual), headings(expected));
    const ordered = n => [...n.querySelectorAll('ol')].map(l => l.getAttribute('start') || '1');
    check(id, 'ordered list numbering', ordered(actual), ordered(expected));
    const cells = n => [...n.querySelectorAll('th,td')].map(c => [c.textContent, c.getAttribute('style') || '']);
    check(id, 'table contents and alignment', cells(actual), cells(expected));
    const plain = n => n.textContent.replace(/\s+/g, ' ').trim();
    check(id, 'complete prose and inline code', plain(actual), plain(expected));
    const rawDollars = [];
    for (const t of tokens) for (const c of t.children || []) {
      if (c.type === 'text' && c.content.includes('$')) rawDollars.push(c.content);
    }
    row.literalDollars = rawDollars;
    check(id, 'unparsed formula delimiters', rawDollars.filter(s => !(id === '2025/250207' && s.includes('$stap'))), []);
    row.status = failures.some(f => f.id === id) ? 'FAIL' : 'PASS';
    rows.push(row);
  }
}
const result = { posts: rows, images: [...images].map(([url, posts]) => ({ url, posts })), failures };
if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
else {
  for (const r of rows) console.log(`${r.status} ${r.id} ${r.title}: ${r.headings} headings, ${r.code} code blocks, ${r.images} images, ${r.tables} tables, ${r.math} formulas`);
  for (const f of failures) console.log(JSON.stringify(f).slice(0, 1600));
  console.log(`${rows.length} articles, ${images.size} unique images, ${failures.length} failures`);
}
process.exitCode = failures.length ? 1 : 0;
