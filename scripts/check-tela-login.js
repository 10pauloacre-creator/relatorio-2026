#!/usr/bin/env node
// Confere a tela de conta (entrar.html) em vários tamanhos de tela, abrindo a
// cópia local num Chrome/Edge sem janela. Falha se a tela ficar presa:
//   - rolagem lateral na trava (os brilhos do fundo não podem vazar);
//   - espaço vazio rolável abaixo do cartão;
//   - campo ou botão coberto por outra camada (ex.: a abertura da marca);
//   - botão "Criar minha conta"/"Entrar" fora de alcance mesmo rolando;
//   - campo que não aceita digitação ou envio sem resposta na tela.
//
// Uso:  node scripts/check-tela-login.js
// Requer puppeteer-core (sem baixar navegador): npm i --no-save puppeteer-core
// Navegador: CHROME_PATH, ou o Chrome/Edge instalado no Windows.
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

let puppeteer;
try {
  puppeteer = require("puppeteer-core");
} catch (e) {
  console.error("Falta o puppeteer-core. Rode: npm i --no-save puppeteer-core");
  process.exit(2);
}

const RAIZ = path.resolve(__dirname, "..");
const NAVEGADORES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean);

// Telas comuns, incluindo notebook com zoom de 125% e celulares.
const TELAS = [
  { nome: "full HD", width: 1903, height: 950 },
  { nome: "full HD com zoom 125%", width: 1522, height: 760 },
  { nome: "notebook 1366", width: 1366, height: 657 },
  { nome: "notebook baixo", width: 1280, height: 560 },
  { nome: "celular", width: 390, height: 844, mobile: true },
  { nome: "celular pequeno", width: 360, height: 640, mobile: true },
  { nome: "celular deitado", width: 740, height: 360, mobile: true }
];

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".webp": "image/webp", ".png": "image/png", ".ico": "image/x-icon", ".svg": "image/svg+xml" };

function servir() {
  return new Promise(function (resolve) {
    const srv = http.createServer(function (req, res) {
      const url = decodeURIComponent(req.url.split("?")[0]);
      const arq = path.join(RAIZ, url === "/" ? "index.html" : url);
      if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(arq)] || "application/octet-stream" });
      fs.createReadStream(arq).pipe(res);
    });
    srv.listen(0, "127.0.0.1", function () { resolve(srv); });
  });
}

async function conferir(browser, base, tela, modo, primeiraVisita) {
  const falhas = [];
  const page = await browser.newPage();
  await page.setViewport({ width: tela.width, height: tela.height, isMobile: !!tela.mobile, hasTouch: !!tela.mobile });
  const errosJs = [];
  page.on("pageerror", function (e) { errosJs.push(e.message); });
  if (!primeiraVisita) {
    await page.evaluateOnNewDocument(function () { try { localStorage.setItem("skin-abertura", "1"); } catch (e) {} });
  }
  await page.goto(base + "/entrar.html" + (modo === "criar" ? "?modo=criar" : ""), { waitUntil: "domcontentloaded" });
  try {
    await page.waitForSelector(".rel-auth-card .rel-auth-submit", { timeout: 20000 });
  } catch (e) {
    falhas.push("a tela de conta não apareceu em 20 s" + (errosJs.length ? " (" + errosJs[0] + ")" : ""));
    await page.close();
    return falhas;
  }
  // Primeira visita: a abertura ainda está na tela e não pode bloquear nada.
  await new Promise(function (r) { setTimeout(r, primeiraVisita ? 400 : 900); });

  const medida = await page.evaluate(function () {
    const gate = document.querySelector(".rel-auth-gate:not(#abertura)");
    const card = gate.querySelector(".rel-auth-card");
    const cs = getComputedStyle(gate);
    return {
      sw: gate.scrollWidth, cw: gate.clientWidth, sh: gate.scrollHeight, ch: gate.clientHeight,
      cardAltura: card.offsetHeight, pad: parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom),
      backdrop: cs.backdropFilter || cs.webkitBackdropFilter || "none"
    };
  });
  // Camada com o atributo hidden que continua na tela (a causa da tela presa de 21/09/2026).
  const fantasmas = await page.evaluate(function () {
    return Array.prototype.filter.call(document.querySelectorAll("[hidden]"), function (el) {
      return getComputedStyle(el).display !== "none";
    }).map(function (el) { return el.tagName + (el.id ? "#" + el.id : "") + "." + el.className; });
  });
  fantasmas.forEach(function (f) { falhas.push("elemento com hidden continua na tela: " + f); });
  if (medida.sw > medida.cw + 1) falhas.push("rolagem lateral de " + (medida.sw - medida.cw) + " px");
  const alturaUtil = Math.max(medida.ch, medida.cardAltura + medida.pad);
  if (medida.sh > alturaUtil + 2) falhas.push("espaço vazio rolável de " + (medida.sh - alturaUtil) + " px abaixo do cartão");
  if (medida.backdrop && medida.backdrop !== "none") falhas.push("backdrop-filter na trava (" + medida.backdrop + ") deixa a tela lenta");

  // Cada controle precisa ficar ao alcance (rolando) e ser o elemento clicável no ponto.
  const alvos = ["#rel-auth-nome", "#rel-auth-email", "#rel-auth-password", ".rel-auth-submit", ".rel-auth-tabs button", ".rel-auth-voltar"];
  for (const sel of alvos) {
    const r = await page.evaluate(function (sel) {
      const el = document.querySelector(".rel-auth-gate:not(#abertura) " + sel);
      if (!el) return { ausente: true };
      el.scrollIntoView({ block: "center" });
      const b = el.getBoundingClientRect();
      const x = b.left + b.width / 2, y = b.top + b.height / 2;
      if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return { fora: true };
      const topo = document.elementFromPoint(x, y);
      return { ok: !!topo && (topo === el || el.contains(topo)), topo: topo ? topo.tagName + (topo.id ? "#" + topo.id : "") + "." + topo.className : "nada" };
    }, sel);
    if (r.ausente) continue;
    if (r.fora) falhas.push(sel + " fica fora da tela mesmo rolando");
    else if (!r.ok) falhas.push(sel + " está coberto por " + r.topo);
  }

  // Digitação e resposta ao envio (sem criar conta: e-mail inválido de propósito).
  await page.click("#rel-auth-email", { clickCount: 3 });
  await page.keyboard.type("nao-e-email");
  const digitado = await page.$eval("#rel-auth-email", function (e) { return e.value; });
  if (digitado !== "nao-e-email") falhas.push("o campo de e-mail não aceitou digitação (" + JSON.stringify(digitado) + ")");
  await page.click(".rel-auth-submit");
  await new Promise(function (r) { setTimeout(r, 200); });
  const aviso = await page.$eval(".rel-auth-gate:not(#abertura) .rel-auth-error", function (e) { return e.textContent.trim(); });
  if (!aviso) falhas.push("o botão de envio não respondeu (nenhum aviso para e-mail inválido)");

  if (errosJs.length) falhas.push("erro de JavaScript: " + errosJs[0]);
  await page.close();
  return falhas;
}

(async function () {
  const exe = NAVEGADORES.find(function (p) { return fs.existsSync(p); });
  if (!exe) { console.error("Nenhum Chrome/Edge encontrado. Defina CHROME_PATH."); process.exit(2); }
  const srv = await servir();
  const base = "http://127.0.0.1:" + srv.address().port;
  const browser = await puppeteer.launch({ executablePath: exe, headless: "new" });
  let total = 0;
  try {
    for (const tela of TELAS) {
      for (const modo of ["entrar", "criar"]) {
        for (const primeira of [false, true]) {
          if (primeira && modo === "criar") continue;
          const f = await conferir(browser, base, tela, modo, primeira);
          const rotulo = tela.nome + " " + tela.width + "x" + tela.height + " · " + modo + (primeira ? " · primeira visita" : "");
          if (f.length) { total += f.length; console.log("✗ " + rotulo); f.forEach(function (x) { console.log("    - " + x); }); }
          else console.log("✓ " + rotulo);
        }
      }
    }
  } finally {
    await browser.close();
    srv.close();
  }
  if (total) { console.error("\nTela de conta com " + total + " problema(s)."); process.exit(1); }
  console.log("\nTela de conta OK em todas as telas.");
})().catch(function (e) { console.error(e); process.exit(1); });
