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

  var state = emptyState();
  var sync = null;
  var syncStarted = false;
  var aiTickId = null;
  var vaultKey = null;
  var vaultData = null;
  var vaultExpiresAt = 0;
  var vaultTimeout = null;
  var currentFilters = { project: 'all', status: 'all', priority: 'all' };
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
    var stamp = now();
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
    var stamp = now();
    if (reports && !reports.logo) { reports.logo = 'iconv2.png'; reports.updatedAt = stamp; persist('reports-project-icon'); }
    state.migrations.reportsProjectIconV1 = { addedAt: stamp, projectId: reports ? reports.id : null };
    if (!reports || reports.logo !== 'iconv2.png') { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return Boolean(reports);
  }
  function ensureLibraryProjectIcon() {
    if (state.migrations.libraryProjectIconV1) return false;
    var library = coreProjectByName('Biblioteca digital', 'project-biblioteca-digital');
    var stamp = now();
    if (library && !library.logo) { library.logo = 'assets/icons/icone-biblioteca-digital.png'; library.updatedAt = stamp; persist('library-project-icon'); }
    state.migrations.libraryProjectIconV1 = { addedAt: stamp, projectId: library ? library.id : null };
    if (!library || library.logo !== 'assets/icons/icone-biblioteca-digital.png') { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return Boolean(library);
  }
  function ensureFinanceProject() {
    if (state.migrations.financeiroAppV1) return false;
    var stamp = now();
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
    var stamp = now();
    if (finance && !finance.logo) { finance.logo = 'assets/icons/icone-financeiro-app.png'; finance.updatedAt = stamp; persist('financeiro-app-icon'); }
    state.migrations.financeiroAppIconV1 = { addedAt: stamp, projectId: finance ? finance.id : null };
    if (!finance || finance.logo !== 'assets/icons/icone-financeiro-app.png') { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return Boolean(finance);
  }
  function ensureRuralManagerProject() {
    if (state.migrations.ruralManagerV1) return false;
    var stamp = now();
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
    var stamp = now();
    if (rural && !rural.logo) { rural.logo = 'assets/icons/icone-rural-manager.png'; rural.updatedAt = stamp; persist('rural-manager-icon'); }
    state.migrations.ruralManagerIconV1 = { addedAt: stamp, projectId: rural ? rural.id : null };
    if (!rural || rural.logo !== 'assets/icons/icone-rural-manager.png') { try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (error) {} }
    return Boolean(rural);
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
  function ensureLibraryDocumentation() {
    if (state.migrations.bibliotecaDocumentationV1) return false;
    var library = coreProjectByName('Biblioteca digital', 'project-biblioteca-digital');
    if (!library) return false;
    var stamp = now();
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
  function ensureProjectMindMaps() {
    var changed = false;
    active(state.projects).forEach(function (project) {
      if (project.mindMap && Array.isArray(project.mindMap.nodes) && project.mindMap.nodes.length) return;
      project.mindMap = project.id === 'project-biblioteca-digital' ? libraryMindMapSeed(project) : project.id === 'project-rural-manager' ? ruralManagerMindMapSeed(project) : createMindMap(project);
      project.updatedAt = now();
      changed = true;
    });
    if (changed) persist('mindmaps-bootstrap');
    return changed;
  }
  function getMindMap(project) {
    if (!project) return null;
    if (!project.mindMap || !Array.isArray(project.mindMap.nodes) || !project.mindMap.nodes.length) {
      project.mindMap = project.id === 'project-biblioteca-digital' ? libraryMindMapSeed(project) : project.id === 'project-rural-manager' ? ruralManagerMindMapSeed(project) : createMindMap(project);
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
        + '<div class="pp-project-meta"><span class="pp-badge pp-status-' + statusClass(project.status) + '">' + escapeHtml(project.status) + '</span>'
        + '<button class="pp-icon-button" aria-label="Editar ' + escapeHtml(project.name) + '" title="Editar" data-action="edit-project" data-id="' + project.id + '">' + uiIcon('edit') + '</button>'
        + '<button class="pp-icon-button" aria-label="Excluir ' + escapeHtml(project.name) + '" title="Excluir" data-action="delete-project" data-id="' + project.id + '">' + uiIcon('trash') + '</button></div></article>';
    }).join('') + '</div>';
  }
  function projectGrid(projects) {
    return '<div class="pp-project-grid">' + projects.map(function (project) {
      return '<article class="pp-project-tile" tabindex="0" role="link" aria-label="Abrir projeto ' + escapeHtml(project.name) + '" data-action="goto-project" data-id="' + project.id + '">'
        + projectLogo(project) + '<div class="pp-tile-actions"><button aria-label="Editar" title="Editar" data-action="edit-project" data-id="' + project.id + '">' + uiIcon('edit') + '</button><button aria-label="Excluir" title="Excluir" data-action="delete-project" data-id="' + project.id + '">' + uiIcon('trash') + '</button></div></article>';
    }).join('') + '</div>';
  }
  function emptyMarkup(title, message) { return '<div class="pp-empty"><strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(message) + '</span></div>'; }
  function ideasMarkup() {
    var ideas = active(state.ideas).filter(function (idea) {
      return (currentFilters.project === 'all' || (currentFilters.project === 'future' ? !idea.projectId : idea.projectId === currentFilters.project))
        && (currentFilters.status === 'all' || idea.status === currentFilters.status)
        && (currentFilters.priority === 'all' || idea.priority === currentFilters.priority);
    }).sort(function (a, b) {
      var priority = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
      return priority || toTime(b.updatedAt) - toTime(a.updatedAt);
    });
    var projectOptions = '<option value="all">Todos os projetos</option><option value="future"' + (currentFilters.project === 'future' ? ' selected' : '') + '>Projeto futuro</option>'
      + active(state.projects).map(function (project) { return '<option value="' + project.id + '"' + (currentFilters.project === project.id ? ' selected' : '') + '>' + escapeHtml(project.name) + '</option>'; }).join('');
    return '<section><div class="pp-section-head"><div><h2>Ideias</h2><p>Capture a ideia antes que ela se perca e conecte-a ao projeto certo.</p></div><div class="pp-toolbar"><button class="pp-button" data-action="new-idea">' + uiIcon('plus') + 'Nova ideia</button></div></div>'
      + '<div class="pp-filter-bar"><select data-filter="project" aria-label="Filtrar por projeto">' + projectOptions + '</select><select data-filter="status" aria-label="Filtrar por status"><option value="all">Todos os status</option>' + optionList(IDEA_STATUSES, currentFilters.status === 'all' ? '' : currentFilters.status) + '</select><select data-filter="priority" aria-label="Filtrar por prioridade"><option value="all">Todas as prioridades</option>' + optionList(PRIORITIES, currentFilters.priority === 'all' ? '' : currentFilters.priority) + '</select></div>'
      + (ideas.length ? '<div class="pp-ideas">' + ideas.map(ideaCard).join('') + '</div>' : emptyMarkup('Nenhuma ideia encontrada', 'Use o botão acima para criar uma ideia ou mude os filtros.')) + '</section>';
  }
  function ideaCard(idea) {
    var project = getProject(idea.projectId);
    return '<article class="pp-idea"><div class="pp-idea-header"><div><h3>' + escapeHtml(idea.title) + '</h3></div><div class="pp-toolbar"><button class="pp-icon-button" title="Editar ideia" aria-label="Editar ideia" data-action="edit-idea" data-id="' + idea.id + '">' + uiIcon('edit') + '</button><button class="pp-icon-button" title="Excluir ideia" aria-label="Excluir ideia" data-action="delete-idea" data-id="' + idea.id + '">' + uiIcon('trash') + '</button></div></div>'
      + '<p>' + escapeHtml(idea.description || 'Sem descrição detalhada.') + '</p><div class="pp-idea-foot"><div class="pp-tags"><span class="pp-tag pp-priority-' + priorityClass(idea.priority) + '">' + escapeHtml(idea.priority) + '</span><span class="pp-tag">' + escapeHtml(idea.status) + '</span><span class="pp-tag">' + (project ? projectLogo(project, true) + escapeHtml(project.name) : '◌ Projeto futuro') + '</span></div><span class="pp-tag">Editada ' + escapeHtml(formatDate(idea.updatedAt, false)) + '</span></div></article>';
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
    var documentation = project && project.documentation;
    if (!documentation || !Array.isArray(documentation.folders)) return null;
    for (var index = 0; index < documentation.folders.length; index += 1) {
      var found = (documentation.folders[index].children || []).find(function (item) { return item.id === itemId; });
      if (found) return found;
    }
    return null;
  }
  function libraryDocumentationMarkup(project) {
    var documentation = project && project.documentation;
    if (!documentation || !Array.isArray(documentation.folders)) return '';
    var counters = documentation.counters || {};
    return '<section class="pp-library-docs"><div class="pp-library-docs-head"><div><p class="pp-doc-kicker">DOCUMENTAÇÃO DO PROJETO</p><h2>' + escapeHtml(documentation.title) + '</h2><p>' + escapeHtml(documentation.summary) + '</p></div><button class="pp-button" data-action="library-map" data-project="' + project.id + '">' + uiIcon('map') + 'Abrir mapa mental</button></div>'
      + '<div class="pp-doc-stats"><span><b>' + Number(counters.available || 0) + '</b> livros disponíveis</span><span><b>' + Number(counters.pending || 0) + '</b> pendentes</span><span><b>' + Number(counters.series || 0) + '</b> séries</span><span><b>' + Number(counters.collections || 0) + '</b> coleções</span></div>'
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
    if (!project || !project.documentation) return;
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
    var tools = Array.isArray(project.tools) ? project.tools : [];
    var links = safeUrl(project.url) ? '<div class="pp-project-links"><a class="pp-project-link" target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safeUrl(project.url)) + '">' + uiIcon('external') + 'Abrir link principal</a></div>' : '<p class="pp-form-note">Nenhum link principal cadastrado.</p>';
    return headerMarkup(project.name, 'Detalhes, ferramentas, histórico e ideias deste projeto.', 'projetos-pessoais.html#projects')
      + '<main class="pp-shell"><section class="pp-detail-top">' + projectLogo(project) + '<div><h1>' + escapeHtml(project.name) + '</h1><p>' + escapeHtml(project.description || 'Sem descrição.') + '</p><div class="pp-tags" style="margin-top:10px"><span class="pp-badge pp-status-' + statusClass(project.status) + '">' + escapeHtml(project.status) + '</span><span class="pp-tag">' + escapeHtml(project.type || 'Outro') + '</span></div></div><div class="pp-detail-actions"><button class="pp-button" data-action="open-mindmap" data-id="' + project.id + '">' + uiIcon('map') + 'Mapa mental</button><button class="pp-button pp-secondary" data-action="edit-project" data-id="' + project.id + '">' + uiIcon('edit') + 'Editar</button><button class="pp-button pp-danger" data-action="delete-project" data-id="' + project.id + '">' + uiIcon('trash') + 'Excluir</button></div></section>' + libraryDocumentationMarkup(project)
      + '<div class="pp-detail-grid"><div><section class="pp-panel"><div class="pp-panel-head"><h2>Linha do tempo</h2><button class="pp-button pp-small" data-action="new-event" data-project="' + project.id + '">' + uiIcon('plus') + 'Registrar</button></div>' + (events.length ? '<div class="pp-timeline">' + events.map(eventCard).join('') + '</div>' : emptyMarkup('Sem atualizações ainda', 'Registre um avanço, deploy, ajuste ou qualquer passo importante.')) + '</section><section class="pp-panel"><div class="pp-panel-head"><h2>Ideias vinculadas</h2><a class="pp-button pp-small pp-secondary" href="projetos-pessoais.html#ideas">Ver todas</a></div>' + (projectIdeas.length ? projectIdeas.map(ideaMini).join('') : '<p class="pp-form-note">Ainda não há ideias vinculadas a este projeto.</p>') + '</section></div>'
      + '<aside>' + relatedProjectsMarkup(project) + '<section class="pp-panel"><h2>Links</h2><div style="height:12px"></div>' + links + '</section><section class="pp-panel"><div class="pp-panel-head"><h2>Ferramentas</h2><button class="pp-button pp-small" data-action="edit-project" data-id="' + project.id + '">Gerenciar</button></div>' + (tools.length ? '<div class="pp-tool-list">' + tools.map(function (tool) { return '<button class="pp-tool-button" data-action="open-tool" data-project="' + project.id + '" data-tool="' + tool.id + '"><span>' + providerIcon(tool.provider) + '<span><strong>' + escapeHtml(tool.label || tool.provider) + '</strong><span>' + escapeHtml(tool.provider) + ' · acesso protegido</span></span></span><b>' + uiIcon('lock') + '</b></button>'; }).join('') + '</div>' : '<p class="pp-form-note">Adicione GitHub, Supabase, I.As ou outra ferramenta ao editar o projeto.</p>') + '</section></aside></div></main>';
  }
  function eventCard(event) {
    var external = safeUrl(event.externalUrl) ? ' · <a target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safeUrl(event.externalUrl)) + '">abrir referência</a>' : '';
    return '<article class="pp-event"><div class="pp-event-top"><div><h3>' + escapeHtml(event.title) + '</h3><time>' + escapeHtml(formatDate(event.occurredAt)) + ' · ' + escapeHtml(event.source || 'Manual') + external + '</time></div><div class="pp-toolbar"><button class="pp-icon-button" title="Editar evento" aria-label="Editar evento" data-action="edit-event" data-id="' + event.id + '">' + uiIcon('edit') + '</button><button class="pp-icon-button" title="Excluir evento" aria-label="Excluir evento" data-action="delete-event" data-id="' + event.id + '">' + uiIcon('trash') + '</button></div></div>' + (event.details ? '<p>' + escapeHtml(event.details) + '</p>' : '') + '</article>';
  }
  function ideaMini(idea) {
    return '<div class="pp-idea-mini"><span class="pp-logo">' + uiIcon('idea') + '</span><div><strong>' + escapeHtml(idea.title) + '</strong><span>' + escapeHtml(idea.priority) + ' · ' + escapeHtml(idea.status) + '</span></div></div>';
  }
  function currentTab() {
    var hash = (window.location.hash || '').replace('#', '').toLowerCase();
    return ['projects', 'ideas', 'ias'].indexOf(hash) >= 0 ? hash : 'projects';
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
    persist('project-delete'); closeModal();
    if (PAGE === 'detail') window.location.href = 'projetos-pessoais.html#projects'; else { render(); toast('Projeto excluído.'); }
  }

  function ideaForm(idea) {
    idea = idea || { status: 'Para o futuro', priority: 'Média', projectId: null };
    var projectOptions = '<option value="">Projeto futuro</option>' + active(state.projects).map(function (project) { return '<option value="' + project.id + '"' + (idea.projectId === project.id ? ' selected' : '') + '>' + escapeHtml(project.name) + '</option>'; }).join('');
    var modal = showModal(idea.id ? 'Editar ideia' : 'Nova ideia', 'A data de criação e a última edição são registradas automaticamente.', '<form id="pp-idea-form"><div class="pp-form-grid"><label class="pp-form-label pp-full"><span>Título *</span><input class="pp-field" required maxlength="160" name="title" value="' + escapeHtml(idea.title || '') + '" placeholder="Descreva a ideia em poucas palavras"></label><label class="pp-form-label pp-full"><span>Descrição detalhada</span><textarea class="pp-field" name="description" maxlength="3000" placeholder="Registre os detalhes para não esquecer.">' + escapeHtml(idea.description || '') + '</textarea></label><label class="pp-form-label"><span>Projeto</span><select class="pp-field" name="projectId">' + projectOptions + '</select></label><label class="pp-form-label"><span>Status</span><select class="pp-field" name="status">' + optionList(IDEA_STATUSES, idea.status) + '</select></label><label class="pp-form-label"><span>Prioridade</span><select class="pp-field" name="priority">' + optionList(PRIORITIES, idea.priority) + '</select></label></div><div class="pp-error" id="pp-form-error"></div><div class="pp-modal-actions"><button type="button" class="pp-button pp-secondary" data-action="close-modal">Cancelar</button><button class="pp-button" type="submit">Salvar ideia</button></div></form>');
    var form = modal.querySelector('#pp-idea-form');
    form.addEventListener('submit', function (event) {
      event.preventDefault(); var title = form.elements.title.value.trim(); var error = modal.querySelector('#pp-form-error');
      if (!title) { error.textContent = 'Informe o título da ideia.'; return; }
      var stamp = now(); var record = idea.id ? state.ideas.find(function (item) { return item.id === idea.id; }) : null;
      if (!record) { record = { id: id('idea'), createdAt: stamp }; state.ideas.push(record); }
      record.title = title; record.description = form.elements.description.value.trim(); record.projectId = form.elements.projectId.value || null; record.status = form.elements.status.value; record.priority = form.elements.priority.value; record.updatedAt = stamp;
      persist('idea-save'); closeModal(); render(); toast('Ideia salva.');
    });
  }
  function deleteIdea(ideaId) {
    var idea = getIdea(ideaId); if (!idea) return;
    if (!window.confirm('Excluir a ideia "' + idea.title + '"?')) return;
    idea.deletedAt = now(); idea.updatedAt = idea.deletedAt; persist('idea-delete'); render(); toast('Ideia excluída.');
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
    if (action === 'library-doc') { libraryDocModal(getProject(target.dataset.project), target.dataset.doc); return; }
    if (action === 'vault-info') { vaultInfo(); return; }
    if (action === 'lock-vault') { closeModal(); lockVault(); return; }
    if (action === 'reset-vault') { resetVault(); return; }
    if (action === 'start-five') { setTimer(target.dataset.id, Date.now() + 5 * 60 * 60 * 1000); return; }
    if (action === 'set-timer') { timerForm(target.dataset.id); return; }
    if (action === 'stop-timer') { stopTimer(target.dataset.id); return; }
  }
  function handleFilter(event) { var filter = event.target.dataset.filter; if (!filter) return; currentFilters[filter] = event.target.value; render(); }
  function handleKeyboard(event) { if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-action="goto-project"]')) { event.preventDefault(); window.location.href = 'projeto-detalhes.html?id=' + encodeURIComponent(event.target.dataset.id); } }
  function boot() {
    loadCache(); ensureCoreProjects(); ensureReportsProjectIcon(); ensureLibraryProjectIcon(); ensureFinanceProject(); ensureFinanceProjectIcon(); ensureRuralManagerProject(); ensureRuralManagerIcon(); ensureLibraryDocumentation(); ensureProjectMindMaps(); render(); installServiceWorker(); initSync(); if (!syncStarted) migrateLegacyTimers();
    document.addEventListener('click', handleAction); document.addEventListener('change', handleFilter); document.addEventListener('keydown', handleKeyboard);
    window.addEventListener('hashchange', function () { if (PAGE === 'workspace') render(); });
    aiTickId = window.setInterval(updateAiTimers, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
