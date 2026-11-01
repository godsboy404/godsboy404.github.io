// Retirement worker at the URL used by the former VitePress site.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('workbox-') ||
      ['file-cache', 'image-cache', 'iconfont-cache'].includes(name)).map(name => caches.delete(name)));
    await self.registration.unregister();
    await self.clients.claim();
  })());
});
