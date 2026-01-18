const CACHE_NAME = 'goodwins-v1';
const ASSETS = [
  './',
  './index.html',
  './main.js',
  './manifest.json',
  './icon.png'
];

// 安裝時快取檔案
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 讀取時從快取拿資料
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
