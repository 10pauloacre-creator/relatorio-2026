// Aba "📅 Cronograma" da Casavequia (21/09/2026).
//
// O cronograma semanal saiu da aba Contador e virou aba própria, editável:
// adicionar, editar e excluir aulas (dia, horário, disciplina, turmas e h/aula).
//
// - Grade inicial: lida uma vez dos cartões que ficavam no Contador
//   (#card-seg-cont…); depois esses cartões saem da página.
// - Gravação: localStorage + Supabase (escopo casavequia:cronograma-semanal:shared-v1).
// - Projeções: pcProjectionBuildScheduleMap passa a ler esta grade, e cada
//   edição chama pcSyncProjectionSeed, então o Contador e a página de
//   projeções acompanham as mudanças.
// Tudo o que é criado aqui tem data-runtime-ui (fora do layout salvo).
(function () {
  "use strict";
  if (window.CronogramaSemanal) return;

  var LS = "pc_cronograma_semanal_v1";
  var SCOPE = "casavequia:cronograma-semanal:shared-v1";
  var DIAS = [
    { k: "seg", n: 1, nome: "☀️ Segunda-feira", cls: "c-se" },
    { k: "ter", n: 2, nome: "🌤 Terça-feira", cls: "c-te" },
    { k: "qua", n: 3, nome: "🌿 Quarta-feira", cls: "c-qa" },
    { k: "qui", n: 4, nome: "🎨 Quinta-feira", cls: "c-qu" },
    { k: "sex", n: 5, nome: "🌅 Sexta-feira", cls: "c-sx" },
    { k: "sab", n: 6, nome: "📘 Sábado", cls: "c-sb" }
  ];
  var DISC_PADRAO = ["Língua Portuguesa", "Trilhas de Linguagens", "Trilhas de C. Humanas", "Artes"];

  var estado = null, sync = null, secao = null, modal = null;

  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function dois(n) { return ("0" + n).slice(-2); }
  function novoId() { return "s" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); }
  function agora() { return new Date().toISOString(); }
  function turmasLabel() { return window.PC_TURMA_LABELS || { t1: "1ª Série", t2: "2ª Série", t3: "3ª Série", t6: "6º Ano" }; }
  function minutos(h) { var m = /^(\d{1,2}):(\d{2})$/.exec(h || ""); return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null; }
  function horaBr(h) { return String(h || "").replace(":", "h"); }
  function classeDisc(d) {
    var t = String(d || "").toLowerCase();
    if (t.indexOf("humanas") >= 0) return "sl-tc";
    if (t.indexOf("trilha") >= 0 || t.indexOf("linguagens") >= 0) return "sl-tl";
    if (t.indexOf("arte") >= 0) return "sl-ar";
    return "sl-lp";
  }
  function textoTurmas(s) {
    var L = turmasLabel();
    var nomes = (s.turmas || []).map(function (t) { return L[t] || t; });
    var txt;
    if (nomes.length > 1 && nomes.every(function (n) { return / Série$/.test(n); })) {
      txt = nomes.slice(0, -1).map(function (n) { return n.replace(/ Série$/, ""); }).join(", ") + " e " + nomes[nomes.length - 1] + " (juntas)";
    } else txt = nomes.join(" e ");
    return txt || "Sem turma";
  }
  function ordenar(lista) { return lista.sort(function (a, b) { return (minutos(a.ini) || 0) - (minutos(b.ini) || 0); }); }

  // ── grade inicial a partir dos cartões do Contador ─────────────
  function lerCartoes() {
    var dias = {};
    DIAS.forEach(function (d) { dias[d.k] = []; });
    var extrair = window.pcProjectionExtractTurmas;
    DIAS.forEach(function (d) {
      var card = document.getElementById("card-" + d.k + "-cont");
      if (!card) return;
      card.querySelectorAll(".sl").forEach(function (sl) {
        var hora = ((sl.querySelector(".sh") || {}).textContent || "").replace(/h/g, ":");
        var m = /(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/.exec(hora);
        var meta = ((sl.querySelector(".st2") || {}).textContent || "").trim();
        var h = /(\d+)\s*h\/a/i.exec(meta);
        dias[d.k].push({
          id: novoId(),
          ini: m ? dois(m[1]) + ":" + m[2] : "",
          fim: m ? dois(m[3]) + ":" + m[4] : "",
          disc: ((sl.querySelector(".sd") || {}).textContent || "").trim(),
          turmas: turmasDoTexto(meta, extrair),
          haula: h ? parseInt(h[1], 10) : 1
        });
      });
    });
    return { versao: 1, dias: dias, atualizadoEm: "" };
  }
  // "2ª e 3ª Série (juntas)" → t2 e t3 (o leitor antigo das projeções só via a 3ª).
  function turmasDoTexto(meta, extrair) {
    var L = turmasLabel(), achadas = [];
    var serie = /((?:\d+ª\s*(?:,|e)\s*)*\d+ª)\s*Série/g, m;
    while ((m = serie.exec(meta))) {
      (m[1].match(/\d+/g) || []).forEach(function (n) {
        var t = Object.keys(L).filter(function (k) { return L[k] === n + "ª Série"; })[0];
        if (t && achadas.indexOf(t) < 0) achadas.push(t);
      });
    }
    var ano = /(\d+)º\s*Ano/g;
    while ((m = ano.exec(meta))) {
      var t2 = Object.keys(L).filter(function (k) { return L[k] === m[1] + "º Ano"; })[0];
      if (t2 && achadas.indexOf(t2) < 0) achadas.push(t2);
    }
    if (achadas.length) return achadas;
    return typeof extrair === "function" ? extrair(meta) : [];
  }
  function lerLocal() { try { return JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) { return null; } }
  function gravarLocal() { try { localStorage.setItem(LS, JSON.stringify(estado)); } catch (e) {} }
  function valido(e) { return e && e.dias && typeof e.dias === "object"; }

  // ── mapa para as projeções: {disciplina: {turma: {dia: horas}}} ──
  function mapa() {
    var out = {};
    DIAS.forEach(function (d) {
      (estado.dias[d.k] || []).forEach(function (s) {
        if (!s.disc || !s.haula) return;
        (s.turmas || []).forEach(function (t) {
          out[s.disc] = out[s.disc] || {};
          out[s.disc][t] = out[s.disc][t] || {};
          out[s.disc][t][d.n] = (out[s.disc][t][d.n] || 0) + s.haula;
        });
      });
    });
    return out;
  }

  function mudou(motivo) {
    estado.atualizadoEm = agora();
    gravarLocal();
    desenhar();
    if (sync) sync.schedulePush(motivo || "cronograma");
    if (typeof window.pcSyncProjectionSeed === "function") { try { window.pcSyncProjectionSeed("cronograma"); } catch (e) {} }
  }

  // ── estilo ──────────────────────────────────────────────────────
  function estilo() {
    if (document.getElementById("cs-style")) return;
    var s = document.createElement("style");
    s.id = "cs-style";
    s.setAttribute("data-runtime-ui", "cronograma");
    s.textContent =
      ".c-qa{background:#2f7d6d}.c-sb{background:#5b4a8a}" +
      ".cs-barra{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:16px}" +
      ".cs-btn{border:1px solid var(--cl,#e8e5de);background:var(--cr,#faf8f2);color:var(--ce,#2b2b2b);border-radius:10px;padding:9px 14px;font:700 .82rem 'DM Sans',sans-serif;cursor:pointer}" +
      ".cs-btn.pri{background:var(--vm,#2d6147);border-color:var(--vm,#2d6147);color:#fff}" +
      ".cs-mais{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);color:#fff;border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:1rem;line-height:1}" +
      ".cs-sl{position:relative;padding-right:58px}" +
      ".cs-acoes{position:absolute;top:6px;right:6px;display:flex;gap:4px}" +
      ".cs-acoes button{width:24px;height:24px;border-radius:6px;border:1px solid rgba(0,0,0,.08);background:rgba(255,255,255,.7);cursor:pointer;font-size:.72rem;line-height:1;padding:0}" +
      ".cs-vazio{padding:10px 4px;color:var(--cm,#5a5a5a);font-size:.78rem}" +
      ".cs-resumo{margin-top:20px;background:#fff;border-radius:var(--r,14px);padding:17px 21px;box-shadow:var(--sc)}" +
      ".cs-resumo h4{font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--cm);font-weight:700;margin:0 0 11px}" +
      ".cs-ov{position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:14px}" +
      ".cs-box{background:var(--cr,#faf8f2);color:var(--ce,#2b2b2b);border-radius:16px;padding:22px;width:min(520px,100%);max-height:92vh;overflow:auto;box-shadow:0 24px 80px rgba(0,0,0,.5);font-family:'DM Sans',sans-serif}" +
      ".cs-box h3{margin:0 0 14px;font-size:1.1rem}" +
      ".cs-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.cs-f{display:flex;flex-direction:column;gap:4px}.cs-f.full{grid-column:1/-1}" +
      ".cs-f label,.cs-lb{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--cm,#5a5a5a)}" +
      ".cs-box input,.cs-box select{padding:9px 11px;border:2px solid var(--cl,#e8e5de);border-radius:10px;font:inherit;font-size:.9rem;color:var(--ce,#2b2b2b);background:#fff;width:100%}" +
      ".cs-turmas{display:flex;flex-wrap:wrap;gap:8px}.cs-turmas label{display:flex;align-items:center;gap:6px;border:1px solid var(--cl,#e8e5de);border-radius:999px;padding:6px 12px;font-size:.84rem;cursor:pointer}" +
      ".cs-turmas input{width:auto}" +
      ".cs-erro{color:var(--ra,#c0392b);font-size:.82rem;min-height:1.1em;margin-top:8px}" +
      ".cs-box .cs-acoes2{display:flex;gap:10px;margin-top:14px}.cs-box .cs-acoes2 .cs-btn{flex:1}" +
      "html.dark-2026 .cs-btn{background:#272b30;border-color:#383d43;color:#f4f5f6}" +
      "html.dark-2026 .cs-btn.pri{background:#ffa65b;border-color:#ffa65b;color:#151719}" +
      "html.dark-2026 .cs-acoes button{background:#272b30;border-color:#383d43}" +
      "html.dark-2026 .cs-resumo{background:#191c1f;border:1px solid #383d43}" +
      "html.dark-2026 .cs-box{background:#191c1f;color:#f4f5f6;border:1px solid #383d43}" +
      "html.dark-2026 .cs-box input,html.dark-2026 .cs-box select{background:#202327;border-color:#383d43;color:#f4f5f6}" +
      "html.dark-2026 .cs-f label,html.dark-2026 .cs-lb{color:#aeb4bd}" +
      "html.dark-2026 .cs-turmas label{border-color:#383d43}" +
      "@media(max-width:560px){.cs-grid{grid-template-columns:1fr}}";
    document.head.appendChild(s);
  }

  // ── aba, botão e desenho ────────────────────────────────────────
  function montarAba() {
    var main = document.querySelector("main.main");
    if (!main) return false;
    secao = document.createElement("section");
    secao.className = "sec";
    secao.id = "sec-cronograma";
    secao.setAttribute("data-runtime-ui", "cronograma");
    var cont = document.getElementById("sec-cont");
    if (cont && cont.nextSibling) main.insertBefore(secao, cont.nextSibling); else main.appendChild(secao);
    var nav = document.querySelector(".nav-w .nav-i");
    if (nav && !document.getElementById("nb-cronograma")) {
      var b = document.createElement("button");
      b.className = "nb"; b.id = "nb-cronograma"; b.type = "button";
      b.setAttribute("data-runtime-ui", "cronograma");
      b.setAttribute("onclick", "aba('cronograma',this)");
      b.textContent = "📅 Cronograma";
      // Logo depois do Calendário (na barra lateral, se ele já foi para lá).
      var cal = Array.prototype.filter.call(document.querySelectorAll(".nb"), function (x) { return /aba\(\s*'(sec-)?cal'/.test(x.getAttribute("onclick") || ""); })[0];
      if (cal && cal.closest("#rs-lateral")) cal.insertAdjacentElement("afterend", b);
      else if (cal && cal.parentNode === nav) { nav.insertBefore(b, cal.nextSibling); if (window.RelatorioBarraLateral) window.RelatorioBarraLateral.migrar(); }
      else { nav.appendChild(b); if (window.RelatorioBarraLateral) window.RelatorioBarraLateral.migrar(); }
    }
    secao.addEventListener("click", clique);
    return true;
  }

  // O bloco antigo do Contador sai da página (a grade agora mora na aba própria).
  function tirarDoContador() {
    var card = document.getElementById("card-seg-cont");
    var bloco = card && card.closest(".cg") && card.closest(".cg").parentElement;
    if (bloco && bloco.closest("#sec-cont")) bloco.remove();
    document.querySelectorAll("#sec-cont .pc-hero-btn").forEach(function (b) {
      if (/cronograma/i.test(b.textContent)) {
        b.textContent = "Abrir cronograma";
        b.setAttribute("onclick", "aba('cronograma')");
      }
    });
  }

  function desenhar() {
    if (!secao) return;
    var hoje = new Date().getDay();
    var visiveis = DIAS.filter(function (d) { return d.k !== "sab" || (estado.dias.sab || []).length; });
    var cards = visiveis.map(function (d) {
      var lista = ordenar((estado.dias[d.k] || []).slice());
      return '<div class="dc" data-dia="' + d.k + '"><div class="dch ' + d.cls + '">' + d.nome +
        (d.n === hoje ? ' <span class="hj">Hoje</span>' : "") +
        '<button type="button" class="cs-mais" data-add="' + d.k + '" title="Adicionar aula na ' + esc(d.nome.replace(/^\S+\s/, "")) + '" aria-label="Adicionar aula">+</button></div>' +
        '<div class="db">' + (lista.length ? lista.map(function (s) {
          return '<div class="sl cs-sl ' + classeDisc(s.disc) + '"><div class="sh">' + esc(horaBr(s.ini)) + " – " + esc(horaBr(s.fim)) + '</div><div class="sd">' + esc(s.disc) +
            '</div><div class="st2">' + esc(textoTurmas(s)) + " · " + s.haula + " h/aula</div>" +
            '<div class="cs-acoes"><button type="button" data-edit="' + d.k + ":" + s.id + '" title="Editar" aria-label="Editar aula">✏️</button><button type="button" data-del="' + d.k + ":" + s.id + '" title="Excluir" aria-label="Excluir aula">🗑</button></div></div>';
        }).join("") : '<div class="cs-vazio">Sem aulas.</div>') + "</div></div>";
    }).join("");

    // Resumo: h/aula por turma e disciplina.
    var m = mapa(), L = turmasLabel(), porTurma = {};
    Object.keys(m).forEach(function (disc) {
      Object.keys(m[disc]).forEach(function (t) {
        var soma = 0; Object.keys(m[disc][t]).forEach(function (d) { soma += m[disc][t][d]; });
        (porTurma[t] = porTurma[t] || []).push({ disc: disc, h: soma });
      });
    });
    var cores = ["ri-v", "ri-a", "ri-o", "ri-v"];
    var resumo = Object.keys(L).filter(function (t) { return porTurma[t]; }).map(function (t, i) {
      return '<div class="ri ' + cores[i % cores.length] + '"><div class="rl">' + esc(L[t]) + '</div><div class="rv">' +
        porTurma[t].map(function (x) { return esc(abreviar(x.disc)) + ": <strong>" + x.h + "</strong>"; }).join(" · ") + "</div></div>";
    }).join("");

    secao.innerHTML =
      '<div class="th"><div class="tb gz">📅</div><div class="ti"><h2>Cronograma Semanal</h2><p>Grade da semana · edite, adicione ou exclua aulas. As projeções e o Contador usam esta grade.</p></div></div>' +
      '<div class="cs-barra"><div class="cleg"><div class="cl2"><div class="ld d-lp"></div><span>Língua Portuguesa</span></div><div class="cl2"><div class="ld d-tl"></div><span>Trilhas de Linguagens</span></div><div class="cl2"><div class="ld d-tc"></div><span>Trilhas de C. Humanas</span></div><div class="cl2"><div class="ld d-ar"></div><span>Artes</span></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (!(estado.dias.sab || []).length ? '<button type="button" class="cs-btn" data-add="sab">+ Aula no sábado</button>' : "") +
      '<button type="button" class="cs-btn pri" data-add="">+ Adicionar aula</button></div></div>' +
      '<div class="cg">' + cards + "</div>" +
      '<div class="cs-resumo"><h4>H/aula por semana — resumo</h4><div class="rcg" style="margin-top:0">' + (resumo || '<div class="cs-vazio">Nenhuma aula na grade.</div>') + "</div></div>";
  }
  function abreviar(d) {
    return { "Língua Portuguesa": "LP", "Trilhas de Linguagens": "T.Ling", "Trilhas de C. Humanas": "T.CH", "Artes": "Arte" }[d] || d;
  }

  function acharSlot(cod) {
    var p = cod.split(":"), lista = estado.dias[p[0]] || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === p[1]) return { dia: p[0], i: i, s: lista[i] };
    return null;
  }
  function clique(e) {
    var b = e.target.closest("[data-add],[data-edit],[data-del]");
    if (!b) return;
    if (b.hasAttribute("data-add")) return abrirForm(null, b.getAttribute("data-add") || "seg");
    var achado = acharSlot(b.getAttribute("data-edit") || b.getAttribute("data-del"));
    if (!achado) return;
    if (b.hasAttribute("data-edit")) return abrirForm(achado, achado.dia);
    var s = achado.s;
    if (!window.confirm("Excluir a aula de " + s.disc + " (" + textoTurmas(s) + ", " + horaBr(s.ini) + "–" + horaBr(s.fim) + ")?")) return;
    estado.dias[achado.dia].splice(achado.i, 1);
    mudou("excluir-aula");
  }

  // ── formulário (adicionar/editar) ───────────────────────────────
  function disciplinas() {
    var nomes = DISC_PADRAO.slice();
    (window.DISC || []).forEach(function (x) { if (x && x.d && nomes.indexOf(x.d) < 0) nomes.push(x.d); });
    DIAS.forEach(function (d) { (estado.dias[d.k] || []).forEach(function (s) { if (s.disc && nomes.indexOf(s.disc) < 0) nomes.push(s.disc); }); });
    return nomes;
  }
  function fecharForm() { if (modal) { modal.remove(); modal = null; document.removeEventListener("keydown", teclaForm); } }
  function teclaForm(e) { if (e.key === "Escape") fecharForm(); }
  function abrirForm(achado, diaPadrao) {
    fecharForm();
    var s = achado ? achado.s : { ini: "", fim: "", disc: "", turmas: [], haula: "" };
    var L = turmasLabel(), discs = disciplinas();
    modal = document.createElement("div");
    modal.className = "cs-ov";
    modal.setAttribute("data-runtime-ui", "cronograma");
    modal.innerHTML = '<div class="cs-box" role="dialog" aria-modal="true" aria-labelledby="cs-tit"><h3 id="cs-tit">' + (achado ? "✏️ Editar aula" : "+ Adicionar aula") + "</h3>" +
      '<div class="cs-grid">' +
      '<div class="cs-f"><label for="cs-dia">Dia</label><select id="cs-dia">' + DIAS.map(function (d) { return '<option value="' + d.k + '"' + (d.k === diaPadrao ? " selected" : "") + ">" + esc(d.nome.replace(/^\S+\s/, "")) + "</option>"; }).join("") + "</select></div>" +
      '<div class="cs-f"><label for="cs-disc">Disciplina</label><select id="cs-disc"><option value="">Escolha…</option>' + discs.map(function (n) { return '<option' + (n === s.disc ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("") + '<option value="__outra">Outra…</option></select></div>' +
      '<div class="cs-f full" id="cs-outra-f" hidden><label for="cs-outra">Nome da disciplina</label><input id="cs-outra" maxlength="60"></div>' +
      '<div class="cs-f"><label for="cs-ini">Início</label><input type="time" id="cs-ini" value="' + esc(s.ini) + '"></div>' +
      '<div class="cs-f"><label for="cs-fim">Fim</label><input type="time" id="cs-fim" value="' + esc(s.fim) + '"></div>' +
      '<div class="cs-f full"><span class="cs-lb">Turma(s)</span><div class="cs-turmas">' + Object.keys(L).map(function (t) {
        return '<label><input type="checkbox" value="' + t + '"' + ((s.turmas || []).indexOf(t) >= 0 ? " checked" : "") + "> " + esc(L[t]) + "</label>";
      }).join("") + "</div></div>" +
      '<div class="cs-f"><label for="cs-h">H/aula (conta nas projeções)</label><input type="number" id="cs-h" min="1" max="8" value="' + esc(s.haula || "") + '"></div>' +
      "</div>" +
      '<div class="cs-erro" id="cs-erro"></div>' +
      '<div class="cs-acoes2"><button type="button" class="cs-btn" data-f="cancelar">Cancelar</button><button type="button" class="cs-btn pri" data-f="salvar">💾 Salvar</button></div></div>';
    document.body.appendChild(modal);
    document.addEventListener("keydown", teclaForm);
    var q = function (sel) { return modal.querySelector(sel); };
    var manual = !!s.haula;
    function sugerir() {
      if (manual) return;
      var a = minutos(q("#cs-ini").value), b = minutos(q("#cs-fim").value);
      if (a != null && b != null && b > a) q("#cs-h").value = Math.max(1, Math.floor((b - a) / 60));
    }
    q("#cs-ini").addEventListener("input", sugerir);
    q("#cs-fim").addEventListener("input", sugerir);
    q("#cs-h").addEventListener("input", function () { manual = true; });
    q("#cs-disc").addEventListener("change", function () { q("#cs-outra-f").hidden = this.value !== "__outra"; if (this.value === "__outra") q("#cs-outra").focus(); });
    modal.addEventListener("mousedown", function (e) { if (e.target === modal) fecharForm(); });
    q('[data-f="cancelar"]').onclick = fecharForm;
    q('[data-f="salvar"]').onclick = function () {
      var disc = q("#cs-disc").value === "__outra" ? q("#cs-outra").value.trim() : q("#cs-disc").value;
      var ini = q("#cs-ini").value, fim = q("#cs-fim").value, h = parseInt(q("#cs-h").value, 10) || 0;
      var turmas = Array.prototype.map.call(modal.querySelectorAll(".cs-turmas input:checked"), function (c) { return c.value; });
      var erro = !disc ? "Escolha a disciplina." : (minutos(ini) == null || minutos(fim) == null) ? "Informe o início e o fim." :
        minutos(fim) <= minutos(ini) ? "O fim precisa ser depois do início." : !turmas.length ? "Marque pelo menos uma turma." : h < 1 ? "Informe as h/aula." : "";
      if (erro) { q("#cs-erro").textContent = erro; return; }
      var dia = q("#cs-dia").value;
      var novo = { id: achado ? achado.s.id : novoId(), ini: ini, fim: fim, disc: disc, turmas: turmas, haula: h };
      if (achado) estado.dias[achado.dia].splice(achado.i, 1);
      (estado.dias[dia] = estado.dias[dia] || []).push(novo);
      fecharForm();
      mudou(achado ? "editar-aula" : "adicionar-aula");
    };
    q("#cs-dia").focus();
  }

  // ── sincronização ───────────────────────────────────────────────
  function iniciarSync() {
    var S = window.RelatorioSupabaseSync;
    if (!S || !S.isAvailable || !S.isAvailable()) return;
    sync = S.createScopeSync({
      scope: SCOPE, schoolSlug: "padre-carlos-casavequia", classSlug: "cronograma", source: "casavequia-cronograma", debounceMs: 400,
      getLocalPayload: function () { return estado; },
      onRemotePayload: function (p) {
        if (!valido(p)) return;
        if (String(p.atualizadoEm || "") < String(estado.atualizadoEm || "")) { sync.schedulePush("local-mais-novo"); return; }
        estado = p; gravarLocal(); desenhar();
        if (typeof window.pcSyncProjectionSeed === "function") { try { window.pcSyncProjectionSeed("cronograma-remoto"); } catch (e) {} }
      }
    });
    sync.start();
  }

  function iniciar() {
    if (!document.getElementById("sec-cont") || !document.querySelector(".nav-w .nav-i")) return;
    var local = lerLocal();
    estado = valido(local) ? local : lerCartoes();
    DIAS.forEach(function (d) { estado.dias[d.k] = estado.dias[d.k] || []; });
    // As projeções passam a ler esta grade (antes liam os cartões do Contador).
    window.pcProjectionBuildScheduleMap = mapa;
    estilo();
    if (!montarAba()) return;
    tirarDoContador();
    desenhar();
    if (!valido(local)) gravarLocal();
    iniciarSync();
  }

  window.CronogramaSemanal = { mapa: function () { return estado ? mapa() : {}; }, abrir: function () { if (typeof window.aba === "function") window.aba("cronograma"); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
