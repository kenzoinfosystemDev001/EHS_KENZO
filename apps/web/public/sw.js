// Kenzo EHS Service Worker for offline PWA installation
const CACHE_NAME = 'kenzo-ehs-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network handle regular requests
  return;
});
