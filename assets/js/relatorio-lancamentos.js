// Publica os lançamentos do diário (aulas, presença, atividades e ocorrências)
// nas tabelas oficiais do Supabase, via relatorio_publicar_lancamentos.
//
// Cada página monta o retrato completo da escola (montarRetrato) com as mesmas
// regras que já usa para exibir presença e atividades. Este módulo só cuida de:
// esperar o login do admin, agrupar mudanças seguidas (debounce), não reenviar
// um retrato idêntico ao último e tentar de novo quando a rede falhar.
window.RelatorioLancamentos = (function () {
  var DEBOUNCE_MS = 4000;
  var RETRY_MS = 60000;

  function iniciar(options) {
    var escolaSlug = options.escolaSlug;
    var montarRetrato = options.montarRetrato;
    var timerId = null;
    var enviando = false;
    var pendente = false;
    var ultimaAssinatura = null;
    var storageKey = "relatorio_lancamentos_assinatura_" + escolaSlug;

    try { ultimaAssinatura = localStorage.getItem(storageKey); } catch (error) {}

    function assinatura(texto) {
      // djb2: só precisa detectar "mudou ou não", não é criptográfico.
      var hash = 5381;
      for (var i = 0; i < texto.length; i++) {
        hash = ((hash << 5) + hash + texto.charCodeAt(i)) | 0;
      }
      return texto.length + ":" + (hash >>> 0).toString(36);
    }

    async function publicarAgora() {
      var sync = window.RelatorioSupabaseSync;
      var client = sync && sync.getClient ? sync.getClient() : null;
      if (!client) return;
      if (enviando) {
        pendente = true;
        return;
      }

      await sync.auth.whenAuthorized();

      var retrato;
      try {
        retrato = montarRetrato();
      } catch (error) {
        console.error("[Lançamentos] falha ao montar o retrato de", escolaSlug, error);
        return;
      }
      if (!retrato || !Array.isArray(retrato.aulas) || !retrato.aulas.length) return;

      var texto = JSON.stringify(retrato);
      var assinaturaAtual = assinatura(texto);
      if (assinaturaAtual === ultimaAssinatura) return;

      enviando = true;
      try {
        var response = await client.rpc("relatorio_publicar_lancamentos", {
          p_escola_slug: escolaSlug,
          p_snapshot: retrato
        });
        if (response.error) {
          console.warn("[Lançamentos] publicação falhou; nova tentativa em 1 min.", response.error);
          window.setTimeout(function () { agendar("retry"); }, RETRY_MS);
          return;
        }
        ultimaAssinatura = assinaturaAtual;
        try { localStorage.setItem(storageKey, assinaturaAtual); } catch (error) {}
        var resumo = response.data || {};
        if (resumo.alunos_sem_vinculo && resumo.alunos_sem_vinculo.length) {
          console.info("[Lançamentos] alunos sem vínculo com a Biblioteca:", resumo.alunos_sem_vinculo);
        }
        if (resumo.remocao_aplicada === false) {
          console.info("[Lançamentos] retrato menor que o publicado; nenhuma aula marcada como removida.");
        }
      } catch (error) {
        console.warn("[Lançamentos] sem conexão; nova tentativa em 1 min.", error);
        window.setTimeout(function () { agendar("retry"); }, RETRY_MS);
      } finally {
        enviando = false;
        if (pendente) {
          pendente = false;
          agendar("pendente");
        }
      }
    }

    function agendar() {
      if (timerId) window.clearTimeout(timerId);
      timerId = window.setTimeout(function () {
        timerId = null;
        publicarAgora();
      }, DEBOUNCE_MS);
    }

    window.addEventListener("online", function () { agendar("online"); });

    return {
      agendar: agendar,
      publicarAgora: publicarAgora
    };
  }

  // Utilitários comuns às duas páginas.
  function dataIsoDoCodigo(codigo, ano) {
    var m = String(codigo || "").match(/-(\d{2})(\d{2})/);
    if (!m) return null;
    var mes = parseInt(m[1], 10);
    var dia = parseInt(m[2], 10);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    return (ano || 2026) + "-" + m[1] + "-" + m[2];
  }

  function textoLimpo(el, prefixo) {
    if (!el) return "";
    var texto = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (prefixo) texto = texto.replace(prefixo, "").trim();
    return texto;
  }

  var ICONES_POSITIVOS = /[✅⭐🌟👏🏆💪🎉]/u;
  // Textos de preenchimento que aparecem no lugar do nome em alguns relatos.
  var NOME_NAO_ALUNO = /^(nenhuma ocorr|sem ocorr|m[úu]ltiplos|alunos n[ãa]o identificad|turma toda|todos os alunos)/i;

  // Ocorrências (.oi) dentro de um relato. Uma linha por aluno citado.
  function coletarOcorrencias(container, info) {
    var itens = [];
    container.querySelectorAll(".oi").forEach(function (item) {
      var oa = item.querySelector(".oa");
      var od = item.querySelector(".od");
      if (!oa || !od) return;
      var texto = textoLimpo(od);
      if (!texto) return;
      var icone = textoLimpo(item.querySelector(".oi-ic"));
      String(oa.textContent || "").split("·").map(function (s) { return s.trim(); }).filter(function (nome) { return nome && !NOME_NAO_ALUNO.test(nome); }).forEach(function (nome) {
        itens.push({
          t: info.turma,
          r: info.relato || "",
          d: info.data,
          h: info.horario || "",
          disc: info.disciplina || "",
          nome: nome,
          n: info.resolverNumero ? info.resolverNumero(nome.replace(/\s*\([^)]*\)\s*/g, " ").trim()) : null,
          ic: icone,
          pos: ICONES_POSITIVOS.test(icone),
          txt: texto
        });
      });
    });
    return itens;
  }

  return {
    iniciar: iniciar,
    dataIsoDoCodigo: dataIsoDoCodigo,
    textoLimpo: textoLimpo,
    coletarOcorrencias: coletarOcorrencias
  };
})();
