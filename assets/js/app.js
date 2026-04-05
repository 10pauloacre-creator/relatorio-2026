// ═══════════════════════════════════════════════════════════
// APP.JS — Inicialização principal e roteamento da aplicação
// ═══════════════════════════════════════════════════════════

// Página ativa no momento
var paginaAtiva = 'geral';

// ── Inicialização ────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  // Inicializa Firebase (lazy — só quando o SDK estiver pronto)
  inicializarApp();
});

function inicializarApp() {
  // Aguarda o Firebase SDK carregar (importado via CDN no index.html)
  if (!window.firebase_app) {
    setTimeout(inicializarApp, 100);
    return;
  }
  initFirebase();
  // Monitora estado de autenticação
  onAuthChange(function(usuario) {
    if (usuario) {
      mostrarApp(usuario);
    } else {
      mostrarLogin();
    }
  });
}

// ── Autenticação / Login ─────────────────────────────────

function mostrarLogin() {
  document.getElementById('tela-login').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function mostrarApp(usuario) {
  document.getElementById('tela-login').style.display = 'none';
  var app = document.getElementById('app');
  app.style.display = 'flex';

  // Preenche dados do usuário na topbar
  var avatar = document.getElementById('user-avatar');
  if (avatar && usuario.photoURL) {
    avatar.src = usuario.photoURL;
    avatar.alt = usuario.displayName || 'Usuário';
  }
  var nomeEl = document.getElementById('user-nome');
  if (nomeEl) nomeEl.textContent = usuario.displayName || 'Prof. Paulo Roberto';

  // Inicializa todos os módulos
  initContador({});
  renderCronograma();
  carregarPaginaGeral();
  initPlano();
  initEditor();
  configurarNavegacao();
  configurarLogout();
  configurarMenuMobile();

  // Registra Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(function(reg) { console.log('[SW] Registrado:', reg.scope); })
      .catch(function(e) { console.warn('[SW] Falha no registro:', e); });
  }
}

// ── Login com Google ─────────────────────────────────────

function configurarBotaoLogin() {
  var btn = document.getElementById('btn-google-login');
  if (!btn) return;
  btn.addEventListener('click', function() {
    btn.disabled = true;
    btn.textContent = 'Entrando...';
    loginComGoogle()
      .catch(function(e) {
        btn.disabled = false;
        btn.textContent = 'Entrar com Google';
        var erroEl = document.getElementById('login-erro');
        if (erroEl) {
          erroEl.textContent = 'Erro ao fazer login: ' + (e.message || 'Tente novamente.');
          erroEl.style.display = 'block';
        }
      });
  });
}

// Precisa ser chamado antes da checagem de auth (botão sempre visível)
document.addEventListener('DOMContentLoaded', function() {
  configurarBotaoLogin();
});

function configurarLogout() {
  var btn = document.getElementById('btn-logout');
  if (!btn) return;
  btn.addEventListener('click', function() {
    logout().then(function() { mostrarLogin(); });
  });
}

// ── Navegação / Roteamento ───────────────────────────────

function configurarNavegacao() {
  var items = document.querySelectorAll('.nav-item');
  items.forEach(function(item) {
    item.addEventListener('click', function() {
      var pagina = this.dataset.pagina;
      if (pagina) navegarPara(pagina);
      // Fecha sidebar no mobile
      fecharSidebarMobile();
    });
  });
}

function navegarPara(id) {
  // Esconde todas as páginas
  document.querySelectorAll('.page').forEach(function(p) {
    p.classList.remove('visivel');
  });
  // Desativa todos os nav-items
  document.querySelectorAll('.nav-item').forEach(function(b) {
    b.classList.remove('ativo');
  });

  // Exibe a página ativa
  var page = document.getElementById('page-' + id);
  if (page) page.classList.add('visivel');

  // Ativa o nav-item correspondente
  var navItem = document.querySelector('[data-pagina="' + id + '"]');
  if (navItem) navItem.classList.add('ativo');

  paginaAtiva = id;

  // Carrega dados específicos da página
  if (id === 'cronograma') renderCronograma();
  if (id === 'contador') renderContador();
  if (id === 'plano') initPlano();
}

// ── Carregamento de dados das páginas ───────────────────

async function carregarPaginaGeral() {
  // Renderiza os diários iniciais que vieram do HTML original (já estão no DOM)
  // Adiciona listeners de toggle nos diários
  configurarTogglesDiario();
}

function configurarTogglesDiario() {
  document.querySelectorAll('.entrada-header').forEach(function(header) {
    header.addEventListener('click', function() {
      toggleEntrada(this);
    });
  });
}

function toggleEntrada(header) {
  var corpo  = header.nextElementSibling;
  var toggle = header.querySelector('.entrada-toggle');
  if (!corpo) return;
  var aberto = corpo.classList.contains('visivel');
  corpo.classList.toggle('visivel', !aberto);
  if (toggle) toggle.classList.toggle('aberto', !aberto);
}

// ── Menu hamburguer (mobile) ─────────────────────────────

function configurarMenuMobile() {
  var btnMenu = document.getElementById('btn-menu-mobile');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');

  if (btnMenu) {
    btnMenu.addEventListener('click', function() {
      if (sidebar) sidebar.classList.toggle('aberta');
      if (overlay) overlay.classList.toggle('visivel');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', function() {
      fecharSidebarMobile();
    });
  }
}

function fecharSidebarMobile() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('aberta');
  if (overlay) overlay.classList.remove('visivel');
}

// ── Indicador de sincronização ───────────────────────────

// Já implementado em firebase.js (atualizarIndicadorSync)
// Esta função inicializa o estado padrão
function inicializarSync() {
  if (typeof atualizarIndicadorSync === 'function') {
    atualizarIndicadorSync('salvo');
  }
}
