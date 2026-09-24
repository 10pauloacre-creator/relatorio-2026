// ═══════════════════════════════════════════════════════════════════════
// meu-diario-ia.js — aba 🤖 I.A do Meu Diário (contas dos professores).
//
// Duas formas de usar:
//   • IA DA PLATAFORMA (padrão): as chaves grátis do projeto, pela Edge
//     Function "assistente-ia" (repositório da Biblioteca). Sem chave e sem
//     custo, com limite diário por conta: 20 mensagens e 4 diários criados
//     (cota no banco: ia_consumir_cota "assistente" e "diarios"). Planos com
//     limite maior entram por private.ia_plano. Nomes sempre ocultos.
//   • CHAVE PRÓPRIA (Gemini, OpenRouter, Groq, Cerebras, Mistral, OpenAI,
//     Claude ou DeepSeek): o navegador fala direto com o provedor, sem limite
//     da plataforma. A chave fica só no localStorage deste aparelho.
//     OpenRouter "automático": tenta os modelos gratuitos em ordem e, só se
//     todos falharem e a opção estiver ligada, os pagos mais baratos.
//   • RODÍZIO (24/09/2026, ligado por padrão): se a IA escolhida falhar ou
//     bater o limite do dia, a próxima com chave salva responde (e por último
//     a IA da plataforma). O professor não precisa trocar nada à mão.
//
// 🧰 FERRAMENTAS (24/09/2026): filtro ao lado de "Conversa" com assistentes
// especializados (ia-ferramentas.js). Cada ferramenta abre uma conversa com
// papel próprio e prompt inicial com campos. Respostas longas ganham
// "💾 Salvar em Documentos" (meu-diario-documentos.js), "⬇️ Baixar"
// (documentos-exportar.js) e "📋 Copiar"; a I.A fecha documentos com um
// bloco ```documento {tipo, titulo, turma, disciplina, bimestre}``` que
// preenche sozinho onde salvar.
//
// Lê texto, fotos (câmera, galeria, colar), PDF, Word (.docx), planilhas
// (.xlsx/.xls/.ods/.csv) e arquivos de texto. Recebe um retrato dos dados do
// professor (turmas, alunos, diários recentes, plano, calendário) e, quando o
// professor pede, PROPÕE ações num bloco ```acoes [...]```. As ações aparecem
// como cartões e só mudam o diário depois do "Aplicar" (ou com a opção
// "aplicar automaticamente" ligada).
//
// Nomes dos alunos: com "Ocultar nomes" ligado (padrão), o texto enviado troca
// cada aluno conhecido por «T1.7» (turma T1, nº 7) e a resposta volta com os
// nomes. Fotos e documentos seguem como estão.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var PROV = {
    plataforma: { nome: "IA da plataforma", sub: "grátis · sem chave · limite diário", link: "", pdf: true, padrao: "automático" },
    gemini: { nome: "Google Gemini", sub: "grátis para começar", link: "https://aistudio.google.com/apikey", pdf: true, padrao: "gemini-2.5-flash" },
    openrouter: { nome: "OpenRouter", sub: "IAs grátis + pagas baratas", link: "https://openrouter.ai/settings/keys", pdf: true, padrao: "automático" },
    groq: { nome: "Groq", sub: "grátis com limites", link: "https://console.groq.com/keys", pdf: false, padrao: "meta-llama/llama-4-scout-17b-16e-instruct" },
    cerebras: { nome: "Cerebras", sub: "grátis com limites · rápido", link: "https://cloud.cerebras.ai/platform", pdf: false, padrao: "gpt-oss-120b" },
    mistral: { nome: "Mistral AI", sub: "grátis (plano Experiment)", link: "https://console.mistral.ai/api-keys", pdf: false, padrao: "mistral-small-latest" },
    openai: { nome: "OpenAI (ChatGPT)", sub: "pago por uso", link: "https://platform.openai.com/api-keys", pdf: true, padrao: "gpt-4o-mini" },
    anthropic: { nome: "Anthropic (Claude)", sub: "pago por uso", link: "https://console.anthropic.com/settings/keys", pdf: true, padrao: "claude-sonnet-5" },
    deepseek: { nome: "DeepSeek", sub: "pago · muito barato", link: "https://platform.deepseek.com/api_keys", pdf: false, padrao: "deepseek-chat" }
  };
  // Provedores no dialeto de chat da OpenAI.
  var BASE = { openai: "https://api.openai.com/v1", groq: "https://api.groq.com/openai/v1", openrouter: "https://openrouter.ai/api/v1", cerebras: "https://api.cerebras.ai/v1", mistral: "https://api.mistral.ai/v1", deepseek: "https://api.deepseek.com" };
  // OpenRouter "automático": gratuitos primeiro, na ordem (conferidos em
  // openrouter.ai/api/v1/models em 24/09/2026); pagos baratos só com a opção
  // ligada, depois de TODOS os gratuitos. ":floor" = fornecedor mais barato.
  var OR_GRATIS = ["openrouter/free", "nvidia/nemotron-3-ultra-550b-a55b:free", "qwen/qwen3.8-27b:free", "google/gemma-4-31b-it:free", "z-ai/glm-5.2:free", "nex-agi/nex-n2.5-pro:free", "thinkingmachines/inkling:free", "nvidia/nemotron-3-super-120b-a12b:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3.5-lightning:free"];
  var OR_PAGOS = ["deepseek/deepseek-v4-flash:floor", "google/gemini-2.5-flash:floor", "meta-llama/llama-3.3-70b-instruct:floor"];
  var OR_VISAO = { "openrouter/free": 1, "qwen/qwen3.8-27b:free": 1, "google/gemma-4-31b-it:free": 1, "nex-agi/nex-n2.5-pro:free": 1, "thinkingmachines/inkling:free": 1, "google/gemma-4-26b-a4b-it:free": 1, "google/gemini-2.5-flash:floor": 1 };
  // Fila da IA da plataforma (Edge Function "assistente-ia"), só para mostrar
  // na tela. A ordem e os modelos de verdade estão em _comum/ia.ts (Biblioteca).
  var FILA_PLAT = [
    { p: "gemini", nome: "Google Gemini", m: ["Gemini 3.5 Flash", "Gemini 3.6 Flash", "Gemini Flash (mais recente)", "Gemini Flash-Lite"] },
    { p: "groq", nome: "Groq", m: ["GPT-OSS 120B", "Llama 4 Scout (lê fotos)", "Qwen 3.8 27B", "Compound mini"] },
    { p: "cerebras", nome: "Cerebras", m: ["GPT-OSS 120B", "Llama 3.3 70B"] },
    { p: "mistral", nome: "Mistral AI", m: ["Mistral Medium", "Mistral Small"] },
    { p: "openrouter", nome: "OpenRouter — modelos gratuitos", m: ["Roteador grátis (openrouter/free)", "NVIDIA Nemotron 3 Ultra", "Qwen 3.8 27B", "Gemma 4 31B", "GLM 5.2", "Nex N2.5 Pro", "Inkling", "Nemotron 3 Super", "Gemma 4 26B", "Nemotron 3.5 Lightning", "Dots 3 Note"] },
    { p: "github", nome: "GitHub Models", m: ["GPT-4.1 mini", "GPT-4o mini"] },
    { p: "sambanova", nome: "SambaNova", m: ["Llama 3.3 70B"] },
    { p: "nvidia", nome: "NVIDIA NIM", m: ["Llama 3.3 70B"] },
    { p: "cohere", nome: "Cohere", m: ["Command A"] },
    { p: "huggingface", nome: "Hugging Face", m: ["Llama 3.3 70B"] },
    { p: "pagos", nome: "Camada paga (só depois de todas as gratuitas)", m: ["DeepSeek V4 Flash", "Gemini 2.5 Flash", "Llama 3.3 70B", "DeepSeek Chat"] }
  ];
  var LIBS = {
    pdf: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
    pdfWorker: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
    mammoth: "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js",
    xlsx: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
  };
  var DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  var MAX_ANEXOS = 6, MAX_BYTES = 20 * 1024 * 1024, MAX_TEXTO = 60000, MAX_HIST = 16;
  // IA da plataforma: mesmos tetos da Edge Function "assistente-ia".
  var LIMITE_MENSAGENS = 20, LIMITE_DIARIOS = 4, MAX_ANEXOS_PLAT = 4, MAX_BYTES_PLAT = 7 * 1024 * 1024;

  var M = null, cfg = null, chat = [], anexos = [], ocupado = false;
  var saldo = null, ultimoModelo = "", ultimoProv = "", ligadosPlat = null;

  // ── utilidades ─────────────────────────────────────────────────────
  function esc(v) { return M.esc(v); }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function dois(n) { return ("0" + n).slice(-2); }
  function hojeKey() { var d = new Date(); return d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate()); }
  function $(sel) { var s = document.getElementById("sec-ia"); return s ? s.querySelector(sel) : null; }
  function uid() { var u = M.usuario(); return u ? u.id : "x"; }
  function carregarScript(url) {
    return new Promise(function (ok, erro) {
      if (document.querySelector('script[src="' + url + '"]')) return ok();
      var s = document.createElement("script"); s.src = url; s.onload = ok; s.onerror = function () { erro(new Error("Não consegui carregar o leitor de arquivos. Verifique a internet.")); };
      document.head.appendChild(s);
    });
  }
  function lerBase64(blob) {
    return new Promise(function (ok, erro) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(",")[1] || ""); };
      r.onerror = function () { erro(new Error("Não consegui ler o arquivo.")); };
      r.readAsDataURL(blob);
    });
  }

  // ── configuração (só neste aparelho) ────────────────────────────────
  function cfgKey() { return "md_ia_" + uid(); }
  function chatKey() { return "md_ia_chat_" + uid() + (M && M.contexto ? "_" + M.contexto : ""); }
  function lerCfg() {
    var c = null;
    try { c = JSON.parse(localStorage.getItem(cfgKey()) || "null"); } catch (e) {}
    c = c || {};
    c.chaves = c.chaves || {}; c.modelos = c.modelos || {}; c.listas = c.listas || {};
    if (!PROV[c.prov] || (c.prov !== "plataforma" && !c.chaves[c.prov])) c.prov = "plataforma";
    if (c.ocultar === undefined) c.ocultar = true;
    c.auto = !!c.auto;
    if (c.rodizio === undefined) c.rodizio = true;
    c.orPagos = !!c.orPagos;
    c.ferrValores = c.ferrValores || {};
    return c;
  }
  function gravarCfg() { try { localStorage.setItem(cfgKey(), JSON.stringify(cfg)); } catch (e) {} }
  function lerChat() { try { var c = JSON.parse(localStorage.getItem(chatKey()) || "[]"); return Array.isArray(c) ? c : []; } catch (e) { return []; } }

  // ── conversas (várias, como no ChatGPT; 22/09/2026) ───────────────────
  // {atual: id, lista: [{id, titulo, tituloManual, criado, atualizado, msgs}]}
  // Ficam neste aparelho, separadas por lugar (Meu Diário, AEE, cada escola).
  // A conversa única antiga (md_ia_chat_*) vira a primeira da lista.
  var MAX_CONVERSAS = 60, conversas = null;
  function conversasKey() { return "md_ia_chats_" + uid() + (M && M.contexto ? "_" + M.contexto : ""); }
  function novoIdConversa() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function tituloDe(msgs) {
    var u = (msgs || []).filter(function (m) { return m.role === "user"; })[0];
    if (!u) return "Nova conversa";
    var t = String(u.texto || "").replace(/\s+/g, " ").trim();
    if (!t && (u.anexos || []).length) t = "📎 " + u.anexos[0].nome;
    t = t || "Nova conversa";
    return t.length > 52 ? t.slice(0, 50).trim() + "…" : t;
  }
  function lerConversas() {
    var c = null;
    try { c = JSON.parse(localStorage.getItem(conversasKey()) || "null"); } catch (e) {}
    if (!c || !Array.isArray(c.lista)) {
      var antiga = lerChat(), agora = new Date().toISOString();
      c = { atual: "", lista: [] };
      if (antiga.length) {
        var quando = (antiga[antiga.length - 1] || {}).em || agora;
        c.lista.push({ id: novoIdConversa(), titulo: tituloDe(antiga), criado: (antiga[0] || {}).em || quando, atualizado: quando, msgs: antiga });
      }
    }
    c.lista = c.lista.filter(function (x) { return x && x.id && Array.isArray(x.msgs); });
    if (!c.lista.some(function (x) { return x.id === c.atual; })) c.atual = c.lista.length ? ordenadas(c.lista)[0].id : "";
    return c;
  }
  function ordenadas(lista) { return lista.slice().sort(function (a, b) { return String(b.atualizado || "").localeCompare(String(a.atualizado || "")); }); }
  function conversaAtual() { return conversas.lista.filter(function (x) { return x.id === conversas.atual; })[0] || null; }
  function abrirConversa(id) {
    var c = conversas.lista.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    conversas.atual = c.id; chat = c.msgs;
  }
  // Nova conversa: se a atual ainda está vazia, reaproveita a atual.
  function novaConversa() {
    var atual = conversaAtual();
    if (atual && !atual.msgs.length) { chat = atual.msgs; return; }
    var agora = new Date().toISOString();
    var c = { id: novoIdConversa(), titulo: "Nova conversa", criado: agora, atualizado: agora, msgs: [] };
    conversas.lista.push(c); conversas.atual = c.id; chat = c.msgs;
  }
  function salvarConversas() {
    // Conversas vazias que não estão abertas não ficam guardadas.
    conversas.lista = conversas.lista.filter(function (x) { return x.msgs.length || x.id === conversas.atual; });
    var lista = ordenadas(conversas.lista);
    if (lista.length > MAX_CONVERSAS) {
      var manter = {}; lista.slice(0, MAX_CONVERSAS).forEach(function (x) { manter[x.id] = 1; }); manter[conversas.atual] = 1;
      conversas.lista = conversas.lista.filter(function (x) { return manter[x.id]; });
    }
    // Aparelho sem espaço: apaga as conversas mais antigas até caber.
    for (var tentativa = 0; tentativa < 20; tentativa++) {
      try { localStorage.setItem(conversasKey(), JSON.stringify(conversas)); return; } catch (e) {
        var velhas = ordenadas(conversas.lista).filter(function (x) { return x.id !== conversas.atual; });
        if (!velhas.length) return;
        var fora = velhas[velhas.length - 1].id;
        conversas.lista = conversas.lista.filter(function (x) { return x.id !== fora; });
      }
    }
  }
  function gravarChat() {
    if (!conversas) return;
    if (!conversaAtual()) novaConversa();
    var c = conversaAtual();
    c.msgs = chat.slice(-60); chat = c.msgs;
    var ultima = chat[chat.length - 1];
    c.atualizado = (ultima && ultima.em) || c.atualizado || new Date().toISOString();
    if (!c.tituloManual) c.titulo = tituloDe(chat);
    salvarConversas();
    desenharLista();
  }
  function chaveAtual() { return (cfg.chaves[cfg.prov] || "").trim(); }
  function modeloAtual() { return naPlataforma() ? "automático" : (cfg.modelos[cfg.prov] || PROV[cfg.prov].padrao).trim(); }
  function naPlataforma() { return cfg.prov === "plataforma"; }
  function pronto() { return naPlataforma() || !!chaveAtual(); }
  // Na IA da plataforma os nomes vão SEMPRE como código (política de privacidade).
  function ocultarNomes() { return naPlataforma() || !!cfg.ocultar; }

  // ── saldo da IA da plataforma ──────────────────────────────────────
  function cliente() { var S = window.RelatorioSupabaseSync; return S && S.getClient ? S.getClient() : null; }
  function textoSaldo() {
    if (!saldo) return "grátis · " + LIMITE_MENSAGENS + " mensagens por dia";
    if (saldo.ilimitado) return "sem limite (administrador)";
    return saldo.restante > 0 ? "restam " + saldo.restante + " de " + saldo.limite + " mensagens hoje" : "limite de hoje atingido · renova à meia-noite";
  }
  function rotuloCabecalho() {
    if (naPlataforma()) return PROV.plataforma.nome + " · " + textoSaldo();
    return chaveAtual() ? PROV[cfg.prov].nome + " · " + modeloAtual() : "configure a chave de API para começar";
  }
  function mostrarSaldo() {
    var h = document.querySelector("#sec-ia .ia-chat-h small"); if (h) h.textContent = rotuloCabecalho();
    var b = document.querySelector('#sec-ia [data-ia="saldo"]'); if (b) b.textContent = textoSaldo();
    var st = document.querySelector("#sec-ia .ia-cfg summary .ia-st"); if (st && naPlataforma()) st.textContent = "✓ " + textoSaldo();
  }
  function atualizarSaldo(c) { if (c) { saldo = c; mostrarSaldo(); } }
  async function buscarSaldo() {
    var cli = cliente(); if (!cli || !cli.functions || !naPlataforma()) return;
    try { var r = await cli.functions.invoke("assistente-ia", { body: { saldo: true } }); if (r.data && r.data.cota) atualizarSaldo(r.data.cota); } catch (e) {}
  }

  // ── nomes dos alunos ↔ códigos «T1.7» ───────────────────────────────
  var ACENTOS = { a: "[aáàâãä]", e: "[eéèêë]", i: "[iíìîï]", o: "[oóòôõö]", u: "[uúùûü]", c: "[cç]", n: "[nñ]" };
  function padraoNome(nomeNorm) {
    return nomeNorm.split(" ").map(function (p) {
      return p.split("").map(function (ch) { return ACENTOS[ch] || ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("");
    }).join("\\s+");
  }
  function mapaAlunos() {
    var todos = [], primeiros = {};
    (M.estrutura().turmas || []).forEach(function (t, i) {
      t.alunos.forEach(function (a) {
        var cod = "«T" + (i + 1) + "." + a.n + "»";
        var partes = norm(a.nm).split(" ").filter(Boolean);
        todos.push({ t: t, ti: i + 1, a: a, cod: cod, partes: partes });
        if (partes[0]) primeiros[partes[0]] = (primeiros[partes[0]] || 0) + 1;
      });
    });
    var padroes = [];
    todos.forEach(function (x) {
      if (!x.partes.length) return;
      padroes.push({ nome: x.a.nm, cod: x.cod });
      if (x.partes.length > 2) padroes.push({ nome: x.partes[0] + " " + x.partes[1], cod: x.cod });
      if (x.partes.length > 1) padroes.push({ nome: x.partes[0] + " " + x.partes[x.partes.length - 1], cod: x.cod });
      if (primeiros[x.partes[0]] === 1 && x.partes[0].length >= 3) padroes.push({ nome: x.partes[0], cod: x.cod });
    });
    // Um único regex com todos os nomes (mais longos primeiro) → código.
    var dict = {};
    padroes.forEach(function (p) { var k = norm(p.nome); if (k && !dict[k]) dict[k] = p.cod; });
    var chaves = Object.keys(dict).sort(function (a, b) { return b.length - a.length; });
    var re = chaves.length ? new RegExp("(^|[^\\p{L}\\p{N}])(" + chaves.map(padraoNome).join("|") + ")(?![\\p{L}\\p{N}])", "giu") : null;
    return { todos: todos, dict: dict, re: re };
  }
  function pseudonimizar(texto, mapa) {
    if (!ocultarNomes() || !texto) return texto;
    mapa = mapa || mapaAlunos();
    if (!mapa.re) return texto;
    return String(texto).replace(mapa.re, function (tudo, antes, nome) { return antes + (mapa.dict[norm(nome)] || nome); });
  }
  function alunoDoCodigo(ti, n) {
    var t = (M.estrutura().turmas || [])[ti - 1];
    var a = t && t.alunos.filter(function (x) { return x.n === n; })[0];
    return a ? { t: t, a: a } : null;
  }
  // Troca «T1.7» pelo nome (completo no chat, primeiro nome nos textos do diário).
  function restaurar(texto, curto) {
    return String(texto || "").replace(/«\s*T(\d+)\.(\d+)\s*»|\bT(\d+)\.(\d+)\b/g, function (tudo, a, b, c, d) {
      var x = alunoDoCodigo(parseInt(a || c, 10), parseInt(b || d, 10));
      if (!x) return tudo;
      return curto ? x.a.nm.split(" ")[0] : x.a.nm;
    });
  }

  // ── retrato dos dados para a I.A ────────────────────────────────────
  function retrato() {
    var E = M.estrutura(), soma = M.somaHoras ? M.somaHoras() : null, mapa = mapaAlunos();
    var R = window.MeuDiarioRecursos;
    var turmas = (E.turmas || []).map(function (t, i) {
      var esc1 = M.escola(t.escolaId);
      return {
        id: t.id, codigo: "T" + (i + 1), nome: t.nome, escola: esc1 ? esc1.nome : "",
        disciplinas: t.disciplinas.map(function (d) {
          return { nome: d.nome, meta_bimestre: d.metaBim, total_ano: d.total, bimestres: R ? R.numBims(d) : 4, h_aula_dadas: soma ? (soma[t.id + "|" + d.id] || 0) : undefined };
        }),
        alunos: t.alunos.map(function (a) {
          var o = { n: a.n };
          if (ocultarNomes()) o.codigo = "«T" + (i + 1) + "." + a.n + "»"; else o.nome = a.nm;
          if (a.tr) o.transferido = true;
          return o;
        })
      };
    });
    var nomeTurma = {}; (E.turmas || []).forEach(function (t) { nomeTurma[t.id] = t; });
    var ds = M.diarios().slice().sort(function (a, b) { return (b.dateKey + b.ini).localeCompare(a.dateKey + a.ini); }).slice(0, 40).map(function (d) {
      var r = d.rel || {}, at = r.atividade || {};
      var o = { id: d.id, turma: d.turma, data: d.dateKey, disciplina: d.discNome, horario: (d.ini || "") + (d.fim ? "–" + d.fim : ""), horas: d.horas, assunto: pseudonimizar(d.assunto, mapa) };
      if (r.conteudo) o.conteudo = pseudonimizar(String(r.conteudo).slice(0, 240), mapa);
      if ((r.faltaram || []).length) o.faltaram = r.faltaram;
      if ((r.faltJ || []).length) o.faltas_justificadas = r.faltJ;
      if (at.houve) o.atividade = { titulo: pseudonimizar(at.titulo, mapa), fez: at.fez || [], nao_fez: at.naoFez || [] };
      if ((r.comportamento || []).length) o.ocorrencias = r.comportamento.map(function (c) { return { alunos: c.alunos, tipo: c.tipo, texto: pseudonimizar(c.texto, mapa) }; });
      return o;
    });
    var extra = R ? R.resumo() : {};
    var plano = {};
    Object.keys(extra.plano || {}).forEach(function (k) {
      var p = k.split("|"), t = nomeTurma[p[0]], d = t && t.disciplinas.filter(function (x) { return x.id === p[1]; })[0];
      if (t && d) plano[t.id + " · " + d.nome] = extra.plano[k];
    });
    var cards = function (o) {
      var r = {}; Object.keys(o || {}).forEach(function (k) {
        var p = k.split("|"), t = nomeTurma[p[0]], d = t && t.disciplinas.filter(function (x) { return x.id === p[1]; })[0];
        if (t && d) r[t.id + " · " + d.nome + " · " + p[2] + "º bim"] = o[k];
      }); return r;
    };
    return JSON.stringify({
      professor: (E.perfil && E.perfil.nome) || "", escolas: (E.escolas || []).map(function (e) { return e.nome; }),
      turmas: turmas, total_diarios: M.diarios().length, diarios_recentes: ds,
      relatos_da_pagina: M.resumoExtra ? M.resumoExtra(function (x) { return pseudonimizar(x, mapa); }) : undefined,
      plano_de_aulas: plano, livros: cards(extra.livros), calendario: (extra.eventos || []).slice(-80),
      documentos: window.MeuDiarioDocumentos ? window.MeuDiarioDocumentos.resumo() : undefined
    });
  }

  // Ferramentas entregues às páginas que montam o próprio assistente (AEE).
  function ferramentas() { return { hoje: hojeKey, pseudonimizar: pseudonimizar, restaurar: restaurar, ocultarNomes: ocultarNomes, mapaAlunos: mapaAlunos }; }
  function ferramentaDaConversa() {
    var c = conversas && conversaAtual();
    return c && c.ferramenta && window.IAFerramentas ? window.IAFerramentas.porId(c.ferramenta) : null;
  }
  function nomeAbaDoc(t) { var D = window.MeuDiarioDocumentos; return D && D.TIPOS[t] ? D.TIPOS[t].nome : t; }
  // Como a I.A entrega documentos (para salvar e baixar).
  function blocoDocumentos() {
    if (!window.MeuDiarioDocumentos && !window.DocExportar) return "";
    return [
      "",
      "DOCUMENTOS",
      "- Quando escrever um documento (sequência didática, plano de aula, plano de curso, prova, atividade, rubrica, relatório, parecer, ata, comunicado…), entregue-o COMPLETO e pronto para uso, em markdown: ## títulos, listas, **negrito** e tabelas com | colunas |. Não deixe \"[preencher]\" quando o dado existe nos DADOS.",
      "- Logo depois do documento, feche com este bloco (JSON válido) para o sistema saber onde guardar:",
      "```documento",
      '{"tipo":"seq|aula|curso|rel","titulo":"título do documento","turma":"<id da turma ou vazio>","disciplina":"<nome ou vazio>","bimestre":1}',
      "```",
      "- Nunca invente referências (autores, livros, artigos, links): cite só obras e documentos oficiais que você conhece com segurança (BNCC, LDB, livros clássicos); na dúvida, escreva \"sugestão: pesquisar …\".",
      "- Etapa da turma: \"Série\" (1ª, 2ª, 3ª Série) = Ensino Médio; \"Ano\" (1º ao 9º Ano) = Ensino Fundamental. Use a etapa certa nos objetivos e na BNCC.",
      "- tipo: seq = sequência didática ou projeto; aula = plano de aula, prova, atividade, exercícios, rubrica, material de estudo; curso = plano de curso ou anual; rel = relatório, parecer, ata, comunicado, ofício.",
      window.MeuDiarioDocumentos ? "- O professor toca em \"💾 Salvar em Documentos\" para guardar. Use a ação \"documento\" só quando ele pedir explicitamente para salvar ou guardar." : "- O professor pode copiar o documento ou baixar em PDF, Word ou Excel."
    ].join("\n");
  }
  // Conversa aberta por uma ferramenta: o assistente fica especialista nela.
  function blocoFerramenta() {
    var f = ferramentaDaConversa(); if (!f) return "";
    var d = conversaAtual().dicas || {};
    return [
      "",
      "MODO FERRAMENTA — " + f.nome.toUpperCase(),
      "Nesta conversa você é um assistente especializado nesta função. " + f.papel,
      f.doc && window.MeuDiarioDocumentos ? "O resultado vai para Documentos › " + nomeAbaDoc(f.doc) + " (tipo \"" + f.doc + "\" no bloco ```documento```)." : "",
      [d.turmaId ? "Turma escolhida: id \"" + d.turmaId + "\"." : "", d.disciplina ? "Disciplina: " + d.disciplina + "." : "", d.bimestre ? "Bimestre: " + d.bimestre + "º." : ""].filter(Boolean).join(" "),
      "Se faltar algo essencial, faça no máximo 2 perguntas objetivas; senão, entregue direto. Depois de entregar, ofereça em uma linha 2 ou 3 ajustes possíveis."
    ].filter(Boolean).join("\n");
  }
  function sistema() {
    if (M.sistema) return M.sistema(ferramentas()) + blocoDocumentos() + blocoFerramenta();
    var d = new Date(), E = M.estrutura();
    return filtrarAcoes([
      'Você é o assistente de I.A ' + (M.nomePlataforma || 'do "Meu Diário"') + ', o diário escolar digital do(a) professor(a) ' + (((E.perfil && E.perfil.nome) || "").trim() || "usuário") + ". Responda sempre em português do Brasil, com clareza e sem rodeios.",
      "",
      "HOJE: " + hojeKey() + " (" + DIAS[d.getDay()] + "). Hora: " + dois(d.getHours()) + ":" + dois(d.getMinutes()) + ".",
      "",
      "O QUE VOCÊ FAZ",
      "- Conversa, tira dúvidas pedagógicas, resume e analisa os dados do diário (frequência, atividades, ocorrências, andamento do plano).",
      "- Lê textos, fotos (lista de chamada, caderno, quadro, bilhetes), PDFs, planilhas e documentos que o professor enviar.",
      "- Quando o professor pedir para registrar, cadastrar ou alterar algo, você PROPÕE ações. O sistema mostra as ações em cartões e o professor confirma antes de aplicar.",
      "",
      "REGRAS",
      "- Use só o que o professor informou ou o que está nos DADOS. Nunca invente alunos, datas, faltas, notas ou conteúdos.",
      "- Se faltar algo essencial (turma, data, disciplina), pergunte antes de propor a ação. \"Hoje\" = data de hoje; \"ontem\" = dia anterior.",
      "- Presença: todos estão presentes, a menos que o professor diga quem faltou. Liste só as faltas.",
      "- Alunos nas ações: pelo número de chamada \"n\" da turma." + (ocultarNomes() ? " Os nomes estão ocultos: cada aluno aparece como «T1.7» (turma de código T1, nº 7). Use esses códigos no texto. Se você ler nomes numa foto ou documento, pode colocar o nome escrito nas listas das ações que o sistema encontra o aluno." : " Nas listas das ações você também pode usar o nome do aluno."),
      "- Turma nas ações: o \"id\" da turma. Disciplina: o nome exato que está nos DADOS.",
      "- Datas AAAA-MM-DD; horários HH:MM; \"horas\" = número inteiro de h/aula.",
      "- Não existe ação para apagar diários: oriente o professor a usar o botão ✏️ do diário.",
      "- Seja breve na explicação e, quando propor ações, diga em uma frase o que será feito.",
      blocoDocumentos(),
      "",
      "COMO PROPOR AÇÕES",
      "Escreva a resposta e, no FINAL, um único bloco assim (JSON válido, sem comentários):",
      "```acoes",
      '[{"tipo":"...", ...}]',
      "```",
      "Só inclua o bloco quando houver algo para registrar ou alterar.",
      "",
      "TIPOS DE AÇÃO",
      '1. criar_diario — registra uma aula: {"tipo":"criar_diario","turma":"<id>","disciplina":"<nome>","data":"AAAA-MM-DD","inicio":"HH:MM","fim":"HH:MM","horas":2,"assunto":"tema curto da aula","conteudo":"o que foi trabalhado","faltaram":[n],"faltas_justificadas":[n],"atividade":{"houve":true,"titulo":"","descricao":"","fez":[n],"nao_fez":[n]},"comportamento":[{"alunos":[n],"tipo":"advertencia|grave|destaque","texto":""}],"lembrete":{"titulo":"","texto":""}}',
      '2. editar_diario — altera um diário existente; só os campos enviados mudam e as listas enviadas substituem as antigas: {"tipo":"editar_diario","id":"<id do diário>", ...campos de criar_diario}',
      '3. criar_turma — {"tipo":"criar_turma","nome":"7º Ano A","disciplinas":[{"nome":"Ciências","meta_bimestre":10,"total_ano":40}],"alunos":["Nome Completo", "..."]}',
      '4. adicionar_alunos — no fim da chamada: {"tipo":"adicionar_alunos","turma":"<id>","nomes":["..."]}',
      '5. transferir_aluno — {"tipo":"transferir_aluno","turma":"<id>","aluno":n}',
      '6. adicionar_disciplina — {"tipo":"adicionar_disciplina","turma":"<id>","nome":"...","meta_bimestre":10,"total_ano":40}',
      '7. plano_bimestre — plano de aulas de um bimestre: {"tipo":"plano_bimestre","turma":"<id>","disciplina":"<nome>","bimestre":1,"tema":"tema do bimestre","aulas":[{"titulo":"...","detalhe":"...","avaliacao":false}],"modo":"substituir|acrescentar"}',
      '8. plano_status — {"tipo":"plano_status","turma":"<id>","disciplina":"<nome>","bimestre":1,"aula":3,"status":"planejada|aplicada|pulada|lancada|limpar"}',
      '9. documento — guarda um documento pronto na aba Documentos (só quando o professor pedir para salvar): {"tipo":"documento","aba":"seq|aula|curso|rel","titulo":"","turma":"<id>","disciplina":"<nome>","bimestre":1,"pasta":"Pasta/Subpasta (opcional; vazio = pasta da turma)","conteudo":"documento completo em markdown"}',
      '10. livro — livro/material do bimestre: {"tipo":"livro","turma":"<id>","disciplina":"<nome>","bimestre":1,"titulo":"","url":"","temas":["..."],"status":"criando|concluido"}',
      '11. evento_calendario — {"tipo":"evento_calendario","data":"AAAA-MM-DD","ate":"AAAA-MM-DD","titulo":"","categoria":"letivo|feriado|recesso|avaliacao|reuniao|evento|planejamento|outro","descricao":""}',
      '12. remover_evento — {"tipo":"remover_evento","id":"<id do evento>"}',
      "",
      (M.notaDados || ""),
      blocoFerramenta(),
      "",
      "DADOS DO PROFESSOR (JSON):",
      retrato()
    ]).join("\n");
  }
  // Nas escolas do administrador só existem as ações de diário.
  function acaoPermitida(tipo) { return !M.acoes || M.acoes.indexOf(tipo) >= 0; }
  function filtrarAcoes(linhas) {
    return linhas.filter(function (l) { var m = /^\d+\. (\w+) —/.exec(l); return !m || acaoPermitida(m[1]); });
  }

  // ── anexos ─────────────────────────────────────────────────────────
  function tipoArquivo(f) {
    var n = (f.name || "").toLowerCase(), t = f.type || "";
    if (/^image\//.test(t) || /\.(jpe?g|png|webp|gif|bmp)$/.test(n)) return "imagem";
    if (t === "application/pdf" || /\.pdf$/.test(n)) return "pdf";
    if (/\.docx$/.test(n)) return "docx";
    if (/\.(xlsx|xls|ods)$/.test(n)) return "planilha";
    if (/^text\//.test(t) || /\.(txt|md|csv|tsv|json|html?|xml|rtf)$/.test(n)) return "texto";
    if (/\.(heic|heif)$/.test(n)) return "heic";
    if (/\.doc$/.test(n)) return "doc";
    return "";
  }
  function adicionarAnexos(lista) {
    Array.prototype.forEach.call(lista || [], function (f) {
      var tp = tipoArquivo(f);
      if (anexos.length >= MAX_ANEXOS) return M.toast("Até " + MAX_ANEXOS + " arquivos por mensagem.");
      if (!tp) return M.toast("Formato não aceito: " + f.name);
      if (tp === "heic") return M.toast("Fotos HEIC não são lidas no navegador. Envie em JPG ou PNG.");
      if (tp === "doc") return M.toast("Arquivo .doc antigo: salve como .docx ou PDF e envie de novo.");
      if (f.size > MAX_BYTES) return M.toast(f.name + " passa de 20 MB.");
      var a = { arquivo: f, nome: f.name || "imagem.png", tipo: tp };
      if (tp === "imagem") { try { a.url = URL.createObjectURL(f); } catch (e) {} }
      anexos.push(a);
    });
    desenharAnexos();
  }
  function desenharAnexos() {
    var box = $(".ia-anexos"); if (!box) return;
    var ic = { imagem: "🖼️", pdf: "📕", docx: "📄", planilha: "📊", texto: "📝" };
    box.innerHTML = anexos.map(function (a, i) {
      return '<span class="ia-anx">' + (a.url ? '<img src="' + a.url + '" alt="">' : "<b>" + ic[a.tipo] + "</b>") + '<span>' + esc(a.nome) + '</span><button type="button" data-rm-anx="' + i + '" title="Remover">✕</button></span>';
    }).join("");
    box.hidden = !anexos.length;
    box.querySelectorAll("[data-rm-anx]").forEach(function (b) { b.onclick = function () { var x = anexos.splice(+b.getAttribute("data-rm-anx"), 1)[0]; if (x && x.url) URL.revokeObjectURL(x.url); desenharAnexos(); }; });
  }
  // Foto grande → JPEG de até 1600 px (economiza cota e acelera o envio).
  function reduzirImagem(f) {
    return new Promise(function (ok) {
      var img = new Image(), url = URL.createObjectURL(f);
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
        var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { ok(b || f); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(f); };
      img.src = url;
    });
  }
  async function textoDoPdf(f) {
    await carregarScript(LIBS.pdf);
    var lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
    var doc = await lib.getDocument({ data: await f.arrayBuffer() }).promise, out = [];
    for (var p = 1; p <= doc.numPages && out.join("\n").length < MAX_TEXTO; p++) {
      var pg = await doc.getPage(p), tc = await pg.getTextContent();
      out.push(tc.items.map(function (i) { return i.str; }).join(" "));
    }
    var txt = out.join("\n\n").trim();
    if (!txt) throw new Error(f.name + ": o PDF parece ser só imagem (escaneado). Com o Groq não dá para ler; use Gemini, OpenAI ou Claude, ou envie fotos das páginas.");
    return txt;
  }
  async function processarAnexo(a) {
    var f = a.arquivo;
    if (a.tipo === "imagem") {
      var b = /image\/(gif)/.test(f.type) ? f : await reduzirImagem(f);
      return { tipo: "imagem", nome: a.nome, mime: b.type || "image/jpeg", base64: await lerBase64(b) };
    }
    if (a.tipo === "pdf") {
      if (PROV[cfg.prov].pdf) return { tipo: "pdf", nome: a.nome, mime: "application/pdf", base64: await lerBase64(f) };
      return { tipo: "texto", nome: a.nome, texto: await textoDoPdf(f) };
    }
    if (a.tipo === "docx") {
      await carregarScript(LIBS.mammoth);
      var r = await window.mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() });
      return { tipo: "texto", nome: a.nome, texto: r.value || "" };
    }
    if (a.tipo === "planilha") {
      await carregarScript(LIBS.xlsx);
      var wb = window.XLSX.read(await f.arrayBuffer(), { type: "array" });
      return { tipo: "texto", nome: a.nome, texto: wb.SheetNames.map(function (n) { return "## Planilha: " + n + "\n" + window.XLSX.utils.sheet_to_csv(wb.Sheets[n]); }).join("\n\n") };
    }
    return { tipo: "texto", nome: a.nome, texto: await f.text() };
  }

  // ── provedores ─────────────────────────────────────────────────────
  function erroApi(status, msg, prov) {
    msg = String(msg || "").slice(0, 300);
    if (status === 401 || status === 403 || /api key not valid|invalid.*key|incorrect api key|authentication/i.test(msg)) return "A chave de API foi recusada pelo " + PROV[prov].nome + ". Confira a chave em 🔑 Configurar.";
    if (status === 404) return "O modelo \"" + modeloAtual() + "\" não foi encontrado. Toque em 🔑 Configurar → Testar e salvar para escolher outro." + (msg ? " (" + msg + ")" : "");
    if (status === 429) return "Limite de uso da sua chave atingido (cota do " + PROV[prov].nome + "). Espere um pouco ou confira o plano no site do provedor." + (msg ? " (" + msg + ")" : "");
    if (status === 413) return "A mensagem ficou grande demais para o modelo. Envie menos arquivos ou arquivos menores.";
    if (status >= 500) return "O serviço de IA está instável agora. Tente de novo em instantes.";
    return (msg || "Falha ao falar com a IA") + " (código " + status + ").";
  }
  function erroComStatus(msg, status) { var e = new Error(msg); e.status = status; return e; }
  async function pedir(url, opcoes, prov, prazoMs) {
    var r, ctrl = window.AbortController ? new AbortController() : null, relogio = null;
    if (ctrl) { opcoes = Object.assign({}, opcoes, { signal: ctrl.signal }); relogio = setTimeout(function () { ctrl.abort(); }, prazoMs || 120000); }
    try { r = await fetch(url, opcoes); }
    catch (e) {
      if (e && e.name === "AbortError") throw erroComStatus("O " + PROV[prov].nome + " demorou demais para responder.", 408);
      throw erroComStatus("Sem conexão com o " + PROV[prov].nome + ". Verifique a internet" + (prov === "cerebras" || prov === "mistral" || prov === "deepseek" ? " (se continuar, o serviço pode bloquear o acesso direto pelo navegador: use o OpenRouter)" : "") + ".", 0);
    }
    finally { if (relogio) clearTimeout(relogio); }
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw erroComStatus(erroApi(r.status, (j.error && (j.error.message || j.error)) || j.message, prov), r.status);
    return j;
  }
  function textoPartes(partes) { return partes.filter(function (p) { return p.tipo === "texto"; }).map(function (p) { return p.texto; }).join("\n\n"); }

  async function chamarPlataforma(sis, msgs) {
    var cli = cliente();
    if (!cli || !cli.functions) throw new Error("Sem conexão com a plataforma. Verifique a internet.");
    var corpo = {
      sistema: sis,
      mensagens: msgs.map(function (m) {
        return { papel: m.role, partes: m.partes.map(function (x) { return x.tipo === "texto" ? { texto: x.texto } : { midia: { mime: x.mime, dados: x.base64 } }; }) };
      })
    };
    var r = await cli.functions.invoke("assistente-ia", { body: corpo });
    if (r.error) {
      var d = {};
      try { d = await r.error.context.json(); } catch (e) {}
      atualizarSaldo(d.cota);
      throw new Error(d.erro || "A IA da plataforma não respondeu agora. Tente de novo em instantes.");
    }
    atualizarSaldo(r.data && r.data.cota);
    if (!r.data || !r.data.texto) throw new Error((r.data && r.data.erro) || "A IA devolveu uma resposta vazia. Tente de novo.");
    ultimoModelo = r.data.modelo || "";
    return r.data.texto;
  }

  function temParte(msgs, tipo) { return msgs.some(function (m) { return m.partes.some(function (p) { return p.tipo === tipo; }); }); }
  // Rodízio: a IA escolhida primeiro; se falhar, as outras com chave salva e,
  // por último, a IA da plataforma.
  function ordemRodizio() {
    var ordem = [cfg.prov];
    if (!cfg.rodizio) return ordem;
    Object.keys(PROV).forEach(function (p) { if (p !== cfg.prov && p !== "plataforma" && (cfg.chaves[p] || "").trim()) ordem.push(p); });
    if (cfg.prov !== "plataforma") ordem.push("plataforma");
    return ordem;
  }
  function temOutraIA() { return ordemRodizio().length > 1; }
  // Devolve o texto e anota quem respondeu (ultimoProv / ultimoModelo).
  async function chamar(sis, msgs) {
    var ordem = ordemRodizio(), pdf = temParte(msgs, "pdf"), erros = [];
    for (var i = 0; i < ordem.length; i++) {
      var p = ordem[i];
      if (pdf && !PROV[p].pdf) continue;
      if (p === "plataforma" && ordem.length > 1 && saldo && !saldo.ilimitado && saldo.restante <= 0) continue;
      try {
        var texto;
        if (p === "plataforma") texto = await chamarPlataforma(sis, msgs);
        else { ultimoModelo = (cfg.modelos[p] || PROV[p].padrao).trim(); texto = await chamarProv(p, (cfg.chaves[p] || "").trim(), ultimoModelo, sis, msgs); }
        ultimoProv = p;
        return texto;
      } catch (e) {
        console.warn("[I.A] " + PROV[p].nome + " falhou:", (e && e.message) || e);
        erros.push(PROV[p].nome + ": " + ((e && e.message) || e));
        if (!cfg.rodizio || ordem.length === 1) throw e;
      }
    }
    throw new Error(erros.length ? "Nenhuma IA respondeu agora.\n" + erros.join("\n") : "Nenhuma IA configurada lê esse tipo de arquivo. Use a IA da plataforma, Gemini, OpenRouter, OpenAI ou Claude.");
  }

  async function chamarProv(prov, chave, modelo, sis, msgs) {
    if (!chave) throw erroComStatus("Sem chave do " + PROV[prov].nome + ".", 401);
    if (prov === "openrouter" && /^auto/i.test(modelo)) return chamarOpenRouterAuto(chave, sis, msgs);
    if (prov === "gemini") {
      var jg = await pedir("https://generativelanguage.googleapis.com/v1beta/models/" + modelo.replace(/^models\//, "") + ":generateContent", {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sis }] },
          contents: msgs.map(function (m) {
            return { role: m.role === "assistant" ? "model" : "user", parts: m.partes.map(function (p) { return p.tipo === "texto" ? { text: p.texto } : { inlineData: { mimeType: p.mime, data: p.base64 } }; }) };
          }),
          generationConfig: { temperature: 0.4 }
        })
      }, prov, 120000);
      var c = jg.candidates && jg.candidates[0];
      var tg = c && c.content && (c.content.parts || []).filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ""; }).join("");
      if (!tg) throw new Error(jg.promptFeedback && jg.promptFeedback.blockReason ? "O Gemini recusou a mensagem (" + jg.promptFeedback.blockReason + ")." : "O Gemini devolveu uma resposta vazia" + (c && c.finishReason ? " (" + c.finishReason + ")" : "") + ". Tente de novo.");
      return tg;
    }
    if (prov === "anthropic") {
      var ja = await pedir("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: modelo, max_tokens: 8000, system: sis,
          messages: msgs.map(function (m) {
            return { role: m.role, content: m.partes.map(function (p) {
              if (p.tipo === "texto") return { type: "text", text: p.texto };
              if (p.tipo === "imagem") return { type: "image", source: { type: "base64", media_type: p.mime, data: p.base64 } };
              return { type: "document", source: { type: "base64", media_type: "application/pdf", data: p.base64 } };
            }) };
          })
        })
      }, prov, 180000);
      var ta = (ja.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("");
      if (!ta) throw new Error("O Claude devolveu uma resposta vazia. Tente de novo.");
      return ta;
    }
    return chamarOpenAI(prov, chave, modelo, sis, msgs, 120000);
  }
  // Tenta os gratuitos do OpenRouter em ordem; os pagos só com a opção ligada.
  async function chamarOpenRouterAuto(chave, sis, msgs) {
    var lista = OR_GRATIS.concat(cfg.orPagos ? OR_PAGOS : []), ultimo = null;
    if (temParte(msgs, "imagem") || temParte(msgs, "pdf")) lista = lista.filter(function (m) { return OR_VISAO[m]; });
    for (var i = 0; i < lista.length; i++) {
      try {
        var t = await chamarOpenAI("openrouter", chave, lista[i], sis, msgs, 60000);
        ultimoModelo = lista[i];
        return t;
      } catch (e) {
        console.warn("[I.A] OpenRouter " + lista[i] + " falhou — tentando o próximo:", (e && e.message) || e);
        ultimo = e;
        if (e && (e.status === 401 || e.status === 403)) throw e;
      }
    }
    throw erroComStatus("Todos os modelos " + (cfg.orPagos ? "" : "gratuitos ") + "do OpenRouter falharam agora" + (cfg.orPagos ? "" : " (os pagos estão desligados em 🔑 Configurar)") + ". Último erro: " + ((ultimo && ultimo.message) || "?"), (ultimo && ultimo.status) || 429);
  }
  async function chamarOpenAI(prov, chave, modelo, sis, msgs, prazoMs) {
    var cab = { "Content-Type": "application/json", "Authorization": "Bearer " + chave };
    if (prov === "openrouter") { cab["HTTP-Referer"] = "https://relatorio.skin"; cab["X-Title"] = "RELATORIO SKIN"; }
    var jo = await pedir(BASE[prov] + "/chat/completions", {
      method: "POST", headers: cab,
      body: JSON.stringify({
        model: modelo,
        messages: [{ role: "system", content: sis }].concat(msgs.map(function (m) {
          var soTexto = m.role === "assistant" || m.partes.every(function (p) { return p.tipo === "texto"; });
          if (soTexto) return { role: m.role, content: textoPartes(m.partes) };
          return { role: m.role, content: m.partes.map(function (p) {
            if (p.tipo === "texto") return { type: "text", text: p.texto };
            if (p.tipo === "imagem") return { type: "image_url", image_url: { url: "data:" + p.mime + ";base64," + p.base64 } };
            return { type: "file", file: { filename: p.nome, file_data: "data:application/pdf;base64," + p.base64 } };
          }) };
        }))
      })
    }, prov, prazoMs);
    var to = jo.choices && jo.choices[0] && jo.choices[0].message && jo.choices[0].message.content;
    if (!to) throw new Error("A IA devolveu uma resposta vazia. Tente de novo.");
    return to;
  }

  // Lista os modelos da chave e escolhe um bom padrão.
  function versao(id) { return (String(id).match(/\d+(\.\d+)?/g) || ["0"]).map(parseFloat); }
  function maisNovo(a, b) { var x = versao(a), y = versao(b); for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (y[i] || 0) - (x[i] || 0); if (d) return d; } return 0; }
  async function listarModelos(prov, chave) {
    var ids = [];
    if (prov === "gemini") {
      var jg = await pedir("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": chave } }, prov);
      ids = (jg.models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf("generateContent") >= 0; })
        .map(function (m) { return m.name.replace(/^models\//, ""); })
        .filter(function (id) { return /^gemini/.test(id) && !/(embedding|aqa|tts|image|live|audio|native|robotics|computer|learnlm)/i.test(id); });
      ids.sort(maisNovo);
      var bom = ids.filter(function (id) { return /flash/.test(id) && !/(lite|exp|preview|thinking|\d{3,}$)/.test(id); })[0] || ids.filter(function (id) { return /flash/.test(id); })[0];
      return { ids: ids, padrao: bom || ids[0] };
    }
    if (prov === "anthropic") {
      var ja = await pedir("https://api.anthropic.com/v1/models?limit=100", { headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } }, prov);
      ids = (ja.data || []).map(function (m) { return m.id; });
      return { ids: ids, padrao: ids.filter(function (id) { return /sonnet/.test(id); })[0] || ids[0] };
    }
    var cab = { "Authorization": "Bearer " + chave };
    if (prov === "openrouter") {
      // A lista de modelos é pública; a chave é conferida em /key.
      await pedir(BASE.openrouter + "/key", { headers: cab }, prov, 30000);
      var jr = await pedir(BASE.openrouter + "/models", {}, prov, 30000);
      var todos = (jr.data || []).map(function (m) { return m.id; });
      var gratis = todos.filter(function (id) { return /:free$/.test(id) || id === "openrouter/free"; });
      return { ids: ["automático"].concat(gratis, todos.filter(function (id) { return gratis.indexOf(id) < 0; })), padrao: "automático" };
    }
    var jo = await pedir(BASE[prov] + "/models", { headers: cab }, prov, 30000);
    ids = (jo.data || []).map(function (m) { return m.id; });
    var ou = function (pref) { return ids.indexOf(pref) >= 0 ? pref : ids[0]; };
    if (prov === "mistral") { ids = ids.filter(function (id) { return !/(embed|moderation|ocr|transcri|voxtral|codestral)/i.test(id); }); return { ids: ids, padrao: ou("mistral-small-latest") }; }
    if (prov === "deepseek") return { ids: ids, padrao: ou("deepseek-chat") };
    if (prov === "cerebras") return { ids: ids, padrao: ou("gpt-oss-120b") };
    if (prov === "openai") {
      ids = ids.filter(function (id) { return /^(gpt-|o\d|chatgpt)/.test(id) && !/(audio|realtime|tts|transcribe|image|search|embedding|instruct|dall|whisper|moderation|codex|oss|\d{4}-\d{2}-\d{2})/.test(id); });
      ids.sort(maisNovo);
      return { ids: ids, padrao: ids.filter(function (id) { return /^gpt-[\d.]+-mini$/.test(id); })[0] || (ids.indexOf("gpt-4o-mini") >= 0 ? "gpt-4o-mini" : ids[0]) };
    }
    ids = ids.filter(function (id) { return !/(whisper|tts|guard|embed|playai|orpheus|compound|allam|prompt)/i.test(id); });
    return { ids: ids, padrao: ids.filter(function (id) { return /llama-4-(scout|maverick)/.test(id); })[0] || ids.filter(function (id) { return /llama-3\.3-70b/.test(id); })[0] || ids[0] };
  }

  // ── conversa ───────────────────────────────────────────────────────
  // Bloco ```documento {…}``` do fim da resposta: onde guardar o documento.
  function extrairDocumento(texto) {
    var m = /```\s*documento\s*\n?([\s\S]*?)```/i.exec(texto || "");
    if (!m) return { texto: texto, meta: null };
    var meta = null;
    try { meta = JSON.parse(m[1].trim()); } catch (e) {}
    return { texto: String(texto).replace(m[0], "").trim().replace(/\n\s*([-*_])\1{2,}\s*$/, "").trim(), meta: meta && typeof meta === "object" && !Array.isArray(meta) ? meta : null };
  }
  function extrairAcoes(texto) {
    var re = /```\s*(acoes|ações|json)?\s*\n?([\s\S]*?)```/gi, m, achado = null;
    while ((m = re.exec(texto))) {
      var rotulo = (m[1] || "").toLowerCase(), corpo = m[2].trim();
      if (rotulo === "acoes" || rotulo === "ações" || /"tipo"\s*:/.test(corpo)) achado = { bloco: m[0], corpo: corpo };
    }
    if (!achado) return { texto: texto, acoes: [] };
    var lista = [];
    try {
      var j = JSON.parse(achado.corpo);
      lista = Array.isArray(j) ? j : (j && Array.isArray(j.acoes) ? j.acoes : [j]);
    } catch (e) {
      return { texto: texto.replace(achado.bloco, "").trim() + "\n\n⚠️ A I.A mandou as ações num formato inválido. Peça de novo: \"refaça as ações\".", acoes: [] };
    }
    return { texto: texto.replace(achado.bloco, "").trim(), acoes: lista.filter(function (a) { return a && typeof a === "object" && a.tipo; }) };
  }
  function historicoParaApi(mapa) {
    var hist = chat.filter(function (m) { return m.role === "user" || m.role === "assistant"; }).slice(-MAX_HIST);
    var msgs = [];
    hist.forEach(function (m) {
      var texto;
      if (m.role === "user") {
        texto = pseudonimizar(m.texto || "", mapa);
        if ((m.anexos || []).length) texto += "\n[Arquivos enviados nesta mensagem: " + m.anexos.map(function (a) { return a.nome; }).join(", ") + "]";
      } else {
        texto = m.bruto || m.texto || "";
        var est = m.estados || {}, feitas = [], nao = [];
        (m.acoes || []).forEach(function (a, i) { var e = est[i]; if (e && e.ok) feitas.push(i + 1); else if (e && e.descartada) nao.push(i + 1); });
        if (feitas.length || nao.length) texto += "\n[Sistema: " + (feitas.length ? "ações " + feitas.join(", ") + " aplicadas" : "") + (nao.length ? (feitas.length ? "; " : "") + "ações " + nao.join(", ") + " descartadas" : "") + ".]";
      }
      var ult = msgs[msgs.length - 1];
      if (ult && ult.role === m.role) ult.partes[0].texto += "\n\n" + texto;
      else msgs.push({ role: m.role, partes: [{ tipo: "texto", texto: texto || "…" }] });
    });
    while (msgs.length && msgs[0].role !== "user") msgs.shift();
    return msgs;
  }
  async function enviar() {
    if (ocupado) return;
    var campo = $(".ia-txt"), texto = (campo.value || "").trim();
    if (!texto && !anexos.length) return;
    if (!pronto()) { abrirConfig(true); return M.toast("Escolha a IA da plataforma ou cole a sua chave de API."); }
    if (naPlataforma()) {
      if (saldo && !saldo.ilimitado && saldo.restante <= 0 && !temOutraIA()) {
        chat.push({ role: "erro", texto: "Você usou as " + saldo.limite + " mensagens gratuitas de hoje. A cota renova à meia-noite (horário do Acre). Para continuar agora, cole a sua própria chave de API em 🔑 Configurar." });
        gravarChat(); return desenharChat();
      }
      if (anexos.length > MAX_ANEXOS_PLAT) return M.toast("Na IA da plataforma, envie até " + MAX_ANEXOS_PLAT + " arquivos por mensagem.");
      var pesados = anexos.filter(function (a) { return a.tipo === "pdf" && a.arquivo.size > 5 * 1024 * 1024; });
      if (pesados.length) return M.toast("PDF acima de 5 MB não vai pela IA gratuita. Envie menos páginas ou use a sua própria chave.");
    }
    var envio = anexos.slice();
    if (!conversaAtual()) { novaConversa(); }
    var msg = { role: "user", texto: texto, anexos: envio.map(function (a) { return { nome: a.nome, tipo: a.tipo }; }), em: new Date().toISOString() };
    chat.push(msg);
    gravarChat();
    campo.value = ""; ajustarAltura(campo);
    anexos = []; desenharAnexos();
    ocupado = true; desenharChat(true);
    try {
      var mapa = mapaAlunos();
      var partesAnexos = [];
      for (var i = 0; i < envio.length; i++) partesAnexos.push(await processarAnexo(envio[i]));
      envio.forEach(function (a) { if (a.url) URL.revokeObjectURL(a.url); });
      var msgs = historicoParaApi(mapa);
      var atual = msgs[msgs.length - 1];
      partesAnexos.forEach(function (p) {
        if (p.tipo === "texto") atual.partes.push({ tipo: "texto", texto: "[Conteúdo do arquivo " + p.nome + "]\n" + pseudonimizar(String(p.texto).slice(0, MAX_TEXTO), mapa) });
        else atual.partes.push(p);
      });
      if (!texto) atual.partes[0].texto = "(Veja os arquivos enviados.)" + atual.partes[0].texto.replace(/^…/, "");
      var bruto = await chamar(sistema(), msgs);
      var dm = extrairDocumento(bruto), r = extrairAcoes(dm.texto);
      var resp = { role: "assistant", texto: r.texto, bruto: bruto, acoes: r.acoes, estados: {}, prov: ultimoProv, meta: dm.meta,
        modelo: PROV[ultimoProv].nome + (ultimoModelo ? " · " + ultimoModelo : "") + (ultimoProv !== cfg.prov ? " · ↻ rodízio" : ""), em: new Date().toISOString() };
      chat.push(resp);
      if (cfg.auto && r.acoes.length) await aplicarTodas(chat.length - 1, true);
    } catch (e) {
      chat.push({ role: "erro", texto: String((e && e.message) || e) });
    }
    ocupado = false;
    gravarChat();
    desenharChat();
  }

  // ── resolução de turma, disciplina e alunos ─────────────────────────
  function turmaDe(ref) {
    var ts = M.estrutura().turmas || [];
    if (!ref && ts.length === 1) return ts[0];
    var r = String(ref || "").trim();
    var t = ts.filter(function (x) { return x.id === r; })[0];
    if (t) return t;
    var cod = /^T(\d+)$/i.exec(r); if (cod && ts[+cod[1] - 1]) return ts[+cod[1] - 1];
    var n = norm(r);
    var iguais = ts.filter(function (x) { return norm(x.nome) === n; }); if (iguais.length === 1) return iguais[0];
    var contem = ts.filter(function (x) { return n && (norm(x.nome).indexOf(n) >= 0 || n.indexOf(norm(x.nome)) >= 0); }); if (contem.length === 1) return contem[0];
    throw new Error("Turma não encontrada: \"" + r + "\".");
  }
  function discDe(t, ref) {
    if (!ref && t.disciplinas.length === 1) return t.disciplinas[0];
    var n = norm(ref);
    var d = t.disciplinas.filter(function (x) { return x.id === ref || norm(x.nome) === n; })[0];
    if (d) return d;
    var c = t.disciplinas.filter(function (x) { return n && (norm(x.nome).indexOf(n) >= 0 || n.indexOf(norm(x.nome)) >= 0); });
    if (c.length === 1) return c[0];
    throw new Error("A disciplina \"" + (ref || "?") + "\" não existe em " + t.nome + ". Cadastre-a em ⚙️ Configurações (ou peça à I.A para adicionar).");
  }
  function alunoDe(t, ref) {
    if (typeof ref === "number" || /^\s*\d+\s*$/.test(String(ref))) {
      var n = parseInt(ref, 10); return t.alunos.some(function (a) { return a.n === n; }) ? n : null;
    }
    var s = String(ref || "");
    var cod = /T(\d+)\.(\d+)/.exec(s);
    if (cod) { var x = alunoDoCodigo(+cod[1], +cod[2]); return x && x.t.id === t.id ? x.a.n : null; }
    var alvo = norm(s); if (!alvo) return null;
    var lista = t.alunos.map(function (a) { return { n: a.n, nm: norm(a.nm) }; });
    var achar = function (f) { var r = lista.filter(f); return r.length === 1 ? r[0].n : null; };
    var partes = alvo.split(" ");
    return achar(function (a) { return a.nm === alvo; }) ||
      achar(function (a) { return a.nm.indexOf(alvo) === 0; }) ||
      achar(function (a) { var p = a.nm.split(" "); return partes.every(function (x) { return p.indexOf(x) >= 0; }); }) ||
      achar(function (a) { return a.nm.split(" ")[0] === partes[0]; });
  }
  function alunosDe(t, lista, perdidos) {
    var out = [];
    (Array.isArray(lista) ? lista : lista ? [lista] : []).forEach(function (ref) {
      var n = alunoDe(t, ref);
      if (n && out.indexOf(n) < 0) out.push(n); else if (!n) perdidos.push(String(ref));
    });
    return out;
  }
  function nomesDe(t, ns) { return ns.map(function (n) { var a = t.alunos.filter(function (x) { return x.n === n; })[0]; return a ? a.nm.split(" ")[0] : "nº " + n; }).join(", "); }
  function txt(v) { return restaurar(String(v == null ? "" : v).trim(), true); }
  function dataOk(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !isNaN(new Date(v + "T12:00:00")); }
  function hora(v) { var m = /^(\d{1,2}):(\d{2})/.exec(String(v || "")); return m ? dois(m[1]) + ":" + m[2] : ""; }
  function bimDe(d, v) {
    var b = parseInt(v, 10), nb = window.MeuDiarioRecursos ? window.MeuDiarioRecursos.numBims(d) : 4;
    if (!b || b < 1 || b > Math.max(nb, 8)) throw new Error("Bimestre inválido: " + v + ".");
    return b;
  }

  // Monta o "rel" de um diário a partir dos campos da ação.
  function relDaAcao(t, a, perdidos, base) {
    var rel = base ? JSON.parse(JSON.stringify(base)) : {};
    if (a.conteudo !== undefined) rel.conteudo = txt(a.conteudo);
    if (a.faltaram !== undefined) rel.faltaram = alunosDe(t, a.faltaram, perdidos);
    if (a.faltas_justificadas !== undefined) rel.faltJ = alunosDe(t, a.faltas_justificadas, perdidos);
    if (rel.faltJ && rel.faltaram) rel.faltJ = rel.faltJ.filter(function (n) { return rel.faltaram.indexOf(n) < 0; });
    if (a.comportamento !== undefined) {
      rel.comportamento = (a.comportamento || []).map(function (c) {
        return { alunos: alunosDe(t, c.alunos, perdidos), tipo: ["grave", "destaque"].indexOf(c.tipo) >= 0 ? c.tipo : "advertencia", texto: txt(c.texto) };
      }).filter(function (c) { return c.alunos.length && c.texto; });
    }
    if (a.atividade !== undefined) {
      var at = a.atividade || {}, velha = rel.atividade || {};
      rel.atividade = {
        houve: at.houve !== undefined ? !!at.houve : (velha.houve || !!(at.titulo || at.fez || at.nao_fez)),
        titulo: at.titulo !== undefined ? txt(at.titulo) : (velha.titulo || ""),
        descricao: at.descricao !== undefined ? txt(at.descricao) : (velha.descricao || ""),
        fez: at.fez !== undefined ? alunosDe(t, at.fez, perdidos) : (velha.fez || []),
        naoFez: at.nao_fez !== undefined ? alunosDe(t, at.nao_fez, perdidos) : (velha.naoFez || [])
      };
    }
    if (a.lembrete !== undefined) rel.lembrete = { titulo: txt((a.lembrete || {}).titulo), texto: txt((a.lembrete || {}).texto) };
    return rel;
  }
  function horasDe(a, ini, fim, padrao) {
    var h = parseInt(a.horas, 10);
    if (h > 0) return Math.min(h, 12);
    var x = /^(\d+):(\d+)$/.exec(ini), y = /^(\d+):(\d+)$/.exec(fim);
    if (x && y) { var min = (+y[1] * 60 + +y[2]) - (+x[1] * 60 + +x[2]); if (min > 0) return Math.max(1, Math.round(min / 50)); }
    return padrao || 1;
  }

  // Diário criado por uma resposta da IA da plataforma conta no limite do dia.
  async function consumirDiario() {
    var cli = cliente();
    if (!cli) throw new Error("Sem conexão com a plataforma.");
    var r = await cli.rpc("ia_consumir_cota", { p_tipo: "diarios", p_limite: LIMITE_DIARIOS });
    if (r.error) throw new Error("Não consegui conferir o limite de diários agora. Tente de novo.");
    if (!r.data || !r.data.ok) {
      throw new Error("A IA gratuita cria até " + ((r.data && r.data.limite) || LIMITE_DIARIOS) + " diários por dia, e esse limite já foi usado hoje. Registre à mão com + Novo Diário ou use a sua própria chave de API.");
    }
  }

  // Aplica uma ação. Devolve a mensagem de sucesso ou lança o erro.
  async function aplicar(a, origem) {
    var R = window.MeuDiarioRecursos, perdidos = [], t, d, msg;
    // A página pode ter ações próprias (ex.: AEE): devolve a mensagem ou undefined.
    if (M.aplicarAcao) { var propria = await M.aplicarAcao(a, ferramentas(), origem); if (propria !== undefined) return propria; }
    if (!acaoPermitida(a.tipo)) throw new Error("Esta ação não existe aqui: " + a.tipo + ". Nesta página a I.A registra e altera diários.");
    if (!R && ["plano_bimestre", "plano_status", "sequencia", "livro", "evento_calendario", "remover_evento"].indexOf(a.tipo) >= 0) throw new Error("Esta ação só existe no Meu Diário.");
    var aviso = function (m) { return perdidos.length ? m + " ⚠️ Não encontrei: " + perdidos.join(", ") + "." : m; };
    switch (a.tipo) {
      case "criar_diario": {
        t = turmaDe(a.turma); d = discDe(t, a.disciplina);
        if (!dataOk(a.data)) throw new Error("Data inválida: " + (a.data || "vazia") + ".");
        var ini = hora(a.inicio), fim = hora(a.fim);
        var rel = relDaAcao(t, Object.assign({ conteudo: "", faltaram: [], faltas_justificadas: [], comportamento: [], atividade: { houve: false } }, a), perdidos);
        var assunto = txt(a.assunto) || String(rel.conteudo || "").split(/[.\n]/)[0].slice(0, 80) || "Aula";
        if (origem === "plataforma") await consumirDiario();
        var id = window.NovoDiario.salvar({ turma: t.id, dateKey: a.data, discNome: d.nome, assunto: assunto, ini: ini, fim: fim, horas: horasDe(a, ini, fim, 1), rel: rel });
        if (!id) throw new Error("Não consegui criar o diário (já há registros demais nesta data para esta turma?).");
        msg = "Diário criado: " + t.nome + " · " + d.nome + " · " + M.dataBr(a.data) + ((rel.faltaram || []).length ? " · faltas: " + nomesDe(t, rel.faltaram) : "") + ".";
        return aviso(msg);
      }
      case "editar_diario": {
        var atual = M.diarios().filter(function (x) { return x.id === a.id; })[0];
        if (!atual) throw new Error("Diário não encontrado: " + a.id + ".");
        t = M.turma(atual.turma); if (!t) throw new Error("A turma deste diário não existe mais.");
        d = a.disciplina ? discDe(t, a.disciplina) : null;
        if (a.data !== undefined && !dataOk(a.data)) throw new Error("Data inválida: " + a.data + ".");
        var ini2 = a.inicio !== undefined ? hora(a.inicio) : atual.ini, fim2 = a.fim !== undefined ? hora(a.fim) : atual.fim;
        var rel2 = relDaAcao(t, a, perdidos, atual.rel || {});
        var ok = window.NovoDiario.salvar({
          id: atual.id, turma: atual.turma, dateKey: a.data || atual.dateKey, discNome: d ? d.nome : atual.discNome,
          assunto: a.assunto !== undefined ? txt(a.assunto) : atual.assunto, ini: ini2, fim: fim2,
          horas: a.horas !== undefined ? horasDe(a, ini2, fim2, atual.horas) : atual.horas, minutos: atual.minutos, rel: rel2, rascunho: atual.rascunho
        });
        if (!ok) throw new Error("Não consegui salvar a alteração.");
        return aviso("Diário de " + M.dataBr(a.data || atual.dateKey) + " (" + t.nome + ") atualizado.");
      }
      case "criar_turma": {
        var disc = (a.disciplinas || []).map(function (x) { return typeof x === "string" ? { nome: x } : { nome: x.nome, metaBim: x.meta_bimestre, total: x.total_ano }; });
        var r = M.criarTurma({ escolaNova: a.escola || "", nome: a.nome, meta: (disc[0] && disc[0].metaBim) || 10, disciplinas: disc, alunos: (a.alunos || []).map(txt) });
        if (r.erro) throw new Error(r.erro);
        return "Turma " + r.turma.nome + " criada com " + r.turma.alunos.length + " alunos e " + r.turma.disciplinas.length + " disciplina(s).";
      }
      case "adicionar_alunos": {
        t = turmaDe(a.turma);
        var novos = M.adicionarAlunos(t, (a.nomes || []).map(function (x) { return restaurar(x, false); }), false);
        M.salvarEstrutura("alunos");
        return novos.length ? novos.length + " aluno(s) adicionado(s) em " + t.nome + ": " + novos.map(function (x) { return x.n + ". " + x.nm; }).join(", ") + "." : "Nenhum aluno novo (os nomes já estavam na chamada).";
      }
      case "transferir_aluno": {
        t = turmaDe(a.turma);
        var n = alunoDe(t, a.aluno), al = t.alunos.filter(function (x) { return x.n === n; })[0];
        if (!al) throw new Error("Aluno não encontrado: " + a.aluno + ".");
        al.tr = true; M.salvarEstrutura("aluno");
        return al.nm + " marcado(a) como transferido(a).";
      }
      case "adicionar_disciplina": {
        t = turmaDe(a.turma);
        d = M.adicionarDisciplina(t, { nome: a.nome, metaBim: a.meta_bimestre, total: a.total_ano });
        if (!d) throw new Error("Informe o nome da disciplina.");
        M.salvarEstrutura("disc");
        return "Disciplina " + d.nome + " em " + t.nome + " (" + d.metaBim + " h/aula por bimestre, " + d.total + " no ano).";
      }
      case "plano_bimestre": {
        t = turmaDe(a.turma); d = discDe(t, a.disciplina);
        var b = bimDe(d, a.bimestre);
        var aulas = (a.aulas || []).map(function (x) { return typeof x === "string" ? { t: txt(x) } : { t: txt(x.titulo), s: txt(x.detalhe), av: !!x.avaliacao }; }).filter(function (x) { return x.t; });
        if (!aulas.length) throw new Error("O plano veio sem aulas.");
        var total = R.definirBimestre(t.id, d.id, b, txt(a.tema), aulas, a.modo === "acrescentar" ? "acrescentar" : "substituir");
        return "Plano do " + b + "º bimestre de " + d.nome + " (" + t.nome + "): " + total + " aulas.";
      }
      case "plano_status": {
        t = turmaDe(a.turma); d = discDe(t, a.disciplina);
        var st = { planejada: "pl", aplicada: "ap", pulada: "pu", lancada: "sm", "lançada": "sm", limpar: "limpar" }[norm(a.status).replace(/ /g, "")] || "";
        if (!st) throw new Error("Status inválido: " + a.status + ".");
        if (!R.marcarAula(t.id, d.id, bimDe(d, a.bimestre), parseInt(a.aula, 10), st)) throw new Error("Aula " + a.aula + " não existe nesse bimestre.");
        return "Aula " + a.aula + " do " + a.bimestre + "º bimestre de " + d.nome + " marcada como " + a.status + ".";
      }
      case "documento": {
        var Doc = window.MeuDiarioDocumentos;
        if (!Doc) throw new Error("Esta página não tem a aba Documentos. Use ⬇️ Baixar na resposta.");
        var conteudo = restaurar(String(a.conteudo || ""), false).trim();
        if (!conteudo) throw new Error("O documento veio vazio.");
        var ta = null; try { ta = a.turma ? turmaDe(a.turma) : null; } catch (e) {}
        var aba = norm(a.aba || a.categoria || ""), tipoDoc = /seq|projeto/.test(aba) ? "seq" : /curso|anual/.test(aba) ? "curso" : /rel|parecer|ata|comunic/.test(aba) ? "rel" : /aula|prova|ativ/.test(aba) ? "aula" : "";
        var salvo = Doc.criar({ tipo: tipoDoc, titulo: restaurar(String(a.titulo || ""), false), conteudo: conteudo, turma: ta ? ta.id : "", disciplina: a.disciplina || "", bimestre: a.bimestre, pasta: a.pasta ? String(a.pasta) : "", ferramenta: (conversaAtual() || {}).ferramenta || "" });
        return "Documento salvo em " + salvo.onde + ": " + salvo.doc.titulo + ".";
      }
      case "sequencia":
      case "livro": {
        t = turmaDe(a.turma); d = discDe(t, a.disciplina);
        // A aba Sequências virou Documentos: a sequência vira documento.
        if (a.tipo === "sequencia" && window.MeuDiarioDocumentos) {
          var partes = [["Objetivo", a.objetivo], ["Ferramentas e recursos", a.recursos], ["Etapas", a.etapas], ["Observações", a.observacoes], ["Arquivo", a.url]]
            .filter(function (x) { return x[1]; }).map(function (x) { return "## " + x[0] + "\n\n" + restaurar(String(x[1]), false); });
          var sq = window.MeuDiarioDocumentos.criar({ tipo: "seq", titulo: txt(a.titulo), conteudo: partes.join("\n\n") || txt(a.titulo), turma: t.id, disciplina: d.nome, bimestre: a.bimestre });
          return "Sequência salva em " + sq.onde + ".";
        }
        var bb = bimDe(d, a.bimestre);
        var campos = { titulo: txt(a.titulo), url: txt(a.url), st: ({ criando: "criando", concluido: "concluido", "concluído": "concluido", concluida: "concluido", "concluída": "concluido" })[norm(a.status)] || undefined };
        if (a.tipo === "sequencia") {
          ["objetivo", "recursos", "etapas", "observacoes"].forEach(function (c) { if (a[c] !== undefined) campos[c] = txt(a[c]); });
          R.salvarSequencia(t.id, d.id, bb, campos);
          return "Sequência do " + bb + "º bimestre de " + d.nome + " (" + t.nome + ") salva" + (campos.titulo ? ": " + campos.titulo : "") + ".";
        }
        if (Array.isArray(a.temas)) campos.temas = a.temas.map(function (x) { return { t: txt(typeof x === "string" ? x : x.titulo || x.t), ok: !!(x && x.ok) }; }).filter(function (x) { return x.t; });
        R.salvarLivro(t.id, d.id, bb, campos);
        return "Livro do " + bb + "º bimestre de " + d.nome + " (" + t.nome + ") salvo" + (campos.titulo ? ": " + campos.titulo : "") + ".";
      }
      case "evento_calendario": {
        if (!dataOk(a.data)) throw new Error("Data inválida: " + (a.data || "vazia") + ".");
        if (!txt(a.titulo)) throw new Error("O evento veio sem título.");
        R.adicionarEvento({ ini: a.data, fim: dataOk(a.ate) ? a.ate : "", tipo: norm(a.categoria), titulo: txt(a.titulo), desc: txt(a.descricao) });
        return "Evento no calendário: " + txt(a.titulo) + " (" + M.dataBr(a.data) + (dataOk(a.ate) && a.ate !== a.data ? " a " + M.dataBr(a.ate) : "") + ").";
      }
      case "remover_evento": {
        if (!R.removerEvento(a.id)) throw new Error("Evento não encontrado.");
        return "Evento removido do calendário.";
      }
    }
    throw new Error("Tipo de ação desconhecido: " + a.tipo + ".");
  }
  function descrever(a) {
    if (M.descreverAcao) { var x = M.descreverAcao(a, ferramentas()); if (x) return x; }
    var tn = function () { try { return turmaDe(a.turma).nome; } catch (e) { return a.turma || "?"; } };
    switch (a.tipo) {
      case "criar_diario": return { ic: "📝", t: "Registrar diário — " + tn() + " · " + (a.disciplina || "") + " · " + (a.data ? M.dataBr(a.data) : "?"), d: [txt(a.assunto), a.horas ? a.horas + " h/aula" : "", (a.faltaram || []).length ? (a.faltaram.length + " falta(s)") : "sem faltas", a.atividade && a.atividade.houve ? "com atividade" : ""].filter(Boolean).join(" · ") };
      case "editar_diario": return { ic: "✏️", t: "Alterar diário " + (a.id || ""), d: Object.keys(a).filter(function (k) { return k !== "tipo" && k !== "id"; }).join(", ") };
      case "criar_turma": return { ic: "🏫", t: "Criar turma " + (a.nome || ""), d: (a.escola || "") + " · " + (a.alunos || []).length + " alunos · " + (a.disciplinas || []).map(function (x) { return x.nome || x; }).join(", ") };
      case "adicionar_alunos": return { ic: "👥", t: "Adicionar " + (a.nomes || []).length + " aluno(s) em " + tn(), d: (a.nomes || []).map(function (x) { return restaurar(x); }).join(", ") };
      case "transferir_aluno": return { ic: "🚪", t: "Marcar aluno como transferido — " + tn(), d: restaurar(String(a.aluno)) };
      case "adicionar_disciplina": return { ic: "📘", t: "Adicionar disciplina " + (a.nome || "") + " em " + tn(), d: (a.meta_bimestre || 10) + " h/aula por bimestre" };
      case "plano_bimestre": return { ic: "📚", t: "Plano do " + a.bimestre + "º bimestre — " + tn() + " · " + (a.disciplina || ""), d: (a.aulas || []).length + " aulas" + (a.tema ? " · " + txt(a.tema) : "") + (a.modo === "acrescentar" ? " · acrescentar" : "") };
      case "plano_status": return { ic: "✅", t: "Plano: aula " + a.aula + " (" + a.bimestre + "º bim) → " + a.status, d: tn() + " · " + (a.disciplina || "") };
      case "sequencia": return { ic: "🗂", t: "Sequência do " + a.bimestre + "º bimestre — " + tn() + " · " + (a.disciplina || ""), d: txt(a.titulo) };
      case "documento": return { ic: "📁", t: "Salvar documento — " + txt(a.titulo || "sem título"), d: [nomeAbaDoc(/seq|projeto/.test(norm(a.aba)) ? "seq" : /curso/.test(norm(a.aba)) ? "curso" : /rel/.test(norm(a.aba)) ? "rel" : "aula"), a.turma ? tn() : "", a.disciplina || "", a.bimestre ? a.bimestre + "º bim" : "", a.pasta ? "📁 " + a.pasta : ""].filter(Boolean).join(" · ") };
      case "livro": return { ic: "📖", t: "Livro do " + a.bimestre + "º bimestre — " + tn() + " · " + (a.disciplina || ""), d: txt(a.titulo) };
      case "evento_calendario": return { ic: "📆", t: "Calendário: " + txt(a.titulo), d: (a.data ? M.dataBr(a.data) : "?") + (a.ate && a.ate !== a.data ? " a " + M.dataBr(a.ate) : "") + " · " + (a.categoria || "evento") };
      case "remover_evento": return { ic: "🗑", t: "Remover evento do calendário", d: a.id };
    }
    return { ic: "❔", t: a.tipo, d: "" };
  }
  async function aplicarUma(mi, ai) {
    var m = chat[mi]; if (!m || !m.acoes[ai]) return;
    m.estados = m.estados || {};
    if (m.estados[ai] && m.estados[ai].ok) return;
    try { m.estados[ai] = { ok: true, msg: await aplicar(m.acoes[ai], m.prov) }; }
    catch (e) { m.estados[ai] = { ok: false, msg: String((e && e.message) || e) }; }
  }
  async function aplicarTodas(mi, semDesenhar) {
    var m = chat[mi]; if (!m) return;
    for (var i = 0; i < (m.acoes || []).length; i++) {
      var e = (m.estados || {})[i];
      if (!e || (!e.ok && !e.descartada)) await aplicarUma(mi, i);
    }
    gravarChat();
    if (!semDesenhar) desenharChat();
    var erros = (m.acoes || []).filter(function (a, i) { return m.estados[i] && !m.estados[i].ok && !m.estados[i].descartada; }).length;
    M.toast(erros ? "Algumas ações não foram aplicadas — veja os avisos." : "Pronto! Alterações aplicadas.");
  }

  // ── texto da I.A em HTML (markdown simples e seguro) ────────────────
  function markdown(texto) {
    var blocos = [];
    var s = String(texto || "").replace(/```[\w-]*\n?([\s\S]*?)```/g, function (m, c) { blocos.push(c); return "\u0000" + (blocos.length - 1) + "\u0000"; });
    var linhas = esc(s).split("\n"), out = [], lista = null, tabela = [];
    function fecharLista() { if (lista) { out.push("</" + lista + ">"); lista = null; } }
    function fecharTabela() {
      if (!tabela.length) return;
      var rows = tabela.filter(function (l) { return /[\p{L}\p{N}]/u.test(l.replace(/[-:|\s]/g, "")); });
      out.push('<div class="ia-tab"><table>' + rows.map(function (l, i) {
        var cel = l.trim().replace(/^\||\|$/g, "").split("|");
        return "<tr>" + cel.map(function (c) { return (i ? "<td>" : "<th>") + c.trim() + (i ? "</td>" : "</th>"); }).join("") + "</tr>";
      }).join("") + "</table></div>");
      tabela = [];
    }
    linhas.forEach(function (l) {
      if (/^\s*\|.*\|\s*$/.test(l)) { fecharLista(); tabela.push(l); return; }
      fecharTabela();
      var ul = /^\s*[-*•]\s+(.*)$/.exec(l), ol = /^\s*\d+[.)]\s+(.*)$/.exec(l), h = /^\s*#{1,4}\s+(.*)$/.exec(l);
      if (ul || ol) {
        var tipo = ul ? "ul" : "ol";
        if (lista !== tipo) { fecharLista(); out.push("<" + tipo + ">"); lista = tipo; }
        out.push("<li>" + (ul || ol)[1] + "</li>");
        return;
      }
      fecharLista();
      if (h) out.push('<b class="ia-h">' + h[1] + "</b>");
      else if (!l.trim()) out.push('<div class="ia-esp"></div>');
      else out.push("<p>" + l + "</p>");
    });
    fecharLista(); fecharTabela();
    return out.join("")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(>])\*([^*\n<]+)\*(?=[\s).,;:!?<]|$)/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\u0000(\d+)\u0000/g, function (m, i) { return "<pre>" + esc(blocos[+i]) + "</pre>"; });
  }

  // ── desenho ────────────────────────────────────────────────────────
  function estilo() {
    return "<style>" +
      ".ia-wrap{display:grid;gap:16px}" +
      ".ia-cfg summary{cursor:pointer;font-weight:700;color:var(--md-titulo);display:flex;align-items:center;gap:8px;flex-wrap:wrap;list-style:none}.ia-cfg summary::-webkit-details-marker{display:none}" +
      ".ia-cfg summary .ia-st{font-size:.72rem;font-weight:700;border-radius:999px;padding:3px 10px}" +
      ".ia-st.ok{background:var(--vs);color:var(--vm)}.ia-st.no{background:var(--os);color:#7a5c10}" +
      ".ia-provs{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin:14px 0}" +
      ".ia-prov{border:2px solid var(--md-linha);border-radius:12px;padding:10px 12px;cursor:pointer;background:var(--md-sup2);text-align:left;color:var(--ce)}" +
      ".ia-prov b{display:block;font-size:.86rem}.ia-prov small{font-size:.72rem;color:var(--cm)}" +
      ".ia-prov.on{border-color:var(--md-destaque);box-shadow:0 0 0 3px color-mix(in srgb,var(--md-destaque) 18%,transparent)}" +
      ".ia-plano{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;border:1px solid var(--md-linha);border-left:3px solid var(--md-destaque);border-radius:12px;padding:12px 14px;margin:4px 0 10px;background:var(--md-sup2)}" +
      ".ia-plano>div{display:flex;flex-direction:column;min-width:170px}.ia-plano>div b{font-size:.9rem;color:var(--md-titulo)}.ia-plano>div span{font-size:.8rem;color:var(--md-destaque);font-weight:700}" +
      ".ia-plano ul{flex:1;min-width:220px;margin:0 0 0 18px;font-size:.8rem;color:var(--cm);line-height:1.6}" +
      ".ia-prov.gratis b{color:var(--md-destaque)}" +
      ".ia-nota{font-size:.76rem;color:var(--cm);line-height:1.55;background:var(--md-sup2);border:1px dashed var(--md-linha);border-radius:10px;padding:9px 12px;margin-top:10px}" +
      ".ia-chk{display:flex;gap:8px;align-items:flex-start;font-size:.82rem;margin:8px 0;color:var(--ce)}.ia-chk input{margin-top:3px}" +
      ".ia-chat{display:flex;flex-direction:column;padding:0;overflow:hidden}" +
      ".ia-chat-h{display:flex;align-items:center;gap:10px;padding:13px 18px;border-bottom:1px solid var(--md-linha);background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff}" +
      ".ia-chat-h b{font-family:'Playfair Display',serif;font-size:1rem}.ia-chat-h small{font-size:.72rem;opacity:.7;flex:1}" +
      ".ia-chat-h button{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:5px 11px;font-size:.74rem;cursor:pointer}" +
      ".ia-hb{width:32px;height:32px;padding:0!important;border-radius:9px!important;font-size:1rem!important}" +
      ".ia-corpo{display:grid;grid-template-columns:250px minmax(0,1fr);position:relative}.ia-corpo.sem-lista{grid-template-columns:minmax(0,1fr)}.ia-corpo.sem-lista .ia-lista{display:none}" +
      ".ia-princ{min-width:0;display:flex;flex-direction:column}" +
      ".ia-lista{border-right:1px solid var(--md-linha,#e8e5de);background:var(--md-sup,#fff);display:flex;flex-direction:column;min-height:0;max-height:calc(62vh + 150px)}" +
      ".ia-lista-top{padding:10px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid var(--md-linha,#e8e5de)}" +
      ".ia-lista-novo{border:1px solid var(--md-linha,#e8e5de);background:var(--md-sup2,#faf8f2);color:var(--ce,#2b2b2b);border-radius:10px;padding:8px 10px;font-family:inherit;font-weight:700;font-size:.82rem;cursor:pointer;text-align:left}" +
      ".ia-busca{border:1px solid var(--md-linha,#e8e5de);background:var(--md-sup2,#faf8f2);color:var(--ce,#2b2b2b);border-radius:9px;padding:7px 10px;font:inherit;font-size:.82rem;width:100%;box-sizing:border-box}" +
      ".ia-convs{overflow-y:auto;padding:6px 6px 10px;flex:1}" +
      ".ia-conv-g{font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--cm,#5a5a5a);padding:10px 8px 4px}" +
      ".ia-conv{display:flex;align-items:center;border-radius:9px}.ia-conv:hover,.ia-conv.on{background:var(--md-sup3,#f5f3ee)}.ia-conv.on .ia-conv-t{font-weight:700}" +
      ".ia-conv-t{flex:1;min-width:0;background:none;border:none;text-align:left;padding:8px;font:inherit;font-size:.83rem;color:var(--ce,#2b2b2b);cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".ia-conv-b{background:none;border:none;cursor:pointer;font-size:.75rem;padding:6px 4px;opacity:0;transition:opacity .15s}.ia-conv:hover .ia-conv-b,.ia-conv.on .ia-conv-b,.ia-conv-b:focus{opacity:.8}" +
      ".ia-conv-vazio{font-size:.8rem;color:var(--cm,#5a5a5a);padding:12px 8px}" +
      "html.dark-2026 .ia-lista{background:#15181b!important;border-right-color:#383d43!important}" +
      "html.dark-2026 .ia-lista-top{border-bottom-color:#383d43!important}" +
      "html.dark-2026 .ia-lista-novo,html.dark-2026 .ia-busca{background:#202327!important;border-color:#383d43!important;color:#f4f5f6!important}" +
      "html.dark-2026 .ia-conv:hover,html.dark-2026 .ia-conv.on{background:#272b30!important}html.dark-2026 .ia-conv-t{color:#f4f5f6!important}html.dark-2026 .ia-conv-g{color:#aeb4bd!important}" +
      "@media(max-width:760px){.ia-corpo,.ia-corpo.sem-lista{grid-template-columns:minmax(0,1fr)}.ia-corpo .ia-lista,.ia-corpo.sem-lista .ia-lista{display:none}" +
      ".ia-corpo.lista-on .ia-lista{display:flex;position:absolute;inset:0 18% 0 0;z-index:5;max-height:none;box-shadow:8px 0 24px rgba(0,0,0,.25)}.ia-conv-b{opacity:.8}}" +
      ".ia-msgs{min-height:300px;max-height:62vh;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:12px;background:var(--md-sup2)}" +
      ".ia-m{max-width:88%;border-radius:14px;padding:10px 14px;font-size:.88rem;line-height:1.55;word-wrap:break-word}" +
      ".ia-m.u{align-self:flex-end;background:var(--md-acento);color:var(--md-acento-txt);border-bottom-right-radius:4px;white-space:pre-wrap}" +
      ".ia-m.a{align-self:flex-start;background:var(--md-sup);border:1px solid var(--md-linha);border-bottom-left-radius:4px;color:var(--ce)}" +
      ".ia-m.e{align-self:flex-start;background:var(--rs);color:var(--ra);border:1px solid #f5c6c0}" +
      ".ia-m p{margin:0 0 4px}.ia-m ul,.ia-m ol{margin:4px 0 6px 20px}.ia-m li{margin:2px 0}.ia-esp{height:6px}" +
      ".ia-m .ia-h{display:block;margin:8px 0 4px;font-size:.92rem;color:var(--md-titulo)}" +
      ".ia-m pre{background:var(--md-sup3);border-radius:8px;padding:8px 10px;overflow-x:auto;font-size:.76rem;white-space:pre-wrap}" +
      ".ia-m code{background:var(--md-sup3);border-radius:4px;padding:0 4px;font-size:.8rem}" +
      ".ia-tab{overflow-x:auto;margin:6px 0}.ia-tab table{border-collapse:collapse;font-size:.8rem;min-width:100%}.ia-tab th,.ia-tab td{border:1px solid var(--md-linha);padding:4px 7px;text-align:left}.ia-tab th{background:var(--md-sup3)}" +
      ".ia-meta{font-size:.66rem;color:var(--cm);margin-top:6px}" +
      ".ia-anx-u{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.ia-anx-u span{font-size:.7rem;background:rgba(255,255,255,.18);border-radius:6px;padding:2px 7px}" +
      ".ia-acoes{margin-top:10px;border-top:1px dashed var(--md-linha);padding-top:10px;display:flex;flex-direction:column;gap:7px}" +
      ".ia-acoes-t{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--cm)}" +
      ".ia-ac{display:flex;gap:9px;align-items:flex-start;background:var(--md-sup2);border:1px solid var(--md-linha);border-radius:10px;padding:8px 10px}" +
      ".ia-ac .ic{font-size:1.1rem}.ia-ac .tx{flex:1;min-width:0}.ia-ac .tx b{display:block;font-size:.82rem}.ia-ac .tx small{font-size:.74rem;color:var(--cm);display:block}" +
      ".ia-ac .res{font-size:.74rem;margin-top:3px;font-weight:600}.ia-ac.ok{border-color:#4a9467;background:color-mix(in srgb,#4a9467 10%,var(--md-sup2))}.ia-ac.ok .res{color:#1f7a4d}" +
      ".ia-ac.er{border-color:#e87878}.ia-ac.er .res{color:var(--ra)}.ia-ac.ds{opacity:.5}" +
      ".ia-ac-b{display:flex;gap:5px;flex-shrink:0}" +
      ".ia-acoes-b{display:flex;gap:8px;flex-wrap:wrap}" +
      ".ia-pensa{align-self:flex-start;font-size:.84rem;color:var(--cm);padding:8px 14px;background:var(--md-sup);border:1px solid var(--md-linha);border-radius:14px}" +
      ".ia-pensa i{display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin:0 2px;animation:iaP 1.2s infinite}.ia-pensa i:nth-child(2){animation-delay:.2s}.ia-pensa i:nth-child(3){animation-delay:.4s}" +
      "@keyframes iaP{0%,80%,100%{opacity:.25}40%{opacity:1}}" +
      ".ia-sug{display:flex;gap:6px;flex-wrap:wrap;padding:10px 18px 0}" +
      ".ia-sug button{border:1px solid var(--md-linha);background:var(--md-sup);color:var(--ce);border-radius:999px;padding:6px 11px;font-size:.76rem;cursor:pointer}" +
      ".ia-anexos{display:flex;gap:6px;flex-wrap:wrap;padding:10px 18px 0}" +
      ".ia-anx{display:inline-flex;align-items:center;gap:6px;background:var(--md-sup2);border:1px solid var(--md-linha);border-radius:10px;padding:4px 6px;font-size:.74rem;max-width:230px}" +
      ".ia-anx img{width:30px;height:30px;object-fit:cover;border-radius:6px}.ia-anx span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".ia-anx button{border:none;background:none;color:var(--ra);cursor:pointer;font-size:.85rem}" +
      ".ia-in{display:flex;gap:8px;align-items:flex-end;padding:12px 18px 16px}" +
      ".ia-in textarea{flex:1;resize:none;min-height:46px;max-height:200px;padding:11px 13px;border:2px solid var(--md-linha);border-radius:14px;font:inherit;font-size:.9rem;background:var(--md-sup);color:var(--ce)}" +
      ".ia-in .ib{width:44px;height:44px;border-radius:50%;border:1px solid var(--md-linha);background:var(--md-sup2);font-size:1.1rem;cursor:pointer;flex-shrink:0;color:var(--ce)}" +
      ".ia-in .env{width:auto;padding:0 18px;border-radius:999px;background:var(--md-acento);color:var(--md-acento-txt);border-color:var(--md-acento);font-weight:700;font-size:.86rem}" +
      ".ia-arr{outline:3px dashed var(--md-destaque);outline-offset:-6px}" +
      ".ia-vazio{text-align:center;color:var(--cm);font-size:.86rem;padding:26px 10px;line-height:1.6}" +
      "html.dark-2026 .ia-chat-h{background:#0c0e10!important;border-bottom-color:#383d43}" +
      "html.dark-2026 .ia-st.ok{background:var(--dark-positive-soft);color:var(--dark-positive)}html.dark-2026 .ia-st.no{background:var(--dark-warning-soft);color:var(--dark-warning)}" +
      "html.dark-2026 .ia-m.u{color:#151719}" +
      "html.dark-2026 .ia-m.e{background:var(--dark-negative-soft);color:var(--dark-negative);border-color:#7a3530}" +
      "html.dark-2026 .ia-ac.ok .res{color:var(--dark-positive)}" +
      "html.dark-2026 .ia-in .env{background:linear-gradient(135deg,var(--dark-accent),var(--dark-accent-strong))!important;color:#151719!important}" +
      "html.dark-2026 .ia-prov.on{border-color:var(--dark-accent)!important}" +
      "@media(max-width:560px){.ia-m{max-width:96%}.ia-msgs{padding:12px;max-height:58vh}.ia-in{padding:10px 12px 12px}.ia-in .env{padding:0 14px}.ia-in .ib{width:38px;height:38px;font-size:1rem}.ia-chat-h small{display:none}.ia-ac{flex-wrap:wrap}.ia-ac-b{width:100%;justify-content:flex-end}}" +
      // 💬 Conversa | 🧰 Ferramentas
      ".ia-modos{display:inline-flex;justify-self:start;gap:4px;padding:4px;border-radius:999px;background:var(--md-sup3);border:1px solid var(--md-linha);max-width:100%}" +
      ".ia-modos button{border:none;background:none;border-radius:999px;padding:9px 18px;font:inherit;font-weight:700;font-size:.88rem;color:var(--cm);cursor:pointer;white-space:nowrap}" +
      ".ia-modos button.on{background:var(--md-acento);color:var(--md-acento-txt);box-shadow:0 2px 8px rgba(0,0,0,.12)}.ia-modos small{font-size:.7rem;opacity:.8;margin-left:3px}" +
      ".ia-wrap.modo-ferr .ia-chat{display:none}.ia-wrap:not(.modo-ferr) .ia-ferr{display:none}" +
      ".ia-ferr-top{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}.ia-ferr-tt b{display:block;font-size:1rem;color:var(--md-titulo)}.ia-ferr-tt span{font-size:.8rem;color:var(--cm)}" +
      ".ia-ferr-busca{width:100%;box-sizing:border-box;padding:10px 12px;border:2px solid var(--md-linha);border-radius:12px;font:inherit;font-size:.88rem;background:var(--md-sup2);color:var(--ce)}" +
      ".ia-cats{display:flex;flex-wrap:wrap;gap:6px}.ia-cats button{border:1px solid var(--md-linha);background:var(--md-sup2);color:var(--ce);border-radius:999px;padding:6px 12px;font:inherit;font-size:.78rem;font-weight:700;cursor:pointer}" +
      ".ia-cats button.on{border-color:var(--md-destaque);color:var(--md-destaque);background:color-mix(in srgb,var(--md-destaque) 12%,transparent)}.ia-cats small{opacity:.7}" +
      ".ia-ferr-filtro{font-size:.8rem;color:var(--cm)}.ia-ferr-filtro button{border:none;background:none;color:var(--md-destaque);font:inherit;font-weight:700;cursor:pointer}" +
      ".ia-ferr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}" +
      ".ia-fc{text-align:left;border:1px solid var(--md-linha);background:var(--md-sup2);border-radius:14px;padding:14px;cursor:pointer;display:flex;flex-direction:column;gap:6px;font:inherit;color:var(--ce);transition:border-color .15s,transform .15s,box-shadow .15s}" +
      ".ia-fc:hover,.ia-fc:focus-visible{border-color:var(--md-destaque);transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.08)}" +
      ".ia-fc .ic{font-size:1.6rem;line-height:1}.ia-fc b{font-size:.92rem;color:var(--md-titulo);line-height:1.3}.ia-fc p{font-size:.78rem;color:var(--cm);line-height:1.45;margin:0;flex:1}.ia-fc small{font-size:.7rem;color:var(--md-destaque);font-weight:700}" +
      ".ia-ferr-slot:empty{display:none}.ia-ferr-atual{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.14);border-radius:999px;padding:3px 4px 3px 10px;font-size:.74rem;font-weight:700;max-width:46vw;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}" +
      ".ia-ferr-atual button{padding:1px 7px!important;font-size:.7rem!important}" +
      ".ia-msg-b{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-top:9px;border-top:1px dashed var(--md-linha)}" +
      ".ia-msg-b button{border:1px solid var(--md-linha);background:var(--md-sup2);color:var(--ce);border-radius:999px;padding:6px 12px;font:inherit;font-size:.75rem;font-weight:700;cursor:pointer}" +
      ".ia-msg-b button.pri{background:var(--md-acento);color:var(--md-acento-txt);border-color:var(--md-acento)}" +
      ".ia-fila{margin:10px 0;border:1px solid var(--md-linha);border-radius:12px;padding:10px 14px;background:var(--md-sup2);font-size:.8rem;color:var(--ce)}" +
      ".ia-fila summary{cursor:pointer;font-weight:700;color:var(--md-titulo)}.ia-fila ol{margin:10px 0 6px 20px;line-height:1.55}.ia-fila ol>li{margin-bottom:6px}.ia-fila ul{margin:2px 0 0 18px;color:var(--cm);columns:2;column-gap:18px}.ia-fila p{font-size:.76rem;color:var(--cm);margin:6px 0 0}" +
      ".ia-fila-st{font-size:.66rem;font-weight:700;border-radius:999px;padding:1px 8px;margin-left:4px}.ia-fila-st.on{background:var(--vs,#e3f1e8);color:var(--vm,#2d6147)}.ia-fila-st.off{background:var(--md-sup3);color:var(--cm)}" +
      // janela das ferramentas e do baixar (fora do #sec-ia: cores com reserva)
      ".ia-fov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10050;display:flex;align-items:center;justify-content:center;padding:14px}" +
      ".ia-fov-box{background:var(--md-sup,#fff);color:var(--ce,#2b2b2b);border-radius:16px;max-width:780px;width:100%;max-height:92vh;overflow:auto;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:inherit;box-sizing:border-box}" +
      ".ia-fov h2{font-size:1.15rem;margin:0;color:var(--md-titulo,#1a3a2a)}.ia-fov-sub{font-size:.84rem;color:var(--cm,#5a5a5a);margin:4px 0 10px}" +
      ".ia-fov-h{display:flex;gap:12px;align-items:flex-start}.ia-fov-h .ic{font-size:2rem;line-height:1}.ia-fov-h>div{flex:1;min-width:0}.ia-fov-h small{font-size:.76rem;color:var(--md-destaque,#2d6147);font-weight:700}" +
      ".ia-fov-x{border:none;background:none;font-size:1.1rem;cursor:pointer;color:var(--cm,#5a5a5a);padding:4px 8px;border-radius:8px}" +
      ".ia-fov-desc{font-size:.88rem;line-height:1.55;color:var(--ce,#2b2b2b);margin:12px 0 8px}" +
      ".ia-como{border:1px solid var(--md-linha,#e8e5de);border-radius:12px;padding:8px 12px;margin-bottom:12px;background:var(--md-sup2,#faf8f2);font-size:.82rem}.ia-como summary{cursor:pointer;font-weight:700}.ia-como ol{margin:6px 0 2px 20px;line-height:1.55}" +
      ".ia-campos{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:10px}" +
      ".ia-cp{display:flex;flex-direction:column;gap:4px;min-width:0}.ia-cp.larga{grid-column:1/-1}" +
      ".ia-cp label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--md-destaque,#2d6147)}" +
      ".ia-cp input,.ia-cp select,.ia-cp textarea{padding:9px 11px;border:2px solid var(--md-linha,#e8e5de);border-radius:10px;font:inherit;font-size:.9rem;background:var(--md-sup2,#faf8f2);color:var(--ce,#2b2b2b);width:100%;box-sizing:border-box;min-width:0}" +
      ".ia-cp textarea{resize:vertical;line-height:1.5}.ia-pr{font-size:.86rem!important;background:var(--md-sup3,#f5f3ee)!important}" +
      ".ia-fov-b{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-end;margin-top:12px}.ia-fov-b [data-msg]{flex:1;min-width:160px;font-size:.8rem;color:var(--ra,#b9635d)}" +
      ".ia-fb{border-radius:10px;padding:9px 14px;font:inherit;font-weight:700;font-size:.84rem;border:1px solid var(--md-linha,#e8e5de);background:var(--md-sup3,#f5f3ee);color:inherit;cursor:pointer}" +
      ".ia-fb.pri{background:var(--md-acento,#2d6147);color:var(--md-acento-txt,#fff);border-color:var(--md-acento,#2d6147)}" +
      ".ia-fov-fmt{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px}" +
      "html.dark-2026 .ia-fov{background:rgba(3,4,5,.78)}" +
      "html.dark-2026 .ia-fov-box{background:#191c1f;color:#f4f5f6;border:1px solid #383d43}" +
      "html.dark-2026 .ia-fov h2{color:#f4f5f6}html.dark-2026 .ia-fov-h small,html.dark-2026 .ia-cp label{color:#ffa65b}" +
      "html.dark-2026 .ia-fov-desc{color:#e6e8ea}html.dark-2026 .ia-como{background:#202327;border-color:#383d43}" +
      "html.dark-2026 .ia-cp input,html.dark-2026 .ia-cp select,html.dark-2026 .ia-cp textarea{background:#202327;border-color:#383d43;color:#f4f5f6}html.dark-2026 .ia-pr{background:#272b30!important}" +
      "html.dark-2026 .ia-fb{background:#202327;border-color:#383d43;color:#f4f5f6}html.dark-2026 .ia-fb.pri{background:#ffa65b;border-color:#ffa65b;color:#1b130b}" +
      "html.dark-2026 .ia-modos button.on{background:linear-gradient(135deg,var(--dark-accent),var(--dark-accent-strong));color:#151719}" +
      "html.dark-2026 .ia-fc{background:#202327;border-color:#383d43}html.dark-2026 .ia-fc b{color:#f4f5f6}html.dark-2026 .ia-fc small,html.dark-2026 .ia-cats button.on{color:#ffa65b;border-color:#ffa65b}" +
      "html.dark-2026 .ia-msg-b button.pri{background:#ffa65b;color:#151719;border-color:#ffa65b}" +
      "html.dark-2026 .ia-fila{background:#202327;border-color:#383d43}html.dark-2026 .ia-fila summary{color:#f4f5f6}html.dark-2026 .ia-fila-st.on{background:var(--dark-positive-soft);color:var(--dark-positive)}" +
      "@media(max-width:560px){.ia-modos{display:flex;width:100%}.ia-modos button{flex:1;padding:9px 8px}.ia-ferr-grid{grid-template-columns:1fr}.ia-fila ul{columns:1}.ia-fov-box{padding:16px 14px;border-radius:14px}.ia-fov{padding:8px;align-items:flex-end}}" +
      "</style>";
  }
  function desenharConfigHtml() {
    if (naPlataforma()) return configPlataformaHtml();
    var tem = !!chaveAtual(), p = PROV[cfg.prov];
    var lista = cfg.listas[cfg.prov] || [];
    var mod = modeloAtual();
    if (lista.length && lista.indexOf(mod) < 0) lista = [mod].concat(lista);
    return '<details class="md-card ia-cfg"' + (tem ? "" : " open") + '><summary>🔑 Chave de API <span class="ia-st ' + (tem ? "ok" : "no") + '">' + (tem ? "✓ " + esc(p.nome) + " · " + esc(mod) : "Não configurada") + '</span><span style="flex:1"></span><span style="font-size:.74rem;color:var(--cm);font-weight:500">Configurar ▾</span></summary>' +
      '<p style="margin-top:12px">Use a sua própria conta de IA, sem o limite diário da plataforma. Escolha o serviço, crie uma chave no site dele e cole abaixo. <strong>A chave fica guardada só neste aparelho</strong> e as mensagens vão direto do seu navegador para o serviço escolhido — não passam pelos servidores do Meu Diário.</p>' +
      cartoesProvedores() +
      '<div class="md-grid"><div class="md-f"><label>Chave de API — ' + esc(p.nome) + ' · <a href="' + p.link + '" target="_blank" rel="noopener">criar chave ↗</a></label><div class="md-row" style="margin:0"><input type="password" class="md-in" data-ia="chave" value="' + esc(cfg.chaves[cfg.prov] || "") + '" placeholder="Cole a chave aqui" autocomplete="off" spellcheck="false"><button type="button" class="md-btn mini" data-ia="ver" title="Mostrar/ocultar">👁</button></div></div>' +
      '<div class="md-f"><label>Modelo</label>' + (lista.length ? '<select data-ia="modelo">' + lista.map(function (id) { return '<option value="' + esc(id) + '"' + (id === mod ? " selected" : "") + ">" + esc(id) + "</option>"; }).join("") + "</select>" : '<input type="text" data-ia="modelo" value="' + esc(mod) + '">') + "</div></div>" +
      '<label class="ia-chk"><input type="checkbox" data-ia="ocultar"' + (cfg.ocultar ? " checked" : "") + '><span><strong>Ocultar os nomes dos alunos no texto enviado à IA</strong> (recomendado). Cada aluno vai como «T1.7» e a resposta volta com o nome. Fotos e documentos seguem como estão.</span></label>' +
      '<label class="ia-chk"><input type="checkbox" data-ia="auto"' + (cfg.auto ? " checked" : "") + '><span><strong>Aplicar as mudanças automaticamente</strong>, sem pedir confirmação. Deixe desligado para revisar cada ação antes.</span></label>' +
      '<label class="ia-chk"><input type="checkbox" data-ia="rodizio"' + (cfg.rodizio ? " checked" : "") + '><span><strong>Rodízio automático</strong>: se esta IA falhar ou atingir o limite do dia, responde a próxima com chave salva e, por último, a IA da plataforma.</span></label>' +
      (cfg.prov === "openrouter" ? '<label class="ia-chk"><input type="checkbox" data-ia="orpagos"' + (cfg.orPagos ? " checked" : "") + '><span><strong>Permitir modelos pagos baratos</strong> (DeepSeek V4 Flash, Gemini 2.5 Flash, Llama 3.3 70B) só depois de TODOS os gratuitos falharem. Cobrado nos créditos da sua conta OpenRouter.</span></label>' + listaOpenRouterHtml() : "") +
      '<div class="md-row" style="flex-wrap:wrap;margin-top:6px"><button type="button" class="md-btn pri" data-ia="testar">🔌 Testar e salvar</button>' + (tem ? '<button type="button" class="md-btn perigo" data-ia="remover">Remover chave</button>' : "") + '<span data-ia="msg" style="font-size:.8rem;color:var(--cm)"></span></div>' +
      '<div class="ia-nota">💡 <strong>Qual escolher?</strong> O <strong>Google Gemini</strong> tem uso gratuito e lê fotos e PDFs — bom para começar. OpenAI e Claude cobram por uso, na conta do próprio professor. O <strong>OpenRouter</strong> dá acesso a dezenas de IAs gratuitas numa chave só (e às pagas mais baratas, se você quiser). Groq, Cerebras e Mistral têm uso gratuito com limites (PDF só com texto). Salve mais de uma chave: com o rodízio ligado, quando uma atinge o limite, a outra responde. O uso e os custos da chave são responsabilidade do titular da conta no serviço de IA.</div></details>';
  }
  function cartoesProvedores() {
    return '<div class="ia-provs">' + Object.keys(PROV).map(function (k) {
      var extra = k === "plataforma" ? "" : (cfg.chaves[k] ? " · ✓ chave salva" : "");
      return '<button type="button" class="ia-prov' + (k === cfg.prov ? " on" : "") + (k === "plataforma" ? " gratis" : "") + '" data-prov="' + k + '"><b>' + (k === "plataforma" ? "⚡ " : "") + esc(PROV[k].nome) + "</b><small>" + esc(PROV[k].sub) + extra + "</small></button>";
    }).join("") + "</div>";
  }
  function configPlataformaHtml() {
    return '<details class="md-card ia-cfg"><summary>🤖 IA da plataforma <span class="ia-st ok">✓ ' + esc(textoSaldo()) + '</span><span style="flex:1"></span><span style="font-size:.74rem;color:var(--cm);font-weight:500">Trocar ▾</span></summary>' +
      '<p style="margin-top:12px">Você está usando a <strong>IA gratuita do RELATORIO SKIN</strong>: não precisa de chave nem de conta em outro serviço. Para usar sem limite, escolha um serviço abaixo e cole a sua própria chave.</p>' +
      cartoesProvedores() +
      '<div class="ia-plano"><div><b>Plano gratuito</b><span data-ia="saldo">' + esc(textoSaldo()) + '</span></div>' +
      '<ul><li><strong>' + LIMITE_MENSAGENS + ' mensagens por dia</strong> ao assistente</li><li><strong>' + LIMITE_DIARIOS + ' diários por dia</strong> criados pela IA</li><li>Renova à meia-noite (horário do Acre)</li><li>Lê fotos e PDFs (até ' + MAX_ANEXOS_PLAT + ' arquivos, 7 MB por mensagem)</li></ul>' +
      '<button type="button" class="md-btn mini" data-ia="atualizar">↻ Atualizar saldo</button></div>' +
      '<label class="ia-chk"><input type="checkbox" data-ia="auto"' + (cfg.auto ? " checked" : "") + '><span><strong>Aplicar as mudanças automaticamente</strong>, sem pedir confirmação. Deixe desligado para revisar cada ação antes.</span></label>' +
      '<label class="ia-chk"><input type="checkbox" data-ia="rodizio"' + (cfg.rodizio ? " checked" : "") + '><span><strong>Rodízio com as minhas chaves</strong>: se a IA da plataforma falhar ou a cota do dia acabar, usar as chaves que eu salvei (Gemini, OpenRouter, Groq…).</span></label>' +
      filaPlataformaHtml() +
      '<div class="ia-nota">🔒 Nesta opção os nomes dos alunos são <strong>sempre</strong> trocados por códigos antes de sair do seu aparelho. As mensagens passam pelos servidores da plataforma e são processadas pelos serviços de IA gratuitos do projeto (lista acima). Fotos e documentos seguem como estão.<br>✨ <strong>Em breve:</strong> planos de IA com limites maiores.</div></details>';
  }
  function sugestoes() { return (M && M.sugestoes) || SUGESTOES; }
  var SUGESTOES = [
    ["📝 Registrar a aula de hoje", "Registre a aula de hoje: turma , disciplina , das  às . Conteúdo: . Faltaram: ."],
    ["📷 Ler lista de chamada", "Leia a foto da lista de chamada e cadastre os alunos na turma "],
    ["📚 Plano do bimestre", "Monte o plano de aulas do 1º bimestre de  da turma  com  aulas sobre "],
    ["🗂 Sequência didática", "Crie uma sequência didática para o 1º bimestre de  da turma  sobre "],
    ["📆 Feriados do ano", "Cadastre no calendário os feriados nacionais de " + new Date().getFullYear() + " e o recesso escolar de julho."],
    ["📊 Resumo da semana", "Faça um resumo desta semana: aulas dadas, faltas por turma e ocorrências."]
  ];
  function desenharChat(pensando) {
    var box = $(".ia-msgs"); if (!box) return;
    var html = chat.length ? "" : (M.boasVindas ? '<div class="ia-vazio">' + M.boasVindas + '</div>' : '') || '<div class="ia-vazio">👋 Olá! Sou o seu assistente. Posso <strong>registrar aulas</strong>, <strong>ler fotos da chamada</strong>, <strong>montar o plano de aulas</strong>, organizar o <strong>calendário</strong> e responder dúvidas sobre as suas turmas.<br>Escreva abaixo, envie um arquivo 📎 ou tire uma foto 📷. Nada muda no diário sem a sua confirmação.' + (ferrVisiveis().length ? '<br>Para sequências didáticas, provas, planos e relatórios, use <strong>🧰 Ferramentas</strong>, acima.' : "") + '</div>';
    chat.forEach(function (m, mi) {
      if (m.role === "user") {
        html += '<div class="ia-m u">' + esc(m.texto || "") + ((m.anexos || []).length ? '<div class="ia-anx-u">' + m.anexos.map(function (a) { return "<span>📎 " + esc(a.nome) + "</span>"; }).join("") + "</div>" : "") + "</div>";
      } else if (m.role === "erro") {
        html += '<div class="ia-m e">⚠️ ' + esc(m.texto) + "</div>";
      } else {
        var acoes = "";
        if ((m.acoes || []).length) {
          var pend = m.acoes.filter(function (a, i) { var e = (m.estados || {})[i]; return !e || (!e.ok && !e.descartada); }).length;
          acoes = '<div class="ia-acoes"><div class="ia-acoes-t">Mudanças propostas (' + m.acoes.length + ")</div>" + m.acoes.map(function (a, i) {
            var e = (m.estados || {})[i], ds = descrever(a);
            var cls = e ? (e.ok ? " ok" : e.descartada ? " ds" : " er") : "";
            return '<div class="ia-ac' + cls + '"><span class="ic">' + ds.ic + '</span><div class="tx"><b>' + esc(restaurar(ds.t)) + "</b>" + (ds.d ? "<small>" + esc(restaurar(ds.d)) + "</small>" : "") +
              (e && !e.descartada ? '<div class="res">' + (e.ok ? "✔ " : "✖ ") + esc(e.msg) + "</div>" : e && e.descartada ? '<div class="res">Descartada</div>' : "") + "</div>" +
              (!e || (!e.ok && !e.descartada) ? '<div class="ia-ac-b"><button type="button" class="md-btn mini pri" data-ap="' + mi + ":" + i + '">' + (e ? "Tentar de novo" : "Aplicar") + '</button><button type="button" class="md-btn mini" data-ds="' + mi + ":" + i + '" title="Descartar">✕</button></div>' : "") + "</div>";
          }).join("") + (pend > 1 ? '<div class="ia-acoes-b"><button type="button" class="md-btn mini pri" data-apt="' + mi + '">✅ Aplicar todas (' + pend + ')</button><button type="button" class="md-btn mini" data-dst="' + mi + '">Descartar todas</button></div>' : "") + "</div>";
        }
        var docOk = !!m.meta || String(m.texto || "").length > 280;
        var bts = docOk ? '<div class="ia-msg-b">' +
          (window.MeuDiarioDocumentos ? (m.salvo ? '<button type="button" data-abrirdoc="' + mi + '">✓ Salvo em Documentos · Abrir</button>' : '<button type="button" class="pri" data-salvar="' + mi + '">💾 Salvar em Documentos</button>') : "") +
          (window.DocExportar ? '<button type="button" data-baixar="' + mi + '">⬇️ Baixar</button>' : "") +
          '<button type="button" data-copiar="' + mi + '">📋 Copiar</button></div>' : "";
        html += '<div class="ia-m a">' + markdown(restaurar(m.texto || "")) + acoes + bts + (m.modelo ? '<div class="ia-meta">' + esc(m.modelo) + "</div>" : "") + "</div>";
      }
    });
    if (pensando) html += '<div class="ia-pensa">🤖 Pensando <i></i><i></i><i></i></div>';
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
    box.querySelectorAll("[data-ap]").forEach(function (b) { b.onclick = function () { var p = b.getAttribute("data-ap").split(":"); b.disabled = true; aplicarUma(+p[0], +p[1]).then(function () { gravarChat(); desenharChat(); }); }; });
    box.querySelectorAll("[data-ds]").forEach(function (b) { b.onclick = function () { var p = b.getAttribute("data-ds").split(":"), m = chat[+p[0]]; m.estados = m.estados || {}; m.estados[+p[1]] = { ok: false, descartada: true }; gravarChat(); desenharChat(); }; });
    box.querySelectorAll("[data-apt]").forEach(function (b) { b.onclick = function () { aplicarTodas(+b.getAttribute("data-apt")); }; });
    box.querySelectorAll("[data-dst]").forEach(function (b) { b.onclick = function () { var m = chat[+b.getAttribute("data-dst")]; m.estados = m.estados || {}; m.acoes.forEach(function (a, i) { if (!m.estados[i] || !m.estados[i].ok) m.estados[i] = { ok: false, descartada: true }; }); gravarChat(); desenharChat(); }; });
    box.querySelectorAll("[data-salvar]").forEach(function (b) { b.onclick = function () { salvarResposta(+b.getAttribute("data-salvar")); }; });
    box.querySelectorAll("[data-abrirdoc]").forEach(function (b) { b.onclick = function () { var m = chat[+b.getAttribute("data-abrirdoc")]; if (m && m.salvo) window.MeuDiarioDocumentos.abrir(m.salvo); }; });
    box.querySelectorAll("[data-baixar]").forEach(function (b) { b.onclick = function () { baixarResposta(+b.getAttribute("data-baixar")); }; });
    box.querySelectorAll("[data-copiar]").forEach(function (b) { b.onclick = function () { copiarTexto(restaurar((chat[+b.getAttribute("data-copiar")] || {}).texto || "")); }; });
    var env = $(".env"); if (env) { env.disabled = !!pensando; env.textContent = pensando ? "…" : "Enviar ➤"; }
    var slot = $(".ia-ferr-slot");
    if (slot) {
      var f = ferramentaDaConversa();
      slot.innerHTML = f ? '<span class="ia-ferr-atual" title="Assistente especializado desta conversa">' + f.ic + " " + esc(f.nome) + ' <button type="button" title="Sair da ferramenta (abre uma conversa comum)" aria-label="Sair da ferramenta">✕</button></span>' : "";
      var sb = slot.querySelector("button"); if (sb) sb.onclick = novoChatGeral;
    }
  }

  // ── salvar, baixar e copiar respostas ──────────────────────────────
  function pedidoAntes(mi) { for (var i = mi - 1; i >= 0; i--) if (chat[i].role === "user") return chat[i].texto || ""; return ""; }
  function tituloResposta(m) {
    if (m.meta && m.meta.titulo) return restaurar(m.meta.titulo);
    var h = /^\s*#{1,3}\s+(.+)$/m.exec(m.texto || "");
    return h ? restaurar(h[1]).replace(/[*_`]/g, "").trim() : "Resposta da I.A";
  }
  function salvarResposta(mi) {
    var m = chat[mi], c = conversaAtual() || {};
    if (!m || !window.MeuDiarioDocumentos) return;
    var meta = m.meta ? Object.assign({}, m.meta, { titulo: tituloResposta(m) }) : null;
    window.MeuDiarioDocumentos.salvarDaIA({
      texto: restaurar(m.texto), meta: meta, ferramenta: c.ferramenta || "",
      dicas: Object.assign({}, c.dicas || {}, { pedido: restaurar(pedidoAntes(mi)) }),
      aoSalvar: function (d) { m.salvo = d.id; gravarChat(); desenharChat(); }
    });
  }
  function baixarResposta(mi) {
    var m = chat[mi], X = window.DocExportar; if (!m || !X) return;
    var doc = { titulo: tituloResposta(m), conteudo: restaurar(m.texto), info: [] };
    janela("<h2>⬇️ Baixar</h2><p class=\"ia-fov-sub\">" + esc(doc.titulo) + "</p><div class=\"ia-fov-fmt\">" + X.FORMATOS.map(function (f) { return '<button type="button" class="ia-fb" data-fmt="' + f.id + '">' + f.rotulo + "</button>"; }).join("") + '</div><div class="ia-fov-b"><span data-msg></span><button type="button" class="ia-fb" data-fechar>Fechar</button></div>',
      function (ov) {
        ov.querySelectorAll("[data-fmt]").forEach(function (b) {
          b.onclick = async function () {
            var msg = ov.querySelector("[data-msg]"); msg.textContent = "Gerando…";
            try { await X.baixar(doc, b.getAttribute("data-fmt")); ov.remove(); } catch (e) { msg.textContent = "✖ " + ((e && e.message) || e); }
          };
        });
      });
  }
  function copiarTexto(t) {
    var ok = function () { M.toast("Texto copiado."); };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(ok, function () { M.toast("Não consegui copiar."); });
    var a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); ok(); } catch (e) {} a.remove();
  }
  // Janela própria (as escolas do administrador não têm a do Meu Diário).
  function janela(html, ligarJ) {
    var velho = document.querySelector(".ia-fov"); if (velho) velho.remove();
    var ov = document.createElement("div"); ov.className = "ia-fov"; ov.setAttribute("data-runtime-ui", "ia");
    ov.innerHTML = '<div class="ia-fov-box" role="dialog" aria-modal="true">' + html + "</div>";
    var sair = function (e) { if (e.key === "Escape") { ov.remove(); document.removeEventListener("keydown", sair); } };
    document.addEventListener("keydown", sair);
    ov.addEventListener("mousedown", function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    ov.querySelectorAll("[data-fechar]").forEach(function (b) { b.onclick = function () { ov.remove(); }; });
    if (ligarJ) ligarJ(ov);
    return ov;
  }

  // ── 🧰 ferramentas ─────────────────────────────────────────────────
  var ferrCat = "", ferrBusca = "", ferrDoc = "";
  function ferrVisiveis() {
    var F = window.IAFerramentas; if (!F || M.ferramentas === false) return [];
    return F.lista.filter(function (f) {
      if (f.acao && (M.sistema || !acaoPermitida(f.acao))) return false;
      if (M.sistema && ["inclusao", "comunicacao", "relatorios", "apoio"].indexOf(f.cat) < 0) return false;
      return true;
    });
  }
  function destinoFerr(f) {
    if (f.doc && window.MeuDiarioDocumentos) return "💾 salva em " + window.MeuDiarioDocumentos.TIPOS[f.doc].ic + " " + nomeAbaDoc(f.doc);
    if (f.acao === "criar_diario") return "✍️ lança no diário";
    if (f.acao === "plano_bimestre") return "📚 lança nos Conteúdos";
    return window.DocExportar ? "⬇️ baixe em PDF, Word ou Excel" : "";
  }
  function ferramentasHtml() {
    var F = window.IAFerramentas; if (!F) return '<div class="ia-vazio">As ferramentas não carregaram. Recarregue a página.</div>';
    var todas = ferrVisiveis(), q = norm(ferrBusca);
    var lista = todas.filter(function (f) {
      if (ferrCat && f.cat !== ferrCat) return false;
      if (ferrDoc && f.doc !== ferrDoc) return false;
      return !q || norm(f.nome + " " + f.desc).indexOf(q) >= 0;
    });
    var cats = F.CATEGORIAS.filter(function (c) { return todas.some(function (f) { return f.cat === c.id; }); });
    var catNome = {}; F.CATEGORIAS.forEach(function (c) { catNome[c.id] = c; });
    return '<div class="ia-ferr-top"><div class="ia-ferr-tt"><b>🧰 Ferramentas</b><span>Assistentes especializados: escolha, preencha só o que é específico e a I.A entrega pronto.</span></div>' +
      '<input type="search" class="ia-ferr-busca" placeholder="🔎 Buscar ferramenta (ex.: prova, sequência, relatório)" value="' + esc(ferrBusca) + '">' +
      '<div class="ia-cats"><button type="button" data-cat=""' + (ferrCat ? "" : ' class="on"') + ">Todas <small>" + todas.length + "</small></button>" + cats.map(function (c) { return '<button type="button" data-cat="' + c.id + '"' + (ferrCat === c.id ? ' class="on"' : "") + ">" + c.ic + " " + esc(c.nome) + "</button>"; }).join("") + "</div>" +
      (ferrDoc ? '<div class="ia-ferr-filtro">Mostrando as que salvam em <b>' + esc(nomeAbaDoc(ferrDoc)) + '</b> <button type="button" data-ferrdoc="">✕ mostrar todas</button></div>' : "") + "</div>" +
      (lista.length ? '<div class="ia-ferr-grid">' + lista.map(function (f) {
        return '<button type="button" class="ia-fc" data-ferr="' + f.id + '"><span class="ic">' + f.ic + "</span><b>" + esc(f.nome) + "</b><p>" + esc(f.desc) + "</p><small>" + (catNome[f.cat] ? catNome[f.cat].ic + " " + esc(catNome[f.cat].nome) : "") + (destinoFerr(f) ? " · " + esc(destinoFerr(f)) : "") + "</small></button>";
      }).join("") + "</div>" : '<div class="ia-vazio">Nenhuma ferramenta com esse filtro.</div>');
  }
  function desenharFerramentas() {
    var box = $(".ia-ferr"); if (!box) return;
    box.innerHTML = ferramentasHtml();
    var busca = box.querySelector(".ia-ferr-busca");
    if (busca) busca.oninput = function () { ferrBusca = busca.value; var pos = busca.selectionStart; desenharFerramentas(); var b2 = $(".ia-ferr-busca"); if (b2) { b2.focus(); try { b2.setSelectionRange(pos, pos); } catch (e) {} } };
    box.querySelectorAll("[data-cat]").forEach(function (b) { b.onclick = function () { ferrCat = b.getAttribute("data-cat"); desenharFerramentas(); }; });
    box.querySelectorAll("[data-ferrdoc]").forEach(function (b) { b.onclick = function () { ferrDoc = ""; desenharFerramentas(); }; });
    box.querySelectorAll("[data-ferr]").forEach(function (b) { b.onclick = function () { abrirFerramenta(b.getAttribute("data-ferr")); }; });
  }
  function mudarModo(modo) {
    cfg.modo = modo === "ferr" ? "ferr" : "chat"; gravarCfg();
    var w = $(".ia-wrap"); if (w) w.classList.toggle("modo-ferr", cfg.modo === "ferr");
    document.querySelectorAll("#sec-ia [data-modo]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-modo") === cfg.modo); });
    if (cfg.modo === "ferr") desenharFerramentas();
  }
  // Campos da ferramenta → prompt pronto.
  function turmasIA() { return (M.estrutura().turmas || []).filter(function (t) { return !t.tr; }); }
  function preencherPrompt(f, v) {
    var ts = turmasIA(), txtP = f.prompt;
    if (!v.bimestre) txtP = txtP.replace(/,?\s*(?:do |no )?\{\{bimestre\}\}\s*bimestre/g, "");
    if (!v.turma) txtP = txtP.replace(/\s*\(?(?:da |para a |na )?turma \{\{turma\}\}\)?/g, "");
    txtP = txtP.replace(/\{\{(\w+)\}\}/g, function (m0, k) {
      var x = v[k] == null ? "" : String(v[k]).trim();
      if (k === "turma") { var t = ts.filter(function (y) { return y.id === x; })[0]; return t ? t.nome : ""; }
      if (k === "bimestre") return x ? x + "º" : "";
      return x;
    });
    txtP = txtP.replace(/(^|[.!?]\s+)[^.!?\n]*:\s*\.(?=\s|$)/g, "$1")
      .split("\n").filter(function (l, i, arr) { return !(/^[^:\n]{1,70}:\s*$/.test(l) && !(arr[i + 1] || "").trim()); }).join("\n")
      .replace(/\(\s*,\s*/g, "(").replace(/\s*,\s*\)/g, ")").replace(/\(\s*\)/g, "").replace(/[ \t]{2,}/g, " ").replace(/ ([,.])/g, "$1")
      .replace(/\n{3,}/g, "\n\n").trim();
    return txtP;
  }
  function campoFerrHtml(c, v) {
    var val = v[c.id] != null ? v[c.id] : (c.valor || "");
    var lbl = '<label>' + esc(c.rotulo) + (c.obrig ? " *" : "") + "</label>";
    if (c.tipo === "turma") return '<div class="ia-cp">' + lbl + '<select data-cp="turma"><option value="">— escolha —</option>' + turmasIA().map(function (t) { return '<option value="' + esc(t.id) + '"' + (t.id === val ? " selected" : "") + ">" + esc(t.nome) + "</option>"; }).join("") + "</select></div>";
    if (c.tipo === "disciplina") return '<div class="ia-cp">' + lbl + '<select data-cp="disciplina">' + opcoesDiscFerr(v.turma, val) + "</select></div>";
    if (c.tipo === "bimestre") { var o = '<option value="">— todos / não se aplica —</option>'; for (var b = 1; b <= 4; b++) o += '<option value="' + b + '"' + (String(b) === String(val) ? " selected" : "") + ">" + b + "º bimestre</option>"; return '<div class="ia-cp">' + lbl + '<select data-cp="bimestre">' + o + "</select></div>"; }
    if (c.tipo === "opcoes") return '<div class="ia-cp">' + lbl + '<select data-cp="' + c.id + '">' + c.opcoes.map(function (x) { return '<option' + (x === val ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("") + "</select></div>";
    if (c.tipo === "area") return '<div class="ia-cp larga">' + lbl + '<textarea data-cp="' + c.id + '" rows="3" placeholder="' + esc(c.ph || "") + '">' + esc(val) + "</textarea></div>";
    return '<div class="ia-cp">' + lbl + '<input type="' + (c.tipo === "numero" ? "number" : "text") + '" data-cp="' + c.id + '" value="' + esc(val) + '" placeholder="' + esc(c.ph || "") + '"' + (c.tipo === "numero" ? ' min="1" max="400"' : "") + "></div>";
  }
  function opcoesDiscFerr(tid, sel) {
    var t = turmasIA().filter(function (x) { return x.id === tid; })[0];
    var nomes = t ? t.disciplinas.map(function (d) { return d.nome; }) : [];
    if (!t) { var vistos = {}; turmasIA().forEach(function (x) { (x.disciplinas || []).forEach(function (d) { if (!vistos[d.nome]) { vistos[d.nome] = 1; nomes.push(d.nome); } }); }); }
    if (nomes.length === 1 && !sel) sel = nomes[0];
    return '<option value="">— escolha —</option>' + nomes.map(function (n) { return '<option' + (n === sel ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("");
  }
  function abrirFerramenta(id) {
    var F = window.IAFerramentas, f = F && F.porId(id); if (!f) return;
    var v = Object.assign({}, cfg.ferrValores[f.id] || {});
    var ts = turmasIA();
    if (!v.turma && ts.length === 1) v.turma = ts[0].id;
    if (v.turma && !ts.some(function (t) { return t.id === v.turma; })) { v.turma = ""; v.disciplina = ""; }
    var cat = F.CATEGORIAS.filter(function (c) { return c.id === f.cat; })[0] || {};
    janela('<div class="ia-fov-h"><span class="ic">' + f.ic + '</span><div><h2>' + esc(f.nome) + "</h2><small>" + esc((cat.ic || "") + " " + (cat.nome || "")) + (destinoFerr(f) ? " · " + esc(destinoFerr(f)) : "") + '</small></div><button type="button" class="ia-fov-x" data-fechar aria-label="Fechar">✕</button></div>' +
      '<p class="ia-fov-desc">' + esc(f.desc) + "</p>" +
      '<details class="ia-como" open><summary>📘 Como usar</summary><ol>' + f.instrucoes.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol></details>" +
      '<div class="ia-campos">' + f.campos.map(function (c) { return campoFerrHtml(c, v); }).join("") + "</div>" +
      '<div class="ia-cp larga"><label>✍️ Prompt inicial — já preenchido com os campos (pode editar)</label><textarea class="ia-pr" rows="5"></textarea></div>' +
      '<div class="ia-fov-b"><span data-msg></span><button type="button" class="ia-fb" data-x="copiar">📋 Copiar prompt</button><button type="button" class="ia-fb" data-fechar>Cancelar</button><button type="button" class="ia-fb pri" data-x="usar">🚀 Usar ferramenta</button></div>',
      function (ov) {
        var pr = ov.querySelector(".ia-pr"), editado = false;
        var ler = function () { var o = {}; ov.querySelectorAll("[data-cp]").forEach(function (el) { o[el.getAttribute("data-cp")] = el.value; }); return o; };
        var atualizar = function () { if (!editado) pr.value = preencherPrompt(f, ler()); };
        pr.addEventListener("input", function () { editado = true; });
        ov.querySelectorAll("[data-cp]").forEach(function (el) {
          el.addEventListener("input", atualizar); el.addEventListener("change", atualizar);
          if (el.getAttribute("data-cp") === "turma") el.addEventListener("change", function () {
            var sd = ov.querySelector('[data-cp="disciplina"]'); if (sd) sd.innerHTML = opcoesDiscFerr(el.value, sd.value);
            atualizar();
          });
        });
        atualizar();
        ov.querySelector('[data-x="copiar"]').onclick = function () { copiarTexto(pr.value); };
        ov.querySelector('[data-x="usar"]').onclick = function () {
          var o = ler(), falta = [];
          f.campos.forEach(function (c) {
            if (!c.obrig || String(o[c.id] || "").trim()) return;
            if (c.tipo === "turma" && !ts.length) return;
            if (c.tipo === "disciplina") { var t = ts.filter(function (x) { return x.id === o.turma; })[0]; if (!t || !(t.disciplinas || []).length) return; }
            falta.push(c.rotulo);
          });
          if (falta.length) { ov.querySelector("[data-msg]").textContent = "Preencha: " + falta.join(", ") + "."; return; }
          if (!pr.value.trim()) { ov.querySelector("[data-msg]").textContent = "O prompt está vazio."; return; }
          if (ocupado) { ov.querySelector("[data-msg]").textContent = "Espere a resposta atual terminar."; return; }
          ov.remove();
          usarFerramenta(f, o, pr.value.trim());
        };
      });
  }
  function usarFerramenta(f, v, prompt) {
    var t = turmasIA().filter(function (x) { return x.id === v.turma; })[0], agoraIso = new Date().toISOString();
    var titulo = f.ic + " " + f.nome + (v.tema ? ": " + v.tema : t ? " · " + t.nome : "");
    var atual = conversaAtual();
    if (atual && !atual.msgs.length) conversas.lista = conversas.lista.filter(function (x) { return x.id !== atual.id; });
    var c = { id: novoIdConversa(), titulo: titulo.length > 60 ? titulo.slice(0, 58) + "…" : titulo, tituloManual: true, criado: agoraIso, atualizado: agoraIso, msgs: [], ferramenta: f.id,
      dicas: { turma: v.turma || "", turmaId: v.turma || "", disciplina: v.disciplina || "", bimestre: v.bimestre || "", tipo: f.doc || "" } };
    conversas.lista.push(c); conversas.atual = c.id; chat = c.msgs;
    cfg.ferrValores[f.id] = v; gravarCfg();
    salvarConversas();
    mudarModo("chat"); desenharChat(); desenharLista();
    var campo = $(".ia-txt"); if (!campo) return;
    campo.value = prompt; ajustarAltura(campo);
    enviar();
  }
  function novoChatGeral() {
    if (ocupado) return M.toast("Espere a resposta terminar para abrir outra conversa.");
    novaConversa(); salvarConversas(); anexos = []; desenharAnexos(); desenharChat(); desenharLista(); fecharListaCelular();
    var t = $(".ia-txt"); if (t) t.focus();
  }

  // ── IAs da fila da plataforma ───────────────────────────────────────
  async function buscarProvedores() {
    var cli = cliente(); if (!cli || !cli.functions || ligadosPlat) return;
    try {
      var r = await cli.functions.invoke("assistente-ia", { body: { provedores: true } });
      if (r.data && Array.isArray(r.data.provedores)) { ligadosPlat = r.data; var d = $(".ia-fila"); if (d) { var aberto = d.open; d.outerHTML = filaPlataformaHtml(); var n = $(".ia-fila"); if (n) n.open = aberto; } }
    } catch (e) {}
  }
  function filaPlataformaHtml() {
    return '<details class="ia-fila"><summary>📋 IAs gratuitas da fila automática — ' + FILA_PLAT.length + " grupos, trocam sozinhas quando uma atinge o limite do dia</summary><ol>" +
      FILA_PLAT.map(function (g) {
        var st = "";
        if (ligadosPlat) st = g.p === "pagos" ? (ligadosPlat.pagos ? "on" : "off") : (ligadosPlat.provedores.indexOf(g.p) >= 0 ? "on" : "off");
        var rot = st === "on" ? "ligada" : st === "off" ? (g.p === "pagos" ? "desligada" : "sem chave no servidor") : "";
        return "<li><b>" + esc(g.nome) + "</b>" + (rot ? ' <span class="ia-fila-st ' + st + '">' + rot + "</span>" : "") + "<ul>" + g.m.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></li>";
      }).join("") + '</ol><p>A primeira IA que responder vale. Quando uma bate o limite do dia (ou fica fora do ar), ela descansa por algumas horas e a próxima da lista assume — sem você fazer nada. A camada paga só entra se o administrador ligar e depois de todas as gratuitas.</p></details>';
  }
  function listaOpenRouterHtml() {
    return '<details class="ia-fila"><summary>📋 Ordem do OpenRouter no modo automático</summary><ol>' +
      OR_GRATIS.map(function (m) { return "<li>" + esc(m) + ' <span class="ia-fila-st on">grátis</span></li>'; }).join("") +
      OR_PAGOS.map(function (m) { return "<li>" + esc(m) + ' <span class="ia-fila-st ' + (cfg.orPagos ? "on" : "off") + '">' + (cfg.orPagos ? "pago · ligado" : "pago · desligado") + "</span></li>"; }).join("") +
      "</ol><p>Se um modelo falhar (limite, erro ou demora), o próximo é tentado na hora. O console do navegador mostra qual falhou.</p></details>";
  }
  function ajustarAltura(t) { t.style.height = "auto"; t.style.height = Math.min(200, t.scrollHeight + 2) + "px"; }
  function abrirConfig(foco) {
    var d = $(".ia-cfg"); if (d) d.open = true;
    if (foco) { var c = $('[data-ia="chave"]'); if (c) c.focus(); }
  }

  function desenhar() {
    var sec = document.getElementById("sec-ia"); if (!sec || !M) return;
    var rascunho = sec.querySelector(".ia-txt") ? sec.querySelector(".ia-txt").value : "";
    var cfgAberta = sec.querySelector(".ia-cfg") ? sec.querySelector(".ia-cfg").open : null;
    sec.innerHTML = '<div class="th"><div class="tb ia">🤖</div><div class="ti"><h2>Assistente de I.A</h2><p>Converse, envie fotos, PDFs, planilhas e documentos · a I.A propõe as mudanças no diário e você confirma</p></div></div>' + estilo() +
      '<div class="ia-wrap' + (cfg.modo === "ferr" && ferrVisiveis().length ? " modo-ferr" : "") + '">' + desenharConfigHtml() +
      (ferrVisiveis().length ? '<div class="ia-modos" role="tablist"><button type="button" data-modo="chat"' + (cfg.modo !== "ferr" ? ' class="on"' : "") + '>💬 Conversa</button><button type="button" data-modo="ferr"' + (cfg.modo === "ferr" ? ' class="on"' : "") + '>🧰 Ferramentas <small>' + ferrVisiveis().length + "</small></button></div>" + '<div class="md-card ia-ferr"></div>' : "") +
      '<div class="md-card ia-chat"><div class="ia-chat-h"><button type="button" class="ia-hb" data-ia="lista" title="Mostrar ou ocultar as conversas" aria-label="Conversas">☰</button><b>🤖 Assistente</b><span class="ia-ferr-slot"></span><small>' + esc(rotuloCabecalho()) + '</small><button type="button" data-ia="novo" title="Começar uma conversa nova (as outras ficam guardadas)">✏️ Novo chat</button></div>' +
      '<div class="ia-corpo' + (cfg.listaFechada ? " sem-lista" : "") + '"><aside class="ia-lista" aria-label="Conversas"><div class="ia-lista-top"><button type="button" class="ia-lista-novo" data-ia="novo2">✏️ Novo chat</button><input type="search" class="ia-busca" placeholder="Buscar nas conversas" aria-label="Buscar nas conversas"></div><div class="ia-convs"></div></aside><div class="ia-princ">' +
      '<div class="ia-msgs"></div>' +
      '<div class="ia-sug">' + sugestoes().map(function (s, i) { return '<button type="button" data-sug="' + i + '">' + esc(s[0]) + "</button>"; }).join("") + "</div>" +
      '<div class="ia-anexos" hidden></div>' +
      '<div class="ia-in"><button type="button" class="ib" data-ia="anexar" title="Anexar arquivo (foto, PDF, Word, planilha, texto)">📎</button><button type="button" class="ib" data-ia="camera" title="Tirar foto">📷</button>' +
      '<textarea class="ia-txt" rows="1" placeholder="Escreva aqui…" title="Enter envia · Shift+Enter quebra a linha"></textarea><button type="button" class="ib env">Enviar ➤</button></div>' +
      '<input type="file" data-ia="arq" multiple hidden accept="image/*,.pdf,.docx,.xlsx,.xls,.ods,.csv,.tsv,.txt,.md,.json,.html,.htm,.xml">' +
      '<input type="file" data-ia="cam" hidden accept="image/*" capture="environment"></div></div></div></div>';
    if (cfgAberta !== null) sec.querySelector(".ia-cfg").open = cfgAberta || !pronto();
    ligar(sec);
    var t = sec.querySelector(".ia-txt"); t.value = rascunho; ajustarAltura(t);
    desenharChat(ocupado);
    desenharAnexos();
    desenharLista();
    if (cfg.modo === "ferr") desenharFerramentas();
    if (naPlataforma()) buscarProvedores();
  }

  // ── lista de conversas ─────────────────────────────────────────────
  function grupoData(iso) {
    var d = new Date(iso || 0), hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var dias = Math.floor((hoje - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    return dias <= 0 ? "Hoje" : dias === 1 ? "Ontem" : dias < 7 ? "Últimos 7 dias" : dias < 30 ? "Últimos 30 dias" : "Mais antigas";
  }
  function desenharLista() {
    var box = $(".ia-convs"); if (!box || !conversas) return;
    var busca = (($(".ia-busca") || {}).value || "").trim().toLowerCase();
    var lista = ordenadas(conversas.lista).filter(function (c) { return c.msgs.length || c.id === conversas.atual; });
    if (busca) lista = lista.filter(function (c) {
      return String(c.titulo || "").toLowerCase().indexOf(busca) >= 0 || c.msgs.some(function (m) { return String(m.texto || "").toLowerCase().indexOf(busca) >= 0; });
    });
    var grupo = "", html = "";
    lista.forEach(function (c) {
      var g = grupoData(c.atualizado);
      if (g !== grupo) { grupo = g; html += '<div class="ia-conv-g">' + g + "</div>"; }
      html += '<div class="ia-conv' + (c.id === conversas.atual ? " on" : "") + '"><button type="button" class="ia-conv-t" data-abrir="' + c.id + '" title="' + esc(c.titulo || "Nova conversa") + '">' + esc(c.titulo || "Nova conversa") + "</button>" +
        '<button type="button" class="ia-conv-b" data-ren="' + c.id + '" title="Renomear" aria-label="Renomear conversa">✏️</button>' +
        '<button type="button" class="ia-conv-b" data-del="' + c.id + '" title="Excluir" aria-label="Excluir conversa">🗑</button></div>';
    });
    box.innerHTML = html || '<div class="ia-conv-vazio">' + (busca ? "Nada encontrado." : "Nenhuma conversa ainda.") + "</div>";
  }
  function trocarConversa(id) {
    if (ocupado) return M.toast("Espere a resposta terminar para trocar de conversa.");
    abrirConversa(id);
    anexos = []; desenharAnexos();
    desenharChat(); desenharLista();
    fecharListaCelular();
  }
  function fecharListaCelular() { var c = $(".ia-corpo"); if (c) c.classList.remove("lista-on"); }
  function celularIa() { return window.matchMedia && window.matchMedia("(max-width: 760px)").matches; }
  function ligar(sec) {
    var q = function (s) { return sec.querySelector(s); };
    sec.querySelectorAll("[data-prov]").forEach(function (b) { b.onclick = function () { cfg.prov = b.getAttribute("data-prov"); gravarCfg(); desenhar(); abrirConfig(); if (naPlataforma()) buscarSaldo(); }; });
    var liga = function (sel, ev, fn) { var el = q(sel); if (el) el[ev] = fn; };
    liga('[data-ia="ver"]', "onclick", function () { var c = q('[data-ia="chave"]'); c.type = c.type === "password" ? "text" : "password"; });
    liga('[data-ia="ocultar"]', "onchange", function () { cfg.ocultar = this.checked; gravarCfg(); });
    liga('[data-ia="auto"]', "onchange", function () { cfg.auto = this.checked; gravarCfg(); });
    liga('[data-ia="rodizio"]', "onchange", function () { cfg.rodizio = this.checked; gravarCfg(); });
    liga('[data-ia="orpagos"]', "onchange", function () { cfg.orPagos = this.checked; gravarCfg(); desenhar(); abrirConfig(); });
    sec.querySelectorAll("[data-modo]").forEach(function (b) { b.onclick = function () { mudarModo(b.getAttribute("data-modo")); }; });
    liga('[data-ia="modelo"]', "onchange", function () { cfg.modelos[cfg.prov] = this.value.trim(); gravarCfg(); desenhar(); });
    liga('[data-ia="atualizar"]', "onclick", function () { buscarSaldo(); M.toast("Saldo atualizado."); });
    liga('[data-ia="testar"]', "onclick", async function () {
      var btn = this, msg = q('[data-ia="msg"]'), chave = q('[data-ia="chave"]').value.trim();
      if (!chave) { msg.textContent = "Cole a chave primeiro."; return; }
      btn.disabled = true; msg.textContent = "Testando…";
      try {
        var r = await listarModelos(cfg.prov, chave);
        cfg.chaves[cfg.prov] = chave;
        cfg.listas[cfg.prov] = r.ids.slice(0, 80);
        var escolhido = q('[data-ia="modelo"]').value.trim();
        cfg.modelos[cfg.prov] = r.ids.indexOf(escolhido) >= 0 ? escolhido : (r.padrao || PROV[cfg.prov].padrao);
        gravarCfg();
        M.toast("✓ Chave aceita. Modelo: " + cfg.modelos[cfg.prov]);
        desenhar();
        var c = document.querySelector("#sec-ia .ia-cfg"); if (c) c.open = false;
      } catch (e) {
        btn.disabled = false; msg.textContent = "✖ " + ((e && e.message) || e);
      }
    });
    var rm = q('[data-ia="remover"]');
    if (rm) rm.onclick = function () { if (!confirm("Remover a chave do " + PROV[cfg.prov].nome + " deste aparelho?")) return; delete cfg.chaves[cfg.prov]; delete cfg.listas[cfg.prov]; gravarCfg(); desenhar(); };
    var novoChat = novoChatGeral;
    q('[data-ia="novo"]').onclick = novoChat;
    q('[data-ia="novo2"]').onclick = novoChat;
    q('[data-ia="lista"]').onclick = function () {
      var corpo = q(".ia-corpo");
      if (celularIa()) { corpo.classList.toggle("lista-on"); return; }
      cfg.listaFechada = !corpo.classList.contains("sem-lista");
      corpo.classList.toggle("sem-lista", cfg.listaFechada); gravarCfg();
    };
    q(".ia-busca").addEventListener("input", desenharLista);
    q(".ia-convs").addEventListener("click", function (e) {
      var b = e.target.closest("[data-abrir],[data-ren],[data-del]"); if (!b) return;
      if (b.hasAttribute("data-abrir")) return trocarConversa(b.getAttribute("data-abrir"));
      var id = b.getAttribute("data-ren") || b.getAttribute("data-del");
      var c = conversas.lista.filter(function (x) { return x.id === id; })[0]; if (!c) return;
      if (b.hasAttribute("data-ren")) {
        var nome = window.prompt("Nome da conversa:", c.titulo || "");
        if (nome === null) return;
        nome = nome.trim();
        c.titulo = nome || tituloDe(c.msgs); c.tituloManual = !!nome;
        salvarConversas(); desenharLista(); return;
      }
      if (ocupado && id === conversas.atual) return M.toast("Espere a resposta terminar.");
      if (!confirm("Excluir a conversa \u201c" + (c.titulo || "Nova conversa") + "\u201d? O que já foi aplicado no diário continua.")) return;
      conversas.lista = conversas.lista.filter(function (x) { return x.id !== id; });
      if (id === conversas.atual) {
        var outra = ordenadas(conversas.lista).filter(function (x) { return x.msgs.length; })[0];
        if (outra) abrirConversa(outra.id); else { conversas.atual = ""; novaConversa(); }
      }
      salvarConversas(); desenharChat(); desenharLista();
    });
    q('[data-ia="anexar"]').onclick = function () { q('[data-ia="arq"]').click(); };
    q('[data-ia="camera"]').onclick = function () { q('[data-ia="cam"]').click(); };
    q('[data-ia="arq"]').onchange = function () { adicionarAnexos(this.files); this.value = ""; };
    q('[data-ia="cam"]').onchange = function () { adicionarAnexos(this.files); this.value = ""; };
    var t = q(".ia-txt");
    t.addEventListener("input", function () { ajustarAltura(t); });
    t.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && window.matchMedia("(min-width: 700px)").matches) { e.preventDefault(); enviar(); } });
    t.addEventListener("paste", function (e) {
      var fs = Array.prototype.filter.call((e.clipboardData && e.clipboardData.files) || [], function (f) { return /^image\//.test(f.type); });
      if (fs.length) { e.preventDefault(); adicionarAnexos(fs); }
    });
    q(".env").onclick = enviar;
    sec.querySelectorAll("[data-sug]").forEach(function (b) { b.onclick = function () { sugerir(sugestoes()[+b.getAttribute("data-sug")][1]); }; });
    var chatBox = q(".ia-chat");
    ["dragenter", "dragover"].forEach(function (ev) { chatBox.addEventListener(ev, function (e) { e.preventDefault(); chatBox.classList.add("ia-arr"); }); });
    ["dragleave", "drop"].forEach(function (ev) { chatBox.addEventListener(ev, function (e) { e.preventDefault(); chatBox.classList.remove("ia-arr"); }); });
    chatBox.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files) adicionarAnexos(e.dataTransfer.files); });
  }
  function sugerir(texto) {
    var t = $(".ia-txt"); if (!t) return;
    t.value = texto; ajustarAltura(t); t.focus();
    var p = texto.indexOf(" ,"); if (p < 0) p = texto.length;
    try { t.setSelectionRange(p, p); } catch (e) {}
  }

  window.MeuDiarioIA = {
    sugerir: function (texto) { if (cfg && cfg.modo === "ferr") mudarModo("chat"); sugerir(texto); },
    // Abre o filtro 🧰 Ferramentas (opcional: só as que salvam numa aba de Documentos).
    ferramentas: function (tipoDoc) { ferrDoc = tipoDoc || ""; ferrCat = ""; ferrBusca = ""; mudarModo("ferr"); },
    abrirFerramenta: function (id) { abrirFerramenta(id); }
  };

  (window.MD_MODULOS = window.MD_MODULOS || []).push({
    nome: "ia",
    iniciar: function (api) { M = api; cfg = lerCfg(); conversas = lerConversas(); if (conversaAtual()) chat = conversaAtual().msgs; else { chat = []; novaConversa(); } },
    desenhar: function () { if (!document.querySelector("#sec-ia .ia-wrap")) desenhar(); else mostrarSaldo(); },
    aoAbrir: function (id) { if (id === "ia") { buscarSaldo(); var t = $(".ia-txt"); if (t && !("ontouchstart" in window)) setTimeout(function () { t.focus(); }, 60); } }
  });
})();
