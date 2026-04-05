// ═══════════════════════════════════════════════════
// DATA.JS — Dados estáticos do sistema
// Não editar manualmente — use o painel de administração
// ═══════════════════════════════════════════════════
//
// INSTRUÇÕES PARA O PROFESSOR:
// As listas de alunos abaixo são uma base inicial gerada automaticamente.
// Substitua pelos nomes reais dos seus alunos antes de usar o sistema.
// Para editar, localize a turma correspondente (t1, t2, t3, t6) dentro
// do objeto ALUNOS e atualize cada { num, nome } conforme sua chamada.
// ───────────────────────────────────────────────────

const ESCOLA = {
  nome: 'E.E. Rural Pe. Carlos Casavequia',
  cidade: 'Senador Guiomard – AC',
  professor: 'Paulo Roberto Ramalho Magalhães',
  ano: 2026,
  disciplinas: ['Língua Portuguesa', 'Trilhas de Linguagens', 'Trilhas de Ciências Humanas', 'Artes']
};

// Turmas disponíveis
const TURMAS = [
  { id: 't1', nome: '1ª Série', nivel: 'Ensino Médio', badge: '1ª', cor: 'verde' },
  { id: 't2', nome: '2ª Série', nivel: 'Ensino Médio', badge: '2ª', cor: 'azul' },
  { id: 't3', nome: '3ª Série', nivel: 'Ensino Médio', badge: '3ª', cor: 'ouro' },
  { id: 't6', nome: '6º Ano', nivel: 'Ensino Fundamental II', badge: '6º', cor: 'laranja' }
];

// Listas de alunos por turma
// NOTA: Listas fictícias baseadas no contexto - substituir pelos alunos reais
const ALUNOS = {
  t1: [
    { num: 1, nome: 'Aleff Rodrigues Silva' },
    { num: 2, nome: 'Amanda Ferreira Lima' },
    { num: 3, nome: 'Ana Beatriz Costa' },
    { num: 4, nome: 'Carlos Eduardo Souza' },
    { num: 5, nome: 'Daiane Oliveira Santos' },
    { num: 6, nome: 'Eduardo Pereira Melo' },
    { num: 7, nome: 'Fernanda Castro Alves' },
    { num: 8, nome: 'Gabriel Henrique Lima' },
    { num: 9, nome: 'Jade Cristina Mendes' },
    { num: 10, nome: 'João Paulo Ramos' },
    { num: 11, nome: 'Juliana Moreira Pinto' },
    { num: 12, nome: 'Kaique Santos Barbosa' },
    { num: 13, nome: 'Larissa Figueiredo' },
    { num: 14, nome: 'Lucas Ferreira Nunes' },
    { num: 15, nome: 'Maria Eduarda Andrade' },
    { num: 16, nome: 'Marcos Antônio Cunha' },
    { num: 17, nome: 'Natalia Oliveira Cruz' },
    { num: 18, nome: 'Paulo Henrique Vieira' },
    { num: 19, nome: 'Rafael Augusto Torres' },
    { num: 20, nome: 'Sabrina Lima Cardoso' },
    { num: 21, nome: 'Thiago Rodrigues Assis' },
    { num: 22, nome: 'Vanessa Sousa Freitas' }
  ],
  t2: [
    { num: 1, nome: 'Adriele Santos Macedo' },
    { num: 2, nome: 'Alan Rodrigues Silva' },
    { num: 3, nome: 'Beatriz Carvalho Lima' },
    { num: 4, nome: 'Bruno Ferreira Costa' },
    { num: 5, nome: 'Camila Oliveira Gomes' },
    { num: 6, nome: 'Daniel Pereira Alves' },
    { num: 7, nome: 'Dayane Santos Cruz' },
    { num: 8, nome: 'Diego Martins Souza' },
    { num: 9, nome: 'Emilly Rodrigues Melo' },
    { num: 10, nome: 'Felipe Andrade Lima' },
    { num: 11, nome: 'Gabriela Mendes Pinto' },
    { num: 12, nome: 'Gustavo Farias Torres' },
    { num: 13, nome: 'Isabela Costa Santos' },
    { num: 14, nome: 'José Lucas Moreira' },
    { num: 15, nome: 'Jéssica Alves Barbosa' },
    { num: 16, nome: 'Kevin Ribeiro Nunes' },
    { num: 17, nome: 'Laís Fernanda Silva' },
    { num: 18, nome: 'Leonardo Cruz Araújo' },
    { num: 19, nome: 'Luana Souza Ferreira' },
    { num: 20, nome: 'Marcos Paulo Rocha' },
    { num: 21, nome: 'Mariana Lima Cardoso' },
    { num: 22, nome: 'Mateus Oliveira Gomes' },
    { num: 23, nome: 'Nathalia Santos Ramos' },
    { num: 24, nome: 'Pedro Henrique Vieira' },
    { num: 25, nome: 'Raquel Figueiredo Melo' },
    { num: 26, nome: 'Rodrigo Pereira Assis' },
    { num: 27, nome: 'Sara Cristina Lima' },
    { num: 28, nome: 'Tiago Rodrigues Cunha' }
  ],
  t3: [
    { num: 1, nome: 'Aline Moreira Santos' },
    { num: 2, nome: 'André Luiz Costa' },
    { num: 3, nome: 'Bianca Ferreira Lima' },
    { num: 4, nome: 'Carlos Alberto Nunes' },
    { num: 5, nome: 'Cintia Rodrigues Silva' },
    { num: 6, nome: 'Danilo Santos Alves' },
    { num: 7, nome: 'Débora Lima Carvalho' },
    { num: 8, nome: 'Eduardo Farias Gomes' },
    { num: 9, nome: 'Elizangela Cruz Melo' },
    { num: 10, nome: 'Fabiano Pereira Torres' },
    { num: 11, nome: 'Geovana Santos Pinto' },
    { num: 12, nome: 'Heloísa Oliveira Lima' },
    { num: 13, nome: 'Igor Martins Barbosa' },
    { num: 14, nome: 'Jacqueline Souza Ramos' },
    { num: 15, nome: 'Jonathan Costa Assis' },
    { num: 16, nome: 'Karoline Lima Freitas' },
    { num: 17, nome: 'Leonardo Andrade Cunha' },
    { num: 18, nome: 'Lídia Fernanda Rocha' },
    { num: 19, nome: 'Marcelo Rodrigues Cruz' },
    { num: 20, nome: 'Michelle Santos Lima' },
    { num: 21, nome: 'Nataniel Pereira Melo' },
    { num: 22, nome: 'Pamela Oliveira Gomes' },
    { num: 23, nome: 'Quézia Alves Santos' },
    { num: 24, nome: 'Ricardo Ferreira Torres' }
  ],
  t6: [
    { num: 1, nome: 'Agatha Rodrigues Lima' },
    { num: 2, nome: 'Alexandre Santos Costa' },
    { num: 3, nome: 'Ana Clara Ferreira' },
    { num: 4, nome: 'Arthur Oliveira Melo' },
    { num: 5, nome: 'Beatriz Carvalho Pinto' },
    { num: 6, nome: 'Benjamin Silva Souza' },
    { num: 7, nome: 'Brenda Santos Cruz' },
    { num: 8, nome: 'Carlos Henrique Lima' },
    { num: 9, nome: 'Clara Martins Gomes' },
    { num: 10, nome: 'Daniel Rodrigues Alves' },
    { num: 11, nome: 'Emanuelly Costa Torres' },
    { num: 12, nome: 'Erick Pereira Barbosa' },
    { num: 13, nome: 'Fernanda Lima Santos' },
    { num: 14, nome: 'Filipe Andrade Rocha' },
    { num: 15, nome: 'Giovanna Cruz Freitas' },
    { num: 16, nome: 'Guilherme Santos Melo' },
    { num: 17, nome: 'Helena Oliveira Lima' },
    { num: 18, nome: 'Igor Ferreira Costa' },
    { num: 19, nome: 'Isabela Rodrigues Cunha' },
    { num: 20, nome: 'João Victor Santos' },
    { num: 21, nome: 'Julia Lima Carvalho' },
    { num: 22, nome: 'Kaique Pereira Gomes' },
    { num: 23, nome: 'Laura Santos Alves' },
    { num: 24, nome: 'Leonardo Cruz Torres' },
    { num: 25, nome: 'Leticia Ferreira Lima' },
    { num: 26, nome: 'Lucas Rodrigues Barbosa' },
    { num: 27, nome: 'Maria Eduarda Costa' },
    { num: 28, nome: 'Matheus Oliveira Pinto' },
    { num: 29, nome: 'Nicolas Santos Rocha' },
    { num: 30, nome: 'Nicolly Lima Freitas' },
    { num: 31, nome: 'Pedro Henrique Melo' },
    { num: 32, nome: 'Rafaela Andrade Cruz' }
  ]
};

// Cronograma semanal
const CRONOGRAMA = {
  seg: [
    { hora: '07h00 – 09h00', disc: 'Língua Portuguesa', turma: '1ª Série', tipo: 'lp', haula: 2 },
    { hora: '09h00 – 11h15', disc: 'Língua Portuguesa', turma: '2ª e 3ª Série (juntas)', tipo: 'lp', haula: 2 }
  ],
  ter: [
    { hora: '13h00 – 14h00', disc: 'Língua Portuguesa', turma: '3ª Série', tipo: 'lp', haula: 1 },
    { hora: '14h00 – 15h00', disc: 'Trilhas', turma: '3ª Série', tipo: 'tri', haula: 1 },
    { hora: '15h00 – 16h15', disc: 'Trilhas', turma: '2ª Série', tipo: 'tri', haula: 1 },
    { hora: '15h15 – 17h15', disc: 'Língua Portuguesa', turma: '2ª Série', tipo: 'lp', haula: 2 }
  ],
  qui: [
    { hora: '15h15 – 16h15', disc: 'Artes', turma: '2ª Série', tipo: 'art', haula: 1 },
    { hora: '16h15 – 17h15', disc: 'Artes', turma: '3ª Série', tipo: 'art', haula: 1 }
  ],
  sex: [
    { hora: '07h00 – 08h00', disc: 'Artes', turma: '6º Ano', tipo: 'art', haula: 1 },
    { hora: '14h00 – 16h15', disc: 'Trilhas', turma: '1ª Série', tipo: 'tri', haula: 2 },
    { hora: '15h15 – 17h15', disc: 'Trilhas', turma: '2ª Série', tipo: 'tri', haula: 2 },
    { hora: '16h15 – 17h15', disc: 'Trilhas', turma: '3ª Série', tipo: 'tri', haula: 1 }
  ]
};

// Dados das disciplinas para o contador
const DISCIPLINAS_CONTADOR = [
  { grupo: 'lp',  turma: '1ª Série', turmaId: 't1', disc: 'Língua Portuguesa', semanais: 2, bimestre: 20,  total: 80  },
  { grupo: 'lp',  turma: '2ª Série', turmaId: 't2', disc: 'Língua Portuguesa', semanais: 4, bimestre: 30,  total: 120 },
  { grupo: 'lp',  turma: '3ª Série', turmaId: 't3', disc: 'Língua Portuguesa', semanais: 3, bimestre: 30,  total: 120 },
  { grupo: 'tri', turma: '1ª Série', turmaId: 't1', disc: 'Trilhas de Linguagens', semanais: 2, bimestre: 20, total: 80 },
  { grupo: 'tri', turma: '2ª Série', turmaId: 't2', disc: 'Trilhas de Ciências Humanas', semanais: 3, bimestre: 30, total: 120 },
  { grupo: 'tri', turma: '3ª Série', turmaId: 't3', disc: 'Trilhas de Ciências Humanas', semanais: 2, bimestre: 20, total: 80 },
  { grupo: 'art', turma: '6º Ano',   turmaId: 't6', disc: 'Artes', semanais: 1, bimestre: 10, total: 40 },
  { grupo: 'art', turma: '2ª Série', turmaId: 't2', disc: 'Artes', semanais: 1, bimestre: 10, total: 40 },
  { grupo: 'art', turma: '3ª Série', turmaId: 't3', disc: 'Artes', semanais: 1, bimestre: 10, total: 40 }
];

// Data base do ano letivo
const DATA_BASE_LETIVO = new Date(2026, 2, 30); // 30 Mar 2026

// Plano Anual por turma e disciplina
// Estrutura: turmaId -> disciplina -> array de bimestres com aulas
const PLANO_ANUAL = {
  t1: {
    'Língua Portuguesa': [
      {
        bimestre: 1, titulo: '1º Bimestre', aulas: [
          'Leitura e Interpretação de Textos — Introdução',
          'Gêneros Textuais: Narração',
          'Gêneros Textuais: Descrição',
          'Gêneros Textuais: Dissertação',
          'Ortografia e Acentuação Gráfica',
          'Fonologia: Fonemas e Letras',
          'Morfologia: Substantivo',
          'Morfologia: Adjetivo',
          'Morfologia: Artigo e Numeral',
          'Coesão e Coerência Textual',
          'Avaliação Diagnóstica',
          'Correção e Retomada da Avaliação Diagnóstica',
          'Produção Textual: Narrativa Pessoal',
          'Revisão e Reescrita do Texto',
          'Literatura Brasileira: Romantismo',
          'Literatura: Poesia Romântica',
          'Análise de Texto Literário',
          'Revisão Geral do Bimestre',
          'Avaliação Bimestral',
          'Correção e Encerramento do Bimestre'
        ]
      },
      {
        bimestre: 2, titulo: '2º Bimestre', aulas: [
          'Retomada e Correção das Avaliações',
          'Morfologia: Pronome',
          'Morfologia: Verbo — Conceito e Classificação',
          'Conjugação Verbal: Modo Indicativo',
          'Conjugação Verbal: Modo Subjuntivo e Imperativo',
          'Regência Verbal',
          'Regência Nominal',
          'Crase',
          'Pontuação: Vírgula',
          'Pontuação: Demais Sinais',
          'Literatura: Realismo e Naturalismo',
          'Literatura: Machado de Assis',
          'Análise de Conto Realista',
          'Produção Textual: Conto',
          'Revisão do Texto Produzido',
          'Semântica: Sinonímia e Antonímia',
          'Semântica: Polissemia e Ambiguidade',
          'Revisão Geral do Bimestre',
          'Avaliação Bimestral',
          'Correção e Encerramento do Bimestre'
        ]
      },
      {
        bimestre: 3, titulo: '3º Bimestre', aulas: [
          'Retomada e Correção das Avaliações',
          'Sintaxe: Sujeito',
          'Sintaxe: Predicado',
          'Sintaxe: Objeto Direto e Indireto',
          'Sintaxe: Adjunto Adnominal e Adverbial',
          'Período Simples e Composto',
          'Coordenação: Orações Coordenadas',
          'Subordinação: Orações Substantivas',
          'Subordinação: Orações Adjetivas',
          'Subordinação: Orações Adverbiais',
          'Literatura: Modernismo — 1ª Fase',
          'Literatura: Semana de Arte Moderna',
          'Análise de Poema Modernista',
          'Produção Textual: Artigo de Opinião',
          'Revisão e Reescrita',
          'Figuras de Linguagem: Metáfora e Metonímia',
          'Figuras de Linguagem: Outras Figuras',
          'Revisão Geral do Bimestre',
          'Avaliação Bimestral',
          'Correção e Encerramento do Bimestre'
        ]
      },
      {
        bimestre: 4, titulo: '4º Bimestre', aulas: [
          'Retomada e Correção das Avaliações',
          'Variações Linguísticas',
          'Linguagem Formal e Informal',
          'Intertextualidade',
          'Literatura: Modernismo — 2ª e 3ª Fase',
          'Análise de Texto Contemporâneo',
          'Produção Textual: Redação ENEM',
          'Estrutura da Redação ENEM',
          'Competências da Redação ENEM',
          'Proposta de Intervenção',
          'Revisão para o ENEM',
          'Simulado de Linguagens e Redação',
          'Revisão Final de Gramática',
          'Revisão Final de Literatura',
          'Avaliação Bimestral',
          'Correção e Encerramento',
          'Encerramento do Ano Letivo',
          'Revisão Geral',
          'Última Aula',
          'Conselho de Classe'
        ]
      }
    ],
    'Trilhas de Linguagens': [
      {
        bimestre: 1, titulo: '1º Bimestre', aulas: [
          'Trilhas: O que são as Trilhas de Aprendizagem',
          'Linguagens e Comunicação na Era Digital',
          'Linguagem Verbal e Não-Verbal',
          'Análise de Imagens e Fotografia',
          'Linguagem Publicitária',
          'Análise de Anúncios e Propagandas',
          'Produção de Peça Publicitária',
          'Apresentação das Produções',
          'Linguagem Cinematográfica',
          'Análise de Cena Cinematográfica',
          'Produção de Roteiro',
          'Apresentação dos Roteiros',
          'Linguagem das Redes Sociais',
          'Fake News e Desinformação',
          'Produção: Post de Conscientização',
          'Avaliação Processual',
          'Revisão e Encerramento do Bimestre',
          'Devolutiva das Avaliações',
          'Aula Prática / Oficina',
          'Encerramento do Bimestre'
        ]
      },
      {
        bimestre: 2, titulo: '2º Bimestre', aulas: [
          'Retomada',
          'Música como Linguagem',
          'Análise de Letra de Música',
          'Produção: Paródia ou Letra Original',
          'Teatro e Performance',
          'Improvisação Teatral',
          'Expressão Corporal',
          'Linguagem dos Quadrinhos (HQ)',
          'Análise de Tirinha e HQ',
          'Produção de HQ',
          'Apresentação das HQs',
          'Linguagem Visual: Memes',
          'Análise Crítica de Memes',
          'Produção de Meme Educativo',
          'Avaliação Processual',
          'Revisão e Encerramento',
          'Devolutiva',
          'Aula Prática',
          'Encerramento',
          'Avaliação do Bimestre'
        ]
      },
      {
        bimestre: 3, titulo: '3º Bimestre', aulas: [
          'Retomada',
          'Podcast como Linguagem',
          'Planejamento de Podcast',
          'Gravação de Episódio',
          'Edição Básica de Áudio',
          'Apresentação dos Podcasts',
          'Linguagem Jornalística',
          'Análise de Notícia e Reportagem',
          'Produção de Texto Jornalístico',
          'Edição do Jornal Escolar',
          'Apresentação do Jornal',
          'Linguagem dos Videogames e Games',
          'Análise de Narrativas em Games',
          'Avaliação Processual',
          'Revisão',
          'Devolutiva',
          'Aula Prática',
          'Encerramento',
          'Avaliação Bimestral',
          'Correção'
        ]
      },
      {
        bimestre: 4, titulo: '4º Bimestre', aulas: [
          'Retomada',
          'Projeto Final: Produto de Linguagem',
          'Planejamento do Projeto',
          'Desenvolvimento Parte 1',
          'Desenvolvimento Parte 2',
          'Desenvolvimento Parte 3',
          'Finalização',
          'Apresentação dos Projetos',
          'Avaliação dos Projetos',
          'Encerramento do Bimestre',
          'Revisão Geral',
          'Avaliação Final',
          'Correção',
          'Conselho de Classe',
          'Encerramento do Ano',
          'Última Aula',
          'Reflexão Final',
          'Avaliação de Percurso',
          'Devolutiva Final',
          'Encerramento'
        ]
      }
    ]
  },
  t2: {
    'Língua Portuguesa': [
      {
        bimestre: 1, titulo: '1º Bimestre', aulas: [
          'Avaliação Diagnóstica',
          'Correção da Avaliação Diagnóstica',
          'Leitura e Análise de Texto — Revisão',
          'Gêneros Textuais Dissertativos',
          'Argumentação e Persuasão',
          'Operadores Argumentativos',
          'Morfologia: Advérbio',
          'Morfologia: Preposição e Conjunção',
          'Morfologia: Interjeição',
          'Figuras de Linguagem — Revisão',
          'Literatura: Quinhentismo',
          'Literatura: Barroco',
          'Padre Antônio Vieira — Sermão',
          'Análise de Texto Barroco',
          'Produção Textual: Dissertação-Argumentativa',
          'Revisão e Reescrita',
          'Semântica Aprofundada',
          'Revisão Geral',
          'Avaliação Bimestral',
          'Correção e Encerramento',
          'Aula Extra de Redação',
          'Simulado LP',
          'Revisão de Redação',
          'Devolutiva de Simulado',
          'Aula de Dúvidas',
          'Reforço',
          'Avaliação de Recuperação',
          'Correção da Recuperação',
          'Conselho de Classe',
          'Encerramento do Bimestre'
        ]
      },
      {
        bimestre: 2, titulo: '2º Bimestre', aulas: [
          'Retomada',
          'Sintaxe: Período Composto',
          'Orações Coordenadas Assindéticas',
          'Orações Coordenadas Sindéticas',
          'Orações Subordinadas',
          'Orações Subordinadas Substantivas',
          'Orações Subordinadas Adjetivas',
          'Orações Subordinadas Adverbiais',
          'Concordância Verbal',
          'Concordância Nominal',
          'Literatura: Arcadismo',
          'Tomás Antônio Gonzaga',
          'Análise de Lira',
          'Literatura: Romantismo I — Prosa',
          'José de Alencar',
          'Análise de Romance Romântico',
          'Produção Textual: Resumo e Resenha',
          'Revisão e Reescrita',
          'Revisão Geral',
          'Avaliação Bimestral',
          'Correção',
          'Simulado',
          'Devolutiva',
          'Reforço',
          'Recuperação',
          'Correção da Recuperação',
          'Dúvidas',
          'Encerramento',
          'Conselho de Classe',
          'Última Aula do Bimestre'
        ]
      },
      {
        bimestre: 3, titulo: '3º Bimestre', aulas: [
          'Retomada',
          'Regência Verbal e Nominal',
          'Crase — Revisão Avançada',
          'Colocação Pronominal',
          'Vozes do Verbo: Ativa e Passiva',
          'Literatura: Romantismo II — Poesia',
          'Álvares de Azevedo',
          'Castro Alves — Abolicionismo',
          'Literatura: Realismo',
          'Machado de Assis — Contos',
          'Análise de Conto Machadiano',
          'Literatura: Naturalismo',
          'Aluísio Azevedo',
          'Produção Textual: Carta Argumentativa',
          'Revisão',
          'Reescrita',
          'Revisão Geral',
          'Avaliação Bimestral',
          'Correção',
          'Simulado',
          'Devolutiva',
          'Reforço',
          'Recuperação',
          'Correção da Recuperação',
          'Dúvidas',
          'Aula Extra',
          'Encerramento',
          'Conselho de Classe',
          'Última Aula',
          'Devolutiva Final'
        ]
      },
      {
        bimestre: 4, titulo: '4º Bimestre', aulas: [
          'Retomada',
          'Literatura: Parnasianismo e Simbolismo',
          'Olavo Bilac',
          'Cruz e Sousa',
          'Literatura: Pré-Modernismo',
          'Euclides da Cunha',
          'Lima Barreto',
          'Literatura: Modernismo',
          'Semana de Arte Moderna — Revisão',
          'Modernismo: 2ª e 3ª Fase',
          'Redação ENEM — Revisão',
          'Estrutura e Competências',
          'Simulado ENEM',
          'Revisão de Gramática para ENEM',
          'Revisão de Literatura para ENEM',
          'Avaliação Bimestral',
          'Correção',
          'Recuperação',
          'Devolutiva',
          'Dúvidas Finais',
          'Encerramento do Ano',
          'Conselho de Classe',
          'Última Aula',
          'Reflexão do Percurso',
          'Avaliação de Aproveitamento',
          'Devolutiva Final',
          'Aula de Encerramento',
          'Celebração do Ano',
          'Conselho Final',
          'Encerramento'
        ]
      }
    ],
    'Trilhas de Ciências Humanas': [
      {
        bimestre: 1, titulo: '1º Bimestre', aulas: [
          'Introdução às Trilhas de Ciências Humanas',
          'O que é Cidadania?',
          'Democracia, Justiça Social e Direitos Humanos',
          'Declaração Universal dos Direitos Humanos',
          'Direitos e Deveres do Cidadão',
          'Constituição Federal: Direitos Fundamentais',
          'ECA — Estatuto da Criança e do Adolescente',
          'Trabalho Infantil e Exploração',
          'Discriminação e Preconceito',
          'Intolerância Religiosa',
          'Racismo e Legislação Antirracista',
          'Igualdade de Gênero',
          'LGBTfobia e Legislação',
          'Violência Doméstica e Lei Maria da Penha',
          'Avaliação Processual',
          'Correção',
          'Produção: Cartaz de Conscientização',
          'Apresentação',
          'Revisão',
          'Avaliação Bimestral',
          'Correção',
          'Reforço',
          'Recuperação',
          'Correção da Recuperação',
          'Conselho de Classe',
          'Encerramento',
          'Devolutiva',
          'Dúvidas',
          'Aula Extra',
          'Encerramento do Bimestre'
        ]
      },
      {
        bimestre: 2, titulo: '2º Bimestre', aulas: [
          'Retomada',
          'Globalização e Mundo Contemporâneo',
          'Impactos da Globalização',
          'Neoliberalismo',
          'Desigualdades Sociais no Brasil',
          'Pobreza e Exclusão Social',
          'Movimentos Sociais',
          'MST e Reforma Agrária',
          'Urbanização e Problemas Urbanos',
          'Violência Urbana',
          'Segurança Pública',
          'Drogas e Saúde Pública',
          'Cultura e Identidade',
          'Diversidade Cultural no Brasil',
          'Avaliação Processual',
          'Correção',
          'Produção Textual',
          'Apresentação',
          'Revisão',
          'Avaliação Bimestral',
          'Correção',
          'Simulado',
          'Devolutiva',
          'Reforço',
          'Recuperação',
          'Correção',
          'Dúvidas',
          'Encerramento',
          'Conselho',
          'Última Aula'
        ]
      },
      {
        bimestre: 3, titulo: '3º Bimestre', aulas: [
          'Retomada',
          'Meio Ambiente e Desenvolvimento Sustentável',
          'Mudanças Climáticas',
          'Conferências Internacionais do Clima',
          'Agenda 2030 e ODS',
          'Amazônia: Biodiversidade e Preservação',
          'Desmatamento e Queimadas',
          'Economia Sustentável',
          'Energia Renovável',
          'Saúde Pública no Brasil',
          'SUS — Sistema Único de Saúde',
          'Pandemia e Saúde Coletiva',
          'Alimentação e Segurança Alimentar',
          'Fome e Desnutrição no Brasil',
          'Avaliação Processual',
          'Correção',
          'Produção',
          'Apresentação',
          'Revisão',
          'Avaliação Bimestral',
          'Correção',
          'Simulado',
          'Devolutiva',
          'Reforço',
          'Recuperação',
          'Correção',
          'Dúvidas',
          'Encerramento',
          'Conselho',
          'Última Aula'
        ]
      },
      {
        bimestre: 4, titulo: '4º Bimestre', aulas: [
          'Retomada',
          'Política Brasileira',
          'Sistema de Governo',
          'Poderes da República',
          'Eleições e Democracia',
          'Partidos Políticos',
          'Corrupção e Combate',
          'Economia Brasileira',
          'Trabalho e Emprego',
          'Empreendedorismo',
          'Tecnologia e Futuro do Trabalho',
          'Revisão para ENEM — Ciências Humanas',
          'Simulado ENEM',
          'Avaliação Bimestral',
          'Correção',
          'Recuperação',
          'Devolutiva',
          'Dúvidas Finais',
          'Encerramento do Ano',
          'Conselho Final',
          'Última Aula',
          'Reflexão',
          'Avaliação Final',
          'Devolutiva Final',
          'Encerramento',
          'Celebração',
          'Conselho',
          'Fechamento',
          'Última Aula',
          'Encerramento do Ano'
        ]
      }
    ],
    'Artes': [
      {
        bimestre: 1, titulo: '1º Bimestre', aulas: [
          'Apresentação da disciplina de Artes',
          'O que é Arte? História e Conceitos',
          'Arte Rupestre e Arte Pré-Histórica',
          'Arte Grega e Romana',
          'Arte Medieval',
          'Renascimento: Da Vinci e Michelangelo',
          'Barroco na Arte',
          'Impressionismo',
          'Arte Moderna',
          'Arte Contemporânea'
        ]
      },
      {
        bimestre: 2, titulo: '2º Bimestre', aulas: [
          'Artes Visuais: Pintura',
          'Técnicas de Pintura',
          'Escultura e Instalação',
          'Fotografia como Arte',
          'Arte Digital',
          'Design Gráfico',
          'Artes Cênicas: Teatro',
          'História do Teatro Brasileiro',
          'Análise de Peça Teatral',
          'Produção Teatral'
        ]
      },
      {
        bimestre: 3, titulo: '3º Bimestre', aulas: [
          'Música: Elementos Fundamentais',
          'História da Música Brasileira',
          'MPB: Bossa Nova e Tropicália',
          'Análise de Canção',
          'Dança como Expressão',
          'Danças Folclóricas Brasileiras',
          'Dança Contemporânea',
          'Arte e Cultura Amazônica',
          'Artistas do Acre',
          'Produção Artística Regional'
        ]
      },
      {
        bimestre: 4, titulo: '4º Bimestre', aulas: [
          'Projeto Artístico Final',
          'Planejamento do Projeto',
          'Desenvolvimento',
          'Finalização',
          'Apresentação do Projeto',
          'Avaliação Final',
          'Análise Crítica',
          'Encerramento do Ano em Artes',
          'Devolutiva',
          'Última Aula'
        ]
      }
    ]
  },
  t3: {
    'Língua Portuguesa': [
      {
        bimestre: 1, titulo: '1º Bimestre', aulas: [
          'Avaliação Diagnóstica',
          'Correção e Nivelamento',
          'Revisão de Morfologia',
          'Revisão de Sintaxe',
          'Colocação Pronominal — Aprofundamento',
          'Vozes Verbais — Aprofundamento',
          'Figuras de Linguagem — Revisão Completa',
          'Estilística',
          'Literatura: Romantismo — Revisão',
          'Literatura: Realismo e Naturalismo — Revisão',
          'Literatura: Parnasianismo e Simbolismo — Revisão',
          'Literatura: Pré-Modernismo — Revisão',
          'Análise Literária Aprofundada',
          'Redação ENEM: Estrutura e Competências',
          'Competência 1: Domínio da Língua',
          'Competência 2: Compreensão do Tema',
          'Competência 3: Argumentação',
          'Competência 4: Coesão',
          'Competência 5: Proposta de Intervenção',
          'Produção de Redação ENEM',
          'Correção Comentada',
          'Revisão e Reescrita',
          'Simulado ENEM 1',
          'Correção do Simulado',
          'Avaliação Bimestral',
          'Correção',
          'Reforço',
          'Recuperação',
          'Correção da Recuperação',
          'Encerramento do Bimestre'
        ]
      },
      {
        bimestre: 2, titulo: '2º Bimestre', aulas: [
          'Retomada',
          'Literatura: Modernismo — Revisão Completa',
          'Poesia Concreta',
          'Literatura Contemporânea',
          'Autores Regionais: Literatura da Amazônia',
          'Análise Comparativa de Textos',
          'Intertextualidade e Interdiscursividade',
          'Géneros Textuais para o ENEM',
          'Textos Argumentativos',
          'Textos Expositivos',
          'Textos Literários no ENEM',
          'Gráficos, Tabelas e Infográficos',
          'Linguagem Visual e Verbal',
          'Redação ENEM — Temas Sociais',
          'Produção de Redação',
          'Correção e Reescrita',
          'Simulado ENEM 2',
          'Correção',
          'Avaliação Bimestral',
          'Correção',
          'Reforço',
          'Recuperação',
          'Correção',
          'Encerramento',
          'Conselho',
          'Última Aula',
          'Devolutiva',
          'Dúvidas',
          'Revisão',
          'Encerramento do Bimestre'
        ]
      },
      {
        bimestre: 3, titulo: '3º Bimestre', aulas: [
          'Retomada',
          'Variação Linguística — Aprofundamento',
          'Português Contemporâneo',
          'Análise de Propagandas e Publicidade',
          'Linguagem e Poder',
          'Discurso e Ideologia',
          'Linguagem Jurídica e Burocrática',
          'Linguagem Científica',
          'Análise de Artigos Científicos',
          'Redação ENEM — Temas Científicos',
          'Produção de Redação',
          'Correção e Reescrita',
          'Simulado ENEM 3',
          'Correção',
          'Revisão para ENEM',
          'Avaliação Bimestral',
          'Correção',
          'Reforço',
          'Recuperação',
          'Correção',
          'Devolutiva',
          'Dúvidas',
          'Encerramento',
          'Conselho',
          'Última Aula',
          'Revisão Final',
          'Encerramento do Bimestre',
          'Aula Extra',
          'Dúvidas Finais',
          'Devolutiva Final'
        ]
      },
      {
        bimestre: 4, titulo: '4º Bimestre', aulas: [
          'Retomada',
          'Revisão Geral de Gramática para ENEM',
          'Revisão Geral de Literatura para ENEM',
          'Revisão de Redação para ENEM',
          'Simulado Final ENEM',
          'Correção do Simulado Final',
          'Dúvidas e Revisão',
          'Estratégias de Prova ENEM',
          'Competências e Habilidades ENEM',
          'Revisão de Textos Multimodais',
          'Avaliação Bimestral Final',
          'Correção',
          'Recuperação Final',
          'Correção da Recuperação',
          'Devolutiva Final',
          'Aula de Encerramento',
          'Reflexão do Percurso Escolar',
          'Perspectivas Pós-Ensino Médio',
          'Última Aula do 3º Ano',
          'Celebração e Encerramento',
          'Conselho Final',
          'Cerimônia de Formatura (participação)',
          'Devolutiva das Avaliações',
          'Encerramento Oficial',
          'Última Atividade',
          'Conselho de Classe Final',
          'Devolutiva',
          'Encerramento',
          'Última Aula',
          'Cerimônia'
        ]
      }
    ],
    'Trilhas de Ciências Humanas': [
      {
        bimestre: 1, titulo: '1º Bimestre', aulas: [
          'Ciências Humanas e o ENEM',
          'História e Processo Histórico',
          'Pré-História Brasileira',
          'Povos Originários do Brasil',
          'Colonização Portuguesa',
          'Ciclos Econômicos do Brasil Colonial',
          'Escravidão Africana no Brasil',
          'Inconfidência Mineira',
          'Independência do Brasil',
          'Período Imperial',
          'Proclamação da República',
          'República Velha',
          'Revolução de 1930',
          'Era Vargas',
          'Avaliação Bimestral',
          'Correção',
          'Recuperação',
          'Devolutiva',
          'Encerramento',
          'Conselho de Classe'
        ]
      },
      {
        bimestre: 2, titulo: '2º Bimestre', aulas: [
          'Retomada',
          'Segunda Guerra Mundial',
          'Holocausto e Totalitarismo',
          'Guerra Fria',
          'Ditadura Militar no Brasil',
          'Redemocratização',
          'Constituição de 1988',
          'Globalização',
          'Geopolítica Contemporânea',
          'Conflitos Internacionais Atuais',
          'ONU e Organismos Internacionais',
          'Questões Ambientais Globais',
          'Revisão para ENEM — História',
          'Simulado',
          'Avaliação Bimestral',
          'Correção',
          'Recuperação',
          'Devolutiva',
          'Encerramento',
          'Conselho'
        ]
      },
      {
        bimestre: 3, titulo: '3º Bimestre', aulas: [
          'Retomada',
          'Geografia Física: Relevo e Clima',
          'Biomas Brasileiros',
          'Amazônia Legal',
          'Recursos Hídricos',
          'Agricultura e Agronegócio',
          'Urbanização Brasileira',
          'Questão Agrária',
          'Economia Brasileira',
          'Desigualdades Regionais',
          'Sociologia: Instituições Sociais',
          'Família, Escola, Igreja',
          'Trabalho e Alienação',
          'Movimentos Sociais',
          'Avaliação Bimestral',
          'Correção',
          'Recuperação',
          'Devolutiva',
          'Encerramento',
          'Conselho'
        ]
      },
      {
        bimestre: 4, titulo: '4º Bimestre', aulas: [
          'Retomada',
          'Revisão Geral de História para ENEM',
          'Revisão Geral de Geografia para ENEM',
          'Revisão de Sociologia para ENEM',
          'Revisão de Filosofia para ENEM',
          'Simulado Final ENEM — CH',
          'Correção',
          'Estratégias para a Prova de CH',
          'Dúvidas e Reforço',
          'Avaliação Final',
          'Correção',
          'Recuperação',
          'Devolutiva',
          'Encerramento do Ano',
          'Conselho Final',
          'Última Aula',
          'Reflexão',
          'Celebração',
          'Devolutiva Final',
          'Encerramento Oficial'
        ]
      }
    ],
    'Artes': [
      {
        bimestre: 1, titulo: '1º Bimestre', aulas: [
          'Arte e Sociedade: Uma Visão Crítica',
          'História da Arte — Revisão',
          'Arte Moderna e Contemporânea',
          'Análise Crítica de Obras',
          'Arte Brasileira do Século XX',
          'Arte na Era Digital',
          'Produção Artística Individual',
          'Análise e Crítica da Produção',
          'Avaliação Processual',
          'Encerramento do Bimestre'
        ]
      },
      {
        bimestre: 2, titulo: '2º Bimestre', aulas: [
          'Música e Sociedade',
          'História da Música Brasileira — Revisão',
          'Análise de Canção Popular',
          'Teatro e Expressão',
          'Dança como Linguagem Social',
          'Arte e Cultura Amazônica',
          'Artistas Regionais',
          'Produção Artística Coletiva',
          'Apresentação',
          'Avaliação'
        ]
      },
      {
        bimestre: 3, titulo: '3º Bimestre', aulas: [
          'Arte e Mercado',
          'Arte como Profissão',
          'Patrimônio Cultural',
          'Arte Indígena',
          'Arte Afro-Brasileira',
          'Arte e Movimentos Sociais',
          'Arte e Tecnologia',
          'Projeto Artístico',
          'Apresentação',
          'Avaliação'
        ]
      },
      {
        bimestre: 4, titulo: '4º Bimestre', aulas: [
          'Arte como Patrimônio Pessoal',
          'Projeto Final',
          'Desenvolvimento',
          'Apresentação Final',
          'Avaliação Final',
          'Reflexão sobre o Percurso',
          'Encerramento do Ano',
          'Celebração',
          'Devolutiva',
          'Última Aula'
        ]
      }
    ]
  },
  t6: {
    'Artes': [
      {
        bimestre: 1, titulo: '1º Bimestre', aulas: [
          'O que é Arte? Primeiras Impressões',
          'Arte e Criatividade',
          'Cores Primárias e Secundárias',
          'Mistura de Cores',
          'Desenho: Formas Básicas',
          'Perspectiva Simples',
          'Arte com Materiais Reciclados',
          'Apresentação das Produções',
          'Avaliação Processual',
          'Encerramento do Bimestre'
        ]
      },
      {
        bimestre: 2, titulo: '2º Bimestre', aulas: [
          'Pintores Famosos: Van Gogh',
          'Pintores Famosos: Picasso',
          'Pintores Brasileiros: Cândido Portinari',
          'Pintores Brasileiros: Tarsila do Amaral',
          'Releitura de Obras',
          'Técnicas de Pintura: Aquarela',
          'Técnicas de Pintura: Têmpera',
          'Apresentação de Releituras',
          'Avaliação',
          'Encerramento'
        ]
      },
      {
        bimestre: 3, titulo: '3º Bimestre', aulas: [
          'Escultura: O que é?',
          'Materiais para Escultura',
          'Modelagem com Argila',
          'Origami: Arte Japonesa',
          'Artesanato Regional Acreano',
          'Arte Indígena: Grafismo',
          'Arte Afro-Brasileira',
          'Produção com Tema Regional',
          'Apresentação',
          'Avaliação'
        ]
      },
      {
        bimestre: 4, titulo: '4º Bimestre', aulas: [
          'Música: Sons e Ritmos',
          'Instrumentos Musicais',
          'Dança Folclórica',
          'Teatro: Fantoche e Marionete',
          'Projeto Final: Show de Talentos',
          'Ensaios',
          'Apresentação Final',
          'Avaliação Final',
          'Devolutiva',
          'Encerramento do Ano'
        ]
      }
    ]
  }
};

// Dados dos diários já registrados
const DIARIOS_INICIAIS = {
  t1: {
    '2026-03-30': {
      disciplina: 'Língua Portuguesa',
      hAula: 2,
      horario: '07h00 – 08h40',
      conteudo: 'Iniciação do ano letivo e firmando acordos. Conversa inicial sobre expectativas do ano letivo. Elaboração e envio da avaliação diagnóstica à secretaria — não impressa antes do recreio. Aula conduzida de forma dialogada por ausência de plano de curso elaborado nesta data.',
      presenca: {
        presentes: ['Paulo Henrique Vieira', 'Maria Eduarda Andrade', 'Jade Cristina Mendes', 'Gabriel Henrique Lima', 'Amanda Ferreira Lima'],
        faltas: ['Aleff Rodrigues Silva', 'Ana Beatriz Costa', 'Carlos Eduardo Souza', 'Daiane Oliveira Santos', 'Eduardo Pereira Melo', 'Fernanda Castro Alves', 'João Paulo Ramos', 'Juliana Moreira Pinto', 'Kaique Santos Barbosa', 'Larissa Figueiredo', 'Lucas Ferreira Nunes', 'Marcos Antônio Cunha', 'Natalia Oliveira Cruz', 'Rafael Augusto Torres', 'Sabrina Lima Cardoso', 'Thiago Rodrigues Assis', 'Vanessa Sousa Freitas'],
        faltasJustificadas: []
      },
      ocorrencias: [
        {
          alunos: 'Paulo Henrique, Maria Eduarda e Jade',
          descricao: 'Os três demonstram preferência por sentar próximos, gerando conversas paralelas. Padrão observado no primeiro dia — será monitorado nas próximas aulas.',
          tipo: 'comportamental'
        }
      ],
      observacoes: 'Presença reduzida: 5 alunos no primeiro dia. Atividade diagnóstica encaminhada à secretaria, porém não impressa a tempo — aplicação aguardada para a próxima aula.',
      analiseIA: {
        itens: [
          { aluno: 'Paulo Henrique', impacto: '⚠ Atenção — 1ª ocorrência', texto: 'Primeira observação de conversa paralela. Início de ano, sem perda de pontos estimada. Recomendam-se mais observações antes de registro formal.' },
          { aluno: 'Maria Eduarda', impacto: '⚠ Atenção — 1ª ocorrência', texto: 'Mesma situação. Caráter exploratório de início de ano. Sem impacto pontual estimado. Monitorar assentos na próxima aula.' },
          { aluno: 'Jade', impacto: '⚠ Atenção — 1ª ocorrência', texto: 'Tendência de socialização em trio pode indicar dispersão futura. Sem perda de pontos por ora — aguardar reincidência.' }
        ],
        sugestao: 'Reorganizar assentos já na próxima aula, separando este trio. Grupos rotativos podem estimular novas dinâmicas de interação e reduzir conversas paralelas.'
      }
    }
  },
  t2: {
    '2026-03-30': {
      disciplina: 'Língua Portuguesa',
      hAula: 2,
      horario: '09h15 – 11h15',
      conteudo: 'Avaliação diagnóstica de Língua Portuguesa. 2ª e 3ª Série reunidas na biblioteca. Aplicação da avaliação diagnóstica. 2 h/aula contabilizadas individualmente para cada turma.',
      presenca: { presentes: [], faltas: [], faltasJustificadas: [] },
      ocorrencias: [],
      observacoes: 'Turmas agrupadas para a atividade diagnóstica. Nenhuma ocorrência comportamental registrada. Lista de presença a complementar.',
      analiseIA: {
        itens: [{ aluno: '2ª Série', impacto: '', texto: 'Nenhum aluno da 2ª Série citado negativamente. Perfil comportamental em construção — será analisado progressivamente com os próximos relatos.' }],
        sugestao: 'Após correção da avaliação diagnóstica, registre aqui as defasagens identificadas para embasar o planejamento de conteúdos.'
      }
    }
  },
  t3: {
    '2026-03-30': {
      disciplina: 'Língua Portuguesa',
      hAula: 2,
      horario: '09h15 – 11h15',
      conteudo: 'Avaliação diagnóstica de Língua Portuguesa. 2ª e 3ª Série reunidas na biblioteca. Aplicação da avaliação diagnóstica. 2 h/aula contabilizadas individualmente para cada turma.',
      presenca: { presentes: [], faltas: [], faltasJustificadas: [] },
      ocorrencias: [],
      observacoes: 'Turma concluinte. Nenhuma ocorrência comportamental registrada. Lista de presença a complementar.',
      analiseIA: {
        itens: [{ aluno: '3ª Série', impacto: '', texto: 'Nenhum aluno da 3ª Série citado negativamente. Como turma concluinte, pode apresentar maior maturidade — perfil será construído progressivamente.' }],
        sugestao: 'Registre percepções sobre engajamento e motivação à medida que o ano avança — especialmente em relação ao ENEM.'
      }
    }
  },
  t6: {}
};
