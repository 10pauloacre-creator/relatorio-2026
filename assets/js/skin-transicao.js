// ═══════════════════════════════════════════════════════════════════════
// skin-transicao.js — chegada numa escola vinda da tela Escolas (24/09/2026)
//
// Carregado SEM defer no <head> das páginas das escolas: cobre a página antes
// do primeiro desenho com o mesmo fundo do portal (escolas-vivo.js), deixa o
// logo da escola "respirando" enquanto a página carrega e, quando o HTML
// termina de chegar, abre uma íris do centro para fora. Só age quando a
// tela Escolas deixou o aviso "skin-portal" no sessionStorage há menos de
// 9 s — navegação normal não muda nada.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";
  var raw = null;
  try { raw = sessionStorage.getItem("skin-portal"); sessionStorage.removeItem("skin-portal"); } catch (e) { return; }
  if (!raw) return;
  var p = null;
  try { p = JSON.parse(raw); } catch (e) { return; }
  if (!p || Date.now() - (p.t || 0) > 9000) return;
  // Reduzir movimento: sem íris, só um esmaecer.
  var calmo = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  var d = document.documentElement;
  d.classList.add("skin-chegando");
  if (p.img && /^(https?:|data:image\/)/.test(p.img)) d.style.setProperty("--skin-img", 'url("' + p.img.replace(/"/g, "%22") + '")');
  var FUNDO = "radial-gradient(60vmax 60vmax at 50% 44%,rgba(167,181,138,.24),transparent 62%),radial-gradient(circle at 50% 44%,#1b2018,#0D0E0D 72%)";
  var MASCARA = "radial-gradient(circle at 50% 44%,transparent var(--skin-r),#000 calc(var(--skin-r) + 16%))";
  var css =
    "@property --skin-r{syntax:'<percentage>';inherits:false;initial-value:0%}" +
    "html.skin-chegando::after{content:'';position:fixed;inset:0;z-index:2147483600;pointer-events:none;" +
    "background:var(--skin-img,none) 50% 44%/min(36vmin,170px) no-repeat," + FUNDO + ";" +
    "-webkit-mask:" + MASCARA + ";mask:" + MASCARA + ";animation:skinRespira 2.6s ease-in-out infinite}" +
    "html.skin-chegando.skin-pronto::after{animation:" + (calmo ? "skinSome .9s ease forwards" : "skinIris 1.35s cubic-bezier(.22,.61,.36,1) forwards") + "}" +
    "@keyframes skinSome{to{opacity:0}}" +
    "@keyframes skinRespira{0%,100%{background-size:min(36vmin,170px),auto,auto}50%{background-size:min(38vmin,180px),auto,auto}}" +
    "@keyframes skinIris{0%{--skin-r:0%;opacity:1}70%{opacity:1}100%{--skin-r:150%;opacity:0}}" +
    // O conteúdo sobe devagar enquanto a íris abre (só o topo, que é leve).
    (calmo ? "" : "html.skin-chegando.skin-pronto header.cab,html.skin-chegando.skin-pronto .nav-w{animation:skinSobe 1.4s cubic-bezier(.22,1,.36,1) both}") +
    "@keyframes skinSobe{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}";
  var estilo = document.createElement("style");
  estilo.setAttribute("data-runtime-ui", "transicao");
  estilo.textContent = css;
  (document.head || d).appendChild(estilo);

  var feito = false;
  function abrir() {
    if (feito) return; feito = true;
    d.classList.add("skin-pronto");
    setTimeout(function () {
      d.classList.remove("skin-chegando", "skin-pronto");
      d.style.removeProperty("--skin-img");
      if (estilo.parentNode) estilo.parentNode.removeChild(estilo);
    }, 1600);
  }
  // Espera o HTML (as páginas das escolas são grandes) e dá um respiro.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(abrir, 180); });
  else setTimeout(abrir, 180);
  setTimeout(abrir, 5000);
})();
