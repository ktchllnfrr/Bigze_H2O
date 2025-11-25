const CACHE_NAME = 'bigze-h2o-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/products.html',
  '/about.html',
  '/contact.html',
  '/admin.html',
  '/style.css',
  '/nav-fix.css',
  '/script.js',
  '/admin.js',
  '/pics/BigzeH2O.png',  // Add your key images
  '/manifest.json'
];

// Install event: Cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event: Serve from cache if available
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});