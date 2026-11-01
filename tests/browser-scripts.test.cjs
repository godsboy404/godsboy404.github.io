const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const extraRequire = createRequire(path.join(process.env.BLOG_TEST_MODULES || path.join(root, '.test-deps/node_modules'), '../package.json'));
const { parseHTML } = extraRequire('linkedom');
const source = file => readFileSync(path.join(root, 'static/js', file), 'utf8');

function environment(html, fetch = async () => { throw new Error('offline'); }, storage) {
  const { document, window } = parseHTML(html);
  const calls = [], intervals = [];
  const context = vm.createContext({
    window: { location: { href: 'https://coderama.top/pages/friends/', search: '', replace: value => calls.push(value) } },
    document, URL, URLSearchParams, TextDecoder, Uint8Array, atob, Date, Math,
    AbortController, setTimeout, clearTimeout,
    setInterval: callback => { intervals.push(callback); return intervals.length; }, clearInterval() {},
    localStorage: storage || { getItem() { return null; }, setItem() {} }, fetch,
  });
  vm.runInContext(source('blog-safety.js'), context);
  return { document, context, calls, intervals, window,
    run: file => vm.runInContext(source(file), context),
    settle: () => new Promise(resolve => setImmediate(resolve)),
  };
}
function redirect(value) {
  const env = environment('<span id="url"></span><span id="site-info"></span><div id="jump-content"></div><button id="jump-button"></button><span id="copyright-year"></span>');
  env.context.window.location.search = '?url=' + encodeURIComponent(Buffer.from(value).toString('base64'));
  env.run('redirect.js');
  return env;
}
test('redirect rejects executable schemes, credential tricks, malformed and blacklisted URLs', () => {
  for (const input of ['javascript:alert(1)', 'data:text/html,test', '<img src=x onerror=alert(1)>', 'https://github.com@evil.test/', 'https://item.taobao.com/']) {
    const env = redirect(input);
    assert.equal(env.document.getElementById('jump-button').disabled, true, input);
    env.document.getElementById('jump-button').click();
    assert.equal(env.calls.length, 0);
    assert.equal(env.document.querySelector('img'), null);
  }
});
test('trusted hostname matching does not accept lookalikes or suffix attacks', () => {
  for (const input of ['https://github.com.evil.test/', 'https://notgithub.com/', 'https://evilgoogle.com/']) {
    const env = redirect(input);
    assert.equal(env.intervals.length, 0, input);
    assert.equal(env.document.getElementById('jump-button').disabled, false);
  }
  const env = redirect('https://github.com/godsboy404');
  assert.equal(env.intervals.length, 1);
  env.intervals[0](); env.intervals[0](); env.intervals[0]();
  assert.deepEqual(env.calls, ['https://github.com/godsboy404']);
});
test('redirect displays HTML-like URL parts as text and supports UTF-8 paths', () => {
  const value = 'https://example.com/中文?q=<img src=x onerror=alert(1)>';
  const env = redirect(value);
  assert.equal(env.document.querySelector('img'), null);
  assert.equal(env.document.getElementById('url').textContent, value);
  env.document.getElementById('jump-button').click();
  assert.equal(new URL(env.calls[0]).pathname, '/%E4%B8%AD%E6%96%87');
});

function feedEnvironment(data, options = {}) {
  let requests = 0;
  const env = environment('<div id="friend-circle-lite-root"></div>', async () => {
    requests++;
    if (options.failFirst && requests === 1) throw new Error('offline');
    return { ok: options.ok !== false, json: async () => data };
  }, options.storage);
  env.context.window.UserConfig = { private_api_url: 'https://feed.example/', page_turning_number: 1, error_img: '/favicon.ico' };
  env.run('fclite.js');
  return { ...env, requests: () => requests };
}
const malicious = { article_data: [
  { title: '<img src=x onerror=alert(1)>', author: '<script>bad()</script>', link: 'https://example.com/one', avatar: 'javascript:alert(1)' },
  { title: 'bad protocol', link: 'javascript:alert(1)' },
  { title: 'second', author: 'friend', link: 'https://example.com/two', created: '2026-11-01' },
], statistical_data: { friends_num: '<img src=x onerror=alert(1)>' } };
test('feed data stays text; invalid URLs are filtered; pagination and repeated modal opening work', async () => {
  const env = feedEnvironment(malicious);
  await env.settle();
  assert.equal(env.document.querySelectorAll('script, [onerror], [onclick]').length, 0);
  assert.equal(env.document.querySelector('.card-title').textContent, malicious.article_data[0].title);
  for (const node of env.document.querySelectorAll('[href], [src]')) {
    const value = node.getAttribute('href') || node.getAttribute('src');
    assert.ok(!value.startsWith('javascript:'), value);
  }
  const trigger = env.document.querySelector('.card-author');
  trigger.click(); trigger.click();
  assert.equal(env.document.querySelectorAll('#fclite-modal').length, 1);
  env.document.querySelector('.modal-close').click();
  assert.equal(env.document.querySelector('#fclite-modal'), null);
  trigger.click();
  assert.equal(env.document.querySelectorAll('#fclite-modal').length, 1);
  env.document.getElementById('load-more-btn').click();
  assert.equal(env.document.querySelectorAll('.card').length, 2);
  assert.equal(env.document.getElementById('load-more-btn').hidden, true);
  assert.equal(env.requests(), 1);
});
test('empty and malformed feeds are handled; network failure offers retry', async () => {
  const empty = feedEnvironment({ article_data: [] });
  await empty.settle();
  assert.equal(empty.document.getElementById('random-article').hidden, true);
  assert.match(empty.document.querySelector('[role=status]').textContent, /没有/);
  const invalid = feedEnvironment({ article_data: null });
  await invalid.settle();
  assert.match(invalid.document.querySelector('[role=status]').textContent, /失败/);
  const retry = feedEnvironment(malicious, { failFirst: true });
  await retry.settle();
  assert.equal(retry.document.getElementById('load-more-btn').textContent, '重新加载');
  retry.document.getElementById('load-more-btn').click();
  await retry.settle();
  assert.equal(retry.document.querySelectorAll('.card').length, 1);
});
test('corrupted and unavailable local storage do not block the feed', async () => {
  for (const storage of [
    { getItem(key) { return key.endsWith('-time') ? String(Date.now()) : '{broken'; }, setItem() {} },
    { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } },
  ]) {
    const env = feedEnvironment(malicious, { storage });
    await env.settle();
    assert.equal(env.document.querySelectorAll('.card').length, 1);
  }
});
test('retirement worker removes only legacy caches and unregisters itself', async () => {
  const handlers = {}, deleted = [];
  let unregistered = false, claimed = false, work;
  const ctx = vm.createContext({
    self: { addEventListener(name, fn) { handlers[name] = fn; }, skipWaiting() {},
      registration: { async unregister() { unregistered = true; } }, clients: { async claim() { claimed = true; } } },
    caches: { async keys() { return ['workbox-precache-v2', 'file-cache', 'another-app']; }, async delete(name) { deleted.push(name); } },
  });
  vm.runInContext(readFileSync(path.join(root, 'static/sw.js'), 'utf8'), ctx);
  handlers.activate({ waitUntil(promise) { work = promise; } });
  await work;
  assert.deepEqual(deleted.sort(), ['file-cache', 'workbox-precache-v2']);
  assert.ok(unregistered && claimed);
});
