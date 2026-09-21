// ═══════════════════════════════════════════════════════════════════════
// escola-ia.js — aba 🤖 I.A nas escolas do administrador (Casavequia e
// Hermínio). Reaproveita o assistente do Meu Diário (meu-diario-ia.js):
// esta ponte cria a aba e a seção, e entrega ao assistente uma API no mesmo
// formato de window.MeuDiario, montada a partir da própria página:
//   • turmas, alunos e disciplinas → adaptador do novo-diario.js
//   • diários editáveis           → NovoDiario.diarios() / NovoDiario.salvar
//   • relatos escritos no HTML     → resumo só de leitura (resumoExtra)
// Nas escolas a I.A só registra e altera diários (turmas e alunos são fixos
// no HTML; plano, livros e sequências têm sistema próprio).
//
// A conta do administrador não tem cota: a "IA da plataforma" é ilimitada
// aqui (ia_consumir_cota devolve ilimitado para 10pauloacre@gmail.com).
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  var herminio = typeof ALUNOS_RH !== "undefined";
  var CONTEXTO = herminio ? "herminio" : "casavequia";
  var ESCOLA = herminio ? "E.E. Raimundo Hermínio de Melo" : "E.E. Rural Pe. Carlos Casavequia";

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function slug(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10) || "d"; }
  function dois(n) { return ("0" + n).slice(-2); }
  function toast(msg) {
    var t = document.createElement("div"); t.className = "md-toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800);
  }

  // ── Visual da aba (classes do Meu Diário, só dentro de #sec-ia) ───────
  var CSS = ""
    + "#sec-ia{--md-sup:#fff;--md-sup2:#faf8f2;--md-sup3:#f5f3ee;--md-linha:#e8e5de;--md-titulo:#1a3a2a;--md-acento:#2d6147;--md-acento-txt:#fff;--md-destaque:#2d6147;--r:14px;--ss:0 4px 24px rgba(26,58,42,.10)}"
    + "html.dark-2026 #sec-ia{--md-sup:#191c1f;--md-sup2:#202327;--md-sup3:#272b30;--md-linha:#383d43;--md-titulo:#f4f5f6;--md-acento:#ffa65b;--md-acento-txt:#1b130b;--md-destaque:#ffa65b}"
    + "#sec-ia .tb.ia{background:linear-gradient(135deg,#1a1a2e,#2d3a6e);color:#fff}"
    + "html.dark-2026 #sec-ia .tb.ia{background:#272b30;color:#ffb46f;border:1px solid #383d43}"
    + "#sec-ia .md-card{background:var(--md-sup);border-radius:var(--r);box-shadow:var(--ss);padding:18px 20px;margin-bottom:16px;color:var(--ce)}"
    + "#sec-ia .md-card.ia-chat{padding:0;overflow:hidden}"
    + "#sec-ia .md-card p{font-size:.88rem;line-height:1.55;color:var(--cm)}"
    + "#sec-ia .md-btn{border-radius:10px;padding:10px 16px;font-weight:700;font-size:.84rem;cursor:pointer;background:var(--md-sup3);color:var(--ce);border:1px solid var(--md-linha);font-family:inherit}"
    + "#sec-ia .md-btn.pri{background:var(--md-acento);color:var(--md-acento-txt);border-color:var(--md-acento)}"
    + "#sec-ia .md-btn.perigo{background:var(--rs);color:var(--ra);border-color:#f5c6c0}"
    + "#sec-ia .md-btn.mini{padding:6px 10px;font-size:.75rem;border-radius:8px}"
    + "#sec-ia .md-btn:disabled{opacity:.5;cursor:not-allowed}"
    + "html.dark-2026 #sec-ia .md-btn.pri{background:linear-gradient(135deg,var(--dark-accent),var(--dark-accent-strong))!important;color:#151719!important;border-color:var(--dark-accent)!important}"
    + "html.dark-2026 #sec-ia .md-btn:not(.pri):not(.perigo){background:var(--md-sup2)!important;color:var(--dark-text)!important;border-color:var(--md-linha)!important}"
    + "#sec-ia .md-f{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}"
    + "#sec-ia .md-f label{font-size:.7rem;font-weight:700;color:var(--md-destaque);text-transform:uppercase;letter-spacing:.05em}"
    + "#sec-ia .md-f input,#sec-ia .md-f select,#sec-ia .md-in{padding:9px 11px;border:2px solid var(--md-linha);border-radius:10px;font:inherit;font-size:.9rem;color:var(--ce);background:var(--md-sup2);width:100%}"
    + "#sec-ia .md-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}"
    + "#sec-ia .md-row{display:flex;gap:8px;align-items:center;margin-bottom:6px}#sec-ia .md-row .md-in{flex:1}"
    + ".md-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#1a3a2a;color:#fff;padding:10px 18px;border-radius:999px;font-size:.84rem;z-index:20000;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:92vw;text-align:center;font-family:'DM Sans',sans-serif}"
    + "html.dark-2026 .md-toast{background:#272b30;border:1px solid #383d43;color:#f4f5f6}";

  function criarAba() {
    if (document.getElementById("sec-ia")) return document.getElementById("sec-ia");
    var st = document.createElement("style"); st.id = "escola-ia-style"; st.textContent = CSS;
    document.head.appendChild(st);
    var nav = document.querySelector(".nav-i");
    var alvo = document.getElementById(herminio ? "btn-editar-rh" : "btn-editar");
    var bt = document.createElement("button");
    bt.className = "nb"; bt.type = "button"; bt.textContent = "🤖 I.A";
    bt.setAttribute("onclick", herminio ? "aba('sec-ia',this)" : "aba('ia',this)");
    bt.setAttribute("data-runtime-ui", "escola-ia");
    if (nav) {
      if (!herminio) {
        var sp = document.createElement("div"); sp.className = "sp"; sp.setAttribute("data-runtime-ui", "escola-ia");
        if (alvo) { nav.insertBefore(sp, alvo); nav.insertBefore(bt, alvo); } else { nav.appendChild(sp); nav.appendChild(bt); }
      } else if (alvo) nav.insertBefore(bt, alvo); else nav.appendChild(bt);
    }
    var sec = document.createElement("section");
    sec.className = "sec"; sec.id = "sec-ia"; sec.setAttribute("data-runtime-ui", "escola-ia");
    (document.querySelector("main.main") || document.querySelector("main") || document.body).appendChild(sec);
    return { botao: bt, secao: sec };
  }

  // Relatos escritos no HTML (só leitura): data, título, assunto e horário.
  function resumoDaPagina(A, pseudo) {
    var out = [];
    A.turmas.forEach(function (t) {
      var sec = document.getElementById("sec-" + t);
      if (!sec) return;
      var cards = Array.prototype.slice.call(sec.querySelectorAll(".ea:not([data-novo-diario])")).slice(0, 12);
      cards.forEach(function (c) {
        var dia = parseInt(((c.querySelector(".edb .d") || {}).textContent || "").trim(), 10);
        var my = ((c.querySelector(".edb .my") || {}).textContent || "").trim().split(/\s+/);
        var mes = MESES.map(function (m) { return m.toLowerCase(); }).indexOf((my[0] || "").slice(0, 3).toLowerCase());
        var data = dia && mes >= 0 && my[1] ? my[1] + "-" + dois(mes + 1) + "-" + dois(dia) : "";
        var limpa = function (el) { return el ? el.textContent.replace(/^[^\p{L}\p{N}]+/u, "").trim().slice(0, 160) : ""; };
        out.push({ turma: t, data: data, titulo: pseudo(limpa(c.querySelector(".em .ed"))), assunto: pseudo(limpa(c.querySelector(".ch-i"))), horario: limpa(c.querySelector(".ch-h")) });
      });
    });
    return out;
  }

  function montarApi(A, S) {
    var usuario = S.auth.currentUser() || { id: "admin", email: "", nome: "" };
    function estrutura() {
      return {
        perfil: { nome: usuario.nome || "Paulo Roberto Ramalho Magalhães" },
        escolas: [{ id: "e", nome: ESCOLA }],
        turmas: A.turmas.map(function (t) {
          return {
            id: t, nome: A.rotulo(t), escolaId: "e",
            alunos: A.alunos(t).map(function (a) { var o = { n: a.n, nm: a.nm }; if (a.tr) o.tr = true; return o; }),
            disciplinas: A.disciplinas(t).map(function (n) { return { id: A.codigoDisc(n, t) || slug(n), nome: n, metaBim: 10, total: 40 }; })
          };
        })
      };
    }
    return {
      contexto: CONTEXTO,
      nomePlataforma: "do Relatório da " + ESCOLA,
      acoes: ["criar_diario", "editar_diario"],
      boasVindas: "👋 Olá, professor! Aqui eu <strong>registro e corrijo diários</strong> da " + ESCOLA + ", leio <strong>fotos do caderno de chamada</strong>, PDFs e documentos, e respondo sobre as suas turmas e os relatos já escritos.<br>Escreva abaixo, envie um arquivo 📎 ou tire uma foto 📷. Nada muda no diário sem a sua confirmação.",
      sugestoes: [
        ["📝 Registrar a aula de hoje", "Registre a aula de hoje: turma , disciplina , das  às . Conteúdo: . Faltaram: ."],
        ["📷 Faltas pela foto da chamada", "Leia a foto da chamada e registre a aula de hoje da turma , disciplina , com as faltas marcadas."],
        ["✏️ Corrigir um diário", "No diário de  da turma , corrija: "],
        ["📊 Resumo da semana", "Faça um resumo desta semana: aulas registradas por turma, faltas e ocorrências."],
        ["🧭 O que falta registrar", "Olhando os relatos e diários, quais turmas estão há mais tempo sem registro?"]
      ],
      notaDados: "OBSERVAÇÃO: \"diarios_recentes\" são os diários criados pelo botão + Novo Diário ou pela I.A (podem ser alterados com editar_diario, pelo id). \"relatos_da_pagina\" são relatos escritos à mão no HTML: servem de contexto e NÃO podem ser alterados por ações."
        + (A.comHoras ? "" : " Nesta escola a carga horária é contada pelo horário da aula (início e fim): informe sempre \"inicio\" e \"fim\" ao criar diários."),
      esc: esc, toast: toast, slug: slug,
      dataBr: function (k) { return k.slice(8, 10) + "/" + k.slice(5, 7) + "/" + k.slice(0, 4); },
      MESES: MESES,
      usuario: function () { return usuario; },
      estrutura: estrutura,
      turma: function (id) { return estrutura().turmas.filter(function (t) { return t.id === id; })[0] || null; },
      escola: function (id) { return id === "e" ? { id: "e", nome: ESCOLA } : null; },
      diarios: function () { return window.NovoDiario.diarios(); },
      resumoExtra: function (pseudo) { return resumoDaPagina(A, pseudo); },
      status: function () {},
      sync: function () { return S; }
    };
  }

  function iniciar() {
    var S = window.RelatorioSupabaseSync, ND = window.NovoDiario;
    var mod = (window.MD_MODULOS || []).filter(function (m) { return m.nome === "ia"; })[0];
    if (!S || !ND || !mod) { setTimeout(iniciar, 200); return; }
    S.auth.whenAuthorized().then(function () {
      var tentativas = 0;
      (function esperarAdaptador() {
        var A = ND.adaptador && ND.adaptador();
        if (!A) { if (++tentativas < 150) setTimeout(esperarAdaptador, 200); return; }
        var partes = criarAba();
        mod.iniciar(montarApi(A, S));
        mod.desenhar();
        if (partes && partes.botao) partes.botao.addEventListener("click", function () { if (mod.aoAbrir) mod.aoAbrir("ia"); });
      })();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
