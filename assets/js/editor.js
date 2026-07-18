// ═══════════════════════════════════════════════════════════
// EDITOR.JS v3 — Editor Visual Completo
// Melhorias: opacidade, tab-aware, painel arrastável, undo/redo
// ═══════════════════════════════════════════════════════════

var modoEdicaoAtivo = false;
var _undoStack = [];
var _redoStack = [];
var _elSelecionado = null;
var _painel = null;
var _editorRemoteSync = null;
var _editorApplyingRemote = false;
var _editorLastAppliedSignature = '';
var _editorInitialized = false;
var _editorConfigCache = null;
var _editorRestoreBootstrapped = false;

function initEditor() {
  if (_editorInitialized) return;
  _editorInitialized = true;
  _editorRestaurarSnapshot();
  _editorBootstrapRestauracao();
  _editorIniciarSyncRemoto();
  configurarBtnEditar();
  criarPainelEditor();
  configurarToolbarTexto();
}

// ─── BOTÃO EDITAR / SAIR ────────────────────────────────

function _editorGetToggleButton() {
  return document.getElementById('btn-editar') || document.getElementById('btn-editar-rh');
}

function configurarBtnEditar() {
  var btn = _editorGetToggleButton();
  if (!btn) return;
  btn.addEventListener('click', function() {
    if (modoEdicaoAtivo) sairModoEdicao();
    else entrarModoEdicao();
  });
}

function entrarModoEdicao() {
  modoEdicaoAtivo = true;
  document.body.classList.add('modo-edicao');
  var btn = _editorGetToggleButton();
  if (btn) { btn.textContent = '✅ Salvar'; btn.style.cssText = 'background:#16a34a;color:white;border:none'; }

  var _eu = document.getElementById('ed-undo');    if (_eu) _eu.style.display = 'flex';
  var _er = document.getElementById('ed-redo');    if (_er) _er.style.display = 'flex';
  _atualizarBtnTabAtivo();

  var mainEl = document.querySelector('.main');
  if (mainEl) {
    mainEl.addEventListener('click', _editorClick, true);
    mainEl.addEventListener('mouseover', _editorHover, true);
    mainEl.addEventListener('mouseout', _editorHoverOut, true);
  }
  document.addEventListener('keydown', _editorKeydown);
  _adicionarBotoesExcluirClaude();
}

function sairModoEdicao() {
  modoEdicaoAtivo = false;
  document.body.classList.remove('modo-edicao');
  var btn = _editorGetToggleButton();
  if (btn) { btn.textContent = '✏️ Editar'; btn.style.cssText = ''; }

  var _eu2 = document.getElementById('ed-undo');    if (_eu2) _eu2.style.display = 'none';
  var _er2 = document.getElementById('ed-redo');    if (_er2) _er2.style.display = 'none';
  var _ea2 = document.getElementById('ed-add-bloco'); if (_ea2) _ea2.style.display = 'none';
  var _ec2 = document.getElementById('ed-add-card');  if (_ec2) _ec2.style.display = 'none';

  var mainEl2 = document.querySelector('.main');
  if (mainEl2) {
    mainEl2.removeEventListener('click', _editorClick, true);
    mainEl2.removeEventListener('mouseover', _editorHover, true);
    mainEl2.removeEventListener('mouseout', _editorHoverOut, true);
  }
  document.removeEventListener('keydown', _editorKeydown);

  // Remove botões de excluir claude
  document.querySelectorAll('.ed-remove-card').forEach(function(b) { b.remove(); });

  _salvarAlteracoes();
  _deselecionarElemento();
  if (_painel) _painel.style.display = 'none';
  document.querySelectorAll('[contenteditable="true"]').forEach(function(el) {
    el.removeAttribute('contenteditable');
  });
}

// ─── TAB-AWARE: botões contextuais por aba ───────────────

function _abaAtiva() {
  var sec = document.querySelector('.sec.on');
  return sec ? sec.id.replace('sec-', '') : 'all';
}

function _atualizarBtnTabAtivo() {
  if (!modoEdicaoAtivo) return;
  var aba = _abaAtiva();
  var btnAdd  = document.getElementById('ed-add-bloco');
  var btnCard = document.getElementById('ed-add-card');
  if (!btnAdd || !btnCard) return;

  if (aba === 'claude') {
    btnAdd.style.display  = 'none';
    btnCard.style.display = 'flex';
  } else {
    btnAdd.style.display  = 'flex';
    btnCard.style.display = 'none';
  }
}

// Monitora mudança de aba para atualizar botões
(function() {
  var _orig = window.aba;
  if (typeof _orig === 'function') {
    window.aba = function(id, btn) {
      _orig(id, btn);
      _atualizarBtnTabAtivo();
      if (modoEdicaoAtivo && id === 'claude') {
        setTimeout(_adicionarBotoesExcluirClaude, 200);
      }
    };
  }
})();

// ─── SELEÇÃO DE ELEMENTOS ────────────────────────────────

function _editorClick(e) {
  var alvo = e.target;
  if (alvo.closest('#painel-editor, #toolbar-texto, #ed-undo, #ed-redo, #ed-add-bloco, #ed-add-card, .ed-remove-card')) return;
  if (['INPUT','SELECT','TEXTAREA'].includes(alvo.tagName)) return;
  if (alvo.tagName === 'BUTTON' && !alvo.classList.contains('ed-remove-card')) {
    e.preventDefault(); e.stopPropagation();
  }
  if (e.detail === 2 && _isTextElement(alvo)) {
    _tornarEditavel(alvo);
    return;
  }
  var bloco = _encontrarBlocoEditavel(alvo);
  if (bloco) {
    e.stopPropagation();
    _selecionarElemento(bloco);
  }
}

function _editorHover(e) {
  if (!modoEdicaoAtivo) return;
  var alvo = e.target;
  if (alvo.closest('#painel-editor, #toolbar-texto, .ed-remove-card')) return;
  var bloco = _encontrarBlocoEditavel(alvo);
  if (bloco && bloco !== _elSelecionado) bloco.classList.add('ed-hover');
}

function _editorHoverOut(e) {
  if (!modoEdicaoAtivo) return;
  var bloco = _encontrarBlocoEditavel(e.target);
  if (bloco) bloco.classList.remove('ed-hover');
}

function _editorKeydown(e) {
  if (!modoEdicaoAtivo) return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); edUndo(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); edRedo(); }
  if (e.key === 'Escape') { _deselecionarElemento(); if (_painel) _painel.style.display = 'none'; }
}

function _encontrarBlocoEditavel(el) {
  var candidatos = ['.ea', '.cl-card', '.sc2', '.ci', '.th', '.ct', '.brow', '.ccard', '.lembrete', 'p', 'h2', 'h3', 'li', 'img'];
  for (var i = 0; i < candidatos.length; i++) {
    var ancestor = el.closest(candidatos[i]);
    if (ancestor && ancestor.closest('.main')) return ancestor;
  }
  if (el.closest('.main')) return el;
  return null;
}

function _isTextElement(el) {
  return ['P','H1','H2','H3','H4','LI','SPAN','DIV','TD','TH'].includes(el.tagName);
}

function _tornarEditavel(el) {
  _pushUndo();
  el.contentEditable = 'true';
  el.focus();
  el.addEventListener('blur', function handler() {
    el.removeEventListener('blur', handler);
    if (el.contentEditable === 'true') el.removeAttribute('contenteditable');
    _salvarAlteracoes();
  });
}

function _selecionarElemento(el) {
  _deselecionarElemento();
  _elSelecionado = el;
  el.classList.add('ed-selecionado');
  _mostrarPainel(el);
}

function _deselecionarElemento() {
  if (_elSelecionado) {
    _elSelecionado.classList.remove('ed-selecionado');
    _elSelecionado = null;
  }
}

// ─── PAINEL ARRASTÁVEL ──────────────────────────────────

function criarPainelEditor() {
  _painel = document.createElement('div');
  _painel.id = 'painel-editor';
  _painel.style.display = 'none';

  _painel.innerHTML = [
    '<div class="pe-header" id="pe-drag-handle">',
    '  <span class="pe-titulo">✏️ Propriedades</span>',
    '  <span style="font-size:.7rem;color:#999;cursor:move">⠿ arrastar</span>',
    '</div>',
    '<div class="pe-grupo">',
    '  <label>Fundo</label>',
    '  <input type="color" id="pe-bg" oninput="edAplicarProp(\'backgroundColor\',this.value)">',
    '  <button class="pe-clear" onclick="edAplicarProp(\'backgroundColor\',\'\')">✕</button>',
    '</div>',
    '<div class="pe-grupo">',
    '  <label>Texto</label>',
    '  <input type="color" id="pe-fg" oninput="edAplicarProp(\'color\',this.value)">',
    '  <button class="pe-clear" onclick="edAplicarProp(\'color\',\'\')">✕</button>',
    '</div>',
    '<div class="pe-grupo">',
    '  <label>Borda</label>',
    '  <input type="color" id="pe-bd" oninput="edAplicarBorda(this.value)">',
    '  <button class="pe-clear" onclick="edAplicarBorda(\'\')">✕</button>',
    '</div>',
    '<div class="pe-grupo" style="flex-direction:column;align-items:flex-start;gap:3px">',
    '  <label>Opacidade</label>',
    '  <div style="display:flex;align-items:center;gap:6px;width:100%">',
    '    <input type="range" id="pe-op" min="0" max="100" step="5" value="100" style="flex:1;accent-color:#2d6147" oninput="edAplicarOpacidade(this.value)">',
    '    <span id="pe-op-val" style="font-size:.72rem;min-width:32px">100%</span>',
    '  </div>',
    '</div>',
    '<div class="pe-grupo" style="flex-direction:column;align-items:flex-start;gap:3px">',
    '  <label>Tamanho fonte</label>',
    '  <div style="display:flex;align-items:center;gap:6px;width:100%">',
    '    <input type="range" id="pe-fs" min="10" max="60" step="1" style="flex:1;accent-color:#2d6147" oninput="edAplicarFonte(this.value)">',
    '    <span id="pe-fs-val" style="font-size:.72rem;min-width:32px">–</span>',
    '  </div>',
    '</div>',
    '<div class="pe-grupo">',
    '  <label>Texto</label>',
    '  <button class="pe-btn" onclick="edEditarTexto()">✏️ Editar</button>',
    '</div>',
    '<div class="pe-grupo" id="pe-grupo-img" style="display:none">',
    '  <label>Imagem</label>',
    '  <button class="pe-btn" onclick="edAlterarImagem()">🖼 URL</button>',
    '</div>',
    '<div class="pe-grupo">',
    '  <button class="pe-btn" onclick="edToggleProp(\'fontWeight\',\'bold\',\'normal\')"><strong>N</strong></button>',
    '  <button class="pe-btn" onclick="edToggleProp(\'fontStyle\',\'italic\',\'normal\')"><em>I</em></button>',
    '  <button class="pe-btn" onclick="edAdicionarTextBox()">+ Texto</button>',
    '</div>',
    '<hr style="border:none;border-top:1px solid rgba(0,0,0,.1);margin:8px 0">',
    '<button class="pe-btn pe-del" onclick="edRemoverElemento()">🗑 Excluir bloco</button>',
    '<button class="pe-btn pe-close" onclick="edFecharPainel()">✕ Fechar</button>'
  ].join('');
  document.body.appendChild(_painel);

  // Drag behavior
  _ativarDragPainel();

  // Botões flutuantes
  var undoBtn = document.createElement('button');
  undoBtn.id = 'ed-undo'; undoBtn.className = 'ed-float-btn';
  undoBtn.title = 'Desfazer (Ctrl+Z)'; undoBtn.textContent = '↩ Desfazer';
  undoBtn.style.cssText = 'display:none;bottom:70px;right:20px';
  undoBtn.addEventListener('click', edUndo);
  document.body.appendChild(undoBtn);

  var redoBtn = document.createElement('button');
  redoBtn.id = 'ed-redo'; redoBtn.className = 'ed-float-btn';
  redoBtn.title = 'Refazer (Ctrl+Y)'; redoBtn.textContent = '↪ Refazer';
  redoBtn.style.cssText = 'display:none;bottom:20px;right:20px';
  redoBtn.addEventListener('click', edRedo);
  document.body.appendChild(redoBtn);

  // Botão genérico por aba (texto/bloco)
  var addBtn = document.createElement('button');
  addBtn.id = 'ed-add-bloco'; addBtn.className = 'ed-float-btn';
  addBtn.title = 'Adicionar caixa de texto';
  addBtn.textContent = '+ Caixa de texto';
  addBtn.style.cssText = 'display:none;bottom:120px;right:20px;background:#2d6147;color:#fff';
  addBtn.addEventListener('click', edAdicionarTextBox);
  document.body.appendChild(addBtn);

  // Botão específico da aba Claude
  var cardBtn = document.createElement('button');
  cardBtn.id = 'ed-add-card'; cardBtn.className = 'ed-float-btn';
  cardBtn.title = 'Adicionar conta Claude';
  cardBtn.textContent = '+ Conta Claude';
  cardBtn.style.cssText = 'display:none;bottom:120px;right:20px;background:#c9a84c;color:#1a3a2a';
  cardBtn.addEventListener('click', edAdicionarCartaClaude);
  document.body.appendChild(cardBtn);
}

function edFecharPainel() {
  if (_painel) _painel.style.display = 'none';
  _deselecionarElemento();
}

// ─── DRAG DO PAINEL ──────────────────────────────────────

function _ativarDragPainel() {
  var handle = document.getElementById('pe-drag-handle');
  if (!handle || !_painel) return;
  var drag = { active: false, sx: 0, sy: 0, ox: 0, oy: 0 };

  handle.style.cursor = 'move';
  handle.addEventListener('mousedown', function(e) {
    drag.active = true;
    drag.sx = e.clientX; drag.sy = e.clientY;
    var rect = _painel.getBoundingClientRect();
    drag.ox = rect.left; drag.oy = rect.top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!drag.active) return;
    var nx = drag.ox + (e.clientX - drag.sx);
    var ny = drag.oy + (e.clientY - drag.sy);
    nx = Math.max(0, Math.min(nx, window.innerWidth - _painel.offsetWidth));
    ny = Math.max(0, Math.min(ny, window.innerHeight - _painel.offsetHeight));
    _painel.style.left = nx + 'px';
    _painel.style.top  = ny + 'px';
    _painel.style.right = 'auto';
  });
  document.addEventListener('mouseup', function() { drag.active = false; });

  // Touch support (mobile)
  handle.addEventListener('touchstart', function(e) {
    var t = e.touches[0];
    drag.active = true;
    drag.sx = t.clientX; drag.sy = t.clientY;
    var rect = _painel.getBoundingClientRect();
    drag.ox = rect.left; drag.oy = rect.top;
  }, { passive: true });
  document.addEventListener('touchmove', function(e) {
    if (!drag.active) return;
    var t = e.touches[0];
    var nx = drag.ox + (t.clientX - drag.sx);
    var ny = drag.oy + (t.clientY - drag.sy);
    nx = Math.max(0, Math.min(nx, window.innerWidth - _painel.offsetWidth));
    ny = Math.max(0, Math.min(ny, window.innerHeight - _painel.offsetHeight));
    _painel.style.left = nx + 'px';
    _painel.style.top  = ny + 'px';
    _painel.style.right = 'auto';
  }, { passive: true });
  document.addEventListener('touchend', function() { drag.active = false; });
}

// ─── MOSTRAR PAINEL ──────────────────────────────────────

function _mostrarPainel(el) {
  if (!_painel) return;
  // Só posiciona se ainda não foi arrastado (usa posição padrão lateral)
  if (!_painel._arrastado) {
    var rect = el.getBoundingClientRect();
    var top = Math.min(Math.max(rect.top + window.scrollY, window.scrollY + 8), window.scrollY + window.innerHeight - 420);
    var left = Math.min(rect.right + 12, window.innerWidth - 230);
    if (left < 4) left = 4;
    _painel.style.top  = top + 'px';
    _painel.style.left = left + 'px';
    _painel.style.right = 'auto';
  }
  _painel.style.display = 'block';

  // Preenche valores
  var style = window.getComputedStyle(el);
  var bgInput = document.getElementById('pe-bg');
  if (bgInput) { var bg = _rgbToHex(style.backgroundColor); bgInput.value = bg || '#ffffff'; }
  var fgInput = document.getElementById('pe-fg');
  if (fgInput) { var fg = _rgbToHex(style.color); fgInput.value = fg || '#000000'; }
  var fsSlider = document.getElementById('pe-fs');
  var fsVal    = document.getElementById('pe-fs-val');
  var fs = parseInt(style.fontSize) || 16;
  if (fsSlider) fsSlider.value = fs;
  if (fsVal)    fsVal.textContent = fs + 'px';

  // Opacidade
  var opSlider = document.getElementById('pe-op');
  var opVal    = document.getElementById('pe-op-val');
  var op = el.style.opacity !== '' ? Math.round(parseFloat(el.style.opacity) * 100) : 100;
  if (opSlider) opSlider.value = op;
  if (opVal)    opVal.textContent = op + '%';

  // Campo de imagem
  var grupoImg = document.getElementById('pe-grupo-img');
  if (grupoImg) grupoImg.style.display = (el.tagName === 'IMG' || el.querySelector('img')) ? 'flex' : 'none';
}

// Marca que o painel foi arrastado
document.addEventListener('mouseup', function() {
  if (_painel && _painel._dragAtivo) _painel._arrastado = true;
});

// ─── APLICAR PROPRIEDADES ────────────────────────────────

function edAplicarProp(prop, valor) {
  if (!_elSelecionado) return;
  _pushUndo();
  _elSelecionado.style[prop] = valor;
  _salvarAlteracoes();
}

function edAplicarBorda(cor) {
  if (!_elSelecionado) return;
  _pushUndo();
  _elSelecionado.style.borderColor = cor;
  if (cor) _elSelecionado.style.borderStyle = 'solid';
  _salvarAlteracoes();
}

function edAplicarFonte(px) {
  if (!_elSelecionado) return;
  _pushUndo();
  _elSelecionado.style.fontSize = px + 'px';
  var fsVal = document.getElementById('pe-fs-val');
  if (fsVal) fsVal.textContent = px + 'px';
  _salvarAlteracoes();
}

function edAplicarOpacidade(val) {
  if (!_elSelecionado) return;
  _pushUndo();
  _elSelecionado.style.opacity = (val / 100).toFixed(2);
  var opVal = document.getElementById('pe-op-val');
  if (opVal) opVal.textContent = val + '%';
  _salvarAlteracoes();
}

function edToggleProp(prop, valA, valB) {
  if (!_elSelecionado) return;
  _pushUndo();
  var atual = _elSelecionado.style[prop];
  _elSelecionado.style[prop] = (atual === valA) ? valB : valA;
  _salvarAlteracoes();
}

function edEditarTexto() {
  if (!_elSelecionado) return;
  _tornarEditavel(_elSelecionado);
}

function edAlterarImagem() {
  if (!_elSelecionado) return;
  var img = _elSelecionado.tagName === 'IMG' ? _elSelecionado : _elSelecionado.querySelector('img');
  if (!img) return;
  var novaUrl = prompt('URL da nova imagem:', img.src);
  if (novaUrl !== null && novaUrl.trim()) {
    _pushUndo();
    img.src = novaUrl.trim();
    _salvarAlteracoes();
  }
}

function edRemoverElemento() {
  if (!_elSelecionado) return;
  if (!confirm('Excluir este bloco?')) return;
  _pushUndo();
  _elSelecionado.remove();
  if (_painel) _painel.style.display = 'none';
  _elSelecionado = null;
  _salvarAlteracoes();
}

function edAdicionarTextBox() {
  var sec = document.querySelector('.sec.on');
  if (!sec) return;
  _pushUndo();
  var div = document.createElement('div');
  div.className = 'ct';
  div.style.cssText = 'margin:12px 0;min-height:40px';
  div.contentEditable = 'true';
  div.textContent = 'Clique aqui para editar o texto...';
  sec.querySelector('.main') ? sec.querySelector('.main').appendChild(div) : sec.appendChild(div);
  _salvarAlteracoes();
  _selecionarElemento(div);
}

// ─── CARDS CLAUDE ────────────────────────────────────────

function edAdicionarCartaClaude() {
  var grid = document.getElementById('claude-cards');
  if (!grid) { alert('Abra a aba ⏱ Claude primeiro.'); return; }
  var nome = prompt('Nome/e-mail da nova conta:');
  if (!nome || !nome.trim()) return;
  var tipo = prompt('Tipo (PRO ou Free):', 'Free') || 'Free';
  var id = 'c' + Date.now();
  if (typeof CLAUDE_CONTAS !== 'undefined') {
    CLAUDE_CONTAS.push({ id: id, nome: nome.trim(), tipo: tipo.trim() });
  }
  _salvarContasClaude();
  if (typeof claudeRenderizar === 'function') claudeRenderizar();
  setTimeout(_adicionarBotoesExcluirClaude, 150);
}

function _adicionarBotoesExcluirClaude() {
  if (!modoEdicaoAtivo) return;
  document.querySelectorAll('.cl-card').forEach(function(card) {
    if (card.querySelector('.ed-remove-card')) return;
    var btn = document.createElement('button');
    btn.className = 'ed-remove-card';
    btn.textContent = '🗑';
    btn.title = 'Excluir esta conta';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var cardId = card.id.replace('card-', '');
      if (!confirm('Excluir conta "' + cardId + '"?')) return;
      if (typeof CLAUDE_CONTAS !== 'undefined') {
        for (var i = 0; i < CLAUDE_CONTAS.length; i++) {
          if (CLAUDE_CONTAS[i].id === cardId) { CLAUDE_CONTAS.splice(i, 1); break; }
        }
      }
      localStorage.removeItem('cl_fim_' + cardId);
      localStorage.removeItem('cl_notif_' + cardId);
      _salvarContasClaude();
      if (typeof claudeRenderizar === 'function') claudeRenderizar();
      setTimeout(_adicionarBotoesExcluirClaude, 150);
    });
    card.appendChild(btn);
  });
}

function _salvarContasClaude() {
  if (typeof CLAUDE_CONTAS !== 'undefined') {
    localStorage.setItem('cl_contas', JSON.stringify(CLAUDE_CONTAS));
  }
}

// ─── UNDO / REDO (baseado em snapshots do .main) ─────────
// Usa innerHTML completo do .main — simples e confiável

function _pushUndo() {
  var main = document.querySelector('.main');
  if (!main) return;
  _undoStack.push(main.innerHTML);
  _redoStack = [];
  if (_undoStack.length > 20) _undoStack.shift();
  // Atualiza indicador visual
  var undoBtn = document.getElementById('ed-undo');
  var redoBtn = document.getElementById('ed-redo');
  if (undoBtn) undoBtn.style.opacity = '1';
  if (redoBtn) redoBtn.style.opacity = '0.4';
}

function edUndo() {
  if (!_undoStack.length) return;
  var main = document.querySelector('.main');
  if (!main) return;
  _redoStack.push(main.innerHTML);
  main.innerHTML = _undoStack.pop();
  _salvarAlteracoes();
  _deselecionarElemento();
  if (_painel) _painel.style.display = 'none';
  var undoBtn = document.getElementById('ed-undo');
  var redoBtn = document.getElementById('ed-redo');
  if (undoBtn) undoBtn.style.opacity = _undoStack.length ? '1' : '0.4';
  if (redoBtn) redoBtn.style.opacity = _redoStack.length ? '1' : '0.4';
}

function edRedo() {
  if (!_redoStack.length) return;
  var main = document.querySelector('.main');
  if (!main) return;
  _undoStack.push(main.innerHTML);
  main.innerHTML = _redoStack.pop();
  _salvarAlteracoes();
  _deselecionarElemento();
  if (_painel) _painel.style.display = 'none';
  var undoBtn = document.getElementById('ed-undo');
  var redoBtn = document.getElementById('ed-redo');
  if (undoBtn) undoBtn.style.opacity = _undoStack.length ? '1' : '0.4';
  if (redoBtn) redoBtn.style.opacity = _redoStack.length ? '1' : '0.4';
}

// ─── PERSISTÊNCIA ────────────────────────────────────────
// ⚠️ ATENÇÃO: salvar/restaurar o HTML inteiro (.main.innerHTML) foi REMOVIDO.
// Esse comportamento causava os relatos novos desaparecerem após reload
// (o localStorage sobrescrevia o HTML novo do servidor com uma versão antiga).
// O HTML canônico vive SEMPRE no index.html no servidor (GitHub Pages).
// Edições visuais feitas no editor não persistem entre sessões — use git push.

function _salvarAlteracoes() {
  // Intencionalmente vazia — não salva mais o HTML no localStorage.
}

function limparAlteracoes() {
  ['ed_main_html','ed_main_html_v2','ed_main_html_v3'].forEach(function(k){ localStorage.removeItem(k); });
  window.location.reload();
}

// ─── TOOLBAR TEXTO ───────────────────────────────────────

function _editorBuildAtual() {
  var main = document.querySelector('.main');
  return main && main.dataset ? (main.dataset.build || '') : '';
}

function _editorResolveConfig() {
  if (_editorConfigCache) return _editorConfigCache;

  var pagePath = (window.location.pathname || '').split('/').pop() || 'index.html';
  var normalizedPage = pagePath.toLowerCase();
  var schoolSlug = 'padre-carlos-casavequia';

  if (window.__RELATORIOS_EDITOR_CONFIG__ && typeof window.__RELATORIOS_EDITOR_CONFIG__ === 'object') {
    _editorConfigCache = window.__RELATORIOS_EDITOR_CONFIG__;
    return _editorConfigCache;
  }

  if (normalizedPage.indexOf('herminio') !== -1) {
    schoolSlug = 'raimundo-herminio-de-melo';
  }

  var scopeSlug = normalizedPage.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'index-html';
  _editorConfigCache = {
    pagePath: pagePath,
    schoolSlug: schoolSlug,
    classSlug: 'layout-' + scopeSlug,
    scope: 'report-layout:' + scopeSlug,
    storageKey: 'ed_layout_snapshot_v5:' + scopeSlug
  };
  return _editorConfigCache;
}

function _editorSnapshotSignature(payload) {
  try { return JSON.stringify(payload || null); } catch (e) { return ''; }
}

function _editorLerSnapshot() {
  try {
    var raw = localStorage.getItem(_editorResolveConfig().storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function _editorPersistirSnapshot(payload) {
  if (!payload) return;
  try {
    localStorage.setItem(_editorResolveConfig().storageKey, JSON.stringify(payload));
  } catch (e) {}
}

function _editorCriarPayload() {
  var main = document.querySelector('.main');
  var config = _editorResolveConfig();
  if (!main) return null;
  return {
    pagePath: config.pagePath,
    build: _editorBuildAtual(),
    updatedAt: new Date().toISOString(),
    html: main.innerHTML
  };
}

function _editorReidratarDepoisDoRestore() {
  try { if (typeof initAlunos === 'function') initAlunos(); } catch (e) {}
  try { if (typeof renderCasavequiaCalendar === 'function') renderCasavequiaCalendar(); } catch (e) {}
  try { if (typeof pcInitSectionHeroes === 'function') pcInitSectionHeroes(); } catch (e) {}
  try { if (typeof pcRefreshHeroStats === 'function') pcRefreshHeroStats(); } catch (e) {}
  try { if (typeof pcRefreshCounterHero === 'function') pcRefreshCounterHero(); } catch (e) {}
  try { if (typeof verificarAbasRelatos === 'function') verificarAbasRelatos(); } catch (e) {}
  try { if (typeof rhRenderPresencaInterativa === 'function') rhRenderPresencaInterativa(); } catch (e) {}
  try { if (typeof rhRenderAtividadeInterativa === 'function') rhRenderAtividadeInterativa(); } catch (e) {}
  try { if (typeof rhSincronizarResumoAlunos === 'function') rhSincronizarResumoAlunos(); } catch (e) {}
  try { if (typeof rhRefreshHeroStats === 'function') rhRefreshHeroStats(); } catch (e) {}
  try { if (typeof rhLivRender === 'function') rhLivRender(); } catch (e) {}
  try { if (typeof rhSeqRender === 'function') rhSeqRender(); } catch (e) {}
  try { if (typeof rhClaudeRender === 'function') rhClaudeRender(); } catch (e) {}
  try {
    document.dispatchEvent(new CustomEvent('relatorios:editor-layout-restored', {
      detail: _editorResolveConfig()
    }));
  } catch (e) {}
}

function _editorAplicarSnapshot(payload) {
  var main = document.querySelector('.main');
  var currentBuild = _editorBuildAtual();
  if (!main || !payload || !payload.html) return false;
  if (payload.build && currentBuild && payload.build !== currentBuild) return false;
  if (payload.pagePath && payload.pagePath !== _editorResolveConfig().pagePath) return false;
  var signature = _editorSnapshotSignature(payload);
  if (signature && signature === _editorLastAppliedSignature) return true;
  _editorApplyingRemote = true;
  main.innerHTML = payload.html;
  _editorPersistirSnapshot(payload);
  _editorLastAppliedSignature = signature;
  _editorApplyingRemote = false;
  _editorReidratarDepoisDoRestore();
  return true;
}

function _editorRestaurarSnapshot() {
  var payload = _editorLerSnapshot();
  if (!payload) return;
  if (!_editorAplicarSnapshot(payload)) {
    try { localStorage.removeItem(_editorResolveConfig().storageKey); } catch (e) {}
  }
}

function _editorRestaurarSnapshotAtrasado() {
  if (modoEdicaoAtivo) return;
  _editorRestaurarSnapshot();
}

function _editorBootstrapRestauracao() {
  if (_editorRestoreBootstrapped) return;
  _editorRestoreBootstrapped = true;

  window.addEventListener('load', function() {
    _editorRestaurarSnapshotAtrasado();
    window.setTimeout(_editorRestaurarSnapshotAtrasado, 180);
    window.setTimeout(_editorRestaurarSnapshotAtrasado, 900);
  }, { once: true });

  window.setTimeout(_editorRestaurarSnapshotAtrasado, 60);
  window.setTimeout(_editorRestaurarSnapshotAtrasado, 420);
  window.setTimeout(_editorRestaurarSnapshotAtrasado, 1400);
}

function _editorIniciarSyncRemoto() {
  if (!window.RelatorioSupabaseSync || !window.RelatorioSupabaseSync.isAvailable()) return;
  if (_editorRemoteSync) return;
  var config = _editorResolveConfig();
  _editorRemoteSync = window.RelatorioSupabaseSync.createScopeSync({
    scope: config.scope,
    schoolSlug: config.schoolSlug,
    classSlug: config.classSlug,
    source: 'editor-js',
    debounceMs: 550,
    getLocalPayload: function() {
      return _editorCriarPayload();
    },
    onRemotePayload: function(payload, meta) {
      if (!payload) return;
      var local = _editorLerSnapshot();
      var localStamp = Date.parse((local && local.updatedAt) || '') || 0;
      var remoteStamp = Date.parse((payload && payload.updatedAt) || (meta && meta.updatedAt) || '') || 0;
      if (localStamp && remoteStamp && localStamp > remoteStamp) {
        if (_editorRemoteSync) _editorRemoteSync.schedulePush('keep-local-layout');
        return;
      }
      if (modoEdicaoAtivo) {
        _editorPersistirSnapshot(payload);
        return;
      }
      if (!_editorAplicarSnapshot(payload)) {
        _editorPersistirSnapshot(payload);
      }
    },
    onStatus: function(status) {
      if (status === 'erro') {
        console.warn('[SupabaseSync] Layout visual permaneceu em modo local.');
      }
    }
  });
  _editorRemoteSync.start().then(function(ready) {
    if (!ready) return;
    window.setTimeout(function() {
      if (_editorRemoteSync) _editorRemoteSync.schedulePush('layout-bootstrap');
    }, 900);
  });
}

function _salvarAlteracoes() {
  var payload = _editorCriarPayload();
  if (!payload) return;
  _editorPersistirSnapshot(payload);
  _editorLastAppliedSignature = _editorSnapshotSignature(payload);
  if (!_editorApplyingRemote && _editorRemoteSync) {
    try {
      var maybePromise = _editorRemoteSync.pushNow('layout-change');
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(function() {
          _editorRemoteSync.schedulePush('layout-change');
        });
      }
    } catch (e) {
      _editorRemoteSync.schedulePush('layout-change');
    }
  }
}

function limparAlteracoes() {
  ['ed_main_html', 'ed_main_html_v2', 'ed_main_html_v3', 'ed_layout_snapshot_v4', _editorResolveConfig().storageKey]
    .forEach(function(k){ localStorage.removeItem(k); });
  window.location.reload();
}

function configurarToolbarTexto() {
  var toolbar = document.getElementById('toolbar-texto');
  if (!toolbar) return;
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
  document.addEventListener('keydown', function(e) {
    if (!modoEdicaoAtivo) return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
    }
  });
  toolbar.querySelectorAll('[data-cmd]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      document.execCommand(this.dataset.cmd, false, this.dataset.val || null);
    });
  });
  var selTamanho = toolbar.querySelector('#tb-tamanho');
  if (selTamanho) selTamanho.addEventListener('change', function() {
    document.execCommand('fontSize', false, this.value);
  });
  var btnCorTexto = toolbar.querySelector('#tb-cor-texto');
  if (btnCorTexto) btnCorTexto.addEventListener('input', function() {
    document.execCommand('foreColor', false, this.value);
  });
  var btnCorFundo = toolbar.querySelector('#tb-cor-fundo');
  if (btnCorFundo) btnCorFundo.addEventListener('input', function() {
    document.execCommand('hiliteColor', false, this.value);
  });
  document.addEventListener('mousedown', function(e) {
    if (toolbar && !toolbar.contains(e.target)) toolbar.classList.remove('visivel');
  });
}

// ─── HELPERS ────────────────────────────────────────────

function _rgbToHex(rgb) {
  if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return null;
  var m = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return '#' + [m[1],m[2],m[3]].map(function(n) { return ('0'+parseInt(n).toString(16)).slice(-2); }).join('');
}

// ─── INICIALIZAÇÃO ────────────────────────────────────────
// Limpa IMEDIATAMENTE (síncrono, antes do DOMContentLoaded) qualquer HTML
// salvo anteriormente pelo editor — impede sobrescrita do HTML do servidor.
(function() {
  try {
    ['ed_main_html', 'ed_main_html_v2', 'ed_main_html_v3', 'ed_layout_snapshot_v4'].forEach(function(k) {
      localStorage.removeItem(k);
    });
  } catch(e) {}
})();

document.addEventListener('DOMContentLoaded', function() {
  if (_editorGetToggleButton()) {
    initEditor();
  }
  // Carrega contas Claude salvas (única coisa que persiste entre sessões)
  try {
    var contasSalvas = localStorage.getItem('cl_contas');
    if (contasSalvas && typeof CLAUDE_CONTAS !== 'undefined') {
      var parsed = JSON.parse(contasSalvas);
      if (Array.isArray(parsed) && parsed.length) {
        CLAUDE_CONTAS.length = 0;
        parsed.forEach(function(c) { CLAUDE_CONTAS.push(c); });
        if (typeof claudeRenderizar === 'function') claudeRenderizar();
      }
    }
  } catch(e) {}
});
