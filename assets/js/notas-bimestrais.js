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
//     usarNumero: true   // false quando a turma do diário junta séries (Hermínio t23)
//   });
//   notas.obter({ nome, numero }, "Língua Portuguesa", "3") → linha ou null
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

    carregar();
    window.setInterval(carregar, RECARREGAR_MS);
    window.addEventListener("focus", function () { carregar(); });

    return {
      carregar: carregar,
      obter: obter,
      pronto: function () { return carregado; }
    };
  }

  return { criar: criar };
})();
