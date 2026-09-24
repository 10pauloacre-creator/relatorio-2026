// ═══════════════════════════════════════════════════════════════════════
// frequencia-diaria.js — botão "Frequência Diária" das abas de turma
// (Casavequia, Hermínio e Meu Diário), 24/09/2026.
//
// Abre um modal no mesmo desenho de "Relatórios diários" com os filtros de
// DISCIPLINA (uma, várias ou todas), BIMESTRE (um, vários ou todos) e
// PERÍODO (tempo total ou de um dia a outro). Mostra a prévia da tabela e
// gera o relatório no formato de C:\…\modelo-frequência.html (A4 deitado,
// cabeçalho da Secretaria, rodapé AXION e assinatura do professor).
//
// REGRA DAS AULAS: 1 hora = 1 aula. Um dia com 4 h/aula da disciplina vale
// 4 aulas; quem faltou nesse dia leva 4 faltas. A coluna mostra o número:
// verde quando esteve presente, vermelho quando faltou (âmbar se a falta
// foi justificada). A última coluna traz o total de faltas do período.
//
// Cada página da conta entrega os dados por um adaptador:
//   FrequenciaDiaria.abrir({
//     turma, rotuloTurma, escola, professor, turno, ano,
//     registros(): [{ data:'AAAA-MM-DD', turma, disciplina, horas, bimestre, chave }],
//     alunos(turma): [{ n, nm, tr }],
//     estado(chave, n): 'p' | 'f' | 'j' | null,
//     ordem: ['Língua Portuguesa', …]      (opcional: ordem das disciplinas)
//   })
//
// PRESENÇA = a mesma regra que o diário mostra (25/09/2026). A página responde
// aluno por aluno com as funções dela (lista do relato + cliques na aba 👥 +
// aluno que entrou depois), então a Frequência mostra exatamente as faltas
// do diário. null = sem chamada para esse aluno nessa aula (entrou depois ou
// a aula não teve chamada): a célula fica cinza e essas aulas não contam.
// O antigo presenca(chave) → {faltaram, faltJ} ainda funciona como reserva.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var DIAS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  var COLUNAS_POR_PAGINA = 12;   // folha com Pres./Faltas/Freq. (a última)
  var COLUNAS_SEM_TOTAIS = 15;   // folhas do meio, sem as colunas de totais
  var LINHAS_POR_PAGINA = 20;
  var A = null, F = null;

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function hoje() { var d = new Date(); return d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate()); }
  function dois(n) { return ("0" + n).slice(-2); }
  function dataCurta(iso) { return String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7); }
  function dataBr(iso) { return iso ? String(iso).slice(8, 10) + "/" + String(iso).slice(5, 7) + "/" + String(iso).slice(0, 4) : ""; }
  function diaSemana(iso) { var d = new Date(iso + "T12:00:00"); return DIAS[d.getDay()] || ""; }
  function base() { return location.origin + location.pathname.replace(/[^/]*$/, ""); }

  // ── Dados ─────────────────────────────────────────────────────────────
  function registros() {
    var lista = [];
    (A.registros() || []).forEach(function (r) {
      if (!r || !r.data) return;
      if (A.turma && r.turma && r.turma !== A.turma) return;
      lista.push({
        data: r.data, turma: r.turma || A.turma, disciplina: r.disciplina || "Disciplina",
        horas: Math.max(1, parseInt(r.horas, 10) || 1),
        bimestre: String(r.bimestre || bimestrePorMes(r.data)),
        chave: r.chave || ""
      });
    });
    return lista.sort(function (a, b) { return a.data.localeCompare(b.data); });
  }
  function bimestrePorMes(iso) {
    var m = parseInt(String(iso).slice(5, 7), 10);
    return m <= 4 ? "1" : m <= 6 ? "2" : m <= 9 ? "3" : "4";
  }
  function filtrar(lista) {
    return lista.filter(function (r) {
      if (F.disciplinas.length && F.disciplinas.indexOf(r.disciplina) < 0) return false;
      if (F.bimestres.length && F.bimestres.indexOf(r.bimestre) < 0) return false;
      if (F.de && r.data < F.de) return false;
      if (F.ate && r.data > F.ate) return false;
      return true;
    });
  }
  // Estado de um aluno numa aula: 'p' | 'f' | 'j' | null (sem chamada).
  function estadoAluno(chave, n) {
    if (typeof A.estado === "function") {
      var e = A.estado(chave, n);
      return e === "p" || e === "f" || e === "j" ? e : null;
    }
    var p = (A.presenca && A.presenca(chave)) || null;
    if (!p) return null;
    if ((p.faltaram || []).indexOf(n) >= 0) return "f";
    if ((p.faltJ || []).indexOf(n) >= 0) return "j";
    return "p";
  }
  // Uma coluna por dia de aula da disciplina. A mesma aula pode vir repartida
  // em dois bimestres (Casavequia); as horas são somadas por aula (chave)
  // antes de contar as faltas, senão a falta do dia contaria duas vezes.
  // Cada aluno tem, por coluna: aulas com chamada, faltas e faltas justificadas.
  function colunas(lista, turmaAlunos) {
    var mapa = {}, aulas = {}, ordem = [];
    lista.forEach(function (r, i) {
      var id = r.data + "|" + (r.chave || "s" + i);
      var aula = aulas[id];
      if (!aula) { aula = aulas[id] = { data: r.data, chave: r.chave, horas: 0, bimestres: {} }; ordem.push(id); }
      aula.horas += r.horas;
      aula.bimestres[r.bimestre] = (aula.bimestres[r.bimestre] || 0) + r.horas;
    });
    ordem.forEach(function (id) {
      var aula = aulas[id];
      var col = mapa[aula.data];
      if (!col) col = mapa[aula.data] = { data: aula.data, horas: 0, bimestres: {}, alunos: {}, relatos: 0 };
      col.horas += aula.horas;
      col.relatos++;
      Object.keys(aula.bimestres).forEach(function (b) { col.bimestres[b] = (col.bimestres[b] || 0) + aula.bimestres[b]; });
      turmaAlunos.forEach(function (al) {
        var c = col.alunos[al.n] || (col.alunos[al.n] = { aulas: 0, faltas: 0, justificadas: 0 });
        var e = aula.chave ? estadoAluno(aula.chave, al.n) : null;
        if (!e) return;
        c.aulas += aula.horas;
        if (e === "f") c.faltas += aula.horas;
        if (e === "j") { c.faltas += aula.horas; c.justificadas += aula.horas; }
      });
    });
    return Object.keys(mapa).sort().map(function (k) {
      var col = mapa[k];
      col.bimestre = Object.keys(col.bimestres).sort(function (a, b) { return col.bimestres[b] - col.bimestres[a]; })[0] || "";
      return col;
    });
  }
  function alunos() {
    return (A.alunos(A.turma) || []).map(function (a) { return { n: a.n, nm: a.nm, tr: !!a.tr }; });
  }
  function ordemDisciplinas(nomes) {
    var ref = (A.ordem || []).map(function (x) { return String(x); });
    return nomes.sort(function (a, b) {
      var ia = ref.indexOf(a), ib = ref.indexOf(b);
      if (ia < 0) ia = 999; if (ib < 0) ib = 999;
      return ia - ib || a.localeCompare(b, "pt-BR");
    });
  }
  // Uma tabela por disciplina (cada disciplina vira um relatório próprio).
  function tabelas() {
    var lista = filtrar(registros());
    var porDisc = {};
    lista.forEach(function (r) { (porDisc[r.disciplina] = porDisc[r.disciplina] || []).push(r); });
    var nomes = ordemDisciplinas(Object.keys(porDisc));
    var turmaAlunos = alunos();
    return nomes.map(function (nome) {
      var cols = colunas(porDisc[nome], turmaAlunos);
      var linhas = turmaAlunos.map(function (al) {
        var faltas = 0, aulas = 0, just = 0;
        var celulas = cols.map(function (c) {
          var x = c.alunos[al.n] || { aulas: 0, faltas: 0, justificadas: 0 };
          faltas += x.faltas; aulas += x.aulas; just += x.justificadas;
          return { horas: c.horas, aulas: x.aulas, faltas: x.faltas, justificadas: x.justificadas };
        });
        return { n: al.n, nm: al.nm, tr: al.tr, celulas: celulas, faltas: faltas, justificadas: just, aulas: aulas, presencas: aulas - faltas };
      });
      return {
        disciplina: nome, colunas: cols, linhas: linhas,
        totalAulas: cols.reduce(function (s, c) { return s + c.horas; }, 0),
        totalFaltas: linhas.reduce(function (s, l) { return s + l.faltas; }, 0),
        bimestres: cols.map(function (c) { return c.bimestre; }).filter(function (v, i, l) { return v && l.indexOf(v) === i; }).sort()
      };
    });
  }

  // ── Estilo do modal ───────────────────────────────────────────────────
  function estilo() {
    if (document.getElementById("fd-estilo")) return;
    var s = document.createElement("style");
    s.id = "fd-estilo";
    s.setAttribute("data-runtime-ui", "frequencia");
    s.textContent = ""
      + ".fd-modal{position:fixed;inset:0;background:rgba(7,17,12,.72);z-index:12050;display:none;align-items:center;justify-content:center;padding:20px;font-family:'DM Sans',sans-serif}"
      + ".fd-modal.on{display:flex}"
      + ".fd-inner{width:min(1180px,100%);max-height:92vh;background:#faf8f2;border-radius:24px;box-shadow:0 28px 80px rgba(0,0,0,.34);display:flex;flex-direction:column;overflow:hidden;color:#2b2b2b}"
      + ".fd-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px 18px;border-bottom:1px solid #e8e5de;background:linear-gradient(135deg,rgba(26,58,42,.98),rgba(39,86,63,.94) 56%,rgba(74,148,103,.9));color:#fff}"
      + ".fd-top h3{font-family:'Playfair Display',serif;font-size:1.2rem;line-height:1.15;margin:0}"
      + ".fd-top p{margin-top:6px;font-size:.8rem;line-height:1.6;color:rgba(255,255,255,.78)}"
      + ".fd-top-acoes{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}"
      + ".fd-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:10px 16px;border:none;border-radius:999px;font:inherit;font-size:.8rem;font-weight:700;cursor:pointer;transition:transform .15s ease,filter .15s ease}"
      + ".fd-btn:hover{transform:translateY(-1px)}"
      + ".fd-btn.primary{background:linear-gradient(135deg,#c9a84c,#ecd48b);color:#43310e}"
      + ".fd-btn.ghost{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.18)}"
      + ".fd-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}"
      + ".fd-body{display:grid;grid-template-columns:minmax(280px,330px) minmax(0,1fr);min-height:0;flex:1}"
      + ".fd-lado{padding:18px;border-right:1px solid #e8e5de;background:#f6f4ee;overflow:auto}"
      + ".fd-bloco+.fd-bloco{margin-top:18px}"
      + ".fd-rotulo{font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#5a5a5a;margin-bottom:10px}"
      + ".fd-chips{display:flex;flex-wrap:wrap;gap:8px}"
      + ".fd-chip{padding:9px 13px;border-radius:12px;border:1px solid rgba(26,58,42,.12);background:#fff;color:#1a3a2a;font:inherit;font-size:.82rem;font-weight:700;cursor:pointer;transition:transform .14s ease,background .14s ease}"
      + ".fd-chip:hover{transform:translateY(-1px)}"
      + ".fd-chip.on{background:linear-gradient(135deg,#1a3a2a,#2d6147);border-color:#1a3a2a;color:#fff}"
      + ".fd-datas{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}"
      + ".fd-datas label{display:flex;flex-direction:column;gap:5px;font-size:.72rem;font-weight:700;color:#5a5a5a}"
      + ".fd-datas input{border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px;font:inherit;font-size:.86rem;color:#2b2b2b;background:#fff}"
      + ".fd-visor{display:flex;flex-direction:column;min-height:0;background:#fff}"
      + ".fd-resumo{padding:16px 20px 0}"
      + ".fd-resumo-card{border:1px solid rgba(26,58,42,.12);background:#f8faf7;border-radius:16px;padding:14px 16px}"
      + ".fd-resumo-card strong{display:block;font-family:'Playfair Display',serif;font-size:1rem;color:#1a3a2a}"
      + ".fd-resumo-card span{display:block;margin-top:6px;font-size:.8rem;line-height:1.6;color:#566157}"
      + ".fd-previa{padding:16px 20px 20px;flex:1;min-height:0;overflow:auto}"
      + ".fd-tabela-nome{font-family:'Playfair Display',serif;font-size:.98rem;color:#1a3a2a;margin:14px 0 8px}"
      + ".fd-tabela-nome:first-child{margin-top:0}"
      + ".fd-rolagem{overflow-x:auto;border:1px solid #e3e6e1;border-radius:12px}"
      + ".fd-tab{border-collapse:collapse;font-size:.76rem;width:100%}"
      + ".fd-tab th,.fd-tab td{border:1px solid #d8ddd6;padding:5px 6px;text-align:center;white-space:nowrap}"
      + ".fd-tab thead th{background:#eef2f7;font-weight:700;position:sticky;top:0}"
      + ".fd-tab th.fd-al,.fd-tab td.fd-al{text-align:left;min-width:170px;position:sticky;left:0;background:#fff;z-index:1}"
      + ".fd-tab thead th.fd-al{background:#eef2f7;z-index:2}"
      + ".fd-tab td.p{background:#dcfce7;color:#166534;font-weight:800}"
      + ".fd-tab td.f{background:#fee2e2;color:#991b1b;font-weight:800}"
      + ".fd-tab td.j{background:#fef3c7;color:#92400e;font-weight:800}"
      + ".fd-tab td.v{color:#94a3b8}"
      + ".fd-tab tr.tr td{opacity:.55}"
      + ".fd-bim{display:block;font-size:.6rem;letter-spacing:.04em;color:#64748b;font-weight:800}"
      + ".fd-vazio{padding:26px;text-align:center;color:#5a5a5a;font-size:.86rem;line-height:1.6}"
      + ".fd-legenda{display:flex;gap:14px;flex-wrap:wrap;font-size:.74rem;color:#566157;margin-top:10px}"
      + ".fd-legenda i{width:10px;height:10px;display:inline-block;border:1px solid #94a3b8;margin-right:5px;vertical-align:-1px}"
      + "html.dark-2026 .fd-inner{background:#191c1f;color:#e9eaec}"
      + "html.dark-2026 .fd-top{background:linear-gradient(135deg,#15181b,#1d2024)!important;border-bottom-color:#383d43}"
      + "html.dark-2026 .fd-lado{background:#202327;border-right-color:#383d43}"
      + "html.dark-2026 .fd-visor{background:#191c1f}"
      + "html.dark-2026 .fd-chip{background:#272b30;border-color:#383d43;color:#e9eaec}"
      + "html.dark-2026 .fd-chip.on{background:linear-gradient(135deg,#ffa65b,#ff8f3a);border-color:#ffa65b;color:#151719}"
      + "html.dark-2026 .fd-btn.primary{background:linear-gradient(135deg,#ffa65b,#ff8f3a);color:#151719}"
      + "html.dark-2026 .fd-resumo-card{background:#202327;border-color:#383d43}"
      + "html.dark-2026 .fd-resumo-card strong{color:#ffb46f}"
      + "html.dark-2026 .fd-resumo-card span,html.dark-2026 .fd-rotulo,html.dark-2026 .fd-legenda,html.dark-2026 .fd-vazio{color:#aeb4bd}"
      + "html.dark-2026 .fd-datas input{background:#272b30;border-color:#383d43;color:#e9eaec}"
      + "html.dark-2026 .fd-rolagem{border-color:#383d43}"
      + "html.dark-2026 .fd-tab th,html.dark-2026 .fd-tab td{border-color:#383d43}"
      + "html.dark-2026 .fd-tab thead th{background:#272b30;color:#e9eaec}"
      + "html.dark-2026 .fd-tab th.fd-al,html.dark-2026 .fd-tab td.fd-al{background:#191c1f}"
      + "html.dark-2026 .fd-tab thead th.fd-al{background:#272b30}"
      + "html.dark-2026 .fd-tab td.p{background:rgba(34,139,84,.28);color:#9fe3bb}"
      + "html.dark-2026 .fd-tab td.f{background:rgba(185,99,93,.3);color:#ffb4ac}"
      + "html.dark-2026 .fd-tab td.j{background:rgba(194,154,91,.28);color:#f2cf94}"
      + "@media(max-width:980px){.fd-body{grid-template-columns:1fr}.fd-lado{border-right:none;border-bottom:1px solid #e8e5de}}"
      + "@media(max-width:720px){.fd-modal{padding:10px}.fd-top{padding:16px 14px;flex-direction:column}.fd-top-acoes{width:100%}.fd-btn{flex:1}.fd-lado,.fd-resumo,.fd-previa{padding-left:14px;padding-right:14px}}";
    document.head.appendChild(s);
  }

  // ── Modal ─────────────────────────────────────────────────────────────
  function modal() {
    estilo();
    var m = document.getElementById("fd-modal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "fd-modal";
    m.className = "fd-modal";
    m.setAttribute("data-runtime-ui", "frequencia");
    m.innerHTML = '<div class="fd-inner"><div class="fd-top"><div><h3 id="fd-titulo">Frequência Diária</h3>'
      + '<p id="fd-sub">Escolha a disciplina, o bimestre e o período. 1 hora de aula = 1 aula.</p></div>'
      + '<div class="fd-top-acoes"><button type="button" class="fd-btn primary" id="fd-gerar">📄 Gerar relatório</button>'
      + '<button type="button" class="fd-btn ghost" id="fd-fechar">Fechar</button></div></div>'
      + '<div class="fd-body"><aside class="fd-lado">'
      + '<div class="fd-bloco"><div class="fd-rotulo">Disciplinas</div><div class="fd-chips" id="fd-disc"></div></div>'
      + '<div class="fd-bloco"><div class="fd-rotulo">Bimestres</div><div class="fd-chips" id="fd-bim"></div></div>'
      + '<div class="fd-bloco"><div class="fd-rotulo">Período</div><div class="fd-chips" id="fd-periodo">'
      + '<button type="button" class="fd-chip on" data-periodo="total">Tempo total</button>'
      + '<button type="button" class="fd-chip" data-periodo="intervalo">Escolher datas</button></div>'
      + '<div class="fd-datas" id="fd-datas" hidden><label><span>De</span><input type="date" id="fd-de"></label>'
      + '<label><span>Até</span><input type="date" id="fd-ate"></label></div></div></aside>'
      + '<section class="fd-visor"><div class="fd-resumo"><div class="fd-resumo-card"><strong id="fd-resumo-titulo">Prévia</strong><span id="fd-resumo-copy"></span>'
      + '<div class="fd-legenda"><span><i style="background:#dcfce7"></i>Presente (nº de aulas)</span><span><i style="background:#fee2e2"></i>Falta (nº de faltas)</span><span><i style="background:#fef3c7"></i>Falta justificada</span></div></div></div>'
      + '<div class="fd-previa" id="fd-previa"></div></section></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function (e) { if (e.target === m) fechar(); });
    m.querySelector("#fd-fechar").onclick = fechar;
    m.querySelector("#fd-gerar").onclick = gerar;
    m.querySelectorAll("[data-periodo]").forEach(function (b) {
      b.onclick = function () {
        F.periodo = b.getAttribute("data-periodo");
        document.getElementById("fd-datas").hidden = F.periodo !== "intervalo";
        if (F.periodo === "total") { F.de = ""; F.ate = ""; }
        else { F.de = document.getElementById("fd-de").value; F.ate = document.getElementById("fd-ate").value; }
        desenhar();
      };
    });
    ["fd-de", "fd-ate"].forEach(function (id) {
      m.querySelector("#" + id).onchange = function () {
        F.de = document.getElementById("fd-de").value;
        F.ate = document.getElementById("fd-ate").value;
        desenhar();
      };
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fechar(); });
    return m;
  }
  function fechar() { var m = document.getElementById("fd-modal"); if (m) m.classList.remove("on"); }

  function desenhar() {
    var m = document.getElementById("fd-modal");
    var todos = registros();
    var discs = todos.map(function (r) { return r.disciplina; }).filter(function (v, i, l) { return l.indexOf(v) === i; }).sort();
    var bims = todos.map(function (r) { return r.bimestre; }).filter(function (v, i, l) { return l.indexOf(v) === i; }).sort();

    m.querySelector("#fd-disc").innerHTML = '<button type="button" class="fd-chip' + (F.disciplinas.length ? "" : " on") + '" data-d="">Todas</button>'
      + discs.map(function (d) { return '<button type="button" class="fd-chip' + (F.disciplinas.indexOf(d) >= 0 ? " on" : "") + '" data-d="' + esc(d) + '">' + esc(d) + "</button>"; }).join("");
    m.querySelector("#fd-bim").innerHTML = '<button type="button" class="fd-chip' + (F.bimestres.length ? "" : " on") + '" data-b="">Todos</button>'
      + bims.map(function (b) { return '<button type="button" class="fd-chip' + (F.bimestres.indexOf(b) >= 0 ? " on" : "") + '" data-b="' + esc(b) + '">' + esc(b) + "º bimestre</button>"; }).join("");
    m.querySelectorAll("#fd-disc [data-d]").forEach(function (b) { b.onclick = function () { alternar(F.disciplinas, b.getAttribute("data-d")); desenhar(); }; });
    m.querySelectorAll("#fd-bim [data-b]").forEach(function (b) { b.onclick = function () { alternar(F.bimestres, b.getAttribute("data-b")); desenhar(); }; });
    m.querySelectorAll("#fd-periodo [data-periodo]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-periodo") === F.periodo); });
    if (todos.length) {
      var de = m.querySelector("#fd-de"), ate = m.querySelector("#fd-ate");
      de.min = ate.min = todos[0].data; de.max = ate.max = todos[todos.length - 1].data;
      if (!de.value) de.value = todos[0].data;
      if (!ate.value) ate.value = todos[todos.length - 1].data;
    }

    var tabs = tabelas();
    var totalDatas = tabs.reduce(function (s, t) { return s + t.colunas.length; }, 0);
    var totalAulas = tabs.reduce(function (s, t) { return s + t.totalAulas; }, 0);
    m.querySelector("#fd-resumo-titulo").textContent = (A.rotuloTurma || "Turma") + " · " + (tabs.length ? tabs.map(function (t) { return t.disciplina; }).join(" · ") : "sem disciplina");
    m.querySelector("#fd-resumo-copy").textContent = tabs.length
      ? totalDatas + " dia(s) de aula · " + totalAulas + " aula(s) · " + alunos().length + " alunos · "
        + (F.periodo === "intervalo" && (F.de || F.ate) ? "de " + dataBr(F.de) + " a " + dataBr(F.ate) : "tempo total")
        + (tabs.length > 1 ? " · " + tabs.length + " relatórios em sequência (um por disciplina)" : "")
        + " · " + tabs.reduce(function (s, t) { return s + t.totalFaltas; }, 0) + " falta(s) no período"
      : "Nenhuma aula registrada com esses filtros.";
    m.querySelector("#fd-gerar").disabled = !tabs.length;
    m.querySelector("#fd-previa").innerHTML = tabs.length ? tabs.map(previaTabela).join("") : '<div class="fd-vazio">Nenhuma aula lançada com esses filtros.<br>Troque a disciplina, o bimestre ou o período.</div>';
  }
  function alternar(lista, valor) {
    if (!valor) { lista.length = 0; return; }
    var i = lista.indexOf(valor);
    if (i >= 0) lista.splice(i, 1); else lista.push(valor);
  }
  function previaTabela(t) {
    var cab = t.colunas.map(function (c) {
      return '<th title="' + dataBr(c.data) + " · " + c.horas + ' aula(s)"><span class="fd-bim">' + (c.bimestre ? c.bimestre + "º bim" : "&nbsp;") + "</span>" + dataCurta(c.data) + "</th>";
    }).join("");
    var corpo = t.linhas.map(function (l) {
      return '<tr class="' + (l.tr ? "tr" : "") + '"><td class="fd-al">' + l.n + ". " + esc(l.nm) + (l.tr ? " (transf.)" : "") + "</td>"
        + l.celulas.map(celula).join("")
        + "<td>" + l.presencas + "</td><td><b>" + l.faltas + "</b>" + (l.justificadas ? ' <small title="justificadas">(' + l.justificadas + " j)</small>" : "") + "</td><td>" + freq(l) + "</td></tr>";
    }).join("");
    return '<h4 class="fd-tabela-nome">' + esc(t.disciplina) + " — " + t.colunas.length + " dia(s), " + t.totalAulas + " aula(s), " + t.totalFaltas + " falta(s)</h4>"
      + '<div class="fd-rolagem"><table class="fd-tab"><thead><tr><th class="fd-al">Aluno(a)</th>' + cab
      + "<th>Pres.</th><th>Faltas</th><th>Freq.</th></tr></thead><tbody>" + corpo + "</tbody></table></div>";
  }
  // Classe e número de uma célula (prévia, documento e Excel usam a mesma regra).
  function tipoCelula(c) {
    if (!c.aulas) return { cls: "v", txt: "–", dica: "sem chamada para este aluno" };
    if (c.faltas > 0) {
      var todas = c.justificadas >= c.faltas;
      var dica = c.faltas + " falta(s) de " + c.aulas + " aula(s)" + (c.justificadas ? " · " + c.justificadas + " justificada(s)" : "");
      return { cls: todas ? "j" : "f", txt: String(c.faltas), dica: dica, parcialJ: !!c.justificadas && !todas };
    }
    return { cls: "p", txt: String(c.aulas), dica: c.aulas + " aula(s) presente" };
  }
  function celula(c) {
    var t = tipoCelula(c);
    return '<td class="' + t.cls + '" title="' + t.dica + '">' + t.txt + (t.parcialJ ? "<sup>j</sup>" : "") + "</td>";
  }
  function freq(l) { return l.aulas ? Math.round((l.aulas - l.faltas) / l.aulas * 100) + "%" : "—"; }

  // ── Relatório (modelo do professor) ───────────────────────────────────
  // O documento leva os dados (DADOS) e um script próprio (appDoc) que monta
  // as folhas: cada disciplina começa numa folha nova, as datas seguem de uma
  // folha para a outra e Pres./Faltas/Freq. só aparecem depois da última aula.
  // Em ✏️ Editar, como no modelo do professor: clicar na célula alterna
  // presença → falta → falta justificada → sem chamada; + Aluno, excluir
  // aluno (✕), adicionar período de datas, definir bimestre, remover data e
  // limpar marcações; nomes e campos do cabeçalho editáveis. Imprimir e Salvar
  // HTML levam as edições.
  function documento(tabs) {
    var img = base() + "assets/img/frequencia/";
    var dados = {
      cfg: {
        cols: COLUNAS_POR_PAGINA, colsMeio: COLUNAS_SEM_TOTAIS, linhas: LINHAS_POR_PAGINA,
        img: { cab: img + "cabecalho.webp", ass: img + "assinatura.webp", rod: img + "rodape.webp" }
      },
      meta: {
        escola: A.escola || "", professor: A.professor || "", turma: A.rotuloTurma || "", turno: A.turno || "",
        periodo: F.periodo === "intervalo" && (F.de || F.ate) ? dataBr(F.de) + " a " + dataBr(F.ate) : "Tempo total",
        emitido: dataBr(hoje())
      },
      disc: tabs.map(function (t) {
        return {
          nome: t.disciplina,
          colunas: t.colunas.map(function (c) { return { data: c.data, horas: c.horas, bim: c.bimestre || "" }; }),
          alunos: t.linhas.map(function (l) {
            return { n: l.n, nm: l.nm, tr: !!l.tr, cel: l.celulas.map(function (c) { return [c.aulas, c.faltas, c.justificadas]; }) };
          })
        };
      })
    };
    var nome = "frequencia-" + (A.rotuloTurma || "turma").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-") + "-" + hoje();
    var json = JSON.stringify(dados).replace(/</g, "\\u003c");
    return "<!doctype html>\n<html lang=\"pt-BR\"><head><meta charset=\"utf-8\">"
      + '<meta name="viewport" content="width=device-width, initial-scale=1">'
      + "<title>Relatório de Frequência Diária — " + esc(dados.meta.turma) + "</title><style>" + cssDoc() + "</style></head><body>"
      + '<div class="toolbar"><strong id="titulo-barra">Frequência Diária</strong>'
      + '<button type="button" id="bt-editar" onclick="editar()">✏️ Editar</button>'
      + '<button type="button" onclick="imprimir()">🖨️ Imprimir / PDF</button>'
      + '<button type="button" onclick="baixarHtml()">🌐 Salvar HTML</button>'
      + '<button type="button" onclick="compartilhar()">🔗 Compartilhar</button></div>'
      + '<div class="aviso-edicao" id="aviso-edicao" hidden>Modo de edição: clique nas células para alternar presença → falta → falta justificada → sem chamada. Clique nos nomes e nos campos do cabeçalho para editar. Imprimir/PDF e Salvar HTML levam as alterações.</div>'
      + '<div class="barra-edicao" id="barra-edicao" hidden>'
      + '<label>Relatório: <select id="ed-disc"></select></label>'
      + '<button type="button" data-acao="aluno">+ Aluno</button>'
      + '<button type="button" data-acao="periodo">Adicionar período</button>'
      + '<button type="button" data-acao="bimestre">Definir bimestre</button>'
      + '<button type="button" data-acao="remdata">Remover data</button>'
      + '<button type="button" data-acao="limpar">Limpar marcações</button></div>'
      + '<nav class="indice" id="indice" hidden></nav><div id="paginas"></div>'
      + '<div class="painel-fundo" id="painel" hidden><section class="painel" role="dialog" aria-modal="true">'
      + '<div class="painel-cab"><strong id="painel-titulo"></strong><button type="button" class="painel-x" data-fechar>×</button></div>'
      + '<div id="painel-corpo"></div><div class="painel-acoes" id="painel-acoes"></div></section></div>'
      + "<script>var NOME=" + JSON.stringify(nome) + ";var DADOS=" + json + ";(" + String(appDoc) + ")();<\/script></body></html>";
  }

  // Script da janela do relatório. Roda lá (não usa nada deste módulo).
  function appDoc() {
    var D = DADOS, CFG = D.cfg, editando = false;
    var DIAS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    function $(id) { return document.getElementById(id); }
    function esc(v) {
      return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
    function p2(n) { return ("0" + n).slice(-2); }
    function dataCurta(iso) { return iso.slice(8, 10) + "/" + iso.slice(5, 7); }
    function dataBr(iso) { return iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : ""; }
    function diaSemana(iso) { return DIAS[new Date(iso + "T12:00:00").getDay()] || ""; }
    function isoDe(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }

    function tipo(c) {
      var a = c[0], f = c[1], j = c[2];
      if (!a) return { cls: "v", txt: "", dica: "sem chamada" };
      if (f > 0) {
        var todas = j >= f;
        return { cls: todas ? "j" : "f", txt: String(f), parcialJ: j > 0 && !todas,
          dica: f + " falta(s) de " + a + " aula(s)" + (j ? " · " + j + " justificada(s)" : "") };
      }
      return { cls: "p", txt: String(a), dica: a + " aula(s) presente" };
    }
    function totais(al) {
      var a = 0, f = 0, j = 0;
      al.cel.forEach(function (c) { a += c[0]; f += c[1]; j += c[2]; });
      return { pres: a - f, faltas: f, just: j, freq: a ? Math.round((a - f) / a * 100) + "%" : "—" };
    }
    function carga(d) { return d.colunas.reduce(function (s, c) { return s + (+c.horas || 0); }, 0); }

    // Folhas de uma disciplina: blocos de datas (repartidos por igual; a última
    // com as colunas de totais) × blocos de alunos (partes iguais).
    function paginas(d) {
      var total = d.colunas.length;
      var nb = total <= CFG.cols ? 1 : 1 + Math.ceil((total - CFG.cols) / CFG.colsMeio);
      var ultimo = Math.min(CFG.cols, Math.ceil(total / nb));
      var meio = nb > 1 ? total - ultimo : 0, tam = [], b;
      for (b = 0; b < nb - 1; b++) tam.push(Math.floor(meio / (nb - 1)) + (b < meio % (nb - 1) ? 1 : 0));
      tam.push(total - meio);
      var blocos = [], i = 0;
      if (!total) blocos.push({ ci: 0, cn: 0 });
      tam.forEach(function (t) { if (t) { blocos.push({ ci: i, cn: t }); i += t; } });
      var n = d.alunos.length, partes = Math.max(1, Math.ceil(n / CFG.linhas));
      var porParte = Math.max(1, Math.ceil(n / partes)), lin = [], k;
      for (k = 0; k < Math.max(n, 1); k += porParte) lin.push({ ai: k, af: Math.min(n, k + porParte) });
      var out = [];
      blocos.forEach(function (bc, ic) {
        lin.forEach(function (bl, il) {
          out.push({ ci: bc.ci, cn: bc.cn, ai: bl.ai, af: bl.af, bd: ic + 1, tbd: blocos.length,
            ba: il + 1, tba: lin.length, comTotais: ic === blocos.length - 1 });
        });
      });
      out.forEach(function (p, x) { p.indice = x; p.total = out.length; p.ultima = x === out.length - 1; });
      return out;
    }
    function campo(rotulo, valor, chave) {
      return '<div class="field"><span class="label">' + esc(rotulo) + ':</span><span class="editable"'
        + (chave ? ' data-campo="' + chave + '"' : "") + ">" + esc(valor || "") + "</span></div>";
    }
    function pagina(d, di, p, numero, totalDoc) {
      var cols = d.colunas.slice(p.ci, p.ci + p.cn);
      var cab = cols.map(function (c) {
        return '<th class="date-col" data-bimester="' + esc(c.bim) + '"><div class="date-head"><span class="bimester-badge">'
          + (c.bim ? c.bim + "º BIM" : "") + "</span><span>" + dataCurta(c.data) + "</span><small>" + diaSemana(c.data) + " · " + c.horas + "h</small></div></th>";
      }).join("");
      var corpo = "";
      for (var ai = p.ai; ai < p.af; ai++) {
        var al = d.alunos[ai], tt = totais(al);
        var celulas = cols.map(function (c, x) {
          var ci = p.ci + x, tp = tipo(al.cel[ci] || [0, 0, 0]), ref = ' data-c="' + di + "." + ai + "." + ci + '" title="' + tp.dica + '"';
          if (tp.cls === "v") return '<td class="attendance empty"' + ref + "></td>";
          if (tp.cls === "p") return '<td class="attendance present"' + ref + ">" + tp.txt + "</td>";
          return '<td class="attendance absent' + (tp.cls === "j" ? " justified" : "") + '"' + ref + ">" + tp.txt + (tp.cls === "j" || tp.parcialJ ? "<sup>j</sup>" : "") + "</td>";
        }).join("");
        corpo += "<tr" + (al.tr ? ' class="transferido"' : "") + '><td class="num">' + al.n + '</td><td class="student">'
          + '<span class="nome" data-campo="nome.' + di + "." + ai + '">' + esc(al.nm) + "</span>" + (al.tr ? " <em>(transferido)</em>" : "")
          + '<button type="button" class="rm" data-rm="' + di + "." + ai + '" title="Excluir aluno">✕</button></td>' + celulas
          + (p.comTotais ? '<td class="total">' + tt.pres + '</td><td class="total"><strong>' + tt.faltas + "</strong>"
            + (tt.just ? '<small class="just">' + tt.just + " j</small>" : "") + '</td><td class="percent">' + tt.freq + "</td>" : "")
          + "</tr>";
      }
      var datas = cols.length ? dataBr(cols[0].data) + (cols.length > 1 ? " a " + dataBr(cols[cols.length - 1].data) : "") : "";
      var bims = cols.map(function (c) { return c.bim; }).filter(function (v, i, l) { return v && l.indexOf(v) === i; }).sort();
      var parteTxt = [];
      if (p.tbd > 1) parteTxt.push("datas " + p.bd + "/" + p.tbd);
      if (p.tba > 1 && p.af > p.ai) parteTxt.push("alunos " + d.alunos[p.ai].n + "–" + d.alunos[p.af - 1].n);
      return '<main class="page' + (p.indice === 0 ? " inicio-disciplina" : "") + '" data-disciplina="' + esc(d.nome) + '">'
        + '<header class="header"><img src="' + CFG.img.cab + '" alt="Secretaria de Estado de Educação">'
        + '<div class="header-text"><div class="main">Secretaria de Estado de<br>Educação, Cultura e Esportes</div>'
        + '<div class="sub">Diretoria de Ensino</div><div class="sub">Departamento de Educação Básica</div><div class="sub">Divisão de Ensino</div></div></header>'
        + '<section class="title"><h1>Relatório de Frequência Diária</h1><p>' + esc(d.nome)
        + (D.disc.length > 1 ? " · relatório " + (di + 1) + " de " + D.disc.length : "")
        + (p.total > 1 ? " · folha " + (p.indice + 1) + " de " + p.total + (parteTxt.length ? " (" + parteTxt.join(", ") + ")" : "") : "")
        + " · 1 hora de aula = 1 aula</p></section>"
        + '<section class="meta">'
        + campo("Unidade escolar", D.meta.escola, "meta.escola") + campo("Professor", D.meta.professor, "meta.professor")
        + campo("Disciplina", d.nome, "disc." + di) + campo("Turma", D.meta.turma, "meta.turma")
        + campo("Turno", D.meta.turno, "meta.turno")
        + campo("Período/Bimestre", (datas || D.meta.periodo) + (bims.length ? " · " + bims.join("º, ") + "º bim" : ""))
        + campo("Emitido em", D.meta.emitido, "meta.emitido")
        + campo("Carga do período", carga(d) + " aulas em " + d.colunas.length + " dias")
        + "</section>"
        + '<div class="legend"><span><i class="p"></i>Presença (nº de aulas)</span><span><i class="f"></i>Falta (nº de faltas)</span><span><i class="j"></i>Falta justificada (j)</span><span><i class="v"></i>Sem chamada</span></div>'
        + '<div class="table-wrap"><table><thead><tr><th class="num">Nº</th><th class="student">Aluno(a)</th>' + cab
        + (p.comTotais ? '<th class="total">Pres.</th><th class="total">Faltas</th><th class="percent">Freq.</th>' : "")
        + "</tr></thead><tbody>" + corpo + "</tbody></table></div>"
        + (p.comTotais ? "" : '<p class="continua">As datas continuam na folha seguinte; os totais aparecem depois da última aula.</p>')
        + (p.ultima ? '<section class="signature"><div class="signature-block"><img src="' + CFG.img.ass + '" alt="">'
          + '<div class="signature-line"><strong>' + esc(D.meta.professor) + "</strong><span>Professor</span></div></div></section>" : "")
        + '<footer class="page-footer"><img src="' + CFG.img.rod + '" alt="AXION PROEDUQ">'
        + '<div class="page-footer-text"><strong>Ferramenta de apoio educacional AXION PROEDUQ.</strong><br>'
        + "Gerado pelo RELATORIO SKIN a partir das chamadas dos diários de aula. Pres., Faltas e Freq. somam todo o período e aparecem após a última aula.</div>"
        + '<div class="page-number">Página ' + numero + " de " + totalDoc + "</div></footer></main>";
    }

    function render() {
      var planos = D.disc.map(paginas), totalDoc = 0, html = "", numero = 0, inicio = 1, idx = [];
      planos.forEach(function (p) { totalDoc += p.length; });
      planos.forEach(function (ps, di) {
        idx.push(esc(D.disc[di].nome) + " (pág. " + inicio + (ps.length > 1 ? "–" + (inicio + ps.length - 1) : "") + ")");
        inicio += ps.length;
        ps.forEach(function (p) { numero++; html += pagina(D.disc[di], di, p, numero, totalDoc); });
      });
      $("paginas").innerHTML = html;
      $("indice").hidden = D.disc.length < 2;
      $("indice").innerHTML = "<b>" + D.disc.length + " relatórios neste documento, em sequência:</b> " + idx.join(" · ");
      $("titulo-barra").textContent = "Frequência Diária · " + D.meta.turma + " · " + D.meta.periodo + " · " + totalDoc + " página(s)";
      var sel = $("ed-disc"), atual = sel.value;
      sel.innerHTML = D.disc.map(function (d, i) { return '<option value="' + i + '">' + esc(d.nome) + "</option>"; }).join("");
      if (atual && +atual < D.disc.length) sel.value = atual;
      marcarEdicao();
    }
    function marcarEdicao() {
      document.body.classList.toggle("editando", editando);
      [].forEach.call(document.querySelectorAll("[data-campo]"), function (e) {
        if (editando) e.setAttribute("contenteditable", "true"); else e.removeAttribute("contenteditable");
      });
      $("aviso-edicao").hidden = !editando;
      $("barra-edicao").hidden = !editando;
      $("bt-editar").textContent = editando ? "✓ Concluir edição" : "✏️ Editar";
    }
    function discAtual() { return D.disc[+$("ed-disc").value || 0]; }

    // Campos editáveis: grava no DADOS e copia para as outras folhas.
    document.addEventListener("input", function (ev) {
      var el = ev.target.closest && ev.target.closest("[data-campo]");
      if (!el) return;
      var chave = el.getAttribute("data-campo"), k = chave.split("."), v = el.textContent.replace(/\s+/g, " ").trim();
      if (k[0] === "meta") D.meta[k[1]] = v;
      else if (k[0] === "disc") D.disc[+k[1]].nome = v;
      else if (k[0] === "nome") D.disc[+k[1]].alunos[+k[2]].nm = v;
      [].forEach.call(document.querySelectorAll('[data-campo="' + chave + '"]'), function (o) { if (o !== el) o.textContent = el.textContent; });
      if (k[0] === "meta" && k[1] === "professor") [].forEach.call(document.querySelectorAll(".signature-line strong"), function (o) { o.textContent = v; });
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && ev.target.closest && ev.target.closest("[data-campo]")) { ev.preventDefault(); ev.target.blur(); }
      if (ev.key === "Escape") fecharPainel();
    });
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t.closest("[data-fechar]") || t.id === "painel") { fecharPainel(); return; }
      var ac = t.closest("[data-acao]");
      if (ac) { acoes[ac.getAttribute("data-acao")](); return; }
      if (!editando) return;
      var rm = t.closest("[data-rm]");
      if (rm) {
        var r = rm.getAttribute("data-rm").split("."), d = D.disc[+r[0]], al = d.alunos[+r[1]];
        if (confirm("Excluir " + al.n + ". " + al.nm + " deste relatório?")) { d.alunos.splice(+r[1], 1); render(); }
        return;
      }
      var cel = t.closest("[data-c]");
      if (cel) {
        var c = cel.getAttribute("data-c").split("."), dd = D.disc[+c[0]], v = dd.alunos[+c[1]].cel[+c[2]], h = +dd.colunas[+c[2]].horas || 1;
        // presença → falta → falta justificada → sem chamada → presença
        var novo = !v[0] ? [h, 0, 0] : v[1] === 0 ? [h, h, 0] : v[2] < v[1] ? [h, h, h] : [0, 0, 0];
        dd.alunos[+c[1]].cel[+c[2]] = novo;
        render();
      }
    });

    // Painel (período, bimestre, remover data).
    function abrirPainel(titulo, corpo, botoes) {
      $("painel-titulo").textContent = titulo;
      $("painel-corpo").innerHTML = corpo;
      $("painel-acoes").innerHTML = "";
      botoes.forEach(function (b) {
        var bt = document.createElement("button");
        bt.type = "button"; bt.textContent = b.txt; if (b.principal) bt.className = "principal";
        bt.onclick = function () { if (b.fn() !== false) fecharPainel(); };
        $("painel-acoes").appendChild(bt);
      });
      $("painel").hidden = false;
    }
    function fecharPainel() { $("painel").hidden = true; }
    function opcoesDatas(d) {
      return d.colunas.map(function (c) { return '<option value="' + c.data + '">' + dataBr(c.data) + " (" + diaSemana(c.data) + ")</option>"; }).join("");
    }
    function ordenar(d) {
      var ix = d.colunas.map(function (c, i) { return i; }).sort(function (x, y) { return d.colunas[x].data.localeCompare(d.colunas[y].data); });
      d.colunas = ix.map(function (i) { return d.colunas[i]; });
      d.alunos.forEach(function (al) { al.cel = ix.map(function (i) { return al.cel[i] || [0, 0, 0]; }); });
    }
    var BIMS = '<option value="">Sem bimestre</option><option value="1">1º bimestre</option><option value="2">2º bimestre</option><option value="3">3º bimestre</option><option value="4">4º bimestre</option>';
    var acoes = {
      aluno: function () {
        var d = discAtual(), n = d.alunos.reduce(function (m, a) { return Math.max(m, +a.n || 0); }, 0) + 1;
        d.alunos.push({ n: n, nm: "Novo aluno", tr: false, cel: d.colunas.map(function () { return [0, 0, 0]; }) });
        render();
        var el = document.querySelector('[data-campo="nome.' + D.disc.indexOf(d) + "." + (d.alunos.length - 1) + '"]');
        if (el) { el.scrollIntoView({ block: "center" }); el.focus(); document.execCommand && document.execCommand("selectAll", false, null); }
      },
      periodo: function () {
        var d = discAtual(), ult = d.colunas.length ? d.colunas[d.colunas.length - 1].data : isoDe(new Date());
        abrirPainel("Adicionar período de aulas — " + d.nome,
          '<div class="grade"><label>Data inicial<input type="date" id="p-ini" value="' + ult + '"></label>'
          + '<label>Data final<input type="date" id="p-fim" value="' + ult + '"></label>'
          + '<label>Aulas por dia (h/aula)<input type="number" id="p-h" min="1" max="12" value="1"></label>'
          + '<label>Bimestre<select id="p-b">' + BIMS + "</select></label></div>"
          + '<div class="linha"><label><input type="checkbox" id="p-sab"> Incluir sábados</label><label><input type="checkbox" id="p-dom"> Incluir domingos</label></div>'
          + '<p class="ajuda">De segunda a sexta as datas entram automaticamente; datas que já estão na tabela ficam como estão. As células novas começam como “sem chamada”: clique nelas para marcar.</p>',
          [{ txt: "Cancelar", fn: function () {} }, { txt: "Adicionar datas", principal: true, fn: function () {
            var ini = $("p-ini").value, fim = $("p-fim").value, h = Math.max(1, parseInt($("p-h").value, 10) || 1), bim = $("p-b").value;
            if (!ini || !fim || ini > fim) { alert("Confira a data inicial e a final."); return false; }
            var a = new Date(ini + "T12:00:00"), b = new Date(fim + "T12:00:00"), novos = 0;
            while (a <= b) {
              var dia = a.getDay(), iso = isoDe(a);
              var vale = (dia >= 1 && dia <= 5) || (dia === 6 && $("p-sab").checked) || (dia === 0 && $("p-dom").checked);
              if (vale && !d.colunas.some(function (c) { return c.data === iso; })) {
                d.colunas.push({ data: iso, horas: h, bim: bim });
                d.alunos.forEach(function (al) { al.cel.push([0, 0, 0]); });
                novos++;
              }
              a.setDate(a.getDate() + 1);
            }
            if (!novos) { alert("Nenhuma data nova nesse período."); return false; }
            ordenar(d); render();
          } }]);
      },
      bimestre: function () {
        var d = discAtual();
        if (!d.colunas.length) { alert("Adicione datas antes de definir o bimestre."); return; }
        abrirPainel("Definir bimestre — " + d.nome,
          '<div class="grade"><label>Data inicial<select id="b-ini">' + opcoesDatas(d) + "</select></label>"
          + '<label>Data final<select id="b-fim">' + opcoesDatas(d) + "</select></label>"
          + '<label>Bimestre<select id="b-b">' + BIMS.replace('<option value="">Sem bimestre</option>', "") + "</select></label></div>"
          + '<p class="ajuda">Todas as datas entre as duas escolhidas ficam marcadas com o bimestre.</p>',
          [{ txt: "Remover marcação", fn: function () { marcarBim(d, ""); } },
           { txt: "Cancelar", fn: function () {} },
           { txt: "Aplicar bimestre", principal: true, fn: function () { marcarBim(d, $("b-b").value); } }]);
        $("b-fim").value = d.colunas[d.colunas.length - 1].data;
      },
      remdata: function () {
        var d = discAtual();
        if (!d.colunas.length) { alert("Não há datas neste relatório."); return; }
        abrirPainel("Remover data — " + d.nome,
          '<div class="grade"><label>Data<select id="r-d">' + opcoesDatas(d) + "</select></label></div>"
          + '<p class="ajuda">A coluna sai do relatório, com as marcações de todos os alunos nesse dia.</p>',
          [{ txt: "Cancelar", fn: function () {} }, { txt: "Remover", principal: true, fn: function () {
            var iso = $("r-d").value, i = d.colunas.map(function (c) { return c.data; }).indexOf(iso);
            if (i < 0) return;
            d.colunas.splice(i, 1);
            d.alunos.forEach(function (al) { al.cel.splice(i, 1); });
            render();
          } }]);
        $("r-d").value = d.colunas[d.colunas.length - 1].data;
      },
      limpar: function () {
        var d = discAtual();
        if (!confirm("Apagar todas as marcações de presença e falta de " + d.nome + "?")) return;
        d.alunos.forEach(function (al) { al.cel = al.cel.map(function () { return [0, 0, 0]; }); });
        render();
      }
    };
    function marcarBim(d, bim) {
      var a = $("b-ini").value, b = $("b-fim").value;
      if (a > b) { alert("A data inicial não pode ser depois da final."); return false; }
      d.colunas.forEach(function (c) { if (c.data >= a && c.data <= b) c.bim = bim; });
      render();
    }

    // Barra: Editar, Imprimir/PDF, Salvar HTML e Compartilhar.
    window.editar = function () { editando = !editando; if (!editando) render(); else marcarEdicao(); };
    function fecharEdicao() { if (editando) { editando = false; render(); } fecharPainel(); }
    function limpo() {
      var c = document.documentElement.cloneNode(true);
      [".toolbar", ".indice", ".aviso-edicao", ".barra-edicao", ".painel-fundo", ".rm", "script"].forEach(function (q) {
        [].forEach.call(c.querySelectorAll(q), function (e) { e.parentNode.removeChild(e); });
      });
      [].forEach.call(c.querySelectorAll("[contenteditable]"), function (e) { e.removeAttribute("contenteditable"); });
      return "<!doctype html>" + c.outerHTML;
    }
    function baixarArquivo(txt) {
      var b = new Blob([txt], { type: "text/html;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = NOME + ".html";
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }
    window.imprimir = function () { fecharEdicao(); setTimeout(function () { window.print(); }, 50); };
    window.baixarHtml = function () { fecharEdicao(); baixarArquivo(limpo()); };
    window.compartilhar = function () {
      fecharEdicao();
      var html = limpo();
      var arq = new File([html], NOME + ".html", { type: "text/html" });
      if (navigator.canShare && navigator.canShare({ files: [arq] })) return navigator.share({ files: [arq], title: document.title }).catch(function () {});
      baixarArquivo(html);
      alert("Este aparelho não compartilha arquivos direto. O HTML foi baixado: envie por e-mail ou WhatsApp.");
    };
    render();
  }

  function cssDoc() {
    return ":root{--text:#1f2937;--line:#64748b;--green:#16812a;--present-bg:#dcfce7;--present-fg:#166534;--absent-bg:#fee2e2;--absent-fg:#991b1b;--just-bg:#fef3c7;--just-fg:#92400e}"
      + "*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:var(--text);background:#eef2f6}body{font-size:10px}"
      + ".toolbar{position:sticky;top:0;z-index:10;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:9px 12px;background:#111827;color:#fff}"
      + ".toolbar strong{margin-right:auto}.toolbar button{border:0;border-radius:6px;padding:7px 10px;font-weight:700;cursor:pointer}"
      + ".page{position:relative;width:297mm;min-height:210mm;margin:12px auto;padding:7mm 9mm 22mm;background:#fff;box-shadow:0 3px 18px rgba(0,0,0,.12)}"
      + ".header{height:18mm;display:flex;align-items:center;justify-content:space-between;gap:6mm;padding-bottom:1mm;margin-bottom:1.5mm;border-bottom:1px solid var(--green)}"
      + ".header img{width:58mm;max-height:17mm;object-fit:contain;object-position:left center}"
      + ".header-text{flex:1;text-align:right;color:var(--green);font-weight:700;line-height:1.02}"
      + ".header-text .main{font-size:8.4pt;text-transform:uppercase;margin-bottom:.25mm}.header-text .sub{font-size:7.5pt}"
      + ".title{text-align:center;padding:.9mm 0 .8mm;margin-bottom:1.4mm;border-bottom:1px solid #cbd5e1}"
      + ".title h1{margin:0 0 .25mm;font-size:13px;text-transform:uppercase;letter-spacing:.2px}.title p{margin:0;color:#64748b;font-size:8.6px}"
      + ".meta{display:grid;grid-template-columns:1.3fr 1.3fr 1fr 1fr;gap:.9mm 3mm;margin-bottom:1.3mm}"
      + ".field{min-height:4.7mm;display:flex;align-items:flex-end;gap:1mm;padding:0 .6mm .65mm;border-bottom:1px solid var(--line)}"
      + ".label{font-size:8.7px;font-weight:700;color:#475569;white-space:nowrap}.editable{flex:1;min-width:10px;outline:none;font-weight:600}"
      + ".legend{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin:0 0 1.2mm;color:#475569;font-size:8.7px}"
      + ".legend i{width:9px;height:9px;border:1px solid #94a3b8;display:inline-block;vertical-align:-1px;margin-right:3px}"
      + ".legend .p{background:var(--present-bg)}.legend .f{background:var(--absent-bg)}.legend .j{background:var(--just-bg)}.legend .v{background:#f1f5f9}"
      + ".toolbar #bt-editar{background:#fde68a}.editando .toolbar #bt-editar{background:#86efac}"
      + ".aviso-edicao{position:sticky;top:44px;z-index:9;margin:0;padding:7px 12px;background:#fef3c7;color:#92400e;font-weight:700;text-align:center;font-size:12px}"
      + ".barra-edicao{position:sticky;top:44px;z-index:9;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:7px 12px;background:#fff7e0;border-bottom:1px solid #f0d58a;font-size:12px}"
      + ".barra-edicao button,.barra-edicao select{border:1px solid #cbd5e1;border-radius:6px;padding:6px 9px;font:inherit;font-weight:700;background:#fff;cursor:pointer}"
      + ".aviso-edicao{top:44px}.editando .aviso-edicao{position:static}"
      + ".rm{display:none;margin-left:4px;border:0;background:#fee2e2;color:#991b1b;border-radius:4px;font-size:9px;font-weight:800;cursor:pointer;padding:1px 5px}"
      + ".editando .rm{display:inline-block}.editando td.attendance{cursor:pointer}.editando td.attendance:hover{outline:2px solid #f59e0b;outline-offset:-2px}"
      + ".editando [contenteditable]{outline:1px dashed #f59e0b;outline-offset:1px;background:#fffbeb;cursor:text}"
      + ".painel-fundo{position:fixed;inset:0;z-index:50;background:rgba(15,23,42,.48);display:flex;align-items:center;justify-content:center;padding:20px}"
      + ".painel{width:min(520px,96vw);background:#fff;border-radius:10px;box-shadow:0 20px 50px rgba(0,0,0,.22);padding:16px;font-size:12px}"
      + ".painel-cab{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;font-size:14px}.painel-x{border:0;background:transparent;font-size:24px;cursor:pointer;color:#475569}"
      + ".painel .grade{display:grid;grid-template-columns:1fr 1fr;gap:12px}.painel label{display:flex;flex-direction:column;gap:5px;font-weight:700;color:#475569}"
      + ".painel input,.painel select{border:1px solid #cbd5e1;border-radius:6px;padding:8px 9px;font:inherit;font-size:13px;color:#111827;background:#fff}"
      + ".painel .linha{display:flex;gap:18px;flex-wrap:wrap;margin-top:12px}.painel .linha label{flex-direction:row;align-items:center;gap:6px}"
      + ".painel .ajuda{margin:12px 0 0;color:#64748b;line-height:1.35}.painel-acoes{display:flex;justify-content:flex-end;gap:8px;margin-top:15px;flex-wrap:wrap}"
      + ".painel-acoes button{border:1px solid #cbd5e1;border-radius:6px;padding:8px 11px;font-weight:700;cursor:pointer;background:#fff}.painel-acoes .principal{background:#111827;color:#fff;border-color:#111827}"
      + "[hidden]{display:none!important}"
      + ".indice{max-width:297mm;margin:12px auto 0;padding:8px 12px;background:#fff;border-left:4px solid var(--green);font-size:12px;color:#334155}"
      + ".continua{margin:1.2mm 0 0;text-align:right;font-size:8.4px;font-style:italic;color:#475569}"
      + ".page-number{flex:0 0 auto;margin-left:auto;font-size:8px;font-weight:700;color:#334155;white-space:nowrap}"
      + "td.total small.just{display:block;font-size:6.6px;color:var(--just-fg);font-weight:700}"
      + ".attendance.empty{background:#f1f5f9}"
      + ".table-wrap{width:100%;overflow-x:auto}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9px}"
      + "th,td{border:1px solid var(--line);padding:.85mm .65mm;text-align:center;vertical-align:middle}thead th{background:#eef2f7;font-weight:700}"
      + "th.num,td.num{width:8mm}th.student,td.student{width:58mm;text-align:left}th.date-col{width:14mm}th.total,td.total{width:13mm}th.percent,td.percent{width:15mm}"
      + ".date-head{display:flex;flex-direction:column;line-height:1.03}.date-head small{color:#64748b;font-size:7px;margin-top:.25mm}"
      + ".bimester-badge{display:block;margin-bottom:.45mm;font-size:6.8px;line-height:1;color:#334155;font-weight:800;letter-spacing:.15px;text-transform:uppercase;white-space:nowrap}"
      + ".attendance{font-weight:800}.attendance.empty{background:#fff;color:#94a3b8;font-weight:400}.attendance.empty::after{content:'—'}"
      + ".attendance.present{background:var(--present-bg);color:var(--present-fg)}"
      + ".attendance.absent{background:var(--absent-bg);color:var(--absent-fg)}"
      + ".attendance.absent.justified{background:var(--just-bg);color:var(--just-fg)}"
      + ".attendance sup{font-size:6px}tr.transferido{opacity:.65}tr.transferido em{font-size:7.5px;color:#64748b}"
      + ".signature{margin-bottom:10mm;break-inside:avoid;page-break-inside:avoid;display:flex;justify-content:center;margin-top:1.4mm}"
      + ".signature-block{width:74mm;text-align:center}.signature img{display:block;width:32mm;max-height:10mm;object-fit:contain;margin:0 auto -.7mm}"
      + ".signature-line{border-top:1px solid #334155;padding-top:.7mm;font-size:8.6px}.signature-line strong{display:block;font-size:9.2px}.signature-line span{color:#64748b}"
      + ".page-footer{position:absolute;left:9mm;right:9mm;bottom:6mm;margin:0;padding-top:1.2mm;border-top:1px solid #cbd5e1;display:flex;align-items:center;justify-content:center;gap:3mm;min-height:9.5mm;background:#fff}"
      + ".page-footer img{width:33mm;max-height:9mm;object-fit:contain;flex:0 0 auto}"
      + ".page-footer-text{max-width:155mm;font-size:7.6px;line-height:1.22;color:#64748b;text-align:left}.page-footer-text strong{color:#334155;font-size:8px}"
      + "@page{size:A4 landscape;margin:7mm 7mm 18mm}"
      + "@media print{html,body{background:#fff}.toolbar{display:none!important}"
      + ".page{position:static;width:auto;min-height:auto;margin:0;padding:0 0 12mm;box-shadow:none;page-break-after:always}"
      + ".indice,.aviso-edicao,.barra-edicao,.painel-fundo,.rm{display:none!important}.page{outline:none!important}"
      + ".page:last-of-type{page-break-after:auto}.table-wrap{overflow:visible}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}"
      + ".attendance,thead th{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}"
      + ".page-footer{position:fixed!important;left:7mm;right:7mm;bottom:3mm;padding-top:1mm;min-height:9mm;background:#fff;border-top:1px solid #cbd5e1;z-index:999}"
      + ".page-footer img{width:27mm;max-height:7mm}.page-footer-text{max-width:150mm;font-size:6.8px;line-height:1.15}.page-footer-text strong{font-size:7.2px}"
      + ".signature{break-inside:avoid!important;page-break-inside:avoid!important}}";
  }
  function gerar() {
    var tabs = tabelas();
    if (!tabs.length) return;
    var j = window.open("", "_blank");
    if (!j) { alert("Permita as janelas pop-up para abrir o relatório."); return; }
    j.document.open();
    j.document.write(documento(tabs));
    j.document.close();
  }

  // ── API ───────────────────────────────────────────────────────────────
  window.FrequenciaDiaria = {
    abrir: function (adaptador) {
      A = adaptador || {};
      F = { disciplinas: [], bimestres: [], periodo: "total", de: "", ate: "" };
      var m = modal();
      m.classList.add("on");
      document.getElementById("fd-titulo").textContent = "Frequência Diária — " + (A.rotuloTurma || "Turma");
      document.getElementById("fd-sub").textContent = (A.escola || "") + " · escolha disciplina, bimestre e período. 1 hora de aula = 1 aula.";
      document.getElementById("fd-datas").hidden = true;
      document.getElementById("fd-de").value = "";
      document.getElementById("fd-ate").value = "";
      desenhar();
    },
    fechar: fechar
  };
})();
