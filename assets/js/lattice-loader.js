// ═══════════════════════════════════════════════════════════════════════
// lattice-loader.js — LatticeLoader do React Bits (variante JS-CSS),
// portado para JavaScript puro (26/09/2026). O site não usa React.
// Fonte: https://reactbits.dev/micro/lattice-loader (sem dependências).
//
// As opções são as mesmas props do componente original:
//   label, doneLabel, errorLabel, status ('working'|'done'|'error'),
//   pattern ('orbit', 'arrow', 'dots', 'ripple', 'spiral', 'snake', 'sweep',
//   'spin', 'rain', 'pulse' ou {cells, loop, scale, lit}), grid (3|4), shape,
//   color, doneColor, errorColor, cellSize, gap, fontSize, step, idleOpacity,
//   glow, glowColor, showTimer, elapsed (segundos, relógio parado),
//   className, style ({"--var": valor}).
// Extensão: fluid (a frase corta com reticências e a largura muda suave).
//
//   var l = LatticeLoader.criar({ label: "Pensando", fluid: true });
//   caixa.appendChild(l.el);
//   l.rotulo("Lendo o relato");        // troca a frase com esmaecer
//   l.status("done");                  // "Concluído em 4,2s"
//   LatticeLoader.html({ status: "done", elapsed: 4.2 })  // versão parada
//
// O CSS (assets/css/lattice-loader.css) é carregado sozinho, pelo mesmo
// caminho deste arquivo.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var PATTERNS = {
    arrow: { 3: { cells: [1, 2, 3, 0, 1, 2, 1, 2, 3], loop: 7.2, scale: 1 } },
    dots: { 3: { cells: [0, 1, 2, 0, 1, 2, 0, 1, 2], loop: 3, scale: 2.4 } },
    ripple: { 3: { cells: [2, 1, 2, 1, 0, 1, 2, 1, 2], loop: 4.8, scale: 1.5 } },
    spiral: { 3: { cells: [0, 1, 2, 7, 8, 3, 6, 5, 4], loop: 9, scale: 1.2, lit: 0.35 } },
    orbit: {
      3: { cells: [0, 1, 2, 7, null, 3, 6, 5, 4], loop: 8, scale: 1.2 },
      4: { cells: [0, 1, 2, 3, 11, null, null, 4, 10, null, null, 5, 9, 8, 7, 6], loop: 6, scale: 1.2, lit: 0.45 }
    },
    snake: {
      3: { cells: [0, 1, 2, 5, 4, 3, 6, 7, 8], loop: 9, scale: 1, lit: 0.35 },
      4: { cells: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12], loop: 16, scale: 1, lit: 0.25 }
    },
    sweep: { 4: { cells: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6], loop: 5, scale: 1, lit: 0.45 } },
    spin: { 4: { cells: [0, 0, 1, 1, 0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 2, 2], loop: 4, scale: 1.6, lit: 0.35 } },
    rain: { 4: { cells: [0, 2, 1, 3, 1, 3, 2, 4, 2, 4, 3, 5, 3, 5, 4, 6], loop: 4, scale: 1.2, lit: 0.35 } },
    pulse: { 4: { cells: [2, 1, 1, 2, 1, 0, 0, 1, 1, 0, 0, 1, 2, 1, 1, 2], loop: 2.4, scale: 2.5, lit: 0.45 } }
  };
  var DEFAULT_PATTERN = { 3: "orbit", 4: "sweep" };
  // Marcas do fim: ✓ (concluído) e ✕ (falhou), por índice da grade.
  var MARKS = {
    3: { done: [2, 3, 5, 7], error: [0, 2, 4, 6, 8] },
    4: { done: [7, 8, 10, 13], error: [0, 3, 5, 6, 9, 10, 12, 15] }
  };
  var PADRAO = {
    label: "Pensando", doneLabel: "Concluído em", errorLabel: "Falhou após", status: "working",
    pattern: "orbit", grid: 3, shape: "round", color: "currentColor", doneColor: "#22c55e", errorColor: "#ef4444",
    cellSize: 6, gap: 2, fontSize: 14, step: 90, idleOpacity: 0.15, glow: false, glowColor: "",
    showTimer: true, elapsed: null, className: "", style: null, fluid: false
  };

  function resolvePattern(pattern, grid) {
    if (typeof pattern === "string") {
      var named = PATTERNS[pattern];
      return (named && named[grid]) || PATTERNS[DEFAULT_PATTERN[grid]][grid];
    }
    var cells = [];
    for (var i = 0; i < grid * grid; i++) cells.push(pattern.cells[i] == null ? null : pattern.cells[i]);
    var max = Math.max.apply(null, [0].concat(cells.filter(function (v) { return v != null; })));
    return { cells: cells, loop: pattern.loop == null ? max + 4.2 : pattern.loop, scale: pattern.scale == null ? 1 : pattern.scale, lit: pattern.lit == null ? 0.62 : pattern.lit };
  }
  // Décimos de segundo → "4,2s" / "1min 3,4s" (e a versão falada).
  function dec(v) { return (v / 10).toFixed(1).replace(".", ","); }
  function fmt(ds) { return ds < 600 ? dec(ds) + "s" : Math.floor(ds / 600) + "min " + dec(ds % 600) + "s"; }
  function spoken(ds) { return ds < 600 ? dec(ds) + " segundos" : Math.floor(ds / 600) + " minutos e " + dec(ds % 600) + " segundos"; }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function opcoes(o) { var r = {}; for (var k in PADRAO) r[k] = o && o[k] !== undefined ? o[k] : PADRAO[k]; return r; }

  function calc(o) {
    var n = o.grid === 4 ? 4 : 3;
    var pat = resolvePattern(o.pattern, n);
    var d = o.step * pat.scale;
    return { n: n, pat: pat, marks: MARKS[n], d: d, cycle: Math.round(pat.loop * d) };
  }
  function estilo(o, c, status) {
    var s = {
      "--ll-n": c.n, "--ll-cell": o.cellSize + "px", "--ll-gap": o.gap + "px", "--ll-font": o.fontSize + "px",
      "--ll-color": o.color, "--ll-mark": status === "error" ? o.errorColor : o.doneColor, "--ll-idle": o.idleOpacity,
      "--ll-glow": o.glowColor || o.color, "--ll-mark-glow": o.glowColor || (status === "error" ? o.errorColor : o.doneColor),
      "--ll-cycle": c.cycle + "ms"
    };
    if (o.style) for (var k in o.style) s[k] = o.style[k];
    return Object.keys(s).map(function (k) { return k + ":" + s[k]; }).join(";");
  }
  function marcaDe(status, marcaAnterior) { return status === "working" ? (marcaAnterior || "done") : status; }

  // HTML completo. "ds" = décimos já decorridos (relógio). "parado": só a
  // frase do estado atual (a versão viva precisa das três para trocar).
  function montar(o, ds, marca, anuncio, parado) {
    var c = calc(o), lit = c.pat.lit && c.pat.lit !== 0.62 ? ' data-lit="' + Math.round(c.pat.lit * 100) + '"' : "";
    var run = c.pat.cells.map(function (u) {
      return '<span class="lattice-loader__cell"' + (u == null ? " data-hole" : "") + lit + (u == null ? "" : ' style="animation-delay:calc(' + Math.round(u * c.d) + 'ms * var(--ll-lento, 1))"') + "></span>";
    }).join("");
    var marks = c.pat.cells.map(function (x, i) { return '<span class="lattice-loader__cell"' + (c.marks[marca].indexOf(i) >= 0 ? " data-on" : "") + "></span>"; }).join("");
    var ativo = function (s) { return o.status === s ? " data-active" : ""; };
    var texto = function (k, s, v) { return parado && o.status !== s ? "" : '<span class="lattice-loader__text" data-k="' + k + '"' + ativo(s) + ">" + esc(v) + "</span>"; };
    return '<span role="status" class="lattice-loader' + (o.className ? " " + esc(o.className) : "") + '" data-status="' + o.status + '" data-shape="' + esc(o.shape) + '"' +
      (o.glow ? " data-glow" : "") + (o.fluid ? " data-fluid" : "") + ' style="' + esc(estilo(o, c, o.status)) + '">' +
      '<span class="lattice-loader__grid" aria-hidden="true"><span class="lattice-loader__layer lattice-loader__run">' + run + "</span>" +
      '<span class="lattice-loader__layer lattice-loader__mark">' + marks + "</span></span>" +
      '<span class="lattice-loader__label" aria-hidden="true">' +
      texto("working", "working", o.label) + (parado ? "" : '<span class="lattice-loader__text" data-k="working2"></span>') +
      texto("done", "done", o.doneLabel) + texto("error", "error", o.errorLabel) + "</span>" +
      (o.showTimer ? '<span class="lattice-loader__timer" aria-hidden="true">' + fmt(ds) + "</span>" : "") +
      '<span class="lattice-loader__sr">' + esc(anuncio) + "</span></span>";
  }
  function anuncioDe(o, ds) {
    if (o.status === "working") return o.label + ", em andamento";
    return (o.status === "done" ? o.doneLabel : o.errorLabel) + (o.showTimer ? " " + spoken(ds) : "");
  }

  // Versão parada (histórico de respostas): sem relógio correndo.
  function html(op) {
    var o = opcoes(op), ds = o.elapsed != null ? Math.round(o.elapsed * 10) : 0;
    return montar(o, ds, marcaDe(o.status), anuncioDe(o, ds), true);
  }

  // Versão viva: relógio de décimos, troca de estado e de frase.
  function criar(op) {
    var o = opcoes(op), ds = o.elapsed != null ? Math.round(o.elapsed * 10) : 0, marca = marcaDe(o.status);
    var tmp = document.createElement("span");
    tmp.innerHTML = montar(o, ds, marca, anuncioDe(o, ds));
    var el = tmp.firstChild;
    var q = function (s) { return el.querySelector(s); };
    var timer = q(".lattice-loader__timer"), sr = q(".lattice-loader__sr"), caixa = q(".lattice-loader__label");
    var txt = { working: q('[data-k="working"]'), working2: q('[data-k="working2"]'), done: q('[data-k="done"]'), error: q('[data-k="error"]') };
    var celulasMarca = el.querySelectorAll(".lattice-loader__mark .lattice-loader__cell");
    var frase = txt.working, reserva = txt.working2, relogio = null, inicio = 0, tLarg = null;

    function paint(v) { ds = v; if (timer) timer.textContent = fmt(v); }
    function ligarRelogio() {
      clearInterval(relogio); relogio = null;
      if (o.elapsed != null) { paint(Math.round(o.elapsed * 10)); return; }
      if (o.status !== "working") return;
      inicio = performance.now(); paint(0);
      relogio = setInterval(function () { paint(Math.floor((performance.now() - inicio) / 100)); }, 100);
    }
    function ativos() {
      [frase, txt.done, txt.error].forEach(function (s) { s.removeAttribute("data-active"); });
      reserva.removeAttribute("data-active");
      (o.status === "working" ? frase : txt[o.status]).setAttribute("data-active", "");
    }
    // A largura da frase muda suave: mede antes e depois da troca.
    function comLargura(troca) {
      if (!o.fluid || !el.isConnected) return troca();
      var w0 = caixa.getBoundingClientRect().width;
      caixa.style.width = "";
      troca();
      var w1 = caixa.getBoundingClientRect().width;
      caixa.style.width = w0 + "px";
      void caixa.offsetWidth;
      caixa.style.width = w1 + "px";
      clearTimeout(tLarg);
      tLarg = setTimeout(function () { caixa.style.width = ""; }, 300);
    }

    var api = {
      el: el,
      status: function (s) {
        if (s === o.status) return api;
        o.status = s;
        marca = marcaDe(s, marca);
        el.setAttribute("data-status", s);
        el.style.setProperty("--ll-mark", s === "error" ? o.errorColor : o.doneColor);
        el.style.setProperty("--ll-mark-glow", o.glowColor || (s === "error" ? o.errorColor : o.doneColor));
        var on = MARKS[calc(o).n][marca];
        Array.prototype.forEach.call(celulasMarca, function (c, i) { if (on.indexOf(i) >= 0) c.setAttribute("data-on", ""); else c.removeAttribute("data-on"); });
        if (s === "working") ligarRelogio(); else { clearInterval(relogio); relogio = null; if (o.elapsed == null && inicio) paint(Math.floor((performance.now() - inicio) / 100)); }
        comLargura(ativos);
        sr.textContent = anuncioDe(o, ds);
        return api;
      },
      // Troca a frase do estado "working" (entra de baixo, sai para cima).
      rotulo: function (texto) {
        texto = String(texto == null ? "" : texto);
        if (texto === frase.textContent) return api;
        o.label = texto;
        if (o.status !== "working") { frase.textContent = texto; return api; }
        reserva.style.transition = "none";
        reserva.removeAttribute("data-saindo");
        reserva.textContent = texto;
        void reserva.offsetWidth;
        reserva.style.transition = "";
        var sai = frase;
        comLargura(function () {
          sai.removeAttribute("data-active");
          sai.setAttribute("data-saindo", "");
          reserva.setAttribute("data-active", "");
        });
        frase = reserva; reserva = sai;
        return api;
      },
      elapsed: function (seg) { o.elapsed = seg; ligarRelogio(); return api; },
      segundos: function () { return ds / 10; },
      tempo: function () { return fmt(ds); },
      destruir: function () { clearInterval(relogio); clearTimeout(tLarg); relogio = null; if (el.parentNode) el.parentNode.removeChild(el); }
    };
    ligarRelogio();
    return api;
  }

  // CSS pelo mesmo caminho deste arquivo (…/js/lattice-loader.js → …/css/lattice-loader.css).
  (function carregarCss() {
    if (document.querySelector("link[data-lattice-loader]")) return;
    var src = (document.currentScript && document.currentScript.src) || "";
    var href = src ? src.replace(/\/js\/lattice-loader\.js/, "/css/lattice-loader.css") : "assets/css/lattice-loader.css";
    var l = document.createElement("link");
    l.rel = "stylesheet"; l.href = href; l.setAttribute("data-lattice-loader", "");
    document.head.appendChild(l);
  })();

  window.LatticeLoader = { criar: criar, html: html, formatar: fmt, falado: spoken, PATTERNS: PATTERNS };
})();
