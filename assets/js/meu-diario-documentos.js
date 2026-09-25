// ═══════════════════════════════════════════════════════════════════════
// meu-diario-documentos.js — aba 📁 Documentos do Meu Diário (24/09/2026).
// Substitui a antiga aba 🗂 Sequências.
//
// Quatro abas: 🗂 Sequências · 📝 Planos de aula · 📘 Planos de curso ·
// 📊 Relatórios. Cada aba tem pastas e subpastas (sem limite de nível), e
// cada documento guarda turma, disciplina e bimestre, para filtrar.
//
// Documentos nascem à mão (+ Novo documento) ou da aba 🤖 I.A: o botão
// "💾 Salvar em Documentos" de cada resposta abre a escolha da aba e da pasta
// já com turma, disciplina e bimestre identificados (pelo bloco ```documento```
// que a I.A manda, pelos campos da ferramenta usada e pelo próprio texto).
// Pasta "automática" = Turma › Disciplina, criada se não existir.
//
// Baixar: cada documento em PDF, Word, Excel, HTML, Markdown ou texto, e a
// pasta inteira em .zip (com as subpastas) ou num PDF só — documentos-exportar.js.
//
// PERSISTÊNCIA: professor_dados, escopo "meu-diario:documentos:v1" (só o dono)
// + cópia local; vale o payload com o "atualizadoEm" mais novo. Cada escola
// tem os próprios documentos e pastas (escolaId); nada é gravado antes da
// primeira leitura do banco.
//
// MIGRAÇÃO: as sequências antigas (cartões por bimestre em
// meu-diario:recursos:v1) viram documentos da aba Sequências, na pasta
// Turma › Disciplina, com id fixo "seq-<chave>" (não duplica entre aparelhos).
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var SCOPE = "meu-diario:documentos:v1";
  var TIPOS = {
    seq: { ic: "🗂", nome: "Sequências", um: "Sequência didática" },
    aula: { ic: "📝", nome: "Planos de aula", um: "Plano de aula" },
    curso: { ic: "📘", nome: "Planos de curso", um: "Plano de curso" },
    rel: { ic: "📊", nome: "Relatórios", um: "Relatório" }
  };
  var ORDEM = ["seq", "aula", "curso", "rel"];
  var AUTO = "__auto__";

  var M = null, D = null, sync = null, pronto = false;
  var ui = { tipo: "seq", pasta: "", busca: "", ft: "", fd: "", fb: "" };

  // ── utilidades ─────────────────────────────────────────────────────
  function esc(v) { return M.esc(v); }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function agora() { return new Date().toISOString(); }
  function turmas() { return (M.estrutura().turmas || []); }
  function turmaQualquer(id) { return M.turma(id); }
  function disc(t, id) { return (t && t.disciplinas || []).filter(function (d) { return d.id === id; })[0] || null; }
  function escolaId() { return M.escolaAtual ? M.escolaAtual() : ""; }
  function daEscola(x) { var e = escolaId(); return !x.escolaId || !e || x.escolaId === e; }
  function dataCurta(iso) { var d = new Date(iso || 0); return isNaN(d) ? "" : ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear(); }
  function modal(html, ligar) { return M.abrirOverlay(html, ligar); }
  function X() { return window.DocExportar; }

  // ── dados ──────────────────────────────────────────────────────────
  function vazio() { return { versao: 1, pastas: [], docs: [], migrado: {}, atualizadoEm: "" }; }
  function normalizar(r) {
    r = r || vazio();
    r.pastas = Array.isArray(r.pastas) ? r.pastas : [];
    r.docs = Array.isArray(r.docs) ? r.docs : [];
    r.migrado = r.migrado || {};
    return r;
  }
  function lsKey() { return "md_documentos_" + M.usuario().id; }
  function lerLocal() { try { var r = JSON.parse(localStorage.getItem(lsKey()) || "null"); if (r && r.docs) return normalizar(r); } catch (e) {} return vazio(); }
  function salvar() {
    if (!pronto) { M.toast("Aguarde: sincronizando os seus documentos…"); return false; }
    D.atualizadoEm = agora();
    try { localStorage.setItem(lsKey(), JSON.stringify(D)); } catch (e) { M.toast("Aparelho sem espaço: o documento foi para a nuvem, mas não ficou guardado aqui."); }
    if (sync) sync.pushNow("force");
    desenhar();
    return true;
  }
  function aplicarRemoto(p) {
    if (!p || !Array.isArray(p.docs)) return;
    if (String(p.atualizadoEm || "") < String(D.atualizadoEm || "")) { if (sync) sync.schedulePush("local-mais-novo"); return; }
    D = normalizar(p);
    try { localStorage.setItem(lsKey(), JSON.stringify(D)); } catch (e) {}
    desenhar();
  }

  // ── pastas ─────────────────────────────────────────────────────────
  function pasta(id) { return D.pastas.filter(function (p) { return p.id === id; })[0] || null; }
  function filhas(tipo, pai) {
    return D.pastas.filter(function (p) { return p.tipo === tipo && (p.pai || "") === (pai || "") && daEscola(p); })
      .sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }); });
  }
  function caminho(id) { var out = [], p = pasta(id), guarda = 0; while (p && guarda++ < 40) { out.unshift(p); p = pasta(p.pai); } return out; }
  function caminhoTexto(id) { return caminho(id).map(function (p) { return p.nome; }).join(" › "); }
  function descendentes(id) { var out = [id]; D.pastas.forEach(function (p) { if (p.pai === id) out = out.concat(descendentes(p.id)); }); return out; }
  function criarPasta(tipo, nome, pai) {
    nome = String(nome || "").trim().slice(0, 80);
    if (!nome) return null;
    var igual = filhas(tipo, pai).filter(function (p) { return norm(p.nome) === norm(nome); })[0];
    if (igual) return igual;
    var p = { id: M.novoId("pa"), tipo: tipo, nome: nome, pai: pai || "", escolaId: escolaId(), criado: agora() };
    D.pastas.push(p);
    return p;
  }
  // Pasta automática: Turma › Disciplina (cria o que faltar).
  function pastaAuto(tipo, tid, did) {
    var t = turmaQualquer(tid); if (!t) return "";
    var pt = criarPasta(tipo, t.nome, "");
    var d = disc(t, did);
    return d ? criarPasta(tipo, d.nome, pt.id).id : pt.id;
  }
  // Opções de pasta em árvore para um <select>.
  function opcoesPastas(tipo, sel, comAuto, rotuloAuto) {
    var out = (comAuto ? '<option value="' + AUTO + '"' + (sel === AUTO ? " selected" : "") + ">📂 Automática: " + esc(rotuloAuto || "Turma › Disciplina") + "</option>" : "") +
      '<option value=""' + (sel === "" ? " selected" : "") + ">" + TIPOS[tipo].ic + " " + TIPOS[tipo].nome + " (raiz)</option>";
    (function nivel(pai, prof) {
      filhas(tipo, pai).forEach(function (p) {
        out += '<option value="' + esc(p.id) + '"' + (p.id === sel ? " selected" : "") + ">" + new Array(prof + 1).join("   ") + "📁 " + esc(p.nome) + "</option>";
        nivel(p.id, prof + 1);
      });
    })("", 1);
    return out;
  }

  // ── documentos ─────────────────────────────────────────────────────
  function doc(id) { return D.docs.filter(function (d) { return d.id === id; })[0] || null; }
  function docsVisiveis(tipo) { return D.docs.filter(function (d) { return d.tipo === tipo && daEscola(d); }); }
  function contar(tipo, pastaId) {
    var ids = {}; descendentes(pastaId).forEach(function (i) { ids[i] = 1; });
    return docsVisiveis(tipo).filter(function (d) { return ids[d.pasta]; }).length;
  }
  function infoDoc(d) {
    var t = turmaQualquer(d.turma), di = t && disc(t, d.disc);
    return [["Tipo", TIPOS[d.tipo] ? TIPOS[d.tipo].um : ""], ["Turma", t ? t.nome : ""], ["Disciplina", di ? di.nome : (d.discNome || "")],
      ["Bimestre", d.bim ? d.bim + "º bimestre" : ""], ["Professor(a)", (M.estrutura().perfil || {}).nome || ""], ["Atualizado em", dataCurta(d.atualizado)]];
  }
  function paraExportar(d) { return { titulo: d.titulo, conteudo: d.conteudo, info: infoDoc(d) }; }
  function tituloDoTexto(texto) {
    var h = /^\s*#{1,3}\s+(.+)$/m.exec(texto || "");
    var t = h ? h[1] : String(texto || "").split("\n").filter(function (l) { return l.trim(); })[0] || "";
    return t.replace(/[*_`#]/g, "").trim().slice(0, 120);
  }
  function criarDoc(o) {
    var agoraIso = agora();
    var d = {
      id: o.id || M.novoId("doc"), tipo: TIPOS[o.tipo] ? o.tipo : "seq", pasta: o.pasta || "",
      titulo: String(o.titulo || tituloDoTexto(o.conteudo) || "Sem título").slice(0, 160), conteudo: String(o.conteudo || ""),
      turma: o.turma || "", disc: o.disc || "", bim: parseInt(o.bim, 10) || 0,
      escolaId: o.escolaId !== undefined ? o.escolaId : escolaId(), ano: o.ano || (M.ano ? M.ano() : new Date().getFullYear()),
      origem: o.origem || "manual", ferramenta: o.ferramenta || "", criado: o.criado || agoraIso, atualizado: agoraIso
    };
    D.docs = D.docs.filter(function (x) { return x.id !== d.id; });
    D.docs.push(d);
    return d;
  }

  // ── identificar turma, disciplina e bimestre ────────────────────────
  // Ordem de confiança: o que a ferramenta recebeu nos campos → o bloco
  // ```documento``` da I.A → o que aparece no pedido e no texto.
  function detectar(texto, meta, dicas) {
    meta = meta || {}; dicas = dicas || {};
    var ts = turmas(), r = { tipo: "", turma: "", disc: "", bim: 0 };
    var achaTurma = function (ref) {
      if (!ref) return null;
      var n = norm(ref);
      return ts.filter(function (t) { return t.id === ref; })[0] || ts.filter(function (t) { return norm(t.nome) === n; })[0] ||
        (function () { var c = ts.filter(function (t) { return n && (norm(t.nome).indexOf(n) >= 0 || n.indexOf(norm(t.nome)) >= 0); }); return c.length === 1 ? c[0] : null; })();
    };
    var achaDisc = function (t, ref) {
      if (!t || !ref) return null;
      var n = norm(ref);
      return t.disciplinas.filter(function (d) { return d.id === ref || norm(d.nome) === n; })[0] ||
        (function () { var c = t.disciplinas.filter(function (d) { return n && (norm(d.nome).indexOf(n) >= 0 || n.indexOf(norm(d.nome)) >= 0); }); return c.length === 1 ? c[0] : null; })();
    };
    var t = achaTurma(dicas.turma) || achaTurma(meta.turma);
    var corpo = norm((dicas.pedido || "") + " " + (texto || "").slice(0, 4000));
    if (!t) {
      // Nome da turma escrito no texto (o mais longo que aparecer).
      var cand = ts.filter(function (x) { var n = norm(x.nome); return n && (" " + corpo + " ").indexOf(" " + n + " ") >= 0; })
        .sort(function (a, b) { return norm(b.nome).length - norm(a.nome).length; });
      t = cand[0] || (ts.length === 1 ? ts[0] : null);
    }
    var d = t && (achaDisc(t, dicas.disciplina) || achaDisc(t, meta.disciplina));
    if (t && !d) {
      var cd = t.disciplinas.filter(function (x) { var n = norm(x.nome); return n && (" " + corpo + " ").indexOf(" " + n + " ") >= 0; });
      d = cd.length === 1 ? cd[0] : (t.disciplinas.length === 1 ? t.disciplinas[0] : null);
    }
    var b = parseInt(dicas.bimestre, 10) || parseInt(meta.bimestre, 10) || 0;
    if (!b) { var mb = /\b([1-8])\s*(?:º|°|o)?\s*bimestre\b/i.exec((dicas.pedido || "") + " " + (texto || "").slice(0, 4000)); if (mb) b = +mb[1]; }
    var tipo = TIPOS[meta.tipo] ? meta.tipo : TIPOS[dicas.tipo] ? dicas.tipo : "";
    if (!tipo) {
      var cab = norm(tituloDoTexto(texto) + " " + (dicas.pedido || ""));
      tipo = /sequencia/.test(cab) ? "seq" : /plano de curso|plano anual|planejamento anual|ementa/.test(cab) ? "curso" : /relatorio|parecer|ata |ata$|conselho/.test(cab) ? "rel" : /plano de aula|aula|atividade|prova|avaliacao|exercicio/.test(cab) ? "aula" : "seq";
    }
    r.tipo = tipo; r.turma = t ? t.id : ""; r.disc = d ? d.id : ""; r.bim = b;
    return r;
  }

  // ── estilo ─────────────────────────────────────────────────────────
  function estilo() {
    return "<style>" +
      ".dc-tabs{display:flex;gap:4px;border-bottom:2px solid var(--md-linha);margin-bottom:14px;overflow-x:auto}" +
      ".dc-tab{padding:10px 16px;border:none;background:none;font:inherit;font-size:.86rem;font-weight:700;color:var(--cm);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;white-space:nowrap}" +
      ".dc-tab small{font-weight:600;opacity:.7;margin-left:4px}.dc-tab.on{color:var(--md-destaque);border-bottom-color:var(--md-destaque)}" +
      ".dc-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}" +
      ".dc-migalha{display:flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:.86rem;flex:1;min-width:200px}" +
      ".dc-migalha button{background:none;border:none;color:var(--md-destaque);font:inherit;font-weight:700;cursor:pointer;padding:2px 4px;border-radius:6px}.dc-migalha button:hover{background:var(--md-sup3)}" +
      ".dc-migalha span{color:var(--cm)}.dc-migalha b{padding:2px 4px}" +
      ".dc-filtros{display:grid;grid-template-columns:2fr repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px}" +
      ".dc-filtros input,.dc-filtros select{padding:8px 10px;border:2px solid var(--md-linha);border-radius:10px;font:inherit;font-size:.84rem;background:var(--md-sup2);color:var(--ce);min-width:0}" +
      ".dc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}" +
      ".dc-item{position:relative;border:1px solid var(--md-linha);background:var(--md-sup);border-radius:12px;padding:12px 12px 10px;cursor:pointer;display:flex;flex-direction:column;gap:5px;min-height:92px;text-align:left;font:inherit;color:var(--ce);transition:border-color .15s,transform .15s}" +
      ".dc-item:hover{border-color:var(--md-destaque);transform:translateY(-1px)}" +
      ".dc-item.pasta{background:var(--md-sup2)}.dc-item .ic{font-size:1.5rem;line-height:1}" +
      ".dc-item b{font-size:.86rem;line-height:1.3;word-break:break-word}.dc-item small{font-size:.72rem;color:var(--cm)}" +
      ".dc-chips{display:flex;flex-wrap:wrap;gap:4px}.dc-chip{font-size:.66rem;font-weight:700;border-radius:999px;padding:2px 8px;background:var(--md-sup3);color:var(--cm)}.dc-chip.ia{background:color-mix(in srgb,var(--md-destaque) 16%,transparent);color:var(--md-destaque)}" +
      ".dc-mn{position:absolute;top:6px;right:6px;border:none;background:none;cursor:pointer;font-size:1rem;color:var(--cm);padding:2px 6px;border-radius:6px}.dc-mn:hover{background:var(--md-sup3)}" +
      ".dc-sec{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--cm);margin:16px 0 8px}" +
      ".dc-vazio{border:2px dashed var(--md-linha);border-radius:14px;padding:26px 16px;text-align:center;color:var(--cm);font-size:.88rem;line-height:1.6}" +
      ".dc-prev{border:1px solid var(--md-linha);border-radius:12px;padding:16px 18px;background:var(--md-sup);max-height:52vh;overflow:auto;font-size:.9rem;line-height:1.6;color:var(--ce)}" +
      ".dc-prev h2,.dc-prev h3,.dc-prev h4,.dc-prev h5{color:var(--md-titulo);margin:12px 0 6px}.dc-prev p{margin:0 0 8px}.dc-prev ul,.dc-prev ol{margin:0 0 8px 22px}.dc-prev li.sub{margin-left:20px;list-style-type:circle}" +
      ".dc-prev table{border-collapse:collapse;width:100%;font-size:.82rem;margin:8px 0}.dc-prev th,.dc-prev td{border:1px solid var(--md-linha);padding:4px 7px;text-align:left;vertical-align:top}.dc-prev th{background:var(--md-sup3)}" +
      ".dc-prev blockquote{border-left:3px solid var(--md-linha);margin:6px 0;padding:2px 10px;color:var(--cm)}.dc-prev pre{background:var(--md-sup3);padding:8px;border-radius:8px;white-space:pre-wrap}" +
      ".dc-ed{width:100%;min-height:46vh;font-family:'DM Mono',ui-monospace,monospace;font-size:.82rem;line-height:1.55;padding:12px;border:2px solid var(--md-linha);border-radius:12px;background:var(--md-sup2);color:var(--ce);resize:vertical}" +
      ".dc-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}" +
      ".dc-tipos{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:6px 0 12px}" +
      ".dc-tipo{border:2px solid var(--md-linha);border-radius:12px;padding:10px 6px;background:var(--md-sup2);cursor:pointer;font:inherit;font-size:.78rem;font-weight:700;color:var(--ce);display:flex;flex-direction:column;align-items:center;gap:4px}" +
      ".dc-tipo span{font-size:1.3rem}.dc-tipo.on{border-color:var(--md-destaque);box-shadow:0 0 0 3px color-mix(in srgb,var(--md-destaque) 18%,transparent)}" +
      ".dc-auto{font-size:.74rem;color:var(--md-destaque);font-weight:700;margin:-4px 0 10px}" +
      ".dc-fmt{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px;margin:10px 0}" +
      ".dc-ov-w{max-width:940px!important;width:100%}" +
      "@media(max-width:700px){.dc-filtros{grid-template-columns:1fr 1fr}.dc-filtros input{grid-column:1/-1}.dc-tipos{grid-template-columns:1fr 1fr}.dc-grid{grid-template-columns:1fr 1fr}}" +
      "@media(max-width:420px){.dc-grid{grid-template-columns:1fr}}" +
      "</style>";
  }

  // ── desenho da aba ─────────────────────────────────────────────────
  function opcoesTurmas(sel, rotuloVazio) {
    return '<option value="">' + esc(rotuloVazio || "Todas as turmas") + "</option>" + turmas().map(function (t) { return '<option value="' + esc(t.id) + '"' + (t.id === sel ? " selected" : "") + ">" + esc(t.nome) + "</option>"; }).join("");
  }
  function opcoesDiscs(tid, sel, rotuloVazio) {
    var lista = [];
    if (tid) { var t = turmaQualquer(tid); lista = t ? t.disciplinas.map(function (d) { return { v: d.id, l: d.nome }; }) : []; }
    else { var vistos = {}; turmas().forEach(function (t) { t.disciplinas.forEach(function (d) { if (!vistos[norm(d.nome)]) { vistos[norm(d.nome)] = 1; lista.push({ v: "n:" + norm(d.nome), l: d.nome }); } }); }); }
    return '<option value="">' + esc(rotuloVazio || "Todas as disciplinas") + "</option>" + lista.map(function (o) { return '<option value="' + esc(o.v) + '"' + (o.v === sel ? " selected" : "") + ">" + esc(o.l) + "</option>"; }).join("");
  }
  function opcoesBims(sel, rotuloVazio) {
    var out = '<option value="">' + esc(rotuloVazio || "Todos os bimestres") + "</option>";
    for (var b = 1; b <= 4; b++) out += '<option value="' + b + '"' + (String(b) === String(sel) ? " selected" : "") + ">" + b + "º bimestre</option>";
    return out;
  }
  function passaFiltro(d) {
    if (ui.ft && d.turma !== ui.ft) return false;
    if (ui.fd) {
      if (ui.fd.indexOf("n:") === 0) { var t = turmaQualquer(d.turma), di = t && disc(t, d.disc); if (!di || "n:" + norm(di.nome) !== ui.fd) return false; }
      else if (d.disc !== ui.fd) return false;
    }
    if (ui.fb && String(d.bim) !== String(ui.fb)) return false;
    if (ui.busca) { var q = norm(ui.busca); if ((norm(d.titulo) + " " + norm(d.conteudo).slice(0, 5000)).indexOf(q) < 0) return false; }
    return true;
  }
  function cartaoDoc(d, comCaminho) {
    var t = turmaQualquer(d.turma), di = t && disc(t, d.disc);
    return '<button type="button" class="dc-item" data-doc="' + esc(d.id) + '"><span class="ic">' + TIPOS[d.tipo].ic + "</span><b>" + esc(d.titulo) + "</b>" +
      '<div class="dc-chips">' + (t ? '<span class="dc-chip">' + esc(t.nome) + "</span>" : "") + (di ? '<span class="dc-chip">' + esc(di.nome) + "</span>" : "") + (d.bim ? '<span class="dc-chip">' + d.bim + "º bim</span>" : "") + (d.origem === "ia" ? '<span class="dc-chip ia">🤖 I.A</span>' : "") + "</div>" +
      "<small>" + (comCaminho && d.pasta ? "📁 " + esc(caminhoTexto(d.pasta)) + " · " : "") + dataCurta(d.atualizado) + "</small></button>";
  }
  function desenhar() {
    var sec = document.getElementById("sec-docs");
    if (!sec || !M || !D) return;
    if (ui.pasta && !pasta(ui.pasta)) ui.pasta = "";
    var tipo = ui.tipo, filtrando = !!(ui.busca || ui.ft || ui.fd || ui.fb);
    var cab = '<div class="th"><div class="tb mr">📁</div><div class="ti"><h2>Documentos</h2><p>Sequências, planos de aula, planos de curso e relatórios em pastas · crie à mão ou com a 🤖 I.A e baixe em PDF, Word ou Excel</p></div></div>';
    var abas = '<div class="dc-tabs">' + ORDEM.map(function (k) { return '<button type="button" class="dc-tab' + (k === tipo ? " on" : "") + '" data-tipo="' + k + '">' + TIPOS[k].ic + " " + TIPOS[k].nome + "<small>" + docsVisiveis(k).length + "</small></button>"; }).join("") + "</div>";
    var mig = '<div class="dc-migalha"><button type="button" data-ir="">' + TIPOS[tipo].ic + " " + TIPOS[tipo].nome + "</button>" +
      caminho(ui.pasta).map(function (p, i, arr) { return "<span>›</span>" + (i === arr.length - 1 ? "<b>📁 " + esc(p.nome) + "</b>" : '<button type="button" data-ir="' + esc(p.id) + '">📁 ' + esc(p.nome) + "</button>"); }).join("") + "</div>";
    var barra = '<div class="dc-bar">' + mig +
      '<button type="button" class="md-btn mini" data-x="pasta">📁+ Nova ' + (ui.pasta ? "subpasta" : "pasta") + "</button>" +
      '<button type="button" class="md-btn mini" data-x="novo">＋ Novo documento</button>' +
      '<button type="button" class="md-btn mini pri" data-x="ia">🤖 Criar com a I.A</button>' +
      '<button type="button" class="md-btn mini" data-x="baixar" title="Baixar tudo desta pasta, com as subpastas">⬇️ Baixar ' + (ui.pasta ? "pasta" : "tudo") + "</button></div>";
    var filtros = '<div class="dc-filtros"><input type="search" data-f="busca" placeholder="🔎 Buscar em ' + esc(TIPOS[tipo].nome.toLowerCase()) + '" value="' + esc(ui.busca) + '">' +
      '<select data-f="ft">' + opcoesTurmas(ui.ft) + '</select><select data-f="fd">' + opcoesDiscs(ui.ft, ui.fd) + '</select><select data-f="fb">' + opcoesBims(ui.fb) + "</select></div>";
    var corpo = "";
    if (!pronto && !D.docs.length) corpo = '<div class="dc-vazio">☁️ Carregando os seus documentos…</div>';
    else if (filtrando) {
      var achados = docsVisiveis(tipo).filter(passaFiltro).sort(function (a, b) { return String(b.atualizado).localeCompare(String(a.atualizado)); });
      corpo = '<div class="dc-sec">' + achados.length + " documento(s) encontrado(s) em todas as pastas</div>" +
        (achados.length ? '<div class="dc-grid">' + achados.map(function (d) { return cartaoDoc(d, true); }).join("") + "</div>" : '<div class="dc-vazio">Nada encontrado com esses filtros.</div>');
    } else {
      var ps = filhas(tipo, ui.pasta), ds = docsVisiveis(tipo).filter(function (d) { return (d.pasta || "") === ui.pasta; }).sort(function (a, b) { return a.titulo.localeCompare(b.titulo, "pt-BR", { numeric: true }); });
      if (ps.length) corpo += '<div class="dc-sec">Pastas</div><div class="dc-grid">' + ps.map(function (p) {
        var n = contar(tipo, p.id), sub = filhas(tipo, p.id).length;
        return '<div class="dc-item pasta" data-pasta="' + esc(p.id) + '" role="button" tabindex="0"><span class="ic">📁</span><b>' + esc(p.nome) + "</b><small>" + n + " documento(s)" + (sub ? " · " + sub + " subpasta(s)" : "") + '</small><button type="button" class="dc-mn" data-menu="' + esc(p.id) + '" title="Opções da pasta" aria-label="Opções da pasta">⋯</button></div>';
      }).join("") + "</div>";
      if (ds.length) corpo += '<div class="dc-sec">Documentos</div><div class="dc-grid">' + ds.map(function (d) { return cartaoDoc(d, false); }).join("") + "</div>";
      if (!ps.length && !ds.length) corpo = '<div class="dc-vazio">' + (ui.pasta ? "Esta pasta está vazia." : "Nenhum documento em " + esc(TIPOS[tipo].nome.toLowerCase()) + " ainda.") +
        "<br>Crie uma <strong>pasta</strong> para organizar (ex.: por turma), escreva um <strong>novo documento</strong> ou peça à <strong>🤖 I.A</strong> — na aba I.A, use o filtro <strong>🧰 Ferramentas</strong>.</div>";
    }
    sec.innerHTML = cab + estilo() + '<div class="md-card">' + abas + barra + filtros + corpo + "</div>";
    ligar(sec);
  }
  function ligar(sec) {
    sec.querySelectorAll("[data-tipo]").forEach(function (b) { b.onclick = function () { ui.tipo = b.getAttribute("data-tipo"); ui.pasta = ""; desenhar(); }; });
    sec.querySelectorAll("[data-ir]").forEach(function (b) { b.onclick = function () { ui.pasta = b.getAttribute("data-ir"); desenhar(); }; });
    sec.querySelectorAll("[data-pasta]").forEach(function (el) {
      var abrir = function (e) { if (e.target.closest("[data-menu]")) return; ui.pasta = el.getAttribute("data-pasta"); ui.busca = ""; desenhar(); };
      el.onclick = abrir; el.onkeydown = function (e) { if (e.key === "Enter") abrir(e); };
    });
    sec.querySelectorAll("[data-menu]").forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); menuPasta(b.getAttribute("data-menu")); }; });
    sec.querySelectorAll("[data-doc]").forEach(function (b) { b.onclick = function () { abrirDoc(b.getAttribute("data-doc")); }; });
    var busca = sec.querySelector('[data-f="busca"]'), t0 = null;
    busca.oninput = function () { clearTimeout(t0); t0 = setTimeout(function () { ui.busca = busca.value; desenhar(); var b2 = document.querySelector('#sec-docs [data-f="busca"]'); if (b2) { b2.focus(); b2.setSelectionRange(b2.value.length, b2.value.length); } }, 250); };
    sec.querySelector('[data-f="ft"]').onchange = function () { ui.ft = this.value; ui.fd = ""; desenhar(); };
    sec.querySelector('[data-f="fd"]').onchange = function () { ui.fd = this.value; desenhar(); };
    sec.querySelector('[data-f="fb"]').onchange = function () { ui.fb = this.value; desenhar(); };
    sec.querySelector('[data-x="pasta"]').onclick = function () { nomePasta(null); };
    sec.querySelector('[data-x="novo"]').onclick = function () { editarDoc(null); };
    sec.querySelector('[data-x="ia"]').onclick = function () { M.irPara("ia"); if (window.MeuDiarioIA && window.MeuDiarioIA.ferramentas) window.MeuDiarioIA.ferramentas(ui.tipo); };
    sec.querySelector('[data-x="baixar"]').onclick = function () { escolherFormato("Baixar " + (ui.pasta ? "a pasta " + caminhoTexto(ui.pasta) : "todos os documentos de " + TIPOS[ui.tipo].nome), true, function (fmt) { return baixarPasta(ui.tipo, ui.pasta, fmt); }); };
  }

  // ── pastas: criar, renomear, mover, excluir ─────────────────────────
  function nomePasta(id) {
    var p = id ? pasta(id) : null;
    modal("<h2>" + (p ? "✏️ Renomear pasta" : "📁 Nova " + (ui.pasta ? "subpasta" : "pasta")) + "</h2>" +
      '<p style="font-size:.84rem;color:var(--cm);margin:4px 0 12px">' + esc(TIPOS[ui.tipo].nome) + (ui.pasta && !p ? " › " + esc(caminhoTexto(ui.pasta)) : "") + "</p>" +
      '<div class="md-f"><label>Nome</label><input type="text" data-n value="' + esc(p ? p.nome : "") + '" placeholder="Ex.: 1ª Série A, Língua Portuguesa, 1º Bimestre…" maxlength="80"></div>' +
      '<div class="md-row" style="justify-content:flex-end"><button type="button" class="md-btn" data-fechar>Cancelar</button><button type="button" class="md-btn pri" data-ok>Salvar</button></div>',
      function (ov) {
        var i = ov.querySelector("[data-n]"); i.focus();
        var ok = function () {
          var nome = i.value.trim(); if (!nome) return M.toast("Dê um nome à pasta.");
          if (p) p.nome = nome.slice(0, 80); else criarPasta(ui.tipo, nome, ui.pasta);
          if (salvar()) ov.remove();
        };
        ov.querySelector("[data-ok]").onclick = ok;
        i.onkeydown = function (e) { if (e.key === "Enter") ok(); };
      });
  }
  function menuPasta(id) {
    var p = pasta(id); if (!p) return;
    var n = contar(p.tipo, id);
    modal("<h2>📁 " + esc(p.nome) + '</h2><p style="font-size:.84rem;color:var(--cm);margin:4px 0 14px">' + esc(TIPOS[p.tipo].nome) + " › " + esc(caminhoTexto(id)) + " · " + n + " documento(s)</p>" +
      '<div style="display:grid;gap:8px"><button type="button" class="md-btn" data-a="abrir">📂 Abrir</button><button type="button" class="md-btn" data-a="ren">✏️ Renomear</button>' +
      '<div class="md-f" style="margin:0"><label>Mover para</label><div class="md-row" style="margin:0"><select class="md-in" data-dest>' + opcoesPastas(p.tipo, p.pai || "", false).replace(new RegExp('<option value="(' + descendentes(id).map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ')"[^>]*>[^<]*</option>', "g"), "") + '</select><button type="button" class="md-btn mini" data-a="mover">Mover</button></div></div>' +
      '<button type="button" class="md-btn" data-a="baixar">⬇️ Baixar a pasta</button><button type="button" class="md-btn perigo" data-a="excluir">🗑 Excluir pasta</button></div>' +
      '<div class="md-row" style="justify-content:flex-end;margin-top:12px"><button type="button" class="md-btn" data-fechar>Fechar</button></div>',
      function (ov) {
        var a = function (k) { return ov.querySelector('[data-a="' + k + '"]'); };
        a("abrir").onclick = function () { ov.remove(); ui.pasta = id; desenhar(); };
        a("ren").onclick = function () { ov.remove(); nomePasta(id); };
        a("mover").onclick = function () { p.pai = ov.querySelector("[data-dest]").value; if (salvar()) { ov.remove(); M.toast("Pasta movida."); } };
        a("baixar").onclick = function () { ov.remove(); escolherFormato("Baixar a pasta " + p.nome, true, function (fmt) { return baixarPasta(p.tipo, id, fmt); }); };
        a("excluir").onclick = function () {
          var ids = descendentes(id), docs = D.docs.filter(function (d) { return ids.indexOf(d.pasta) >= 0; });
          if (!confirm("Excluir a pasta “" + p.nome + "”" + (ids.length > 1 ? ", as " + (ids.length - 1) + " subpasta(s)" : "") + (docs.length ? " e os " + docs.length + " documento(s) dentro dela" : "") + "? Não dá para desfazer.")) return;
          D.pastas = D.pastas.filter(function (x) { return ids.indexOf(x.id) < 0; });
          D.docs = D.docs.filter(function (d) { return ids.indexOf(d.pasta) < 0; });
          if (ids.indexOf(ui.pasta) >= 0) ui.pasta = p.pai || "";
          if (salvar()) { ov.remove(); M.toast("Pasta excluída."); }
        };
      });
  }

  // ── ver / editar documento ─────────────────────────────────────────
  function camposMeta(o, tipoSel) {
    return '<div class="dc-meta"><div class="md-f"><label>Turma</label><select data-m="turma">' + opcoesTurmas(o.turma, "— sem turma —") + "</select></div>" +
      '<div class="md-f"><label>Disciplina</label><select data-m="disc">' + discsDaTurma(o.turma, o.disc) + "</select></div>" +
      '<div class="md-f"><label>Bimestre</label><select data-m="bim">' + opcoesBims(o.bim || "", "— sem bimestre —") + "</select></div>" +
      (tipoSel ? '<div class="md-f"><label>Aba</label><select data-m="tipo">' + ORDEM.map(function (k) { return '<option value="' + k + '"' + (k === o.tipo ? " selected" : "") + ">" + TIPOS[k].ic + " " + TIPOS[k].nome + "</option>"; }).join("") + "</select></div>" : "") + "</div>";
  }
  function ligarMeta(ov, aoMudar) {
    var st = ov.querySelector('[data-m="turma"]'), sd = ov.querySelector('[data-m="disc"]');
    st.onchange = function () { sd.innerHTML = discsDaTurma(st.value, ""); if (aoMudar) aoMudar(); };
    sd.onchange = function () { if (aoMudar) aoMudar(); };
  }
  function discsDaTurma(tid, sel) {
    var t = tid && turmaQualquer(tid);
    return '<option value="">— sem disciplina —</option>' + (t ? t.disciplinas.map(function (d) { return '<option value="' + esc(d.id) + '"' + (d.id === sel ? " selected" : "") + ">" + esc(d.nome) + "</option>"; }).join("") : "");
  }
  function lerMeta(ov) { var v = function (k) { var el = ov.querySelector('[data-m="' + k + '"]'); return el ? el.value : ""; }; return { turma: v("turma"), disc: v("disc"), bim: parseInt(v("bim"), 10) || 0, tipo: v("tipo") }; }

  function abrirDoc(id) {
    var d = doc(id); if (!d) return;
    modal('<div class="dc-ov-w"><h2>' + TIPOS[d.tipo].ic + " " + esc(d.titulo) + '</h2><p style="font-size:.8rem;color:var(--cm);margin:4px 0 12px">' +
      infoDoc(d).filter(function (x) { return x[1] && x[0] !== "Professor(a)"; }).map(function (x) { return esc(x[1]); }).join(" · ") + (d.pasta ? " · 📁 " + esc(caminhoTexto(d.pasta)) : "") + (d.origem === "ia" ? " · 🤖 criado com a I.A" : "") + "</p>" +
      '<div class="dc-prev">' + (X() ? X().html(d.conteudo) : esc(d.conteudo)) + "</div>" +
      '<div class="md-row md-noprint" style="flex-wrap:wrap;margin-top:12px"><button type="button" class="md-btn pri" data-a="editar">✏️ Editar</button><button type="button" class="md-btn" data-a="baixar">⬇️ Baixar</button>' +
      '<button type="button" class="md-btn" data-a="copiar">📋 Copiar texto</button><button type="button" class="md-btn" data-a="duplicar">⧉ Duplicar</button><button type="button" class="md-btn" data-a="ia">🤖 Melhorar com a I.A</button>' +
      '<span style="flex:1"></span><button type="button" class="md-btn perigo" data-a="excluir">🗑</button><button type="button" class="md-btn" data-fechar>Fechar</button></div></div>',
      function (ov) {
        var a = function (k) { return ov.querySelector('[data-a="' + k + '"]'); };
        a("editar").onclick = function () { editarDoc(id); };
        a("baixar").onclick = function () { escolherFormato("Baixar “" + d.titulo + "”", false, function (fmt) { return X().baixar(paraExportar(d), fmt); }); };
        a("copiar").onclick = function () { copiar(d.conteudo); };
        a("duplicar").onclick = function () { var c = criarDoc(Object.assign({}, d, { id: "", titulo: d.titulo + " (cópia)", criado: "" })); if (salvar()) abrirDoc(c.id); };
        a("ia").onclick = function () {
          ov.remove(); M.irPara("ia");
          if (window.MeuDiarioIA) window.MeuDiarioIA.sugerir("Melhore este documento (" + TIPOS[d.tipo].um + "), mantendo a estrutura e completando o que faltar:\n\n# " + d.titulo + "\n\n" + d.conteudo);
        };
        a("excluir").onclick = function () { if (!confirm("Excluir “" + d.titulo + "”? Não dá para desfazer.")) return; D.docs = D.docs.filter(function (x) { return x.id !== id; }); if (salvar()) { ov.remove(); M.toast("Documento excluído."); } };
      });
  }
  function editarDoc(id) {
    var d = id ? doc(id) : null;
    var o = d || { tipo: ui.tipo, pasta: ui.pasta, titulo: "", conteudo: "", turma: ui.ft || "", disc: ui.fd && ui.fd.indexOf("n:") ? ui.fd : "", bim: parseInt(ui.fb, 10) || 0 };
    modal('<div class="dc-ov-w"><h2>' + (d ? "✏️ Editar documento" : "＋ Novo documento") + "</h2>" +
      '<div class="md-f" style="margin-top:10px"><label>Título</label><input type="text" data-e="titulo" value="' + esc(o.titulo) + '" placeholder="Ex.: Sequência — Gêneros textuais" maxlength="160"></div>' +
      camposMeta(o, true) +
      '<div class="md-f"><label>Pasta</label><select data-e="pasta">' + opcoesPastas(o.tipo, o.pasta || "", false) + "</select></div>" +
      '<div class="md-f"><label>Conteúdo</label><textarea class="dc-ed" data-e="conteudo" placeholder="Escreva aqui. Dicas: ## Título da seção · - item de lista · 1. item numerado · **negrito** · tabelas com | coluna | coluna |">' + esc(o.conteudo) + "</textarea></div>" +
      '<div class="md-row" style="flex-wrap:wrap"><button type="button" class="md-btn pri" data-a="salvar">💾 Salvar</button><button type="button" class="md-btn" data-a="previa">👁 Prévia</button><span style="flex:1"></span><button type="button" class="md-btn" data-fechar>Cancelar</button></div></div>',
      function (ov) {
        ligarMeta(ov);
        var tipoSel = ov.querySelector('[data-m="tipo"]');
        tipoSel.onchange = function () { ov.querySelector('[data-e="pasta"]').innerHTML = opcoesPastas(tipoSel.value, "", false); };
        ov.querySelector('[data-a="previa"]').onclick = function () {
          var w = window.open("", "_blank"); if (!w) return M.toast("Permita pop-ups para ver a prévia.");
          w.document.write("<meta charset='utf-8'><title>Prévia</title><body style='font-family:Georgia,serif;max-width:760px;margin:30px auto;line-height:1.6'>" + X().html(ov.querySelector('[data-e="conteudo"]').value) + "</body>");
          w.document.close();
        };
        ov.querySelector('[data-a="salvar"]').onclick = function () {
          var m = lerMeta(ov), titulo = ov.querySelector('[data-e="titulo"]').value.trim(), conteudo = ov.querySelector('[data-e="conteudo"]').value;
          if (!titulo && !conteudo.trim()) return M.toast("Escreva um título ou o conteúdo.");
          var novo = criarDoc(Object.assign({}, d || {}, { id: d ? d.id : "", tipo: m.tipo, pasta: ov.querySelector('[data-e="pasta"]').value, titulo: titulo || tituloDoTexto(conteudo), conteudo: conteudo, turma: m.turma, disc: m.disc, bim: m.bim }));
          if (!salvar()) return;
          ui.tipo = novo.tipo; ui.pasta = novo.pasta;
          M.toast("Documento salvo."); abrirDoc(novo.id); desenhar();
        };
      });
  }

  // ── baixar ─────────────────────────────────────────────────────────
  function escolherFormato(titulo, pastaInteira, fazer) {
    if (!X()) return M.toast("O gerador de arquivos não carregou. Recarregue a página.");
    modal("<h2>⬇️ " + esc(titulo) + '</h2><p style="font-size:.84rem;color:var(--cm);margin:4px 0 4px">' + (pastaInteira ? "Cada documento sai num arquivo, dentro de um .zip com as mesmas subpastas. Em PDF, sai um documento só, com uma página por documento." : "Escolha o formato.") + "</p>" +
      '<div class="dc-fmt">' + X().FORMATOS.map(function (f) { return '<button type="button" class="md-btn" data-fmt="' + f.id + '">' + f.rotulo + (pastaInteira && f.id !== "pdf" ? " · .zip" : "") + "</button>"; }).join("") + "</div>" +
      '<div class="md-row" style="justify-content:flex-end"><span data-msg style="font-size:.8rem;color:var(--cm);flex:1"></span><button type="button" class="md-btn" data-fechar>Fechar</button></div>',
      function (ov) {
        ov.querySelectorAll("[data-fmt]").forEach(function (b) {
          b.onclick = async function () {
            var msg = ov.querySelector("[data-msg]");
            ov.querySelectorAll("[data-fmt]").forEach(function (x) { x.disabled = true; });
            msg.textContent = "Gerando…";
            try { await fazer(b.getAttribute("data-fmt")); ov.remove(); }
            catch (e) { msg.textContent = "✖ " + ((e && e.message) || e); ov.querySelectorAll("[data-fmt]").forEach(function (x) { x.disabled = false; }); }
          };
        });
      });
  }
  function baixarPasta(tipo, pastaId, fmt) {
    var raiz = pastaId ? caminho(pastaId).length : 0, nome = pastaId ? pasta(pastaId).nome : TIPOS[tipo].nome;
    var ids = pastaId ? descendentes(pastaId) : null;
    var itens = docsVisiveis(tipo).filter(function (d) { return !ids || ids.indexOf(d.pasta) >= 0; })
      .map(function (d) { return { caminho: caminho(d.pasta).slice(raiz).map(function (p) { return p.nome; }).join("/"), doc: paraExportar(d) }; })
      .sort(function (a, b) { return (a.caminho + "/" + a.doc.titulo).localeCompare(b.caminho + "/" + b.doc.titulo, "pt-BR", { numeric: true }); });
    return X().baixarPasta(nome, itens, fmt);
  }
  function copiar(texto) {
    var feito = function () { M.toast("Texto copiado."); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(feito, function () { M.toast("Não consegui copiar."); });
    else { var t = document.createElement("textarea"); t.value = texto; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); feito(); } catch (e) {} t.remove(); }
  }

  // ── salvar uma resposta da I.A ─────────────────────────────────────
  // o = {texto, meta (bloco ```documento```), dicas: {tipo, turma, disciplina, bimestre, pedido}, ferramenta}
  function salvarDaIA(o) {
    o = o || {};
    if (!pronto) return M.toast("Aguarde: sincronizando os seus documentos…");
    var det = detectar(o.texto, o.meta, o.dicas);
    var titulo = (o.meta && o.meta.titulo) || tituloDoTexto(o.texto) || "Documento da I.A";
    var estado = { tipo: det.tipo, turma: det.turma, disc: det.disc, bim: det.bim, pasta: det.turma ? AUTO : "" };
    var rotuloAuto = function () { var t = turmaQualquer(estado.turma), d = t && disc(t, estado.disc); return t ? t.nome + (d ? " › " + d.nome : "") : "escolha a turma"; };
    var achou = [det.turma && "turma", det.disc && "disciplina", det.bim && "bimestre"].filter(Boolean);
    modal('<div class="dc-ov-w"><h2>💾 Salvar em Documentos</h2>' +
      '<p style="font-size:.82rem;color:var(--cm);margin:4px 0 8px">' + (achou.length ? "✨ A I.A identificou " + achou.join(", ") + ". Confira antes de salvar." : "Escolha onde guardar.") + "</p>" +
      '<div class="dc-tipos">' + ORDEM.map(function (k) { return '<button type="button" class="dc-tipo' + (k === estado.tipo ? " on" : "") + '" data-t="' + k + '"><span>' + TIPOS[k].ic + "</span>" + TIPOS[k].nome + "</button>"; }).join("") + "</div>" +
      '<div class="md-f"><label>Título</label><input type="text" data-e="titulo" value="' + esc(titulo) + '" maxlength="160"></div>' +
      camposMeta(estado, false) +
      '<div class="md-f"><label>Pasta</label><div class="md-row" style="margin:0"><select class="md-in" data-e="pasta">' + opcoesPastas(estado.tipo, estado.pasta, true, rotuloAuto()) + '</select><button type="button" class="md-btn mini" data-a="nova">📁+ Nova</button></div></div>' +
      '<div class="dc-auto" data-auto></div>' +
      '<details><summary style="cursor:pointer;font-size:.82rem;color:var(--cm)">Ver o texto que será salvo</summary><div class="dc-prev" style="margin-top:8px;max-height:30vh">' + X().html(o.texto) + "</div></details>" +
      '<div class="md-row" style="flex-wrap:wrap;margin-top:12px"><button type="button" class="md-btn pri" data-a="salvar">💾 Salvar</button><span style="flex:1"></span><button type="button" class="md-btn" data-fechar>Cancelar</button></div></div>',
      function (ov) {
        var selP = ov.querySelector('[data-e="pasta"]');
        var dica = function () {
          var el = ov.querySelector("[data-auto]");
          el.textContent = selP.value === AUTO ? (estado.turma ? "Será criada (se não existir): " + TIPOS[estado.tipo].nome + " › " + rotuloAuto() : "Escolha a turma para a pasta automática.") : "";
        };
        var redesenharPastas = function (sel) { selP.innerHTML = opcoesPastas(estado.tipo, sel === undefined ? selP.value : sel, true, rotuloAuto()); dica(); };
        ligarMeta(ov, function () { var m = lerMeta(ov); estado.turma = m.turma; estado.disc = m.disc; redesenharPastas(); });
        selP.onchange = dica; dica();
        ov.querySelectorAll("[data-t]").forEach(function (b) {
          b.onclick = function () {
            estado.tipo = b.getAttribute("data-t");
            ov.querySelectorAll("[data-t]").forEach(function (x) { x.classList.toggle("on", x === b); });
            redesenharPastas(selP.value === AUTO ? AUTO : "");
          };
        });
        ov.querySelector('[data-a="nova"]').onclick = function () {
          var pai = selP.value === AUTO ? "" : selP.value;
          var nome = window.prompt("Nome da nova pasta" + (pai ? " (dentro de " + caminhoTexto(pai) + ")" : "") + ":");
          if (!nome || !nome.trim()) return;
          var p = criarPasta(estado.tipo, nome, pai);
          redesenharPastas(p.id);
        };
        ov.querySelector('[data-a="salvar"]').onclick = function () {
          var m = lerMeta(ov), p = selP.value;
          if (p === AUTO) p = m.turma ? pastaAuto(estado.tipo, m.turma, m.disc) : "";
          var d = criarDoc({ tipo: estado.tipo, pasta: p, titulo: ov.querySelector('[data-e="titulo"]').value.trim() || titulo, conteudo: o.texto, turma: m.turma, disc: m.disc, bim: m.bim, origem: "ia", ferramenta: o.ferramenta || "" });
          if (!salvar()) return;
          ov.remove();
          ui.tipo = d.tipo; ui.pasta = d.pasta;
          toastAbrir("Salvo em " + TIPOS[d.tipo].nome + (d.pasta ? " › " + caminhoTexto(d.pasta) : "") + ".", d.id);
          if (o.aoSalvar) o.aoSalvar(d);
        };
      });
  }
  // Aviso com botão "Abrir".
  function toastAbrir(msg, id) {
    var t = document.createElement("div"); t.className = "md-toast";
    t.innerHTML = esc(msg) + ' <button type="button" style="margin-left:8px;background:#fff;color:#1a3a2a;border:none;border-radius:999px;padding:3px 10px;font-weight:700;cursor:pointer">Abrir</button>';
    t.querySelector("button").onclick = function () { t.remove(); M.irPara("docs"); abrirDoc(id); };
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 6000);
  }

  // ── migração das sequências antigas ────────────────────────────────
  function migrarSequencias() {
    if (D.migrado.seq) return;
    var R = window.MeuDiarioRecursos && window.MeuDiarioRecursos.dados();
    // Sem os recursos lidos (aparelho novo, banco ainda não respondeu), tenta depois.
    if (!R || !R.atualizadoEm) return;
    var n = 0;
    Object.keys(R.seq || {}).forEach(function (k) {
      var s = R.seq[k] || {}, p = k.split("|"), t = turmaQualquer(p[0]);
      var partes = [["Objetivo", s.objetivo], ["Ferramentas e recursos", s.recursos], ["Etapas", s.etapas], ["Observações", s.observacoes]]
        .filter(function (x) { return x[1]; }).map(function (x) { return "## " + x[0] + "\n\n" + x[1]; });
      if (s.url) partes.push("## Arquivo\n\n" + s.url);
      if ((s.hist || []).length) partes.push("## Sequências concluídas antes\n\n" + s.hist.map(function (h) { return "- " + (h.titulo || "Sem título") + (h.data ? " (concluída em " + h.data + ")" : ""); }).join("\n"));
      if (!s.titulo && !partes.length) return;
      var id = "seq-" + k.replace(/\|/g, "-");
      if (doc(id)) return;
      var pastaId = "";
      if (t) {
        var e0 = t.escolaId || "";
        var pt = D.pastas.filter(function (x) { return x.tipo === "seq" && !x.pai && norm(x.nome) === norm(t.nome) && (x.escolaId || "") === e0; })[0];
        if (!pt) { pt = { id: M.novoId("pa"), tipo: "seq", nome: t.nome, pai: "", escolaId: e0, criado: agora() }; D.pastas.push(pt); }
        var di = disc(t, p[1]);
        if (di) {
          var pd = D.pastas.filter(function (x) { return x.pai === pt.id && norm(x.nome) === norm(di.nome); })[0];
          if (!pd) { pd = { id: M.novoId("pa"), tipo: "seq", nome: di.nome, pai: pt.id, escolaId: e0, criado: agora() }; D.pastas.push(pd); }
          pastaId = pd.id;
        } else pastaId = pt.id;
      }
      criarDoc({ id: id, tipo: "seq", pasta: pastaId, titulo: s.titulo || "Sequência do " + p[2] + "º bimestre", conteudo: partes.join("\n\n"), turma: p[0], disc: p[1], bim: parseInt(p[2], 10) || 0, escolaId: t ? t.escolaId || "" : "", origem: "migrado" });
      n++;
    });
    D.migrado.seq = new Date().toISOString();
    salvar();
    if (n) M.toast(n + " sequência(s) antiga(s) agora estão em 📁 Documentos › Sequências.");
  }

  // ── resumo para a I.A ──────────────────────────────────────────────
  function resumo() {
    var out = {};
    ORDEM.forEach(function (k) {
      var lista = docsVisiveis(k).slice().sort(function (a, b) { return String(b.atualizado).localeCompare(String(a.atualizado)); }).slice(0, 25);
      if (lista.length) out[TIPOS[k].nome] = lista.map(function (d) { var t = turmaQualquer(d.turma), di = t && disc(t, d.disc); return [d.titulo, t ? t.nome : "", di ? di.nome : "", d.bim ? d.bim + "º bim" : "", d.pasta ? caminhoTexto(d.pasta) : ""].filter(Boolean).join(" · "); });
    });
    return out;
  }

  window.MeuDiarioDocumentos = {
    TIPOS: TIPOS,
    salvarDaIA: salvarDaIA,
    detectar: function (texto, meta, dicas) { return detectar(texto, meta, dicas); },
    // Ação "documento" da I.A (salva direto, com pasta automática).
    criar: function (o) {
      if (!pronto) throw new Error("Os documentos ainda estão sincronizando. Tente de novo em instantes.");
      var det = detectar(o.conteudo, { tipo: o.tipo, turma: o.turma, disciplina: o.disciplina, bimestre: o.bimestre }, {});
      var p = o.pasta ? criarPastaCaminho(det.tipo, o.pasta) : (det.turma ? pastaAuto(det.tipo, det.turma, det.disc) : "");
      var d = criarDoc({ tipo: det.tipo, pasta: p, titulo: o.titulo, conteudo: o.conteudo, turma: det.turma, disc: det.disc, bim: det.bim, origem: "ia", ferramenta: o.ferramenta || "" });
      salvar();
      return { doc: d, onde: TIPOS[d.tipo].nome + (d.pasta ? " › " + caminhoTexto(d.pasta) : "") };
    },
    abrir: function (id) { M.irPara("docs"); abrirDoc(id); },
    resumo: resumo,
    pronto: function () { return pronto; },
    // Sequências antigas das escolas do administrador: id fixo (não duplica
    // entre aparelhos), pasta Turma › Disciplina.
    importar: function (lista) {
      if (!pronto) return 0;
      var n = 0;
      (lista || []).forEach(function (o) {
        if (doc(o.id)) return;
        var tipo = TIPOS[o.tipo] ? o.tipo : "seq", t = turmaQualquer(o.turma), di = t && disc(t, o.disc);
        var pt = t ? criarPasta(tipo, t.nome, "") : null;
        var pastaId = pt ? (di ? criarPasta(tipo, di.nome, pt.id).id : pt.id) : "";
        criarDoc(Object.assign({}, o, { tipo: tipo, pasta: pastaId, origem: "migrado" }));
        n++;
      });
      if (n) salvar();
      return n;
    },
    // Exclusão de turmas (ou da escola inteira, com as pastas dela).
    removerTurmas: function (ids, escolaIdExcluida) {
      var alvo = {}; (ids || []).forEach(function (t) { alvo[t] = 1; });
      var antes = D.docs.length + D.pastas.length;
      D.docs = D.docs.filter(function (d) { return !alvo[d.turma] && (!escolaIdExcluida || d.escolaId !== escolaIdExcluida); });
      if (escolaIdExcluida) D.pastas = D.pastas.filter(function (p) { return p.escolaId !== escolaIdExcluida; });
      var n = antes - D.docs.length - D.pastas.length;
      if (n && pronto) salvar();
      return n;
    }
  };
  // "Pasta A/Pasta B" → cria o caminho.
  function criarPastaCaminho(tipo, texto) {
    var pai = "";
    String(texto).split(/[\/›>]/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 6).forEach(function (nome) { pai = criarPasta(tipo, nome, pai).id; });
    return pai;
  }

  (window.MD_MODULOS = window.MD_MODULOS || []).push({
    nome: "documentos",
    iniciar: function (api) {
      M = api;
      D = lerLocal();
      var S = M.sync();
      sync = S.createScopeSync({
        perUser: true, scope: SCOPE, source: "meu-diario-documentos", debounceMs: 300,
        getLocalPayload: function () { return D; },
        onRemotePayload: aplicarRemoto,
        onStatus: function (s) { M.status("documentos", s); }
      });
      // Só grava depois da primeira leitura do banco.
      Promise.resolve(sync.start()).then(function () {
        pronto = true; desenhar();
        // A migração espera as sequências antigas chegarem do banco.
        var tentativas = 0;
        var tentar = function () { migrarSequencias(); if (!D.migrado.seq && ++tentativas < 10) setTimeout(tentar, 6000); };
        setTimeout(tentar, 6000);
      }, function () { pronto = true; desenhar(); });
    },
    desenhar: desenhar,
    exportar: function () { return { documentos: D }; }
  });
})();
