/* Service worker da API Cidadania 360.
   Guarda só a casca do app (HTML, JS, CSS, ícones) para abrir rápido e
   funcionar como app instalado. Dados da API nunca ficam em cache:
   sempre vêm do servidor. */

const CACHE = 'cidadania360-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Só arquivos do próprio site; API (Render), mapas e GeoJSON passam direto
  if (url.origin !== self.location.origin) return;

  // Páginas: tenta a rede primeiro, usa o cache se estiver sem internet
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put('/', copia));
          return resp;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Arquivos com hash no nome (assets do Vite) e ícones: cache primeiro
  if (url.pathname.startsWith('/assets/') || /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (salvo) =>
          salvo ||
          fetch(req).then((resp) => {
            if (resp.ok) {
              const copia = resp.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return resp;
          })
      )
    );
  }
});
