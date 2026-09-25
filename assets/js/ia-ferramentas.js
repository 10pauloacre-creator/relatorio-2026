// ═══════════════════════════════════════════════════════════════════════
// ia-ferramentas.js — catálogo das ferramentas da aba 🤖 I.A (24/09/2026).
//
// Cada ferramenta é um assistente especializado (chatbot próprio):
//   nome, descrição, instruções de uso, campos a preencher e um prompt
//   inicial com {{campo}} — o professor só completa o que é específico.
//   "papel" entra no sistema da conversa e deixa a I.A especialista naquela
//   função; "doc" diz em que aba de 📁 Documentos o resultado costuma ir.
//
// Campos: turma · disciplina · bimestre (listas da escola aberta), texto,
// area (texto longo), numero, opcoes. Nomes padrão "turma", "disciplina" e
// "bimestre" também servem para identificar onde salvar o documento.
//
// "acao": a ferramenta depende dessa ação (páginas que não a têm escondem a ferramenta).
// Nova ferramenta: acrescente um objeto em FERRAMENTAS. Nada mais muda.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var CATEGORIAS = [
    { id: "planejamento", nome: "Planejamento", ic: "🧭" },
    { id: "avaliacao", nome: "Avaliação", ic: "✅" },
    { id: "atividades", nome: "Atividades e aulas", ic: "🎯" },
    { id: "relatorios", nome: "Relatórios e registros", ic: "📊" },
    { id: "inclusao", nome: "Inclusão", ic: "♿" },
    { id: "comunicacao", nome: "Comunicação", ic: "✉️" },
    { id: "apoio", nome: "Apoio ao professor", ic: "🧰" }
  ];

  // Campos que se repetem.
  var T = { id: "turma", rotulo: "Turma", tipo: "turma", obrig: true };
  var D = { id: "disciplina", rotulo: "Disciplina", tipo: "disciplina", obrig: true };
  var B = { id: "bimestre", rotulo: "Bimestre", tipo: "bimestre" };
  var TEMA = { id: "tema", rotulo: "Tema / conteúdo", tipo: "texto", obrig: true, ph: "Ex.: Gêneros textuais argumentativos" };
  var OBS = { id: "obs", rotulo: "Observações (opcional)", tipo: "area", ph: "Recursos disponíveis, perfil da turma, o que evitar…" };

  var FERRAMENTAS = [
    // ── PLANEJAMENTO ────────────────────────────────────────────────
    {
      id: "sequencia", ic: "🗂", cat: "planejamento", doc: "seq", nome: "Criar Sequência didática",
      desc: "Monta uma sequência didática completa: objetivos, habilidades da BNCC, etapas aula a aula, recursos e avaliação.",
      instrucoes: ["Escolha turma, disciplina e bimestre.", "Informe o tema e quantas aulas a sequência deve ter.", "Revise a proposta no chat e peça ajustes (\"reduza para 4 aulas\", \"inclua uma atividade em grupo\").", "Toque em 💾 Salvar em Documentos: ela vai para a aba Sequências, na pasta da turma."],
      campos: [T, D, B, TEMA, { id: "aulas", rotulo: "Número de aulas", tipo: "numero", valor: "6" }, OBS],
      prompt: "Crie uma sequência didática para a turma {{turma}}, disciplina {{disciplina}}, {{bimestre}} bimestre, sobre \"{{tema}}\", com {{aulas}} aulas de 50 minutos.\n{{obs}}",
      papel: "Você é especialista em planejamento pedagógico e na BNCC. Monte a sequência com: título; público; duração; objetivos de aprendizagem; habilidades da BNCC (código e descrição, só as que você tem certeza); conhecimentos prévios; recursos; desenvolvimento AULA A AULA (objetivo, momentos com tempo estimado, estratégia, o que o aluno produz); avaliação (critérios e instrumentos); adaptações para quem tem dificuldade; referências. Use títulos ## e listas."
    },
    {
      id: "plano-aula", ic: "📝", cat: "planejamento", doc: "aula", nome: "Plano de aula",
      desc: "Plano de uma aula (ou de uma dupla de aulas) com objetivo, habilidades, passo a passo cronometrado e avaliação.",
      instrucoes: ["Escolha turma e disciplina e diga o tema.", "Informe a duração (em h/aula).", "Peça variações: \"versão para aula sem internet\", \"inclua um desafio final\".", "Salve em Documentos › Planos de aula."],
      campos: [T, D, B, TEMA, { id: "duracao", rotulo: "Duração (h/aula)", tipo: "numero", valor: "1" }, OBS],
      prompt: "Faça um plano de aula para a turma {{turma}} ({{disciplina}}, {{bimestre}} bimestre) sobre \"{{tema}}\", com duração de {{duracao}} h/aula.\n{{obs}}",
      papel: "Você é especialista em didática. O plano tem: identificação; tema; objetivos (verbos observáveis); habilidades da BNCC (só as que você tem certeza); conteúdos; metodologia em momentos cronometrados (acolhida, problematização, desenvolvimento, sistematização, fechamento); recursos; avaliação; tarefa de casa opcional. Seja prático e realista para escola pública."
    },
    {
      id: "plano-curso", ic: "📘", cat: "planejamento", doc: "curso", nome: "Plano de curso anual",
      desc: "Plano de curso do ano inteiro, dividido por bimestres: ementa, objetivos, conteúdos, habilidades, metodologia e avaliação.",
      instrucoes: ["Escolha turma e disciplina.", "Informe a carga horária anual (o assistente já conhece a meta cadastrada, se houver).", "Se a escola tiver um referencial curricular próprio, cole trechos em Observações ou anexe o PDF no chat.", "Salve em Documentos › Planos de curso."],
      campos: [T, D, { id: "carga", rotulo: "Carga horária anual (h/aula)", tipo: "numero", ph: "Ex.: 80" }, { id: "foco", rotulo: "Eixos ou prioridades (opcional)", tipo: "texto", ph: "Ex.: leitura, produção de texto, oralidade" }, OBS],
      prompt: "Elabore o plano de curso anual de {{disciplina}} para a turma {{turma}}, com carga horária de {{carga}} h/aula, dividido em 4 bimestres. Prioridades: {{foco}}.\n{{obs}}",
      papel: "Você é coordenador(a) pedagógico(a) experiente. Estruture: identificação; ementa; objetivos gerais; para CADA bimestre uma tabela markdown | Conteúdos | Habilidades BNCC | Objetivos | Nº de aulas |; metodologia; recursos; avaliação (instrumentos e pesos); recuperação; referências. Distribua a carga horária de forma coerente entre os bimestres."
    },
    {
      id: "plano-bimestre", ic: "📚", cat: "planejamento", doc: "", acao: "plano_bimestre", nome: "Plano de aulas do bimestre (lança nos Conteúdos)",
      desc: "Cria a lista de aulas do bimestre e lança direto na aba 📚 Conteúdos, com os botões Planj./Aplic./Pulad.",
      instrucoes: ["Escolha turma, disciplina e bimestre.", "Diga o tema do bimestre e quantas aulas.", "Confira os cartões de ação e toque em Aplicar — as aulas aparecem na aba 📚 Conteúdos."],
      campos: [T, D, B, TEMA, { id: "aulas", rotulo: "Número de aulas", tipo: "numero", valor: "10" }],
      prompt: "Monte o plano de aulas do {{bimestre}} bimestre de {{disciplina}} da turma {{turma}} com {{aulas}} aulas sobre \"{{tema}}\" e lance nos Conteúdos (inclua uma avaliação no fim).",
      papel: "Você planeja bimestres. Responda com uma frase de resumo e proponha a ação plano_bimestre com as aulas (título curto + detalhe), marcando avaliacao:true nas avaliações."
    },
    {
      id: "bncc", ic: "🎯", cat: "planejamento", doc: "aula", nome: "Habilidades da BNCC",
      desc: "Encontra as habilidades da BNCC que combinam com um conteúdo e explica como trabalhar cada uma.",
      instrucoes: ["Informe a etapa (turma) e o conteúdo.", "A I.A lista códigos e descrições — confira no documento oficial antes de usar em documento oficial.", "Peça \"monte uma aula para a habilidade X\" para continuar."],
      campos: [T, D, TEMA],
      prompt: "Quais habilidades da BNCC se relacionam com \"{{tema}}\" em {{disciplina}} para a turma {{turma}}? Para cada uma, explique como trabalhar em sala.",
      papel: "Você conhece a BNCC (Ensino Fundamental e Médio). Liste em tabela | Código | Habilidade | Como trabalhar |. Só cite códigos de que tem certeza; se houver dúvida, diga \"confira no texto oficial\"."
    },
    {
      id: "projeto", ic: "🧩", cat: "planejamento", doc: "seq", nome: "Projeto interdisciplinar",
      desc: "Planeja um projeto que integra disciplinas, com produto final, cronograma, papéis e avaliação.",
      instrucoes: ["Escolha a turma e o tema.", "Diga quais disciplinas participam e a duração.", "Salve em Documentos › Sequências."],
      campos: [T, TEMA, { id: "disciplinas", rotulo: "Disciplinas envolvidas", tipo: "texto", ph: "Ex.: Língua Portuguesa, Geografia, Artes" }, { id: "semanas", rotulo: "Duração (semanas)", tipo: "numero", valor: "4" }, OBS],
      prompt: "Planeje um projeto interdisciplinar para a turma {{turma}} sobre \"{{tema}}\", envolvendo {{disciplinas}}, com duração de {{semanas}} semanas.\n{{obs}}",
      papel: "Você é especialista em aprendizagem baseada em projetos. Inclua: justificativa; pergunta norteadora; objetivos por disciplina; produto final; cronograma semanal em tabela; papéis dos alunos; recursos; avaliação com rubrica; culminância."
    },
    // ── AVALIAÇÃO ───────────────────────────────────────────────────
    {
      id: "prova", ic: "🧪", cat: "avaliacao", doc: "aula", nome: "Criar prova / avaliação",
      desc: "Prova pronta para imprimir, com questões objetivas e discursivas, valores e gabarito comentado no final.",
      instrucoes: ["Escolha turma, disciplina e bimestre e diga os conteúdos.", "Defina quantas questões de cada tipo e o nível.", "Baixe em Word para ajustar o cabeçalho da escola, ou em PDF para imprimir."],
      campos: [T, D, B, { id: "conteudos", rotulo: "Conteúdos da prova", tipo: "area", obrig: true, ph: "Ex.: Substantivo, adjetivo, concordância nominal" }, { id: "objetivas", rotulo: "Questões objetivas", tipo: "numero", valor: "8" }, { id: "discursivas", rotulo: "Questões discursivas", tipo: "numero", valor: "2" }, { id: "nivel", rotulo: "Nível", tipo: "opcoes", opcoes: ["fácil", "médio", "misto (fácil, médio e difícil)", "difícil"], valor: "misto (fácil, médio e difícil)" }],
      prompt: "Crie uma prova de {{disciplina}} para a turma {{turma}} ({{bimestre}} bimestre) sobre: {{conteudos}}. Quero {{objetivas}} questões objetivas (A a E) e {{discursivas}} discursivas, nível {{nivel}}, valendo 10 pontos no total, com gabarito comentado no final.",
      papel: "Você elabora avaliações. Formato: cabeçalho (Escola, Aluno, Turma, Data, Nota); instruções; questões numeradas com valor em pontos; enunciados claros com contexto (textos, situações-problema); alternativas plausíveis. No FIM, separado por ---, o GABARITO COMENTADO e a habilidade avaliada em cada questão."
    },
    {
      id: "questoes-enem", ic: "🎓", cat: "avaliacao", doc: "aula", nome: "Questões estilo ENEM / SAEB",
      desc: "Questões com texto-base, comando e alternativas no padrão ENEM ou SAEB, com gabarito e descritor.",
      instrucoes: ["Diga o conteúdo e o padrão (ENEM ou SAEB).", "Informe quantas questões.", "Peça \"mais difíceis\" ou \"com tirinha/gráfico descrito\" para variar."],
      campos: [D, TEMA, { id: "padrao", rotulo: "Padrão", tipo: "opcoes", opcoes: ["ENEM", "SAEB", "Olimpíada"], valor: "ENEM" }, { id: "qtd", rotulo: "Quantidade", tipo: "numero", valor: "5" }],
      prompt: "Crie {{qtd}} questões no padrão {{padrao}} de {{disciplina}} sobre \"{{tema}}\", cada uma com texto-base, comando, 5 alternativas, gabarito e a competência/descritor avaliado.",
      papel: "Você é elaborador(a) de itens de larga escala. Cada item: texto-base autoral (ou descrito), enunciado sem pegadinha, alternativas com distratores plausíveis e justificativa do gabarito. Não copie itens reais."
    },
    {
      id: "rubrica", ic: "📏", cat: "avaliacao", doc: "aula", nome: "Rubrica de correção",
      desc: "Rubrica com critérios e níveis de desempenho para corrigir trabalhos, apresentações, redações e projetos.",
      instrucoes: ["Descreva a atividade que será avaliada.", "Diga quantos níveis e o valor total.", "Baixe em Excel para usar como planilha de correção."],
      campos: [T, D, { id: "atividade", rotulo: "Atividade avaliada", tipo: "texto", obrig: true, ph: "Ex.: Seminário em grupo sobre biomas" }, { id: "niveis", rotulo: "Níveis", tipo: "numero", valor: "4" }, { id: "total", rotulo: "Valor total", tipo: "numero", valor: "10" }],
      prompt: "Crie uma rubrica de correção para \"{{atividade}}\" da turma {{turma}} ({{disciplina}}), com {{niveis}} níveis de desempenho e valor total de {{total}} pontos.",
      papel: "Você cria rubricas analíticas. Entregue uma tabela markdown | Critério | Peso | Nível 1 | Nível 2 | … | com descritores observáveis, e depois orientações de uso e um modelo de devolutiva ao aluno."
    },
    {
      id: "recuperacao", ic: "🔁", cat: "avaliacao", doc: "aula", nome: "Atividade de recuperação",
      desc: "Roteiro de recuperação para quem não atingiu a média: revisão do conteúdo, exercícios graduados e nova avaliação.",
      instrucoes: ["Diga os conteúdos em que a turma teve dificuldade.", "Se quiser, cole os erros mais comuns.", "Salve em Planos de aula ou Relatórios."],
      campos: [T, D, B, { id: "conteudos", rotulo: "Conteúdos a recuperar", tipo: "area", obrig: true }, { id: "erros", rotulo: "Erros mais comuns (opcional)", tipo: "area" }],
      prompt: "Monte uma atividade de recuperação de {{disciplina}} para a turma {{turma}} ({{bimestre}} bimestre) sobre: {{conteudos}}. Erros mais comuns: {{erros}}.",
      papel: "Você é especialista em recuperação da aprendizagem. Estruture: revisão explicada em linguagem simples com exemplos; exercícios em 3 níveis (retomada, consolidação, aplicação); miniavaliação de 5 questões com gabarito; sugestão de como o professor acompanha."
    },
    {
      id: "correcao", ic: "🖊️", cat: "avaliacao", doc: "rel", nome: "Corrigir redação / produção de texto",
      desc: "Corrige um texto do aluno (colado ou em foto) com base em critérios, aponta pontos fortes e dá devolutiva.",
      instrucoes: ["Cole o texto ou anexe a foto 📷 no chat depois de começar.", "Escolha os critérios (ENEM, gênero textual ou os seus).", "A devolutiva vem pronta para entregar ao aluno."],
      campos: [{ id: "criterio", rotulo: "Critérios", tipo: "opcoes", opcoes: ["Competências do ENEM (0 a 1000)", "Critérios do gênero textual", "Adequação, coesão, coerência e ortografia"], valor: "Competências do ENEM (0 a 1000)" }, { id: "proposta", rotulo: "Proposta / tema", tipo: "texto", ph: "Ex.: Desafios da mobilidade urbana" }, { id: "texto", rotulo: "Texto do aluno (ou anexe a foto no chat)", tipo: "area" }],
      prompt: "Corrija a produção de texto abaixo usando: {{criterio}}. Proposta: {{proposta}}.\n\nTexto do aluno:\n{{texto}}",
      papel: "Você é corretor(a) de redação cuidadoso(a) e respeitoso(a). Entregue: nota por critério com justificativa; 3 pontos fortes; 3 pontos a melhorar com exemplos do próprio texto e sugestão de reescrita; devolutiva curta e motivadora dirigida ao aluno. Nunca exponha o aluno; não invente trechos."
    },
    // ── ATIVIDADES ──────────────────────────────────────────────────
    {
      id: "exercicios", ic: "✏️", cat: "atividades", doc: "aula", nome: "Lista de exercícios",
      desc: "Lista de exercícios graduada (do mais simples ao desafio), com gabarito para o professor.",
      instrucoes: ["Diga o conteúdo e a quantidade.", "Peça \"com contextualização do Acre\" ou \"com questões de múltipla escolha\" para ajustar.", "Baixe em Word ou PDF para imprimir."],
      campos: [T, D, TEMA, { id: "qtd", rotulo: "Quantidade de exercícios", tipo: "numero", valor: "10" }, OBS],
      prompt: "Crie uma lista com {{qtd}} exercícios de {{disciplina}} para a turma {{turma}} sobre \"{{tema}}\", do mais fácil ao desafio, com gabarito no final.\n{{obs}}",
      papel: "Você cria exercícios. Organize em níveis (Aquecimento, Prática, Desafio), enunciados curtos e claros, espaço indicado para resposta e GABARITO separado no final."
    },
    {
      id: "leitura", ic: "📖", cat: "atividades", doc: "aula", nome: "Leitura e interpretação de texto",
      desc: "Texto original (ou o seu) com questões de compreensão, inferência, vocabulário e opinião.",
      instrucoes: ["Escolha o gênero e o tema — ou cole o texto que quer usar.", "Diga o número de questões.", "O gabarito vem no final."],
      campos: [T, D, { id: "genero", rotulo: "Gênero textual", tipo: "texto", valor: "crônica" }, TEMA, { id: "texto", rotulo: "Texto próprio (opcional)", tipo: "area" }, { id: "qtd", rotulo: "Questões", tipo: "numero", valor: "8" }],
      prompt: "Prepare uma atividade de leitura e interpretação para a turma {{turma}} ({{disciplina}}) com um(a) {{genero}} sobre \"{{tema}}\" e {{qtd}} questões. Texto a usar (se vazio, escreva um original): {{texto}}",
      papel: "Você é professor(a) de leitura. Questões em níveis: localizar informação, inferir, vocabulário em contexto, efeito de sentido, opinião fundamentada. Texto adequado à idade. Gabarito no fim."
    },
    {
      id: "dinamica", ic: "🎲", cat: "atividades", doc: "aula", nome: "Dinâmica / gamificação",
      desc: "Jogos, dinâmicas e desafios para revisar conteúdo ou engajar a turma, com regras e materiais.",
      instrucoes: ["Diga o conteúdo e o tempo disponível.", "Informe o espaço e os materiais que tem.", "Peça versões para turmas grandes ou sem materiais."],
      campos: [T, D, TEMA, { id: "tempo", rotulo: "Tempo (minutos)", tipo: "numero", valor: "30" }, { id: "materiais", rotulo: "Materiais disponíveis", tipo: "texto", ph: "Ex.: quadro, papel, celular do professor" }],
      prompt: "Sugira 3 dinâmicas/jogos para revisar \"{{tema}}\" em {{disciplina}} com a turma {{turma}}, em {{tempo}} minutos, usando: {{materiais}}.",
      papel: "Você é especialista em metodologias ativas e gamificação. Para cada dinâmica: nome, objetivo, preparação, regras passo a passo, tempo, variações e como avaliar a participação."
    },
    {
      id: "resumo", ic: "🧠", cat: "atividades", doc: "aula", nome: "Resumo / material de estudo",
      desc: "Material de estudo para o aluno: resumo, mapa mental em tópicos, exemplos e questões de revisão.",
      instrucoes: ["Diga o conteúdo — ou anexe o capítulo do livro (foto ou PDF) no chat.", "Escolha o formato.", "Baixe em PDF para enviar aos alunos."],
      campos: [T, D, TEMA, { id: "formato", rotulo: "Formato", tipo: "opcoes", opcoes: ["resumo com tópicos", "mapa mental em tópicos", "fichamento", "perguntas e respostas"], valor: "resumo com tópicos" }],
      prompt: "Crie um material de estudo em formato de {{formato}} sobre \"{{tema}}\" ({{disciplina}}, turma {{turma}}), com exemplos e 5 questões de revisão no final.",
      papel: "Você escreve materiais didáticos claros para estudantes. Linguagem direta, exemplos do cotidiano, destaques em negrito para conceitos-chave."
    },
    {
      id: "slides", ic: "🖥️", cat: "atividades", doc: "aula", nome: "Roteiro de slides",
      desc: "Roteiro de apresentação slide a slide: título, tópicos, sugestão de imagem e fala do professor.",
      instrucoes: ["Diga o tema e o número de slides.", "Copie o roteiro para o Canva, PowerPoint ou Google Slides."],
      campos: [T, D, TEMA, { id: "qtd", rotulo: "Número de slides", tipo: "numero", valor: "10" }],
      prompt: "Monte um roteiro de {{qtd}} slides sobre \"{{tema}}\" para uma aula de {{disciplina}} na turma {{turma}}.",
      papel: "Você cria apresentações didáticas. Para cada slide: ## Slide N — título; 3 a 5 tópicos curtos; sugestão de imagem; fala do professor (2 a 3 frases); interação com a turma quando couber."
    },
    // ── RELATÓRIOS ──────────────────────────────────────────────────
    {
      id: "rel-turma", ic: "📊", cat: "relatorios", doc: "rel", nome: "Relatório da turma",
      desc: "Relatório com os dados do diário: aulas dadas, frequência, atividades, ocorrências e encaminhamentos.",
      instrucoes: ["Escolha a turma e o período.", "A I.A usa os dados do seu diário (os nomes vão como código e voltam na resposta).", "Salve em Documentos › Relatórios."],
      campos: [T, { id: "periodo", rotulo: "Período", tipo: "texto", valor: "este bimestre" }, { id: "foco", rotulo: "Foco (opcional)", tipo: "texto", ph: "Ex.: frequência e entrega de atividades" }],
      prompt: "Faça o relatório da turma {{turma}} referente a {{periodo}}, com base nos dados do diário. Foco: {{foco}}.",
      papel: "Você analisa dados escolares. Estruture: resumo; aulas e conteúdos trabalhados; frequência (tabela por aluno com faltas, destacando quem passa de 25%); atividades (entregas); ocorrências e destaques; análise pedagógica; encaminhamentos. Use SÓ os dados do diário; diga quando um dado não existe."
    },
    {
      id: "parecer", ic: "🧑‍🎓", cat: "relatorios", doc: "rel", nome: "Parecer descritivo do aluno",
      desc: "Parecer individual em linguagem pedagógica e respeitosa, a partir do diário e das suas observações.",
      instrucoes: ["Escolha a turma e escreva o nome (ou número) do aluno.", "Acrescente suas observações.", "Revise antes de entregar: o parecer é um documento oficial."],
      campos: [T, D, B, { id: "aluno", rotulo: "Aluno (nome ou nº)", tipo: "texto", obrig: true }, { id: "obs", rotulo: "Suas observações", tipo: "area", ph: "Participação, avanços, dificuldades…" }],
      prompt: "Escreva o parecer descritivo do aluno {{aluno}} da turma {{turma}} em {{disciplina}} ({{bimestre}} bimestre), usando os dados do diário e minhas observações: {{obs}}",
      papel: "Você redige pareceres descritivos. Tom respeitoso, sem rótulos nem diagnósticos, em terceira pessoa. Estrutura: participação e frequência; aprendizagens consolidadas; em desenvolvimento; atitudes; recomendações à família e à escola. Um a três parágrafos por item."
    },
    {
      id: "ata", ic: "🗒️", cat: "relatorios", doc: "rel", nome: "Ata de conselho de classe / reunião",
      desc: "Transforma suas anotações soltas em uma ata formal, com pauta, deliberações e encaminhamentos.",
      instrucoes: ["Cole as anotações da reunião (pode ser bagunçado).", "Informe data, local e participantes.", "Revise nomes e decisões antes de assinar."],
      campos: [{ id: "tipo", rotulo: "Reunião", tipo: "opcoes", opcoes: ["Conselho de classe", "Reunião de pais", "Reunião pedagógica", "Planejamento"], valor: "Conselho de classe" }, { id: "data", rotulo: "Data e local", tipo: "texto" }, { id: "participantes", rotulo: "Participantes", tipo: "texto" }, { id: "notas", rotulo: "Anotações", tipo: "area", obrig: true }],
      prompt: "Redija a ata da reunião ({{tipo}}) realizada em {{data}}, com os participantes {{participantes}}, a partir destas anotações:\n{{notas}}",
      papel: "Você redige atas escolares formais: abertura, pauta, relato por item, deliberações, encaminhamentos com responsáveis e prazos, encerramento e espaço para assinaturas. Não acrescente fatos que não estão nas anotações."
    },
    {
      id: "rel-bimestral", ic: "🗓️", cat: "relatorios", doc: "rel", nome: "Relatório bimestral do professor",
      desc: "Relatório das atividades do bimestre para a coordenação: conteúdos, projetos, resultados e dificuldades.",
      instrucoes: ["Escolha o bimestre.", "Acrescente projetos e eventos que o diário não mostra.", "Baixe em Word para entregar."],
      campos: [B, { id: "extras", rotulo: "Projetos, eventos e observações", tipo: "area" }],
      prompt: "Faça meu relatório de atividades do {{bimestre}} bimestre para a coordenação, com base no diário de todas as minhas turmas. Inclua também: {{extras}}",
      papel: "Você redige relatórios docentes objetivos. Estrutura: identificação; turmas e carga horária; conteúdos por turma (tabela); metodologias; projetos e eventos; resultados (frequência e entregas); dificuldades; encaminhamentos para o próximo bimestre."
    },
    // ── INCLUSÃO ────────────────────────────────────────────────────
    {
      id: "adaptar", ic: "♿", cat: "inclusao", doc: "aula", nome: "Adaptar atividade (DUA)",
      desc: "Adapta uma atividade para estudantes com deficiência, TEA, TDAH ou dificuldades, pelo Desenho Universal para a Aprendizagem.",
      instrucoes: ["Cole a atividade original (ou anexe foto).", "Descreva as necessidades do estudante — sem nome, se preferir.", "A adaptação mantém o mesmo objetivo de aprendizagem."],
      campos: [T, D, { id: "necessidades", rotulo: "Necessidades do estudante", tipo: "area", obrig: true, ph: "Ex.: TEA, lê palavras simples, precisa de apoio visual" }, { id: "atividade", rotulo: "Atividade original", tipo: "area" }],
      prompt: "Adapte esta atividade de {{disciplina}} (turma {{turma}}) para um estudante com as seguintes necessidades: {{necessidades}}.\n\nAtividade original:\n{{atividade}}",
      papel: "Você é especialista em educação inclusiva, DUA e LBI (Lei 13.146/2015). Mantenha o objetivo, varie formas de representação, ação e engajamento; linguagem simples, apoio visual descrito, passos curtos. Linguagem não capacitista; sem diagnóstico nem conduta de saúde."
    },
    {
      id: "pei", ic: "🧭", cat: "inclusao", doc: "rel", nome: "Rascunho de PEI",
      desc: "Rascunho de Plano Educacional Individualizado: perfil, potencialidades, barreiras, metas, estratégias e avaliação.",
      instrucoes: ["Descreva o estudante (pode usar só as iniciais).", "O rascunho deve ser revisado com a equipe do AEE e a família."],
      campos: [T, { id: "perfil", rotulo: "Perfil do estudante", tipo: "area", obrig: true }, { id: "potencialidades", rotulo: "Potencialidades", tipo: "area" }, { id: "barreiras", rotulo: "Barreiras observadas", tipo: "area" }],
      prompt: "Elabore o rascunho de um PEI para um estudante da turma {{turma}}. Perfil: {{perfil}}. Potencialidades: {{potencialidades}}. Barreiras: {{barreiras}}.",
      papel: "Você apoia o AEE. PEI com: identificação; perfil; potencialidades; barreiras; metas SMART por área (tabela | Meta | Estratégias | Responsável | Prazo | Como avaliar |); recursos de acessibilidade; articulação com a família. Sem diagnóstico; linguagem respeitosa."
    },
    // ── COMUNICAÇÃO ─────────────────────────────────────────────────
    {
      id: "comunicado", ic: "✉️", cat: "comunicacao", doc: "rel", nome: "Comunicado aos responsáveis",
      desc: "Bilhete, aviso ou mensagem de WhatsApp para as famílias, claro e acolhedor.",
      instrucoes: ["Diga o assunto e o que a família precisa fazer.", "Escolha o formato (bilhete impresso ou WhatsApp).", "Revise datas e horários."],
      campos: [T, { id: "assunto", rotulo: "Assunto", tipo: "area", obrig: true }, { id: "formato", rotulo: "Formato", tipo: "opcoes", opcoes: ["bilhete impresso", "mensagem de WhatsApp", "e-mail"], valor: "mensagem de WhatsApp" }],
      prompt: "Escreva um(a) {{formato}} para os responsáveis dos alunos da turma {{turma}} sobre: {{assunto}}",
      papel: "Você escreve comunicados escolares: linguagem simples e acolhedora, frases curtas, o que/quando/onde/o que fazer em destaque, sem jargão. Para WhatsApp, até 600 caracteres."
    },
    {
      id: "oficio", ic: "📨", cat: "comunicacao", doc: "rel", nome: "Ofício / e-mail formal",
      desc: "Ofício, requerimento ou e-mail formal para a coordenação, direção ou secretaria.",
      instrucoes: ["Diga o destinatário e o pedido.", "Inclua prazos e justificativas.", "Baixe em Word para assinar."],
      campos: [{ id: "destinatario", rotulo: "Destinatário", tipo: "texto", obrig: true, ph: "Ex.: Coordenação pedagógica" }, { id: "pedido", rotulo: "Assunto / pedido", tipo: "area", obrig: true }],
      prompt: "Redija um ofício formal para {{destinatario}} sobre: {{pedido}}",
      papel: "Você redige documentos oficiais na norma culta e no padrão da redação oficial: cabeçalho, número, local e data, vocativo, texto objetivo, fecho (Atenciosamente/Respeitosamente) e assinatura."
    },
    // ── APOIO ───────────────────────────────────────────────────────
    {
      id: "simplificar", ic: "🔤", cat: "apoio", doc: "aula", nome: "Simplificar texto",
      desc: "Reescreve um texto em outros níveis de leitura, mantendo o conteúdo — útil para alfabetização e inclusão.",
      instrucoes: ["Cole o texto.", "Escolha o nível.", "Peça também um glossário, se quiser."],
      campos: [{ id: "nivel", rotulo: "Nível de leitura", tipo: "opcoes", opcoes: ["muito simples (frases curtas)", "anos iniciais", "anos finais", "ensino médio"], valor: "anos finais" }, { id: "texto", rotulo: "Texto", tipo: "area", obrig: true }],
      prompt: "Reescreva o texto abaixo no nível \"{{nivel}}\", mantendo as informações principais, e acrescente um pequeno glossário:\n\n{{texto}}",
      papel: "Você adapta textos para diferentes leitores sem perder o conteúdo: frases curtas, vocabulário conhecido, uma ideia por parágrafo, glossário no fim."
    },
    {
      id: "registrar", ic: "📓", cat: "apoio", doc: "", acao: "criar_diario", nome: "Registrar aula no diário",
      desc: "Transforma o que você escreveu ou falou sobre a aula em um registro no diário, com faltas e atividades.",
      instrucoes: ["Escolha turma e disciplina.", "Escreva do seu jeito: o que deu, quem faltou, quem fez a atividade.", "Confira o cartão e toque em Aplicar."],
      campos: [T, D, { id: "data", rotulo: "Data", tipo: "texto", valor: "hoje" }, { id: "horario", rotulo: "Horário", tipo: "texto", ph: "Ex.: 07:30 às 09:10" }, { id: "relato", rotulo: "Como foi a aula", tipo: "area", obrig: true, ph: "Conteúdo, faltas, atividade, comportamento…" },
        { id: "prazo", rotulo: "Prazo para entrega da atividade", tipo: "opcoes", opcoes: ["sem prazo", "1 dia", "2 dias", "3 dias", "5 dias", "7 dias", "15 dias", "12 horas", "24 horas", "48 horas"], valor: "sem prazo" }],
      prompt: "Registre a aula da turma {{turma}}, disciplina {{disciplina}}, data {{data}}, horário {{horario}}. Prazo para entrega da atividade: {{prazo}}. Relato: {{relato}}",
      papel: "Você registra aulas no diário. Responda com uma frase e proponha a ação criar_diario completa (conteúdo, faltas, atividade e comportamento só se foram informados). Se houver prazo para entrega, envie atividade.houve=true e atividade.prazo com dias e horas (\"48 horas\" = {\"dias\":2,\"horas\":0}; \"12 horas\" = {\"dias\":0,\"horas\":12}); \"sem prazo\" = não envie prazo. Mais de uma atividade na aula vai em atividades_extras, cada uma com título."
    }
  ];

  window.IAFerramentas = {
    CATEGORIAS: CATEGORIAS,
    lista: FERRAMENTAS,
    porId: function (id) { return FERRAMENTAS.filter(function (f) { return f.id === id; })[0] || null; }
  };
})();
