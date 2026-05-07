const AQX_CACHE = 'aquorax-pwa-v20260507-firebase-real';
const AQX_ASSETS = ['./','./index.html','./css/styles.css?v=firebase-real-20260507','./js/app.js?v=firebase-real-20260507','./aquorax-logo.png','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(AQX_CACHE).then(cache => cache.addAll(AQX_ASSETS)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== AQX_CACHE).map(k => caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isFreshAsset = url.pathname.endsWith('/index.html') || url.pathname.endsWith('/js/app.js') || url.pathname.endsWith('/css/styles.css') || url.pathname === '/' || url.pathname.endsWith('/');
  if(isFreshAsset){
    event.respondWith(fetch(event.request).then(resp => { const copy = resp.clone(); caches.open(AQX_CACHE).then(cache => cache.put(event.request, copy)); return resp; }).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => { const copy = resp.clone(); caches.open(AQX_CACHE).then(cache => cache.put(event.request, copy)); return resp; }).catch(()=>cached)));
});
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list => { for(const client of list){ if('focus' in client) return client.focus(); } if(clients.openWindow) return clients.openWindow('./index.html'); })); });
