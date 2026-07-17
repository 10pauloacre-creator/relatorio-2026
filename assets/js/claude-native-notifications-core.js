(function() {
  var pendingConfigs = [];
  var installedConfigs = {};
  var retryHandle = 0;
  var retryDeadline = 0;
  var sessionPermissionPromptMap = {};

  function getCapacitor() {
    return window.Capacitor || window.capacitor || null;
  }

  function isNativeRuntime(cap) {
    if (!cap) return false;
    if (typeof cap.isNativePlatform === 'function') {
      return !!cap.isNativePlatform();
    }
    if (typeof cap.getPlatform === 'function') {
      var platform = cap.getPlatform();
      return !platform || platform !== 'web';
    }
    return true;
  }

  function getNativePlugin() {
    var cap = getCapacitor();
    var plugin = cap && cap.Plugins && cap.Plugins.LocalNotifications;
    if (!plugin) return null;
    return isNativeRuntime(cap) ? plugin : null;
  }

  function flushPendingInstalls() {
    retryHandle = 0;
    if (!pendingConfigs.length) return;

    var queued = pendingConfigs.slice();
    pendingConfigs = [];

    for (var i = 0; i < queued.length; i += 1) {
      if (!installConfig(queued[i], false)) {
        pendingConfigs.push(queued[i]);
      }
    }

    if (pendingConfigs.length && Date.now() < retryDeadline) {
      retryHandle = window.setTimeout(flushPendingInstalls, 350);
    }
  }

  function queueInstall(cfg) {
    if (!cfg || !cfg.key || installedConfigs[cfg.key]) return;
    for (var i = 0; i < pendingConfigs.length; i += 1) {
      if (pendingConfigs[i] && pendingConfigs[i].key === cfg.key) {
        return;
      }
    }

    pendingConfigs.push(cfg);
    if (!retryDeadline || retryDeadline < Date.now()) {
      retryDeadline = Date.now() + 20000;
    }
    if (!retryHandle) {
      retryHandle = window.setTimeout(flushPendingInstalls, 350);
    }
  }

  function hashNotificationId(text, base) {
    var hash = 0;
    var input = String(text || '');
    for (var i = 0; i < input.length; i += 1) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return base + (Math.abs(hash) % 500000);
  }

  function getStorageKey(prefix, suffix, id) {
    return prefix + '_' + suffix + '_' + id;
  }

  function safeAlert(message) {
    if (typeof window.alert === 'function') {
      window.alert(message);
    }
  }

  function safeConfirm(message) {
    if (typeof window.confirm === 'function') {
      return window.confirm(message);
    }
    return false;
  }

  function safeCall(name) {
    if (!name || typeof window[name] !== 'function') return;
    var args = Array.prototype.slice.call(arguments, 1);
    try {
      return window[name].apply(window, args);
    } catch (error) {
      console.warn('[Claude Native] Falha ao chamar', name, error);
    }
  }

  function installListeners(plugin, cfg, markNotified, openClaudeTab) {
    if (window.__claudeNativeListenerMap && window.__claudeNativeListenerMap[cfg.key]) return;
    window.__claudeNativeListenerMap = window.__claudeNativeListenerMap || {};
    window.__claudeNativeListenerMap[cfg.key] = true;

    plugin.createChannel({
      id: cfg.channelId,
      name: cfg.channelName,
      description: cfg.channelDescription,
      importance: 5,
      visibility: 1,
      vibration: true
    }).catch(function() {});

    plugin.addListener('localNotificationReceived', function(event) {
      var extra = event && (event.extra || event.data) || {};
      if (!extra || extra.claudeKey !== cfg.key) return;
      markNotified(extra.accountId, extra.fim);
    }).catch(function() {});

    plugin.addListener('localNotificationActionPerformed', function(event) {
      var notification = event && event.notification || {};
      var extra = notification.extra || notification.data || {};
      if (!extra || extra.claudeKey !== cfg.key) return;
      markNotified(extra.accountId, extra.fim);
      openClaudeTab();
    }).catch(function() {});
  }

  function installConfig(cfg, allowQueue) {
    if (!cfg || !cfg.key) return false;
    if (installedConfigs[cfg.key]) return true;

    var plugin = getNativePlugin();
    if (!plugin) {
      if (allowQueue !== false) {
        queueInstall(cfg);
      }
      return false;
    }

    installedConfigs[cfg.key] = true;

    var originals = {
      tick: window[cfg.tickName],
      notify: window[cfg.notifyName],
      confirm: window[cfg.confirmName],
      requestPermission: window[cfg.permissionName],
      clear: window[cfg.clearName],
      updateBar: window[cfg.updateBarName]
    };

    function getAccounts() {
      return window[cfg.accountsName] || [];
    }

    function getAccountName(id) {
      var accounts = getAccounts();
      for (var i = 0; i < accounts.length; i += 1) {
        if (accounts[i] && accounts[i].id === id) return accounts[i].nome || 'Claude';
      }
      return 'Claude';
    }

    function notificationId(accountId) {
      return hashNotificationId(cfg.key + ':' + String(accountId || ''), cfg.notificationBaseId);
    }

    function timerUrl() {
      return location.pathname + cfg.pageHash;
    }

    function markNotified(accountId, fim) {
      if (!accountId) return;
      localStorage.setItem(getStorageKey(cfg.storagePrefix, 'notif', accountId), '1');
      if (fim) {
        localStorage.setItem(getStorageKey(cfg.storagePrefix, 'native_notif', accountId), String(fim));
      }
    }

    function clearNotified(accountId) {
      if (!accountId) return;
      localStorage.removeItem(getStorageKey(cfg.storagePrefix, 'notif', accountId));
      localStorage.removeItem(getStorageKey(cfg.storagePrefix, 'native_notif', accountId));
    }

    function hasBeenNotified(accountId, fim) {
      var legacy = localStorage.getItem(getStorageKey(cfg.storagePrefix, 'notif', accountId));
      var nativeValue = localStorage.getItem(getStorageKey(cfg.storagePrefix, 'native_notif', accountId));
      return legacy === '1' || nativeValue === String(fim || '');
    }

    function updateStatusText(message) {
      if (!cfg.globalStatusId) return;
      var el = document.getElementById(cfg.globalStatusId);
      if (el) el.textContent = message;
    }

    function schedulePermissionPrompt() {
      if (sessionPermissionPromptMap[cfg.key]) return;
      sessionPermissionPromptMap[cfg.key] = true;

      window.setTimeout(function() {
        plugin.checkPermissions().then(function(perm) {
          if (perm && perm.display === 'granted') return;

          var accepted = safeConfirm(
            'Deseja autorizar as notificacoes do Android para receber o aviso quando o contador do Claude zerar?'
          );

          if (!accepted) return;

          if (typeof window[cfg.permissionName] === 'function') {
            window[cfg.permissionName]();
          }
        }).catch(function() {});
      }, 700);
    }

    function openClaudeTab() {
      if (location.hash !== cfg.pageHash) {
        location.hash = cfg.pageHash;
      }
      safeCall(cfg.openTabName);
    }

    async function ensurePermissions(interactive) {
      try {
        var perm = await plugin.checkPermissions();
        if (!perm || perm.display !== 'granted') {
          if (!interactive) {
            await updateNotificationBar();
            return false;
          }
          perm = await plugin.requestPermissions();
          if (!perm || perm.display !== 'granted') {
            safeAlert('Ative a permissao de notificacoes do Android para receber o aviso quando o cronometro do Claude zerar.');
            await updateNotificationBar();
            return false;
          }
        }

        if (plugin.checkExactNotificationSetting) {
          try {
            var exact = await plugin.checkExactNotificationSetting();
            if (exact && exact.exact_alarm && exact.exact_alarm !== 'granted' && interactive && plugin.changeExactNotificationSetting) {
              safeAlert('Para o aviso disparar no momento exato em que a conta Claude liberar, ative tambem os alarmes exatos do Android na proxima tela.');
              await plugin.changeExactNotificationSetting();
            }
          } catch (error) {
            console.warn('[Claude Native] Nao foi possivel verificar alarmes exatos:', error);
          }
        }

        await updateNotificationBar();
        return true;
      } catch (error) {
        console.warn('[Claude Native] Erro ao validar permissao nativa:', error);
        await updateNotificationBar();
        return false;
      }
    }

    async function scheduleNativeNotification(accountId, accountName, timestamp, immediate) {
      if (!(await ensurePermissions(false))) return false;

      var id = notificationId(accountId);
      try {
        await plugin.cancel({ notifications: [{ id: id }] }).catch(function() {});
        await plugin.removeDeliveredNotifications({ notifications: [{ id: id }] }).catch(function() {});
      } catch (error) {
        console.warn('[Claude Native] Falha ao limpar notificacao anterior:', error);
      }

      try {
        await plugin.schedule({
          notifications: [{
            id: id,
            title: cfg.notificationTitle,
            body: cfg.notificationBody,
            channelId: cfg.channelId,
            schedule: {
              at: new Date(immediate ? (Date.now() + 700) : timestamp),
              allowWhileIdle: true
            },
            extra: {
              claudeKey: cfg.key,
              accountId: accountId,
              accountName: accountName,
              fim: timestamp,
              url: timerUrl()
            }
          }]
        });
        return true;
      } catch (error) {
        console.warn('[Claude Native] Falha ao agendar notificacao nativa:', error);
        return false;
      }
    }

    async function cancelNativeNotification(accountId) {
      var id = notificationId(accountId);
      try {
        await plugin.cancel({ notifications: [{ id: id }] }).catch(function() {});
        await plugin.removeDeliveredNotifications({ notifications: [{ id: id }] }).catch(function() {});
      } catch (error) {
        console.warn('[Claude Native] Falha ao cancelar notificacao nativa:', error);
      }
    }

    async function updateNotificationBar() {
      var bar = document.getElementById(cfg.notifBarId);
      if (!bar) return false;
      try {
        var perm = await plugin.checkPermissions();
        var enabled = !!perm && perm.display === 'granted';
        bar.style.display = enabled ? 'none' : 'flex';
        updateStatusText(enabled ? cfg.enabledStatusText : cfg.pendingStatusText);
        if (!enabled && isNativeRuntime(getCapacitor())) {
          schedulePermissionPrompt();
        }
        return enabled;
      } catch (error) {
        console.warn('[Claude Native] Falha ao atualizar barra de notificacao:', error);
        if (typeof originals.updateBar === 'function') {
          originals.updateBar();
        }
        return false;
      }
    }

    installListeners(plugin, cfg, markNotified, openClaudeTab);

    window[cfg.updateBarName] = function() {
      updateNotificationBar();
    };

    window[cfg.permissionName] = async function() {
      var granted = await ensurePermissions(true);
      if (!granted) return;
      updateStatusText(cfg.enabledStatusText);
    };

    window[cfg.notifyName] = function(nome, maybeId) {
      var accountId = maybeId || cfg.resolveIdByName(nome, getAccounts()) || nome;
      var fim = parseInt(localStorage.getItem(getStorageKey(cfg.storagePrefix, 'fim', accountId)) || '0', 10);
      markNotified(accountId, fim);
      scheduleNativeNotification(accountId, nome || getAccountName(accountId), fim || Date.now(), true).then(function(scheduled) {
        if (!scheduled && typeof originals.notify === 'function') {
          originals.notify(nome, maybeId);
        }
      });
    };

    window[cfg.tickName] = function() {
      var agora = Date.now();
      var accounts = getAccounts();
      for (var i = 0; i < accounts.length; i += 1) {
        var conta = accounts[i];
        if (!conta || !conta.id) continue;
        var timerEl = document.getElementById(cfg.timerPrefix + conta.id);
        var cardEl = document.getElementById(cfg.cardPrefix + conta.id);
        var statEl = document.getElementById(cfg.statusPrefix + conta.id);
        if (!timerEl || !cardEl || !statEl) continue;

        var fim = parseInt(localStorage.getItem(getStorageKey(cfg.storagePrefix, 'fim', conta.id)) || '0', 10);
        var restante = fim - agora;
        if (restante > 0) {
          timerEl.textContent = safeCall(cfg.formatFnName, restante) || '00:00:00';
          cardEl.className = cfg.busyCardClass;
          statEl.textContent = cfg.busyText;
          continue;
        }

        timerEl.textContent = '00:00:00';
        cardEl.className = cfg.freeCardClass;
        statEl.textContent = cfg.freeText;

        if (fim > 0 && !hasBeenNotified(conta.id, fim)) {
          markNotified(conta.id, fim);
          window[cfg.notifyName](conta.nome, conta.id);
        }
      }
    };

    window[cfg.confirmName] = async function() {
      var popup = document.getElementById(cfg.popupId);
      var input = document.getElementById(cfg.inputId);
      if (!popup || !input) return;
      if (!input.value) {
        popup.style.display = 'none';
        return;
      }

      var parts = input.value.split(':');
      var now = new Date();
      var endTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        parseInt(parts[0], 10),
        parseInt(parts[1] || '0', 10),
        0,
        0
      );

      if (endTime.getTime() <= Date.now()) {
        endTime.setDate(endTime.getDate() + 1);
      }

      var accountId = popup.dataset.id || cfg.readPopupAccountId();
      var accountName = popup.dataset.nome || getAccountName(accountId);
      var timestamp = endTime.getTime();

      clearNotified(accountId);
      localStorage.setItem(getStorageKey(cfg.storagePrefix, 'fim', accountId), String(timestamp));
      safeCall(cfg.onSaveTimerName, accountId, timestamp);
      safeCall(cfg.idbSaveName, accountId, accountName, timestamp, timerUrl());
      safeCall(cfg.afterScheduleName);

      if (await ensurePermissions(true)) {
        await scheduleNativeNotification(accountId, accountName, timestamp, false);
      }

      popup.style.display = 'none';
      safeCall(cfg.renderName);
      safeCall(cfg.updateBarName);
    };

    window[cfg.clearName] = function(accountId) {
      clearNotified(accountId);
      cancelNativeNotification(accountId).finally(function() {
        if (typeof originals.clear === 'function') {
          originals.clear(accountId);
          return;
        }
        localStorage.removeItem(getStorageKey(cfg.storagePrefix, 'fim', accountId));
        safeCall(cfg.idbRemoveName, accountId);
        safeCall(cfg.onClearTimerName, accountId);
        safeCall(cfg.renderName);
      });
    };

    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) {
        updateNotificationBar();
      }
    });
    window.addEventListener('focus', function() {
      updateNotificationBar();
    });

    updateNotificationBar();
    return true;
  }

  window.installClaudeNativeNotifications = function(cfg) {
    return installConfig(cfg, true);
  };

  document.addEventListener('DOMContentLoaded', flushPendingInstalls);
  document.addEventListener('deviceready', flushPendingInstalls);
  document.addEventListener('resume', flushPendingInstalls);
  window.addEventListener('focus', flushPendingInstalls);
  window.addEventListener('load', flushPendingInstalls);
})();
