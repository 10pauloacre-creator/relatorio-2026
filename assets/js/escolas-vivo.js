// ═══════════════════════════════════════════════════════════════════════
// escolas-vivo.js — tela Escolas viva (24/09/2026). Estilo em
// assets/css/escolas-vivo.css. Nada aqui grava dados.
//
//  1. Universo (24/09/2026): a tela é a janela de uma nave viajando entre
//     estrelas cintilantes. O cursor muda a direção; segurar o clique no
//     fundo acelera até a dobra; um clique cria uma supernova que fica para
//     trás; três cliques seguidos criam um buraco negro (Gargantua) que
//     engole as estrelas, colapsa e dá lugar a um céu novo.
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
    var motorG = null, motorF = null, motorN = -1, roncoG = null, roncoO = [];
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
      // Motor da nave: ruído filtrado que sobe com a dobra (0 a 1).
      motor: function (n) {
        if (estado !== "tocando" || !ctx) return;
        if (!motorG) {
          var src = ctx.createBufferSource(); src.buffer = ruidoMarrom(6); src.loop = true;
          motorF = ctx.createBiquadFilter(); motorF.type = "bandpass"; motorF.Q.value = 0.8; motorF.frequency.value = 220;
          motorG = ctx.createGain(); motorG.gain.value = 0;
          src.connect(motorF); motorF.connect(motorG); motorG.connect(seco); motorG.connect(eco); src.start();
        }
        if (Math.abs(n - motorN) < 0.01) return;
        motorN = n;
        var t = ctx.currentTime;
        motorG.gain.setTargetAtTime(n * 0.22, t, 0.25);
        motorF.frequency.setTargetAtTime(220 + n * 1400, t, 0.3);
        filtroPad.frequency.setTargetAtTime(850 + n * 1300, t, 0.6);
      },
      // Supernova: estrondo grave e macio, com cauda longa no eco.
      boom: function () {
        if (estado !== "tocando" || !ctx) return;
        var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(92, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.8);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
        o.connect(g); g.connect(seco); g.connect(eco); o.start(t); o.stop(t + 3.1);
        var n = ctx.createBufferSource(); n.buffer = ruidoMarrom(2);
        var nf = ctx.createBiquadFilter(); nf.type = "lowpass"; nf.frequency.setValueAtTime(1400, t); nf.frequency.exponentialRampToValueAtTime(180, t + 1.6);
        var ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.45, t + 0.02); ng.gain.exponentialRampToValueAtTime(0.0001, t + 2);
        n.connect(nf); nf.connect(ng); ng.connect(seco); ng.connect(eco); n.start(t); n.stop(t + 2.1);
        setTimeout(function () { nota(PENTA[5], 0.03, 3.5, 0.2); }, 260);
      },
      // Buraco negro: ronco grave que cresce enquanto ele come.
      buraco: function () {
        if (estado !== "tocando" || !ctx) return;
        var t = ctx.currentTime;
        roncoG = ctx.createGain(); roncoG.gain.setValueAtTime(0.0001, t); roncoG.gain.exponentialRampToValueAtTime(0.28, t + 3.5);
        roncoO = [41.2, 61.8, 82.9].map(function (f, i) {
          var o = ctx.createOscillator(); o.type = i === 2 ? "triangle" : "sine"; o.frequency.value = f; o.detune.value = i * 3;
          var g = ctx.createGain(); g.gain.value = [1, 0.55, 0.18][i]; o.connect(g); g.connect(roncoG); o.start(t); return o;
        });
        roncoG.connect(seco); roncoG.connect(eco);
      },
      // Colapso: o ronco cai, um sopro sobe e um acorde claro anuncia o céu novo.
      colapso: function () {
        if (!ctx) return;
        var t = ctx.currentTime;
        if (roncoG) { roncoG.gain.cancelScheduledValues(t); roncoG.gain.setValueAtTime(roncoG.gain.value, t); roncoG.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); var os = roncoO; setTimeout(function () { os.forEach(function (o) { try { o.stop(); } catch (e) {} }); }, 1400); roncoG = null; }
        if (estado !== "tocando") return;
        var n = ctx.createBufferSource(); n.buffer = ruidoMarrom(3);
        var nf = ctx.createBiquadFilter(); nf.type = "bandpass"; nf.Q.value = 1.2; nf.frequency.setValueAtTime(180, t); nf.frequency.exponentialRampToValueAtTime(2400, t + 1.4);
        var ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.5, t + 0.6); ng.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        n.connect(nf); nf.connect(ng); ng.connect(seco); ng.connect(eco); n.start(t); n.stop(t + 2.3);
        [0, 2, 4, 5, 7].forEach(function (k, i) { setTimeout(function () { nota(PENTA[k], 0.04, 4.5, 0.4); }, 500 + i * 140); });
      },
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

  // ═════════════════════════ 1. UNIVERSO ═════════════════════════
  // A tela é a janela de uma nave. As estrelas vivem em 3D (x, y, z) e vêm
  // na nossa direção; o ponto de fuga segue o cursor (no celular, o dedo ou
  // a inclinação), então a direção da viagem muda com ele. Segurar o clique
  // no fundo acelera até a dobra (rastros de luz). Um clique no fundo cria
  // uma supernova presa ao espaço: ela vem na nossa direção e fica para
  // trás. Três cliques seguidos criam um buraco negro (Gargantua, de
  // Interestelar): tudo vira partícula na tela, cai em espiral, some no
  // horizonte; ele colapsa num clarão e um céu novo acende.
  var ceu = document.createElement("canvas"), neb = document.createElement("canvas"), clarao = document.createElement("div"), vinheta = document.createElement("div"), prog = document.createElement("div");
  ceu.className = "sk-ceu"; clarao.className = "sk-clarao"; vinheta.className = "sk-vinheta"; prog.className = "sk-prog";
  [ceu, clarao, vinheta, prog].forEach(function (el) { el.setAttribute("aria-hidden", "true"); el.setAttribute("data-runtime-ui", "fundo"); });
  var cv = ceu.getContext("2d"), cn = neb.getContext("2d");
  var W = 0, H = 0, DPR = 1, F = 600;
  var ZMAX = 18, ZMIN = 0.14, ESPALHA = 11, PASSO = 0.018, Z_SN = ZMAX * 0.42;
  var VBASE = RM ? 0.35 : 0.85, VWARP = RM ? 4 : 16;
  var nave = { v: 0, fx: 0, fy: 0 };
  var segurando = false, toqueGuia = null, apertouEm = 0, cliques = [];
  var estrelas = [], supernovas = [], choques = [], buraco = null, quadroN = 0;
  // Cores das estrelas (peso): brancas, areia, douradas, sálvia, âmbar.
  var PALETA = [[[246, 244, 236], 58], [[214, 203, 184], 15], [[238, 204, 134], 11], [[194, 206, 158], 9], [[246, 176, 122], 5], [[255, 255, 255], 2]];
  var SOMA_PESO = PALETA.reduce(function (a, p) { return a + p[1]; }, 0);
  var BRASA = [255, 170, 92];
  function corEstrela() { var r = Math.random() * SOMA_PESO; for (var i = 0; i < PALETA.length; i++) { r -= PALETA[i][1]; if (r <= 0) return PALETA[i][0]; } return PALETA[0][0]; }
  function novaEstrela(longe) {
    return { x: (Math.random() * 2 - 1) * ESPALHA, y: (Math.random() * 2 - 1) * ESPALHA, z: longe ? ZMAX * (0.72 + Math.random() * 0.28) : ZMIN + 0.3 + Math.random() * (ZMAX - ZMIN - 0.3),
      c: corEstrela(), r: 0.35 + Math.pow(Math.random(), 3) * 1.9, fase: Math.random() * 6.28, ritmo: 0.6 + Math.random() * 1.6, a: longe ? 0 : 1, bx: 0, by: 0, bvx: 0, bvy: 0 };
  }
  function medir() {
    W = innerWidth; H = innerHeight; DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    ceu.width = Math.floor(W * DPR); ceu.height = Math.floor(H * DPR);
    cv.setTransform(DPR, 0, 0, DPR, 0, 0);
    neb.width = Math.max(48, Math.ceil(W / 6)); neb.height = Math.max(48, Math.ceil(H / 6));
    F = Math.max(W, H) * 0.55;
    if (!nave.fx) { nave.fx = W / 2; nave.fy = H / 2; }
    if (!buraco) {
      var alvo = Math.round(limita(W * H / 2300, 220, 760));
      while (estrelas.length < alvo) estrelas.push(novaEstrela(false));
      estrelas.length = alvo;
    }
    desenharNebulosa(0);
  }
  // Nebulosas bem escuras, em baixa resolução, que derivam contra a rota.
  var NEBS = [{ c: [118, 138, 92], a: 0.16, x: 0.22, y: 0.28, r: 0.62 }, { c: [168, 116, 66], a: 0.12, x: 0.78, y: 0.66, r: 0.55 }, { c: [112, 66, 58], a: 0.10, x: 0.58, y: 0.16, r: 0.48 }, { c: [196, 186, 156], a: 0.05, x: 0.38, y: 0.84, r: 0.42 }];
  function desenharNebulosa(t) {
    var w = neb.width, h = neb.height, m = Math.max(w, h);
    cn.clearRect(0, 0, w, h);
    cn.globalCompositeOperation = "lighter";
    NEBS.forEach(function (n, i) {
      var gx = (n.x + Math.sin(t * 0.00004 + i * 1.7) * 0.06 - (nave.fx / (W || 1) - 0.5) * 0.18) * w;
      var gy = (n.y + Math.cos(t * 0.00003 + i) * 0.05 - (nave.fy / (H || 1) - 0.5) * 0.18) * h;
      var g = cn.createRadialGradient(gx, gy, 0, gx, gy, n.r * m);
      g.addColorStop(0, rgba(n.c, n.a)); g.addColorStop(0.5, rgba(n.c, n.a * 0.35)); g.addColorStop(1, rgba(n.c, 0));
      cn.fillStyle = g; cn.fillRect(0, 0, w, h);
    });
    cn.globalCompositeOperation = "source-over";
  }
  function mistura(a, b, q) { return [Math.round(a[0] + (b[0] - a[0]) * q), Math.round(a[1] + (b[1] - a[1]) * q), Math.round(a[2] + (b[2] - a[2]) * q)]; }

  // ── um quadro do universo ──
  function desenharUniverso(t, k) {
    quadroN++;
    // Rota: o ponto de fuga persegue o cursor / o dedo / a inclinação.
    var ax = W / 2, ay = H / 2;
    if (buraco) { ax = buraco.x; ay = buraco.y; }
    else if (toqueGuia) { ax = toqueGuia.x; ay = toqueGuia.y; }
    else if (mouse.dentro) { ax = W / 2 + (mouse.x - W / 2) * 0.6; ay = H / 2 + (mouse.y - H / 2) * 0.6; }
    else if (incl.ativo) { ax = W / 2 + incl.x * W * 0.32; ay = H / 2 + incl.y * H * 0.32; }
    ay -= limita(rol.v, -30, 30) * 5;
    nave.fx += (ax - nave.fx) * 0.035 * k; nave.fy += (ay - nave.fy) * 0.035 * k;
    // Velocidade: segurar acelera até a dobra; soltar volta ao cruzeiro.
    var alvoV = buraco ? 0.05 : (segurando ? VWARP : VBASE) + Math.min(Math.abs(rol.v) * 0.12, 3);
    nave.v += (alvoV - nave.v) * (alvoV > nave.v ? 0.022 : 0.045) * k;
    var dz = PASSO * nave.v * k, dobra = limita((nave.v - VBASE) / (VWARP - VBASE), 0, 1);
    Som.motor(dobra);
    // Fundo com rastro: na dobra, a tela guarda o risco das estrelas.
    cv.globalCompositeOperation = "source-over"; cv.globalAlpha = 1;
    cv.fillStyle = "rgba(2,3,2," + (1 - dobra * 0.6).toFixed(3) + ")";
    cv.fillRect(0, 0, W, H);
    if (quadroN % 8 === 1) desenharNebulosa(t);
    cv.globalAlpha = (1 - dobra * 0.6) * (buraco ? 1 - buraco.escuro * 0.55 : 1);
    cv.drawImage(neb, 0, 0, W, H);
    cv.globalAlpha = 1;
    cv.lineCap = "round";
    if (buraco) estrelasSugadas(t, k); else estrelas3D(t, dz, dobra, k);
    desenharSupernovas(t, dz, k);
    desenharChoques(t);
    if (buraco) desenharBuraco(buraco, t);
    desenharFaiscas(k);
  }
  function estrelas3D(t, dz, dobra, k) {
    var cauda = 1 + dobra * 26;
    for (var i = 0; i < estrelas.length; i++) {
      var s = estrelas[i];
      s.z -= dz;
      if (s.a < 1) s.a = Math.min(1, s.a + 0.012 * k);
      if (s.z <= ZMIN) { estrelas[i] = novaEstrela(true); continue; }
      var inv = F / s.z, sx = nave.fx + s.x * inv, sy = nave.fy + s.y * inv;
      if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) { estrelas[i] = novaEstrela(true); continue; }
      var inv2 = F / (s.z + dz * cauda + 0.012), px = nave.fx + s.x * inv2, py = nave.fy + s.y * inv2;
      var perto = 1 - s.z / ZMAX;
      var cint = 0.62 + 0.38 * Math.sin(t * 0.0035 * s.ritmo + s.fase);
      var alfa = s.a * Math.min(1, perto * 1.7 + 0.1) * cint;
      var lw = Math.max(0.45, s.r * (0.35 + perto * 2.2));
      if (Math.abs(sx - px) + Math.abs(sy - py) < 1.2) {
        cv.fillStyle = rgba(s.c, alfa.toFixed(3));
        cv.beginPath(); cv.arc(sx, sy, lw * 0.62, 0, 6.2832); cv.fill();
      } else {
        cv.strokeStyle = rgba(s.c, alfa.toFixed(3)); cv.lineWidth = lw;
        cv.beginPath(); cv.moveTo(px, py); cv.lineTo(sx, sy); cv.stroke();
      }
      // As maiores brilham e, no pico da cintilação, abrem uma cruz de luz.
      if (s.r > 1.3 && perto > 0.3 && dobra < 0.45) {
        cv.fillStyle = rgba(s.c, (alfa * 0.13).toFixed(3));
        cv.beginPath(); cv.arc(sx, sy, lw * 4.2, 0, 6.2832); cv.fill();
        if (cint > 0.93) {
          var L = lw * (5 + (cint - 0.93) * 120);
          cv.strokeStyle = rgba(s.c, (alfa * 0.55).toFixed(3)); cv.lineWidth = 0.7;
          cv.beginPath(); cv.moveTo(sx - L, sy); cv.lineTo(sx + L, sy); cv.moveTo(sx, sy - L); cv.lineTo(sx, sy + L); cv.stroke();
        }
      }
    }
  }

  // ── supernova ──
  function criarSupernova(sx, sy) {
    var z = Z_SN;
    var sn = { t0: performance.now(), z: z, x: (sx - nave.fx) * z / F, y: (sy - nave.fy) * z / F, tela: !!buraco, sx: sx, sy: sy, bvx: 0, bvy: 0, escala: 1, ej: [] };
    var CE = [[255, 246, 228], [255, 214, 146], [242, 152, 84], [194, 206, 158], [214, 203, 184]];
    for (var i = 0; i < (RM ? 45 : 90); i++) {
      var ang = Math.random() * 6.2832, sp = 0.25 + Math.pow(Math.random(), 0.6) * 1.05;
      sn.ej.push({ dx: Math.cos(ang) * sp, dy: Math.sin(ang) * sp, c: CE[Math.floor(Math.random() * CE.length)], r: 0.6 + Math.random() * 1.8, f: Math.random() * 6.28 });
    }
    supernovas.push(sn);
    if (supernovas.length > 12) supernovas.shift();
    piscar(sx, sy, 0.5);
    Som.boom();
  }
  function piscar(x, y, forca) {
    clarao.style.setProperty("--cx", x + "px"); clarao.style.setProperty("--cy", y + "px"); clarao.style.setProperty("--forca", forca);
    clarao.classList.remove("on"); void clarao.offsetWidth; clarao.classList.add("on");
  }
  function desenharSupernovas(t, dz, k) {
    cv.globalCompositeOperation = "lighter";
    for (var i = supernovas.length - 1; i >= 0; i--) {
      var sn = supernovas[i], idade = Math.max(0, (t - sn.t0) / 1000), cx, cy, esc, some = 1;
      if (sn.tela) {
        cx = sn.sx; cy = sn.sy; esc = sn.escala;
        if (sn.engolida) { supernovas.splice(i, 1); continue; }
      } else {
        sn.z -= dz;
        if (sn.z < ZMIN * 2) { supernovas.splice(i, 1); continue; }
        var inv = F / sn.z; cx = nave.fx + sn.x * inv; cy = nave.fy + sn.y * inv; esc = Z_SN / sn.z;
        some = Math.min(1, (sn.z - ZMIN * 2) / 0.9);
      }
      if (idade > 18) { supernovas.splice(i, 1); continue; }
      some *= idade > 14 ? Math.max(0, 1 - (idade - 14) / 4) : 1;
      var base = Math.min(W, H) * 0.045 * esc;
      if (cx < -base * 8 || cx > W + base * 8 || cy < -base * 8 || cy > H + base * 8) { if (!sn.tela) { supernovas.splice(i, 1); } continue; }
      // remanescente: nuvem quente com borda sálvia
      var R1 = base * (1.1 + 2.8 * (1 - Math.exp(-idade * 0.7))), a1 = Math.max(0, 0.5 - idade * 0.03) * some;
      if (a1 > 0.01) {
        var g = cv.createRadialGradient(cx, cy, 0, cx, cy, R1);
        g.addColorStop(0, "rgba(255,238,206," + (a1 * 0.85).toFixed(3) + ")"); g.addColorStop(0.28, "rgba(236,176,98," + (a1 * 0.5).toFixed(3) + ")");
        g.addColorStop(0.62, "rgba(150,166,112," + (a1 * 0.22).toFixed(3) + ")"); g.addColorStop(1, "rgba(120,90,60,0)");
        cv.fillStyle = g; cv.beginPath(); cv.arc(cx, cy, R1, 0, 6.2832); cv.fill();
      }
      // clarão do núcleo (primeiro segundo), com raios em cruz
      if (idade < 1.3) {
        var q = 1 - idade / 1.3, Rn = base * (0.5 + idade * 3.2);
        var gn = cv.createRadialGradient(cx, cy, 0, cx, cy, Rn);
        gn.addColorStop(0, "rgba(255,255,250," + q.toFixed(3) + ")"); gn.addColorStop(0.35, "rgba(255,232,190," + (q * 0.6).toFixed(3) + ")"); gn.addColorStop(1, "rgba(255,200,140,0)");
        cv.fillStyle = gn; cv.beginPath(); cv.arc(cx, cy, Rn, 0, 6.2832); cv.fill();
        var L = base * 9 * q;
        cv.strokeStyle = "rgba(255,244,222," + (q * 0.7).toFixed(3) + ")"; cv.lineWidth = Math.max(1, base * 0.06);
        cv.beginPath(); cv.moveTo(cx - L, cy); cv.lineTo(cx + L, cy); cv.moveTo(cx, cy - L * 0.7); cv.lineTo(cx, cy + L * 0.7); cv.stroke();
      }
      // onda de choque (dois anéis)
      var Rc = base * (0.5 + idade * 1.9), ac = Math.max(0, 1 - idade / 4.5) * some;
      if (ac > 0.01) {
        cv.lineWidth = Math.max(0.8, base * 0.12 * (1 - idade / 5));
        cv.strokeStyle = "rgba(255,214,160," + (ac * 0.8).toFixed(3) + ")"; cv.beginPath(); cv.arc(cx, cy, Rc, 0, 6.2832); cv.stroke();
        cv.strokeStyle = "rgba(194,206,158," + (ac * 0.4).toFixed(3) + ")"; cv.beginPath(); cv.arc(cx, cy, Rc * 1.18, 0, 6.2832); cv.stroke();
      }
      // matéria ejetada
      var esp = base * (0.4 + 3.4 * (1 - Math.exp(-idade * 0.8))), ae = Math.max(0, 1 - idade / 6.5) * some;
      if (ae > 0.01) {
        var rr = Math.sqrt(esc);
        for (var j = 0; j < sn.ej.length; j++) {
          var e = sn.ej[j];
          cv.fillStyle = rgba(e.c, (ae * (0.55 + 0.45 * Math.sin(t * 0.012 + e.f))).toFixed(3));
          cv.beginPath(); cv.arc(cx + e.dx * esp, cy + e.dy * esp, e.r * rr, 0, 6.2832); cv.fill();
        }
      }
      // pulsar que sobra no centro
      if (idade > 1) {
        var ap = (0.45 + 0.55 * Math.abs(Math.sin(t * 0.009))) * some * Math.min(1, idade - 1);
        cv.fillStyle = "rgba(255,250,236," + ap.toFixed(3) + ")"; cv.beginPath(); cv.arc(cx, cy, Math.max(1, base * 0.08), 0, 6.2832); cv.fill();
      }
    }
    cv.globalCompositeOperation = "source-over";
  }
  function desenharChoques(t) {
    for (var i = choques.length - 1; i >= 0; i--) {
      var c = choques[i], p = (t - c.t0) / c.dur;
      if (p >= 1) { choques.splice(i, 1); continue; }
      if (p < 0) continue; // ainda não começou (ou o relógio do quadro ficou atrás do clique)
      var R = Math.max(0, c.r0 + (c.r1 - c.r0) * (1 - Math.pow(1 - p, 3)));
      cv.strokeStyle = rgba(c.c, ((1 - p) * c.a).toFixed(3)); cv.lineWidth = c.lw * (1 - p) + 0.6;
      cv.beginPath(); cv.arc(c.x, c.y, R, 0, 6.2832); cv.stroke();
    }
  }

  // ── buraco negro ──
  function criarBuraco(x, y) {
    if (buraco) return;
    var R0 = Math.min(W, H) * (W < 640 ? 0.11 : 0.085);
    buraco = { x: x, y: y, t0: performance.now(), fase: "forma", R: 0, R0: R0, Rmax: R0, comidas: 0, total: 1, brilho: 0, escuro: 0, tCol: 0 };
    var vivas = [];
    for (var i = 0; i < estrelas.length; i++) {
      var s = estrelas[i], inv = F / s.z, sx = nave.fx + s.x * inv, sy = nave.fy + s.y * inv;
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      var dx = sx - x, dy = sy - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      s.bx = sx; s.by = sy;
      // continua saindo do centro por um instante e já ganha giro
      s.bvx = (sx - nave.fx) * 0.0035 * nave.v - dy / d * 0.5; s.bvy = (sy - nave.fy) * 0.0035 * nave.v + dx / d * 0.5;
      vivas.push(s);
    }
    estrelas = vivas; buraco.total = Math.max(1, vivas.length);
    supernovas.forEach(function (sn) {
      if (sn.tela) return;
      var inv2 = F / sn.z; sn.sx = nave.fx + sn.x * inv2; sn.sy = nave.fy + sn.y * inv2; sn.escala = Z_SN / sn.z; sn.tela = true; sn.bvx = 0; sn.bvy = 0;
    });
    choques.push({ x: x, y: y, t0: performance.now(), dur: 1400, r0: 4, r1: R0 * 5, c: [255, 190, 120], a: 0.7, lw: 3 });
    // A página esmaece e é puxada de leve na direção dele (volta no colapso).
    doc.style.setProperty("--sk-bhx", ((x - W / 2) * 0.035).toFixed(1) + "px");
    doc.style.setProperty("--sk-bhy", ((y - H / 2) * 0.035).toFixed(1) + "px");
    doc.classList.add("sk-buraco");
    Som.buraco();
  }
  // Correnteza em espiral: em vez de força pura (que deixa as estrelas em
  // órbita para sempre), cada uma é guiada para uma velocidade que sempre
  // aponta para dentro, com giro, e acelera perto do horizonte. Assim o
  // buraco engole tudo em poucos segundos.
  function gravidade(b, x, y, vx, vy, G, k) {
    var dx = b.x - x, dy = b.y - y, d = Math.sqrt(dx * dx + dy * dy) || 1, R = Math.max(b.R, 8);
    var perto = limita(1 - (d - R) / (R * 6), 0, 1);
    // o giro diminui perto do horizonte (senão a estrela fica em órbita)
    var vr = G * (0.6 + 1300 / (d + 80)), vt = vr * 0.85 * (1 - perto * 0.75);
    var qx = dx / d * vr - dy / d * vt, qy = dy / d * vr + dx / d * vt;
    // longe: inércia (a curva fica bonita); perto: a correnteza manda
    var seg = Math.min(1, (0.05 + perto * 0.55) * k);
    vx += (qx - vx) * seg; vy += (qy - vy) * seg;
    // nunca mais rápido que a distância que falta: não passa do alvo
    var teto = Math.max(3, Math.min(30, (d - R * 0.4) * 0.3)), v = Math.sqrt(vx * vx + vy * vy);
    if (v > teto) { vx *= teto / v; vy *= teto / v; }
    return [vx, vy, d];
  }
  function estrelasSugadas(t, k) {
    var b = buraco, idade = Math.max(0, (t - b.t0) / 1000);
    var G = b.fase === "forma" ? 0.25 + 0.75 * Math.min(1, idade / 1.4) : 1 + (idade - 1.4) * 0.35;
    if (b.fase === "colapso") G *= 3;
    for (var i = estrelas.length - 1; i >= 0; i--) {
      var s = estrelas[i], r = gravidade(b, s.bx, s.by, s.bvx, s.bvy, G, k);
      s.bvx = r[0]; s.bvy = r[1]; s.bx += s.bvx * k; s.by += s.bvy * k;
      if (r[2] < b.R * 1.02 && b.R > 2) {
        estrelas[i] = estrelas[estrelas.length - 1]; estrelas.pop();
        b.comidas++; b.brilho = Math.min(1, b.brilho + 0.012);
        continue;
      }
      // perto do horizonte a luz esquenta (fica âmbar)
      var q = limita(1 - r[2] / (b.R * 7 + 1), 0, 1), c = q > 0.02 ? mistura(s.c, BRASA, q) : s.c;
      var cint = 0.7 + 0.3 * Math.sin(t * 0.004 * s.ritmo + s.fase);
      cv.strokeStyle = rgba(c, (Math.min(1, 0.45 + q * 0.6) * cint).toFixed(3)); cv.lineWidth = Math.max(0.55, s.r * (0.9 + q));
      cv.beginPath(); cv.moveTo(s.bx - s.bvx * 2.4, s.by - s.bvy * 2.4); cv.lineTo(s.bx, s.by); cv.stroke();
    }
    supernovas.forEach(function (sn) {
      if (!sn.tela || sn.engolida) return;
      var r2 = gravidade(b, sn.sx, sn.sy, sn.bvx, sn.bvy, G * 0.7, k);
      sn.bvx = r2[0]; sn.bvy = r2[1]; sn.sx += sn.bvx * k; sn.sy += sn.bvy * k;
      sn.escala *= Math.pow(0.992, k);
      if (r2[2] < b.R * 1.05) { sn.engolida = true; b.brilho = Math.min(1, b.brilho + 0.25); }
    });
    // fases: forma → come → colapso → céu novo
    b.escuro = Math.min(1, idade / 1.4);
    if (b.fase === "forma") {
      var p = Math.min(1, idade / 1.4); b.R = b.R0 * (1 - Math.pow(1 - p, 3));
      if (p >= 1) b.fase = "come";
    } else if (b.fase === "come") {
      b.Rmax = b.R0 * (1 + 0.9 * b.comidas / b.total);
      b.R += (b.Rmax - b.R) * 0.05 * k;
      var restam = estrelas.length + supernovas.filter(function (sn) { return sn.tela && !sn.engolida; }).length;
      if (restam <= Math.max(3, b.total * 0.025) || idade > 11) { b.fase = "colapso"; b.tCol = t; b.Rmax = b.R; }
    } else {
      var pc = limita((t - b.tCol) / 1300, 0, 1);
      b.R = Math.max(0, b.Rmax * (1 - pc * pc * pc));
      if (pc >= 1) renascer(t);
    }
  }
  function renascer(t) {
    var b = buraco;
    piscar(b.x, b.y, 0.9);
    choques.push({ x: b.x, y: b.y, t0: t, dur: 1600, r0: 2, r1: Math.max(W, H) * 1.1, c: [255, 236, 204], a: 0.9, lw: 6 });
    choques.push({ x: b.x, y: b.y, t0: t + 120, dur: 2000, r0: 2, r1: Math.max(W, H) * 0.8, c: [194, 206, 158], a: 0.5, lw: 3 });
    explosao(b.x, b.y, 40, 2);
    Som.colapso();
    doc.classList.remove("sk-buraco");
    buraco = null; supernovas = [];
    estrelas = [];
    var alvo = Math.round(limita(W * H / 2300, 220, 760));
    for (var i = 0; i < alvo; i++) { var s = novaEstrela(false); s.a = 0; estrelas.push(s); }
    nave.v = 0; nave.fx = b.x; nave.fy = b.y;
  }
  // Gargantua: sombra, anel de fótons, halo (a parte de trás do disco
  // curvada pela gravidade) e o disco de acreção atravessando na frente,
  // mais brilhante do lado que vem na nossa direção.
  function desenharBuraco(b, t) {
    var R = b.R, x = b.x, y = b.y;
    if (R < 0.8) return;
    var brilho = 0.75 + b.brilho * 0.5;
    cv.globalCompositeOperation = "lighter";
    var gl = cv.createRadialGradient(x, y, R * 0.9, x, y, R * 6);
    gl.addColorStop(0, "rgba(255,176,96," + (0.22 * brilho).toFixed(3) + ")"); gl.addColorStop(0.4, "rgba(200,110,50," + (0.08 * brilho).toFixed(3) + ")"); gl.addColorStop(1, "rgba(120,60,30,0)");
    cv.fillStyle = gl; cv.beginPath(); cv.arc(x, y, R * 6, 0, 6.2832); cv.fill();
    disco(b, t, true, brilho);
    var gh = cv.createRadialGradient(x, y, R * 1.0, x, y, R * 1.8);
    gh.addColorStop(0, "rgba(255,240,210," + (0.95 * brilho).toFixed(3) + ")"); gh.addColorStop(0.14, "rgba(255,196,120," + (0.75 * brilho).toFixed(3) + ")");
    gh.addColorStop(0.5, "rgba(228,128,60," + (0.3 * brilho).toFixed(3) + ")"); gh.addColorStop(1, "rgba(160,70,30,0)");
    cv.fillStyle = gh; cv.beginPath(); cv.arc(x, y, R * 1.8, 0, 6.2832); cv.fill();
    // turbulência girando no halo
    for (var i = 0; i < 9; i++) {
      var ang = t * 0.0009 * (1 + (i % 3) * 0.4) + i * 0.7;
      cv.strokeStyle = "rgba(255,226,172," + (0.1 + 0.08 * Math.sin(t * 0.003 + i)).toFixed(3) + ")"; cv.lineWidth = R * 0.05;
      cv.beginPath(); cv.arc(x, y, R * (1.12 + (i % 4) * 0.13), ang, ang + 1.1); cv.stroke();
    }
    cv.globalCompositeOperation = "source-over";
    cv.fillStyle = "#000"; cv.beginPath(); cv.arc(x, y, R, 0, 6.2832); cv.fill();
    cv.strokeStyle = "rgba(255,248,232," + Math.min(1, 0.85 * brilho).toFixed(3) + ")"; cv.lineWidth = Math.max(1.2, R * 0.035);
    cv.beginPath(); cv.arc(x, y, R * 1.015, 0, 6.2832); cv.stroke();
    cv.globalCompositeOperation = "lighter";
    disco(b, t, false, brilho);
    cv.globalCompositeOperation = "source-over";
  }
  function disco(b, t, atras, brilho) {
    var R = b.R;
    cv.save();
    cv.translate(b.x, b.y); cv.rotate(-0.1); cv.scale(1, 0.19);
    cv.beginPath(); cv.rect(-R * 7, atras ? -R * 7 : 0, R * 14, R * 7); cv.clip();
    var g = cv.createRadialGradient(0, 0, R * 1.12, 0, 0, R * 3.8);
    g.addColorStop(0, "rgba(255,246,224," + (0.95 * brilho).toFixed(3) + ")"); g.addColorStop(0.1, "rgba(255,212,140," + (0.85 * brilho).toFixed(3) + ")");
    g.addColorStop(0.34, "rgba(236,146,66," + (0.5 * brilho).toFixed(3) + ")"); g.addColorStop(0.7, "rgba(170,86,40," + (0.16 * brilho).toFixed(3) + ")"); g.addColorStop(1, "rgba(120,60,30,0)");
    cv.fillStyle = g; cv.beginPath(); cv.arc(0, 0, R * 3.8, 0, 6.2832); cv.arc(0, 0, R * 1.12, 0, 6.2832, true); cv.fill();
    // o lado esquerdo vem na nossa direção: mais claro (efeito Doppler)
    var gd = cv.createLinearGradient(-R * 3.8, 0, R * 3.8, 0);
    gd.addColorStop(0, "rgba(255,206,132," + (0.16 * brilho).toFixed(3) + ")"); gd.addColorStop(0.42, "rgba(255,190,110,0)"); gd.addColorStop(1, "rgba(120,50,20,0)");
    cv.fillStyle = gd; cv.beginPath(); cv.arc(0, 0, R * 3.8, 0, 6.2832); cv.arc(0, 0, R * 1.12, 0, 6.2832, true); cv.fill();
    for (var i = 0; i < 12; i++) {
      var ang = t * 0.0007 * (1 + (i % 3) * 0.5) + i * 0.9;
      cv.strokeStyle = "rgba(255,228,176," + (0.08 + 0.07 * Math.sin(t * 0.002 + i * 1.3)).toFixed(3) + ")"; cv.lineWidth = R * 0.09;
      cv.beginPath(); cv.arc(0, 0, R * (1.3 + (i % 6) * 0.38), ang, ang + 0.8); cv.stroke();
    }
    cv.restore();
  }

  // ── faíscas (clique em botões, rastro do cursor, portal) ──
  function desenharFaiscas(k) {
    for (var j = faiscas.length - 1; j >= 0; j--) {
      var s = faiscas[j];
      s.vida -= 16.7 * k; if (s.vida <= 0) { faiscas.splice(j, 1); continue; }
      s.vx *= 0.965; s.vy = s.vy * 0.965 + s.g * k; s.x += s.vx * k; s.y += s.vy * k; s.rot += s.vr * k;
      var a = Math.min(1, s.vida / 420);
      cv.save(); cv.translate(s.x, s.y); cv.rotate(s.rot); cv.fillStyle = rgba(s.c, a.toFixed(3));
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
    faiscas.push({ x: x, y: y, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, g: -0.01, rot: 0, vr: 0, vida: 520, c: [[246, 244, 236], [238, 204, 134], [194, 206, 158]][Math.floor(Math.random() * 3)], forma: 2, t: 1.1 + Math.random() * 1.2 });
  }
  // Leitura do estado, só para testes e depuração (não muda nada).
  window.SkinUniverso = { estado: function () { return { v: +nave.v.toFixed(2), fx: Math.round(nave.fx), fy: Math.round(nave.fy), estrelas: estrelas.length, supernovas: supernovas.length, buraco: buraco ? buraco.fase : "", comidas: buraco ? buraco.comidas : 0, R: buraco ? Math.round(buraco.R) : 0, amostra: buraco && estrelas[0] ? [Math.round(estrelas[0].bx), Math.round(estrelas[0].by), +estrelas[0].bvx.toFixed(2), +estrelas[0].bvy.toFixed(2)] : null }; } };
  // Clique ou toque no fundo (não em botões, cartões, campos ou janelas).
  function ehFundo(el) {
    return !(el && el.closest && el.closest("a,button,input,select,textarea,label,summary,[role='button'],.card,.selo,.sk-som,.painel,.aviso-email,.rel-auth-gate,[class^='ck-'],[class*=' ck-']"));
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
    if (e.button && e.button !== 0) return;
    if (ehFundo(e.target)) {
      segurando = true; apertouEm = performance.now();
      if (e.pointerType === "touch") toqueGuia = { x: e.clientX, y: e.clientY };
    } else if (!e.target.closest("input,textarea,select")) explosao(e.clientX, e.clientY, e.pointerType === "touch" ? 12 : 16, 1);
  }, { passive: true });
  window.addEventListener("pointermove", function (e) { if (segurando && e.pointerType === "touch") toqueGuia = { x: e.clientX, y: e.clientY }; }, { passive: true });
  function soltarNave() { segurando = false; toqueGuia = null; if (anel) anel.classList.remove("sk-aperta"); }
  window.addEventListener("pointerup", soltarNave, { passive: true });
  window.addEventListener("pointercancel", soltarNave, { passive: true });
  window.addEventListener("blur", soltarNave);
  // Clique curto no fundo: supernova. Três cliques seguidos no mesmo lugar:
  // buraco negro. (Segurar para acelerar não conta como clique.)
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || !ehFundo(e.target) || performance.now() - apertouEm > 380) return;
    var agora = performance.now(), x = e.clientX, y = e.clientY;
    cliques = cliques.filter(function (c) { return agora - c.t < 650 && Math.abs(c.x - x) + Math.abs(c.y - y) < 90; });
    cliques.push({ t: agora, x: x, y: y });
    if (cliques.length >= 3 && !buraco) { cliques = []; criarBuraco(x, y); }
    else criarSupernova(x, y);
  });
  var rolAnt = window.scrollY;
  window.addEventListener("scroll", function () { rol.alvo += window.scrollY - rolAnt; rolAnt = window.scrollY; }, { passive: true });
  window.addEventListener("resize", medir);

  // ═════════════════════════ LAÇO ═════════════════════════
  var ult = 0, rodando = false, varsRaiz = {}, avisouErro = false;
  // Só escreve na raiz quando o valor muda (evita recalcular o estilo à toa).
  function definir(k, v) { if (varsRaiz[k] !== v) { varsRaiz[k] = v; doc.style.setProperty(k, v); } }
  function quadro(t) {
    rodando = true;
    var k = ult ? Math.min((t - ult) / 16.67, 3) : 1; ult = t;
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
    // Um erro num quadro não pode parar a animação da página.
    try { desenharUniverso(t, k); } catch (erro) { if (!avisouErro) { avisouErro = true; console.warn("[escolas-vivo]", erro); } }
    if (!document.hidden) requestAnimationFrame(quadro); else { rodando = false; ult = 0; }
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && !rodando) requestAnimationFrame(quadro); });

  function iniciar() {
    document.body.insertBefore(prog, document.body.firstChild);
    document.body.insertBefore(vinheta, document.body.firstChild);
    document.body.insertBefore(clarao, document.body.firstChild);
    document.body.insertBefore(ceu, document.body.firstChild);
    document.body.appendChild(botaoSom);
    mostrarSom();
    medir();
    var grade = document.getElementById("grade");
    if (grade) { prepararItens(); new MutationObserver(prepararItens).observe(grade, { childList: true }); }
    requestAnimationFrame(quadro);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
