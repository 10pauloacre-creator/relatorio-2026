;(function () {
  var latest = {
  "appName": "Relatórios",
  "appId": "com.relatoriosdiarios.app",
  "versionName": "1.0.9",
  "versionCode": 11,
  "channel": "debug",
  "notes": [
    "Corrige o carregamento dos icones das escolas no app e embute fontes locais para estabilizar a formatacao interna."
  ],
  "fileName": "relatorios-diarios-v1.0.9.apk",
  "sizeBytes": 13469789,
  "sizeLabel": "12.85 MB",
  "sha256": "ce5015379d62a5b0a85b90b67f6be8d3eae31bedaefcfd372959b6347ca2fbe2",
  "releasedAt": "2026-07-17T14:14:00.313Z",
  "releasedAtLabel": "17/07/2026, 09:14",
  "downloadUrl": "https://10pauloacre-creator.github.io/relatorio-2026/downloads/apk/relatorios-diarios-v1.0.9.apk",
  "downloadPath": "./apk/relatorios-diarios-v1.0.9.apk"
};

  function looksBroken(value) {
    return /[\u00C3\u00C2\u00E2\u0192]/.test(String(value || ""));
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

  function decodeBrokenUtf8(value) {
    if (!value || typeof value !== "string" || !looksBroken(value) || typeof TextDecoder === "undefined") {
      return value;
    }

    var current = value;
    for (var attempt = 0; attempt < 4; attempt += 1) {
      if (!looksBroken(current)) break;
      var bytes = cp1252BytesFromString(current);
      if (!bytes) break;
      var next = new TextDecoder("utf-8").decode(new Uint8Array(bytes));
      if (!next || next === current || next.indexOf("\ufffd") !== -1) break;
      current = next;
    }

    return current;
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
      });
    }
  }

  function run() {
    patchNode(document);
    var fixedTitle = decodeBrokenUtf8(document.title);
    if (fixedTitle && fixedTitle !== document.title) {
      document.title = fixedTitle;
    }
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "characterData") {
        patchNode(mutation.target);
        return;
      }

      if (mutation.type === "attributes") {
        patchAttribute(mutation.target, mutation.attributeName);
        return;
      }

      mutation.addedNodes.forEach(function (node) {
        patchNode(node);
      });
    });
  });

  observer.observe(document.documentElement || document, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["title", "placeholder", "aria-label", "alt", "content"]
  });

  window.__RELATORIOS_MOJIBAKE_HOTFIX__ = {
    run: run
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }

  window.addEventListener("load", run, { once: true });
  window.setTimeout(run, 450);
  window.setTimeout(run, 1500);
})();
