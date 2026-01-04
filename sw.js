const CACHE_NAME = 'pension-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/js/app.js'
  // 注意：不缓存 pension_data.json
];

// 安装时缓存静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 网络优先策略：优先获取最新数据，失败时才用缓存
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 对 pension_data.json 使用网络优先策略
  if (url.pathname.includes('pension_data.json')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 成功获取后更新缓存
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // 网络失败时使用缓存
          return caches.match(request);
        })
    );
  } else {
    // 其他资源使用缓存优先策略
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request);
      })
    );
  }
});
