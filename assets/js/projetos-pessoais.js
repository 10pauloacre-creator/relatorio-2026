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

  var state = emptyState();
  var sync = null;
  var syncStarted = false;
  var aiTickId = null;
  var vaultKey = null;
  var vaultData = null;
  var vaultExpiresAt = 0;
  var vaultTimeout = null;
  var currentFilters = { project: 'all', status: 'all', priority: 'all' };

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
      + (back ? '<a class="pp-back" href="' + back + '">← Voltar aos projetos</a>' : '<a class="pp-back" href="index.html">← Início</a>')
      + '<div class="pp-kicker">Organização pessoal</div><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(subtitle) + '</p></div>'
      + '<button type="button" class="pp-vault-status" data-action="vault-info" aria-label="Abrir opções do cofre"><strong>' + (isVaultUnlocked() ? '🔓 Cofre desbloqueado' : '🔒 Cofre protegido') + '</strong><span>' + (isVaultUnlocked() ? 'Acesso ativo por 15 minutos' : state.vault ? 'Senha necessária para as ferramentas' : 'Defina a senha no primeiro acesso') + '</span></button>'
      + '</div></header>';
  }
  function workspaceMarkup() {
    var tab = currentTab();
    return headerMarkup('Projetos pessoais', 'Um lugar para lembrar do que está em andamento, das ideias e dos acessos importantes.')
      + '<main class="pp-shell"><nav class="pp-tabs" aria-label="Seções de projetos">'
      + tabButton('projects', '🗂 Projetos', tab) + tabButton('ideas', '💡 Ideias', tab) + tabButton('ias', '✦ I.As', tab)
      + '</nav>' + (tab === 'ideas' ? ideasMarkup() : tab === 'ias' ? aiMarkup() : projectsMarkup()) + '</main>';
  }
  function tabButton(value, label, current) { return '<button type="button" class="pp-tab' + (value === current ? ' is-active' : '') + '" data-action="tab" data-tab="' + value + '">' + label + '</button>'; }
  function projectsMarkup() {
    var view = localStorage.getItem('pp_project_view') || 'list';
    var projects = active(state.projects).sort(function (a, b) { return toTime(b.updatedAt) - toTime(a.updatedAt); });
    var body = projects.length ? (view === 'grid' ? projectGrid(projects) : projectList(projects)) : emptyMarkup('Nenhum projeto ainda', 'Crie o primeiro projeto e concentre aqui o que está sendo desenvolvido.');
    return '<section><div class="pp-section-head"><div><h2>Projetos</h2><p>Acompanhe seus projetos em um só lugar.</p></div><div class="pp-toolbar">'
      + '<button class="pp-icon-button' + (view === 'list' ? ' is-active' : '') + '" title="Visualizar em lista" aria-label="Visualizar em lista" data-action="view" data-view="list">☷</button>'
      + '<button class="pp-icon-button' + (view === 'grid' ? ' is-active' : '') + '" title="Visualizar em grade" aria-label="Visualizar em grade" data-action="view" data-view="grid">▦</button>'
      + '<button class="pp-button" data-action="new-project">＋ Novo projeto</button></div></div>' + body + '</section>';
  }
  function projectList(projects) {
    return '<div class="pp-project-list">' + projects.map(function (project) {
      return '<article class="pp-project-row" tabindex="0" role="link" data-action="goto-project" data-id="' + project.id + '">'
        + projectLogo(project) + '<div class="pp-project-copy"><h3>' + escapeHtml(project.name) + '</h3><p>' + escapeHtml(project.description || 'Sem descrição.') + '</p></div>'
        + '<div class="pp-project-meta"><span class="pp-badge pp-status-' + statusClass(project.status) + '">' + escapeHtml(project.status) + '</span>'
        + '<button class="pp-icon-button" aria-label="Editar ' + escapeHtml(project.name) + '" title="Editar" data-action="edit-project" data-id="' + project.id + '">✎</button>'
        + '<button class="pp-icon-button" aria-label="Excluir ' + escapeHtml(project.name) + '" title="Excluir" data-action="delete-project" data-id="' + project.id + '">⌫</button></div></article>';
    }).join('') + '</div>';
  }
  function projectGrid(projects) {
    return '<div class="pp-project-grid">' + projects.map(function (project) {
      return '<article class="pp-project-tile" tabindex="0" role="link" aria-label="Abrir projeto ' + escapeHtml(project.name) + '" data-action="goto-project" data-id="' + project.id + '">'
        + projectLogo(project) + '<div class="pp-tile-actions"><button aria-label="Editar" title="Editar" data-action="edit-project" data-id="' + project.id + '">✎</button><button aria-label="Excluir" title="Excluir" data-action="delete-project" data-id="' + project.id + '">⌫</button></div></article>';
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
    return '<section><div class="pp-section-head"><div><h2>Ideias</h2><p>Capture a ideia antes que ela se perca e conecte-a ao projeto certo.</p></div><div class="pp-toolbar"><button class="pp-button" data-action="new-idea">＋ Nova ideia</button></div></div>'
      + '<div class="pp-filter-bar"><select data-filter="project" aria-label="Filtrar por projeto">' + projectOptions + '</select><select data-filter="status" aria-label="Filtrar por status"><option value="all">Todos os status</option>' + optionList(IDEA_STATUSES, currentFilters.status === 'all' ? '' : currentFilters.status) + '</select><select data-filter="priority" aria-label="Filtrar por prioridade"><option value="all">Todas as prioridades</option>' + optionList(PRIORITIES, currentFilters.priority === 'all' ? '' : currentFilters.priority) + '</select></div>'
      + (ideas.length ? '<div class="pp-ideas">' + ideas.map(ideaCard).join('') + '</div>' : emptyMarkup('Nenhuma ideia encontrada', 'Use o botão acima para criar uma ideia ou mude os filtros.')) + '</section>';
  }
  function ideaCard(idea) {
    var project = getProject(idea.projectId);
    return '<article class="pp-idea"><div class="pp-idea-header"><div><h3>' + escapeHtml(idea.title) + '</h3></div><div class="pp-toolbar"><button class="pp-icon-button" title="Editar ideia" aria-label="Editar ideia" data-action="edit-idea" data-id="' + idea.id + '">✎</button><button class="pp-icon-button" title="Excluir ideia" aria-label="Excluir ideia" data-action="delete-idea" data-id="' + idea.id + '">⌫</button></div></div>'
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
  function detailMarkup(project) {
    if (!project) return headerMarkup('Projeto não encontrado', 'Ele pode ter sido excluído ou o endereço está incorreto.', 'projetos-pessoais.html#projects') + '<main class="pp-shell"><div class="pp-empty"><strong>Projeto não encontrado</strong><a class="pp-button" href="projetos-pessoais.html#projects">Ver projetos</a></div></main>';
    var projectIdeas = active(state.ideas).filter(function (idea) { return idea.projectId === project.id; }).sort(function (a, b) { return toTime(b.updatedAt) - toTime(a.updatedAt); });
    var events = active(state.activities).filter(function (event) { return event.projectId === project.id; }).sort(function (a, b) { return toTime(b.occurredAt) - toTime(a.occurredAt); });
    var tools = Array.isArray(project.tools) ? project.tools : [];
    var links = safeUrl(project.url) ? '<div class="pp-project-links"><a class="pp-project-link" target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safeUrl(project.url)) + '">↗ Abrir link principal</a></div>' : '<p class="pp-form-note">Nenhum link principal cadastrado.</p>';
    return headerMarkup(project.name, 'Detalhes, ferramentas, histórico e ideias deste projeto.', 'projetos-pessoais.html#projects')
      + '<main class="pp-shell"><section class="pp-detail-top">' + projectLogo(project) + '<div><h1>' + escapeHtml(project.name) + '</h1><p>' + escapeHtml(project.description || 'Sem descrição.') + '</p><div class="pp-tags" style="margin-top:10px"><span class="pp-badge pp-status-' + statusClass(project.status) + '">' + escapeHtml(project.status) + '</span><span class="pp-tag">' + escapeHtml(project.type || 'Outro') + '</span></div></div><div class="pp-detail-actions"><button class="pp-button pp-secondary" data-action="edit-project" data-id="' + project.id + '">✎ Editar</button><button class="pp-button pp-danger" data-action="delete-project" data-id="' + project.id + '">Excluir</button></div></section>'
      + '<div class="pp-detail-grid"><div><section class="pp-panel"><div class="pp-panel-head"><h2>Linha do tempo</h2><button class="pp-button pp-small" data-action="new-event" data-project="' + project.id + '">＋ Registrar</button></div>' + (events.length ? '<div class="pp-timeline">' + events.map(eventCard).join('') + '</div>' : emptyMarkup('Sem atualizações ainda', 'Registre um avanço, deploy, ajuste ou qualquer passo importante.')) + '</section><section class="pp-panel"><div class="pp-panel-head"><h2>Ideias vinculadas</h2><a class="pp-button pp-small pp-secondary" href="projetos-pessoais.html#ideas">Ver todas</a></div>' + (projectIdeas.length ? projectIdeas.map(ideaMini).join('') : '<p class="pp-form-note">Ainda não há ideias vinculadas a este projeto.</p>') + '</section></div>'
      + '<aside><section class="pp-panel"><h2>Links</h2><div style="height:12px"></div>' + links + '</section><section class="pp-panel"><div class="pp-panel-head"><h2>Ferramentas</h2><button class="pp-button pp-small" data-action="edit-project" data-id="' + project.id + '">Gerenciar</button></div>' + (tools.length ? '<div class="pp-tool-list">' + tools.map(function (tool) { return '<button class="pp-tool-button" data-action="open-tool" data-project="' + project.id + '" data-tool="' + tool.id + '"><span>' + providerIcon(tool.provider) + '<span><strong>' + escapeHtml(tool.label || tool.provider) + '</strong><span>' + escapeHtml(tool.provider) + ' · acesso protegido</span></span></span><b>🔒</b></button>'; }).join('') + '</div>' : '<p class="pp-form-note">Adicione GitHub, Supabase, I.As ou outra ferramenta ao editar o projeto.</p>') + '</section></aside></div></main>';
  }
  function eventCard(event) {
    var external = safeUrl(event.externalUrl) ? ' · <a target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safeUrl(event.externalUrl)) + '">abrir referência</a>' : '';
    return '<article class="pp-event"><div class="pp-event-top"><div><h3>' + escapeHtml(event.title) + '</h3><time>' + escapeHtml(formatDate(event.occurredAt)) + ' · ' + escapeHtml(event.source || 'Manual') + external + '</time></div><div class="pp-toolbar"><button class="pp-icon-button" title="Editar evento" aria-label="Editar evento" data-action="edit-event" data-id="' + event.id + '">✎</button><button class="pp-icon-button" title="Excluir evento" aria-label="Excluir evento" data-action="delete-event" data-id="' + event.id + '">⌫</button></div></div>' + (event.details ? '<p>' + escapeHtml(event.details) + '</p>' : '') + '</article>';
  }
  function ideaMini(idea) {
    return '<div class="pp-idea-mini"><span class="pp-logo">💡</span><div><strong>' + escapeHtml(idea.title) + '</strong><span>' + escapeHtml(idea.priority) + ' · ' + escapeHtml(idea.status) + '</span></div></div>';
  }
  function currentTab() {
    var hash = (window.location.hash || '').replace('#', '').toLowerCase();
    return ['projects', 'ideas', 'ias'].indexOf(hash) >= 0 ? hash : 'projects';
  }
  function render() {
    if (!APP) return;
    if (PAGE === 'detail') {
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
    modal.innerHTML = '<div class="pp-modal-card' + (options && options.wide ? ' pp-modal-wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + escapeHtml(title) + '"><div class="pp-modal-header"><div><h2>' + escapeHtml(title) + '</h2>' + (description ? '<p>' + escapeHtml(description) + '</p>' : '') + '</div><button class="pp-modal-close" data-action="close-modal" aria-label="Fechar">×</button></div><div class="pp-modal-body">' + content + '</div></div>';
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
    loadCache(); render(); installServiceWorker(); initSync(); if (!syncStarted) migrateLegacyTimers();
    document.addEventListener('click', handleAction); document.addEventListener('change', handleFilter); document.addEventListener('keydown', handleKeyboard);
    window.addEventListener('hashchange', function () { if (PAGE === 'workspace') render(); });
    aiTickId = window.setInterval(updateAiTimers, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
