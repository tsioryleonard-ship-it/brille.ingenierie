// Service worker : permet d'ouvrir l'application même sans réseau.
// Quand vous modifiez index.html, app.js ou style.css, changez simplement le numéro de VERSION ci-dessous.
const VERSION = 'etincelle-v15';
const FICHIERS = [
  './', 'index.html', 'legal.html', 'merci.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'acces-lib.js', 'qrcode.js', 'config.json', 'vitrine.json', 'acces.json', 'contenu.enc.json', 'formes.json', 'centre.png',
  'logo-brille.png', 'logo-etincelle.png', 'icon-192.png', 'icon-512.png', 'favicon.png', 'apple-touch-icon.png',
  'p-emotions.png', 'p-apprentissages.png', 'p-liens.png', 'p-droits.png',
  'p-equilibre.png', 'p-briller.png', 'p-organisation.png',
  'gruppo-latin-400-normal.woff2',
  'quicksand-latin-300-normal.woff2', 'quicksand-latin-400-normal.woff2',
  'quicksand-latin-500-normal.woff2', 'quicksand-latin-600-normal.woff2',
  'quicksand-latin-700-normal.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n !== VERSION).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Les contenus (défis, pétales...) : réseau d'abord pour avoir la version à jour,
// sinon copie enregistrée. Le reste : copie enregistrée d'abord.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const estDonnee = /\/(config|vitrine|acces|contenu\.enc)\.json/.test(req.url);
  if (estDonnee) {
    e.respondWith(
      fetch(req).then(r => { const copie = r.clone(); caches.open(VERSION).then(c => c.put(req, copie)); return r; })
        .catch(() => caches.match(req))
    );
  } else {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
  }
});
