"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

const defaultFiles = [
  ...fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html") && !entry.name.startsWith("tmp-"))
    .map((entry) => entry.name),
  "assets/app-build.js",
  "assets/js/casavequia-calendar-data.js",
  "assets/js/contador.js",
  "assets/js/cronograma.js",
  "assets/js/data.js",
  "assets/js/herminio-main.js",
  "assets/js/livros-prompts.js",
  "assets/js/plano.js",
  "downloads/index.html",
  "downloads/latest.json",
  "downloads/releases.json"
];

function looksBroken(value) {
  return /[\u00C3\u00C2\u00C5\u00C6\u00E2\u0192\u00F0]/.test(String(value || ""));
}

function cp1252BytesFromString(value) {
  const map = {
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

  const bytes = [];
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
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

  const replacements = [
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
    ["ÃƒÂ°Ã…Â¸Ã¢â‚¬â€œÃ‚Â¶", "▶"],
    ["Ã¢â€“Â¶", "▶"],
    ["ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€", "🔗"],
    ["Ã°Å¸â€â€”", "🔗"],
    ["Ã¢â€ ’", "→"],
    ["â†’", "→"],
    ["\u00E2\u0161\u00A0\uFE0F", "⚠️"],
    ["\u00E2\u0161\u00A0", "⚠"],
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

  let next = value;
  replacements.forEach(([from, to]) => {
    next = next.split(from).join(to);
  });
  return next;
}

function fixContent(value) {
  let current = repairCommonGlyphs(value);
  const tokenPattern = /[^ \t\r\n<>"'`]*[\u00C3\u00C2\u00C5\u00C6\u00E2\u0192\u00F0][^ \t\r\n<>"'`]*/g;

  function fixToken(token) {
    let nextToken = repairCommonGlyphs(token);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (!looksBroken(nextToken)) break;
      const bytes = cp1252BytesFromString(nextToken);
      if (!bytes) break;
      const decoded = new TextDecoder("utf-8").decode(new Uint8Array(bytes));
      if (!decoded || decoded === nextToken || decoded.includes("\uFFFD")) break;
      nextToken = repairCommonGlyphs(decoded);
    }
    return repairCommonGlyphs(nextToken);
  }

  for (let pass = 0; pass < 4; pass += 1) {
    const next = current.replace(tokenPattern, (token) => fixToken(token));
    if (next === current) break;
    current = repairCommonGlyphs(next);
  }

  return repairCommonGlyphs(current);
}

let changedCount = 0;

defaultFiles.forEach((relativeFile) => {
  const filePath = path.join(rootDir, relativeFile);
  if (!fs.existsSync(filePath)) return;

  const source = fs.readFileSync(filePath, "utf8");
  const fixed = fixContent(source);

  if (fixed === source) return;

  fs.writeFileSync(filePath, fixed, "utf8");
  changedCount += 1;
  console.log(`Corrigido: ${relativeFile}`);
});

console.log(`Arquivos alterados: ${changedCount}`);
