// ═══════════════════════════════════════════════════════════
// novo-diario.js — botão "+ Novo Diário" das abas de turma (Casavequia)
//
// O professor informa data, disciplina, assunto e horário (a turma já é a da
// aba) e escreve um rascunho. A IA (Edge Function "organizar-relato", na
// Biblioteca) organiza o rascunho em campos; ESTE arquivo monta o HTML no
// mesmo formato dos relatos que já existem (.ea com Relato / Presença /
// Atividades) e o coloca na aba da turma, na ordem certa das datas.
//
// PERSISTÊNCIA: os diários criados aqui ficam em report_sync_state, no escopo
// "casavequia:novos-diarios:v1" (só o professor logado lê e grava), e num cache
// local. A cada carregamento são reinseridos no DOM — por isso entram sozinhos
// no Contador, nos lançamentos do banco, no relatório individual e nas
// projeções, que leem os relatos do DOM.
//
// Os cards levam data-runtime-ui: o editor de layout não os grava no snapshot.
// ═══════════════════════════════════════════════════════════
(function () {
  "use strict";

  var SCOPE = "casavequia:novos-diarios:v1";
  var LS_KEY = "nd_diarios_casavequia_v1";
  var MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  var CODIGO_DISC = { "Língua Portuguesa": "lp", "Trilhas de Linguagens": "tl", "Trilhas de C. Humanas": "tc", "Artes": "ar" };

  var estado = { diarios: [], removidos: [] };
  var sync = null;
  var chavesGlobais = []; // ids criados em PRESENCA / ATIVIDADES por este módulo
  var modal = null;
  var passo = { turma: "", entrada: null, relato: null, aviso: "", modelo: "" };

  // ── utilidades ────────────────────────────────────────────────
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function dois(n) { return ("0" + n).slice(-2); }
  function turmaRotulo(t) { return (window.PC_TURMA_LABELS || {})[t] || t; }
  function alunosDe(t) { return (typeof ALUNOS !== "undefined" && ALUNOS[t]) || []; }
  function alunoPorN(t, n) { return alunosDe(t).filter(function (a) { return a.n === n; })[0] || null; }
  function tentar(fn) { try { return fn(); } catch (e) { console.warn("[NovoDiario]", e); } }

  function lerLocal() {
    try {
      var bruto = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (bruto && Array.isArray(bruto.diarios)) return bruto;
    } catch (e) {}
    return { diarios: [], removidos: [] };
  }
  function gravarLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(estado)); } catch (e) {}
  }

  // Une remoto e local por id; remoção (tombstone) vence; o mais novo vence.
  function mesclar(remoto) {
    var remov = {};
    (estado.removidos || []).concat((remoto && remoto.removidos) || []).forEach(function (id) { remov[id] = true; });
    var mapa = {};
    (estado.diarios || []).concat((remoto && remoto.diarios) || []).forEach(function (d) {
      if (!d || !d.id || remov[d.id]) return;
      var atual = mapa[d.id];
      if (!atual || String(d.atualizadoEm || "") >= String(atual.atualizadoEm || "")) mapa[d.id] = d;
    });
    return { diarios: Object.keys(mapa).map(function (k) { return mapa[k]; }), removidos: Object.keys(remov) };
  }
  function assinatura(e) {
    return JSON.stringify(e.diarios.map(function (d) { return d.id + "@" + (d.atualizadoEm || ""); }).sort()) +
      JSON.stringify((e.removidos || []).slice().sort());
  }

  // ── identificação da aula ─────────────────────────────────────
  function idLivre(turma, dateKey, codigo, ignorarId) {
    var mmdd = dateKey.slice(5, 7) + dateKey.slice(8, 10);
    var base = turma + "-" + mmdd + codigo;
    var candidatos = [base, base + "a", base + "b"];
    for (var i = 0; i < candidatos.length; i++) {
      var id = candidatos[i];
      var usado = document.getElementById("p-" + id) || document.getElementById("r-" + id) ||
        (typeof PRESENCA !== "undefined" && PRESENCA["pl-" + id] && chavesGlobais.indexOf("pl-" + id) < 0);
      if (!usado || id === ignorarId) return id;
    }
    return "";
  }
  function horasDoIntervalo(ini, fim) {
    var a = /^(\d{1,2}):(\d{2})$/.exec(ini || ""), b = /^(\d{1,2}):(\d{2})$/.exec(fim || "");
    if (!a || !b) return 0;
    var min = (+b[1] * 60 + +b[2]) - (+a[1] * 60 + +a[2]);
    return min > 0 ? Math.max(1, Math.round(min / 60)) : 0;
  }

  // ── montagem do card (mesmo formato dos relatos existentes) ───
  function nomesCompletos(turma, nums) {
    return (nums || []).map(function (n) { var a = alunoPorN(turma, n); return a ? a.nm : "Aluno " + n; }).join(" · ");
  }
  function primeirosNomes(turma, nums) {
    return (nums || []).map(function (n) { var a = alunoPorN(turma, n); return a ? a.nm.split(" ")[0] : "Aluno " + n; }).join(" · ");
  }

  function montarCard(d) {
    var r = d.rel || {};
    var id = d.id, t = d.turma;
    var dia = d.dateKey.slice(8, 10);
    var mes = MESES[parseInt(d.dateKey.slice(5, 7), 10) - 1] + " " + d.dateKey.slice(0, 4);
    var dataBr = dia + "/" + d.dateKey.slice(5, 7);
    var comp = r.comportamento || [];
    var nObs = comp.filter(function (c) { return c.tipo !== "destaque"; }).length;
    var nFaltas = (r.faltaram || []).length + (r.faltJ || []).length;

    var chips = '<span class="ch ch-h">⏰ ' + esc(d.ini) + "–" + esc(d.fim) + "</span>" +
      '<span class="ch ch-p">👥 ' + (nFaltas ? nFaltas + (nFaltas > 1 ? " faltas" : " falta") : "Presença integral") + "</span>" +
      '<span class="ch ch-i">📖 ' + esc(d.assunto) + "</span>" +
      (nObs ? '<span class="ch ch-a">⚠️ ' + nObs + " obs.</span>" : "");

    var relato = "";
    if (r.lembrete && r.lembrete.texto) {
      relato += '<div class="lembrete"><div class="lembrete-tag">🔔 ' + esc(r.lembrete.titulo || "Lembrete") + '</div><div class="lembrete-txt">' + esc(r.lembrete.texto) + "</div></div>";
    }
    relato += '<div class="st">📖 Conteúdo</div><div class="ct"><strong>' + esc(d.assunto) + ".</strong>" +
      (r.conteudo ? "<br>" + esc(r.conteudo).replace(/\n/g, "<br>") : "") + "</div>";
    if (comp.length) {
      relato += '<div class="st">🔎 Comportamento</div><div class="ol">' + comp.map(function (c) {
        var pos = c.tipo === "destaque";
        var icone = pos ? "✅" : (c.tipo === "grave" ? "🚨" : "⚠️");
        return '<div class="oi' + (pos ? " nt" : "") + '"><span class="oi-ic">' + icone + "</span><div><div class=\"oa\">" +
          esc(nomesCompletos(t, c.alunos)) + '</div><div class="od">' + esc(c.texto) + "</div></div></div>";
      }).join("") + "</div>";
    }
    if (nFaltas) {
      var partes = [];
      if ((r.faltaram || []).length) partes.push("Faltaram: " + nomesCompletos(t, r.faltaram));
      if ((r.faltJ || []).length) partes.push("Faltas justificadas: " + nomesCompletos(t, r.faltJ));
      relato += '<div class="st">🚫 Faltas</div><div class="ng">' + esc(partes.join(" — ")) + "</div>";
    }
    var an = r.analise;
    if (an && (an.itens || []).length) {
      relato += '<div class="ai2"><div class="ai2h"><div class="tg">✦ Análise IA</div><span>' + esc(an.resumo || "") + "</span></div>" +
        an.itens.map(function (it) {
          var positivo = /destaque|positiv/i.test(it.rotulo || "");
          var grave = !positivo && comp.some(function (c) {
            return c.tipo === "grave" && (c.alunos || []).some(function (n) { return (it.alunos || []).indexOf(n) >= 0; });
          });
          return '<div class="ai2i"><div class="ai2a">' + esc(primeirosNomes(t, it.alunos)) + '</div><div class="ai2p' +
            (positivo ? '" style="color:var(--ai)' : (grave ? " grave" : " warn")) + '">' + esc(it.rotulo || "") + '</div><div class="ai2t">' + esc(it.recomendacao || "") + "</div></div>";
        }).join("") +
        (an.sugestao ? '<div class="ai2s">💡 ' + esc(an.sugestao) + "</div>" : "") + "</div>";
    }
    relato += '<div style="text-align:right;margin-top:12px"><button type="button" class="nd-del" onclick="novoDiarioExcluir(\'' + esc(id) + '\')">🗑️ Excluir este diário</button></div>';

    var atv = r.atividade || {};
    var painelAtv = atv.houve
      ? '<div class="st">📋 Atividade</div><div class="atv-tema"><strong>' + esc(atv.titulo || "Atividade") + '</strong><br><span style="font-size:.82rem;color:var(--cm)">' +
        esc(d.discNome + " " + dataBr + "/" + d.dateKey.slice(0, 4) + (atv.descricao ? " · " + atv.descricao : "")) + '</span></div><div id="atv-' + esc(id) + '" class="atv-grid"></div>'
      : '<div class="atv-tema"><strong>' + esc(d.discNome + " " + dataBr) + '</strong><br><span style="font-size:.82rem;color:var(--cm)">' + esc(d.assunto) +
        '</span></div><div class="atv-av"><span>📋</span><span>Conteúdo registrado no relato diário.</span></div>';

    return '<div class="ea" data-novo-diario="' + esc(id) + '" data-runtime-ui="novo-diario">' +
      '<div class="eh" onclick="tog(this)"><div class="edb"><div class="d">' + dia + '</div><div class="my">' + mes + "</div></div>" +
      '<div class="em"><div class="ed">' + esc(d.discNome) + " — " + d.horas + 'h/aula</div><div class="ec">' + chips + '</div></div><div class="et">▾</div></div>' +
      '<div class="ec2"><div class="itabs">' +
      '<button class="itab on" onclick="itab(this,\'r-' + esc(id) + '\')">📄 Relato</button>' +
      '<button class="itab" onclick="itab(this,\'p-' + esc(id) + '\')">👥 Presença</button>' +
      '<button class="itab" onclick="itab(this,\'a-' + esc(id) + '\')">📝 Atividades</button></div>' +
      '<div class="ipane on" id="r-' + esc(id) + '">' + relato + "</div>" +
      '<div class="ipane" id="p-' + esc(id) + '"><div id="pl-' + esc(id) + '" class="pres-grid"></div></div>' +
      '<div class="ipane" id="a-' + esc(id) + '">' + painelAtv + "</div></div></div>";
  }

  // ── inserção na aba, na ordem das datas (mais novo primeiro) ──
  function chaveDoCard(card) {
    var dia = parseInt((card.querySelector(".edb .d") || {}).textContent, 10);
    var mesTxt = ((card.querySelector(".edb .my") || {}).textContent || "").trim().split(/\s+/);
    var mes = MESES.map(function (m) { return m.toLowerCase(); }).indexOf((mesTxt[0] || "").slice(0, 3).toLowerCase());
    var ano = parseInt(mesTxt[1], 10);
    var hora = /(\d{1,2}):(\d{2})/.exec((card.querySelector(".ch-h") || {}).textContent || "");
    if (!dia || mes < 0 || !ano) return "";
    return ano + "-" + dois(mes + 1) + "-" + dois(dia) + "T" + (hora ? dois(hora[1]) + ":" + hora[2] : "00:00");
  }
  function inserirCard(sec, card, chave) {
    var cards = Array.prototype.slice.call(sec.querySelectorAll(".ea"));
    for (var i = 0; i < cards.length; i++) {
      var c = chaveDoCard(cards[i]);
      if (c && c < chave) { cards[i].parentNode.insertBefore(card, cards[i]); return; }
    }
    if (cards.length) cards[cards.length - 1].insertAdjacentElement("afterend", card);
    else sec.appendChild(card);
  }

  // ── reidratação do restante do ecossistema ────────────────────
  function sincronizarEcossistema() {
    ["renderPresenca", "renderAtividades", "_sincronizarRegistros", "verificarAbasRelatos",
      "pcRefreshPresencaVisuals", "pcRefreshAtividadesVisuals", "renderCont", "pcRefreshHeroStats",
      "pcRefreshCounterHero", "pcSyncAndBroadcast"].forEach(function (nome) {
      tentar(function () { if (typeof window[nome] === "function") window[nome](); });
    });
  }

  function renderTodos(semEcossistema) {
    document.querySelectorAll("[data-novo-diario]").forEach(function (el) { el.remove(); });
    chavesGlobais.forEach(function (k) {
      tentar(function () { delete PRESENCA[k]; delete ATIVIDADES[k]; });
    });
    chavesGlobais = [];
    estado.diarios.forEach(function (d) {
      var sec = document.getElementById("sec-" + d.turma);
      if (!sec) return;
      var r = d.rel || {};
      var pl = "pl-" + d.id, atv = "atv-" + d.id;
      PRESENCA[pl] = { turma: d.turma, faltaram: (r.faltaram || []).slice(), faltJ: (r.faltJ || []).slice() };
      chavesGlobais.push(pl);
      if (r.atividade && r.atividade.houve) {
        ATIVIDADES[atv] = { turma: d.turma, fez: (r.atividade.fez || []).slice(), naoFez: (r.atividade.naoFez || []).slice() };
        chavesGlobais.push(atv);
      }
      var holder = document.createElement("div");
      holder.innerHTML = montarCard(d);
      inserirCard(sec, holder.firstElementChild, d.dateKey + "T" + d.ini);
    });
    if (!semEcossistema) sincronizarEcossistema();
  }

  // ── sincronização remota ──────────────────────────────────────
  function aplicarRemoto(payload) {
    var antes = assinatura(estado);
    var mesclado = mesclar(payload || {});
    var mudou = assinatura(mesclado) !== antes;
    var remotoIgual = assinatura({ diarios: (payload && payload.diarios) || [], removidos: (payload && payload.removidos) || [] }) === assinatura(mesclado);
    estado = mesclado;
    gravarLocal();
    if (mudou) renderTodos();
    if (!remotoIgual && sync) sync.schedulePush("merge");
  }
  function iniciarSync() {
    if (!window.RelatorioSupabaseSync || !window.RelatorioSupabaseSync.isAvailable()) return;
    sync = window.RelatorioSupabaseSync.createScopeSync({
      scope: SCOPE,
      schoolSlug: "padre-carlos-casavequia",
      classSlug: "novos-diarios",
      source: "casavequia-novo-diario",
      debounceMs: 400,
      getLocalPayload: function () { return { versao: 1, diarios: estado.diarios, removidos: estado.removidos }; },
      onRemotePayload: aplicarRemoto
    });
    sync.start();
  }

  // ── IA ────────────────────────────────────────────────────────
  async function organizarComIA(entrada) {
    var cliente = window.RelatorioSupabaseSync && window.RelatorioSupabaseSync.getClient();
    if (!cliente || !cliente.functions) throw new Error("Sem conexão com o Supabase.");
    if (window.RelatorioSupabaseSync.auth && !window.RelatorioSupabaseSync.auth.isSignedIn()) {
      window.RelatorioSupabaseSync.auth.showLogin("Entre com a conta do professor para usar a IA.");
      throw new Error("Entre com a conta do professor e tente de novo.");
    }
    var resposta = await cliente.functions.invoke("organizar-relato", {
      body: {
        turma: turmaRotulo(entrada.turma),
        disciplina: entrada.discNome,
        data: entrada.dateKey,
        assunto: entrada.assunto,
        horario: entrada.ini + "–" + entrada.fim,
        horas: entrada.horas,
        rascunho: entrada.rascunho,
        alunos: alunosDe(entrada.turma).filter(function (a) { return !a.tr; }).map(function (a) { return { n: a.n, nome: a.nm }; })
      }
    });
    if (resposta.error) {
      var detalhe = "";
      try { detalhe = (await resposta.error.context.json()).erro || ""; } catch (e) {}
      throw new Error(detalhe || "A IA não respondeu agora. Tente de novo em instantes.");
    }
    if (!resposta.data || !resposta.data.relato) throw new Error((resposta.data && resposta.data.erro) || "A IA devolveu uma resposta vazia.");
    return resposta.data;
  }

  // Números só da chamada da turma, sem repetição.
  function numerosValidos(turma, lista) {
    var seen = {}, out = [];
    (lista || []).forEach(function (n) {
      n = parseInt(n, 10);
      if (alunoPorN(turma, n) && !seen[n]) { seen[n] = true; out.push(n); }
    });
    return out;
  }
  function trocarCodigos(texto, turma) {
    return String(texto || "").replace(/«A(\d+)»/g, function (tudo, n) {
      var a = alunoPorN(turma, parseInt(n, 10));
      return a ? a.nm.split(" ")[0] : tudo;
    });
  }
  function normalizarRelato(bruto, turma) {
    var t = function (v) { return trocarCodigos(v, turma).trim(); };
    var atv = bruto.atividade || {};
    var lem = bruto.lembrete || {};
    var an = bruto.analise || {};
    var faltaram = numerosValidos(turma, bruto.faltaram);
    var faltJ = numerosValidos(turma, bruto.faltaram_justificadas).filter(function (n) { return faltaram.indexOf(n) < 0; });
    return {
      conteudo: t(bruto.conteudo),
      faltaram: faltaram,
      faltJ: faltJ,
      comportamento: (bruto.comportamento || []).map(function (c) {
        return { alunos: numerosValidos(turma, c.alunos), tipo: ["grave", "destaque"].indexOf(c.tipo) >= 0 ? c.tipo : "advertencia", texto: t(c.texto) };
      }).filter(function (c) { return c.alunos.length && c.texto; }),
      atividade: {
        houve: !!atv.houve,
        titulo: t(atv.titulo),
        descricao: t(atv.descricao),
        fez: numerosValidos(turma, atv.fez),
        naoFez: numerosValidos(turma, atv.nao_fez)
      },
      lembrete: { titulo: t(lem.titulo), texto: t(lem.texto) },
      analise: {
        resumo: t(an.resumo),
        itens: (an.itens || []).map(function (i) {
          return { alunos: numerosValidos(turma, i.alunos), rotulo: t(i.rotulo), recomendacao: t(i.recomendacao) };
        }).filter(function (i) { return i.alunos.length; }),
        sugestao: t(an.sugestao)
      }
    };
  }
  function relatoSemIA(entrada) {
    return {
      conteudo: entrada.rascunho, faltaram: [], faltJ: [], comportamento: [],
      atividade: { houve: false, titulo: "", descricao: "", fez: [], naoFez: [] },
      lembrete: { titulo: "", texto: "" }, analise: { resumo: "", itens: [], sugestao: "" }
    };
  }

  // ── modal ─────────────────────────────────────────────────────
  function injetarEstilo() {
    if (document.getElementById("nd-style")) return;
    var st = document.createElement("style");
    st.id = "nd-style";
    st.textContent =
      ".nd-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px}" +
      ".nd-box{background:var(--cr,#faf8f2);color:var(--ce,#2b2b2b);border-radius:16px;padding:24px;max-width:600px;width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.5);font-family:'DM Sans',sans-serif}" +
      ".nd-tit{font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:700;color:var(--vd,#1a3a2a);margin-bottom:4px}" +
      ".nd-sub{font-size:.8rem;color:var(--cm,#5a5a5a);margin-bottom:16px}" +
      ".nd-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}" +
      ".nd-f{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}.nd-f.full{grid-column:1/-1}" +
      ".nd-f label{font-size:.74rem;font-weight:700;color:var(--vm,#2d6147);text-transform:uppercase;letter-spacing:.04em}" +
      ".nd-f input,.nd-f select,.nd-f textarea{padding:10px 12px;border:2px solid var(--cl,#e8e5de);border-radius:10px;font:inherit;font-size:.9rem;color:var(--ce,#2b2b2b);background:var(--cr,#faf8f2);width:100%}" +
      ".nd-f textarea{resize:vertical;min-height:150px}" +
      ".nd-f input:focus,.nd-f select:focus,.nd-f textarea:focus{outline:none;border-color:var(--vm,#2d6147)}" +
      ".nd-acts{display:flex;gap:10px;margin-top:6px;flex-wrap:wrap}" +
      ".nd-b{flex:1;min-width:130px;border:none;border-radius:10px;padding:11px 14px;font:inherit;font-weight:700;font-size:.88rem;cursor:pointer}" +
      ".nd-b.pri{background:var(--vm,#2d6147);color:#fff}.nd-b.sec{background:var(--cl,#e8e5de);color:var(--ce,#2b2b2b)}.nd-b:disabled{opacity:.55;cursor:wait}" +
      ".nd-msg{font-size:.82rem;border-radius:8px;padding:9px 12px;margin:0 0 12px}" +
      ".nd-msg.err{background:var(--rs,#fdecea);color:var(--ra,#c0392b)}.nd-msg.warn{background:rgba(201,168,76,.15);color:var(--og,#876020)}" +
      ".nd-prev h4{font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:var(--vm,#2d6147);margin:14px 0 4px}" +
      ".nd-prev p,.nd-prev li{font-size:.86rem;line-height:1.45}.nd-prev ul{padding-left:18px}" +
      ".nd-del{background:none;border:1px solid var(--ra,#c0392b);color:var(--ra,#c0392b);border-radius:8px;padding:5px 10px;font-size:.74rem;cursor:pointer}" +
      "@media(max-width:560px){.nd-grid{grid-template-columns:1fr}}";
    document.head.appendChild(st);
  }

  function fecharModal() { if (modal) { modal.remove(); modal = null; } }
  function abrirCasca(html) {
    injetarEstilo();
    fecharModal();
    modal = document.createElement("div");
    modal.className = "nd-ov";
    modal.setAttribute("data-runtime-ui", "novo-diario-modal");
    modal.innerHTML = '<div class="nd-box">' + html + "</div>";
    modal.addEventListener("mousedown", function (e) { if (e.target === modal) fecharModal(); });
    document.body.appendChild(modal);
    return modal;
  }
  function $(sel) { return modal ? modal.querySelector(sel) : null; }
  function mostrarMsg(texto, tipo) {
    var box = $(".nd-msgbox");
    if (box) box.innerHTML = texto ? '<div class="nd-msg ' + (tipo || "err") + '">' + esc(texto) + "</div>" : "";
  }

  function disciplinasDaTurma(turma) {
    var nomes = tentar(function () { return pcGetDisciplineNames(turma); }) || [];
    return nomes.filter(function (n) { return CODIGO_DISC[n]; });
  }

  function abrirPasso1(turma, valores) {
    var v = valores || {};
    var hoje = new Date();
    var dataPadrao = v.dateKey || (hoje.getFullYear() + "-" + dois(hoje.getMonth() + 1) + "-" + dois(hoje.getDate()));
    var discs = disciplinasDaTurma(turma);
    abrirCasca(
      '<div class="nd-tit">✏️ Novo Diário — ' + esc(turmaRotulo(turma)) + '</div>' +
      '<div class="nd-sub">A turma já é a desta aba. Escreva o rascunho e a IA organiza no padrão dos diários.</div>' +
      '<div class="nd-msgbox"></div><div class="nd-grid">' +
      '<div class="nd-f"><label for="nd-data">Data</label><input type="date" id="nd-data" value="' + esc(dataPadrao) + '"></div>' +
      '<div class="nd-f"><label for="nd-disc">Disciplina</label><select id="nd-disc">' +
      (discs.length > 1 ? '<option value="">Escolha…</option>' : "") +
      discs.map(function (d) { return '<option value="' + esc(d) + '"' + (v.discNome === d ? " selected" : "") + ">" + esc(d) + "</option>"; }).join("") + "</select></div>" +
      '<div class="nd-f full"><label for="nd-assunto">Assunto</label><input type="text" id="nd-assunto" maxlength="160" placeholder="Ex.: Tema 8 — Código de ética digital" value="' + esc(v.assunto || "") + '"></div>' +
      '<div class="nd-f"><label for="nd-ini">Início</label><input type="time" id="nd-ini" value="' + esc(v.ini || "") + '"></div>' +
      '<div class="nd-f"><label for="nd-fim">Fim</label><input type="time" id="nd-fim" value="' + esc(v.fim || "") + '"></div>' +
      '<div class="nd-f"><label for="nd-horas">H/aula (conta no Contador)</label><input type="number" id="nd-horas" min="1" max="6" value="' + esc(v.horas || "") + '"></div>' +
      '<div class="nd-f full"><label for="nd-rasc">Rascunho do diário (opcional)</label><textarea id="nd-rasc" placeholder="Escreva livremente: o que foi feito, quem faltou, ocorrências, atividade…">' + esc(v.rascunho || "") + "</textarea></div></div>" +
      '<div class="nd-acts"><button type="button" class="nd-b sec" data-nd="cancelar">Cancelar</button>' +
      '<button type="button" class="nd-b pri" data-nd="seguir">🤖 Organizar com IA</button></div>'
    );
    var ini = $("#nd-ini"), fim = $("#nd-fim"), horas = $("#nd-horas"), rasc = $("#nd-rasc"), btn = $('[data-nd="seguir"]');
    var manual = !!v.horas;
    function atualizarHoras() { if (!manual) horas.value = horasDoIntervalo(ini.value, fim.value) || ""; }
    function atualizarBotao() { btn.textContent = rasc.value.trim() ? "🤖 Organizar com IA" : "💾 Salvar diário"; }
    ini.addEventListener("input", atualizarHoras);
    fim.addEventListener("input", atualizarHoras);
    horas.addEventListener("input", function () { manual = true; });
    rasc.addEventListener("input", atualizarBotao);
    atualizarBotao();
    $('[data-nd="cancelar"]').addEventListener("click", fecharModal);
    btn.addEventListener("click", function () { seguir(turma); });
  }

  function lerFormulario(turma) {
    var discNome = $("#nd-disc").value;
    var e = {
      turma: turma,
      dateKey: $("#nd-data").value,
      discNome: discNome,
      assunto: $("#nd-assunto").value.trim(),
      ini: $("#nd-ini").value,
      fim: $("#nd-fim").value,
      horas: parseInt($("#nd-horas").value, 10) || 0,
      rascunho: $("#nd-rasc").value.trim()
    };
    if (!e.dateKey) return { erro: "Escolha a data." };
    if (!e.discNome) return { erro: "Escolha a disciplina." };
    if (!e.assunto) return { erro: "Informe o assunto." };
    if (!/^\d{1,2}:\d{2}$/.test(e.ini) || !/^\d{1,2}:\d{2}$/.test(e.fim)) return { erro: "Informe o horário de início e de fim." };
    if (!horasDoIntervalo(e.ini, e.fim)) return { erro: "O fim precisa ser depois do início." };
    if (e.horas < 1) return { erro: "Informe as h/aula." };
    e.ini = dois(e.ini.split(":")[0]) + ":" + e.ini.split(":")[1];
    e.fim = dois(e.fim.split(":")[0]) + ":" + e.fim.split(":")[1];
    return { entrada: e };
  }

  async function seguir(turma) {
    var lido = lerFormulario(turma);
    if (lido.erro) return mostrarMsg(lido.erro);
    var entrada = lido.entrada;
    passo = { turma: turma, entrada: entrada, relato: null, aviso: "", modelo: "" };
    if (!entrada.rascunho) {
      passo.relato = relatoSemIA(entrada);
      passo.relato.conteudo = "";
      return salvar();
    }
    var btn = $('[data-nd="seguir"]');
    btn.disabled = true;
    btn.textContent = "🤖 Organizando…";
    mostrarMsg("");
    try {
      var r = await organizarComIA(entrada);
      passo.relato = normalizarRelato(r.relato, turma);
      passo.aviso = trocarCodigos(r.relato.aviso || "", turma);
      passo.modelo = r.modelo || "";
      abrirPasso2();
    } catch (erro) {
      btn.disabled = false;
      btn.textContent = "🤖 Organizar com IA";
      var msg = String(erro && erro.message || erro);
      mostrarMsg(msg);
      // Plano B: salvar o rascunho como está, sem a IA.
      if (!$('[data-nd="semia"]')) {
        var acts = $(".nd-acts");
        var b = document.createElement("button");
        b.type = "button"; b.className = "nd-b sec"; b.setAttribute("data-nd", "semia");
        b.textContent = "Salvar sem IA (rascunho como está)";
        b.addEventListener("click", function () {
          passo.relato = relatoSemIA(passo.entrada);
          salvar();
        });
        acts.appendChild(b);
      }
    }
  }

  function abrirPasso2() {
    var e = passo.entrada, r = passo.relato, t = e.turma;
    var linhas = function (nums) { return esc(nomesCompletos(t, nums)); };
    var html = '<div class="nd-tit">Revise o diário — ' + esc(turmaRotulo(t)) + '</div>' +
      '<div class="nd-sub">' + esc(e.discNome) + " · " + esc(e.dateKey.split("-").reverse().join("/")) + " · " + esc(e.ini) + "–" + esc(e.fim) + " · " + e.horas + "h/aula" +
      (passo.modelo ? " · organizado por " + esc(passo.modelo) : "") + "</div>" +
      (passo.aviso ? '<div class="nd-msg warn">⚠️ ' + esc(passo.aviso) + "</div>" : "") +
      '<div class="nd-prev"><h4>Assunto</h4><p>' + esc(e.assunto) + "</p>" +
      "<h4>Conteúdo</h4><p>" + (r.conteudo ? esc(r.conteudo) : "<em>Sem texto.</em>") + "</p>" +
      "<h4>Presença</h4><p>" + ((r.faltaram.length || r.faltJ.length)
        ? (r.faltaram.length ? "Faltaram: " + linhas(r.faltaram) + ". " : "") + (r.faltJ.length ? "Justificadas: " + linhas(r.faltJ) + "." : "")
        : "Presença integral (nenhuma falta citada).") + "</p>" +
      (r.comportamento.length ? "<h4>Comportamento</h4><ul>" + r.comportamento.map(function (c) {
        return "<li><strong>" + esc({ advertencia: "⚠️", grave: "🚨", destaque: "✅" }[c.tipo]) + " " + linhas(c.alunos) + "</strong> — " + esc(c.texto) + "</li>";
      }).join("") + "</ul>" : "") +
      (r.atividade.houve ? "<h4>Atividade</h4><p><strong>" + esc(r.atividade.titulo || "Atividade") + "</strong> " + esc(r.atividade.descricao) +
        (r.atividade.fez.length ? "<br>Fizeram: " + linhas(r.atividade.fez) : "") +
        (r.atividade.naoFez.length ? "<br>Não fizeram: " + linhas(r.atividade.naoFez) : "") + "</p>" : "") +
      (r.analise.itens.length ? "<h4>Análise IA</h4><p>" + esc(r.analise.resumo) + (r.analise.sugestao ? "<br>💡 " + esc(r.analise.sugestao) : "") + "</p>" : "") +
      '</div><div class="nd-msgbox" style="margin-top:12px"></div>' +
      '<div class="nd-acts"><button type="button" class="nd-b sec" data-nd="voltar">← Voltar e editar</button>' +
      '<button type="button" class="nd-b pri" data-nd="salvar">💾 Salvar diário</button></div>';
    abrirCasca(html);
    $('[data-nd="voltar"]').addEventListener("click", function () { abrirPasso1(passo.turma, passo.entrada); });
    $('[data-nd="salvar"]').addEventListener("click", salvar);
  }

  async function salvar() {
    var e = passo.entrada, t = e.turma;
    var botao = $('[data-nd="salvar"]') || $('[data-nd="seguir"]');
    if (botao) botao.disabled = true;
    var id = idLivre(t, e.dateKey, CODIGO_DISC[e.discNome], "");
    if (!id) {
      if (botao) botao.disabled = false;
      return mostrarMsg("Já existem 3 registros desta disciplina neste dia. Exclua um antes de criar outro.");
    }
    var agora = new Date().toISOString();
    estado.diarios.push({
      id: id, turma: t, dateKey: e.dateKey, disc: CODIGO_DISC[e.discNome], discNome: e.discNome,
      assunto: e.assunto, ini: e.ini, fim: e.fim, horas: e.horas, rel: passo.relato,
      rascunho: e.rascunho, criadoEm: agora, atualizadoEm: agora
    });
    gravarLocal();
    renderTodos();
    fecharModal();
    var card = document.querySelector('[data-novo-diario="' + id + '"]');
    if (card) {
      var cab = card.querySelector(".eh"), corpo = card.querySelector(".ec2");
      if (corpo && !corpo.classList.contains("on") && typeof tog === "function") tog(cab);
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (sync) {
      var ok = await tentar(function () { return sync.pushNow("force"); });
      if (!ok) console.warn("[NovoDiario] salvo no aparelho; o envio ao banco será refeito.");
    }
  }

  // ── API pública ───────────────────────────────────────────────
  window.novoDiarioAbrir = function (turma) {
    if (!/^t\d$/.test(turma || "")) return;
    abrirPasso1(turma, null);
  };
  window.novoDiarioExcluir = function (id) {
    if (!window.confirm("Excluir este diário? Presença, atividades e h/aula dele saem do sistema.")) return;
    estado.diarios = estado.diarios.filter(function (d) { return d.id !== id; });
    if (estado.removidos.indexOf(id) < 0) estado.removidos.push(id);
    gravarLocal();
    renderTodos();
    if (sync) sync.pushNow("force");
  };

  function iniciar() {
    estado = lerLocal();
    if (estado.diarios.length) renderTodos();
    iniciarSync();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
  // O editor de layout pode trocar o conteúdo da página inteira; reinsere os diários.
  document.addEventListener("relatorios:editor-layout-restored", function () { renderTodos(); });
})();
