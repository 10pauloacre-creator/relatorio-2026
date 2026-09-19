// ═══════════════════════════════════════════════════════════════════════════
// Regras extras nos painéis da Hermínio (Etapa 8E)
// ───────────────────────────────────────────────────────────────────────────
// Os painéis da E.E. Raimundo Hermínio de Melo têm cálculo próprio (sem o
// motor boletim-regras.js). Este módulo leva a eles as duas regras que o
// professor ligou na escola em 18/09/2026, com os mesmos dados do banco:
//   • desconto por comportamento: leve 0,25 · médio 0,5 · grave 1,0 · muito
//     grave 2,0 na nota do bimestre da disciplina, até 2,0 (view
//     relatorio_descontos_conduta, já somada e limitada);
//   • bônus do Ranking de Poder na média final (+N÷4 do nível, via
//     BoletimRegras.nivelPoder e view relatorio_poder_alunos).
//   • prova da Biblioteca (Etapa 9C, decisão de 19/09/2026): quando o aluno fez
//     a Avaliação Bimestral no livro, a nota de prova do bimestre é a dele,
//     mesmo que já houvesse nota lançada; sem prova feita, fica a manual
//     (view relatorio_provas_bimestrais; o painel grava com aplicarProvas).
// Só o professor logado lê essas views. Recarrega a cada minuto e ao voltar
// para a página.
// ═══════════════════════════════════════════════════════════════════════════
window.HerminioRegrasExtras = (function () {
  var ACENTOS = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g");
  // Mesma chave de relatorio_disciplina_chave() no banco.
  var SINONIMOS = {
    "lingua inglesa": "ingles",
    "lingua espanhola": "espanhol",
    "artes": "arte",
    "trilhas de ciencias humanas": "trilhas de c. humanas"
  };

  function chave(nome) {
    var n = String(nome || "").normalize("NFD").replace(ACENTOS, "").replace(/\s+/g, " ").trim().toLowerCase();
    return SINONIMOS[n] || n;
  }

  function criar(opcoes) {
    var descontos = {};
    var poder = {};
    var provas = {};
    var carregado = false;
    var carregando = false;

    async function carregar() {
      var sync = window.RelatorioSupabaseSync;
      var client = sync && sync.getClient ? sync.getClient() : null;
      if (!client || carregando) return false;
      carregando = true;
      try {
        await sync.auth.whenAuthorized();
        var respostas = await Promise.all([
          client.from("relatorio_descontos_conduta")
            .select("aluno_relatorio_id,disciplina,bimestre,pontos,ocorrencias,regra_ligada")
            .eq("scope_key", opcoes.scopeKey),
          client.from("relatorio_poder_alunos")
            .select("aluno_relatorio_id,pontos,bonus_poder")
            .eq("scope_key", opcoes.scopeKey),
          client.from("relatorio_provas_bimestrais")
            .select("aluno_relatorio_id,disciplina,bimestre,nota_prova")
            .eq("scope_key", opcoes.scopeKey)
        ]);
        var falha = respostas.filter(function (r) { return r.error; })[0];
        if (falha) {
          console.warn("[Regras Hermínio] não foi possível carregar.", falha.error);
          return false;
        }
        var novasProvas = {};
        (respostas[2].data || []).forEach(function (l) {
          if (l.nota_prova === null || l.nota_prova === undefined) return;
          novasProvas[l.aluno_relatorio_id + "|" + chave(l.disciplina) + "|" + l.bimestre] = Number(l.nota_prova);
        });
        var novosDescontos = {};
        (respostas[0].data || []).forEach(function (l) {
          if (!l.regra_ligada) return;
          novosDescontos[l.aluno_relatorio_id + "|" + chave(l.disciplina) + "|" + l.bimestre] = {
            pontos: Number(l.pontos) || 0, ocorrencias: Number(l.ocorrencias) || 0
          };
        });
        var novoPoder = {};
        (respostas[1].data || []).forEach(function (l) {
          if (l.bonus_poder) novoPoder[l.aluno_relatorio_id] = Number(l.pontos) || 0;
        });
        descontos = novosDescontos;
        poder = novoPoder;
        provas = novasProvas;
        carregado = true;
        if (typeof opcoes.aoAtualizar === "function") {
          try { opcoes.aoAtualizar(); } catch (erro) { console.warn("[Regras Hermínio] falha ao redesenhar", erro); }
        }
        return true;
      } catch (erro) {
        console.warn("[Regras Hermínio] sem conexão.", erro);
        return false;
      } finally {
        carregando = false;
      }
    }

    function registroDesconto(student, disciplina, bim) {
      if (!carregado || !student) return null;
      return descontos[student.id + "|" + chave(disciplina) + "|" + bim] || null;
    }

    function tentar(vezes) {
      carregar().then(function (ok) {
        if (!ok && vezes < 40) window.setTimeout(function () { tentar(vezes + 1); }, 1500);
      });
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { tentar(0); });
    } else {
      window.setTimeout(function () { tentar(0); }, 0);
    }
    window.setInterval(carregar, 60000);
    window.addEventListener("focus", function () { carregar(); });

    return {
      /** Pontos tirados pelo comportamento na nota do bimestre (0 se nenhum). */
      desconto: function (student, disciplina, bim) {
        var r = registroDesconto(student, disciplina, bim);
        return r ? r.pontos : 0;
      },
      ocorrencias: function (student, disciplina, bim) {
        var r = registroDesconto(student, disciplina, bim);
        return r ? r.ocorrencias : 0;
      },
      /** {pontos, nome, bonusMedia...} do Ranking de Poder, ou null. */
      poder: function (student) {
        if (!carregado || !student || poder[student.id] === undefined || !window.BoletimRegras) return null;
        return window.BoletimRegras.nivelPoder(poder[student.id]);
      },
      bonusMedia: function (student) {
        var nivel = this.poder(student);
        return nivel ? nivel.bonusMedia : 0;
      },
      /** Nota (0 a 10) da prova feita na Biblioteca, ou null. */
      provaBiblioteca: function (student, disciplina, bim) {
        if (!carregado || !student) return null;
        var nota = provas[student.id + "|" + chave(disciplina) + "|" + bim];
        return nota === undefined ? null : nota;
      },
      /**
       * Grava a prova da Biblioteca no campo de prova (escala 0–5 do painel)
       * de cada aluno que fez a prova. Devolve quantas notas mudaram.
       * celula(student, disciplina, bim) → objeto do bimestre com .prova.
       */
      aplicarProvas: function (alunos, disciplinas, celula) {
        if (!carregado) return 0;
        var self = this;
        var mudou = 0;
        (alunos || []).forEach(function (student) {
          (disciplinas || []).forEach(function (disciplina) {
            ["1", "2", "3", "4"].forEach(function (bim) {
              var nota = self.provaBiblioteca(student, disciplina, bim);
              if (nota === null) return;
              var alvo = Math.round(nota * 50) / 100;
              var cel = celula(student, disciplina, bim);
              if (!cel || Number(cel.prova) === alvo && cel.prova !== "") return;
              cel.prova = alvo;
              mudou += 1;
            });
          });
        });
        return mudou;
      },
      pronto: function () { return carregado; }
    };
  }

  return { criar: criar, chave: chave };
})();
