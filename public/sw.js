'use strict';

// Service worker : met en cache l'interface pour un démarrage rapide.
// Les échanges avec Firebase (autres domaines) ne passent pas par ce cache.
const CACHE = 'sudoku-v11';
const SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/build/app.js',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Le numéro de version est toujours lu en direct, jamais depuis le cache.
  if (url.pathname === '/version.json') return;

  // Réseau d'abord (pour recevoir les mises à jour), cache en secours.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? '/index.html' : req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req.mode === 'navigate' ? '/index.html' : req)),
  );
});

// Notification envoyée à l'administrateur quand un joueur lance une partie (api/notify-game.js).
self.addEventListener('push', (event) => {
  let d = {};
  try {
    const payload = event.data.json();
    d = payload.data || payload.notification || payload;
  } catch {
    // message sans contenu lisible : notification par défaut
  }
  event.waitUntil(
    self.registration.showNotification(d.title || 'SudoTam', {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      data: { url: d.url || '/' },
    }),
  );
});

// Un toucher sur la notification ramène à l'appli (ou l'ouvre).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c);
      return open ? open.focus() : self.clients.openWindow(event.notification.data?.url || '/');
    }),
  );
});
