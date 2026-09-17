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
    var aoPublicar = typeof options.aoPublicar === "function" ? options.aoPublicar : null;
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
        if (aoPublicar) {
          try { aoPublicar(resumo); } catch (error) { console.warn("[Lançamentos] aoPublicar falhou", error); }
        }
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

  // ── Interruptor "vale ponto" na aba 📝 Atividades ─────────────────────────
  // Inserido só quando a aba é aberta (nada de varrer centenas de relatos).
  // Marcado com data-runtime-ui: o editor de layout remove antes de salvar.
  var VP_CSS = ""
    + ".vp-box{display:flex;align-items:center;gap:12px;margin:0 0 12px;padding:10px 12px;border-radius:12px;"
    + "border:1px solid rgba(26,58,42,.18);background:rgba(26,58,42,.05);font-family:inherit}"
    + ".vp-box.off{background:rgba(120,120,120,.08);border-color:rgba(120,120,120,.25)}"
    + ".vp-switch{position:relative;flex:0 0 auto;width:46px;height:26px;cursor:pointer}"
    + ".vp-switch input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}"
    + ".vp-track{position:absolute;inset:0;border-radius:999px;background:#b9c2bd;transition:background .18s ease}"
    + ".vp-track::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;"
    + "box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .18s ease}"
    + ".vp-switch input:checked+.vp-track{background:#2d6147}"
    + ".vp-switch input:checked+.vp-track::after{transform:translateX(20px)}"
    + ".vp-switch input:focus-visible+.vp-track{outline:3px solid rgba(45,97,71,.4);outline-offset:2px}"
    + ".vp-txt{display:flex;flex-direction:column;gap:2px;min-width:0}"
    + ".vp-txt strong{font-size:.86rem;color:#1a3a2a}"
    + ".vp-box.off .vp-txt strong{color:#5a5a5a}"
    + ".vp-txt span{font-size:.76rem;color:#5a5a5a;line-height:1.35}";

  function instalarInterruptorValePonto(opcoes) {
    if (!document.getElementById("vp-style")) {
      var style = document.createElement("style");
      style.id = "vp-style";
      style.textContent = VP_CSS;
      document.head.appendChild(style);
    }

    function atualizar(box, valendo) {
      box.classList.toggle("off", !valendo);
      var input = box.querySelector("input");
      input.checked = valendo;
      input.setAttribute("aria-checked", valendo ? "true" : "false");
      box.querySelector(".vp-txt strong").textContent = valendo ? "⭐ Vale ponto na nota de trabalho" : "Não vale ponto";
      box.querySelector(".vp-txt span").textContent = valendo
        ? "Os 10 pontos de trabalho do bimestre são divididos entre as atividades que valem ponto."
        : "Esta atividade continua registrada, mas não entra no cálculo da nota de trabalho.";
    }

    function montar(pane) {
      if (!pane || !/^a-t/.test(pane.id)) return;
      var codigo = pane.id.slice(2);
      var box = pane.querySelector('[data-runtime-ui="vale-ponto"]');
      if (!box) {
        box = document.createElement("div");
        box.className = "vp-box";
        box.setAttribute("data-runtime-ui", "vale-ponto");
        box.innerHTML = '<label class="vp-switch"><input type="checkbox" role="switch" aria-label="Atividade vale ponto na nota de trabalho"><span class="vp-track"></span></label>'
          + '<div class="vp-txt"><strong></strong><span></span></div>';
        box.querySelector("input").addEventListener("change", function (event) {
          var valendo = !!event.target.checked;
          atualizar(box, valendo);
          opcoes.definir(codigo, valendo);
        });
        pane.insertBefore(box, pane.firstChild);
      }
      atualizar(box, opcoes.estaValendo(codigo));
    }

    document.addEventListener("click", function (event) {
      var botao = event.target && event.target.closest ? event.target.closest(".itab") : null;
      if (!botao) return;
      var alvo = String(botao.getAttribute("onclick") || "").match(/'(a-t[^']+)'/);
      if (!alvo) return;
      window.setTimeout(function () { montar(document.getElementById(alvo[1])); }, 0);
    });

    // Abas de atividade que já estiverem abertas (ex.: após restaurar layout).
    document.querySelectorAll('.ipane.on[id^="a-t"]').forEach(montar);

    return { montar: montar };
  }

  return {
    iniciar: iniciar,
    dataIsoDoCodigo: dataIsoDoCodigo,
    textoLimpo: textoLimpo,
    coletarOcorrencias: coletarOcorrencias,
    instalarInterruptorValePonto: instalarInterruptorValePonto
  };
})();
