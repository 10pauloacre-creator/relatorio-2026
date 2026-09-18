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
  var VERSAO = "2026-09-17c";
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

  // Mesmo conteúdo da tela "Resultado da Avaliação" do livro (prova-report.js):
  // nota, aproveitamento, acertos, erros, não respondidas e desempenho por
  // habilidade; aqui em tabela, para caber no papel.
  function resultadoDaProva(p) {
    var pct = p.total > 0 ? Math.round(100 * p.acertos / p.total) : 0;
    var porQuestao = p.total > 0 ? 10 / p.total : 0;
    var cabeca = "<strong>" + (p.recuperacao ? "Recuperação da Avaliação Bimestral" : "Avaliação Bimestral") + "</strong>"
      + (p.data ? " · " + dataBr(p.data) : "") + (p.tempoSegundos ? " · tempo: " + minutos(p.tempoSegundos) : "");
    var resumo = '<table class="prova-resumo"><tr><th>Nota</th><th>Aproveitamento</th><th>Acertos</th><th>Erros</th><th>Não respondidas</th></tr>'
      + "<tr><td><strong>" + numero(p.nota) + "</strong> / 10,0</td><td>" + pct + "%</td>"
      + "<td>" + p.acertos + " (" + numero(p.acertos * porQuestao) + " pts)</td>"
      + "<td>" + (p.erros || 0) + "</td><td>" + (p.naoRespondidas || 0) + "</td></tr></table>";
    var habilidades = (p.descritores || []).map(function (d) {
      var dPct = d.total > 0 ? Math.round(100 * d.acertos / d.total) : 0;
      return "<tr><td><strong>" + esc(d.codigo) + "</strong>" + (d.nome ? " — " + esc(d.nome) : "") + "</td>"
        + "<td>" + d.acertos + "/" + d.total + " (" + dPct + "%)</td></tr>";
    }).join("");
    return '<div class="prova-bloco"><div class="prova-cabeca">' + cabeca + "</div>" + resumo
      + (habilidades ? '<table class="habilidades"><tr><th>Desempenho por habilidade</th><th>Acertos</th></tr>' + habilidades + "</table>" : "")
      + "</div>";
  }

  function tabelaProvas(dados, disciplina, calc) {
    return BIMESTRES.map(function (b) {
      var r = calc.bimestres[b];
      var provas = (dados.provas || []).filter(function (p) {
        return p.disciplina === disciplina.nome && String(p.bimestre) === b;
      });
      var corpo;
      if (provas.length) {
        corpo = provas.map(resultadoDaProva).join("");
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
    + ".prova-bimestre{border:1px solid var(--borda);margin-bottom:10px;break-inside:avoid}"
    + ".prova-titulo{background:var(--cinza);font-weight:700;padding:5px 8px;border-bottom:1px solid var(--borda)}"
    + ".prova-bloco{padding:8px}.prova-bloco+.prova-bloco{border-top:1px dashed var(--borda)}"
    + ".prova-cabeca{margin-bottom:6px}"
    + ".prova-resumo td{text-align:center}.prova-bimestre table{margin-bottom:6px}"
    + ".habilidades th:nth-child(2){width:22%}.habilidades td:nth-child(2){text-align:center}"
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
        + tabelaProvas(dados, disciplina, calc)
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
