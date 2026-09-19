// ═══════════════════════════════════════════════════════════
// novo-diario.js — "+ Novo Diário" e ✏️ Editar diário (Casavequia e Hermínio)
//
// NOVO DIÁRIO: o professor informa data, disciplina, assunto e horário (a
// turma já é a da aba) e escreve um rascunho. A IA (Edge Function
// "organizar-relato", na Biblioteca) organiza o rascunho em campos; ESTE
// arquivo monta o HTML no mesmo formato dos relatos existentes (.ea com
// Relato / Presença / Atividades) e o coloca na aba da turma, na ordem das datas.
//
// EDITAR (✏️): todo card das abas de turma — criado aqui ou escrito à mão no
// HTML — ganha uma caneta que abre o editor completo (data, disciplina,
// assunto, horário, conteúdo, presença por aluno, comportamento, atividade,
// análise, lembrete). Ao salvar um card do HTML, o original sai do DOM e o
// diário editado (guardado abaixo) toma o lugar; "Restaurar original" desfaz.
//
// PERSISTÊNCIA: report_sync_state, escopo próprio de cada escola (só o professor
// logado lê e grava) + cache local. A cada carga os diários são reinseridos no
// DOM, e por isso entram sozinhos no Contador, nos lançamentos do banco, no
// relatório individual e nas projeções, que leem os relatos do DOM.
//
// Os cards levam data-runtime-ui: o editor de layout não os grava no snapshot.
// ═══════════════════════════════════════════════════════════
(function () {
  "use strict";

  var MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  var CODIGO_CV = { "Língua Portuguesa": "lp", "Trilhas de Linguagens": "tl", "Trilhas de C. Humanas": "tc", "Artes": "ar" };
  var TITULO_RH = { lp: "Língua Portuguesa", ing: "Língua Inglesa", esp: "Língua Espanhola", art: "Arte", red: "Redação" };

  var A = null;                 // adaptador da escola
  var estado = { diarios: [], removidos: [] };
  var sync = null;
  var geradas = [];             // chaves criadas em presença/atividade por este módulo
  var backup = {};              // dados originais dos cards do HTML que foram ocultados
  var ocultos = {};             // origem -> { card, ph }
  var modal = null;
  var st = null;                // rascunho do editor em edição
  var passo = null;             // dados do passo 1 -> IA

  // ── utilidades ────────────────────────────────────────────────
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function dois(n) { return ("0" + n).slice(-2); }
  function tentar(fn) { try { return fn(); } catch (e) { console.warn("[NovoDiario]", e); } }
  function agora() { return new Date().toISOString(); }
  function alunosDe(t) { return (A.alunos(t) || []).filter(function (a) { return !a.tr; }); }
  function alunoPorN(t, n) { return (A.alunos(t) || []).filter(function (a) { return a.n === n; })[0] || null; }
  function nomesCompletos(t, nums, extra) {
    var s = (nums || []).map(function (n) { var a = alunoPorN(t, n); return a ? a.nm : "Aluno " + n; });
    if (extra) s.push(extra);
    return s.join(" · ");
  }
  function primeirosNomes(t, nums) {
    return (nums || []).map(function (n) { var a = alunoPorN(t, n); return a ? a.nm.split(" ")[0] : "Aluno " + n; }).join(" · ");
  }
  function minutosDoIntervalo(ini, fim) {
    var a = /^(\d{1,2}):(\d{2})$/.exec(ini || ""), b = /^(\d{1,2}):(\d{2})$/.exec(fim || "");
    if (!a || !b) return 0;
    var min = (+b[1] * 60 + +b[2]) - (+a[1] * 60 + +a[2]);
    return min > 0 ? min : 0;
  }
  function horasDoIntervalo(ini, fim) {
    var m = minutosDoIntervalo(ini, fim);
    return m ? Math.max(1, Math.round(m / 60)) : 0;
  }
  function textoDoNo(no) {
    var c = no.cloneNode(true);
    c.querySelectorAll("br").forEach(function (b) { b.replaceWith("\n"); });
    return (c.textContent || "").replace(/[ \t]+\n/g, "\n").trim();
  }

  // ── adaptadores por escola ────────────────────────────────────
  function adaptadorCasavequia() {
    return {
      chave: "cv",
      scope: "casavequia:novos-diarios:v1",
      lsKey: "nd_diarios_casavequia_v1",
      schoolSlug: "padre-carlos-casavequia",
      turmas: ["t1", "t2", "t3", "t6"],
      comHoras: true,
      presencaNeutra: false,
      rotulo: function (t) { return (window.PC_TURMA_LABELS || {})[t] || t; },
      alunos: function (t) { return (typeof ALUNOS !== "undefined" && ALUNOS[t]) || []; },
      disciplinas: function (t) {
        var nomes = tentar(function () { return pcGetDisciplineNames(t); }) || [];
        return nomes.filter(function (n) { return CODIGO_CV[n]; });
      },
      pres: function () { return PRESENCA; },
      atv: function () { return ATIVIDADES; },
      kPres: function (id) { return "pl-" + id; },
      kAtv: function (id) { return "atv-" + id; },
      codigoDisc: function (nome) { return CODIGO_CV[nome] || ""; },
      discDoTitulo: function (txt) {
        var nome = tentar(function () { return pcDiaryNormalizeDisciplina(txt); });
        return CODIGO_CV[nome] ? nome : "";
      },
      novoId: function (t, dateKey, discNome, ignorar) {
        var base = t + "-" + dateKey.slice(5, 7) + dateKey.slice(8, 10) + CODIGO_CV[discNome];
        var cands = [base, base + "a", base + "b"];
        for (var i = 0; i < cands.length; i++) if (cands[i] === ignorar || idLivreDom(cands[i])) return cands[i];
        return "";
      },
      mesmoId: function (s) { return s.dateKey === s.dateKey0 && s.discNome === s.discNome0; },
      tituloCard: function (d) { return d.discNome + " — " + d.horas + "h/aula"; },
      estadoPresenca: function (id, n, t) {
        var cfg = PRESENCA["pl-" + id] || { faltaram: [], faltJ: [] };
        var m = _presManual["pl-" + id + "_" + n];
        if (m) return m === "fa" ? "fa" : m === "fj" ? "fj" : "pr";
        return cfg.faltaram.indexOf(n) >= 0 ? "fa" : cfg.faltJ.indexOf(n) >= 0 ? "fj" : "pr";
      },
      estadoAtividade: function (id, n) {
        var cfg = ATIVIDADES["atv-" + id] || { fez: [], naoFez: [] };
        var m = _atvManual["atv-" + id + "_" + n];
        if (m === "fz" || m === "nf") return m;
        return cfg.fez.indexOf(n) >= 0 ? "fz" : cfg.naoFez.indexOf(n) >= 0 ? "nf" : "au";
      },
      parcialPresenca: function (id) { return !!(PRESENCA["pl-" + id] && PRESENCA["pl-" + id].parcial); },
      parcialAtividade: function (id) { return !!(ATIVIDADES["atv-" + id] && ATIVIDADES["atv-" + id].parcial); },
      temAtividade: function (id) { return !!ATIVIDADES["atv-" + id]; },
      limparCliques: function (id) {
        var pp = "pl-" + id + "_", ap = "atv-" + id + "_", mudou = false;
        Object.keys(_presManual).forEach(function (k) { if (k.indexOf(pp) === 0) { delete _presManual[k]; mudou = true; } });
        if (mudou) tentar(function () { pcFlushPresenceManualSave(); });
        var mudouA = false;
        Object.keys(_atvManual).forEach(function (k) { if (k.indexOf(ap) === 0) { delete _atvManual[k]; mudouA = true; } });
        if (mudouA) tentar(function () { _atvSalvar(); });
      },
      paineis: function (d) {
        var r = d.rel, atv = r.atividade || {}, dataBr = d.dateKey.slice(8, 10) + "/" + d.dateKey.slice(5, 7);
        var pAtv = atv.houve
          ? '<div class="st">📋 Atividade</div><div class="atv-tema"><strong>' + esc(atv.titulo || "Atividade") + '</strong><br><span style="font-size:.82rem;color:var(--cm)">' +
            esc(d.discNome + " " + dataBr + "/" + d.dateKey.slice(0, 4) + (atv.descricao ? " · " + atv.descricao : "")) + '</span></div><div id="atv-' + esc(d.id) + '" class="atv-grid"></div>'
          : '<div class="atv-tema"><strong>' + esc(d.discNome + " " + dataBr) + '</strong><br><span style="font-size:.82rem;color:var(--cm)">' + esc(d.assunto) +
            '</span></div><div class="atv-av"><span>📋</span><span>Conteúdo registrado no relato diário.</span></div>';
        return { p: '<div id="pl-' + esc(d.id) + '" class="pres-grid"></div>', a: pAtv };
      },
      sincronizar: function () {
        ["renderPresenca", "renderAtividades", "_sincronizarRegistros", "verificarAbasRelatos",
          "pcRefreshPresencaVisuals", "pcRefreshAtividadesVisuals", "renderCont", "pcRefreshHeroStats",
          "pcRefreshCounterHero", "pcSyncAndBroadcast"].forEach(function (nome) {
          tentar(function () { if (typeof window[nome] === "function") window[nome](); });
        });
      },
      durEmTitulo: function (txt) {
        var m = /(\d+)\s*h\/aula/i.exec(txt || "");
        return m ? { horas: Math.max(1, parseInt(m[1], 10)) } : null;
      }
    };
  }

  function adaptadorHerminio() {
    return {
      chave: "rh",
      scope: "herminio:novos-diarios:v1",
      lsKey: "nd_diarios_herminio_v1",
      schoolSlug: "raimundo-herminio-de-melo",
      turmas: ["t89", "t1", "t23"],
      comHoras: false,
      presencaNeutra: true,
      rotulo: function (t) { return { t89: "8º/9º Ano", t1: "1ª Série", t23: "2ª/3ª Série" }[t] || t; },
      alunos: function (t) { return (typeof ALUNOS_RH !== "undefined" && ALUNOS_RH[t]) || []; },
      disciplinas: function (t) {
        var vistos = {};
        return (typeof DISC_RH !== "undefined" ? DISC_RH : []).filter(function (d) {
          if (d.turmaId !== t || vistos[d.grupo]) return false;
          vistos[d.grupo] = true; return !!TITULO_RH[d.grupo];
        }).map(function (d) { return TITULO_RH[d.grupo]; });
      },
      pres: function () { return PRESENCA_RH; },
      atv: function () { return ATIVIDADES_RH; },
      kPres: function (id) { return "pl-" + id; },
      kAtv: function (id) { return "a-" + id; },
      codigoDisc: function (nome) { return nome; },
      discDoTitulo: function (txt) {
        var info = tentar(function () { return normalizarDiscRH(txt); });
        return info ? TITULO_RH[info.grupo] : "";
      },
      novoId: function (t, dateKey, discNome, ignorar) {
        var base = t + "-" + dateKey.slice(5, 7) + dateKey.slice(8, 10);
        var letras = "abcdefgh";
        for (var i = 0; i < letras.length; i++) {
          var id = base + letras.charAt(i);
          if (id === ignorar || idLivreDom(id)) return id;
        }
        return "";
      },
      mesmoId: function (s) { return s.dateKey === s.dateKey0; },
      tituloCard: function (d) {
        var m = d.minutos || minutosDoIntervalo(d.ini, d.fim) || 60;
        return d.discNome + " — " + (m % 60 === 0 ? (m / 60) + "h/aula" : Math.floor(m / 60) + "h" + dois(m % 60));
      },
      estadoPresenca: function (id, n, t) {
        var pane = document.getElementById("p-" + id);
        if (!pane) return "nm";
        var e = rhGetEstadoAtual("presenca", pane, n);
        if (e === true) return "pr";
        if (e === null || e === undefined) return "nm";
        var clique = (_rhPresencaCliques["p-" + id] || {})[n];
        var base = PRESENCA_RH["pl-" + id];
        return (clique === undefined && base && (base.faltJ || []).indexOf(n) >= 0) ? "fj" : "fa";
      },
      estadoAtividade: function (id, n) {
        var clique = (_rhAtividadeCliques["a-" + id] || {})[n];
        if (clique === true) return "fz";
        if (clique === false) return "nf";
        var base = ATIVIDADES_RH["a-" + id];
        if (base && (base.fez || []).indexOf(n) >= 0) return "fz";
        if (base && (base.naoFez || []).indexOf(n) >= 0) return "nf";
        return "au";
      },
      parcialPresenca: function () { return false; },
      parcialAtividade: function () { return false; },
      temAtividade: function (id) { return !!ATIVIDADES_RH["a-" + id]; },
      limparCliques: function (id) {
        var m1 = _rhPresencaCliques["p-" + id], m2 = _rhAtividadeCliques["a-" + id];
        if (m1) { delete _rhPresencaCliques["p-" + id]; tentar(function () { rhSalvarCliques("presenca"); }); }
        if (m2) { delete _rhAtividadeCliques["a-" + id]; tentar(function () { rhSalvarCliques("atividade"); }); }
      },
      paineis: function (d) {
        var atv = d.rel.atividade || {}, dataBr = d.dateKey.slice(8, 10) + "/" + d.dateKey.slice(5, 7);
        return {
          p: "",
          a: atv.houve
            ? '<div class="st">📋 Atividade</div><div class="atv-tema"><strong>' + esc(atv.titulo || "Atividade") + '</strong><br><span style="font-size:.82rem;color:var(--cm)">' +
              esc(d.discNome + " " + dataBr + (atv.descricao ? " · " + atv.descricao : "")) + "</span></div>"
            : ""
        };
      },
      sincronizar: function () {
        window._rhHorasExtrasCache = null;
        tentar(function () { rhMarcarPanesInterativosDirty("presenca"); rhMarcarPanesInterativosDirty("atividade"); });
        ["rhRenderInterativosVisiveis", "rhSincronizarResumoAlunos", "rhRefreshHeroStats", "rhRenderContSeVisivel"].forEach(function (nome) {
          tentar(function () { if (typeof window[nome] === "function") window[nome](nome === "rhRenderInterativosVisiveis" ? true : undefined); });
        });
        tentar(function () { rhSyncProjectionSeed("novo-diario"); });
        tentar(function () { rhAgendarSyncRemoto("novo-diario"); });
      },
      durEmTitulo: function (txt) {
        var h = tentar(function () { return parseHorasRH(txt); });
        return h ? { minutos: Math.round(h * 60) } : null;
      }
    };
  }

  function idLivreDom(id) {
    return !document.getElementById("p-" + id) && !document.getElementById("r-" + id) && !document.getElementById("a-" + id);
  }

  // ── armazenamento local e mesclagem ───────────────────────────
  function lerLocal() {
    try {
      var b = JSON.parse(localStorage.getItem(A.lsKey) || "null");
      if (b && Array.isArray(b.diarios)) return { diarios: b.diarios, removidos: normalizarRemovidos(b.removidos) };
    } catch (e) {}
    return { diarios: [], removidos: [] };
  }
  function gravarLocal() { try { localStorage.setItem(A.lsKey, JSON.stringify(estado)); } catch (e) {} }
  function normalizarRemovidos(lista) {
    return (lista || []).map(function (r) { return typeof r === "string" ? { id: r, em: "0" } : r; }).filter(function (r) { return r && r.id; });
  }
  function removerDiario(id) {
    estado.diarios = estado.diarios.filter(function (d) { return d.id !== id; });
    estado.removidos = estado.removidos.filter(function (r) { return r.id !== id; });
    estado.removidos.push({ id: id, em: agora() });
  }
  // Une remoto e local por id. Uma remoção só vale contra diários mais antigos que ela.
  function mesclar(remoto) {
    var tomb = {};
    normalizarRemovidos(estado.removidos).concat(normalizarRemovidos(remoto && remoto.removidos)).forEach(function (r) {
      if (!tomb[r.id] || tomb[r.id] < r.em) tomb[r.id] = r.em;
    });
    var mapa = {};
    (estado.diarios || []).concat((remoto && remoto.diarios) || []).forEach(function (d) {
      if (!d || !d.id) return;
      if (tomb[d.id] && String(d.atualizadoEm || "") <= tomb[d.id]) return;
      var atual = mapa[d.id];
      if (!atual || String(d.atualizadoEm || "") >= String(atual.atualizadoEm || "")) mapa[d.id] = d;
    });
    return {
      diarios: Object.keys(mapa).map(function (k) { return mapa[k]; }),
      removidos: Object.keys(tomb).map(function (k) { return { id: k, em: tomb[k] }; })
    };
  }
  function assinatura(e) {
    return JSON.stringify(e.diarios.map(function (d) { return d.id + "@" + (d.atualizadoEm || ""); }).sort()) +
      JSON.stringify(normalizarRemovidos(e.removidos).map(function (r) { return r.id + "@" + r.em; }).sort());
  }

  // ── montagem do card ──────────────────────────────────────────
  function montarCard(d) {
    var r = d.rel || {}, id = d.id, t = d.turma;
    var dia = d.dateKey.slice(8, 10);
    var mes = MESES[parseInt(d.dateKey.slice(5, 7), 10) - 1] + " " + d.dateKey.slice(0, 4);
    var comp = r.comportamento || [];
    var nObs = comp.filter(function (c) { return c.tipo !== "destaque"; }).length;
    var nFaltas = (r.faltaram || []).length + (r.faltJ || []).length;
    var chipPres = r.presencaNI ? "Presença não informada" : (nFaltas ? nFaltas + (nFaltas > 1 ? " faltas" : " falta") : "Presença integral");

    var chips = (d.ini && d.fim ? '<span class="ch ch-h">⏰ ' + esc(d.ini) + "–" + esc(d.fim) + "</span>" : "") +
      '<span class="ch ch-p">👥 ' + chipPres + "</span>" +
      (d.assunto ? '<span class="ch ch-i">📖 ' + esc(d.assunto) + "</span>" : "") +
      (nObs ? '<span class="ch ch-a">⚠️ ' + nObs + " obs.</span>" : "");

    var relato = "";
    if (r.lembrete && r.lembrete.texto) {
      relato += '<div class="lembrete"><div class="lembrete-tag">🔔 ' + esc(r.lembrete.titulo || "Lembrete") + '</div><div class="lembrete-txt">' + esc(r.lembrete.texto) + "</div></div>";
    }
    var cab = (!r.conteudoCompleto && d.assunto) ? "<strong>" + esc(d.assunto) + ".</strong>" + (r.conteudo ? "<br>" : "") : "";
    if (cab || r.conteudo) relato += '<div class="st">📖 Conteúdo</div><div class="ct">' + cab + esc(r.conteudo || "").replace(/\n/g, "<br>") + "</div>";
    if (comp.length) {
      relato += '<div class="st">🔎 Comportamento</div><div class="ol">' + comp.map(function (c) {
        var pos = c.tipo === "destaque";
        var icone = c.icone || (pos ? "✅" : (c.tipo === "grave" ? "🚨" : "⚠️"));
        return '<div class="oi' + (pos ? " nt" : "") + '"><span class="oi-ic">' + esc(icone) + '</span><div><div class="oa">' +
          esc(nomesCompletos(t, c.alunos, c.extra)) + '</div><div class="od">' + esc(c.texto) + "</div></div></div>";
      }).join("") + "</div>";
    }
    if (nFaltas) {
      var partes = [];
      if ((r.faltaram || []).length) partes.push("Faltaram: " + nomesCompletos(t, r.faltaram));
      if ((r.faltJ || []).length) partes.push("Faltas justificadas: " + nomesCompletos(t, r.faltJ));
      relato += '<div class="st">🚫 Faltas</div><div class="ng">' + esc(partes.join(" — ")) + "</div>";
    } else if (r.presencaNI) {
      relato += '<div class="st">Presenças</div><div class="ng">Presença não informada no registro.</div>';
    }
    if (r.analiseHtml) {
      relato += r.analiseHtml;
    } else if (r.analise && (r.analise.itens || []).length) {
      var an = r.analise;
      relato += '<div class="ai2"><div class="ai2h"><div class="tg">✦ Análise IA</div><span>' + esc(an.resumo || "") + "</span></div>" +
        an.itens.map(function (it) {
          var positivo = /destaque|positiv/i.test(it.rotulo || "");
          var grave = !positivo && comp.some(function (c) {
            return c.tipo === "grave" && (c.alunos || []).some(function (n) { return (it.alunos || []).indexOf(n) >= 0; });
          });
          return '<div class="ai2i"><div class="ai2a">' + esc(primeirosNomes(t, it.alunos)) + '</div><div class="ai2p' +
            (positivo ? '" style="color:var(--ai)' : (grave ? " grave" : " warn")) + '">' + esc(it.rotulo || "") + '</div><div class="ai2t">' + esc(it.recomendacao || "") + "</div></div>";
        }).join("") + (an.sugestao ? '<div class="ai2s">💡 ' + esc(an.sugestao) + "</div>" : "") + "</div>";
    }
    if (r.extraHtml) relato += r.extraHtml;

    var pn = A.paineis(d);
    return '<div class="ea" data-novo-diario="' + esc(id) + '" data-runtime-ui="novo-diario">' +
      '<div class="eh" onclick="tog(this)"><div class="edb"><div class="d">' + dia + '</div><div class="my">' + mes + "</div></div>" +
      '<div class="em"><div class="ed">' + esc(A.tituloCard(d)) + '</div><div class="ec">' + chips + '</div></div><div class="et">▾</div></div>' +
      '<div class="ec2"><div class="itabs">' +
      '<button class="itab on" onclick="itab(this,\'r-' + esc(id) + '\')">📄 Relato</button>' +
      '<button class="itab" onclick="itab(this,\'p-' + esc(id) + '\')">👥 Presença</button>' +
      '<button class="itab" onclick="itab(this,\'a-' + esc(id) + '\')">📝 Atividades</button></div>' +
      '<div class="ipane on" id="r-' + esc(id) + '">' + relato + "</div>" +
      '<div class="ipane" id="p-' + esc(id) + '">' + pn.p + "</div>" +
      '<div class="ipane" id="a-' + esc(id) + '">' + pn.a + "</div></div></div>";
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

  // ── renderização de todos os diários ──────────────────────────
  function cardPorId(id) {
    var pane = document.getElementById("r-" + id) || document.getElementById("p-" + id) || document.getElementById("a-" + id);
    var c = pane && pane.closest(".ea");
    return c && !c.hasAttribute("data-novo-diario") ? c : null;
  }
  function limparGerados() {
    document.querySelectorAll("[data-novo-diario]").forEach(function (el) { el.remove(); });
    geradas.forEach(function (k) { tentar(function () { delete A.pres()[k]; delete A.atv()[k]; }); });
    geradas = [];
    Object.keys(backup).forEach(function (k) {
      var b = backup[k];
      tentar(function () { var alvo = b.tipo === "p" ? A.pres() : A.atv(); if (b.valor === undefined) delete alvo[k]; else alvo[k] = b.valor; });
    });
    backup = {};
    Object.keys(ocultos).forEach(function (o) { var x = ocultos[o]; if (x.ph.parentNode) x.ph.replaceWith(x.card); });
    ocultos = {};
  }
  function ocultarOriginal(origem) {
    if (ocultos[origem]) return;
    var card = cardPorId(origem);
    if (!card) return;
    var ph = document.createComment("nd-orig:" + origem);
    card.replaceWith(ph);
    ocultos[origem] = { card: card, ph: ph };
    [["p", A.pres(), A.kPres(origem)], ["a", A.atv(), A.kAtv(origem)]].forEach(function (x) {
      if (!(x[2] in backup)) backup[x[2]] = { tipo: x[0], valor: x[1][x[2]] };
      delete x[1][x[2]];
    });
  }
  function renderTodos(semEcossistema) {
    limparGerados();
    estado.diarios.forEach(function (d) {
      if (A.turmas.indexOf(d.turma) < 0) return;
      if (d.origem) ocultarOriginal(d.origem);
      if (d.excluido) return;
      var sec = document.getElementById("sec-" + d.turma);
      if (!sec) return;
      var r = d.rel || {};
      var kp = A.kPres(d.id), ka = A.kAtv(d.id);
      if (!r.presencaNI) {
        var pr = { turma: d.turma, faltaram: (r.faltaram || []).slice(), faltJ: (r.faltJ || []).slice() };
        if (r.parcial) pr.parcial = true;
        A.pres()[kp] = pr; geradas.push(kp);
      }
      if (r.atividade && r.atividade.houve) {
        var at = { turma: d.turma, fez: (r.atividade.fez || []).slice(), naoFez: (r.atividade.naoFez || []).slice() };
        if (r.atividade.parcial) at.parcial = true;
        A.atv()[ka] = at; geradas.push(ka);
      }
      var holder = document.createElement("div");
      holder.innerHTML = montarCard(d);
      inserirCard(sec, holder.firstElementChild, d.dateKey + "T" + (d.ini || "00:00"));
    });
    decorar();
    if (!semEcossistema) A.sincronizar();
  }

  // ── caneta ✏️ em todos os cards das abas de turma ─────────────
  function decorar() {
    A.turmas.forEach(function (t) {
      var sec = document.getElementById("sec-" + t);
      if (!sec) return;
      sec.querySelectorAll(".ea").forEach(function (card) {
        var cab = card.querySelector(".eh");
        if (!cab || cab.querySelector(".nd-edit")) return;
        if (!card.querySelector('.ipane[id^="r-"], .ipane[id^="p-"]')) return;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "nd-edit";
        b.setAttribute("data-runtime-ui", "nd-edit");
        b.setAttribute("title", "Editar este diário");
        b.setAttribute("aria-label", "Editar este diário");
        b.textContent = "✏️";
        var et = cab.querySelector(".et");
        if (et) cab.insertBefore(b, et); else cab.appendChild(b);
      });
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".nd-edit");
    if (!b) return;
    e.stopPropagation();
    e.preventDefault();
    var card = b.closest(".ea");
    var sec = card && card.closest(".sec");
    var t = sec && sec.id ? sec.id.replace(/^sec-/, "") : "";
    var pane = card && card.querySelector('.ipane[id^="r-"], .ipane[id^="p-"]');
    if (!pane || !A || A.turmas.indexOf(t) < 0) return;
    abrirEdicao(t, pane.id.slice(2));
  }, true);

  // ── sincronização remota ──────────────────────────────────────
  function aplicarRemoto(payload) {
    var antes = assinatura(estado);
    var mesclado = mesclar(payload || {});
    var remotoIgual = assinatura({ diarios: (payload && payload.diarios) || [], removidos: (payload && payload.removidos) || [] }) === assinatura(mesclado);
    var mudou = assinatura(mesclado) !== antes;
    estado = mesclado;
    gravarLocal();
    if (mudou) renderTodos();
    if (!remotoIgual && sync) sync.schedulePush("merge");
  }
  function iniciarSync() {
    if (!window.RelatorioSupabaseSync || !window.RelatorioSupabaseSync.isAvailable()) return;
    sync = window.RelatorioSupabaseSync.createScopeSync({
      scope: A.scope,
      schoolSlug: A.schoolSlug,
      classSlug: "novos-diarios",
      source: A.chave === "rh" ? "herminio-novo-diario" : "casavequia-novo-diario",
      debounceMs: 400,
      getLocalPayload: function () { return { versao: 2, diarios: estado.diarios, removidos: estado.removidos }; },
      onRemotePayload: aplicarRemoto
    });
    sync.start();
  }
  function persistir() {
    gravarLocal();
    renderTodos();
    if (sync) return tentar(function () { return sync.pushNow("force"); });
  }

  // ── IA ────────────────────────────────────────────────────────
  async function organizarComIA(e) {
    var cliente = window.RelatorioSupabaseSync && window.RelatorioSupabaseSync.getClient();
    if (!cliente || !cliente.functions) throw new Error("Sem conexão com o Supabase.");
    if (window.RelatorioSupabaseSync.auth && !window.RelatorioSupabaseSync.auth.isSignedIn()) {
      window.RelatorioSupabaseSync.auth.showLogin("Entre com a conta do professor para usar a IA.");
      throw new Error("Entre com a conta do professor e tente de novo.");
    }
    var resposta = await cliente.functions.invoke("organizar-relato", {
      body: {
        turma: A.rotulo(e.turma), disciplina: e.discNome, data: e.dateKey, assunto: e.assunto,
        horario: (e.ini || "") + "–" + (e.fim || ""), horas: e.horas || Math.round((e.minutos || 0) / 60) || null,
        rascunho: e.rascunho,
        alunos: alunosDe(e.turma).map(function (a) { return { n: a.n, nome: a.nm }; })
      }
    });
    if (resposta.error) {
      var detalhe = "";
      try { detalhe = (await resposta.error.context.json()).erro || ""; } catch (x) {}
      throw new Error(detalhe || "A IA não respondeu agora. Tente de novo em instantes.");
    }
    if (!resposta.data || !resposta.data.relato) throw new Error((resposta.data && resposta.data.erro) || "A IA devolveu uma resposta vazia.");
    return resposta.data;
  }
  function numerosValidos(t, lista) {
    var seen = {}, out = [];
    (lista || []).forEach(function (n) {
      n = parseInt(n, 10);
      if (alunoPorN(t, n) && !seen[n]) { seen[n] = true; out.push(n); }
    });
    return out;
  }
  function trocarCodigos(texto, t) {
    return String(texto || "").replace(/«A(\d+)»/g, function (tudo, n) {
      var a = alunoPorN(t, parseInt(n, 10));
      return a ? a.nm.split(" ")[0] : tudo;
    });
  }
  function relVazio() {
    return {
      conteudo: "", faltaram: [], faltJ: [], comportamento: [],
      atividade: { houve: false, titulo: "", descricao: "", fez: [], naoFez: [] },
      lembrete: { titulo: "", texto: "" }, analise: { resumo: "", itens: [], sugestao: "" }
    };
  }
  function normalizarRelato(b, t) {
    var f = function (v) { return trocarCodigos(v, t).trim(); };
    var atv = b.atividade || {}, lem = b.lembrete || {}, an = b.analise || {};
    var faltaram = numerosValidos(t, b.faltaram);
    return {
      conteudo: f(b.conteudo),
      faltaram: faltaram,
      faltJ: numerosValidos(t, b.faltaram_justificadas).filter(function (n) { return faltaram.indexOf(n) < 0; }),
      comportamento: (b.comportamento || []).map(function (c) {
        return { alunos: numerosValidos(t, c.alunos), tipo: ["grave", "destaque"].indexOf(c.tipo) >= 0 ? c.tipo : "advertencia", texto: f(c.texto) };
      }).filter(function (c) { return c.alunos.length && c.texto; }),
      atividade: { houve: !!atv.houve, titulo: f(atv.titulo), descricao: f(atv.descricao), fez: numerosValidos(t, atv.fez), naoFez: numerosValidos(t, atv.nao_fez) },
      lembrete: { titulo: f(lem.titulo), texto: f(lem.texto) },
      analise: {
        resumo: f(an.resumo),
        itens: (an.itens || []).map(function (i) {
          return { alunos: numerosValidos(t, i.alunos), rotulo: f(i.rotulo), recomendacao: f(i.recomendacao) };
        }).filter(function (i) { return i.alunos.length; }),
        sugestao: f(an.sugestao)
      }
    };
  }

  // ── rascunho do editor <-> relato ─────────────────────────────
  function mapasDeRel(t, rel) {
    var pres = {}, atv = {};
    alunosDe(t).forEach(function (a) {
      pres[a.n] = rel.faltaram.indexOf(a.n) >= 0 ? "fa" : rel.faltJ.indexOf(a.n) >= 0 ? "fj" : (rel.presencaNI ? "nm" : "pr");
      var at = rel.atividade || {};
      atv[a.n] = (at.fez || []).indexOf(a.n) >= 0 ? "fz" : (at.naoFez || []).indexOf(a.n) >= 0 ? "nf" : "au";
    });
    return { pres: pres, atv: atv };
  }
  function relDeMapas(s) {
    var rel = s.rel;
    rel.faltaram = []; rel.faltJ = [];
    var nm = 0, total = 0;
    alunosDe(s.turma).forEach(function (a) {
      total++;
      var v = s.pres[a.n];
      if (v === "fa") rel.faltaram.push(a.n);
      else if (v === "fj") rel.faltJ.push(a.n);
      else if (v === "nm") nm++;
    });
    rel.presencaNI = A.presencaNeutra && total > 0 && nm === total;
    rel.atividade.fez = []; rel.atividade.naoFez = [];
    alunosDe(s.turma).forEach(function (a) {
      if (s.atv[a.n] === "fz") rel.atividade.fez.push(a.n);
      else if (s.atv[a.n] === "nf") rel.atividade.naoFez.push(a.n);
    });
    return rel;
  }

  // Lê um card do HTML e devolve o rascunho do editor.
  function extrairDoCard(t, id, card) {
    var rel = relVazio();
    var edb = chaveDoCard(card);
    var ed = ((card.querySelector(".em .ed") || {}).textContent || "").trim();
    var discNome = A.discDoTitulo(ed) || (A.disciplinas(t)[0] || "");
    var horaChip = /(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/.exec((card.querySelector(".ch-h") || {}).textContent || "");
    var ini = horaChip ? dois(horaChip[1]) + ":" + horaChip[2] : "";
    var fim = horaChip ? dois(horaChip[3]) + ":" + horaChip[4] : "";
    var dur = A.durEmTitulo(ed) || {};
    var assunto = ((card.querySelector(".ch-i") || {}).textContent || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
    var rp = document.getElementById("r-" + id);
    if (rp) {
      var conts = [];
      Array.prototype.forEach.call(rp.children, function (c) {
        if (c.classList.contains("lembrete")) {
          rel.lembrete = { titulo: ((c.querySelector(".lembrete-tag") || {}).textContent || "").replace(/^[^\p{L}\p{N}]+/u, "").trim(), texto: ((c.querySelector(".lembrete-txt") || {}).textContent || "").trim() };
        } else if (c.classList.contains("ct")) {
          conts.push(textoDoNo(c));
        } else if (c.classList.contains("ol")) {
          Array.prototype.forEach.call(c.querySelectorAll(".oi"), function (oi) {
            var oa = oi.querySelector(".oa"), od = oi.querySelector(".od");
            var icone = ((oi.querySelector(".oi-ic") || {}).textContent || "").trim();
            var alunos = [], extra = [];
            (oa ? oa.textContent : "").split("·").map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (nome) {
              var a = tentar(function () { return typeof pcFindStudentByName === "function" ? pcFindStudentByName(t, nome) : null; }) ||
                A.alunos(t).filter(function (x) { return x.nm.toLowerCase() === nome.toLowerCase(); })[0];
              if (a) alunos.push(a.n); else extra.push(nome);
            });
            var pos = oi.classList.contains("nt") || icone === "✅";
            rel.comportamento.push({ alunos: alunos, extra: extra.join(" · "), tipo: pos ? "destaque" : (icone === "🚨" ? "grave" : "advertencia"), texto: od ? od.textContent.trim() : "", icone: icone });
          });
        } else if (c.classList.contains("ai2")) {
          rel.analiseHtml = c.outerHTML;
        } else if (!c.classList.contains("st") && !c.classList.contains("ng") && !c.hasAttribute("data-runtime-ui")) {
          rel.extraHtml = (rel.extraHtml || "") + c.outerHTML;
        }
      });
      rel.conteudo = conts.join("\n\n");
      rel.conteudoCompleto = true;
    }
    var atvPane = document.getElementById("a-" + id);
    var tema = atvPane && atvPane.querySelector(".atv-tema");
    rel.atividade = {
      houve: A.temAtividade(id),
      titulo: tema ? ((tema.querySelector("strong") || {}).textContent || "").trim() : "",
      descricao: tema ? ((tema.querySelector("span") || {}).textContent || "").trim() : "",
      fez: [], naoFez: [], parcial: A.parcialAtividade(id)
    };
    rel.parcial = A.parcialPresenca(id);
    var pres = {}, atv = {}, nm = 0, total = 0;
    alunosDe(t).forEach(function (a) {
      pres[a.n] = A.estadoPresenca(id, a.n, t);
      atv[a.n] = A.estadoAtividade(id, a.n);
      total++; if (pres[a.n] === "nm") nm++;
    });
    return {
      turma: t, id: id, origem: id, dateKey: edb.slice(0, 10), discNome: discNome, assunto: assunto, ini: ini, fim: fim,
      horas: dur.horas || horasDoIntervalo(ini, fim) || 1, minutos: dur.minutos || 0, rel: rel, pres: pres, atv: atv,
      rascunho: "", estatico: true
    };
  }

  // ── modal e estilos ───────────────────────────────────────────
  function injetarEstilo() {
    if (document.getElementById("nd-style")) return;
    var s = document.createElement("style");
    s.id = "nd-style";
    s.textContent =
      ".nd-edit{background:transparent;border:1px solid var(--cl,#e8e5de);border-radius:8px;padding:3px 8px;margin:0 8px 0 4px;cursor:pointer;font-size:.85rem;line-height:1.4;flex-shrink:0}.nd-edit:hover{background:var(--cl,#e8e5de)}" +
      ".nd-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:14px}" +
      ".nd-box{background:var(--cr,#faf8f2);color:var(--ce,#2b2b2b);border-radius:16px;padding:22px;max-width:620px;width:100%;max-height:94vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.5);font-family:'DM Sans',sans-serif}" +
      ".nd-box.wide{max-width:780px}" +
      ".nd-tit{font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:700;color:var(--vd,#1a3a2a);margin-bottom:4px}" +
      ".nd-sub{font-size:.8rem;color:var(--cm,#5a5a5a);margin-bottom:14px}" +
      ".nd-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}" +
      ".nd-f{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}.nd-f.full{grid-column:1/-1}" +
      ".nd-f label,.nd-lb{font-size:.72rem;font-weight:700;color:var(--vm,#2d6147);text-transform:uppercase;letter-spacing:.04em}" +
      ".nd-box input[type=text],.nd-box input[type=date],.nd-box input[type=time],.nd-box input[type=number],.nd-box select,.nd-box textarea{padding:9px 11px;border:2px solid var(--cl,#e8e5de);border-radius:10px;font:inherit;font-size:.88rem;color:var(--ce,#2b2b2b);background:var(--cr,#faf8f2);width:100%}" +
      ".nd-box textarea{resize:vertical;min-height:110px}" +
      ".nd-box input:focus,.nd-box select:focus,.nd-box textarea:focus{outline:none;border-color:var(--vm,#2d6147)}" +
      ".nd-acts{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap}" +
      ".nd-b{flex:1;min-width:120px;border:none;border-radius:10px;padding:10px 14px;font:inherit;font-weight:700;font-size:.86rem;cursor:pointer}" +
      ".nd-b.pri{background:var(--vm,#2d6147);color:#fff}.nd-b.sec{background:var(--cl,#e8e5de);color:var(--ce,#2b2b2b)}.nd-b.perigo{background:var(--rs,#fdecea);color:var(--ra,#c0392b);flex:0 1 auto}.nd-b:disabled{opacity:.55;cursor:wait}" +
      ".nd-msg{font-size:.82rem;border-radius:8px;padding:9px 12px;margin:0 0 12px}" +
      ".nd-msg.err{background:var(--rs,#fdecea);color:var(--ra,#c0392b)}.nd-msg.warn{background:rgba(201,168,76,.15);color:var(--og,#876020)}" +
      ".nd-prev h4{font-size:.76rem;text-transform:uppercase;letter-spacing:.05em;color:var(--vm,#2d6147);margin:12px 0 4px}" +
      ".nd-prev p,.nd-prev li{font-size:.86rem;line-height:1.45}.nd-prev ul{padding-left:18px}" +
      ".nd-sec{border:1px solid var(--cl,#e8e5de);border-radius:12px;margin-bottom:10px;padding:0 12px}.nd-sec>summary{cursor:pointer;font-weight:700;color:var(--vd,#1a3a2a);padding:10px 0;font-size:.9rem}.nd-sec[open]>summary{border-bottom:1px solid var(--cl,#e8e5de);margin-bottom:10px}" +
      ".nd-pres{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px 12px;margin-bottom:10px}" +
      ".nd-pr{display:flex;align-items:center;gap:6px;font-size:.8rem}.nd-pr span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nd-pr select{width:auto;padding:4px 6px;font-size:.78rem}" +
      ".nd-item{border:1px dashed var(--cl,#e8e5de);border-radius:10px;padding:9px;margin-bottom:9px;display:flex;flex-direction:column;gap:6px}" +
      ".nd-line{display:flex;gap:8px;align-items:center}.nd-line select{flex:1}" +
      ".nd-x{background:none;border:none;color:var(--ra,#c0392b);font-size:1rem;cursor:pointer}" +
      ".nd-alu>summary{font-size:.8rem;cursor:pointer;color:var(--vm,#2d6147)}.nd-chk{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:3px 10px;max-height:160px;overflow-y:auto;padding:6px 0}.nd-chk label{font-size:.78rem;display:flex;gap:6px;align-items:center;text-transform:none;letter-spacing:0;font-weight:400;color:var(--ce,#2b2b2b)}" +
      ".nd-mini{font-size:.76rem;padding:6px 10px;border-radius:8px;border:1px solid var(--cl,#e8e5de);background:transparent;cursor:pointer;color:var(--ce,#2b2b2b)}" +
      "@media(max-width:560px){.nd-grid{grid-template-columns:1fr}.nd-box{padding:16px}}";
    document.head.appendChild(s);
  }
  function fecharModal() { if (modal) { modal.remove(); modal = null; } }
  function abrirCasca(html, largo) {
    injetarEstilo();
    var rolagem = modal ? modal.querySelector(".nd-box").scrollTop : 0;
    fecharModal();
    modal = document.createElement("div");
    modal.className = "nd-ov";
    modal.setAttribute("data-runtime-ui", "novo-diario-modal");
    modal.innerHTML = '<div class="nd-box' + (largo ? " wide" : "") + '">' + html + "</div>";
    document.body.appendChild(modal);
    modal.querySelector(".nd-box").scrollTop = rolagem;
    return modal;
  }
  function $(sel) { return modal ? modal.querySelector(sel) : null; }
  function mostrarMsg(texto, tipo) {
    var box = $(".nd-msgbox");
    if (box) box.innerHTML = texto ? '<div class="nd-msg ' + (tipo || "err") + '">' + esc(texto) + "</div>" : "";
  }
  function opcoesDisc(t, atual) {
    var d = A.disciplinas(t).slice();
    if (atual && d.indexOf(atual) < 0) d.push(atual);
    return (d.length > 1 || !atual ? '<option value="">Escolha…</option>' : "") +
      d.map(function (n) { return '<option value="' + esc(n) + '"' + (n === atual ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("");
  }

  // ── passo 1: novo diário ──────────────────────────────────────
  function abrirNovo(t, v) {
    v = v || {};
    var h = new Date();
    var dataPadrao = v.dateKey || (h.getFullYear() + "-" + dois(h.getMonth() + 1) + "-" + dois(h.getDate()));
    var discs = A.disciplinas(t);
    abrirCasca(
      '<div class="nd-tit">✏️ Novo Diário — ' + esc(A.rotulo(t)) + '</div>' +
      '<div class="nd-sub">A turma já é a desta aba. Escreva o rascunho e a IA organiza no padrão dos diários.</div>' +
      '<div class="nd-msgbox"></div><div class="nd-grid">' +
      '<div class="nd-f"><label for="nd-data">Data</label><input type="date" id="nd-data" value="' + esc(dataPadrao) + '"></div>' +
      '<div class="nd-f"><label for="nd-disc">Disciplina</label><select id="nd-disc">' + (discs.length > 1 && !v.discNome ? '<option value="">Escolha…</option>' : "") +
      discs.map(function (d) { return '<option value="' + esc(d) + '"' + (v.discNome === d ? " selected" : "") + ">" + esc(d) + "</option>"; }).join("") + "</select></div>" +
      '<div class="nd-f full"><label for="nd-assunto">Assunto</label><input type="text" id="nd-assunto" maxlength="160" placeholder="Ex.: Tema 8 — Código de ética digital" value="' + esc(v.assunto || "") + '"></div>' +
      '<div class="nd-f"><label for="nd-ini">Início</label><input type="time" id="nd-ini" value="' + esc(v.ini || "") + '"></div>' +
      '<div class="nd-f"><label for="nd-fim">Fim</label><input type="time" id="nd-fim" value="' + esc(v.fim || "") + '"></div>' +
      (A.comHoras
        ? '<div class="nd-f"><label for="nd-horas">H/aula (conta no Contador)</label><input type="number" id="nd-horas" min="1" max="6" value="' + esc(v.horas || "") + '"></div>'
        : '<div class="nd-f"><label>Duração</label><div id="nd-dur" style="font-size:.9rem;padding:9px 0">—</div></div>') +
      '<div class="nd-f full"><label for="nd-rasc">Rascunho do diário (opcional)</label><textarea id="nd-rasc" placeholder="Escreva livremente: o que foi feito, quem faltou, ocorrências, atividade…">' + esc(v.rascunho || "") + "</textarea></div></div>" +
      '<div class="nd-acts"><button type="button" class="nd-b sec" data-nd="cancelar">Cancelar</button>' +
      '<button type="button" class="nd-b pri" data-nd="seguir">🤖 Organizar com IA</button></div>'
    );
    var ini = $("#nd-ini"), fim = $("#nd-fim"), horas = $("#nd-horas"), dur = $("#nd-dur"), rasc = $("#nd-rasc"), btn = $('[data-nd="seguir"]');
    var manual = !!v.horas;
    function atualizar() {
      if (horas && !manual) horas.value = horasDoIntervalo(ini.value, fim.value) || "";
      if (dur) { var m = minutosDoIntervalo(ini.value, fim.value); dur.textContent = m ? Math.floor(m / 60) + "h" + (m % 60 ? dois(m % 60) : "") + " (" + m + " min)" : "—"; }
    }
    ini.addEventListener("input", atualizar);
    fim.addEventListener("input", atualizar);
    if (horas) horas.addEventListener("input", function () { manual = true; });
    rasc.addEventListener("input", function () { btn.textContent = rasc.value.trim() ? "🤖 Organizar com IA" : "Continuar →"; });
    atualizar();
    btn.textContent = rasc.value.trim() ? "🤖 Organizar com IA" : "Continuar →";
    $('[data-nd="cancelar"]').addEventListener("click", fecharModal);
    btn.addEventListener("click", function () { seguir(t); });
  }
  function lerPasso1(t) {
    var e = {
      turma: t, dateKey: $("#nd-data").value, discNome: $("#nd-disc").value, assunto: $("#nd-assunto").value.trim(),
      ini: $("#nd-ini").value, fim: $("#nd-fim").value, rascunho: $("#nd-rasc").value.trim(),
      horas: A.comHoras ? (parseInt($("#nd-horas").value, 10) || 0) : 0
    };
    var v = validarCampos(e);
    return v ? { erro: v } : { entrada: e };
  }
  function validarCampos(e) {
    if (!e.dateKey) return "Escolha a data.";
    if (!e.discNome) return "Escolha a disciplina.";
    if (!e.assunto) return "Informe o assunto.";
    var temIni = /^\d{1,2}:\d{2}$/.test(e.ini), temFim = /^\d{1,2}:\d{2}$/.test(e.fim);
    if (temIni !== temFim) return "Informe início e fim do horário (ou deixe os dois em branco).";
    if (temIni && !minutosDoIntervalo(e.ini, e.fim)) return "O fim precisa ser depois do início.";
    if (!temIni && !e.estatico) return "Informe o horário de início e de fim.";
    if (temIni) {
      e.ini = dois(e.ini.split(":")[0]) + ":" + e.ini.split(":")[1];
      e.fim = dois(e.fim.split(":")[0]) + ":" + e.fim.split(":")[1];
    }
    if (A.comHoras && (!e.horas || e.horas < 1)) return "Informe as h/aula.";
    return "";
  }
  async function seguir(t) {
    var lido = lerPasso1(t);
    if (lido.erro) return mostrarMsg(lido.erro);
    passo = { entrada: lido.entrada, relato: null, aviso: "", modelo: "" };
    if (!lido.entrada.rascunho) { passo.relato = relVazio(); return abrirEditorDoPasso(); }
    var btn = $('[data-nd="seguir"]');
    btn.disabled = true; btn.textContent = "🤖 Organizando…"; mostrarMsg("");
    try {
      var r = await organizarComIA(lido.entrada);
      passo.relato = normalizarRelato(r.relato, t);
      passo.aviso = trocarCodigos(r.relato.aviso || "", t);
      passo.modelo = r.modelo || "";
      abrirRevisao();
    } catch (erro) {
      btn.disabled = false; btn.textContent = "🤖 Organizar com IA";
      mostrarMsg(String((erro && erro.message) || erro));
      if (!$('[data-nd="semia"]')) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "nd-b sec"; b.setAttribute("data-nd", "semia");
        b.textContent = "Continuar sem IA (rascunho como está)";
        b.addEventListener("click", function () {
          passo.relato = relVazio();
          passo.relato.conteudo = passo.entrada.rascunho;
          abrirEditorDoPasso();
        });
        $(".nd-acts").appendChild(b);
      }
    }
  }
  function abrirRevisao() {
    var e = passo.entrada, r = passo.relato, t = e.turma;
    var L = function (n) { return esc(nomesCompletos(t, n)); };
    abrirCasca('<div class="nd-tit">Revise o diário — ' + esc(A.rotulo(t)) + '</div>' +
      '<div class="nd-sub">' + esc(e.discNome) + " · " + esc(e.dateKey.split("-").reverse().join("/")) + " · " + esc(e.ini) + "–" + esc(e.fim) +
      (passo.modelo ? " · organizado por " + esc(passo.modelo) : "") + "</div>" +
      (passo.aviso ? '<div class="nd-msg warn">⚠️ ' + esc(passo.aviso) + "</div>" : "") +
      '<div class="nd-prev"><h4>Assunto</h4><p>' + esc(e.assunto) + "</p><h4>Conteúdo</h4><p>" + (r.conteudo ? esc(r.conteudo) : "<em>Sem texto.</em>") + "</p>" +
      "<h4>Presença</h4><p>" + ((r.faltaram.length || r.faltJ.length)
        ? (r.faltaram.length ? "Faltaram: " + L(r.faltaram) + ". " : "") + (r.faltJ.length ? "Justificadas: " + L(r.faltJ) + "." : "")
        : "Presença integral (nenhuma falta citada).") + "</p>" +
      (r.comportamento.length ? "<h4>Comportamento</h4><ul>" + r.comportamento.map(function (c) {
        return "<li><strong>" + { advertencia: "⚠️", grave: "🚨", destaque: "✅" }[c.tipo] + " " + L(c.alunos) + "</strong> — " + esc(c.texto) + "</li>";
      }).join("") + "</ul>" : "") +
      (r.atividade.houve ? "<h4>Atividade</h4><p><strong>" + esc(r.atividade.titulo || "Atividade") + "</strong> " + esc(r.atividade.descricao) +
        (r.atividade.fez.length ? "<br>Fizeram: " + L(r.atividade.fez) : "") + (r.atividade.naoFez.length ? "<br>Não fizeram: " + L(r.atividade.naoFez) : "") + "</p>" : "") +
      (r.analise.itens.length ? "<h4>Análise IA</h4><p>" + esc(r.analise.resumo) + (r.analise.sugestao ? "<br>💡 " + esc(r.analise.sugestao) : "") + "</p>" : "") +
      '</div><div class="nd-msgbox" style="margin-top:12px"></div>' +
      '<div class="nd-acts"><button type="button" class="nd-b sec" data-nd="voltar">← Voltar</button>' +
      '<button type="button" class="nd-b sec" data-nd="ajustar">✏️ Ajustar detalhes</button>' +
      '<button type="button" class="nd-b pri" data-nd="salvar">💾 Salvar diário</button></div>');
    $('[data-nd="voltar"]').addEventListener("click", function () { abrirNovo(e.turma, e); });
    $('[data-nd="ajustar"]').addEventListener("click", abrirEditorDoPasso);
    $('[data-nd="salvar"]').addEventListener("click", function () { abrirEditorDoPasso(true); });
  }
  function abrirEditorDoPasso(salvarJa) {
    var e = passo.entrada;
    var s = {
      turma: e.turma, id: "", origem: "", dateKey: e.dateKey, dateKey0: "", discNome: e.discNome, discNome0: "", assunto: e.assunto,
      ini: e.ini, fim: e.fim, horas: e.horas, minutos: 0, rel: passo.relato, rascunho: e.rascunho, novo: true
    };
    var m = mapasDeRel(e.turma, s.rel);
    s.pres = m.pres; s.atv = m.atv;
    st = s;
    if (salvarJa) return salvarEditor(); // "Salvar diário" da revisão
    desenharEditor();
  }

  // ── editor completo ───────────────────────────────────────────
  function abrirEdicao(t, id) {
    var d = estado.diarios.filter(function (x) { return x.id === id && !x.excluido; })[0];
    var base;
    if (d) {
      base = JSON.parse(JSON.stringify(d));
      var m = mapasDeRel(t, base.rel);
      // Cliques manuais posteriores ao salvamento valem no editor.
      alunosDe(t).forEach(function (a) {
        var p = A.estadoPresenca(id, a.n, t), at = A.estadoAtividade(id, a.n);
        m.pres[a.n] = p; m.atv[a.n] = at;
      });
      base.pres = m.pres; base.atv = m.atv;
    } else {
      var card = cardPorId(id);
      if (!card) return window.alert("Não encontrei este diário para editar.");
      base = extrairDoCard(t, id, card);
    }
    base.turma = t; base.dateKey0 = base.dateKey; base.discNome0 = base.discNome; base.novo = false;
    if (!base.rel.atividade) base.rel.atividade = relVazio().atividade;
    if (!base.rel.lembrete) base.rel.lembrete = { titulo: "", texto: "" };
    if (!base.rel.analise) base.rel.analise = { resumo: "", itens: [], sugestao: "" };
    st = base;
    desenharEditor();
  }

  var ROT_PRES = { pr: "Presente", fa: "Falta", fj: "Falta justificada", nm: "Sem informação" };
  var ROT_ATV = { au: "Automático", fz: "Fez", nf: "Não fez" };
  function optsSel(mapa, atual, chaves) {
    return chaves.map(function (k) { return '<option value="' + k + '"' + (k === atual ? " selected" : "") + ">" + mapa[k] + "</option>"; }).join("");
  }
  function chipsAlunos(t, marcados, attr) {
    return alunosDe(t).map(function (a) {
      return '<label><input type="checkbox" ' + attr + ' value="' + a.n + '"' + (marcados.indexOf(a.n) >= 0 ? " checked" : "") + "> " + a.n + ". " + esc(a.nm) + "</label>";
    }).join("");
  }
  function desenharEditor() {
    var t = st.turma, r = st.rel, novo = st.novo;
    var chavesPres = A.presencaNeutra ? ["pr", "fa", "fj", "nm"] : ["pr", "fa", "fj"];
    var temHoras = A.comHoras;
    var html =
      '<div class="nd-tit">' + (novo ? "✏️ Novo Diário" : "✏️ Editar diário") + " — " + esc(A.rotulo(t)) + "</div>" +
      '<div class="nd-sub">' + (st.estatico ? "Este diário veio do HTML da página; ao salvar, a versão editada passa a valer no lugar dele." : "Altere qualquer informação e salve. Tudo se atualiza no Contador, presença e relatórios.") + "</div>" +
      '<div class="nd-msgbox"></div>' +
      '<details class="nd-sec" open><summary>📅 Aula</summary><div class="nd-grid">' +
      '<div class="nd-f"><label for="nd-data">Data</label><input type="date" id="nd-data" value="' + esc(st.dateKey) + '"></div>' +
      '<div class="nd-f"><label for="nd-disc">Disciplina</label><select id="nd-disc">' + opcoesDisc(t, st.discNome) + "</select></div>" +
      '<div class="nd-f full"><label for="nd-assunto">Assunto</label><input type="text" id="nd-assunto" maxlength="160" value="' + esc(st.assunto) + '"></div>' +
      '<div class="nd-f"><label for="nd-ini">Início</label><input type="time" id="nd-ini" value="' + esc(st.ini) + '"></div>' +
      '<div class="nd-f"><label for="nd-fim">Fim</label><input type="time" id="nd-fim" value="' + esc(st.fim) + '"></div>' +
      (temHoras ? '<div class="nd-f"><label for="nd-horas">H/aula (conta no Contador)</label><input type="number" id="nd-horas" min="1" max="6" value="' + esc(st.horas || "") + '"></div>' : "") +
      "</div></details>" +
      '<details class="nd-sec" open><summary>📖 Conteúdo</summary>' +
      '<div class="nd-f"><label for="nd-cont">Texto do relato</label><textarea id="nd-cont">' + esc(r.conteudo || "") + "</textarea></div>" +
      '<div class="nd-grid"><div class="nd-f"><label for="nd-lem-t">Lembrete — título (opcional)</label><input type="text" id="nd-lem-t" value="' + esc(r.lembrete.titulo || "") + '"></div>' +
      '<div class="nd-f"><label for="nd-lem-x">Lembrete — texto</label><input type="text" id="nd-lem-x" value="' + esc(r.lembrete.texto || "") + '"></div></div></details>' +
      '<details class="nd-sec"><summary>👥 Presença por aluno</summary><div class="nd-acts" style="margin:0 0 8px"><button type="button" class="nd-mini" data-nd="todos-pr">Marcar todos presentes</button></div><div class="nd-pres">' +
      alunosDe(t).map(function (a) {
        return '<label class="nd-pr"><span>' + a.n + ". " + esc(a.nm) + '</span><select data-pres="' + a.n + '">' + optsSel(ROT_PRES, st.pres[a.n] || "pr", chavesPres) + "</select></label>";
      }).join("") + "</div></details>" +
      '<details class="nd-sec"' + (r.comportamento.length ? " open" : "") + "><summary>🔎 Comportamento (" + r.comportamento.length + ")</summary>" +
      r.comportamento.map(function (c, i) {
        return '<div class="nd-item" data-c="' + i + '"><div class="nd-line"><select data-f="tipo">' +
          optsSel({ advertencia: "⚠️ Advertência", grave: "🚨 Grave", destaque: "✅ Destaque positivo" }, c.tipo, ["advertencia", "grave", "destaque"]) +
          '</select><button type="button" class="nd-x" data-rm="c:' + i + '" title="Remover">✕</button></div>' +
          '<details class="nd-alu"><summary>' + (c.alunos.length || 0) + " aluno(s) envolvido(s)</summary><div class=\"nd-chk\">" + chipsAlunos(t, c.alunos, 'data-f="al"') + "</div></details>" +
          (c.extra ? '<input type="text" data-f="extra" placeholder="Outros nomes" value="' + esc(c.extra) + '">' : '<input type="hidden" data-f="extra" value="">') +
          '<input type="text" data-f="texto" placeholder="O que aconteceu" value="' + esc(c.texto) + '"><input type="hidden" data-f="icone" value="' + esc(c.icone || "") + '"></div>';
      }).join("") + '<button type="button" class="nd-mini" data-nd="add-c">+ Adicionar ocorrência</button></details>' +
      '<details class="nd-sec"' + (r.atividade.houve ? " open" : "") + "><summary>📝 Atividade</summary>" +
      '<label class="nd-pr" style="margin-bottom:8px"><input type="checkbox" id="nd-atv-houve"' + (r.atividade.houve ? " checked" : "") + "> <span>Houve atividade nesta aula</span></label>" +
      '<div class="nd-grid"><div class="nd-f"><label for="nd-atv-t">Título</label><input type="text" id="nd-atv-t" value="' + esc(r.atividade.titulo || "") + '"></div>' +
      '<div class="nd-f"><label for="nd-atv-d">Descrição</label><input type="text" id="nd-atv-d" value="' + esc(r.atividade.descricao || "") + '"></div></div>' +
      '<div class="nd-pres">' + alunosDe(t).map(function (a) {
        return '<label class="nd-pr"><span>' + a.n + ". " + esc(a.nm) + '</span><select data-atv="' + a.n + '">' + optsSel(ROT_ATV, st.atv[a.n] || "au", ["au", "fz", "nf"]) + "</select></label>";
      }).join("") + "</div></details>" +
      '<details class="nd-sec"' + ((r.analise.itens.length || r.analiseHtml) ? " open" : "") + "><summary>✦ Análise IA</summary>" +
      (r.analiseHtml ? '<label class="nd-pr" style="margin-bottom:8px"><input type="checkbox" id="nd-mant" checked> <span>Manter a análise original do diário (' + esc(textoDoNo(new DOMParser().parseFromString(r.analiseHtml, "text/html").body).slice(0, 90)) + "…)</span></label>" : "") +
      '<div class="nd-f"><label for="nd-an-r">Resumo da situação</label><input type="text" id="nd-an-r" value="' + esc(r.analise.resumo || "") + '"></div>' +
      r.analise.itens.map(function (it, i) {
        return '<div class="nd-item" data-i="' + i + '"><div class="nd-line"><strong style="font-size:.8rem;flex:1">Item ' + (i + 1) + '</strong><button type="button" class="nd-x" data-rm="i:' + i + '" title="Remover">✕</button></div>' +
          '<details class="nd-alu"><summary>' + (it.alunos.length || 0) + ' aluno(s)</summary><div class="nd-chk">' + chipsAlunos(t, it.alunos, 'data-f="al"') + "</div></details>" +
          '<input type="text" data-f="rotulo" placeholder="Ex.: 1ª advertência — conversa" value="' + esc(it.rotulo) + '"><input type="text" data-f="rec" placeholder="Recomendação" value="' + esc(it.recomendacao) + '"></div>';
      }).join("") + '<button type="button" class="nd-mini" data-nd="add-i">+ Adicionar item</button>' +
      '<div class="nd-f" style="margin-top:10px"><label for="nd-an-s">Sugestão pedagógica</label><input type="text" id="nd-an-s" value="' + esc(r.analise.sugestao || "") + '"></div></details>' +
      '<details class="nd-sec"><summary>🤖 Rascunho e IA</summary><div class="nd-f"><label for="nd-rasc">Rascunho livre</label><textarea id="nd-rasc" placeholder="Cole ou escreva o rascunho e peça para a IA reorganizar o diário.">' + esc(st.rascunho || "") + '</textarea></div>' +
      '<button type="button" class="nd-mini" data-nd="ia">🤖 Preencher os campos com a IA (substitui conteúdo, faltas, comportamento, atividade e análise)</button></details>' +
      '<div class="nd-acts">' +
      '<button type="button" class="nd-b sec" data-nd="cancelar">Cancelar</button>' +
      (!novo ? '<button type="button" class="nd-b perigo" data-nd="excluir">🗑️ Excluir</button>' : "") +
      (!novo && st.origem && estado.diarios.some(function (x) { return x.id === st.id && x.origem; }) ? '<button type="button" class="nd-b sec" data-nd="restaurar">↩ Restaurar original</button>' : "") +
      '<button type="button" class="nd-b pri" data-nd="salvar">💾 Salvar</button></div>';
    abrirCasca(html, true);
    modal.querySelectorAll("[data-nd]").forEach(function (b) { b.addEventListener("click", function () { acaoEditor(b.getAttribute("data-nd")); }); });
    modal.querySelectorAll("[data-rm]").forEach(function (b) { b.addEventListener("click", function () { removerLinha(b.getAttribute("data-rm")); }); });
    var ini = $("#nd-ini"), fim = $("#nd-fim"), horas = $("#nd-horas");
    if (horas) {
      var manual = true;
      ini.addEventListener("input", function () { if (!manual) horas.value = horasDoIntervalo(ini.value, fim.value) || ""; });
      fim.addEventListener("input", function () { if (!manual) horas.value = horasDoIntervalo(ini.value, fim.value) || ""; });
      horas.addEventListener("input", function () { manual = true; });
    }
  }

  // Lê o formulário para o rascunho `st`.
  function capturar() {
    var v = function (id) { var e = $("#" + id); return e ? e.value : ""; };
    st.dateKey = v("nd-data"); st.discNome = v("nd-disc"); st.assunto = v("nd-assunto").trim();
    st.ini = v("nd-ini"); st.fim = v("nd-fim");
    if (A.comHoras) st.horas = parseInt(v("nd-horas"), 10) || 0;
    var r = st.rel;
    r.conteudo = v("nd-cont").trim();
    r.lembrete = { titulo: v("nd-lem-t").trim(), texto: v("nd-lem-x").trim() };
    st.rascunho = v("nd-rasc").trim();
    modal.querySelectorAll("[data-pres]").forEach(function (s) { st.pres[s.getAttribute("data-pres")] = s.value; });
    modal.querySelectorAll("[data-atv]").forEach(function (s) { st.atv[s.getAttribute("data-atv")] = s.value; });
    r.atividade.houve = !!($("#nd-atv-houve") || {}).checked;
    r.atividade.titulo = v("nd-atv-t").trim(); r.atividade.descricao = v("nd-atv-d").trim();
    var lerNums = function (bloco) {
      return Array.prototype.map.call(bloco.querySelectorAll('input[data-f="al"]:checked'), function (c) { return parseInt(c.value, 10); });
    };
    r.comportamento = Array.prototype.map.call(modal.querySelectorAll("[data-c]"), function (b) {
      var f = function (n) { return (b.querySelector('[data-f="' + n + '"]') || {}).value || ""; };
      return { alunos: lerNums(b), extra: f("extra").trim(), tipo: f("tipo") || "advertencia", texto: f("texto").trim(), icone: f("icone") };
    });
    r.analise.resumo = v("nd-an-r").trim(); r.analise.sugestao = v("nd-an-s").trim();
    r.analise.itens = Array.prototype.map.call(modal.querySelectorAll("[data-i]"), function (b) {
      var f = function (n) { return (b.querySelector('[data-f="' + n + '"]') || {}).value || ""; };
      return { alunos: lerNums(b), rotulo: f("rotulo").trim(), recomendacao: f("rec").trim() };
    });
    var mant = $("#nd-mant");
    if (mant && !mant.checked) delete r.analiseHtml;
  }
  function removerLinha(cod) {
    capturar();
    var p = cod.split(":"), i = parseInt(p[1], 10);
    if (p[0] === "c") st.rel.comportamento.splice(i, 1); else st.rel.analise.itens.splice(i, 1);
    desenharEditor();
  }
  async function acaoEditor(acao) {
    if (acao === "cancelar") return fecharModal();
    if (acao === "todos-pr") { modal.querySelectorAll("[data-pres]").forEach(function (s) { s.value = "pr"; }); return; }
    if (acao === "add-c") { capturar(); st.rel.comportamento.push({ alunos: [], extra: "", tipo: "advertencia", texto: "" }); return desenharEditor(); }
    if (acao === "add-i") { capturar(); st.rel.analise.itens.push({ alunos: [], rotulo: "", recomendacao: "" }); return desenharEditor(); }
    if (acao === "salvar") return salvarEditor();
    if (acao === "excluir") return excluirDiario();
    if (acao === "restaurar") return restaurarOriginal();
    if (acao === "ia") return preencherComIA();
  }
  async function preencherComIA() {
    capturar();
    if (!st.rascunho) return mostrarMsg("Escreva o rascunho antes de pedir a organização pela IA.");
    var v = validarCampos(Object.assign({ estatico: true }, st));
    if (v && /data|disciplina|assunto/i.test(v)) return mostrarMsg(v);
    if (!window.confirm("A IA vai substituir conteúdo, faltas, comportamento, atividade e análise pelos dados do rascunho. Continuar?")) return;
    var botao = $('[data-nd="ia"]'); botao.disabled = true; botao.textContent = "🤖 Organizando…";
    try {
      var r = await organizarComIA(st);
      var rel = normalizarRelato(r.relato, st.turma);
      rel.presencaNI = false;
      if (st.rel.analiseHtml) delete st.rel.analiseHtml;
      st.rel = Object.assign(st.rel, rel, { conteudoCompleto: false });
      var m = mapasDeRel(st.turma, st.rel);
      st.pres = m.pres; st.atv = m.atv;
      desenharEditor();
      mostrarMsg(r.relato.aviso ? "⚠️ " + trocarCodigos(r.relato.aviso, st.turma) : "Campos preenchidos pela IA. Confira e salve.", "warn");
    } catch (erro) {
      botao.disabled = false; botao.textContent = "🤖 Preencher os campos com a IA";
      mostrarMsg(String((erro && erro.message) || erro));
    }
  }

  async function salvarEditor() {
    if (modal && $("#nd-data")) capturar();
    var v = validarCampos(st);
    if (v) { if (modal) mostrarMsg(v); return; }
    var rel = relDeMapas(st);
    if (!rel.atividade.houve) { rel.atividade.fez = []; rel.atividade.naoFez = []; }
    var idAntigo = st.id;
    var id = idAntigo && A.mesmoId(st) ? idAntigo : A.novoId(st.turma, st.dateKey, st.discNome, idAntigo);
    if (!id) return mostrarMsg("Já existem registros demais nesta data para esta turma. Exclua um antes de criar outro.");
    if (A.comHoras === false) st.minutos = minutosDoIntervalo(st.ini, st.fim) || st.minutos || 0;
    var existente = estado.diarios.filter(function (d) { return d.id === idAntigo; })[0];
    var t = agora();
    var d = {
      id: id, turma: st.turma, dateKey: st.dateKey, disc: A.codigoDisc(st.discNome), discNome: st.discNome, assunto: st.assunto,
      ini: st.ini, fim: st.fim, horas: st.horas, minutos: st.minutos || 0, rel: rel, rascunho: st.rascunho || "",
      criadoEm: (existente && existente.criadoEm) || t, atualizadoEm: t
    };
    var origem = (existente && existente.origem) || st.origem;
    if (origem) d.origem = origem;
    if (idAntigo && idAntigo !== id) removerDiario(idAntigo);
    estado.removidos = estado.removidos.filter(function (r) { return r.id !== id; });
    estado.diarios = estado.diarios.filter(function (x) { return x.id !== id; });
    estado.diarios.push(d);
    // Tira o tombstone de "excluído" do original, se houver (o diário voltou).
    if (origem) estado.diarios = estado.diarios.filter(function (x) { return x.id !== "del:" + origem; });
    // O formulário é a fonte da verdade: cliques manuais antigos deste diário saem.
    [idAntigo, id, origem].forEach(function (x) { if (x) tentar(function () { A.limparCliques(x); }); });
    fecharModal();
    await persistir();
    var card = document.querySelector('[data-novo-diario="' + id + '"]');
    if (card) {
      var cab = card.querySelector(".eh"), corpo = card.querySelector(".ec2");
      if (corpo && !corpo.classList.contains("on") && typeof tog === "function") tog(cab);
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  async function excluirDiario() {
    if (!window.confirm("Excluir este diário? Presença, atividades e h/aula dele saem do sistema.")) return;
    var id = st.id, origem = (estado.diarios.filter(function (d) { return d.id === id; })[0] || {}).origem || st.origem;
    if (id) removerDiario(id);
    if (origem) {
      estado.diarios = estado.diarios.filter(function (d) { return d.id !== "del:" + origem; });
      estado.diarios.push({ id: "del:" + origem, turma: st.turma, origem: origem, excluido: true, dateKey: st.dateKey0 || st.dateKey, atualizadoEm: agora() });
    }
    tentar(function () { A.limparCliques(id); });
    fecharModal();
    await persistir();
  }
  async function restaurarOriginal() {
    if (!window.confirm("Descartar a edição e voltar ao diário original do HTML?")) return;
    var id = st.id;
    removerDiario(id);
    removerDiario("del:" + (st.origem || id));
    tentar(function () { A.limparCliques(id); });
    fecharModal();
    await persistir();
  }

  // ── API pública e inicialização ───────────────────────────────
  window.novoDiarioAbrir = function (t) {
    if (!A || A.turmas.indexOf(t) < 0) return;
    abrirNovo(t, null);
  };
  window.novoDiarioEditar = function (t, id) { if (A) abrirEdicao(t, id); };

  function iniciar() {
    if (typeof ALUNOS_RH !== "undefined" && typeof PRESENCA_RH !== "undefined") A = adaptadorHerminio();
    else if (typeof ALUNOS !== "undefined" && typeof PRESENCA !== "undefined") A = adaptadorCasavequia();
    if (!A) return;
    injetarEstilo();
    estado = lerLocal();
    if (estado.diarios.length) renderTodos(); else decorar();
    window.setTimeout(decorar, 600);
    window.setTimeout(decorar, 2500);
    iniciarSync();
  }
  if (document.readyState === "complete") iniciar();
  else {
    document.addEventListener("DOMContentLoaded", iniciar);
    window.addEventListener("load", function () { if (!A) iniciar(); });
  }
  // O editor de layout pode trocar o conteúdo da página inteira; reinsere os diários.
  document.addEventListener("relatorios:editor-layout-restored", function () { if (A) renderTodos(); });
})();
