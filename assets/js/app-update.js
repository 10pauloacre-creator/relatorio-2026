(function () {
  "use strict";

  if (window.__RELATORIOS_UPDATE_BOOTSTRAPPED__) return;
  window.__RELATORIOS_UPDATE_BOOTSTRAPPED__ = true;

  var build = window.__RELATORIOS_APP_BUILD__ || null;
  var latestRelease = null;
  var modalElements = null;

  if (!build) return;

  document.addEventListener("DOMContentLoaded", function () {
    injectStyles();
    modalElements = ensureModal();
    interceptDownloadLinks();

    if (isNativeApp()) {
      setupNativePullRefresh();
      setTimeout(checkForUpdates, 700);
    }
  });

  window.relatoriosAbrirPaginaDownload = function () {
    openDownloadPage();
  };

  function checkForUpdates() {
    loadLatestReleaseScript()
      .then(function (latest) {
        if (!latest) return;
        latestRelease = latest;
        if (!isNewerRelease(latest, build)) return;
        populateModal(latest);
        openModal();
      })
      .catch(function () {});
  }

  function loadLatestReleaseScript() {
    return new Promise(function (resolve, reject) {
      if (!build.latestScriptUrl) {
        resolve(null);
        return;
      }

      window.__RELATORIOS_APP_LATEST__ = null;

      var script = document.createElement("script");
      script.src = appendCacheBust(build.latestScriptUrl);
      script.async = true;
      script.onload = function () {
        resolve(window.__RELATORIOS_APP_LATEST__ || null);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function ensureModal() {
    var overlay = document.createElement("div");
    overlay.className = "rd-update-modal";
    overlay.innerHTML =
      '<div class="rd-update-card" role="dialog" aria-modal="true" aria-labelledby="rd-update-title">' +
      '  <button class="rd-update-close" type="button" aria-label="Fechar">x</button>' +
      '  <div class="rd-update-eyebrow">Atualizacao do aplicativo</div>' +
      '  <h2 id="rd-update-title">Nova versao disponivel</h2>' +
      '  <p class="rd-update-copy">Encontramos uma nova versao do app. Atualize agora para instalar a estrutura mais recente e continuar com as ultimas melhorias.</p>' +
      '  <div class="rd-update-versions">' +
      '    <div><strong>Versao atual</strong><span class="rd-update-current"></span></div>' +
      '    <div><strong>Nova versao</strong><span class="rd-update-latest"></span></div>' +
      "  </div>" +
      '  <div class="rd-update-notes-wrap">' +
      '    <div class="rd-update-notes-title">O que ha de novo</div>' +
      '    <ul class="rd-update-notes"></ul>' +
      "  </div>" +
      '  <div class="rd-update-actions">' +
      '    <button class="rd-update-primary" type="button">Baixar atualizacao</button>' +
      '    <button class="rd-update-secondary" type="button">Depois</button>' +
      "  </div>" +
      "</div>";

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closeModal();
    });

    overlay.querySelector(".rd-update-close").addEventListener("click", closeModal);
    overlay.querySelector(".rd-update-secondary").addEventListener("click", closeModal);
    overlay.querySelector(".rd-update-primary").addEventListener("click", function () {
      closeModal();
      openDownloadPage();
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function populateModal(latest) {
    if (!modalElements) return;

    var currentVersion = modalElements.querySelector(".rd-update-current");
    var latestVersion = modalElements.querySelector(".rd-update-latest");
    var notesList = modalElements.querySelector(".rd-update-notes");

    if (currentVersion) currentVersion.textContent = formatVersion(build);
    if (latestVersion) latestVersion.textContent = formatVersion(latest);

    notesList.innerHTML = "";
    var notes = Array.isArray(latest.notes) && latest.notes.length
      ? latest.notes
      : ["Atualizacao estrutural publicada na pagina oficial de download."];

    notes.forEach(function (note) {
      var item = document.createElement("li");
      item.textContent = note;
      notesList.appendChild(item);
    });
  }

  function openModal() {
    if (!modalElements) return;
    modalElements.classList.add("is-open");
  }

  function closeModal() {
    if (!modalElements) return;
    modalElements.classList.remove("is-open");
  }

  function openDownloadPage() {
    var url = build.downloadPageUrl || "./downloads/index.html";

    if (
      isNativeApp() &&
      window.RelatoriosAppBridge &&
      typeof window.RelatoriosAppBridge.openInternalUrl === "function"
    ) {
      window.RelatoriosAppBridge.openInternalUrl(url);
      return;
    }

    window.location.href = url;
  }

  function interceptDownloadLinks() {
    document.addEventListener("click", function (event) {
      var link = event.target.closest("a[href]");
      if (!link) return;

      var href = link.getAttribute("href") || "";
      if (!href) return;

      var normalizedHref = href.toLowerCase();
      var normalizedDownloadUrl = String(build.downloadPageUrl || "").toLowerCase();

      if (
        normalizedHref.indexOf("downloads/index.html") === -1 &&
        normalizedHref !== normalizedDownloadUrl &&
        normalizedHref !== normalizedDownloadUrl.replace(/\/$/, "")
      ) {
        return;
      }

      if (!isNativeApp()) return;

      event.preventDefault();
      openDownloadPage();
    });
  }

  function isNativeApp() {
    return !!(window.RelatoriosAppBridge && typeof window.RelatoriosAppBridge.openInternalUrl === "function");
  }

  function setupNativePullRefresh() {
    if (window.__RELATORIOS_NATIVE_PULL_REFRESH__) return;
    window.__RELATORIOS_NATIVE_PULL_REFRESH__ = true;

    var indicator = document.createElement("div");
    indicator.className = "rd-native-refresh";
    indicator.innerHTML =
      '<div class="rd-native-refresh-pill">' +
      '  <div class="rd-native-refresh-title">Atualizacao online</div>' +
      '  <div class="rd-native-refresh-copy">Puxe para baixo e segure por 2 segundos</div>' +
      "</div>";
    document.body.appendChild(indicator);

    var startY = 0;
    var armed = false;
    var holdTimer = null;
    var triggered = false;
    var thresholdReached = false;

    function getScrollTop() {
      var root = document.scrollingElement || document.documentElement || document.body;
      return Math.max(root ? root.scrollTop || 0 : 0, window.scrollY || 0);
    }

    function clearHoldTimer() {
      if (!holdTimer) return;
      window.clearTimeout(holdTimer);
      holdTimer = null;
    }

    function setIndicatorState(state, title, copy) {
      indicator.className = "rd-native-refresh is-" + state;
      var titleEl = indicator.querySelector(".rd-native-refresh-title");
      var copyEl = indicator.querySelector(".rd-native-refresh-copy");
      if (titleEl) titleEl.textContent = title;
      if (copyEl) copyEl.textContent = copy;
    }

    function resetIndicator() {
      clearHoldTimer();
      armed = false;
      thresholdReached = false;
      if (!triggered) {
        setIndicatorState("idle", "Atualizacao online", "Puxe para baixo e segure por 2 segundos");
      }
    }

    function triggerRefresh() {
      triggered = true;
      clearHoldTimer();
      setIndicatorState("loading", "Atualizando...", "Buscando informacoes online");

      var action = typeof window.relatoriosForceOnlineRefresh === "function"
        ? window.relatoriosForceOnlineRefresh()
        : Promise.resolve().then(function () { window.location.reload(); });

      Promise.resolve(action)
        .then(function () {
          setIndicatorState("done", "Atualizado", "Dados online recarregados");
        })
        .catch(function () {
          setIndicatorState("error", "Falha ao atualizar", "Tente novamente em instantes");
        })
        .finally(function () {
          window.setTimeout(function () {
            triggered = false;
            resetIndicator();
          }, 1400);
        });
    }

    document.addEventListener("touchstart", function (event) {
      if (triggered || getScrollTop() > 0) return;
      var touch = event.touches && event.touches[0];
      if (!touch) return;
      startY = touch.clientY;
      armed = true;
      thresholdReached = false;
      clearHoldTimer();
      setIndicatorState("idle", "Atualizacao online", "Puxe para baixo e segure por 2 segundos");
    }, { passive: true });

    document.addEventListener("touchmove", function (event) {
      if (!armed || triggered) return;
      var touch = event.touches && event.touches[0];
      if (!touch) return;
      if (getScrollTop() > 0) {
        resetIndicator();
        return;
      }

      var delta = touch.clientY - startY;
      if (delta < 0) {
        resetIndicator();
        return;
      }

      if (delta < 70) {
        thresholdReached = false;
        clearHoldTimer();
        setIndicatorState("peek", "Continue puxando", "Segure quando a faixa estiver totalmente aberta");
        return;
      }

      if (!thresholdReached) {
        thresholdReached = true;
        setIndicatorState("hold", "Segure por 2 segundos", "Mantendo a tela puxada para atualizar");
      }

      if (!holdTimer) {
        holdTimer = window.setTimeout(triggerRefresh, 2000);
      }
    }, { passive: true });

    document.addEventListener("touchend", function () {
      if (triggered) return;
      resetIndicator();
    }, { passive: true });

    document.addEventListener("touchcancel", function () {
      if (triggered) return;
      resetIndicator();
    }, { passive: true });
  }

  function isNewerRelease(latest, current) {
    var latestCode = parseInt(latest && latest.versionCode, 10);
    var currentCode = parseInt(current && current.versionCode, 10);

    if (latestCode && currentCode && latestCode !== currentCode) {
      return latestCode > currentCode;
    }

    return compareVersionNames(latest && latest.versionName, current && current.versionName) > 0;
  }

  function compareVersionNames(a, b) {
    var left = String(a || "0.0.0").split(".").map(toInt);
    var right = String(b || "0.0.0").split(".").map(toInt);
    var size = Math.max(left.length, right.length);

    for (var i = 0; i < size; i += 1) {
      var diff = (left[i] || 0) - (right[i] || 0);
      if (diff !== 0) return diff;
    }

    return 0;
  }

  function toInt(value) {
    return parseInt(value, 10) || 0;
  }

  function formatVersion(info) {
    var versionName = String((info && info.versionName) || "1.0.0");
    var versionCode = parseInt(info && info.versionCode, 10);
    return versionCode ? "v" + versionName + " - build " + versionCode : "v" + versionName;
  }

  function appendCacheBust(url) {
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "t=" + Date.now();
  }

  function injectStyles() {
    if (document.getElementById("rd-update-style")) return;

    var style = document.createElement("style");
    style.id = "rd-update-style";
    style.textContent =
      ".rd-update-modal{position:fixed;inset:0;background:rgba(6,13,10,.72);display:none;align-items:center;justify-content:center;padding:18px;z-index:9950}" +
      ".rd-update-modal.is-open{display:flex}" +
      ".rd-update-card{width:min(100%,560px);background:linear-gradient(180deg,#faf7ef,#f3efe4);border-radius:24px;padding:24px 24px 22px;position:relative;box-shadow:0 26px 60px rgba(0,0,0,.3);font-family:'DM Sans',sans-serif;color:#173122}" +
      ".rd-update-close{position:absolute;top:14px;right:14px;width:38px;height:38px;border:none;border-radius:50%;background:rgba(20,49,34,.08);color:#173122;font-size:1.1rem;cursor:pointer}" +
      ".rd-update-eyebrow{display:inline-flex;padding:7px 11px;border-radius:999px;background:rgba(201,168,76,.16);color:#8b6514;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}" +
      ".rd-update-card h2{margin:14px 0 8px;font-family:'Playfair Display',serif;font-size:1.75rem;line-height:1.05;color:#173122}" +
      ".rd-update-copy{margin:0;color:#466050;line-height:1.7;font-size:.92rem}" +
      ".rd-update-versions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}" +
      ".rd-update-versions div{background:#fffdf8;border:1px solid rgba(23,49,34,.08);border-radius:16px;padding:14px}" +
      ".rd-update-versions strong{display:block;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:#6e786e;margin-bottom:5px}" +
      ".rd-update-versions span{display:block;font-size:.92rem;font-weight:700;color:#173122}" +
      ".rd-update-notes-wrap{margin-top:18px;background:#fffdf8;border:1px solid rgba(23,49,34,.08);border-radius:18px;padding:16px}" +
      ".rd-update-notes-title{font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7b6326;margin-bottom:10px}" +
      ".rd-update-notes{margin:0;padding-left:18px;color:#355241;line-height:1.7;font-size:.9rem}" +
      ".rd-update-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}" +
      ".rd-update-primary,.rd-update-secondary{border:none;border-radius:999px;padding:12px 18px;font-family:'DM Sans',sans-serif;font-size:.85rem;font-weight:700;cursor:pointer}" +
      ".rd-update-primary{background:linear-gradient(135deg,#c9a84c,#e7cb7b);color:#392707}" +
      ".rd-update-secondary{background:#e9e3d5;color:#264635}" +
      ".rd-native-refresh{position:fixed;left:50%;top:14px;transform:translate(-50%,-130%);z-index:9940;pointer-events:none;transition:transform .2s ease,opacity .2s ease;opacity:0}" +
      ".rd-native-refresh .rd-native-refresh-pill{min-width:240px;max-width:90vw;background:rgba(17,39,28,.94);color:#fff;border:1px solid rgba(255,255,255,.12);box-shadow:0 18px 46px rgba(0,0,0,.22);border-radius:18px;padding:12px 16px;text-align:center}" +
      ".rd-native-refresh-title{font-size:.82rem;font-weight:700;letter-spacing:.03em}" +
      ".rd-native-refresh-copy{margin-top:4px;font-size:.72rem;line-height:1.45;color:rgba(255,255,255,.78)}" +
      ".rd-native-refresh.is-peek,.rd-native-refresh.is-hold,.rd-native-refresh.is-loading,.rd-native-refresh.is-done,.rd-native-refresh.is-error{transform:translate(-50%,0);opacity:1}" +
      ".rd-native-refresh.is-hold .rd-native-refresh-pill{background:rgba(122,92,16,.96)}" +
      ".rd-native-refresh.is-loading .rd-native-refresh-pill{background:rgba(34,87,61,.96)}" +
      ".rd-native-refresh.is-done .rd-native-refresh-pill{background:rgba(31,106,58,.96)}" +
      ".rd-native-refresh.is-error .rd-native-refresh-pill{background:rgba(151,47,34,.96)}" +
      "@media (max-width:640px){.rd-update-card{padding:22px 18px 18px}.rd-update-versions{grid-template-columns:1fr}.rd-update-actions>*{flex:1}}";
    document.head.appendChild(style);
  }
})();
