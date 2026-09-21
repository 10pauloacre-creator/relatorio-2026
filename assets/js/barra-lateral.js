// Barra lateral de ferramentas (layout global, 21/09/2026).
//
// Na aba de cima (.nav-w .nav-i) ficam só a visão geral e as turmas (ou os
// alunos, no AEE). Os botões das ferramentas (plano, calendário, contador,
// livros, sequências, I.A, configurações, editar…) são MOVIDOS para uma barra
// no lado esquerdo — os mesmos elementos, então cliques e a marcação .on de
// aba() continuam valendo. O editor de layout só grava o <main>, e a barra
// fica fora dele (data-runtime-ui).
//
// Desktop: aparece por padrão; o professor pode recolher (fica gravado em
// localStorage "rs-lateral"). Celular (≤ 900 px): vira gaveta, fechada.
(function () {
  "use strict";
  if (window.__RS_BARRA_LATERAL__) return;
  window.__RS_BARRA_LATERAL__ = true;

  var CHAVE = "rs-lateral";
  var LARGURA = 228;
  // Alvos de aba que são ferramentas (com e sem o prefixo "sec-").
  var FERRAMENTAS = ["plano", "cal", "cont", "livros", "sequencias", "seq", "ia", "config", "cron", "claude", "jogos", "novo"];

  var CSS = ""
    + "html.rs-com-lateral{--rs-w:" + LARGURA + "px}"
    + ".rs-lateral{position:fixed;top:0;left:0;bottom:0;width:var(--rs-w);z-index:1001;display:flex;flex-direction:column;"
    + "background:var(--vd,#1a3a2a);color:#fff;border-right:3px solid var(--ou,#c9a84c);padding:62px 10px 16px;overflow-y:auto;"
    + "transform:translateX(0);transition:transform .22s ease;font-family:'DM Sans',sans-serif;box-sizing:border-box}"
    + ".rs-lateral-cab{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 6px 10px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,.14)}"
    + ".rs-lateral-cab span{font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.55)}"
    + ".rs-lateral-x{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font-size:.95rem;line-height:1}"
    + ".rs-lateral-x:hover{background:rgba(255,255,255,.16)}"
    + ".rs-lateral-lista{display:flex;flex-direction:column;gap:2px}"
    + ".rs-lateral .nb{display:flex!important;align-items:center;gap:8px;width:100%;text-align:left;padding:10px 12px!important;margin:0!important;border-radius:10px!important;"
    + "font-size:.86rem!important;white-space:normal;color:rgba(255,255,255,.72)!important;background:transparent!important;border:1px solid transparent!important;flex-shrink:0}"
    + ".rs-lateral .nb:hover{background:rgba(255,255,255,.08)!important;color:#fff!important}"
    + ".rs-lateral .nb.on{background:rgba(255,255,255,.12)!important;color:#fff!important;border-color:rgba(255,255,255,.18)!important;box-shadow:inset 3px 0 0 var(--ou,#c9a84c)}"
    + ".rs-lateral .nb::after{display:none!important}"
    + ".rs-lateral .nb[id^=btn-editar]{margin-top:10px!important;border-color:rgba(74,148,103,.45)!important;color:#9fe3bb!important;background:rgba(74,148,103,.14)!important}"
    + ".rs-lateral-abrir{position:fixed;left:12px;top:58px;z-index:1002;display:none;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;"
    + "border:1px solid rgba(255,255,255,.25);background:var(--vd,#1a3a2a);color:#fff;font:600 .8rem 'DM Sans',sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.25)}"
    + ".rs-lateral-fundo{display:none}"
    + "@media(min-width:901px){"
    + "html.rs-com-lateral.rs-aberta body{padding-left:var(--rs-w)}"
    + "html.rs-com-lateral.rs-aberta #rel-banco-status{left:calc(var(--rs-w) + 12px)!important}"
    + "html.rs-com-lateral:not(.rs-aberta) .rs-lateral{transform:translateX(-105%)}"
    + "html.rs-com-lateral:not(.rs-aberta) .rs-lateral-abrir{display:inline-flex}"
    + "}"
    + "@media(max-width:900px){"
    + ".rs-lateral{transform:translateX(-105%);box-shadow:8px 0 30px rgba(0,0,0,.35);padding-top:18px}"
    + "html.rs-gaveta .rs-lateral{transform:translateX(0)}"
    + "html.rs-com-lateral .rs-lateral-abrir{display:inline-flex;top:auto;bottom:18px;left:14px}"
    + "html.rs-gaveta .rs-lateral-abrir{display:none}"
    + "html.rs-com-lateral #rel-banco-status{bottom:66px!important}"
    + "html.rs-gaveta .rs-lateral-fundo{display:block;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.45)}"
    + "}"
    + "html.dark-2026 .rs-lateral{background:#15181b!important;border-right-color:#383d43!important}"
    + "html.dark-2026 .rs-lateral .nb.on{box-shadow:inset 3px 0 0 #ffa65b;color:#ffb46f!important}"
    + "html.dark-2026 .rs-lateral-abrir{background:#202327;border-color:#383d43}"
    + "@media print{.rs-lateral,.rs-lateral-abrir,.rs-lateral-fundo{display:none!important}html.rs-com-lateral body{padding-left:0!important}}";

  var nav = null, barra = null, lista = null, abrirBtn = null, fundo = null, observador = null;

  function lerEstado() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function gravarEstado(v) { try { localStorage.setItem(CHAVE, v); } catch (e) {} }
  function celular() { return window.matchMedia && window.matchMedia("(max-width:900px)").matches; }

  function alvoDe(b) {
    var a = b.getAttribute("data-aba");
    if (!a) {
      var m = /aba\(\s*['"]([^'"]+)['"]/.exec(b.getAttribute("onclick") || "");
      a = m ? m[1] : "";
    }
    return a.replace(/^sec-/, "");
  }
  function ehFerramenta(b) {
    if (/^btn-editar/.test(b.id || "")) return true;
    return FERRAMENTAS.indexOf(alvoDe(b)) >= 0;
  }
  function chaveDe(b) { return b.id || alvoDe(b) || b.textContent.trim(); }

  function montar() {
    if (barra) return;
    var st = document.createElement("style");
    st.id = "rs-lateral-style";
    st.textContent = CSS;
    document.head.appendChild(st);
    barra = document.createElement("aside");
    barra.className = "rs-lateral";
    barra.id = "rs-lateral";
    barra.setAttribute("data-runtime-ui", "barra-lateral");
    barra.setAttribute("aria-label", "Ferramentas");
    barra.innerHTML = '<div class="rs-lateral-cab"><span>Ferramentas</span><button type="button" class="rs-lateral-x" title="Ocultar a barra" aria-label="Ocultar a barra de ferramentas">«</button></div><nav class="rs-lateral-lista"></nav>';
    lista = barra.querySelector(".rs-lateral-lista");
    abrirBtn = document.createElement("button");
    abrirBtn.type = "button";
    abrirBtn.className = "rs-lateral-abrir";
    abrirBtn.setAttribute("data-runtime-ui", "barra-lateral");
    abrirBtn.setAttribute("aria-controls", "rs-lateral");
    abrirBtn.innerHTML = "☰ Ferramentas";
    fundo = document.createElement("div");
    fundo.className = "rs-lateral-fundo";
    fundo.setAttribute("data-runtime-ui", "barra-lateral");
    document.body.appendChild(barra);
    document.body.appendChild(fundo);
    document.body.appendChild(abrirBtn);
    barra.querySelector(".rs-lateral-x").addEventListener("click", function () { alternar(false); });
    abrirBtn.addEventListener("click", function () { alternar(true); });
    fundo.addEventListener("click", function () { alternar(false); });
    // No celular, escolher uma ferramenta fecha a gaveta.
    lista.addEventListener("click", function (e) { if (celular() && e.target.closest(".nb")) alternar(false); });
    document.documentElement.classList.add("rs-com-lateral");
    document.documentElement.classList.toggle("rs-aberta", lerEstado() !== "fechada");
  }

  function alternar(abrir) {
    var html = document.documentElement;
    if (celular()) { html.classList.toggle("rs-gaveta", abrir); return; }
    html.classList.toggle("rs-aberta", abrir);
    gravarEstado(abrir ? "aberta" : "fechada");
  }

  // Tira da aba de cima os divisores (.sp) que ficaram sobrando.
  function limparDivisores() {
    var anterior = null;
    Array.prototype.forEach.call(nav.children, function (el) {
      if (!el.classList.contains("sp")) { if (el.offsetParent !== null || el.classList.contains("nb")) anterior = el; return; }
      var prox = el.nextElementSibling;
      while (prox && prox.classList.contains("sp")) prox = prox.nextElementSibling;
      var sobra = !anterior || anterior.classList.contains("sp") || !prox;
      el.style.display = sobra ? "none" : "";
      if (!sobra) anterior = el;
    });
  }

  function migrar() {
    if (!nav) return;
    var botoes = Array.prototype.filter.call(nav.querySelectorAll(".nb"), ehFerramenta);
    if (!botoes.length && !barra) return;
    montar();
    if (observador) observador.disconnect();
    botoes.forEach(function (b) {
      var k = chaveDe(b);
      // A página redesenhou as abas: o botão novo substitui o antigo.
      Array.prototype.forEach.call(lista.children, function (v) { if (v !== b && v.__rsChave === k) v.remove(); });
      b.__rsChave = k;
      lista.appendChild(b);
    });
    // "Editar" sempre por último.
    Array.prototype.forEach.call(lista.querySelectorAll('.nb[id^="btn-editar"]'), function (b) { lista.appendChild(b); });
    limparDivisores();
    if (observador) observador.observe(nav, { childList: true, subtree: false });
  }

  function iniciar() {
    nav = document.querySelector(".nav-w .nav-i");
    if (!nav) return;
    observador = new MutationObserver(function () { migrar(); });
    migrar();
    observador.observe(nav, { childList: true, subtree: false });
    // Botões acrescentados depois (ex.: I.A das escolas) também migram.
    window.setTimeout(migrar, 800);
    window.setTimeout(migrar, 2500);
    window.addEventListener("resize", function () {
      if (!celular()) document.documentElement.classList.remove("rs-gaveta");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  window.RelatorioBarraLateral = { migrar: migrar, alternar: alternar };
})();
