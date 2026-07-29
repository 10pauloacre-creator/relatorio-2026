(function () {
  'use strict';

  function removeLegacyClaudeUi() {
    document.querySelectorAll('#sec-claude').forEach(function (section) { section.remove(); });
    document.querySelectorAll('.nb').forEach(function (button) {
      var onclick = button.getAttribute('onclick') || '';
      if (onclick.indexOf("'claude'") < 0 && onclick.indexOf("'sec-claude'") < 0) return;
      var next = button.nextElementSibling;
      var previous = button.previousElementSibling;
      button.remove();
      if (next && next.classList.contains('sp')) next.remove();
      else if (previous && previous.classList.contains('sp')) previous.remove();
    });
    if ((location.hash || '').toLowerCase().indexOf('claude') >= 0 && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }

  // Casavequia registra a inicialização no próprio HTML. Estes no-ops impedem
  // que o listener antigo continue a sincronizar ou criar notificações.
  window.claudeRenderizar = function () {};
  window.claudeTick = function () {};
  window.claudeListenFirebase = function () {};
  window.claudeAbrirPelaHash = function () {};
  window.CLAUDE_CONTAS = [];

  document.addEventListener('DOMContentLoaded', removeLegacyClaudeUi);
  if (document.readyState !== 'loading') removeLegacyClaudeUi();
})();
