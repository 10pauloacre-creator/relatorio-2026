// ═══════════════════════════════════════════════════════════════════════════
// RELATORIO-INDIVIDUAL.JS — Relatório Individual Anual do Aluno
// ───────────────────────────────────────────────────────────────────────────
// Monta o documento do modelo do professor
// (docs/modelo_relatorio_individual_anual_aluno.html) já preenchido com os
// dados do banco (RPC relatorio_individual): identificação, notas por
// bimestre, relatório de provas, atividades feitas e observações de
// comportamento, com cabeçalho oficial e assinatura.
//
// Usado pelo painel do professor (Relatório 2026) E pelo perfil do aluno
// (Biblioteca Digital). Os dois repositórios têm uma cópia IDÊNTICA deste
// arquivo (`node scripts/check-copias-compartilhadas.js`), e os dois abrem o
// MESMO documento: o que o professor imprime é o que o aluno baixa.
//
// O documento abre numa janela própria com o botão "Imprimir / Salvar PDF",
// que chama a tela de impressão do navegador (lá o aluno escolhe "Salvar como
// PDF"). Padrão de documento: A4, margens de 15 mm, Times New Roman 12pt.
//
// O relatório é sempre ANUAL e se atualiza sozinho: cada novo relato, prova
// ou observação lançada entra na próxima vez que o documento for aberto.
//
// Relatório de provas = o mesmo resultado que o aluno vê ao terminar a prova
// no livro (prova-report.js), em versão compacta para papel.
// Comportamento desconta nota (Etapa 8B): leve 0,25 · médio 0,5 · grave 1,0 ·
// muito grave 2,0, na nota do bimestre da disciplina, até 2,0 por bimestre.
//
// Depende de window.BoletimRegras (motor das notas).
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  var VERSAO = "2026-09-19a";
  var PONTOS_CONDUTA = { leve: 0.25, medio: 0.5, grave: 1, muito_grave: 2 };
  var BIMESTRES = ["1", "2", "3", "4"];
  var PROFESSOR = "Paulo Roberto Ramalho Magalhães";

  var ROTULO_PRESENCA = { presente: "Presente", falta: "Falta", falta_justificada: "Falta justificada" };
  var ROTULO_GRAVIDADE = { leve: "Leve", medio: "Médio", grave: "Grave", muito_grave: "Muito grave" };
  var ROTULO_PAPEL = { vitima: "Vítima (sem infração)", testemunha: "Testemunha", envolvido: "Envolvido", destaque: "Destaque positivo" };

  function numero(valor, casas) {
    if (valor === null || valor === undefined || valor === "") return "—";
    var n = Number(valor);
    if (!isFinite(n)) return "—";
    return n.toFixed(casas === undefined ? 1 : casas).replace(".", ",");
  }

  function dataBr(iso) {
    var partes = String(iso || "").slice(0, 10).split("-");
    return partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : "";
  }

  function esc(valor) {
    return String(valor === null || valor === undefined ? "" : valor)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function carregar(client, opcoes) {
    return client.rpc("relatorio_individual", {
      p_aluno_id: opcoes.alunoId,
      p_bimestre: opcoes.bimestre || null,
      p_session_token: opcoes.sessionToken || null
    }).then(function (resposta) {
      if (resposta.error) throw new Error(resposta.error.message || "Falha ao carregar o relatório.");
      return resposta.data;
    });
  }

  function calcularDisciplina(boletim, disciplina) {
    var regras = boletim.regras || {};
    return root.BoletimRegras.calcular({
      bimestresAutomaticos: regras.bimestresAutomaticos || [],
      recuperacaoSemestral: !!regras.recuperacaoSemestral,
      bonusPoder: !!regras.bonusPoder,
      descontoConduta: !!regras.descontoConduta,
      pontosPoder: boletim.pontosPoder,
      bimestres: disciplina.bimestres,
      recuperacao: disciplina.recuperacao
    });
  }

  /** Data do registro mais recente: é o que "atualiza" o relatório. */
  function ultimaAtualizacao(dados) {
    var datas = [];
    (dados.aulas || []).forEach(function (a) { if (a.data) datas.push(String(a.data).slice(0, 10)); });
    (dados.ocorrencias || []).forEach(function (o) { if (o.data) datas.push(String(o.data).slice(0, 10)); });
    datas.sort();
    return datas.length ? dataBr(datas[datas.length - 1]) : dataBr(dados.geradoEm);
  }

  // ── Seções do modelo ──────────────────────────────────────────────────
  function tabelaNotas(calc) {
    var linhas = BIMESTRES.map(function (b) {
      var r = calc.bimestres[b];
      var nota = r.notaFinal !== null ? numero(r.notaFinal) : (r.notaParcial !== null ? numero(r.notaParcial) + " (parcial)" : "—");
      var desconto = r.descontoConduta ? "−" + numero(r.descontoConduta, 2) : "—";
      return "<tr><td><strong>" + b + "º Bimestre</strong></td><td>" + numero(r.prova) + "</td><td>" + numero(r.trabalho)
        + "</td><td>" + desconto + "</td><td>" + nota + "</td></tr>";
    }).join("");
    return '<table class="notas">'
      + "<tr><th>Bimestre</th><th>Prova</th><th>Trabalhos</th><th>Comportamento</th><th>Nota do bimestre</th></tr>"
      + linhas + "</table>";
  }

  function notaRodapeNotas(calc, disciplina) {
    var partes = ["Nota do bimestre = média entre prova e trabalhos (0 a 10), menos o desconto por comportamento"
      + " (leve 0,25 · médio 0,5 · grave 1,0 · muito grave 2,0, até 2,0 por bimestre)."];
    if (calc.mediaAnual !== null) {
      partes.push("Média dos bimestres lançados: " + numero(calc.mediaAnual) + ".");
    }
    if (calc.poder && calc.poder.bonusMedia > 0) {
      partes.push("Ranking de Poder: " + calc.poder.nome + " (" + calc.poder.pontos + " pontos) soma +"
        + numero(calc.poder.bonusMedia, 2) + " na média final, que fica em " + numero(calc.mediaFinal) + ".");
    }
    BIMESTRES.forEach(function (b) {
      var r = calc.bimestres[b];
      if (r.recuperado) {
        partes.push(b + "º bimestre recuperado: nota anterior " + numero(r.nota) + ", passou a valer " + numero(r.notaFinal) + ".");
      }
    });
    ["1", "2"].forEach(function (s) {
      var info = calc.semestres[s];
      if (!info || !info.precisaRecuperacao) return;
      partes.push("Recuperação semestral do " + s + "º semestre: "
        + (info.notaRecuperacao === null ? "pendente" : numero(info.notaRecuperacao) + "/10")
        + " — " + root.BoletimRegras.rotuloSituacao(info.situacao) + ".");
    });
    return partes.join(" ");
  }

  function minutos(segundos) {
    var s = Number(segundos) || 0;
    if (!s) return "";
    var m = Math.round(s / 60);
    return m < 1 ? "menos de 1 min" : m + " min";
  }

  // Mesma tela "Resultado da Avaliação" que o aluno vê ao terminar a prova no
  // livro (prova-report.js), no tema claro: cabeçalho, anel da nota, cartões,
  // legenda, grade de questões, desempenho e desempenho por habilidade.
  var IC = {
    award: '<path d="M12 2v4M5.6 5.6l2.9 2.9M2 12h4M18.4 5.6l-2.9 2.9M22 12h-4"/><circle cx="12" cy="15" r="5"/><path d="M10 15l1.5 1.5L14 14"/>',
    book: '<path d="M4 19.5V4.5A1.5 1.5 0 0 1 5.5 3H19a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 19.5z"/><path d="M8 7h8M8 11h6"/>',
    cap: '<path d="M22 9L12 4 2 9l10 5 10-5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/>',
    cal: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    trophy: '<path d="M6 4h12v5a6 6 0 0 1-12 0z"/><path d="M6 6H3.5A2.5 2.5 0 0 0 6 10.5M18 6h2.5A2.5 2.5 0 0 1 18 10.5"/><path d="M10 15h4M9 20h6M12 15v5"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.3 2.3 4.7-4.7"/>',
    x: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    minus: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12h7"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'
  };

  function icone(nome) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + IC[nome] + "</svg>";
  }

  function resultadoDaProva(p, disciplina, serie) {
    var total = Number(p.total) || 0;
    var acertos = Number(p.acertos) || 0;
    var erros = Number(p.erros) || 0;
    var vazias = Number(p.naoRespondidas) || 0;
    var pct = total > 0 ? Math.round(100 * acertos / total) : 0;
    var porQuestao = total > 0 ? 10 / total : 0;
    var raio = 92;
    var circ = 2 * Math.PI * raio;
    var titulo = p.recuperacao ? "Resultado da Recuperação" : "Resultado da Avaliação";

    var h = '<div class="prova-bloco pr">';
    h += '<div class="pr-head"><span class="pr-head-icon">' + icone("award") + "</span>"
      + '<div class="pr-title">' + titulo + '</div><div class="pr-chips">'
      + '<span class="pr-chip">' + icone("book") + "<span>Disciplina: <b>" + esc(disciplina) + "</b></span></span>"
      + (serie ? '<span class="pr-chip">' + icone("cap") + "<span>Ano: <b>" + esc(serie) + "</b></span></span>" : "")
      + '<span class="pr-chip">' + icone("cal") + "<span>Data: <b>" + (dataBr(p.data) || "—") + "</b></span></span>"
      + (p.tempoSegundos ? '<span class="pr-chip"><span>Tempo: <b>' + minutos(p.tempoSegundos) + "</b></span></span>" : "")
      + "</div></div>";

    h += '<div class="pr-score"><div class="pr-ring-wrap">'
      + '<svg viewBox="0 0 200 200" class="pr-ring" aria-hidden="true">'
      + '<circle cx="100" cy="100" r="' + raio + '" class="pr-ring-track"></circle>'
      + '<circle cx="100" cy="100" r="' + raio + '" class="pr-ring-fill" style="stroke-dasharray:' + circ.toFixed(1)
      + ";stroke-dashoffset:" + (circ * (1 - pct / 100)).toFixed(1) + '"></circle></svg>'
      + '<div class="pr-ring-label"><span class="pr-ring-cap">Nota do aluno</span>'
      + '<span class="pr-ring-num">' + numero(p.nota) + '</span><span class="pr-ring-max">/ 10,0</span></div></div>'
      + '<div class="pr-badge">' + icone("trophy") + "<span>" + pct + "% de aproveitamento</span></div></div>";

    h += '<div class="pr-stats">'
      + '<div class="pr-stat ok">' + icone("check") + '<span class="pr-stat-n">' + acertos + '</span><span class="pr-stat-l">Acertos</span><span class="pr-stat-s">' + numero(acertos * porQuestao) + " pontos</span></div>"
      + '<div class="pr-stat err">' + icone("x") + '<span class="pr-stat-n">' + erros + '</span><span class="pr-stat-l">Erros</span><span class="pr-stat-s">' + numero(erros * porQuestao) + " pontos</span></div>"
      + '<div class="pr-stat non">' + icone("minus") + '<span class="pr-stat-n">' + vazias + '</span><span class="pr-stat-l">Não respondidas</span><span class="pr-stat-s">0,0 ponto</span></div>'
      + '<div class="pr-stat tot">' + icone("doc") + '<span class="pr-stat-n">10,0</span><span class="pr-stat-l">Pontuação total</span><span class="pr-stat-s">Valor máximo</span></div></div>';

    h += '<div class="pr-legend"><span><i class="pr-dot ok"></i> Acertou</span><span><i class="pr-dot err"></i> Errou</span>'
      + '<span><i class="pr-dot non"></i> Não respondida</span></div>';

    var questoes = p.questoes || [];
    if (questoes.length) {
      h += '<div class="pr-grid">' + questoes.map(function (q, i) {
        var cls = "non", marca = "–", pts = "–";
        if (q.marcou) {
          if (q.ok) { cls = "ok"; marca = "✓"; pts = numero(porQuestao); }
          else { cls = "err"; marca = "✕"; pts = numero(0); }
        }
        var dica = "Questão " + (i + 1) + (q.marcou ? " · marcou " + q.marcou : " · não respondida") + " · correta " + (q.correta || "?");
        return '<div class="pr-q ' + cls + '" title="' + esc(dica) + '"><div class="pr-q-ball"><span class="pr-q-n">' + (i + 1)
          + '</span><span class="pr-q-mk">' + marca + '</span></div><span class="pr-q-pt">' + pts + "</span></div>";
      }).join("") + "</div>";
    }

    h += '<div class="pr-perf"><div class="pr-perf-side">' + icone("chart") + '<div><div class="pr-perf-t">Desempenho</div>'
      + '<div class="pr-perf-s">Cada questão certa vale ' + numero(porQuestao) + " ponto.</div></div></div>"
      + '<div class="pr-perf-calc">'
      + '<div class="pr-calc-row is-ok"><span>Acertos: ' + acertos + " × " + numero(porQuestao) + "</span><b>" + numero(acertos * porQuestao) + "</b></div>"
      + '<div class="pr-calc-row is-err"><span>Erros: ' + erros + " × 0,0</span><b>0,0</b></div>"
      + '<div class="pr-calc-row"><span>Não respondidas: ' + vazias + " × 0,0</span><b>0,0</b></div>"
      + '<div class="pr-calc-total"><span>Total</span><b>' + numero(p.nota) + " / 10,0</b></div></div></div>";

    var habilidades = (p.descritores || []).map(function (d) {
      var dPct = d.total > 0 ? Math.round(100 * d.acertos / d.total) : 0;
      return '<div class="pr-desc"><span class="pr-desc-code">' + esc(d.codigo) + (d.nome ? " <i>— " + esc(d.nome) + "</i>" : "")
        + '</span><span class="pr-desc-val">' + d.acertos + "/" + d.total + " (" + dPct + "%)</span></div>";
    }).join("");
    if (habilidades) {
      h += '<div class="pr-gab"><h4>Desempenho por habilidade</h4><div class="pr-desc-list">' + habilidades + "</div>"
        + (questoes.length ? '<p class="pr-gab-hint">Passe o mouse sobre um número da grade para ver o que o aluno marcou e qual era a alternativa correta.</p>' : "")
        + "</div>";
    }
    return h + "</div>";
  }

  function tabelaProvas(dados, disciplina, calc, serie) {
    return BIMESTRES.map(function (b) {
      var r = calc.bimestres[b];
      var provas = (dados.provas || []).filter(function (p) {
        return p.disciplina === disciplina.nome && String(p.bimestre) === b;
      });
      var corpo;
      if (provas.length) {
        corpo = provas.map(function (p) { return resultadoDaProva(p, disciplina.nome, serie); }).join("");
        if (provas.length > 1) corpo += '<div class="section-note">Vale a maior nota entre a prova e a recuperação do livro.</div>';
        if (r.prova !== null && r.origemProva !== "automatico") {
          corpo += '<div class="section-note">No boletim vale a nota lançada pelo professor: ' + numero(r.prova) + "/10.</div>";
        }
      } else if (r.prova !== null) {
        corpo = '<div class="prova-bloco">Nota de prova lançada pelo professor: <strong>' + numero(r.prova) + "/10</strong>.</div>";
      } else {
        corpo = '<div class="prova-bloco">Prova ainda não registrada neste bimestre.</div>';
      }
      return '<div class="prova-bimestre"><div class="prova-titulo">' + b + "º Bimestre</div>" + corpo + "</div>";
    }).join("");
  }

  function atividadesDaDisciplina(dados, disciplina, calc) {
    var valorPorBimestre = {};
    var previstas = 0;
    BIMESTRES.forEach(function (b) {
      var resumo = ((disciplina.bimestres || {})[b] || {}).resumoTrabalho || {};
      valorPorBimestre[b] = Number(resumo.valorAtividade) || 0;
      previstas += Number(resumo.atividadesValidas) || 0;
    });
    var linhas = [];
    var feitas = 0;
    (dados.aulas || []).forEach(function (a) {
      if (a.disciplina !== disciplina.nome || !a.temAtividade) return;
      var b = String(a.bimestre);
      var nota;
      if (a.valePonto === false) nota = "não vale ponto";
      else if (a.atividade === "fez") { nota = numero(valorPorBimestre[b], 2); feitas += 1; }
      else if (a.atividade === "nao_fez") nota = "0,00";
      else nota = "aguardando";
      linhas.push("<tr><td>" + dataBr(a.data) + "</td><td>" + b + "º</td><td>" + esc(a.tema || "—") + "</td><td>" + nota + "</td></tr>");
    });
    var notaGeral = [];
    BIMESTRES.forEach(function (b) {
      var r = calc.bimestres[b];
      if (r.trabalho !== null) notaGeral.push(b + "º: " + numero(r.trabalho));
    });
    return {
      previstas: previstas,
      feitas: feitas,
      notaGeral: notaGeral.length ? notaGeral.join(" · ") : "—",
      html: '<table class="resumo-atv">'
        + "<tr><th>Total de atividades previstas</th><th>Atividades realizadas</th><th>Nota de trabalhos por bimestre</th></tr>"
        + "<tr><td>" + previstas + " atividade(s) valendo ponto</td><td>" + feitas + " de " + previstas + "</td><td>"
        + (notaGeral.length ? notaGeral.join(" · ") : "—") + "</td></tr></table>"
        + '<table class="atividades"><thead><tr><th>Data</th><th>Bimestre</th><th>Tema</th><th>Nota</th></tr></thead><tbody>'
        + (linhas.length ? linhas.join("") : '<tr><td colspan="4">Nenhuma atividade registrada nesta disciplina até agora.</td></tr>')
        + "</tbody></table>"
    };
  }

  function frequenciaDaDisciplina(dados, nome) {
    var soma = { horas: 0, presencas: 0, faltas: 0, fj: 0 };
    (dados.frequencia || []).forEach(function (f) {
      if (f.disciplina !== nome) return;
      soma.horas += Number(f.horas) || 0;
      soma.presencas += Number(f.presencas) || 0;
      soma.faltas += Number(f.faltas) || 0;
      soma.fj += Number(f.faltasJustificadas) || 0;
    });
    if (!soma.horas) return "Sem aulas registradas nesta disciplina até agora.";
    return "Frequência: " + numero(soma.presencas, 0) + " de " + numero(soma.horas, 0) + " h/aula ("
      + numero(100 * soma.presencas / soma.horas) + "%), " + numero(soma.faltas, 0) + " falta(s) e "
      + numero(soma.fj, 0) + " falta(s) justificada(s).";
  }

  function pontosPerdidos(o, regraLigada) {
    if (!regraLigada || (o.papel && o.papel !== "autor") || o.positiva || o.semInfracao || !o.gravidade) return "0,00";
    if (!o.disciplina) return "0,00 (sem disciplina)";
    return "−" + numero(PONTOS_CONDUTA[o.gravidade] || 0, 2);
  }

  function tabelaObservacoes(dados, regraLigada) {
    var linhas = (dados.ocorrencias || []).map(function (o) {
      var gravidade = o.papel && o.papel !== "autor"
        ? (ROTULO_PAPEL[o.papel] || "Envolvido")
        : (o.positiva ? "Destaque positivo" : (o.semInfracao ? "Sem infração" : (ROTULO_GRAVIDADE[o.gravidade] || "Em análise")));
      if (o.reincidencia) gravidade += " (reincidência)";
      var relato = esc(o.descricao || o.texto || "");
      if (o.disciplina) relato = "<em>" + esc(o.disciplina) + ":</em> " + relato;
      return "<tr><td>" + dataBr(o.data) + "</td><td>" + esc(o.horario || "—") + "</td><td>" + gravidade
        + "</td><td>" + pontosPerdidos(o, regraLigada) + "</td><td>" + relato + "</td></tr>";
    });
    var r = dados.resumoConduta || {};
    return {
      resumo: "Registros no ano: " + (r.leve || 0) + " leve(s), " + (r.medio || 0) + " médio(s), " + (r.grave || 0)
        + " grave(s), " + (r.muitoGrave || 0) + " muito grave(s)"
        + (r.destaques ? " e " + r.destaques + " destaque(s) positivo(s)" : "") + ".",
      html: '<table class="observacoes"><thead><tr><th>Data</th><th>Hora</th><th>Gravidade</th>'
        + "<th>Pontos perdidos</th><th>Relato</th></tr></thead><tbody>"
        + (linhas.length ? linhas.join("") : '<tr><td colspan="5">Nenhuma observação registrada até agora.</td></tr>')
        + "</tbody></table>"
    };
  }

  var CSS = ""
    + ":root{--azul:#1f4e79;--azul-claro:#eaf2f8;--cinza:#f2f2f2;--borda:#737373;--texto:#111}"
    + "*{box-sizing:border-box}"
    + "body{margin:0;background:#ececec;color:var(--texto);font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.35}"
    + ".toolbar{position:sticky;top:0;z-index:20;display:flex;gap:8px;justify-content:center;padding:10px;background:#1e1e1e;box-shadow:0 2px 8px rgba(0,0,0,.2)}"
    + ".toolbar button{border:0;border-radius:5px;padding:10px 16px;font:700 12pt 'Times New Roman',Times,serif;cursor:pointer}"
    + ".toolbar .primaria{background:#c9a84c;color:#3a2b06}"
    + ".toolbar .aviso{color:#e8e2d2;font-size:10pt;align-self:center}"
    + ".page{width:210mm;min-height:297mm;margin:14px auto;padding:15mm;background:#fff;box-shadow:0 0 8px rgba(0,0,0,.18)}"
    + ".official-header{width:100%;display:block;margin:0 0 12px}"
    + "h1{text-align:center;margin:10px 0 2px;font-size:16pt;letter-spacing:.2px}"
    + ".subtitle{text-align:center;color:#444;font-size:10pt;margin-bottom:14px}"
    + ".section-title{margin:15px 0 7px;padding:6px 8px;background:var(--azul);color:#fff;font-size:12pt;font-weight:700;break-after:avoid}"
    + ".section-note{margin:-1px 0 7px;color:#404040;font-size:10pt}"
    + "table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:10px}"
    + "th,td{border:1px solid var(--borda);padding:6px;vertical-align:middle;overflow-wrap:anywhere;font-size:12pt}"
    + "th{background:var(--azul-claro);text-align:center;font-weight:700}"
    + ".identificacao td{height:30px}"
    + ".label{width:20%;background:var(--cinza);font-weight:700}"
    + ".notas td{text-align:center;height:30px}"
    + ".provas td:first-child{width:22%;background:var(--cinza);font-weight:700;text-align:center}"
    + ".provas td:last-child{height:52px}"
    + ".resumo-atv td{text-align:center;height:32px}"
    + ".atividades th:nth-child(1){width:15%}.atividades th:nth-child(2){width:12%}.atividades th:nth-child(3){width:58%}.atividades th:nth-child(4){width:15%}"
    + ".atividades td:nth-child(1),.atividades td:nth-child(2),.atividades td:nth-child(4){text-align:center}"
    + ".observacoes th:nth-child(1){width:12%}.observacoes th:nth-child(2){width:10%}.observacoes th:nth-child(3){width:18%}.observacoes th:nth-child(4){width:12%}"
    + ".observacoes td:nth-child(1),.observacoes td:nth-child(2),.observacoes td:nth-child(3),.observacoes td:nth-child(4){text-align:center}"
    + ".notas th:nth-child(1){width:22%}"
    + ".prova-bimestre{border:1px solid var(--borda);margin-bottom:10px}"
    + ".prova-titulo{background:var(--cinza);font-weight:700;padding:5px 8px;border-bottom:1px solid var(--borda);break-after:avoid}"
    + ".prova-bloco{padding:8px}.prova-bloco+.prova-bloco{border-top:1px dashed var(--borda)}"
    + ".prova-bloco.pr{break-inside:avoid;"
    + "--pr-bg:#fff;--pr-surface:#f7faf8;--pr-line:#e4ebe6;--pr-ink:#14261c;--pr-ink-2:#4d6357;--pr-muted:#7b8c83;"
    + "--pr-green:#15803d;--pr-green-2:#16a34a;--pr-green-soft:#eaf6ee;--pr-green-line:#c9e6d4;"
    + "--pr-red:#dc2626;--pr-red-soft:#fdf1f1;--pr-red-line:#f3d3d3;--pr-grey:#6b7280;--pr-grey-soft:#f4f5f4;--pr-grey-line:#e2e5e3;"
    + "--pr-blue:#2563eb;--pr-blue-soft:#eff4fd;--pr-blue-line:#d3e0f7;--pr-track:#e6f0ea;"
    + "color:var(--pr-ink);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10pt;line-height:1.4;"
    + "-webkit-print-color-adjust:exact;print-color-adjust:exact}"
    + ".pr-head{text-align:center;margin-bottom:8px}"
    + ".pr-head-icon{display:block;margin:0 auto 4px;width:28px;height:28px;color:var(--pr-green)}.pr-head-icon svg{width:100%;height:100%}"
    + ".pr-title{font-size:15pt;font-weight:800;margin-bottom:8px;color:var(--pr-ink)}"
    + ".pr-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}"
    + ".pr-chip{display:inline-flex;align-items:center;gap:5px;font-size:9pt;color:var(--pr-ink-2);background:var(--pr-surface);border:1px solid var(--pr-line);border-radius:999px;padding:3px 10px}"
    + ".pr-chip svg{width:13px;height:13px;color:var(--pr-green);flex:none}.pr-chip b{color:var(--pr-ink)}"
    + ".pr-score{background:var(--pr-surface);border:1px solid var(--pr-line);border-radius:12px;padding:12px 8px;margin-bottom:8px}"
    + ".pr-ring-wrap{position:relative;width:150px;height:150px;margin:0 auto}"
    + ".pr-ring{width:100%;height:100%;transform:rotate(-90deg);display:block}"
    + ".pr-ring-track{fill:none;stroke:var(--pr-track);stroke-width:9}"
    + ".pr-ring-fill{fill:none;stroke:var(--pr-green);stroke-width:9;stroke-linecap:round}"
    + ".pr-ring-label{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center}"
    + ".pr-ring-cap{font-size:9pt;font-weight:600;color:var(--pr-ink-2)}"
    + ".pr-ring-num{font-size:30pt;font-weight:800;line-height:1.05;color:var(--pr-green)}"
    + ".pr-ring-max{font-size:11pt;font-weight:700;color:var(--pr-muted)}"
    + ".pr-badge{display:flex;align-items:center;justify-content:center;gap:6px;margin:8px auto 0;width:fit-content;font-size:10pt;font-weight:700;border-radius:999px;padding:4px 14px;background:var(--pr-green-soft);color:var(--pr-green);border:1px solid var(--pr-green-line)}"
    + ".pr-badge svg{width:15px;height:15px}"
    + ".pr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}"
    + ".pr-stat{border-radius:10px;padding:7px 4px;text-align:center;border:1px solid}"
    + ".pr-stat svg{width:18px;height:18px;margin:0 auto 2px;display:block}"
    + ".pr-stat-n{display:block;font-size:15pt;font-weight:800;line-height:1.1}"
    + ".pr-stat-l{display:block;font-size:9pt;font-weight:600;color:var(--pr-ink-2)}"
    + ".pr-stat-s{display:block;font-size:8.5pt;color:var(--pr-muted);margin-top:3px;padding-top:3px;border-top:1px solid var(--pr-line)}"
    + ".pr-stat.ok{background:var(--pr-green-soft);border-color:var(--pr-green-line)}.pr-stat.ok svg{color:var(--pr-green)}"
    + ".pr-stat.err{background:var(--pr-red-soft);border-color:var(--pr-red-line)}.pr-stat.err svg{color:var(--pr-red)}"
    + ".pr-stat.non{background:var(--pr-grey-soft);border-color:var(--pr-grey-line)}.pr-stat.non svg{color:var(--pr-grey)}"
    + ".pr-stat.tot{background:var(--pr-blue-soft);border-color:var(--pr-blue-line)}.pr-stat.tot svg{color:var(--pr-blue)}"
    + ".pr-legend{display:flex;justify-content:center;gap:18px;background:var(--pr-surface);border:1px solid var(--pr-line);border-radius:8px;padding:5px;margin-bottom:8px;font-size:9pt;font-weight:600;color:var(--pr-ink-2)}"
    + ".pr-legend span{display:inline-flex;align-items:center;gap:5px}"
    + ".pr-dot{width:11px;height:11px;border-radius:50%;display:inline-block}"
    + ".pr-dot.ok{background:var(--pr-green-2)}.pr-dot.err{background:var(--pr-red)}.pr-dot.non{background:var(--pr-grey)}"
    + ".pr-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:6px 4px;margin-bottom:8px}"
    + ".pr-q{display:flex;flex-direction:column;align-items:center;gap:2px}"
    + ".pr-q-ball{width:100%;max-width:34px;aspect-ratio:1;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;line-height:1}"
    + ".pr-q-n{font-size:8.5pt;font-weight:800}.pr-q-mk{font-size:7pt;font-weight:700}"
    + ".pr-q-pt{font-size:8pt;font-weight:600;color:var(--pr-muted)}"
    + ".pr-q.ok .pr-q-ball{background:var(--pr-green-2)}.pr-q.err .pr-q-ball{background:var(--pr-red)}.pr-q.non .pr-q-ball{background:var(--pr-grey)}"
    + ".pr-perf{display:flex;align-items:center;gap:14px;background:var(--pr-surface);border:1px solid var(--pr-line);border-radius:10px;padding:9px 12px;margin-bottom:8px}"
    + ".pr-perf-side{display:flex;align-items:flex-start;gap:8px;flex:1}.pr-perf-side svg{width:20px;height:20px;color:var(--pr-green);flex:none}"
    + ".pr-perf-t{font-size:11pt;font-weight:800;color:var(--pr-green)}.pr-perf-s{font-size:9pt;color:var(--pr-muted)}"
    + ".pr-perf-calc{flex:1.2}"
    + ".pr-calc-row{display:flex;justify-content:space-between;font-size:10pt;padding:1px 0;color:var(--pr-ink-2)}"
    + ".pr-calc-row.is-ok b{color:var(--pr-green)}.pr-calc-row.is-err b{color:var(--pr-red)}"
    + ".pr-calc-total{display:flex;justify-content:space-between;margin-top:4px;padding-top:4px;border-top:1px solid var(--pr-line);font-size:11pt;font-weight:800}"
    + ".pr-gab h4{font-size:11pt;font-weight:800;color:var(--pr-green);margin:0 0 5px}"
    + ".pr-desc-list{display:flex;flex-direction:column;gap:4px}"
    + ".pr-desc{display:flex;justify-content:space-between;gap:10px;background:var(--pr-surface);border:1px solid var(--pr-line);border-radius:8px;padding:5px 9px;font-size:9.5pt}"
    + ".pr-desc-code{font-weight:700}.pr-desc-code i{font-style:normal;font-weight:500;color:var(--pr-ink-2)}"
    + ".pr-desc-val{font-weight:700;color:var(--pr-muted);white-space:nowrap}"
    + ".pr-gab-hint{font-size:9pt;color:var(--pr-muted);margin:6px 0 0}"
    + ".signature{margin-top:26px;text-align:center;break-inside:avoid}"
    + ".signature img{width:250px;max-width:72%;display:block;margin:0 auto -10px}"
    + ".signature-line{width:330px;max-width:80%;margin:0 auto 5px;border-top:1px solid #333}"
    + ".signature-name{font-weight:700}.signature-role{font-size:10pt;color:#444}"
    + ".page-break{break-before:page;page-break-before:always}"
    + "@page{size:A4 portrait;margin:15mm}"
    + "@media print{body{background:#fff;font-size:12pt}"
    + ".toolbar{display:none !important}"
    + ".page{width:auto;min-height:auto;margin:0;padding:0;box-shadow:none}"
    + "thead{display:table-header-group}tr{break-inside:avoid}"
    + ".section-title,th,.label,.provas td:first-child{-webkit-print-color-adjust:exact;print-color-adjust:exact}}";

  /**
   * Documento completo (HTML) do Relatório Individual Anual do Aluno.
   * opcoes: {disciplina: nome ou vazio (todas), recursos: {cabecalho, assinatura}}
   */
  function documento(dados, opcoes) {
    opcoes = opcoes || {};
    var recursos = opcoes.recursos || {};
    var boletim = (dados.boletins || [])[opcoes.indice || 0] || { disciplinas: [], regras: {} };
    var disciplinas = (boletim.disciplinas || []).filter(function (d) {
      return !opcoes.disciplina || d.nome === opcoes.disciplina;
    });
    var aluno = (boletim.numero ? boletim.numero + ". " : "") + (boletim.aluno || "");
    var serie = String(boletim.turma || "").split("·").pop().trim();
    var corpo = "";

    disciplinas.forEach(function (disciplina, indice) {
      var calc = calcularDisciplina(boletim, disciplina);
      var atividades = atividadesDaDisciplina(dados, disciplina, calc);
      var quebra = indice > 0 ? " page-break" : "";
      if (disciplinas.length > 1) {
        corpo += '<div class="section-title' + quebra + '">COMPONENTE CURRICULAR: ' + esc(disciplina.nome.toUpperCase()) + "</div>";
      }
      corpo += '<div class="section-title' + (disciplinas.length > 1 ? "" : quebra) + '">1 - NOTAS</div>'
        + '<div class="section-note">' + esc(notaRodapeNotas(calc, disciplina)) + "</div>"
        + tabelaNotas(calc)
        + '<div class="section-note">' + esc(frequenciaDaDisciplina(dados, disciplina.nome)) + "</div>"
        + '<div class="section-title">2 - RELATÓRIO DE PROVAS</div>'
        + '<div class="section-note">Resultado de cada Avaliação Bimestral, como o aluno vê ao terminar a prova no livro.</div>'
        + tabelaProvas(dados, disciplina, calc, serie)
        + '<div class="section-title page-break">3 - ATIVIDADES FEITAS</div>'
        + '<div class="section-note">Cada atividade que vale ponto no bimestre divide os 10 pontos de trabalho. "Aguardando" fica fora do cálculo até ser corrigida.</div>'
        + atividades.html;
    });

    var descontoLigado = !!(boletim.regras || {}).descontoConduta;
    var observacoes = tabelaObservacoes(dados, descontoLigado);
    corpo += '<div class="section-title page-break">4 - OBSERVAÇÕES</div>'
      + '<div class="section-note">' + esc(observacoes.resumo)
      + (descontoLigado
        ? " Cada ocorrência desconta na nota do bimestre da disciplina em que aconteceu: leve 0,25 · médio 0,5 · grave 1,0 · muito grave 2,0,"
          + " até 2,0 pontos por bimestre em cada disciplina (o total aplicado aparece na tabela de notas)."
        : " Nesta escola o comportamento fica registrado sem descontar nota.")
      + "</div>"
      + observacoes.html;

    var identificacao = '<table class="identificacao">'
      + '<tr><td class="label">Unidade escolar:</td><td>' + esc(boletim.escola || "") + "</td>"
      + '<td class="label">Ano letivo:</td><td>2026</td></tr>'
      + '<tr><td class="label">Aluno(a):</td><td>' + esc(aluno) + "</td>"
      + '<td class="label">Última atualização:</td><td>' + esc(ultimaAtualizacao(dados)) + "</td></tr>"
      + '<tr><td class="label">Série/Ano:</td><td>' + esc(String(boletim.turma || "").split("·").pop().trim()) + "</td>"
      + '<td class="label">Turma:</td><td>' + esc(String(boletim.turma || "").split("·").pop().trim()) + "</td></tr>"
      + '<tr><td class="label">Professor:</td><td><strong>' + PROFESSOR + "</strong></td>"
      + '<td class="label">Componente curricular:</td><td>'
      + esc(disciplinas.map(function (d) { return d.nome; }).join(", ") || "—") + "</td></tr>"
      + "</table>";

    return "<!DOCTYPE html>\n<html lang=\"pt-BR\"><head><meta charset=\"UTF-8\">"
      + '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
      + "<title>Relatório Individual Anual — " + esc(aluno) + "</title>"
      + "<style>" + CSS + "</style></head><body>"
      + '<div class="toolbar">'
      + '<button type="button" class="primaria" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>'
      + '<button type="button" onclick="window.close()">Fechar</button>'
      + '<span class="aviso">Na tela de impressão, escolha "Salvar como PDF" para baixar.</span>'
      + "</div>"
      + '<main class="page">'
      + (recursos.cabecalho ? '<img class="official-header" src="' + esc(recursos.cabecalho) + '" alt="Cabeçalho oficial">' : "")
      + "<h1>RELATÓRIO INDIVIDUAL ANUAL DO ALUNO</h1>"
      + '<div class="subtitle">Documento de acompanhamento, atualizado a cada novo relato, prova ou observação</div>'
      + '<div class="section-title">DADOS DE IDENTIFICAÇÃO</div>'
      + identificacao
      + corpo
      + '<div class="signature">'
      + (recursos.assinatura ? '<img src="' + esc(recursos.assinatura) + '" alt="Assinatura">' : "")
      + '<div class="signature-line"></div>'
      + '<div class="signature-name">' + PROFESSOR + "</div>"
      + '<div class="signature-role">Professor responsável</div>'
      + "</div></main></body></html>";
  }

  /** Abre o documento numa janela própria. Devolve null se o navegador bloquear. */
  function abrir(html, opcoes) {
    opcoes = opcoes || {};
    var janela = root.open("", opcoes.nome || "relatorio-individual", opcoes.recursosJanela || "width=900,height=1000");
    if (!janela) return null;
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    return janela;
  }

  var api = {
    VERSAO: VERSAO,
    carregar: carregar,
    documento: documento,
    abrir: abrir
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RelatorioIndividual = api;
})(typeof window !== "undefined" ? window : this);
