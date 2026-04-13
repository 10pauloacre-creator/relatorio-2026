const CACHE = 'relatorio-2026-v5';
const ASSETS = [
  '/relatorio-2026/',
  '/relatorio-2026/index.html',
  '/relatorio-2026/icon-192.png',
  '/relatorio-2026/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

// Instalar e cachear recursos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// Ativar e limpar caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: Network first, cache como fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});

// Receber notificações push (background)
self.addEventListener('push', e => {
  let data = { title: 'Claude Liberado! ✅', body: 'Uma conta do Claude está disponível.' };
  if (e.data) {
    try { data = e.data.json(); } catch(_) { data.body = e.data.text(); }
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/relatorio-2026/icon-192.png',
      badge: '/relatorio-2026/icon-192.png',
      tag: data.tag || 'claude-timer',
      renotify: true,
      vibrate: [200, 100, 200]
    })
  );
});

// ── Periodic Background Sync (verifica timers com app fechado) ──
self.addEventListener('periodicsync', e => {
  if (e.tag === 'claude-timer-check') {
    e.waitUntil(verificarTimersClaude());
  }
});

async function verificarTimersClaude() {
  // Lê timers do IndexedDB (escritos pela página principal)
  try {
    var db = await abrirIDB();
    var timers = await lerTodosTimers(db);
    var agora = Date.now();
    for (var i = 0; i < timers.length; i++) {
      var t = timers[i];
      if (t.fim > 0 && t.fim <= agora && !t.notificado) {
        await self.registration.showNotification('Claude Liberado! ✅', {
          body: 'Conta [' + t.nome + '] liberada! O limite do Claude expirou.',
          icon: '/relatorio-2026/icon-192.png',
          badge: '/relatorio-2026/icon-192.png',
          tag: 'cl-' + t.id,
          renotify: true,
          requireInteraction: true,
          vibrate: [300, 100, 300, 100, 300],
          data: { id: t.id }
        });
        await marcarNotificado(db, t.id);
      }
    }
  } catch(e) {
    console.warn('[SW] Erro ao verificar timers:', e);
  }
}

function abrirIDB() {
  return new Promise(function(resolve, reject) {
    var req = self.indexedDB.open('claude-timers', 1);
    req.onupgradeneeded = function(e) {
      e.target.result.createObjectStore('timers', { keyPath: 'id' });
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = reject;
  });
}

function lerTodosTimers(db) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction('timers', 'readonly');
    var req = tx.objectStore('timers').getAll();
    req.onsuccess = function() { resolve(req.result || []); };
    req.onerror = reject;
  });
}

function marcarNotificado(db, id) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction('timers', 'readwrite');
    var store = tx.objectStore('timers');
    var getReq = store.get(id);
    getReq.onsuccess = function() {
      var item = getReq.result;
      if (item) { item.notificado = true; store.put(item); }
      tx.oncomplete = resolve;
    };
    getReq.onerror = reject;
  });
}

// Clicar na notificação abre o app na aba Claude
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('relatorio-2026') && 'focus' in client) return client.focus();
      }
      return clients.openWindow('/relatorio-2026/#claude');
    })
  );
});
