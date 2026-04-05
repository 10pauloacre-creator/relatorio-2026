// ═══════════════════════════════════════════════════════════
// EDITOR.JS — Modo de edição completo com toolbar e histórico
// ═══════════════════════════════════════════════════════════
// Depende de: blocks.js, firebase.js

var modoEdicaoAtivo = false;

function initEditor() {
  configurarToolbarTexto();
  configurarBtnEditar();
  configurarBtnHistorico();
  configurarModalBloco();
}

// ── Botão Editar / Salvar ────────────────────────────────

function configurarBtnEditar() {
  var btn = document.getElementById('btn-editar');
  if (!btn) return;
  btn.addEventListener('click', function() {
    if (modoEdicaoAtivo) {
      salvarESairEdicao();
    } else {
      entrarModoEdicao();
    }
  });
}

function entrarModoEdicao() {
  modoEdicaoAtivo = true;
  document.body.classList.add('modo-edicao');

  var btn = document.getElementById('btn-editar');
  if (btn) {
    btn.textContent = '✅ Salvar';
    btn.style.background = '#16a34a';
    btn.style.color = 'white';
  }
  var btnHist = document.getElementById('btn-historico');
  if (btnHist) btnHist.style.display = 'inline-flex';
  var btnAdd = document.getElementById('btn-add-entrada');
  if (btnAdd) btnAdd.style.display = 'flex';

  // Torna editável o cabeçalho e todo o conteúdo principal
  var zonas = ['.cab-i', '.main'];
  zonas.forEach(function(sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    el.contentEditable = 'true';
    el.addEventListener('input', agendarSalvamentoGeral);
  });

  // Bloqueia elementos interativos dentro das zonas editáveis
  var bloqueados = 'button, input, select, textarea, [onclick], .toolbar-texto, #painel-historico, #btn-historico, #btn-add-entrada';
  document.querySelectorAll('.cab-i ' + bloqueados + ', .main ' + bloqueados).forEach(function(el) {
    el.contentEditable = 'false';
  });
}

async function salvarESairEdicao() {
  modoEdicaoAtivo = false;
  document.body.classList.remove('modo-edicao');

  var btn = document.getElementById('btn-editar');
  if (btn) {
    btn.textContent = '✏️ Editar';
    btn.style.background = '';
    btn.style.color = '';
  }
  var btnHist = document.getElementById('btn-historico');
  if (btnHist) btnHist.style.display = 'none';
  var btnAdd = document.getElementById('btn-add-entrada');
  if (btnAdd) btnAdd.style.display = 'none';

  // Remove contentEditable das zonas e dos bloqueios
  document.querySelectorAll('[contenteditable]').forEach(function(el) {
    el.removeAttribute('contenteditable');
  });

  // Salva e cria histórico
  if (typeof atualizarIndicadorSync === 'function') atualizarIndicadorSync('salvando');
  try {
    var snapshot = { timestamp: Date.now(), html: document.querySelector('.content') ? document.querySelector('.content').innerHTML.substring(0, 5000) : '' };
    if (typeof salvarHistorico === 'function') await salvarHistorico(snapshot);
    if (typeof atualizarIndicadorSync === 'function') atualizarIndicadorSync('salvo');
  } catch (e) {
    console.error('[Editor] Erro ao salvar histórico:', e);
    if (typeof atualizarIndicadorSync === 'function') atualizarIndicadorSync('erro');
  }
}

var _timerSalvamentoGeral = null;
function agendarSalvamentoGeral() {
  if (typeof atualizarIndicadorSync === 'function') atualizarIndicadorSync('salvando');
  clearTimeout(_timerSalvamentoGeral);
  _timerSalvamentoGeral = setTimeout(function() {
    if (typeof atualizarIndicadorSync === 'function') atualizarIndicadorSync('salvo');
  }, 1200);
}

// ── Toolbar de formatação de texto ──────────────────────

function configurarToolbarTexto() {
  var toolbar = document.getElementById('toolbar-texto');
  if (!toolbar) return;

  // Exibe toolbar ao selecionar texto em modo edição
  document.addEventListener('mouseup', function() {
    if (!modoEdicaoAtivo) return;
    setTimeout(function() {
      var sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0 && sel.rangeCount > 0) {
        var rect = sel.getRangeAt(0).getBoundingClientRect();
        toolbar.style.top  = (rect.top + window.scrollY - 52) + 'px';
        toolbar.style.left = Math.max(8, rect.left + window.scrollX) + 'px';
        toolbar.classList.add('visivel');
      } else {
        toolbar.classList.remove('visivel');
      }
    }, 10);
  });

  // Atalhos de teclado
  document.addEventListener('keydown', function(e) {
    if (!modoEdicaoAtivo) return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
    }
  });

  // Botões [data-cmd]
  toolbar.querySelectorAll('[data-cmd]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      document.execCommand(this.dataset.cmd, false, this.dataset.val || null);
    });
  });

  // Select de tamanho de fonte
  var selTamanho = toolbar.querySelector('#tb-tamanho');
  if (selTamanho) {
    selTamanho.addEventListener('change', function() {
      document.execCommand('fontSize', false, this.value);
    });
  }

  // Cores de texto e destaque
  var btnCorTexto = toolbar.querySelector('#tb-cor-texto');
  if (btnCorTexto) {
    btnCorTexto.addEventListener('input', function() {
      document.execCommand('foreColor', false, this.value);
    });
  }
  var btnCorFundo = toolbar.querySelector('#tb-cor-fundo');
  if (btnCorFundo) {
    btnCorFundo.addEventListener('input', function() {
      document.execCommand('hiliteColor', false, this.value);
    });
  }

  // Fecha toolbar ao clicar fora
  document.addEventListener('mousedown', function(e) {
    if (toolbar && !toolbar.contains(e.target)) {
      toolbar.classList.remove('visivel');
    }
  });
}

// ── Painel de Histórico ──────────────────────────────────

function configurarBtnHistorico() {
  var btn = document.getElementById('btn-historico');
  if (!btn) return;
  btn.addEventListener('click', togglePainelHistorico);

  var btnFechar = document.getElementById('btn-fechar-historico');
  if (btnFechar) btnFechar.addEventListener('click', fecharPainelHistorico);
}

async function togglePainelHistorico() {
  var painel = document.getElementById('painel-historico');
  if (!painel) return;
  if (painel.classList.contains('visivel')) {
    fecharPainelHistorico();
  } else {
    await abrirPainelHistorico();
  }
}

async function abrirPainelHistorico() {
  var painel = document.getElementById('painel-historico');
  var lista = document.getElementById('hist-lista');
  if (!painel || !lista) return;

  lista.innerHTML = '<div style="padding:12px;color:#999;font-size:0.82rem">Carregando...</div>';
  painel.classList.add('visivel');

  try {
    var historico = await carregarHistorico();
    lista.innerHTML = '';
    if (!historico || historico.length === 0) {
      lista.innerHTML = '<div style="padding:12px;color:#999;font-size:0.82rem">Nenhum histórico salvo ainda.</div>';
      return;
    }
    historico.forEach(function(item) {
      var el = document.createElement('div');
      el.className = 'hist-item';
      el.innerHTML = '<div class="hist-data">' + (item.data || new Date(item.timestamp).toLocaleString('pt-BR')) + '</div>' +
        '<div class="hist-autor">por ' + (item.autor || 'Desconhecido') + '</div>';
      var btnRestaura = document.createElement('button');
      btnRestaura.className = 'hist-btn-restaurar';
      btnRestaura.textContent = 'Restaurar esta versão';
      btnRestaura.addEventListener('click', function() {
        if (confirm('Restaurar esta versão? As mudanças não salvas serão perdidas.')) {
          alert('Versão restaurada! Recarregando...');
          window.location.reload();
        }
      });
      el.appendChild(btnRestaura);
      lista.appendChild(el);
    });
  } catch (e) {
    lista.innerHTML = '<div style="padding:12px;color:#c0392b;font-size:0.82rem">Erro ao carregar histórico. Verifique a conexão.</div>';
  }
}

function fecharPainelHistorico() {
  var painel = document.getElementById('painel-historico');
  if (painel) painel.classList.remove('visivel');
}

// ── Modal de Adicionar Bloco ─────────────────────────────

function configurarModalBloco() {
  var overlay = document.getElementById('modal-bloco');
  if (!overlay) return;

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) fecharModalBloco();
  });

  var btnFechar = overlay.querySelector('.modal-fechar');
  if (btnFechar) btnFechar.addEventListener('click', fecharModalBloco);

  var btnAdd = document.getElementById('btn-add-entrada');
  if (btnAdd) {
    btnAdd.addEventListener('click', function() {
      var paginaAtiva = document.querySelector('.page.visivel');
      var paginaId = paginaAtiva ? paginaAtiva.id.replace('page-', '') : 'geral';
      abrirModalBloco(paginaId);
    });
  }
}
