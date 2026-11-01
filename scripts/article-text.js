/* global hexo */
'use strict';
const path = require('node:path');
const { withoutStyles } = require('../tools/article-text.cjs');
const themeRoot = path.dirname(require.resolve('hexo-theme-stellar/package.json'));
const { countWords, readingMinutes } = require(path.join(themeRoot, 'scripts/lib/reading_time'));
const { buildSearchIndex } = require(path.join(themeRoot, 'scripts/lib/search_index'));

// Register after theme scripts, keeping this compatibility fix outside the theme.
let installed = false;
hexo.extend.filter.register('before_generate', () => {
  if (installed) return;
  installed = true;
  const content = page => withoutStyles(page && (page.content || page._content || ''));
  hexo.extend.helper.register('word_count', page => countWords(content(page)));
  hexo.extend.helper.register('reading_time', page => readingMinutes(content(page)));
  const originalToc = hexo.extend.helper.get('toc');
  hexo.extend.helper.register('toc', function (html, options) {
    return originalToc.call(this, withoutStyles(html), options);
  });
  const original = hexo.extend.generator.get('search_json_generator');
  hexo.extend.generator.register('search_json_generator', async function (locals) {
    const result = await original.call(this, locals);
    if (result?.path !== 'search.json') return result;
    const posts = new Map([...locals.posts.toArray(), ...locals.pages.toArray()]
      .map(post => ['/' + post.path.replace(/^\/+/, '').replace(/\/?$/, '/'), post]));
    const entries = JSON.parse(result.data);
    for (const entry of entries) {
      const post = posts.get(entry.path);
      if (!post || entry.content === undefined) continue;
      const index = buildSearchIndex(withoutStyles(post.content));
      entry.content = index.content;
      if (index.anchors.length) entry.anchors = index.anchors;
      else delete entry.anchors;
    }
    return { ...result, data: JSON.stringify(entries) };
  });
});
