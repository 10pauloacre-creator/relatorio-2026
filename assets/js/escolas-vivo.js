// ═══════════════════════════════════════════════════════════════════════
// escolas-vivo.js — tela Escolas viva (24/09/2026). Estilo em
// assets/css/escolas-vivo.css. Nada aqui grava dados.
//
//  1. Fundo: aurora lenta (canvas em baixa resolução) + vagalumes que
//     desviam do cursor, seguem a rolagem e explodem em faíscas no clique.
//  2. Cursor (só mouse): ponto + anel elástico que estica com a velocidade,
//     cresce sobre o que é clicável e mostra "abrir" sobre as escolas.
//  3. Cartões: inclinação 3D e brilho seguindo o cursor (no celular, a
//     inclinação do aparelho), revelação na rolagem, flutuação suave.
//  4. Rolagem: título em paralaxe, grade que "balança" com a velocidade,
//     linha de progresso no topo.
//  5. Portal: ao abrir uma escola, um círculo se expande a partir do cartão
//     e leva o logo ao centro; a página da escola continua a animação
//     (assets/js/skin-transicao.js, pela chave "skin-portal" do sessionStorage).
//  6. Som ambiente gerado no navegador (Web Audio, sem arquivo): acordes
//     longos, ondas e sininhos. Começa no primeiro toque (navegadores não
//     deixam som sem gesto); o botão no canto liga/desliga e lembra a escolha
//     (localStorage "skin-som").
// Com prefers-reduced-motion (ex.: Windows com "Efeitos de animação"
// desligados) a página fica CALMA, não parada: fundo e vagalumes mais lentos
// e cursor continuam; saem inclinação, balanço da rolagem, paralaxe e o zoom
// do portal (vira um esmaecer).
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var doc = document.documentElement;
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINO = window.matchMedia && matchMedia("(pointer: fine)").matches;
  var CORES = [[167, 181, 138], [194, 206, 158], [214, 203, 184], [184, 155, 105], [111, 155, 113]];
  var mouse = { x: innerWidth / 2, y: innerHeight * 0.35, nx: 0, ny: 0, dentro: false, vx: 0, vy: 0 };
  var incl = { x: 0, y: 0, tx: 0, ty: 0, base: null, ativo: false };
  var rol = { y: 0, v: 0, alvo: 0 };
  var faiscas = [];

  doc.classList.add("sk-vivo");
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function limita(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ═════════════════════════ 6. SOM AMBIENTE ═════════════════════════
  var Som = (function () {
    var ctx = null, master = null, seco = null, eco = null, filtroPad = null, acordeAtual = null;
    var estado = "parado", timers = [], iAcorde = 0, pausadoAba = false;
    // Cmaj9 → Am9 → Fmaj9 → G6/9: progressão aberta, sem tensão.
    var ACORDES = [[130.81, 196.0, 246.94, 293.66, 329.63], [110.0, 164.81, 246.94, 261.63, 392.0], [87.31, 130.81, 196.0, 220.0, 329.63], [98.0, 146.83, 220.0, 246.94, 293.66]];
    var PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    var VOLUME = 0.62;

    function impulso(seg) {
      var n = Math.floor(ctx.sampleRate * seg), b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.8); }
      return b;
    }
    function ruidoMarrom(seg) {
      var n = Math.floor(ctx.sampleRate * seg), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), ult = 0;
      for (var i = 0; i < n; i++) { ult = (ult + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = ult * 3.2; }
      return b;
    }
    function lfo(param, freq, qt) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq; g.gain.value = qt; o.connect(g); g.connect(param); o.start();
    }
    function montar() {
      master = ctx.createGain(); master.gain.value = 0;
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.05; comp.release.value = 0.6;
      master.connect(comp); comp.connect(ctx.destination);
      seco = ctx.createGain(); seco.gain.value = 1; seco.connect(master);
      var rev = ctx.createConvolver(); rev.buffer = impulso(3.6);
      eco = ctx.createGain(); eco.gain.value = 1; eco.connect(rev);
      var molhado = ctx.createGain(); molhado.gain.value = 0.6; rev.connect(molhado); molhado.connect(master);
      // Pad: filtro que "respira" devagar.
      filtroPad = ctx.createBiquadFilter(); filtroPad.type = "lowpass"; filtroPad.frequency.value = 850; filtroPad.Q.value = 0.5;
      var padG = ctx.createGain(); padG.gain.value = 0.3;
      filtroPad.connect(padG); padG.connect(seco); padG.connect(eco);
      lfo(filtroPad.frequency, 0.025, 320);
      acordeAtual = acorde(ACORDES[0], 6);
      // Ondas do mar ao longe.
      var mar = ctx.createBufferSource(); mar.buffer = ruidoMarrom(12); mar.loop = true;
      var marF = ctx.createBiquadFilter(); marF.type = "lowpass"; marF.frequency.value = 380;
      var marG = ctx.createGain(); marG.gain.value = 0.055;
      lfo(marG.gain, 0.07, 0.045);
      mar.connect(marF); marF.connect(marG); marG.connect(seco); marG.connect(eco);
      mar.start();
    }
    // Um acorde = duas vozes por nota (seno + triângulo levemente desafinados),
    // cada uma com o próprio "respirar" de volume.
    function acorde(freqs, entrada) {
      var t = ctx.currentTime, oscs = [], ganhos = [];
      freqs.forEach(function (f, i) {
        var g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.085 / (1 + i * 0.22), t + entrada);
        [["sine", -4], ["triangle", 5]].forEach(function (tp) {
          var o = ctx.createOscillator(); o.type = tp[0]; o.frequency.value = f; o.detune.value = tp[1];
          o.connect(g); o.start(t); oscs.push(o);
        });
        var trem = ctx.createGain(); trem.gain.value = 1; g.connect(trem); trem.connect(filtroPad);
        lfo(trem.gain, 0.05 + i * 0.017, 0.28);
        ganhos.push(g);
      });
      return {
        parar: function (saida) {
          var t2 = ctx.currentTime;
          ganhos.forEach(function (g) { g.gain.cancelScheduledValues(t2); g.gain.setValueAtTime(g.gain.value, t2); g.gain.linearRampToValueAtTime(0, t2 + saida); });
          oscs.forEach(function (o) { try { o.stop(t2 + saida + 0.1); } catch (e) {} });
        }
      };
    }
    function trocarAcorde() {
      if (estado !== "tocando") return;
      iAcorde = (iAcorde + 1) % ACORDES.length;
      var velho = acordeAtual;
      acordeAtual = acorde(ACORDES[iAcorde], 7);
      if (velho) velho.parar(7);
      timers.push(setTimeout(trocarAcorde, 16000));
    }
    function sininho() {
      if (estado !== "tocando") return;
      nota(PENTA[Math.floor(Math.random() * PENTA.length)], 0.035 + Math.random() * 0.02, 4.5, 0.25);
      timers.push(setTimeout(sininho, 4500 + Math.random() * 6500));
    }
    // Uma nota de sino (seno + harmônico), quase toda no eco.
    function nota(f, vol, dur, secoQt) {
      if (!ctx || estado !== "tocando") return;
      var t = ctx.currentTime, g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      var o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = f;
      var o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = f * 2.005;
      var g2 = ctx.createGain(); g2.gain.value = 0.22;
      o1.connect(g); o2.connect(g2); g2.connect(g);
      var s = ctx.createGain(); s.gain.value = secoQt == null ? 0.35 : secoQt;
      g.connect(s); s.connect(seco); g.connect(eco);
      o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
    }
    function iniciar() {
      if (estado === "tocando") return true;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        if (!ctx) { ctx = new AC(); montar(); }
        var r = ctx.resume(); if (r && r.then) r.then(avisar, function () {});
      } catch (e) { return false; }
      estado = "tocando";
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(VOLUME, t + 5);
      timers.push(setTimeout(trocarAcorde, 16000), setTimeout(sininho, 2500));
      return true;
    }
    function parar(seg) {
      if (!ctx || estado !== "tocando") return;
      estado = "parado";
      timers.forEach(clearTimeout); timers = [];
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + (seg || 1.2));
      setTimeout(function () { if (estado !== "tocando" && ctx) ctx.suspend(); }, (seg || 1.2) * 1000 + 200);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && estado === "tocando") { pausadoAba = true; parar(0.6); }
      else if (!document.hidden && pausadoAba) { pausadoAba = false; iniciar(); }
    });
    var aoMudar = null;
    function avisar() { if (aoMudar) aoMudar(); }
    return {
      iniciar: iniciar, parar: parar,
      aoMudar: function (f) { aoMudar = f; },
      // Tocando de verdade: o navegador só libera o áudio depois de um gesto.
      tocando: function () { return estado === "tocando" && !!ctx && ctx.state === "running"; },
      pedido: function () { return estado === "tocando"; },
      garantir: function () { if (estado === "tocando" && ctx && ctx.state !== "running") { try { ctx.resume().then(avisar, function () {}); } catch (e) {} } },
      toque: function () { nota(PENTA[Math.floor(Math.random() * 5)], 0.028, 2.4, 0.4); },
      // Abertura de escola: arpejo subindo e o filtro do pad se abrindo.
      portal: function () {
        if (estado !== "tocando") return;
        [0, 2, 4, 7].forEach(function (k, i) { setTimeout(function () { nota(PENTA[k], 0.045, 3.2, 0.5); }, i * 110); });
        var t = ctx.currentTime; filtroPad.frequency.cancelScheduledValues(t); filtroPad.frequency.setValueAtTime(filtroPad.frequency.value, t); filtroPad.frequency.linearRampToValueAtTime(2600, t + 0.9);
      }
    };
  })();

  // Botão do som (canto inferior esquerdo).
  var botaoSom = document.createElement("button");
  botaoSom.type = "button"; botaoSom.className = "sk-som"; botaoSom.setAttribute("data-runtime-ui", "som");
  botaoSom.innerHTML = '<span class="sk-barras" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="sk-som-tx"></span>';
  function prefSom() { return lsGet("skin-som") !== "off"; }
  function mostrarSom() {
    var tocando = Som.tocando(), liga = prefSom();
    botaoSom.classList.toggle("tocando", tocando);
    botaoSom.classList.toggle("mudo", !liga);
    botaoSom.classList.toggle("espera", liga && !tocando);
    botaoSom.setAttribute("aria-pressed", tocando ? "true" : "false");
    botaoSom.querySelector(".sk-som-tx").textContent = tocando ? "Som ambiente" : liga ? "Toque para ouvir o som relaxante" : "Som desligado";
    botaoSom.title = tocando ? "Desligar o som ambiente" : "Ligar o som ambiente";
  }
  Som.aoMudar(mostrarSom);
  botaoSom.addEventListener("click", function () {
    pedirInclinacao();
    if (Som.pedido()) { Som.parar(); lsSet("skin-som", "off"); }
    else { lsSet("skin-som", "on"); Som.iniciar(); }
    setTimeout(mostrarSom, 30); mostrarSom();
  });
  // Primeiro gesto na página: o som começa (se o professor não desligou).
  // No celular só "touchend"/"click" liberam o áudio, então os ouvintes
  // ficam até o som estar tocando de verdade.
  var GESTOS = ["pointerdown", "touchend", "click", "keydown"];
  function primeiroGesto(e) {
    if (e.target && e.target.closest && e.target.closest(".sk-som")) return;
    if (!prefSom()) return;
    if (Som.pedido()) Som.garantir(); else Som.iniciar();
    mostrarSom();
    if (Som.tocando()) GESTOS.forEach(function (g) { window.removeEventListener(g, primeiroGesto, true); });
  }
  GESTOS.forEach(function (g) { window.addEventListener(g, primeiroGesto, true); });

  // ═════════════════════════ 1. FUNDO ═════════════════════════
  var aurora = document.createElement("canvas"), vaga = document.createElement("canvas"), vinheta = document.createElement("div"), prog = document.createElement("div");
  aurora.className = "sk-aurora"; vaga.className = "sk-vaga"; vinheta.className = "sk-vinheta"; prog.className = "sk-prog";
  [aurora, vaga, vinheta, prog].forEach(function (el) { el.setAttribute("aria-hidden", "true"); el.setAttribute("data-runtime-ui", "fundo"); });
  var ca = aurora.getContext("2d"), cv = vaga.getContext("2d");
  var W = 0, H = 0, DPR = 1, particulas = [];
  var BLOBS = [
    { c: CORES[0], a: 0.30, r: 0.62, x: 0.18, y: 0.12, fx: 0.00011, fy: 0.00007, p: 0 },
    { c: CORES[3], a: 0.22, r: 0.52, x: 0.84, y: 0.22, fx: 0.00008, fy: 0.0001, p: 2 },
    { c: CORES[4], a: 0.26, r: 0.58, x: 0.55, y: 0.88, fx: 0.00006, fy: 0.00009, p: 4 },
    { c: CORES[2], a: 0.10, r: 0.46, x: 0.32, y: 0.58, fx: 0.0001, fy: 0.00005, p: 1 }
  ];
  function medir() {
    W = innerWidth; H = innerHeight; DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    aurora.width = Math.max(64, Math.ceil(W / 5)); aurora.height = Math.max(64, Math.ceil(H / 5));
    vaga.width = Math.floor(W * DPR); vaga.height = Math.floor(H * DPR);
    cv.setTransform(DPR, 0, 0, DPR, 0, 0);
    var alvo = Math.round(limita(W * H / 16000, 28, 95));
    while (particulas.length < alvo) particulas.push(novaParticula(true));
    particulas.length = alvo;
  }
  function novaParticula(qualquer) {
    return { x: Math.random() * W, y: qualquer ? Math.random() * H : H + 10, r: 0.6 + Math.random() * 1.8, vy: -(0.08 + Math.random() * 0.28), fase: Math.random() * 6.28,
      prof: 0.3 + Math.random() * 0.9, c: CORES[Math.floor(Math.random() * CORES.length)], dx: 0, dy: 0 };
  }
  function desenharAurora(t) {
    var w = aurora.width, h = aurora.height, m = Math.max(w, h);
    ca.clearRect(0, 0, w, h);
    ca.globalCompositeOperation = "lighter";
    BLOBS.forEach(function (b, i) {
      var lado = i % 2 ? 1 : -1;
      var gx = (b.x + Math.sin(t * b.fx + b.p) * 0.16 + mouse.nx * 0.035 * lado + incl.x * 0.06 * lado) * w;
      var gy = (b.y + Math.cos(t * b.fy + b.p) * 0.12 - Math.min(rol.y / 4000, 0.25) * (i + 1) * 0.3 + mouse.ny * 0.03 * lado + incl.y * 0.05) * h;
      var g = ca.createRadialGradient(gx, gy, 0, gx, gy, b.r * m);
      g.addColorStop(0, rgba(b.c, b.a)); g.addColorStop(0.45, rgba(b.c, b.a * 0.42)); g.addColorStop(1, rgba(b.c, 0));
      ca.fillStyle = g; ca.fillRect(0, 0, w, h);
    });
    ca.globalCompositeOperation = "source-over";
  }
  function desenharVagalumes(t, k) {
    cv.clearRect(0, 0, W, H);
    for (var i = 0; i < particulas.length; i++) {
      var p = particulas[i];
      p.y += p.vy * k - rol.v * 0.35 * p.prof;
      p.x += Math.sin(t * 0.0005 + p.fase) * 0.22 * k + incl.x * 0.25 * p.prof;
      // Desvia do cursor com um leve redemoinho.
      if (mouse.dentro) {
        var dx = p.x + p.dx - mouse.x, dy = p.y + p.dy - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 22000) { var d = Math.sqrt(d2) || 1, f = (1 - d / 148) * 2.4; p.dx += (dx / d * f - dy / d * f * 0.6) * k; p.dy += (dy / d * f + dx / d * f * 0.6) * k; }
      }
      p.dx *= 0.94; p.dy *= 0.94;
      if (p.y < -12) { particulas[i] = novaParticula(false); continue; }
      if (p.y > H + 14) p.y = -10;
      if (p.x < -12) p.x = W + 10; else if (p.x > W + 12) p.x = -10;
      var brilho = 0.45 + 0.55 * Math.sin(t * 0.0016 * p.prof + p.fase);
      var x = p.x + p.dx, y = p.y + p.dy;
      cv.fillStyle = rgba(p.c, 0.07 * brilho);
      cv.beginPath(); cv.arc(x, y, p.r * 5.5, 0, 6.2832); cv.fill();
      cv.fillStyle = rgba(p.c, 0.35 + 0.55 * brilho);
      cv.beginPath(); cv.arc(x, y, p.r, 0, 6.2832); cv.fill();
    }
    // Faíscas do clique e do rastro.
    for (var j = faiscas.length - 1; j >= 0; j--) {
      var s = faiscas[j];
      s.vida -= 16.7 * k; if (s.vida <= 0) { faiscas.splice(j, 1); continue; }
      s.vx *= 0.965; s.vy = s.vy * 0.965 + s.g * k; s.x += s.vx * k; s.y += s.vy * k; s.rot += s.vr * k;
      var a = Math.min(1, s.vida / 420);
      cv.save(); cv.translate(s.x, s.y); cv.rotate(s.rot); cv.fillStyle = rgba(s.c, a);
      if (s.forma === 0) { cv.beginPath(); cv.ellipse(0, 0, s.t * 1.8, s.t * 0.7, 0, 0, 6.2832); cv.fill(); }
      else if (s.forma === 1) { estrela(s.t * 1.6); cv.fill(); }
      else { cv.beginPath(); cv.arc(0, 0, s.t * 0.8, 0, 6.2832); cv.fill(); }
      cv.restore();
    }
  }
  function estrela(r) {
    cv.beginPath();
    for (var i = 0; i < 8; i++) { var rr = i % 2 ? r * 0.38 : r, a = i * Math.PI / 4; cv[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr); }
    cv.closePath();
  }
  function explosao(x, y, n, forca) {
    if (RM) { n = Math.ceil(n / 3); forca = (forca || 1) * 0.5; }
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * 6.2832, v = (1.5 + Math.random() * 3.5) * (forca || 1);
      faiscas.push({ x: x, y: y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 1.2, g: 0.07, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        vida: 700 + Math.random() * 600, c: CORES[Math.floor(Math.random() * CORES.length)], forma: i % 3, t: 2 + Math.random() * 2.6 });
    }
    if (faiscas.length > 260) faiscas.splice(0, faiscas.length - 260);
  }
  function rastro(x, y) {
    faiscas.push({ x: x, y: y, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, g: -0.01, rot: 0, vr: 0, vida: 520, c: CORES[1 + Math.floor(Math.random() * 3)], forma: 2, t: 1.2 + Math.random() * 1.4 });
  }

  // ═════════════════════════ 2. CURSOR ═════════════════════════
  var ponto = null, anel = null, anelEstado = { x: mouse.x, y: mouse.y, vx: 0, vy: 0 }, ultRastro = { x: 0, y: 0 };
  // Nasce no primeiro movimento de MOUSE de verdade (notebook com tela de
  // toque e navegador sem janela nem sempre dizem "pointer: fine").
  function criarCursor(x, y) {
    if (anel || !document.body) return;
    ponto = document.createElement("div"); ponto.className = "sk-cur";
    anel = document.createElement("div"); anel.className = "sk-anel"; anel.innerHTML = "<i></i><span></span>";
    // O anel antes do ponto: o CSS esconde o ponto quando o anel mostra "abrir".
    [anel, ponto].forEach(function (el) { el.setAttribute("aria-hidden", "true"); el.setAttribute("data-runtime-ui", "cursor"); document.body.appendChild(el); });
    anelEstado.x = x; anelEstado.y = y;
    doc.classList.add("sk-cursor-on");
  }
  function alvoDoCursor(el) {
    if (!anel || !el || !el.closest) return;
    var texto = el.closest("input,textarea,select,[contenteditable='true']");
    doc.classList.toggle("sk-texto", !!texto);
    var card = el.closest(".grade .card");
    var clicavel = card || el.closest("a,button,[role='button'],label,summary,.selo");
    anel.classList.toggle("sk-card", !!card);
    anel.classList.toggle("sk-alvo", !!clicavel && !card);
    anel.querySelector("span").textContent = card ? (card.classList.contains("novo") ? "nova" : "abrir") : "";
  }

  // ═════════════════════════ 3. CARTÕES ═════════════════════════
  var cardAtivo = null, vistos = {}, obsRev = null;
  function inclinar(card, px, py) {
    card.style.setProperty("--rx", ((0.5 - py) * 13).toFixed(2));
    card.style.setProperty("--ry", ((px - 0.5) * 15).toFixed(2));
    card.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
    card.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
    card.style.setProperty("--sk-mx", ((px - 0.5) * 8).toFixed(1) + "px");
  }
  function soltar(card) {
    if (!card) return;
    card.classList.remove("sk-tilt");
    ["--rx", "--ry", "--gx", "--gy", "--sk-mx"].forEach(function (k) { card.style.removeProperty(k); });
  }
  var ultToque = 0;
  function cartaoSobCursor(e) {
    if (RM) return;
    var card = e.target && e.target.closest ? e.target.closest(".grade .card") : null;
    if (card !== cardAtivo) {
      soltar(cardAtivo); cardAtivo = card;
      if (card && Som.tocando() && Date.now() - ultToque > 260) { ultToque = Date.now(); Som.toque(); }
    }
    if (!card) return;
    var r = card.getBoundingClientRect();
    card.classList.add("sk-tilt");
    inclinar(card, limita((e.clientX - r.left) / r.width, 0, 1), limita((e.clientY - r.top) / r.height, 0, 1));
  }
  // Revelação: cada cartão aparece uma vez; ao redesenhar (sincronia), os já
  // vistos voltam direto, sem piscar.
  function chaveItem(it) { var a = it.querySelector(".card"); return a ? (a.getAttribute("href") || (a.hasAttribute("data-cadastrar") ? "novo" : a.textContent.slice(0, 40))) : it.textContent.slice(0, 40); }
  function prepararItens() {
    var grade = document.getElementById("grade"); if (!grade) return;
    var n = 0;
    grade.querySelectorAll(".item").forEach(function (it) {
      if (it.dataset.skPronto) return;
      it.dataset.skPronto = "1";
      it.style.setProperty("--sk-fd", (-Math.random() * 7).toFixed(2) + "s");
      var k = chaveItem(it);
      if (RM || vistos[k]) { it.classList.add("sk-vis"); return; }
      it.classList.add("sk-rev");
      it.style.setProperty("--sk-d", (n++ * 0.11).toFixed(2) + "s");
      if (obsRev) obsRev.observe(it); else it.classList.add("sk-vis");
    });
  }
  if ("IntersectionObserver" in window) {
    obsRev = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("sk-vis"); vistos[chaveItem(en.target)] = 1; obsRev.unobserve(en.target);
      });
    }, { threshold: 0.12 });
  }

  // Inclinação do aparelho (celular): cartões e fundo acompanham.
  function aoInclinar(e) {
    if (e.gamma == null) return;
    if (incl.base == null) incl.base = e.beta;
    incl.tx = limita(e.gamma / 28, -1, 1);
    incl.ty = limita((e.beta - incl.base) / 28, -1, 1);
    incl.ativo = true;
  }
  var inclinacaoPedida = false;
  function pedirInclinacao() {
    if (inclinacaoPedida || FINO || RM) return;
    inclinacaoPedida = true;
    var D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === "function") {
      D.requestPermission().then(function (r) { if (r === "granted") window.addEventListener("deviceorientation", aoInclinar); }).catch(function () {});
    }
  }
  if (!FINO && !RM && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== "function") {
    inclinacaoPedida = true;
    window.addEventListener("deviceorientation", aoInclinar);
  }
  function aplicarInclinacaoCartoes() {
    if (!incl.ativo || FINO) return;
    var px = 0.5 + incl.x * 0.5, py = 0.5 + incl.y * 0.5;
    doc.classList.add("sk-giro");
    document.querySelectorAll("#grade .card").forEach(function (c) { inclinar(c, limita(px, 0, 1), limita(py, 0, 1)); });
  }

  // ═════════════════════════ 5. PORTAL ═════════════════════════
  var saindo = false;
  function abrirPortal(a, href) {
    if (saindo) return; saindo = true;
    var r = a.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var img = a.querySelector("img"), src = img ? img.getAttribute("src") : "";
    // Escola sem imagem: o emoji dela vira o logo do portal (SVG).
    var ic = !src && a.querySelector(".ic");
    if (ic) src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='#20231E'/><text x='50' y='54' font-size='56' text-anchor='middle' dominant-baseline='middle'>" + ic.textContent.replace(/[<&>]/g, "") + "</text></svg>");
    var nome = a.getAttribute("aria-label") ? a.getAttribute("aria-label").replace(/^Abrir\s+/, "") : (img && img.getAttribute("alt")) || "";
    var grade = document.getElementById("grade"), item = a.closest(".item");
    if (grade) grade.classList.add("sk-saindo");
    if (item) item.classList.add("sk-ativo");
    Som.portal();
    explosao(cx, cy, 26, 1.4);
    var ov = document.createElement("div");
    ov.className = "sk-portal" + (RM ? " calmo" : ""); ov.setAttribute("data-runtime-ui", "portal");
    ov.style.setProperty("--cx", cx + "px"); ov.style.setProperty("--cy", cy + "px");
    ov.innerHTML = '<i class="sk-onda"></i><i class="sk-onda"></i><i class="sk-onda"></i><div class="sk-txt"><b></b>Abrindo…</div>';
    ov.querySelector("b").textContent = nome;
    var logo = null;
    if (src) {
      logo = document.createElement("img"); logo.className = "sk-logo"; logo.alt = ""; logo.src = src;
      logo.style.cssText = "left:" + r.left + "px;top:" + r.top + "px;width:" + r.width + "px;height:" + r.height + "px";
      if (RM) { var l0 = Math.min(170, innerWidth * 0.36); logo.style.cssText = "left:" + (innerWidth / 2 - l0 / 2) + "px;top:" + (innerHeight * 0.44 - l0 / 2) + "px;width:" + l0 + "px;height:" + l0 + "px;border-radius:28px"; }
      if (a.classList.contains("fixa") && !a.classList.contains("propria")) logo.style.objectFit = "contain";
      ov.appendChild(logo);
    }
    document.body.appendChild(ov);
    try {
      var guardar = src && (src.indexOf("data:") !== 0 || src.length < 180000) ? src : "";
      sessionStorage.setItem("skin-portal", JSON.stringify({ t: Date.now(), img: guardar ? new URL(guardar, location.href).href : "", nome: nome }));
    } catch (e) {}
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        ov.classList.add("aberto");
        if (logo) {
          var lado = Math.min(170, innerWidth * 0.36);
          logo.style.cssText = "left:" + (innerWidth / 2 - lado / 2) + "px;top:" + (innerHeight * 0.44 - lado / 2) + "px;width:" + lado + "px;height:" + lado + "px;border-radius:28px" + (logo.style.objectFit ? ";object-fit:contain" : "");
          setTimeout(function () { logo.classList.add("centro"); }, 950);
        }
      });
    });
    setTimeout(function () { location.href = href; }, 1150);
  }
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("#grade a.card");
    if (!a || a.target === "_blank") return;
    var href = a.getAttribute("href");
    if (!href || href === "#" || href.charAt(0) === "#") return;
    e.preventDefault();
    abrirPortal(a, a.href);
  });
  // Voltou pelo "Voltar" do navegador (página guardada em cache): desfaz o portal.
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    saindo = false;
    document.querySelectorAll(".sk-portal").forEach(function (x) { x.remove(); });
    var g = document.getElementById("grade");
    if (g) { g.classList.remove("sk-saindo"); g.querySelectorAll(".sk-ativo").forEach(function (x) { x.classList.remove("sk-ativo"); }); }
    mostrarSom();
  });

  // ═════════════════════════ EVENTOS ═════════════════════════
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    if (e.pointerType === "mouse" && !anel) criarCursor(e.clientX, e.clientY);
    mouse.vx = e.clientX - mouse.x; mouse.vy = e.clientY - mouse.y;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.dentro = true;
    mouse.nx = e.clientX / W * 2 - 1; mouse.ny = e.clientY / H * 2 - 1;
    doc.classList.remove("sk-cursor-fora");
    if (ponto) {
      ponto.style.transform = "translate3d(" + e.clientX + "px," + e.clientY + "px,0)";
      var dx = e.clientX - ultRastro.x, dy = e.clientY - ultRastro.y;
      if (dx * dx + dy * dy > 700 && !RM) { rastro(e.clientX, e.clientY); ultRastro.x = e.clientX; ultRastro.y = e.clientY; }
    }
    cartaoSobCursor(e);
  }, { passive: true });
  document.addEventListener("pointerover", function (e) { alvoDoCursor(e.target); });
  document.addEventListener("mouseleave", function () { mouse.dentro = false; doc.classList.add("sk-cursor-fora"); soltar(cardAtivo); cardAtivo = null; });
  window.addEventListener("pointerdown", function (e) {
    if (anel) anel.classList.add("sk-aperta");
    if (!e.target.closest || !e.target.closest("input,textarea,select")) explosao(e.clientX, e.clientY, e.pointerType === "touch" ? 12 : 16, 1);
  }, { passive: true });
  window.addEventListener("pointerup", function () { if (anel) anel.classList.remove("sk-aperta"); }, { passive: true });
  var rolAnt = window.scrollY;
  window.addEventListener("scroll", function () { rol.alvo += window.scrollY - rolAnt; rolAnt = window.scrollY; }, { passive: true });
  window.addEventListener("resize", medir);

  // ═════════════════════════ LAÇO ═════════════════════════
  var ult = 0, rodando = false, varsRaiz = {};
  // Só escreve na raiz quando o valor muda (evita recalcular o estilo à toa).
  function definir(k, v) { if (varsRaiz[k] !== v) { varsRaiz[k] = v; doc.style.setProperty(k, v); } }
  function quadro(t) {
    rodando = true;
    var k = ult ? Math.min((t - ult) / 16.67, 3) : 1; ult = t;
    var kf = RM ? k * 0.35 : k;
    // Rolagem com mola: velocidade suaviza e volta a zero.
    rol.v = rol.v * 0.82 + rol.alvo * 0.18 / Math.max(k, 1); rol.alvo *= 0.5;
    rol.y = window.scrollY;
    var sv = limita(rol.v / 40, -1, 1);
    var max = document.documentElement.scrollHeight - innerHeight;
    definir("--sk-sv", Math.abs(sv) < 0.002 ? "0" : sv.toFixed(3));
    definir("--sk-sy", String(Math.round(rol.y)));
    definir("--sk-p", max > 4 ? (rol.y / max).toFixed(3) : "0");
    // Inclinação do aparelho suavizada.
    incl.x += (incl.tx - incl.x) * 0.08; incl.y += (incl.ty - incl.y) * 0.08;
    if (incl.ativo && Math.round(t / 50) % 2 === 0) aplicarInclinacaoCartoes();
    // Anel do cursor: mola com esticamento na direção do movimento.
    if (anel) {
      var ax = mouse.x - anelEstado.x, ay = mouse.y - anelEstado.y;
      anelEstado.vx = (anelEstado.vx + ax * 0.2) * 0.62; anelEstado.vy = (anelEstado.vy + ay * 0.2) * 0.62;
      anelEstado.x += anelEstado.vx * k; anelEstado.y += anelEstado.vy * k;
      var vel = Math.sqrt(anelEstado.vx * anelEstado.vx + anelEstado.vy * anelEstado.vy), ang = Math.atan2(anelEstado.vy, anelEstado.vx);
      var est = Math.min(vel / 30, 0.45), apertado = anel.classList.contains("sk-aperta") ? 0.82 : 1;
      anel.style.transform = "translate3d(" + anelEstado.x.toFixed(1) + "px," + anelEstado.y.toFixed(1) + "px,0)";
      anel.firstChild.style.transform = "rotate(" + ang.toFixed(3) + "rad) scale(" + ((1 + est) * apertado).toFixed(3) + "," + ((1 - est * 0.55) * apertado).toFixed(3) + ")";
    }
    desenharAurora(RM ? t * 0.4 : t);
    desenharVagalumes(RM ? t * 0.4 : t, kf);
    if (!document.hidden) requestAnimationFrame(quadro); else { rodando = false; ult = 0; }
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && !rodando) requestAnimationFrame(quadro); });

  function iniciar() {
    document.body.insertBefore(prog, document.body.firstChild);
    document.body.insertBefore(vinheta, document.body.firstChild);
    document.body.insertBefore(vaga, document.body.firstChild);
    document.body.insertBefore(aurora, document.body.firstChild);
    document.body.appendChild(botaoSom);
    mostrarSom();
    medir();
    var grade = document.getElementById("grade");
    if (grade) { prepararItens(); new MutationObserver(prepararItens).observe(grade, { childList: true }); }
    requestAnimationFrame(quadro);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
