(function () {
  'use strict';
  const { httpUrl, matchesHost } = window.BlogSafety;
  const urlDom = document.getElementById('url');
  const tip = document.getElementById('site-info');
  const content = document.getElementById('jump-content');
  const button = document.getElementById('jump-button');
  const whitelist = ['coderama.top', 'github.com', '*.google.com', '*.baidu.com', '*.bing.cn', 'npmjs.com'];
  const blacklist = ['*.taobao.com', '*.jd.com'];
  let target = null;
  let timer;
  function reject(message) {
    target = null;
    button.disabled = true;
    button.textContent = '禁止跳转';
    tip.textContent = message;
    content.className = 'danger';
  }
  function navigate() {
    if (!target) return;
    clearInterval(timer);
    button.textContent = '正在跳转';
    window.location.replace(target);
  }
  document.getElementById('copyright-year').textContent = new Date().getFullYear();
  button.addEventListener('click', navigate);
  try {
    const encoded = new URLSearchParams(window.location.search).get('url');
    if (!encoded) throw new Error('Missing URL');
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    urlDom.textContent = decoded;
    const validated = httpUrl(decoded);
    if (!validated) throw new Error('Invalid URL');
    const host = new URL(validated).hostname;
    if (blacklist.some(pattern => matchesHost(host, pattern))) {
      reject('⛔ 该域名处于黑名单');
      return;
    }
    target = validated;
    button.disabled = false;
    if (whitelist.some(pattern => matchesHost(host, pattern))) {
      tip.textContent = '该域名在本站快捷跳转名单中，即将前往';
      content.className = 'safe';
      let count = 3;
      button.textContent = `${count} 秒后自动跳转`;
      timer = setInterval(() => {
        count -= 1;
        if (count <= 0) navigate();
        else button.textContent = `${count} 秒后自动跳转`;
      }, 1000);
    }
  } catch {
    reject('无法解析链接，仅支持完整的 HTTP 或 HTTPS 网址。');
  }
}());
