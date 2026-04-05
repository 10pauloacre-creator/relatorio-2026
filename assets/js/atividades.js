// ═══════════════════════════════════════════════════════════
// ATIVIDADES.JS — Controle de atividades por aluno
// ═══════════════════════════════════════════════════════════

// Estado: { nomeAluno: 'realizou' | 'nao-realizou' | 'pendente' }
const estadoAtividade = {};

function renderAtividade(containerEl, turmaId, data, dadosIniciais) {
  if (!containerEl) return;

  const alunos = ALUNOS[turmaId] || [];

  // Inicializa estado
  alunos.forEach(a => { estadoAtividade[a.nome] = 'pendente'; });
  if (dadosIniciais) {
    (dadosIniciais.realizaram || []).forEach(n => { estadoAtividade[n] = 'realizou'; });
    (dadosIniciais.naoRealizaram || []).forEach(n => { estadoAtividade[n] = 'nao-realizou'; });
  }

  containerEl.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'bloco-atividade';

  // Campo de título da atividade
  const tituloInput = document.createElement('input');
  tituloInput.type = 'text';
  tituloInput.className = 'ativ-titulo-input';
  tituloInput.placeholder = 'Nome / tema da atividade...';
  tituloInput.value = dadosIniciais ? (dadosIniciais.tema || '') : '';
  tituloInput.addEventListener('change', function () {
    salvarEstadoAtividade(turmaId, data, alunos, tituloInput);
  });
  wrapper.appendChild(tituloInput);

  const lista = document.createElement('div');
  lista.className = 'lista-atividade';

  alunos.forEach(a => {
    const item = criarItemAtividade(a, turmaId, data, alunos, tituloInput);
    lista.appendChild(item);
  });

  wrapper.appendChild(lista);
  containerEl.appendChild(wrapper);
}

function criarItemAtividade(aluno, turmaId, data, alunos, tituloInput) {
  const item = document.createElement('div');
  const estado = estadoAtividade[aluno.nome] || 'pendente';
  item.className = `ativ-aluno ${estado}`;
  item.dataset.nome = aluno.nome;

  const icones = {
    realizou: '✓ Realizou',
    'nao-realizou': '✗ Não realizou',
    pendente: '– Pendente'
  };

  const statusSpan = document.createElement('span');
  statusSpan.className = 'ativ-status-text';
  statusSpan.textContent = icones[estado];

  const nomeSpan = document.createElement('span');
  nomeSpan.textContent = `${aluno.num}. ${aluno.nome}`;

  item.appendChild(statusSpan);
  item.appendChild(nomeSpan);

  item.addEventListener('click', function () {
    alternarAtividade(this, aluno.nome, turmaId, data, alunos, tituloInput);
  });

  return item;
}

function alternarAtividade(itemEl, nomeAluno, turmaId, data, alunos, tituloInput) {
  const ciclo = { pendente: 'realizou', realizou: 'nao-realizou', 'nao-realizou': 'pendente' };
  const icones = {
    realizou: '✓ Realizou',
    'nao-realizou': '✗ Não realizou',
    pendente: '– Pendente'
  };

  const atual = estadoAtividade[nomeAluno] || 'pendente';
  const novo = ciclo[atual];
  estadoAtividade[nomeAluno] = novo;

  itemEl.className = `ativ-aluno ${novo}`;
  itemEl.querySelector('.ativ-status-text').textContent = icones[novo];

  salvarEstadoAtividade(turmaId, data, alunos, tituloInput);
}

function salvarEstadoAtividade(turmaId, data, alunos, tituloInput) {
  const realizaram = [], naoRealizaram = [], pendentes = [];
  alunos.forEach(a => {
    const est = estadoAtividade[a.nome] || 'pendente';
    if (est === 'realizou') realizaram.push(a.nome);
    else if (est === 'nao-realizou') naoRealizaram.push(a.nome);
    else pendentes.push(a.nome);
  });

  const atividade = {
    tema: tituloInput ? tituloInput.value : '',
    realizaram,
    naoRealizaram,
    pendentes
  };

  execComSync(() => salvarAtividade(turmaId, data, atividade));
}
