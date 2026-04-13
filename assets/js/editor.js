// ═══════════════════════════════════════════════════════════
// EDITOR.JS v2 — Editor Visual Completo
// Funcionalidades: seleção de elementos, cores, texto,
//   tamanhos, adicionar/remover blocos, undo/redo
// ═══════════════════════════════════════════════════════════

var modoEdicaoAtivo = false;
var _undoStack = [];
var _redoStack = [];
var _elSelecionado = null;
var _painel = null;

function initEditor() {
  configurarBtnEditar();
  criarPainelEditor();
  configurarToolbarTexto();
}

// ─── BOTÃO EDITAR / SAIR ────────────────────────────────

function configurarBtnEditar() {
  var btn = document.getElementById('btn-editar');
  if (!btn) return;
  btn.addEventListener('click', function() {
    if (modoEdicaoAtivo) sairModoEdicao();
    else entrarModoEdicao();
  });
}

function entrarModoEdicao() {
  modoEdicaoAtivo = true;
  document.body.classList.add('modo-edicao');
  var btn = document.getElementById('btn-editar');
  if (btn) { btn.textContent = '✅ Salvar'; btn.style.cssText = 'background:#16a34a;color:white;border:none'; }

  // Mostra botões de undo/redo e adicionar
  document.getElementById('ed-undo').style.display = 'flex';
  document.getElementById('ed-redo').style.display = 'flex';
  document.getElementById('ed-add-card').style.display = 'flex';

  // Adiciona listeners de seleção em todos os elementos editáveis
  document.querySelector('.main').addEventListener('click', _editorClick, true);
  document.querySelector('.main').addEventListener('mouseover', _editorHover, true);
  document.querySelector('.main').addEventListener('mouseout', _editorHoverOut, true);
  document.addEventListener('keydown', _editorKeydown);
}

function sairModoEdicao() {
  modoEdicaoAtivo = false;
  document.body.classList.remove('modo-edicao');
  var btn = document.getElementById('btn-editar');
  if (btn) { btn.textContent = '✏️ Editar'; btn.style.cssText = ''; }

  // Esconde botões
  document.getElementById('ed-undo').style.display = 'none';
  document.getElementById('ed-redo').style.display = 'none';
  document.getElementById('ed-add-card').style.display = 'none';

  // Remove listeners
  document.querySelector('.main').removeEventListener('click', _editorClick, true);
  document.querySelector('.main').removeEventListener('mouseover', _editorHover, true);
  document.querySelector('.main').removeEventListener('mouseout', _editorHoverOut, true);
  document.removeEventListener('keydown', _editorKeydown);

  // Salva para localStorage
  _salvarAlteracoes();
  _deselecionarElemento();
  _painel.style.display = 'none';
  document.querySelectorAll('[contenteditable="true"]').forEach(function(el) {
    el.removeAttribute('contenteditable');
  });
}

// ─── SELEÇÃO DE ELEMENTOS ────────────────────────────────

function _editorClick(e) {
  var alvo = e.target;

  // Ignora cliques nos painéis do editor, toolbars e botões do editor
  if (alvo.closest('#painel-editor, #toolbar-texto, #ed-undo, #ed-redo, #ed-add-card, .ed-remove-card')) return;

  // Ignora elementos interativos nativos (mas não links para edição)
  if (['INPUT','SELECT','TEXTAREA'].includes(alvo.tagName)) return;

  // Clique em botão existente — bloquear ação original em modo edição
  if (alvo.tagName === 'BUTTON' && !alvo.classList.contains('ed-remove-card')) {
    e.preventDefault(); e.stopPropagation();
  }

  // Duplo clique em texto → contenteditable
  if (e.detail === 2 && _isTextElement(alvo)) {
    _tornarEditavel(alvo);
    return;
  }

  // Seleciona o bloco pai mais significativo
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
  var alvo = e.target;
  var bloco = _encontrarBlocoEditavel(alvo);
  if (bloco) bloco.classList.remove('ed-hover');
}

function _editorKeydown(e) {
  if (!modoEdicaoAtivo) return;
  // Ctrl+Z = undo, Ctrl+Y = redo, Escape = deselecionar
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); edUndo(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); edRedo(); }
  if (e.key === 'Escape') { _deselecionarElemento(); _painel.style.display = 'none'; }
}

function _encontrarBlocoEditavel(el) {
  // Sobe na árvore para encontrar um bloco editável significativo
  var candidatos = ['.ea', '.cl-card', '.sc2', '.ci', '.th', '.ct', '.brow', '.ccard', '.lembrete', 'p', 'h2', 'h3', 'li', 'img'];
  for (var i = 0; i < candidatos.length; i++) {
    var ancestor = el.closest(candidatos[i]);
    if (ancestor && ancestor.closest('.main')) return ancestor;
  }
  // Qualquer elemento dentro de .main
  if (el.closest('.main')) return el;
  return null;
}

function _isTextElement(el) {
  return ['P','H1','H2','H3','H4','LI','SPAN','DIV','TD','TH'].includes(el.tagName);
}

function _tornarEditavel(el) {
  _pushUndo(el);
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

// ─── PAINEL DE PROPRIEDADES ──────────────────────────────

function criarPainelEditor() {
  _painel = document.createElement('div');
  _painel.id = 'painel-editor';
  _painel.style.display = 'none';
  _painel.innerHTML = [
    '<div class="pe-titulo">✏️ Propriedades</div>',
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
    '<div class="pe-grupo">',
    '  <label>Tamanho fonte</label>',
    '  <input type="range" id="pe-fs" min="10" max="60" step="1" oninput="edAplicarFonte(this.value)">',
    '  <span id="pe-fs-val">–</span>',
    '</div>',
    '<div class="pe-grupo">',
    '  <label>Texto</label>',
    '  <button class="pe-btn" onclick="edEditarTexto()">✏️ Editar texto</button>',
    '</div>',
    '<div class="pe-grupo" id="pe-grupo-img" style="display:none">',
    '  <label>Imagem</label>',
    '  <button class="pe-btn" onclick="edAlterarImagem()">🖼 Alterar URL</button>',
    '</div>',
    '<div class="pe-grupo">',
    '  <label>Negrito</label>',
    '  <button class="pe-btn" onclick="edToggleProp(\'fontWeight\',\'bold\',\'normal\')">B</button>',
    '  <button class="pe-btn" onclick="edToggleProp(\'fontStyle\',\'italic\',\'normal\')"><em>I</em></button>',
    '</div>',
    '<hr style="border:none;border-top:1px solid rgba(0,0,0,.1);margin:8px 0">',
    '<button class="pe-btn pe-del" onclick="edRemoverElemento()">🗑 Excluir bloco</button>',
    '<button class="pe-btn pe-close" onclick="_painel.style.display=\'none\';_deselecionarElemento()">✕ Fechar</button>'
  ].join('');
  document.body.appendChild(_painel);

  // Botões flutuantes do editor (undo/redo/add)
  var undoBtn = document.createElement('button');
  undoBtn.id = 'ed-undo';
  undoBtn.className = 'ed-float-btn';
  undoBtn.title = 'Desfazer (Ctrl+Z)';
  undoBtn.textContent = '↩ Desfazer';
  undoBtn.style.cssText = 'display:none;bottom:130px;right:20px';
  undoBtn.addEventListener('click', edUndo);
  document.body.appendChild(undoBtn);

  var redoBtn = document.createElement('button');
  redoBtn.id = 'ed-redo';
  redoBtn.className = 'ed-float-btn';
  redoBtn.title = 'Refazer (Ctrl+Y)';
  redoBtn.textContent = '↪ Refazer';
  redoBtn.style.cssText = 'display:none;bottom:80px;right:20px';
  redoBtn.addEventListener('click', edRedo);
  document.body.appendChild(redoBtn);

  var addBtn = document.createElement('button');
  addBtn.id = 'ed-add-card';
  addBtn.className = 'ed-float-btn';
  addBtn.title = 'Adicionar conta Claude';
  addBtn.textContent = '+ Conta Claude';
  addBtn.style.cssText = 'display:none;bottom:20px;right:20px;background:#c9a84c;color:#1a3a2a';
  addBtn.addEventListener('click', edAdicionarCartaClaude);
  document.body.appendChild(addBtn);
}

function _mostrarPainel(el) {
  if (!_painel) return;
  var rect = el.getBoundingClientRect();
  var top = Math.min(Math.max(rect.top + window.scrollY, window.scrollY + 8), window.scrollY + window.innerHeight - 350);
  var left = Math.min(rect.right + 12, window.innerWidth - 230);
  if (left < 4) left = 4;
  _painel.style.cssText = 'display:block;top:' + top + 'px;left:' + left + 'px';

  // Preenche valores atuais
  var style = window.getComputedStyle(el);
  var bgInput = document.getElementById('pe-bg');
  if (bgInput) bgInput.value = _rgbToHex(style.backgroundColor) || '#ffffff';
  var fgInput = document.getElementById('pe-fg');
  if (fgInput) fgInput.value = _rgbToHex(style.color) || '#000000';
  var fsSlider = document.getElementById('pe-fs');
  var fsVal = document.getElementById('pe-fs-val');
  var fs = parseInt(style.fontSize);
  if (fsSlider) fsSlider.value = fs || 16;
  if (fsVal) fsVal.textContent = (fs || 16) + 'px';

  // Mostra campo de imagem se for img
  var grupoImg = document.getElementById('pe-grupo-img');
  if (grupoImg) grupoImg.style.display = (el.tagName === 'IMG' || el.querySelector('img')) ? 'flex' : 'none';
}

// ─── APLICAR PROPRIEDADES ────────────────────────────────

function edAplicarProp(prop, valor) {
  if (!_elSelecionado) return;
  _pushUndo(_elSelecionado);
  _elSelecionado.style[prop] = valor;
  _salvarAlteracoes();
}

function edAplicarBorda(cor) {
  if (!_elSelecionado) return;
  _pushUndo(_elSelecionado);
  _elSelecionado.style.borderColor = cor;
  if (cor) _elSelecionado.style.borderStyle = 'solid';
  _salvarAlteracoes();
}

function edAplicarFonte(px) {
  if (!_elSelecionado) return;
  _pushUndo(_elSelecionado);
  _elSelecionado.style.fontSize = px + 'px';
  var fsVal = document.getElementById('pe-fs-val');
  if (fsVal) fsVal.textContent = px + 'px';
  _salvarAlteracoes();
}

function edToggleProp(prop, valA, valB) {
  if (!_elSelecionado) return;
  _pushUndo(_elSelecionado);
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
    _pushUndo(_elSelecionado);
    img.src = novaUrl.trim();
    _salvarAlteracoes();
  }
}

function edRemoverElemento() {
  if (!_elSelecionado) return;
  if (!confirm('Excluir este bloco?')) return;
  _pushUndo(document.querySelector('.main'));
  _elSelecionado.remove();
  _painel.style.display = 'none';
  _elSelecionado = null;
  _salvarAlteracoes();
}

// ─── CARDS CLAUDE ────────────────────────────────────────

function edAdicionarCartaClaude() {
  var grid = document.getElementById('claude-cards');
  if (!grid) { alert('Abra a aba ⏱ Claude primeiro.'); return; }
  var nome = prompt('Nome/e-mail da nova conta:');
  if (!nome || !nome.trim()) return;
  var tipo = prompt('Tipo (PRO ou Free):', 'Free') || 'Free';

  // Gera ID único
  var id = 'c' + Date.now();

  // Adiciona ao array global de contas
  if (typeof CLAUDE_CONTAS !== 'undefined') {
    CLAUDE_CONTAS.push({id: id, nome: nome.trim(), tipo: tipo.trim()});
  }

  // Salva contas customizadas no localStorage
  _salvarContasClaude();

  // Re-renderiza
  if (typeof claudeRenderizar === 'function') claudeRenderizar();

  // Adiciona botão de excluir em modo edição
  _adicionarBotoesExcluirClaude();
}

function _adicionarBotoesExcluirClaude() {
  if (!modoEdicaoAtivo) return;
  document.querySelectorAll('.cl-card').forEach(function(card) {
    if (!card.querySelector('.ed-remove-card')) {
      var btn = document.createElement('button');
      btn.className = 'ed-remove-card';
      btn.textContent = '🗑';
      btn.title = 'Excluir esta conta';
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var cardId = card.id.replace('card-', '');
        if (!confirm('Excluir conta "' + cardId + '"?')) return;
        // Remove do array
        if (typeof CLAUDE_CONTAS !== 'undefined') {
          var idx = CLAUDE_CONTAS.findIndex(function(c) { return c.id === cardId; });
          if (idx > -1) CLAUDE_CONTAS.splice(idx, 1);
        }
        // Remove localStorage
        localStorage.removeItem('cl_fim_' + cardId);
        localStorage.removeItem('cl_notif_' + cardId);
        _salvarContasClaude();
        if (typeof claudeRenderizar === 'function') claudeRenderizar();
        setTimeout(_adicionarBotoesExcluirClaude, 100);
      });
      card.appendChild(btn);
    }
  });
}

function _salvarContasClaude() {
  if (typeof CLAUDE_CONTAS !== 'undefined') {
    localStorage.setItem('cl_contas', JSON.stringify(CLAUDE_CONTAS));
  }
}

// ─── UNDO / REDO ────────────────────────────────────────

function _pushUndo(el) {
  _undoStack.push({ el: el, html: el.outerHTML, style: el.getAttribute('style') || '' });
  _redoStack = [];
  if (_undoStack.length > 50) _undoStack.shift();
}

function edUndo() {
  if (!_undoStack.length) return;
  var item = _undoStack.pop();
  _redoStack.push({ el: item.el, html: item.el.outerHTML, style: item.el.getAttribute('style') || '' });
  var temp = document.createElement('div');
  temp.innerHTML = item.html;
  var restored = temp.firstElementChild;
  if (restored && item.el.parentNode) {
    item.el.parentNode.replaceChild(restored, item.el);
  } else if (item.el) {
    item.el.setAttribute('style', item.style);
  }
  _salvarAlteracoes();
}

function edRedo() {
  if (!_redoStack.length) return;
  var item = _redoStack.pop();
  _undoStack.push({ el: item.el, html: item.el.outerHTML, style: item.el.getAttribute('style') || '' });
  var temp = document.createElement('div');
  temp.innerHTML = item.html;
  var restored = temp.firstElementChild;
  if (restored && item.el.parentNode) {
    item.el.parentNode.replaceChild(restored, item.el);
  }
  _salvarAlteracoes();
}

// ─── PERSISTÊNCIA (localStorage) ────────────────────────

function _salvarAlteracoes() {
  try {
    var main = document.querySelector('.main');
    if (main) localStorage.setItem('ed_main_html', main.innerHTML);
  } catch(e) { console.warn('[Editor] Erro ao salvar:', e); }
}

function restaurarAlteracoes() {
  try {
    var saved = localStorage.getItem('ed_main_html');
    if (saved) {
      var main = document.querySelector('.main');
      if (main) main.innerHTML = saved;
    }
  } catch(e) {}
}

function limparAlteracoes() {
  if (!confirm('Restaurar o site ao estado original? Todas as edições serão perdidas.')) return;
  localStorage.removeItem('ed_main_html');
  window.location.reload();
}

// ─── TOOLBAR TEXTO ───────────────────────────────────────

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

document.addEventListener('DOMContentLoaded', function() {
  // Restaura alterações salvas
  // DESABILITADO POR PADRÃO — descomentar quando quiser persistência:
  // restaurarAlteracoes();

  // Carrega contas Claude salvas
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
