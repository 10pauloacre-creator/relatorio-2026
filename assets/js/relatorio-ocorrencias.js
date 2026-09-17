// ═══════════════════════════════════════════════════════════════════════════
// Gravidade das ocorrências de comportamento (Etapa 4)
// ───────────────────────────────────────────────────────────────────────────
// Em cada ocorrência (.oi) dos relatos aparece um selo por aluno citado:
// "Leve · IA", "Médio ✓"… Tocar no selo abre as opções para confirmar a
// sugestão da IA ou escolher outra gravidade.
//
// A sugestão vem da Edge Function classificar-ocorrencias (repositório da
// Biblioteca), chamada sozinha quando há ocorrências publicadas sem gravidade.
// Decisão do professor: comportamento NÃO desconta nota; só fica registrado.
//
// Os selos são controles de tela (data-runtime-ui): o editor de layout os
// remove antes de salvar. Nada de querySelector dentro de laço por aluno:
// a página indexa as ocorrências do banco uma vez e varre os .oi uma vez.
// ═══════════════════════════════════════════════════════════════════════════
window.RelatorioOcorrencias = (function () {
  var ROTULOS = { leve: "Leve", medio: "Médio", grave: "Grave", muito_grave: "Muito grave" };
  var ORDEM = ["leve", "medio", "grave", "muito_grave"];
  var NOME_NAO_ALUNO = /^(nenhuma ocorr|sem ocorr|m[úu]ltiplos|alunos n[ãa]o identificad|turma toda|todos os alunos)/i;

  var CSS = ""
    + ".grav-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}"
    + ".grav-chip{display:inline-flex;align-items:center;gap:5px;min-height:30px;padding:3px 10px;border-radius:999px;"
    + "border:1px solid transparent;font:600 .74rem/1.2 inherit;font-family:inherit;cursor:pointer;background:#eef1ef;color:#374151}"
    + ".grav-chip:focus-visible{outline:3px solid rgba(45,97,71,.45);outline-offset:2px}"
    + ".grav-chip .grav-nome{font-weight:500;opacity:.8}"
    + ".grav-chip.leve{background:#e3f3ea;color:#1f5f3c;border-color:#b9dcc7}"
    + ".grav-chip.medio{background:#fdf1d8;color:#7a5305;border-color:#efd293}"
    + ".grav-chip.grave{background:#fde4d8;color:#8c3514;border-color:#f1b89d}"
    + ".grav-chip.muito_grave{background:#f9d4d4;color:#7d1414;border-color:#e59a9a}"
    + ".grav-chip.pendente{background:#f1f1f1;color:#6b6b6b;border-style:dashed;border-color:#c9c9c9}"
    + ".grav-chip.sugestao{border-style:dashed}"
    + ".grav-menu{position:fixed;z-index:2147482000;width:min(320px,calc(100vw - 24px));background:#fff;color:#1f2a24;border-radius:14px;"
    + "border:1px solid rgba(26,58,42,.18);box-shadow:0 18px 44px rgba(0,0,0,.22);padding:12px;font-family:inherit}"
    + ".grav-menu h4{margin:0 0 4px;font-size:.86rem}"
    + ".grav-menu p{margin:0 0 10px;font-size:.78rem;color:#5a5a5a;line-height:1.4}"
    + ".grav-opcoes{display:grid;grid-template-columns:1fr 1fr;gap:6px}"
    + ".grav-opcoes button,.grav-acoes button{min-height:40px;border-radius:10px;border:1px solid #d8ddd9;background:#f7f8f7;font:600 .8rem inherit;font-family:inherit;cursor:pointer}"
    + ".grav-opcoes button[aria-pressed=true]{outline:2px solid #2d6147;background:#e3f3ea}"
    + ".grav-acoes{display:flex;gap:6px;margin-top:8px}"
    + ".grav-acoes button{flex:1}"
    + ".grav-acoes .grav-confirmar{background:#2d6147;border-color:#2d6147;color:#fff}"
    + ".grav-erro{margin-top:8px;font-size:.76rem;color:#b54832}";

  function normalizar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .toLowerCase();
  }

  function escapeHtml(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function iniciar(opcoes) {
    var escolaSlug = opcoes.escolaSlug;
    var porChave = {};
    var porId = {};
    var timerId = null;
    var classificando = false;
    var ultimaClassificacao = 0;
    var menu = null;

    if (!document.getElementById("grav-style")) {
      var style = document.createElement("style");
      style.id = "grav-style";
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    function cliente() {
      var sync = window.RelatorioSupabaseSync;
      return sync && sync.getClient ? sync.getClient() : null;
    }

    function chave(relato, nome, texto) {
      return relato + "|" + normalizar(nome) + "|" + normalizar(texto);
    }

    async function carregar() {
      var client = cliente();
      if (!client) return false;
      await window.RelatorioSupabaseSync.auth.whenAuthorized();
      var resposta = await client
        .from("relatorio_ocorrencias")
        .select("id,relato_codigo,nome_relatorio,texto,positiva,gravidade,gravidade_origem,gravidade_confirmada,gravidade_justificativa,escolas!inner(slug)")
        .eq("escolas.slug", escolaSlug)
        .eq("removida", false);
      if (resposta.error) {
        console.warn("[Ocorrências] não foi possível carregar.", resposta.error);
        return false;
      }
      var novoPorChave = {};
      var novoPorId = {};
      (resposta.data || []).forEach(function (o) {
        novoPorChave[chave(o.relato_codigo || "", o.nome_relatorio, o.texto)] = o;
        novoPorId[o.id] = o;
      });
      porChave = novoPorChave;
      porId = novoPorId;
      return true;
    }

    function pendentes() {
      return Object.keys(porId).filter(function (id) {
        return !porId[id].positiva && !porId[id].gravidade;
      }).length;
    }

    // Pede à IA a gravidade das ocorrências ainda sem classificação.
    // No máximo 4 lotes por rodada e uma rodada a cada 2 minutos.
    async function classificarPendentes() {
      if (classificando || !pendentes() || Date.now() - ultimaClassificacao < 120000) return;
      var client = cliente();
      if (!client || !client.functions) return;
      classificando = true;
      ultimaClassificacao = Date.now();
      try {
        for (var rodada = 0; rodada < 4; rodada++) {
          var resposta = await client.functions.invoke("classificar-ocorrencias", { body: {} });
          if (resposta.error) {
            console.warn("[Ocorrências] a IA não classificou agora.", resposta.error);
            break;
          }
          var dados = resposta.data || {};
          if (!dados.talvezHajaMais || !dados.classificadas) break;
        }
        await carregar();
        decorar(document);
      } finally {
        classificando = false;
      }
    }

    function rotuloDoSelo(o) {
      if (!o) return { classe: "pendente", texto: "Sem registro" };
      if (!o.gravidade) return { classe: "pendente", texto: "Aguardando IA" };
      return {
        classe: o.gravidade + (o.gravidade_confirmada ? "" : " sugestao"),
        texto: ROTULOS[o.gravidade] + (o.gravidade_confirmada ? " ✓" : " · IA")
      };
    }

    function desenharSelo(botao, o, nome, varios) {
      var r = rotuloDoSelo(o);
      botao.className = "grav-chip " + r.classe;
      botao.innerHTML = (varios ? '<span class="grav-nome">' + escapeHtml(nome.split(" ")[0]) + "</span>" : "") + escapeHtml(r.texto);
      var descricao = o && o.gravidade
        ? "Gravidade " + ROTULOS[o.gravidade] + (o.gravidade_confirmada ? ", confirmada" : ", sugerida pela IA") + (o.gravidade_justificativa ? ": " + o.gravidade_justificativa : "")
        : "Gravidade ainda não classificada";
      botao.setAttribute("aria-label", (varios ? nome + ". " : "") + descricao);
      botao.title = descricao;
    }

    // Varre os .oi do escopo (documento inteiro ou um cartão) uma única vez.
    function decorar(escopo) {
      if (!Object.keys(porId).length) return;
      (escopo || document).querySelectorAll(".oi").forEach(function (item) {
        var pane = item.closest('.ipane[id^="r-"]');
        var oa = item.querySelector(".oa");
        var od = item.querySelector(".od");
        if (!pane || !oa || !od) return;
        var relato = pane.id.slice(2);
        var nomes = String(oa.textContent || "").split("·").map(function (s) { return s.trim(); })
          .filter(function (n) { return n && !NOME_NAO_ALUNO.test(n); });
        var registros = nomes.map(function (nome) { return { nome: nome, o: porChave[chave(relato, nome, od.textContent)] }; })
          .filter(function (r) { return r.o && !r.o.positiva; });
        var linha = item.querySelector('[data-runtime-ui="gravidade"]');
        if (!registros.length) {
          if (linha) linha.remove();
          return;
        }
        if (!linha) {
          linha = document.createElement("div");
          linha.className = "grav-row";
          linha.setAttribute("data-runtime-ui", "gravidade");
          od.insertAdjacentElement("afterend", linha);
        }
        linha.innerHTML = "";
        registros.forEach(function (r) {
          var botao = document.createElement("button");
          botao.type = "button";
          botao.setAttribute("aria-haspopup", "dialog");
          botao.setAttribute("data-ocorrencia-id", r.o.id);
          botao.setAttribute("data-nome", r.nome);
          desenharSelo(botao, r.o, r.nome, registros.length > 1);
          linha.appendChild(botao);
        });
      });
    }

    function fecharMenu(devolverFoco) {
      if (!menu) return;
      var origem = menu._origem;
      menu.remove();
      menu = null;
      if (devolverFoco && origem && document.contains(origem)) origem.focus();
    }

    function abrirMenu(botao) {
      fecharMenu(false);
      var o = porId[botao.getAttribute("data-ocorrencia-id")];
      if (!o) return;
      var nome = botao.getAttribute("data-nome") || "";
      menu = document.createElement("div");
      menu.className = "grav-menu";
      menu.setAttribute("role", "dialog");
      menu.setAttribute("aria-label", "Gravidade da ocorrência de " + nome);
      menu.setAttribute("data-runtime-ui", "gravidade-menu");
      menu._origem = botao;
      menu.innerHTML = "<h4>" + escapeHtml(nome) + "</h4>"
        + "<p>" + escapeHtml(o.texto) + "</p>"
        + (o.gravidade && !o.gravidade_confirmada
          ? "<p><strong>IA sugeriu " + escapeHtml(ROTULOS[o.gravidade]) + ":</strong> " + escapeHtml(o.gravidade_justificativa || "") + "</p>"
          : "")
        + '<div class="grav-opcoes" role="group" aria-label="Escolha a gravidade">'
        + ORDEM.map(function (g) {
          return '<button type="button" data-gravidade="' + g + '" aria-pressed="' + (o.gravidade === g ? "true" : "false") + '">' + ROTULOS[g] + "</button>";
        }).join("")
        + "</div>"
        + '<div class="grav-acoes">'
        + (o.gravidade && !o.gravidade_confirmada ? '<button type="button" class="grav-confirmar" data-gravidade="' + o.gravidade + '">Confirmar ' + ROTULOS[o.gravidade] + "</button>" : "")
        + '<button type="button" data-fechar="1">Fechar</button>'
        + "</div>"
        + '<div class="grav-erro" role="alert"></div>';
      document.body.appendChild(menu);

      var ret = botao.getBoundingClientRect();
      var largura = menu.offsetWidth;
      var altura = menu.offsetHeight;
      var esquerda = Math.min(Math.max(12, ret.left), window.innerWidth - largura - 12);
      var topo = ret.bottom + 6 + altura > window.innerHeight ? Math.max(12, ret.top - altura - 6) : ret.bottom + 6;
      menu.style.left = esquerda + "px";
      menu.style.top = topo + "px";
      var primeiro = menu.querySelector(".grav-confirmar") || menu.querySelector('[aria-pressed="true"]') || menu.querySelector("[data-gravidade]");
      if (primeiro) primeiro.focus();

      menu.addEventListener("click", async function (event) {
        if (event.target.closest("[data-fechar]")) { fecharMenu(true); return; }
        var escolha = event.target.closest("[data-gravidade]");
        if (!escolha) return;
        var gravidade = escolha.getAttribute("data-gravidade");
        menu.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
        var resposta = await cliente().rpc("relatorio_definir_gravidade", { p_id: o.id, p_gravidade: gravidade });
        if (resposta.error) {
          if (menu) {
            menu.querySelector(".grav-erro").textContent = "Não foi possível salvar agora. Verifique a internet e tente de novo.";
            menu.querySelectorAll("button").forEach(function (b) { b.disabled = false; });
          }
          return;
        }
        Object.assign(o, resposta.data || {});
        document.querySelectorAll('[data-ocorrencia-id="' + o.id + '"]').forEach(function (b) {
          desenharSelo(b, o, b.getAttribute("data-nome") || "", !!b.querySelector(".grav-nome"));
        });
        fecharMenu(true);
      });
    }

    document.addEventListener("click", function (event) {
      var selo = event.target.closest && event.target.closest(".grav-chip[data-ocorrencia-id]");
      if (selo) {
        event.stopPropagation();
        abrirMenu(selo);
        return;
      }
      if (menu && !menu.contains(event.target)) fecharMenu(false);
      // Abriu um cartão de relato: redecora só ele (o layout pode ter sido
      // restaurado e levado os selos embora).
      var cabecalho = event.target.closest && event.target.closest(".eh");
      if (cabecalho) {
        var cartao = cabecalho.closest(".ea");
        if (cartao) window.setTimeout(function () { decorar(cartao); }, 0);
      }
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu) fecharMenu(true);
    });

    async function atualizar() {
      if (await carregar()) {
        decorar(document);
        classificarPendentes();
      }
    }

    function agendar(atrasoMs) {
      if (timerId) window.clearTimeout(timerId);
      timerId = window.setTimeout(function () {
        timerId = null;
        atualizar();
      }, typeof atrasoMs === "number" ? atrasoMs : 9000);
    }

    return { agendar: agendar, atualizar: atualizar, decorar: decorar };
  }

  return { iniciar: iniciar };
})();
