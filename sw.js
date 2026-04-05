// ═══════════════════════════════════════════════════════════
// SW.JS — Service Worker (PWA)
// Permite instalar o app no celular e funcionar offline
// ═══════════════════════════════════════════════════════════

var CACHE_NAME = 'relatorio-2026-v1';

// Arquivos essenciais para funcionar offline
var ARQUIVOS_CACHE = [
  './index.html',
  './firebase-config.js',
  './manifest.json',
  './assets/css/main.css',
  './assets/css/editor.css',
  './assets/css/plano.css',
  './assets/css/responsive.css',
  './assets/js/data.js',
  './assets/js/firebase.js',
  './assets/js/blocks.js',
  './assets/js/editor.js',
  './assets/js/presenca.js',
  './assets/js/atividades.js',
  './assets/js/contador.js',
  './assets/js/cronograma.js',
  './assets/js/plano.js',
  './assets/js/app.js',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap'
];

// ── Instalação: cacheia os arquivos essenciais ───────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Cacheando arquivos do app...');
      // Cacheia os arquivos locais com segurança (ignora falhas de CDN)
      return cache.addAll(ARQUIVOS_CACHE.filter(function(url) {
        return !url.startsWith('https://');
      })).then(function() {
        // Tenta cachear as fontes separadamente (pode falhar offline)
        return cache.add('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap')
          .catch(function() { console.log('[SW] Fontes não cacheadas (sem internet na instalação)'); });
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── Ativação: remove caches antigos ─────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(nomes) {
      return Promise.all(
        nomes.filter(function(nome) {
          return nome !== CACHE_NAME;
        }).map(function(nome) {
          console.log('[SW] Removendo cache antigo:', nome);
          return caches.delete(nome);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Estratégia de fetch ──────────────────────────────────
// Network-first para Firebase (sempre dados frescos)
// Cache-first para assets estáticos (CSS, JS, fontes)
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Firebase e APIs externas: sempre da rede (dados em tempo real)
  if (url.includes('firestore.googleapis.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('googleapis.com/identitytoolkit') ||
      url.includes('firebase')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        // Offline: retorna resposta vazia para não travar o app
        return new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Assets estáticos: Cache-first com fallback para rede
  event.respondWith(
    caches.match(event.request).then(function(resposta) {
      if (resposta) {
        // Encontrou no cache — retorna e atualiza em segundo plano
        var fetchPromise = fetch(event.request).then(function(respostaRede) {
          if (respostaRede && respostaRede.status === 200 && respostaRede.type === 'basic') {
            var clone = respostaRede.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return respostaRede;
        }).catch(function() {});
        return resposta;
      }
      // Não está no cache — busca da rede e cacheia
      return fetch(event.request).then(function(respostaRede) {
        if (!respostaRede || respostaRede.status !== 200 || respostaRede.type !== 'basic') {
          return respostaRede;
        }
        var clone = respostaRede.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return respostaRede;
      }).catch(function() {
        // Offline e não está no cache: retorna o index.html como fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── Mensagens do app ─────────────────────────────────────
self.addEventListener('message', function(event) {
  if (event.data && event.data.tipo === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.tipo === 'LIMPAR_CACHE') {
    caches.delete(CACHE_NAME).then(function() {
      console.log('[SW] Cache limpo com sucesso');
    });
  }
});
