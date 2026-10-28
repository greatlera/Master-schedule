const CACHE_NAME = 'master-schedule-v8.8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './month-plans.js',
  './stats.js',
  './icon-192.png',
  './icon-512.png'
];

// Установка: кэшируем базовые ресурсы и форсируем запуск нового SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Форсируем загрузку свежих файлов в обход промежуточного кэша браузера
      for (const asset of ASSETS_TO_CACHE) {
        try {
          const req = new Request(asset, { cache: 'reload' });
          const res = await fetch(req);
          if (res.ok) await cache.put(asset, res);
        } catch (e) {
          await cache.add(asset).catch(() => {});
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Активация: удаляем все старые версии кэша
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Обработка запросов (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Запросы к внешним API (GitHub API, Telegram API) и не-GET запросы пропускаем напрямую в сеть
  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  // Для навигации (открытие/перезагрузка страницы): сначала сеть, при офлайне — кэш
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(event.request)) ||
            (await cache.match('./index.html')) ||
            (await cache.match('./'))
          );
        })
    );
    return;
  }

  // Для остальных локальных ресурсов (иконки, манифест)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

// Клик по системному уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
