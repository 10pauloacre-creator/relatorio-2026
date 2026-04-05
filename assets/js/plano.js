// ═══════════════════════════════════════════════════════════
// PLANO.JS — Plano Anual com status interativo por aula
// ═══════════════════════════════════════════════════════════
// Depende de: PLANO_ANUAL, TURMAS (data.js)
//             salvarStatusAula, carregarStatusPlano, execComSync (firebase.js)
//             incrementarAula, decrementarAula (contador.js)

// Cache de status carregados do Firebase
// Chave: "${turmaId}_${disciplina}_${bimestre}_${indice}" (sem espaços)
let statusCache = {};

// Filtros ativos — valores padrão: primeira turma, todas as disciplinas
let filtroTurma = 't1';
let filtroDisciplina = '';

// ─────────────────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────────────────

// Inicializa o plano: carrega status do Firebase e renderiza
async function initPlano() {
  try {
    statusCache = await carregarStatusPlano();
  } catch (e) {
    // Modo offline: opera com cache vazio (sem dados persistidos)
    console.warn('[Plano] Offline — usando cache local:', e);
    statusCache = {};
  }
  renderFiltrosPlano();
  renderPlano();
}

// ─────────────────────────────────────────────────────────
// FILTROS
// ─────────────────────────────────────────────────────────

// Monta os selects de filtro (turma e disciplina) no container #plano-filtros
function renderFiltrosPlano() {
  const containerFiltros = document.getElementById('plano-filtros');
  if (!containerFiltros) return;

  // Monta options de turmas a partir do array TURMAS (data.js)
  const optTurmas = TURMAS.map(t =>
    `<option value="${t.id}">${t.nome}</option>`
  ).join('');

  containerFiltros.innerHTML = `
    <div class="filtro-grupo">
      <label class="filtro-label" for="filtro-turma">Turma</label>
      <select class="filtro-select" id="filtro-turma">
        ${optTurmas}
      </select>
    </div>
    <div class="filtro-grupo">
      <label class="filtro-label" for="filtro-disc">Disciplina</label>
      <select class="filtro-select" id="filtro-disc">
        <option value="">Todas</option>
      </select>
    </div>`;

  const selTurma = document.getElementById('filtro-turma');
  const selDisc = document.getElementById('filtro-disc');

  // Restaura a turma ativa antes de vincular eventos
  selTurma.value = filtroTurma;
  atualizarOpcoesDisc(filtroTurma, selDisc);

  // Evento: troca de turma — atualiza disciplinas e re-renderiza
  selTurma.addEventListener('change', function() {
    filtroTurma = this.value;
    filtroDisciplina = '';
    atualizarOpcoesDisc(filtroTurma, selDisc);
    renderPlano();
  });

  // Evento: troca de disciplina — re-renderiza o conteúdo
  selDisc.addEventListener('change', function() {
    filtroDisciplina = this.value;
    renderPlano();
  });
}

// Popula as options do select de disciplina conforme a turma selecionada
function atualizarOpcoesDisc(turmaId, selEl) {
  const planoTurma = PLANO_ANUAL[turmaId] || {};
  const disciplinas = Object.keys(planoTurma);
  selEl.innerHTML = '<option value="">Todas</option>' +
    disciplinas.map(d => `<option value="${d}">${d}</option>`).join('');
  // Reseta o filtro de disciplina ao trocar de turma
  filtroDisciplina = '';
}

// ─────────────────────────────────────────────────────────
// RENDERIZAÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────

// Renderiza o conteúdo principal do plano no container #plano-content
function renderPlano() {
  const container = document.getElementById('plano-content');
  if (!container) return;
  container.innerHTML = '';

  const planoTurma = PLANO_ANUAL[filtroTurma] || {};
  // Se filtroDisciplina estiver vazio, exibe todas as disciplinas da turma
  const disciplinas = filtroDisciplina
    ? [filtroDisciplina]
    : Object.keys(planoTurma);

  if (disciplinas.length === 0) {
    container.innerHTML = '<div class="sem-dados"><span class="icone">📚</span><p>Nenhum plano encontrado para esta turma.</p></div>';
    return;
  }

  // Cria uma seção por disciplina, contendo seus bimestres
  disciplinas.forEach(disc => {
    const bimestres = planoTurma[disc] || [];
    if (bimestres.length === 0) return;

    const discSection = document.createElement('div');
    discSection.className = 'disc-section';
    discSection.innerHTML = `<h3 class="disc-titulo">${disc}</h3>`;

    bimestres.forEach(bim => {
      const secBim = criarSecaoBimestre(bim, disc, filtroTurma);
      discSection.appendChild(secBim);
    });

    container.appendChild(discSection);
  });
}

// ─────────────────────────────────────────────────────────
// SEÇÃO DE BIMESTRE
// ─────────────────────────────────────────────────────────

// Cria o bloco visual de um bimestre com header (stats + barra de progresso)
// e lista de aulas interativas
function criarSecaoBimestre(bim, disciplina, turmaId) {
  const sec = document.createElement('div');
  sec.className = 'bimestre-section';

  // Calcula contadores a partir do statusCache atual
  const stats = calcularStatsBimestre(bim.aulas, disciplina, turmaId, bim.bimestre);
  const pctAplicadas = bim.aulas.length > 0
    ? Math.round((stats.aplicadas / bim.aulas.length) * 100)
    : 0;

  // O id da lista usa o nome da disciplina sem espaços para evitar seletores inválidos
  sec.innerHTML = `
    <div class="bimestre-header">
      <div class="bimestre-titulo">
        <span>${bim.titulo}</span>
        <span style="font-size:0.8rem;opacity:0.8">${bim.aulas.length} aulas</span>
      </div>
      <div class="bimestre-stats">
        ${stats.aplicadas} aplicadas · ${stats.puladas} puladas · ${stats.simaed} no SIMAED
      </div>
      <div class="bimestre-progresso">
        <div class="bimestre-progresso-fill" style="width:${pctAplicadas}%"></div>
      </div>
    </div>
    <div class="lista-aulas" id="lista-${turmaId}-${disciplina.replace(/\s+/g,'_')}-${bim.bimestre}"></div>`;

  const lista = sec.querySelector('.lista-aulas');
  // Cria um item de aula para cada título no array bim.aulas
  bim.aulas.forEach((titulo, idx) => {
    const itemAula = criarItemAula(titulo, idx, bim.bimestre, disciplina, turmaId, sec);
    lista.appendChild(itemAula);
  });

  return sec;
}

// ─────────────────────────────────────────────────────────
// ITEM DE AULA
// ─────────────────────────────────────────────────────────

// Cria o elemento interativo de uma aula: header expansível + painel de status
function criarItemAula(titulo, indice, bimestre, disciplina, turmaId, secBim) {
  const chave = chaveStatus(turmaId, disciplina, bimestre, indice);
  // Usa o cache ou assume status inicial todos falsos
  const status = statusCache[chave] || { aplicada: false, pulada: false, lancadoSimaed: false };

  const item = document.createElement('div');
  item.className = 'aula-item';
  item.dataset.chave = chave; // Facilita leitura do cache ao atualizar stats

  // Aplica classe de estilo ao título conforme status atual
  const classTitulo = status.aplicada ? 'aplicada' : (status.pulada ? 'pulada' : '');
  const indicadores = montarIndicadores(status);

  item.innerHTML = `
    <div class="aula-header-row">
      <span class="aula-numero">${indice + 1}</span>
      <span class="aula-titulo-text ${classTitulo}">${titulo}${status.lancadoSimaed ? ' <span title="No SIMAED">📋</span>' : ''}</span>
      <div class="aula-indicadores">${indicadores}</div>
      <span class="aula-expand-icon">›</span>
    </div>
    <div class="status-panel">
      <button class="status-btn ${status.aplicada ? 'ativo-aplicada' : ''}" data-tipo="aplicada">
        ✓ Aplicada
      </button>
      <button class="status-btn ${status.pulada ? 'ativo-pulada' : ''}" data-tipo="pulada">
        ↷ Pulada
      </button>
      <button class="status-btn ${status.lancadoSimaed ? 'ativo-simaed' : ''}" data-tipo="lancadoSimaed">
        📋 SIMAED
      </button>
    </div>`;

  // Click no header-row expande/fecha o painel de status
  // Fecha automaticamente os outros itens abertos na mesma lista
  const headerRow = item.querySelector('.aula-header-row');
  headerRow.addEventListener('click', function() {
    const expandido = item.classList.contains('expandido');
    // Fecha todos os outros itens expandidos da mesma lista
    const lista = item.closest('.lista-aulas');
    if (lista) {
      lista.querySelectorAll('.aula-item.expandido').forEach(i => {
        if (i !== item) i.classList.remove('expandido');
      });
    }
    item.classList.toggle('expandido', !expandido);
    item.querySelector('.aula-expand-icon').textContent = !expandido ? '⌄' : '›';
  });

  // Botões de status — stopPropagation para não disparar o collapse do header
  item.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const tipo = this.dataset.tipo;
      toggleStatus(item, chave, tipo, turmaId, disciplina, secBim, titulo, indice);
    });
  });

  return item;
}

// ─────────────────────────────────────────────────────────
// TOGGLE DE STATUS
// ─────────────────────────────────────────────────────────

// Alterna um campo de status (aplicada/pulada/lancadoSimaed), atualiza o DOM
// e persiste no Firebase via execComSync
function toggleStatus(item, chave, tipo, turmaId, disciplina, secBim, titulo, indice) {
  // Garante que a entrada exista no cache antes de modificar
  if (!statusCache[chave]) statusCache[chave] = { aplicada: false, pulada: false, lancadoSimaed: false };

  const antigo = statusCache[chave][tipo];
  statusCache[chave][tipo] = !antigo;

  const novoStatus = statusCache[chave];

  // Atualiza visual do botão correspondente
  const btn = item.querySelector(`[data-tipo="${tipo}"]`);
  const mapCls = { aplicada: 'ativo-aplicada', pulada: 'ativo-pulada', lancadoSimaed: 'ativo-simaed' };
  if (btn) btn.classList.toggle(mapCls[tipo], novoStatus[tipo]);

  // Atualiza estilo e conteúdo do título da aula
  const tituloEl = item.querySelector('.aula-titulo-text');
  if (tituloEl) {
    tituloEl.className = 'aula-titulo-text ' + (novoStatus.aplicada ? 'aplicada' : (novoStatus.pulada ? 'pulada' : ''));
    tituloEl.innerHTML = titulo + (novoStatus.lancadoSimaed ? ' <span title="No SIMAED">📋</span>' : '');
  }

  // Atualiza os indicadores visuais (ícones ao lado do título)
  const indEl = item.querySelector('.aula-indicadores');
  if (indEl) indEl.innerHTML = montarIndicadores(novoStatus);

  // Incrementa/decrementa o contador de aulas aplicadas (contador.js)
  if (tipo === 'aplicada') {
    if (novoStatus.aplicada) incrementarAula(turmaId, disciplina);
    else decrementarAula(turmaId, disciplina);
  }

  // Recalcula e atualiza os stats do bimestre pai no DOM
  atualizarStatsBimestre(secBim, disciplina, turmaId);

  // Persiste a alteração no Firebase (execComSync garante fila de escrita)
  execComSync(() => salvarStatusAula(turmaId, disciplina, indice.toString().split('_')[0] || '', indice, novoStatus));
}

// ─────────────────────────────────────────────────────────
// UTILITÁRIOS DE STATUS
// ─────────────────────────────────────────────────────────

// Gera os indicadores visuais (badges) para um objeto de status
function montarIndicadores(status) {
  let html = '';
  if (status.aplicada) html += '<span class="indicador-status ind-aplicada">✓</span>';
  if (status.pulada) html += '<span class="indicador-status ind-pulada">↷</span>';
  if (status.lancadoSimaed) html += '<span class="indicador-status ind-simaed">📋</span>';
  return html;
}

// Percorre o statusCache e conta aulas aplicadas, puladas e no SIMAED
// para um bimestre específico de uma disciplina/turma
function calcularStatsBimestre(aulas, disciplina, turmaId, bimestre) {
  let aplicadas = 0, puladas = 0, simaed = 0;
  aulas.forEach((_, idx) => {
    const chave = chaveStatus(turmaId, disciplina, bimestre, idx);
    const s = statusCache[chave] || {};
    if (s.aplicada) aplicadas++;
    if (s.pulada) puladas++;
    if (s.lancadoSimaed) simaed++;
  });
  return { aplicadas, puladas, simaed };
}

// Atualiza o texto de stats e a barra de progresso de um bimestre já renderizado
function atualizarStatsBimestre(secBim, disciplina, turmaId) {
  const header = secBim.querySelector('.bimestre-header');
  if (!header) return;
  const lista = secBim.querySelector('.lista-aulas');
  if (!lista) return;

  const itens = lista.querySelectorAll('.aula-item');
  let ap = 0, pu = 0, si = 0;

  // Lê os status diretamente do cache usando a chave gravada em data-chave
  itens.forEach(item => {
    const chave = item.dataset.chave;
    const s = statusCache[chave] || {};
    if (s.aplicada) ap++;
    if (s.pulada) pu++;
    if (s.lancadoSimaed) si++;
  });

  const statsEl = header.querySelector('.bimestre-stats');
  if (statsEl) statsEl.textContent = `${ap} aplicadas · ${pu} puladas · ${si} no SIMAED`;

  // Recalcula percentual para a barra de progresso
  const pct = itens.length > 0 ? Math.round((ap / itens.length) * 100) : 0;
  const fill = header.querySelector('.bimestre-progresso-fill');
  if (fill) fill.style.width = pct + '%';
}

// Gera a chave única de cache para uma aula específica
// Formato: "turmaId_disciplina_bimestre_indice" (espaços substituídos por _)
function chaveStatus(turmaId, disciplina, bimestre, indice) {
  return `${turmaId}_${disciplina}_${bimestre}_${indice}`.replace(/\s+/g, '_');
}
