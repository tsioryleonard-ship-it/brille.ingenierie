/* Service worker de l'auto-audit QVE : permet l'ouverture hors connexion.
   Il ne touche qu'aux fichiers de l'auto-audit, pas aux autres pages du site. */
var CACHE = 'brille-audit-qve-v2';
var FILES = ['audit_qve.html', 'audit-manifest.webmanifest', 'audit-icon-192.png', 'audit-icon-512.png', 'audit-icon-180.png','audit-icon-maskable-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('brille-audit-qve-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  var name = url.pathname.split('/').pop();
  if (FILES.indexOf(name) === -1) return;
  /* d'abord le réseau (pour toujours avoir la dernière version), sinon la copie gardée */
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }); })
  );
});
