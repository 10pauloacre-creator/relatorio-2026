// ═══════════════════════════════════════════════════════════════════════
// cabecalho-vivo.js — cabeçalho das páginas das escolas com cores em
// movimento (24/09/2026). Casavequia, Hermínio, Meu Diário e AEE.
//
// Uma camada por baixo do conteúdo do <header class="cab"> (z-index 0;
// o conteúdo já fica em 1–3), com data-runtime-ui (fora do layout salvo):
//   • três luzes grandes que derivam devagar e trocam de tom;
//   • uma grade "tecnológica" que acende em volta do cursor;
//   • um foco de luz que segue o cursor (computador) ou a inclinação do
//     celular (deviceorientation; no iPhone, a permissão é pedida no
//     primeiro toque no cabeçalho);
//   • uma faixa de brilho que passa de tempos em tempos e uma onda a cada toque.
// Cores: modo claro (verde) → dourado, menta e areia; modo escuro (grafite)
// → laranja, sálvia e dourado. Tudo pausa quando o cabeçalho sai da tela
// e, com prefers-reduced-motion, fica mais lento (sem faixa de brilho).
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINO = window.matchMedia && matchMedia("(pointer: fine)").matches;

  var CSS =
    "header.cab>.cv-vivo{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;" +
    "--c1:rgba(245,200,66,.26);--c2:rgba(127,209,168,.24);--c3:rgba(214,203,184,.20);--cg:rgba(255,255,255,.16);--cl:rgba(255,255,255,.22);--cp:rgba(245,200,66,.9);" +
    "animation:cvMatiz 18s ease-in-out infinite}" +
    "html.dark-2026 header.cab>.cv-vivo{--c1:rgba(255,166,91,.17);--c2:rgba(167,181,138,.15);--c3:rgba(214,180,106,.12);--cg:rgba(255,196,150,.11);--cl:rgba(255,190,140,.15);--cp:rgba(255,166,91,.9)}" +
    ".cv-vivo i{position:absolute;display:block}" +
    ".cv-b{border-radius:50%;will-change:transform}" +
    ".cv-b1{left:-12%;top:-70%;width:62%;height:200%;background:radial-gradient(closest-side,var(--c1),transparent);translate:calc(var(--cv-x,0) * -46px) calc(var(--cv-y,0) * -20px);animation:cvDeriva1 21s ease-in-out infinite alternate}" +
    ".cv-b2{right:-16%;top:-50%;width:58%;height:190%;background:radial-gradient(closest-side,var(--c2),transparent);translate:calc(var(--cv-x,0) * 58px) calc(var(--cv-y,0) * 24px);animation:cvDeriva2 26s ease-in-out infinite alternate}" +
    ".cv-b3{left:28%;top:-10%;width:48%;height:170%;background:radial-gradient(closest-side,var(--c3),transparent);translate:calc(var(--cv-x,0) * 28px) calc(var(--cv-y,0) * -30px);animation:cvDeriva3 17s ease-in-out infinite alternate}" +
    "@keyframes cvDeriva1{0%{transform:translate(0,0) scale(1)}50%{transform:translate(22%,14%) scale(1.18)}100%{transform:translate(-4%,24%) scale(.94)}}" +
    "@keyframes cvDeriva2{0%{transform:translate(0,0) scale(1.05)}50%{transform:translate(-26%,18%) scale(.92)}100%{transform:translate(-8%,-10%) scale(1.15)}}" +
    "@keyframes cvDeriva3{0%{transform:translate(0,0) scale(.9)}50%{transform:translate(-18%,-16%) scale(1.12)}100%{transform:translate(20%,10%) scale(1)}}" +
    "@keyframes cvMatiz{0%,100%{filter:hue-rotate(-14deg) saturate(1)}50%{filter:hue-rotate(16deg) saturate(1.15)}}" +
    ".cv-gradew{inset:0;-webkit-mask-image:radial-gradient(240px 170px at var(--cv-px,50%) var(--cv-py,50%),#000 10%,transparent 72%);mask-image:radial-gradient(240px 170px at var(--cv-px,50%) var(--cv-py,50%),#000 10%,transparent 72%);opacity:.22;transition:opacity .6s}" +
    ".cv-grade{inset:-28px;background-image:linear-gradient(var(--cg) 1px,transparent 1px),linear-gradient(90deg,var(--cg) 1px,transparent 1px);background-size:28px 28px;animation:cvGradeAnda 30s linear infinite}" +
    ".cv-vivo.cv-perto .cv-gradew{opacity:1}" +
    "@keyframes cvGradeAnda{to{transform:translate(28px,28px)}}" +
    ".cv-luz{left:0;top:0;width:460px;height:460px;margin:-230px 0 0 -230px;border-radius:50%;background:radial-gradient(closest-side,var(--cl),transparent);" +
    "transform:translate3d(var(--cv-lx,50vw),var(--cv-ly,60px),0);opacity:.35;transition:opacity .6s}" +
    ".cv-vivo.cv-perto .cv-luz{opacity:1}" +
    ".cv-varre{top:-20%;bottom:-20%;left:0;width:26%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.09),transparent);transform:translateX(-160%) skewX(-18deg);animation:cvVarre 12s ease-in-out 2s infinite}" +
    "@keyframes cvVarre{0%,72%{transform:translateX(-160%) skewX(-18deg)}100%{transform:translateX(520%) skewX(-18deg)}}" +
    ".cv-no{width:5px;height:5px;margin:-2.5px;border-radius:50%;background:var(--cp);box-shadow:0 0 10px var(--cp);opacity:0;animation:cvNo 6s ease-in-out infinite}" +
    "@keyframes cvNo{0%,100%{opacity:0;transform:scale(.4)}12%{opacity:.9;transform:scale(1)}40%{opacity:0;transform:scale(.4)}}" +
    ".cv-ping{width:14px;height:14px;margin:-7px;border-radius:50%;border:1.5px solid var(--cp);animation:cvPing 1.4s cubic-bezier(.22,.61,.36,1) forwards}" +
    "@keyframes cvPing{to{transform:scale(18);opacity:0}}" +
    ".cv-vivo.cv-fora,.cv-vivo.cv-fora *{animation-play-state:paused!important}" +
    "@media(prefers-reduced-motion:reduce){.cv-vivo{animation-duration:40s}.cv-b1,.cv-b2,.cv-b3{animation-duration:60s}.cv-grade{animation:none}.cv-varre,.cv-no{display:none}}";

  var cab = null, camada = null, alvo = { x: 0, y: 0, lx: 0, ly: 0 }, atual = { x: 0, y: 0, lx: 0, ly: 0 }, rodando = false, visivel = true, base = null;

  function montar() {
    cab = document.querySelector("header.cab");
    if (!cab || cab.querySelector(":scope>.cv-vivo")) return;
    if (!document.getElementById("cv-vivo-css")) {
      var st = document.createElement("style"); st.id = "cv-vivo-css"; st.setAttribute("data-runtime-ui", "cabecalho"); st.textContent = CSS;
      document.head.appendChild(st);
    }
    camada = document.createElement("div");
    camada.className = "cv-vivo"; camada.setAttribute("aria-hidden", "true"); camada.setAttribute("data-runtime-ui", "cabecalho");
    var nos = "";
    // Pontos de "circuito" que acendem em sequência.
    [[12, 30], [24, 72], [41, 22], [58, 64], [73, 34], [88, 70], [95, 26]].forEach(function (p, i) {
      nos += '<i class="cv-no" style="left:' + p[0] + "%;top:" + p[1] + "%;animation-delay:" + (i * 0.85).toFixed(2) + 's"></i>';
    });
    camada.innerHTML = '<i class="cv-b cv-b1"></i><i class="cv-b cv-b2"></i><i class="cv-b cv-b3"></i><i class="cv-gradew"><i class="cv-grade"></i></i><i class="cv-luz"></i><i class="cv-varre"></i>' + nos;
    cab.insertBefore(camada, cab.firstChild);
    var r = cab.getBoundingClientRect();
    alvo.lx = atual.lx = r.width * 0.7; alvo.ly = atual.ly = r.height * 0.4;
    escrever();

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (ents) {
        visivel = ents[0].isIntersecting;
        camada.classList.toggle("cv-fora", !visivel);
        if (visivel) acordar();
      }).observe(cab);
    }
    // Computador: o cursor em qualquer lugar da página move as luzes; perto
    // do cabeçalho, acende a grade e o foco.
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch" || !visivel) return;
      var rc = cab.getBoundingClientRect();
      alvo.x = limita((e.clientX - rc.left) / rc.width * 2 - 1, -1, 1);
      alvo.y = limita((e.clientY - rc.top) / Math.max(rc.height, 1) * 2 - 1, -1.4, 1.4);
      alvo.lx = e.clientX - rc.left; alvo.ly = e.clientY - rc.top;
      camada.classList.toggle("cv-perto", e.clientY < rc.bottom + 40 && e.clientY > rc.top - 20);
      acordar();
    }, { passive: true });
    document.addEventListener("mouseleave", function () { camada.classList.remove("cv-perto"); });
    // Toque ou clique no cabeçalho: uma onda de luz.
    cab.addEventListener("pointerdown", function (e) {
      var rc = cab.getBoundingClientRect(), p = document.createElement("i");
      p.className = "cv-ping"; p.style.left = (e.clientX - rc.left) + "px"; p.style.top = (e.clientY - rc.top) + "px";
      camada.appendChild(p); setTimeout(function () { p.remove(); }, 1500);
      if (e.pointerType === "touch") {
        alvo.lx = e.clientX - rc.left; alvo.ly = e.clientY - rc.top;
        camada.classList.add("cv-perto"); acordar();
        clearTimeout(cab._cvT); cab._cvT = setTimeout(function () { camada.classList.remove("cv-perto"); }, 1800);
      }
    }, { passive: true });
    // Celular: a inclinação do aparelho move as luzes e o foco.
    if (!FINO && window.DeviceOrientationEvent) {
      var D = window.DeviceOrientationEvent;
      if (typeof D.requestPermission === "function") {
        cab.addEventListener("touchend", function pedir() {
          cab.removeEventListener("touchend", pedir);
          D.requestPermission().then(function (s) { if (s === "granted") window.addEventListener("deviceorientation", aoInclinar); }).catch(function () {});
        });
      } else window.addEventListener("deviceorientation", aoInclinar);
    }
  }
  function aoInclinar(e) {
    if (e.gamma == null || !visivel || !cab) return;
    if (base == null) base = e.beta;
    var rc = cab.getBoundingClientRect();
    alvo.x = limita(e.gamma / 30, -1, 1); alvo.y = limita((e.beta - base) / 30, -1, 1);
    alvo.lx = rc.width * (0.5 + alvo.x * 0.45); alvo.ly = rc.height * (0.5 + alvo.y * 0.45);
    camada.classList.add("cv-perto");
    acordar();
  }
  function limita(v, a, b) { return v < a ? a : v > b ? b : v; }
  function escrever() {
    var s = camada.style;
    s.setProperty("--cv-x", atual.x.toFixed(3)); s.setProperty("--cv-y", atual.y.toFixed(3));
    s.setProperty("--cv-lx", atual.lx.toFixed(1) + "px"); s.setProperty("--cv-ly", atual.ly.toFixed(1) + "px");
    s.setProperty("--cv-px", atual.lx.toFixed(1) + "px"); s.setProperty("--cv-py", atual.ly.toFixed(1) + "px");
  }
  // Suavização com parada: o laço dorme quando chega perto do alvo.
  function acordar() { if (!rodando && camada) { rodando = true; requestAnimationFrame(passo); } }
  function passo() {
    var dx = alvo.x - atual.x, dy = alvo.y - atual.y, dlx = alvo.lx - atual.lx, dly = alvo.ly - atual.ly;
    atual.x += dx * 0.07; atual.y += dy * 0.07; atual.lx += dlx * 0.14; atual.ly += dly * 0.14;
    escrever();
    if (Math.abs(dx) + Math.abs(dy) < 0.002 && Math.abs(dlx) + Math.abs(dly) < 0.5) { rodando = false; return; }
    requestAnimationFrame(passo);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
  // Algumas páginas trocam o cabeçalho depois (barra lateral, modo escuro):
  // confere de novo quando tudo termina de carregar.
  window.addEventListener("load", function () { setTimeout(montar, 400); });
})();
