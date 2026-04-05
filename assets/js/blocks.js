// ═══════════════════════════════════════════════════════════
// BLOCKS.JS — Sistema de blocos de conteúdo
// ═══════════════════════════════════════════════════════════

const TIPOS_BLOCO = {
  texto: {
    icone: '📝', nome: 'Caixa de texto', desc: 'Texto livre e formatado',
    criar: () => ({ tipo: 'texto', conteudo: '<p>Digite aqui...</p>', fundo: '#ffffff' })
  },
  lista: {
    icone: '📋', nome: 'Lista de marcadores', desc: 'Lista com • pontos',
    criar: () => ({ tipo: 'lista', conteudo: '<ul><li>Item 1</li><li>Item 2</li></ul>', fundo: '#ffffff' })
  },
  checklist: {
    icone: '✅', nome: 'Lista com checkboxes', desc: 'Lista de tarefas',
    criar: () => ({ tipo: 'checklist', conteudo: '<ul class="checklist"><li>Tarefa 1</li></ul>', fundo: '#ffffff' })
  },
  tabela: {
    icone: '📊', nome: 'Tabela', desc: 'Tabela editável',
    criar: () => ({ tipo: 'tabela', conteudo: '<table border="1" style="border-collapse:collapse;width:100%"><tr><th style="padding:8px">Coluna 1</th><th style="padding:8px">Coluna 2</th></tr><tr><td style="padding:8px">Dado</td><td style="padding:8px">Dado</td></tr></table>', fundo: '#ffffff' })
  },
  divisor: {
    icone: '─', nome: 'Linha divisória', desc: 'Separador visual',
    criar: () => ({ tipo: 'divisor', conteudo: '', fundo: 'transparent' })
  },
  diario: {
    icone: '🗓', nome: 'Entrada de diário', desc: 'Relato de aula com data',
    criar: () => ({ tipo: 'diario', conteudo: '<strong>Data:</strong> ' + new Date().toLocaleDateString('pt-BR') + '<br><p>Descreva a aula aqui...</p>', fundo: '#faf8f2' })
  }
};

const CORES_FUNDO = [
  { cor: '#ffffff', nome: 'Branco' },
  { cor: '#f8f9fa', nome: 'Cinza claro' },
  { cor: '#fef9c3', nome: 'Amarelo suave' },
  { cor: '#f0fff4', nome: 'Verde suave' },
  { cor: '#eff6ff', nome: 'Azul suave' },
  { cor: '#fdf2f8', nome: 'Rosa suave' },
  { cor: '#f5f3ff', nome: 'Roxo suave' },
  { cor: '#fff7ed', nome: 'Laranja suave' }
];

// Cria o elemento DOM de um bloco
function criarElementoBloco(dados, paginaId, indice, modoEdicao) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bloco-wrapper';
  wrapper.dataset.indice = indice;
  wrapper.style.position = 'relative';
  wrapper.style.padding = '12px';
  wrapper.style.borderRadius = '8px';
  wrapper.style.marginBottom = '12px';
  if (dados.fundo) wrapper.style.backgroundColor = dados.fundo;

  const conteudo = document.createElement('div');
  conteudo.className = 'bloco-conteudo bloco-tipo-' + dados.tipo;

  if (dados.tipo === 'divisor') {
    conteudo.innerHTML = '<hr style="border:none;border-top:2px solid #e8e5de;margin:8px 0">';
  } else {
    conteudo.innerHTML = dados.conteudo || '';
    if (modoEdicao) {
      conteudo.contentEditable = 'true';
      conteudo.style.outline = 'none';
      conteudo.style.minHeight = '32px';
      conteudo.addEventListener('input', function() {
        dados.conteudo = this.innerHTML;
        agendarSalvamentoBlocos(paginaId);
      });
    }
  }

  wrapper.appendChild(conteudo);

  if (modoEdicao) {
    const controles = criarControlesBloco(dados, paginaId, wrapper);
    wrapper.appendChild(controles);
  }

  return wrapper;
}

function criarControlesBloco(dados, paginaId, wrapper) {
  const ctrl = document.createElement('div');
  ctrl.className = 'bloco-controles';

  const botoes = [
    { icone: '🎨', titulo: 'Cor de fundo', acao: 'cor' },
    { icone: '📋', titulo: 'Duplicar',     acao: 'dup' },
    { icone: '⬆',  titulo: 'Mover acima',  acao: 'up' },
    { icone: '⬇',  titulo: 'Mover abaixo', acao: 'down' },
    { icone: '🗑',  titulo: 'Excluir',      acao: 'del', danger: true }
  ];

  botoes.forEach(function(b) {
    const btn = document.createElement('button');
    btn.className = 'bc-btn' + (b.danger ? ' danger' : '');
    btn.title = b.titulo;
    btn.textContent = b.icone;
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      handleAcaoBloco(b.acao, dados, paginaId, wrapper);
    });
    ctrl.appendChild(btn);
  });

  return ctrl;
}

function handleAcaoBloco(acao, dados, paginaId, wrapper) {
  const container = wrapper.parentElement;
  if (!container) return;

  if (acao === 'cor') {
    mostrarPaletaCores(wrapper, dados, paginaId);
  } else if (acao === 'dup') {
    const clone = JSON.parse(JSON.stringify(dados));
    const novoEl = criarElementoBloco(clone, paginaId, 0, true);
    container.insertBefore(novoEl, wrapper.nextSibling);
    renumerarBlocos(container);
    agendarSalvamentoBlocos(paginaId);
  } else if (acao === 'up') {
    const prev = wrapper.previousElementSibling;
    if (prev) {
      container.insertBefore(wrapper, prev);
      renumerarBlocos(container);
      agendarSalvamentoBlocos(paginaId);
    }
  } else if (acao === 'down') {
    const next = wrapper.nextElementSibling;
    if (next) {
      container.insertBefore(next, wrapper);
      renumerarBlocos(container);
      agendarSalvamentoBlocos(paginaId);
    }
  } else if (acao === 'del') {
    if (confirm('Excluir este bloco?')) {
      wrapper.remove();
      renumerarBlocos(container);
      agendarSalvamentoBlocos(paginaId);
    }
  }
}

function mostrarPaletaCores(wrapper, dados, paginaId) {
  document.querySelectorAll('.paleta-cores.visivel').forEach(function(p) { p.remove(); });

  const paleta = document.createElement('div');
  paleta.className = 'paleta-cores visivel';

  CORES_FUNDO.forEach(function(c) {
    const item = document.createElement('div');
    item.className = 'cor-item';
    item.style.backgroundColor = c.cor;
    item.title = c.nome;
    item.style.border = c.cor === '#ffffff' ? '1px solid #ccc' : '2px solid transparent';
    item.addEventListener('click', function() {
      wrapper.style.backgroundColor = c.cor;
      dados.fundo = c.cor;
      paleta.remove();
      agendarSalvamentoBlocos(paginaId);
    });
    paleta.appendChild(item);
  });

  var ctrl = wrapper.querySelector('.bloco-controles');
  if (ctrl) ctrl.appendChild(paleta);

  setTimeout(function() {
    document.addEventListener('click', function fechar() {
      paleta.remove();
      document.removeEventListener('click', fechar);
    }, { once: true });
  }, 50);
}

function renumerarBlocos(container) {
  container.querySelectorAll('.bloco-wrapper').forEach(function(w, i) {
    w.dataset.indice = i;
  });
}

var _timerSalvamentoBlocos = null;
function agendarSalvamentoBlocos(paginaId) {
  clearTimeout(_timerSalvamentoBlocos);
  _timerSalvamentoBlocos = setTimeout(function() {
    coletarESalvarBlocos(paginaId);
  }, 800);
}

function coletarESalvarBlocos(paginaId) {
  var container = document.getElementById('page-content-' + paginaId);
  if (!container) return;
  var blocos = [];
  container.querySelectorAll('.bloco-wrapper').forEach(function(w) {
    var conteudoEl = w.querySelector('.bloco-conteudo');
    var tipo = 'texto';
    if (conteudoEl) {
      var match = conteudoEl.className.match(/bloco-tipo-(\w+)/);
      if (match) tipo = match[1];
    }
    blocos.push({
      tipo: tipo,
      conteudo: conteudoEl ? conteudoEl.innerHTML : '',
      fundo: w.style.backgroundColor || '#ffffff'
    });
  });
  if (typeof execComSync === 'function' && typeof salvarBlocos === 'function') {
    execComSync(function() { return salvarBlocos(paginaId, blocos); });
  }
}

function renderBlocos(containerEl, paginaId, blocos, modoEdicao) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  (blocos || []).forEach(function(dados, i) {
    var el = criarElementoBloco(dados, paginaId, i, modoEdicao);
    containerEl.appendChild(el);
  });
}

function abrirModalBloco(paginaId) {
  var modal = document.getElementById('modal-bloco');
  if (!modal) return;
  var lista = modal.querySelector('#modal-bloco-lista');
  if (!lista) return;
  lista.innerHTML = '';

  Object.entries(TIPOS_BLOCO).forEach(function(entry) {
    var tipo = entry[0], config = entry[1];
    if (tipo === 'divisor') {
      var sep = document.createElement('div');
      sep.className = 'modal-sep';
      lista.appendChild(sep);
    }
    var btn = document.createElement('button');
    btn.className = 'opcao-bloco';
    btn.innerHTML = '<span class="icone-bloco">' + config.icone + '</span>' +
      '<span><span class="nome-bloco">' + config.nome + '</span>' +
      '<span class="desc-bloco">' + config.desc + '</span></span>';
    btn.addEventListener('click', function() {
      adicionarBloco(paginaId, config.criar());
      fecharModalBloco();
    });
    lista.appendChild(btn);
  });

  modal.classList.add('visivel');
}

function fecharModalBloco() {
  var modal = document.getElementById('modal-bloco');
  if (modal) modal.classList.remove('visivel');
}

function adicionarBloco(paginaId, dados) {
  var container = document.getElementById('page-content-' + paginaId);
  if (!container) return;
  var el = criarElementoBloco(dados, paginaId, container.children.length, true);
  container.appendChild(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  agendarSalvamentoBlocos(paginaId);
}
