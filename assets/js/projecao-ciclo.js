/*
 * Motor das projeções por ciclo de estudos (rodízio de turmas e disciplinas).
 * Recebe o estado das projeções (turmas, disciplinas com metas/lançadas/totais,
 * data-base, feriados, recesso) e state.ciclo (ver herminio-ciclo.js).
 * Usado pelo Contador da Hermínio e por planejamento-aulas-2026.html.
 */
(function (root) {
  'use strict';

  var ANO_INICIAL = 2026;
  var ANO_LIMITE = 2027;

  function pad(n) { return String(n).padStart(2, '0'); }
  function chaveDia(data) { return data.getFullYear() + '-' + pad(data.getMonth() + 1) + '-' + pad(data.getDate()); }
  function inteiro(valor, padrao) {
    var n = parseInt(valor, 10);
    return Number.isFinite(n) ? n : padrao;
  }

  // Dias de 2026 a 2027; letivo = segunda a sexta fora de recesso e feriado.
  // Sábado livre (sem feriado nem recesso) só recebe aula da grade editada à mão.
  function construirDias(state) {
    var feriados = {};
    (state.feriados || []).forEach(function (item) {
      if (item && item.date && !(item.tipo === 'facultativo' && state.facultativoLetivo)) feriados[item.date] = true;
    });
    var recesso = state.recesso || {};
    var dias = [];
    var cursor = new Date(ANO_INICIAL, 0, 1, 12, 0, 0);
    while (cursor.getFullYear() <= ANO_LIMITE) {
      var k = chaveDia(cursor);
      var dow = cursor.getDay();
      var livre = !feriados[k] && !(recesso.start && k >= recesso.start && k <= recesso.end);
      dias.push({ k: k, dow: dow, letivo: dow >= 1 && dow <= 5 && livre, sabado: dow === 6 && livre });
      cursor.setDate(cursor.getDate() + 1);
    }
    return dias;
  }

  function simular(state) {
    var anchor = state.anchorDate;
    var ciclo = state.ciclo || {};
    var concluidas = {};
    (ciclo.concluidas || []).forEach(function (turmaId) { concluidas[turmaId] = true; });
    var turmaNome = {};
    (state.turmas || []).forEach(function (t) { turmaNome[t.id] = t.nome; });
    var discPorId = {};
    (state.disciplinas || []).forEach(function (d) { discPorId[d.id] = d; });

    var porDisc = {};
    (state.disciplinas || []).forEach(function (disc) {
      var nB = disc.nBimestres || 4;
      var turmas = Array.isArray(disc.turmasAtivas) && disc.turmasAtivas.length ? disc.turmasAtivas : Object.keys(disc.lancadas || {});
      turmas.forEach(function (turmaId) {
        var meta = Math.max(1, inteiro((disc.metas || {})[turmaId], 10));
        var launched = Math.max(0, inteiro((disc.lancadas || {})[turmaId], 0));
        var total = Math.max(0, inteiro((disc.totais || {})[turmaId], meta * nB));
        var concluida = !!concluidas[turmaId];
        var cells = {};
        cells[anchor] = { cum: launched, add: 0, extra: 0, closes: [], sync: true };
        porDisc[disc.id + '|' + turmaId] = {
          discId: disc.id, turmaId: turmaId, nBimestres: nB,
          meta: meta, launched: launched, total: total, acc: launched,
          // Minutos extras (15 min por dia de 4h15) que sobraram dos relatos lançados.
          min: Math.max(0, inteiro((disc.minutos || {})[turmaId], 0)),
          alvo: Math.floor(launched / meta) + 1, closes: {},
          concluida: concluida,
          yearEnd: launched >= total || concluida ? anchor : '',
          inicio: '', fim: '', emCiclo: false, semanal: 0, extras: 0, cells: cells
        };
      });
    });
    function pendenteDisc(st) { return !st.concluida && st.acc < st.total; }

    var eventos = {};
    function evento(k, tipo, texto) {
      if (!eventos[k]) eventos[k] = [];
      eventos[k].push({ tipo: tipo, texto: texto });
    }
    function nomeDisc(id) { return (discPorId[id] || {}).nome || id; }

    var dias = construirDias(state);
    var idx = 0;
    while (idx < dias.length && dias[idx].k <= anchor) idx += 1;

    // Prepara as turmas do rodízio: trilhas (dias fixos) e filas de disciplinas.
    var etapas = [];
    var preparadas = [];
    (ciclo.etapas || []).forEach(function (etapa) {
      var turmaId = etapa.turma;
      var trilhas = (etapa.trilhas || []).map(function (trilha) {
        var diasTrilha = trilha.dias || {};
        var semanal = Object.keys(diasTrilha).reduce(function (s, d) { return s + Math.max(0, inteiro(diasTrilha[d], 0)); }, 0);
        var filaTotal = (trilha.fila || []).filter(function (id) { return porDisc[id + '|' + turmaId]; });
        filaTotal.forEach(function (id) {
          var st = porDisc[id + '|' + turmaId];
          st.semanal = semanal;
          if (pendenteDisc(st)) st.emCiclo = true;
        });
        return {
          nome: trilha.nome || '',
          dias: diasTrilha,
          minutosExtras: trilha.minutosExtras || {},
          cedeDias: trilha.cedeDias !== false,
          semanal: semanal,
          filaTotal: filaTotal,
          emprestadaPara: '',
          fila: filaTotal.filter(function (id) { return pendenteDisc(porDisc[id + '|' + turmaId]); })
        };
      });
      var resumo = {
        turma: turmaId,
        turmaNome: turmaNome[turmaId] || turmaId,
        concluida: !!concluidas[turmaId],
        inicio: '', fim: '', emAndamento: false,
        trilhas: trilhas.map(function (t) {
          return { nome: t.nome, dias: t.dias, semanal: t.semanal, disciplinas: t.filaTotal.map(function (id) { return { id: id, nome: nomeDisc(id) }; }) };
        })
      };
      etapas.push(resumo);
      preparadas.push({ turmaId: turmaId, trilhas: trilhas, resumo: resumo, anunciarInicio: true });
    });
    function pendenteEtapa(p) { return p.trilhas.some(function (t) { return t.fila.length; }); }

    // Uma turma por vez. A turma em andamento na data-base não "começa": ela continua.
    var atual = -1;
    var primeiraAtiva = true;
    function proximaEtapa() {
      for (var i = atual + 1; i < preparadas.length; i += 1) {
        var p = preparadas[i];
        if (!pendenteEtapa(p)) continue;
        atual = i;
        var jaIniciada = p.trilhas.some(function (t) {
          return t.filaTotal.some(function (id) { return porDisc[id + '|' + p.turmaId].launched > 0; });
        });
        p.anunciarInicio = !(primeiraAtiva && jaIniciada);
        p.resumo.emAndamento = primeiraAtiva && jaIniciada;
        primeiraAtiva = false;
        return p;
      }
      atual = preparadas.length;
      return null;
    }
    var etapa = proximaEtapa();

    // Trilha sem disciplina cede os dias à disciplina de outra trilha ainda ativa:
    // nenhum horário fica vago enquanto a turma tiver disciplina pendente.
    function filaDoDia(p, trilha, dia) {
      if (trilha && trilha.fila.length) return trilha.fila;
      if (trilha && !trilha.cedeDias) return null;
      var outra = p.trilhas.filter(function (t) { return t !== trilha && t.fila.length; })[0];
      if (!outra) return null;
      if (trilha && trilha.emprestadaPara !== outra.fila[0]) {
        trilha.emprestadaPara = outra.fila[0];
        evento(dia.k, 'disc-inicio', nomeDisc(outra.fila[0]) + ' assume os dias de ' + trilha.nome + ' · ' + p.resumo.turmaNome);
      }
      return outra.fila;
    }
    // Sábado (grade editada à mão): a disciplina da linha, se estiver na vez;
    // senão, a disciplina ativa da turma.
    function filaDoSabado(p, discId) {
      var dona = p.trilhas.filter(function (t) { return t.fila[0] === discId; })[0];
      if (dona) return dona.fila;
      var ativa = p.trilhas.filter(function (t) { return t.fila.length; })[0];
      return ativa ? ativa.fila : null;
    }

    function registrarAula(p, dia, id, horas, extra, comeca) {
      var st = porDisc[id + '|' + p.turmaId];
      var cell = st.cells[dia.k];
      if (!cell || cell.sync) {
        cell = { cum: st.acc, add: 0, extra: 0, closes: [], inicio: false, fim: false };
        st.cells[dia.k] = cell;
      }
      cell.add += horas + extra;
      cell.extra += extra;
      cell.cum = st.acc;
      if (comeca) cell.inicio = true;
      while (st.alvo <= st.nBimestres && st.acc >= st.alvo * st.meta) {
        cell.closes.push(st.alvo);
        st.closes[st.alvo] = dia.k;
        st.alvo += 1;
      }
      if (st.acc >= st.total) cell.fim = true;
    }

    // Consome um horário do dia (blocos de 1 h/aula e, no fim, os minutos extras).
    // Se a disciplina encerra no meio, o restante vai para a próxima; se a turma
    // encerra no meio, o restante já vai para a próxima turma do rodízio.
    function consumirHorario(horario, dia) {
      while (etapa && (horario.blocos > 0 || horario.minutos > 0)) {
        var p = etapa;
        var fila = horario.sabado
          ? filaDoSabado(p, horario.disc)
          : filaDoDia(p, p.trilhas[horario.trilha] || null, dia);
        if (!fila || !fila.length) return;
        var id = fila[0];
        var st = porDisc[id + '|' + p.turmaId];
        if (!p.resumo.inicio) {
          p.resumo.inicio = dia.k;
          if (p.anunciarInicio) evento(dia.k, 'turma-inicio', p.resumo.turmaNome + ' começa o ciclo');
        }
        var comeca = false;
        if (!st.inicio) {
          st.inicio = dia.k;
          comeca = st.acc === 0;
          if (comeca) evento(dia.k, 'disc-inicio', nomeDisc(id) + ' começa · ' + p.resumo.turmaNome);
        }
        var horas = Math.min(horario.blocos, st.total - st.acc);
        horario.blocos -= horas;
        st.acc += horas;
        var extra = 0;
        if (horario.blocos === 0 && horario.minutos > 0) {
          st.min += horario.minutos;
          horario.minutos = 0;
          if (st.min >= 60 && st.acc < st.total) {
            st.min -= 60;
            st.acc += 1;
            st.extras += 1;
            extra = 1;
          }
        }
        registrarAula(p, dia, id, horas, extra, comeca);
        if (st.acc < st.total) return;
        st.yearEnd = dia.k;
        st.fim = dia.k;
        evento(dia.k, 'disc-fim', nomeDisc(id) + ' encerra · ' + p.resumo.turmaNome);
        fila.shift();
        if (!pendenteEtapa(p)) {
          p.resumo.fim = dia.k;
          evento(dia.k, 'turma-fim', p.resumo.turmaNome + ' encerra o ciclo');
          etapa = proximaEtapa();
        }
      }
    }

    while (etapa && idx < dias.length) {
      var dia = dias[idx];
      idx += 1;
      var horarios = [];
      if (dia.letivo) {
        // Os horários do dia seguem as trilhas da turma que abre o dia.
        etapa.trilhas.forEach(function (trilha, i) {
          var blocos = Math.max(0, inteiro(trilha.dias[dia.dow], 0));
          if (blocos) horarios.push({ trilha: i, blocos: blocos, minutos: Math.max(0, inteiro(trilha.minutosExtras[dia.dow], 0)) });
        });
      } else if (dia.sabado) {
        (state.disciplinas || []).forEach(function (disc) {
          var blocos = Math.max(0, inteiro((((disc.grade || {})[etapa.turmaId]) || {})[6], 0));
          if (blocos) horarios.push({ sabado: true, disc: disc.id, blocos: blocos, minutos: 0 });
        });
      }
      horarios.forEach(function (horario) { consumirHorario(horario, dia); });
    }

    // Datas de cada disciplina no quadro do ciclo.
    etapas.forEach(function (resumo) {
      resumo.trilhas.forEach(function (trilha) {
        trilha.disciplinas.forEach(function (item) {
          var st = porDisc[item.id + '|' + resumo.turma];
          item.inicio = st.inicio;
          item.fim = st.fim;
          item.concluida = st.launched >= st.total || st.concluida;
          item.launched = st.launched;
          item.total = st.total;
        });
      });
    });

    if (ciclo.fimAnoLetivo) evento(ciclo.fimAnoLetivo, 'ano-fim', 'Término do ano letivo');

    return { porDisc: porDisc, eventos: eventos, etapas: etapas, fimAnoLetivo: ciclo.fimAnoLetivo || '', concluidas: concluidas };
  }

  // Ajustes do professor nas horas de cada dia (21/09/2026). Chave "turma|n"
  // (n = posição da trilha na etapa da turma) → {dia da semana: h/aula}.
  // Mudam os dias da trilha inteira: valem para toda a fila dela.
  function trilhaDe(ciclo, discId, turmaId) {
    var achada = null;
    ((ciclo && ciclo.etapas) || []).forEach(function (etapa) {
      if (etapa.turma !== turmaId) return;
      (etapa.trilhas || []).forEach(function (trilha, i) {
        if (!achada && (trilha.fila || []).indexOf(discId) >= 0) achada = { chave: turmaId + '|' + i, trilha: trilha };
      });
    });
    return achada;
  }
  function aplicarAjustes(ciclo, ajustes) {
    if (!ciclo || !ajustes) return ciclo;
    (ciclo.etapas || []).forEach(function (etapa) {
      (etapa.trilhas || []).forEach(function (trilha, i) {
        var aj = ajustes[etapa.turma + '|' + i];
        if (!aj) return;
        var dias = Object.assign({}, trilha.dias || {});
        Object.keys(aj).forEach(function (d) {
          var v = Math.max(0, inteiro(aj[d], 0));
          if (v) dias[d] = v; else delete dias[d];
        });
        trilha.dias = dias;
      });
    });
    return ciclo;
  }

  root.ProjecaoCiclo = { construirDias: construirDias, simular: simular, trilhaDe: trilhaDe, aplicarAjustes: aplicarAjustes };
})(window);
