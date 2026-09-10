(function () {
  'use strict';

  var CATALOGO = {
    't23-esp-b1': {
      titulo: 'Voces sin Fronteras',
      url: 'livros/raimundo-herminio/2e3/espanhol-1bim/index.html',
      status: 'concluido'
    }
  };

  function dadosSalvos(chave) {
    try {
      return JSON.parse(localStorage.getItem('rh_livro_' + chave) || 'null') || {};
    } catch (erro) {
      return {};
    }
  }

  function aplicarLivro(chave, configuracao) {
    var cartao = document.querySelector('[data-rh-liv="' + chave + '"]');
    if (!cartao) return;

    var salvo = dadosSalvos(chave);
    var status = (window._rhLivStatus && window._rhLivStatus[chave]) || configuracao.status || '';
    var titulo = salvo.titulo || configuracao.titulo;
    var url = salvo.url || configuracao.url;
    var tituloEl = cartao.querySelector('.liv-card-nm');
    var iconeEl = cartao.querySelector('.liv-card-ic');
    var acoes = cartao.querySelector('.liv-btns');

    cartao.classList.remove('criando', 'concluido');
    if (status) cartao.classList.add(status);
    if (tituloEl) tituloEl.textContent = titulo;
    if (iconeEl && status === 'concluido') iconeEl.textContent = '📗';
    if (!acoes || acoes.querySelector('[data-rh-book-open="' + chave + '"]')) return;

    var abrir = document.createElement('button');
    abrir.type = 'button';
    abrir.className = 'liv-btn b-con';
    abrir.dataset.rhBookOpen = chave;
    abrir.textContent = '📖 Abrir livro';
    abrir.addEventListener('click', function (evento) {
      evento.stopPropagation();
      window.open(url, '_blank', 'noopener,noreferrer');
    });
    acoes.insertBefore(abrir, acoes.firstChild);
  }

  function instalarCatalogo() {
    if (typeof window.rhLivRender !== 'function' || window.__rhCatalogoLivrosInstalado) return;

    var renderOriginal = window.rhLivRender;
    window.rhLivRender = function () {
      renderOriginal();
      Object.keys(CATALOGO).forEach(function (chave) {
        aplicarLivro(chave, CATALOGO[chave]);
      });
    };
    window.__rhCatalogoLivrosInstalado = true;
    window.rhLivRender();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', instalarCatalogo);
  } else {
    instalarCatalogo();
  }
}());
