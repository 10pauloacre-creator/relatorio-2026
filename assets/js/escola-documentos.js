// ═══════════════════════════════════════════════════════════════════════
// escola-documentos.js — aba 📁 Documentos nas escolas do administrador
// (Casavequia e Hermínio), com o mesmo módulo do Meu Diário
// (meu-diario-documentos.js). O botão "🗂 Sequências" vira "📁 Documentos".
//
// Os documentos ficam no mesmo escopo do Meu Diário (professor_dados,
// "meu-diario:documentos:v1"), separados por escolaId = "casavequia" |
// "herminio". As sequências antigas da página (localStorage cl_seq_* /
// rh_seq_*) entram uma vez em Documentos › Sequências, com id fixo.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var herminio = typeof ALUNOS_RH !== "undefined";
  var CONTEXTO = herminio ? "herminio" : "casavequia";
  var ESCOLA = herminio ? "E.E. Raimundo Hermínio de Melo" : "E.E. Rural Pe. Carlos Casavequia";
  var ALVO = herminio ? "sec-docs" : "docs";

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function slug(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10) || "d"; }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function novoId(p) { return p + Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-3); }
  function toast(msg) {
    var t = document.createElement("div"); t.className = "md-toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800);
  }

  // Visual do Meu Diário, só dentro da aba e das janelas dela.
  var CSS = ""
    + "#sec-docs,.md-ov{--md-sup:#fff;--md-sup2:#faf8f2;--md-sup3:#f5f3ee;--md-linha:#e8e5de;--md-titulo:#1a3a2a;--md-acento:#2d6147;--md-acento-txt:#fff;--md-destaque:#2d6147}"
    + "html.dark-2026 #sec-docs,html.dark-2026 .md-ov{--md-sup:#191c1f;--md-sup2:#202327;--md-sup3:#272b30;--md-linha:#383d43;--md-titulo:#f4f5f6;--md-acento:#ffa65b;--md-acento-txt:#1b130b;--md-destaque:#ffa65b}"
    + "#sec-docs .tb{background:linear-gradient(135deg,#8c6a2a,#d8b45b);color:#fff}"
    + "html.dark-2026 #sec-docs .tb{background:#272b30;color:#ffb46f;border:1px solid #383d43}"
    + "#sec-docs .md-card{background:var(--md-sup);border-radius:14px;box-shadow:0 4px 24px rgba(26,58,42,.10);padding:18px 20px;margin-bottom:16px;color:var(--ce)}"
    + "#sec-docs .md-btn,.md-ov .md-btn{border-radius:10px;padding:10px 16px;font-weight:700;font-size:.84rem;cursor:pointer;background:var(--md-sup3);color:var(--ce);border:1px solid var(--md-linha);font-family:inherit}"
    + "#sec-docs .md-btn.pri,.md-ov .md-btn.pri{background:var(--md-acento);color:var(--md-acento-txt);border-color:var(--md-acento)}"
    + "#sec-docs .md-btn.perigo,.md-ov .md-btn.perigo{background:var(--rs);color:var(--ra);border-color:#f5c6c0}"
    + "#sec-docs .md-btn.mini,.md-ov .md-btn.mini{padding:6px 10px;font-size:.75rem;border-radius:8px}"
    + "#sec-docs .md-btn:disabled,.md-ov .md-btn:disabled{opacity:.5;cursor:not-allowed}"
    + "html.dark-2026 #sec-docs .md-btn.pri,html.dark-2026 .md-ov .md-btn.pri{background:linear-gradient(135deg,var(--dark-accent),var(--dark-accent-strong))!important;color:#151719!important;border-color:var(--dark-accent)!important}"
    + "html.dark-2026 #sec-docs .md-btn:not(.pri):not(.perigo),html.dark-2026 .md-ov .md-btn:not(.pri):not(.perigo){background:var(--md-sup2)!important;color:var(--dark-text)!important;border-color:var(--md-linha)!important}"
    + ".md-ov .md-f{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}"
    + ".md-ov .md-f label{font-size:.7rem;font-weight:700;color:var(--md-destaque);text-transform:uppercase;letter-spacing:.05em}"
    + ".md-ov .md-f input,.md-ov .md-f select,.md-ov .md-in{padding:9px 11px;border:2px solid var(--md-linha);border-radius:10px;font:inherit;font-size:.9rem;color:var(--ce);background:var(--md-sup2);width:100%}"
    + ".md-ov .md-row{display:flex;gap:8px;align-items:center;margin-bottom:6px}.md-ov .md-row .md-in{flex:1}"
    + ".md-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:14px}"
    + ".md-rel{background:var(--md-sup);color:var(--ce);border-radius:16px;max-width:760px;width:100%;max-height:94vh;overflow-y:auto;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.4);font-family:'DM Sans',sans-serif}"
    + ".md-rel h2{font-family:'Playfair Display',serif;color:var(--md-titulo)}"
    + "html.dark-2026 .md-ov{background:rgba(3,4,5,.78);backdrop-filter:blur(8px)}html.dark-2026 .md-rel{border:1px solid var(--md-linha)}"
    + ".md-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#1a3a2a;color:#fff;padding:10px 18px;border-radius:999px;font-size:.84rem;z-index:20000;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:92vw;text-align:center;font-family:'DM Sans',sans-serif}"
    + "html.dark-2026 .md-toast{background:#272b30;border:1px solid #383d43;color:#f4f5f6}";

  function abrirOverlay(html, ligar) {
    var velho = document.querySelector(".md-ov"); if (velho) velho.remove();
    var ov = document.createElement("div"); ov.className = "md-ov";
    ov.innerHTML = '<div class="md-rel" role="dialog" aria-modal="true">' + html + "</div>";
    ov.addEventListener("mousedown", function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    ov.querySelectorAll("[data-fechar]").forEach(function (f) { f.onclick = function () { ov.remove(); }; });
    if (ligar) ligar(ov);
    return ov;
  }

  // Aba da página: Casavequia usa aba('docs'), Hermínio aba('sec-docs').
  function irPara(id) {
    if (typeof window.aba !== "function") return;
    if (id === "docs") window.aba(ALVO);
    else if (id === "ia") {
      window.aba(herminio ? "sec-ia" : "ia");
      var mod = (window.MD_MODULOS || []).filter(function (m) { return m.nome === "ia"; })[0];
      if (mod && mod.aoAbrir) mod.aoAbrir("ia");
    }
  }

  // O botão "🗂 Sequências" (já na barra lateral) passa a abrir Documentos.
  function trocarBotao() {
    var bt = Array.prototype.slice.call(document.querySelectorAll(".nb")).filter(function (b) {
      return /aba\(\s*['"](sec-)?sequencias['"]/.test(b.getAttribute("onclick") || "");
    })[0];
    if (!bt) {
      bt = document.createElement("button"); bt.className = "nb"; bt.type = "button";
      bt.setAttribute("data-runtime-ui", "escola-documentos");
      var nav = document.querySelector(".nav-i"); if (nav) nav.appendChild(bt);
    }
    bt.setAttribute("onclick", "aba('" + ALVO + "',this)");
    bt.textContent = "📁 Documentos";
    var velha = document.getElementById("sec-sequencias");
    if (velha && velha.classList.contains("on")) window.aba(ALVO);
  }

  function criarSecao() {
    if (!document.getElementById("escola-docs-style")) {
      var st = document.createElement("style"); st.id = "escola-docs-style"; st.textContent = CSS;
      document.head.appendChild(st);
    }
    var sec = document.getElementById("sec-docs");
    if (sec) return sec;
    sec = document.createElement("section");
    sec.className = "sec"; sec.id = "sec-docs"; sec.setAttribute("data-runtime-ui", "escola-documentos");
    (document.querySelector("main.main") || document.querySelector("main") || document.body).appendChild(sec);
    return sec;
  }

  function montarApi(A, S) {
    var usuario = S.auth.currentUser() || { id: "admin", email: "", nome: "" };
    var ano = parseInt(document.documentElement.getAttribute("data-ano-letivo"), 10) || new Date().getFullYear();
    function estrutura() {
      return {
        perfil: { nome: usuario.nome || "Paulo Roberto Ramalho Magalhães" },
        escolas: [{ id: CONTEXTO, nome: ESCOLA }],
        turmas: A.turmas.map(function (t) {
          return {
            id: t, nome: A.rotulo(t), escolaId: CONTEXTO, alunos: [],
            disciplinas: A.disciplinas(t).map(function (n) { return { id: A.codigoDisc(n, t) || slug(n), nome: n }; })
          };
        })
      };
    }
    return {
      esc: esc, toast: toast, novoId: novoId, abrirOverlay: abrirOverlay, irPara: irPara,
      usuario: function () { return usuario; },
      estrutura: estrutura,
      turma: function (id) { return estrutura().turmas.filter(function (t) { return t.id === id; })[0] || null; },
      escolaAtual: function () { return CONTEXTO; },
      ano: function () { return ano; },
      status: function () {},
      sync: function () { return S; }
    };
  }

  // Sequências antigas da página → documentos (uma vez por aparelho).
  function sequenciasAntigas(M) {
    var discs = herminio ? (typeof RH_SEQ_DISCS !== "undefined" ? RH_SEQ_DISCS : {}) : (typeof _LIV_DISCS !== "undefined" ? _LIV_DISCS : {});
    var pre = herminio ? "rh_seq_" : "cl_seq_", sufixo = herminio ? "-sqb" : "-sb";
    var status = {}; try { status = JSON.parse(localStorage.getItem(herminio ? "rh_seq_status" : "seq_status") || "{}"); } catch (e) {}
    var ler = function (k, padrao) { try { return JSON.parse(localStorage.getItem(k) || "null") || padrao; } catch (e) { return padrao; } };
    var lista = [];
    Object.keys(discs).forEach(function (tid) {
      var t = M.turma(tid);
      (discs[tid] || []).forEach(function (dd) {
        var di = t && t.disciplinas.filter(function (x) { return norm(x.nome) === norm(dd.nm); })[0];
        for (var b = 1; b <= 4; b++) {
          var key = tid + "-" + dd.id + sufixo + b;
          var s = ler(pre + key, null), hist = ler(pre + "hist_" + key, []);
          if (!s && !hist.length) continue;
          s = s || {};
          var partes = [["Objetivo", s.objetivo], ["Ferramentas e recursos", s.ferramentas || s.recursos], ["Etapas", s.etapas], ["Observações", s.observacoes]]
            .filter(function (x) { return x[1]; }).map(function (x) { return "## " + x[0] + "\n\n" + x[1]; });
          if (s.url) partes.push("## Arquivo\n\n" + s.url);
          if (status[key]) partes.unshift("**Situação:** " + (status[key] === "concluido" ? "concluída" : "em criação"));
          if (hist.length) partes.push("## Sequências concluídas antes\n\n" + hist.map(function (h) { return "- " + (h.titulo || "Sem título") + (h.data ? " (concluída em " + h.data + ")" : ""); }).join("\n"));
          if (!s.titulo && !partes.length) continue;
          lista.push({
            id: "seq-" + CONTEXTO + "-" + key, tipo: "seq", turma: t ? tid : "", disc: di ? di.id : "", discNome: dd.nm, bim: b,
            titulo: s.titulo || "Sequência — " + dd.nm + " — " + b + "º bimestre", conteudo: partes.join("\n\n")
          });
        }
      });
    });
    return lista;
  }
  function migrar(M) {
    var marca = "md_docs_migrado_" + CONTEXTO + "_" + M.usuario().id;
    try { if (localStorage.getItem(marca)) return; } catch (e) {}
    var D = window.MeuDiarioDocumentos, tent = 0;
    (function tentar() {
      if (!D.pronto()) { if (++tent < 60) setTimeout(tentar, 1000); return; }
      var lista = sequenciasAntigas(M);
      var n = lista.length ? D.importar(lista) : 0;
      try { localStorage.setItem(marca, new Date().toISOString()); } catch (e) {}
      if (n) toast(n + " sequência(s) desta escola agora estão em 📁 Documentos › Sequências.");
    })();
  }

  function iniciar() {
    var S = window.RelatorioSupabaseSync, ND = window.NovoDiario;
    var mod = (window.MD_MODULOS || []).filter(function (m) { return m.nome === "documentos"; })[0];
    if (!S || !ND || !mod || !window.MeuDiarioDocumentos) { setTimeout(iniciar, 200); return; }
    S.auth.whenAuthorized().then(function () {
      var tentativas = 0;
      (function esperarAdaptador() {
        var A = ND.adaptador && ND.adaptador();
        if (!A) { if (++tentativas < 150) setTimeout(esperarAdaptador, 200); return; }
        criarSecao();
        trocarBotao();
        var M = montarApi(A, S);
        mod.iniciar(M);
        mod.desenhar();
        migrar(M);
      })();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
