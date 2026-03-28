importScripts('/scramjet/scramjet.worker.js');

const scramjet = new ScramjetServiceWorker();

self.addEventListener("fetch", (event) => {
  event.respondWith(async () => {
    if (scramjet.route(event)) {
      return scramjet.fetch(event);
    }
    return fetch(event.request);
  });
});
