;(function () {
  var latest = {
  "appName": "Relatórios",
  "appId": "com.relatoriosdiarios.app",
  "versionName": "1.0.13",
  "versionCode": 15,
  "channel": "debug",
  "notes": [
    "Atualização estrutural do aplicativo."
  ],
  "fileName": "relatorios-diarios-v1.0.13.apk",
  "sizeBytes": 13467467,
  "sizeLabel": "12.84 MB",
  "sha256": "ca234ed6d6adb3c72b76ae378f272888c37279607f60e5907fe3a060041ec6c5",
  "releasedAt": "2026-07-20T18:08:27.164Z",
  "releasedAtLabel": "20/07/2026, 13:08",
  "downloadUrl": "https://10pauloacre-creator.github.io/relatorio-2026/downloads/apk/relatorios-diarios-v1.0.13.apk",
  "downloadPath": "./apk/relatorios-diarios-v1.0.13.apk"
};

  function looksBroken(value) {
    return /[\u00C3\u00C2\u00C5\u00C6\u00E2\u0192\u00F0]/.test(String(value || ""));
  }

  function cp1252BytesFromString(value) {
    var map = {
      0x20ac: 0x80,
      0x201a: 0x82,
      0x0192: 0x83,
      0x201e: 0x84,
      0x2026: 0x85,
      0x2020: 0x86,
      0x2021: 0x87,
      0x02c6: 0x88,
      0x2030: 0x89,
      0x0160: 0x8a,
      0x2039: 0x8b,
      0x0152: 0x8c,
      0x017d: 0x8e,
      0x2018: 0x91,
      0x2019: 0x92,
      0x201c: 0x93,
      0x201d: 0x94,
      0x2022: 0x95,
      0x2013: 0x96,
      0x2014: 0x97,
      0x02dc: 0x98,
      0x2122: 0x99,
      0x0161: 0x9a,
      0x203a: 0x9b,
      0x0153: 0x9c,
      0x017e: 0x9e,
      0x0178: 0x9f
    };
    var bytes = [];

    for (var index = 0; index < value.length; index += 1) {
      var code = value.charCodeAt(index);
      if (code <= 0xff) {
        bytes.push(code);
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(map, code)) {
        bytes.push(map[code]);
        continue;
      }
      return null;
    }

    return bytes;
  }

  function repairCommonGlyphs(value) {
    if (!value || typeof value !== "string") return value;

    var replacements = [
      ["ÃƒÂ°Ã…Â¸Ã…â€™Ã¢â€žÂ¢", "🌙"],
      ["Ã°Å¸Å’â„¢", "🌙"],
      ["ÃƒÂ¢Ã‹Å“Ã¢â€šÂ¬ÃƒÂ¯Ã‚Â¸Ã‚Â", "☀️"],
      ["Ã¢Ëœâ‚¬Ã¯Â¸Â", "☀️"],
      ["ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…ÂŠ", "📊"],
      ["Ã°Å¸â€œÅŠ", "📊"],
      ["ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â¡", "📚"],
      ["Ã°Å¸â€œÅ¡", "📚"],
      ["ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â ", "📆"],
      ["Ã°Å¸â€œâ€ ", "📆"],
      ["ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã¢â‚¬Å¡", "🗂"],
      ["Ã°Å¸â€”â€š", "🗂"],
      ["ÃƒÂ¢Ã‚ÂÃ‚Â±", "⏱"],
      ["Ã¢ÂÂ±", "⏱"],
      ["â†", "←"],
      ["InÃƒÆ’Ã‚Â­cio", "Início"],
      ["InÃƒÂ­cio", "Início"],
      ["InÃ­cio", "Início"],
      ["automÃƒÂ¡tico", "automático"],
      ["automÃ¡tico", "automático"],
      ["NotificaÃƒÂ§ÃƒÂµes", "Notificações"],
      ["NotificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes", "Notificações"],
      ["HorÃƒÂ¡rio", "Horário"],
      ["HorÃƒÆ’Ã‚Â¡rio", "Horário"]
    ];

    var next = value;
    replacements.forEach(function (entry) {
      next = next.split(entry[0]).join(entry[1]);
    });
    return next;
  }

  function decodeBrokenUtf8(value) {
    if (!value || typeof value !== "string" || !looksBroken(value) || typeof TextDecoder === "undefined") {
      return repairCommonGlyphs(value);
    }

    var current = repairCommonGlyphs(value);
    for (var attempt = 0; attempt < 6; attempt += 1) {
      if (!looksBroken(current)) break;
      var bytes = cp1252BytesFromString(current);
      if (!bytes) break;
      var next = new TextDecoder("utf-8").decode(new Uint8Array(bytes));
      if (!next || next === current || next.indexOf("\ufffd") !== -1) break;
      current = repairCommonGlyphs(next);
    }

    return repairCommonGlyphs(current);
  }

  function sanitizeStorageKey(key) {
    if (!key || !window.localStorage) return;
    try {
      var current = localStorage.getItem(key);
      if (current == null) return;
      var parsed = JSON.parse(current);
      var next = sanitizeValue(parsed);
      var nextRaw = JSON.stringify(next);
      if (nextRaw !== current) {
        localStorage.setItem(key, nextRaw);
      }
    } catch (error) {}
  }

  function sanitizeStorageByPrefix(prefix) {
    if (!prefix || !window.localStorage) return;
    try {
      for (var index = 0; index < localStorage.length; index += 1) {
        var key = localStorage.key(index);
        if (key && key.indexOf(prefix) === 0) {
          sanitizeStorageKey(key);
        }
      }
    } catch (error) {}
  }

  function sanitizeKnownStorage() {
    [
      "liv_status",
      "liv_urls",
      "seq_status",
      "rh_liv_status",
      "rh_liv_urls"
    ].forEach(sanitizeStorageKey);

    [
      "cl_livro_",
      "cl_hist_",
      "cl_seq_",
      "cl_seq_hist_"
    ].forEach(sanitizeStorageByPrefix);

    if (window._livStatus) window._livStatus = sanitizeValue(window._livStatus);
    if (window._livUrls) window._livUrls = sanitizeValue(window._livUrls);
    if (window._seqStatus) window._seqStatus = sanitizeValue(window._seqStatus);
    if (window._rhLivStatus) window._rhLivStatus = sanitizeValue(window._rhLivStatus);
    if (window._rhLivUrls) window._rhLivUrls = sanitizeValue(window._rhLivUrls);
  }

  function clearPendingHotfixGuard() {
    try {
      if (typeof window.__RELATORIOS_CLEAR_PENDING__ === "function") {
        window.__RELATORIOS_CLEAR_PENDING__();
        return;
      }
      document.documentElement.removeAttribute("data-hotfix-pending");
      var styleNode = document.getElementById("relatorios-preload-fix");
      if (styleNode && styleNode.parentNode) {
        styleNode.parentNode.removeChild(styleNode);
      }
    } catch (error) {}
  }

  function sanitizeValue(value) {
    if (typeof value === "string") {
      return decodeBrokenUtf8(value);
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (!value || typeof value !== "object") {
      return value;
    }

    var next = {};
    Object.keys(value).forEach(function (key) {
      next[key] = sanitizeValue(value[key]);
    });
    return next;
  }

  latest = sanitizeValue(latest);
  window.__RELATORIOS_APP_LATEST__ = latest;

  if (window.__RELATORIOS_MOJIBAKE_HOTFIX__) {
    window.__RELATORIOS_MOJIBAKE_HOTFIX__.run();
    return;
  }

  var attributeSelectors = [
    "meta[content]",
    "[title]",
    "[placeholder]",
    "[aria-label]",
    "img[alt]"
  ];

  function patchAttribute(node, name) {
    if (!node || typeof node.getAttribute !== "function" || !node.hasAttribute(name)) return;
    var current = node.getAttribute(name);
    var next = decodeBrokenUtf8(current);
    if (next && next !== current) {
      node.setAttribute(name, next);
    }
  }

  function patchNode(root) {
    if (!root) return;

    if (root.nodeType === Node.TEXT_NODE) {
      var currentText = root.nodeValue;
      var nextText = decodeBrokenUtf8(currentText);
      if (nextText && nextText !== currentText) {
        root.nodeValue = nextText;
      }
      return;
    }

    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
      return;
    }

    if (root.nodeType === Node.ELEMENT_NODE) {
      patchAttribute(root, "title");
      patchAttribute(root, "placeholder");
      patchAttribute(root, "aria-label");
      patchAttribute(root, "alt");
      patchAttribute(root, "content");
      patchAttribute(root, "value");
    }

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var textNode = walker.nextNode();
    while (textNode) {
      var originalText = textNode.nodeValue;
      var fixedText = decodeBrokenUtf8(originalText);
      if (fixedText && fixedText !== originalText) {
        textNode.nodeValue = fixedText;
      }
      textNode = walker.nextNode();
    }

    if (typeof root.querySelectorAll === "function") {
      root.querySelectorAll(attributeSelectors.join(",")).forEach(function (element) {
        patchAttribute(element, "title");
        patchAttribute(element, "placeholder");
        patchAttribute(element, "aria-label");
        patchAttribute(element, "alt");
        patchAttribute(element, "content");
        patchAttribute(element, "value");
      });
    }
  }

  function forceText(selector, text, title) {
    if (!selector) return;
    document.querySelectorAll(selector).forEach(function (node) {
      if (!node) return;
      if ("value" in node && /^(INPUT|OPTION)$/i.test(node.tagName || "")) {
        node.value = text;
      } else {
        node.textContent = text;
      }
      if (title) {
        node.setAttribute("title", title);
        node.setAttribute("aria-label", title);
      }
    });
  }

  function forceBookTabLabels() {
    forceText('button[onclick*="livTab(\'t1\'"]', "📚 1ª Série");
    forceText('button[onclick*="livTab(\'t2\'"]', "📚 2ª Série");
    forceText('button[onclick*="livTab(\'t3\'"]', "📚 3ª Série");
    forceText('button[onclick*="seqTab(\'t1\'"]', "📚 1ª Série");
    forceText('button[onclick*="seqTab(\'t2\'"]', "📚 2ª Série");
    forceText('button[onclick*="seqTab(\'t3\'"]', "📚 3ª Série");
    forceText('button[onclick*="rhSeqTab(\'t89\'"]', "📚 8º/9º Ano");
    forceText('button[onclick*="rhSeqTab(\'t1\'"]', "📚 1ª Série");
    forceText('button[onclick*="rhSeqTab(\'t23\'"]', "📚 2ª/3ª Série");
    forceText('button[onclick*="rhLivTab(\'lp\'"]', "📚 Língua Portuguesa");
    forceText('button[onclick*="rhLivTab(\'ing\'"]', "📚 Inglês");
    forceText('button[onclick*="rhLivTab(\'esp\'"]', "📚 Espanhol");
    forceText('button[onclick*="rhLivTab(\'art\'"]', "🎨 Arte");
    forceText('button[onclick*="rhLivTab(\'red\'"]', "✍️ Redação");
  }

  function normalizeBookCards(scopeSelector, iconMap) {
    document.querySelectorAll(scopeSelector).forEach(function (card) {
      if (!card) return;
      var state = "";
      if (card.classList.contains("concluido")) state = "concluido";
      else if (card.classList.contains("criando")) state = "criando";

      var iconNode = card.querySelector(".liv-card-ic");
      if (iconNode) {
        iconNode.textContent = iconMap[state] || iconMap[""] || "";
      }

      var titleNode = card.querySelector(".liv-card-nm");
      if (titleNode) {
        var fixedTitle = decodeBrokenUtf8(titleNode.textContent);
        if (fixedTitle && fixedTitle !== titleNode.textContent) {
          titleNode.textContent = fixedTitle;
        }
      }

      var bimNode = card.querySelector(".liv-card-bim");
      if (bimNode) {
        var fixedBim = decodeBrokenUtf8(bimNode.textContent);
        if (fixedBim && fixedBim !== bimNode.textContent) {
          bimNode.textContent = fixedBim;
        }
      }
    });
  }

  function normalizeRenderedBookSections() {
    forceBookTabLabels();
    normalizeBookCards("#sec-livros .liv-card", {
      "": "📘",
      criando: "📕",
      concluido: "📗"
    });
    normalizeBookCards("#sec-sequencias .liv-card", {
      "": "🗂",
      criando: "📝",
      concluido: "✅"
    });
  }

  function enforceKnownLabels() {
    forceText('a[href="index.html"]', "← Início");
    forceText('a.crumbs[href="casavequia.html"]', "← Voltar para Pe. Carlos Casavequia");
    forceText('a.crumbs[href="herminio.html"]', "← Voltar para o relatório da escola");
    forceText("#modo-claro-btn", "☀️", "Modo Claro");
    forceText("#modo-escuro-btn", "🌙", "Modo Escuro");
    forceText('button[onclick*="plano"]', "📚 Plano Anual");
    forceText('button[onclick*="cont"]', "📊 Contador");
    forceText('button[onclick*="claude"]', "⏱ Claude");
    forceText('button[onclick*="livros"]', "📚 Livros");
    forceText('button[onclick*="sequencias"]', "🗂 Sequências");
    forceText('button[onclick*="cal"]', "📆 Calendário");
    forceBookTabLabels();
  }

  var hasFullPatchRun = false;
  var observer = null;
  var observerStopTimer = 0;

  function run(options) {
    options = options || {};
    sanitizeKnownStorage();
    if (options.full && !hasFullPatchRun) {
      patchNode(document.body || document.documentElement || document);
      hasFullPatchRun = true;
    }
    var fixedTitle = decodeBrokenUtf8(document.title);
    if (fixedTitle && fixedTitle !== document.title) {
      document.title = fixedTitle;
    }
    enforceKnownLabels();
    normalizeRenderedBookSections();
    clearPendingHotfixGuard();
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (observerStopTimer) {
      window.clearTimeout(observerStopTimer);
      observerStopTimer = 0;
    }
  }

  function startObserver() {
    if (observer || typeof MutationObserver === "undefined") return;

    observer = new MutationObserver(function (mutations) {
      var processed = 0;
      mutations.forEach(function (mutation) {
        if (mutation.type !== "childList" || !mutation.addedNodes || processed >= 12) return;

        mutation.addedNodes.forEach(function (node) {
          if (!node || processed >= 12 || node.nodeType === Node.TEXT_NODE) return;
          patchNode(node);
          processed += 1;
        });
      });

      if (processed > 0) {
        enforceKnownLabels();
        normalizeRenderedBookSections();
        clearPendingHotfixGuard();
      }
    });

    observer.observe(document.body || document.documentElement || document, {
      subtree: true,
      childList: true
    });

    observerStopTimer = window.setTimeout(stopObserver, 5000);
  }

  window.__RELATORIOS_MOJIBAKE_HOTFIX__ = {
    run: function () {
      run({ full: false });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      run({ full: true });
      startObserver();
    }, { once: true });
  } else {
    run({ full: true });
    startObserver();
  }

  window.addEventListener("load", function () {
    run({ full: false });
  }, { once: true });
  window.setTimeout(function () { run({ full: false }); }, 700);
  window.setTimeout(function () {
    run({ full: false });
    stopObserver();
  }, 2200);
})();
