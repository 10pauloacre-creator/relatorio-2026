// ═══════════════════════════════════════════════════════════════════════════
// Alunos novos da Biblioteca nas listas do Relatório (Etapa 5B)
// ───────────────────────────────────────────────────────────────────────────
// As listas do diário (ALUNOS, ALUNOS_RH) e dos painéis são fixas no HTML.
// Aluno cadastrado na Biblioteca numa turma do Relatório e ausente dessas
// listas é registrado no banco (relatorio_alunos_adicionados, por gatilho) e
// este módulo o acrescenta no fim da lista, com o próximo número livre.
//
// - Carregado SEM defer antes das listas: completa com o que está guardado no
//   aparelho, de forma síncrona. Depois do login confere o banco; se a lista
//   mudou, guarda e recarrega a página uma vez.
// - Numeração estável: ordem de registro no banco, depois do maior número da
//   lista fixa. Quem já está na lista fixa (mesmo nome) é ignorado.
// - "de" (desde): aulas anteriores à entrada não contam para o aluno.
// ═══════════════════════════════════════════════════════════════════════════
window.RelatorioAlunosAdicionados = (function () {
  var ACENTOS = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g");
  var CONECTORES = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1 };

  function normalizar(nome) {
    return String(nome || "").normalize("NFD").replace(ACENTOS, "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  // "ALYCE SILVEIRA BRAGA SANTIAGO" → "Alyce Silveira Braga Santiago"
  function nomeBonito(nome) {
    var texto = String(nome || "").replace(/\s+/g, " ").trim();
    if (texto !== texto.toUpperCase()) return texto;
    return texto.toLowerCase().split(" ").map(function (parte, i) {
      return i > 0 && CONECTORES[parte] ? parte : parte.charAt(0).toUpperCase() + parte.slice(1);
    }).join(" ");
  }

  function chaveCache(escolaSlug) {
    return "relatorio_alunos_adicionados_" + escolaSlug;
  }

  function lista(escolaSlug) {
    try {
      var dados = JSON.parse(localStorage.getItem(chaveCache(escolaSlug)) || "[]");
      return Array.isArray(dados) ? dados : [];
    } catch (error) {
      return [];
    }
  }

  // Diário: alunosPorTurma = ALUNOS / ALUNOS_RH ({t2:[{n,nm,tr}]}).
  function completarDiario(escolaSlug, alunosPorTurma) {
    var porTurma = {};
    lista(escolaSlug).forEach(function (linha) {
      (porTurma[linha.turma_codigo] = porTurma[linha.turma_codigo] || []).push(linha);
    });
    Object.keys(porTurma).forEach(function (turma) {
      var alunos = alunosPorTurma[turma];
      if (!Array.isArray(alunos)) return;
      var nomes = {};
      var maior = 0;
      alunos.forEach(function (a) {
        nomes[normalizar(a.nm)] = true;
        maior = Math.max(maior, Number(a.n) || 0);
      });
      porTurma[turma].forEach(function (linha) {
        if (nomes[normalizar(linha.nome)]) return;
        maior += 1;
        nomes[normalizar(linha.nome)] = true;
        alunos.push({ n: maior, nm: nomeBonito(linha.nome), de: linha.desde, bib: true });
      });
    });
    return alunosPorTurma;
  }

  // Painel: students = [{id, numero, nome, ...}] do painel scopeKey.
  function completarPainel(escolaSlug, scopeKey, students) {
    var saida = (students || []).slice();
    var nomes = {};
    var maiorId = 0;
    var maiorNumero = 0;
    saida.forEach(function (s) {
      nomes[normalizar(s.nome)] = true;
      maiorId = Math.max(maiorId, Number(s.id) || 0);
      maiorNumero = Math.max(maiorNumero, Number(s.numero) || 0);
    });
    lista(escolaSlug).forEach(function (linha) {
      if (linha.scope_key !== scopeKey || nomes[normalizar(linha.nome)]) return;
      nomes[normalizar(linha.nome)] = true;
      maiorId += 1;
      maiorNumero += 1;
      saida.push({ id: maiorId, numero: maiorNumero, nome: nomeBonito(linha.nome), desde: linha.desde, adicionadoBiblioteca: true });
    });
    return saida;
  }

  // Aula (data AAAA-MM-DD ou código com MMDD) antes da entrada do aluno.
  function foraDaAula(aluno, dataOuCodigo) {
    if (!aluno || !aluno.de) return false;
    var texto = String(dataOuCodigo || "");
    var iso = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
    if (!iso) {
      var m = texto.match(/-(\d{2})(\d{2})/) || texto.match(/^(\d{2})(\d{2})$/);
      if (m) iso = "2026-" + m[1] + "-" + m[2];
    }
    return !!iso && iso < aluno.de;
  }

  function rotuloEntrada(aluno) {
    var partes = String(aluno && aluno.de || "").split("-");
    return partes.length === 3 ? "Entrou " + partes[2] + "/" + partes[1] : "Entrou depois";
  }

  // Confere o banco depois do login do professor.
  function atualizar(escolaSlug) {
    function tentar(vezes) {
      var sync = window.RelatorioSupabaseSync;
      var client = sync && sync.getClient ? sync.getClient() : null;
      if (!client) {
        if (vezes < 40) window.setTimeout(function () { tentar(vezes + 1); }, 500);
        return;
      }
      sync.auth.whenAuthorized().then(function () {
        return client.rpc("relatorio_alunos_adicionados_da_escola", { p_escola_slug: escolaSlug });
      }).then(function (resposta) {
        if (!resposta || resposta.error) return;
        var novo = JSON.stringify((resposta.data || []).map(function (l) {
          return { turma_codigo: l.turma_codigo, scope_key: l.scope_key, nome: l.nome, desde: l.desde, aluno_id: l.aluno_id };
        }));
        var atual = JSON.stringify(lista(escolaSlug));
        if (novo === atual) return;
        try { localStorage.setItem(chaveCache(escolaSlug), novo); } catch (error) { return; }
        var marca = "relatorio_alunos_recarregou_" + escolaSlug;
        try {
          if (sessionStorage.getItem(marca) === novo) return;
          sessionStorage.setItem(marca, novo);
        } catch (error) {}
        window.location.reload();
      }).catch(function (error) {
        console.warn("[Alunos] não foi possível conferir alunos novos.", error);
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { tentar(0); });
    } else {
      tentar(0);
    }
  }

  return {
    lista: lista,
    completarDiario: completarDiario,
    completarPainel: completarPainel,
    foraDaAula: foraDaAula,
    rotuloEntrada: rotuloEntrada,
    nomeBonito: nomeBonito,
    atualizar: atualizar
  };
})();
