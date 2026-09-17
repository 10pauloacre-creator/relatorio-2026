// ═══════════════════════════════════════════════════════════════════════════
// BOLETIM-REGRAS.JS — motor único das notas bimestrais
// ───────────────────────────────────────────────────────────────────────────
// Usado pelo boletim do professor (Relatório 2026) E pelo perfil do aluno
// (Biblioteca Digital). Os dois repositórios têm uma cópia IDÊNTICA deste
// arquivo; confira com `node scripts/check-boletim-regras.js` após alterar.
// Sem dependências e sem acesso a DOM ou rede: recebe números, devolve números.
//
// Regras (decisões do professor, 16/09/2026):
//  • Trabalhos 0–10 e prova 0–10; nota do bimestre = média, arredondada para
//    o 0,5 mais próximo. A nota só é "fechada" com trabalhos E prova lançados.
//  • Bimestres automáticos (Casavequia: 3º e 4º): o padrão é o cálculo de
//    trabalhos e a prova da Biblioteca; o professor pode ajustar uma nota à
//    mão ("ajuste"), e o ajuste vale até ele voltar ao automático.
//  • Comportamento não desconta nota.
//  • Recuperação semestral (1º semestre = 1º+2º bim.; 2º = 3º+4º):
//      1. 1º (ou 3º) bimestre abaixo de 7 é recuperado pela nota do 2º (ou 4º),
//         se ela for 7 ou mais: vale a nota maior.
//      2. Se, fechado o semestre, algum bimestre continuar abaixo de 7, o aluno
//         faz a prova única de recuperação semestral. Com 7 ou mais, recupera
//         os bimestres abaixo da média (vale a nota da recuperação); abaixo
//         de 7, fica reprovado no semestre.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  var MEDIA = 7;
  var SEMESTRES = { "1": ["1", "2"], "2": ["3", "4"] };

  function numero(valor) {
    if (valor === "" || valor === null || valor === undefined) return null;
    var n = Number(String(valor).replace(",", "."));
    return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : null;
  }

  function arredondarMeio(valor) {
    return Number((Math.round(valor * 2) / 2).toFixed(1));
  }

  function umaCasa(valor) {
    return valor === null ? null : Number(valor.toFixed(1));
  }

  // entrada.bimestres[b] = { trabalhoManual, provaManual, trabalhoAuto, provaAuto }
  function calcularBimestre(dados, automatico) {
    dados = dados || {};
    var trabalhoManual = numero(dados.trabalhoManual);
    var provaManual = numero(dados.provaManual);
    var trabalhoAuto = numero(dados.trabalhoAuto);
    var provaAuto = numero(dados.provaAuto);

    // Nota lançada à mão vale sobre a automática; nos bimestres automáticos
    // ela é um ajuste pontual do professor.
    var trabalho = trabalhoManual !== null ? trabalhoManual : trabalhoAuto;
    var prova = provaManual !== null ? provaManual : provaAuto;
    var origemManual = automatico ? "ajuste" : "manual";
    var completo = trabalho !== null && prova !== null;
    var parcial = trabalho === null && prova === null ? null : arredondarMeio(((trabalho || 0) + (prova || 0)) / 2);

    return {
      automatico: !!automatico,
      trabalho: umaCasa(trabalho),
      prova: umaCasa(prova),
      origemTrabalho: trabalho === null ? null : (trabalhoManual !== null ? origemManual : "automatico"),
      origemProva: prova === null ? null : (provaManual !== null ? origemManual : "automatico"),
      completo: completo,
      nota: completo ? parcial : null,        // nota bimestral fechada
      notaParcial: completo ? null : parcial, // enquanto falta trabalho ou prova
      notaFinal: completo ? parcial : null,   // após recuperação
      recuperado: false,
      recuperadoPor: null,                    // "bimestre" | "semestral"
      abaixoDaMedia: completo ? parcial < MEDIA : false
    };
  }

  function calcular(entrada) {
    entrada = entrada || {};
    var automaticos = (entrada.bimestresAutomaticos || []).map(String);
    var usaRecuperacao = entrada.recuperacaoSemestral !== false;
    var recuperacoes = entrada.recuperacao || {};
    var bimestres = {};
    ["1", "2", "3", "4"].forEach(function (b) {
      bimestres[b] = calcularBimestre((entrada.bimestres || {})[b], automaticos.indexOf(b) >= 0);
    });

    var semestres = {};
    Object.keys(SEMESTRES).forEach(function (s) {
      var primeiro = bimestres[SEMESTRES[s][0]];
      var segundo = bimestres[SEMESTRES[s][1]];
      var notaRecuperacao = numero(recuperacoes[s]);
      var semestre = {
        bimestres: SEMESTRES[s].slice(),
        situacao: "em_andamento",
        precisaRecuperacao: false,
        notaRecuperacao: notaRecuperacao
      };
      semestres[s] = semestre;

      if (!usaRecuperacao) {
        semestre.situacao = primeiro.completo && segundo.completo ? "sem_regra" : "em_andamento";
        return;
      }

      // 1. O 2º bimestre do semestre recupera o 1º.
      if (primeiro.completo && primeiro.nota < MEDIA && segundo.completo && segundo.nota >= MEDIA) {
        primeiro.notaFinal = segundo.nota;
        primeiro.recuperado = true;
        primeiro.recuperadoPor = "bimestre";
      }

      if (!primeiro.completo || !segundo.completo) {
        semestre.situacao = primeiro.completo && primeiro.nota < MEDIA ? "aguardando_bimestre" : "em_andamento";
        return;
      }

      // 2. Semestre fechado: ainda há bimestre abaixo da média?
      var abaixo = [primeiro, segundo].filter(function (item) { return item.notaFinal < MEDIA; });
      if (!abaixo.length) {
        semestre.situacao = primeiro.recuperado ? "recuperado_no_bimestre" : "aprovado";
        return;
      }

      semestre.precisaRecuperacao = true;
      if (notaRecuperacao === null) {
        semestre.situacao = "recuperacao_pendente";
        return;
      }
      if (notaRecuperacao >= MEDIA) {
        abaixo.forEach(function (item) {
          item.notaFinal = umaCasa(notaRecuperacao);
          item.recuperado = true;
          item.recuperadoPor = "semestral";
        });
        semestre.situacao = "recuperado_na_semestral";
      } else {
        semestre.situacao = "reprovado";
      }
    });

    var finais = ["1", "2", "3", "4"]
      .map(function (b) { return bimestres[b].notaFinal; })
      .filter(function (v) { return v !== null; });

    return {
      media: MEDIA,
      bimestres: bimestres,
      semestres: semestres,
      mediaAnual: finais.length ? arredondarMeio(finais.reduce(function (a, v) { return a + v; }, 0) / finais.length) : null,
      bimestresConsiderados: finais.length
    };
  }

  var ROTULOS_SITUACAO = {
    em_andamento: "Em andamento",
    aguardando_bimestre: "Aguardando o 2º bimestre do semestre para recuperar",
    aprovado: "Aprovado no semestre",
    recuperado_no_bimestre: "Recuperado pelo bimestre seguinte",
    recuperacao_pendente: "Precisa da recuperação semestral",
    recuperado_na_semestral: "Recuperado na recuperação semestral",
    reprovado: "Reprovado no semestre",
    sem_regra: "Semestre fechado"
  };

  var api = {
    MEDIA: MEDIA,
    SEMESTRES: SEMESTRES,
    calcular: calcular,
    rotuloSituacao: function (situacao) { return ROTULOS_SITUACAO[situacao] || situacao; },
    VERSAO: "2026-09-17b"
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BoletimRegras = api;
})(typeof window !== "undefined" ? window : globalThis);
