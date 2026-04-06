// ═══════════════════════════════════════════════════════════
// ALUNOS.JS — Painel de alunos com notas automáticas
// Depende de: data.js (ALUNOS, REGISTROS, ATIVIDADES_BIMESTRE)
// ═══════════════════════════════════════════════════════════

// ── Inicialização ────────────────────────────────────────

function initAlunos() {
  // Injeta botão "👥 Alunos" no cabeçalho de cada turma
  var turmas = ['t1','t2','t3','t6'];
  turmas.forEach(function(tid) {
    var sec = document.getElementById('sec-' + tid);
    if (!sec) return;
    var th = sec.querySelector('.th');
    if (!th) return;
    var btn = document.createElement('button');
    btn.className = 'btn-alunos';
    btn.innerHTML = '👥 Alunos';
    btn.style.cssText = 'margin-left:auto;background:rgba(201,168,76,.2);color:var(--ou);border:1px solid rgba(201,168,76,.4);border-radius:6px;padding:7px 14px;font-family:\'DM Sans\',sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap';
    btn.addEventListener('click', function() { abrirModalAlunos(tid); });
    th.style.justifyContent = 'space-between';
    th.appendChild(btn);
  });

  // Cria modal do painel de alunos
  if (!document.getElementById('modal-alunos')) {
    var modal = document.createElement('div');
    modal.id = 'modal-alunos';
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9998;overflow-y:auto;padding:20px';
    modal.innerHTML = `
      <div style="max-width:860px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)">
        <div id="modal-alunos-header" style="background:linear-gradient(135deg,var(--vd),var(--vm));color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div id="modal-alunos-titulo" style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700">👥 Alunos</div>
            <div id="modal-alunos-sub" style="font-size:.76rem;opacity:.8;margin-top:2px"></div>
          </div>
          <button id="btn-fechar-modal-alunos" style="background:rgba(255,255,255,.2);border:none;color:#fff;font-size:1.3rem;width:34px;height:34px;border-radius:50%;cursor:pointer">✕</button>
        </div>
        <div id="modal-alunos-corpo" style="padding:24px"></div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('btn-fechar-modal-alunos').addEventListener('click', fecharModalAlunos);
    modal.addEventListener('click', function(e) { if (e.target === modal) fecharModalAlunos(); });
  }

  // Cria painel de detalhe individual
  if (!document.getElementById('painel-aluno')) {
    var painel = document.createElement('div');
    painel.id = 'painel-aluno';
    painel.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;overflow-y:auto;padding:20px';
    painel.innerHTML = `
      <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.4)">
        <div id="painel-aluno-header" style="background:linear-gradient(135deg,var(--vd),var(--vm));color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div id="painel-aluno-nome" style="font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:700"></div>
            <div id="painel-aluno-info" style="font-size:.76rem;opacity:.8;margin-top:2px"></div>
          </div>
          <button id="btn-fechar-painel-aluno" style="background:rgba(255,255,255,.2);border:none;color:#fff;font-size:1.3rem;width:34px;height:34px;border-radius:50%;cursor:pointer">✕</button>
        </div>
        <div id="painel-aluno-corpo" style="padding:24px"></div>
      </div>`;
    document.body.appendChild(painel);
    document.getElementById('btn-fechar-painel-aluno').addEventListener('click', fecharPainelAluno);
    painel.addEventListener('click', function(e) { if (e.target === painel) fecharPainelAluno(); });
  }
}

// ── Modal da turma ───────────────────────────────────────

function abrirModalAlunos(turmaId) {
  var alunos = (typeof ALUNOS !== 'undefined' && ALUNOS[turmaId]) || [];
  var turmas = (typeof TURMAS !== 'undefined') ? TURMAS : [];
  var turmaInfo = turmas.find(function(t) { return t.id === turmaId; }) || { nome: turmaId };
  var atividades = (typeof ATIVIDADES_BIMESTRE !== 'undefined' && ATIVIDADES_BIMESTRE[turmaId]) || [];

  document.getElementById('modal-alunos-titulo').textContent = '👥 ' + turmaInfo.nome;
  document.getElementById('modal-alunos-sub').textContent = alunos.length + ' alunos · ' + atividades.length + ' atividade(s) no bimestre';

  var corpo = document.getElementById('modal-alunos-corpo');

  if (alunos.length === 0) {
    corpo.innerHTML = '<div style="text-align:center;padding:40px;color:var(--cm)">Nenhum aluno cadastrado para esta turma.</div>';
    document.getElementById('modal-alunos').style.display = 'block';
    document.body.style.overflow = 'hidden';
    return;
  }

  // Legenda
  var html = '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px;font-size:.74rem;color:var(--cm)">'
    + '<span>🟢 Sem ocorrências</span><span>🟡 1–2 ocorrências</span><span>🔴 3+ ocorrências</span>'
    + '<span>📋 Clique no nome para detalhes</span></div>';

  // Grade de alunos
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">';

  alunos.forEach(function(aluno) {
    var reg = obterRegistro(turmaId, aluno.num);
    var nObs = reg.obs.length;
    var nFaltas = reg.faltas.length;
    var nota = calcularNotaTrabalho(turmaId, aluno.num);
    var notaStr = nota !== null ? nota.toFixed(1) : '—';
    var cor = nObs === 0 ? '#f0faf4' : (nObs <= 2 ? '#fffbeb' : '#fef2f2');
    var borda = nObs === 0 ? '#86efac' : (nObs <= 2 ? '#fcd34d' : '#fca5a5');
    var icone = nObs === 0 ? '🟢' : (nObs <= 2 ? '🟡' : '🔴');

    html += '<div onclick="abrirPainelAluno(\'' + turmaId + '\',' + aluno.num + ')" '
      + 'style="background:' + cor + ';border:1.5px solid ' + borda + ';border-radius:10px;padding:11px 14px;cursor:pointer;transition:box-shadow .15s" '
      + 'onmouseover="this.style.boxShadow=\'0 4px 16px rgba(0,0,0,.12)\'" onmouseout="this.style.boxShadow=\'\'">'
      + '<div style="display:flex;justify-content:space-between;align-items:center">'
      + '<span style="font-size:.72rem;font-weight:700;color:var(--cm)">Nº ' + aluno.num + '</span>'
      + '<span style="font-size:.8rem">' + icone + '</span>'
      + '</div>'
      + '<div style="font-weight:600;font-size:.88rem;color:var(--vd);margin:4px 0;line-height:1.3">' + aluno.nome + '</div>'
      + '<div style="display:flex;gap:8px;font-size:.72rem;color:var(--cm)">'
      + '<span>⚠️ ' + nObs + ' obs</span>'
      + '<span>❌ ' + nFaltas + ' falta(s)</span>'
      + '<span>📊 ' + notaStr + '/5</span>'
      + '</div>'
      + '</div>';
  });

  html += '</div>';
  corpo.innerHTML = html;
  document.getElementById('modal-alunos').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function fecharModalAlunos() {
  document.getElementById('modal-alunos').style.display = 'none';
  document.body.style.overflow = '';
}

// ── Painel individual do aluno ───────────────────────────

function abrirPainelAluno(turmaId, num) {
  var alunos = (typeof ALUNOS !== 'undefined' && ALUNOS[turmaId]) || [];
  var aluno = alunos.find(function(a) { return a.num === num; });
  if (!aluno) return;

  var turmas = (typeof TURMAS !== 'undefined') ? TURMAS : [];
  var turmaInfo = turmas.find(function(t) { return t.id === turmaId; }) || { nome: turmaId };
  var reg = obterRegistro(turmaId, num);
  var atividades = (typeof ATIVIDADES_BIMESTRE !== 'undefined' && ATIVIDADES_BIMESTRE[turmaId]) || [];
  var notaTrab = calcularNotaTrabalho(turmaId, num);
  var notaProva = reg.notaProva;

  document.getElementById('painel-aluno-nome').textContent = 'Nº ' + num + ' · ' + aluno.nome;
  document.getElementById('painel-aluno-info').textContent = turmaInfo.nome + ' · ' + turmaInfo.nivel;

  var html = '';

  // ── Resumo de notas
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px">';
  html += cartaoNota('📊 Trabalho (estimativa)', notaTrab, 'Calculado pelas atividades realizadas e comportamento');
  html += cartaoNotaProva(turmaId, num, notaProva);
  html += '</div>';

  // ── Faltas
  html += '<div style="margin-bottom:20px">';
  html += '<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--cm);margin-bottom:8px">❌ Faltas (' + reg.faltas.length + ')</div>';
  if (reg.faltas.length === 0) {
    html += '<div style="background:#f0faf4;border-radius:8px;padding:10px 14px;font-size:.84rem;color:#166534">Nenhuma falta registrada. ✓</div>';
  } else {
    html += '<div style="display:flex;flex-wrap:wrap;gap:7px">';
    reg.faltas.forEach(function(f) {
      html += '<span style="background:#fef2f2;border:1px solid #fca5a5;border-radius:20px;padding:3px 11px;font-size:.78rem;color:#991b1b">' + f + '</span>';
    });
    html += '</div>';
  }
  html += '</div>';

  // ── Ocorrências
  html += '<div style="margin-bottom:20px">';
  html += '<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--cm);margin-bottom:8px">⚠️ Ocorrências (' + reg.obs.length + ')</div>';
  if (reg.obs.length === 0) {
    html += '<div style="background:#f0faf4;border-radius:8px;padding:10px 14px;font-size:.84rem;color:#166534">Nenhuma ocorrência comportamental. ✓</div>';
  } else {
    reg.obs.forEach(function(o) {
      var corObs = o.desconto > 0 ? '#fef2f2' : '#fffbeb';
      var bordaObs = o.desconto > 0 ? '#fca5a5' : '#fcd34d';
      html += '<div style="background:' + corObs + ';border-left:3px solid ' + bordaObs + ';border-radius:0 8px 8px 0;padding:9px 13px;margin-bottom:7px">'
        + '<div style="font-size:.72rem;color:var(--cm);margin-bottom:2px">' + o.data + (o.desconto > 0 ? ' · <span style="color:#991b1b;font-weight:700">−' + o.desconto + ' pt</span>' : '') + '</div>'
        + '<div style="font-size:.83rem;color:var(--ce)">' + o.desc + '</div>'
        + '</div>';
    });
  }
  html += '</div>';

  // ── Atividades
  html += '<div style="margin-bottom:20px">';
  html += '<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--cm);margin-bottom:8px">📋 Atividades do bimestre (' + atividades.length + ')</div>';
  if (atividades.length === 0) {
    html += '<div style="background:#f5f3ee;border-radius:8px;padding:10px 14px;font-size:.84rem;color:var(--cm)">Nenhuma atividade lançada ainda.</div>';
  } else {
    var pontoPorAtv = atividades.length > 0 ? (5 / atividades.length) : 0;
    atividades.forEach(function(atv) {
      var status = (reg.atividades && reg.atividades[atv.id]) || 'nao_informado';
      var cfg = {
        'realizada':    { bg:'#f0faf4', borda:'#86efac', icone:'✅', label:'Realizada',      cor:'#166534' },
        'pendente':     { bg:'#fffbeb', borda:'#fcd34d', icone:'⏳', label:'Pendente',       cor:'#92400e' },
        'nao_realizada':{ bg:'#fef2f2', borda:'#fca5a5', icone:'❌', label:'Não realizada',  cor:'#991b1b' },
        'nao_informado':{ bg:'#f5f3ee', borda:'#e8e5de', icone:'—',  label:'Não informado',  cor:'var(--cm)' }
      }[status];
      html += '<div style="background:' + cfg.bg + ';border:1px solid ' + cfg.borda + ';border-radius:8px;padding:10px 14px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center">'
        + '<div>'
        + '<div style="font-size:.82rem;font-weight:600;color:var(--vd)">' + atv.desc + '</div>'
        + '<div style="font-size:.72rem;color:var(--cm);margin-top:2px">' + atv.data + ' · ' + atv.disc + ' · vale ' + pontoPorAtv.toFixed(2) + ' pt</div>'
        + '</div>'
        + '<span style="font-size:.78rem;font-weight:700;color:' + cfg.cor + ';white-space:nowrap;margin-left:10px">' + cfg.icone + ' ' + cfg.label + '</span>'
        + '</div>';
    });

    // Botões para atualizar status de atividade
    html += '<div style="background:#f5f3ee;border-radius:8px;padding:12px;margin-top:10px">';
    html += '<div style="font-size:.72rem;color:var(--cm);margin-bottom:8px;font-weight:600">Atualizar status de atividade:</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px" id="atv-btns-' + turmaId + '-' + num + '">';
    atividades.forEach(function(atv) {
      html += '<select onchange="atualizarAtividade(\'' + turmaId + '\',' + num + ',\'' + atv.id + '\',this.value)" '
        + 'style="padding:5px 8px;border:1px solid var(--cl);border-radius:6px;font-family:\'DM Sans\',sans-serif;font-size:.76rem;background:#fff">'
        + '<option value="">— ' + atv.data + ' ' + atv.disc + '</option>'
        + '<option value="realizada"' + ((reg.atividades && reg.atividades[atv.id]==='realizada') ? ' selected' : '') + '>✅ Realizada</option>'
        + '<option value="pendente"' + ((reg.atividades && reg.atividades[atv.id]==='pendente') ? ' selected' : '') + '>⏳ Pendente</option>'
        + '<option value="nao_realizada"' + ((reg.atividades && reg.atividades[atv.id]==='nao_realizada') ? ' selected' : '') + '>❌ Não realizada</option>'
        + '</select>';
    });
    html += '</div></div>';
  }
  html += '</div>';

  document.getElementById('painel-aluno-corpo').innerHTML = html;
  document.getElementById('painel-aluno').style.display = 'block';
}

function fecharPainelAluno() {
  document.getElementById('painel-aluno').style.display = 'none';
}

// ── Cartões de nota ──────────────────────────────────────

function cartaoNota(label, valor, detalhe) {
  var pct = valor !== null ? Math.round((valor / 5) * 100) : 0;
  var cor = valor === null ? '#e8e5de' : (valor >= 4 ? '#86efac' : (valor >= 2.5 ? '#fcd34d' : '#fca5a5'));
  var valorStr = valor !== null ? valor.toFixed(1) : '—';
  return '<div style="background:#f8f5ee;border-radius:10px;padding:14px">'
    + '<div style="font-size:.72rem;font-weight:700;color:var(--cm);margin-bottom:8px">' + label + '</div>'
    + '<div style="font-size:1.8rem;font-weight:700;color:var(--vd);font-family:\'DM Mono\',monospace;line-height:1">' + valorStr + '<span style="font-size:.9rem;color:var(--cm)">/5</span></div>'
    + '<div style="background:#e8e5de;border-radius:20px;height:6px;margin:8px 0">'
    + '<div style="background:' + cor + ';height:6px;border-radius:20px;width:' + pct + '%"></div>'
    + '</div>'
    + '<div style="font-size:.7rem;color:var(--cm)">' + detalhe + '</div>'
    + '</div>';
}

function cartaoNotaProva(turmaId, num, valor) {
  var valorStr = valor !== null && valor !== undefined ? Number(valor).toFixed(1) : '';
  return '<div style="background:#f8f5ee;border-radius:10px;padding:14px">'
    + '<div style="font-size:.72rem;font-weight:700;color:var(--cm);margin-bottom:8px">📝 Prova (manual)</div>'
    + '<input type="number" min="0" max="5" step="0.1" value="' + valorStr + '" placeholder="0–5" '
    + 'onchange="salvarNotaProva(\'' + turmaId + '\',' + num + ',this.value)" '
    + 'style="width:100%;padding:8px 10px;border:2px solid var(--cl);border-radius:8px;font-family:\'DM Mono\',monospace;font-size:1.4rem;font-weight:700;color:var(--vd);background:#fff;text-align:center">'
    + '<div style="font-size:.7rem;color:var(--cm);margin-top:6px">Insira a nota da prova aqui</div>'
    + '</div>';
}

// ── Cálculos ─────────────────────────────────────────────

function obterRegistro(turmaId, num) {
  var base = { faltas: [], obs: [], atividades: {}, notaProva: null };
  if (typeof REGISTROS === 'undefined' || !REGISTROS[turmaId] || !REGISTROS[turmaId][num]) return base;
  var r = REGISTROS[turmaId][num];
  return {
    faltas: r.faltas || [],
    obs: r.obs || [],
    atividades: r.atividades || {},
    notaProva: r.notaProva !== undefined ? r.notaProva : null
  };
}

function calcularNotaTrabalho(turmaId, num) {
  var atividades = (typeof ATIVIDADES_BIMESTRE !== 'undefined' && ATIVIDADES_BIMESTRE[turmaId]) || [];
  if (atividades.length === 0) return null;
  var reg = obterRegistro(turmaId, num);
  var pontoPorAtv = 5 / atividades.length;
  var pontos = 0;
  atividades.forEach(function(atv) {
    if (reg.atividades && reg.atividades[atv.id] === 'realizada') pontos += pontoPorAtv;
  });
  var descontos = reg.obs.reduce(function(s, o) { return s + (o.desconto || 0); }, 0);
  return Math.max(0, Math.min(5, pontos - descontos));
}

// ── Atualização em tempo real ─────────────────────────────

function atualizarAtividade(turmaId, num, atvId, status) {
  if (!status) return;
  if (typeof REGISTROS === 'undefined') return;
  if (!REGISTROS[turmaId]) REGISTROS[turmaId] = {};
  if (!REGISTROS[turmaId][num]) REGISTROS[turmaId][num] = { faltas:[], obs:[], atividades:{}, notaProva:null };
  REGISTROS[turmaId][num].atividades[atvId] = status;
  // Atualiza a nota exibida no painel sem fechar
  abrirPainelAluno(turmaId, num);
}

function salvarNotaProva(turmaId, num, valor) {
  if (typeof REGISTROS === 'undefined') return;
  if (!REGISTROS[turmaId]) REGISTROS[turmaId] = {};
  if (!REGISTROS[turmaId][num]) REGISTROS[turmaId][num] = { faltas:[], obs:[], atividades:{}, notaProva:null };
  REGISTROS[turmaId][num].notaProva = valor !== '' ? parseFloat(valor) : null;
}
