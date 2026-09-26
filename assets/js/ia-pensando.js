// ═══════════════════════════════════════════════════════════════════════
// ia-pensando.js — "a I.A está pensando" com o LatticeLoader (26/09/2026).
//
// Mostra a animação do lattice-loader.js com o relógio e FRASES QUE SE
// REVEZAM de acordo com o trabalho: cada ferramenta da aba 🤖 I.A
// (ia-ferramentas.js) tem as suas, com os campos preenchidos ({tema},
// {qtd}, {turma}…); o "+ Novo Diário" e a ferramenta "Registrar aula"
// usam as do diário; uma conversa livre escolhe pela intenção da mensagem
// (aula, chamada, plano, prova, calendário, resumo…) e pelos anexos.
//
//   var p = IAPensando.iniciar({ ferramenta: "prova", valores: {...},
//     texto: "…", anexos: [{tipo:"pdf", nome:"x.pdf"}], plataforma: true });
//   caixa.appendChild(p.el);
//   p.fase("Aplicando as mudanças");   // frase fixa (etapa real)
//   var seg = p.concluir();            // ✓ "Concluído em 4,2s"
//   p.falhar();                        // ✕ "Falhou após 3,1s"
//
// As frases descrevem o que a I.A faz com o pedido; nada aqui promete busca
// na internet (a I.A da plataforma não navega). Frase com {campo} vazio é
// pulada: cada item pode ter alternativas, da mais completa à mais simples.
// Frase nova: acrescente na lista da ferramenta em FERR (id do catálogo).
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var INTERVALO = 2500;     // ms entre uma frase e outra do trabalho
  var RAPIDO = 1300;        // frases de abertura (ler o pedido, anexos…)
  var DEMORA = 18000;       // depois disso entram as frases de espera
  // Configuração pedida para o LatticeLoader (React Bits).
  var CONFIG = {
    label: "Pensando", doneLabel: "Concluído em", errorLabel: "Falhou após",
    pattern: "orbit", grid: 3, shape: "round", doneColor: "#22c55e", errorColor: "#ef4444",
    cellSize: 6, gap: 2, fontSize: 14, step: 90, idleOpacity: 0.15, glow: false, glowColor: "", showTimer: true
  };

  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function corta(s, n) { s = String(s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/[\s,.;:–-]+$/, "") + "…" : s; }
  function vazio(x) { return x == null || String(x).trim() === "" || /^(sem prazo|—)$/i.test(String(x).trim()); }
  // Uma frase (ou lista de alternativas) → texto com os campos, ou "".
  function preencher(item, v) {
    var alts = Array.isArray(item) ? item : [item];
    for (var i = 0; i < alts.length; i++) {
      var falta = false;
      var r = alts[i].replace(/\{(\w+)\}/g, function (t, k) { if (vazio(v[k])) { falta = true; return ""; } return corta(v[k], k === "tema" || k === "conteudos" || k === "assunto" ? 36 : 28); });
      if (!falta) return r;
    }
    return "";
  }
  function lista(itens, v) { return itens.map(function (x) { return preencher(x, v); }).filter(Boolean); }

  // ── frases do diário (Novo Diário, "Registrar aula" e conversa livre) ──
  function temFaltas(t) { return /falt|ausen|nao vei|nao compareceu|nao estava/.test(t); }
  function temAtividade(t) { return /atividade|exercic|tarefa|trabalho|entreg/.test(t); }
  function temConduta(t) { return /comport|convers|celular|brig|advert|bagun|desrespeit|indisciplin|xing|agress|ocorrenc|dormi/.test(t); }
  function horario(v, texto) {
    if (v.ini && v.fim) return v;
    var m = /(\d{1,2})[:h](\d{2})\D{1,8}(\d{1,2})[:h](\d{2})/.exec(String(v.horario || texto || ""));
    if (m) { v.ini = ("0" + m[1]).slice(-2) + ":" + m[2]; v.fim = ("0" + m[3]).slice(-2) + ":" + m[4]; }
    return v;
  }
  function frasesDiario(v, texto) {
    var t = norm(texto);
    v = horario(v, texto);
    var ciclo = [
      ["Identificando os {alunos} alunos da turma {turma}", "Identificando os alunos da turma {turma}", "Identificando os alunos da turma"],
      ["Organizando o horário das {ini} às {fim}", "Organizando os horários"],
      ["Registrando {horas} h/aula de {disciplina} no contador", "Registrando as h/aula de {disciplina} no contador", "Registrando as horas-aula no contador"],
      temFaltas(t) ? "Anotando as faltas" : "Conferindo a presença da turma",
      ["Descrevendo o conteúdo: {assunto}", "Descrevendo o conteúdo da aula"]
    ];
    if (temAtividade(t)) ciclo.push("Registrando a atividade e quem entregou");
    if (!vazio(v.prazo)) ciclo.push(["Marcando o prazo de entrega: {prazo}", "Marcando o prazo de entrega"]);
    if (temConduta(t)) ciclo.push("Classificando as ocorrências de comportamento");
    ciclo.push("Preparando a análise pedagógica", "Montando o diário no padrão da escola");
    return { inicio: ["Lendo o relato"], ciclo: ciclo, demora: ["Relatos longos levam um pouco mais", "Quase pronto"] };
  }

  // ── frases de cada ferramenta (ids de ia-ferramentas.js) ─────────────
  var FERR = {
    sequencia: ["Estudando o tema {tema}", ["Buscando habilidades da BNCC de {disciplina}", "Relacionando habilidades da BNCC"], ["Dividindo o conteúdo em {aulas} aulas", "Dividindo o conteúdo em aulas"], "Planejando aula a aula", "Definindo os objetivos de aprendizagem", "Escolhendo recursos e estratégias", "Preparando a avaliação da sequência", "Pensando em adaptações para quem tem dificuldade"],
    "plano-aula": ["Estudando o tema {tema}", "Definindo os objetivos da aula", ["Cronometrando {duracao} h/aula em momentos", "Cronometrando os momentos da aula"], "Escolhendo a metodologia", "Separando os recursos", "Preparando a avaliação"],
    "plano-curso": [["Montando a ementa de {disciplina}", "Montando a ementa"], ["Distribuindo {carga} h/aula em 4 bimestres", "Distribuindo a carga horária em 4 bimestres"], ["Priorizando: {foco}", "Organizando os conteúdos por bimestre"], "Relacionando habilidades da BNCC", "Definindo os instrumentos de avaliação", "Planejando a recuperação"],
    "plano-bimestre": [["Dividindo {tema} em {aulas} aulas", "Dividindo o tema em aulas"], "Ordenando do básico ao avançado", "Escrevendo o título de cada aula", "Incluindo a avaliação no fim", "Preparando o lançamento nos Conteúdos"],
    bncc: [["Consultando a BNCC de {disciplina}", "Consultando a BNCC"], ["Relacionando {tema} às habilidades", "Relacionando o conteúdo às habilidades"], "Conferindo os códigos das habilidades", "Pensando em como trabalhar em sala"],
    projeto: [["Criando a pergunta norteadora sobre {tema}", "Criando a pergunta norteadora"], ["Integrando {disciplinas}", "Integrando as disciplinas"], ["Montando o cronograma de {semanas} semanas", "Montando o cronograma"], "Definindo o produto final", "Distribuindo os papéis dos alunos", "Preparando a rubrica de avaliação"],
    prova: [["Estudando os conteúdos: {conteudos}", "Estudando os conteúdos da prova"], ["Preparando {objetivas} questões objetivas", "Preparando as questões objetivas"], ["Escrevendo {discursivas} questões discursivas", "Escrevendo as questões discursivas"], "Criando alternativas plausíveis", ["Ajustando o nível: {nivel}", "Ajustando o nível das questões"], "Distribuindo os 10 pontos", "Escrevendo o gabarito comentado"],
    "questoes-enem": [["Criando textos-base sobre {tema}", "Criando os textos-base"], ["Preparando {qtd} questões no padrão {padrao}", "Preparando as questões"], "Criando distratores plausíveis", "Indicando competências e descritores", "Justificando o gabarito"],
    rubrica: [["Analisando a atividade: {atividade}", "Analisando a atividade"], "Definindo os critérios de correção", ["Descrevendo {niveis} níveis de desempenho", "Descrevendo os níveis de desempenho"], ["Distribuindo {total} pontos", "Distribuindo os pontos"], "Escrevendo o modelo de devolutiva"],
    recuperacao: [["Revisando: {conteudos}", "Revisando os conteúdos"], "Explicando em linguagem simples", "Preparando exercícios em 3 níveis", "Montando a miniavaliação", "Escrevendo o gabarito"],
    correcao: ["Lendo o texto do aluno", ["Aplicando os critérios: {criterio}", "Aplicando os critérios de correção"], "Encontrando os pontos fortes", "Anotando o que pode melhorar", "Sugerindo reescritas", "Escrevendo a devolutiva ao aluno"],
    exercicios: ["Estudando o tema {tema}", ["Preparando {qtd} exercícios", "Preparando os exercícios"], "Organizando do mais fácil ao desafio", "Escrevendo o gabarito"],
    leitura: [["Escrevendo um(a) {genero} sobre {tema}", "Preparando o texto"], ["Criando {qtd} questões de interpretação", "Criando as questões de interpretação"], "Incluindo inferência e vocabulário", "Escrevendo o gabarito"],
    dinamica: [["Pensando em jogos sobre {tema}", "Pensando em jogos para a turma"], ["Ajustando para {tempo} minutos", "Ajustando ao tempo da aula"], ["Usando: {materiais}", "Escolhendo os materiais"], "Escrevendo as regras passo a passo", "Pensando em como avaliar a participação"],
    resumo: ["Estudando o tema {tema}", ["Montando o {formato}", "Montando o material de estudo"], "Destacando os conceitos-chave", "Escolhendo exemplos do cotidiano", "Criando 5 questões de revisão"],
    slides: [["Planejando {qtd} slides sobre {tema}", "Planejando os slides"], "Escrevendo os tópicos de cada slide", "Sugerindo imagens", "Preparando a fala do professor"],
    "rel-turma": [["Consultando o diário da turma {turma}", "Consultando o diário da turma"], "Contando as faltas de cada aluno", "Conferindo quem passa de 25% de faltas", "Reunindo as entregas de atividades", "Analisando as ocorrências", "Escrevendo os encaminhamentos"],
    parecer: [["Consultando o diário de {aluno}", "Consultando o diário do aluno"], "Lendo as suas observações", "Reunindo frequência e participação", "Escrevendo em linguagem pedagógica", "Preparando as recomendações"],
    ata: ["Lendo as anotações", ["Organizando a pauta da {tipo}", "Organizando a pauta"], "Registrando as deliberações", "Listando encaminhamentos e prazos", "Formatando a ata"],
    "rel-bimestral": ["Consultando o diário de todas as turmas", "Somando a carga horária", "Listando os conteúdos por turma", "Reunindo frequência e entregas", "Escrevendo dificuldades e encaminhamentos"],
    adaptar: ["Lendo a atividade original", "Considerando as necessidades do estudante", "Aplicando o Desenho Universal para a Aprendizagem", "Simplificando os comandos", "Descrevendo os apoios visuais"],
    pei: ["Lendo o perfil do estudante", "Mapeando potencialidades e barreiras", "Escrevendo metas SMART", "Definindo estratégias e responsáveis", "Planejando a parceria com a família"],
    comunicado: ["Entendendo o assunto", "Escrevendo em linguagem acolhedora", "Destacando datas e o que fazer", ["Ajustando para {formato}", "Ajustando o formato"]],
    oficio: [["Escrevendo para {destinatario}", "Escrevendo o ofício"], "Seguindo a redação oficial", "Organizando o pedido", "Revisando a norma culta"],
    simplificar: ["Lendo o texto", ["Adaptando para o nível {nivel}", "Adaptando o nível de leitura"], "Encurtando as frases", "Montando o glossário"]
  };

  // ── conversa livre: intenção pela mensagem ───────────────────────────
  var INTENCOES = [
    { re: /registr\w* (a |uma )?aula|aula de hoje|\bdiario\b|faltaram|faltou/, diario: true },
    { re: /chamada|lista (de|dos) alunos|cadastr\w* (os )?alunos|lista da turma/, ciclo: ["Lendo a lista de chamada", "Separando os nomes dos alunos", "Conferindo nomes repetidos", "Numerando a turma", "Preparando o cadastro"] },
    { re: /sequencia/, ciclo: FERR.sequencia },
    { re: /plano (de aula|do bimestre|de aulas|de curso)|planej/, ciclo: ["Estudando o conteúdo", "Dividindo o conteúdo em aulas", "Definindo os objetivos", "Relacionando habilidades da BNCC", "Organizando o plano"] },
    { re: /prova|avaliac|questo|simulado/, ciclo: ["Estudando os conteúdos", "Preparando as questões", "Criando alternativas plausíveis", "Escrevendo o gabarito"] },
    { re: /exercic|atividade/, ciclo: ["Estudando o tema", "Preparando os exercícios", "Organizando do mais fácil ao desafio", "Escrevendo o gabarito"] },
    { re: /calendario|feriado|recesso|evento/, ciclo: ["Consultando o calendário de {ano}", "Marcando os feriados nacionais", "Conferindo o recesso escolar", "Preparando os eventos"] },
    { re: /resumo|relatorio|frequencia|faltas|ocorrenc|semana/, ciclo: ["Consultando o diário", "Contando as faltas por turma", "Reunindo as ocorrências", "Organizando os números", "Escrevendo o resumo"] },
    { re: /(cri\w*|nova|cadastr\w*) (a |uma )?turma/, ciclo: ["Criando a turma", "Organizando as disciplinas", "Preparando a lista de alunos"] },
    { re: /transfer/, ciclo: ["Localizando o aluno", "Preparando a transferência"] },
    { re: /corrig|redac/, ciclo: FERR.correcao },
    { re: /\bpei\b|meta/, aee: true, ciclo: ["Relendo o PEI", "Escrevendo metas SMART", "Definindo estratégias e responsáveis"] }
  ];
  var AEE = ["Consultando o perfil do estudante", "Relendo o PEI", "Pensando em estratégias inclusivas", "Escrevendo em linguagem respeitosa"];
  var GERAL = ["Consultando os dados do diário", "Pensando na melhor resposta", "Escrevendo a resposta"];
  var FIM = ["Conferindo os detalhes", "Revisando a resposta"];
  var ESPERA = ["Respostas completas levam um pouco mais", "Ainda trabalhando no seu pedido", "Quase pronto"];

  function nomeCurto(n) { return corta(n || "arquivo", 22); }
  function frasesAnexos(anexos, chamada) {
    return (anexos || []).slice(0, 3).map(function (a) {
      var n = nomeCurto(a.nome);
      if (a.tipo === "imagem" || a.tipo === "heic") return chamada ? "Lendo a foto da lista de chamada" : "Olhando a foto " + n;
      if (a.tipo === "pdf") return "Lendo o PDF " + n;
      if (a.tipo === "planilha") return "Lendo a planilha " + n;
      if (a.tipo === "docx" || a.tipo === "doc") return "Lendo o documento " + n;
      return "Lendo o arquivo " + n;
    });
  }

  // ctx: {tipo:"diario"} | {ferramenta, valores} | {texto} + anexos, plataforma,
  // ocultar (nomes trocados por código), seguimento (há resposta anterior), pagina.
  function frases(ctx) {
    ctx = ctx || {};
    var v = Object.assign({ ano: new Date().getFullYear() }, ctx.valores || {});
    var t = norm(ctx.texto), inicio = [], set;
    var chamada = /chamada|lista/.test(t);

    if (ctx.tipo === "diario" || ctx.ferramenta === "registrar") {
      set = frasesDiario(v, (ctx.texto || "") + " " + (v.relato || ""));
      if (ctx.ferramenta === "registrar") set.inicio = ["Lendo o relato da aula"];
    } else if (ctx.ferramenta && FERR[ctx.ferramenta]) {
      set = { inicio: [], ciclo: FERR[ctx.ferramenta].concat(FIM), demora: ESPERA };
    } else {
      var achou = null;
      for (var i = 0; i < INTENCOES.length; i++) if (INTENCOES[i].re.test(t)) { achou = INTENCOES[i]; break; }
      if (achou && achou.diario) set = frasesDiario(v, ctx.texto);
      else if (achou) set = { inicio: [], ciclo: achou.ciclo.concat(FIM), demora: ESPERA };
      else set = { inicio: [], ciclo: (/^aee/.test(ctx.pagina || "") ? AEE : GERAL).concat(FIM), demora: ESPERA };
    }

    // Etapas reais do começo: ler o pedido e os anexos, proteger os nomes.
    if (ctx.seguimento && ctx.ferramenta) inicio.push("Lendo o seu pedido de ajuste");
    else if (!set.inicio.length) inicio.push("Lendo o seu pedido");
    inicio = inicio.concat(set.inicio, frasesAnexos(ctx.anexos, chamada));
    if (ctx.ocultar) inicio.push("Protegendo os nomes dos alunos");
    if (ctx.plataforma) inicio.push("Escolhendo uma I.A. disponível");

    return { inicio: lista(inicio, v), ciclo: lista(set.ciclo, v), demora: lista(set.demora || ESPERA, v) };
  }

  // ── animação viva ────────────────────────────────────────────────────
  function iniciar(ctx, opcoes) {
    var L = window.LatticeLoader;
    var f = frases(ctx), fila = f.inicio.concat(f.ciclo), ciclo0 = f.inicio.length;
    if (!fila.length) fila = ["Pensando"];
    if (!L) {
      // Sem o componente: texto simples (a página segue funcionando).
      var s = document.createElement("span"); s.textContent = "🤖 " + fila[0] + "…";
      return { el: s, fase: function (x) { s.textContent = "🤖 " + x + "…"; }, retomar: function () {}, concluir: function () { return 0; }, falhar: function () { return 0; }, segundos: function () { return 0; }, parar: function () { if (s.parentNode) s.parentNode.removeChild(s); } };
    }
    var l = L.criar(Object.assign({}, CONFIG, { label: fila[0], fluid: true }, opcoes || {}));
    var i = 0, fixa = false, esperou = false, t0 = Date.now(), relogio = null;
    // Abertura rápida; as frases do trabalho ficam mais tempo na tela.
    function proxima() {
      relogio = setTimeout(function () {
        if (!fixa) {
          if (!esperou && Date.now() - t0 > DEMORA && f.demora.length) {
            esperou = true;
            var onde = Math.max(i + 1, ciclo0);
            fila = fila.slice(0, onde).concat(f.demora, fila.slice(onde));
          }
          i++;
          if (i >= fila.length) i = ciclo0 < fila.length ? ciclo0 : 0;
          l.rotulo(fila[i]);
        }
        proxima();
      }, i < ciclo0 ? RAPIDO : INTERVALO);
    }
    proxima();
    function fim(st) { clearTimeout(relogio); l.status(st); return l.segundos(); }
    return {
      el: l.el,
      loader: l,
      fase: function (texto) { fixa = true; l.rotulo(texto); },
      retomar: function () { fixa = false; },
      concluir: function () { return fim("done"); },
      falhar: function () { return fim("error"); },
      segundos: function () { return l.segundos(); },
      parar: function () { clearTimeout(relogio); l.destruir(); }
    };
  }

  // Selo parado para o histórico: "✓ Concluído em 4,2s" / "✕ Falhou após 3,1s".
  function selo(segundos, erro, opcoes) {
    if (!window.LatticeLoader || segundos == null) return "";
    return window.LatticeLoader.html(Object.assign({}, CONFIG, { status: erro ? "error" : "done", elapsed: segundos }, opcoes || {}));
  }
  function tempo(segundos) { return window.LatticeLoader ? window.LatticeLoader.formatar(Math.round((segundos || 0) * 10)) : Math.round(segundos || 0) + "s"; }

  window.IAPensando = { iniciar: iniciar, frases: frases, selo: selo, tempo: tempo, CONFIG: CONFIG };
})();
