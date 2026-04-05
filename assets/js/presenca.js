// ═══════════════════════════════════════════════════════════
// PRESENCA.JS — Lista de presença interativa
// ═══════════════════════════════════════════════════════════

// Estado atual de presença: { nomeAluno: 'presente' | 'falta' | 'fj' }
const estadoPresenca = {};

// Renderiza o bloco de presença para uma data/turma
// containerEl: elemento DOM onde renderizar
// turmaId: string ('t1','t2','t3','t6')
// data: string '2026-03-30'
// dadosIniciais: objeto { presentes:[], faltas:[], faltasJustificadas:[] }
function renderPresenca(containerEl, turmaId, data, dadosIniciais) {
  if (!containerEl) return;

  const alunos = ALUNOS[turmaId] || [];

  // Inicializa o estado com os dados iniciais
  alunos.forEach(a => {
    estadoPresenca[a.nome] = 'presente'; // default
  });
  if (dadosIniciais) {
    (dadosIniciais.presentes || []).forEach(n => { estadoPresenca[n] = 'presente'; });
    (dadosIniciais.faltas || []).forEach(n => { estadoPresenca[n] = 'falta'; });
    (dadosIniciais.faltasJustificadas || []).forEach(n => { estadoPresenca[n] = 'fj'; });
  }

  containerEl.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'bloco-presenca';

  const header = document.createElement('div');
  header.className = 'presenca-header';

  const titulo = document.createElement('div');
  titulo.className = 'presenca-titulo';
  titulo.textContent = 'Lista de Presença';

  const contador = document.createElement('div');
  contador.className = 'presenca-contador';
  contador.id = `presenca-contador-${turmaId}-${data}`;
  contador.textContent = contarPresenca(alunos);

  header.appendChild(titulo);
  header.appendChild(contador);
  wrapper.appendChild(header);

  const lista = document.createElement('div');
  lista.className = 'lista-alunos';
  lista.id = `lista-presenca-${turmaId}-${data}`;

  alunos.forEach(a => {
    const item = criarItemAluno(a, turmaId, data);
    lista.appendChild(item);
  });

  wrapper.appendChild(lista);
  containerEl.appendChild(wrapper);
}

function criarItemAluno(aluno, turmaId, data) {
  const item = document.createElement('div');
  item.className = `aluno-item ${estadoPresenca[aluno.nome] || 'presente'}`;
  item.dataset.nome = aluno.nome;
  item.dataset.turma = turmaId;
  item.dataset.data = data;

  const icones = { presente: '✓', falta: '✗', fj: '⚠' };

  const statusSpan = document.createElement('span');
  statusSpan.className = 'aluno-status';
  statusSpan.textContent = icones[estadoPresenca[aluno.nome] || 'presente'];

  const nomeSpan = document.createElement('span');
  nomeSpan.textContent = `${aluno.num}. ${aluno.nome}`;

  item.appendChild(statusSpan);
  item.appendChild(nomeSpan);

  item.addEventListener('click', function () {
    alternarPresenca(this, aluno.nome, turmaId, data);
  });

  return item;
}

function alternarPresenca(itemEl, nomeAluno, turmaId, data) {
  const ciclo = { presente: 'falta', falta: 'fj', fj: 'presente' };
  const icones = { presente: '✓', falta: '✗', fj: '⚠' };

  const atual = estadoPresenca[nomeAluno] || 'presente';
  const novo = ciclo[atual];
  estadoPresenca[nomeAluno] = novo;

  itemEl.className = `aluno-item ${novo}`;
  itemEl.querySelector('.aluno-status').textContent = icones[novo];

  // Atualiza contador
  const alunos = ALUNOS[turmaId] || [];
  const contadorEl = document.getElementById(`presenca-contador-${turmaId}-${data}`);
  if (contadorEl) contadorEl.textContent = contarPresenca(alunos);

  // Salva no Firebase
  const presencaAtual = extrairPresenca(ALUNOS[turmaId] || []);
  execComSync(() => salvarPresenca(turmaId, data, presencaAtual));
}

function contarPresenca(alunos) {
  let pres = 0, falt = 0, fj = 0;
  alunos.forEach(a => {
    const est = estadoPresenca[a.nome] || 'presente';
    if (est === 'presente') pres++;
    else if (est === 'falta') falt++;
    else if (est === 'fj') fj++;
  });
  return `${pres} presentes · ${falt} faltas · ${fj} FJ`;
}

function extrairPresenca(alunos) {
  const presentes = [], faltas = [], faltasJustificadas = [];
  alunos.forEach(a => {
    const est = estadoPresenca[a.nome] || 'presente';
    if (est === 'presente') presentes.push(a.nome);
    else if (est === 'falta') faltas.push(a.nome);
    else if (est === 'fj') faltasJustificadas.push(a.nome);
  });
  return { presentes, faltas, faltasJustificadas };
}

// Renderiza um mini-resumo de presença (somente leitura) dentro de um diário
function renderPresencaResumida(containerEl, dadosPresenca, totalAlunos) {
  if (!containerEl || !dadosPresenca) return;
  const p = (dadosPresenca.presentes || []).length;
  const f = (dadosPresenca.faltas || []).length;
  const fj = (dadosPresenca.faltasJustificadas || []).length;

  containerEl.innerHTML = '';

  const resumo = document.createElement('div');
  resumo.className = 'presenca-resumo';

  const chipPresenca = document.createElement('span');
  chipPresenca.className = 'chip chip-presenca';
  chipPresenca.textContent = `✓ ${p} presentes`;
  resumo.appendChild(chipPresenca);

  if (f > 0) {
    const chipFalta = document.createElement('span');
    chipFalta.className = 'chip chip-alerta';
    chipFalta.textContent = `✗ ${f} faltas`;
    resumo.appendChild(chipFalta);
  }

  if (fj > 0) {
    const chipFJ = document.createElement('span');
    chipFJ.className = 'chip';
    chipFJ.style.background = '#fef9c3';
    chipFJ.style.color = '#854d0e';
    chipFJ.textContent = `⚠ ${fj} FJ`;
    resumo.appendChild(chipFJ);
  }

  containerEl.appendChild(resumo);
}
