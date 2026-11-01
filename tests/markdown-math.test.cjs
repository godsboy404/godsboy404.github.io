'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const rendererRequire = createRequire(require.resolve('hexo-renderer-markdown-it/package.json'));
const MarkdownIt = rendererRequire('markdown-it');
const md = new MarkdownIt().use(require('../tools/markdown-math.cjs'));
test('text extraction removes renderer styles but preserves prose and escaped code', () => {
  const { withoutStyles } = require('../tools/article-text.cjs');
  const html = '<p>正文</p><style type="text/css">#mjx-x { display:contents; }</style><code>&lt;style&gt;</code>';
  assert.equal(withoutStyles(html), '<p>正文</p><code>&lt;style&gt;</code>');
});
function formulas(source) {
  return md.parse(source, {}).flatMap(token => token.children || [])
    .filter(token => token.type === 'math_inline').map(token => token.content);
}

test('inline math accepts old padding and adjacent formulas', () => {
  assert.deepEqual(formulas('$ n = 437 $，$ \\varphi(n) = 396 $；$n$；$ p$；$q $'),
    ['n = 437', '\\varphi(n) = 396', 'n', 'p', 'q']);
  assert.match(md.render('$ n $'), /<mjx-container/);
});
test('code, escaped dollars, currency and incomplete formulas stay literal', () => {
  for (const source of ['`$ n $`', '```sh\n$ n $\n```', '\\$ n \\$', '$20 and $30', '$ $', '$ n', '$ n\nnext $']) {
    assert.deepEqual(formulas(source), [], source);
  }
});
test('escaped dollars within math and display math retain upstream rendering', () => {
  assert.deepEqual(formulas('$ x + \\$5 $'), ['x + \\$5']);
  assert.match(md.render('$$\nx^2\n$$'), /display="true"/);
});
test('reported article has no unparsed dollar delimiters in prose', () => {
  const article = fs.readFileSync(path.join(__dirname, '../source/_posts/2025/251125.md'), 'utf8')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const tokens = md.parse(article, {}).flatMap(token => token.children || []);
  const leftovers = tokens.filter(token => token.type === 'text' && token.content.includes('$'));
  assert.deepEqual(leftovers.map(token => token.content), []);
  assert.ok(tokens.filter(token => token.type === 'math_inline').length > 100);
});
