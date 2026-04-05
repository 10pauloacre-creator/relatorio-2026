// ═══════════════════════════════════════════════════════════
// CONTADOR.JS — Contador de aulas por disciplina e turma
// Depende das variáveis globais: DISCIPLINAS_CONTADOR, DATA_BASE_LETIVO
// definidas em data.js
// ═══════════════════════════════════════════════════════════

// Objeto que guarda as aulas feitas por turma+disciplina
// Chave: "${turmaId}_${disciplina}", Valor: número inteiro
const aulasFeitas = {};

// ─────────────────────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────────────────────

// Inicializa o contador com dados do Firebase (ou padrões do data.js)
function initContador(dadosFirebase) {
  // Se dadosFirebase for fornecido, usa eles. Senão usa os valores padrão.
  DISCIPLINAS_CONTADOR.forEach(disc => {
    const chave = `${disc.turmaId}_${disc.disc}`;
    if (dadosFirebase && dadosFirebase[chave] !== undefined) {
      aulasFeitas[chave] = dadosFirebase[chave];
    } else {
      // Calcula feitas a partir dos diários iniciais
      aulasFeitas[chave] = calcularAulasFeitas(disc);
    }
  });
  renderContador();
}

// ─────────────────────────────────────────────────────────────
// CÁLCULO DE AULAS INICIAIS
// ─────────────────────────────────────────────────────────────

// Calcula quantas aulas foram feitas com base nos diários iniciais
function calcularAulasFeitas(disc) {
  // Valores iniciais conforme HTML original
  const inicial = {
    't1_Língua Portuguesa': 2,
    't2_Língua Portuguesa': 2,
    't3_Língua Portuguesa': 2,
  };
  return inicial[`${disc.turmaId}_${disc.disc}`] || 0;
}

// ─────────────────────────────────────────────────────────────
// INCREMENTO E DECREMENTO
// ─────────────────────────────────────────────────────────────

// Incrementa o contador quando uma aula é marcada como "Aplicada" no Plano
function incrementarAula(turmaId, disciplina) {
  const chave = `${turmaId}_${disciplina}`;
  aulasFeitas[chave] = (aulasFeitas[chave] || 0) + 1;
  renderContador();
}

// Decrementa o contador quando uma aula é desmarcada
function decrementarAula(turmaId, disciplina) {
  const chave = `${turmaId}_${disciplina}`;
  aulasFeitas[chave] = Math.max(0, (aulasFeitas[chave] || 0) - 1);
  renderContador();
}

// ─────────────────────────────────────────────────────────────
// HELPERS DE DATA E CÁLCULO
// ─────────────────────────────────────────────────────────────

// Adiciona n dias a uma data e retorna o novo objeto Date
function addDias(dt, n) {
  const d = new Date(dt);
  d.setDate(d.getDate() + n);
  return d;
}

// Formata um objeto Date no padrão dd/mm/aaaa (pt-BR)
function fmtData(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Retorna o número do bimestre atual com base nas aulas feitas e na meta por bimestre
function getBimAtual(feitas, bimestre) {
  for (let b = 1; b <= 4; b++) {
    if (feitas < b * bimestre) return b;
  }
  return 4;
}

// Calcula a previsão de conclusão de cada bimestre
// Retorna um array com { b, ok, data? } para cada um dos 4 bimestres
function calcBimestres(disc, feitas) {
  let acum = feitas;
  let ref = new Date(DATA_BASE_LETIVO);
  const res = [];
  for (let b = 1; b <= 4; b++) {
    const meta = b * disc.bimestre;
    const faltam = meta - acum;
    if (faltam <= 0) {
      // Bimestre já concluído
      res.push({ b, ok: true });
    } else {
      // Calcula quantas semanas faltam e projeta a data de término
      const sem = Math.ceil(faltam / disc.semanais);
      const fim = addDias(ref, sem * 7);
      res.push({ b, ok: false, data: fim });
      acum = meta;
      ref = fim;
    }
  }
  return res;
}

// ─────────────────────────────────────────────────────────────
// HELPERS DE CLASSES CSS
// ─────────────────────────────────────────────────────────────

// Retorna a classe CSS da barra de progresso conforme o grupo da disciplina
function getCorClasse(grupo) {
  return { lp: 'f-lp', tri: 'f-tri', art: 'f-art' }[grupo] || 'f-lp';
}

// Retorna a classe CSS do badge de bimestre conforme o grupo da disciplina
function getBadgeClasse(grupo) {
  return { lp: 'bdg-lp', tri: 'bdg-tri', art: 'bdg-art' }[grupo] || 'bdg-lp';
}

// ─────────────────────────────────────────────────────────────
// RENDERIZAÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

// Renderiza todos os cards do contador nos três contêineres de grupo
function renderContador() {
  // Mapeamento de grupo para id do elemento contêiner no HTML
  const grupos = { lp: 'cont-lp', tri: 'cont-tri', art: 'cont-art' };

  // Limpa os contêineres antes de re-renderizar
  Object.values(grupos).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });

  DISCIPLINAS_CONTADOR.forEach(disc => {
    const containerId = grupos[disc.grupo];
    const container = document.getElementById(containerId);
    if (!container) return;

    const chave = `${disc.turmaId}_${disc.disc}`;
    const feitas = aulasFeitas[chave] || 0;

    // Dados do bimestre atual
    const bimAtual = getBimAtual(feitas, disc.bimestre);
    const iniBim = (bimAtual - 1) * disc.bimestre;
    const feitasBim = feitas - iniBim;

    // Percentuais para as barras de progresso (máx 100%)
    const pBim = Math.min((feitasBim / disc.bimestre) * 100, 100);
    const pTot = Math.min((feitas / disc.total) * 100, 100);

    // Previsões de conclusão por bimestre
    const bimestres = calcBimestres(disc, feitas);

    // Classes CSS de cor baseadas no grupo
    const fc = getCorClasse(disc.grupo);
    const bc = getBadgeClasse(disc.grupo);

    // Monta o HTML dos itens de previsão por bimestre
    const bimHTML = bimestres.map(x => {
      let cls = '';
      if (x.ok) cls = 'conc';
      else if (x.b === bimAtual) cls = 'atual';
      return `
        <div class="bim-item ${cls}">
          <div class="bim-n">${x.b}º Bim</div>
          <div class="bim-d">${x.ok ? '✔ Concluído' : fmtData(x.data)}</div>
        </div>`;
    }).join('');

    // Cria o card e insere o HTML
    const card = document.createElement('div');
    card.className = 'cont-card';
    card.innerHTML = `
      <div class="cont-card-head">
        <div>
          <div class="cont-card-turma">${disc.turma}</div>
          <div class="cont-card-meta">${disc.disc} &nbsp;·&nbsp; ${disc.semanais} h/aula por semana</div>
        </div>
        <div class="cont-card-bim ${bc}">${bimAtual}º Bimestre</div>
      </div>
      <div class="cont-body">
        <div class="prog-grp">
          <div class="prog-lbl">
            <span class="prog-lbl-txt">${bimAtual}º Bimestre</span>
            <span class="prog-lbl-num">${feitasBim} / ${disc.bimestre} &nbsp;·&nbsp; faltam ${disc.bimestre - feitasBim}</span>
          </div>
          <div class="prog-bg"><div class="prog-fill ${fc}" style="width:${pBim}%"></div></div>
        </div>
        <div class="prog-grp">
          <div class="prog-lbl">
            <span class="prog-lbl-txt">Total do Ano</span>
            <span class="prog-lbl-num">${feitas} / ${disc.total} &nbsp;·&nbsp; faltam ${disc.total - feitas}</span>
          </div>
          <div class="prog-bg"><div class="prog-fill ${fc} dim" style="width:${pTot}%"></div></div>
        </div>
        <div class="bim-titulo-row">Previsão de conclusão por bimestre</div>
        <div class="bim-row">${bimHTML}</div>
        <div class="aviso-est">* Estimativa sem feriados e recessos. Calculado com base nos relatos diários.</div>
      </div>`;

    container.appendChild(card);
  });
}
