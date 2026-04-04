importScripts('/scram/scramjet.worker.js');
importScripts('/scramjet.config.js');

const scramjet = new ScramjetServiceWorker();

self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    if (scramjet.route(event)) {
      return await scramjet.fetch(event);
    }
    return fetch(event.request);
  })());
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
