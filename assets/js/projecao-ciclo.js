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
      var letivo = dow >= 1 && dow <= 5 && !feriados[k] && !(recesso.start && k >= recesso.start && k <= recesso.end);
      dias.push({ k: k, dow: dow, letivo: letivo });
      cursor.setDate(cursor.getDate() + 1);
    }
    return dias;
  }

  function simular(state) {
    var anchor = state.anchorDate;
    var ciclo = state.ciclo || {};
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
        var cells = {};
        cells[anchor] = { cum: launched, add: 0, closes: [], sync: true };
        porDisc[disc.id + '|' + turmaId] = {
          discId: disc.id, turmaId: turmaId, nBimestres: nB,
          meta: meta, launched: launched, total: total, acc: launched,
          alvo: Math.floor(launched / meta) + 1, closes: {},
          yearEnd: launched >= total ? anchor : '',
          inicio: '', fim: '', emCiclo: false, semanal: 0, cells: cells
        };
      });
    });

    var eventos = {};
    function evento(k, tipo, texto) {
      if (!eventos[k]) eventos[k] = [];
      eventos[k].push({ tipo: tipo, texto: texto });
    }
    function nomeDisc(id) { return (discPorId[id] || {}).nome || id; }

    var dias = construirDias(state);
    var idx = 0;
    while (idx < dias.length && dias[idx].k <= anchor) idx += 1;

    var etapas = [];
    var primeiraAtiva = true;
    (ciclo.etapas || []).forEach(function (etapa) {
      var turmaId = etapa.turma;
      var trilhas = (etapa.trilhas || []).map(function (trilha) {
        var diasTrilha = trilha.dias || {};
        var semanal = Object.keys(diasTrilha).reduce(function (s, d) { return s + Math.max(0, inteiro(diasTrilha[d], 0)); }, 0);
        var filaTotal = (trilha.fila || []).filter(function (id) { return porDisc[id + '|' + turmaId]; });
        filaTotal.forEach(function (id) {
          var st = porDisc[id + '|' + turmaId];
          st.semanal = semanal;
          if (st.acc < st.total) st.emCiclo = true;
        });
        return {
          nome: trilha.nome || '',
          dias: diasTrilha,
          semanal: semanal,
          filaTotal: filaTotal,
          fila: semanal > 0 ? filaTotal.filter(function (id) { var st = porDisc[id + '|' + turmaId]; return st.acc < st.total; }) : []
        };
      });
      var resumo = {
        turma: turmaId,
        turmaNome: turmaNome[turmaId] || turmaId,
        inicio: '', fim: '', emAndamento: false,
        trilhas: trilhas.map(function (t) {
          return { nome: t.nome, dias: t.dias, semanal: t.semanal, disciplinas: t.filaTotal.map(function (id) { return { id: id, nome: nomeDisc(id) }; }) };
        })
      };
      etapas.push(resumo);
      var pendente = function () { return trilhas.some(function (t) { return t.fila.length; }); };
      if (!pendente()) return;

      // A turma em andamento na data-base não "começa": ela continua.
      var jaIniciada = trilhas.some(function (t) {
        return t.filaTotal.some(function (id) { return porDisc[id + '|' + turmaId].launched > 0; });
      });
      var anunciarInicio = !(primeiraAtiva && jaIniciada);
      resumo.emAndamento = primeiraAtiva && jaIniciada;
      primeiraAtiva = false;
      var ultimoDia = '';

      while (pendente() && idx < dias.length) {
        var dia = dias[idx];
        idx += 1;
        if (!dia.letivo) continue;
        trilhas.forEach(function (trilha) {
          if (!trilha.fila.length) return;
          var horas = Math.max(0, inteiro(trilha.dias[dia.dow], 0));
          if (!horas) return;
          var id = trilha.fila[0];
          var st = porDisc[id + '|' + turmaId];
          if (!resumo.inicio) {
            resumo.inicio = dia.k;
            if (anunciarInicio) evento(dia.k, 'turma-inicio', resumo.turmaNome + ' começa o ciclo');
          }
          var comeca = false;
          if (!st.inicio) {
            st.inicio = dia.k;
            comeca = st.acc === 0;
            if (comeca) evento(dia.k, 'disc-inicio', nomeDisc(id) + ' começa · ' + resumo.turmaNome);
          }
          var add = Math.min(horas, st.total - st.acc);
          st.acc += add;
          var cell = { cum: st.acc, add: add, closes: [], inicio: comeca, fim: st.acc >= st.total };
          while (st.alvo <= st.nBimestres && st.acc >= st.alvo * st.meta) {
            cell.closes.push(st.alvo);
            st.closes[st.alvo] = dia.k;
            st.alvo += 1;
          }
          st.cells[dia.k] = cell;
          ultimoDia = dia.k;
          if (st.acc >= st.total) {
            st.yearEnd = dia.k;
            st.fim = dia.k;
            evento(dia.k, 'disc-fim', nomeDisc(id) + ' encerra · ' + resumo.turmaNome);
            trilha.fila.shift();
          }
        });
      }
      if (!pendente() && ultimoDia) {
        resumo.fim = ultimoDia;
        evento(ultimoDia, 'turma-fim', resumo.turmaNome + ' encerra o ciclo');
      }
    });

    // Datas de cada disciplina no quadro do ciclo.
    etapas.forEach(function (resumo) {
      resumo.trilhas.forEach(function (trilha) {
        trilha.disciplinas.forEach(function (item) {
          var st = porDisc[item.id + '|' + resumo.turma];
          item.inicio = st.inicio;
          item.fim = st.fim;
          item.concluida = st.launched >= st.total;
          item.launched = st.launched;
          item.total = st.total;
        });
      });
    });

    if (ciclo.fimAnoLetivo) evento(ciclo.fimAnoLetivo, 'ano-fim', 'Término do ano letivo');

    return { porDisc: porDisc, eventos: eventos, etapas: etapas, fimAnoLetivo: ciclo.fimAnoLetivo || '' };
  }

  root.ProjecaoCiclo = { construirDias: construirDias, simular: simular };
})(window);
