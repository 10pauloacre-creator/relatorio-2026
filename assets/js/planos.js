/* ═══════════════════════════════════════════════════════════════════════
   planos.js — Planos do RELATORIO SKIN no navegador (Etapa 17, 26/09/2026)
   window.SkinPlanos: plano da conta, limites de uso (diário, I.A., documentos),
   modal de upgrade, aviso aos 80%, checkout (pronto para o gateway), indicação
   com código e consentimentos de e-mail/WhatsApp (LGPD).

   Banco: supabase/2026-09-26-etapa17-planos-assinaturas.sql
     plano_status(p_dia) · plano_consumir(recurso, ref, dia) · plano_criar_pedido
     indicacao_meu_codigo · indicacao_registrar · consentimento_registrar · plano_evento

   Onde os limites são conferidos (as páginas chamam, sempre com
   "window.SkinPlanos &&" para funcionar também onde o módulo não é carregado):
     diario     novo-diario.js (salvar diário novo) e meu-diario-ia.js (criar_diario)
     ia         Edge Functions (ia_consumir_cota) — a página só mostra o modal
     documento  frequencia-diaria.js, documentos-exportar.js, relatório do aluno
                (meu-diario.html) e relatório individual (aee.html)

   Modo "lancamento" (padrão até o gateway entrar): conta o uso e mostra o
   aviso, mas não bloqueia. Modo "ativo": bloqueia e abre o modal de upgrade.

   GATEWAY: quando o pagamento entrar, registre
     SkinPlanos.definirGateway({ nome: "…", iniciar: async function (pedido) {…} })
   (pedido = {id, codigo, plano, ciclo, valor_primeira, valor_recorrente, …}).
   Sem gateway, o checkout reserva o pedido e avisa que o pagamento abre em breve.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.SkinPlanos) return;

  var CFG = window.RELATORIO_SUPABASE_CONFIG || {
    url: "https://vgceathgwvtmjxbdpecr.supabase.co",
    publishableKey: "sb_publishable_ba-g-ww4KwM2Wq0x2vsGVg_x_9pTqUQ",
    authStorageKey: "relatorio-2026-admin-auth",
    adminEmail: "10pauloacre@gmail.com"
  };
  var VERSAO_TERMOS = "2026-09-26";
  var SITE = "https://relatorio.skin";

  // Catálogo (espelho de public.planos; o banco é a fonte da verdade).
  var PLANOS = {
    gratis: { id: "gratis", nome: "Grátis", mensal: 0, anual: 0, limites: { diario_dia: 1, diario_mes: null, ia_mes: 30, documento_mes: 3 } },
    pro: { id: "pro", nome: "PRO", mensal: 49.90, anual: 538.92, limites: { diario_dia: null, diario_mes: 400, ia_mes: 500, documento_mes: 150 } },
    plus: { id: "plus", nome: "Plus", mensal: 99.90, anual: 1078.92, promo: 1.00, limites: {}, biblioteca: true }
  };
  var REC = {
    diario: { um: "diário", varios: "diários", titulo: "Diários de aula", ic: "📝" },
    ia: { um: "pedido à I.A.", varios: "pedidos à I.A.", titulo: "Pedidos à I.A.", ic: "🤖" },
    documento: { um: "documento", varios: "documentos", titulo: "Documentos e relatórios", ic: "📄" }
  };
  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  var S = { status: null, carregando: null, cliente: null, ouvintes: [], gateway: null, avisados: {} };

  // ── utilidades ─────────────────────────────────────────────────────────
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
  var FMT = null;
  function brl(v) {
    try { FMT = FMT || new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }); return FMT.format(Number(v || 0)); }
    catch (e) { return "R$ " + Number(v || 0).toFixed(2).replace(".", ","); }
  }
  function hojeKey() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function mesAtual() { return MESES[new Date().getMonth()]; }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function toast(msg, acao) {
    estilo();
    var t = document.createElement("div");
    t.className = "sp-toast";
    t.setAttribute("role", "status");
    t.innerHTML = "<span>" + msg + "</span>" + (acao ? '<button type="button">' + esc(acao.rotulo) + "</button>" : "") + '<button type="button" class="x" aria-label="Fechar">✕</button>';
    document.body.appendChild(t);
    if (acao) t.querySelector("button").onclick = function () { t.remove(); acao.fn(); };
    t.querySelector(".x").onclick = function () { t.remove(); };
    setTimeout(function () { t.classList.add("on"); }, 20);
    setTimeout(function () { t.classList.remove("on"); setTimeout(function () { t.remove(); }, 400); }, acao ? 12000 : 5000);
  }

  // ── conta e cliente do banco ───────────────────────────────────────────
  function sessao() {
    var s = lsGet(CFG.authStorageKey);
    s = s && (s.currentSession || s);
    return s && s.refresh_token ? s : null;
  }
  function temConta() { return !!sessao(); }
  function emailConta() { var s = sessao(); return String((s && s.user && s.user.email) || "").toLowerCase(); }
  function ehAdmin() { return emailConta() === String(CFG.adminEmail || "10pauloacre@gmail.com").toLowerCase(); }
  function cliente() {
    var R = window.RelatorioSupabaseSync;
    if (R && R.getClient) { var c = R.getClient(); if (c) return c; }
    if (!S.cliente && window.supabase && window.supabase.createClient) {
      S.cliente = window.supabase.createClient(CFG.url, CFG.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: CFG.authStorageKey }
      });
    }
    return S.cliente;
  }
  async function rpc(nome, args) {
    var c = cliente();
    if (!c) throw new Error("Sem conexão com a plataforma.");
    var r = await c.rpc(nome, args || {});
    if (r.error) throw new Error(r.error.message || "Falha ao falar com a plataforma.");
    return r.data;
  }

  // ── situação do plano ──────────────────────────────────────────────────
  function aoMudar(fn) { S.ouvintes.push(fn); if (S.status) try { fn(S.status); } catch (e) {} }
  function avisar() { S.ouvintes.forEach(function (fn) { try { fn(S.status); } catch (e) {} }); }
  function carregar(forcar) {
    if (!temConta()) return Promise.resolve(null);
    if (S.carregando && !forcar) return S.carregando;
    S.carregando = rpc("plano_status", { p_dia: hojeKey() }).then(function (st) {
      S.status = st;
      lsSet("skin-plano-cache", { em: Date.now(), email: emailConta(), st: st });
      avisar();
      return st;
    }).catch(function (e) {
      console.warn("[SkinPlanos] status indisponível:", e.message);
      var c = lsGet("skin-plano-cache");
      if (c && c.email === emailConta() && !S.status) { S.status = c.st; avisar(); }
      return S.status;
    });
    return S.carregando;
  }
  function planoId() { return (S.status && S.status.plano && S.status.plano.id) || "gratis"; }
  function planoNome() { return (S.status && S.status.plano && S.status.plano.nome) || PLANOS[planoId()].nome; }
  function modoAtivo() { return !!(S.status && S.status.modo === "ativo"); }
  function limitesAtuais() { return (S.status && S.status.plano && S.status.plano.limites) || PLANOS[planoId()].limites; }

  // Uso e limite de um recurso (período = dia para o diário no Grátis).
  function situacao(recurso) {
    var L = limitesAtuais(), U = (S.status && S.status.uso) || {};
    if (recurso === "diario" && L.diario_dia) return { usado: U.diario_dia || 0, limite: L.diario_dia, periodo: "dia" };
    var lim = L[recurso + "_mes"];
    return { usado: U[recurso + "_mes"] || 0, limite: lim == null ? null : lim, periodo: "mes" };
  }
  function renovaTexto(periodo) {
    if (periodo === "dia") return "amanhã (1 diário por dia letivo)";
    var r = S.status && S.status.renova_em;
    if (r) { var p = String(r).split("-"); return "em 1º de " + MESES[parseInt(p[1], 10) - 1]; }
    return "no próximo mês";
  }

  // Sem gastar: a ação caberia no plano? (usa o que já foi carregado)
  function pode(recurso, op) {
    op = op || {};
    if (!temConta() || ehAdmin() || !S.status || (S.status && S.status.admin)) return true;
    var s = situacao(recurso);
    if (s.limite == null) return true;
    if (recurso === "diario" && s.periodo === "dia" && op.dia && op.dia !== hojeKey()) return true; // outra data: o servidor confere
    return s.usado + (op.qtd || 1) <= s.limite;
  }
  function contarLocal(recurso, r) {
    if (!S.status || !S.status.uso) return;
    var U = S.status.uso;
    if (r && r.usado_mes != null) U[recurso + "_mes"] = r.usado_mes;
    else U[recurso + "_mes"] = (U[recurso + "_mes"] || 0) + 1;
    if (recurso === "diario" && r && r.usado_dia != null && (!r.dia || r.dia === hojeKey())) U.diario_dia = r.usado_dia;
    avisar();
  }
  function depoisDeConsumir(recurso, r, op) {
    if (!r || r.repetido) return;
    contarLocal(recurso, r);
    if (r.excedeu && !r.bloqueado) avisoLancamento(recurso, r, op);
    else proximoDoLimite(recurso);
  }

  // Síncrono (para ações que abrem janela no clique): decide pelo que já foi
  // carregado e registra o uso em segundo plano.
  function tentar(recurso, op) {
    op = op || {};
    if (!temConta() || ehAdmin() || (S.status && S.status.admin)) return true;
    if (!pode(recurso, op) && modoAtivo()) { limite(recurso, { origem: op.origem }); return false; }
    rpc("plano_consumir", { p_recurso: recurso, p_ref: op.ref || null, p_dia: op.dia || null })
      .then(function (r) { depoisDeConsumir(recurso, r, op); })
      .catch(function () { contarLocal(recurso); });
    return true;
  }

  // Assíncrono (o servidor decide): true = pode seguir.
  async function usar(recurso, op) {
    op = op || {};
    if (!temConta() || ehAdmin()) return true;
    if (!S.status) await carregar();
    if (S.status && S.status.admin) return true;
    var r;
    try { r = await rpc("plano_consumir", { p_recurso: recurso, p_ref: op.ref || null, p_dia: op.dia || null }); }
    catch (e) { return tentar(recurso, op); }
    if (r && r.bloqueado) {
      if (S.status && S.status.uso) { if (r.usado_mes != null) S.status.uso[recurso + "_mes"] = r.usado_mes; if (recurso === "diario" && r.usado_dia != null) S.status.uso.diario_dia = r.usado_dia; }
      limite(recurso, { origem: op.origem, resp: r, dia: op.dia });
      return false;
    }
    depoisDeConsumir(recurso, r, op);
    return true;
  }

  // Antes de começar uma ação longa (ex.: Novo Diário com I.A.): confere sem gastar.
  async function verificar(recurso, op) {
    op = op || {};
    if (!temConta() || ehAdmin()) return true;
    if (!modoAtivo() && S.status) return true;
    try {
      var st = await rpc("plano_status", { p_dia: op.dia || hojeKey() });
      if (st && st.admin) return true;
      var L = (st.plano && st.plano.limites) || {}, U = st.uso || {};
      if (st.modo !== "ativo") return true;
      var bloqueado = recurso === "diario"
        ? (L.diario_dia != null && (U.diario_dia || 0) >= L.diario_dia) || (L.diario_mes != null && (U.diario_mes || 0) >= L.diario_mes)
        : (L[recurso + "_mes"] != null && (U[recurso + "_mes"] || 0) >= L[recurso + "_mes"]);
      if (bloqueado) { limite(recurso, { origem: op.origem, dia: op.dia }); return false; }
    } catch (e) {}
    return true;
  }

  // ── eventos do funil ───────────────────────────────────────────────────
  function evento(nome, dados) {
    try { var c = cliente(); if (c) c.rpc("plano_evento", { p_evento: nome, p_dados: dados || {} }).then(function () {}, function () {}); } catch (e) {}
  }

  // ── visual (injetado; tokens da marca, funciona no claro e no escuro) ──
  function estilo() {
    if (document.getElementById("sp-estilo")) return;
    var s = document.createElement("style");
    s.id = "sp-estilo";
    s.textContent = ""
      + ".sp-ov{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(6,7,6,.72);backdrop-filter:blur(3px);opacity:0;transition:opacity .25s}"
      + ".sp-ov.on{opacity:1}.sp-ov *{box-sizing:border-box}"
      + ".sp-mod{position:relative;width:100%;max-width:640px;max-height:94vh;overflow:auto;border-radius:20px;background:#131512;color:#F3F1E9;border:1px solid #30352D;box-shadow:0 40px 100px rgba(0,0,0,.65);padding:26px 24px 22px;font:15px/1.5 Inter,system-ui,-apple-system,'Segoe UI',sans-serif;transform:translateY(14px) scale(.98);transition:transform .35s cubic-bezier(.22,1,.36,1)}"
      + ".sp-ov.on .sp-mod{transform:none}"
      + ".sp-mod h3{margin:6px 0 6px;font:800 1.35rem/1.2 Manrope,Inter,sans-serif;letter-spacing:-.02em;color:#F3F1E9}"
      + ".sp-mod p{margin:0 0 12px;color:#B6B7AE}.sp-mod b{color:#F3F1E9}"
      + ".sp-x{position:absolute;right:12px;top:12px;width:36px;height:36px;border-radius:50%;border:1px solid #30352D;background:#181B17;color:#B6B7AE;font-size:.95rem;cursor:pointer}"
      + ".sp-x:hover{color:#F3F1E9;border-color:#A7B58A}"
      + ".sp-ic{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;font-size:1.6rem;background:radial-gradient(circle at 30% 30%,rgba(194,206,158,.35),rgba(167,181,138,.08));border:1px solid rgba(194,206,158,.35)}"
      + ".sp-barra{height:10px;border-radius:99px;background:#20231E;overflow:hidden;margin:10px 0 6px}.sp-barra i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#A7B58A,#C2CE9E)}"
      + ".sp-barra.cheia i{background:linear-gradient(90deg,#C29A5B,#B9635D)}"
      + ".sp-mini{font-size:.8rem;color:#8A8E84}"
      + ".sp-opcoes{display:grid;gap:10px;margin:16px 0 12px}@media(min-width:560px){.sp-opcoes{grid-template-columns:1fr 1fr}}"
      + ".sp-op{position:relative;border-radius:14px;padding:16px 16px 14px;background:#181B17;border:1px solid #30352D;display:flex;flex-direction:column;gap:6px}"
      + ".sp-op.destaque{border-color:#A7B58A;box-shadow:0 0 0 1px rgba(167,181,138,.35),0 18px 40px -20px rgba(167,181,138,.45)}"
      + ".sp-op .tag{position:absolute;top:-10px;left:14px;padding:3px 10px;border-radius:99px;background:linear-gradient(135deg,#B89B69,#D6CBB8);color:#141711;font:800 .66rem/1.4 Manrope,sans-serif;letter-spacing:.08em;text-transform:uppercase}"
      + ".sp-op strong{font:800 1.05rem/1.2 Manrope,sans-serif}.sp-op .preco{font:800 1.4rem/1.1 Manrope,sans-serif;color:#F3F1E9}.sp-op .preco small{font-size:.78rem;color:#8A8E84;font-weight:600}"
      + ".sp-op ul{margin:4px 0 8px;padding:0;list-style:none;font-size:.84rem;color:#B6B7AE}.sp-op li{padding:2px 0 2px 20px;position:relative}.sp-op li::before{content:'✓';position:absolute;left:0;color:#C2CE9E;font-weight:800}"
      + ".sp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 18px;border-radius:10px;border:1px solid #3B4137;background:#20231E;color:#F3F1E9;font:700 .92rem/1 Inter,sans-serif;cursor:pointer;text-decoration:none;transition:transform .15s,box-shadow .2s,background .2s}"
      + ".sp-btn:hover{transform:translateY(-1px)}"
      + ".sp-btn.pri{border:0;background:linear-gradient(135deg,#A7B58A,#C2CE9E);color:#141711;box-shadow:0 10px 26px -10px rgba(167,181,138,.6)}"
      + ".sp-btn.ouro{border:0;background:linear-gradient(135deg,#B89B69,#D6CBB8);color:#141711}"
      + ".sp-btn.lnk{background:none;border:0;color:#A7B58A;min-height:36px;padding:0 6px;text-decoration:underline}"
      + ".sp-btn[disabled]{opacity:.55;cursor:progress;transform:none}"
      + ".sp-ind{margin-top:10px;padding:12px 14px;border-radius:12px;background:rgba(184,155,105,.1);border:1px dashed rgba(214,203,184,.35);font-size:.86rem;color:#D6CBB8;display:flex;flex-wrap:wrap;align-items:center;gap:8px}"
      + ".sp-cod{font:800 .95rem/1 Manrope,monospace;letter-spacing:.08em;padding:6px 10px;border-radius:8px;background:#0D0E0D;border:1px solid #3B4137;color:#F3F1E9}"
      + ".sp-rodape{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-top:12px}"
      + ".sp-aviso{padding:10px 12px;border-radius:10px;background:rgba(194,154,91,.12);border:1px solid rgba(194,154,91,.35);color:#E7CFA4;font-size:.84rem;margin:8px 0}"
      + ".sp-toast{position:fixed;right:16px;bottom:16px;z-index:2147482000;max-width:min(430px,calc(100vw - 32px));display:flex;align-items:center;gap:10px;padding:12px 12px 12px 16px;border-radius:14px;background:#181B17;color:#F3F1E9;border:1px solid #3B4137;box-shadow:0 20px 50px rgba(0,0,0,.5);font:600 .88rem/1.4 Inter,sans-serif;transform:translateY(20px);opacity:0;transition:all .35s cubic-bezier(.22,1,.36,1)}"
      + ".sp-toast.on{transform:none;opacity:1}.sp-toast button{flex-shrink:0;border:0;border-radius:9px;background:linear-gradient(135deg,#A7B58A,#C2CE9E);color:#141711;font:800 .8rem Inter,sans-serif;padding:8px 12px;cursor:pointer}"
      + ".sp-toast button.x{background:none;color:#8A8E84;padding:4px 6px}"
      // checkout
      + ".sp-ck-planos{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}"
      + ".sp-ck-pl{border-radius:12px;padding:12px;border:1px solid #30352D;background:#181B17;color:#F3F1E9;text-align:left;cursor:pointer;font:inherit}"
      + ".sp-ck-pl.on{border-color:#A7B58A;box-shadow:0 0 0 1px rgba(167,181,138,.5)}.sp-ck-pl b{display:block;font:800 1rem Manrope,sans-serif}.sp-ck-pl small{color:#8A8E84}"
      + ".sp-ciclo{display:inline-flex;padding:4px;border-radius:99px;background:#0D0E0D;border:1px solid #30352D;margin:4px 0 12px}"
      + ".sp-ciclo button{border:0;border-radius:99px;padding:8px 14px;background:none;color:#B6B7AE;font:700 .84rem Inter,sans-serif;cursor:pointer}"
      + ".sp-ciclo button.on{background:#20231E;color:#C2CE9E;box-shadow:inset 0 0 0 1px #3C4237}.sp-ciclo em{font-style:normal;color:#D6CBB8;font-size:.72rem;margin-left:4px}"
      + ".sp-resumo{border-radius:14px;padding:14px 16px;background:#0D0E0D;border:1px solid #30352D;margin:6px 0 14px}"
      + ".sp-resumo .lin{display:flex;justify-content:space-between;gap:10px;padding:4px 0;font-size:.9rem;color:#B6B7AE}"
      + ".sp-resumo .lin b{color:#F3F1E9}.sp-resumo .tot{border-top:1px solid #262B23;margin-top:6px;padding-top:10px;font-size:1.02rem}"
      + ".sp-resumo .eco{color:#C2CE9E;font-weight:700}"
      + ".sp-f{display:block;margin:10px 0 4px;font:700 .72rem Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#8A8E84}"
      + ".sp-in{width:100%;min-height:44px;padding:0 12px;border-radius:10px;border:1px solid #30352D;background:#0D0E0D;color:#F3F1E9;font:1rem Inter,sans-serif;outline:none}"
      + ".sp-in:focus{border-color:#A7B58A;box-shadow:0 0 0 3px rgba(167,181,138,.18)}"
      + ".sp-chk{display:flex;gap:10px;align-items:flex-start;margin:10px 0;font-size:.86rem;color:#B6B7AE;cursor:pointer}"
      + ".sp-chk input{margin-top:3px;width:18px;height:18px;accent-color:#A7B58A;flex-shrink:0}.sp-chk a{color:#C2CE9E}"
      + ".sp-selos{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:12px;font-size:.76rem;color:#8A8E84}"
      + ".sp-ok-ic{font-size:2.2rem}"
      + ".sp-err{min-height:18px;color:#E09A95;font-size:.84rem;margin-top:6px}"
      // cartões (perfil, escolas)
      + ".sp-card{border-radius:16px;padding:18px;background:var(--sp-card-bg,#181B17);color:var(--sp-card-tx,#F3F1E9);border:1px solid var(--sp-card-bd,#30352D)}"
      + ".sp-card h4{margin:0 0 4px;font:800 1.05rem Manrope,sans-serif}"
      + ".sp-medidor{margin:12px 0}.sp-medidor .top{display:flex;justify-content:space-between;font-size:.84rem;gap:8px}"
      + ".sp-selo{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:99px;font:800 .72rem/1 Manrope,sans-serif;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;border:1px solid rgba(194,206,158,.45);color:#C2CE9E;background:rgba(19,21,18,.7)}"
      + ".sp-selo.pro{background:linear-gradient(135deg,#A7B58A,#C2CE9E);color:#141711;border:0}.sp-selo.plus{background:linear-gradient(135deg,#B89B69,#D6CBB8);color:#141711;border:0}"
      + "@media(max-width:560px){.sp-mod{padding:22px 16px 18px;border-radius:18px}.sp-ov{align-items:flex-end;padding:0}.sp-ov .sp-mod{border-radius:20px 20px 0 0;max-height:92vh}}"
      + "@media(prefers-reduced-motion:reduce){.sp-ov,.sp-mod,.sp-toast{transition:none}}";
    (document.head || document.documentElement).appendChild(s);
  }
  function janela(html, ligar) {
    estilo();
    var ov = document.createElement("div");
    ov.className = "sp-ov";
    ov.setAttribute("data-runtime-ui", "planos");
    ov.innerHTML = '<div class="sp-mod" role="dialog" aria-modal="true">' + '<button type="button" class="sp-x" aria-label="Fechar">✕</button>' + html + "</div>";
    document.body.appendChild(ov);
    function fechar() { ov.classList.remove("on"); setTimeout(function () { ov.remove(); }, 250); document.removeEventListener("keydown", tecla); }
    function tecla(e) { if (e.key === "Escape") fechar(); }
    ov.querySelector(".sp-x").onclick = fechar;
    ov.addEventListener("mousedown", function (e) { if (e.target === ov) fechar(); });
    document.addEventListener("keydown", tecla);
    requestAnimationFrame(function () { ov.classList.add("on"); });
    if (ligar) ligar(ov, fechar);
    return { ov: ov, fechar: fechar };
  }

  // ── modal de limite (upgrade) ──────────────────────────────────────────
  // "hoje" ou "em 25/09" (o limite do Grátis vale pela data da aula).
  function quando(dia) { return !dia || dia === hojeKey() ? "hoje" : "em " + dia.slice(8, 10) + "/" + dia.slice(5, 7); }
  function fraseLimite(recurso, s, dia) {
    var n = s.limite, R = REC[recurso];
    if (recurso === "diario" && s.periodo === "dia") return "No plano Grátis é <b>1 diário por dia letivo</b>, e o diário de " + (quando(dia) === "hoje" ? "hoje" : quando(dia).slice(3)) + " já foi registrado. Com o PRO você registra todas as suas turmas, todos os dias.";
    if (recurso === "diario") return "Você registrou os <b>" + n + " diários</b> do plano " + esc(planoNome()) + " em " + mesAtual() + ". No Plus, os diários não têm limite.";
    if (recurso === "ia") return "Você usou os <b>" + n + " pedidos à I.A.</b> do plano " + esc(planoNome()) + " em " + mesAtual() + ". Sequências, provas, diários e comunicados continuam a um clique no PRO e no Plus.";
    if (recurso === "documento") return "Você emitiu os <b>" + n + " " + (n === 1 ? R.um : R.varios) + "</b> do plano " + esc(planoNome()) + " em " + mesAtual() + " (frequência, relatórios e exportações).";
    return "Você chegou ao limite de " + esc(R.varios) + " do plano " + esc(planoNome()) + ".";
  }
  function blocoIndicacao() {
    var cod = S.status && S.status.indicacao && S.status.indicacao.codigo;
    if (!cod) return "";
    return '<div class="sp-ind">🎁 <span>Indique um colega: quando ele confirmar o e-mail, <b>você ganha 1 mês de PRO</b>.</span>'
      + '<span class="sp-cod">' + esc(cod) + '</span><button type="button" class="sp-btn" data-sp="copiar">Copiar convite</button>'
      + '<a class="sp-btn" data-sp="whats" target="_blank" rel="noopener" href="' + esc(linkWhats(cod)) + '">WhatsApp</a></div>';
  }
  function cartoesUpgrade(recurso, promoPlus) {
    var alvo = planoId();
    var pro = alvo === "gratis"
      ? '<div class="sp-op destaque"><span class="tag">Mais escolhido</span><strong>PRO</strong><div class="preco">' + brl(PLANOS.pro.mensal) + '<small> /mês</small></div>'
        + '<ul><li>400 diários por mês, sem limite por dia</li><li>500 pedidos à I.A. por mês</li><li>150 documentos e relatórios por mês</li></ul>'
        + '<button type="button" class="sp-btn pri" data-sp="assinar" data-plano="pro">Assinar o PRO</button></div>'
      : "";
    var plus = '<div class="sp-op' + (alvo !== "gratis" ? " destaque" : "") + '"><span class="tag">' + (promoPlus ? "R$ 1 no 1º mês" : "Sem limites") + '</span><strong>Plus</strong>'
      + '<div class="preco">' + (promoPlus ? brl(1) + '<small> no 1º mês · depois ' + brl(PLANOS.plus.mensal) + '</small>' : brl(PLANOS.plus.mensal) + "<small> /mês</small>") + "</div>"
      + '<ul><li>Tudo sem limites</li><li>Integração com a Biblioteca Digital</li><li>Suporte prioritário</li></ul>'
      + '<button type="button" class="sp-btn ' + (alvo === "gratis" ? "ouro" : "pri") + '" data-sp="assinar" data-plano="plus">' + (promoPlus ? "Testar o Plus por R$ 1" : "Assinar o Plus") + "</button></div>";
    return '<div class="sp-opcoes">' + pro + plus + "</div>";
  }
  function ligarComuns(ov, fechar, origem) {
    ov.querySelectorAll('[data-sp="assinar"]').forEach(function (b) {
      b.onclick = function () { evento("limite_cta", { plano: b.getAttribute("data-plano"), origem: origem }); fechar(); checkout({ plano: b.getAttribute("data-plano"), ciclo: "mensal", origem: origem }); };
    });
    var cp = ov.querySelector('[data-sp="copiar"]');
    if (cp) cp.onclick = function () { copiarConvite(); cp.textContent = "Copiado ✓"; };
    var wz = ov.querySelector('[data-sp="whats"]');
    if (wz) wz.onclick = function () { evento("indicacao_whatsapp", { origem: origem }); };
    var ver = ov.querySelector('[data-sp="ver"]');
    if (ver) ver.onclick = function () { fechar(); irParaPlanos(origem); };
  }
  function limite(recurso, op) {
    op = op || {};
    var s = situacao(recurso), R = REC[recurso] || REC.documento, origem = "limite-" + recurso;
    // Números vindos da resposta do servidor valem mais que o que está em memória.
    var r = op.resp;
    if (r && r.motivo === "limite-dia" && r.limite_dia != null) s = { usado: r.usado_dia, limite: r.limite_dia, periodo: "dia" };
    else if (r && r.limite_mes != null) s = { usado: r.usado_mes, limite: r.limite_mes, periodo: "mes" };
    else if (op.usado != null && op.limite != null) s = { usado: op.usado, limite: op.limite, periodo: op.periodo || s.periodo };
    var promoPlus = !S.status || S.status.promo_plus !== false;
    evento("limite_modal", { recurso: recurso, plano: planoId(), modo: S.status && S.status.modo });
    var pct = s.limite ? Math.min(100, Math.round(s.usado / s.limite * 100)) : 100;
    return janela('<div class="sp-ic">' + R.ic + "</div>"
      + "<h3>Você chegou ao limite do plano " + esc(planoNome()) + "</h3>"
      + "<p>" + fraseLimite(recurso, s, op.dia) + "</p>"
      + '<div class="sp-barra cheia"><i style="width:' + pct + '%"></i></div>'
      + '<div class="sp-mini">' + (s.limite != null ? Math.min(s.usado, s.limite) + " de " + s.limite + " " + R.varios + (s.periodo === "dia" ? " " + quando(op.dia) : " em " + mesAtual()) + " · " : "") + "o limite renova " + renovaTexto(s.periodo) + "</div>"
      + cartoesUpgrade(recurso, promoPlus)
      + blocoIndicacao()
      + '<div class="sp-rodape"><button type="button" class="sp-btn lnk" data-sp="ver">Comparar todos os planos</button><span class="sp-mini">Cancele quando quiser · 7 dias de garantia</span></div>',
      function (ov, fechar) { ligarComuns(ov, fechar, origem); });
  }

  // Modo lançamento: passou do limite, mas segue liberado. Aviso uma vez por recurso no mês.
  function avisoLancamento(recurso, r, op) {
    var chave = "skin-aviso-" + recurso + "-" + (situacao(recurso).periodo === "dia" ? hojeKey() : hojeKey().slice(0, 7));
    if (S.avisados[chave] || lsGet(chave)) return;
    S.avisados[chave] = 1; lsSet(chave, 1);
    var R = REC[recurso] || REC.documento, s = situacao(recurso), origem = "lancamento-" + recurso;
    evento("limite_modal", { recurso: recurso, plano: planoId(), modo: "lancamento" });
    janela('<div class="sp-ic">' + R.ic + "</div>"
      + "<h3>Você passou do limite do plano " + esc(planoNome()) + "</h3>"
      + "<p>" + fraseLimite(recurso, s, op && op.dia) + "</p>"
      + '<div class="sp-aviso">🎉 <b>Período de lançamento:</b> por enquanto a plataforma continua liberada. Quando os pagamentos abrirem, o limite passa a valer — garanta agora a condição de lançamento.</div>'
      + cartoesUpgrade(recurso, !S.status || S.status.promo_plus !== false)
      + blocoIndicacao()
      + '<div class="sp-rodape"><button type="button" class="sp-btn" data-sp="seguir">Continuar no Grátis por enquanto</button><button type="button" class="sp-btn lnk" data-sp="ver">Comparar os planos</button></div>',
      function (ov, fechar) { ligarComuns(ov, fechar, origem); ov.querySelector('[data-sp="seguir"]').onclick = fechar; });
  }

  // Aos 80%: um lembrete leve (uma vez por recurso no mês).
  function proximoDoLimite(recurso) {
    var s = situacao(recurso);
    if (s.limite == null || s.periodo === "dia" || s.limite < 3) return;
    if (s.usado / s.limite < 0.8 || s.usado >= s.limite) return;
    var chave = "skin-80-" + recurso + "-" + hojeKey().slice(0, 7);
    if (lsGet(chave)) return;
    lsSet(chave, 1);
    evento("nudge_80", { recurso: recurso, plano: planoId() });
    toast("Você já usou " + s.usado + " de " + s.limite + " " + REC[recurso].varios + " de " + mesAtual() + " no plano " + esc(planoNome()) + ".",
      { rotulo: "Ver planos", fn: function () { irParaPlanos("nudge-" + recurso); } });
  }

  // ── I.A.: a cota volta das Edge Functions (ia_consumir_cota) ─────────────
  // Depois de uma resposta: atualiza o uso e avisa no lançamento ou aos 80%.
  function aposIA(c) {
    if (!c || c.ilimitado || !S.status || !S.status.uso || c.periodo !== "mes") return;
    if (c.usado != null) S.status.uso.ia_mes = c.usado;
    avisar();
    if (c.excedeu) avisoLancamento("ia", { periodo: "mes" });
    else proximoDoLimite("ia");
  }
  // Pedido recusado (429). Devolve true quando foi o limite do plano (modal aberto).
  function limiteIA(c) {
    if (!c || c.periodo !== "mes") return false;
    if (S.status && S.status.uso && c.usado != null) { S.status.uso.ia_mes = c.usado; avisar(); }
    limite("ia", { origem: "ia", usado: c.usado, limite: c.limite, periodo: "mes" });
    return true;
  }

  // ── indicação ──────────────────────────────────────────────────────────
  function linkConvite(cod) { return SITE + "/?ref=" + encodeURIComponent(cod); }
  function textoConvite(cod) {
    return "Oi! Uso o RELATORIO SKIN para fazer diário, chamada, frequência e planejamento em minutos, com I.A. que conhece as minhas turmas. "
      + "Crie sua conta grátis com o meu código " + cod + " e ganhe 7 dias de PRO: " + linkConvite(cod);
  }
  function linkWhats(cod) { return "https://wa.me/?text=" + encodeURIComponent(textoConvite(cod)); }
  function copiarConvite() {
    var cod = S.status && S.status.indicacao && S.status.indicacao.codigo;
    if (!cod) return;
    evento("indicacao_copiar", {});
    var txt = textoConvite(cod);
    try { navigator.clipboard.writeText(txt); } catch (e) {
      var t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch (x) {} t.remove();
    }
    toast("Convite copiado. Cole no WhatsApp, no grupo da escola ou no e-mail.");
  }
  function compartilhar() {
    var cod = S.status && S.status.indicacao && S.status.indicacao.codigo;
    if (!cod) return;
    if (navigator.share) {
      navigator.share({ title: "RELATORIO SKIN", text: textoConvite(cod) }).then(function () { evento("indicacao_share", {}); }, function () {});
    } else copiarConvite();
  }
  // Guarda o código que veio no link (?ref=) por 60 dias.
  // Primeira origem da visita (utm_*, página de entrada), para saber de onde vêm as contas.
  function capturarOrigem() {
    try {
      if (lsGet("skin-origem")) return;
      var q = new URLSearchParams(location.search), o = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (k) { var v = q.get(k); if (v) o[k.slice(4)] = v.slice(0, 60); });
      if (document.referrer && document.referrer.indexOf(location.host) < 0) o.referrer = document.referrer.replace(/^https?:\/\//, "").split("/")[0].slice(0, 60);
      o.entrada = location.pathname.split("/").pop() || "index.html";
      o.em = Date.now();
      lsSet("skin-origem", o);
    } catch (e) {}
  }
  function origemCadastro() {
    var o = lsGet("skin-origem") || {};
    return [o.source, o.medium, o.campaign, o.referrer, o.entrada].filter(Boolean).join("|").slice(0, 160);
  }
  function capturarRef() {
    try {
      var q = new URLSearchParams(location.search);
      var c = (q.get("ref") || q.get("indicacao") || q.get("convite") || "").trim().toUpperCase();
      if (/^[A-Z]{2,8}-[A-Z0-9]{4}$/.test(c)) lsSet("skin-ref", { codigo: c, em: Date.now() });
    } catch (e) {}
  }
  function refGuardado() {
    var r = lsGet("skin-ref");
    if (!r || !r.codigo || Date.now() - (r.em || 0) > 60 * 86400000) return "";
    return r.codigo;
  }
  // Conta nova que veio por um link de indicação (ex.: entrou com o Google).
  async function registrarRefPendente() {
    var cod = refGuardado();
    if (!cod || !S.status || !S.status.indicacao || S.status.indicacao.fui_indicado) { if (cod && S.status && S.status.indicacao && S.status.indicacao.fui_indicado) lsSet("skin-ref", null); return; }
    try {
      var r = await rpc("indicacao_registrar", { p_codigo: cod });
      lsSet("skin-ref", null);
      if (r && r.ok) {
        toast(r.status === "confirmada" ? "🎁 Indicação confirmada: você ganhou 7 dias de PRO!" : "🎁 Indicação registrada! Confirme o seu e-mail no perfil e ganhe 7 dias de PRO.");
        carregar(true);
      }
    } catch (e) {}
  }

  // ── consentimentos ─────────────────────────────────────────────────────
  function soDigitos(v) { return String(v || "").replace(/\D/g, ""); }
  function telValido(v) { var d = soDigitos(v); if (d.length === 12 || d.length === 13) d = d.replace(/^55/, ""); return d.length === 10 || d.length === 11; }
  function mascaraTel(el) {
    el.addEventListener("input", function () {
      var d = soDigitos(el.value).replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
      el.value = d.length > 6 ? "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(-4) : d.length > 2 ? "(" + d.slice(0, 2) + ") " + d.slice(2) : d;
    });
  }
  async function consentir(canal, aceito, contato, origem) {
    var r = await rpc("consentimento_registrar", { p_canal: canal, p_aceito: !!aceito, p_contato: contato || null, p_origem: origem || "pagina" });
    if (r && r.ok === false) throw new Error(r.motivo === "telefone-invalido" ? "Confira o número do WhatsApp (com DDD)." : "Não foi possível salvar agora.");
    if (S.status) { S.status.consentimentos = S.status.consentimentos || {}; S.status.consentimentos[canal] = { aceito: !!aceito, contato: r && r.contato, em: new Date().toISOString() }; avisar(); }
    return r;
  }

  // ── checkout ───────────────────────────────────────────────────────────
  function irParaPlanos(origem) {
    var base = /planos\.html$/.test(location.pathname) ? "" : "planos.html";
    evento("planos_ir", { origem: origem || "" });
    if (!base) { var el = document.getElementById("planos"); if (el) el.scrollIntoView({ behavior: "smooth" }); return; }
    location.href = base + "?origem=" + encodeURIComponent(origem || "app");
  }
  function valores(plano, ciclo, promoPlus) {
    var P = PLANOS[plano];
    if (ciclo === "anual") return { hoje: P.anual, depois: P.anual, rotuloDepois: "por ano", mensalEq: P.anual / 12, economia: P.mensal * 12 - P.anual };
    if (plano === "plus" && promoPlus) return { hoje: P.promo, depois: P.mensal, rotuloDepois: "por mês a partir do 2º mês", promo: true, economia: P.mensal - P.promo };
    return { hoje: P.mensal, depois: P.mensal, rotuloDepois: "por mês", economia: 0 };
  }
  function definirGateway(g) { S.gateway = g && typeof g.iniciar === "function" ? g : null; }
  function rotuloPagar() { return S.gateway ? "Continuar para o pagamento" : "Reservar a condição de lançamento"; }

  // Preços e regras vindos do banco (public.planos e public.planos_config, leitura pública).
  var catalogoPromessa = null;
  function catalogo() {
    if (catalogoPromessa) return catalogoPromessa;
    var c = cliente();
    if (!c) return Promise.resolve({ planos: PLANOS, config: {} });
    catalogoPromessa = Promise.all([
      c.from("planos").select("id,nome,preco_mensal,preco_anual,promo_primeiro_mes,limites,recursos").eq("ativo", true),
      c.from("planos_config").select("chave,valor")
    ]).then(function (r) {
      (r[0].data || []).forEach(function (p) {
        var alvo = PLANOS[p.id]; if (!alvo) return;
        alvo.nome = p.nome; alvo.mensal = Number(p.preco_mensal); alvo.anual = Number(p.preco_anual);
        if (p.promo_primeiro_mes != null) alvo.promo = Number(p.promo_primeiro_mes); else delete alvo.promo;
        alvo.limites = p.limites || alvo.limites; alvo.recursos = p.recursos || {};
      });
      var cfg = {};
      (r[1].data || []).forEach(function (x) { cfg[x.chave] = x.valor; });
      S.config = cfg;
      return { planos: PLANOS, config: cfg };
    }).catch(function () { return { planos: PLANOS, config: S.config || {} }; });
    return catalogoPromessa;
  }

  function checkout(op) {
    op = op || {};
    var st = { plano: op.plano === "plus" ? "plus" : "pro", ciclo: op.ciclo === "anual" ? "anual" : "mensal", origem: op.origem || "planos" };
    if (!temConta()) {
      lsSet("skin-intencao", { plano: st.plano, ciclo: st.ciclo, origem: st.origem, em: Date.now() });
      evento("checkout_sem_conta", { plano: st.plano, ciclo: st.ciclo });
      location.href = "entrar.html?modo=criar&volta=planos";
      return;
    }
    if (ehAdmin()) { toast("A conta do administrador já tem tudo liberado."); return; }
    evento("checkout_aberto", { plano: st.plano, ciclo: st.ciclo, origem: st.origem });
    var cons = (S.status && S.status.consentimentos) || {};
    var jaEmail = cons.email && cons.email.aceito, jaWhats = cons.whatsapp && cons.whatsapp.aceito;
    var telAntigo = (cons.whatsapp && cons.whatsapp.contato) || "";
    return janela('<div class="sp-ic">💎</div><h3>Assinar o RELATORIO SKIN</h3>'
      + "<p>Escolha o plano e a forma de cobrança. Você pode mudar ou cancelar quando quiser.</p>"
      + '<div class="sp-ck-planos">'
      + '<button type="button" class="sp-ck-pl" data-pl="pro"><b>PRO</b><small>Limites grandes para o dia a dia</small></button>'
      + '<button type="button" class="sp-ck-pl" data-pl="plus"><b>Plus</b><small>Sem limites + Biblioteca Digital</small></button></div>'
      + '<div class="sp-ciclo" role="group" aria-label="Cobrança"><button type="button" data-ci="mensal">Mensal</button><button type="button" data-ci="anual">Anual <em>−10%</em></button></div>'
      + '<div class="sp-resumo" data-resumo></div>'
      + '<label class="sp-chk"><input type="checkbox" data-c="email"' + (jaEmail ? " checked" : "") + '> <span>Quero receber novidades, dicas de uso e ofertas por <b>e-mail</b>. <small>(opcional)</small></span></label>'
      + '<label class="sp-chk"><input type="checkbox" data-c="whats"' + (jaWhats ? " checked" : "") + '> <span>Quero receber avisos e ofertas pelo <b>WhatsApp</b>. <small>(opcional)</small></span></label>'
      + '<div data-tel ' + (jaWhats ? "" : "hidden") + '><span class="sp-f">WhatsApp com DDD</span><input class="sp-in" data-telefone inputmode="tel" autocomplete="tel" placeholder="(68) 99999-9999" value="' + esc(telAntigo ? telAntigo.replace(/^55/, "") : "") + '"></div>'
      + '<label class="sp-chk"><input type="checkbox" data-c="termos"> <span>Li e aceito os <a href="termos.html#planos" target="_blank" rel="noopener">Termos de Serviço</a> e a <a href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>, incluindo a <b>renovação automática</b> e o cancelamento a qualquer momento.</span></label>'
      + '<div class="sp-err" data-err role="alert"></div>'
      + '<button type="button" class="sp-btn pri" data-sp="pagar" style="width:100%;min-height:50px;font-size:1rem">' + rotuloPagar() + '</button>'
      + '<div class="sp-selos">' + (S.gateway ? "<span>🔒 Pagamento seguro</span>" : "<span>🔒 Nada é cobrado agora</span>") + '<span>↩️ 7 dias de garantia</span><span>✋ Cancele quando quiser</span></div>',
      function (ov, fechar) {
        var promoPlus = !S.status || S.status.promo_plus !== false;
        function desenhar() {
          ov.querySelectorAll("[data-pl]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-pl") === st.plano); });
          ov.querySelectorAll("[data-ci]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-ci") === st.ciclo); });
          var v = valores(st.plano, st.ciclo, promoPlus), P = PLANOS[st.plano];
          var cred = S.status && S.status.creditos_pendentes ? '<div class="lin"><span>🎁 Meses de indicação</span><b>+' + S.status.creditos_pendentes + " dias grátis</b></div>" : "";
          ov.querySelector("[data-resumo]").innerHTML =
            '<div class="lin"><span>Plano</span><b>' + P.nome + " · " + (st.ciclo === "anual" ? "anual" : "mensal") + "</b></div>"
            + (st.ciclo === "anual" ? '<div class="lin"><span>Equivale a</span><b>' + brl(v.mensalEq) + "/mês</b></div>" + '<div class="lin"><span>Economia no ano</span><span class="eco">' + brl(v.economia) + "</span></div>" : "")
            + (v.promo ? '<div class="lin"><span>Oferta de lançamento</span><span class="eco">1º mês por ' + brl(v.hoje) + "</span></div>" : "")
            + cred
            + '<div class="lin tot"><span>Hoje</span><b>' + brl(v.hoje) + "</b></div>"
            + '<div class="lin"><span>Depois</span><span>' + brl(v.depois) + " " + v.rotuloDepois + "</span></div>"
            + (st.plano === "plus" && st.ciclo === "anual" && promoPlus ? '<div class="sp-mini">A oferta de R$ 1 no 1º mês vale no plano mensal.</div>' : "");
        }
        ov.querySelectorAll("[data-pl]").forEach(function (b) { b.onclick = function () { st.plano = b.getAttribute("data-pl"); desenhar(); }; });
        ov.querySelectorAll("[data-ci]").forEach(function (b) { b.onclick = function () { st.ciclo = b.getAttribute("data-ci"); evento("checkout_ciclo", { ciclo: st.ciclo }); desenhar(); }; });
        var cw = ov.querySelector('[data-c="whats"]'), boxTel = ov.querySelector("[data-tel]"), tel = ov.querySelector("[data-telefone]");
        mascaraTel(tel); if (tel.value) tel.dispatchEvent(new Event("input"));
        cw.onchange = function () { boxTel.hidden = !cw.checked; if (cw.checked) tel.focus(); };
        desenhar();
        ov.querySelector('[data-sp="pagar"]').onclick = async function () {
          var btn = this, err = ov.querySelector("[data-err]");
          err.textContent = "";
          if (!ov.querySelector('[data-c="termos"]').checked) { err.textContent = "Para continuar, aceite os Termos e a Política de Privacidade."; return; }
          if (cw.checked && !telValido(tel.value)) { err.textContent = "Digite o WhatsApp com DDD, ou desmarque a opção do WhatsApp."; tel.focus(); return; }
          btn.disabled = true; btn.textContent = "Reservando…";
          try {
            var ce = ov.querySelector('[data-c="email"]').checked;
            if (ce !== !!jaEmail) await consentir("email", ce, null, "checkout");
            if (cw.checked !== !!jaWhats || (cw.checked && soDigitos(tel.value) !== soDigitos(telAntigo).replace(/^55/, ""))) await consentir("whatsapp", cw.checked, tel.value, "checkout");
            var pedido = await rpc("plano_criar_pedido", { p_plano: st.plano, p_ciclo: st.ciclo, p_origem: st.origem,
              p_dados: { termos_versao: VERSAO_TERMOS, termos_aceite_em: new Date().toISOString(), pagina: location.pathname } });
            if (S.gateway) {
              btn.textContent = "Abrindo o pagamento…";
              evento("gateway_iniciar", { plano: st.plano, ciclo: st.ciclo, gateway: S.gateway.nome || "" });
              await S.gateway.iniciar(pedido);
              return;
            }
            fechar();
            pedidoReservado(pedido);
            carregar(true);
          } catch (e) {
            err.textContent = e.message || "Não foi possível continuar agora.";
            btn.disabled = false; btn.textContent = rotuloPagar();
          }
        };
      });
  }
  function pedidoReservado(p) {
    evento("pedido_reservado", { plano: p.plano, ciclo: p.ciclo });
    janela('<div class="sp-ok-ic">✅</div><h3>Pedido reservado!</h3>'
      + "<p>O pagamento online do RELATORIO SKIN abre em breve. Guardamos o seu pedido <b>" + esc(p.codigo) + "</b> com as condições de hoje:</p>"
      + '<div class="sp-resumo"><div class="lin"><span>Plano</span><b>' + esc(p.nome || PLANOS[p.plano].nome) + " · " + (p.ciclo === "anual" ? "anual" : "mensal") + "</b></div>"
      + '<div class="lin"><span>Primeira cobrança</span><b>' + brl(p.valor_primeira) + "</b></div>"
      + '<div class="lin"><span>Depois</span><span>' + brl(p.valor_recorrente) + (p.ciclo === "anual" ? " por ano" : " por mês") + "</span></div></div>"
      + "<p>Avisaremos pelo e-mail da conta" + (S.status && S.status.consentimentos && S.status.consentimentos.whatsapp && S.status.consentimentos.whatsapp.aceito ? " e pelo WhatsApp" : "") + " assim que o pagamento estiver disponível. Nada é cobrado antes disso.</p>"
      + blocoIndicacao()
      + '<div class="sp-rodape"><button type="button" class="sp-btn pri" data-sp="fim">Entendi</button></div>',
      function (ov, fechar) { ligarComuns(ov, fechar, "pedido"); ov.querySelector('[data-sp="fim"]').onclick = fechar; });
  }

  // ── cartões e selos para as páginas ────────────────────────────────────
  function selo(el, op) {
    if (!el) return;
    op = op || {};
    estilo();
    aoMudar(function () {
      var id = planoId();
      if (S.status && S.status.admin) { el.hidden = true; return; }
      el.hidden = false;
      el.className = "sp-selo " + id;
      el.href = "planos.html?origem=selo";
      var a = S.status && S.status.assinatura;
      el.innerHTML = (id === "plus" ? "✦ " : id === "pro" ? "★ " : "") + esc(planoNome()) + (id === "gratis" ? " · Ver planos" : (a && a.status === "teste" ? " · teste" : a && a.status === "cortesia" ? " · cortesia" : ""));
    });
    carregar();
  }
  function medidorHtml(recurso) {
    var s = situacao(recurso), R = REC[recurso];
    if (s.limite == null) return '<div class="sp-medidor"><div class="top"><span>' + R.ic + " " + R.titulo + "</span><b>Ilimitado</b></div></div>";
    var pct = Math.min(100, Math.round(s.usado / s.limite * 100));
    return '<div class="sp-medidor"><div class="top"><span>' + R.ic + " " + R.titulo + '</span><b>' + Math.min(s.usado, 99999) + " / " + s.limite + (s.periodo === "dia" ? " hoje" : " no mês") + "</b></div>"
      + '<div class="sp-barra' + (pct >= 100 ? " cheia" : "") + '"><i style="width:' + pct + '%"></i></div></div>';
  }
  function cartaoPlano(el) {
    if (!el) return;
    estilo();
    aoMudar(function (stt) {
      if (!stt) return;
      if (stt.admin) { el.innerHTML = '<div class="sp-card"><h4>💎 Plano</h4><p class="sp-mini">Conta do administrador: tudo liberado, sem limites.</p></div>'; return; }
      var a = stt.assinatura || {}, id = planoId(), ind = stt.indicacao || {};
      var fim = a.fim ? new Date(a.fim).toLocaleDateString("pt-BR") : "";
      var estado = id === "gratis" ? "Plano gratuito" : a.status === "teste" ? "Teste até " + fim : a.status === "cortesia" ? "Cortesia até " + fim : "Ativo" + (fim ? " · renova em " + fim : "");
      el.innerHTML = '<div class="sp-card">'
        + '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div><h4>💎 Meu plano: ' + esc(planoNome()) + '</h4><div class="sp-mini">' + esc(estado) + (stt.modo !== "ativo" ? " · período de lançamento" : "") + "</div></div>"
        + '<a class="sp-btn ' + (id === "plus" ? "" : "pri") + '" href="planos.html?origem=perfil">' + (id === "gratis" ? "Conhecer PRO e Plus" : id === "pro" ? "Ir para o Plus" : "Ver planos") + "</a></div>"
        + medidorHtml("diario") + medidorHtml("ia") + medidorHtml("documento")
        + (stt.pedido_aberto ? '<div class="sp-aviso">🧾 Pedido ' + esc(stt.pedido_aberto.codigo) + " reservado (" + esc(PLANOS[stt.pedido_aberto.plano] ? PLANOS[stt.pedido_aberto.plano].nome : "") + "). O pagamento abre em breve.</div>" : "")
        + '<div class="sp-ind" style="margin-top:14px">🎁 <span><b>Indique e ganhe:</b> cada colega que criar a conta com o seu código e confirmar o e-mail vale <b>1 mês de PRO</b> para você (e 7 dias para ele).</span>'
        + (ind.codigo ? '<span class="sp-cod">' + esc(ind.codigo) + '</span><button type="button" class="sp-btn" data-sp="copiar">Copiar convite</button><a class="sp-btn" data-sp="whats" target="_blank" rel="noopener" href="' + esc(linkWhats(ind.codigo)) + '">WhatsApp</a>' : "")
        + '<span class="sp-mini" style="width:100%">' + (ind.confirmadas || 0) + " indicação(ões) confirmada(s) · " + (ind.pendentes || 0) + " aguardando confirmação do e-mail</span></div>"
        + "</div>";
      var cp = el.querySelector('[data-sp="copiar"]'); if (cp) cp.onclick = copiarConvite;
      var wz = el.querySelector('[data-sp="whats"]'); if (wz) wz.onclick = function () { evento("indicacao_whatsapp", { origem: "perfil" }); };
    });
    carregar();
  }
  function cartaoComunicacoes(el) {
    if (!el) return;
    estilo();
    aoMudar(function (stt) {
      if (!stt || el.getAttribute("data-desenhado")) return;
      el.setAttribute("data-desenhado", "1");
      var c = stt.consentimentos || {};
      var tel = c.whatsapp && c.whatsapp.contato ? String(c.whatsapp.contato).replace(/^55/, "") : "";
      el.innerHTML = '<div class="sp-card"><h4>📣 Comunicações</h4>'
        + '<p class="sp-mini">Você escolhe o que recebe. Avisos obrigatórios da conta (segurança, cobrança) chegam por e-mail de qualquer forma.</p>'
        + '<label class="sp-chk"><input type="checkbox" data-c="email"' + (c.email && c.email.aceito ? " checked" : "") + '> <span>Novidades, dicas de uso e ofertas por <b>e-mail</b>.</span></label>'
        + '<label class="sp-chk"><input type="checkbox" data-c="whats"' + (c.whatsapp && c.whatsapp.aceito ? " checked" : "") + '> <span>Avisos e ofertas pelo <b>WhatsApp</b>.</span></label>'
        + '<div data-tel' + (c.whatsapp && c.whatsapp.aceito ? "" : " hidden") + '><span class="sp-f">WhatsApp com DDD</span><div style="display:flex;gap:8px"><input class="sp-in" data-telefone inputmode="tel" autocomplete="tel" placeholder="(68) 99999-9999" value="' + esc(tel) + '"><button type="button" class="sp-btn" data-sp="salvar-tel">Salvar</button></div></div>'
        + '<div class="sp-err" data-err role="status"></div>'
        + '<p class="sp-mini">Registramos a data e o texto do seu consentimento (LGPD). Para sair, desmarque aqui ou responda SAIR no WhatsApp.</p></div>';
      var ce = el.querySelector('[data-c="email"]'), cw = el.querySelector('[data-c="whats"]'), box = el.querySelector("[data-tel]"), t = el.querySelector("[data-telefone]"), err = el.querySelector("[data-err]");
      mascaraTel(t); if (t.value) t.dispatchEvent(new Event("input"));
      function msg(m, ok) { err.style.color = ok ? "#C2CE9E" : "#E09A95"; err.textContent = m; }
      ce.onchange = function () { consentir("email", ce.checked, null, "perfil").then(function () { msg(ce.checked ? "E-mail autorizado ✓" : "Você não receberá mais novidades por e-mail.", true); }, function (e) { msg(e.message); ce.checked = !ce.checked; }); };
      cw.onchange = function () {
        if (cw.checked) { box.hidden = false; t.focus(); msg("Digite o número e toque em Salvar.", true); return; }
        box.hidden = true;
        consentir("whatsapp", false, null, "perfil").then(function () { msg("Você não receberá mais mensagens pelo WhatsApp.", true); }, function (e) { msg(e.message); });
      };
      el.querySelector('[data-sp="salvar-tel"]').onclick = function () {
        if (!telValido(t.value)) { msg("Digite o WhatsApp com DDD."); return; }
        consentir("whatsapp", true, t.value, "perfil").then(function () { msg("WhatsApp autorizado ✓", true); }, function (e) { msg(e.message); });
      };
    });
    carregar();
  }

  // ── início ─────────────────────────────────────────────────────────────
  capturarRef();
  capturarOrigem();
  function iniciar() {
    if (!temConta()) return;
    var R = window.RelatorioSupabaseSync;
    var pronto = R && R.auth && R.auth.whenAuthorized ? R.auth.whenAuthorized() : Promise.resolve();
    pronto.then(function () { return carregar(); }).then(function () { registrarRefPendente(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  document.addEventListener("relatorio:conta", function () { carregar(true).then(registrarRefPendente); });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && S.status) carregar(true); });

  window.SkinPlanos = {
    PLANOS: PLANOS, REC: REC,
    carregar: carregar, status: function () { return S.status; }, aoMudar: aoMudar,
    plano: planoId, situacao: situacao, pode: pode, tentar: tentar, usar: usar, verificar: verificar,
    limite: limite, aposIA: aposIA, limiteIA: limiteIA, checkout: checkout, irParaPlanos: irParaPlanos, definirGateway: definirGateway,
    consentir: consentir, copiarConvite: copiarConvite, compartilhar: compartilhar, linkConvite: linkConvite, textoConvite: textoConvite,
    refGuardado: refGuardado, origemCadastro: origemCadastro, catalogo: catalogo, config: function () { return S.config || {}; }, evento: evento, selo: selo, cartaoPlano: cartaoPlano, cartaoComunicacoes: cartaoComunicacoes,
    brl: brl, temConta: temConta, toast: toast
  };
})();
