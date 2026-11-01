(function () {
  'use strict';
  const root = document.getElementById('friend-circle-lite-root');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const { httpUrl } = window.BlogSafety;
  const config = window.UserConfig || {};
  const pageSize = Math.max(1, Math.min(100, Number(config.page_turning_number) || 20));
  const api = httpUrl(config.private_api_url);
  const fallback = httpUrl(config.error_img, window.location.href) || '/favicon.ico';
  const cacheKey = 'friend-circle-lite-cache';
  const cacheTimeKey = 'friend-circle-lite-cache-time';
  let articles = null;
  let start = 0;
  let loading = false;
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function link(text, url, className) {
    const node = element('a', className, text);
    node.href = url;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
    return node;
  }
  function image(url, className) {
    const node = element('img', className);
    node.alt = '';
    node.loading = 'lazy';
    node.src = url;
    node.addEventListener('error', () => { node.src = fallback; }, { once: true });
    return node;
  }
  const random = element('div');
  random.id = 'random-article';
  const list = element('div', 'articles-container');
  list.id = 'articles-container';
  const status = element('p');
  status.setAttribute('role', 'status');
  const more = element('button', '', '再来亿点');
  more.id = 'load-more-btn';
  const stats = element('div');
  stats.id = 'stats-container';
  root.replaceChildren(random, list, status, more, stats);

  function normalize(data) {
    if (!data || !Array.isArray(data.article_data)) throw new Error('Invalid feed');
    return data.article_data.filter(item => item && typeof item === 'object')
      .map(item => ({
        title: typeof item.title === 'string' ? item.title : '未命名文章',
        author: typeof item.author === 'string' ? item.author : '匿名作者',
        link: httpUrl(item.link),
        avatar: httpUrl(item.avatar, window.location.href) || fallback,
        created: typeof item.created === 'string' ? item.created.slice(0, 10) : '',
      })).filter(item => item.link);
  }
  function showRandom() {
    random.replaceChildren();
    if (!articles.length) { random.hidden = true; return; }
    random.hidden = false;
    const item = articles[Math.floor(Math.random() * articles.length)];
    const body = element('div', 'random-container');
    body.append(element('div', 'random-container-title', '随机钓鱼'),
      element('div', 'random-title', item.title), element('div', 'random-author', '作者: ' + item.author));
    const controls = element('div', 'random-button-container');
    const refresh = element('button', '', '刷新');
    refresh.addEventListener('click', showRandom);
    controls.append(refresh, link('过去转转', item.link, 'random-link-button'));
    random.append(body, controls);
  }
  function showAuthor(item, trigger) {
    document.getElementById('fclite-modal')?.remove();
    const modal = element('div', 'modal modal-open');
    modal.id = 'fclite-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', item.author + '的文章');
    const body = element('div', 'modal-content');
    const close = element('button', 'modal-close', '关闭');
    function dismiss() { modal.remove(); trigger.focus(); }
    close.addEventListener('click', dismiss);
    modal.addEventListener('click', event => { if (event.target === modal) dismiss(); });
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') dismiss();
      if (event.key === 'Tab') {
        const targets = body.querySelectorAll('button, a[href]');
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    const avatar = image(item.avatar);
    avatar.id = 'modal-author-avatar';
    const author = link(item.author, new URL(item.link).origin);
    author.id = 'modal-author-name-link';
    const items = element('div');
    items.id = 'modal-articles-container';
    articles.filter(article => article.author === item.author).slice(0, 4).forEach(article => {
      const row = element('div', 'modal-article');
      row.append(link(article.title, article.link, 'modal-article-title'), element('div', 'modal-article-date', article.created));
      items.append(row);
    });
    body.append(close, avatar, author, items);
    modal.append(body);
    root.append(modal);
    close.focus();
  }
  function renderPage() {
    articles.slice(start, start + pageSize).forEach(item => {
      const card = element('div', 'card');
      const author = element('button', 'card-author');
      author.type = 'button';
      author.append(image(item.avatar, 'no-lightbox'), document.createTextNode(item.author));
      author.addEventListener('click', () => showAuthor(item, author));
      card.append(link(item.title, item.link, 'card-title'), author,
        element('div', 'card-date', '🗓️ ' + item.created), image(item.avatar, 'card-bg no-lightbox'));
      list.append(card);
    });
    start += pageSize;
    more.hidden = start >= articles.length;
    status.textContent = articles.length ? '' : '暂时没有可显示的文章。';
  }
  function accept(data) {
    articles = normalize(data);
    const info = data.statistical_data || {};
    stats.replaceChildren();
    const powered = element('div');
    powered.append(document.createTextNode('Powered by: '), link('FriendCircleLite', 'https://github.com/willow-god/Friend-Circle-Lite'));
    const designed = element('div');
    designed.append(document.createTextNode('Designed by: '), link('LiuShen', 'https://www.liushen.fun/'));
    stats.append(powered, designed,
      element('div', '', `订阅: ${info.friends_num ?? '—'} 活跃: ${info.active_num ?? '—'} 总文章数: ${info.article_num ?? articles.length}`),
      element('div', '', '更新时间: ' + (info.last_updated_time ?? '—')));
    showRandom();
    renderPage();
  }
  async function load() {
    if (loading) return;
    if (articles) { renderPage(); return; }
    loading = true;
    more.disabled = true;
    status.textContent = '正在加载友圈…';
    try {
      try {
        const age = Date.now() - Number(localStorage.getItem(cacheTimeKey));
        if (age >= 0 && age < 600000) {
          const cached = JSON.parse(localStorage.getItem(cacheKey));
          normalize(cached);
          accept(cached);
          return;
        }
      } catch { /* A corrupt or unavailable cache must not prevent fetching. */ }
      if (!api) throw new Error('Invalid API');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      let data;
      try {
        const response = await fetch(new URL('all.json', api.endsWith('/') ? api : api + '/'), { signal: controller.signal });
        if (!response.ok) throw new Error('Feed request failed');
        data = await response.json();
        normalize(data);
      } finally { clearTimeout(timer); }
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheTimeKey, String(Date.now()));
      } catch { /* Storage may be disabled or full. */ }
      accept(data);
    } catch {
      status.textContent = '友圈暂时加载失败，请稍后重试。';
      more.textContent = '重新加载';
    } finally {
      loading = false;
      more.disabled = false;
      if (articles) more.textContent = '再来亿点';
    }
  }
  more.addEventListener('click', load);
  load();
}());
