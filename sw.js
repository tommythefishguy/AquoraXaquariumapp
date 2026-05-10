const AQX_CACHE = 'aquorax-icp-import-20260509c';
const AQX_BASE = '/AquoraXaquariumapp/';
const AQX_ASSETS = [AQX_BASE, AQX_BASE+'index.html', AQX_BASE+'manifest.webmanifest', AQX_BASE+'css/styles.css?v=icp-import-20260509c', AQX_BASE+'js/app.js?v=icp-import-20260509c', AQX_BASE+'aquorax-logo.png', AQX_BASE+'assets/coral-essentials-logo.jpg', AQX_BASE+'assets/icon-192.png', AQX_BASE+'assets/icon-512.png', AQX_BASE+'assets/icon-maskable-192.png', AQX_BASE+'assets/icon-maskable-512.png'];
const AQX_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDwlhhGnZcQRwIxOSQgS8keYyKcsbvYZHU",
  authDomain: "aquoraxapp.firebaseapp.com",
  projectId: "aquoraxapp",
  storageBucket: "aquoraxapp.firebasestorage.app",
  messagingSenderId: "346111843196",
  appId: "1:346111843196:web:e7ddca8a9cf95163b6a2f9",
  measurementId: "G-YYJETWQE2E"
};
try{
  importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');
  if(self.firebase && !firebase.apps.length) firebase.initializeApp(AQX_FIREBASE_CONFIG);
  if(self.firebase && firebase.messaging){
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage(function(payload){
      const n = (payload && payload.notification) || {};
      const title = n.title || 'AquoraX Alert';
      const options = {
        body: n.body || 'You have a new AquoraX notification.',
        icon: 'assets/icon-192.png',
        badge: 'assets/icon-192.png',
        tag: (payload && payload.messageId) || 'aqx-fcm-alert',
        data: {url:'./index.html'}
      };
      self.registration.showNotification(title, options);
    });
  }
}catch(e){}
self.addEventListener('install', event => { event.waitUntil(caches.open(AQX_CACHE).then(cache => cache.addAll(AQX_ASSETS)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== AQX_CACHE).map(k => caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isFreshAsset = url.pathname.endsWith('/index.html') || url.pathname.endsWith('/js/app.js') || url.pathname.endsWith('/css/styles.css') || url.pathname.endsWith('/manifest.webmanifest') || url.pathname === '/AquoraXaquariumapp/' || url.pathname.endsWith('/AquoraXaquariumapp/');
  if(isFreshAsset){
    event.respondWith(fetch(event.request, {cache:'no-store'}).then(resp => { const copy = resp.clone(); caches.open(AQX_CACHE).then(cache => cache.put(event.request, copy)); return resp; }).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => { const copy = resp.clone(); caches.open(AQX_CACHE).then(cache => cache.put(event.request, copy)); return resp; }).catch(()=>cached)));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification && event.notification.data && event.notification.data.url) || './index.html?v=icp-import-20260509c';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {
    for(const client of list){ if('focus' in client) return client.focus(); }
    if(clients.openWindow) return clients.openWindow(target);
  }));
});
