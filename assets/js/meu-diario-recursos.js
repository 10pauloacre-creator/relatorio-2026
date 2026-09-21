// ═══════════════════════════════════════════════════════════════════════
// meu-diario-recursos.js — abas 📚 Plano de Aulas, 🗂 Sequências, 📖 Livros
// e 📆 Calendário do Meu Diário (contas dos professores).
//
// Mesmo desenho das abas da Casavequia, mas tudo manual: cada professor
// monta o próprio plano, as sequências, os livros e o calendário (ou pede à
// aba 🤖 I.A, que usa a API window.MeuDiarioRecursos abaixo).
//
// PERSISTÊNCIA: professor_dados, escopo "meu-diario:recursos:v1" (só o dono)
// + cópia local. O payload inteiro vale pelo "atualizadoEm" mais novo.
//
// PLANO: turma → disciplina → bimestre → aulas. A aula fica riscada (em preto
// e branco) quando está marcada "Aplicada" ou quando um diário da mesma
// turma e disciplina tem o assunto igual ao título da aula.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var SCOPE = "meu-diario:recursos:v1";
  var CORES = ["#1a7340", "#6b21a8", "#1d4ed8", "#c2410c", "#0e7a6b", "#b45309", "#be185d", "#475569"];
  var ST_PLANO = { pl: "📅 Planj.", ap: "✓ Aplic.", pu: "⤳ Pulad." };
  var ST_LIV = { "": { ic: "📘", lbl: "Não iniciado" }, criando: { ic: "📕", lbl: "Criando" }, concluido: { ic: "📗", lbl: "Concluído" } };
  var ST_SEQ = { "": { ic: "🗂", lbl: "Não iniciado" }, criando: { ic: "📝", lbl: "Criando" }, concluido: { ic: "✅", lbl: "Concluído" } };
  var TIPOS_CAL = {
    letivo: { lbl: "Dia letivo", cor: "#1f7a4d" },
    feriado: { lbl: "Feriado", cor: "#c0392b" },
    recesso: { lbl: "Recesso / férias", cor: "#b45309" },
    avaliacao: { lbl: "Avaliação", cor: "#6b21a8" },
    reuniao: { lbl: "Reunião / conselho", cor: "#1d4ed8" },
    evento: { lbl: "Evento escolar", cor: "#0e7a6b" },
    planejamento: { lbl: "Planejamento", cor: "#475569" },
    outro: { lbl: "Outro", cor: "#7a5c10" }
  };
  var DIAS_SEM = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  var MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  var M = null, R = null, sync = null;
  var ui = { pl: { t: "", d: "", b: 1, editando: false }, seq: "", liv: "", cal: "" };

  // ── utilidades ─────────────────────────────────────────────────────
  function esc(v) { return M.esc(v); }
  function E() { return M.estrutura(); }
  function turmas() { return (E().turmas || []); }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function dois(n) { return ("0" + n).slice(-2); }
  function hojeKey() { var d = new Date(); return d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate()); }
  function dataBr(k) { return k ? k.slice(8, 10) + "/" + k.slice(5, 7) : ""; }
  function numBims(d) { var meta = Math.max(1, d.metaBim || 10), total = Math.max(meta, d.total || meta * 4); return Math.min(8, Math.max(1, Math.round(total / meta))); }
  function disc(t, id) { return (t && t.disciplinas || []).filter(function (d) { return d.id === id; })[0] || null; }
  function corDisc(t, id) { var i = (t.disciplinas || []).map(function (d) { return d.id; }).indexOf(id); return CORES[(i < 0 ? 0 : i) % CORES.length]; }
  function chave() { return Array.prototype.slice.call(arguments).join("|"); }
  // Escola aberta no Meu Diário (cada escola tem a própria página).
  function escolaAtual() { return M && M.escolaAtual ? M.escolaAtual() : ""; }
  // Eventos da escola aberta + os antigos, que não têm escola.
  function eventos() { var eid = escolaAtual(); return R.cal.eventos.filter(function (e) { return !e.escolaId || !eid || e.escolaId === eid; }); }
  // Chave "turma|disciplina|..." de uma turma visível (escola e ano letivo abertos).
  function daVista(k) { var tid = String(k).split("|")[0]; return turmas().some(function (t) { return t.id === tid; }); }
  function modal(html, ligar) { return M.abrirOverlay(html, ligar); }

  // ── dados: local + banco ───────────────────────────────────────────
  function vazio() { return { versao: 1, plano: {}, seq: {}, livros: {}, cal: { eventos: [] }, atualizadoEm: "" }; }
  function normalizar(r) {
    r = r || vazio();
    r.plano = r.plano || {}; r.seq = r.seq || {}; r.livros = r.livros || {};
    r.cal = r.cal || { eventos: [] }; r.cal.eventos = r.cal.eventos || [];
    return r;
  }
  function lsKey() { return "md_recursos_" + M.usuario().id; }
  function lerLocal() {
    try { var r = JSON.parse(localStorage.getItem(lsKey()) || "null"); if (r && r.plano) return normalizar(r); } catch (e) {}
    return vazio();
  }
  function salvar() {
    R.atualizadoEm = new Date().toISOString();
    try { localStorage.setItem(lsKey(), JSON.stringify(R)); } catch (e) {}
    if (sync) sync.pushNow("force");
    desenhar();
  }
  function aplicarRemoto(p) {
    if (!p || !p.plano) return;
    if (String(p.atualizadoEm || "") < String(R.atualizadoEm || "")) { if (sync) sync.schedulePush("local-mais-novo"); return; }
    R = normalizar(p);
    try { localStorage.setItem(lsKey(), JSON.stringify(R)); } catch (e) {}
    desenhar();
  }

  // ═══════════════════════ 📚 PLANO DE AULAS ═══════════════════════
  function planoDe(tid, did, criar) {
    var k = chave(tid, did);
    if (!R.plano[k] && criar) R.plano[k] = { bims: {} };
    return R.plano[k] || { bims: {} };
  }
  function bimDe(tid, did, b, criar) {
    var p = planoDe(tid, did, criar);
    if (!p.bims[b] && criar) p.bims[b] = { titulo: "", aulas: [] };
    return p.bims[b] || { titulo: "", aulas: [] };
  }
  // Diários por turma|disciplina, para riscar as aulas já dadas.
  function indiceDiarios() {
    var m = {};
    M.diarios().forEach(function (d) {
      var k = chave(d.turma, d.disc);
      (m[k] = m[k] || []).push({ a: norm(d.assunto), data: d.dateKey });
    });
    return m;
  }
  function aulaDada(lista, titulo) {
    var t = norm(titulo);
    if (!t || !lista) return "";
    for (var i = 0; i < lista.length; i++) {
      var a = lista[i].a;
      if (!a) continue;
      if (a === t || (a.length >= 8 && t.indexOf(a) >= 0) || (t.length >= 8 && a.indexOf(t) >= 0)) return lista[i].data;
    }
    return "";
  }

  function estiloPlano() {
    return "<style>" +
      ".pl-wrap{background:var(--md-sup);border-radius:var(--r);box-shadow:var(--ss);overflow:hidden}" +
      ".pl-head{background:#1e293b;color:#fff;padding:14px 20px}.pl-head b{font-size:1rem}.pl-head p{font-size:.78rem;opacity:.75;margin-top:2px}" +
      ".pl-mtabs{display:flex;background:#334155;overflow-x:auto}" +
      ".main-tab{padding:11px 18px;color:rgba(255,255,255,.75);cursor:pointer;white-space:nowrap;border:none;background:none;border-bottom:3px solid transparent;font-size:.86rem;font-weight:600}" +
      ".main-tab:hover{color:#fff;background:rgba(255,255,255,.08)}.main-tab.active{color:#fff;border-bottom-color:#38bdf8}" +
      ".pl-content{padding:16px}" +
      ".disc-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}" +
      ".disc-tab{padding:7px 14px;border-radius:6px;cursor:pointer;font-size:.83rem;font-weight:700;border:2px solid var(--dc);color:var(--dc);background:transparent}" +
      ".disc-tab.active{background:var(--dc);color:#fff}" +
      ".bim-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}" +
      ".bim-tab{padding:6px 13px;border-radius:999px;cursor:pointer;font-size:.78rem;font-weight:700;border:1.5px solid var(--md-linha);background:var(--md-sup2);color:var(--cm)}" +
      ".bim-tab.active{border-color:var(--dc);color:var(--dc);background:var(--md-sup)}" +
      ".bim-tab small{font-weight:500;opacity:.75;margin-left:4px}" +
      ".bim-header{background:var(--md-sup);border-radius:8px 8px 0 0;padding:12px 16px;border-left:4px solid var(--dc);display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--md-linha);border-right:1px solid var(--md-linha)}" +
      ".bim-header h3{font-size:.95rem;flex:1;min-width:180px;color:var(--md-titulo)}" +
      ".bim-header .badge{font-size:.74rem;background:var(--md-sup3);padding:2px 9px;border-radius:12px;color:var(--cm)}" +
      ".lesson-list{background:var(--md-sup);border-radius:0 0 8px 8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:14px;border:1px solid var(--md-linha);border-top:none}" +
      ".lesson-item{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--md-linha)}" +
      ".lesson-item:last-child{border-bottom:none}" +
      ".lesson-num{font-size:.7rem;font-weight:700;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:color-mix(in srgb,var(--dc) 14%,transparent);color:var(--dc)}" +
      ".lesson-text{flex:1;min-width:0}.lesson-title{font-size:.85rem;font-weight:600;color:var(--ce)}.lesson-sub{font-size:.75rem;color:var(--cm);margin-top:2px}" +
      ".lesson-dia{font-size:.68rem;color:var(--vc);font-weight:700;margin-top:2px}" +
      ".lesson-item.done{filter:grayscale(1);opacity:.55}.lesson-item.done .lesson-title{text-decoration:line-through}" +
      ".lesson-item.aval .lesson-num{background:#fef2f2;color:#b91c1c}" +
      ".lesson-actions{display:flex;gap:3px;flex-shrink:0;margin-left:auto;align-items:center}" +
      ".btn-st{padding:3px 7px;border-radius:12px;font-size:.63rem;font-weight:700;border:2px solid;cursor:pointer;background:transparent;white-space:nowrap;line-height:1.4}" +
      ".btn-st.pl{border-color:#6c3483;color:#6c3483}.btn-st.pl.on{background:#6c3483;color:#fff}" +
      ".btn-st.ap{border-color:var(--vm);color:var(--vm)}.btn-st.ap.on{background:var(--vm);color:#fff}" +
      ".btn-st.pu{border-color:var(--og);color:var(--og)}.btn-st.pu.on{background:var(--ou);color:#fff}" +
      ".btn-st.sm{border-color:var(--ai);color:var(--ai)}.btn-st.sm.on{background:var(--ai);color:#fff}" +
      ".pl-vazio{padding:26px 16px;text-align:center;color:var(--cm);font-size:.86rem}" +
      ".pl-editor textarea{min-height:260px;font-family:'DM Mono',monospace;font-size:.82rem;line-height:1.6}" +
      ".pl-ajuda{font-size:.76rem;color:var(--cm);background:var(--md-sup2);border:1px dashed var(--md-linha);border-radius:8px;padding:8px 11px;margin-bottom:10px;line-height:1.5}" +
      "html.dark-2026 .pl-head{background:#0c0e10!important;border-bottom:1px solid #383d43}" +
      "html.dark-2026 .pl-mtabs{background:#16191c!important}" +
      "html.dark-2026 .main-tab{background:transparent!important;border:none!important;border-bottom:3px solid transparent!important;color:var(--dark-muted)!important}" +
      "html.dark-2026 .main-tab.active{color:var(--dark-accent)!important;border-bottom-color:var(--dark-accent)!important;background:transparent!important}" +
      "html.dark-2026 .disc-tab{background:transparent!important;color:var(--dc)!important;border-color:var(--dc)!important;filter:brightness(1.6) saturate(.8)}" +
      "html.dark-2026 .disc-tab.active{background:var(--dark-accent-soft)!important;color:var(--dark-accent)!important;border-color:var(--dark-accent)!important;filter:none}" +
      "html.dark-2026 .bim-tab.active{color:var(--dark-accent)!important;border-color:var(--dark-accent)!important;background:var(--dark-accent-soft)!important}" +
      "html.dark-2026 .lesson-num{filter:brightness(1.7) saturate(.8)}" +
      "html.dark-2026 .lesson-dia{color:var(--dark-positive)}" +
      "html.dark-2026 .btn-st.pl{border-color:#9b59b6;color:#c39bd3}html.dark-2026 .btn-st.pl.on{background:#5a1e7a;color:#e8c8f8}" +
      "html.dark-2026 .btn-st.ap{border-color:#4a9467;color:#7fddaa}html.dark-2026 .btn-st.ap.on{background:#1a4a30;color:#7fddaa}" +
      "html.dark-2026 .btn-st.pu{border-color:#c87941;color:#f0a050}html.dark-2026 .btn-st.pu.on{background:#6b3a12;color:#ffd0a0}" +
      "html.dark-2026 .btn-st.sm{border-color:#4a7fc0;color:#75adff}html.dark-2026 .btn-st.sm.on{background:#1c2a3f;color:#9cc5ff}" +
      "@media(max-width:640px){.lesson-item{flex-wrap:wrap}.lesson-actions{width:100%;justify-content:flex-end;padding-left:36px}}" +
      "</style>";
  }

  function desenharPlano() {
    var sec = document.getElementById("sec-plano");
    if (!sec) return;
    var cab = '<div class="th"><div class="tb gz">📚</div><div class="ti"><h2>Plano de Aulas</h2><p>Planejamento anual por turma, disciplina e bimestre · a aula fica riscada quando é registrada no diário ou marcada como aplicada</p></div></div>';
    var ts = turmas().filter(function (t) { return (t.disciplinas || []).length; });
    if (!ts.length) { sec.innerHTML = cab + '<div class="md-card"><div class="md-vazio">Cadastre uma turma com disciplinas na aba ⚙️ Configurações para montar o plano.</div></div>'; return; }
    if (!ts.some(function (t) { return t.id === ui.pl.t; })) { ui.pl.t = ts[0].id; ui.pl.d = ""; }
    var t = M.turma(ui.pl.t);
    if (!disc(t, ui.pl.d)) { ui.pl.d = t.disciplinas[0].id; }
    var d = disc(t, ui.pl.d), nb = numBims(d);
    if (ui.pl.b > nb) ui.pl.b = 1;
    var cor = corDisc(t, d.id);
    var bim = bimDe(t.id, d.id, ui.pl.b, false);
    var idx = indiceDiarios()[chave(t.id, d.id)];
    var aplic = 0;
    var itens = (bim.aulas || []).map(function (a, i) {
      var dada = aulaDada(idx, a.t);
      var feita = a.st === "ap" || !!dada;
      if (feita) aplic++;
      return '<div class="lesson-item' + (feita ? " done" : "") + (a.av ? " aval" : "") + '" data-i="' + i + '">' +
        '<div class="lesson-num">' + (i + 1) + "</div>" +
        '<div class="lesson-text"><div class="lesson-title">' + esc(a.t) + (a.av ? ' <span style="font-size:.66rem;background:#b91c1c;color:#fff;padding:1px 6px;border-radius:4px">Avaliação</span>' : "") + "</div>" +
        (a.s ? '<div class="lesson-sub">' + esc(a.s) + "</div>" : "") +
        (dada ? '<div class="lesson-dia">📅 Registrada no diário em ' + dataBr(dada) + "</div>" : "") + "</div>" +
        '<div class="lesson-actions">' +
        Object.keys(ST_PLANO).map(function (k) { return '<button type="button" class="btn-st ' + k + (a.st === k ? " on" : "") + '" data-st="' + k + '">' + ST_PLANO[k] + "</button>"; }).join("") +
        '<button type="button" class="btn-st sm' + (a.sm ? " on" : "") + '" data-st="sm" title="Lançada no sistema oficial da escola">📋 Lançado</button>' +
        "</div></div>";
    }).join("");
    var bimsHtml = "";
    for (var b = 1; b <= nb; b++) {
      var bb = bimDe(t.id, d.id, b, false);
      bimsHtml += '<button type="button" class="bim-tab' + (b === ui.pl.b ? " active" : "") + '" data-bim="' + b + '">' + b + "º Bimestre<small>" + (bb.aulas || []).length + "</small></button>";
    }
    var corpo = ui.pl.editando ? editorPlano(t, d, bim) :
      '<div class="bim-header"><h3>📅 ' + ui.pl.b + "º Bimestre" + (bim.titulo ? " – " + esc(bim.titulo) : "") + '</h3><span class="badge">' + (bim.aulas || []).length + " aulas · " + aplic + " dadas</span>" +
      '<button type="button" class="md-btn mini" data-pl="editar">✏️ Editar aulas</button>' +
      '<button type="button" class="md-btn mini" data-pl="ia" title="Pedir à I.A">🤖 Montar com a I.A</button></div>' +
      '<div class="lesson-list">' + (itens || '<div class="pl-vazio">Nenhuma aula neste bimestre. Toque em <strong>✏️ Editar aulas</strong> para escrever o plano (uma aula por linha) ou peça à 🤖 I.A.</div>') + "</div>";
    sec.innerHTML = cab + estiloPlano() +
      '<div class="pl-wrap" style="--dc:' + cor + '"><div class="pl-head"><b>📚 Plano de Aulas ' + new Date().getFullYear() + " — " + esc((E().perfil && E().perfil.nome) || "") + "</b><p>" + esc(t.nome) + " · " + esc(t.disciplinas.map(function (x) { return x.nome; }).join(", ")) + "</p></div>" +
      '<div class="pl-mtabs">' + ts.map(function (x) { return '<button type="button" class="main-tab' + (x.id === t.id ? " active" : "") + '" data-tur="' + x.id + '">📖 ' + esc(x.nome) + "</button>"; }).join("") + "</div>" +
      '<div class="pl-content"><div class="disc-tabs">' + t.disciplinas.map(function (x) { return '<button type="button" class="disc-tab' + (x.id === d.id ? " active" : "") + '" style="--dc:' + corDisc(t, x.id) + '" data-disc="' + x.id + '">' + esc(x.nome) + "</button>"; }).join("") + "</div>" +
      '<div class="bim-tabs">' + bimsHtml + "</div>" + corpo + "</div></div>";
    ligarPlano(sec, t, d);
  }
  function editorPlano(t, d, bim) {
    var linhas = (bim.aulas || []).map(function (a) { return (a.av ? "[AV] " : "") + a.t + (a.s ? " | " + a.s : ""); }).join("\n");
    var outras = [];
    turmas().forEach(function (x) { (x.disciplinas || []).forEach(function (y) { if (x.id === t.id && y.id === d.id) return; if ((bimDe(x.id, y.id, ui.pl.b, false).aulas || []).length) outras.push({ v: x.id + "|" + y.id, l: x.nome + " · " + y.nome }); }); });
    return '<div class="md-card pl-editor" style="border-left:4px solid var(--dc)"><h3>✏️ ' + ui.pl.b + "º Bimestre — " + esc(d.nome) + " · " + esc(t.nome) + "</h3>" +
      '<div class="md-f"><label>Tema do bimestre</label><input type="text" data-ed="titulo" value="' + esc(bim.titulo || "") + '" placeholder="Ex.: Gêneros textuais e argumentação"></div>' +
      '<div class="pl-ajuda">Uma aula por linha. Para um detalhe, use <strong>|</strong> — ex.: <code>O que é texto? | Texto, discurso e contexto</code>. Comece com <code>[AV]</code> para marcar uma avaliação. As marcações das aulas que continuarem com o mesmo título são mantidas.</div>' +
      '<div class="md-f"><label>Aulas</label><textarea data-ed="aulas" placeholder="Aula 1&#10;Aula 2 | detalhe&#10;[AV] Avaliação bimestral">' + esc(linhas) + "</textarea></div>" +
      (outras.length ? '<div class="md-row"><select class="md-in" data-ed="copiar"><option value="">Copiar o ' + ui.pl.b + "º bimestre de outra turma…</option>" + outras.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.l) + "</option>"; }).join("") + '</select><button type="button" class="md-btn mini" data-pl="copiar">Copiar</button></div>' : "") +
      '<div class="md-row" style="margin-top:8px"><button type="button" class="md-btn pri" data-pl="salvar">💾 Salvar plano</button><button type="button" class="md-btn" data-pl="cancelar">Cancelar</button></div></div>';
  }
  function ligarPlano(sec, t, d) {
    sec.querySelectorAll("[data-tur]").forEach(function (b) { b.onclick = function () { ui.pl.t = b.getAttribute("data-tur"); ui.pl.d = ""; ui.pl.b = 1; ui.pl.editando = false; desenharPlano(); }; });
    sec.querySelectorAll("[data-disc]").forEach(function (b) { b.onclick = function () { ui.pl.d = b.getAttribute("data-disc"); ui.pl.b = 1; ui.pl.editando = false; desenharPlano(); }; });
    sec.querySelectorAll("[data-bim]").forEach(function (b) { b.onclick = function () { ui.pl.b = parseInt(b.getAttribute("data-bim"), 10); ui.pl.editando = false; desenharPlano(); }; });
    sec.querySelectorAll(".lesson-item [data-st]").forEach(function (b) {
      b.onclick = function () {
        var i = parseInt(b.closest(".lesson-item").getAttribute("data-i"), 10), st = b.getAttribute("data-st");
        var a = bimDe(t.id, d.id, ui.pl.b, true).aulas[i];
        if (!a) return;
        if (st === "sm") a.sm = !a.sm; else a.st = a.st === st ? "" : st;
        salvar();
      };
    });
    var acao = function (n) { return sec.querySelector('[data-pl="' + n + '"]'); };
    if (acao("editar")) acao("editar").onclick = function () { ui.pl.editando = true; desenharPlano(); };
    if (acao("ia")) acao("ia").onclick = function () {
      M.irPara("ia");
      if (window.MeuDiarioIA) window.MeuDiarioIA.sugerir("Monte o plano do " + ui.pl.b + "º bimestre de " + d.nome + " da turma " + t.nome + " com ");
    };
    if (acao("cancelar")) acao("cancelar").onclick = function () { ui.pl.editando = false; desenharPlano(); };
    if (acao("copiar")) acao("copiar").onclick = function () {
      var v = sec.querySelector('[data-ed="copiar"]').value; if (!v) return;
      var p = v.split("|"), origem = bimDe(p[0], p[1], ui.pl.b, false);
      sec.querySelector('[data-ed="aulas"]').value = (origem.aulas || []).map(function (a) { return (a.av ? "[AV] " : "") + a.t + (a.s ? " | " + a.s : ""); }).join("\n");
      if (!sec.querySelector('[data-ed="titulo"]').value) sec.querySelector('[data-ed="titulo"]').value = origem.titulo || "";
    };
    if (acao("salvar")) acao("salvar").onclick = function () {
      var aulas = sec.querySelector('[data-ed="aulas"]').value.split(/\n/).map(function (l) {
        l = l.replace(/^\s*(\d+[\s.)-]+)?/, "").trim(); if (!l) return null;
        var av = /^\[av\]\s*/i.test(l); l = l.replace(/^\[av\]\s*/i, "");
        var p = l.split("|");
        return { t: p[0].trim(), s: p.slice(1).join("|").trim(), av: av };
      }).filter(function (a) { return a && a.t; });
      definirBimestre(t.id, d.id, ui.pl.b, sec.querySelector('[data-ed="titulo"]').value.trim(), aulas, "substituir");
      ui.pl.editando = false;
      salvar();
      M.toast("Plano salvo.");
    };
  }
  // Troca (ou acrescenta) as aulas de um bimestre, mantendo as marcações dos títulos iguais.
  function definirBimestre(tid, did, b, titulo, aulas, modo) {
    var bim = bimDe(tid, did, b, true);
    var antigas = {};
    (bim.aulas || []).forEach(function (a) { antigas[norm(a.t)] = a; });
    var novas = (aulas || []).map(function (a) {
      var velha = antigas[norm(a.t)] || {};
      return { id: velha.id || M.novoId("a"), t: a.t, s: a.s || "", av: !!a.av, st: velha.st || "", sm: !!velha.sm };
    });
    bim.aulas = modo === "acrescentar" ? (bim.aulas || []).concat(novas.filter(function (a) { return !antigas[norm(a.t)]; })) : novas;
    if (titulo) bim.titulo = titulo;
    return bim.aulas.length;
  }

  // ═══════════════════ 🗂 SEQUÊNCIAS e 📖 LIVROS ═══════════════════
  function estiloCards() {
    return "<style>" +
      ".liv-legend{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:16px;font-size:.76rem}" +
      ".liv-leg-item{display:flex;align-items:center;gap:6px;color:var(--cm)}" +
      ".liv-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0}.liv-dot.nd{background:var(--md-linha);border:1px solid #ccc}.liv-dot.cr{background:#e87878}.liv-dot.co{background:#4a9467}" +
      ".liv-tabs{display:flex;gap:4px;margin-bottom:20px;border-bottom:2px solid var(--md-linha);overflow-x:auto}" +
      ".liv-tab{padding:9px 18px;border:none;background:transparent;font-size:.83rem;font-weight:600;color:var(--cm);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;white-space:nowrap}" +
      ".liv-tab.on{color:var(--md-destaque);border-bottom-color:var(--md-destaque)}" +
      ".liv-disc{margin-bottom:24px}" +
      ".liv-disc-h{display:flex;align-items:center;gap:9px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--cm);margin-bottom:11px;padding-bottom:7px;border-bottom:2px solid var(--md-linha)}" +
      ".liv-disc-h i{width:12px;height:12px;border-radius:3px;display:inline-block}" +
      ".liv-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}" +
      ".liv-card{border-radius:12px;padding:16px 12px;text-align:center;transition:all .22s;cursor:pointer;border:2px solid var(--md-linha);background:var(--md-sup2);position:relative}" +
      ".liv-card:hover{box-shadow:0 4px 18px rgba(0,0,0,.1);transform:translateY(-1px)}" +
      ".liv-card.criando{background:#fef0f0;border-color:#e87878}.liv-card.concluido{background:#edf9f3;border-color:#4a9467}" +
      ".liv-card-bim{font-size:.63rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--cm);margin-bottom:7px}" +
      ".liv-card-ic{font-size:1.9rem;margin-bottom:6px;display:block}" +
      ".liv-card-nm{font-size:.79rem;font-weight:700;color:var(--ce);margin-bottom:6px;line-height:1.3}" +
      ".liv-card-info{font-size:.68rem;color:var(--cm);margin-bottom:8px}" +
      ".liv-card.criando .liv-card-nm{color:#c0392b}.liv-card.concluido .liv-card-nm{color:#1a6b3c}" +
      ".liv-btns{display:none;flex-direction:column;gap:5px}.liv-card.open .liv-btns{display:flex}" +
      ".liv-btn{padding:6px 10px;border-radius:7px;font-size:.72rem;font-weight:700;cursor:pointer;border:2px solid;text-align:center;background:transparent}" +
      ".liv-btn.b-cri{color:#c0392b;border-color:#e87878}.liv-btn.b-con{color:#1a6b3c;border-color:#4a9467}" +
      ".liv-btn.b-ace{background:var(--vd);color:#fff;border-color:var(--vd)}.liv-btn.b-ace[disabled]{background:var(--md-linha);color:var(--cm);border-color:var(--md-linha);cursor:not-allowed;opacity:.55}" +
      ".liv-btn.b-edt{color:var(--ce);border-color:var(--md-linha)}" +
      ".liv-card.criando .liv-btn.b-cri{background:#e87878;color:#fff}.liv-card.concluido .liv-btn.b-con{background:#4a9467;color:#fff}" +
      ".md-temas{display:flex;flex-direction:column;gap:5px}.md-temas .md-row{margin:0}" +
      ".md-hist{display:flex;flex-direction:column;gap:6px}.md-hist div{padding:8px 11px;background:rgba(46,160,102,.06);border:1px solid rgba(46,160,102,.2);border-radius:8px;font-size:.8rem}" +
      "html.dark-2026 .liv-tab.on{background:transparent!important;border:none!important;border-bottom:3px solid var(--dark-accent)!important;color:var(--dark-accent)!important}" +
      "html.dark-2026 .liv-card{background:var(--md-sup)!important;border-color:var(--md-linha)!important}" +
      "html.dark-2026 .liv-card.criando{background:var(--dark-negative-soft)!important;border-color:#7a3530!important}" +
      "html.dark-2026 .liv-card.concluido{background:var(--dark-positive-soft)!important;border-color:#2e704e!important}" +
      "html.dark-2026 .liv-card-nm{color:var(--dark-text)!important}" +
      "html.dark-2026 .liv-card.criando .liv-card-nm{color:var(--dark-negative)!important}html.dark-2026 .liv-card.concluido .liv-card-nm{color:var(--dark-positive)!important}" +
      "html.dark-2026 .liv-btn.b-cri{color:#ff9090!important;border-color:#874040!important}html.dark-2026 .liv-btn.b-con{color:#80d0a0!important;border-color:#3a7a50!important}" +
      "html.dark-2026 .liv-card.criando .liv-btn.b-cri{background:#874040!important;color:#fff!important}html.dark-2026 .liv-card.concluido .liv-btn.b-con{background:#3a7a50!important;color:#fff!important}" +
      "html.dark-2026 .liv-btn.b-ace:not([disabled]){background:var(--dark-accent)!important;color:#151719!important;border-color:var(--dark-accent)!important}" +
      "@media(max-width:680px){.liv-grid{grid-template-columns:repeat(2,1fr)}}" +
      "</style>";
  }
  function desenharCards(tipo) {
    var sec = document.getElementById(tipo === "seq" ? "sec-seq" : "sec-livros");
    if (!sec) return;
    var ehSeq = tipo === "seq", ST = ehSeq ? ST_SEQ : ST_LIV, dados = ehSeq ? R.seq : R.livros;
    var cab = ehSeq
      ? '<div class="th"><div class="tb mr">🗂</div><div class="ti"><h2>Sequências Didáticas</h2><p>Acompanhamento das sequências por turma, disciplina e bimestre</p></div></div>'
      : '<div class="th"><div class="tb ou">📖</div><div class="ti"><h2>Livros e materiais digitais</h2><p>Produção e acompanhamento dos livros, apostilas e materiais por disciplina e bimestre</p></div></div>';
    var ts = turmas().filter(function (t) { return (t.disciplinas || []).length; });
    if (!ts.length) { sec.innerHTML = cab + '<div class="md-card"><div class="md-vazio">Cadastre uma turma com disciplinas na aba ⚙️ Configurações.</div></div>'; return; }
    var atual = ui[tipo === "seq" ? "seq" : "liv"];
    if (!ts.some(function (t) { return t.id === atual; })) atual = ts[0].id;
    ui[tipo === "seq" ? "seq" : "liv"] = atual;
    var t = M.turma(atual);
    var html = t.disciplinas.map(function (d) {
      var nb = numBims(d), cards = "";
      for (var b = 1; b <= nb; b++) {
        var k = chave(t.id, d.id, b), o = dados[k] || {}, st = o.st || "";
        var info = ehSeq ? (o.objetivo ? esc(o.objetivo).slice(0, 70) : "") : ((o.temas || []).length ? (o.temas.filter(function (x) { return x.ok; }).length + "/" + o.temas.length + " temas") : "");
        cards += '<div class="liv-card' + (st ? " " + st : "") + '" data-k="' + esc(k) + '">' +
          '<div class="liv-card-bim">' + b + "º Bimestre</div>" +
          '<span class="liv-card-ic">' + ST[st].ic + "</span>" +
          '<div class="liv-card-nm">' + esc(o.titulo || ST[st].lbl) + "</div>" +
          (info ? '<div class="liv-card-info">' + info + "</div>" : "") +
          '<div class="liv-btns">' +
          '<button type="button" class="liv-btn b-cri" data-a="criando">📝 Criando</button>' +
          '<button type="button" class="liv-btn b-con" data-a="concluido">✅ Concluído</button>' +
          '<button type="button" class="liv-btn b-ace" data-a="abrir"' + (o.url ? "" : " disabled") + ">🔗 " + (ehSeq ? "Abrir arquivo" : "Acessar") + "</button>" +
          '<button type="button" class="liv-btn b-edt" data-a="editar">✏️ Editar</button>' +
          "</div></div>";
      }
      return '<div class="liv-disc"><div class="liv-disc-h"><i style="background:' + corDisc(t, d.id) + '"></i>' + esc(d.nome) + '</div><div class="liv-grid">' + cards + "</div></div>";
    }).join("");
    sec.innerHTML = cab + estiloCards() +
      '<div class="liv-legend"><div class="liv-leg-item"><div class="liv-dot nd"></div>Não iniciado</div><div class="liv-leg-item"><div class="liv-dot cr"></div>Em criação</div><div class="liv-leg-item"><div class="liv-dot co"></div>Concluído</div><div class="liv-leg-item" style="margin-left:auto;font-size:.72rem;opacity:.75">Toque no cartão para ver as opções</div></div>' +
      '<div class="liv-tabs">' + ts.map(function (x) { return '<button type="button" class="liv-tab' + (x.id === t.id ? " on" : "") + '" data-tur="' + x.id + '">📚 ' + esc(x.nome) + "</button>"; }).join("") + "</div>" + html;
    sec.querySelectorAll("[data-tur]").forEach(function (b) { b.onclick = function () { ui[tipo === "seq" ? "seq" : "liv"] = b.getAttribute("data-tur"); desenharCards(tipo); }; });
    sec.querySelectorAll(".liv-card").forEach(function (card) {
      var k = card.getAttribute("data-k");
      card.addEventListener("click", function (e) {
        var btn = e.target.closest(".liv-btn");
        if (!btn) {
          var aberto = card.classList.contains("open");
          sec.querySelectorAll(".liv-card.open").forEach(function (c) { c.classList.remove("open"); });
          if (!aberto) card.classList.add("open");
          return;
        }
        var a = btn.getAttribute("data-a"), o = dados[k] = dados[k] || {};
        if (a === "criando" || a === "concluido") { o.st = o.st === a ? "" : a; if (o.st === "concluido") o.concluidoEm = hojeKey(); salvar(); }
        else if (a === "abrir") { if (o.url) window.open(o.url, "_blank", "noopener"); }
        else if (a === "editar") { if (ehSeq) editarSequencia(k); else editarLivro(k); }
      });
    });
  }
  function rotuloChave(k) {
    var p = k.split("|"), t = M.turma(p[0]), d = disc(t, p[1]);
    return (t ? t.nome : "") + " · " + (d ? d.nome : "") + " · " + p[2] + "º Bimestre";
  }
  function histHtml(o, vazio) {
    return (o.hist || []).length ? '<div class="md-hist">' + o.hist.slice().reverse().map(function (h) { return "<div>✅ <strong>" + esc(h.titulo || "Sem título") + "</strong> · concluído em " + esc(h.data || "") + "</div>"; }).join("") + "</div>" : '<p style="font-size:.8rem">' + vazio + "</p>";
  }
  function editarSequencia(k) {
    var o = R.seq[k] || {};
    var campo = function (id, lbl, v, ph, area) { return '<div class="md-f"><label>' + lbl + "</label>" + (area ? '<textarea data-s="' + id + '" placeholder="' + ph + '" style="min-height:80px">' + esc(v || "") + "</textarea>" : '<input type="text" data-s="' + id + '" value="' + esc(v || "") + '" placeholder="' + ph + '">') + "</div>"; };
    modal('<h2>🗂 Sequência didática</h2><p style="font-size:.84rem;color:var(--cm);margin:4px 0 14px">' + esc(rotuloChave(k)) + "</p>" +
      campo("titulo", "Título", o.titulo, "Ex.: Sequência de argumentação") +
      campo("objetivo", "Objetivo", o.objetivo, "Objetivo central da sequência") +
      campo("recursos", "Ferramentas / recursos", o.recursos, "Slides, livro, vídeo, formulário…") +
      campo("etapas", "Etapas", o.etapas, "Diagnóstico, leitura, produção, revisão…", true) +
      campo("observacoes", "Observações", o.observacoes, "Anotações importantes", true) +
      campo("url", "Link do arquivo", o.url, "https://…") +
      '<div class="md-row md-noprint" style="flex-wrap:wrap"><button type="button" class="md-btn pri" data-x="salvar">💾 Salvar</button><button type="button" class="md-btn" data-x="concluir">✅ Marcar concluída</button><button type="button" class="md-btn" data-x="nova" title="Guarda a atual no histórico e começa outra">➕ Nova sequência</button><span style="flex:1"></span><button type="button" class="md-btn" data-fechar>Fechar</button></div>' +
      "<h4>Histórico de sequências concluídas</h4>" + histHtml(o, "Nenhuma sequência concluída ainda."),
      function (ov) {
        var ler = function () { var s = R.seq[k] = R.seq[k] || {}; ov.querySelectorAll("[data-s]").forEach(function (i) { s[i.getAttribute("data-s")] = i.value.trim(); }); if (!s.st && s.titulo) s.st = "criando"; return s; };
        ov.querySelector('[data-x="salvar"]').onclick = function () { ler(); salvar(); ov.remove(); M.toast("Sequência salva."); };
        ov.querySelector('[data-x="concluir"]').onclick = function () { var s = ler(); if (!s.titulo) return M.toast("Dê um título à sequência."); s.st = "concluido"; s.concluidoEm = hojeKey(); salvar(); ov.remove(); };
        ov.querySelector('[data-x="nova"]').onclick = function () {
          var s = ler(); if (!s.titulo) return M.toast("A sequência atual não tem título.");
          if (!confirm("Guardar a sequência atual no histórico e começar outra neste bimestre?")) return;
          var hist = (s.hist || []).concat([{ titulo: s.titulo, data: M.dataBr(hojeKey()) }]);
          R.seq[k] = { hist: hist, st: "" }; salvar(); editarSequencia(k);
        };
      });
  }
  function editarLivro(k) {
    var o = R.livros[k] || {};
    var temas = (o.temas || []).slice();
    function linhasTemas() { return temas.map(function (x, i) { return '<div class="md-row"><input type="checkbox" data-tok="' + i + '"' + (x.ok ? " checked" : "") + '><input class="md-in" data-tt="' + i + '" value="' + esc(x.t) + '" placeholder="Tema"><button type="button" class="md-x" data-trm="' + i + '">✕</button></div>'; }).join(""); }
    modal('<h2>📖 Livro / material</h2><p style="font-size:.84rem;color:var(--cm);margin:4px 0 14px">' + esc(rotuloChave(k)) + "</p>" +
      '<div class="md-f"><label>Título</label><input type="text" data-l="titulo" value="' + esc(o.titulo || "") + '" placeholder="Ex.: Caderno de LP — 1º bimestre"></div>' +
      '<div class="md-f"><label>Link (para o botão 🔗 Acessar)</label><input type="text" data-l="url" value="' + esc(o.url || "") + '" placeholder="https://…"></div>' +
      '<div class="md-f"><label>Temas (marque os prontos)</label><div class="md-temas" data-temas>' + linhasTemas() + '</div><button type="button" class="md-btn mini" data-x="tema" style="margin-top:6px;align-self:flex-start">+ Adicionar tema</button></div>' +
      '<div class="md-f"><label>Observações</label><textarea data-l="observacoes" style="min-height:70px">' + esc(o.observacoes || "") + "</textarea></div>" +
      '<div class="md-row md-noprint" style="flex-wrap:wrap"><button type="button" class="md-btn pri" data-x="salvar">💾 Salvar</button><button type="button" class="md-btn" data-x="concluir">✅ Marcar concluído</button><button type="button" class="md-btn" data-x="novo">➕ Novo livro</button><span style="flex:1"></span><button type="button" class="md-btn" data-fechar>Fechar</button></div>' +
      "<h4>Histórico de livros concluídos</h4>" + histHtml(o, "Nenhum livro concluído ainda."),
      function (ov) {
        function capturarTemas() { ov.querySelectorAll("[data-tt]").forEach(function (i) { var n = +i.getAttribute("data-tt"); temas[n].t = i.value.trim(); }); ov.querySelectorAll("[data-tok]").forEach(function (c) { temas[+c.getAttribute("data-tok")].ok = c.checked; }); }
        function redesenharTemas() { ov.querySelector("[data-temas]").innerHTML = linhasTemas(); ligarTemas(); }
        function ligarTemas() { ov.querySelectorAll("[data-trm]").forEach(function (b) { b.onclick = function () { capturarTemas(); temas.splice(+b.getAttribute("data-trm"), 1); redesenharTemas(); }; }); }
        ligarTemas();
        ov.querySelector('[data-x="tema"]').onclick = function () { capturarTemas(); temas.push({ t: "", ok: false }); redesenharTemas(); var ult = ov.querySelectorAll("[data-tt]"); if (ult.length) ult[ult.length - 1].focus(); };
        var ler = function () { capturarTemas(); var l = R.livros[k] = R.livros[k] || {}; ov.querySelectorAll("[data-l]").forEach(function (i) { l[i.getAttribute("data-l")] = i.value.trim(); }); l.temas = temas.filter(function (x) { return x.t; }); if (!l.st && l.titulo) l.st = "criando"; return l; };
        ov.querySelector('[data-x="salvar"]').onclick = function () { ler(); salvar(); ov.remove(); M.toast("Livro salvo."); };
        ov.querySelector('[data-x="concluir"]').onclick = function () { var l = ler(); if (!l.titulo) return M.toast("Dê um título ao livro."); l.st = "concluido"; l.concluidoEm = hojeKey(); salvar(); ov.remove(); };
        ov.querySelector('[data-x="novo"]').onclick = function () {
          var l = ler(); if (!l.titulo) return M.toast("O livro atual não tem título.");
          if (!confirm("Guardar o livro atual no histórico e começar outro neste bimestre?")) return;
          R.livros[k] = { hist: (l.hist || []).concat([{ titulo: l.titulo, data: M.dataBr(hojeKey()) }]), st: "" }; salvar(); editarLivro(k);
        };
      });
  }
  function salvarCard(tipo, tid, did, b, campos) {
    var dados = tipo === "seq" ? R.seq : R.livros, k = chave(tid, did, b), o = dados[k] = dados[k] || {};
    Object.keys(campos).forEach(function (c) { if (campos[c] !== undefined && campos[c] !== null && campos[c] !== "") o[c] = campos[c]; });
    if (campos.st === "concluido") o.concluidoEm = hojeKey();
    if (!o.st && o.titulo) o.st = "criando";
    return k;
  }

  // ═══════════════════════════ 📆 CALENDÁRIO ═══════════════════════════
  function eventosDoDia(k) {
    return eventos().filter(function (e) { return e.ini <= k && (e.fim || e.ini) >= k; });
  }
  function diariosPorDia() {
    var m = {};
    M.diarios().forEach(function (d) { (m[d.dateKey] = m[d.dateKey] || []).push(d); });
    return m;
  }
  function estiloCal() {
    return "<style>" +
      ".cal-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}" +
      ".cal-tit{font-family:'Playfair Display',serif;font-size:1.2rem;color:var(--md-titulo);flex:1;min-width:160px;text-align:center}" +
      ".cal-leg{display:flex;gap:10px;flex-wrap:wrap;font-size:.72rem;color:var(--cm);margin-bottom:12px}.cal-leg span{display:inline-flex;align-items:center;gap:5px}.cal-leg i{width:10px;height:10px;border-radius:3px;display:inline-block}" +
      ".cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}" +
      ".cal-dow{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--cm);text-align:center;padding:4px 0}" +
      ".cal-dia{background:var(--md-sup);border:1px solid var(--md-linha);border-radius:8px;min-height:86px;padding:5px 6px;cursor:pointer;display:flex;flex-direction:column;gap:3px;text-align:left;font:inherit;color:inherit;overflow:hidden}" +
      ".cal-dia:hover{border-color:var(--md-destaque)}" +
      ".cal-dia.fora{opacity:.4}.cal-dia.hoje{box-shadow:inset 0 0 0 2px var(--md-destaque)}.cal-dia.fds{background:var(--md-sup2)}" +
      ".cal-n{font-family:'DM Mono',monospace;font-size:.8rem;font-weight:500;display:flex;justify-content:space-between;align-items:center}" +
      ".cal-n em{font-style:normal;font-size:.62rem;background:var(--vs);color:var(--vm);border-radius:8px;padding:0 5px}" +
      ".cal-ev{font-size:.64rem;font-weight:600;color:#fff;border-radius:4px;padding:1px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".cal-mais{font-size:.62rem;color:var(--cm)}" +
      ".cal-ag{margin-top:18px}.cal-ag-i{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--md-linha);font-size:.85rem}" +
      ".cal-ag-i b{font-family:'DM Mono',monospace;font-weight:500;min-width:92px;color:var(--cm);font-size:.8rem}" +
      ".cal-tag{font-size:.66rem;font-weight:700;color:#fff;border-radius:999px;padding:2px 8px;white-space:nowrap}" +
      "html.dark-2026 .cal-n em{background:var(--dark-positive-soft);color:var(--dark-positive)}" +
      "@media(max-width:640px){.cal-dia{min-height:58px;padding:3px}.cal-ev{font-size:0;height:6px;padding:0}.cal-mais{display:none}}" +
      "</style>";
  }
  function desenharCalendario() {
    var sec = document.getElementById("sec-cal");
    if (!sec) return;
    if (!ui.cal) ui.cal = hojeKey().slice(0, 7);
    var ano = parseInt(ui.cal.slice(0, 4), 10), mes = parseInt(ui.cal.slice(5, 7), 10) - 1;
    var primeiro = new Date(ano, mes, 1), inicio = new Date(ano, mes, 1 - primeiro.getDay());
    var hoje = hojeKey(), porDia = diariosPorDia();
    var celulas = "";
    for (var i = 0; i < 42; i++) {
      var dt = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      if (i >= 35 && dt.getMonth() !== mes) break;
      var k = dt.getFullYear() + "-" + dois(dt.getMonth() + 1) + "-" + dois(dt.getDate());
      var evs = eventosDoDia(k), ds = porDia[k] || [];
      celulas += '<button type="button" class="cal-dia' + (dt.getMonth() !== mes ? " fora" : "") + (k === hoje ? " hoje" : "") + (dt.getDay() === 0 || dt.getDay() === 6 ? " fds" : "") + '" data-dia="' + k + '">' +
        '<span class="cal-n">' + dt.getDate() + (ds.length ? '<em title="Diários registrados">📘 ' + ds.length + "</em>" : "") + "</span>" +
        evs.slice(0, 3).map(function (e) { return '<span class="cal-ev" style="background:' + (TIPOS_CAL[e.tipo] || TIPOS_CAL.outro).cor + '">' + esc(e.titulo) + "</span>"; }).join("") +
        (evs.length > 3 ? '<span class="cal-mais">+' + (evs.length - 3) + "</span>" : "") + "</button>";
    }
    var doMes = eventos().filter(function (e) { return (e.ini || "").slice(0, 7) <= ui.cal && (e.fim || e.ini || "").slice(0, 7) >= ui.cal; })
      .sort(function (a, b) { return a.ini.localeCompare(b.ini); });
    sec.innerHTML = '<div class="th"><div class="tb gz">📆</div><div class="ti"><h2>Calendário Escolar</h2><p>Feriados, recessos, avaliações, reuniões e eventos · os dias com diário mostram 📘</p></div></div>' + estiloCal() +
      '<div class="md-card"><div class="cal-bar"><button type="button" class="md-btn mini" data-c="ant">‹ Anterior</button><button type="button" class="md-btn mini pri" data-c="hoje">Hoje</button><button type="button" class="md-btn mini" data-c="prox">Próximo ›</button>' +
      '<div class="cal-tit">' + MESES_LONGOS[mes] + " " + ano + '</div><button type="button" class="md-btn mini pri" data-c="novo">+ Evento</button></div>' +
      '<div class="cal-leg">' + Object.keys(TIPOS_CAL).map(function (t) { return '<span><i style="background:' + TIPOS_CAL[t].cor + '"></i>' + TIPOS_CAL[t].lbl + "</span>"; }).join("") + "</div>" +
      '<div class="cal-grid">' + DIAS_SEM.map(function (d) { return '<div class="cal-dow">' + d + "</div>"; }).join("") + celulas + "</div>" +
      '<div class="cal-ag"><h3 style="font-family:Playfair Display,serif;color:var(--md-titulo);font-size:1rem;margin-bottom:4px">Eventos de ' + MESES_LONGOS[mes].toLowerCase() + "</h3>" +
      (doMes.length ? doMes.map(linhaEvento).join("") : '<p style="font-size:.84rem;color:var(--cm);padding:8px 0">Nenhum evento neste mês. Toque em um dia ou em <strong>+ Evento</strong>.</p>') + "</div></div>";
    sec.querySelector('[data-c="ant"]').onclick = function () { mudarMes(-1); };
    sec.querySelector('[data-c="prox"]').onclick = function () { mudarMes(1); };
    sec.querySelector('[data-c="hoje"]').onclick = function () { ui.cal = hojeKey().slice(0, 7); desenharCalendario(); };
    sec.querySelector('[data-c="novo"]').onclick = function () { editarEvento(null, ui.cal === hoje.slice(0, 7) ? hoje : ui.cal + "-01"); };
    sec.querySelectorAll("[data-dia]").forEach(function (b) { b.onclick = function () { abrirDia(b.getAttribute("data-dia")); }; });
    sec.querySelectorAll("[data-ev]").forEach(function (b) { b.onclick = function () { editarEvento(b.getAttribute("data-ev")); }; });
  }
  function linhaEvento(e) {
    var tp = TIPOS_CAL[e.tipo] || TIPOS_CAL.outro;
    return '<div class="cal-ag-i"><b>' + dataBr(e.ini) + (e.fim && e.fim !== e.ini ? "–" + dataBr(e.fim) : "") + '</b><div style="flex:1"><strong>' + esc(e.titulo) + "</strong>" + (e.desc ? '<div style="font-size:.78rem;color:var(--cm)">' + esc(e.desc) + "</div>" : "") + '</div><span class="cal-tag" style="background:' + tp.cor + '">' + tp.lbl + '</span><button type="button" class="md-btn mini" data-ev="' + esc(e.id) + '">✏️</button></div>';
  }
  function mudarMes(delta) {
    var a = parseInt(ui.cal.slice(0, 4), 10), m = parseInt(ui.cal.slice(5, 7), 10) - 1 + delta;
    var d = new Date(a, m, 1);
    ui.cal = d.getFullYear() + "-" + dois(d.getMonth() + 1);
    desenharCalendario();
  }
  function abrirDia(k) {
    var evs = eventosDoDia(k), ds = (diariosPorDia()[k] || []);
    var dt = new Date(k + "T12:00:00");
    modal("<h2>📆 " + DIAS_SEM[dt.getDay()] + ", " + M.dataBr(k) + "</h2>" +
      "<h4>Eventos</h4>" + (evs.length ? evs.map(linhaEvento).join("") : '<p style="font-size:.84rem;color:var(--cm)">Nenhum evento.</p>') +
      "<h4>Diários registrados</h4>" + (ds.length ? '<table class="md-tabela">' + ds.map(function (d) { var t = M.turma(d.turma); return "<tr><td>" + esc(t ? t.nome : "") + "</td><td>" + esc(d.discNome) + '</td><td style="color:var(--cm)">' + esc(d.assunto) + "</td><td>" + (d.horas || "") + "h</td></tr>"; }).join("") + "</table>" : '<p style="font-size:.84rem;color:var(--cm)">Nenhum diário neste dia.</p>') +
      '<div class="md-row md-noprint" style="margin-top:16px;justify-content:flex-end"><button type="button" class="md-btn pri" data-x="novo">+ Evento neste dia</button><button type="button" class="md-btn" data-fechar>Fechar</button></div>',
      function (ov) {
        ov.querySelector('[data-x="novo"]').onclick = function () { editarEvento(null, k); };
        ov.querySelectorAll("[data-ev]").forEach(function (b) { b.onclick = function () { editarEvento(b.getAttribute("data-ev")); }; });
      });
  }
  function editarEvento(id, dia) {
    var e = id ? eventos().filter(function (x) { return x.id === id; })[0] : null;
    e = e || { ini: dia || hojeKey(), fim: "", titulo: "", tipo: "evento", desc: "" };
    modal("<h2>" + (id ? "✏️ Editar evento" : "+ Novo evento") + "</h2>" +
      '<div class="md-grid" style="margin-top:12px"><div class="md-f"><label>Data</label><input type="date" data-e="ini" value="' + esc(e.ini) + '"></div><div class="md-f"><label>Até (opcional)</label><input type="date" data-e="fim" value="' + esc(e.fim || "") + '"></div>' +
      '<div class="md-f"><label>Tipo</label><select data-e="tipo">' + Object.keys(TIPOS_CAL).map(function (t) { return '<option value="' + t + '"' + (t === e.tipo ? " selected" : "") + ">" + TIPOS_CAL[t].lbl + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="md-f"><label>Título</label><input type="text" data-e="titulo" value="' + esc(e.titulo) + '" placeholder="Ex.: Conselho de classe"></div>' +
      '<div class="md-f"><label>Descrição</label><textarea data-e="desc" style="min-height:70px">' + esc(e.desc || "") + "</textarea></div>" +
      '<div class="md-row md-noprint" style="flex-wrap:wrap"><button type="button" class="md-btn pri" data-x="salvar">💾 Salvar</button>' + (id ? '<button type="button" class="md-btn perigo" data-x="excluir">Excluir</button>' : "") + '<span style="flex:1"></span><button type="button" class="md-btn" data-fechar>Fechar</button></div>',
      function (ov) {
        ov.querySelector('[data-x="salvar"]').onclick = function () {
          var v = function (c) { return ov.querySelector('[data-e="' + c + '"]').value.trim(); };
          if (!v("ini") || !v("titulo")) return M.toast("Informe a data e o título.");
          adicionarEvento({ id: id, ini: v("ini"), fim: v("fim"), tipo: v("tipo"), titulo: v("titulo"), desc: v("desc") });
          ui.cal = v("ini").slice(0, 7);
          salvar(); ov.remove(); M.toast("Evento salvo.");
        };
        var ex = ov.querySelector('[data-x="excluir"]');
        if (ex) ex.onclick = function () { if (!confirm("Excluir este evento?")) return; removerEvento(id); salvar(); ov.remove(); };
      });
  }
  function adicionarEvento(o) {
    var fim = o.fim && o.fim > o.ini ? o.fim : "";
    var velho = o.id ? R.cal.eventos.filter(function (x) { return x.id === o.id; })[0] : null;
    var ev = { id: o.id || M.novoId("ev"), ini: o.ini, fim: fim, tipo: TIPOS_CAL[o.tipo] ? o.tipo : "outro", titulo: o.titulo, desc: o.desc || "" };
    // Cada evento pertence à escola aberta (os antigos, sem escola, aparecem em todas).
    var eid = velho ? velho.escolaId : escolaAtual();
    if (eid) ev.escolaId = eid;
    R.cal.eventos = R.cal.eventos.filter(function (x) { return x.id !== ev.id; });
    R.cal.eventos.push(ev);
    return ev.id;
  }
  function removerEvento(id) {
    var antes = R.cal.eventos.length;
    R.cal.eventos = R.cal.eventos.filter(function (x) { return x.id !== id; });
    return antes !== R.cal.eventos.length;
  }

  // ── Card de "próximos eventos" na aba Início ───────────────────────
  function inicioHtml() {
    var hoje = hojeKey(), lim = new Date(); lim.setDate(lim.getDate() + 21);
    var limK = lim.getFullYear() + "-" + dois(lim.getMonth() + 1) + "-" + dois(lim.getDate());
    var prox = eventos().filter(function (e) { return (e.fim || e.ini) >= hoje && e.ini <= limK; }).sort(function (a, b) { return a.ini.localeCompare(b.ini); }).slice(0, 6);
    var pl = 0, feitas = 0, idx = indiceDiarios();
    Object.keys(R.plano).filter(daVista).forEach(function (k) {
      Object.keys(R.plano[k].bims || {}).forEach(function (b) { (R.plano[k].bims[b].aulas || []).forEach(function (a) { pl++; if (a.st === "ap" || aulaDada(idx[k], a.t)) feitas++; }); });
    });
    return '<div class="md-card"><h3>📆 Próximos eventos</h3>' + (prox.length ? prox.map(linhaEvento).join("") : '<p>Nada nas próximas três semanas. <button type="button" class="md-btn mini" data-ir-aba="cal">Abrir calendário</button></p>') + "</div>" +
      (pl ? '<div class="md-card"><h3>📚 Plano de aulas</h3><div class="md-lbl"><span>Aulas planejadas já dadas</span><span>' + feitas + "/" + pl + '</span></div><div class="md-bar"><i style="width:' + Math.round(feitas / pl * 100) + '%"></i></div><button type="button" class="md-btn mini" data-ir-aba="plano">Abrir plano</button></div>' : "");
  }

  // ── resumo para a I.A ───────────────────────────────────────────────
  function resumo() {
    var plano = {};
    Object.keys(R.plano).filter(daVista).forEach(function (k) {
      var bims = R.plano[k].bims || {}, idx = indiceDiarios()[k];
      Object.keys(bims).forEach(function (b) {
        if (!(bims[b].aulas || []).length && !bims[b].titulo) return;
        plano[k] = plano[k] || {};
        plano[k][b] = { tema: bims[b].titulo || "", aulas: (bims[b].aulas || []).map(function (a, i) { return (i + 1) + ". " + a.t + ((a.st === "ap" || aulaDada(idx, a.t)) ? " [dada]" : a.st === "pu" ? " [pulada]" : ""); }) };
      });
    });
    var cards = function (dados) { var o = {}; Object.keys(dados).filter(daVista).forEach(function (k) { var x = dados[k]; if (x.titulo || x.st) o[k] = { titulo: x.titulo || "", status: x.st || "" }; }); return o; };
    return { plano: plano, sequencias: cards(R.seq), livros: cards(R.livros), eventos: eventos().slice().sort(function (a, b) { return a.ini.localeCompare(b.ini); }).map(function (e) { return { id: e.id, data: e.ini, ate: e.fim || undefined, titulo: e.titulo, tipo: e.tipo }; }) };
  }

  // ── desenho geral e registro no Meu Diário ──────────────────────────
  function desenhar() {
    if (!M || !R) return;
    desenharPlano(); desenharCards("seq"); desenharCards("liv"); desenharCalendario();
    var ini = document.getElementById("sec-inicio");
    if (ini && ini.classList.contains("on") && ini.querySelector(".sr")) { /* o Início se redesenha pelo Meu Diário */ }
  }

  window.MeuDiarioRecursos = {
    dados: function () { return R; },
    tiposCalendario: function () { return TIPOS_CAL; },
    numBims: numBims,
    definirBimestre: function (tid, did, b, titulo, aulas, modo) { var n = definirBimestre(tid, did, b, titulo, aulas, modo); salvar(); return n; },
    marcarAula: function (tid, did, b, numero, st) {
      var a = (bimDe(tid, did, b, false).aulas || [])[numero - 1];
      if (!a) return false;
      if (st === "sm") a.sm = true; else if (st === "limpar") { a.st = ""; a.sm = false; } else a.st = st;
      salvar(); return true;
    },
    salvarSequencia: function (tid, did, b, campos) { var k = salvarCard("seq", tid, did, b, campos); salvar(); return k; },
    salvarLivro: function (tid, did, b, campos) { var k = salvarCard("liv", tid, did, b, campos); salvar(); return k; },
    adicionarEvento: function (o) { var id = adicionarEvento(o); salvar(); return id; },
    removerEvento: function (id) { var ok = removerEvento(id); if (ok) salvar(); return ok; },
    resumo: resumo,
    // Importação do ano anterior: copia plano, sequências e livros de uma turma
    // para a nova. O conteúdo vem junto; os status (aplicada, concluída…) zeram.
    copiarTurma: function (de, para, o) {
      o = o || {};
      var n = 0;
      function copiar(dados, limparStatus) {
        Object.keys(dados).forEach(function (k) {
          var p = k.split("|");
          if (p[0] !== de) return;
          p[0] = para;
          var c = JSON.parse(JSON.stringify(dados[k]));
          limparStatus(c);
          dados[p.join("|")] = c; n++;
        });
      }
      if (o.plano) copiar(R.plano, function (c) { Object.keys(c.bims || {}).forEach(function (b) { (c.bims[b].aulas || []).forEach(function (a) { a.st = ""; a.sm = false; }); }); });
      var zerar = function (c) { if (c.titulo) c.st = "criando"; else delete c.st; delete c.concluidoEm; };
      if (o.seq) copiar(R.seq, zerar);
      if (o.livros) copiar(R.livros, zerar);
      if (n && !o.semSalvar) salvar();
      return n;
    },
    // Exclusão de turmas ou da escola: tira plano, sequências e livros delas
    // (e os eventos da escola, quando informada).
    removerTurmas: function (ids, escolaId) {
      var alvo = {}, n = 0;
      (ids || []).forEach(function (t) { alvo[t] = 1; });
      [R.plano, R.seq, R.livros].forEach(function (dados) { Object.keys(dados).forEach(function (k) { if (alvo[k.split("|")[0]]) { delete dados[k]; n++; } }); });
      if (escolaId) { var antes = R.cal.eventos.length; R.cal.eventos = R.cal.eventos.filter(function (e) { return e.escolaId !== escolaId; }); n += antes - R.cal.eventos.length; }
      if (n) salvar();
      return n;
    }
  };

  (window.MD_MODULOS = window.MD_MODULOS || []).push({
    nome: "recursos",
    iniciar: function (api) {
      M = api;
      R = lerLocal();
      var S = M.sync();
      sync = S.createScopeSync({
        perUser: true, scope: SCOPE, source: "meu-diario-recursos", debounceMs: 300,
        getLocalPayload: function () { return R; },
        onRemotePayload: aplicarRemoto,
        onStatus: function (s) { M.status("recursos", s); }
      });
      sync.start();
    },
    desenhar: desenhar,
    aposDiarios: function () { desenharPlano(); desenharCalendario(); },
    inicioHtml: function () { return R ? inicioHtml() : ""; },
    exportar: function () { return { recursos: R }; }
  });
})();
