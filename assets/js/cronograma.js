// ═══════════════════════════════════════════════════════════
// CRONOGRAMA.JS — Cronograma semanal de aulas
// Depende da variável global: CRONOGRAMA (definida em data.js)
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// RENDERIZAÇÃO DO CRONOGRAMA
// ─────────────────────────────────────────────────────────────

// Renderiza o grid de dias da semana com os slots de aula de cada dia
// gradeCustom: objeto opcional para sobrescrever o CRONOGRAMA global
function renderCronograma(gradeCustom) {
  const grade = gradeCustom || CRONOGRAMA;

  // Definição dos dias letivos exibidos no cronograma
  const dias = [
    { id: 'seg', nome: '☀️ Segunda-feira',  cls: 'c-seg', slots: grade.seg },
    { id: 'ter', nome: '🌤 Terça-feira',    cls: 'c-ter', slots: grade.ter },
    { id: 'qui', nome: '🎨 Quinta-feira',   cls: 'c-qui', slots: grade.qui },
    { id: 'sex', nome: '🌅 Sexta-feira',    cls: 'c-sex', slots: grade.sex }
  ];

  const grid = document.getElementById('cron-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Descobre o id do dia atual para destacar o card correto
  // getDay(): 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab
  const diaAtual = new Date().getDay();
  const mapDia = { 1: 'seg', 2: 'ter', 4: 'qui', 5: 'sex' };
  const idHoje = mapDia[diaAtual] || null;

  dias.forEach(dia => {
    // Cria o card do dia
    const card = document.createElement('div');
    card.className = 'dia-card';
    card.id = `card-${dia.id}`;

    // Exibe a tag "Hoje" apenas no dia atual
    const ehHoje = dia.id === idHoje;
    const hojeTag = ehHoje ? '<span class="hoje-tag">Hoje</span>' : '';

    // Monta o HTML de cada slot de aula do dia
    const slotsHTML = (dia.slots || []).map(slot => {
      // Classe de cor do slot conforme o tipo da disciplina
      const tipoCls = { lp: 'sl-lp', tri: 'sl-tri', art: 'sl-art' }[slot.tipo] || 'sl-lp';
      return `
        <div class="slot ${tipoCls}">
          <div class="slot-hora">${slot.hora}</div>
          <div class="slot-disc">${slot.disc}</div>
          <div class="slot-turma">${slot.turma} · ${slot.haula} h/aula</div>
        </div>`;
    }).join('');

    card.innerHTML = `
      <div class="dia-head ${dia.cls}" id="head-${dia.id}">
        ${dia.nome} ${hojeTag}
      </div>
      <div class="dia-body">${slotsHTML || '<p style="padding:12px;color:#999;font-size:0.8rem">Sem aulas</p>'}</div>`;

    grid.appendChild(card);
  });

  // Renderiza o bloco de resumo após montar o grid
  renderResumoCronograma();
}

// ─────────────────────────────────────────────────────────────
// RESUMO DO CRONOGRAMA
// ─────────────────────────────────────────────────────────────

// Renderiza o resumo de carga horária semanal por turma
function renderResumoCronograma() {
  const el = document.getElementById('resumo-cron');
  if (!el) return;
  el.innerHTML = `
    <div class="res-item ri-verde">
      <div class="res-label">1ª Série</div>
      <div class="res-val">LP: <strong>2</strong>/sem &nbsp;·&nbsp; Trilhas: <strong>2</strong>/sem</div>
    </div>
    <div class="res-item ri-azul">
      <div class="res-label">2ª Série</div>
      <div class="res-val">LP: <strong>4</strong>/sem &nbsp;·&nbsp; Trilhas: <strong>3</strong>/sem &nbsp;·&nbsp; Arte: <strong>1</strong>/sem</div>
    </div>
    <div class="res-item ri-ouro">
      <div class="res-label">3ª Série</div>
      <div class="res-val">LP: <strong>3</strong>/sem &nbsp;·&nbsp; Trilhas: <strong>2</strong>/sem &nbsp;·&nbsp; Arte: <strong>1</strong>/sem</div>
    </div>
    <div class="res-item ri-lar">
      <div class="res-label">6º Ano</div>
      <div class="res-val">Arte: <strong>1</strong>/sem</div>
    </div>`;
}
