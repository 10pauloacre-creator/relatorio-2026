// ═══════════════════════════════════════════════════════════════════════
// meu-diario-ia.js — aba 🤖 I.A do Meu Diário (contas dos professores).
//
// Chatbot com a CHAVE DE API DO PRÓPRIO PROFESSOR (Google Gemini, OpenAI,
// Anthropic Claude ou Groq). O navegador fala direto com o provedor: a chave
// e as mensagens não passam pelos servidores do Meu Diário. A chave fica só
// no localStorage deste aparelho.
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
    gemini: { nome: "Google Gemini", sub: "grátis para começar", link: "https://aistudio.google.com/apikey", pdf: true, padrao: "gemini-2.5-flash" },
    openai: { nome: "OpenAI (ChatGPT)", sub: "pago por uso", link: "https://platform.openai.com/api-keys", pdf: true, padrao: "gpt-4o-mini" },
    anthropic: { nome: "Anthropic (Claude)", sub: "pago por uso", link: "https://console.anthropic.com/settings/keys", pdf: true, padrao: "claude-sonnet-5" },
    groq: { nome: "Groq", sub: "grátis com limites", link: "https://console.groq.com/keys", pdf: false, padrao: "meta-llama/llama-4-scout-17b-16e-instruct" }
  };
  var LIBS = {
    pdf: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
    pdfWorker: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
    mammoth: "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js",
    xlsx: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
  };
  var DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  var MAX_ANEXOS = 6, MAX_BYTES = 20 * 1024 * 1024, MAX_TEXTO = 60000, MAX_HIST = 16;

  var M = null, cfg = null, chat = [], anexos = [], ocupado = false;

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
  function chatKey() { return "md_ia_chat_" + uid(); }
  function lerCfg() {
    var c = null;
    try { c = JSON.parse(localStorage.getItem(cfgKey()) || "null"); } catch (e) {}
    c = c || {};
    c.prov = PROV[c.prov] ? c.prov : "gemini";
    c.chaves = c.chaves || {}; c.modelos = c.modelos || {}; c.listas = c.listas || {};
    if (c.ocultar === undefined) c.ocultar = true;
    c.auto = !!c.auto;
    return c;
  }
  function gravarCfg() { try { localStorage.setItem(cfgKey(), JSON.stringify(cfg)); } catch (e) {} }
  function lerChat() { try { var c = JSON.parse(localStorage.getItem(chatKey()) || "[]"); return Array.isArray(c) ? c : []; } catch (e) { return []; } }
  function gravarChat() {
    chat = chat.slice(-60);
    try { localStorage.setItem(chatKey(), JSON.stringify(chat)); } catch (e) {}
  }
  function chaveAtual() { return (cfg.chaves[cfg.prov] || "").trim(); }
  function modeloAtual() { return (cfg.modelos[cfg.prov] || PROV[cfg.prov].padrao).trim(); }

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
    if (!cfg.ocultar || !texto) return texto;
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
    var E = M.estrutura(), soma = M.somaHoras(), mapa = mapaAlunos();
    var R = window.MeuDiarioRecursos;
    var turmas = (E.turmas || []).map(function (t, i) {
      var esc1 = M.escola(t.escolaId);
      return {
        id: t.id, codigo: "T" + (i + 1), nome: t.nome, escola: esc1 ? esc1.nome : "",
        disciplinas: t.disciplinas.map(function (d) {
          return { nome: d.nome, meta_bimestre: d.metaBim, total_ano: d.total, bimestres: R ? R.numBims(d) : 4, h_aula_dadas: soma[t.id + "|" + d.id] || 0 };
        }),
        alunos: t.alunos.map(function (a) {
          var o = { n: a.n };
          if (cfg.ocultar) o.codigo = "«T" + (i + 1) + "." + a.n + "»"; else o.nome = a.nm;
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
      plano_de_aulas: plano, sequencias: cards(extra.sequencias), livros: cards(extra.livros), calendario: (extra.eventos || []).slice(-80)
    });
  }

  function sistema() {
    var d = new Date(), E = M.estrutura();
    return [
      'Você é o assistente de I.A do "Meu Diário", o diário escolar digital do(a) professor(a) ' + (((E.perfil && E.perfil.nome) || "").trim() || "usuário") + ". Responda sempre em português do Brasil, com clareza e sem rodeios.",
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
      "- Alunos nas ações: pelo número de chamada \"n\" da turma." + (cfg.ocultar ? " Os nomes estão ocultos: cada aluno aparece como «T1.7» (turma de código T1, nº 7). Use esses códigos no texto. Se você ler nomes numa foto ou documento, pode colocar o nome escrito nas listas das ações que o sistema encontra o aluno." : " Nas listas das ações você também pode usar o nome do aluno."),
      "- Turma nas ações: o \"id\" da turma. Disciplina: o nome exato que está nos DADOS.",
      "- Datas AAAA-MM-DD; horários HH:MM; \"horas\" = número inteiro de h/aula.",
      "- Não existe ação para apagar diários: oriente o professor a usar o botão ✏️ do diário.",
      "- Seja breve na explicação e, quando propor ações, diga em uma frase o que será feito.",
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
      '3. criar_turma — {"tipo":"criar_turma","escola":"nome da escola","nome":"7º Ano A","disciplinas":[{"nome":"Ciências","meta_bimestre":10,"total_ano":40}],"alunos":["Nome Completo", "..."]}',
      '4. adicionar_alunos — no fim da chamada: {"tipo":"adicionar_alunos","turma":"<id>","nomes":["..."]}',
      '5. transferir_aluno — {"tipo":"transferir_aluno","turma":"<id>","aluno":n}',
      '6. adicionar_disciplina — {"tipo":"adicionar_disciplina","turma":"<id>","nome":"...","meta_bimestre":10,"total_ano":40}',
      '7. plano_bimestre — plano de aulas de um bimestre: {"tipo":"plano_bimestre","turma":"<id>","disciplina":"<nome>","bimestre":1,"tema":"tema do bimestre","aulas":[{"titulo":"...","detalhe":"...","avaliacao":false}],"modo":"substituir|acrescentar"}',
      '8. plano_status — {"tipo":"plano_status","turma":"<id>","disciplina":"<nome>","bimestre":1,"aula":3,"status":"planejada|aplicada|pulada|lancada|limpar"}',
      '9. sequencia — sequência didática do bimestre: {"tipo":"sequencia","turma":"<id>","disciplina":"<nome>","bimestre":1,"titulo":"","objetivo":"","recursos":"","etapas":"","observacoes":"","url":"","status":"criando|concluido"}',
      '10. livro — livro/material do bimestre: {"tipo":"livro","turma":"<id>","disciplina":"<nome>","bimestre":1,"titulo":"","url":"","temas":["..."],"status":"criando|concluido"}',
      '11. evento_calendario — {"tipo":"evento_calendario","data":"AAAA-MM-DD","ate":"AAAA-MM-DD","titulo":"","categoria":"letivo|feriado|recesso|avaliacao|reuniao|evento|planejamento|outro","descricao":""}',
      '12. remover_evento — {"tipo":"remover_evento","id":"<id do evento>"}',
      "",
      "DADOS DO PROFESSOR (JSON):",
      retrato()
    ].join("\n");
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
  async function pedir(url, opcoes, prov) {
    var r;
    try { r = await fetch(url, opcoes); }
    catch (e) { throw new Error("Sem conexão com o " + PROV[prov].nome + ". Verifique a internet."); }
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(erroApi(r.status, (j.error && (j.error.message || j.error)) || j.message, prov));
    return j;
  }
  function textoPartes(partes) { return partes.filter(function (p) { return p.tipo === "texto"; }).map(function (p) { return p.texto; }).join("\n\n"); }

  async function chamar(sis, msgs) {
    var prov = cfg.prov, chave = chaveAtual(), modelo = modeloAtual();
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
      }, prov);
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
      }, prov);
      var ta = (ja.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("");
      if (!ta) throw new Error("O Claude devolveu uma resposta vazia. Tente de novo.");
      return ta;
    }
    // OpenAI e Groq: formato de chat da OpenAI.
    var base = prov === "groq" ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1";
    var jo = await pedir(base + "/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + chave },
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
    }, prov);
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
    var base = prov === "groq" ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1";
    var jo = await pedir(base + "/models", { headers: { "Authorization": "Bearer " + chave } }, prov);
    ids = (jo.data || []).map(function (m) { return m.id; });
    if (prov === "openai") {
      ids = ids.filter(function (id) { return /^(gpt-|o\d|chatgpt)/.test(id) && !/(audio|realtime|tts|transcribe|image|search|embedding|instruct|dall|whisper|moderation|codex|oss|\d{4}-\d{2}-\d{2})/.test(id); });
      ids.sort(maisNovo);
      return { ids: ids, padrao: ids.filter(function (id) { return /^gpt-[\d.]+-mini$/.test(id); })[0] || (ids.indexOf("gpt-4o-mini") >= 0 ? "gpt-4o-mini" : ids[0]) };
    }
    ids = ids.filter(function (id) { return !/(whisper|tts|guard|embed|playai|orpheus|compound|allam|prompt)/i.test(id); });
    return { ids: ids, padrao: ids.filter(function (id) { return /llama-4-(scout|maverick)/.test(id); })[0] || ids.filter(function (id) { return /llama-3\.3-70b/.test(id); })[0] || ids[0] };
  }

  // ── conversa ───────────────────────────────────────────────────────
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
    if (!chaveAtual()) { abrirConfig(true); return M.toast("Primeiro, cole a sua chave de API."); }
    var envio = anexos.slice();
    var msg = { role: "user", texto: texto, anexos: envio.map(function (a) { return { nome: a.nome, tipo: a.tipo }; }), em: new Date().toISOString() };
    chat.push(msg);
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
      var r = extrairAcoes(bruto);
      var resp = { role: "assistant", texto: r.texto, bruto: bruto, acoes: r.acoes, estados: {}, modelo: PROV[cfg.prov].nome + " · " + modeloAtual(), em: new Date().toISOString() };
      chat.push(resp);
      if (cfg.auto && r.acoes.length) aplicarTodas(chat.length - 1, true);
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
    throw new Error("A disciplina \"" + (ref || "?") + "\" não existe em " + t.nome + ". Cadastre-a em ⚙️ Turmas e alunos (ou peça à I.A para adicionar).");
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

  // Aplica uma ação. Devolve a mensagem de sucesso ou lança o erro.
  function aplicar(a) {
    var R = window.MeuDiarioRecursos, perdidos = [], t, d, msg;
    var aviso = function (m) { return perdidos.length ? m + " ⚠️ Não encontrei: " + perdidos.join(", ") + "." : m; };
    switch (a.tipo) {
      case "criar_diario": {
        t = turmaDe(a.turma); d = discDe(t, a.disciplina);
        if (!dataOk(a.data)) throw new Error("Data inválida: " + (a.data || "vazia") + ".");
        var ini = hora(a.inicio), fim = hora(a.fim);
        var rel = relDaAcao(t, Object.assign({ conteudo: "", faltaram: [], faltas_justificadas: [], comportamento: [], atividade: { houve: false } }, a), perdidos);
        var assunto = txt(a.assunto) || String(rel.conteudo || "").split(/[.\n]/)[0].slice(0, 80) || "Aula";
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
      case "sequencia":
      case "livro": {
        t = turmaDe(a.turma); d = discDe(t, a.disciplina);
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
      case "livro": return { ic: "📖", t: "Livro do " + a.bimestre + "º bimestre — " + tn() + " · " + (a.disciplina || ""), d: txt(a.titulo) };
      case "evento_calendario": return { ic: "📆", t: "Calendário: " + txt(a.titulo), d: (a.data ? M.dataBr(a.data) : "?") + (a.ate && a.ate !== a.data ? " a " + M.dataBr(a.ate) : "") + " · " + (a.categoria || "evento") };
      case "remover_evento": return { ic: "🗑", t: "Remover evento do calendário", d: a.id };
    }
    return { ic: "❔", t: a.tipo, d: "" };
  }
  function aplicarUma(mi, ai) {
    var m = chat[mi]; if (!m || !m.acoes[ai]) return;
    m.estados = m.estados || {};
    if (m.estados[ai] && m.estados[ai].ok) return;
    try { m.estados[ai] = { ok: true, msg: aplicar(m.acoes[ai]) }; }
    catch (e) { m.estados[ai] = { ok: false, msg: String((e && e.message) || e) }; }
  }
  function aplicarTodas(mi, semDesenhar) {
    var m = chat[mi]; if (!m) return;
    (m.acoes || []).forEach(function (a, i) { var e = (m.estados || {})[i]; if (!e || (!e.ok && !e.descartada)) aplicarUma(mi, i); });
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
      ".ia-nota{font-size:.76rem;color:var(--cm);line-height:1.55;background:var(--md-sup2);border:1px dashed var(--md-linha);border-radius:10px;padding:9px 12px;margin-top:10px}" +
      ".ia-chk{display:flex;gap:8px;align-items:flex-start;font-size:.82rem;margin:8px 0;color:var(--ce)}.ia-chk input{margin-top:3px}" +
      ".ia-chat{display:flex;flex-direction:column;padding:0;overflow:hidden}" +
      ".ia-chat-h{display:flex;align-items:center;gap:10px;padding:13px 18px;border-bottom:1px solid var(--md-linha);background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff}" +
      ".ia-chat-h b{font-family:'Playfair Display',serif;font-size:1rem}.ia-chat-h small{font-size:.72rem;opacity:.7;flex:1}" +
      ".ia-chat-h button{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:5px 11px;font-size:.74rem;cursor:pointer}" +
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
      "</style>";
  }
  function desenharConfigHtml() {
    var tem = !!chaveAtual(), p = PROV[cfg.prov];
    var lista = cfg.listas[cfg.prov] || [];
    var mod = modeloAtual();
    if (lista.length && lista.indexOf(mod) < 0) lista = [mod].concat(lista);
    return '<details class="md-card ia-cfg"' + (tem ? "" : " open") + '><summary>🔑 Chave de API <span class="ia-st ' + (tem ? "ok" : "no") + '">' + (tem ? "✓ " + esc(p.nome) + " · " + esc(mod) : "Não configurada") + '</span><span style="flex:1"></span><span style="font-size:.74rem;color:var(--cm);font-weight:500">Configurar ▾</span></summary>' +
      '<p style="margin-top:12px">Use a sua própria conta de IA. Escolha o serviço, crie uma chave no site dele e cole abaixo. <strong>A chave fica guardada só neste aparelho</strong> e as mensagens vão direto do seu navegador para o serviço escolhido — não passam pelos servidores do Meu Diário.</p>' +
      '<div class="ia-provs">' + Object.keys(PROV).map(function (k) { return '<button type="button" class="ia-prov' + (k === cfg.prov ? " on" : "") + '" data-prov="' + k + '"><b>' + esc(PROV[k].nome) + "</b><small>" + esc(PROV[k].sub) + (cfg.chaves[k] ? " · ✓ chave salva" : "") + "</small></button>"; }).join("") + "</div>" +
      '<div class="md-grid"><div class="md-f"><label>Chave de API — ' + esc(p.nome) + ' · <a href="' + p.link + '" target="_blank" rel="noopener">criar chave ↗</a></label><div class="md-row" style="margin:0"><input type="password" class="md-in" data-ia="chave" value="' + esc(cfg.chaves[cfg.prov] || "") + '" placeholder="Cole a chave aqui" autocomplete="off" spellcheck="false"><button type="button" class="md-btn mini" data-ia="ver" title="Mostrar/ocultar">👁</button></div></div>' +
      '<div class="md-f"><label>Modelo</label>' + (lista.length ? '<select data-ia="modelo">' + lista.map(function (id) { return '<option value="' + esc(id) + '"' + (id === mod ? " selected" : "") + ">" + esc(id) + "</option>"; }).join("") + "</select>" : '<input type="text" data-ia="modelo" value="' + esc(mod) + '">') + "</div></div>" +
      '<label class="ia-chk"><input type="checkbox" data-ia="ocultar"' + (cfg.ocultar ? " checked" : "") + '><span><strong>Ocultar os nomes dos alunos no texto enviado à IA</strong> (recomendado). Cada aluno vai como «T1.7» e a resposta volta com o nome. Fotos e documentos seguem como estão.</span></label>' +
      '<label class="ia-chk"><input type="checkbox" data-ia="auto"' + (cfg.auto ? " checked" : "") + '><span><strong>Aplicar as mudanças automaticamente</strong>, sem pedir confirmação. Deixe desligado para revisar cada ação antes.</span></label>' +
      '<div class="md-row" style="flex-wrap:wrap;margin-top:6px"><button type="button" class="md-btn pri" data-ia="testar">🔌 Testar e salvar</button>' + (tem ? '<button type="button" class="md-btn perigo" data-ia="remover">Remover chave</button>' : "") + '<span data-ia="msg" style="font-size:.8rem;color:var(--cm)"></span></div>' +
      '<div class="ia-nota">💡 <strong>Qual escolher?</strong> O <strong>Google Gemini</strong> tem uso gratuito e lê fotos e PDFs — bom para começar. OpenAI e Claude cobram por uso, na conta do próprio professor. O Groq é gratuito com limites e lê fotos (PDF só com texto). O uso e os custos da chave são responsabilidade do titular da conta no serviço de IA.</div></details>';
  }
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
    var html = chat.length ? "" : '<div class="ia-vazio">👋 Olá! Sou o seu assistente. Posso <strong>registrar aulas</strong>, <strong>ler fotos da chamada</strong>, <strong>montar o plano de aulas</strong>, organizar o <strong>calendário</strong> e responder dúvidas sobre as suas turmas.<br>Escreva abaixo, envie um arquivo 📎 ou tire uma foto 📷. Nada muda no diário sem a sua confirmação.</div>';
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
        html += '<div class="ia-m a">' + markdown(restaurar(m.texto || "")) + acoes + (m.modelo ? '<div class="ia-meta">' + esc(m.modelo) + "</div>" : "") + "</div>";
      }
    });
    if (pensando) html += '<div class="ia-pensa">🤖 Pensando <i></i><i></i><i></i></div>';
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
    box.querySelectorAll("[data-ap]").forEach(function (b) { b.onclick = function () { var p = b.getAttribute("data-ap").split(":"); aplicarUma(+p[0], +p[1]); gravarChat(); desenharChat(); }; });
    box.querySelectorAll("[data-ds]").forEach(function (b) { b.onclick = function () { var p = b.getAttribute("data-ds").split(":"), m = chat[+p[0]]; m.estados = m.estados || {}; m.estados[+p[1]] = { ok: false, descartada: true }; gravarChat(); desenharChat(); }; });
    box.querySelectorAll("[data-apt]").forEach(function (b) { b.onclick = function () { aplicarTodas(+b.getAttribute("data-apt")); }; });
    box.querySelectorAll("[data-dst]").forEach(function (b) { b.onclick = function () { var m = chat[+b.getAttribute("data-dst")]; m.estados = m.estados || {}; m.acoes.forEach(function (a, i) { if (!m.estados[i] || !m.estados[i].ok) m.estados[i] = { ok: false, descartada: true }; }); gravarChat(); desenharChat(); }; });
    var env = $(".env"); if (env) { env.disabled = !!pensando; env.textContent = pensando ? "…" : "Enviar ➤"; }
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
      '<div class="ia-wrap">' + desenharConfigHtml() +
      '<div class="md-card ia-chat"><div class="ia-chat-h"><b>🤖 Assistente</b><small>' + (chaveAtual() ? esc(PROV[cfg.prov].nome + " · " + modeloAtual()) : "configure a chave de API para começar") + '</small><button type="button" data-ia="limpar">🗑 Nova conversa</button></div>' +
      '<div class="ia-msgs"></div>' +
      '<div class="ia-sug">' + SUGESTOES.map(function (s, i) { return '<button type="button" data-sug="' + i + '">' + esc(s[0]) + "</button>"; }).join("") + "</div>" +
      '<div class="ia-anexos" hidden></div>' +
      '<div class="ia-in"><button type="button" class="ib" data-ia="anexar" title="Anexar arquivo (foto, PDF, Word, planilha, texto)">📎</button><button type="button" class="ib" data-ia="camera" title="Tirar foto">📷</button>' +
      '<textarea class="ia-txt" rows="1" placeholder="Escreva aqui…" title="Enter envia · Shift+Enter quebra a linha"></textarea><button type="button" class="ib env">Enviar ➤</button></div>' +
      '<input type="file" data-ia="arq" multiple hidden accept="image/*,.pdf,.docx,.xlsx,.xls,.ods,.csv,.tsv,.txt,.md,.json,.html,.htm,.xml">' +
      '<input type="file" data-ia="cam" hidden accept="image/*" capture="environment"></div></div>';
    if (cfgAberta !== null) sec.querySelector(".ia-cfg").open = cfgAberta || !chaveAtual();
    ligar(sec);
    var t = sec.querySelector(".ia-txt"); t.value = rascunho; ajustarAltura(t);
    desenharChat(ocupado);
    desenharAnexos();
  }
  function ligar(sec) {
    var q = function (s) { return sec.querySelector(s); };
    sec.querySelectorAll("[data-prov]").forEach(function (b) { b.onclick = function () { cfg.prov = b.getAttribute("data-prov"); gravarCfg(); desenhar(); abrirConfig(); }; });
    q('[data-ia="ver"]').onclick = function () { var c = q('[data-ia="chave"]'); c.type = c.type === "password" ? "text" : "password"; };
    q('[data-ia="ocultar"]').onchange = function () { cfg.ocultar = this.checked; gravarCfg(); };
    q('[data-ia="auto"]').onchange = function () { cfg.auto = this.checked; gravarCfg(); };
    q('[data-ia="modelo"]').onchange = function () { cfg.modelos[cfg.prov] = this.value.trim(); gravarCfg(); desenhar(); };
    q('[data-ia="testar"]').onclick = async function () {
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
    };
    var rm = q('[data-ia="remover"]');
    if (rm) rm.onclick = function () { if (!confirm("Remover a chave do " + PROV[cfg.prov].nome + " deste aparelho?")) return; delete cfg.chaves[cfg.prov]; delete cfg.listas[cfg.prov]; gravarCfg(); desenhar(); };
    q('[data-ia="limpar"]').onclick = function () { if (chat.length && !confirm("Começar uma nova conversa? As mensagens desta conversa somem deste aparelho (o que já foi aplicado no diário continua).")) return; chat = []; gravarChat(); desenharChat(); };
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
    sec.querySelectorAll("[data-sug]").forEach(function (b) { b.onclick = function () { sugerir(SUGESTOES[+b.getAttribute("data-sug")][1]); }; });
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

  window.MeuDiarioIA = { sugerir: sugerir };

  (window.MD_MODULOS = window.MD_MODULOS || []).push({
    nome: "ia",
    iniciar: function (api) { M = api; cfg = lerCfg(); chat = lerChat(); },
    desenhar: function () { if (!document.querySelector("#sec-ia .ia-wrap")) desenhar(); else { var h = document.querySelector("#sec-ia .ia-chat-h small"); if (h) h.textContent = chaveAtual() ? PROV[cfg.prov].nome + " · " + modeloAtual() : "configure a chave de API para começar"; } },
    aoAbrir: function (id) { if (id === "ia") { var t = $(".ia-txt"); if (t && !("ontouchstart" in window)) setTimeout(function () { t.focus(); }, 60); } }
  });
})();
