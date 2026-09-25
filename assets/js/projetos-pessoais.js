(function () {
  'use strict';

  var APP = document.getElementById('pp-app');
  var PAGE = document.body && document.body.dataset.ppPage || 'workspace';
  var CACHE_KEY = 'projetos_pessoais_workspace_v1';
  var SYNC_SCOPE = 'projetos-pessoais:workspace:v1';
  var VAULT_MS = 15 * 60 * 1000;
  var LEGACY_FIREBASE = {
    apiKey: 'AIzaSyDO-BTsc6pYMBd89WIKEUcz4_iaaD46tR4',
    authDomain: 'relatorio-c693d.firebaseapp.com',
    projectId: 'relatorio-c693d',
    storageBucket: 'relatorio-c693d.firebasestorage.app',
    messagingSenderId: '457657450375',
    appId: '1:457657450375:web:15b1335aed2ba9939bdd22'
  };
  var SEED_TIMESTAMP = '2020-01-01T00:00:00.000Z';
  var PROJECT_STATUSES = [
    'Ideia',
    'Desenvolvimento',
    'Operacional com ajustes',
    'Operacional final',
    'Operacional efetivo'
  ];
  var IDEA_STATUSES = ['Para o futuro', 'Em execução', 'Concluída'];
  var PRIORITIES = ['Urgente', 'Alta', 'Média', 'Baixa', 'Sem pressa'];
  var PROVIDERS = ['GitHub', 'Supabase', 'Firebase', 'Vercel', 'ChatGPT', 'Codex', 'Claude', 'Gemini', 'Outra'];
  var AI_ACCOUNTS = [
    { id: 'claude-10pauloacre', provider: 'Claude', title: '10pauloacre@gmail.com' },
    { id: 'claude-quinari', provider: 'Claude', title: 'quinari.ouvidoria@gmail.com' },
    { id: 'codex-pro', provider: 'Codex', title: 'Codex Pro' }
  ];
  var RURAL_MANAGER_PHASES = [
    { id: 'p1', title: 'Fundação técnica', summary: 'Criar uma base estável, tipada e verificável antes das funcionalidades.', tasks: [
      ['Auditoria inicial do repositório', 'Mapear stack, rotas, componentes, banco, variáveis e riscos antes de começar.', 'Nenhuma. É o primeiro bloco.'],
      ['Base Next.js e estrutura do projeto', 'Padronizar App Router, TypeScript estrito, aliases, layouts e módulos.', 'Auditoria inicial concluída.'],
      ['Qualidade e automação local', 'Configurar lint, formatação, testes, hooks e comandos de validação.', 'Base do projeto estabilizada.']
    ] },
    { id: 'p2', title: 'UI/UX e navegação', summary: 'Construir a experiência mobile-first, componentes e formulários do produto.', tasks: [
      ['Arquitetura de navegação', 'Criar shell mobile-first com barra inferior, header e rotas principais.', 'Fundação técnica pronta.'],
      ['Design system e identidade visual', 'Definir tokens, componentes e padrões visuais consistentes.', 'Shell de navegação disponível.'],
      ['Formulários, máscaras e validação', 'Padronizar entradas de moeda, peso, percentual, datas e números.', 'Design system pronto.'],
      ['Onboarding e primeira configuração', 'Orientar cadastro, propriedade e parâmetros iniciais sem bloquear o usuário.', 'Autenticação pode ser integrada depois; prepare interfaces desacopladas.']
    ] },
    { id: 'p3', title: 'Dados, autenticação e segurança', summary: 'Preparar Supabase, schema, RLS e uma camada de dados testável.', tasks: [
      ['Autenticação Supabase', 'Implementar cadastro, login, sessão, recuperação e proteção de rotas.', 'Projeto Supabase criado e variáveis públicas disponíveis.'],
      ['Schema inicial do banco', 'Criar perfis, propriedades, membros, configurações e simulações versionadas.', 'Projeto Supabase acessível e autenticação definida.'],
      ['RLS e autorização por propriedade', 'Impedir acesso cruzado entre usuários e preparar papéis de equipe.', 'Schema inicial aplicado.'],
      ['Camada de serviços e repositórios', 'Isolar UI, Supabase, cache local e regras de domínio.', 'Schema e tipos disponíveis.']
    ] },
    { id: 'p4', title: 'Dashboard e contexto operacional', summary: 'Entregar a tela inicial, cotações e comunicação de estado.', tasks: [
      ['Dashboard principal', 'Exibir panorama, CTA, indicadores e atividades recentes.', 'Navegação e repositórios disponíveis.'],
      ['Card de mercado e cotações', 'Mostrar cotação com fonte, estado, categoria, data e fallback.', 'Tabela market_quotes e uma estratégia de fonte definida.'],
      ['Conexão, sincronização e notificações', 'Comunicar online/offline, fila pendente e alertas úteis.', 'Shell e futura fila de sincronização; use contrato temporário se a fila ainda não existir.']
    ] },
    { id: 'p5', title: 'Entrada do simulador', summary: 'Construir todas as seções necessárias para modelar uma operação pecuária.', tasks: [
      ['Shell da nova simulação', 'Formulário em acordeões, rascunho automático e totalizador fixo.', 'Formulários, navegação e entidades de simulação.'],
      ['Operação e identificação do lote', 'Tipo de operação, categoria, propriedade e dados básicos.', 'Shell do simulador pronto.'],
      ['Compra e custos de aquisição', 'Aceitar negociação por cabeça, kg, arroba ou lote e calcular equivalências.', 'Informações do lote e componentes monetários.'],
      ['Desenvolvimento, GMD e perdas', 'Projetar peso, dias, ganho diário, mortalidade, descarte e quebra.', 'Lote e compra implementados.'],
      ['Alimentação e suplementação', 'Cadastrar vários itens, consumo e custo por período.', 'Peso e duração disponíveis.'],
      ['Terra, sanidade, mão de obra e custos fixos', 'Consolidar despesas operacionais e formas de rateio.', 'Duração e quantidade disponíveis.'],
      ['Capital, juros e custos financeiros', 'Modelar capital próprio, financiamento e retorno pelo prazo.', 'Investimento e duração calculáveis.'],
      ['Cenário de venda', 'Calcular receita por cabeça, kg vivo, arroba de carcaça ou lote.', 'Peso final e animais vendidos disponíveis.']
    ] },
    { id: 'p6', title: 'Motor de cálculo e regras', summary: 'Centralizar fórmulas, ponto de equilíbrio, risco e persistência versionada.', tasks: [
      ['Motor de cálculo financeiro', 'Centralizar fórmulas em módulo puro, versionado e testado.', 'Schemas de entrada das seções definidos.'],
      ['Ponto de equilíbrio', 'Calcular arroba mínima, compra máxima, GMD e peso necessários.', 'Motor principal validado.'],
      ['Semáforo econômico e risco', 'Separar resultado financeiro de sensibilidade e risco.', 'ROI, ponto de equilíbrio e breakdown disponíveis.'],
      ['Recálculo em tempo real e desempenho', 'Atualizar resultado por digitação sem travar ou perder foco.', 'Motor de cálculo puro disponível.'],
      ['Persistência e versionamento da simulação', 'Salvar entradas, resultados e versão sem alterar cálculos antigos.', 'Repositórios, schema e motor de cálculo.']
    ] },
    { id: 'p7', title: 'Resultados e decisão', summary: 'Criar resumo auditável, cenários e comparação entre operações.', tasks: [
      ['Tela de resultados', 'Apresentar resumo, custos, produção e explicação das fórmulas.', 'Motor de cálculo completo.'],
      ['Cenários e análise de sensibilidade', 'Comparar pessimista, provável e otimista e testar variáveis.', 'Motor rápido e ponto de equilíbrio.'],
      ['Comparador de simulações', 'Comparar até quatro cenários com critérios objetivos.', 'Histórico e resultados salvos.']
    ] },
    { id: 'p8', title: 'Histórico e configurações', summary: 'Permitir recuperar, organizar e parametrizar o trabalho diário.', tasks: [
      ['Histórico de simulações', 'Busca, filtros, ordenação, paginação e cards de lotes.', 'Persistência de simulações.'],
      ['Ações do histórico', 'Ver, editar, duplicar, arquivar, restaurar e excluir com segurança.', 'Lista do histórico e casos de uso.'],
      ['Configurações padrão', 'Salvar parâmetros econômicos, produtivos, unidades e limites.', 'user_settings e formulários disponíveis.'],
      ['Conta, propriedades e equipe', 'Gerenciar perfil, propriedades, sessões e membros.', 'Auth, farms, farm_members e RLS.']
    ] },
    { id: 'p9', title: 'PWA, offline e sincronização', summary: 'Garantir instalação e funcionamento confiável em leilões ou áreas sem sinal.', tasks: [
      ['PWA instalável', 'Manifest, ícones, service worker, atualização e instalação.', 'Shell web estável e HTTPS no ambiente publicado.'],
      ['Banco local IndexedDB', 'Persistir rascunhos, configurações, cotações e fila de operações.', 'Camada de repositórios e schemas de domínio.'],
      ['Fila de sincronização e idempotência', 'Enviar alterações ao Supabase com retry, ordem e deduplicação.', 'IndexedDB, repositórios e endpoints/tabelas com versionamento.'],
      ['Conflitos e consistência', 'Detectar alterações concorrentes e evitar last-write-wins silencioso.', 'Fila de sincronização operacional.']
    ] },
    { id: 'p10', title: 'Relatórios, testes e lançamento', summary: 'Validar, exportar e publicar o MVP com segurança.', tasks: [
      ['Exportação PDF e planilha', 'Gerar relatórios consistentes a partir do snapshot salvo.', 'Tela de resultado e snapshot.'],
      ['Compartilhamento seguro', 'Criar link controlado ou compartilhamento nativo sem tornar dados públicos.', 'Exportação e autenticação.'],
      ['Testes do domínio financeiro', 'Criar suíte extensa para fórmulas, limites e regressões.', 'Motor de cálculo implementado.'],
      ['Testes de interface e fluxo completo', 'Validar cadastro, simulação, offline, sync, histórico e exportação.', 'Fluxos principais implementados.'],
      ['Segurança, desempenho e acessibilidade', 'Auditar RLS, bundle, consultas, cache e experiência em aparelhos modestos.', 'MVP funcional.'],
      ['Deploy, ambientes e observabilidade', 'Configurar preview, produção, migrações, logs e rollback.', 'Checks e build estáveis.']
    ] },
    { id: 'p11', title: 'Evolução para administração pecuária', summary: 'Adicionar gestão real apenas depois de validar o simulador.', tasks: [
      ['Lotes reais e projetado × realizado', 'Converter simulação em lote e acompanhar eventos e custos reais.', 'MVP validado por usuários.'],
      ['Gestão individual do rebanho', 'Cadastro por brinco/RFID, histórico, pesagens e documentos.', 'Gestão de lotes estável e necessidade real confirmada.'],
      ['Sanidade e reprodução', 'Protocolos, estoque de medicamentos, carência, matrizes e partos.', 'Animais/lotes reais e estoque básico.'],
      ['Pastagens e estoque', 'Piquetes, ocupação, descanso, insumos, validade e reposição.', 'Lotes reais.'],
      ['Financeiro, documentos e equipe', 'Fluxo de caixa, centros de custo, arquivos e permissões avançadas.', 'Operação real consolidada.']
    ] },
    { id: 'p12', title: 'Aplicativo Android', summary: 'Empacotar a plataforma somente quando o PWA estiver maduro.', tasks: [
      ['Preparação para APK', 'Auditar APIs web, navegação, armazenamento e plugins antes do empacotamento.', 'PWA estável e testado em produção.'],
      ['Empacotamento Android', 'Criar projeto nativo, assinatura, variantes e testes em aparelho.', 'Auditoria de prontidão concluída.']
    ] }
  ];
  var AXION_PHASES = [
    { id: 'f01', title: 'Identidade verbal e arquitetura de marca', summary: 'Fechar o discurso da companhia e a regra de nomes antes de produzir qualquer arte, site ou proposta. Tudo o que vier depois copia daqui.', tasks: [
      ['Slogan institucional', 'Tecnologia que move a educação. Usado no site, nas propostas e na assinatura de e-mail.', 'Nenhuma. É o primeiro bloco.', true],
      ['Assinatura publicitária', 'Ensinar. Aprender. Evoluir. Usada em peças de divulgação, vídeos e redes sociais. As duas convivem.', 'Slogan institucional definido.', true],
      ['Descritor curto da companhia', 'AXION PROEDUQ é uma companhia de tecnologia educacional dedicada ao desenvolvimento de plataformas, aplicativos e experiências digitais que ampliam as possibilidades de ensinar e aprender.', 'Nenhuma.', true],
      ['Descritor forte para apresentação institucional', 'Criamos tecnologia para transformar a maneira como professores ensinam, alunos aprendem e escolas desenvolvem novas experiências educacionais.', 'Descritor curto definido.', true],
      ['Frase de posicionamento do site', 'Tecnologia criada para quem ensina e para quem aprende. Entra logo abaixo do título na primeira página.', 'Descritores definidos.', true],
      ['Cinco pilares de marca', 'Inovação, Autonomia, Simplicidade, Evolução e Acesso, cada um com uma linha de explicação. São o eixo de todo texto institucional.', 'Descritores definidos.', true],
      ['Regra de arquitetura de marca', 'Produto tem nome próprio e recebe o selo uma plataforma AXION PROEDUQ. Nunca prefixar produto com Axion, para que cada plataforma construa personalidade e a companhia acumule reputação.', 'Nenhuma.', true],
      ['Lista de nomes reservados', 'Avalia, Sala, Trilhas, Mestre e Conecta. Conferir domínio livre e busca no INPI antes de adotar qualquer um deles.', 'Regra de arquitetura definida.'],
      ['Guia de tom de voz em uma página', 'A companhia é séria e confiável; os produtos podem ser lúdicos e gamificados. Escrever o que dizer, o que evitar e três exemplos de frase certa e errada.', 'Pilares definidos.'],
      ['Glossário de termos padronizados', 'Companhia, plataforma, produto, escola parceira, rede de ensino, professor, estudante. Evita variação de palavra entre site, sistema e proposta.', 'Tom de voz definido.']
    ] },
    { id: 'f02', title: 'Identidade visual e ativos de apresentação', summary: 'Transformar a marca em arquivos prontos para uso em tela, impressão e proposta, sem depender de refazer arte a cada peça.', tasks: [
      ['Logotipo principal criado', 'Versões para fundo claro e escuro em fontes/marca/axion-bg-claro.png e axion-bg-escuro.png.', 'Identidade verbal fechada.', true],
      ['Versões web otimizadas', 'Recortes em webp em assets/marca/, com tamanhos -sm para cabeçalho e tamanho cheio para hero.', 'Logotipo criado.', true],
      ['Ícone da companhia', 'icon-axion.png em uso nos projetos e no hub.', 'Logotipo criado.', true],
      ['Favicon e ícones de aplicativo', 'Gerar favicon.ico de 32px, apple-touch-icon de 180px e ícones PWA de 192 e 512px a partir do mesmo símbolo.', 'Ícone definido.'],
      ['Paleta de cores oficial', 'Definir primária, secundária, neutros e cores de estado (sucesso, alerta, erro), com hex e variante para modo escuro. Conferir contraste mínimo de 4.5:1 em texto.', 'Logotipo criado.'],
      ['Tipografia oficial', 'Uma fonte de título e uma de texto, com licença livre para uso comercial. Hospedar no próprio domínio para não depender de terceiro e não vazar acesso do visitante.', 'Paleta definida.'],
      ['Versão monocromática e regras de uso', 'Logo em preto, em branco e em traço único, com área de respiro e tamanho mínimo. Evita deformação em ofício, carimbo e camiseta.', 'Logotipo criado.'],
      ['Manual de marca em PDF', 'Reunir logo, paleta, tipografia, usos proibidos, arquitetura de marca e tom de voz em um arquivo só. É o que se envia a gráfica e a parceiro.', 'Paleta, tipografia e tom de voz prontos.'],
      ['Selo uma plataforma AXION PROEDUQ', 'Arte em svg e webp, clara e escura, para aplicar no rodapé de cada produto sem redesenhar.', 'Regra de arquitetura definida.'],
      ['Imagens de apresentação dos produtos', 'Mockups em notebook, tablet e celular com telas reais da Biblioteca e do Relatório, em modo claro e escuro.', 'Capturas padronizadas disponíveis.'],
      ['Banco de capturas de tela com dados fictícios', 'Resolução padronizada e nenhum nome de aluno real. Essa regra é de LGPD, não de estética.', 'Ambiente de teste com dados fictícios.'],
      ['Vídeo de demonstração de 60 a 90 segundos', 'Roteiro, gravação de tela, narração e legenda embutida. Serve para site, rede social e proposta, e funciona sem som.', 'Mockups e capturas prontos.']
    ] },
    { id: 'f03', title: 'Domínio, DNS e e-mail comercial', summary: 'Garantir que o endereço da companhia é dela, que o e-mail chega e que ninguém consegue se passar pela marca.', tasks: [
      ['Domínio axionproeduq.com.br registrado', 'Registro feito no Registro.br em nome da companhia.', 'Nenhuma.', true],
      ['Renovação automática e contato conferidos', 'Ativar débito automático e confirmar que o e-mail de contato do domínio é um endereço que você lê todo dia. Domínio que vence derruba site e e-mail juntos.', 'Domínio registrado.'],
      ['Domínios defensivos avaliados', 'Conferir axionproeduq.com e axionproeduq.app e decidir se vale registrar para proteger a marca de uso indevido.', 'Domínio principal ativo.'],
      ['DNS concentrado em um painel só', 'Escolher entre Registro.br e Cloudflare e manter todos os registros no mesmo lugar. DNS espalhado é a causa mais comum de site fora do ar sem explicação.', 'Domínio registrado.'],
      ['E-mail comercial criado', 'Google Workspace ou Zoho Mail, com contato@, suporte@, comercial@ e admin@axionproeduq.com.br. Nunca usar Gmail pessoal em proposta pública.', 'DNS sob controle.'],
      ['SPF, DKIM e DMARC configurados', 'Os três registros impedem que o e-mail caia em spam e que terceiros falsifiquem a marca. Começar o DMARC em p=none, observar por duas semanas e subir para quarantine.', 'E-mail comercial criado.'],
      ['Teste de entregabilidade', 'Enviar para Gmail, Outlook e um endereço institucional do governo e conferir no cabeçalho se SPF, DKIM e DMARC passaram.', 'Registros publicados e propagados.'],
      ['Assinatura de e-mail padronizada', 'Nome, cargo, logo pequena, site e slogan, em HTML leve que não quebre em cliente antigo nem vire anexo.', 'Manual de marca pronto.'],
      ['2FA e códigos de recuperação da conta de e-mail', 'Verificação em duas etapas com aplicativo autenticador e códigos de recuperação guardados no cofre de senhas.', 'E-mail comercial criado.']
    ] },
    { id: 'f04', title: 'Contas, organizações e cofre de credenciais', summary: 'Criar a camada de contas da companhia ainda no plano gratuito, mas já com a disciplina de segurança de uma empresa.', tasks: [
      ['Gerenciador de senhas escolhido', 'Bitwarden gratuito ou 1Password. A partir daqui, nenhuma credencial vive em papel, bloco de notas ou navegador.', 'E-mail comercial criado.'],
      ['Senha mestra forte e backup do cofre', 'Frase longa, fácil de lembrar e impossível de adivinhar. Exportação criptografada guardada fora do computador principal.', 'Cofre criado.'],
      ['2FA em todas as contas críticas', 'GitHub, Supabase, Vercel, Google, Registro.br e banco. Preferir aplicativo autenticador a SMS, que é vulnerável a troca de chip.', 'Cofre criado.'],
      ['Organização no GitHub', 'Criar axion-proeduq no plano gratuito e ativar a exigência de 2FA para todos os membros.', 'Conta comercial com 2FA.'],
      ['Organização no Supabase', 'Criar a organização da companhia e convidar o e-mail comercial como owner. Sem isso a transferência de projeto não aparece.', 'Conta comercial criada.'],
      ['Team na Vercel', 'Criar o time da companhia. Atenção: o plano Hobby proíbe uso comercial, então a troca para Pro precisa acontecer antes do primeiro faturamento.', 'Conta comercial criada.'],
      ['Firebase sob a conta da companhia', 'Não existe botão de transferir. Adicionar o e-mail comercial como Proprietário no IAM do projeto.', 'Conta comercial criada.'],
      ['Inventário de contas em planilha', 'Serviço, plano, dono, e-mail, custo, data de renovação e onde fica a credencial. É o documento que evita perder um serviço por esquecimento.', 'Contas criadas.'],
      ['Política de menor privilégio', 'Nenhuma conta, chave ou integração com mais permissão do que precisa. Revisar a cada três meses.', 'Inventário pronto.'],
      ['Conta de recuperação de emergência', 'Um segundo endereço, fora do domínio da companhia, cadastrado como recuperação nos serviços críticos. Protege contra perda do domínio.', 'Contas criadas.']
    ] },
    { id: 'f05', title: 'Transferência dos projetos para a conta Axion', summary: 'Levar GitHub, Supabase, Vercel e Firebase da conta pessoal para a companhia sem tirar nada do ar e sem perder histórico.', tasks: [
      ['Backup completo antes de mexer', 'git clone --mirror de cada repositório, dump do Postgres do Supabase e exportação do Firestore, guardados em dois lugares. Nada começa sem isso.', 'Cofre e inventário prontos.'],
      ['Janela de transferência combinada', 'Escolher horário sem aula, avisar quem usa e não publicar nada enquanto a transferência corre.', 'Backup concluído.'],
      ['Repositórios transferidos no GitHub', 'Settings, Transfer ownership, para a organização axion-proeduq. O GitHub mantém redirecionamento das URLs antigas.', 'Organização criada e backup feito.'],
      ['git remote atualizado no computador', 'git remote set-url origin no relatorio-2026 e na Biblioteca. Conferir com git remote -v e fazer um push de teste.', 'Repositórios transferidos.'],
      ['GitHub Pages conferido', 'O endereço passa a ser axion-proeduq.github.io. Conferir CNAME, certificado e se o site continua abrindo.', 'Repositórios transferidos.'],
      ['Projeto Supabase transferido', 'Project Settings, Transfer project. O ID vgceathgwvtmjxbdpecr, as chaves e as URLs continuam iguais, então o código não muda.', 'Organização Supabase criada.'],
      ['Vercel reconectada ao GitHub', 'Transferir os projetos para o time e reinstalar a integração apontando para a organização, senão o deploy automático para de disparar.', 'Team criado e repositórios transferidos.'],
      ['Domínios conferidos na Vercel', 'relatorio.skin e biblioteca-ac.com precisam continuar com certificado válido e apontamento correto depois da transferência.', 'Projetos transferidos.'],
      ['Firebase passado para a companhia', 'Adicionar como Proprietário, testar o plano anual, e só então remover a conta pessoal.', 'Conta comercial no IAM.'],
      ['Redirect URLs do Supabase revistas', 'Authentication, URL Configuration: incluir os endereços novos e remover os que saíram do ar. Login quebra em silêncio quando isso fica para depois.', 'Endereços definitivos conhecidos.'],
      ['Teste de ponta a ponta depois da transferência', 'Login, sincronia, Realtime, publicação de relato, prova, boletim e PWA, nas duas escolas e em celular.', 'Todas as transferências concluídas.'],
      ['Referências atualizadas no código e na documentação', 'CLAUDE.md, README, links fixos e qualquer URL que aponte para a conta pessoal.', 'Teste de ponta a ponta aprovado.'],
      ['Conta pessoal rebaixada', 'Só depois de tudo verde: remover ou reduzir para leitura, mantendo um acesso de emergência documentado.', 'Tudo funcionando pela conta da companhia.']
    ] },
    { id: 'f06', title: 'Site institucional da companhia', summary: 'Publicar a página que apresenta a companhia e abriga as plataformas, no domínio próprio e com qualidade de vitrine.', tasks: [
      ['Página institucional criada', 'axion-proeduq.html publicada nos dois sites, com quem somos, propósito, princípios, valores, plataformas e contato.', 'Identidade verbal e visual prontas.', true],
      ['Publicação no domínio próprio', 'Apontar axionproeduq.com.br para o site institucional, com www redirecionando para a raiz.', 'DNS sob controle.'],
      ['Hero conforme a identidade', 'AXION PROEDUQ, o slogan, o parágrafo de apresentação e o botão Conheça nossas soluções.', 'Identidade verbal fechada.'],
      ['Seção Soluções', 'Um cartão por plataforma com logo, uma linha de descrição, situação e link. Biblioteca Digital e Relatório primeiro; os futuros como em breve.', 'Arquitetura de marca definida.'],
      ['Seção Sobre e pilares', 'Quem somos, propósito e os cinco pilares, com a linguagem já aprovada.', 'Pilares definidos.'],
      ['Página de contato', 'Formulário com proteção antispam, e-mail comercial, cidade e estado. Nunca publicar telefone pessoal.', 'E-mail comercial criado.'],
      ['Rodapé institucional', 'AXION PROEDUQ, Tecnologia Educacional, Ensinar. Aprender. Evoluir., links legais e CNPJ quando existir.', 'Identidade verbal fechada.'],
      ['SEO básico', 'title, description, canonical, Open Graph, imagem de compartilhamento, sitemap.xml e robots.txt.', 'Site publicado.'],
      ['Dados estruturados de organização', 'JSON-LD do tipo Organization com nome, logo, site, e-mail e redes. Ajuda o Google a mostrar a marca corretamente.', 'Site publicado.'],
      ['Acessibilidade conferida', 'Contraste mínimo, navegação só por teclado, texto alternativo em toda imagem e teste com leitor de tela. Em contrato público, acessibilidade é exigência.', 'Site publicado.'],
      ['Desempenho conferido', 'Imagens em webp com width e height declarados, fontes locais, Lighthouse acima de 90 no celular.', 'Site publicado.'],
      ['Teste em aparelhos reais', 'Android modesto, iPhone, tablet e notebook, em modo claro e escuro, com internet lenta.', 'Site publicado.']
    ] },
    { id: 'f07', title: 'Arquitetura de domínios e selo nos produtos', summary: 'Organizar onde cada plataforma mora e fazer a companhia aparecer dentro de cada produto, sem apagar a marca do produto.', tasks: [
      ['Mapa de subdomínios definido', 'relatorio., biblioteca., app., docs., status., suporte. e api. em axionproeduq.com.br. Definir antes de divulgar qualquer endereço.', 'Domínio ativo.'],
      ['Decisão sobre os domínios atuais', 'relatorio.skin e biblioteca-ac.com continuam válidos; quando migrar, mantê-los redirecionando por pelo menos doze meses.', 'Mapa de subdomínios definido.'],
      ['Selo aplicado no Relatório', 'Marca no rodapé e na tela de login, com os links legais.', 'Selo criado.', true],
      ['Selo aplicado na Biblioteca', 'BIBLIOTECA DIGITAL, uma plataforma AXION PROEDUQ, no rodapé da abertura e dos painéis.', 'Selo criado.', true],
      ['Redirecionamentos 301 planejados', 'Toda troca de endereço mantém o antigo respondendo, para não perder o que já foi compartilhado com professor e aluno.', 'Mapa de subdomínios definido.'],
      ['HTTPS e HSTS em todos os subdomínios', 'Conferir renovação automática de certificado e ativar HSTS depois de confirmar que tudo funciona em https.', 'Subdomínios publicados.'],
      ['Espaço reservado para produtos futuros', 'Página do site com Avalia, Sala, Trilhas, Mestre e Conecta como em breve, para mostrar ambição sem prometer data.', 'Nomes reservados.']
    ] },
    { id: 'f08', title: 'Segurança de dados e defesa contra ataques', summary: 'A companhia guarda dado de criança e adolescente. Esta fase não é opcional e precisa estar pronta antes de qualquer proposta ao governo.', tasks: [
      ['Revisão completa de RLS no Supabase', 'Toda tabela com dado de aluno ou professor precisa de política ativa. Testar de fato: com a chave pública, tentar ler o que não deveria e confirmar que o banco recusa.', 'Acesso ao projeto Supabase.'],
      ['Nenhuma chave secreta no repositório', 'Só a chave anônima pode aparecer no código. A service_role jamais. Rodar varredura de segredos no histórico do git, não só nos arquivos atuais.', 'Acesso ao repositório.'],
      ['Decisão sobre repositório público com nome de aluno', 'O relatorio-2026 é público e os relatos no HTML trazem nomes. Fechar o repositório ou remover os nomes. Página trancada não protege o código-fonte.', 'Backup concluído.'],
      ['Cabeçalhos de segurança', 'Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, Permissions-Policy e HSTS. Bloqueiam a maior parte dos ataques de injeção em página.', 'Site publicado.'],
      ['Proteção contra força bruta no login', 'Limite de tentativas, espera crescente e bloqueio temporário. Sem isso, senha fraca de professor vira porta de entrada.', 'Autenticação em produção.'],
      ['Proteção contra bot e sobrecarga', 'Cloudflare na frente do domínio ou o firewall da Vercel, com regra de taxa nas rotas de login, de IA e de gravação.', 'DNS sob controle.'],
      ['Validação no servidor, nunca só na tela', 'Toda gravação confere permissão no banco. O que o navegador manda pode ser adulterado por qualquer aluno curioso.', 'RLS revisada.'],
      ['Revisão das Edge Functions', 'Conferir autenticação, cota, tempo limite e o que vai para o log. Função aberta sem verificação é o elo mais fácil de explorar.', 'Acesso ao projeto Supabase.'],
      ['Rotação de chaves programada', 'Trocar chaves e tokens a cada seis meses e sempre que alguém deixar o time. Anotar a data da última rotação no inventário.', 'Inventário de contas pronto.'],
      ['Backup automático com teste de restauração', 'Backup diário do banco e, pelo menos uma vez, restaurar de verdade em um projeto de teste. Backup nunca testado não é backup.', 'Ambiente de teste criado.'],
      ['Registro de acessos administrativos', 'Saber quem entrou, quando e de onde, guardado por doze meses. É o que permite investigar um incidente.', 'Acesso ao projeto Supabase.'],
      ['Plano de resposta a incidente escrito', 'O que fazer nas duas primeiras horas: conter, avaliar o alcance, comunicar a ANPD em até dois dias úteis e avisar os titulares afetados.', 'Encarregado de dados nomeado.'],
      ['Dependências monitoradas', 'Dependabot ou npm audit no repositório, com revisão mensal. Biblioteca desatualizada é vetor de ataque conhecido.', 'Repositórios na organização.'],
      ['Teste de invasão básico feito por você mesmo', 'Tentar abrir o boletim de outro aluno, subir arquivo malicioso, injetar HTML no relato, burlar a prova e repetir a requisição de gravação. Anotar cada resultado.', 'RLS revisada e cabeçalhos ativos.'],
      ['Ambiente de teste separado da produção', 'Um projeto Supabase sem dado real para experimentar mudança de schema. Nenhum teste toca o banco da escola.', 'Organização Supabase criada.']
    ] },
    { id: 'f09', title: 'LGPD, privacidade e conformidade', summary: 'Colocar no papel a base legal para tratar dado de aluno. Sem esta fase não existe contrato com rede pública de ensino.', tasks: [
      ['Política de Privacidade publicada', 'privacidade.html no ar, aberta sem login.', 'Site publicado.', true],
      ['Termos de Serviço publicados', 'termos.html no ar, aberto sem login.', 'Site publicado.', true],
      ['Documentos atualizados para a companhia', 'Trocar o responsável de pessoa física para AXION PROEDUQ e listar cada serviço usado (Supabase, Vercel, Firebase, provedor de IA, e-mail).', 'CNPJ aberto ou em andamento.'],
      ['Encarregado de dados nomeado', 'Indicar o responsável e publicar o canal de contato, como a LGPD exige. Pode ser você, desde que esteja escrito.', 'Documentos atualizados.'],
      ['Registro das operações de tratamento', 'Planilha com dado coletado, finalidade, base legal, quem acessa, onde fica e por quanto tempo. É o primeiro documento que um órgão pede.', 'Documentos atualizados.'],
      ['Base legal para dado de menor definida', 'Aluno é criança ou adolescente. Definir entre consentimento do responsável e execução de política pública por meio de convênio com a escola.', 'Encarregado nomeado.'],
      ['Contrato de operador com a escola ou rede', 'Modelo que deixa claro que a companhia trata dado em nome da instituição, e não por conta própria.', 'Base legal definida.'],
      ['Canal de direitos do titular', 'Formulário para pedir acesso, correção, portabilidade ou exclusão, com prazo de resposta publicado.', 'Encarregado nomeado.'],
      ['Prazo de guarda coerente com a prática', 'A política promete guarda por ano letivo e por tempo indeterminado. Conferir se o banco realmente cumpre e se o titular consegue sair.', 'Registro de operações pronto.'],
      ['Anonimização em toda demonstração', 'Nenhuma captura, vídeo ou proposta com nome real de aluno. Usar sempre o ambiente de teste.', 'Ambiente de teste criado.']
    ] },
    { id: 'f10', title: 'Qualidade, testes e prevenção de bugs', summary: 'Evitar que uma publicação apressada derrube o diário de uma escola inteira em dia de conselho de classe.', tasks: [
      ['Ambiente de teste separado', 'Branch de preview na Vercel ligado ao banco de teste. Nenhuma experiência acontece sobre o dado real.', 'Organização e team criados.'],
      ['Checklist de publicação escrito', 'Passos obrigatórios antes de cada push: rodar as verificações, abrir a página, testar login, sincronia e um relato completo.', 'Ambiente de teste criado.'],
      ['Scripts de verificação sempre rodados', 'node scripts/check-copias-compartilhadas.js e os demais scripts do repositório, antes de cada publicação.', 'Repositórios na organização.'],
      ['Roteiro de teste manual por plataforma', 'Lista numerada de telas e ações com resultado esperado. O mesmo roteiro serve para provar funcionamento em proposta.', 'Checklist de publicação pronto.'],
      ['Teste em aparelho modesto e internet lenta', 'Android antigo em rede 3G. A Casavequia já travou por excesso de varredura de DOM, e isso só aparece em aparelho fraco.', 'Roteiro de teste pronto.'],
      ['Regra de ouro do DOM registrada', 'Nunca colocar querySelectorAll dentro de laço que percorre alunos ou relatos. Indexar o DOM uma vez e consultar o índice.', 'Nenhuma.'],
      ['Monitoramento de erro em produção', 'Sentry no plano gratuito ou coletor próprio, para descobrir o bug antes do professor reclamar.', 'Site em produção.'],
      ['Plano de rollback testado', 'Saber voltar à versão anterior na Vercel em menos de cinco minutos, e ter feito isso pelo menos uma vez de propósito.', 'Deploy automático funcionando.'],
      ['Registro de bugs corrigidos mantido', 'Manter a tabela do CLAUDE.md atualizada com causa e correção. Evita repetir o mesmo erro seis meses depois.', 'Nenhuma.'],
      ['Revisão do diff antes de publicar', 'Ler a mudança inteira. Em alteração de banco, revisar a política de acesso junto, no mesmo momento.', 'Nenhuma.'],
      ['Teste de carga simples', 'Simular trinta professores e trezentos alunos ao mesmo tempo antes de oferecer o sistema a uma rede.', 'Ambiente de teste criado.']
    ] },
    { id: 'f11', title: 'Observabilidade, backup e continuidade', summary: 'Saber que algo quebrou antes do cliente saber, e conseguir voltar ao ar mesmo no pior cenário.', tasks: [
      ['Página de status pública', 'status.axionproeduq.com.br informando se cada plataforma está no ar. Transparência conta ponto em avaliação técnica.', 'Subdomínios definidos.'],
      ['Alerta de indisponibilidade', 'Monitor externo gratuito que avisa por e-mail quando o site sai do ar, medindo de fora da infraestrutura.', 'Site em produção.'],
      ['Painel de números de uso', 'Professores, alunos, aulas, provas e relatórios por semana. Serve para operação e vira argumento na proposta.', 'Banco em produção.'],
      ['Backup em três lugares', 'Banco, cópia em outro provedor e cópia local. Regra simples: dois meios diferentes e um fora do ambiente.', 'Backup automático configurado.'],
      ['Limites dos planos gratuitos vigiados', 'Saber o teto de cada serviço e o que acontece ao estourar, antes de estourar no meio do bimestre.', 'Inventário de contas pronto.'],
      ['Plano de continuidade escrito', 'O que fazer se um serviço encerrar, se a conta for bloqueada ou se você ficar indisponível por doença ou viagem.', 'Inventário e backups prontos.']
    ] },
    { id: 'f12', title: 'Suporte, atendimento e documentação', summary: 'O que separa um projeto pessoal de uma companhia é a certeza de que alguém responde quando algo dá errado.', tasks: [
      ['Canal oficial de suporte', 'suporte@axionproeduq.com.br com resposta padronizada e registro de cada atendimento.', 'E-mail comercial criado.'],
      ['Prazo de atendimento publicado', 'Por exemplo: resposta em até um dia útil. O poder público cobra esse compromisso em contrato.', 'Canal de suporte ativo.'],
      ['Base de conhecimento', 'Perguntas frequentes e passo a passo com imagem, separados por professor e por aluno.', 'Plataformas estáveis.'],
      ['Manual do professor em PDF', 'Entrar, lançar relato, corrigir presença, fechar bimestre e emitir o relatório individual.', 'Base de conhecimento iniciada.'],
      ['Manual do aluno', 'Entrar, ler o livro, fazer a prova e ver o boletim, em linguagem direta e com imagem.', 'Base de conhecimento iniciada.'],
      ['Vídeos curtos de treinamento', 'Um por tarefa principal, de até três minutos, com legenda.', 'Manuais prontos.'],
      ['Formulário de erro dentro do sistema', 'Botão que já envia versão, tela e navegador preenchidos, para não depender do relato do usuário.', 'Monitoramento configurado.'],
      ['Registro de chamados', 'Planilha ou ferramenta gratuita com data, assunto e tempo de resposta. Vira prova de capacidade de suporte na proposta.', 'Canal de suporte ativo.']
    ] },
    { id: 'f13', title: 'Integrações e ecossistema técnico', summary: 'Fazer as plataformas conversarem entre si e com os sistemas que a rede de ensino já usa.', tasks: [
      ['Conta única entre as plataformas', 'Professor e aluno entram uma vez e circulam entre Biblioteca e Relatório sem novo login.', 'Transferência concluída.'],
      ['Documentação da integração atual', 'Registrar tabelas, views e funções compartilhadas no Supabase, com quem lê e quem grava cada uma.', 'Acesso ao projeto Supabase.'],
      ['Exportação de dados em formato aberto', 'CSV e JSON de notas, frequência e ocorrências, para a secretaria importar no sistema dela.', 'Banco estável.'],
      ['Importação de turmas e alunos por planilha', 'Receber a lista da escola e criar turmas sem digitação manual. É o maior obstáculo na adoção por uma rede.', 'Banco estável.'],
      ['Estudo do sistema da rede estadual', 'Descobrir qual sistema a SEE do Acre usa, o que ele exporta e o que aceita receber. Define o esforço real de integração.', 'Contato com a secretaria iniciado.'],
      ['API pública documentada', 'Só depois de estável. Chave por instituição, limite de uso, versionamento e documentação com exemplo.', 'Plataformas estáveis.'],
      ['Entrada com conta institucional', 'Google Workspace da escola ou Gov.br, quando a rede exigir identidade oficial.', 'Autenticação estável.'],
      ['Aplicativo Android publicado', 'A pasta android já existe no repositório. Assinar, testar em aparelho real e publicar quando o PWA estiver maduro.', 'PWA estável em produção.']
    ] },
    { id: 'f14', title: 'Registro legal da empresa e da marca', summary: 'Sem CNPJ e sem marca registrada não se vende ao governo nem se protege o nome. O INPI leva cerca de um ano, então esta fase começa cedo.', tasks: [
      ['Busca de anterioridade no INPI', 'Conferir se AXION PROEDUQ já está registrado antes de investir em arte, papelaria e domínio adicional.', 'Nome definido.'],
      ['Decisão de formato jurídico', 'MEI tem teto de faturamento e restrição de atividade. Avaliar ME ou EI com um contador, pensando em contrato público.', 'Busca de anterioridade feita.'],
      ['CNPJ aberto', 'Necessário para emitir nota fiscal e para contratar com o poder público. Sem CNPJ não há proposta.', 'Formato jurídico definido.'],
      ['CNAE correto', 'Desenvolvimento de programas sob encomenda, desenvolvimento e licenciamento de programas customizáveis e suporte técnico. CNAE errado trava licitação.', 'CNPJ em abertura.'],
      ['Conta bancária da empresa', 'Separar completamente da conta pessoal, desde o primeiro centavo.', 'CNPJ aberto.'],
      ['Marca registrada no INPI', 'AXION PROEDUQ nas classes 9, 41 e 42. Protocolar cedo, porque o processo leva cerca de um ano.', 'Busca de anterioridade feita.'],
      ['Contador contratado', 'Regime tributário, emissão de nota e obrigações mensais. Simples Nacional costuma ser o caminho no início.', 'CNPJ aberto.'],
      ['Certidões negativas em dia', 'Federal, estadual, municipal, FGTS e trabalhista. Sem elas o contrato público não é assinado.', 'CNPJ aberto.'],
      ['Cadastro no SICAF', 'Obrigatório para licitação federal e usado como referência por estados e municípios.', 'Certidões em dia.'],
      ['Registro do programa de computador', 'Registro no INPI do código-fonte. Opcional, mas fortalece a proposta e protege a autoria.', 'CNPJ aberto.']
    ] },
    { id: 'f15', title: 'Marketing digital e presença pública', summary: 'Construir a reputação que faz um secretário de educação aceitar a reunião. Conteúdo útil ao professor, não propaganda.', tasks: [
      ['Perfis sociais criados', 'Instagram, LinkedIn e YouTube com o mesmo nome, a mesma arte e a mesma descrição.', 'Identidade visual pronta.'],
      ['Página de empresa no LinkedIn', 'É onde decisor público e gestor de rede costumam conferir se a companhia existe de verdade.', 'Perfis criados.'],
      ['Linha editorial definida', 'Ensinar. Aprender. Evoluir. como eixo. Publicar o que ajuda o professor na segunda-feira, não o que elogia a empresa.', 'Tom de voz definido.'],
      ['Calendário de conteúdo', 'Dois posts por semana: bastidor do desenvolvimento, dica prática para professor e resultado real de uso.', 'Linha editorial definida.'],
      ['Página de imprensa no site', 'Logo em alta resolução, textos prontos, números e contato, para quem for publicar sobre a companhia.', 'Site publicado.'],
      ['Prova social coletada', 'Depoimento de professor e de aluno, com autorização por escrito e sem expor menor de idade.', 'Uso real em andamento.'],
      ['Números de uso apurados', 'Aulas registradas, livros publicados, provas feitas e alunos atendidos, com data de apuração.', 'Painel de uso pronto.'],
      ['Estudo de caso da Casavequia', 'Uma página: o problema, o que foi feito, quanto tempo levou e o que mudou, com números.', 'Números apurados.'],
      ['Apresentação institucional em slides', 'De doze a quinze telas, com versão curta de cinco minutos e versão completa para reunião técnica.', 'Estudo de caso pronto.'],
      ['E-mail de prospecção escrito', 'Curto, com uma frase de valor, um número real e um link de demonstração. Nada de anexo pesado.', 'Apresentação pronta.']
    ] },
    { id: 'f16', title: 'Proposta comercial e estratégia governamental', summary: 'Transformar a plataforma que já funciona em uma escola em contrato com a rede estadual, e depois em escala nacional.', tasks: [
      ['Mapa dos decisores', 'SEE do Acre, coordenações de ensino, núcleos regionais e secretarias municipais. Nome, cargo e caminho até cada um.', 'Dossiê iniciado.'],
      ['Dossiê institucional em PDF', 'Quem é a companhia, o que entrega, prova de uso, segurança, LGPD, suporte e continuidade. É o documento que abre a porta.', 'Identidade e números prontos.'],
      ['Alinhamento com a BNCC e o currículo do Acre', 'Mostrar qual competência cada recurso atende. É a primeira pergunta técnica da secretaria.', 'Dossiê iniciado.'],
      ['Proposta técnica padrão', 'Escopo, requisitos, arquitetura, segurança, prazo de implantação, treinamento e suporte, em modelo reaproveitável.', 'Dossiê pronto.'],
      ['Planilha de preços', 'Por aluno, por escola ou por rede, com faixa de desconto por volume e custo de implantação separado.', 'Custo real calculado.'],
      ['Cálculo de custo e margem por aluno', 'Quanto custa cada aluno em infraestrutura, suporte e IA, para não assinar contrato no prejuízo.', 'Inventário de custos pronto.'],
      ['Piloto gratuito desenhado', 'Uma escola, um bimestre, com metas definidas antes de começar e relatório de resultado no fim.', 'Plataformas estáveis.'],
      ['Relatório de resultado do piloto', 'Frequência, entrega de atividade, desempenho e opinião de professor e aluno, com números e gráfico.', 'Piloto concluído.'],
      ['Caminhos de contratação estudados', 'Dispensa por valor, pregão eletrônico, inexigibilidade por exclusividade e termo de cooperação. Cada um tem exigência diferente.', 'CNPJ aberto.'],
      ['Documentação de habilitação pronta', 'Contrato social, certidões, atestado de capacidade técnica e declarações, em pasta organizada e atualizada.', 'CNPJ e certidões prontos.'],
      ['Atestado de capacidade técnica', 'Pedir à escola onde o sistema já roda. É exigência em quase toda licitação e você já tem o direito a ele.', 'Uso real comprovado.'],
      ['Termo de cooperação com a escola atual', 'Formaliza o que já acontece na Casavequia e na Hermínio, e vira referência para a secretaria.', 'CNPJ aberto.'],
      ['Apresentação para banca técnica', 'Demonstração ao vivo de dez minutos, com plano B em vídeo gravado caso a internet falhe. Sempre falha.', 'Apresentação institucional pronta.'],
      ['Respostas prontas para objeção', 'Preço, segurança do dado do aluno, dependência de internet, treinamento, continuidade se a empresa fechar e quem é o dono do dado.', 'Dossiê pronto.'],
      ['Proposta de escala estadual e nacional', 'O que muda para atender toda a rede: infraestrutura, suporte, treinamento, equipe e custo por faixa de alunos.', 'Piloto validado.']
    ] },
    { id: 'f17', title: 'Passagem para contas comerciais e escala', summary: 'Sair do plano gratuito no momento certo: nem antes de precisar, nem depois de descumprir regra de uso.', tasks: [
      ['Gatilhos de mudança definidos', 'Trocar de plano quando houver contrato assinado, dado de outra rede ou uso perto do limite gratuito. Escrever os três gatilhos.', 'Inventário de contas pronto.'],
      ['Vercel Pro assinada', 'O plano Hobby proíbe uso comercial. Assinar antes do primeiro faturamento, não depois.', 'Gatilho atingido.'],
      ['Supabase Pro assinado', 'Backup de sete dias, mais recursos e suporte. Necessário para sustentar compromisso de contrato.', 'Gatilho atingido.'],
      ['Google Workspace pago', 'E-mail profissional com garantia de disponibilidade e administração de contas da equipe.', 'Gatilho atingido.'],
      ['GitHub Team', 'Quando houver mais de uma pessoa no código, para controle de acesso e revisão obrigatória.', 'Segunda pessoa no time.'],
      ['Orçamento anual de infraestrutura', 'Somar todos os custos e comparar com o preço cobrado por aluno, revisando a cada semestre.', 'Planos contratados.'],
      ['Plano de crescimento da equipe', 'Definir quem entra primeiro: suporte, desenvolvimento ou comercial, e a partir de qual número de escolas.', 'Contrato assinado.'],
      ['Contrato e SLA revisados', 'Disponibilidade prometida, prazo de resposta e penalidade compatíveis com o que a infraestrutura realmente aguenta.', 'Planos contratados.']
    ] }
  ];
  var CONEX_PHASES = [
    { id: 'f01', title: 'Conceito, marca e escopo do produto', summary: 'Fechar o que o CONEX-ED é, o que ele não é e o que entra na primeira versão, antes de qualquer tela ou tabela. Tudo o que vier depois copia daqui.', tasks: [
      ['Conceito do produto registrado', 'Sistema operacional digital da escola: plataforma multi-institucional de gestão, comunicação, documentos, pedagógico e inteligência, com um ambiente isolado por escola. As 92 seções da ideia original estão no mapa mental deste projeto.', 'Nenhuma. É o primeiro bloco.', true],
      ['Nome, assinatura e slogan escolhidos', 'CONEX-ED · Comunidade Organizada em Rede e Extensão Escolar · Plataforma Integrada de Gestão, Comunicação e Inteligência Escolar · by AXION PROEDUQ. Slogan: Toda a escola conectada, organizada e inteligente.', 'Conceito registrado.', true],
      ['Encaixe na arquitetura de marca da AXION', 'Produto com nome próprio e selo uma plataforma AXION PROEDUQ, igual à Biblioteca e ao Relatório. CONEX-ED substitui o nome reservado Conecta; atualizar a lista de nomes reservados do projeto AXION.', 'Nome escolhido.'],
      ['Busca de anterioridade no INPI', 'Pesquisar CONEX, CONEX-ED e CONEXED nas classes 9, 35, 41 e 42. Conex é palavra comum no mercado; se houver conflito forte, ajustar o nome agora, antes de gastar com arte e domínio.', 'Nome escolhido.'],
      ['Domínio verificado e registrado', 'Conferir conexed.com.br, conex-ed.com.br e conexed.app no Registro.br. Registrar em nome da companhia, com renovação automática. O hífen dificulta ditar o endereço; preferir a grafia sem hífen para o domínio.', 'Busca no INPI sem conflito.'],
      ['Frase de posicionamento comercial', 'O CONEX-ED é a plataforma institucional da AXION PROEDUQ para gestão, comunicação, documentação, colaboração e inteligência escolar. Linha de apoio: Gestão. Comunicação. Documentos. Pedagógico. Inteligência. Um único ambiente.', 'Nome escolhido.'],
      ['Papel do CONEX-ED no ecossistema', 'Relatório cuida da rotina do professor, Biblioteca da aprendizagem do aluno, SIMAED dos dados de avaliação e o CONEX-ED é a camada institucional que conecta tudo. Escrever isso em uma página e usar em todo material.', 'Posicionamento definido.'],
      ['Escopo do MVP travado', 'Fase 1 do plano: Axion ID, cadastro de escolas, usuários, cargos, permissões, perfis, avisos com ciência, documentos com pastas, calendário, logs e painel básico. Todo o resto espera o piloto.', 'Conceito registrado.'],
      ['Lista do que NÃO entra no MVP', 'Mensagens, finanças, patrimônio, IA, SIMAED, app nativo e portais. Deixar escrito evita o erro que a própria ideia aponta: lançar um sistema gigantesco de uma vez.', 'Escopo do MVP travado.'],
      ['Métricas de sucesso do piloto', 'Exemplos: 80% da equipe da escola com conta ativa, avisos com ciência substituindo o grupo de WhatsApp, nenhum documento oficial circulando fora da plataforma em 60 dias.', 'Escopo do MVP travado.']
    ] },
    { id: 'f02', title: 'Descoberta com a escola e requisitos', summary: 'Ouvir direção, coordenação, secretaria e professores antes de desenhar. O CONEX-ED precisa resolver a rotina real da escola, não a imaginada.', tasks: [
      ['Escola piloto definida', 'E.E. Rural Pe. Carlos Casavequia como primeira escola: já usa o Relatório e a Biblioteca, então testa a integração desde o início.', 'Escopo do MVP travado.'],
      ['Autorização formal da direção', 'Termo simples dizendo que a escola aceita testar a plataforma, quem é o responsável e que os dados continuam da escola.', 'Escola piloto definida.'],
      ['Entrevistas por função', 'Direção, coordenação, secretaria, dois professores e um mediador. Perguntar como avisam, onde guardam documentos, o que se perde e o que mais toma tempo.', 'Autorização da direção.'],
      ['Mapa dos processos atuais', 'Desenhar como hoje funcionam aviso, entrega de plano, pedido de material, declaração, ata e calendário. Marcar onde há papel, WhatsApp e e-mail pessoal.', 'Entrevistas feitas.'],
      ['Lista oficial de cargos e setores', 'Levantar os cargos reais da escola e da rede estadual (direção, coordenação, secretaria, professores, mediadores, assistentes, apoio) para virar a semente de cargos padrão.', 'Entrevistas feitas.'],
      ['Estrutura de pastas usada hoje', 'Como a escola organiza documentos (Gestão, Coordenação, Secretaria, Pedagógico, Financeiro, Projetos, Professores, Atas, Relatórios). Vira o modelo de pastas criado para cada escola nova.', 'Mapa dos processos.'],
      ['Tipos de documento e classificação', 'Listar cada tipo de documento e a classificação dele: público institucional, interno, restrito ou confidencial. É a base das permissões automáticas.', 'Estrutura de pastas levantada.'],
      ['Histórias de usuário do MVP', 'Uma frase por necessidade: como coordenação, quero publicar aviso só para professores da 2ª série e ver quem confirmou ciência. Priorizar em deve, deveria e poderia.', 'Mapa dos processos.'],
      ['Protótipo navegável em papel ou Figma', 'Central, Comunidade, Avisos, Documentos e Calendário. Mostrar para a coordenação e para um professor e corrigir antes de programar.', 'Histórias priorizadas.'],
      ['Requisitos não funcionais', 'Funcionar em celular simples e internet rural instável, carregar a central em menos de 3 segundos em 4G, acessibilidade básica e modo escuro.', 'Entrevistas feitas.']
    ] },
    { id: 'f03', title: 'Arquitetura técnica e decisões', summary: 'Decidir as fundações que não podem mudar depois: isolamento entre escolas, conta única, permissões e onde cada coisa roda.', tasks: [
      ['Registro de decisões técnicas (ADR)', 'Pasta docs/decisoes/ no repositório, um arquivo por decisão com contexto, opções e escolha. Preserva o porquê para quem vier depois.', 'Escopo do MVP travado.'],
      ['Stack definida', 'Manter o padrão do ecossistema: HTML e JavaScript sem framework, módulos em assets/js, build simples para dist/ e Supabase no navegador. Reaproveita supabase-report-sync.js, a tela de conta e a experiência já testada no Relatório.', 'ADR criado.'],
      ['Supabase compartilhado para o Axion ID', 'Usar o mesmo projeto vgceathgwvtmjxbdpecr do Relatório e da Biblioteca, para que uma conta só entre nos três produtos. Tabelas do produto em um schema próprio (conex), sem misturar com relatorio_* e alunos.', 'Stack definida.'],
      ['Modelo multi-tenant desde o primeiro dia', 'Toda tabela do CONEX-ED tem escola_id obrigatório, índice por escola_id e RLS que só libera linhas das escolas em que o usuário tem vínculo ativo. Nenhuma consulta sem escola.', 'Supabase escolhido.'],
      ['Modelo de permissões RBAC + granular', 'Três níveis visuais (operacional, administrativo, gestão) sobre um catálogo de permissões (visualizar_financas, publicar_avisos, aprovar_planos, gerenciar_usuarios, visualizar_auditoria...). Cargo agrupa permissões; o vínculo aceita permissão extra ou retirada.', 'Modelo multi-tenant definido.'],
      ['Função única de autorização', 'private.conex_pode(escola_id, permissao) usada por toda RLS, Edge Function e pela IA. Uma regra em um só lugar evita brecha entre telas.', 'Modelo de permissões definido.'],
      ['Separação perfil profissional x institucional', 'Perfil profissional acompanha a pessoa (formação, áreas, certificações escolhidas); perfil institucional existe só dentro da escola (cargo, setor, turmas, horários, documentos). Tabelas distintas.', 'Modelo multi-tenant definido.'],
      ['Diagrama do banco da Fase 1', 'escolas, escola_config, setores, cargos, cargo_permissoes, vinculos, vinculo_permissoes, perfis_profissionais, avisos, aviso_destinatarios, aviso_ciencia, pastas, documentos, documento_versoes, eventos, auditoria.', 'Permissões e perfis definidos.'],
      ['Armazenamento de arquivos', 'Supabase Storage com bucket privado e caminho escola_id/pasta/arquivo, políticas de Storage usando a mesma função de autorização. Conferir limites do plano (1 GB grátis) e custo do plano Pro para documentos.', 'Diagrama do banco.'],
      ['Axion API desenhada', 'Camada de Edge Functions que expõe só dados autorizados entre produtos (Relatório → CONEX-ED, Biblioteca → CONEX-ED). Nenhum produto lê tabela do outro diretamente.', 'Supabase escolhido.'],
      ['Estratégia de login entre domínios', 'Sessão do Supabase é por domínio. Opção 1: mesma conta, login em cada site. Opção 2: tela central em conta.axionproeduq.com.br que devolve a sessão por redirecionamento. Começar pela opção 1 e deixar a 2 para depois do piloto.', 'Supabase escolhido.'],
      ['Plano de custos da infraestrutura', 'Somar Supabase, Vercel, domínio, e-mail transacional e IA por escola. Lembrar que o plano Hobby da Vercel proíbe uso comercial: a troca para Pro vem antes da primeira escola pagante.', 'Stack e armazenamento definidos.']
    ] },
    { id: 'f04', title: 'Repositório, ambientes e Vercel', summary: 'Montar a esteira que leva o código do computador ao ar com segurança: repositório, prévia por alteração e produção no domínio próprio.', tasks: [
      ['Repositório conex-ed criado', 'Na organização axion-proeduq do GitHub (ou na conta atual até a transferência), com README, licença proprietária, .gitignore e .editorconfig.', 'Stack definida.'],
      ['Estrutura de pastas inicial', 'index.html (site), entrar.html, app/ (páginas logadas), assets/js, assets/css, assets/marca, supabase/ (SQL numerado por etapa), scripts/ e docs/.', 'Repositório criado.'],
      ['Proteção da branch main', 'Commits diretos permitidos como no Relatório, mas com checagem automática obrigatória antes do deploy de produção.', 'Repositório criado.'],
      ['Script de build para dist/', 'Igual ao scripts/build-web-release.js do Relatório: lista explícita do que é publicado. Página nova só vai ao ar se entrar na lista.', 'Estrutura de pastas.'],
      ['Projeto na Vercel ligado ao GitHub', 'Novo projeto conex-ed no time da companhia, com build npm run build e saída dist/. Cada push na main publica; cada branch ganha prévia.', 'Build pronto.'],
      ['vercel.json ou vercel.ts com cabeçalhos', 'Content-Security-Policy, X-Frame-Options, Referrer-Policy, Permissions-Policy e cache longo para assets versionados. Sem cache para HTML.', 'Projeto na Vercel.'],
      ['Variáveis de ambiente por ambiente', 'URL e chave pública do Supabase em Production e Preview. Chave service_role nunca vai para o navegador nem para a Vercel; fica só nos segredos das Edge Functions.', 'Projeto na Vercel.'],
      ['Domínio próprio conectado', 'Apontar o domínio escolhido para a Vercel, com www redirecionando para a raiz e certificado automático. Conferir DNS em um painel só.', 'Domínio registrado.'],
      ['Ambiente de teste separado', 'Escola fictícia Escola Demonstração com dados inventados, usada em prévias, capturas de tela e demonstrações. Nenhum nome real de aluno ou servidor.', 'Projeto na Vercel.'],
      ['Checagem automática no push', 'GitHub Action com lint, verificação de sintaxe dos JS e teste das políticas RLS antes do deploy de produção.', 'Repositório e testes RLS existentes.']
    ] },
    { id: 'f05', title: 'Supabase: fundação do banco multi-tenant', summary: 'Criar o núcleo do banco com isolamento entre escolas testado. Esta é a fase que mais protege a companhia: um vazamento entre escolas acaba com o produto.', tasks: [
      ['Schema conex criado', 'CREATE SCHEMA conex, com permissões explícitas para authenticated e nada para anon. Expor o schema na API do Supabase.', 'Arquitetura aprovada.'],
      ['Tabelas de instituição', 'escolas (nome, slug, cidade, UF, INEP, identidade visual), escola_config e setores. SQL em supabase/AAAA-MM-DD-conex-etapa1.sql, como no Relatório.', 'Schema criado.'],
      ['Cargos e catálogo de permissões', 'permissoes (catálogo fixo), cargos por escola com nível 1, 2 ou 3, cargo_permissoes. Semente com os cargos padrão levantados na descoberta.', 'Tabelas de instituição.'],
      ['Vínculos com permissões independentes', 'vinculos (user_id, escola_id, cargo_id, setor, início, fim, ativo) e vinculo_permissoes (concedida ou retirada). A mesma pessoa pode ter vínculos em várias escolas.', 'Cargos criados.'],
      ['Função private.conex_pode', 'SECURITY DEFINER, search_path fixo, resultado estável por requisição. Verifica vínculo ativo, cargo e exceções do vínculo.', 'Vínculos criados.'],
      ['RLS em todas as tabelas', 'Ativar RLS e escrever políticas de select, insert, update e delete usando conex_pode. Nenhuma tabela do schema sem política.', 'Função de autorização.'],
      ['Testes de isolamento entre escolas', 'Criar duas escolas de teste e provar que usuário da Escola A não lê, não altera e não descobre nem a existência de dados da Escola B. Rodar a cada alteração de SQL.', 'RLS escrita.'],
      ['Tabela de auditoria só de inclusão', 'conex.auditoria (quem, escola, ação, alvo, antes, depois, quando, IP). Sem UPDATE nem DELETE para ninguém, como a relatorio_lixeira.', 'Schema criado.'],
      ['Gatilhos de auditoria', 'Gatilho genérico nas tabelas sensíveis registrando cada alteração de vínculo, permissão, documento e aviso.', 'Tabela de auditoria.'],
      ['Lixeira e histórico permanentes', 'Mesma regra da Etapa 10 do Relatório: nada é apagado de verdade; toda linha removida vai antes para a lixeira do produto.', 'Tabela de auditoria.'],
      ['Índices e desempenho', 'Índice em escola_id e nas chaves usadas pela RLS. Conferir com EXPLAIN que as consultas da central não fazem varredura completa.', 'RLS escrita.'],
      ['Security Advisor do Supabase limpo', 'Rodar o verificador de segurança e desempenho do painel e zerar os alertas antes de seguir.', 'Todas as tabelas com RLS.']
    ] },
    { id: 'f06', title: 'Axion ID: conta única do ecossistema', summary: 'Uma conta só para CONEX-ED, Relatório, Biblioteca e produtos futuros, com cada vínculo institucional separado da vida profissional.', tasks: [
      ['Conta Axion sobre o auth do Supabase', 'Aproveitar auth.users e profiles já usados pelo Relatório e pela Biblioteca. Nenhuma tabela nova de senha.', 'Supabase compartilhado decidido.'],
      ['Perfil profissional', 'conex.perfis_profissionais: nome de exibição, foto, formação, áreas, disciplinas, experiência e certificações que a própria pessoa escolher mostrar.', 'Conta Axion definida.'],
      ['Tela de conta reaproveitada', 'Entrar, criar conta, esqueci a senha e Google, com a identidade do CONEX-ED. Mesma trava de segurança do profiles_trava_role, para ninguém se promover a admin.', 'Perfil profissional.'],
      ['Seletor de escola', 'Depois do login, lista os vínculos ativos (Escola Pe. Carlos Casavequia · Professor). Com um vínculo só, entra direto. A escola escolhida vai para a URL e para a sessão.', 'Vínculos criados.'],
      ['Convite por e-mail', 'Gestão convida por e-mail com cargo pré-definido; quem já tem Conta Axion só aceita o vínculo, sem criar outra conta.', 'Seletor de escola.'],
      ['Autenticação em dois fatores', 'MFA por aplicativo autenticador, obrigatório para nível 3 e para quem tem permissão financeira ou de usuários.', 'Tela de conta.'],
      ['Sessões e dispositivos', 'Lista de sessões ativas com botão de encerrar, tempo máximo de sessão e saída que apaga as cópias locais do aparelho, como no Meu Diário.', 'Tela de conta.'],
      ['Redirect URLs cadastradas', 'Incluir o domínio do CONEX-ED e as prévias da Vercel em Authentication, URL Configuration do Supabase, sem remover as do Relatório e da Biblioteca.', 'Domínio conectado.'],
      ['Menu Meus produtos AXION', 'No avatar do usuário, atalhos para CONEX-ED, Relatório e Biblioteca, aparecendo só o que a conta pode usar.', 'Seletor de escola.'],
      ['Encerramento de vínculo', 'Quando a pessoa sai da escola, o vínculo é encerrado com data, o acesso some na hora e o histórico institucional continua com a escola.', 'Vínculos criados.']
    ] },
    { id: 'f07', title: 'Site público e identidade visual do CONEX-ED', summary: 'A vitrine que apresenta o produto a diretores e secretarias, no mesmo nível de acabamento do RELATORIO SKIN.', tasks: [
      ['Paleta e tipografia próprias', 'Identidade distinta do RELATORIO SKIN e da Biblioteca, mas da mesma família AXION. Contraste mínimo de 4.5:1 e versão para modo escuro.', 'Marca aprovada.'],
      ['Logotipo e ícone', 'Logo horizontal, símbolo quadrado, favicon, apple-touch-icon, ícones PWA 192/512 e maskable, em webp e png para o hub de projetos.', 'Paleta definida.'],
      ['Hero do site', 'CONEX-ED, slogan, parágrafo de posicionamento e dois botões: Conhecer a plataforma e Solicitar demonstração.', 'Logo pronto.'],
      ['Seções dos módulos', 'Comunidade, Avisos e ciência, CONEX Arquivos, Pedagógico, Calendário e Intelligence, cada uma com captura da Escola Demonstração.', 'Hero pronto.'],
      ['Seção Ecossistema AXION', 'Diagrama AXION ID ligando CONEX-ED (escola), Relatório (professor), Biblioteca (aluno) e SIMAED (avaliação), com o fluxo ideal do ciclo pedagógico.', 'Papel no ecossistema escrito.'],
      ['Seção Segurança e LGPD', 'Isolamento entre escolas, permissões, auditoria, dados no Brasil ou onde estiverem, e a regra de que a IA só vê o que o usuário pode ver.', 'Arquitetura de segurança pronta.'],
      ['Formulário de demonstração', 'Nome, escola, cargo, cidade e e-mail, com proteção antispam, gravando em tabela própria e avisando o e-mail comercial.', 'Supabase pronto.'],
      ['Política de Privacidade e Termos', 'Documentos próprios do CONEX-ED no padrão dos do Relatório, com o papel da escola como controladora e da AXION como operadora.', 'LGPD mapeada.'],
      ['SEO e compartilhamento', 'title, description, Open Graph com imagem, sitemap.xml, robots.txt e página rápida (Lighthouse acima de 90).', 'Site montado.'],
      ['Animações com moderação', 'Revelação na rolagem e transições respeitando prefers-reduced-motion, como no site do RELATORIO SKIN.', 'Site montado.']
    ] },
    { id: 'f08', title: 'Integração ao ecossistema AXION PROEDUQ', summary: 'Fazer o CONEX-ED aparecer como irmão da Biblioteca e do Relatório: mesma companhia, mesma conta, mesmo cuidado.', tasks: [
      ['Cartão na página institucional', 'Adicionar o CONEX-ED em axion-proeduq.html na seção Plataformas, com logo, uma linha e situação em breve. Rodar node scripts/check-copias-compartilhadas.js --copiar e fazer commit nos dois repositórios.', 'Logo pronto.'],
      ['Selo uma plataforma AXION PROEDUQ', 'Rodapé do site e do app com a marca AXION, visível no site e discreta dentro do app, como no Relatório.', 'Site montado.'],
      ['Link cruzado com Relatório e Biblioteca', 'Menu Meus produtos e rodapés apontando para relatorio.skin e biblioteca-ac.com, e os dois apontando de volta.', 'Menu Meus produtos pronto.'],
      ['Mesmas regras legais', 'Política e Termos da companhia citando o CONEX-ED como produto, e a seção de serviços terceiros atualizada quando entrar IA ou e-mail transacional.', 'Documentos legais prontos.'],
      ['E-mails transacionais com a marca', 'Convite, confirmação de conta e recuperação de senha com o cabeçalho do CONEX-ED e a logo AXION, no mesmo modelo de e-mail já usado.', 'Tela de conta pronta.'],
      ['Documentação no CLAUDE.md do produto', 'CLAUDE.md próprio do repositório conex-ed com arquitetura, tabelas, regras fixas e fluxo de publicação, e uma seção curta no CLAUDE.md do Relatório sobre a integração.', 'Repositório criado.'],
      ['Projeto atualizado no hub pessoal', 'Trocar o status deste projeto de Ideia para Desenvolvimento, preencher links de GitHub, Supabase e Vercel e o domínio definitivo.', 'Repositório e Vercel prontos.'],
      ['Inventário de contas da companhia', 'Registrar domínio, projeto Vercel, buckets e custos do CONEX-ED na planilha de contas da AXION.', 'Infraestrutura criada.']
    ] },
    { id: 'f09', title: 'Fase 1 do app: escola, pessoas e permissões', summary: 'O núcleo administrativo: cadastrar a escola, a equipe, os cargos e mostrar a cada pessoa uma central diferente.', tasks: [
      ['Cadastro de escola (onboarding)', 'Assistente em passos: dados da escola, identidade visual, setores, cargos padrão e primeiro gestor. Cria as pastas modelo automaticamente.', 'Fundação do banco pronta.'],
      ['Gestão de usuários', 'Lista da equipe com filtros, convite, troca de cargo, suspensão e encerramento de vínculo, tudo auditado.', 'Convite por e-mail pronto.'],
      ['Editor de cargos e permissões', 'Tela da gestão para criar cargo, escolher nível e marcar permissões, com prévia do que o cargo passa a ver.', 'Catálogo de permissões.'],
      ['Permissão pontual por pessoa', 'Conceder uma permissão específica sem mudar o cargo (professor responsável por projeto financeiro), com prazo opcional.', 'Editor de cargos.'],
      ['Central personalizada', 'Boa tarde, Paulo. Escola selecionada, e cartões do dia: avisos novos, documentos para ciência, eventos próximos, pendências. Cada cargo vê indicadores próprios.', 'Avisos e documentos com dados.'],
      ['Comunidade', 'Diretório da equipe com filtros por Direção, Coordenação, Secretaria, Professores, Mediadores, Assistentes e Apoio. Perfil com cargo, disciplinas, contato institucional e produções públicas.', 'Perfis prontos.'],
      ['Organograma digital', 'Gerado a partir de setores e cargos, com cada setor clicável levando às pessoas dele.', 'Comunidade pronta.'],
      ['Identidade visual da escola', 'Logo e cor de destaque da escola aplicadas no cabeçalho do ambiente dela, sem alterar a marca do CONEX-ED.', 'Onboarding pronto.'],
      ['Modo escuro e responsivo', 'Tokens de cor com versão escura e telas testadas em 360 px de largura.', 'Telas básicas prontas.']
    ] },
    { id: 'f10', title: 'Fase 1 do app: avisos, ciência e calendário', summary: 'Substituir o grupo informal de mensagens por comunicação oficial com destinatário certo e confirmação registrada.', tasks: [
      ['Publicação de aviso', 'Título, texto, anexos, prioridade e validade. Só quem tem publicar_avisos vê o botão; a RLS confere de novo no banco.', 'Permissões prontas.'],
      ['Seleção de destinatários', 'Marcar por cargo, setor, etapa, série, disciplina ou pessoas específicas (apenas professores da 2ª série; só coordenação e direção). Mostrar quantas pessoas vão receber antes de enviar.', 'Publicação de aviso.'],
      ['Confirmação de ciência', 'Botão Li e estou ciente com data e hora gravadas e imutáveis. Painel: 51 destinatários, 48 visualizaram, 43 confirmaram, lista de quem falta.', 'Destinatários prontos.'],
      ['Lembrete para quem não confirmou', 'Botão de reenviar lembrete só para os pendentes, com limite de frequência.', 'Confirmação de ciência.'],
      ['Feed institucional', 'Linha do tempo com avisos, documentos publicados e eventos, com finalidade profissional. Comentários ficam para a Fase 2.', 'Avisos publicados.'],
      ['Calendários por camada', 'Minha agenda, Meu setor, Pedagógico, Administrativo e Institucional, cada evento com visibilidade própria.', 'Permissões prontas.'],
      ['Tipos de evento', 'Provas, reuniões, conselhos, planejamentos, feriados, eventos, entrega de notas e projetos, com cor e ícone.', 'Calendários criados.'],
      ['Tempo real', 'Realtime do Supabase para aviso novo e ciência chegarem sem recarregar, reaproveitando o padrão de aviso leve do Relatório (só o sinal, sem dados).', 'Avisos publicados.'],
      ['Notificação por e-mail', 'Resumo diário opcional dos avisos não lidos, com link direto. Push fica para a fase do app.', 'E-mails transacionais prontos.']
    ] },
    { id: 'f11', title: 'Fase 1 do app: CONEX Arquivos', summary: 'O drive institucional com classificação, versões e registro de quem viu, que faz a escola parar de pedir o mesmo arquivo várias vezes.', tasks: [
      ['Árvore de pastas por escola', 'Pastas modelo (Gestão, Coordenação, Secretaria, Pedagógico, Financeiro, Projetos, Professores, Atas, Relatórios), com criação, renomeação e movimentação.', 'Storage configurado.'],
      ['Envio de arquivos', 'Arrastar e soltar, vários arquivos, barra de progresso e limite de tamanho por plano. Arquivo vai para escola_id/pasta no bucket privado.', 'Árvore de pastas.'],
      ['Classificação obrigatória', 'Público institucional, interno, restrito ou confidencial, com a permissão calculada a partir dela e da pasta. Confidencial exige permissão explícita.', 'Envio de arquivos.'],
      ['Metadados do documento', 'Proprietário, autor, versão, data, última alteração, responsáveis e permissões visíveis em um painel lateral.', 'Envio de arquivos.'],
      ['Histórico de versões', 'Nunca sobrescrever: cada envio vira nova versão (v1 04/03, v2 17/04). Visualizar, restaurar e ver o autor de cada uma.', 'Metadados prontos.'],
      ['Links temporários', 'Download por URL assinada de curta duração. Nenhum arquivo com link público permanente, salvo os marcados como públicos.', 'Classificação pronta.'],
      ['Registro de visualização e download', 'Cada abertura e download entra na auditoria. O dono vê quem acessou.', 'Auditoria pronta.'],
      ['Busca por nome e metadados', 'Busca tradicional com filtros por pasta, tipo, classificação e data. A busca semântica chega na fase de IA.', 'Metadados prontos.'],
      ['Pré-visualização', 'PDF e imagens abrem no navegador sem baixar; DOCX e planilhas mostram prévia simples.', 'Envio de arquivos.']
    ] },
    { id: 'f12', title: 'Segurança, auditoria e LGPD antes do piloto', summary: 'Nada vai para uma escola real sem esta fase. O CONEX-ED guarda dado funcional de servidores e, depois, de alunos.', tasks: [
      ['Tela de auditoria', 'Filtros por pessoa, ação, período e documento: Maria alterou Plano 2026 às 13:42. Só quem tem visualizar_auditoria entra, e ninguém apaga.', 'Gatilhos de auditoria.'],
      ['Limite de requisições', 'Rate limiting em login, convite, envio de arquivo e formulário de demonstração, para barrar abuso e força bruta.', 'Telas prontas.'],
      ['Política de senhas e recuperação', 'Mínimo de 8 com letras e números (como no Relatório), bloqueio progressivo após erros e recuperação só pelo e-mail cadastrado.', 'Tela de conta.'],
      ['Teste de invasão entre escolas', 'Tentar pela chave pública e pelo console do navegador ler dados de outra escola, trocar escola_id em requisições e acessar arquivos por caminho. Registrar o resultado.', 'RLS e Storage prontos.'],
      ['Backup e restauração testados', 'Conferir o backup diário do Supabase e fazer uma restauração de teste. Backup que nunca foi restaurado não conta.', 'Banco com dados de teste.'],
      ['Inventário de dados pessoais', 'Para cada dado: finalidade, base legal, quem acessa, tempo de guarda e onde fica. Privacy by design, como a ideia pede.', 'Diagrama do banco.'],
      ['Acordo de tratamento com a escola', 'Documento em que a escola é controladora e a AXION operadora, com obrigações, subprocessadores (Supabase, Vercel) e incidente.', 'Inventário de dados.'],
      ['Direitos do titular', 'Servidor pode ver e baixar os próprios dados e pedir correção. Exclusão respeitando a guarda obrigatória de documentos públicos.', 'Inventário de dados.'],
      ['Plano de resposta a incidente', 'Quem avisa quem, em quanto tempo, e o texto-modelo para a escola e para a ANPD.', 'Acordo de tratamento.'],
      ['Monitoramento de erros', 'Captura de erro no navegador e nas Edge Functions com aviso por e-mail, sem registrar dados pessoais no log.', 'App publicado em prévia.']
    ] },
    { id: 'f13', title: 'Piloto na escola e lançamento do MVP', summary: 'Colocar a Fase 1 na mão da equipe da Casavequia, medir, corrigir e só então abrir para outras escolas.', tasks: [
      ['Carga inicial da escola', 'Cadastrar setores, cargos e convidar a equipe. Subir os documentos principais já classificados.', 'Fase 1 pronta e segurança aprovada.'],
      ['Treinamento curto por função', 'Encontro de 30 minutos com gestão e outro com professores, mais um vídeo de 3 minutos por módulo.', 'Carga inicial feita.'],
      ['Guia rápido em uma página', 'Como entrar, confirmar ciência, achar um documento e ver o calendário. PDF e página dentro do app.', 'Treinamento preparado.'],
      ['Canal de suporte do piloto', 'E-mail de suporte e formulário dentro do app, com prazo de resposta combinado.', 'E-mail comercial pronto.'],
      ['Primeiro aviso oficial pela plataforma', 'Direção publica um comunicado real com ciência obrigatória. Marco do início do piloto.', 'Equipe com conta.'],
      ['Acompanhamento semanal', 'Medir contas ativas, avisos, ciências, documentos e dúvidas. Conversa de 15 minutos com a coordenação toda semana.', 'Piloto iniciado.'],
      ['Correções do piloto', 'Lista priorizada do que atrapalhou o uso, resolvida antes de qualquer módulo novo.', 'Acompanhamento semanal.'],
      ['Avaliação de 60 dias', 'Comparar com as métricas de sucesso definidas no começo e decidir: seguir para a Fase 2, ajustar ou repensar.', 'Correções feitas.'],
      ['Depoimento e caso de uso', 'Com autorização da direção, registrar o resultado do piloto para o site e para a proposta a outras escolas.', 'Avaliação positiva.']
    ] },
    { id: 'f14', title: 'Fase 2: colaboração e processos', summary: 'Com a fundação validada, entram mensagens, tarefas, aprovações, protocolos e formulários, transformando o CONEX-ED em plataforma de rotina.', tasks: [
      ['Mensagens internas', 'Conversas individuais, por setor, grupo, turma, projeto e comissão, com Realtime, anexos e confirmação de leitura.', 'Piloto aprovado.'],
      ['Comentários em avisos e documentos', 'Discussão no próprio item, com menção de pessoas e notificação.', 'Mensagens prontas.'],
      ['Tarefas e quadros', 'Tarefa com responsável, prazo e prioridade; quadros A fazer, Em andamento, Revisão, Concluído por projeto.', 'Piloto aprovado.'],
      ['Fluxos de aprovação de documentos', 'Professor envia, coordenação revisa, aprova e arquiva, com cada etapa registrada e a versão aprovada travada.', 'Versões de documento.'],
      ['Protocolos numerados', 'CONEX-AAAA-00000 por escola, com status Recebido, Em análise, Aprovado, Concluído. Tipos: manutenção, compras, documentos, materiais, declarações.', 'Fluxos de aprovação.'],
      ['Formulários sem programação', 'A escola monta formulários (solicitação de material: nome, setor, item, quantidade, justificativa) e escolhe o fluxo que segue depois do envio.', 'Protocolos prontos.'],
      ['Construtor de fluxos básico', 'Quando formulário X for enviado: enviar para coordenação, se aprovado enviar para direção, notificar solicitante.', 'Formulários prontos.'],
      ['Assinatura interna e ciência', 'Aprovação e validação internas com registro. Deixar claro na tela que não equivale a assinatura digital ICP-Brasil.', 'Fluxos de aprovação.'],
      ['Reuniões e Livro de Decisões', 'Página por reunião (pauta, participantes, documentos, ata, decisões, tarefas) e registro permanente das decisões institucionais com responsável e origem.', 'Tarefas prontas.'],
      ['Automações simples', 'Documento perto de vencer avisa o responsável; plano enviado avisa a coordenação; aprovado arquiva sozinho.', 'Construtor de fluxos.']
    ] },
    { id: 'f15', title: 'Fase 3: pedagógico e integração com Relatório e Biblioteca', summary: 'Ligar o CONEX-ED aos outros produtos pela Axion API, sempre com o professor decidindo o que compartilha.', tasks: [
      ['CONEX Pedagógico', 'Planos de curso, planos de aula compartilhados, sequências, matrizes curriculares, habilidades, componentes, turmas, projetos e avaliações da escola.', 'Fase 2 estável.'],
      ['Axion API: primeira Edge Function', 'Função relatorio-para-conex que devolve só os dados autorizados do professor para a escola do vínculo, conferindo conex_pode e o consentimento.', 'Axion API desenhada.'],
      ['Consentimento do professor', 'No Relatório (Meu Diário e contas do admin), tela para escolher o que a escola pode ver: contador, planos, sequências, relatórios, certificados. Revogável a qualquer momento.', 'Primeira Edge Function.'],
      ['Contador de aulas na coordenação', 'Previstas, ministradas, restantes, média semanal e projeção de conclusão por professor e disciplina, lidos do Relatório sem acessar a conta privada.', 'Consentimento pronto.'],
      ['Currículo x aulas realizadas', 'Comparar conteúdos planejados com os registrados nos relatos: currículo estimado 74%, carga horária 71%, 24 de 32 conteúdos trabalhados.', 'Contador integrado.'],
      ['Documentos pedagógicos no perfil', 'Planos e sequências compartilhados pelo professor aparecem no perfil dele no CONEX-ED, sem pedir o arquivo de novo.', 'Consentimento pronto.'],
      ['Webhooks entre produtos', 'Plano aprovado no CONEX-ED chega ao Relatório; relato publicado atualiza o painel da coordenação. Eventos com assinatura e nova tentativa.', 'Axion API ativa.'],
      ['Biblioteca Digital recomendando conteúdos', 'Para o plano da semana, sugerir livros, atividades e quizzes da Biblioteca ligados à habilidade. O professor escolhe usar ou não.', 'Currículo integrado.'],
      ['Progresso agregado dos alunos', 'Só dados agregados por turma (acessos, tempo médio, média de quiz), nunca o aluno individual para quem não é professor dele.', 'Integração com a Biblioteca.'],
      ['Turmas em comum', 'Ligar as turmas do CONEX-ED a relatorio_turmas e às turmas da Biblioteca, na mesma lógica de vínculo por escola e série já usada.', 'CONEX Pedagógico pronto.']
    ] },
    { id: 'f16', title: 'Fase 4: CONEX Intelligence (IA)', summary: 'IA que pergunta, analisa e automatiza, sempre citando a fonte e nunca enxergando além das permissões do usuário.', tasks: [
      ['Regra de ouro da IA', 'Usuário → permissões → dados autorizados → IA. Toda busca de contexto passa por conex_pode antes de chegar ao modelo. Nunca IA com acesso ao banco inteiro.', 'Fase 3 estável.'],
      ['Extração de texto dos documentos', 'PDF, DOCX e planilhas convertidos em texto por página no envio, guardados com escola_id e classificação.', 'CONEX Arquivos pronto.'],
      ['Pesquisa semântica com pgvector', 'Embeddings por trecho em tabela com RLS por escola. Documento que fala sobre recuperação no terceiro bimestre acha o arquivo mesmo sem essas palavras no título.', 'Extração de texto.'],
      ['Rastreabilidade obrigatória', 'Toda resposta mostra a fonte: Plano de Curso 2026, página 42. Sem fonte, a IA diz que não encontrou.', 'Pesquisa semântica.'],
      ['Assistente CONEX IA', 'Chat que responde quem ainda não enviou o plano de setembro, qual documento define o calendário de avaliações, resumo das três últimas atas.', 'Rastreabilidade pronta.'],
      ['Planos de curso inteligentes', 'A coordenação envia um documento de 180 páginas; a IA separa por componente, série e bimestre e entrega a cada professor só as páginas dele, com aviso automático.', 'Extração de texto.'],
      ['IA para documentos', 'Resumir, comparar versões, extrair prazos e responsáveis, sugerir pasta e classificação, achar duplicidades. Documento oficial continua com validação humana.', 'Assistente pronto.'],
      ['Atas a partir de áudio', 'Reunião autorizada: áudio, transcrição, ata preliminar com participantes, decisões, responsáveis e prazos. Alguém revisa antes de publicar.', 'Reuniões prontas.'],
      ['Resumo semanal e alertas', 'Toda segunda, resumo para direção e coordenação; alertas de vencimento, orçamento e execução curricular, sempre com a origem do dado.', 'Assistente pronto.'],
      ['Provedores e cotas', 'Reaproveitar a fila de chaves de _comum/ia.ts da Biblioteca e a cota diária por conta (ia_consumir_cota), com limite por escola e por plano.', 'Regra de ouro definida.'],
      ['Privacidade no envio à IA', 'Pseudonimizar nomes antes de enviar ao modelo, como já feito nas ocorrências do Relatório, e registrar na política quais provedores recebem texto.', 'Provedores definidos.'],
      ['IA não julga pessoas', 'A IA apresenta evidências e indicadores; não classifica professor como bom ou ruim. Escrever isso no prompt e na política.', 'Assistente pronto.']
    ] },
    { id: 'f17', title: 'Fase 5: integração com o SIMAED', summary: 'Só depois de confirmar o caminho oficial de acesso aos dados. Aqui nasce o ciclo completo: avaliação, currículo, intervenção e nova medida.', tasks: [
      ['Levantamento oficial do SIMAED', 'Consultar a Secretaria de Educação sobre API, exportação ou importação autorizada. Não fazer raspagem de tela nem usar credencial de outra pessoa.', 'Fase 4 estável.'],
      ['Autorização por escrito', 'Documento da rede autorizando o uso dos dados de avaliação no CONEX-ED, com finalidade e escopo.', 'Levantamento feito.'],
      ['Importação inicial por arquivo', 'Enquanto não houver API, importar a exportação oficial (CSV ou planilha) com validação de colunas e registro de quem importou.', 'Autorização obtida.'],
      ['Modelo de dados de avaliação', 'Avaliações, turmas, componentes, habilidades, resultados agregados e evolução temporal, sempre com escola_id e RLS.', 'Importação definida.'],
      ['Painel SIMAED', 'Por série e componente: média atual, evolução, habilidades críticas e comparação entre avaliações, sem abrir outro sistema.', 'Dados importados.'],
      ['Cruzamento com o currículo', 'Habilidade crítica no SIMAED → prevista no plano curricular → aulas registradas no Relatório → conteúdos da Biblioteca.', 'Painel e Fase 3 prontos.'],
      ['Plano de intervenção', 'Coordenação cria o plano (habilidade, origem SIMAED, professores, prazo de 4 semanas) e acompanha até a próxima avaliação.', 'Cruzamento pronto.'],
      ['Alerta pedagógico automático', 'Nova habilidade marcada como crítica cria alerta para a coordenação, com a fonte do dado.', 'Plano de intervenção.'],
      ['Perguntas à IA sobre avaliação', 'Quais habilidades caíram, quais turmas evoluíram, que conteúdos correspondem às dificuldades, com citação da avaliação de origem.', 'CONEX IA pronta.']
    ] },
    { id: 'f18', title: 'Fase 6: administração avançada', summary: 'Finanças, compras, patrimônio, manutenção e reservas, para quando a escola já vive a rotina na plataforma.', tasks: [
      ['CONEX Finanças administrativo', 'Contas, comprovantes, fornecedores, notas, orçamento, previsões e centros de custo, só para quem tem visualizar_financas.', 'Fase 2 estável.'],
      ['Orçamento por projeto', 'Previsto, executado e disponível em tempo real (Feira Cultural: R$ 8.000 previstos, R$ 6.730 executados).', 'Finanças prontas.'],
      ['Solicitação de compra', 'Professor pede, coordenação, administração e direção aprovam, compra registrada, tudo pelo fluxo de protocolos.', 'Protocolos e finanças.'],
      ['CONEX Patrimônio', 'Itens com número patrimonial, localização, responsável, estado e histórico de manutenção, com etiqueta QR.', 'Fase 2 estável.'],
      ['Chamados de manutenção', 'Registro com foto, sala, gravidade e descrição; status Aberto, Em análise, Serviço solicitado, Resolvido.', 'Patrimônio pronto.'],
      ['Reserva de recursos', 'Projetor, laboratório, auditório, sala multimídia e transporte, com bloqueio de conflito de horário.', 'Calendário pronto.'],
      ['Gestão de projetos escolares', 'Feira, campeonato, formatura: equipe, orçamento, tarefas, calendário, documentos, fornecedores e relatório final.', 'Tarefas e orçamento.'],
      ['Transparência pública', 'Página opcional da escola com projetos, despesas autorizadas, calendário e prestação de contas, sem expor nada interno.', 'Finanças prontas.'],
      ['Relatórios gerenciais', 'Exportação em PDF, Excel e CSV de financeiro, pedagógico, patrimônio, processos, documentos, aulas, SIMAED e projetos.', 'Módulos com dados.'],
      ['Painéis por função', 'Direção, coordenação e secretaria com widgets escolhidos pelo usuário (dashboards personalizáveis).', 'Módulos com dados.']
    ] },
    { id: 'f19', title: 'App móvel, PWA, offline e notificações', summary: 'O celular faz o essencial muito bem; a administração complexa continua no computador.', tasks: [
      ['PWA instalável', 'manifest.json, ícones e service worker com cache só de ativos versionados. HTML nunca pré-cacheado, lição do bug de relatos sumindo no Relatório.', 'Site e app publicados.'],
      ['Foco do app no essencial', 'Avisos, mensagens, calendário, documentos, aprovações, notificações, perfil e tarefas. Nada de finanças ou configuração no celular.', 'PWA pronta.'],
      ['Notificações push', 'Novo aviso da direção, plano aprovado, documento vence em 5 dias, reunião amanhã. Com preferências por tipo e horário silencioso.', 'PWA pronta.'],
      ['Modo offline', 'Documentos marcados, agenda, avisos e formulários simples guardados no aparelho; envios na fila sincronizam quando a internet volta.', 'PWA pronta.'],
      ['Sincronia ao voltar', 'Ao ganhar foco ou voltar a conexão, buscar de novo e reenviar pendências, como o recuperarTudo do Relatório.', 'Modo offline.'],
      ['Empacotamento para lojas', 'Avaliar TWA ou Capacitor para Google Play depois que a PWA estiver estável, com assinatura e política de privacidade da loja.', 'PWA estável.'],
      ['Testes em aparelhos simples', 'Celular Android de entrada, tela pequena e 3G. Se funciona lá, funciona em todo lugar.', 'App pronto.']
    ] },
    { id: 'f20', title: 'Portais e extensão (futuro)', summary: 'Abrir o CONEX-ED para família, estudantes e parceiros, cada um com acesso mínimo e sem tocar no ambiente administrativo.', tasks: [
      ['Portal da Família', 'Comunicados, documentos públicos, eventos, autorizações, projetos e calendário, com login próprio e sem ver nada administrativo.', 'Fase 6 estável.'],
      ['Autorizações digitais', 'Responsável autoriza passeio ou participação em projeto com registro de data e hora.', 'Portal da Família.'],
      ['Portal do Estudante', 'Conteúdos, avisos, calendário, projetos e ponte direta para a Biblioteca Digital, usando a sessão de aluno já existente.', 'Integração com a Biblioteca.'],
      ['CONEX Extensão', 'Projetos comunitários (oficinas, eventos, esporte, cultura, projetos sociais) com inscrições, participantes e resultados.', 'Portal do Estudante.'],
      ['Parceiros externos', 'Universidade, associação, empresa ou órgão público vê só o projeto ligado a ele.', 'CONEX Extensão.'],
      ['Linha do tempo e memória institucional', 'Arquivo por ano letivo, histórico de quem ocupou cada função e linha do tempo da escola, que sobrevivem às trocas de gestão.', 'Auditoria e lixeira permanentes.'],
      ['Base de conhecimento', 'Perguntas recorrentes (como solicitar material, onde está o calendário) respondidas pela IA com base nos documentos oficiais da própria escola.', 'CONEX IA pronta.']
    ] },
    { id: 'f21', title: 'Integrações externas', summary: 'Conversar com as ferramentas que a escola já usa, sem depender de um só fornecedor.', tasks: [
      ['Google Drive e Calendar', 'Coordenação cola link do Drive, o CONEX-ED importa metadados e a IA analisa; eventos sincronizam com o Google Calendar do usuário.', 'CONEX IA pronta.'],
      ['Microsoft 365', 'OneDrive, Word, Excel e Outlook pelos mesmos caminhos, para não construir o produto preso ao Google.', 'Google integrado.'],
      ['Webhooks para terceiros', 'Escola configura envio de eventos (documento aprovado, protocolo concluído) para outro sistema, com segredo por escola.', 'Webhooks internos prontos.'],
      ['Assinatura eletrônica externa', 'Integrar um provedor reconhecido para documentos juridicamente sensíveis, deixando a aprovação interna para o resto.', 'Fluxos de aprovação.'],
      ['Documentação da Axion API', 'Referência pública das rotas liberadas a parceiros, com autenticação, limites e exemplos.', 'Axion API estável.']
    ] },
    { id: 'f22', title: 'CONEX Rede, comercialização e escala', summary: 'Levar o CONEX-ED de uma escola para uma rede inteira, com planos, contrato e infraestrutura paga no momento certo.', tasks: [
      ['CONEX Rede', 'Secretaria ou mantenedora gerencia várias escolas, com indicadores consolidados e sem misturar documentos internos de cada uma.', 'Várias escolas em uso.'],
      ['Planos e preços', 'Gratuito para piloto, plano por escola e plano para rede, com limites de armazenamento, IA e usuários.', 'Custos por escola conhecidos.'],
      ['Supabase Pro e Vercel Pro', 'Contratar antes da primeira escola pagante: backup diário com restauração por ponto, mais armazenamento e uso comercial permitido.', 'Planos e preços definidos.'],
      ['Cobrança e contrato', 'Contrato de licença, acordo de tratamento de dados, SLA de disponibilidade e prazo de suporte compatíveis com a infraestrutura.', 'Planos contratados.'],
      ['Onboarding de escola nova sem intervenção', 'Cadastro, convite e pastas modelo em menos de 30 minutos, sem precisar do desenvolvedor.', 'Onboarding estável.'],
      ['Proposta para a rede estadual', 'Usar o caso da escola piloto, os dados de segurança e a integração com Relatório, Biblioteca e SIMAED como diferencial na proposta da AXION.', 'Depoimento do piloto.'],
      ['Monitoramento de custos por escola', 'Painel de armazenamento, IA e requisições por escola para ajustar preço e limite a cada semestre.', 'Várias escolas em uso.'],
      ['Status do CONEX-ED no hub', 'Mudar o status deste projeto para Operacional com ajustes quando a primeira escola usar todo dia, e para Operacional efetivo quando houver escola pagante.', 'Uso diário comprovado.']
    ] }
  ];

  var state = emptyState();
  var sync = null;
  var syncStarted = false;
  var aiTickId = null;
  var vaultKey = null;
  var vaultData = null;
  var vaultExpiresAt = 0;
  var vaultTimeout = null;
  var currentFilters = { project: 'all', status: 'all', priority: 'all', favorite: false };
  var expandedIdeaChecklists = {};
  var mindMapUi = { projectId: null, selectedId: null, initialized: false, scale: 1, x: 0, y: 0 };

  function now() { return new Date().toISOString(); }
  function id(prefix) { return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function emptyState() {
    return {
      schemaVersion: 1,
      updatedAt: now(),
      projects: [],
      ideas: [],
      activities: [],
      bugs: [],
      timers: {},
      vault: null,
      migrations: {}
    };
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function toTime(value) { var parsed = Date.parse(value || ''); return isNaN(parsed) ? 0 : parsed; }
  function latest(a, b) { return toTime(a && a.updatedAt) >= toTime(b && b.updatedAt) ? a : b; }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character];
    });
  }
  function providerAsset(provider) {
    return {
      'GitHub': 'https://cdn.simpleicons.org/github/FFFFFF',
      'Supabase': 'https://cdn.simpleicons.org/supabase/3ECF8E',
      'Firebase': 'https://cdn.simpleicons.org/firebase/FFCA28',
      'Vercel': 'https://cdn.simpleicons.org/vercel/FFFFFF',
      'ChatGPT': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/ChatGPT-Logo.svg',
      'Codex': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/ChatGPT-Logo.svg',
      'Claude': 'https://cdn.simpleicons.org/anthropic/D97757',
      'Gemini': 'https://cdn.simpleicons.org/googlegemini/8E75FF'
    }[provider] || '';
  }
  function providerIcon(provider, extraClass) {
    var asset = providerAsset(provider);
    if (!asset) return '<span class="pp-provider-icon' + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true">✦</span>';
    return '<img class="pp-provider-icon' + (extraClass ? ' ' + extraClass : '') + '" src="' + asset + '" alt="' + escapeHtml(provider) + '" loading="lazy" referrerpolicy="no-referrer">';
  }
  function uiIcon(name) {
    var paths = {
      back: '<path d="M14 4 6 12l8 8"/><path d="M7 12h11"/>',
      project: '<path d="M3 5h6l2 2h10v12H3z"/><path d="M3 9h18"/>',
      folder: '<path d="M3 6h6l2 2h10v10H3z"/><path d="M3 10h18"/>',
      book: '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 5H12v15H7.5A3.5 3.5 0 0 0 4 23V5.5Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 5H12v15h4.5A3.5 3.5 0 0 1 20 23V5.5Z"/>',
      code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
      map: '<path d="M12 4v16M12 8H7a3 3 0 0 0-3 3v2M12 15h5a3 3 0 0 1 3 3v2"/><circle cx="12" cy="4" r="2"/><circle cx="4" cy="14" r="2"/><circle cx="20" cy="21" r="2"/>',
      idea: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14c-1.4-1.2-2-2.8-2-4.6a6 6 0 0 1 12 0c0 1.8-.6 3.4-2 4.6-.8.7-1 1.2-1 2H9c0-.8-.2-1.3-1-2Z"/>',
      ai: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12h.01M16 12h.01M9 16c1.7 1 4.3 1 6 0"/>',
      list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
      grid: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      edit: '<path d="m4 20 4.2-1 10.4-10.4a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z"/><path d="m13.8 7.8 2.8 2.8"/>',
      trash: '<path d="M4 7h16M10 11v6M14 11v6M9 7l1-3h4l1 3M6 7l1 14h10l1-14"/>',
      lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      unlock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M16 10V7a4 4 0 0 0-7.3-2.3"/>',
      external: '<path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'
    };
    return '<svg class="pp-ui-icon" viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.project) + '</svg>';
  }
  function safeUrl(value) {
    try {
      var url = new URL(String(value || ''), window.location.href);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch (error) { return ''; }
  }
  function formatDate(value, withTime) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('pt-BR', withTime === false ? { day: '2-digit', month: 'short', year: 'numeric' } : { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function optionList(values, selected) {
    return values.map(function (value) { return '<option value="' + escapeHtml(value) + '"' + (value === selected ? ' selected' : '') + '>' + escapeHtml(value) + '</option>'; }).join('');
  }
  function active(items) { return (items || []).filter(function (item) { return item && !item.deletedAt; }); }
  function getProject(projectId) { return active(state.projects).find(function (project) { return project.id === projectId; }) || null; }
  function getIdea(ideaId) { return active(state.ideas).find(function (idea) { return idea.id === ideaId; }) || null; }
  function getEvent(eventId) { return active(state.activities).find(function (event) { return event.id === eventId; }) || null; }
  function projectLabel(projectId) { var project = getProject(projectId); return project ? project.name : 'Projeto futuro'; }
  function coreProjectByName(name, stableId) {
    var normalizedName = String(name || '').trim().toLowerCase();
    return active(state.projects).find(function (project) { return project.id === stableId || String(project.name || '').trim().toLowerCase() === normalizedName; }) || null;
  }
  function ensureCoreProjects() {
    if (state.migrations.coreProjectsLinkedV1) return false;
    var stamp = SEED_TIMESTAMP;
    var library = coreProjectByName('Biblioteca digital', 'project-biblioteca-digital');
    var reports = coreProjectByName('Relatórios diários', 'project-relatorios-diarios');
    var changed = false;
    if (!library) {
      library = {
        id: 'project-biblioteca-digital',
        name: 'Biblioteca digital',
        description: 'Biblioteca digital medieval para organização e acesso aos livros e conteúdos pedagógicos.',
        status: 'Desenvolvimento', type: 'Site', url: 'https://biblioteca-digital-medieval.vercel.app/', logo: 'assets/icons/icone-biblioteca-digital.png',
        tools: [
          { id: 'tool-biblioteca-vercel', provider: 'Vercel', label: 'Vercel', url: 'https://biblioteca-digital-medieval.vercel.app/', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-biblioteca-supabase', provider: 'Supabase', label: 'Supabase', url: 'https://vgceathgwvtmjxbdpecr.supabase.co/', createdAt: stamp, updatedAt: stamp }
        ], relatedProjectIds: [], createdAt: stamp, updatedAt: stamp
      };
      state.projects.push(library); changed = true;
    }
    if (!reports) {
      reports = {
        id: 'project-relatorios-diarios',
        name: 'Relatórios diários',
        description: 'Sistema de registros, relatórios e acompanhamento pedagógico das escolas.',
        status: 'Desenvolvimento', type: 'Site', url: 'https://10pauloacre-creator.github.io/relatorio-2026/', logo: 'iconv2.png',
        tools: [
          { id: 'tool-relatorios-github', provider: 'GitHub', label: 'GitHub', url: 'https://github.com/10pauloacre-creator/relatorio-2026', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-relatorios-supabase', provider: 'Supabase', label: 'Supabase', url: 'https://vgceathgwvtmjxbdpecr.supabase.co/', createdAt: stamp, updatedAt: stamp }
        ], relatedProjectIds: [], createdAt: stamp, updatedAt: stamp
      };
      state.projects.push(reports); changed = true;
    }
    [
      { project: library, relatedId: reports.id },
      { project: reports, relatedId: library.id }
    ].forEach(function (connection) {
      var ids = Array.isArray(connection.project.relatedProjectIds) ? connection.project.relatedProjectIds : [];
      if (ids.indexOf(connection.relatedId) < 0) { connection.project.relatedProjectIds = ids.concat(connection.relatedId); connection.project.updatedAt = stamp; changed = true; }
    });
    [
      { project: library, id: 'activity-core-biblioteca-relatorios', title: 'Projeto conectado a Relatórios diários', details: 'A Biblioteca digital foi vinculada ao sistema de Relatórios diários para concentrar evolução, integrações e ideias relacionadas.', externalUrl: reports.url },
      { project: reports, id: 'activity-core-relatorios-biblioteca', title: 'Projeto conectado à Biblioteca digital', details: 'Relatórios diários foi vinculado à Biblioteca digital para acompanhar dependências e futuras automações entre os sistemas.', externalUrl: library.url }
    ].forEach(function (entry) {
      if (state.activities.some(function (activity) { return activity.id === entry.id; })) return;
      state.activities.push({ id: entry.id, projectId: entry.project.id, title: entry.title, details: entry.details, occurredAt: stamp, source: 'Manual', externalUrl: entry.externalUrl, idempotencyKey: entry.id, createdAt: stamp, updatedAt: stamp });
      changed = true;
    });
    state.migrations.coreProjectsLinkedV1 = { linkedAt: stamp, projectIds: [library.id, reports.id] };
    if (changed) persist('core-projects-link'); else { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return changed;
  }
  function ensureReportsProjectIcon() {
    if (state.migrations.reportsProjectIconV1) return false;
    var reports = coreProjectByName('Relatórios diários', 'project-relatorios-diarios');
    var stamp = SEED_TIMESTAMP;
    if (reports && !reports.logo) { reports.logo = 'iconv2.png'; reports.updatedAt = stamp; persist('reports-project-icon'); }
    state.migrations.reportsProjectIconV1 = { addedAt: stamp, projectId: reports ? reports.id : null };
    if (!reports || reports.logo !== 'iconv2.png') { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return Boolean(reports);
  }
  function ensureLibraryProjectIcon() {
    if (state.migrations.libraryProjectIconV1) return false;
    var library = coreProjectByName('Biblioteca digital', 'project-biblioteca-digital');
    var stamp = SEED_TIMESTAMP;
    if (library && !library.logo) { library.logo = 'assets/icons/icone-biblioteca-digital.png'; library.updatedAt = stamp; persist('library-project-icon'); }
    state.migrations.libraryProjectIconV1 = { addedAt: stamp, projectId: library ? library.id : null };
    if (!library || library.logo !== 'assets/icons/icone-biblioteca-digital.png') { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return Boolean(library);
  }
  function ensureFinanceProject() {
    if (state.migrations.financeiroAppV1) return false;
    var stamp = SEED_TIMESTAMP;
    var finance = coreProjectByName('Financeiro.app', 'project-financeiro-app');
    var changed = false;
    if (!finance) {
      finance = {
        id: 'project-financeiro-app',
        name: 'Financeiro.app',
        description: 'Aplicativo financeiro com IA para organizar receitas, despesas e o fluxo mensal.',
        status: 'Desenvolvimento', type: 'App', url: 'https://github.com/10pauloacre-creator/Finan-as-app', logo: 'assets/icons/icone-financeiro-app.png',
        tools: [
          { id: 'tool-financeiro-github', provider: 'GitHub', label: 'GitHub', url: 'https://github.com/10pauloacre-creator/Finan-as-app', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-financeiro-vercel', provider: 'Vercel', label: 'Vercel', url: '', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-financeiro-supabase', provider: 'Supabase', label: 'Supabase', url: '', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-financeiro-chatgpt', provider: 'ChatGPT', label: 'ChatGPT', url: 'https://chatgpt.com/', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-financeiro-claude', provider: 'Claude', label: 'Claude', url: 'https://claude.ai/', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-financeiro-gemini', provider: 'Gemini', label: 'Gemini', url: 'https://gemini.google.com/', createdAt: stamp, updatedAt: stamp }
        ], relatedProjectIds: [], createdAt: stamp, updatedAt: stamp
      };
      state.projects.push(finance); changed = true;
    }
    if (!state.activities.some(function (activity) { return activity.id === 'activity-core-financeiro-app'; })) {
      state.activities.push({ id: 'activity-core-financeiro-app', projectId: finance.id, title: 'Financeiro.app adicionado ao hub', details: 'Projeto em desenvolvimento com Next.js, Supabase, Vercel e recursos de IA.', occurredAt: stamp, source: 'Manual', externalUrl: finance.url, idempotencyKey: 'activity-core-financeiro-app', createdAt: stamp, updatedAt: stamp });
      changed = true;
    }
    state.migrations.financeiroAppV1 = { addedAt: stamp, projectId: finance.id };
    if (changed) persist('financeiro-app-add'); else { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return changed;
  }
  function ensureFinanceProjectIcon() {
    if (state.migrations.financeiroAppIconV1) return false;
    var finance = coreProjectByName('Financeiro.app', 'project-financeiro-app');
    var stamp = SEED_TIMESTAMP;
    if (finance && !finance.logo) { finance.logo = 'assets/icons/icone-financeiro-app.png'; finance.updatedAt = stamp; persist('financeiro-app-icon'); }
    state.migrations.financeiroAppIconV1 = { addedAt: stamp, projectId: finance ? finance.id : null };
    if (!finance || finance.logo !== 'assets/icons/icone-financeiro-app.png') { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return Boolean(finance);
  }
  function ensureRuralManagerProject() {
    if (state.migrations.ruralManagerV1) return false;
    var stamp = SEED_TIMESTAMP;
    var rural = coreProjectByName('Rural Manager', 'project-rural-manager');
    var changed = false;
    if (!rural) {
      rural = {
        id: 'project-rural-manager',
        name: 'Rural Manager',
        description: 'Projeto futuro de plataforma mobile-first para simulação econômica e futura administração pecuária, organizado a partir de um mapa de desenvolvimento completo.',
        status: 'Ideia', type: 'App', url: '', logo: 'assets/icons/icone-rural-manager.png',
        tools: [
          { id: 'tool-rural-github', provider: 'GitHub', label: 'GitHub — repositório pendente', url: '', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-rural-supabase', provider: 'Supabase', label: 'Supabase — a configurar', url: '', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-rural-vercel', provider: 'Vercel', label: 'Vercel — hospedagem pendente', url: '', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-rural-codex', provider: 'Codex', label: 'Codex', url: 'https://chatgpt.com/', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-rural-claude', provider: 'Claude', label: 'Claude', url: 'https://claude.ai/', createdAt: stamp, updatedAt: stamp }
        ], relatedProjectIds: [], createdAt: stamp, updatedAt: stamp
      };
      rural.mindMap = ruralManagerMindMapSeed(rural);
      state.projects.push(rural); changed = true;
    }
    if (!state.activities.some(function (activity) { return activity.id === 'activity-rural-manager-added'; })) {
      state.activities.push({ id: 'activity-rural-manager-added', projectId: rural.id, title: 'Rural Manager adicionado como projeto futuro', details: 'O mapa de desenvolvimento foi consolidado em 12 fases e 51 tarefas. GitHub, Supabase e Vercel ainda precisam de interligação e credenciais.', occurredAt: stamp, source: 'Mapa mental', idempotencyKey: 'activity-rural-manager-added', createdAt: stamp, updatedAt: stamp });
      changed = true;
    }
    state.migrations.ruralManagerV1 = { addedAt: stamp, projectId: rural.id, phases: RURAL_MANAGER_PHASES.length, tasks: RURAL_MANAGER_PHASES.reduce(function (total, phase) { return total + phase.tasks.length; }, 0) };
    if (changed) persist('rural-manager-add'); else { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return changed;
  }
  function ensureRuralManagerIcon() {
    if (state.migrations.ruralManagerIconV1) return false;
    var rural = coreProjectByName('Rural Manager', 'project-rural-manager');
    var stamp = SEED_TIMESTAMP;
    if (rural && !rural.logo) { rural.logo = 'assets/icons/icone-rural-manager.png'; rural.updatedAt = stamp; persist('rural-manager-icon'); }
    state.migrations.ruralManagerIconV1 = { addedAt: stamp, projectId: rural ? rural.id : null };
    if (!rural || rural.logo !== 'assets/icons/icone-rural-manager.png') { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return Boolean(rural);
  }
  function axionPhaseNumber(index) { return (index + 1 < 10 ? '0' : '') + (index + 1); }
  function phasedChecklistSeed(prefix, phases) {
    var stamp = SEED_TIMESTAMP;
    return phases.map(function (phase, index) {
      var children = phase.tasks.map(function (task, taskIndex) {
        return { id: 'chk-' + prefix + '-' + phase.id + '-' + (taskIndex + 1), text: task[0] + ' — ' + task[1], done: task[3] === true, children: [], createdAt: stamp, updatedAt: stamp };
      });
      var complete = children.length > 0 && children.every(function (child) { return child.done; });
      return { id: 'chk-' + prefix + '-' + phase.id, text: axionPhaseNumber(index) + '. ' + phase.title, done: complete, children: children, createdAt: stamp, updatedAt: stamp };
    });
  }
  function phasedMindMapDetails(phase) {
    var pending = phase.tasks.filter(function (task) { return task[3] !== true; }).length;
    return phase.summary + '\n\nSituação: ' + (phase.tasks.length - pending) + ' de ' + phase.tasks.length + ' passos concluídos.\n\nPassos desta fase:\n' + phase.tasks.map(function (task, index) {
      return (index + 1) + '. ' + (task[3] === true ? '[feito] ' : '') + task[0] + ' — ' + task[1] + '\nDependência: ' + task[2];
    }).join('\n\n');
  }
  function countPhaseTasks(phases) { return phases.reduce(function (total, phase) { return total + phase.tasks.length; }, 0); }
  function axionMindMapSeed(project) {
    var stamp = SEED_TIMESTAMP;
    var root = 'map-root-' + project.id;
    var phaseDetails = phasedMindMapDetails;
    var nodes = [
      { id: root, parentId: null, title: 'AXION PROEDUQ', description: 'Companhia de tecnologia educacional que abriga a Biblioteca Digital, o Relatório e os produtos futuros.\n\nSlogan institucional: Tecnologia que move a educação.\nAssinatura publicitária: Ensinar. Aprender. Evoluir.\n\nO plano de organização tem ' + AXION_PHASES.length + ' fases e ' + AXION_PHASES.reduce(function (total, phase) { return total + phase.tasks.length; }, 0) + ' passos, do domínio à proposta para a rede estadual de ensino.', kind: 'root', order: 0, createdAt: stamp, updatedAt: stamp },
      { id: 'map-axion-identidade', parentId: root, title: 'Identidade verbal aprovada', description: 'Descritor curto:\nAXION PROEDUQ é uma companhia de tecnologia educacional dedicada ao desenvolvimento de plataformas, aplicativos e experiências digitais que ampliam as possibilidades de ensinar e aprender.\n\nDescritor institucional forte:\nCriamos tecnologia para transformar a maneira como professores ensinam, alunos aprendem e escolas desenvolvem novas experiências educacionais.\n\nPosicionamento do site:\nTecnologia criada para quem ensina e para quem aprende.\n\nPilares: Inovação, Autonomia, Simplicidade, Evolução e Acesso.\n\nPersonalidade: tecnológica, inteligente, moderna, organizada, confiável e jovem. A companhia é séria; os produtos podem ser lúdicos.', kind: 'rule', order: 1, createdAt: stamp, updatedAt: stamp },
      { id: 'map-axion-arquitetura', parentId: root, title: 'Arquitetura de marca', description: 'Regra: o produto tem nome próprio e recebe o selo da companhia. Nunca prefixar produto com Axion.\n\nAXION PROEDUQ (companhia)\n└ Biblioteca Digital — uma plataforma AXION PROEDUQ\n└ Relatório — uma plataforma AXION PROEDUQ\n\nNomes reservados para produtos futuros: Avalia, Sala, Trilhas, Mestre e Conecta.\n\nPor que assim: cada plataforma constrói personalidade própria enquanto a empresa-mãe acumula reputação. O selo fica em português, uma plataforma AXION PROEDUQ, para manter a comunicação brasileira.', kind: 'rule', order: 2, createdAt: stamp, updatedAt: stamp },
      { id: 'map-axion-ativos', parentId: root, title: 'Onde estão os ativos', description: 'Logos originais: fontes/marca/axion-bg-claro.png e axion-bg-escuro.png.\nVersões web: assets/marca/ (axion-claro, axion-escuro e variantes -sm em webp).\nÍcone da companhia: fontes/marca/icon-axion.png.\nPágina institucional: axion-proeduq.html, publicada nos dois sites.\nDocumentos públicos: privacidade.html e termos.html, abertos sem login.\n\nA página e as imagens de marca são cópia idêntica nos dois repositórios: depois de alterar, rodar node scripts/check-copias-compartilhadas.js --copiar e fazer commit nos dois.', kind: 'folder', order: 3, createdAt: stamp, updatedAt: stamp },
      { id: 'map-axion-contas', parentId: root, title: 'Contas a transferir', description: 'GitHub: criar a organização axion-proeduq e usar Transfer ownership. O endereço do Pages passa a ser axion-proeduq.github.io e o git remote local precisa ser atualizado.\n\nSupabase: criar organização e usar Transfer project. O ID do projeto, as chaves e as URLs continuam iguais, então o código não muda.\n\nVercel: criar o team e transferir os projetos. É preciso reinstalar a integração com o GitHub apontando para a organização. O plano Hobby proíbe uso comercial.\n\nFirebase: não existe transferência. Adicionar o e-mail da companhia como Proprietário no IAM e depois remover o antigo.\n\nNenhuma credencial é guardada neste mapa.', kind: 'folder', order: 4, createdAt: stamp, updatedAt: stamp }
    ];
    AXION_PHASES.forEach(function (phase, index) {
      nodes.push({ id: 'map-axion-' + phase.id, parentId: root, title: axionPhaseNumber(index) + '. ' + phase.title, description: phaseDetails(phase), kind: 'folder', order: index + 5, createdAt: stamp, updatedAt: stamp });
    });
    return createMindMap(project, nodes);
  }
  function ensureAxionProject() {
    if (state.migrations.axionProeduqV1) return false;
    var stamp = SEED_TIMESTAMP;
    var axion = coreProjectByName('AXION PROEDUQ', 'project-axion-proeduq');
    var changed = false;
    if (!axion) {
      axion = {
        id: 'project-axion-proeduq',
        name: 'AXION PROEDUQ',
        description: 'Companhia de tecnologia educacional que abriga a Biblioteca Digital, o Relatório e os produtos futuros. Tecnologia que move a educação. Este projeto guarda o passo a passo de organização da companhia, do domínio já registrado até a proposta para a rede estadual de ensino, com checklist por fase e mapa mental com o detalhe técnico de cada etapa.',
        status: 'Desenvolvimento', type: 'Outro', url: 'https://axionproeduq.com.br', logo: 'fontes/marca/icon-axion.png',
        tools: [
          { id: 'tool-axion-github', provider: 'GitHub', label: 'GitHub — organização a criar', url: '', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-axion-supabase', provider: 'Supabase', label: 'Supabase — organização a criar', url: '', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-axion-vercel', provider: 'Vercel', label: 'Vercel — team a criar', url: '', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-axion-firebase', provider: 'Firebase', label: 'Firebase — passar a propriedade', url: '', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-axion-dominio', provider: 'Outra', label: 'Registro.br — axionproeduq.com.br', url: 'https://registro.br/', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-axion-claude', provider: 'Claude', label: 'Claude', url: 'https://claude.ai/', createdAt: stamp, updatedAt: stamp }
        ],
        checklist: phasedChecklistSeed('axion', AXION_PHASES),
        relatedProjectIds: [], createdAt: stamp, updatedAt: stamp
      };
      axion.mindMap = axionMindMapSeed(axion);
      state.projects.push(axion); changed = true;
    }
    [
      coreProjectByName('Biblioteca digital', 'project-biblioteca-digital'),
      coreProjectByName('Relatórios diários', 'project-relatorios-diarios')
    ].forEach(function (produto) {
      if (!produto) return;
      var deProduto = Array.isArray(produto.relatedProjectIds) ? produto.relatedProjectIds : [];
      if (deProduto.indexOf(axion.id) < 0) { produto.relatedProjectIds = deProduto.concat(axion.id); produto.updatedAt = stamp; changed = true; }
      var daCompanhia = Array.isArray(axion.relatedProjectIds) ? axion.relatedProjectIds : [];
      if (daCompanhia.indexOf(produto.id) < 0) { axion.relatedProjectIds = daCompanhia.concat(produto.id); axion.updatedAt = stamp; changed = true; }
    });
    if (!state.activities.some(function (activity) { return activity.id === 'activity-axion-proeduq-add'; })) {
      state.activities.push({ id: 'activity-axion-proeduq-add', projectId: axion.id, title: 'AXION PROEDUQ adicionada como companhia', details: 'Plano de organização com ' + AXION_PHASES.length + ' fases e ' + AXION_PHASES.reduce(function (total, phase) { return total + phase.tasks.length; }, 0) + ' passos, da identidade verbal à proposta governamental. Domínio axionproeduq.com.br já registrado, página institucional e logos publicados. Pendente: organizações no GitHub, Supabase e Vercel, e-mail comercial e transferência dos projetos.', occurredAt: stamp, source: 'Manual', externalUrl: 'https://axionproeduq.com.br', idempotencyKey: 'activity-axion-proeduq-add', createdAt: stamp, updatedAt: stamp });
      changed = true;
    }
    state.migrations.axionProeduqV1 = { addedAt: stamp, projectId: axion.id, phases: AXION_PHASES.length, tasks: AXION_PHASES.reduce(function (total, phase) { return total + phase.tasks.length; }, 0) };
    if (changed) persist('axion-proeduq-add'); else { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return changed;
  }
  function conexMindMapSeed(project) {
    var stamp = SEED_TIMESTAMP;
    var root = 'map-root-' + project.id;
    var nodes = [
      { id: root, parentId: null, title: 'CONEX-ED', description: 'Comunidade Organizada em Rede e Extensão Escolar.\nPlataforma Integrada de Gestão, Comunicação e Inteligência Escolar, by AXION PROEDUQ.\n\nSlogan: Toda a escola conectada, organizada e inteligente.\nLinha de apoio: Gestão. Comunicação. Documentos. Pedagógico. Inteligência. Um único ambiente.\n\nO plano de realização tem ' + CONEX_PHASES.length + ' fases e ' + countPhaseTasks(CONEX_PHASES) + ' passos, do conceito à CONEX Rede.', kind: 'root', order: 0, createdAt: stamp, updatedAt: stamp },
      { id: 'map-conex-visao', parentId: root, title: 'Visão e papel no ecossistema', description: 'O sistema operacional digital da escola. Plataforma multi-institucional: cada escola recebe um ambiente próprio, completamente separado das demais (identidade visual, usuários, setores, cargos, documentos, comunicação, calendário, finanças, pedagógico, processos, relatórios, integrações, IA e histórico).\n\nRelatório cuida da rotina individual do professor. Biblioteca Digital cuida da aprendizagem do aluno. SIMAED fornece dados de avaliação quando houver integração oficial. O CONEX-ED transforma tudo isso em uma estrutura institucional única.\n\nAXION PROEDUQ\n└ AXION ID\n  ├ CONEX-ED (escola)\n  ├ Relatório (professor)\n  ├ Biblioteca Digital (aluno)\n  └ SIMAED (avaliação e dados)', kind: 'note', order: 1, createdAt: stamp, updatedAt: stamp },
      { id: 'map-conex-conta', parentId: root, title: 'Axion ID e perfis', description: 'Uma conta só para CONEX-ED, Relatório, Biblioteca e produtos futuros, sobre o auth do Supabase compartilhado (vgceathgwvtmjxbdpecr).\n\nPerfil profissional: acompanha a pessoa (nome, foto, formação, áreas, certificações escolhidas, disciplinas, experiência).\nPerfil institucional: existe só dentro da escola (cargo, setor, vínculo, turmas, horários, permissões, documentos, histórico).\n\nA mesma pessoa pode trabalhar em várias escolas; cada vínculo tem permissões independentes.', kind: 'note', order: 2, createdAt: stamp, updatedAt: stamp },
      { id: 'map-conex-permissoes', parentId: root, title: 'Níveis e permissões', description: 'Nível 1 — Operacional/pedagógico: professores, mediadores, assistentes.\nNível 2 — Administrativo: secretaria e apoio administrativo.\nNível 3 — Gestão: direção, coordenação e gestores autorizados.\n\nPor trás dos níveis, RBAC + permissões granulares: visualizar_financas, editar_financas, publicar_avisos, aprovar_planos, visualizar_documentos_funcionais, gerenciar_usuarios, visualizar_auditoria, baixar_relatorios.\n\nUma função só no banco (private.conex_pode) decide tudo: RLS, Edge Functions e IA.', kind: 'note', order: 3, createdAt: stamp, updatedAt: stamp },
      { id: 'map-conex-modulos', parentId: root, title: 'Módulos do produto', description: 'Central personalizada · Comunidade · Organograma · Feed institucional · Avisos com ciência · Mensagens · CONEX Arquivos (classificação, versões, auditoria) · Fluxos de aprovação · Protocolos · Assinatura interna · CONEX Pedagógico · Planos de curso inteligentes · CONEX IA · Pesquisa semântica · Atas por áudio · Reuniões e Livro de Decisões · Calendário · Tarefas e projetos · CONEX Finanças · Orçamentos e compras · CONEX Patrimônio · Manutenção · Reservas · Formulários e construtor de fluxos · Automações · CONEX Intelligence · Painéis por função · Transparência · Portal da Família · Portal do Estudante · CONEX Extensão · Parceiros · CONEX Rede.', kind: 'note', order: 4, createdAt: stamp, updatedAt: stamp },
      { id: 'map-conex-seguranca', parentId: root, title: 'Segurança, LGPD e IA', description: 'Multi-tenant desde o primeiro dia: escola_id em toda tabela e RLS por vínculo ativo. Auditoria só de inclusão, lixeira permanente, MFA para gestão, rate limiting, sessões controladas e backups testados.\n\nPrivacy by design: cada dado tem finalidade, responsável, permissão, retenção e histórico. Cargo alto não dá acesso automático a dado pessoal.\n\nIA: Usuário → Permissões → Dados autorizados → IA. Nunca Usuário → IA → banco inteiro. Toda resposta cita a fonte (documento e página). A IA apresenta evidências e não julga professores.', kind: 'note', order: 5, createdAt: stamp, updatedAt: stamp },
      { id: 'map-conex-ciclo', parentId: root, title: 'Ciclo pedagógico completo', description: 'Coordenação publica currículo no CONEX-ED → CONEX IA interpreta → cada professor recebe no Relatório só os seus conteúdos → professor planeja → Biblioteca Digital sugere conteúdos → professor ministra e registra → Relatório atualiza o contador → CONEX-ED acompanha a execução → SIMAED mede resultados → CONEX Intelligence cruza os indicadores → coordenação identifica necessidades → novo ciclo começa.', kind: 'note', order: 6, createdAt: stamp, updatedAt: stamp }
    ];
    CONEX_PHASES.forEach(function (phase, index) {
      nodes.push({ id: 'map-conex-' + phase.id, parentId: root, title: axionPhaseNumber(index) + '. ' + phase.title, description: phasedMindMapDetails(phase), kind: 'folder', order: index + 7, createdAt: stamp, updatedAt: stamp });
    });
    return createMindMap(project, nodes);
  }
  function ensureConexProject() {
    if (state.migrations.conexEdV1) return false;
    var stamp = SEED_TIMESTAMP;
    var conex = coreProjectByName('CONEX-ED', 'project-conex-ed');
    var changed = false;
    if (!conex) {
      conex = {
        id: 'project-conex-ed',
        name: 'CONEX-ED',
        description: 'Projeto futuro da AXION PROEDUQ: plataforma multi-institucional de gestão, comunicação, documentos, pedagógico e inteligência escolar, com um ambiente isolado por escola e conta única Axion ID ligando CONEX-ED, Relatório e Biblioteca Digital. Toda a escola conectada, organizada e inteligente.',
        status: 'Ideia', type: 'Site', url: '', logo: '',
        tools: [
          { id: 'tool-conex-github', provider: 'GitHub', label: 'GitHub — repositório conex-ed a criar', url: '', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-conex-supabase', provider: 'Supabase', label: 'Supabase — schema conex no projeto compartilhado', url: 'https://supabase.com/dashboard/project/vgceathgwvtmjxbdpecr', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-conex-vercel', provider: 'Vercel', label: 'Vercel — projeto a criar', url: '', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-conex-dominio', provider: 'Outra', label: 'Registro.br — domínio a verificar', url: 'https://registro.br/', createdAt: stamp, updatedAt: stamp },
          { id: 'tool-conex-claude', provider: 'Claude', label: 'Claude', url: 'https://claude.ai/', createdAt: stamp, updatedAt: stamp }
        ],
        checklist: phasedChecklistSeed('conex', CONEX_PHASES),
        relatedProjectIds: [], createdAt: stamp, updatedAt: stamp
      };
      conex.mindMap = conexMindMapSeed(conex);
      state.projects.push(conex); changed = true;
    }
    [
      coreProjectByName('AXION PROEDUQ', 'project-axion-proeduq'),
      coreProjectByName('Biblioteca digital', 'project-biblioteca-digital'),
      coreProjectByName('Relatórios diários', 'project-relatorios-diarios')
    ].forEach(function (irmao) {
      if (!irmao) return;
      var doIrmao = Array.isArray(irmao.relatedProjectIds) ? irmao.relatedProjectIds : [];
      if (doIrmao.indexOf(conex.id) < 0) { irmao.relatedProjectIds = doIrmao.concat(conex.id); irmao.updatedAt = stamp; changed = true; }
      var doConex = Array.isArray(conex.relatedProjectIds) ? conex.relatedProjectIds : [];
      if (doConex.indexOf(irmao.id) < 0) { conex.relatedProjectIds = doConex.concat(irmao.id); conex.updatedAt = stamp; changed = true; }
    });
    if (!state.activities.some(function (activity) { return activity.id === 'activity-conex-ed-add'; })) {
      state.activities.push({ id: 'activity-conex-ed-add', projectId: conex.id, title: 'CONEX-ED adicionado como projeto futuro', details: 'Plano de realização com ' + CONEX_PHASES.length + ' fases e ' + countPhaseTasks(CONEX_PHASES) + ' passos: conceito, descoberta, arquitetura, Vercel, Supabase multi-tenant, Axion ID, site, ecossistema AXION, Fase 1 do app, piloto, colaboração, integração com Relatório e Biblioteca, IA, SIMAED, administração, app, portais, integrações e CONEX Rede.', occurredAt: stamp, source: 'Manual', externalUrl: '', idempotencyKey: 'activity-conex-ed-add', createdAt: stamp, updatedAt: stamp });
      changed = true;
    }
    state.migrations.conexEdV1 = { addedAt: stamp, projectId: conex.id, phases: CONEX_PHASES.length, tasks: countPhaseTasks(CONEX_PHASES) };
    if (changed) persist('conex-ed-add'); else { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return changed;
  }
  function libraryDocumentationBlueprint() {
    return {
      title: 'Mapa do projeto Biblioteca Digital',
      summary: 'Documentação do acervo medieval: estrutura, conteúdo publicado, pendências e regras de funcionamento encontradas na versão local v3.',
      counters: { available: 8, pending: 36, series: 3, collections: 11 },
      folders: [
        {
          id: 'visao-geral', icon: 'project', title: '01. Visão geral e objetivo',
          description: 'Contexto para quem recebe o projeto pela primeira vez.',
          children: [
            { id: 'proposito', icon: 'project', title: 'Propósito e público', status: 'Concluído', details: ['Biblioteca digital com identidade medieval para disponibilizar livros e conteúdos pedagógicos da E.E. Rural Pe. Carlos Casavequia.', 'O fluxo principal é: escolher 1ª, 2ª ou 3ª série, abrir a disciplina e acessar o livro do bimestre quando ele estiver publicado.'] },
            { id: 'estrutura-atual', icon: 'folder', title: 'Estrutura já montada', status: 'Concluído', details: ['Três séries estão disponíveis na tela inicial: 1ª, 2ª e 3ª séries.', 'O acervo está organizado por série, disciplina e bimestre, com caminhos relativos no formato ./livros/{serie}/{disciplina}/{bimestre}.html.', 'Há três arquivos locais de evolução: Biblioteca Digital Medieval.html, v2 e v3; a documentação usa o inventário da v3.'] },
            { id: 'identidade', icon: 'project', title: 'Experiência e identidade visual', status: 'Concluído', details: ['Tema medieval com placa de entrada, livros de seleção de série, efeitos de pergaminho e mensagens de acervo.', 'Ativos existentes incluem imagens, GIF/vídeo de abertura, música de fundo, efeitos sonoros e imagens de livro verde/azul para disponibilidade.'] }
          ]
        },
        {
          id: 'acervo', icon: 'book', title: '02. Acervo por série',
          description: '8 livros já disponíveis e 36 espaços de bimestre ainda pendentes.',
          children: [
            { id: 'acervo-1-serie', icon: 'book', title: '1ª série — 2 disponíveis / 10 pendentes', status: 'Em andamento', details: ['Disponíveis: 1º bimestre de Língua Portuguesa; 1º bimestre de Trilhas de Linguagens.', 'Pendentes em Língua Portuguesa: 2º, 3º e 4º bimestres.', 'Pendentes em Trilhas de Linguagens: 2º, 3º e 4º bimestres.', 'Pendentes em Trilhas de Ciências Humanas: 1º, 2º, 3º e 4º bimestres.'] },
            { id: 'acervo-2-serie', icon: 'book', title: '2ª série — 4 disponíveis / 12 pendentes', status: 'Em andamento', details: ['Disponíveis: 1º bimestre de Língua Portuguesa, Trilhas de Linguagens, Trilhas de Ciências Humanas e Artes.', 'Pendentes em cada coleção: 2º, 3º e 4º bimestres.', 'Coleções existentes: Língua Portuguesa, Trilhas de Linguagens, Trilhas de Ciências Humanas e Artes.'] },
            { id: 'acervo-3-serie', icon: 'book', title: '3ª série — 2 disponíveis / 14 pendentes', status: 'Em andamento', details: ['Disponíveis: 1º bimestre de Língua Portuguesa; 1º bimestre de Trilhas de Linguagens.', 'Pendentes em Língua Portuguesa e Trilhas de Linguagens: 2º, 3º e 4º bimestres.', 'Pendentes em Trilhas de Ciências Humanas e Artes: 1º, 2º, 3º e 4º bimestres.'] },
            { id: 'inventario-total', icon: 'book', title: 'Inventário completo — 44 posições', status: 'Concluído', details: ['Total mapeado: 44 posições de livros (série × disciplina × bimestre).', 'Já publicados: 8 livros do 1º bimestre.', 'Ainda a produzir/publicar: 36 livros. A ordem recomendada é completar os demais bimestres das coleções que já têm o 1º livro disponível.'] }
          ]
        },
        {
          id: 'regras', icon: 'code', title: '03. Regras implementadas no código',
          description: 'Comportamentos que devem ser preservados ao evoluir o acervo.',
          children: [
            { id: 'regra-disponibilidade', icon: 'code', title: 'Disponibilidade é verificada por arquivo', status: 'Concluído', details: ['Antes de abrir um livro, o sistema faz fetch com cache: no-store para o arquivo HTML do livro.', 'A posição é considerada disponível somente se a resposta for válida e o conteúdo tiver mais de 100 linhas; o resultado fica em memória no bookCache durante a sessão.', 'A interface troca automaticamente entre livro verde/Acessar e livro azul/Indisponível.'] },
            { id: 'regra-abertura', icon: 'code', title: 'Abertura de livro e modal', status: 'Concluído', details: ['Livro disponível: mostra modal de abertura, toca efeitos e redireciona após aproximadamente 3,5 segundos.', 'Livro indisponível: abre modal “Pergaminho Selado” e não redireciona.', 'A tecla Escape e o retorno de página fecham o modal e restauram a rolagem.'] },
            { id: 'regra-navegacao', icon: 'code', title: 'Navegação e estado local', status: 'Concluído', details: ['A série selecionada é guardada no localStorage pela chave bdm-current-serie.', 'A aplicação protege o botão Voltar com um aviso de saída para reduzir fechamentos acidentais.', 'A navegação mantém uma série visível por vez e inicia a primeira aba dessa série.'] },
            { id: 'regra-pwa-audio', icon: 'code', title: 'PWA, áudio e ciclo de vida', status: 'Concluído', details: ['O service worker ./sw.js é registrado para suporte de PWA; o convite de instalação é voltado a dispositivos móveis e respeita a chave bdm_pwa_dismissed.', 'A música de fundo inicia após interação quando o navegador exige permissão; ela pausa/retoma em mudanças de visibilidade, foco e retorno à página.', 'Os sons distinguem seleção de série, livro disponível, indisponível e abertura.'] }
          ]
        },
        {
          id: 'ativos', icon: 'folder', title: '04. Ativos e publicação',
          description: 'O que acompanha o HTML e como a versão chega ao público.',
          children: [
            { id: 'ativos-midia', icon: 'folder', title: 'Mídia existente', status: 'Concluído', details: ['Pasta assets/images: placa, livros da tela inicial, livros verde/azul e ícones de experiência.', 'Pasta assets/audio: música de fundo e efeitos de série, abertura, disponibilidade e indisponibilidade.', 'Pasta assets/gif: vídeo/animação de abertura do livro.'] },
            { id: 'publicacao', icon: 'project', title: 'Publicação atual', status: 'Concluído', details: ['A versão consultada referencia https://biblioteca-digital-medieval.vercel.app para ativos publicados.', 'O projeto Biblioteca Digital está registrado no hub com ferramentas Vercel e Supabase; acessos sensíveis permanecem protegidos pelo cofre.'] }
          ]
        },
        {
          id: 'proximos-passos', icon: 'map', title: '05. Próximos passos recomendados',
          description: 'Fila objetiva para continuar sem perder contexto.',
          children: [
            { id: 'prioridade-acervo', icon: 'book', title: 'Completar o acervo de maior continuidade', status: 'Prioridade alta', details: ['Criar os 2º, 3º e 4º bimestres das coleções que já possuem o 1º livro.', 'Depois, iniciar as coleções sem nenhum livro: Trilhas de Ciências Humanas da 1ª e 3ª séries; Artes da 3ª série.', 'Cada novo arquivo precisa respeitar a rota relativa, ter conteúdo real e manter mais de 100 linhas para ser reconhecido pela verificação atual.'] },
            { id: 'qualidade-publicacao', icon: 'code', title: 'Checklist antes de publicar', status: 'Prioridade alta', details: ['Validar a rota do novo HTML no ambiente publicado.', 'Abrir pelo cartão para confirmar o estado verde, o modal, o redirecionamento e o conteúdo.', 'Testar no celular/PWA, inclusive instalação, áudio e retorno ao acervo.'] },
            { id: 'automacao-futura', icon: 'map', title: 'Automação futura', status: 'Planejado', details: ['Conectar deploys do Vercel e alterações do repositório à linha do tempo deste projeto.', 'Trocar a regra de “mais de 100 linhas” por um manifesto de acervo com metadados de título, série, disciplina, bimestre e estado de publicação.'] }
          ]
        }
      ]
    };
  }
  // ── RELATORIO SKIN: mapa documental, checklist e linha do tempo ─────────
  // Conteúdo em assets/data/projeto-relatorio-skin.json (mapa + checklist,
  // atualizado junto com o projeto) e assets/data/relatorio-skin-linha-do-tempo.json
  // (um evento por commit, gerado por scripts/gerar-linha-do-tempo.js). Ao abrir,
  // a página busca no GitHub os commits mais novos que o arquivo: tudo o que
  // muda no projeto entra sozinho na linha do tempo.
  var RS_ID_PADRAO = 'project-relatorios-diarios';
  var RS_REPO = '10pauloacre-creator/relatorio-2026';
  var RS_DOC = null, RS_COMMITS = [], RS_LIMITE = 40, rsCarregando = false;
  function rsProjeto() {
    var salvo = state.migrations.relatorioSkinIdentidadeV1 && state.migrations.relatorioSkinIdentidadeV1.projectId;
    return (salvo && getProject(salvo)) || coreProjectByName('Relatórios diários', RS_ID_PADRAO) || coreProjectByName('RELATORIO SKIN', RS_ID_PADRAO);
  }
  function isRelatorioSkin(project) { var rs = rsProjeto(); return !!(project && rs && project.id === rs.id); }
  function docOf(project) { return isRelatorioSkin(project) && RS_DOC ? RS_DOC.documentation : project && project.documentation; }
  function ensureRelatorioSkinIdentity() {
    if (state.migrations.relatorioSkinIdentidadeV1) return false;
    var rs = rsProjeto();
    if (!rs) return false;
    rs.name = 'RELATORIO SKIN';
    rs.description = 'Plataforma de gestão docente da AXION PROEDUQ (relatorio.skin): diário de aulas, frequência, atividades, notas, planejamento, Educação Especial e relatórios.';
    rs.url = 'https://relatorio.skin';
    rs.logo = 'assets/app/icone-192.png';
    rs.updatedAt = now();
    state.migrations.relatorioSkinIdentidadeV1 = { addedAt: rs.updatedAt, projectId: rs.id };
    persist('relatorio-skin-identidade');
    return true;
  }
  // Mescla o checklist do arquivo no projeto, uma vez por versão do arquivo:
  // acrescenta itens novos (por id) e marca como feito o que o arquivo diz
  // que ficou pronto. O que o professor acrescentou ou marcou continua.
  function mergeRelatorioChecklist() {
    var rs = rsProjeto();
    if (!rs || !RS_DOC || !Array.isArray(RS_DOC.checklist)) return false;
    var feita = Number(state.migrations.relatorioSkinChecklistVersao || 0);
    if (feita >= Number(RS_DOC.versao || 1)) return false;
    var stamp = now();
    rs.checklist = Array.isArray(rs.checklist) ? rs.checklist : [];
    RS_DOC.checklist.forEach(function (fase) {
      var alvo = findChecklistItem(rs.checklist, fase.id);
      var item = alvo ? alvo.item : null;
      if (!item) { item = { id: fase.id, text: fase.text, done: false, children: [], createdAt: stamp, updatedAt: stamp }; rs.checklist.push(item); }
      item.children = Array.isArray(item.children) ? item.children : [];
      (fase.children || []).forEach(function (c) {
        var achado = findChecklistItem(item.children, c.id);
        if (!achado) item.children.push({ id: c.id, text: c.text, done: !!c.done, children: [], createdAt: stamp, updatedAt: stamp });
        else if (c.done && !achado.item.done) { achado.item.done = true; achado.item.updatedAt = stamp; }
      });
      item.done = item.children.length > 0 && item.children.every(function (c) { return c.done; });
    });
    rs.updatedAt = stamp;
    state.migrations.relatorioSkinChecklistVersao = Number(RS_DOC.versao || 1);
    persist('relatorio-skin-checklist');
    return true;
  }
  function rsEventoDoCommit(c) {
    return { id: 'gh-' + c.sha, title: c.titulo, details: c.corpo || '', occurredAt: c.data, source: 'GitHub · ' + c.sha.slice(0, 7), externalUrl: 'https://github.com/' + RS_REPO + '/commit/' + c.sha, readonly: true };
  }
  function rsJuntarCommits(lista) {
    var vistos = {};
    RS_COMMITS = RS_COMMITS.concat(lista).filter(function (c) { if (!c || !c.sha || vistos[c.sha]) return false; vistos[c.sha] = 1; return true; })
      .sort(function (a, b) { return toTime(b.data) - toTime(a.data); });
  }
  // Commits publicados depois do arquivo, direto do GitHub (cache de 15 min).
  function rsBuscarNovos(desde) {
    var CH = 'pp_rs_github_v1', cache = null;
    try { cache = JSON.parse(localStorage.getItem(CH) || 'null'); } catch (e) {}
    if (cache && cache.desde === desde && Date.now() - cache.em < 15 * 60 * 1000) return Promise.resolve(cache.commits || []);
    var url = 'https://api.github.com/repos/' + RS_REPO + '/commits?per_page=100' + (desde ? '&since=' + encodeURIComponent(desde) : '');
    return fetch(url, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) { return r.ok ? r.json() : []; }).then(function (lista) {
      var commits = (Array.isArray(lista) ? lista : []).map(function (x) {
        var msg = String((x.commit && x.commit.message) || ''), linhas = msg.split('\n');
        return { sha: x.sha, data: (x.commit && x.commit.author && x.commit.author.date) || '', titulo: linhas[0], corpo: linhas.slice(1).filter(function (l) { return !/^Co-Authored-By:|^🤖 Generated/i.test(l.trim()); }).join('\n').trim().slice(0, 1200) };
      });
      try { localStorage.setItem(CH, JSON.stringify({ desde: desde, em: Date.now(), commits: commits })); } catch (e) {}
      return commits;
    }).catch(function () { return []; });
  }
  function carregarRelatorioSkin() {
    if (rsCarregando || !window.fetch) return;
    rsCarregando = true;
    var semCache = { cache: 'no-cache' };
    Promise.all([
      fetch('assets/data/projeto-relatorio-skin.json', semCache).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('assets/data/relatorio-skin-linha-do-tempo.json', semCache).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      RS_DOC = res[0];
      rsJuntarCommits((res[1] && res[1].commits) || []);
      ensureRelatorioSkinIdentity();
      mergeRelatorioChecklist();
      render();
      var ultimo = RS_COMMITS[0] && RS_COMMITS[0].data;
      return rsBuscarNovos(ultimo);
    }).then(function (novos) {
      var antes = RS_COMMITS.length;
      rsJuntarCommits(novos || []);
      if (RS_COMMITS.length !== antes) render();
    });
  }

  function ensureLibraryDocumentation() {
    if (state.migrations.bibliotecaDocumentationV1) return false;
    var library = coreProjectByName('Biblioteca digital', 'project-biblioteca-digital');
    if (!library) return false;
    var stamp = SEED_TIMESTAMP;
    library.documentation = libraryDocumentationBlueprint();
    library.updatedAt = stamp;
    if (!state.activities.some(function (activity) { return activity.id === 'activity-biblioteca-documentation-map'; })) {
      state.activities.push({ id: 'activity-biblioteca-documentation-map', projectId: library.id, title: 'Mapa de contexto da Biblioteca Digital criado', details: 'Documentação com acervo, pendências, regras de código, ativos e próximos passos foi organizada no projeto.', occurredAt: stamp, source: 'Manual', idempotencyKey: 'activity-biblioteca-documentation-map', createdAt: stamp, updatedAt: stamp });
    }
    state.migrations.bibliotecaDocumentationV1 = { addedAt: stamp, projectId: library.id };
    persist('biblioteca-documentation-map');
    return true;
  }
  function createMindMap(project, nodes) {
    var stamp = now();
    var rootId = 'map-root-' + project.id;
    return {
      version: 1,
      rootId: rootId,
      createdAt: stamp,
      updatedAt: stamp,
      nodes: nodes && nodes.length ? nodes : [{ id: rootId, parentId: null, title: project.name, description: 'Nó central do mapa mental deste projeto.', kind: 'root', order: 0, createdAt: stamp, updatedAt: stamp }]
    };
  }
  function libraryMindMapSeed(project) {
    var stamp = now();
    var root = 'map-root-' + project.id;
    function node(key, parentId, title, kind, description, order) {
      return { id: 'map-biblioteca-' + key, parentId: parentId, title: title, kind: kind, description: description, order: order || 0, createdAt: stamp, updatedAt: stamp };
    }
    var code = 'map-biblioteca-code';
    var assets = 'map-biblioteca-assets';
    var files = 'map-biblioteca-files';
    var modules = 'map-biblioteca-modules';
    var catalog = 'map-biblioteca-catalog';
    var rules = 'map-biblioteca-rules';
    return createMindMap(project, [
      { id: root, parentId: null, title: 'Biblioteca Digital', description: 'Projeto central: acervo pedagógico digital, experiência medieval e publicação dos livros por série.', kind: 'root', order: 0, createdAt: stamp, updatedAt: stamp },
      node('code', root, 'Código e arquitetura', 'folder', 'Estrutura principal consultada na versão local v3 da Biblioteca Digital.', 1),
      node('files', code, 'Arquivos HTML', 'folder', 'Três versões locais documentam a evolução do projeto.', 1),
      node('file-base', files, 'Biblioteca Digital Medieval.html', 'file', 'Versão base local do projeto; mantenha como referência histórica antes de consolidar versões.', 1),
      node('file-v2', files, 'Biblioteca Digital Medieval v2.html', 'file', 'Evolução intermediária da interface e das interações da biblioteca.', 2),
      node('file-v3', files, 'Biblioteca Digital Medieval v3.html', 'file', 'Versão consultada para este mapa. Reúne seleção de série, acervo, áudio, PWA e regras de abertura.', 3),
      node('assets', code, 'assets/', 'folder', 'Recursos de imagem, áudio, animação e dados usados pela experiência.', 2),
      node('img-data', assets, 'img-data.js', 'file', 'Dados visuais centralizados para capas, ícones e imagens relacionadas ao acervo.', 1),
      node('audio', assets, 'audio/', 'folder', 'Arquivos confirmados: livro-abrindo, música de fundo, som de livro disponível, indisponível e seleção de série.', 2),
      node('media', assets, 'gif + images', 'file', 'Animações de abertura e imagens de estado dos livros. Antes de publicar, confirme também as imagens referenciadas pelo HTML.', 3),
      node('modules', code, 'Módulos JavaScript', 'folder', 'Funções encontradas no HTML v3 que sustentam a interação da biblioteca.', 3),
      node('navigation', modules, 'Seleção e navegação', 'module', 'selectSerie() e goBack(). A série ativa usa a chave local bdm-current-serie e há proteção contra retorno acidental.', 1),
      node('availability', modules, 'Disponibilidade', 'module', 'checkBook(), bookCache e updateAvailability(). A URL só conta como disponível se a resposta for válida e tiver mais de 100 linhas.', 2),
      node('opening', modules, 'Abertura de livro', 'module', 'openBook() e closeModal(). O livro passa pela verificação, mostra feedback e só então é aberto.', 3),
      node('sound', modules, 'Ciclo de áudio', 'module', 'startBgMusic(), toggleMute() e playSound(). A música e os efeitos respeitam interação, foco e visibilidade da página.', 4),
      node('pwa', modules, 'PWA e instalação', 'module', 'Registro de ./sw.js e beforeinstallprompt. A preferência de fechar o convite usa bdm_pwa_dismissed.', 5),
      node('catalog', root, 'Acervo por série', 'folder', 'Inventário atual: 44 posições, com 8 livros disponíveis e 36 pendentes.', 2),
      node('first', catalog, '1ª série', 'collection', '2 disponíveis e 10 pendentes. Já há Língua Portuguesa e Trilhas de Linguagens do 1º bimestre.', 1),
      node('second', catalog, '2ª série', 'collection', '4 disponíveis e 12 pendentes. Já há Língua Portuguesa, Trilhas, Ciências Humanas e Artes do 1º bimestre.', 2),
      node('third', catalog, '3ª série', 'collection', '2 disponíveis e 14 pendentes. Já há Língua Portuguesa e Trilhas de Linguagens do 1º bimestre.', 3),
      node('rules', root, 'Regras que precisam ser preservadas', 'folder', 'Checklist de comportamento para evoluir o projeto sem quebrar o fluxo atual.', 3),
      node('availability-rule', rules, 'Validação antes de abrir', 'rule', 'Não liberar uma URL só por existir: mantenha a validação HTTP e o critério atual de conteúdo ou documente formalmente a troca.', 1),
      node('route-rule', rules, 'Modal antes do redirecionamento', 'rule', 'A experiência deve dar retorno visual ao usuário antes de abrir um livro disponível ou informar que ele ainda não foi publicado.', 2),
      node('state-rule', rules, 'Estado local identificado', 'rule', 'Use nomes com prefixo bdm_ para novas preferências locais e documente o propósito de cada chave.', 3),
      node('publish', root, 'Publicação e próximos passos', 'folder', 'Rotas de livros são verificadas no ambiente publicado. A próxima prioridade é completar bimestres e validar cada rota no celular/PWA.', 4)
    ]);
  }
  function ruralManagerMindMapSeed(project) {
    var stamp = now();
    var root = 'map-root-' + project.id;
    function phaseDetails(phase) {
      return phase.summary + '\n\nBlocos desta fase (' + phase.tasks.length + '):\n' + phase.tasks.map(function (task, index) {
        return (index + 1) + '. ' + task[0] + ' — ' + task[1] + '\nDependência: ' + task[2];
      }).join('\n\n');
    }
    var nodes = [{ id: root, parentId: null, title: 'Rural Manager', description: 'Projeto futuro: plataforma web mobile-first para simulação econômica e futura administração pecuária. O plano importado possui 12 fases e 51 tarefas, com prioridade para um MVP web/PWA antes do APK.', kind: 'root', order: 0, createdAt: stamp, updatedAt: stamp }, {
      id: 'map-rural-integrations', parentId: root, title: 'Integrações e hospedagem', description: 'Pendente de interligação:\n• GitHub: criar ou vincular o repositório do projeto.\n• Supabase: criar projeto, configurar variáveis públicas, Auth, PostgreSQL, RLS e Storage privado.\n• Vercel: conectar o repositório, definir Preview e Produção, variáveis de ambiente, logs, rollback e HTTPS para PWA.\n• Codex e Claude: usar os prompts do plano de desenvolvimento por fase.\n\nNenhuma credencial foi incluída no mapa.', kind: 'folder', order: 1, createdAt: stamp, updatedAt: stamp }];
    RURAL_MANAGER_PHASES.forEach(function (phase, index) {
      nodes.push({ id: 'map-rural-' + phase.id, parentId: root, title: String(index + 1).padStart(2, '0') + '. ' + phase.title, description: phaseDetails(phase), kind: 'folder', order: index + 2, createdAt: stamp, updatedAt: stamp });
    });
    return createMindMap(project, nodes);
  }
  function mindMapSeedFor(project) {
    if (project.id === 'project-biblioteca-digital') return libraryMindMapSeed(project);
    if (project.id === 'project-rural-manager') return ruralManagerMindMapSeed(project);
    if (project.id === 'project-axion-proeduq') return axionMindMapSeed(project);
    if (project.id === 'project-conex-ed') return conexMindMapSeed(project);
    return createMindMap(project);
  }
  function isSeedMindMapProject(project) {
    return project.id === 'project-biblioteca-digital' || project.id === 'project-rural-manager' || project.id === 'project-axion-proeduq' || project.id === 'project-conex-ed';
  }
  function ensureProjectMindMaps() {
    var changed = false;
    active(state.projects).forEach(function (project) {
      if (project.mindMap && Array.isArray(project.mindMap.nodes) && project.mindMap.nodes.length) return;
      project.mindMap = mindMapSeedFor(project);
      project.updatedAt = isSeedMindMapProject(project) ? SEED_TIMESTAMP : now();
      changed = true;
    });
    if (changed) persist('mindmaps-bootstrap');
    return changed;
  }
  function getMindMap(project) {
    if (!project) return null;
    if (!project.mindMap || !Array.isArray(project.mindMap.nodes) || !project.mindMap.nodes.length) {
      project.mindMap = mindMapSeedFor(project);
      project.updatedAt = now(); persist('mindmap-create');
    }
    return project.mindMap;
  }
  function activeMindMapNodes(project) { var map = getMindMap(project); return map ? active(map.nodes) : []; }
  function getMindMapNode(project, nodeId) { return activeMindMapNodes(project).find(function (node) { return node.id === nodeId; }) || null; }
  function mindMapNodeLabel(kind) { return ({ root: 'Projeto', folder: 'Pasta', file: 'Arquivo', module: 'Módulo', collection: 'Acervo', rule: 'Regra', note: 'Anotação' })[kind] || 'Elemento'; }
  function mindMapNodeIcon(kind) { return ({ root: 'map', folder: 'folder', file: 'project', module: 'code', collection: 'book', rule: 'lock', note: 'idea' })[kind] || 'project'; }
  function statusClass(status) {
    return ({ 'Ideia': 'idea', 'Desenvolvimento': 'development', 'Operacional com ajustes': 'adjustments', 'Operacional final': 'final', 'Operacional efetivo': 'effective' })[status] || 'idea';
  }
  function priorityClass(priority) {
    return ({ 'Urgente': 'urgent', 'Alta': 'high', 'Média': 'medium', 'Baixa': 'low', 'Sem pressa': 'calm' })[priority] || 'calm';
  }
  function projectLogo(project, small) {
    var size = small ? ' pp-logo-small' : '';
    if (project && project.logo) return '<span class="pp-logo' + size + '"><img alt="" src="' + escapeHtml(project.logo) + '"></span>';
    var initial = project && project.name ? escapeHtml(project.name.trim().charAt(0).toUpperCase()) : '✦';
    return '<span class="pp-logo' + size + '" aria-hidden="true">' + initial + '</span>';
  }
  function persist(reason) {
    state.updatedAt = now();
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) { toast('Não foi possível salvar a cópia local.'); }
    if (sync) sync.schedulePush(reason || 'alteracao');
  }
  function loadCache() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (parsed && typeof parsed === 'object') state = normalizeState(parsed);
    } catch (error) { state = emptyState(); }
  }
  function normalizeState(value) {
    var base = emptyState();
    var normalized = Object.assign(base, value || {});
    normalized.projects = Array.isArray(normalized.projects) ? normalized.projects : [];
    normalized.ideas = Array.isArray(normalized.ideas) ? normalized.ideas : [];
    normalized.activities = Array.isArray(normalized.activities) ? normalized.activities : [];
    normalized.bugs = Array.isArray(normalized.bugs) ? normalized.bugs : [];
    normalized.timers = normalized.timers && typeof normalized.timers === 'object' ? normalized.timers : {};
    normalized.migrations = normalized.migrations && typeof normalized.migrations === 'object' ? normalized.migrations : {};
    normalized.schemaVersion = 1;
    return normalized;
  }
  function mergeCollection(localItems, remoteItems) {
    var map = {};
    (localItems || []).concat(remoteItems || []).forEach(function (item) {
      if (!item || !item.id) return;
      map[item.id] = map[item.id] ? latest(map[item.id], item) : item;
    });
    return Object.keys(map).map(function (key) { return map[key]; });
  }
  function mergeTimers(localTimers, remoteTimers) {
    var result = {};
    Object.keys(localTimers || {}).concat(Object.keys(remoteTimers || {})).forEach(function (key) {
      var local = (localTimers || {})[key];
      var remote = (remoteTimers || {})[key];
      result[key] = local && remote ? latest(local, remote) : (local || remote);
    });
    return result;
  }
  function mergeState(remoteValue) {
    var remote = normalizeState(remoteValue);
    var local = state;
    state = normalizeState({
      schemaVersion: 1,
      updatedAt: toTime(local.updatedAt) > toTime(remote.updatedAt) ? local.updatedAt : remote.updatedAt,
      projects: mergeCollection(local.projects, remote.projects),
      ideas: mergeCollection(local.ideas, remote.ideas),
      activities: mergeCollection(local.activities, remote.activities),
      bugs: mergeCollection(local.bugs, remote.bugs),
      timers: mergeTimers(local.timers, remote.timers),
      vault: local.vault && remote.vault ? latest(local.vault, remote.vault) : (local.vault || remote.vault || null),
      migrations: Object.assign({}, local.migrations || {}, remote.migrations || {})
    });
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {}
  }
  function initSync() {
    if (!window.RelatorioSupabaseSync || !window.RelatorioSupabaseSync.isAvailable()) return;
    sync = window.RelatorioSupabaseSync.createScopeSync({
      scope: SYNC_SCOPE,
      schoolSlug: 'projetos-pessoais',
      classSlug: 'workspace',
      source: 'projetos-pessoais',
      debounceMs: 500,
      getLocalPayload: function () { return state; },
      onRemotePayload: function (payload) {
        mergeState(payload);
        render();
      },
      onStatus: function () {}
    });
    syncStarted = true;
    sync.start().then(function () {
      migrateLegacyTimers();
      sync.schedulePush('bootstrap');
    }).catch(function () { migrateLegacyTimers(); });
  }

  function headerMarkup(title, subtitle, back) {
    return '<header class="pp-hero"><div class="pp-hero-inner"><div>'
      + (back ? '<a class="pp-back" href="' + back + '">' + uiIcon('back') + 'Voltar aos projetos</a>' : '<a class="pp-back" href="index.html">' + uiIcon('back') + 'Início</a>')
      + '<div class="pp-kicker">Organização pessoal</div><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(subtitle) + '</p></div>'
      + '<button type="button" class="pp-vault-status" data-action="vault-info" aria-label="Abrir opções do cofre"><strong>' + uiIcon(isVaultUnlocked() ? 'unlock' : 'lock') + (isVaultUnlocked() ? 'Cofre desbloqueado' : 'Cofre protegido') + '</strong><span>' + (isVaultUnlocked() ? 'Acesso ativo por 15 minutos' : state.vault ? 'Senha necessária para as ferramentas' : 'Defina a senha no primeiro acesso') + '</span></button>'
      + '</div></header>';
  }
  function workspaceMarkup() {
    var tab = currentTab();
    return headerMarkup('Projetos pessoais', 'Um lugar para lembrar do que está em andamento, das ideias e dos acessos importantes.')
      + '<main class="pp-shell"><nav class="pp-tabs" aria-label="Seções de projetos">'
      + tabButton('projects', uiIcon('project') + 'Projetos', tab) + tabButton('ideas', uiIcon('idea') + 'Ideias', tab) + tabButton('ias', uiIcon('ai') + 'I.As', tab)
      + '</nav>' + (tab === 'ideas' ? ideasMarkup() : tab === 'ias' ? aiMarkup() : projectsMarkup()) + '</main>';
  }
  function tabButton(value, label, current) { return '<button type="button" class="pp-tab' + (value === current ? ' is-active' : '') + '" data-action="tab" data-tab="' + value + '">' + label + '</button>'; }
  function projectsMarkup() {
    var view = localStorage.getItem('pp_project_view') || 'list';
    var projects = active(state.projects).sort(function (a, b) { return toTime(b.updatedAt) - toTime(a.updatedAt); });
    var body = projects.length ? (view === 'grid' ? projectGrid(projects) : projectList(projects)) : emptyMarkup('Nenhum projeto ainda', 'Crie o primeiro projeto e concentre aqui o que está sendo desenvolvido.');
    return '<section><div class="pp-section-head"><div><h2>Projetos</h2><p>Acompanhe seus projetos em um só lugar.</p></div><div class="pp-toolbar">'
      + '<button class="pp-icon-button' + (view === 'list' ? ' is-active' : '') + '" title="Visualizar em lista" aria-label="Visualizar em lista" data-action="view" data-view="list">' + uiIcon('list') + '</button>'
      + '<button class="pp-icon-button' + (view === 'grid' ? ' is-active' : '') + '" title="Visualizar em grade" aria-label="Visualizar em grade" data-action="view" data-view="grid">' + uiIcon('grid') + '</button>'
      + '<button class="pp-button" data-action="new-project">' + uiIcon('plus') + 'Novo projeto</button></div></div>' + body + '</section>';
  }
  function projectList(projects) {
    return '<div class="pp-project-list">' + projects.map(function (project) {
      return '<article class="pp-project-row" tabindex="0" role="link" data-action="goto-project" data-id="' + project.id + '">'
        + projectLogo(project) + '<div class="pp-project-copy"><h3>' + escapeHtml(project.name) + '</h3><p>' + escapeHtml(project.description || 'Sem descrição.') + '</p></div>'
        + '<div class="pp-project-meta">' + (bugsAbertos(project.id) ? '<span class="pp-bug-count" title="Bugs abertos">🐞 ' + bugsAbertos(project.id) + '</span>' : '') + '<span class="pp-badge pp-status-' + statusClass(project.status) + '">' + escapeHtml(project.status) + '</span>'
        + '<button class="pp-icon-button" aria-label="Editar ' + escapeHtml(project.name) + '" title="Editar" data-action="edit-project" data-id="' + project.id + '">' + uiIcon('edit') + '</button>'
        + '<button class="pp-icon-button" aria-label="Excluir ' + escapeHtml(project.name) + '" title="Excluir" data-action="delete-project" data-id="' + project.id + '">' + uiIcon('trash') + '</button></div></article>';
    }).join('') + '</div>';
  }
  function projectGrid(projects) {
    return '<div class="pp-project-grid">' + projects.map(function (project) {
      return '<article class="pp-project-tile" tabindex="0" role="link" aria-label="Abrir projeto ' + escapeHtml(project.name) + '" data-action="goto-project" data-id="' + project.id + '">'
        + projectLogo(project) + (bugsAbertos(project.id) ? '<span class="pp-bug-count pp-bug-tile" title="Bugs abertos">🐞 ' + bugsAbertos(project.id) + '</span>' : '') + '<div class="pp-tile-actions"><button aria-label="Editar" title="Editar" data-action="edit-project" data-id="' + project.id + '">' + uiIcon('edit') + '</button><button aria-label="Excluir" title="Excluir" data-action="delete-project" data-id="' + project.id + '">' + uiIcon('trash') + '</button></div></article>';
    }).join('') + '</div>';
  }
  function emptyMarkup(title, message) { return '<div class="pp-empty"><strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(message) + '</span></div>'; }
  function ideasMarkup() {
    var ideas = active(state.ideas).filter(function (idea) {
      return (currentFilters.project === 'all' || (currentFilters.project === 'future' ? !idea.projectId : idea.projectId === currentFilters.project))
        && (currentFilters.status === 'all' || idea.status === currentFilters.status)
        && (currentFilters.priority === 'all' || idea.priority === currentFilters.priority)
        && (!currentFilters.favorite || idea.favorite);
    }).sort(function (a, b) {
      var favoriteDiff = (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
      if (favoriteDiff) return favoriteDiff;
      var priority = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
      return priority || toTime(b.updatedAt) - toTime(a.updatedAt);
    });
    var projectOptions = '<option value="all">Todos os projetos</option><option value="future"' + (currentFilters.project === 'future' ? ' selected' : '') + '>Projeto futuro</option>'
      + active(state.projects).map(function (project) { return '<option value="' + project.id + '"' + (currentFilters.project === project.id ? ' selected' : '') + '>' + escapeHtml(project.name) + '</option>'; }).join('');
    var groupBySection = currentFilters.project !== 'all' && currentFilters.project !== 'future';
    var body;
    if (!ideas.length) {
      body = emptyMarkup('Nenhuma ideia encontrada', 'Use o botão acima para criar uma ideia ou mude os filtros.');
    } else if (groupBySection) {
      var groups = {}; var order = [];
      ideas.forEach(function (idea) {
        var key = (idea.section || '').trim() || 'Sem seção';
        if (!groups[key]) { groups[key] = []; order.push(key); }
        groups[key].push(idea);
      });
      order.sort(function (a, b) { if (a === 'Sem seção') return 1; if (b === 'Sem seção') return -1; return a.localeCompare(b); });
      body = order.map(function (key) { return '<div class="pp-idea-section-group"><h3 class="pp-idea-section-title">' + escapeHtml(key) + '</h3><div class="pp-ideas">' + groups[key].map(ideaCard).join('') + '</div></div>'; }).join('');
    } else {
      body = '<div class="pp-ideas">' + ideas.map(ideaCard).join('') + '</div>';
    }
    return '<section><div class="pp-section-head"><div><h2>Ideias</h2><p>Capture a ideia antes que ela se perca e conecte-a ao projeto certo.</p></div><div class="pp-toolbar"><button class="pp-button" data-action="new-idea">' + uiIcon('plus') + 'Nova ideia</button></div></div>'
      + '<div class="pp-filter-bar"><select data-filter="project" aria-label="Filtrar por projeto">' + projectOptions + '</select><select data-filter="status" aria-label="Filtrar por status"><option value="all">Todos os status</option>' + optionList(IDEA_STATUSES, currentFilters.status === 'all' ? '' : currentFilters.status) + '</select><select data-filter="priority" aria-label="Filtrar por prioridade"><option value="all">Todas as prioridades</option>' + optionList(PRIORITIES, currentFilters.priority === 'all' ? '' : currentFilters.priority) + '</select><label class="pp-favorite-filter"><input type="checkbox" data-filter="favorite"' + (currentFilters.favorite ? ' checked' : '') + '> ★ Só favoritas</label></div>'
      + body + '</section>';
  }
  function ideaCard(idea) {
    var project = getProject(idea.projectId);
    var items = Array.isArray(idea.checklist) ? idea.checklist : [];
    var stats = checklistStats(items);
    var due = formatDueDate(idea.dueDate);
    var labels = Array.isArray(idea.labels) ? idea.labels : [];
    var expanded = !!expandedIdeaChecklists[idea.id];
    return '<article class="pp-idea' + (idea.favorite ? ' is-favorite' : '') + '"><div class="pp-idea-header"><div class="pp-idea-top-row">' + (idea.favorite ? '<span class="pp-idea-star" aria-hidden="true">★</span>' : '') + '<h3>' + escapeHtml(idea.title) + '</h3>' + (idea.section ? '<span class="pp-idea-section">' + escapeHtml(idea.section) + '</span>' : '') + '</div><div class="pp-toolbar"><button class="pp-icon-button" title="Editar ideia" aria-label="Editar ideia" data-action="edit-idea" data-id="' + idea.id + '">' + uiIcon('edit') + '</button><button class="pp-icon-button" title="Excluir ideia" aria-label="Excluir ideia" data-action="delete-idea" data-id="' + idea.id + '">' + uiIcon('trash') + '</button></div></div>'
      + '<p>' + escapeHtml(idea.description || 'Sem descrição detalhada.') + '</p>'
      + (stats.total ? '<div class="pp-checklist-progress"><div class="pp-checklist-progress-bar"><span style="width:' + Math.round(stats.done / stats.total * 100) + '%"></span></div><small>' + stats.done + '/' + stats.total + '</small></div>' : '')
      + '<button type="button" class="pp-idea-checklist-toggle" data-action="idea-checklist-expand" data-id="' + idea.id + '" aria-expanded="' + (expanded ? 'true' : 'false') + '">' + (expanded ? '▾' : '▸') + ' Checklist' + (stats.total ? ' · ' + stats.done + '/' + stats.total : '') + '</button>'
      + (expanded ? '<div class="pp-idea-inline-checklist">'
        + '<div class="pp-quick-add-row"><input class="pp-field pp-quick-add-input" id="pp-idea-checklist-input-' + idea.id + '" placeholder="Adicionar item..."><button type="button" class="pp-button pp-small" data-action="idea-checklist-add" data-idea="' + idea.id + '">' + uiIcon('plus') + 'Adicionar</button></div>'
        + checklistItemsMarkup(items, 'idea-checklist', ' data-idea="' + idea.id + '"', 0) + '</div>' : '')
      + (labels.length ? '<div class="pp-tags">' + labels.map(function (label) { return '<span class="pp-tag pp-label-chip">#' + escapeHtml(label) + '</span>'; }).join('') + '</div>' : '')
      + '<div class="pp-idea-foot"><div class="pp-tags"><span class="pp-tag pp-priority-' + priorityClass(idea.priority) + '">' + escapeHtml(idea.priority) + '</span><span class="pp-tag">' + escapeHtml(idea.status) + '</span><span class="pp-tag">' + (project ? projectLogo(project, true) + escapeHtml(project.name) : '◌ Projeto futuro') + '</span>'
      + (due ? '<span class="pp-tag' + (due.overdue ? ' pp-tag-overdue' : '') + '">Prazo: ' + due.label + '</span>' : '')
      + (idea.prompt ? '<span class="pp-tag" title="Tem prompt de IA salvo">Prompt</span>' : '')
      + (idea.attachments && idea.attachments.length ? '<span class="pp-tag">Anexos: ' + idea.attachments.length + '</span>' : '')
      + '</div><span class="pp-tag">Editada ' + escapeHtml(formatDate(idea.updatedAt, false)) + '</span></div></article>';
  }
  function aiMarkup() {
    return '<section><div class="pp-section-head"><div><h2>I.As</h2><p>Controle o tempo de espera das contas e receba um aviso quando elas estiverem livres.</p></div></div><div class="pp-ai-grid">' + AI_ACCOUNTS.map(aiCard).join('') + '</div></section>';
  }
  function aiCard(account) {
    var timer = state.timers[account.id] || {};
    var remaining = Number(timer.endAt || 0) - Date.now();
    var ready = remaining <= 0;
    return '<article class="pp-ai-card' + (ready ? ' is-ready' : '') + '" id="pp-ai-' + account.id + '"><div class="pp-ai-top"><div><p class="pp-ai-provider">' + escapeHtml(account.provider) + '</p><h3>' + escapeHtml(account.title) + '</h3></div>' + providerIcon(account.provider) + '</div><div class="pp-ai-state" data-ai-time="' + account.id + '">' + formatTimer(remaining) + '</div><div class="pp-ai-state-label" data-ai-label="' + account.id + '">' + (ready ? 'LIVRE ✓' : 'AGUARDANDO…') + '</div><div class="pp-ai-actions"><button class="pp-button" data-action="start-five" data-id="' + account.id + '">Iniciar 5h</button><button class="pp-button pp-secondary" data-action="set-timer" data-id="' + account.id + '">Definir hora</button>' + (!ready ? '<button class="pp-button pp-secondary" data-action="stop-timer" data-id="' + account.id + '">Parar</button>' : '') + '</div></article>';
  }
  function relatedProjectsMarkup(project) {
    var related = (Array.isArray(project.relatedProjectIds) ? project.relatedProjectIds : []).map(getProject).filter(Boolean);
    if (!related.length) return '';
    return '<section class="pp-panel"><h2>Projetos relacionados</h2><div class="pp-related-list">' + related.map(function (relatedProject) {
      return '<a class="pp-related-project" href="projeto-detalhes.html?id=' + encodeURIComponent(relatedProject.id) + '">' + projectLogo(relatedProject, true) + '<span><strong>' + escapeHtml(relatedProject.name) + '</strong><small>' + escapeHtml(relatedProject.status) + '</small></span>' + uiIcon('external') + '</a>';
    }).join('') + '</div></section>';
  }
  function libraryDocItem(project, itemId) {
    var documentation = docOf(project);
    if (!documentation || !Array.isArray(documentation.folders)) return null;
    for (var index = 0; index < documentation.folders.length; index += 1) {
      var found = (documentation.folders[index].children || []).find(function (item) { return item.id === itemId; });
      if (found) return found;
    }
    return null;
  }
  function libraryDocumentationMarkup(project) {
    var documentation = docOf(project);
    if (!documentation || !Array.isArray(documentation.folders)) return '';
    var counters = documentation.counters || {};
    var statsHtml = Array.isArray(documentation.stats)
      ? '<div class="pp-doc-stats">' + documentation.stats.map(function (x) { return '<span><b>' + Number(x.n || 0).toLocaleString('pt-BR') + '</b> ' + escapeHtml(x.label) + '</span>'; }).join('') + '</div>'
      : '<div class="pp-doc-stats"><span><b>' + Number(counters.available || 0) + '</b> livros disponíveis</span><span><b>' + Number(counters.pending || 0) + '</b> pendentes</span><span><b>' + Number(counters.series || 0) + '</b> séries</span><span><b>' + Number(counters.collections || 0) + '</b> coleções</span></div>';
    return '<section class="pp-library-docs"><div class="pp-library-docs-head"><div><p class="pp-doc-kicker">DOCUMENTAÇÃO DO PROJETO</p><h2>' + escapeHtml(documentation.title) + '</h2><p>' + escapeHtml(documentation.summary) + '</p></div><button class="pp-button" data-action="library-map" data-project="' + project.id + '">' + uiIcon('map') + 'Abrir mapa mental</button></div>'
      + statsHtml
      + '<div class="pp-doc-folders">' + documentation.folders.map(function (folder, index) {
        return '<details class="pp-doc-folder"' + (index === 0 ? ' open' : '') + '><summary><span class="pp-doc-folder-icon">' + uiIcon(folder.icon || 'folder') + '</span><span><strong>' + escapeHtml(folder.title) + '</strong><small>' + escapeHtml(folder.description) + '</small></span><span class="pp-doc-folder-count">' + (folder.children || []).length + '</span></summary><div class="pp-doc-children">' + (folder.children || []).map(function (item) {
          return '<button class="pp-doc-item" data-action="library-doc" data-project="' + project.id + '" data-doc="' + escapeHtml(item.id) + '"><span class="pp-doc-item-icon">' + uiIcon(item.icon || 'project') + '</span><span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.status || 'Detalhes') + '</small></span>' + uiIcon('external') + '</button>';
        }).join('') + '</div></details>';
      }).join('') + '</div></section>';
  }
  function libraryDocModal(project, itemId) {
    var item = libraryDocItem(project, itemId);
    if (!item) return;
    showModal(item.title, item.status || 'Documentação da Biblioteca Digital', '<div class="pp-doc-modal-copy"><div class="pp-doc-modal-icon">' + uiIcon(item.icon || 'project') + '</div>' + (item.details || []).map(function (detail) { return '<p>' + escapeHtml(detail) + '</p>'; }).join('') + '<div class="pp-modal-actions"><button type="button" class="pp-button pp-secondary" data-action="close-modal">Fechar</button></div></div>', { wide: true });
  }
  function libraryMapCatalog() {
    var nodes = [
      { id: 'root', label: 'Biblioteca Digital', meta: 'Visão geral do projeto', kind: 'root', x: 790, y: 520, w: 240, details: ['Projeto de biblioteca digital para as três séries do Ensino Médio.', 'O mapa foi montado a partir da estrutura local consultada da Biblioteca Digital.', 'Selecione uma ramificação para ver a responsabilidade de cada arquivo e módulo.'] },
      { id: 'files', label: 'Arquivos raiz', meta: '3 versões HTML', kind: 'folder', x: 110, y: 108, w: 205, details: ['Pasta principal com três versões históricas da interface.', 'A versão v3 foi a referência usada para mapear módulos, regras e inventário.'] },
      { id: 'file-base', label: 'Biblioteca Digital Medieval.html', meta: 'versão base', kind: 'file', x: 35, y: 250, w: 245, details: ['Arquivo HTML da primeira versão local identificada.', 'Serve como marco para comparar a evolução visual e funcional antes das revisões v2 e v3.'] },
      { id: 'file-v2', label: 'Biblioteca Digital Medieval v2.html', meta: 'evolução da interface', kind: 'file', x: 35, y: 354, w: 245, details: ['Segunda versão local do arquivo principal.', 'Deve ser preservada como referência histórica antes de qualquer limpeza de versões antigas.'] },
      { id: 'file-v3', label: 'Biblioteca Digital Medieval v3.html', meta: 'versão consultada', kind: 'file', x: 35, y: 458, w: 245, details: ['Arquivo usado para este levantamento de código.', 'Concentra a seleção de série, disponibilidade dos livros, modal de abertura, áudio, PWA e proteção de navegação.'] },
      { id: 'assets', label: 'assets/', meta: 'imagens, mídia e dados', kind: 'folder', x: 110, y: 686, w: 205, details: ['Diretório de recursos da biblioteca.', 'Inclui dados de imagem, sons e animações usados pela experiência de navegação.'] },
      { id: 'img-data', label: 'assets/img-data.js', meta: 'dados de imagens', kind: 'file', x: 35, y: 818, w: 245, details: ['Arquivo JavaScript de dados visuais localizado dentro de assets.', 'É o ponto natural para centralizar referências de capas, ícones e imagens por coleção.'] },
      { id: 'audio', label: 'assets/audio/', meta: '5 arquivos de áudio', kind: 'folder', x: 35, y: 922, w: 245, details: ['Arquivos confirmados: livro-abrindo.mp3, musica-fundo.mp3, som-livro-disponivel.mp3, som-livro-indisponivel.mp3 e som-serie.mp3.', 'Os sons são acionados por playSound(), startBgMusic() e pelos estados de disponibilidade.'] },
      { id: 'media', label: 'assets/gif + images', meta: 'animações e estados', kind: 'file', x: 315, y: 818, w: 250, details: ['Animações locais confirmadas: livro-abrindo.gif e livro-abrindo.webm.', 'Imagens locais confirmadas: livro-azul.png e livro-verde.png.', 'O HTML também referencia placa e imagens das séries; confirme que os arquivos publicados existem antes de um novo empacotamento.'] },
      { id: 'interface', label: 'Módulos da interface', meta: 'funções e eventos', kind: 'folder', x: 455, y: 126, w: 225, details: ['Conjunto de funções que controla a navegação, consulta do acervo, modal, áudio e instalação PWA.', 'Os itens filhos descrevem o comportamento real identificado no HTML v3.'] },
      { id: 'navigation', label: 'Seleção e navegação', meta: 'selectSerie · goBack', kind: 'module', x: 420, y: 270, w: 250, details: ['selectSerie() escolhe a série e persiste a opção atual em localStorage com a chave bdm-current-serie.', 'goBack() retorna ao início da experiência.', 'Um guard com history.pushState e popstate evita saídas acidentais pela navegação do navegador.'] },
      { id: 'availability', label: 'Disponibilidade', meta: 'checkBook · bookCache', kind: 'module', x: 420, y: 378, w: 250, details: ['checkBook(url) consulta o arquivo com fetch usando cache: no-store.', 'A resposta só é considerada válida quando OK e com mais de 100 linhas.', 'bookCache mantém o resultado na memória; updateAvailability() atualiza os estados na interface.'] },
      { id: 'book-modal', label: 'Abertura de livro', meta: 'openBook · closeModal', kind: 'module', x: 420, y: 486, w: 250, details: ['openBook() valida a disponibilidade antes de abrir o destino.', 'Quando disponível, mostra o modal de confirmação e redireciona após aproximadamente 3,5 segundos.', 'Quando indisponível, apresenta um retorno visual sem liberar uma rota quebrada. closeModal() fecha a camada.'] },
      { id: 'audio-module', label: 'Ciclo de áudio', meta: 'startBgMusic · toggleMute', kind: 'module', x: 420, y: 594, w: 250, details: ['startBgMusic() inicia a trilha de fundo conforme a interação permitida pelo navegador.', 'toggleMute() controla a preferência de som e playSound() dispara os efeitos de interface.', 'Eventos de visibilidade, blur e focus preservam uma experiência menos invasiva.'] },
      { id: 'pwa', label: 'PWA e instalação', meta: 'sw.js · beforeinstallprompt', kind: 'module', x: 420, y: 702, w: 250, details: ['O HTML registra ./sw.js para suporte de PWA.', 'beforeinstallprompt é usado para oferecer instalação em dispositivos compatíveis.', 'A dispensa do convite é lembrada em localStorage pela chave bdm_pwa_dismissed.'] },
      { id: 'catalog', label: 'Acervo por série', meta: '44 posições mapeadas', kind: 'folder', x: 1180, y: 108, w: 225, details: ['A versão consultada organiza o acervo em 1ª, 2ª e 3ª séries.', 'Há 8 livros disponíveis, 36 pendentes, 3 séries e 11 coleções série-disciplina.'] },
      { id: 'first-series', label: '1ª série', meta: '2 disponíveis · 10 pendentes', kind: 'collection', x: 1370, y: 248, w: 255, details: ['Disponíveis: Língua Portuguesa 1º e Trilhas de Linguagens 1º.', 'Pendentes: Língua Portuguesa 2º–4º; Trilhas 2º–4º; Todas as quatro posições de Tempo de Chegar.'] },
      { id: 'second-series', label: '2ª série', meta: '4 disponíveis · 12 pendentes', kind: 'collection', x: 1370, y: 360, w: 255, details: ['Disponíveis: Língua Portuguesa 1º, Trilhas de Linguagens 1º, Tempo de Chegar 1º e Artes 1º.', 'Permanecem pendentes as posições 2º–4º dessas quatro coleções.'] },
      { id: 'third-series', label: '3ª série', meta: '2 disponíveis · 14 pendentes', kind: 'collection', x: 1370, y: 472, w: 255, details: ['Disponíveis: Língua Portuguesa 1º e Trilhas de Linguagens 1º.', 'Pendentes: Língua Portuguesa e Trilhas 2º–4º; todas as posições de Tempo de Chegar e Artes.'] },
      { id: 'rules', label: 'Regras do código', meta: 'comportamentos preservados', kind: 'folder', x: 1180, y: 678, w: 225, details: ['Regras que não devem ser quebradas em novas alterações sem revisão consciente.', 'Elas foram extraídas do comportamento da versão v3 e servem como checklist de manutenção.'] },
      { id: 'rule-check', label: 'Regra de disponibilidade', meta: 'resposta válida > 100 linhas', kind: 'rule', x: 1370, y: 794, w: 255, details: ['Não trate a simples existência da URL como disponibilidade.', 'A regra atual exige resposta HTTP bem-sucedida e conteúdo com mais de 100 linhas; mantenha esse critério ou documente formalmente uma substituição.'] },
      { id: 'rule-route', label: 'Regra de abertura', meta: 'modal antes do redirecionamento', kind: 'rule', x: 1370, y: 898, w: 255, details: ['A abertura de um livro passa primeiro pela verificação de disponibilidade.', 'O fluxo atual apresenta feedback e só então leva à rota externa; isso reduz links quebrados para o usuário.'] },
      { id: 'rule-state', label: 'Regra de estado local', meta: 'série, PWA e preferências', kind: 'rule', x: 1370, y: 1002, w: 255, details: ['As chaves bdm-current-serie e bdm_pwa_dismissed preservam contexto da pessoa usuária.', 'Qualquer nova chave local deve ter prefixo bdm_ e uma finalidade documentada para evitar conflitos.'] },
      { id: 'publication', label: 'Publicação e rotas', meta: 'Vercel · livros remotos', kind: 'folder', x: 820, y: 910, w: 225, details: ['A disponibilidade dos livros referencia rotas publicadas no domínio biblioteca-digital-medieval.vercel.app.', 'Antes de publicar, valide HTMLs, mídias, service worker e todas as rotas do acervo.'] }
    ];
    var lines = [[910, 595, 620, 230], [910, 595, 585, 725], [910, 595, 690, 250], [910, 595, 1290, 230], [910, 595, 1290, 800], [910, 595, 932, 910], [210, 210, 160, 250], [210, 210, 160, 354], [210, 210, 160, 458], [210, 785, 160, 818], [210, 785, 160, 922], [210, 785, 440, 818], [565, 230, 545, 270], [565, 230, 545, 378], [565, 230, 545, 486], [565, 230, 545, 594], [565, 230, 545, 702], [1292, 220, 1497, 248], [1292, 220, 1497, 360], [1292, 220, 1497, 472], [1292, 790, 1497, 794], [1292, 790, 1497, 898], [1292, 790, 1497, 1002]];
    return { nodes: nodes, lines: lines };
  }
  function libraryMindMapModal(project) {
    if (!project || !docOf(project)) return;
    var catalog = libraryMapCatalog();
    var nodeMarkup = catalog.nodes.map(function (node) {
      return '<button type="button" class="pp-mindmap-node pp-mindmap-node-' + escapeHtml(node.kind) + '" data-map-node="' + escapeHtml(node.id) + '" style="--map-x:' + Number(node.x) + 'px;--map-y:' + Number(node.y) + 'px;--map-w:' + Number(node.w || 220) + 'px" aria-pressed="false"><span>' + escapeHtml(node.label) + '</span><small>' + escapeHtml(node.meta) + '</small></button>';
    }).join('');
    var lineMarkup = catalog.lines.map(function (line) {
      var curve = Math.abs(line[2] - line[0]) * 0.42;
      var direction = line[2] >= line[0] ? 1 : -1;
      return '<path d="M ' + line[0] + ' ' + line[1] + ' C ' + (line[0] + curve * direction) + ' ' + line[1] + ', ' + (line[2] - curve * direction) + ' ' + line[3] + ', ' + line[2] + ' ' + line[3] + '"></path>';
    }).join('');
    var modal = showModal('Mapa mental — Biblioteca Digital', 'Arraste o mapa, use a rolagem para aproximar ou diminuir e selecione um nó para ler os detalhes.', '<div class="pp-mindmap pp-mindmap-interactive"><div class="pp-mindmap-toolbar" aria-label="Controles do mapa"><div class="pp-mindmap-help">' + uiIcon('map') + '<span>Mapa baseado nos arquivos e módulos consultados</span></div><div class="pp-mindmap-controls"><button type="button" class="pp-mindmap-control" data-map-control="out" aria-label="Diminuir zoom">−</button><output class="pp-mindmap-zoom" data-map-zoom-label>70%</output><button type="button" class="pp-mindmap-control" data-map-control="in" aria-label="Aumentar zoom">+</button><button type="button" class="pp-mindmap-reset" data-map-control="reset">Centralizar</button></div></div><div class="pp-mindmap-layout"><div class="pp-mindmap-viewport" tabindex="0" aria-label="Mapa mental navegável. Use a rolagem para zoom e arraste para mover."><div class="pp-mindmap-stage"><svg class="pp-mindmap-lines" viewBox="0 0 1840 1180" aria-hidden="true">' + lineMarkup + '</svg>' + nodeMarkup + '</div></div><aside class="pp-mindmap-detail" data-map-detail aria-live="polite"><span class="pp-mindmap-detail-kicker">VISÃO GERAL</span><h3>Biblioteca Digital</h3><p>Selecione uma ramificação para ver o arquivo, módulo ou regra correspondente. Este painel mantém o mapa aberto enquanto você explora.</p><ul><li>Arraste na área do diagrama para navegar.</li><li>Use a roda do mouse, os botões ou os gestos do touchpad para controlar o zoom.</li><li>Os nomes representam a estrutura local e o HTML v3 consultados.</li></ul></aside></div></div>', { wide: true, map: true });
    bindLibraryMindMap(modal, catalog);
  }
  function bindLibraryMindMap(modal, catalog) {
    var viewport = modal.querySelector('.pp-mindmap-viewport');
    var stage = modal.querySelector('.pp-mindmap-stage');
    var zoomLabel = modal.querySelector('[data-map-zoom-label]');
    var detail = modal.querySelector('[data-map-detail]');
    if (!viewport || !stage || !zoomLabel || !detail) return;
    var stateMap = { scale: 0.7, x: 0, y: 0, dragging: false, pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0 };
    var byId = {};
    catalog.nodes.forEach(function (node) { byId[node.id] = node; });
    function updateMap() {
      stage.style.transform = 'translate(' + Math.round(stateMap.x) + 'px, ' + Math.round(stateMap.y) + 'px) scale(' + stateMap.scale.toFixed(3) + ')';
      zoomLabel.textContent = Math.round(stateMap.scale * 100) + '%';
    }
    function centerMap() {
      var rect = viewport.getBoundingClientRect();
      stateMap.scale = Math.min(0.78, Math.max(0.44, (rect.width || 820) / 1840));
      stateMap.x = ((rect.width || 820) - 1840 * stateMap.scale) / 2;
      stateMap.y = Math.max(12, ((rect.height || 610) - 1180 * stateMap.scale) / 2);
      updateMap();
    }
    function setScale(next, clientX, clientY) {
      var oldScale = stateMap.scale;
      var newScale = Math.max(0.34, Math.min(1.65, next));
      if (newScale === oldScale) return;
      var rect = viewport.getBoundingClientRect();
      var localX = typeof clientX === 'number' ? clientX - rect.left : rect.width / 2;
      var localY = typeof clientY === 'number' ? clientY - rect.top : rect.height / 2;
      var worldX = (localX - stateMap.x) / oldScale;
      var worldY = (localY - stateMap.y) / oldScale;
      stateMap.scale = newScale;
      stateMap.x = localX - worldX * newScale;
      stateMap.y = localY - worldY * newScale;
      updateMap();
    }
    function selectNode(id) {
      var node = byId[id];
      if (!node) return;
      modal.querySelectorAll('[data-map-node]').forEach(function (button) { button.setAttribute('aria-pressed', button.dataset.mapNode === id ? 'true' : 'false'); });
      detail.innerHTML = '<span class="pp-mindmap-detail-kicker">' + escapeHtml(node.kind === 'module' ? 'MÓDULO DE CÓDIGO' : node.kind === 'file' ? 'ARQUIVO' : node.kind === 'rule' ? 'REGRA PRESERVADA' : node.kind === 'collection' ? 'INVENTÁRIO DO ACERVO' : 'RAMIFICAÇÃO') + '</span><h3>' + escapeHtml(node.label) + '</h3><p class="pp-mindmap-detail-meta">' + escapeHtml(node.meta) + '</p><div class="pp-mindmap-detail-copy">' + (node.details || []).map(function (item) { return '<p>' + escapeHtml(item) + '</p>'; }).join('') + '</div>';
    }
    modal.querySelectorAll('[data-map-node]').forEach(function (button) { button.addEventListener('click', function () { selectNode(button.dataset.mapNode); }); });
    modal.querySelectorAll('[data-map-control]').forEach(function (button) { button.addEventListener('click', function () { var control = button.dataset.mapControl; if (control === 'in') setScale(stateMap.scale + 0.12); else if (control === 'out') setScale(stateMap.scale - 0.12); else centerMap(); }); });
    viewport.addEventListener('wheel', function (event) { event.preventDefault(); setScale(stateMap.scale * (event.deltaY < 0 ? 1.12 : 0.88), event.clientX, event.clientY); }, { passive: false });
    viewport.addEventListener('pointerdown', function (event) {
      if (event.target.closest('[data-map-node]')) return;
      stateMap.dragging = true; stateMap.pointerId = event.pointerId; stateMap.startX = event.clientX; stateMap.startY = event.clientY; stateMap.originX = stateMap.x; stateMap.originY = stateMap.y;
      viewport.classList.add('is-dragging'); if (viewport.setPointerCapture) viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener('pointermove', function (event) { if (!stateMap.dragging || event.pointerId !== stateMap.pointerId) return; stateMap.x = stateMap.originX + event.clientX - stateMap.startX; stateMap.y = stateMap.originY + event.clientY - stateMap.startY; updateMap(); });
    function stopDragging(event) { if (event && stateMap.pointerId !== null && event.pointerId !== stateMap.pointerId) return; stateMap.dragging = false; stateMap.pointerId = null; viewport.classList.remove('is-dragging'); }
    viewport.addEventListener('pointerup', stopDragging); viewport.addEventListener('pointercancel', stopDragging);
    centerMap();
  }
  function layoutMindMap(project) {
    var map = getMindMap(project);
    var nodes = activeMindMapNodes(project);
    var byId = {}; var children = {}; var placed = {}; var leafIndex = 0; var positions = {};
    nodes.forEach(function (node) { byId[node.id] = node; children[node.id] = []; });
    nodes.forEach(function (node) { if (node.parentId && byId[node.parentId]) children[node.parentId].push(node); });
    Object.keys(children).forEach(function (key) { children[key].sort(function (a, b) { return Number(a.order || 0) - Number(b.order || 0) || String(a.title).localeCompare(String(b.title), 'pt-BR'); }); });
    var root = byId[map.rootId] || nodes.find(function (node) { return node.kind === 'root'; }) || nodes[0];
    function place(node, depth) {
      if (!node || placed[node.id]) return 70 + leafIndex++ * 112;
      placed[node.id] = true;
      var list = children[node.id] || [];
      var y = list.length ? list.map(function (child) { return place(child, depth + 1); }).reduce(function (sum, value) { return sum + value; }, 0) / list.length : 70 + leafIndex++ * 112;
      positions[node.id] = { x: 44 + depth * 318, y: y, depth: depth, node: node };
      return y;
    }
    place(root, 0);
    nodes.filter(function (node) { return !placed[node.id]; }).forEach(function (node) { place(node, 1); });
    var maxDepth = Object.keys(positions).reduce(function (max, key) { return Math.max(max, positions[key].depth); }, 0);
    return { map: map, nodes: nodes, children: children, positions: positions, width: Math.max(710, 44 + (maxDepth + 1) * 318), height: Math.max(430, 150 + Math.max(1, leafIndex) * 112) };
  }
  function mindMapDetailMarkup(node) {
    if (!node) return '<span class="pp-map-detail-kicker">COMO USAR</span><h2>Mapa mental vivo</h2><p>Selecione um elemento para ler seus detalhes. Você pode criar ramos, editar títulos e descrições, trocar o elemento de lugar ou excluí-lo sem apagar os filhos.</p><ul><li>Arraste o espaço vazio para navegar.</li><li>Use o mouse, touchpad ou os controles para ajustar o zoom.</li><li>Use “Novo ramo” para registrar qualquer novo arquivo, módulo, ideia ou regra.</li></ul>';
    return '<span class="pp-map-detail-kicker">' + escapeHtml(mindMapNodeLabel(node.kind).toUpperCase()) + '</span><div class="pp-map-detail-title"><span>' + uiIcon(mindMapNodeIcon(node.kind)) + '</span><h2>' + escapeHtml(node.title) + '</h2></div><p class="pp-map-detail-meta">Atualizado em ' + escapeHtml(formatDate(node.updatedAt)) + '</p><div class="pp-map-detail-copy">' + (node.description ? escapeHtml(node.description).split('\n').map(function (paragraph) { return '<p>' + paragraph + '</p>'; }).join('') : '<p>Sem detalhes registrados para este elemento.</p>') + '</div>';
  }
  function mindMapPageMarkup(project) {
    var layout = layoutMindMap(project);
    if (mindMapUi.projectId !== project.id) { mindMapUi = { projectId: project.id, selectedId: layout.map.rootId, initialized: false, scale: 1, x: 0, y: 0 }; }
    if (!getMindMapNode(project, mindMapUi.selectedId)) mindMapUi.selectedId = layout.map.rootId;
    var selected = getMindMapNode(project, mindMapUi.selectedId);
    var nodeMarkup = layout.nodes.map(function (node) {
      var position = layout.positions[node.id]; if (!position) return '';
      return '<button type="button" class="pp-map-node pp-map-node-' + escapeHtml(node.kind) + (node.id === mindMapUi.selectedId ? ' is-selected' : '') + '" data-action="mindmap-select" data-node="' + escapeHtml(node.id) + '" style="--map-node-x:' + position.x + 'px;--map-node-y:' + position.y + 'px"><span class="pp-map-node-icon">' + uiIcon(mindMapNodeIcon(node.kind)) + '</span><span><strong>' + escapeHtml(node.title) + '</strong><small>' + escapeHtml(mindMapNodeLabel(node.kind)) + '</small></span></button>';
    }).join('');
    var lineMarkup = layout.nodes.filter(function (node) { return node.parentId && layout.positions[node.parentId] && layout.positions[node.id]; }).map(function (node) {
      var from = layout.positions[node.parentId]; var to = layout.positions[node.id]; var startX = from.x + 246; var startY = from.y + 35; var endX = to.x; var endY = to.y + 35; var bend = Math.max(52, (endX - startX) * .46);
      return '<path d="M ' + startX + ' ' + startY + ' C ' + (startX + bend) + ' ' + startY + ', ' + (endX - bend) + ' ' + endY + ', ' + endX + ' ' + endY + '"></path>';
    }).join('');
    var removeDisabled = !selected || selected.id === layout.map.rootId;
    return headerMarkup('Mapa mental', project.name + ' — uma estrutura editável para organizar arquivos, módulos, regras e próximos passos.', 'projeto-detalhes.html?id=' + encodeURIComponent(project.id))
      + '<main class="pp-shell pp-map-page"><section class="pp-map-page-head"><div class="pp-map-breadcrumb">' + projectLogo(project, true) + '<div><span>PROJETO</span><strong>' + escapeHtml(project.name) + '</strong></div></div><div class="pp-map-actions"><button class="pp-button" data-action="mindmap-add">' + uiIcon('plus') + 'Novo ramo</button><button class="pp-button pp-secondary" data-action="mindmap-edit"' + (selected ? '' : ' disabled') + '>' + uiIcon('edit') + 'Editar</button><button class="pp-button pp-danger" data-action="mindmap-delete"' + (removeDisabled ? ' disabled' : '') + '>' + uiIcon('trash') + 'Excluir</button></div></section><section class="pp-map-board"><div class="pp-map-toolbar"><div class="pp-map-toolbar-help">' + uiIcon('map') + '<span>Estrutura organizada automaticamente por ramificações</span></div><div class="pp-map-controls"><button type="button" class="pp-map-control" data-map-control="out" aria-label="Diminuir zoom">−</button><output data-map-zoom>100%</output><button type="button" class="pp-map-control" data-map-control="in" aria-label="Aumentar zoom">+</button><button type="button" class="pp-map-center" data-map-control="center">Centralizar</button></div></div><div class="pp-map-layout"><div class="pp-map-viewport" tabindex="0" data-map-width="' + layout.width + '" data-map-height="' + layout.height + '" aria-label="Mapa mental interativo. Arraste para navegar e use a rolagem para alterar o zoom."><div class="pp-map-stage" style="--map-stage-w:' + layout.width + 'px;--map-stage-h:' + layout.height + 'px"><svg class="pp-map-lines" viewBox="0 0 ' + layout.width + ' ' + layout.height + '" aria-hidden="true">' + lineMarkup + '</svg>' + nodeMarkup + '</div></div><aside class="pp-map-detail" data-map-detail>' + mindMapDetailMarkup(selected) + '</aside></div></section></main>';
  }
  function bindMindMapBoard() {
    var viewport = APP && APP.querySelector('.pp-map-viewport');
    var stage = APP && APP.querySelector('.pp-map-stage');
    var zoomOutput = APP && APP.querySelector('[data-map-zoom]');
    if (!viewport || !stage || !zoomOutput) return;
    var mapWidth = Number(viewport.dataset.mapWidth || 900); var mapHeight = Number(viewport.dataset.mapHeight || 600);
    function update() { stage.style.transform = 'translate(' + Math.round(mindMapUi.x) + 'px, ' + Math.round(mindMapUi.y) + 'px) scale(' + mindMapUi.scale.toFixed(3) + ')'; zoomOutput.textContent = Math.round(mindMapUi.scale * 100) + '%'; }
    function center() { var rect = viewport.getBoundingClientRect(); var fit = Math.min((rect.width - 46) / mapWidth, (rect.height - 46) / mapHeight); mindMapUi.scale = Math.min(.95, Math.max(.22, fit)); mindMapUi.x = Math.max(18, (rect.width - mapWidth * mindMapUi.scale) / 2); mindMapUi.y = Math.max(18, (rect.height - mapHeight * mindMapUi.scale) / 2); mindMapUi.initialized = true; update(); }
    function scale(next, clientX, clientY) { var old = mindMapUi.scale; var value = Math.max(.22, Math.min(1.7, next)); if (value === old) return; var rect = viewport.getBoundingClientRect(); var localX = typeof clientX === 'number' ? clientX - rect.left : rect.width / 2; var localY = typeof clientY === 'number' ? clientY - rect.top : rect.height / 2; var worldX = (localX - mindMapUi.x) / old; var worldY = (localY - mindMapUi.y) / old; mindMapUi.scale = value; mindMapUi.x = localX - worldX * value; mindMapUi.y = localY - worldY * value; update(); }
    if (!mindMapUi.initialized) center(); else update();
    APP.querySelectorAll('[data-map-control]').forEach(function (button) { button.addEventListener('click', function () { var action = button.dataset.mapControl; if (action === 'in') scale(mindMapUi.scale + .12); else if (action === 'out') scale(mindMapUi.scale - .12); else center(); }); });
    viewport.addEventListener('wheel', function (event) { event.preventDefault(); scale(mindMapUi.scale * (event.deltaY < 0 ? 1.12 : .88), event.clientX, event.clientY); }, { passive: false });
    var drag = null;
    viewport.addEventListener('pointerdown', function (event) { if (event.target.closest('[data-action="mindmap-select"]')) return; drag = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: mindMapUi.x, originY: mindMapUi.y }; viewport.classList.add('is-dragging'); if (viewport.setPointerCapture) viewport.setPointerCapture(event.pointerId); });
    viewport.addEventListener('pointermove', function (event) { if (!drag || drag.id !== event.pointerId) return; mindMapUi.x = drag.originX + event.clientX - drag.x; mindMapUi.y = drag.originY + event.clientY - drag.y; update(); });
    function stop(event) { if (!drag || (event && event.pointerId !== drag.id)) return; drag = null; viewport.classList.remove('is-dragging'); }
    viewport.addEventListener('pointerup', stop); viewport.addEventListener('pointercancel', stop);
  }
  function mindMapDescendants(project, nodeId) {
    var nodes = activeMindMapNodes(project); var result = {}; var changed = true; result[nodeId] = true;
    while (changed) { changed = false; nodes.forEach(function (node) { if (node.parentId && result[node.parentId] && !result[node.id]) { result[node.id] = true; changed = true; } }); }
    return result;
  }
  function mindMapNodeForm(project, node, initialParentId) {
    var map = getMindMap(project); var root = getMindMapNode(project, map.rootId); var blocked = node ? mindMapDescendants(project, node.id) : {}; var parents = activeMindMapNodes(project).filter(function (candidate) { return !blocked[candidate.id]; });
    var isRoot = node && node.id === map.rootId;
    var selectedParent = node ? node.parentId : (initialParentId || (root && root.id));
    var parentOptions = parents.map(function (candidate) { return '<option value="' + escapeHtml(candidate.id) + '"' + (candidate.id === selectedParent ? ' selected' : '') + '>' + escapeHtml(candidate.title) + '</option>'; }).join('');
    var typeOptions = isRoot ? '<option value="root">Projeto</option>' : optionList(['folder', 'file', 'module', 'collection', 'rule', 'note'], node ? node.kind : 'note');
    var locationOptions = isRoot ? '<option value="">Nó central</option>' : parentOptions;
    var modal = showModal(node ? 'Editar elemento do mapa' : 'Novo ramo no mapa', node ? 'Você pode alterar o tipo, os detalhes e o local desta ramificação.' : 'Registre um arquivo, módulo, regra ou anotação e escolha onde ele ficará.', '<form id="pp-map-node-form"><div class="pp-form-grid"><label class="pp-form-label pp-full"><span>Título *</span><input class="pp-field" name="title" required maxlength="120" value="' + escapeHtml(node ? node.title : '') + '" placeholder="Ex.: Novo módulo de autenticação"></label><label class="pp-form-label"><span>Tipo</span><select class="pp-field" name="kind"' + (isRoot ? ' disabled' : '') + '>' + typeOptions + '</select></label><label class="pp-form-label"><span>Dentro de</span><select class="pp-field" name="parentId"' + (isRoot ? ' disabled' : '') + '>' + locationOptions + '</select></label><label class="pp-form-label pp-full"><span>Detalhes</span><textarea class="pp-field" name="description" maxlength="4000" placeholder="Explique a responsabilidade deste elemento, regras, caminhos ou próximos passos.">' + escapeHtml(node ? node.description : '') + '</textarea></label></div><div class="pp-error" id="pp-map-node-error"></div><div class="pp-modal-actions"><button type="button" class="pp-button pp-secondary" data-action="close-modal">Cancelar</button><button type="submit" class="pp-button">Salvar no mapa</button></div></form>', { wide: true });
    var form = modal.querySelector('#pp-map-node-form');
    form.addEventListener('submit', function (event) {
      event.preventDefault(); var title = String(new FormData(form).get('title') || '').trim(); var error = modal.querySelector('#pp-map-node-error'); if (!title) { error.textContent = 'Informe um título para o elemento.'; return; }
      var stamp = now(); var kind = isRoot ? 'root' : String(new FormData(form).get('kind') || 'note'); var parentId = isRoot ? null : String(new FormData(form).get('parentId') || map.rootId); var description = String(new FormData(form).get('description') || '').trim(); var item = node || { id: id('mapnode'), createdAt: stamp, order: map.nodes.length };
      item.title = title; item.kind = kind; item.parentId = parentId; item.description = description; item.updatedAt = stamp;
      if (!node) map.nodes.push(item);
      map.updatedAt = stamp; project.updatedAt = stamp; mindMapUi.selectedId = item.id;
      state.activities.push({ id: id('activity-map'), projectId: project.id, title: node ? 'Elemento do mapa mental atualizado' : 'Novo elemento adicionado ao mapa mental', details: title + (node ? ' foi atualizado.' : ' foi incluído em ' + project.name + '.'), occurredAt: stamp, source: 'Mapa mental', idempotencyKey: id('map-change'), createdAt: stamp, updatedAt: stamp });
      persist(node ? 'mindmap-node-update' : 'mindmap-node-create'); closeModal(); render(); toast(node ? 'Elemento atualizado no mapa.' : 'Novo ramo adicionado ao mapa.');
    });
  }
  function deleteMindMapNode(project, nodeId) {
    var map = getMindMap(project); var node = getMindMapNode(project, nodeId); if (!node) return; if (node.id === map.rootId) { toast('O nó central do projeto não pode ser excluído.'); return; }
    if (!window.confirm('Excluir “' + node.title + '”? Os elementos filhos serão mantidos e movidos para o nível acima.')) return;
    var stamp = now(); var parentId = node.parentId || map.rootId;
    map.nodes.forEach(function (item) { if (item.parentId === node.id && !item.deletedAt) { item.parentId = parentId; item.updatedAt = stamp; } });
    node.deletedAt = stamp; node.updatedAt = stamp; map.updatedAt = stamp; project.updatedAt = stamp; mindMapUi.selectedId = parentId;
    state.activities.push({ id: id('activity-map'), projectId: project.id, title: 'Elemento removido do mapa mental', details: node.title + ' foi removido; seus ramos foram preservados no nível acima.', occurredAt: stamp, source: 'Mapa mental', idempotencyKey: id('map-remove'), createdAt: stamp, updatedAt: stamp });
    persist('mindmap-node-delete'); render(); toast('Elemento removido; os ramos filhos foram preservados.');
  }
  function detailMarkup(project) {
    if (!project) return headerMarkup('Projeto não encontrado', 'Ele pode ter sido excluído ou o endereço está incorreto.', 'projetos-pessoais.html#projects') + '<main class="pp-shell"><div class="pp-empty"><strong>Projeto não encontrado</strong><a class="pp-button" href="projetos-pessoais.html#projects">Ver projetos</a></div></main>';
    var projectIdeas = active(state.ideas).filter(function (idea) { return idea.projectId === project.id; }).sort(function (a, b) { return toTime(b.updatedAt) - toTime(a.updatedAt); });
    var events = active(state.activities).filter(function (event) { return event.projectId === project.id; }).sort(function (a, b) { return toTime(b.occurredAt) - toTime(a.occurredAt); });
    var totalEventos = events.length, maisEventos = '';
    if (isRelatorioSkin(project) && RS_COMMITS.length) {
      events = events.concat(RS_COMMITS.map(rsEventoDoCommit)).sort(function (a, b) { return toTime(b.occurredAt) - toTime(a.occurredAt); });
      totalEventos = events.length;
      if (events.length > RS_LIMITE) {
        maisEventos = '<div style="text-align:center;margin-top:12px"><button class="pp-button pp-secondary pp-small" data-action="rs-mais">Mostrar mais (' + (events.length - RS_LIMITE) + ' restantes)</button></div>';
        events = events.slice(0, RS_LIMITE);
      }
    }
    var tools = Array.isArray(project.tools) ? project.tools : [];
    var links = safeUrl(project.url) ? '<div class="pp-project-links"><a class="pp-project-link" target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safeUrl(project.url)) + '">' + uiIcon('external') + 'Abrir link principal</a></div>' : '<p class="pp-form-note">Nenhum link principal cadastrado.</p>';
    return headerMarkup(project.name, 'Detalhes, ferramentas, histórico e ideias deste projeto.', 'projetos-pessoais.html#projects')
      + '<main class="pp-shell"><section class="pp-detail-top">' + projectLogo(project) + '<div><h1>' + escapeHtml(project.name) + '</h1><p>' + escapeHtml(project.description || 'Sem descrição.') + '</p><div class="pp-tags" style="margin-top:10px"><span class="pp-badge pp-status-' + statusClass(project.status) + '">' + escapeHtml(project.status) + '</span><span class="pp-tag">' + escapeHtml(project.type || 'Outro') + '</span></div></div><div class="pp-detail-actions"><button class="pp-button" data-action="open-mindmap" data-id="' + project.id + '">' + uiIcon('map') + 'Mapa mental</button><button class="pp-button pp-secondary" data-action="edit-project" data-id="' + project.id + '">' + uiIcon('edit') + 'Editar</button><button class="pp-button pp-danger" data-action="delete-project" data-id="' + project.id + '">' + uiIcon('trash') + 'Excluir</button></div></section>' + libraryDocumentationMarkup(project)
      + '<div class="pp-detail-grid"><div>' + bugsPanelMarkup(project) + '<section class="pp-panel"><div class="pp-panel-head"><h2>Linha do tempo' + (isRelatorioSkin(project) && RS_COMMITS.length ? ' <small style="font-weight:500;font-size:.72em;opacity:.7">· ' + totalEventos + ' atualizações, automáticas pelo GitHub</small>' : '') + '</h2><button class="pp-button pp-small" data-action="new-event" data-project="' + project.id + '">' + uiIcon('plus') + 'Registrar</button></div>' + (events.length ? '<div class="pp-timeline">' + events.map(eventCard).join('') + '</div>' + maisEventos : emptyMarkup('Sem atualizações ainda', 'Registre um avanço, deploy, ajuste ou qualquer passo importante.')) + '</section><section class="pp-panel"><div class="pp-panel-head"><h2>Ideias vinculadas</h2><a class="pp-button pp-small pp-secondary" href="projetos-pessoais.html#ideas">Ver todas</a></div>' + (projectIdeas.length ? projectIdeas.map(ideaMini).join('') : '<p class="pp-form-note">Ainda não há ideias vinculadas a este projeto.</p>') + '</section>' + projectChecklistMarkup(project) + '</div>'
      + '<aside>' + relatedProjectsMarkup(project) + '<section class="pp-panel"><h2>Links</h2><div style="height:12px"></div>' + links + '</section><section class="pp-panel"><div class="pp-panel-head"><h2>Ferramentas</h2><button class="pp-button pp-small" data-action="edit-project" data-id="' + project.id + '">Gerenciar</button></div>' + (tools.length ? '<div class="pp-tool-list">' + tools.map(function (tool) { return '<button class="pp-tool-button" data-action="open-tool" data-project="' + project.id + '" data-tool="' + tool.id + '"><span>' + providerIcon(tool.provider) + '<span><strong>' + escapeHtml(tool.label || tool.provider) + '</strong><span>' + escapeHtml(tool.provider) + ' · acesso protegido</span></span></span><b>' + uiIcon('lock') + '</b></button>'; }).join('') + '</div>' : '<p class="pp-form-note">Adicione GitHub, Supabase, I.As ou outra ferramenta ao editar o projeto.</p>') + '</section></aside></div></main>';
  }
  function eventCard(event) {
    var external = safeUrl(event.externalUrl) ? ' · <a target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safeUrl(event.externalUrl)) + '">' + (event.readonly ? 'ver no GitHub' : 'abrir referência') + '</a>' : '';
    var botoes = event.readonly ? '' : '<div class="pp-toolbar"><button class="pp-icon-button" title="Editar evento" aria-label="Editar evento" data-action="edit-event" data-id="' + event.id + '">' + uiIcon('edit') + '</button><button class="pp-icon-button" title="Excluir evento" aria-label="Excluir evento" data-action="delete-event" data-id="' + event.id + '">' + uiIcon('trash') + '</button></div>';
    return '<article class="pp-event"><div class="pp-event-top"><div><h3>' + escapeHtml(event.title) + '</h3><time>' + escapeHtml(formatDate(event.occurredAt)) + ' · ' + escapeHtml(event.source || 'Manual') + external + '</time></div>' + botoes + '</div>' + (event.details ? '<p' + (event.readonly ? ' style="white-space:pre-line"' : '') + '>' + escapeHtml(event.details) + '</p>' : '') + '</article>';
  }
  function ideaMini(idea) {
    var stats = checklistStats(idea.checklist);
    return '<div class="pp-idea-mini"><span class="pp-logo">' + (idea.favorite ? '★' : uiIcon('idea')) + '</span><div><strong>' + escapeHtml(idea.title) + '</strong><span>' + escapeHtml(idea.priority) + ' · ' + escapeHtml(idea.status) + (stats.total ? ' · ' + stats.done + '/' + stats.total : '') + '</span></div></div>';
  }
  function currentTab() {
    var hash = (window.location.hash || '').replace('#', '').toLowerCase();
    return ['projects', 'ideas', 'ias'].indexOf(hash) >= 0 ? hash : 'projects';
  }
  // Filtros e troca rápida de status dos bugs (delegado, sobrevive ao render).
  if (APP && !APP.__bugsLigado) {
    APP.__bugsLigado = true;
    APP.addEventListener('change', function (e) {
      var st = e.target.closest && e.target.closest('[data-bug-status]');
      if (st) { var b = active(state.bugs).find(function (x) { return x.id === st.dataset.bugStatus; }); if (b) { mudarStatusBug(b, st.value); persist('bug-status'); render(); toast((b.codigo || 'Bug') + ': ' + b.status + '.'); } return; }
      var fl = e.target.closest && e.target.closest('[data-bug-filtro]');
      if (fl && fl.dataset.bugFiltro !== 'q') { var f = bugFiltros[fl.dataset.project] || {}; f[fl.dataset.bugFiltro] = fl.value; bugFiltros[fl.dataset.project] = f; render(); }
    });
    var tBusca = null;
    APP.addEventListener('input', function (e) {
      var fl = e.target.closest && e.target.closest('[data-bug-filtro="q"]'); if (!fl) return;
      var f = bugFiltros[fl.dataset.project] || {}; f.q = fl.value; bugFiltros[fl.dataset.project] = f;
      clearTimeout(tBusca); tBusca = setTimeout(function () {
        render();
        var novo = APP.querySelector('[data-bug-filtro="q"][data-project="' + fl.dataset.project + '"]');
        if (novo) { novo.focus(); novo.setSelectionRange(novo.value.length, novo.value.length); }
      }, 250);
    });
  }
  function render() {
    if (!APP) return;
    if (PAGE === 'mindmap') {
      var mapProjectId = new URLSearchParams(window.location.search).get('id');
      var mapProject = getProject(mapProjectId);
      APP.innerHTML = mapProject ? mindMapPageMarkup(mapProject) : detailMarkup(null);
      document.title = mapProject ? 'Mapa mental · ' + mapProject.name : 'Mapa mental não encontrado';
      if (mapProject) {
        if (window.requestAnimationFrame) window.requestAnimationFrame(bindMindMapBoard); else bindMindMapBoard();
      }
    } else if (PAGE === 'detail') {
      var projectId = new URLSearchParams(window.location.search).get('id');
      APP.innerHTML = detailMarkup(getProject(projectId));
      document.title = getProject(projectId) ? getProject(projectId).name + ' · Projetos pessoais' : 'Projeto não encontrado';
    } else {
      APP.innerHTML = workspaceMarkup();
      updateAiTimers();
    }
  }

  function showModal(title, description, content, options) {
    closeModal();
    var modal = document.createElement('div');
    modal.className = 'pp-modal';
    if (options && options.sensitive) modal.dataset.sensitive = 'true';
    modal.innerHTML = '<div class="pp-modal-card' + (options && options.wide ? ' pp-modal-wide' : '') + (options && options.map ? ' pp-modal-map' : '') + '" role="dialog" aria-modal="true" aria-label="' + escapeHtml(title) + '"><div class="pp-modal-header"><div><h2>' + escapeHtml(title) + '</h2>' + (description ? '<p>' + escapeHtml(description) + '</p>' : '') + '</div><button class="pp-modal-close" data-action="close-modal" aria-label="Fechar">×</button></div><div class="pp-modal-body">' + content + '</div></div>';
    modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(); });
    document.body.appendChild(modal);
    var focusable = modal.querySelector('input,select,textarea,button');
    if (focusable) focusable.focus();
    return modal;
  }
  function closeModal() { var modal = document.querySelector('.pp-modal'); if (modal) modal.remove(); }
  function toast(message) {
    var old = document.querySelector('.pp-toast'); if (old) old.remove();
    var element = document.createElement('div'); element.className = 'pp-toast'; element.textContent = message; document.body.appendChild(element);
    window.setTimeout(function () { element.remove(); }, 3400);
  }

  function projectForm(project) {
    project = project || { status: 'Ideia', type: 'Site', tools: [] };
    var tools = clone(project.tools || []);
    var modal = showModal(project.id ? 'Editar projeto' : 'Novo projeto', 'As informações podem ser atualizadas depois.', '<form id="pp-project-form"><div class="pp-form-grid"><label class="pp-form-label"><span>Nome do projeto *</span><input class="pp-field" name="name" required maxlength="100" value="' + escapeHtml(project.name || '') + '" placeholder="Ex.: Biblioteca digital"></label><label class="pp-form-label"><span>Tipo</span><select class="pp-field" name="type">' + optionList(['Site', 'App', 'Outro'], project.type || 'Site') + '</select></label><label class="pp-form-label pp-full"><span>Descrição</span><textarea class="pp-field" name="description" maxlength="1200" placeholder="O que este projeto faz e em que ponto ele está?">' + escapeHtml(project.description || '') + '</textarea></label><label class="pp-form-label"><span>Status</span><select class="pp-field" name="status">' + optionList(PROJECT_STATUSES, project.status || 'Ideia') + '</select></label><label class="pp-form-label"><span>Link principal</span><input class="pp-field" name="url" type="url" value="' + escapeHtml(project.url || '') + '" placeholder="https://..."></label><label class="pp-form-label pp-full"><span>Logo ou ícone</span><input class="pp-field" name="logo" type="file" accept="image/*"><small>Imagem opcional; será comprimida antes de sincronizar.</small></label></div><div class="pp-tools-editor"><h3>Ferramentas do projeto</h3><div class="pp-tool-add"><select class="pp-field" id="pp-tool-provider">' + optionList(PROVIDERS, 'GitHub') + '</select><input class="pp-field" id="pp-tool-url" type="url" placeholder="Link da ferramenta (opcional)"><button type="button" class="pp-button pp-small" id="pp-add-tool">Adicionar</button></div><div class="pp-tool-drafts" id="pp-tool-drafts"></div></div><div class="pp-error" id="pp-form-error"></div><div class="pp-modal-actions"><button type="button" class="pp-button pp-secondary" data-action="close-modal">Cancelar</button><button class="pp-button" type="submit">Salvar projeto</button></div></form>', { wide: true });
    var form = modal.querySelector('#pp-project-form');
    var drafts = modal.querySelector('#pp-tool-drafts');
    function renderTools() {
      drafts.innerHTML = tools.length ? tools.map(function (tool) { return '<span class="pp-tool-draft">' + providerIcon(tool.provider) + escapeHtml(tool.label || tool.provider) + '<button type="button" aria-label="Remover ' + escapeHtml(tool.label || tool.provider) + '" data-remove-tool="' + tool.id + '">×</button></span>'; }).join('') : '<span class="pp-form-note">Nenhuma ferramenta cadastrada.</span>';
      drafts.querySelectorAll('[data-remove-tool]').forEach(function (button) { button.addEventListener('click', function () { tools = tools.filter(function (tool) { return tool.id !== button.dataset.removeTool; }); renderTools(); }); });
    }
    renderTools();
    modal.querySelector('#pp-add-tool').addEventListener('click', function () {
      var provider = modal.querySelector('#pp-tool-provider').value;
      var url = modal.querySelector('#pp-tool-url').value.trim();
      tools.push({ id: id('tool'), provider: provider, label: provider, url: url, createdAt: now(), updatedAt: now() });
      modal.querySelector('#pp-tool-url').value = '';
      renderTools();
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var error = modal.querySelector('#pp-form-error');
      var name = form.elements.name.value.trim();
      if (!name) { error.textContent = 'Informe o nome do projeto.'; return; }
      var save = function (logo) {
        var stamp = now();
        var record = project.id ? state.projects.find(function (item) { return item.id === project.id; }) : null;
        if (!record) { record = { id: id('project'), createdAt: stamp }; state.projects.push(record); }
        record.name = name; record.type = form.elements.type.value; record.description = form.elements.description.value.trim(); record.status = form.elements.status.value; record.url = form.elements.url.value.trim(); record.tools = tools; record.updatedAt = stamp;
        if (logo) record.logo = logo;
        persist('project-save'); closeModal(); render(); toast('Projeto salvo.');
      };
      var image = form.elements.logo.files && form.elements.logo.files[0];
      if (!image) { save(null); return; }
      compressImage(image).then(save).catch(function (message) { error.textContent = message || 'Não foi possível preparar esta imagem.'; });
    });
  }
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file.type || file.type.indexOf('image/') !== 0) { reject('Escolha uma imagem válida.'); return; }
      if (file.size > 8 * 1024 * 1024) { reject('Escolha uma imagem com no máximo 8 MB.'); return; }
      var reader = new FileReader();
      reader.onerror = function () { reject('Não foi possível ler a imagem.'); };
      reader.onload = function () {
        var image = new Image();
        image.onerror = function () { reject('Não foi possível abrir a imagem.'); };
        image.onload = function () {
          var scale = Math.min(1, 512 / Math.max(image.width, image.height));
          var canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
          var context = canvas.getContext('2d'); context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/webp', .82));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function deleteProject(projectId) {
    var project = getProject(projectId); if (!project) return;
    if (!window.confirm('Excluir "' + project.name + '"? As ideias serão mantidas como Projeto futuro.')) return;
    var stamp = now(); project.deletedAt = stamp; project.updatedAt = stamp;
    state.ideas.forEach(function (idea) { if (!idea.deletedAt && idea.projectId === projectId) { idea.projectId = null; idea.updatedAt = stamp; } });
    state.activities.forEach(function (event) { if (!event.deletedAt && event.projectId === projectId) { event.deletedAt = stamp; event.updatedAt = stamp; } });
    (state.bugs || []).forEach(function (b) { if (!b.deletedAt && b.projectId === projectId) { b.deletedAt = stamp; b.updatedAt = stamp; } });
    persist('project-delete'); closeModal();
    if (PAGE === 'detail') window.location.href = 'projetos-pessoais.html#projects'; else { render(); toast('Projeto excluído.'); }
  }

  function newChecklistItem(text) { var stamp = now(); return { id: id('chk'), text: text, done: false, children: [], createdAt: stamp, updatedAt: stamp }; }
  function checklistStats(items) {
    var total = 0, done = 0;
    (items || []).forEach(function (item) {
      total += 1; if (item.done) done += 1;
      (item.children || []).forEach(function (child) { total += 1; if (child.done) done += 1; });
    });
    return { total: total, done: done };
  }
  function findChecklistItem(items, itemId) {
    for (var index = 0; index < (items || []).length; index += 1) {
      if (items[index].id === itemId) return { item: items[index], list: items, index: index };
      var child = findChecklistItem(items[index].children || [], itemId);
      if (child) return child;
    }
    return null;
  }
  function checklistItemsMarkup(items, actionPrefix, ownerAttr, depth) {
    if (!items || !items.length) return '<p class="pp-form-note">Nenhum item ainda.</p>';
    return '<ul class="' + (depth ? 'pp-checklist-children' : 'pp-checklist-list') + '">' + items.map(function (item) {
      var childMarkup = !depth && item.children && item.children.length ? checklistItemsMarkup(item.children, actionPrefix, ownerAttr, 1) : '';
      return '<li class="pp-checklist-item' + (item.done ? ' is-done' : '') + '">'
        + '<div class="pp-checklist-row">'
        + '<button type="button" class="pp-checklist-toggle" aria-label="Concluir item" data-action="' + actionPrefix + '-toggle"' + ownerAttr + ' data-item="' + item.id + '"></button>'
        + '<span class="pp-checklist-text">' + escapeHtml(item.text) + '</span>'
        + '<span class="pp-checklist-actions">'
        + (!depth ? '<button type="button" class="pp-icon-button pp-tiny" title="Adicionar subitem" aria-label="Adicionar subitem" data-action="' + actionPrefix + '-add-sub"' + ownerAttr + ' data-item="' + item.id + '">' + uiIcon('plus') + '</button>' : '')
        + '<button type="button" class="pp-icon-button pp-tiny" title="Editar item" aria-label="Editar item" data-action="' + actionPrefix + '-edit"' + ownerAttr + ' data-item="' + item.id + '">' + uiIcon('edit') + '</button>'
        + '<button type="button" class="pp-icon-button pp-tiny" title="Remover item" aria-label="Remover item" data-action="' + actionPrefix + '-delete"' + ownerAttr + ' data-item="' + item.id + '">' + uiIcon('trash') + '</button>'
        + '</span></div>' + childMarkup + '</li>';
    }).join('') + '</ul>';
  }
  function projectChecklistMarkup(project) {
    var items = Array.isArray(project.checklist) ? project.checklist : [];
    var stats = checklistStats(items);
    return '<section class="pp-panel"><div class="pp-panel-head"><h2>Checklist do projeto</h2>' + (stats.total ? '<span class="pp-tag">' + stats.done + '/' + stats.total + '</span>' : '') + '</div>'
      + (stats.total ? '<div class="pp-checklist-progress"><div class="pp-checklist-progress-bar"><span style="width:' + Math.round(stats.done / stats.total * 100) + '%"></span></div></div>' : '')
      + '<div class="pp-quick-add-row"><input class="pp-field pp-quick-add-input" id="pp-project-checklist-input" placeholder="Adicionar passo do projeto..."><button type="button" class="pp-button pp-small" data-action="checklist-add" data-project="' + project.id + '">' + uiIcon('plus') + 'Adicionar</button></div>'
      + checklistItemsMarkup(items, 'checklist', ' data-project="' + project.id + '"', 0) + '</section>';
  }
  function formatDueDate(value) {
    if (!value) return null;
    var date = new Date(value + 'T00:00:00');
    if (isNaN(date.getTime())) return null;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var diffDays = Math.round((date - today) / 86400000);
    var label = diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : diffDays === -1 ? 'Ontem' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return { label: label, overdue: diffDays < 0 };
  }
  function uniqueIdeaSections() {
    var seen = {}; var list = [];
    active(state.ideas).forEach(function (item) {
      var section = (item.section || '').trim();
      if (section && !seen[section]) { seen[section] = true; list.push(section); }
    });
    return list;
  }
  function labelChipsMarkup(list) {
    return (list && list.length) ? list.map(function (label) { return '<span class="pp-tool-draft pp-label-chip">#' + escapeHtml(label) + '<button type="button" aria-label="Remover etiqueta ' + escapeHtml(label) + '" data-action="idea-label-remove" data-label="' + escapeHtml(label) + '">×</button></span>'; }).join('') : '<span class="pp-form-note">Nenhuma etiqueta ainda.</span>';
  }
  function attachmentsMarkup(list) {
    if (!list || !list.length) return '<p class="pp-form-note">Nenhum anexo ainda.</p>';
    return '<div class="pp-attachments">' + list.map(function (attachment) {
      var isImage = attachment.kind === 'image';
      return '<div class="pp-attachment-item">' + (isImage ? '<img class="pp-attachment-thumb" src="' + attachment.dataUrl + '" alt="">' : '<span class="pp-attachment-icon">' + uiIcon('folder') + '</span>')
        + '<a class="pp-attachment-name" href="' + attachment.dataUrl + '" target="_blank" rel="noopener noreferrer" download="' + escapeHtml(attachment.name) + '">' + escapeHtml(attachment.name) + '</a>'
        + '<button type="button" class="pp-icon-button pp-tiny" title="Remover anexo" aria-label="Remover anexo" data-action="idea-attachment-remove" data-id="' + attachment.id + '">' + uiIcon('trash') + '</button></div>';
    }).join('') + '</div>';
  }
  function readAttachment(file) {
    var isImage = file.type && file.type.indexOf('image/') === 0;
    var maxSize = isImage ? 8 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) { toast('"' + file.name + '" é muito grande (máx. ' + (isImage ? '8' : '5') + ' MB).'); return Promise.resolve(null); }
    if (isImage) {
      return compressImage(file).then(function (dataUrl) {
        return { id: id('att'), name: file.name, kind: 'image', mime: 'image/webp', size: dataUrl.length, dataUrl: dataUrl, createdAt: now() };
      }).catch(function (message) { toast(message || 'Não foi possível preparar "' + file.name + '".'); return null; });
    }
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onerror = function () { toast('Não foi possível ler "' + file.name + '".'); resolve(null); };
      reader.onload = function () { resolve({ id: id('att'), name: file.name, kind: 'file', mime: file.type || 'application/octet-stream', size: file.size, dataUrl: reader.result, createdAt: now() }); };
      reader.readAsDataURL(file);
    });
  }
  function favoriteMarkupInline(isActive) {
    return '<button type="button" id="pp-idea-favorite-host" class="pp-star-toggle' + (isActive ? ' is-active' : '') + '" data-action="idea-favorite-toggle" aria-pressed="' + (isActive ? 'true' : 'false') + '">' + (isActive ? '★' : '☆') + ' Favorita</button>';
  }
  function ideaForm(idea) {
    idea = idea || { status: 'Para o futuro', priority: 'Média', projectId: null };
    var checklistDraft = clone(idea.checklist || []);
    var labelsDraft = clone(idea.labels || []);
    var attachmentsDraft = clone(idea.attachments || []);
    var favoriteDraft = !!idea.favorite;
    var projectOptions = '<option value="">Projeto futuro</option>' + active(state.projects).map(function (project) { return '<option value="' + project.id + '"' + (idea.projectId === project.id ? ' selected' : '') + '>' + escapeHtml(project.name) + '</option>'; }).join('');
    var sectionOptions = uniqueIdeaSections().map(function (section) { return '<option value="' + escapeHtml(section) + '"></option>'; }).join('');
    var modal = showModal(idea.id ? 'Editar ideia' : 'Nova ideia', 'A data de criação e a última edição são registradas automaticamente.',
      '<form id="pp-idea-form">'
      + '<div class="pp-form-grid">'
      + '<label class="pp-form-label pp-full"><span>Título *</span><input class="pp-field" required maxlength="160" name="title" value="' + escapeHtml(idea.title || '') + '" placeholder="Descreva a ideia em poucas palavras"></label>'
      + '<label class="pp-form-label pp-full"><span>Descrição detalhada</span><textarea class="pp-field" name="description" maxlength="3000" placeholder="Registre os detalhes para não esquecer.">' + escapeHtml(idea.description || '') + '</textarea></label>'
      + '<label class="pp-form-label"><span>Projeto</span><select class="pp-field" name="projectId">' + projectOptions + '</select></label>'
      + '<label class="pp-form-label"><span>Seção</span><input class="pp-field" name="section" list="pp-section-options" maxlength="60" value="' + escapeHtml(idea.section || '') + '" placeholder="Ex.: Backlog, Em teste..."><datalist id="pp-section-options">' + sectionOptions + '</datalist></label>'
      + '<label class="pp-form-label"><span>Status</span><select class="pp-field" name="status">' + optionList(IDEA_STATUSES, idea.status) + '</select></label>'
      + '<label class="pp-form-label"><span>Prioridade</span><select class="pp-field" name="priority">' + optionList(PRIORITIES, idea.priority) + '</select></label>'
      + '<label class="pp-form-label"><span>Prazo</span><div class="pp-duedate-row"><input class="pp-field" type="date" name="dueDate" id="pp-idea-duedate" value="' + escapeHtml(idea.dueDate || '') + '"><div class="pp-duedate-quick"><button type="button" data-action="idea-due-quick" data-days="0">Hoje</button><button type="button" data-action="idea-due-quick" data-days="1">Amanhã</button><button type="button" data-action="idea-due-quick" data-days="7">Em 7 dias</button><button type="button" data-action="idea-due-quick" data-days="clear">Sem prazo</button></div></div></label>'
      + '<label class="pp-form-label"><span>Destaque</span><div>' + favoriteMarkupInline(favoriteDraft) + '</div></label>'
      + '</div>'
      + '<div class="pp-form-section"><h3>Etiquetas</h3><p class="pp-form-section-hint">Palavras-chave para agrupar ideias parecidas entre projetos, como no Todoist.</p><div class="pp-quick-add-row"><input class="pp-field pp-quick-add-input" id="pp-label-input" maxlength="24" placeholder="Ex.: urgente, design, IA..."><button type="button" class="pp-button pp-small" data-action="idea-label-add">' + uiIcon('plus') + 'Adicionar</button></div><div id="pp-label-drafts" class="pp-tags"></div></div>'
      + '<div class="pp-form-section"><h3>Prompt para IA</h3><p class="pp-form-section-hint">Cole aqui um prompt pronto para executar esta ideia depois em uma IA (Claude, ChatGPT, Gemini...).</p><textarea class="pp-field" name="prompt" maxlength="6000" placeholder="Ex.: Crie um roteiro de aula sobre...">' + escapeHtml(idea.prompt || '') + '</textarea><div class="pp-prompt-actions"><button type="button" class="pp-button pp-small pp-secondary" data-action="idea-prompt-copy">Copiar prompt</button></div></div>'
      + '<div class="pp-form-section"><h3>Checklist e subtarefas</h3><p class="pp-form-section-hint">Divida a ideia em passos. Cada passo pode ter subitens, como as sublistas do Todoist.</p><div class="pp-quick-add-row"><input class="pp-field pp-quick-add-input" id="pp-checklist-input" maxlength="160" placeholder="Adicionar item..."><button type="button" class="pp-button pp-small" data-action="idea-chk-add">' + uiIcon('plus') + 'Adicionar</button></div><div id="pp-checklist-list"></div></div>'
      + '<div class="pp-form-section"><h3>Anexos</h3><p class="pp-form-section-hint">Adicione imagens ou documentos de referência para esta ideia.</p><input class="pp-field" type="file" id="pp-attachment-input" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" multiple><div id="pp-attachments-list" style="margin-top:10px"></div></div>'
      + '<div class="pp-error" id="pp-form-error"></div>'
      + '<div class="pp-modal-actions"><button type="button" class="pp-button pp-secondary" data-action="close-modal">Cancelar</button><button class="pp-button" type="submit">Salvar ideia</button></div>'
      + '</form>', { wide: true });
    var form = modal.querySelector('#pp-idea-form');
    function renderChecklist() { modal.querySelector('#pp-checklist-list').innerHTML = checklistItemsMarkup(checklistDraft, 'idea-chk', '', 0); }
    function renderLabels() { modal.querySelector('#pp-label-drafts').innerHTML = labelChipsMarkup(labelsDraft); }
    function renderAttachments() { modal.querySelector('#pp-attachments-list').innerHTML = attachmentsMarkup(attachmentsDraft); }
    function renderFavorite() { var host = modal.querySelector('#pp-idea-favorite-host'); if (host) host.outerHTML = favoriteMarkupInline(favoriteDraft); }
    renderChecklist(); renderLabels(); renderAttachments();
    modal.addEventListener('click', function (event) {
      var target = event.target.closest('[data-action]'); if (!target) return;
      var action = target.dataset.action;
      if (action === 'idea-favorite-toggle') { favoriteDraft = !favoriteDraft; renderFavorite(); return; }
      if (action === 'idea-due-quick') {
        var field = modal.querySelector('#pp-idea-duedate');
        if (target.dataset.days === 'clear') { field.value = ''; return; }
        var futureDate = new Date(); futureDate.setDate(futureDate.getDate() + Number(target.dataset.days || 0));
        field.value = futureDate.toISOString().slice(0, 10);
        return;
      }
      if (action === 'idea-label-add') {
        var labelInput = modal.querySelector('#pp-label-input'); var labelValue = labelInput.value.trim();
        if (!labelValue) return;
        if (labelsDraft.indexOf(labelValue) < 0) labelsDraft.push(labelValue);
        labelInput.value = ''; renderLabels(); labelInput.focus();
        return;
      }
      if (action === 'idea-label-remove') { labelsDraft = labelsDraft.filter(function (label) { return label !== target.dataset.label; }); renderLabels(); return; }
      if (action === 'idea-prompt-copy') {
        var promptField = form.elements.prompt;
        if (!promptField.value.trim()) { toast('Escreva um prompt antes de copiar.'); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(promptField.value).then(function () { toast('Prompt copiado.'); }).catch(function () { toast('Não foi possível copiar o prompt.'); }); }
        return;
      }
      if (action === 'idea-chk-add') {
        var checklistInput = modal.querySelector('#pp-checklist-input'); var itemText = checklistInput.value.trim();
        if (!itemText) return;
        checklistDraft.push(newChecklistItem(itemText)); checklistInput.value = ''; renderChecklist(); checklistInput.focus();
        return;
      }
      if (action === 'idea-chk-toggle') { var toggled = findChecklistItem(checklistDraft, target.dataset.item); if (toggled) { toggled.item.done = !toggled.item.done; toggled.item.updatedAt = now(); renderChecklist(); } return; }
      if (action === 'idea-chk-add-sub') {
        var parentFound = findChecklistItem(checklistDraft, target.dataset.item); if (!parentFound) return;
        var subText = window.prompt('Nome da subtarefa:'); if (subText == null || !subText.trim()) return;
        parentFound.item.children = parentFound.item.children || []; parentFound.item.children.push(newChecklistItem(subText.trim())); renderChecklist();
        return;
      }
      if (action === 'idea-chk-edit') {
        var editFound = findChecklistItem(checklistDraft, target.dataset.item); if (!editFound) return;
        var newText = window.prompt('Editar item:', editFound.item.text); if (newText == null || !newText.trim()) return;
        editFound.item.text = newText.trim(); editFound.item.updatedAt = now(); renderChecklist();
        return;
      }
      if (action === 'idea-chk-delete') {
        var deleteFound = findChecklistItem(checklistDraft, target.dataset.item); if (!deleteFound) return;
        if (!window.confirm('Remover este item?')) return;
        deleteFound.list.splice(deleteFound.index, 1); renderChecklist();
        return;
      }
      if (action === 'idea-attachment-remove') { attachmentsDraft = attachmentsDraft.filter(function (attachment) { return attachment.id !== target.dataset.id; }); renderAttachments(); return; }
    });
    modal.querySelector('#pp-attachment-input').addEventListener('change', function (event) {
      var files = Array.prototype.slice.call(event.target.files || []);
      event.target.value = '';
      if (!files.length) return;
      Promise.all(files.map(readAttachment)).then(function (results) {
        results.filter(Boolean).forEach(function (attachment) { attachmentsDraft.push(attachment); });
        renderAttachments();
      });
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault(); var title = form.elements.title.value.trim(); var error = modal.querySelector('#pp-form-error');
      if (!title) { error.textContent = 'Informe o título da ideia.'; return; }
      var stamp = now(); var record = idea.id ? state.ideas.find(function (item) { return item.id === idea.id; }) : null;
      if (!record) { record = { id: id('idea'), createdAt: stamp }; state.ideas.push(record); }
      record.title = title; record.description = form.elements.description.value.trim(); record.projectId = form.elements.projectId.value || null;
      record.status = form.elements.status.value; record.priority = form.elements.priority.value; record.section = form.elements.section.value.trim();
      record.dueDate = form.elements.dueDate.value || null; record.favorite = favoriteDraft; record.labels = labelsDraft; record.prompt = form.elements.prompt.value.trim();
      record.checklist = checklistDraft; record.attachments = attachmentsDraft; record.updatedAt = stamp;
      persist('idea-save'); closeModal(); render(); toast('Ideia salva.');
    });
  }
  function deleteIdea(ideaId) {
    var idea = getIdea(ideaId); if (!idea) return;
    if (!window.confirm('Excluir a ideia "' + idea.title + '"?')) return;
    idea.deletedAt = now(); idea.updatedAt = idea.deletedAt; persist('idea-delete'); render(); toast('Ideia excluída.');
  }
  // ── 🐞 Bugs de cada projeto (22/09/2026) ─────────────────────────────
  // state.bugs: { id, projectId, codigo (BUG-001, por projeto), title, description,
  // steps, expected, actual, where, device, severity, status, tags[], foundAt,
  // fixedAt, fixNote, fixUrl, createdAt, updatedAt, deletedAt }. Sincroniza com o
  // resto do painel. Ao virar "Corrigido", entra um evento na linha do tempo.
  var BUG_STATUS = [
    { v: 'Novo', c: 'novo', aberto: true, d: 'Registrado, ainda não conferido' },
    { v: 'Confirmado', c: 'confirmado', aberto: true, d: 'Reproduzido, esperando correção' },
    { v: 'Em correção', c: 'correcao', aberto: true, d: 'Alguém está corrigindo' },
    { v: 'Aguardando teste', c: 'teste', aberto: true, d: 'Correção feita, falta conferir' },
    { v: 'Corrigido', c: 'corrigido', aberto: false, d: 'Conferido e resolvido' },
    { v: 'Não reproduz', c: 'naoreproduz', aberto: false, d: 'Não foi possível repetir o erro' },
    { v: 'Arquivado', c: 'arquivado', aberto: false, d: 'Não será corrigido agora' }
  ];
  var BUG_SEVERIDADE = [
    { v: 'Crítica', c: 'urgent', peso: 4, d: 'Trava o uso ou perde dados' },
    { v: 'Alta', c: 'high', peso: 3, d: 'Função importante quebrada' },
    { v: 'Média', c: 'medium', peso: 2, d: 'Atrapalha, mas há contorno' },
    { v: 'Baixa', c: 'low', peso: 1, d: 'Visual ou detalhe' }
  ];
  var BUG_APARELHOS = ['Todos', 'Computador', 'Celular', 'Tablet', 'App (APK)'];
  var bugFiltros = {};
  function bugStatusInfo(v) { return BUG_STATUS.filter(function (x) { return x.v === v; })[0] || BUG_STATUS[0]; }
  function bugSevInfo(v) { return BUG_SEVERIDADE.filter(function (x) { return x.v === v; })[0] || BUG_SEVERIDADE[2]; }
  function bugsDo(projectId) { return active(state.bugs).filter(function (b) { return b.projectId === projectId; }); }
  function bugsAbertos(projectId) { return bugsDo(projectId).filter(function (b) { return bugStatusInfo(b.status).aberto; }).length; }
  function proximoCodigoBug(projectId) {
    var maior = (state.bugs || []).filter(function (b) { return b.projectId === projectId; }).reduce(function (m, b) { var n = parseInt(String(b.codigo || '').replace(/\D/g, ''), 10) || 0; return Math.max(m, n); }, 0);
    return 'BUG-' + ('00' + (maior + 1)).slice(-3);
  }
  function bugTagsExistentes(projectId) {
    var m = {};
    active(state.bugs).forEach(function (b) { if (!projectId || b.projectId === projectId) (b.tags || []).forEach(function (t) { m[t] = 1; }); });
    return Object.keys(m).sort();
  }
  function bugsPanelMarkup(project) {
    var todos = bugsDo(project.id);
    var f = bugFiltros[project.id] || (bugFiltros[project.id] = { status: 'abertos', sev: '', tag: '', q: '' });
    var cont = {};
    todos.forEach(function (b) { cont[b.status] = (cont[b.status] || 0) + 1; });
    var abertos = todos.filter(function (b) { return bugStatusInfo(b.status).aberto; }).length;
    var q = f.q.trim().toLowerCase();
    var lista = todos.filter(function (b) {
      if (f.status === 'abertos' && !bugStatusInfo(b.status).aberto) return false;
      if (f.status && f.status !== 'abertos' && f.status !== 'todos' && b.status !== f.status) return false;
      if (f.sev && b.severity !== f.sev) return false;
      if (f.tag && (b.tags || []).indexOf(f.tag) < 0) return false;
      if (q && [b.codigo, b.title, b.description, b.where, (b.tags || []).join(' ')].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) {
      var ab = bugStatusInfo(a.status).aberto ? 1 : 0, bb = bugStatusInfo(b.status).aberto ? 1 : 0;
      if (ab !== bb) return bb - ab;
      var s = bugSevInfo(b.severity).peso - bugSevInfo(a.severity).peso;
      return s || toTime(b.foundAt || b.createdAt) - toTime(a.foundAt || a.createdAt);
    });
    var opt = function (valor, rotulo, sel) { return '<option value="' + escapeHtml(valor) + '"' + (valor === sel ? ' selected' : '') + '>' + escapeHtml(rotulo) + '</option>'; };
    var resumo = BUG_STATUS.filter(function (x) { return cont[x.v]; }).map(function (x) { return '<button type="button" class="pp-bug-chip pp-bug-st-' + x.c + (f.status === x.v ? ' is-on' : '') + '" data-action="bug-filtro-status" data-project="' + project.id + '" data-status="' + escapeHtml(x.v) + '">' + escapeHtml(x.v) + ' <b>' + cont[x.v] + '</b></button>'; }).join('');
    return '<section class="pp-panel pp-bugs" id="pp-bugs-' + project.id + '"><div class="pp-panel-head"><h2>🐞 Bugs ' + (abertos ? '<span class="pp-bug-count">' + abertos + ' aberto' + (abertos === 1 ? '' : 's') + '</span>' : (todos.length ? '<span class="pp-bug-count is-ok">nenhum aberto</span>' : '')) + '</h2>'
      + '<button class="pp-button pp-small" data-action="new-bug" data-project="' + project.id + '">' + uiIcon('plus') + 'Registrar bug</button></div>'
      + (todos.length ? '<div class="pp-bug-resumo">' + resumo + '</div>'
        + '<div class="pp-bug-filtros">'
        + '<input class="pp-field" type="search" placeholder="Buscar por código, título, tela ou tag" value="' + escapeHtml(f.q) + '" data-bug-filtro="q" data-project="' + project.id + '">'
        + '<select class="pp-field" data-bug-filtro="status" data-project="' + project.id + '">' + opt('abertos', 'Abertos', f.status) + opt('todos', 'Todos', f.status) + BUG_STATUS.map(function (x) { return opt(x.v, x.v, f.status); }).join('') + '</select>'
        + '<select class="pp-field" data-bug-filtro="sev" data-project="' + project.id + '">' + opt('', 'Toda gravidade', f.sev) + BUG_SEVERIDADE.map(function (x) { return opt(x.v, x.v, f.sev); }).join('') + '</select>'
        + '<select class="pp-field" data-bug-filtro="tag" data-project="' + project.id + '">' + opt('', 'Todas as tags', f.tag) + bugTagsExistentes(project.id).map(function (t) { return opt(t, '#' + t, f.tag); }).join('') + '</select></div>'
        + (lista.length ? '<div class="pp-bug-lista">' + lista.map(bugCard).join('') + '</div>' : emptyMarkup('Nenhum bug com esses filtros', 'Troque os filtros para ver os demais.'))
        : emptyMarkup('Nenhum bug registrado', 'Anote aqui cada erro que aparecer: onde acontece, como repetir e a gravidade. Assim nada se perde até a correção.'))
      + '</section>';
  }
  function bugCard(b) {
    var st = bugStatusInfo(b.status), sev = bugSevInfo(b.severity);
    var datas = 'Encontrado em ' + formatDate(b.foundAt || b.createdAt) + (b.fixedAt ? ' · corrigido em ' + formatDate(b.fixedAt) : '');
    return '<article class="pp-bug pp-bug-sev-' + sev.c + (st.aberto ? '' : ' is-fechado') + '">'
      + '<div class="pp-bug-top"><span class="pp-bug-codigo">' + escapeHtml(b.codigo || 'BUG') + '</span><h3>' + escapeHtml(b.title) + '</h3>'
      + '<div class="pp-toolbar"><button class="pp-icon-button" title="Editar bug" aria-label="Editar bug" data-action="edit-bug" data-id="' + b.id + '">' + uiIcon('edit') + '</button><button class="pp-icon-button" title="Excluir bug" aria-label="Excluir bug" data-action="delete-bug" data-id="' + b.id + '">' + uiIcon('trash') + '</button></div></div>'
      + '<div class="pp-bug-meta"><span class="pp-badge pp-priority-' + sev.c + '" title="' + escapeHtml(sev.d) + '">' + escapeHtml(sev.v) + '</span>'
      + '<select class="pp-bug-status pp-bug-st-' + st.c + '" data-bug-status="' + b.id + '" aria-label="Status do bug" title="' + escapeHtml(st.d) + '">' + BUG_STATUS.map(function (x) { return '<option' + (x.v === st.v ? ' selected' : '') + '>' + escapeHtml(x.v) + '</option>'; }).join('') + '</select>'
      + (b.where ? '<span class="pp-tag">📍 ' + escapeHtml(b.where) + '</span>' : '') + (b.device && b.device !== 'Todos' ? '<span class="pp-tag">📱 ' + escapeHtml(b.device) + '</span>' : '')
      + (b.tags || []).map(function (t) { return '<button type="button" class="pp-tag pp-bug-tag" data-action="bug-filtro-tag" data-project="' + b.projectId + '" data-tag="' + escapeHtml(t) + '">#' + escapeHtml(t) + '</button>'; }).join('') + '</div>'
      + (b.description ? '<p class="pp-bug-desc">' + escapeHtml(b.description) + '</p>' : '')
      + ((b.steps || b.expected || b.actual || b.fixNote) ? '<details class="pp-bug-mais"><summary>Detalhes</summary>'
        + (b.steps ? '<h4>Como reproduzir</h4><p>' + escapeHtml(b.steps) + '</p>' : '')
        + (b.expected ? '<h4>O que deveria acontecer</h4><p>' + escapeHtml(b.expected) + '</p>' : '')
        + (b.actual ? '<h4>O que acontece</h4><p>' + escapeHtml(b.actual) + '</p>' : '')
        + (b.fixNote ? '<h4>Correção</h4><p>' + escapeHtml(b.fixNote) + '</p>' : '')
        + (safeUrl(b.fixUrl) ? '<p><a target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safeUrl(b.fixUrl)) + '">Abrir a correção ↗</a></p>' : '') + '</details>' : '')
      + '<time class="pp-bug-data">' + escapeHtml(datas) + '</time></article>';
  }
  function mudarStatusBug(b, novo) {
    var antes = bugStatusInfo(b.status), depois = bugStatusInfo(novo), stamp = now();
    b.status = depois.v; b.updatedAt = stamp;
    if (depois.v === 'Corrigido' && !b.fixedAt) b.fixedAt = stamp;
    if (depois.aberto) b.fixedAt = '';
    if (depois.v === 'Corrigido' && antes.v !== 'Corrigido') {
      state.activities.push({ id: id('event'), projectId: b.projectId, title: 'Bug corrigido: ' + (b.codigo || '') + ' ' + b.title, details: (b.fixNote || 'Status alterado para Corrigido.') + (b.where ? '\nOnde: ' + b.where : ''), occurredAt: stamp, source: 'Bugs', externalUrl: b.fixUrl || undefined, createdAt: stamp, updatedAt: stamp });
    }
  }
  function bugForm(projectId, bug) {
    bug = bug || { projectId: projectId, status: 'Novo', severity: 'Média', device: 'Todos', tags: [], foundAt: now() };
    var tags = (bug.tags || []).slice();
    var dia = new Date(bug.foundAt || now()); dia.setMinutes(dia.getMinutes() - dia.getTimezoneOffset());
    var opcoes = function (lista, sel) { return lista.map(function (x) { var v = x.v || x; return '<option value="' + escapeHtml(v) + '"' + (v === sel ? ' selected' : '') + '>' + escapeHtml(v) + (x.d ? ' — ' + escapeHtml(x.d) : '') + '</option>'; }).join(''); };
    var campo = function (nome, rotulo, valor, ph, area, cheio) { return '<label class="pp-form-label' + (cheio ? ' pp-full' : '') + '"><span>' + rotulo + '</span>' + (area ? '<textarea class="pp-field" name="' + nome + '" rows="3" placeholder="' + escapeHtml(ph) + '">' + escapeHtml(valor || '') + '</textarea>' : '<input class="pp-field" name="' + nome + '" value="' + escapeHtml(valor || '') + '" placeholder="' + escapeHtml(ph) + '">') + '</label>'; };
    var modal = showModal(bug.id ? 'Editar ' + (bug.codigo || 'bug') : 'Registrar bug', 'Quanto mais detalhe, mais rápida a correção.', '<form id="pp-bug-form"><div class="pp-form-grid">'
      + '<label class="pp-form-label pp-full"><span>Título *</span><input class="pp-field" required maxlength="160" name="title" value="' + escapeHtml(bug.title || '') + '" placeholder="Ex.: Botão Salvar não responde no celular"></label>'
      + '<label class="pp-form-label"><span>Gravidade</span><select class="pp-field" name="severity">' + opcoes(BUG_SEVERIDADE, bug.severity) + '</select></label>'
      + '<label class="pp-form-label"><span>Status</span><select class="pp-field" name="status">' + opcoes(BUG_STATUS, bug.status) + '</select></label>'
      + campo('where', 'Onde acontece', bug.where, 'Página, aba ou tela (ex.: Meu Diário › Configurações)')
      + '<label class="pp-form-label"><span>Aparelho</span><select class="pp-field" name="device">' + opcoes(BUG_APARELHOS, bug.device) + '</select></label>'
      + '<label class="pp-form-label"><span>Encontrado em</span><input class="pp-field" type="date" name="foundAt" value="' + dia.toISOString().slice(0, 10) + '"></label>'
      + '<label class="pp-form-label"><span>Tags</span><div class="pp-quick-add-row"><input class="pp-field" id="pp-bug-tag-in" list="pp-bug-tags" placeholder="Ex.: layout, login, dados"><button type="button" class="pp-button pp-small" id="pp-bug-tag-add">' + uiIcon('plus') + '</button></div><datalist id="pp-bug-tags">' + bugTagsExistentes(null).map(function (t) { return '<option value="' + escapeHtml(t) + '">'; }).join('') + '</datalist><div class="pp-tool-drafts" id="pp-bug-tag-drafts"></div></label>'
      + campo('description', 'Descrição', bug.description, 'O que está errado, em poucas palavras', true, true)
      + campo('steps', 'Como reproduzir', bug.steps, '1. Abrir…  2. Tocar em…  3. …', true, true)
      + campo('expected', 'O que deveria acontecer', bug.expected, '', true)
      + campo('actual', 'O que acontece', bug.actual, '', true)
      + campo('fixNote', 'Correção (quando resolvido)', bug.fixNote, 'O que foi feito para corrigir', true)
      + campo('fixUrl', 'Link da correção', bug.fixUrl, 'Commit, deploy ou conversa')
      + '</div><div class="pp-error" id="pp-form-error" role="alert"></div><div class="pp-modal-actions"><button type="button" class="pp-button pp-secondary" data-action="close-modal">Cancelar</button><button class="pp-button" type="submit">' + (bug.id ? 'Salvar' : 'Registrar bug') + '</button></div></form>', { wide: true });
    var form = modal.querySelector('#pp-bug-form'), drafts = modal.querySelector('#pp-bug-tag-drafts'), tagIn = modal.querySelector('#pp-bug-tag-in');
    function desenharTags() {
      drafts.innerHTML = tags.length ? tags.map(function (t, i) { return '<span class="pp-tool-draft pp-label-chip">#' + escapeHtml(t) + '<button type="button" aria-label="Remover tag" data-tag-i="' + i + '">×</button></span>'; }).join('') : '<span class="pp-form-note">Nenhuma tag.</span>';
      drafts.querySelectorAll('[data-tag-i]').forEach(function (x) { x.addEventListener('click', function () { tags.splice(+x.dataset.tagI, 1); desenharTags(); }); });
    }
    function addTag() {
      String(tagIn.value || '').split(',').map(function (t) { return t.trim().toLowerCase().replace(/^#/, ''); }).filter(Boolean).forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); });
      tagIn.value = ''; desenharTags();
    }
    modal.querySelector('#pp-bug-tag-add').addEventListener('click', addTag);
    tagIn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } });
    desenharTags();
    form.addEventListener('submit', function (event) {
      event.preventDefault(); addTag();
      var el = form.elements, title = el.title.value.trim();
      if (!title) { modal.querySelector('#pp-form-error').textContent = 'Informe o título do bug.'; return; }
      var stamp = now(), record = bug.id ? state.bugs.find(function (x) { return x.id === bug.id; }) : null;
      if (!record) { record = { id: id('bug'), projectId: bug.projectId, codigo: proximoCodigoBug(bug.projectId), status: 'Novo', createdAt: stamp }; state.bugs.push(record); }
      record.title = title; record.severity = el.severity.value; record.where = el.where.value.trim(); record.device = el.device.value;
      record.foundAt = el.foundAt.value ? new Date(el.foundAt.value + 'T12:00:00').toISOString() : (record.foundAt || stamp);
      record.tags = tags.slice(); record.description = el.description.value.trim(); record.steps = el.steps.value.trim();
      record.expected = el.expected.value.trim(); record.actual = el.actual.value.trim(); record.fixNote = el.fixNote.value.trim(); record.fixUrl = el.fixUrl.value.trim();
      mudarStatusBug(record, el.status.value);
      record.updatedAt = stamp;
      persist('bug-save'); closeModal(); render(); toast(bug.id ? 'Bug atualizado.' : record.codigo + ' registrado.');
    });
  }
  function deleteBug(bugId) {
    var b = active(state.bugs).find(function (x) { return x.id === bugId; }); if (!b) return;
    if (!window.confirm('Excluir ' + (b.codigo || 'este bug') + '? Se ele foi resolvido, prefira o status "Corrigido" para manter o histórico.')) return;
    b.deletedAt = now(); b.updatedAt = b.deletedAt; persist('bug-delete'); render(); toast('Bug excluído.');
  }

  function eventForm(projectId, activity) {
    activity = activity || { projectId: projectId, source: 'Manual', occurredAt: now() };
    var sourceOptions = ['Manual'].concat(PROVIDERS).map(function (provider) { return '<option value="' + escapeHtml(provider) + '"' + (activity.source === provider ? ' selected' : '') + '>' + escapeHtml(provider) + '</option>'; }).join('');
    var localTime = new Date(activity.occurredAt); localTime.setMinutes(localTime.getMinutes() - localTime.getTimezoneOffset());
    var modal = showModal(activity.id ? 'Editar atualização' : 'Registrar atualização', 'Use a linha do tempo para lembrar exatamente o que foi feito.', '<form id="pp-event-form"><div class="pp-form-grid"><label class="pp-form-label pp-full"><span>Título *</span><input class="pp-field" required maxlength="160" name="title" value="' + escapeHtml(activity.title || '') + '" placeholder="Ex.: Deploy da nova biblioteca"></label><label class="pp-form-label pp-full"><span>Detalhes</span><textarea class="pp-field" name="details" maxlength="3000" placeholder="O que mudou, o que falta e qualquer observação importante.">' + escapeHtml(activity.details || '') + '</textarea></label><label class="pp-form-label"><span>Data e hora</span><input class="pp-field" required name="occurredAt" type="datetime-local" value="' + localTime.toISOString().slice(0, 16) + '"></label><label class="pp-form-label"><span>Fonte</span><select class="pp-field" name="source">' + sourceOptions + '</select></label><label class="pp-form-label pp-full"><span>Link externo (opcional)</span><input class="pp-field" name="externalUrl" type="url" value="' + escapeHtml(activity.externalUrl || '') + '" placeholder="https://..."></label></div><div class="pp-error" id="pp-form-error"></div><div class="pp-modal-actions"><button type="button" class="pp-button pp-secondary" data-action="close-modal">Cancelar</button><button class="pp-button" type="submit">Salvar atualização</button></div></form>');
    var form = modal.querySelector('#pp-event-form');
    form.addEventListener('submit', function (event) {
      event.preventDefault(); var title = form.elements.title.value.trim(); var error = modal.querySelector('#pp-form-error');
      if (!title) { error.textContent = 'Informe o título da atualização.'; return; }
      var stamp = now(); var record = activity.id ? state.activities.find(function (item) { return item.id === activity.id; }) : null;
      if (!record) { record = { id: id('event'), createdAt: stamp, externalId: 'manual:' + id('ref') }; state.activities.push(record); }
      record.projectId = activity.projectId; record.title = title; record.details = form.elements.details.value.trim(); record.occurredAt = new Date(form.elements.occurredAt.value).toISOString(); record.source = form.elements.source.value; record.externalUrl = form.elements.externalUrl.value.trim(); record.updatedAt = stamp;
      persist('event-save'); closeModal(); render(); toast('Atualização registrada.');
    });
  }
  function deleteEvent(eventId) {
    var activity = getEvent(eventId); if (!activity) return;
    if (!window.confirm('Excluir esta atualização da linha do tempo?')) return;
    activity.deletedAt = now(); activity.updatedAt = activity.deletedAt; persist('event-delete'); render(); toast('Atualização excluída.');
  }

  function bytesToBase64(bytes) { var binary = ''; bytes.forEach(function (byte) { binary += String.fromCharCode(byte); }); return btoa(binary); }
  function base64ToBytes(value) { var binary = atob(value); var bytes = new Uint8Array(binary.length); for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return bytes; }
  function isVaultUnlocked() { return !!vaultKey && !!vaultData && vaultExpiresAt > Date.now(); }
  function setVaultSession(key, data) {
    vaultKey = key; vaultData = data; vaultExpiresAt = Date.now() + VAULT_MS;
    if (vaultTimeout) clearTimeout(vaultTimeout);
    vaultTimeout = window.setTimeout(lockVault, VAULT_MS + 50);
  }
  function lockVault() {
    vaultKey = null; vaultData = null; vaultExpiresAt = 0; if (vaultTimeout) clearTimeout(vaultTimeout); vaultTimeout = null;
    var sensitive = document.querySelector('.pp-modal[data-sensitive="true"]'); if (sensitive) sensitive.remove();
    render(); toast('Cofre bloqueado.');
  }
  function deriveVaultKey(password, salt) {
    var cryptoApi = window.crypto && window.crypto.subtle;
    if (!cryptoApi) return Promise.reject(new Error('Seu navegador não oferece criptografia segura.'));
    return cryptoApi.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']).then(function (baseKey) {
      return cryptoApi.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 250000, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function encryptVaultWithKey(key, data) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(data))).then(function (cipher) { return { iv: bytesToBase64(iv), cipher: bytesToBase64(new Uint8Array(cipher)) }; });
  }
  function decryptVaultWithKey(key, record) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(record.iv) }, key, base64ToBytes(record.cipher)).then(function (plain) { return JSON.parse(new TextDecoder().decode(plain)); });
  }
  function saveVault() {
    if (!isVaultUnlocked()) return Promise.reject(new Error('Cofre bloqueado.'));
    vaultData.updatedAt = now();
    return encryptVaultWithKey(vaultKey, vaultData).then(function (encrypted) {
      state.vault = { version: 1, kdf: 'PBKDF2-SHA-256', iterations: 250000, salt: state.vault.salt, iv: encrypted.iv, cipher: encrypted.cipher, updatedAt: vaultData.updatedAt };
      persist('vault-save');
    });
  }
  function vaultInfo() {
    var content = state.vault ? '<p class="pp-form-note">O cofre contém apenas dados cifrados. A senha nunca é salva.</p>' : '<p class="pp-form-note">O cofre será criado quando você abrir a primeira ferramenta.</p>';
    content += '<div class="pp-modal-actions">' + (isVaultUnlocked() ? '<button class="pp-button pp-secondary" data-action="lock-vault">Bloquear agora</button>' : '') + (state.vault ? '<button class="pp-button pp-danger" data-action="reset-vault">Apagar cofre</button>' : '') + '<button class="pp-button" data-action="close-modal">Fechar</button></div>';
    showModal('Cofre de informações', isVaultUnlocked() ? 'Acesso temporariamente desbloqueado.' : 'Seus logins, chaves e códigos ficam protegidos por senha.', content);
  }
  function setupVault(onSuccess) {
    var modal = showModal('Criar senha do cofre', 'Use uma senha que você consiga lembrar. Ela não será salva e não poderá ser recuperada.', '<form id="pp-vault-setup"><div class="pp-form-grid"><label class="pp-form-label pp-full"><span>Senha mestra *</span><input class="pp-field" required minlength="8" name="password" type="password" autocomplete="new-password"></label><label class="pp-form-label pp-full"><span>Confirme a senha *</span><input class="pp-field" required minlength="8" name="confirm" type="password" autocomplete="new-password"></label></div><div class="pp-secret-hint">Se a senha for esquecida, será possível apagar apenas o cofre e cadastrar os dados sensíveis novamente. Projetos, ideias e linha do tempo não serão perdidos.</div><div class="pp-error" id="pp-vault-error"></div><div class="pp-modal-actions"><button type="button" class="pp-button pp-secondary" data-action="close-modal">Cancelar</button><button class="pp-button" type="submit">Criar cofre</button></div></form>', { sensitive: true });
    modal.querySelector('#pp-vault-setup').addEventListener('submit', function (event) {
      event.preventDefault(); var form = event.currentTarget; var error = modal.querySelector('#pp-vault-error'); var password = form.elements.password.value;
      if (password !== form.elements.confirm.value) { error.textContent = 'As senhas não são iguais.'; return; }
      var salt = crypto.getRandomValues(new Uint8Array(16));
      deriveVaultKey(password, salt).then(function (key) {
        state.vault = { version: 1, kdf: 'PBKDF2-SHA-256', iterations: 250000, salt: bytesToBase64(salt), iv: '', cipher: '', updatedAt: now() };
        setVaultSession(key, { marker: 'projetos-pessoais-v1', entries: {}, updatedAt: now() });
        return saveVault();
      }).then(function () { closeModal(); render(); toast('Cofre criado e desbloqueado.'); if (onSuccess) onSuccess(); }).catch(function (errorValue) { error.textContent = errorValue.message || 'Não foi possível criar o cofre.'; });
    });
  }
  function unlockVault(onSuccess) {
    var modal = showModal('Desbloquear cofre', 'Informe a senha mestra para acessar esta ferramenta por 15 minutos.', '<form id="pp-vault-unlock"><label class="pp-form-label"><span>Senha mestra</span><input class="pp-field" required name="password" type="password" autocomplete="current-password"></label><div class="pp-error" id="pp-vault-error"></div><div class="pp-modal-actions"><button type="button" class="pp-button pp-secondary" data-action="close-modal">Cancelar</button><button class="pp-button" type="submit">Desbloquear</button></div></form>', { sensitive: true });
    modal.querySelector('#pp-vault-unlock').addEventListener('submit', function (event) {
      event.preventDefault(); var form = event.currentTarget; var error = modal.querySelector('#pp-vault-error');
      try {
        var salt = base64ToBytes(state.vault.salt);
        deriveVaultKey(form.elements.password.value, salt).then(function (key) { return decryptVaultWithKey(key, state.vault).then(function (data) { return { key: key, data: data }; }); }).then(function (result) {
          if (!result.data || result.data.marker !== 'projetos-pessoais-v1') throw new Error('Senha inválida.');
          setVaultSession(result.key, result.data); closeModal(); render(); if (onSuccess) onSuccess();
        }).catch(function () { error.textContent = 'Senha inválida ou cofre corrompido.'; });
      } catch (errorValue) { error.textContent = 'Não foi possível abrir o cofre.'; }
    });
  }
  function accessVault(onSuccess) { if (isVaultUnlocked()) { setVaultSession(vaultKey, vaultData); onSuccess(); } else if (!state.vault || !state.vault.cipher) setupVault(onSuccess); else unlockVault(onSuccess); }
  function resetVault() {
    if (!window.confirm('Apagar todos os logins, senhas, APIs e chaves do cofre? Esta ação não pode ser desfeita.')) return;
    state.vault = null; lockVault(); persist('vault-reset'); closeModal(); render(); toast('Cofre apagado.');
  }
  function toolModal(projectId, toolId) {
    var project = getProject(projectId); var tool = project && (project.tools || []).find(function (item) { return item.id === toolId; }); if (!project || !tool) return;
    accessVault(function () {
      var key = projectId + ':' + toolId; var entry = vaultData.entries[key] || { login: '', password: '', keys: '', notes: '' };
      var publicUrl = safeUrl(tool.url);
      var modal = showModal(tool.label || tool.provider, 'Dados sensíveis deste acesso. O cofre fecha automaticamente após 15 minutos.', '<form id="pp-tool-form"><div class="pp-secret-hint">🔒 Estas informações são cifradas antes de serem salvas. Não copie chaves em locais públicos.</div>' + (publicUrl ? '<div class="pp-tool-public-link"><a target="_blank" rel="noopener noreferrer" href="' + escapeHtml(publicUrl) + '">↗ Abrir ' + escapeHtml(tool.label || tool.provider) + '</a></div>' : '') + '<div class="pp-form-grid" style="margin-top:14px"><label class="pp-form-label pp-full"><span>Logins / e-mails</span><textarea class="pp-field" name="login" placeholder="E-mails, usuários e observações de acesso">' + escapeHtml(entry.login) + '</textarea></label><label class="pp-form-label pp-full"><span>Senhas</span><textarea class="pp-field" name="password" placeholder="Senhas ou instruções de recuperação">' + escapeHtml(entry.password) + '</textarea></label><label class="pp-form-label pp-full"><span>APIs, chaves e códigos</span><textarea class="pp-field" name="keys" placeholder="Tokens, chaves, IDs, códigos ou comandos importantes">' + escapeHtml(entry.keys) + '</textarea></label><label class="pp-form-label pp-full"><span>Notas protegidas</span><textarea class="pp-field" name="notes" placeholder="Outras informações sensíveis">' + escapeHtml(entry.notes) + '</textarea></label></div><div class="pp-error" id="pp-tool-error"></div><div class="pp-modal-actions"><button type="button" class="pp-button pp-secondary" data-action="close-modal">Fechar</button><button class="pp-button" type="submit">Salvar no cofre</button></div></form>', { sensitive: true });
      var secretHint = modal.querySelector('.pp-secret-hint');
      if (secretHint) { secretHint.insertAdjacentHTML('afterbegin', uiIcon('lock')); Array.prototype.forEach.call(secretHint.childNodes, function (node) { if (node.nodeType === 3) node.textContent = node.textContent.replace(/^\s*🔒\s*/, ''); }); }
      var publicLink = modal.querySelector('.pp-tool-public-link a');
      if (publicLink) { publicLink.insertAdjacentHTML('afterbegin', uiIcon('external')); Array.prototype.forEach.call(publicLink.childNodes, function (node) { if (node.nodeType === 3) node.textContent = node.textContent.replace(/^\s*↗\s*/, ''); }); }
      modal.querySelector('#pp-tool-form').insertAdjacentHTML('afterbegin', '<div class="pp-tool-modal-brand">' + providerIcon(tool.provider) + '<span>' + escapeHtml(tool.label || tool.provider) + '</span></div>');
      modal.querySelector('#pp-tool-form').addEventListener('submit', function (event) {
        event.preventDefault(); var form = event.currentTarget; vaultData.entries[key] = { login: form.elements.login.value, password: form.elements.password.value, keys: form.elements.keys.value, notes: form.elements.notes.value, updatedAt: now() };
        saveVault().then(function () { closeModal(); toast('Dados da ferramenta protegidos no cofre.'); }).catch(function () { modal.querySelector('#pp-tool-error').textContent = 'Não foi possível salvar no cofre.'; });
      });
    });
  }

  function formatTimer(milliseconds) {
    if (milliseconds <= 0) return '00:00:00';
    var total = Math.floor(milliseconds / 1000); var hours = Math.floor(total / 3600); var minutes = Math.floor((total % 3600) / 60); var seconds = total % 60;
    return [hours, minutes, seconds].map(function (value) { return String(value).padStart(2, '0'); }).join(':');
  }
  function accountById(accountId) { return AI_ACCOUNTS.find(function (account) { return account.id === accountId; }); }
  function setTimer(accountId, endAt) {
    var account = accountById(accountId); if (!account) return;
    state.timers[accountId] = { endAt: endAt, updatedAt: now(), notifiedAt: null };
    persist('timer-save'); saveTimerToDb(account, state.timers[accountId]); requestNotifications(); render();
  }
  function stopTimer(accountId) {
    if (!state.timers[accountId]) return;
    delete state.timers[accountId]; persist('timer-stop'); removeTimerFromDb('pp-ai-' + accountId); render(); toast('Contador parado.');
  }
  function timerForm(accountId) {
    var account = accountById(accountId); if (!account) return;
    var timer = state.timers[accountId] || {}; var end = timer.endAt ? new Date(timer.endAt) : new Date(Date.now() + 5 * 60 * 60 * 1000); end.setMinutes(end.getMinutes() - end.getTimezoneOffset());
    var modal = showModal('Definir horário', account.title + ' ficará livre quando o contador chegar a zero.', '<form id="pp-timer-form"><label class="pp-form-label"><span>Horário de expiração</span><input class="pp-field" required name="end" type="datetime-local" value="' + end.toISOString().slice(0, 16) + '"></label><div class="pp-form-note">O horário já passou? O sistema entende que a expiração é no dia seguinte.</div><div class="pp-error" id="pp-timer-error"></div><div class="pp-modal-actions"><button type="button" class="pp-button pp-secondary" data-action="close-modal">Cancelar</button><button class="pp-button" type="submit">Iniciar contador</button></div></form>');
    modal.querySelector('#pp-timer-form').addEventListener('submit', function (event) {
      event.preventDefault(); var selected = new Date(event.currentTarget.elements.end.value).getTime(); if (!selected) return; if (selected <= Date.now()) selected += 24 * 60 * 60 * 1000; setTimer(accountId, selected); closeModal();
    });
  }
  function updateAiTimers() {
    if (PAGE !== 'workspace' || currentTab() !== 'ias') return;
    var changed = false;
    AI_ACCOUNTS.forEach(function (account) {
      var timer = state.timers[account.id] || {}; var remaining = Number(timer.endAt || 0) - Date.now(); var ready = remaining <= 0;
      var timeElement = document.querySelector('[data-ai-time="' + account.id + '"]'); var labelElement = document.querySelector('[data-ai-label="' + account.id + '"]'); var card = document.getElementById('pp-ai-' + account.id);
      if (timeElement) timeElement.textContent = formatTimer(remaining); if (labelElement) labelElement.textContent = ready ? 'LIVRE ✓' : 'AGUARDANDO…'; if (card) card.classList.toggle('is-ready', ready);
      if (ready && timer.endAt && !timer.notifiedAt) { timer.notifiedAt = now(); timer.updatedAt = now(); changed = true; notifyTimer(account); }
    });
    if (changed) persist('timer-ready');
  }
  function requestNotifications() {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(function () {});
  }
  function notifyTimer(account) {
    var options = { body: account.title + ' está disponível.', icon: 'icon-192.png', badge: 'icon-192.png', tag: 'pp-ai-ready-' + account.id, renotify: true, requireInteraction: true, data: { url: 'projetos-pessoais.html#ias', nome: account.title, notificationTitle: account.title + ' disponível' } };
    if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(function (registration) { return registration.showNotification(account.title + ' disponível', options); }).catch(function () { if (Notification.permission === 'granted') new Notification(account.title + ' disponível', options); });
    else if ('Notification' in window && Notification.permission === 'granted') new Notification(account.title + ' disponível', options);
  }
  function openTimerDb() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open('claude-timers', 1);
      request.onupgradeneeded = function (event) { var database = event.target.result; if (!database.objectStoreNames.contains('timers')) database.createObjectStore('timers', { keyPath: 'id' }); };
      request.onsuccess = function (event) { resolve(event.target.result); }; request.onerror = function (event) { reject(event.target.error); };
    });
  }
  function saveTimerToDb(account, timer) {
    openTimerDb().then(function (database) { var transaction = database.transaction('timers', 'readwrite'); transaction.objectStore('timers').put({ id: 'pp-ai-' + account.id, nome: account.title, fim: timer.endAt, notificado: false, url: 'projetos-pessoais.html#ias', notificationTitle: account.title + ' disponível', notificationBody: account.title + ' está disponível.' }); }).catch(function () {});
  }
  function removeTimerFromDb(timerId) { openTimerDb().then(function (database) { database.transaction('timers', 'readwrite').objectStore('timers').delete(timerId); }).catch(function () {}); }
  function clearLegacyTimers() {
    ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].forEach(function (legacyId) { localStorage.removeItem('cl_fim_' + legacyId); localStorage.removeItem('cl_notif_' + legacyId); removeTimerFromDb(legacyId); });
    ['rh1', 'rh2', 'rh3', 'rh4', 'rh5', 'rh6'].forEach(function (legacyId) { localStorage.removeItem('rh_cl_fim_' + legacyId); localStorage.removeItem('rh_cl_notif_' + legacyId); removeTimerFromDb(legacyId); });
  }
  function legacyFirestoreTimers() {
    if (!window.firebase || !window.firebase.firestore) return Promise.resolve({});
    try {
      var app = window.firebase.apps.filter(function (item) { return item.name === 'projetos-pessoais-migracao'; })[0] || window.firebase.initializeApp(LEGACY_FIREBASE, 'projetos-pessoais-migracao');
      var database = app.firestore();
      return Promise.all(['c1', 'c2'].map(function (legacyId) { return database.collection('claude_timers').doc(legacyId).get().then(function (documentSnapshot) { return { id: legacyId, fim: documentSnapshot.exists ? Number(documentSnapshot.data().fim || 0) : 0 }; }); })).then(function (items) { var result = {}; items.forEach(function (item) { result[item.id] = item.fim; }); return result; }).catch(function () { return {}; });
    } catch (error) { return Promise.resolve({}); }
  }
  function migrateLegacyTimers() {
    if (state.migrations.legacyAiTimersV1) return;
    var candidates = {
      c1: Number(localStorage.getItem('cl_fim_c1') || 0),
      c2: Number(localStorage.getItem('cl_fim_c2') || 0)
    };
    legacyFirestoreTimers().then(function (remote) {
      candidates.c1 = Math.max(candidates.c1, Number(remote.c1 || 0)); candidates.c2 = Math.max(candidates.c2, Number(remote.c2 || 0));
      var mapping = { c2: 'claude-10pauloacre', c1: 'claude-quinari' }; var stamp = now();
      Object.keys(mapping).forEach(function (legacyId) {
        var endAt = candidates[legacyId]; if (endAt <= Date.now()) return;
        var existing = state.timers[mapping[legacyId]]; if (!existing || Number(existing.endAt || 0) < endAt) state.timers[mapping[legacyId]] = { endAt: endAt, updatedAt: stamp, notifiedAt: null };
      });
      state.migrations.legacyAiTimersV1 = { migratedAt: stamp, from: ['c1', 'c2'] }; clearLegacyTimers(); persist('legacy-ai-migration');
      AI_ACCOUNTS.forEach(function (account) { if (state.timers[account.id] && state.timers[account.id].endAt > Date.now()) saveTimerToDb(account, state.timers[account.id]); });
      render();
    });
  }
  function installServiceWorker() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  function handleAction(event) {
    var target = event.target.closest('[data-action]'); if (!target) return;
    var action = target.dataset.action;
    if (action === 'goto-project') { event.preventDefault(); if (event.target.closest('button')) return; window.location.href = 'projeto-detalhes.html?id=' + encodeURIComponent(target.dataset.id); return; }
    if (action === 'tab') { event.preventDefault(); window.location.hash = target.dataset.tab; render(); return; }
    if (action === 'view') { localStorage.setItem('pp_project_view', target.dataset.view); render(); return; }
    if (action === 'close-modal') { closeModal(); return; }
    if (action === 'new-project') { projectForm(null); return; }
    if (action === 'edit-project') { event.preventDefault(); event.stopPropagation(); projectForm(getProject(target.dataset.id)); return; }
    if (action === 'delete-project') { event.preventDefault(); event.stopPropagation(); deleteProject(target.dataset.id); return; }
    if (action === 'new-idea') { ideaForm(null); return; }
    if (action === 'edit-idea') { ideaForm(getIdea(target.dataset.id)); return; }
    if (action === 'delete-idea') { deleteIdea(target.dataset.id); return; }
    if (action === 'checklist-add') {
      var addChkProject = getProject(target.dataset.project); if (!addChkProject) return;
      var addChkInput = document.getElementById('pp-project-checklist-input'); var addChkText = addChkInput ? addChkInput.value.trim() : '';
      if (!addChkText) return;
      addChkProject.checklist = Array.isArray(addChkProject.checklist) ? addChkProject.checklist : [];
      addChkProject.checklist.push(newChecklistItem(addChkText)); addChkProject.updatedAt = now();
      persist('project-checklist-add'); render(); return;
    }
    if (action === 'checklist-toggle') {
      var toggleChkProject = getProject(target.dataset.project); if (!toggleChkProject) return;
      var toggleChkFound = findChecklistItem(toggleChkProject.checklist || [], target.dataset.item); if (!toggleChkFound) return;
      toggleChkFound.item.done = !toggleChkFound.item.done; toggleChkFound.item.updatedAt = now(); toggleChkProject.updatedAt = now();
      persist('project-checklist-toggle'); render(); return;
    }
    if (action === 'checklist-add-sub') {
      var subChkProject = getProject(target.dataset.project); if (!subChkProject) return;
      var subChkParent = findChecklistItem(subChkProject.checklist || [], target.dataset.item); if (!subChkParent) return;
      var subChkText = window.prompt('Nome da subtarefa:'); if (subChkText == null || !subChkText.trim()) return;
      subChkParent.item.children = subChkParent.item.children || []; subChkParent.item.children.push(newChecklistItem(subChkText.trim()));
      subChkProject.updatedAt = now(); persist('project-checklist-add-sub'); render(); return;
    }
    if (action === 'checklist-edit') {
      var editChkProject = getProject(target.dataset.project); if (!editChkProject) return;
      var editChkFound = findChecklistItem(editChkProject.checklist || [], target.dataset.item); if (!editChkFound) return;
      var editChkText = window.prompt('Editar item:', editChkFound.item.text); if (editChkText == null || !editChkText.trim()) return;
      editChkFound.item.text = editChkText.trim(); editChkFound.item.updatedAt = now(); editChkProject.updatedAt = now();
      persist('project-checklist-edit'); render(); return;
    }
    if (action === 'checklist-delete') {
      var delChkProject = getProject(target.dataset.project); if (!delChkProject) return;
      var delChkFound = findChecklistItem(delChkProject.checklist || [], target.dataset.item); if (!delChkFound) return;
      if (!window.confirm('Remover este item do checklist?')) return;
      delChkFound.list.splice(delChkFound.index, 1); delChkProject.updatedAt = now();
      persist('project-checklist-delete'); render(); return;
    }
    if (action === 'idea-checklist-expand') { expandedIdeaChecklists[target.dataset.id] = !expandedIdeaChecklists[target.dataset.id]; render(); return; }
    if (action === 'idea-checklist-add') {
      var addChkIdea = getIdea(target.dataset.idea); if (!addChkIdea) return;
      var addChkIdeaInput = document.getElementById('pp-idea-checklist-input-' + target.dataset.idea); var addChkIdeaText = addChkIdeaInput ? addChkIdeaInput.value.trim() : '';
      if (!addChkIdeaText) return;
      addChkIdea.checklist = Array.isArray(addChkIdea.checklist) ? addChkIdea.checklist : [];
      addChkIdea.checklist.push(newChecklistItem(addChkIdeaText)); addChkIdea.updatedAt = now();
      persist('idea-checklist-add'); render(); return;
    }
    if (action === 'idea-checklist-toggle') {
      var toggleChkIdea = getIdea(target.dataset.idea); if (!toggleChkIdea) return;
      var toggleChkIdeaFound = findChecklistItem(toggleChkIdea.checklist || [], target.dataset.item); if (!toggleChkIdeaFound) return;
      toggleChkIdeaFound.item.done = !toggleChkIdeaFound.item.done; toggleChkIdeaFound.item.updatedAt = now(); toggleChkIdea.updatedAt = now();
      persist('idea-checklist-toggle'); render(); return;
    }
    if (action === 'idea-checklist-add-sub') {
      var subChkIdea = getIdea(target.dataset.idea); if (!subChkIdea) return;
      var subChkIdeaParent = findChecklistItem(subChkIdea.checklist || [], target.dataset.item); if (!subChkIdeaParent) return;
      var subChkIdeaText = window.prompt('Nome da subtarefa:'); if (subChkIdeaText == null || !subChkIdeaText.trim()) return;
      subChkIdeaParent.item.children = subChkIdeaParent.item.children || []; subChkIdeaParent.item.children.push(newChecklistItem(subChkIdeaText.trim()));
      subChkIdea.updatedAt = now(); persist('idea-checklist-add-sub'); render(); return;
    }
    if (action === 'idea-checklist-edit') {
      var editChkIdea = getIdea(target.dataset.idea); if (!editChkIdea) return;
      var editChkIdeaFound = findChecklistItem(editChkIdea.checklist || [], target.dataset.item); if (!editChkIdeaFound) return;
      var editChkIdeaText = window.prompt('Editar item:', editChkIdeaFound.item.text); if (editChkIdeaText == null || !editChkIdeaText.trim()) return;
      editChkIdeaFound.item.text = editChkIdeaText.trim(); editChkIdeaFound.item.updatedAt = now(); editChkIdea.updatedAt = now();
      persist('idea-checklist-edit'); render(); return;
    }
    if (action === 'idea-checklist-delete') {
      var delChkIdea = getIdea(target.dataset.idea); if (!delChkIdea) return;
      var delChkIdeaFound = findChecklistItem(delChkIdea.checklist || [], target.dataset.item); if (!delChkIdeaFound) return;
      if (!window.confirm('Remover este item?')) return;
      delChkIdeaFound.list.splice(delChkIdeaFound.index, 1); delChkIdea.updatedAt = now();
      persist('idea-checklist-delete'); render(); return;
    }
    if (action === 'new-bug') { bugForm(target.dataset.project, null); return; }
    if (action === 'edit-bug') { var bugEd = active(state.bugs).find(function (x) { return x.id === target.dataset.id; }); if (bugEd) bugForm(bugEd.projectId, bugEd); return; }
    if (action === 'delete-bug') { deleteBug(target.dataset.id); return; }
    if (action === 'bug-filtro-status') { var fs = bugFiltros[target.dataset.project] || {}; fs.status = fs.status === target.dataset.status ? 'abertos' : target.dataset.status; bugFiltros[target.dataset.project] = fs; render(); return; }
    if (action === 'bug-filtro-tag') { var ft = bugFiltros[target.dataset.project] || {}; ft.tag = ft.tag === target.dataset.tag ? '' : target.dataset.tag; bugFiltros[target.dataset.project] = ft; render(); return; }
    if (action === 'new-event') { eventForm(target.dataset.project, null); return; }
    if (action === 'edit-event') { var activity = getEvent(target.dataset.id); if (activity) eventForm(activity.projectId, activity); return; }
    if (action === 'delete-event') { deleteEvent(target.dataset.id); return; }
    if (action === 'open-tool') { toolModal(target.dataset.project, target.dataset.tool); return; }
    if (action === 'open-mindmap' || action === 'library-map') {
      var mindMapProjectId = target.dataset.id || target.dataset.project;
      if (mindMapProjectId === 'project-rural-manager') { window.location.href = 'mapa-rural-manager.html'; return; }
      window.location.href = 'mapa-mental.html?id=' + encodeURIComponent(mindMapProjectId); return;
    }
    if (action === 'mindmap-select') { mindMapUi.selectedId = target.dataset.node; render(); return; }
    if (action === 'mindmap-add') { var addProject = getProject(mindMapUi.projectId); if (addProject) mindMapNodeForm(addProject, null, mindMapUi.selectedId); return; }
    if (action === 'mindmap-edit') { var editProject = getProject(mindMapUi.projectId); var selectedNode = editProject && getMindMapNode(editProject, mindMapUi.selectedId); if (editProject && selectedNode) mindMapNodeForm(editProject, selectedNode); return; }
    if (action === 'mindmap-delete') { var deleteMapProject = getProject(mindMapUi.projectId); if (deleteMapProject) deleteMindMapNode(deleteMapProject, mindMapUi.selectedId); return; }
    if (action === 'rs-mais') { RS_LIMITE += 60; render(); return; }
    if (action === 'library-doc') { libraryDocModal(getProject(target.dataset.project), target.dataset.doc); return; }
    if (action === 'vault-info') { vaultInfo(); return; }
    if (action === 'lock-vault') { closeModal(); lockVault(); return; }
    if (action === 'reset-vault') { resetVault(); return; }
    if (action === 'start-five') { setTimer(target.dataset.id, Date.now() + 5 * 60 * 60 * 1000); return; }
    if (action === 'set-timer') { timerForm(target.dataset.id); return; }
    if (action === 'stop-timer') { stopTimer(target.dataset.id); return; }
  }
  function handleFilter(event) {
    var filter = event.target.dataset.filter; if (!filter) return;
    currentFilters[filter] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    render();
  }
  function handleKeyboard(event) {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-action="goto-project"]')) { event.preventDefault(); window.location.href = 'projeto-detalhes.html?id=' + encodeURIComponent(event.target.dataset.id); return; }
    if (event.key === 'Enter' && event.target.classList && event.target.classList.contains('pp-quick-add-input')) {
      event.preventDefault();
      var row = event.target.closest('.pp-quick-add-row'); var button = row && row.querySelector('button');
      if (button) button.click();
    }
  }
  function boot() {
    loadCache(); ensureCoreProjects(); ensureReportsProjectIcon(); ensureLibraryProjectIcon(); ensureFinanceProject(); ensureFinanceProjectIcon(); ensureRuralManagerProject(); ensureRuralManagerIcon(); ensureAxionProject(); ensureConexProject(); ensureLibraryDocumentation(); ensureProjectMindMaps(); render(); carregarRelatorioSkin(); installServiceWorker(); initSync(); if (!syncStarted) migrateLegacyTimers();
    document.addEventListener('click', handleAction); document.addEventListener('change', handleFilter); document.addEventListener('keydown', handleKeyboard);
    window.addEventListener('hashchange', function () { if (PAGE === 'workspace') render(); });
    aiTickId = window.setInterval(updateAiTimers, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
