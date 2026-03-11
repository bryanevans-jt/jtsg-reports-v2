const CACHE_NAME = 'joshua-tree-reports-v2'; // Incremented version
const urlsToCache = [
  '/',
  '/index.html',
  './manifest.json', 
  // REMOVED: 'https://cdn.tailwindcss.com' - This is better handled by browser cache.
  'https://www.gstatic.com/firebasejs/8.6.8/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.6.8/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.6.8/firebase-firestore.js',
  './JT Website Buttons-6.png' // Explicitly cache the logo
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can only be consumed once.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a stream and can only be consumed once.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

// Clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
