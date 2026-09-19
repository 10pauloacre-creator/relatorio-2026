// ═══════════════════════════════════════════════════════════════════════════
// Conduta nos relatos: gravidade das ocorrências e Observações (Etapas 4 e 4B)
// ───────────────────────────────────────────────────────────────────────────
// 1. Em cada ocorrência (.oi) aparece um selo por aluno com a gravidade
//    ESTABELECIDA pela IA (sem confirmação, decisão do professor em 17/09).
//    Tocar no selo mostra a justificativa e permite trocar.
//
// 2. Em cada relato aberto aparece "📝 Observações": o professor escreve o
//    fato, ajusta o horário (padrão: agora) e envia. A Edge Function
//    classificar-ocorrencias identifica os alunos, cria uma tag por envolvido
//    e classifica a conduta. Tudo fica no banco (relatorio_observacoes e
//    relatorio_ocorrencias), ligado ao aluno para o relatório individual.
//    A IA também roda sozinha no servidor (pg_cron), com a página fechada.
//
// Comportamento desconta na nota do bimestre (Etapa 8B: leve 0,25 · médio
// 0,5 · grave 1,0 · muito grave 2,0, até 2,0). Tudo aqui é data-runtime-ui: o editor de
// layout remove antes de salvar. Nada de querySelector dentro de laço por
// aluno: os dados do banco são indexados uma vez.
// ═══════════════════════════════════════════════════════════════════════════
window.RelatorioOcorrencias = (function () {
  var ROTULOS = { leve: "Leve", medio: "Médio", grave: "Grave", muito_grave: "Muito grave", sem_infracao: "Sem infração" };
  var ORDEM = ["leve", "medio", "grave", "muito_grave", "sem_infracao"];
  var PAPEIS = { autor: "", vitima: "vítima", testemunha: "testemunha", envolvido: "envolvido", destaque: "⭐ destaque" };
  var INTERFERENCIA = { nenhuma: "nenhuma", baixa: "baixa", moderada: "moderada", alta: "alta" };
  var CONTEXTO = [
    ["comportamento_observado", "Comportamento"], ["orientacao_professor", "Orientação dada"],
    ["reacao_aluno", "Reação do aluno"], ["impacto_aula", "Impacto na aula"],
    ["testemunhas", "Testemunhas"], ["providencia", "Providência"]
  ];
  var NOME_NAO_ALUNO = /^(nenhuma ocorr|sem ocorr|m[úu]ltiplos|alunos n[ãa]o identificad|turma toda|todos os alunos)/i;
  var ACENTOS = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g");
  var COLUNAS = "id,relato_codigo,nome_relatorio,numero_chamada,texto,positiva,gravidade,gravidade_origem,gravidade_justificativa,"
    + "origem,observacao_id,papel,categoria,nivel_base,interferencia,sem_infracao,fraude_academica,reincidencia_anteriores,"
    + "reincidencia_aplicada,contexto,classificada_em,ia_tentativas";

  var CSS = ""
    + ".grav-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}"
    + ".grav-chip{display:inline-flex;align-items:center;gap:5px;min-height:30px;padding:3px 10px;border-radius:999px;"
    + "border:1px solid transparent;font-weight:600;font-size:.74rem;line-height:1.2;font-family:inherit;cursor:pointer;background:#eef1ef;color:#374151}"
    + ".grav-chip:focus-visible{outline:3px solid rgba(45,97,71,.45);outline-offset:2px}"
    + ".grav-chip .grav-nome{font-weight:500;opacity:.85}"
    + ".grav-chip.leve{background:#e3f3ea;color:#1f5f3c;border-color:#b9dcc7}"
    + ".grav-chip.medio{background:#fdf1d8;color:#7a5305;border-color:#efd293}"
    + ".grav-chip.grave{background:#fde4d8;color:#8c3514;border-color:#f1b89d}"
    + ".grav-chip.muito_grave{background:#f9d4d4;color:#7d1414;border-color:#e59a9a}"
    + ".grav-chip.sem_infracao,.grav-chip.papel{background:#eef1f5;color:#3f4a5a;border-color:#cfd6df}"
    + ".grav-chip.destaque{background:#fff5d6;color:#6b5205;border-color:#ecd48a}"
    + ".grav-chip.pendente{background:#f1f1f1;color:#6b6b6b;border-style:dashed;border-color:#c9c9c9}"
    + ".grav-chip.desconhecido{border-style:dashed}"
    + ".grav-menu{position:fixed;z-index:2147482000;width:min(340px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;background:#fff;color:#1f2a24;border-radius:14px;"
    + "border:1px solid rgba(26,58,42,.18);box-shadow:0 18px 44px rgba(0,0,0,.22);padding:12px;font-family:inherit}"
    + ".grav-menu h4{margin:0 0 4px;font-size:.86rem}"
    + ".grav-menu p{margin:0 0 8px;font-size:.78rem;color:#4a4a4a;line-height:1.4}"
    + ".grav-menu dl{margin:0 0 10px;font-size:.76rem;display:grid;grid-template-columns:auto 1fr;gap:3px 8px}"
    + ".grav-menu dt{color:#6b6b6b}.grav-menu dd{margin:0}"
    + ".grav-opcoes{display:grid;grid-template-columns:1fr 1fr;gap:6px}"
    + ".grav-opcoes button,.grav-acoes button{min-height:40px;border-radius:10px;border:1px solid #d8ddd9;background:#f7f8f7;font-weight:600;font-size:.8rem;font-family:inherit;cursor:pointer;color:#1f2a24}"
    + ".grav-opcoes button[aria-pressed=true]{outline:2px solid #2d6147;background:#e3f3ea}"
    + ".grav-acoes{display:flex;gap:6px;margin-top:8px}.grav-acoes button{flex:1}"
    + ".grav-erro{margin-top:8px;font-size:.76rem;color:#b54832}"
    + ".obs-box{margin:14px 0 4px;padding:12px;border-radius:12px;border:1px solid rgba(26,58,42,.16);background:rgba(26,58,42,.04);font-family:inherit}"
    + ".obs-topo{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}"
    + ".obs-topo strong{font-size:.88rem;color:#1a3a2a}"
    + ".obs-btn{min-height:40px;padding:0 14px;border-radius:10px;border:1px solid #2d6147;background:#2d6147;color:#fff;font-weight:600;font-size:.8rem;font-family:inherit;cursor:pointer}"
    + ".obs-btn.sec{background:transparent;color:#2d6147}"
    + ".obs-btn:disabled{opacity:.6;cursor:default}"
    + ".obs-form{display:grid;gap:8px;margin-top:10px}"
    + ".obs-form label{font-size:.76rem;font-weight:600;color:#3f4a44}"
    + ".obs-form textarea{width:100%;box-sizing:border-box;min-height:96px;padding:10px;border-radius:10px;border:1px solid #cfd6d1;font:inherit;font-size:.86rem;resize:vertical;background:#fff;color:#1f2a24}"
    + ".obs-hora{display:flex;align-items:center;gap:8px;flex-wrap:wrap}"
    + ".obs-hora input{min-height:40px;padding:0 10px;border-radius:10px;border:1px solid #cfd6d1;font:inherit;font-size:.9rem;background:#fff;color:#1f2a24}"
    + ".obs-acoes{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}"
    + ".obs-lista{display:grid;gap:8px;margin-top:10px}"
    + ".obs-item{padding:10px;border-radius:10px;background:#fff;border:1px solid #e1e6e2}"
    + ".obs-meta{display:flex;justify-content:space-between;gap:8px;font-size:.72rem;color:#5f6b64;margin-bottom:4px}"
    + ".obs-texto{font-size:.84rem;line-height:1.45;color:#1f2a24;white-space:pre-wrap}"
    + ".obs-status{font-size:.74rem;color:#5f6b64;margin-top:6px}"
    + ".obs-aviso{font-size:.74rem;color:#8a5a00;margin-top:6px}"
    + ".obs-remover{border:0;background:transparent;color:#8c3514;cursor:pointer;font-size:.72rem;font-family:inherit;min-height:32px;padding:0 6px}"
    + ".obs-vazio{font-size:.76rem;color:#6b6b6b;margin-top:8px}";

  function normalizar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(ACENTOS, "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .toLowerCase();
  }

  function escapeHtml(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function horaAgora() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function iniciar(opcoes) {
    // Página de arquivo de um ano encerrado: só leitura.
    if (document.documentElement.hasAttribute("data-arquivo-ate")) {
      return { agendar: function () {}, atualizar: function () { return Promise.resolve(); }, decorar: function () {} };
    }
    var escolaSlug = opcoes.escolaSlug;
    // infoRelato(pane) → {turma, relato, data (AAAA-MM-DD), disciplina}
    var infoRelato = typeof opcoes.infoRelato === "function" ? opcoes.infoRelato : null;
    var porChave = {};      // ocorrências dos .oi
    var porId = {};
    var porObservacao = {}; // tags de cada observação
    var obsPorRelato = {};
    var timerId = null;
    var acompanhando = null;
    var classificando = false;
    var menu = null;
    var carregado = false;

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
      var respostas = await Promise.all([
        client.from("relatorio_ocorrencias").select(COLUNAS + ",escolas!inner(slug)")
          .eq("escolas.slug", escolaSlug).eq("removida", false),
        client.from("relatorio_observacoes")
          .select("id,relato_codigo,turma_codigo,data,horario,texto,status,resumo,aviso,erro,ia_tentativas,criada_em,escolas!inner(slug)")
          .eq("escolas.slug", escolaSlug).eq("removida", false).order("criada_em", { ascending: true })
      ]);
      if (respostas[0].error || respostas[1].error) {
        console.warn("[Ocorrências] não foi possível carregar.", respostas[0].error || respostas[1].error);
        return false;
      }
      var novoPorChave = {}, novoPorId = {}, novoPorObs = {}, novoObs = {};
      (respostas[0].data || []).forEach(function (o) {
        novoPorId[o.id] = o;
        if (o.origem === "observacao") (novoPorObs[o.observacao_id] = novoPorObs[o.observacao_id] || []).push(o);
        else novoPorChave[chave(o.relato_codigo || "", o.nome_relatorio, o.texto)] = o;
      });
      (respostas[1].data || []).forEach(function (obs) {
        (novoObs[obs.relato_codigo || ""] = novoObs[obs.relato_codigo || ""] || []).push(obs);
      });
      porChave = novoPorChave;
      porId = novoPorId;
      porObservacao = novoPorObs;
      obsPorRelato = novoObs;
      carregado = true;
      return true;
    }

    function haTrabalhoDaIA() {
      var ids = Object.keys(porId);
      for (var i = 0; i < ids.length; i++) {
        var o = porId[ids[i]];
        if (o.origem === "relato" && o.papel === "autor" && !o.positiva && !o.gravidade && !o.sem_infracao && o.ia_tentativas < 5) return true;
      }
      return Object.keys(obsPorRelato).some(function (r) {
        return obsPorRelato[r].some(function (obs) { return obs.status === "pendente" || obs.status === "processando"; });
      });
    }

    // Pede à IA agora (o servidor também processa sozinho a cada minuto).
    async function acionarIA() {
      if (classificando) return;
      var client = cliente();
      if (!client || !client.functions) return;
      classificando = true;
      try {
        var resposta = await client.functions.invoke("classificar-ocorrencias", { body: { origem: "pagina" } });
        if (resposta.error) console.warn("[Ocorrências] a IA não respondeu agora; o servidor tenta de novo.", resposta.error);
      } catch (error) {
        console.warn("[Ocorrências] sem conexão com a IA.", error);
      } finally {
        classificando = false;
      }
      await atualizarTela();
    }

    async function atualizarTela() {
      if (!(await carregar())) return;
      decorar(document);
      // Enquanto houver algo na fila, confere de novo em 20s.
      if (acompanhando) window.clearTimeout(acompanhando);
      acompanhando = haTrabalhoDaIA() ? window.setTimeout(atualizarTela, 20000) : null;
    }

    // ── Selos ────────────────────────────────────────────────────────────
    function rotuloDoSelo(o) {
      if (!o) return { classe: "pendente", texto: "Sem registro" };
      if (o.papel && o.papel !== "autor") {
        return { classe: o.papel === "destaque" ? "destaque" : "papel", texto: PAPEIS[o.papel] };
      }
      if (o.sem_infracao) return { classe: "sem_infracao", texto: "Sem infração" + (o.gravidade_origem === "professor" ? " ✓" : "") };
      if (!o.gravidade) return { classe: "pendente", texto: o.ia_tentativas >= 5 ? "IA sem resposta" : "IA analisando…" };
      return {
        classe: o.gravidade,
        texto: ROTULOS[o.gravidade] + (o.reincidencia_aplicada ? " ↑" : "") + (o.gravidade_origem === "professor" ? " ✓" : "")
      };
    }

    function desenharSelo(botao, o, nome, comNome) {
      var r = rotuloDoSelo(o);
      botao.className = "grav-chip " + r.classe + (o && o.origem === "observacao" && !o.numero_chamada ? " desconhecido" : "");
      var nomeCurto = String(nome || "").split(" ").slice(0, 2).join(" ");
      botao.innerHTML = (comNome ? '<span class="grav-nome">' + escapeHtml(nomeCurto) + (o && o.origem === "observacao" && !o.numero_chamada ? " ?" : "") + "</span>" : "")
        + escapeHtml(r.texto);
      var descricao = o && o.gravidade
        ? "Gravidade " + ROTULOS[o.gravidade] + (o.gravidade_origem === "professor" ? ", definida pelo professor" : ", definida pela IA")
          + (o.gravidade_justificativa ? ": " + o.gravidade_justificativa : "")
        : r.texto;
      botao.setAttribute("aria-label", (comNome ? nome + ". " : "") + descricao);
      botao.title = descricao;
    }

    function criarSelo(o, nome, comNome) {
      var botao = document.createElement("button");
      botao.type = "button";
      botao.setAttribute("aria-haspopup", "dialog");
      botao.setAttribute("data-ocorrencia-id", o.id);
      botao.setAttribute("data-nome", nome);
      desenharSelo(botao, o, nome, comNome);
      return botao;
    }

    function decorarOcorrencias(escopo) {
      escopo.querySelectorAll(".oi").forEach(function (item) {
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
        registros.forEach(function (r) { linha.appendChild(criarSelo(r.o, r.nome, registros.length > 1)); });
      });
    }

    // ── Observações ──────────────────────────────────────────────────────
    function statusDaObservacao(obs, tags) {
      if (obs.status === "concluida") return tags.length ? "" : "Análise concluída sem alunos identificados.";
      if (obs.status === "erro") return "A IA não conseguiu analisar depois de várias tentativas. Remova e envie de novo.";
      return "IA identificando alunos e gravidade…";
    }

    function renderObservacao(obs) {
      var tags = (porObservacao[obs.id] || []).slice().sort(function (a, b) {
        return (a.papel === "autor" ? 0 : 1) - (b.papel === "autor" ? 0 : 1) || String(a.nome_relatorio).localeCompare(String(b.nome_relatorio));
      });
      var item = document.createElement("article");
      item.className = "obs-item";
      item.setAttribute("data-observacao-id", obs.id);
      var dataBr = String(obs.data || "").split("-").reverse().join("/");
      item.innerHTML = '<div class="obs-meta"><span>🕒 ' + escapeHtml(obs.horario || "--:--") + " · " + escapeHtml(dataBr) + "</span>"
        + '<button type="button" class="obs-remover" data-remover-observacao="' + obs.id + '">Remover</button></div>'
        + '<div class="obs-texto"></div>';
      item.querySelector(".obs-texto").textContent = obs.texto;
      if (tags.length) {
        var linha = document.createElement("div");
        linha.className = "grav-row";
        tags.forEach(function (o) { linha.appendChild(criarSelo(o, o.nome_relatorio, true)); });
        item.appendChild(linha);
      }
      var status = statusDaObservacao(obs, tags);
      if (status) {
        var s = document.createElement("div");
        s.className = "obs-status";
        s.setAttribute("role", "status");
        s.textContent = status;
        item.appendChild(s);
      }
      if (obs.aviso) {
        var aviso = document.createElement("div");
        aviso.className = "obs-aviso";
        aviso.textContent = "⚠️ " + obs.aviso;
        item.appendChild(aviso);
      }
      return item;
    }

    function montarObservacoes(pane) {
      if (!infoRelato || !pane || !/^r-t/.test(pane.id)) return;
      var info = infoRelato(pane);
      if (!info || !info.turma || !info.data) return;
      var relato = pane.id.slice(2);
      var box = pane.querySelector('[data-runtime-ui="observacoes"]');
      if (!box) {
        box = document.createElement("section");
        box.className = "obs-box";
        box.setAttribute("data-runtime-ui", "observacoes");
        box.setAttribute("aria-label", "Observações do relato");
        box.innerHTML = '<div class="obs-topo"><strong>📝 Observações</strong>'
          + '<button type="button" class="obs-btn" data-abrir-observacao>+ Nova observação</button></div>'
          + '<div class="obs-form-slot"></div><div class="obs-lista" aria-live="polite"></div>';
        pane.appendChild(box);
      }
      var lista = box.querySelector(".obs-lista");
      lista.innerHTML = "";
      var itens = obsPorRelato[relato] || [];
      if (!itens.length) {
        lista.innerHTML = carregado
          ? '<div class="obs-vazio">Nenhuma observação neste relato. A IA identifica os alunos citados e a gravidade.</div>'
          : '<div class="obs-vazio">Carregando observações…</div>';
      }
      itens.forEach(function (obs) { lista.appendChild(renderObservacao(obs)); });
    }

    function abrirFormulario(box) {
      var slot = box.querySelector(".obs-form-slot");
      if (slot.firstChild) {
        slot.querySelector("textarea").focus();
        return;
      }
      var uid = "obs-" + Math.random().toString(36).slice(2, 8);
      slot.innerHTML = '<form class="obs-form">'
        + '<label for="' + uid + '-t">O que aconteceu? Cite os alunos pelo nome.</label>'
        + '<textarea id="' + uid + '-t" maxlength="4000" required placeholder="Ex.: Daniel usou o celular, foi advertido e continuou. Depois xingou a Eduarda."></textarea>'
        + '<div class="obs-hora"><label for="' + uid + '-h">Horário do fato</label>'
        + '<input id="' + uid + '-h" type="time" required value="' + horaAgora() + '">'
        + '<button type="button" class="obs-btn sec" data-hora-agora>Agora</button></div>'
        + '<div class="grav-erro" role="alert"></div>'
        + '<div class="obs-acoes"><button type="button" class="obs-btn sec" data-cancelar-observacao>Cancelar</button>'
        + '<button type="submit" class="obs-btn">Enviar para a IA</button></div>'
        + "</form>";
      box.querySelector("[data-abrir-observacao]").hidden = true;
      slot.querySelector("textarea").focus();
    }

    function fecharFormulario(box) {
      box.querySelector(".obs-form-slot").innerHTML = "";
      box.querySelector("[data-abrir-observacao]").hidden = false;
      box.querySelector("[data-abrir-observacao]").focus();
    }

    async function enviarObservacao(form) {
      var box = form.closest(".obs-box");
      var pane = box.closest('.ipane[id^="r-"]');
      var info = infoRelato(pane);
      var texto = form.querySelector("textarea").value.trim();
      var horario = form.querySelector('input[type="time"]').value;
      var erro = form.querySelector(".grav-erro");
      if (texto.length < 3) {
        erro.textContent = "Escreva a observação antes de enviar.";
        return;
      }
      var botoes = form.querySelectorAll("button");
      botoes.forEach(function (b) { b.disabled = true; });
      erro.textContent = "";
      var client = cliente();
      var resposta = client
        ? await client.rpc("relatorio_registrar_observacao", {
          p_escola_slug: escolaSlug, p_turma: info.turma, p_relato: pane.id.slice(2),
          p_data: info.data, p_horario: horario || horaAgora(), p_disciplina: info.disciplina || "", p_texto: texto
        })
        : { error: { message: "sem conexão" } };
      if (resposta.error) {
        erro.textContent = "Não foi possível salvar agora. Verifique a internet e tente de novo.";
        botoes.forEach(function (b) { b.disabled = false; });
        return;
      }
      var obs = resposta.data;
      (obsPorRelato[obs.relato_codigo || ""] = obsPorRelato[obs.relato_codigo || ""] || []).push(obs);
      fecharFormulario(box);
      montarObservacoes(pane);
      acionarIA();
    }

    // Só os relatos abertos recebem a caixa (centenas de cartões fechados não).
    function decorar(escopo) {
      escopo = escopo || document;
      if (Object.keys(porId).length) decorarOcorrencias(escopo);
      if (!infoRelato) return;
      var cartoes = escopo.classList && escopo.classList.contains("ea") ? [escopo] : escopo.querySelectorAll(".ea");
      Array.prototype.forEach.call(cartoes, function (cartao) {
        var corpo = cartao.querySelector(".ec2");
        if (!corpo || !corpo.classList.contains("on")) return;
        corpo.querySelectorAll('.ipane[id^="r-t"]').forEach(montarObservacoes);
      });
    }

    // ── Menu de gravidade ───────────────────────────────────────────────
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
      var ctx = o.contexto || {};
      var detalhes = [];
      if (o.papel && o.papel !== "autor") detalhes.push(["Papel", PAPEIS[o.papel]]);
      if (ctx.descricao) detalhes.push(["O que fez", ctx.descricao]);
      if (o.categoria) detalhes.push(["Categoria", o.categoria.replace(/_/g, " ")]);
      if (o.interferencia) detalhes.push(["Interferência na aula", INTERFERENCIA[o.interferencia]]);
      if (o.nivel_base && o.nivel_base !== o.gravidade) detalhes.push(["Nível do ato", ROTULOS[o.nivel_base]]);
      if (o.reincidencia_aplicada) detalhes.push(["Reincidência", o.reincidencia_anteriores + " registro(s) semelhante(s) em 60 dias (+1 nível)"]);
      if (o.fraude_academica) detalhes.push(["Avaliação", "Fraude acadêmica: pode afetar a avaliação correspondente"]);
      CONTEXTO.forEach(function (par) { if (ctx[par[0]]) detalhes.push([par[1], ctx[par[0]]]); });
      if (o.origem === "observacao" && !o.numero_chamada) detalhes.push(["Aluno", "não identificado na chamada da turma"]);

      var atual = o.sem_infracao ? "sem_infracao" : o.gravidade;
      menu = document.createElement("div");
      menu.className = "grav-menu";
      menu.setAttribute("role", "dialog");
      menu.setAttribute("aria-label", "Conduta de " + nome);
      menu.setAttribute("data-runtime-ui", "gravidade-menu");
      menu._origem = botao;
      menu.innerHTML = "<h4>" + escapeHtml(nome) + "</h4>"
        + (o.origem === "relato" ? "<p>" + escapeHtml(o.texto) + "</p>" : "")
        + (o.gravidade_justificativa
          ? "<p><strong>" + (o.gravidade_origem === "professor" ? "Definido por você" : "IA") + ":</strong> " + escapeHtml(o.gravidade_justificativa) + "</p>"
          : "")
        + (detalhes.length ? "<dl>" + detalhes.map(function (d) { return "<dt>" + escapeHtml(d[0]) + "</dt><dd>" + escapeHtml(d[1]) + "</dd>"; }).join("") + "</dl>" : "")
        + (o.papel === "autor"
          ? '<p>Trocar a gravidade:</p><div class="grav-opcoes" role="group" aria-label="Escolha a gravidade">'
            + ORDEM.map(function (g) {
              return '<button type="button" data-gravidade="' + g + '" aria-pressed="' + (atual === g ? "true" : "false") + '">' + ROTULOS[g] + "</button>";
            }).join("") + "</div>"
          : "")
        + '<div class="grav-acoes">'
        + (o.gravidade_origem === "professor" ? '<button type="button" data-gravidade="">Voltar à IA</button>' : "")
        + '<button type="button" data-fechar="1">Fechar</button></div>'
        + '<div class="grav-erro" role="alert"></div>';
      document.body.appendChild(menu);

      var ret = botao.getBoundingClientRect();
      var largura = menu.offsetWidth;
      var altura = menu.offsetHeight;
      var esquerda = Math.min(Math.max(12, ret.left), window.innerWidth - largura - 12);
      var topo = ret.bottom + 6 + altura > window.innerHeight ? Math.max(12, ret.top - altura - 6) : ret.bottom + 6;
      menu.style.left = esquerda + "px";
      menu.style.top = topo + "px";
      var primeiro = menu.querySelector('[aria-pressed="true"]') || menu.querySelector("[data-fechar]");
      if (primeiro) primeiro.focus();

      menu.addEventListener("click", async function (event) {
        if (event.target.closest("[data-fechar]")) { fecharMenu(true); return; }
        var escolha = event.target.closest("[data-gravidade]");
        if (!escolha) return;
        var gravidade = escolha.getAttribute("data-gravidade") || null;
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
        if (!gravidade) acionarIA();
      });
    }

    // ── Eventos ─────────────────────────────────────────────────────────
    document.addEventListener("click", function (event) {
      var alvo = event.target;
      if (!alvo || !alvo.closest) return;
      var selo = alvo.closest(".grav-chip[data-ocorrencia-id]");
      if (selo) {
        event.stopPropagation();
        abrirMenu(selo);
        return;
      }
      if (menu && !menu.contains(alvo)) fecharMenu(false);

      var abrir = alvo.closest("[data-abrir-observacao]");
      if (abrir) { abrirFormulario(abrir.closest(".obs-box")); return; }
      if (alvo.closest("[data-cancelar-observacao]")) { fecharFormulario(alvo.closest(".obs-box")); return; }
      if (alvo.closest("[data-hora-agora]")) {
        alvo.closest(".obs-form").querySelector('input[type="time"]').value = horaAgora();
        return;
      }
      var remover = alvo.closest("[data-remover-observacao]");
      if (remover) {
        if (!window.confirm("Remover esta observação e as tags dos alunos?")) return;
        remover.disabled = true;
        cliente().rpc("relatorio_remover_observacao", { p_id: remover.getAttribute("data-remover-observacao") })
          .then(function (r) {
            if (r.error) { remover.disabled = false; window.alert("Não foi possível remover agora."); return; }
            atualizarTela();
          });
        return;
      }

      // Abriu um cartão: decora só ele (o layout pode ter sido restaurado).
      var cabecalho = alvo.closest(".eh");
      if (cabecalho) {
        var cartao = cabecalho.closest(".ea");
        if (cartao) window.setTimeout(function () { decorar(cartao); }, 0);
      }
    }, true);

    document.addEventListener("submit", function (event) {
      var form = event.target;
      if (!form.classList || !form.classList.contains("obs-form")) return;
      event.preventDefault();
      enviarObservacao(form);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu) fecharMenu(true);
    });

    async function atualizar() {
      await atualizarTela();
      if (haTrabalhoDaIA()) acionarIA();
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
