(function() {
  function resolveIdByName(nome, accounts) {
    for (var i = 0; i < accounts.length; i += 1) {
      if (accounts[i] && accounts[i].nome === nome) return accounts[i].id;
    }
    return null;
  }

  window.installClaudeNativeNotifications && window.installClaudeNativeNotifications({
    key: 'casavequia',
    accountsName: 'CLAUDE_CONTAS',
    tickName: 'claudeTick',
    notifyName: 'claudeNotificar',
    confirmName: 'claudeConfirmarHora',
    permissionName: 'claudePedirPermissao',
    clearName: 'claudeParar',
    updateBarName: 'claudeAtualizarNotifBar',
    renderName: 'claudeRenderizar',
    formatFnName: 'claudeFormatarTempo',
    idbSaveName: '_claudeIDB_salvar',
    idbRemoveName: '_claudeIDB_remover',
    openTabName: 'claudeAbrirPelaHash',
    afterScheduleName: '',
    onSaveTimerName: '_claudeSyncFB',
    onClearTimerName: '',
    notifBarId: 'cl-notif-bar',
    globalStatusId: 'cl-fb-status',
    popupId: 'cl-popup-hora',
    inputId: 'cl-hora-input',
    storagePrefix: 'cl',
    timerPrefix: 'timer-',
    cardPrefix: 'card-',
    statusPrefix: 'status-',
    busyCardClass: 'cl-card ocupado',
    freeCardClass: 'cl-card livre',
    busyText: 'Aguardando...',
    freeText: 'Livre ✓',
    pageHash: '#claude',
    notificationBaseId: 310000,
    channelId: 'claude-ready-casavequia',
    channelName: 'Claude Casavequia',
    channelDescription: 'Avisos quando a conta Claude ficar disponível na escola Casavequia.',
    notificationTitle: 'Conta claude disponivel',
    notificationBody: 'Conta claude disponivel, toque para verificar',
    enabledStatusText: '● Notificações Android ativas',
    pendingStatusText: '● Permissão Android de notificação pendente',
    resolveIdByName: resolveIdByName,
    readPopupAccountId: function() {
      var popup = document.getElementById('cl-popup-hora');
      return popup ? popup.dataset.id || '' : '';
    }
  });
})();
