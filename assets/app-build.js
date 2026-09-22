window.__RELATORIOS_APP_BUILD__ = {
  "appName": "Relatórios",
  "appId": "com.relatoriosdiarios.app",
  "channel": "debug",
  "versionName": "1.0.13",
  "versionCode": 15,
  "notes": [
    "Atualização estrutural do aplicativo."
  ],
  "downloadPageUrl": "https://10pauloacre-creator.github.io/relatorio-2026/downloads/",
  "latestJsonUrl": "https://10pauloacre-creator.github.io/relatorio-2026/downloads/latest.json",
  "latestScriptUrl": "https://10pauloacre-creator.github.io/relatorio-2026/downloads/latest.js",
  "generatedAt": "2026-09-22T16:12:56.411Z"
};

(function loadRelatorio2026Theme() {
  var head = document.head;
  if (!head) return;

  var hasThemeStyles = document.querySelector('link[href*="dark-mode-2026.css"]');
  if (!hasThemeStyles) {
    var themeLink = document.createElement("link");
    themeLink.rel = "stylesheet";
    themeLink.href = "assets/css/dark-mode-2026.css?v=20260921b";
    head.appendChild(themeLink);
  }

  if (!window.__RELATORIO_DARK_THEME_2026__ &&
      !document.querySelector('script[src*="dark-mode-2026.js"]')) {
    var themeScript = document.createElement("script");
    themeScript.src = "assets/js/dark-mode-2026.js?v=20260921b";
    head.appendChild(themeScript);
  }
})();
