// 服務工作線程 - 提供PWA的離線功能和緩存

const CACHE_NAME = 'breakout-game-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './game.js',
  './pwa.js',
  './pwa.css',
  './manifest.json',
  './google_sheet_script.js',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/icon.svg'
];

// 安裝事件 - 緩存核心資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('緩存已打開');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// 激活事件 - 清理舊緩存
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('刪除舊緩存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 攔截網絡請求 - 優先使用緩存，網絡請求失敗時回退到緩存
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果在緩存中找到匹配的響應，則返回緩存的版本
        if (response) {
          return response;
        }
        
        // 否則嘗試從網絡獲取
        return fetch(event.request).then((networkResponse) => {
          // 檢查是否收到有效響應
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          
          // 克隆響應，因為響應是流，只能使用一次
          const responseToCache = networkResponse.clone();
          
          // 打開緩存並存儲新響應
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return networkResponse;
        });
      })
      .catch(() => {
        // 如果網絡請求失敗且沒有緩存，可以返回一個離線頁面
        // 這裡我們只返回一個簡單的離線響應
        if (event.request.url.includes('.html')) {
          return new Response('<html><body><h1>您目前處於離線狀態</h1><p>請檢查您的網絡連接。</p></body></html>', {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      })
  );
});