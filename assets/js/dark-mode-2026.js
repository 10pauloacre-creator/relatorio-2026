(function () {
  "use strict";

  if (window.__RELATORIO_DARK_THEME_2026__) return;
  window.__RELATORIO_DARK_THEME_2026__ = true;

  /*
   * A folha final e anexada depois dos estilos legados da pagina. Assim, as
   * regras antigas de modo escuro nao recuperam a paleta verde/roxa.
   */
  if (!document.querySelector('link[data-relatorio-dark-final="20260921a"]')) {
    var currentScript = document.currentScript;
    var themeStylesheet = document.createElement("link");
    themeStylesheet.rel = "stylesheet";
    themeStylesheet.dataset.relatorioDarkFinal = "20260921a";
    themeStylesheet.href = currentScript && currentScript.src
      ? new URL("../css/dark-mode-2026.css?v=20260921a", currentScript.src).href
      : "assets/css/dark-mode-2026.css?v=20260921a";
    document.head.appendChild(themeStylesheet);
  }

  var root = document.documentElement;
  var body = document.body;
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var originalThemeColor = themeMeta ? themeMeta.getAttribute("content") : "";
  var storageKey = "modo-tema";

  function storedMode() {
    try {
      return window.localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  }

  function pageIsPermanentlyDark() {
    return Boolean(
      body && (
        body.hasAttribute("data-pp-page") ||
        body.classList.contains("pp-body") ||
        body.classList.contains("dark-page")
      )
    );
  }

  function shouldUseDarkTheme() {
    if (!body) return false;
    if (body.classList.contains("modo-escuro")) return true;
    if (pageIsPermanentlyDark()) return true;

    var mode = storedMode();
    if (mode === "escuro") return true;
    if (mode === "claro") return false;

    /* Paginas sem seletor acompanham o sistema ate o usuario escolher um modo. */
    return !document.getElementById("modo-btns") &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function applyTheme() {
    var dark = shouldUseDarkTheme();
    root.classList.toggle("dark-2026", dark);
    root.dataset.relatorioTheme = dark ? "dark" : "light";

    if (themeMeta) {
      themeMeta.setAttribute("content", dark ? "#111315" : originalThemeColor);
    }
  }

  applyTheme();

  if (body && window.MutationObserver) {
    new MutationObserver(applyTheme).observe(body, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  window.addEventListener("storage", function (event) {
    if (event.key === storageKey) applyTheme();
  });

  if (window.matchMedia) {
    var media = window.matchMedia("(prefers-color-scheme: dark)");
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", applyTheme);
    }
  }

  window.Relatorio2026Theme = {
    refresh: applyTheme
  };
})();
