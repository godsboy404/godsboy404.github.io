// Shared by the legacy redirect page and the friend-circle widget.
(function () {
  'use strict';
  function httpUrl(value, base) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, base);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
      return url.href;
    } catch { return null; }
  }
  function matchesHost(host, pattern) {
    host = host.toLowerCase().replace(/\.$/, '');
    pattern = pattern.toLowerCase();
    if (pattern.startsWith('*.')) {
      const domain = pattern.slice(2);
      return host === domain || host.endsWith('.' + domain);
    }
    return host === pattern;
  }
  window.BlogSafety = Object.freeze({ httpUrl, matchesHost });
}());
