// Nota de trabalho calculada no Supabase (view relatorio_notas_trabalho) para
// os painéis de alunos. Regra (Etapa 3): 10 pontos divididos entre as
// atividades que valem ponto no bimestre; "aguardando" fica fora do cálculo
// até ser marcado como fez ou não fez. O bimestre vem da soma de h/aula.
//
// Uso:
//   var notas = NotasBimestrais.criar({
//     escolaSlug: "padre-carlos-casavequia", turmaCodigo: "t1",
//     disciplinas: [{ name: "Língua Portuguesa", aliases: ["LP"] }],
//     aoAtualizar: function () { renderAll(); },
//     usarNumero: true,  // false quando a turma do diário junta séries (Hermínio t23)
//     scopeKey: "casavequia:panel:pc_alunos_1serie_2026_v1" // habilita obterProva
//   });
//   notas.obter({ nome, numero }, "Língua Portuguesa", "3") → linha ou null
//   notas.obterProva({ id }, "Língua Portuguesa", "3") → nota 0–10 da prova da Biblioteca ou null
window.NotasBimestrais = (function () {
  var RECARREGAR_MS = 120000;

  function normalizar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .toLowerCase();
  }

  function aguardarSync() {
    return new Promise(function (resolve) {
      (function tentar(n) {
        var sync = window.RelatorioSupabaseSync;
        if (sync && sync.isAvailable && sync.isAvailable()) return resolve(sync);
        if (n > 120) return resolve(null);
        window.setTimeout(function () { tentar(n + 1); }, 250);
      })(0);
    });
  }

  function criar(opcoes) {
    var porNome = {};
    var porNumero = {};
    var provas = {};
    var detalhesProvas = {};
    var poder = {};
    var carregado = false;
    var carregando = null;
    var aliasParaDisciplina = {};

    (opcoes.disciplinas || []).forEach(function (disciplina) {
      [disciplina.name].concat(disciplina.aliases || []).forEach(function (nome) {
        aliasParaDisciplina[normalizar(nome)] = disciplina.name;
      });
    });

    function disciplinaDoPainel(nomeNoBanco) {
      return aliasParaDisciplina[normalizar(nomeNoBanco)] || nomeNoBanco;
    }

    async function carregar() {
      if (carregando) return carregando;
      carregando = (async function () {
        var sync = await aguardarSync();
        if (!sync) return;
        await sync.auth.whenAuthorized();
        var resposta = await sync.getClient()
          .from("relatorio_notas_trabalho")
          .select("disciplina,bimestre,numero_chamada,nome_relatorio,aluno_id,atividades_validas,valor_atividade,fez,nao_fez,aguardando,nota_trabalho,bimestre_concluido")
          .eq("escola_slug", opcoes.escolaSlug)
          .eq("turma_codigo", opcoes.turmaCodigo);
        if (resposta.error) {
          console.warn("[Notas] não foi possível carregar a nota de trabalho.", resposta.error);
          return;
        }
        var novoPorNome = {};
        var novoPorNumero = {};
        (resposta.data || []).forEach(function (linha) {
          var chave = disciplinaDoPainel(linha.disciplina) + "|" + linha.bimestre;
          var item = {
            atividadesValidas: Number(linha.atividades_validas) || 0,
            valorAtividade: linha.valor_atividade === null ? null : Number(linha.valor_atividade),
            fez: Number(linha.fez) || 0,
            naoFez: Number(linha.nao_fez) || 0,
            aguardando: Number(linha.aguardando) || 0,
            nota: linha.nota_trabalho === null ? null : Number(linha.nota_trabalho),
            bimestreConcluido: !!linha.bimestre_concluido,
            numero: linha.numero_chamada,
            alunoId: linha.aluno_id
          };
          novoPorNome[normalizar(linha.nome_relatorio) + "|" + chave] = item;
          novoPorNumero[linha.numero_chamada + "|" + chave] = item;
        });
        porNome = novoPorNome;
        porNumero = novoPorNumero;

        // Prova bimestral da Biblioteca (0–10), pelo vínculo exato do painel.
        if (opcoes.scopeKey) {
          var respostaProvas = await sync.getClient()
            .from("relatorio_provas_bimestrais")
            .select("aluno_relatorio_id,disciplina,bimestre,nota_prova,realizada_em,origem,nota_primeira,nota_recuperacao")
            .eq("scope_key", opcoes.scopeKey)
            .order("realizada_em", { ascending: true });
          if (respostaProvas.error) {
            console.warn("[Notas] não foi possível carregar as provas da Biblioteca.", respostaProvas.error);
          } else {
            var novasProvas = {};
            var novosDetalhes = {};
            (respostaProvas.data || []).forEach(function (linha) {
              if (linha.nota_prova === null) return;
              var chaveProva = linha.aluno_relatorio_id + "|" + disciplinaDoPainel(linha.disciplina) + "|" + linha.bimestre;
              novasProvas[chaveProva] = Number(linha.nota_prova);
              novosDetalhes[chaveProva] = {
                nota: Number(linha.nota_prova),
                primeira: linha.nota_primeira === null ? null : Number(linha.nota_primeira),
                recuperacao: linha.nota_recuperacao === null ? null : Number(linha.nota_recuperacao),
                origem: linha.origem,
                realizadaEm: linha.realizada_em
              };
            });
            provas = novasProvas;
            detalhesProvas = novosDetalhes;
          }
        }
        // Pontos do Ranking de Poder (Etapa 6), pelo vínculo exato do painel.
        if (opcoes.scopeKey) {
          var respostaPoder = await sync.getClient()
            .from("relatorio_poder_alunos")
            .select("aluno_relatorio_id,pontos,nivel,bonus_poder")
            .eq("scope_key", opcoes.scopeKey);
          if (respostaPoder.error) {
            console.warn("[Notas] não foi possível carregar o Ranking de Poder.", respostaPoder.error);
          } else {
            var novoPoder = {};
            (respostaPoder.data || []).forEach(function (linha) {
              novoPoder[linha.aluno_relatorio_id] = { pontos: Number(linha.pontos) || 0, nivel: linha.nivel, bonusPoder: !!linha.bonus_poder };
            });
            poder = novoPoder;
          }
        }
        carregado = true;
        if (typeof opcoes.aoAtualizar === "function") {
          try { opcoes.aoAtualizar(); } catch (error) { console.warn("[Notas] falha ao redesenhar", error); }
        }
      })();
      try {
        await carregando;
      } finally {
        carregando = null;
      }
    }

    // Nome primeiro (a numeração pode mudar entre listas); número como reserva.
    function obter(aluno, disciplina, bimestre) {
      if (!carregado || !aluno) return null;
      var chave = disciplina + "|" + bimestre;
      return porNome[normalizar(aluno.nome) + "|" + chave]
        || (opcoes.usarNumero !== false && aluno.numero != null ? porNumero[aluno.numero + "|" + chave] : null)
        || null;
    }

    // {nota, primeira, recuperacao, origem, realizadaEm} ou null.
    function obterProvaDetalhe(aluno, disciplina, bimestre) {
      if (!carregado || !aluno || aluno.id == null) return null;
      return detalhesProvas[aluno.id + "|" + disciplina + "|" + bimestre] || null;
    }

    // {pontos, nivel, bonusPoder} do Ranking de Poder, ou null.
    function obterPoder(aluno) {
      if (!carregado || !aluno || aluno.id == null) return null;
      return poder[aluno.id] || null;
    }

    function obterProva(aluno, disciplina, bimestre) {
      if (!carregado || !aluno || aluno.id == null) return null;
      var valor = provas[aluno.id + "|" + disciplina + "|" + bimestre];
      return valor === undefined ? null : valor;
    }

    carregar();
    window.setInterval(carregar, RECARREGAR_MS);
    window.addEventListener("focus", function () { carregar(); });

    return {
      carregar: carregar,
      obter: obter,
      obterProva: obterProva,
      obterProvaDetalhe: obterProvaDetalhe,
      obterPoder: obterPoder,
      pronto: function () { return carregado; }
    };
  }

  return { criar: criar };
})();
