"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, String(value), "utf8");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function bumpVersion(version, level) {
  const parts = String(version || "1.0.0")
    .split(".")
    .map((item) => parseInt(item, 10) || 0);
  while (parts.length < 3) parts.push(0);
  if (level === "major") {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (level === "minor") {
    parts[1] += 1;
    parts[2] = 0;
  } else {
    parts[2] += 1;
  }
  return parts.join(".");
}

function formatSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function normalizeNotes(rawNotes, fallback) {
  return String(rawNotes || fallback || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readGradleBuildInfo(gradlePath) {
  if (!fs.existsSync(gradlePath)) {
    return { versionName: "1.0.0", versionCode: 1 };
  }

  const source = fs.readFileSync(gradlePath, "utf8");
  const codeMatch = source.match(/versionCode\s+(\d+)/m);
  const nameMatch = source.match(/versionName\s+"([^"]+)"/m);

  return {
    versionCode: codeMatch ? parseInt(codeMatch[1], 10) || 1 : 1,
    versionName: nameMatch ? nameMatch[1] : "1.0.0"
  };
}

function resolveBuildMeta(rootDir, config) {
  const packageJson = readJson(path.join(rootDir, "package.json"), {});
  const prepared = readJson(path.join(rootDir, config.workingVersionFile), null);
  const gradleInfo = readGradleBuildInfo(path.join(rootDir, "android", "app", "build.gradle"));
  const latestJsonUrl = new URL(path.basename(config.latestFile), config.downloadPageUrl).toString();
  const latestScriptUrl = new URL(path.basename(config.latestScriptFile), config.downloadPageUrl).toString();

  return {
    appName: config.appName,
    appId: config.appId,
    channel: String(
      (prepared && prepared.channel) ||
        config.defaultChannel ||
        "debug"
    ),
    versionName:
      (prepared && prepared.versionName) ||
      packageJson.version ||
      gradleInfo.versionName ||
      "1.0.0",
    versionCode:
      (prepared && prepared.versionCode) ||
      gradleInfo.versionCode ||
      1,
    notes:
      (prepared && Array.isArray(prepared.notes) && prepared.notes.length
        ? prepared.notes
        : normalizeNotes("", config.defaultReleaseNotes)),
    downloadPageUrl: config.downloadPageUrl,
    latestJsonUrl,
    latestScriptUrl,
    generatedAt: new Date().toISOString()
  };
}

function renderAppBuildScript(buildMeta) {
  return (
    "window.__RELATORIOS_APP_BUILD__ = " +
    JSON.stringify(buildMeta, null, 2) +
    ";\n"
  );
}

function renderLatestScript(latestEntry) {
  return `;(function () {
  var latest = ${JSON.stringify(latestEntry || null, null, 2)};

  function looksBroken(value) {
    return /[\\u00C3\\u00C2\\u00C5\\u00C6\\u00E2\\u0192\\u00F0]/.test(String(value || ""));
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
      if (!next || next === current || next.indexOf("\\ufffd") !== -1) break;
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
    forceText('button[onclick*="livTab(\\'t1\\'"]', "📚 1ª Série");
    forceText('button[onclick*="livTab(\\'t2\\'"]', "📚 2ª Série");
    forceText('button[onclick*="livTab(\\'t3\\'"]', "📚 3ª Série");
    forceText('button[onclick*="seqTab(\\'t1\\'"]', "📚 1ª Série");
    forceText('button[onclick*="seqTab(\\'t2\\'"]', "📚 2ª Série");
    forceText('button[onclick*="seqTab(\\'t3\\'"]', "📚 3ª Série");
    forceText('button[onclick*="rhSeqTab(\\'t89\\'"]', "📚 8º/9º Ano");
    forceText('button[onclick*="rhSeqTab(\\'t1\\'"]', "📚 1ª Série");
    forceText('button[onclick*="rhSeqTab(\\'t23\\'"]', "📚 2ª/3ª Série");
    forceText('button[onclick*="rhLivTab(\\'lp\\'"]', "📚 Língua Portuguesa");
    forceText('button[onclick*="rhLivTab(\\'ing\\'"]', "📚 Inglês");
    forceText('button[onclick*="rhLivTab(\\'esp\\'"]', "📚 Espanhol");
    forceText('button[onclick*="rhLivTab(\\'art\\'"]', "🎨 Arte");
    forceText('button[onclick*="rhLivTab(\\'red\\'"]', "✍️ Redação");
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

  function run() {
    sanitizeKnownStorage();
    patchNode(document);
    var fixedTitle = decodeBrokenUtf8(document.title);
    if (fixedTitle && fixedTitle !== document.title) {
      document.title = fixedTitle;
    }
    enforceKnownLabels();
    normalizeRenderedBookSections();
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
    attributeFilter: ["title", "placeholder", "aria-label", "alt", "content", "value"]
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
  window.setTimeout(run, 3200);
  window.setTimeout(run, 6500);
})();\n`;
}

function writeAppBuildScript(rootDir, config) {
  const buildMeta = resolveBuildMeta(rootDir, config);
  const scriptPath = path.join(rootDir, config.appBuildScriptFile);
  writeText(scriptPath, renderAppBuildScript(buildMeta));
  return buildMeta;
}

function renderDownloadPage(config, latestEntry, releases) {
  const latestButton = latestEntry
    ? `<a class="primary-btn" href="${latestEntry.downloadPath}">Baixar APK ${escapeHtml(
        latestEntry.versionName
      )}</a>`
    : `<span class="primary-btn disabled">APK ainda não publicado</span>`;

  const latestMeta = latestEntry
    ? `
      <div class="meta-grid">
        <div><strong>Versão</strong><span>${escapeHtml(latestEntry.versionName)}</span></div>
        <div><strong>Build</strong><span>${escapeHtml(String(latestEntry.versionCode))}</span></div>
        <div><strong>Canal</strong><span>${escapeHtml(latestEntry.channel)}</span></div>
        <div><strong>Tamanho</strong><span>${escapeHtml(latestEntry.sizeLabel)}</span></div>
        <div><strong>Publicado em</strong><span>${escapeHtml(latestEntry.releasedAtLabel)}</span></div>
        <div><strong>SHA-256</strong><span class="hash">${escapeHtml(latestEntry.sha256)}</span></div>
      </div>
      <div class="notes">
        <h3>O que mudou</h3>
        <ul>${latestEntry.notes
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}</ul>
      </div>
    `
    : `<p class="empty">A primeira publicação do APK aparecerá aqui assim que a rotina de release for executada.</p>`;

  const releaseCards = releases.length
    ? releases
        .map(
          (entry) => `
          <article class="release-card">
            <div class="release-top">
              <div>
                <h3>${escapeHtml(entry.versionName)}</h3>
                <p>Build ${escapeHtml(String(entry.versionCode))} · ${escapeHtml(
            entry.channel
          )}</p>
              </div>
              <a href="${entry.downloadPath}">Baixar</a>
            </div>
            <div class="release-meta">
              <span>${escapeHtml(entry.releasedAtLabel)}</span>
              <span>${escapeHtml(entry.sizeLabel)}</span>
            </div>
            <ul>${entry.notes
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ul>
          </article>
        `
        )
        .join("")
    : `<p class="empty">Nenhum release publicado ainda.</p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Download do APK · ${escapeHtml(config.appName)}</title>
<meta name="theme-color" content="#0e2417">
<link rel="icon" href="../favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="../favicon-32x32.png">
<link rel="icon" type="image/png" sizes="192x192" href="../icon-192.png">
<style>
:root{
  --bg:#08140d;
  --panel:#102319;
  --panel-2:#173325;
  --line:rgba(255,255,255,.1);
  --text:#f4f8f4;
  --muted:#a9b9ae;
  --accent:#d8b35b;
  --accent-2:#f2d37f;
  --ok:#79d39b;
}
*{box-sizing:border-box}
body{
  margin:0;
  font-family:"Segoe UI",sans-serif;
  background:
    radial-gradient(circle at top right, rgba(216,179,91,.14), transparent 26%),
    linear-gradient(180deg, #0a1610, #08140d 38%, #07110b);
  color:var(--text);
  min-height:100vh;
}
.shell{
  max-width:1080px;
  margin:0 auto;
  padding:32px 20px 56px;
}
.hero{
  display:grid;
  gap:24px;
  grid-template-columns:1.3fr .9fr;
  background:linear-gradient(135deg, rgba(16,35,25,.95), rgba(23,51,37,.92));
  border:1px solid var(--line);
  border-radius:28px;
  padding:28px;
  box-shadow:0 20px 60px rgba(0,0,0,.32);
}
.eyebrow{
  display:inline-flex;
  width:max-content;
  align-items:center;
  gap:8px;
  padding:8px 12px;
  border-radius:999px;
  background:rgba(216,179,91,.12);
  border:1px solid rgba(216,179,91,.22);
  color:var(--accent-2);
  font-size:.78rem;
  text-transform:uppercase;
  letter-spacing:.08em;
  font-weight:700;
}
h1{
  margin:14px 0 10px;
  font-size:clamp(2rem, 4vw, 3.2rem);
  line-height:1.05;
}
.hero p,.side p,.empty,.steps li,.release-card li,.release-meta span,.meta-grid span{
  color:var(--muted);
}
.hero p{
  margin:0;
  line-height:1.7;
  max-width:58ch;
}
.hero-actions{
  display:flex;
  gap:12px;
  flex-wrap:wrap;
  margin-top:22px;
}
.primary-btn,.ghost-btn,.release-top a{
  text-decoration:none;
  border-radius:999px;
  padding:13px 18px;
  font-weight:700;
  display:inline-flex;
  align-items:center;
  justify-content:center;
}
.primary-btn{
  background:linear-gradient(135deg, var(--accent), var(--accent-2));
  color:#2d2208;
}
.primary-btn.disabled{
  background:#314338;
  color:#95aa9a;
  cursor:not-allowed;
}
.ghost-btn{
  border:1px solid var(--line);
  color:var(--text);
}
.side{
  background:rgba(255,255,255,.04);
  border:1px solid var(--line);
  border-radius:22px;
  padding:22px;
}
.side h2,.notes h3,.section h2{
  margin:0 0 14px;
  font-size:1.05rem;
}
.meta-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px;
}
.meta-grid div{
  background:rgba(255,255,255,.04);
  border:1px solid var(--line);
  border-radius:16px;
  padding:14px;
}
.meta-grid strong,.release-top h3{
  display:block;
  margin-bottom:6px;
}
.hash{
  font-family:Consolas,monospace;
  font-size:.8rem;
  word-break:break-all;
}
.section{
  margin-top:28px;
}
.steps{
  margin:0;
  padding-left:18px;
  line-height:1.8;
}
.release-grid{
  display:grid;
  gap:16px;
}
.release-card{
  background:linear-gradient(180deg, rgba(16,35,25,.88), rgba(10,22,16,.96));
  border:1px solid var(--line);
  border-radius:22px;
  padding:20px;
}
.release-top{
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:flex-start;
}
.release-top p{
  margin:4px 0 0;
}
.release-top a{
  background:rgba(121,211,155,.12);
  color:var(--ok);
  border:1px solid rgba(121,211,155,.24);
}
.release-meta{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin:12px 0;
}
.release-card ul,.notes ul{
  margin:0;
  padding-left:18px;
  line-height:1.7;
}
@media (max-width: 860px){
  .hero{grid-template-columns:1fr}
  .meta-grid{grid-template-columns:1fr}
}
</style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div>
        <span class="eyebrow">APK e Atualizações</span>
        <h1>${escapeHtml(config.appName)}</h1>
        <p>Baixe a versão mais recente do aplicativo Android, acompanhe o histórico de publicações e atualize instalando a nova versão por cima da anterior.</p>
        <div class="hero-actions">
          ${latestButton}
          <a class="ghost-btn" href="../index.html">Voltar ao painel inicial</a>
        </div>
      </div>
      <aside class="side">
        <h2>Última versão publicada</h2>
        ${latestMeta}
      </aside>
    </section>

    <section class="section">
      <h2>Como instalar ou atualizar</h2>
      <ol class="steps">
        <li>Baixe o APK mais recente nesta página.</li>
        <li>No celular, permita instalação por fonte confiável se o Android solicitar.</li>
        <li>Abra o arquivo APK e confirme a instalação.</li>
        <li>Para atualizar, instale a nova versão por cima da versão anterior.</li>
      </ol>
    </section>

    <section class="section">
      <h2>Histórico de versões</h2>
      <div class="release-grid">
        ${releaseCards}
      </div>
    </section>
  </main>
</body>
</html>`;
}

module.exports = {
  bumpVersion,
  formatSize,
  normalizeNotes,
  parseArgs,
  readJson,
  readGradleBuildInfo,
  renderDownloadPage,
  renderAppBuildScript,
  renderLatestScript,
  resolveBuildMeta,
  sha256File,
  writeAppBuildScript,
  writeJson,
  writeText
};
