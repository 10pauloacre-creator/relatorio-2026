self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

function openClaudeDb() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open('claude-timers', 1);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('timers')) {
        db.createObjectStore('timers', { keyPath: 'id' });
      }
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

function getAllClaudeTimers() {
  return openClaudeDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('timers', 'readonly');
      var store = tx.objectStore('timers');
      var req = store.getAll();
      req.onsuccess = function() { resolve(req.result || []); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  });
}

function saveClaudeTimer(timer) {
  return openClaudeDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('timers', 'readwrite');
      tx.objectStore('timers').put(timer);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}

function showClaudeReadyNotification(timer) {
  var destino = timer.url || './';
  return self.registration.showNotification('Conta Claude disponível', {
    body: 'Conta claude disponivel, toque para verificar',
    icon: 'icon-512.png',
    badge: 'icon-192.png',
    tag: 'claude-ready-' + timer.id,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: {
      id: timer.id,
      nome: timer.nome || 'Claude',
      url: destino
    }
  });
}

function checkClaudeTimers() {
  return getAllClaudeTimers().then(function(timers) {
    var agora = Date.now();
    var tarefas = timers.map(function(timer) {
      if (!timer || !timer.id || !timer.fim) return Promise.resolve();
      if (timer.notificado || timer.fim > agora) return Promise.resolve();
      return showClaudeReadyNotification(timer).then(function() {
        timer.notificado = true;
        timer.notificadoEm = agora;
        return saveClaudeTimer(timer);
      });
    });
    return Promise.all(tarefas);
  }).catch(function() {
    return Promise.resolve();
  });
}

self.addEventListener('message', function(event) {
  if (!event.data || event.data.type !== 'CLAUDE_TIMER_CHECK') return;
  event.waitUntil(checkClaudeTimers());
});

self.addEventListener('periodicsync', function(event) {
  if (event.tag !== 'claude-timer-check') return;
  event.waitUntil(checkClaudeTimers());
});

self.addEventListener('sync', function(event) {
  if (event.tag !== 'claude-timer-check') return;
  event.waitUntil(checkClaudeTimers());
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var destino = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (!client) continue;
        return client.navigate(destino).then(function() {
          return client.focus();
        }).catch(function() {
          return client.focus();
        });
      }
      return self.clients.openWindow(destino);
    })
  );
});
