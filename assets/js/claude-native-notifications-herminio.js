(function() {
  function resolveIdByName(nome, accounts) {
    for (var i = 0; i < accounts.length; i += 1) {
      if (accounts[i] && accounts[i].nome === nome) return accounts[i].id;
    }
    return null;
  }

  window.installClaudeNativeNotifications && window.installClaudeNativeNotifications({
    key: 'herminio',
    accountsName: 'RH_CONTAS_CLAUDE',
    tickName: 'rhClaudeTick',
    notifyName: 'rhClaudeNotificar',
    confirmName: 'rhClaudeConfirmarHora',
    permissionName: 'rhClaudePedirPermissao',
    clearName: 'rhClaudeLimpar',
    updateBarName: 'rhClaudeAtualizarNotifBar',
    renderName: 'rhClaudeRender',
    formatFnName: '_rhFmtTempo',
    idbSaveName: '_rhClaudeIDBSalvar',
    idbRemoveName: '_rhClaudeIDBRemover',
    openTabName: 'rhClaudeAbrirPelaHash',
    afterScheduleName: 'rhClaudeForcarVerificacaoSW',
    onSaveTimerName: '',
    onClearTimerName: '',
    notifBarId: 'cl-notif-bar-rh',
    globalStatusId: 'rh-cl-status',
    popupId: 'rh-cl-popup',
    inputId: 'rh-cl-hora-input',
    storagePrefix: 'rh_cl',
    timerPrefix: 'rh-timer-',
    cardPrefix: 'rh-card-',
    statusPrefix: 'rh-status-',
    busyCardClass: 'cl-card ocupado',
    freeCardClass: 'cl-card livre',
    busyText: 'AGUARDANDO...',
    freeText: 'LIVRE ✓',
    pageHash: '#sec-claude',
    notificationBaseId: 210000,
    channelId: 'claude-ready-herminio',
    channelName: 'Claude Herminio',
    channelDescription: 'Avisos quando a conta Claude ficar disponível na escola Herminio.',
    notificationTitle: 'Conta claude disponivel',
    notificationBody: 'Conta claude disponivel, toque para verificar',
    enabledStatusText: '● Notificações Android ativas',
    pendingStatusText: '● Permissão Android de notificação pendente',
    resolveIdByName: resolveIdByName,
    readPopupAccountId: function() {
      return window._rhClPopupId || '';
    }
  });
})();
