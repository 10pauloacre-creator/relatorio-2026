// ═══════════════════════════════════════════════════════════════════════════
// RELATORIO-INDIVIDUAL.JS — relatório do aluno, igual para professor e aluno
// ───────────────────────────────────────────────────────────────────────────
// Usado pelo painel do professor (Relatório 2026) E pelo perfil do aluno
// (Biblioteca Digital). Os dois repositórios têm uma cópia IDÊNTICA deste
// arquivo; confira com `node scripts/check-copias-compartilhadas.js`.
//
// Os dados vêm de uma fonte só (RPC relatorio_individual) e as duas telas
// montam o MESMO modelo; a tela e o PDF saem desse modelo. Assim o PDF que o
// professor gera e o que o aluno baixa são o mesmo documento.
//
// Conteúdo: notas (trabalhos, prova, recuperação e bônus do Ranking de
// Poder), frequência em h/aula, aulas com tema, presença e atividade, e o
// comportamento com data, horário e gravidade. Comportamento NÃO desconta
// nota: entra como registro.
//
// Depende de window.BoletimRegras (motor das notas) e, para o PDF, de jsPDF
// com autoTable.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  var VERSAO = "2026-09-17a";

  var ROTULO_PRESENCA = { presente: "Presente", falta: "Falta", falta_justificada: "Falta justificada" };
  var ROTULO_ATIVIDADE = { fez: "Fez", nao_fez: "Nao fez", aguardando: "Aguardando", pendente: "Sem marcacao" };
  var ROTULO_GRAVIDADE = { leve: "Leve", medio: "Medio", grave: "Grave", muito_grave: "Muito grave" };
  var ROTULO_PAPEL = { autor: "", vitima: "Vitima", testemunha: "Testemunha", envolvido: "Envolvido", destaque: "Destaque" };
  var BIMESTRES = ["1", "2", "3", "4"];

  function numero(valor, casas) {
    if (valor === null || valor === undefined || valor === "") return "-";
    var n = Number(valor);
    if (!isFinite(n)) return "-";
    return n.toFixed(casas === undefined ? 1 : casas).replace(".", ",");
  }

  function dataBr(iso) {
    var partes = String(iso || "").slice(0, 10).split("-");
    return partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : "";
  }

  function escapeHtml(valor) {
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
      pontosPoder: boletim.pontosPoder,
      bimestres: disciplina.bimestres,
      recuperacao: disciplina.recuperacao
    });
  }

  // ── Seções ────────────────────────────────────────────────────────────
  function secaoNotas(boletim, bimestre) {
    var linhas = [];
    var observacoes = [];
    var notaPoder = null;
    (boletim.disciplinas || []).forEach(function (disciplina) {
      var calc = calcularDisciplina(boletim, disciplina);
      if (bimestre) {
        var r = calc.bimestres[bimestre];
        linhas.push([
          disciplina.nome,
          numero(r.trabalho), numero(r.prova),
          r.notaFinal !== null ? numero(r.notaFinal) : (r.notaParcial !== null ? numero(r.notaParcial) + " (parcial)" : "-"),
          r.recuperado ? "Recuperado (nota anterior " + numero(r.nota) + ")"
            : (r.completo ? (r.nota >= calc.media ? "Acima da media" : "Abaixo da media")
              : (r.trabalho === null && r.prova === null ? "Sem notas" : (r.trabalho === null ? "Falta trabalhos" : "Falta prova")))
        ]);
      } else {
        var celulas = [disciplina.nome];
        BIMESTRES.forEach(function (b) {
          var item = calc.bimestres[b];
          celulas.push(item.notaFinal !== null ? numero(item.notaFinal) : (item.notaParcial !== null ? numero(item.notaParcial) + "*" : "-"));
        });
        celulas.push(numero(calc.mediaAnual));
        celulas.push(numero(calc.mediaFinal));
        linhas.push(celulas);
      }
      // O bônus é do aluno, não da disciplina: uma linha só no rodapé.
      if (calc.poder && calc.poder.bonusMedia > 0 && !bimestre) {
        notaPoder = "Ranking de Poder: " + calc.poder.nome + " (" + calc.poder.pontos + " pts) soma +"
          + numero(calc.poder.bonusMedia, 2) + " na media final de cada disciplina.";
      }
      ["1", "2"].forEach(function (semestre) {
        var info = calc.semestres[semestre];
        if (!info || !info.precisaRecuperacao) return;
        observacoes.push(disciplina.nome + " - recuperacao semestral do " + semestre + "o semestre: "
          + (info.notaRecuperacao === null ? "pendente" : numero(info.notaRecuperacao) + "/10")
          + " - " + root.BoletimRegras.rotuloSituacao(info.situacao) + ".");
      });
    });
    var colunas = bimestre
      ? ["Disciplina", "Trabalhos", "Prova", "Nota do bimestre", "Situacao"]
      : ["Disciplina", "1o bim.", "2o bim.", "3o bim.", "4o bim.", "Media", "Media final"];
    return {
      titulo: bimestre ? "Notas do " + bimestre + "o bimestre" : "Notas do ano",
      colunas: colunas,
      linhas: linhas,
      notas: (notaPoder ? [notaPoder] : []).concat(observacoes).concat(bimestre ? [] : ["* nota parcial: falta lancar trabalhos ou prova."])
    };
  }

  function secaoFrequencia(dados) {
    var linhas = (dados.frequencia || []).map(function (f) {
      return [
        f.disciplina + (dados.bimestre ? "" : " (" + f.bimestre + "o bim.)"),
        numero(f.horas, 0), numero(f.presencas, 0), numero(f.faltas, 0), numero(f.faltasJustificadas, 0),
        f.percentual === null || f.percentual === undefined ? "-" : numero(f.percentual) + "%"
      ];
    });
    var soma = (dados.frequencia || []).reduce(function (a, f) {
      a.horas += Number(f.horas) || 0; a.presencas += Number(f.presencas) || 0;
      a.faltas += Number(f.faltas) || 0; a.fj += Number(f.faltasJustificadas) || 0;
      return a;
    }, { horas: 0, presencas: 0, faltas: 0, fj: 0 });
    if (linhas.length) {
      linhas.push(["TOTAL", numero(soma.horas, 0), numero(soma.presencas, 0), numero(soma.faltas, 0), numero(soma.fj, 0),
        soma.horas > 0 ? numero(100 * soma.presencas / soma.horas) + "%" : "-"]);
    }
    return {
      titulo: "Frequencia (em h/aula)",
      colunas: ["Disciplina", "h/aula", "Presencas", "Faltas", "Falta just.", "Presenca"],
      linhas: linhas,
      notas: []
    };
  }

  function secaoAulas(dados) {
    var linhas = (dados.aulas || []).map(function (a) {
      return [
        dataBr(a.data), a.disciplina || "", a.tema || "-",
        numero(a.carga, 0),
        ROTULO_PRESENCA[a.presenca] || "Sem marcacao",
        a.temAtividade ? (ROTULO_ATIVIDADE[a.atividade] || "Sem marcacao") + (a.valePonto === false ? " (nao vale ponto)" : "") : "-"
      ];
    });
    return {
      titulo: "Aulas, temas e atividades",
      colunas: ["Data", "Disciplina", "Tema", "h/aula", "Presenca", "Atividade"],
      linhas: linhas,
      notas: linhas.length ? [] : ["Nenhuma aula registrada neste periodo."]
    };
  }

  function secaoComportamento(dados) {
    var linhas = (dados.ocorrencias || []).map(function (o) {
      var situacao = o.papel && o.papel !== "autor"
        ? ROTULO_PAPEL[o.papel] || "Envolvido"
        : (o.positiva ? "Destaque" : (o.semInfracao ? "Sem infracao" : (ROTULO_GRAVIDADE[o.gravidade] || "Aguardando analise")));
      if (o.reincidencia) situacao += " (reincidencia)";
      return [
        dataBr(o.data) + (o.horario ? " " + o.horario : ""),
        o.disciplina || "-",
        situacao,
        (o.categoria ? String(o.categoria).replace(/_/g, " ") + ": " : "") + (o.descricao || o.texto || "")
      ];
    });
    var r = dados.resumoConduta || {};
    var resumo = "Registros: " + (r.leve || 0) + " leve(s), " + (r.medio || 0) + " medio(s), "
      + (r.grave || 0) + " grave(s), " + (r.muitoGrave || 0) + " muito grave(s)"
      + (r.destaques ? ", " + r.destaques + " destaque(s) positivo(s)" : "") + ".";
    return {
      titulo: "Comportamento",
      colunas: ["Data e hora", "Disciplina", "Gravidade", "Registro"],
      linhas: linhas,
      notas: [resumo, "Comportamento nao desconta nota: fica registrado para o acompanhamento pedagogico."]
        .concat(r.aguardandoIA ? [r.aguardandoIA + " registro(s) ainda em analise pela IA."] : [])
    };
  }

  /* Modelo do documento: mesma estrutura para a tela e para o PDF. */
  function montar(dados, opcoes) {
    opcoes = opcoes || {};
    var boletim = (dados.boletins || [])[opcoes.indice || 0] || { disciplinas: [], regras: {} };
    var bimestre = dados.bimestre || null;
    var periodo = bimestre ? bimestre + "o bimestre de 2026" : "Ano letivo de 2026";
    return {
      versao: VERSAO,
      titulo: "Relatorio individual do aluno",
      escola: boletim.escola || "",
      turma: boletim.turma || "",
      aluno: (boletim.numero ? boletim.numero + ". " : "") + (boletim.aluno || ""),
      periodo: periodo,
      geradoEm: dados.geradoEm || new Date().toISOString(),
      transferido: !!boletim.transferido,
      secoes: [
        secaoNotas(boletim, bimestre),
        secaoFrequencia(dados),
        secaoAulas(dados),
        secaoComportamento(dados)
      ]
    };
  }

  function nomeArquivo(modelo) {
    var base = (modelo.aluno + " " + modelo.periodo).normalize("NFD").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
    return "relatorio-" + base.slice(0, 60) + ".pdf";
  }

  // ── Tela ──────────────────────────────────────────────────────────────
  function html(modelo) {
    var cabecalho = '<header class="ri-head">'
      + '<h2>' + escapeHtml(modelo.titulo) + "</h2>"
      + '<div class="ri-aluno">' + escapeHtml(modelo.aluno) + "</div>"
      + '<div class="ri-sub">' + escapeHtml([modelo.escola, modelo.turma, modelo.periodo].filter(Boolean).join(" · ")) + "</div>"
      + "</header>";
    var corpo = modelo.secoes.map(function (secao) {
      var linhas = secao.linhas.length
        ? secao.linhas.map(function (linha) {
          return "<tr>" + linha.map(function (celula) { return "<td>" + escapeHtml(celula) + "</td>"; }).join("") + "</tr>";
        }).join("")
        : '<tr><td colspan="' + secao.colunas.length + '">Nada registrado neste periodo.</td></tr>';
      return '<section class="ri-secao"><h3>' + escapeHtml(secao.titulo) + "</h3>"
        + '<table class="ri-tabela"><thead><tr>'
        + secao.colunas.map(function (coluna) { return "<th>" + escapeHtml(coluna) + "</th>"; }).join("")
        + "</tr></thead><tbody>" + linhas + "</tbody></table>"
        + (secao.notas || []).map(function (nota) { return '<p class="ri-nota">' + escapeHtml(nota) + "</p>"; }).join("")
        + "</section>";
    }).join("");
    return '<div class="ri-doc">' + cabecalho + corpo
      + '<footer class="ri-pe">Gerado em ' + escapeHtml(dataBr(modelo.geradoEm)) + " · mesmo documento no painel do professor e no perfil do aluno.</footer></div>";
  }

  var CSS = ""
    + ".ri-doc{font-family:inherit;color:#243127;line-height:1.5}"
    + ".ri-head{border-bottom:2px solid #2d6147;padding-bottom:10px;margin-bottom:16px}"
    + ".ri-head h2{margin:0;font-size:1.15rem;color:#1a3a2a}"
    + ".ri-aluno{font-weight:700;margin-top:6px}"
    + ".ri-sub{font-size:.82rem;color:#5e655f}"
    + ".ri-secao{margin-bottom:20px}"
    + ".ri-secao h3{font-size:.95rem;color:#1a3a2a;margin:0 0 8px}"
    + ".ri-tabela{width:100%;border-collapse:collapse;font-size:.8rem}"
    + ".ri-tabela th,.ri-tabela td{border:1px solid #e0e5e1;padding:6px 8px;text-align:left;vertical-align:top}"
    + ".ri-tabela th{background:#eef3ef;font-weight:700}"
    + ".ri-nota{font-size:.76rem;color:#5e655f;margin:6px 0 0}"
    + ".ri-pe{font-size:.74rem;color:#5e655f;border-top:1px solid #e0e5e1;padding-top:8px}";

  function estilo() {
    return CSS;
  }

  // ── PDF ───────────────────────────────────────────────────────────────
  function pdf(modelo, opcoes) {
    opcoes = opcoes || {};
    var jsPDFRef = (root.jspdf && root.jspdf.jsPDF) || root.jsPDF;
    if (!jsPDFRef) throw new Error("jsPDF não está carregado nesta página.");
    var doc = new jsPDFRef({ orientation: "portrait", unit: "pt", format: "a4" });
    var largura = doc.internal.pageSize.getWidth();
    var y = 48;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(modelo.titulo, 40, y);
    y += 20;
    doc.setFontSize(12);
    doc.text(modelo.aluno, 40, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text([modelo.escola, modelo.turma, modelo.periodo].filter(Boolean).join(" | "), 40, y);
    y += 12;
    doc.setDrawColor(45, 97, 71);
    doc.setLineWidth(1.2);
    doc.line(40, y, largura - 40, y);
    y += 16;
    doc.setTextColor(0);

    var alturaPagina = doc.internal.pageSize.getHeight();
    modelo.secoes.forEach(function (secao) {
      if (typeof doc.autoTable !== "function") throw new Error("jsPDF-AutoTable não está carregado nesta página.");
      if (y > alturaPagina - 140) { doc.addPage(); y = 48; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(26, 58, 42);
      doc.text(secao.titulo, 40, y);
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      doc.autoTable({
        startY: y + 8,
        head: [secao.colunas],
        body: secao.linhas.length ? secao.linhas : [[{ content: "Nada registrado neste periodo.", colSpan: secao.colunas.length }]],
        margin: { left: 40, right: 40, bottom: 48 },
        theme: "grid",
        styles: { font: "helvetica", fontSize: 8, cellPadding: 4, overflow: "linebreak", lineColor: [224, 229, 225] },
        headStyles: { fillColor: [45, 97, 71], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [244, 247, 245] }
      });
      y = doc.lastAutoTable.finalY + 14;
      (secao.notas || []).forEach(function (nota) {
        var linhas = doc.splitTextToSize(nota, largura - 80);
        if (y + linhas.length * 10 > alturaPagina - 48) { doc.addPage(); y = 48; }
        doc.setFontSize(8);
        doc.setTextColor(95);
        doc.text(linhas, 40, y);
        doc.setTextColor(0);
        y += linhas.length * 10 + 2;
      });
      y += 10;
    });

    var paginas = doc.internal.getNumberOfPages();
    for (var i = 1; i <= paginas; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text("Gerado em " + dataBr(modelo.geradoEm) + " · " + modelo.periodo + " · pagina " + i + "/" + paginas,
        40, doc.internal.pageSize.getHeight() - 24);
    }
    if (opcoes.salvar !== false) doc.save(nomeArquivo(modelo));
    return doc;
  }

  var api = {
    VERSAO: VERSAO,
    carregar: carregar,
    montar: montar,
    html: html,
    estilo: estilo,
    pdf: pdf,
    nomeArquivo: nomeArquivo
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RelatorioIndividual = api;
})(typeof window !== "undefined" ? window : this);
