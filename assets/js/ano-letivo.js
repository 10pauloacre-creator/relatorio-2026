// Botão "📅 Ano letivo" no cabeçalho das páginas das escolas (Etapa 10).
//
// Mostra os anos letivos com registros no banco (relatorio_anos_letivos),
// com os números de cada ano, e permite abrir a página de arquivo do ano
// (quando existe) ou baixar tudo o que o banco guarda dele
// (relatorio_exportar_ano). Nada do diário é apagado: o histórico e a
// lixeira do banco são permanentes.
//
// A página informa a escola e o ano em <html data-escola-slug data-ano-letivo>.
// As páginas de arquivo (scripts/arquivar-ano-letivo.js) têm também
// data-arquivo-ate e abrem só para leitura.
window.RelatorioAnoLetivo = (function () {
  var REGISTRO_URL = "arquivo/anos-letivos.json";
  var root = document.documentElement;
  var escolaSlug = root.getAttribute("data-escola-slug") || "";
  var anoPagina = parseInt(root.getAttribute("data-ano-letivo"), 10) || 2026;
  var arquivoAte = root.getAttribute("data-arquivo-ate") || "";

  var CSS = ""
    + ".al-btn{display:inline-flex;align-items:center;gap:6px;margin:9px 0 0 8px;padding:5px 14px;border-radius:20px;cursor:pointer;"
    + "background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.4);color:#fff;font:600 .8rem/1.4 inherit;font-family:inherit}"
    + ".al-btn:hover{background:rgba(255,255,255,.24)}"
    + ".al-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}"
    + ".al-faixa{background:#fff4d6;color:#6b4a00;border-bottom:1px solid #e9cf86;padding:9px 16px;text-align:center;font-size:.86rem}"
    + ".al-faixa a{color:inherit;font-weight:700}"
    + ".al-fundo{position:fixed;inset:0;z-index:2147470000;background:rgba(10,20,14,.55);display:flex;align-items:flex-start;justify-content:center;"
    + "padding:72px 16px 16px;overflow-y:auto}"
    + ".al-painel{width:100%;max-width:560px;background:#fff;color:#1f2a24;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.3);"
    + "padding:22px 20px 18px;font-family:inherit}"
    + ".al-topo{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:4px}"
    + ".al-topo h2{margin:0;font-size:1.15rem}"
    + ".al-fechar{border:0;background:transparent;font-size:1.4rem;line-height:1;cursor:pointer;color:inherit;padding:4px 8px;border-radius:8px}"
    + ".al-sub{margin:0 0 16px;font-size:.84rem;color:#5b6b62}"
    + ".al-ano{border:1px solid #dfe7e2;border-radius:12px;padding:14px 16px;margin-bottom:10px}"
    + ".al-ano.on{border-color:#4a9467;background:#f3faf6}"
    + ".al-ano-cab{display:flex;align-items:center;gap:10px;flex-wrap:wrap}"
    + ".al-ano-cab strong{font-size:1.2rem}"
    + ".al-tag{font-size:.72rem;font-weight:700;padding:2px 9px;border-radius:999px;background:#e8efe9;color:#2d6147}"
    + ".al-tag.atual{background:#2d6147;color:#fff}"
    + ".al-num{margin:8px 0 2px;font-size:.86rem;color:#33443b}"
    + ".al-det{margin:0;font-size:.78rem;color:#6a7a71}"
    + ".al-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}"
    + ".al-acao{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border-radius:10px;border:1px solid #cfdad3;"
    + "background:#fff;color:#1f2a24;font:600 .82rem/1 inherit;font-family:inherit;text-decoration:none;cursor:pointer}"
    + ".al-acao.pri{background:#2d6147;border-color:#2d6147;color:#fff}"
    + ".al-acao[disabled]{opacity:.55;cursor:default}"
    + ".al-nota{margin:14px 0 0;padding:12px 14px;border-radius:12px;background:#f1f5f2;font-size:.8rem;line-height:1.5;color:#3d4d44}"
    + ".al-msg{font-size:.84rem;color:#5b6b62;padding:8px 0}"
    + "html.dark-2026 .al-painel{background:#191c1f;color:#f4f5f6}"
    + "html.dark-2026 .al-sub,html.dark-2026 .al-det,html.dark-2026 .al-msg{color:#aeb4bd}"
    + "html.dark-2026 .al-num{color:#dfe3e7}"
    + "html.dark-2026 .al-ano{border-color:#383d43}"
    + "html.dark-2026 .al-ano.on{border-color:#6fcf97;background:#1c2a22}"
    + "html.dark-2026 .al-tag{background:#272b30;color:#9ee6b8}"
    + "html.dark-2026 .al-tag.atual{background:#2f9e5f;color:#fff}"
    + "html.dark-2026 .al-acao{background:#202327;border-color:#383d43;color:#f4f5f6}"
    + "html.dark-2026 .al-acao.pri{background:#2f9e5f;border-color:#2f9e5f;color:#fff}"
    + "html.dark-2026 .al-nota{background:#202327;color:#c9ced4}"
    + "html.dark-2026 .al-faixa{background:#3a2e12;color:#ffd98a;border-color:#5a4718}";

  var fundo = null;
  var registro = null;

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function dataBr(iso) {
    var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
  }
  function numero(n) {
    return Number(n || 0).toLocaleString("pt-BR");
  }
  function plural(n, um, varios) {
    return numero(n) + " " + (Number(n) === 1 ? um : varios);
  }

  function cliente() {
    var sync = window.RelatorioSupabaseSync;
    return sync && sync.getClient ? sync.getClient() : null;
  }

  async function lerRegistro() {
    if (registro) return registro;
    try {
      var r = await fetch(REGISTRO_URL, { cache: "no-store" });
      registro = r.ok ? await r.json() : {};
    } catch (e) {
      registro = {};
    }
    return registro;
  }

  // Endereço para abrir um ano: a página de arquivo dele ou, para o ano em
  // andamento, a página atual da escola. Vazio quando o ano não tem página.
  function enderecoDoAno(ano, reg) {
    var escola = (reg && reg[escolaSlug]) || {};
    if (escola.anos && escola.anos[ano]) return escola.anos[ano];
    if (escola.atual && ano === escola.anoAtual) return escola.atual;
    return "";
  }

  function montarBotao() {
    var alvo = document.querySelector("header.cab .cab-t");
    if (!alvo || document.getElementById("al-btn")) return;
    if (!document.getElementById("al-style")) {
      var style = document.createElement("style");
      style.id = "al-style";
      style.setAttribute("data-runtime-ui", "ano-letivo");
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "al-btn";
    btn.className = "al-btn";
    btn.setAttribute("data-runtime-ui", "ano-letivo");
    btn.setAttribute("aria-haspopup", "dialog");
    btn.textContent = (arquivoAte ? "📦 Arquivo " : "📅 Ano letivo ") + anoPagina + " ▾";
    btn.addEventListener("click", abrir);
    var prof = alvo.querySelector(".prof");
    if (prof && prof.nextSibling) alvo.insertBefore(btn, prof.nextSibling);
    else alvo.appendChild(btn);

    if (arquivoAte) {
      var faixa = document.createElement("div");
      faixa.className = "al-faixa";
      faixa.setAttribute("data-runtime-ui", "ano-letivo");
      faixa.innerHTML = "📦 Arquivo do ano letivo " + anoPagina + ", como estava em " + esc(dataBr(arquivoAte))
        + ". Somente leitura. <a href=\"#\" data-al-abrir>Ver outros anos</a>";
      faixa.querySelector("[data-al-abrir]").addEventListener("click", function (ev) { ev.preventDefault(); abrir(); });
      var cab = document.querySelector("header.cab");
      cab.parentNode.insertBefore(faixa, cab);
    }
  }

  function fechar() {
    if (!fundo) return;
    fundo.remove();
    fundo = null;
    document.removeEventListener("keydown", teclaEsc);
    var btn = document.getElementById("al-btn");
    if (btn) btn.focus();
  }
  function teclaEsc(ev) {
    if (ev.key === "Escape") fechar();
  }

  function abrir() {
    if (fundo) return;
    fundo = document.createElement("div");
    fundo.className = "al-fundo";
    fundo.setAttribute("data-runtime-ui", "ano-letivo");
    fundo.innerHTML = '<div class="al-painel" role="dialog" aria-modal="true" aria-labelledby="al-titulo">'
      + '<div class="al-topo"><h2 id="al-titulo">📅 Anos letivos</h2>'
      + '<button type="button" class="al-fechar" aria-label="Fechar">×</button></div>'
      + '<p class="al-sub">Anos com registros desta escola, do mais recente para o mais antigo.</p>'
      + '<div class="al-lista"><div class="al-msg">Carregando os anos guardados…</div></div>'
      + '<p class="al-nota">🔒 <strong>Nada se perde.</strong> Todos os registros ficam guardados para sempre: cada alteração '
      + 'é salva por dia, e o que for apagado vai para uma lixeira que não pode ser esvaziada. '
      + 'Os anos anteriores podem ser abertos ou baixados a qualquer momento.</p>'
      + "</div>";
    document.body.appendChild(fundo);
    fundo.addEventListener("click", function (ev) { if (ev.target === fundo) fechar(); });
    fundo.querySelector(".al-fechar").addEventListener("click", fechar);
    document.addEventListener("keydown", teclaEsc);
    fundo.querySelector(".al-fechar").focus();
    carregar();
  }

  async function carregar() {
    var lista = fundo && fundo.querySelector(".al-lista");
    if (!lista) return;
    var reg = await lerRegistro();
    var anos = [];
    var erro = null;
    var client = cliente();
    if (!client || !escolaSlug) erro = { message: "sem conexão com o banco" };
    if (client && escolaSlug) {
      try {
        await window.RelatorioSupabaseSync.auth.whenAuthorized();
        var r = await client.rpc("relatorio_anos_letivos", { p_escola_slug: escolaSlug });
        if (r.error) erro = r.error;
        else anos = Array.isArray(r.data) ? r.data : [];
      } catch (e) {
        erro = e;
      }
    }
    // O ano da página e os anos arquivados aparecem mesmo sem conexão.
    var vistos = {};
    anos.forEach(function (a) { vistos[a.ano] = true; });
    var extras = [anoPagina];
    var escolaReg = reg[escolaSlug] || {};
    Object.keys(escolaReg.anos || {}).forEach(function (k) { extras.push(parseInt(k, 10)); });
    extras.forEach(function (ano) {
      if (ano && !vistos[ano]) { vistos[ano] = true; anos.push({ ano: ano, semDados: true }); }
    });
    anos.sort(function (a, b) { return b.ano - a.ano; });
    if (!fundo) return;

    var anoAtual = escolaReg.anoAtual || (arquivoAte ? null : anoPagina);
    lista.innerHTML = (erro ? '<div class="al-msg">⚠️ Não foi possível consultar o banco agora. Tente de novo em instantes.</div>' : "")
      + anos.map(function (a) { return cartao(a, anoAtual, reg, !!erro); }).join("");

    lista.querySelectorAll("[data-al-baixar]").forEach(function (b) {
      b.addEventListener("click", function () { baixar(parseInt(b.getAttribute("data-al-baixar"), 10), b); });
    });
  }

  function cartao(a, anoAtual, reg, semConexao) {
    var aqui = a.ano === anoPagina;
    var tag = a.ano === anoAtual ? '<span class="al-tag atual">Em andamento</span>' : '<span class="al-tag">Encerrado</span>';
    if (aqui) tag += '<span class="al-tag">' + (arquivoAte ? "Arquivo aberto" : "Você está aqui") + "</span>";

    var numeros = a.semDados
      ? '<p class="al-num">' + (semConexao ? "Números indisponíveis sem conexão." : "Sem registros no banco para este ano.") + "</p>"
      : '<p class="al-num">' + [
          plural(a.aulas, "aula", "aulas"),
          plural(a.dias, "dia letivo", "dias letivos"),
          plural(a.horas, "h/aula", "h/aula"),
          plural(a.turmas, "turma", "turmas"),
          plural(a.alunos, "aluno", "alunos"),
          plural(a.ocorrencias, "ocorrência", "ocorrências")
        ].join(" · ") + "</p>"
        + '<p class="al-det">'
        + (a.primeira ? "Relatos de " + dataBr(a.primeira) + " a " + dataBr(a.ultima) + ". " : "")
        + (a.dias_salvos ? "Guardado em " + plural(a.dias_salvos, "versão diária", "versões diárias") + "." : "")
        + "</p>";

    var endereco = enderecoDoAno(a.ano, reg);
    var abrirBtn;
    if (aqui) {
      abrirBtn = '<button type="button" class="al-acao" disabled>Página aberta</button>';
    } else if (endereco) {
      abrirBtn = '<a class="al-acao pri" href="' + esc(endereco) + '">Abrir ' + a.ano + "</a>";
    } else {
      abrirBtn = '<button type="button" class="al-acao" disabled title="O ano ainda não tem página de arquivo">Sem página de arquivo</button>';
    }
    var baixarBtn = a.semDados ? "" : '<button type="button" class="al-acao" data-al-baixar="' + a.ano + '">⬇️ Baixar todos os dados</button>';

    return '<div class="al-ano' + (aqui ? " on" : "") + '">'
      + '<div class="al-ano-cab"><strong>' + a.ano + "</strong>" + tag + "</div>"
      + numeros
      + '<div class="al-acoes">' + abrirBtn + baixarBtn + "</div>"
      + "</div>";
  }

  async function baixar(ano, botao) {
    var client = cliente();
    if (!client) return;
    var texto = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Preparando…";
    try {
      await window.RelatorioSupabaseSync.auth.whenAuthorized();
      var r = await client.rpc("relatorio_exportar_ano", { p_escola_slug: escolaSlug, p_ano: ano });
      if (r.error) throw r.error;
      var blob = new Blob([JSON.stringify(r.data, null, 1)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "diario-" + escolaSlug + "-" + ano + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      botao.textContent = "✅ Baixado";
    } catch (e) {
      console.error("[Ano letivo] exportação falhou", e);
      botao.textContent = "⚠️ Falhou, tente de novo";
    } finally {
      botao.disabled = false;
      window.setTimeout(function () { botao.textContent = texto; }, 4000);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montarBotao);
  else montarBotao();

  return { abrir: abrir, anoPagina: anoPagina };
})();
