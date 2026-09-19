window.RELATORIO_SUPABASE_CONFIG = {
  url: "https://vgceathgwvtmjxbdpecr.supabase.co",
  publishableKey: "sb_publishable_ba-g-ww4KwM2Wq0x2vsGVg_x_9pTqUQ",
  table: "report_sync_state",
  // Tabela dos dados particulares de cada professor (Etapa 9).
  userTable: "professor_dados",
  // Dono dos relatórios da Casavequia e da Hermínio (mesma conta da Biblioteca).
  adminEmail: "10pauloacre@gmail.com",
  authStorageKey: "relatorio-2026-admin-auth",
  // Página de cada professor (conta que não é a do administrador).
  professorHome: "meu-diario.html"
};

// ═══════════════════════════════════════════════════════════════════════
// CONTAS (Etapa 9)
//
// Toda página que carrega este arquivo exige uma conta. O tipo de acesso vem
// de <html data-acesso="...">:
//   (vazio)     página das escolas do administrador (Casavequia, Hermínio…):
//               só a conta do administrador; outra conta vai para Meu Diário.
//   "inicio"    tela inicial: qualquer conta; o administrador vê as escolas e
//               os demais professores seguem para Meu Diário.
//   "professor" Meu Diário: qualquer conta, com os próprios dados.
// Os dados ficam protegidos no banco (RLS). Esconder a página até entrar é só
// cortesia visual: o conteúdo escrito no HTML público continua no código-fonte.
// ═══════════════════════════════════════════════════════════════════════
window.RelatorioSupabaseSync = (function () {
  var config = window.RELATORIO_SUPABASE_CONFIG || {};
  var clientInstance = null;
  var syncInstanceCounter = 0;
  var syncRegistry = [];
  var modoPagina = (document.documentElement.getAttribute("data-acesso") || "admin").toLowerCase();

  function getClient() {
    if (clientInstance) return clientInstance;
    if (!window.supabase || typeof window.supabase.createClient !== "function") return null;
    if (!config.url || !config.publishableKey) return null;

    // A sessão fica salva no aparelho e é compartilhada por todas as páginas do
    // Relatório (mesma origem), então o professor entra uma única vez.
    clientInstance = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Volta do Google, da confirmação de e-mail e da troca de senha.
        detectSessionInUrl: true,
        flowType: "pkce",
        storageKey: config.authStorageKey
      },
      realtime: {
        params: { eventsPerSecond: 10 }
      }
    });

    clientInstance.auth.onAuthStateChange(function (event, session) {
      if (event === "PASSWORD_RECOVERY") {
        showAuthGate("", "nova-senha");
        return;
      }
      if (event === "SIGNED_IN" && session) {
        concluirEntrada();
      }
      if (event === "SIGNED_OUT") {
        aplicarAcesso();
      }
    });

    return clientInstance;
  }

  // ── Sessão ────────────────────────────────────────────────────────────
  var authWaiters = [];
  var reauthListeners = [];
  var authGateEl = null;

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  // Lê a sessão direto do armazenamento: funciona offline, mesmo com o token
  // vencido (o refresh acontece sozinho quando a internet volta).
  function readStoredSession() {
    try {
      var raw = window.localStorage.getItem(config.authStorageKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      var session = parsed && parsed.currentSession ? parsed.currentSession : parsed;
      if (!session || !session.refresh_token) return null;
      return session;
    } catch (error) {
      return null;
    }
  }

  function decodeJwt(session) {
    try {
      var part = String(session.access_token || "").split(".")[1] || "";
      return JSON.parse(decodeURIComponent(escape(atob(part.replace(/-/g, "+").replace(/_/g, "/")))));
    } catch (error) {
      return {};
    }
  }

  function sessionEmail(session) {
    if (session.user && session.user.email) return session.user.email;
    return decodeJwt(session).email || "";
  }

  function currentUser() {
    var session = readStoredSession();
    if (!session) return null;
    var user = session.user || {};
    var meta = user.user_metadata || {};
    return {
      id: user.id || decodeJwt(session).sub || "",
      email: normalizeEmail(sessionEmail(session)),
      nome: meta.nome || meta.full_name || meta.name || "",
      foto: meta.avatar_url || meta.picture || ""
    };
  }

  function isSignedIn() {
    var user = currentUser();
    return !!(user && user.id);
  }

  function hasAdminSession() {
    var user = currentUser();
    return !!user && user.email === normalizeEmail(config.adminEmail);
  }

  // Esta página já pode trabalhar com a conta atual?
  function acessoLiberado() {
    if (modoPagina === "admin") return hasAdminSession();
    return isSignedIn();
  }

  function resolveAuthWaiters() {
    var waiters = authWaiters;
    authWaiters = [];
    waiters.forEach(function (resolve) { resolve(true); });
  }

  function whenAuthorized() {
    if (acessoLiberado()) return Promise.resolve(true);
    return new Promise(function (resolve) {
      authWaiters.push(resolve);
      aplicarAcesso();
    });
  }

  function paginaDoProfessor() {
    return config.professorHome || "meu-diario.html";
  }

  // Decide o que a página mostra para a conta atual.
  function aplicarAcesso() {
    if (acessoLiberado()) {
      destrancar();
      hideAuthGate();
      resolveAuthWaiters();
      return;
    }
    if (modoPagina === "admin" && isSignedIn()) {
      // Conta de outro professor numa página das escolas do administrador.
      window.location.replace(paginaDoProfessor());
      return;
    }
    trancar();
    showAuthGate();
  }

  function concluirEntrada() {
    lembrarEmail((currentUser() || {}).email);
    if (modoPagina === "admin" && isSignedIn() && !hasAdminSession()) {
      window.location.replace(paginaDoProfessor());
      return;
    }
    aplicarAcesso();
    reauthListeners.forEach(function (listener) {
      try { listener(); } catch (error) { console.warn("[SupabaseSync] reauth listener failed", error); }
    });
    try { document.dispatchEvent(new CustomEvent("relatorio:conta", { detail: currentUser() })); } catch (e) {}
  }

  function lembrarEmail(email) {
    try { if (email) window.localStorage.setItem("relatorio-ultimo-email", email); } catch (e) {}
  }
  function ultimoEmail() {
    try { return window.localStorage.getItem("relatorio-ultimo-email") || ""; } catch (e) { return ""; }
  }

  // Esconde o conteúdo da página até a conta ser confirmada.
  function trancar() {
    if (!document.getElementById("rel-trava-style")) {
      var style = document.createElement("style");
      style.id = "rel-trava-style";
      style.textContent = "html.rel-trancado body>*:not(.rel-auth-gate){visibility:hidden!important}"
        + "html.rel-trancado body{background:#0b1e12!important}";
      (document.head || document.documentElement).appendChild(style);
    }
    document.documentElement.classList.add("rel-trancado");
  }
  function destrancar() {
    document.documentElement.classList.remove("rel-trancado");
  }

  function translateAuthError(error) {
    var message = String(error && error.message || "");
    if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
    if (/email not confirmed/i.test(message)) return "Este e-mail ainda não foi confirmado. Abra o link que enviamos para ele.";
    if (/already registered|already been registered|user already exists/i.test(message)) return "Já existe uma conta com este e-mail. Use \"Entrar\".";
    if (/password should be|weak password|at least/i.test(message)) return "A senha precisa ter pelo menos 8 caracteres, com letras e números.";
    if (/unable to validate email|invalid email|email address .* is invalid/i.test(message)) return "Confira o e-mail digitado.";
    if (/provider is not enabled|unsupported provider/i.test(message)) return "O login com Google ainda não foi ativado nesta plataforma.";
    if (/failed to fetch|network/i.test(message)) return "Sem internet. Conecte-se para entrar pela primeira vez.";
    if (/rate limit|too many|security purposes/i.test(message)) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
    return message || "Não foi possível concluir agora.";
  }

  function urlDeRetorno() {
    return window.location.origin + window.location.pathname;
  }

  async function signIn(email, password) {
    var client = getClient();
    if (!client) throw new Error("Supabase indisponível nesta página.");
    var response = await client.auth.signInWithPassword({ email: normalizeEmail(email), password: password });
    if (response.error) throw new Error(translateAuthError(response.error));
    concluirEntrada();
    return response.data.session;
  }

  async function signUp(nome, email, password) {
    var client = getClient();
    if (!client) throw new Error("Supabase indisponível nesta página.");
    var response = await client.auth.signUp({
      email: normalizeEmail(email),
      password: password,
      options: { data: { nome: String(nome || "").trim() }, emailRedirectTo: urlDeRetorno() }
    });
    if (response.error) throw new Error(translateAuthError(response.error));
    lembrarEmail(normalizeEmail(email));
    // Com confirmação de e-mail ligada, a sessão só nasce depois do link.
    if (response.data && response.data.session) {
      concluirEntrada();
      return { entrou: true };
    }
    return { entrou: false };
  }

  async function signInWithGoogle() {
    var client = getClient();
    if (!client) throw new Error("Supabase indisponível nesta página.");
    var response = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: urlDeRetorno() }
    });
    if (response.error) throw new Error(translateAuthError(response.error));
  }

  async function sendPasswordReset(email) {
    var client = getClient();
    if (!client) throw new Error("Supabase indisponível nesta página.");
    var response = await client.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo: urlDeRetorno() });
    if (response.error) throw new Error(translateAuthError(response.error));
  }

  async function updatePassword(password) {
    var client = getClient();
    if (!client) throw new Error("Supabase indisponível nesta página.");
    var response = await client.auth.updateUser({ password: password });
    if (response.error) throw new Error(translateAuthError(response.error));
    concluirEntrada();
  }

  async function signOut() {
    var client = getClient();
    var user = currentUser();
    try { if (client) await client.auth.signOut(); } catch (error) {}
    try {
      window.localStorage.removeItem(config.authStorageKey);
      // Cópias locais dos dados particulares deste professor saem do aparelho.
      if (user && user.id) {
        Object.keys(window.localStorage).forEach(function (key) {
          if (key.indexOf(user.id) >= 0) window.localStorage.removeItem(key);
        });
      }
    } catch (error) {}
    window.location.replace(modoPagina === "admin" ? "index.html" : window.location.pathname.split("/").pop() || "index.html");
  }

  // O botão do Google só aparece quando o provedor está ligado no Supabase.
  var googleAtivoPromise = null;
  function googleAtivo() {
    if (googleAtivoPromise) return googleAtivoPromise;
    googleAtivoPromise = fetch(config.url + "/auth/v1/settings", { headers: { apikey: config.publishableKey } })
      .then(function (r) { return r.json(); })
      .then(function (s) { return !!(s && s.external && s.external.google); })
      .catch(function () { return false; });
    return googleAtivoPromise;
  }

  // ── Tela de conta ─────────────────────────────────────────────────────
  var AUTH_GATE_CSS = ""
    + ".rel-auth-gate{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;"
    + "background:rgba(4,12,8,.9);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:'Segoe UI',Tahoma,sans-serif;visibility:visible!important}"
    + ".rel-auth-card{width:100%;max-width:400px;margin:auto;border-radius:20px;padding:26px 22px 22px;background:#0f2418;color:#e9f3ec;"
    + "border:1px solid rgba(143,208,164,.22);box-shadow:0 30px 80px rgba(0,0,0,.55)}"
    + ".rel-auth-card h2{margin:0 0 6px;font-size:1.2rem;font-weight:800;color:#f1f8f3}"
    + ".rel-auth-card p{margin:0 0 16px;font-size:.86rem;line-height:1.5;color:#a9c4b2}"
    + ".rel-auth-tabs{display:flex;gap:6px;margin:0 0 18px;padding:4px;border-radius:12px;background:#08150e}"
    + ".rel-auth-tabs button{flex:1;min-height:38px;border:0;border-radius:9px;background:transparent;color:#a9c4b2;font-weight:700;font-size:.86rem;cursor:pointer}"
    + ".rel-auth-tabs button.on{background:#1c3b29;color:#f1f8f3}"
    + ".rel-auth-card label{display:block;margin:0 0 6px;font-size:.78rem;font-weight:600;color:#c7dccf}"
    + ".rel-auth-card input{width:100%;box-sizing:border-box;min-height:46px;margin:0 0 14px;padding:0 14px;border-radius:12px;"
    + "border:1px solid rgba(255,255,255,.14);background:#08150e;color:#f1f8f3;font-size:1rem;outline:none}"
    + ".rel-auth-card input:focus{border-color:#6fcf97;box-shadow:0 0 0 3px rgba(111,207,151,.18)}"
    + ".rel-auth-pass{position:relative}.rel-auth-pass input{padding-right:70px}"
    + ".rel-auth-toggle{position:absolute;right:8px;top:7px;height:32px;padding:0 10px;border:0;border-radius:8px;background:transparent;"
    + "color:#8fd0a4;font-size:.78rem;font-weight:700;cursor:pointer}"
    + ".rel-auth-submit{width:100%;min-height:48px;border:0;border-radius:12px;background:linear-gradient(135deg,#6fcf97,#2f9e5f);"
    + "color:#06140c;font-size:.95rem;font-weight:800;cursor:pointer}"
    + ".rel-auth-submit[disabled],.rel-auth-google[disabled]{opacity:.6;cursor:progress}"
    + ".rel-auth-sep{display:flex;align-items:center;gap:10px;margin:16px 0;color:#7f9b89;font-size:.76rem}"
    + ".rel-auth-sep::before,.rel-auth-sep::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.12)}"
    + ".rel-auth-google{width:100%;min-height:46px;display:flex;align-items:center;justify-content:center;gap:10px;border:1px solid rgba(255,255,255,.18);"
    + "border-radius:12px;background:#fff;color:#1f1f1f;font-size:.92rem;font-weight:700;cursor:pointer}"
    + ".rel-auth-link{background:none;border:0;padding:0;color:#8fd0a4;font-size:.8rem;font-weight:700;cursor:pointer;text-decoration:underline}"
    + ".rel-auth-error{min-height:20px;margin:10px 0 0;font-size:.84rem;color:#ffb3b3;line-height:1.45}"
    + ".rel-auth-ok{margin:10px 0 0;font-size:.84rem;color:#9ee6b8;line-height:1.45}"
    + ".rel-auth-foot{margin-top:14px;font-size:.74rem;color:#7f9b89;line-height:1.45}"
    + ".rel-auth-legal{margin-top:16px;text-align:center;font-size:.7rem;color:#6f8a78}"
    + ".rel-auth-legal a{display:inline;color:inherit;text-decoration:none;border-radius:0;overflow:visible}"
    + ".rel-auth-legal a:hover{text-decoration:underline;transform:none;box-shadow:none}";

  var GOOGLE_SVG = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  var gateModo = "entrar";
  var gateMensagem = "";

  function showAuthGate(message, modo) {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", function () { showAuthGate(message, modo); }, { once: true });
      return;
    }
    if (!document.getElementById("rel-auth-gate-style")) {
      var style = document.createElement("style");
      style.id = "rel-auth-gate-style";
      style.textContent = AUTH_GATE_CSS;
      document.head.appendChild(style);
    }
    if (modo) gateModo = modo;
    gateMensagem = message || "";
    if (!authGateEl) {
      authGateEl = document.createElement("div");
      authGateEl.className = "rel-auth-gate";
      authGateEl.setAttribute("role", "dialog");
      authGateEl.setAttribute("aria-modal", "true");
      authGateEl.setAttribute("aria-labelledby", "rel-auth-title");
      document.body.appendChild(authGateEl);
    }
    desenharGate();
  }

  function desenharGate() {
    var m = gateModo;
    var titulo = { entrar: "Entrar no Relatório", criar: "Criar conta de professor", esqueci: "Recuperar a senha", "nova-senha": "Criar uma nova senha" }[m];
    var texto = {
      entrar: "Seus diários ficam na sua conta e aparecem em todos os seus aparelhos.",
      criar: "A plataforma começa vazia, com todas as ferramentas. Só você vê os seus dados.",
      esqueci: "Enviaremos um link para você criar uma nova senha.",
      "nova-senha": "Digite a nova senha da sua conta."
    }[m];
    var html = '<form class="rel-auth-card" novalidate>'
      + '<h2 id="rel-auth-title">' + titulo + "</h2><p>" + texto + "</p>";
    if (m === "entrar" || m === "criar") {
      html += '<div class="rel-auth-tabs" role="tablist">'
        + '<button type="button" data-modo="entrar" class="' + (m === "entrar" ? "on" : "") + '">Entrar</button>'
        + '<button type="button" data-modo="criar" class="' + (m === "criar" ? "on" : "") + '">Criar conta</button></div>';
    }
    if (m === "criar") {
      html += '<label for="rel-auth-nome">Seu nome</label><input id="rel-auth-nome" type="text" autocomplete="name" required>';
    }
    if (m !== "nova-senha") {
      html += '<label for="rel-auth-email">E-mail</label>'
        + '<input id="rel-auth-email" type="email" autocomplete="' + (m === "criar" ? "email" : "username") + '" inputmode="email" required value="' + esc(ultimoEmail()) + '">';
    }
    if (m !== "esqueci") {
      html += '<label for="rel-auth-password">' + (m === "entrar" ? "Senha" : "Senha (mínimo 8 caracteres)") + '</label>'
        + '<div class="rel-auth-pass"><input id="rel-auth-password" type="password" autocomplete="' + (m === "entrar" ? "current-password" : "new-password") + '" required>'
        + '<button class="rel-auth-toggle" type="button" aria-label="Mostrar senha">Mostrar</button></div>';
    }
    html += '<button class="rel-auth-submit" type="submit">'
      + { entrar: "Entrar", criar: "Criar minha conta", esqueci: "Enviar link", "nova-senha": "Salvar nova senha" }[m] + "</button>"
      + '<div class="rel-auth-error" role="alert">' + esc(gateMensagem) + "</div>";
    if (m === "entrar" || m === "criar") {
      html += '<div class="rel-auth-google-box" hidden><div class="rel-auth-sep">ou</div>'
        + '<button class="rel-auth-google" type="button">' + GOOGLE_SVG + "Entrar com o Google</button></div>";
    }
    html += '<div class="rel-auth-foot">'
      + (m === "entrar" ? '<button type="button" class="rel-auth-link" data-modo="esqueci">Esqueci a senha</button>' : "")
      + (m === "esqueci" ? '<button type="button" class="rel-auth-link" data-modo="entrar">← Voltar para entrar</button>' : "")
      + "</div>"
      + '<div class="rel-auth-legal"><a href="privacidade.html" target="_blank" rel="noopener">Privacidade</a>'
      + ' · <a href="termos.html" target="_blank" rel="noopener">Termos</a></div>'
      + "</form>";
    authGateEl.innerHTML = html;

    var form = authGateEl.querySelector("form");
    var nomeInput = authGateEl.querySelector("#rel-auth-nome");
    var emailInput = authGateEl.querySelector("#rel-auth-email");
    var passwordInput = authGateEl.querySelector("#rel-auth-password");
    var toggle = authGateEl.querySelector(".rel-auth-toggle");
    var submit = authGateEl.querySelector(".rel-auth-submit");
    var errorBox = authGateEl.querySelector(".rel-auth-error");

    authGateEl.querySelectorAll("[data-modo]").forEach(function (b) {
      b.addEventListener("click", function () { gateModo = b.getAttribute("data-modo"); gateMensagem = ""; desenharGate(); });
    });
    if (toggle) {
      toggle.addEventListener("click", function () {
        var show = passwordInput.type === "password";
        passwordInput.type = show ? "text" : "password";
        toggle.textContent = show ? "Ocultar" : "Mostrar";
        toggle.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
      });
    }
    var boxGoogle = authGateEl.querySelector(".rel-auth-google-box");
    if (boxGoogle) {
      googleAtivo().then(function (ativo) { if (ativo) boxGoogle.hidden = false; });
      boxGoogle.querySelector("button").addEventListener("click", async function () {
        var botao = this;
        botao.disabled = true;
        errorBox.textContent = "";
        try { await signInWithGoogle(); } catch (error) { errorBox.textContent = error.message; botao.disabled = false; }
      });
    }
    window.setTimeout(function () {
      var alvo = nomeInput || (emailInput && !emailInput.value ? emailInput : passwordInput) || emailInput;
      if (alvo) alvo.focus();
    }, 60);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      errorBox.className = "rel-auth-error";
      errorBox.textContent = "";
      var email = emailInput ? emailInput.value.trim() : "";
      var senha = passwordInput ? passwordInput.value : "";
      if (emailInput && !/^\S+@\S+\.\S+$/.test(email)) { errorBox.textContent = "Digite um e-mail válido."; return; }
      if (m === "criar" && !nomeInput.value.trim()) { errorBox.textContent = "Digite o seu nome."; return; }
      if (passwordInput && !senha) { errorBox.textContent = "Digite a senha."; return; }
      if ((m === "criar" || m === "nova-senha") && (senha.length < 8 || !/[a-z]/i.test(senha) || !/\d/.test(senha))) {
        errorBox.textContent = "A senha precisa ter pelo menos 8 caracteres, com letras e números.";
        return;
      }
      var rotulo = submit.textContent;
      submit.disabled = true;
      submit.textContent = "Aguarde…";
      try {
        if (m === "entrar") {
          await signIn(email, senha);
        } else if (m === "criar") {
          var r = await signUp(nomeInput.value, email, senha);
          if (!r.entrou) {
            gateModo = "entrar";
            desenharGate();
            var ok = authGateEl.querySelector(".rel-auth-error");
            ok.className = "rel-auth-ok";
            ok.textContent = "Conta criada! Enviamos um link de confirmação para " + email + ". Abra o link e depois entre aqui.";
            return;
          }
        } else if (m === "esqueci") {
          await sendPasswordReset(email);
          errorBox.className = "rel-auth-ok";
          errorBox.textContent = "Se houver uma conta com este e-mail, o link chega em alguns minutos.";
        } else {
          await updatePassword(senha);
        }
      } catch (error) {
        errorBox.textContent = error.message;
      } finally {
        submit.disabled = false;
        submit.textContent = rotulo;
      }
    });
  }

  function hideAuthGate() {
    if (authGateEl && authGateEl.parentNode) authGateEl.parentNode.removeChild(authGateEl);
    authGateEl = null;
  }

  function isAuthError(error) {
    if (!error) return false;
    var code = String(error.code || "");
    var status = Number(error.status || 0);
    return code === "42501" || code === "PGRST301" || code === "PGRST303" || status === 401 || status === 403
      || /jwt|row-level security|permission denied/i.test(String(error.message || ""));
  }

  // Outra aba entrou ou saiu da conta: mantém esta página coerente.
  window.addEventListener("storage", function (event) {
    if (event.key !== config.authStorageKey) return;
    if (!isSignedIn()) { window.location.reload(); return; }
    aplicarAcesso();
  });

  function clonePayload(value) {
    try {
      return JSON.parse(JSON.stringify(value == null ? null : value));
    } catch (error) {
      return null;
    }
  }

  function payloadSignature(value) {
    try {
      return JSON.stringify(value == null ? null : value);
    } catch (error) {
      return "";
    }
  }

  // ── Sincronização por escopo ──────────────────────────────────────────
  // options.perUser = true: grava na tabela particular do professor logado
  // (professor_dados), com a chave (user_id, scope_key).
  function createScopeSync(options) {
    options = options || {};

    var client = getClient();
    var perUser = !!options.perUser;
    var table = perUser ? (config.userTable || "professor_dados") : (config.table || "report_sync_state");
    var scope = options.scope || "";
    var channelTopic = options.channelTopic || ("report-sync:" + scope + ":" + (++syncInstanceCounter));
    var debounceMs = typeof options.debounceMs === "number" ? options.debounceMs : 300;
    var readOnly = !!options.readOnly;
    var getLocalPayload = typeof options.getLocalPayload === "function"
      ? options.getLocalPayload
      : function () { return null; };
    var onRemotePayload = typeof options.onRemotePayload === "function"
      ? options.onRemotePayload
      : function () {};
    var onStatus = typeof options.onStatus === "function"
      ? options.onStatus
      : function () {};

    var started = false;
    var timerId = null;
    var channel = null;
    var lastRemoteSignature = null;
    var lastSavedSignature = null;
    var initialFetch = null;
    var pendingAuthRetry = false;
    var pendingAuthPush = false;
    var pendingOfflinePush = false;

    function emitStatus(status, detail) {
      try {
        onStatus(status, detail || null);
      } catch (error) {
        console.warn("[SupabaseSync] status callback failed", error);
      }
    }

    function applyRemote(payload, updatedAt, via) {
      var cloned = clonePayload(payload);
      var signature = payloadSignature(cloned);
      if (signature && signature === lastRemoteSignature) return false;

      lastRemoteSignature = signature;
      lastSavedSignature = signature;

      try {
        onRemotePayload(cloned, {
          updatedAt: updatedAt || null,
          via: via || "realtime"
        });
      } catch (error) {
        console.error("[SupabaseSync] failed to apply remote payload for", scope, error);
      }

      return true;
    }

    async function fetchLatest() {
      if (!client || !scope) return null;
      await whenAuthorized();

      var response = await client
        .from(table)
        .select("scope_key,payload,updated_at")
        .eq("scope_key", scope)
        .maybeSingle();

      if (response.error) {
        if (isAuthError(response.error)) {
          pendingAuthRetry = true;
          showAuthGate("Sua sessão expirou. Entre novamente.", "entrar");
        }
        emitStatus("erro", response.error);
        console.error("[SupabaseSync] fetch failed for", scope, response.error);
        return null;
      }

      if (!response.data) {
        emitStatus("online");
        return null;
      }
      applyRemote(response.data.payload, response.data.updated_at, "fetch");
      emitStatus("online", { updatedAt: response.data.updated_at });
      return response.data;
    }

    async function pushNow(reason) {
      if (readOnly || !client || !scope) return false;
      await whenAuthorized();
      // Nunca grava antes de ter lido o que já está no banco: evita que um
      // aparelho desatualizado sobrescreva os dados mais novos.
      if (initialFetch) await initialFetch;

      var payload = clonePayload(getLocalPayload());
      var signature = payloadSignature(payload);
      if (!signature) return false;
      if (signature === lastSavedSignature && reason !== "force") return false;

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        pendingOfflinePush = true;
        emitStatus("offline");
        return false;
      }

      emitStatus("salvando", { reason: reason || "manual" });

      var row = {
        scope_key: scope,
        payload: payload,
        updated_at: new Date().toISOString(),
        page_path: options.pagePath || window.location.pathname,
        source: options.source || "browser"
      };

      if (perUser) {
        row.user_id = (currentUser() || {}).id;
        if (!row.user_id) return false;
      } else {
        if (options.schoolSlug) row.school_slug = options.schoolSlug;
        if (options.classSlug) row.class_slug = options.classSlug;
      }

      var response = await client
        .from(table)
        .upsert(row, { onConflict: perUser ? "user_id,scope_key" : "scope_key" });

      if (response.error) {
        if (isAuthError(response.error)) {
          pendingAuthPush = true;
          showAuthGate("Sua sessão expirou. Entre novamente para salvar.", "entrar");
        } else {
          pendingOfflinePush = true;
        }
        emitStatus("erro", response.error);
        console.error("[SupabaseSync] save failed for", scope, response.error);
        return false;
      }

      pendingOfflinePush = false;
      lastSavedSignature = signature;
      lastRemoteSignature = signature;
      emitStatus("salvo", { reason: reason || "manual", updatedAt: row.updated_at });
      return true;
    }

    function schedulePush(reason) {
      if (readOnly) return;
      if (timerId) window.clearTimeout(timerId);
      timerId = window.setTimeout(function () {
        pushNow(reason || "scheduled");
      }, debounceMs);
    }

    function subscribe() {
      if (!client || !scope || channel) return;

      channel = client
        .channel(channelTopic)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: table,
          filter: "scope_key=eq." + scope
        }, function (event) {
          if (event && event.new && event.new.payload !== undefined) {
            applyRemote(event.new.payload, event.new.updated_at, "realtime");
          }
        })
        .subscribe(function (status) {
          if (status === "SUBSCRIBED") {
            emitStatus("online");
            fetchLatest();
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            emitStatus("erro", { message: status });
          }
        });
    }

    async function start() {
      if (started) return !!client;
      started = true;

      if (!client || !scope) {
        emitStatus("indisponivel");
        return false;
      }

      emitStatus("conectando");
      initialFetch = fetchLatest();
      await initialFetch;
      subscribe();
      return true;
    }

    // Depois de um novo login (sessão vencida), refaz o que falhou.
    reauthListeners.push(function () {
      if (pendingAuthRetry) {
        pendingAuthRetry = false;
        fetchLatest();
      }
      if (pendingAuthPush) {
        pendingAuthPush = false;
        pushNow("force");
      }
    });

    // Voltou para a aba ou a internet voltou: busca o que mudou em outro
    // aparelho e envia o que ficou pendente aqui.
    function recuperar() {
      if (!started || !client) return;
      fetchLatest().then(function () {
        if (pendingOfflinePush) pushNow("force");
      });
    }

    async function refresh() {
      return fetchLatest();
    }

    function destroy() {
      if (timerId) {
        window.clearTimeout(timerId);
        timerId = null;
      }
      if (channel && client) {
        client.removeChannel(channel);
        channel = null;
      }
      syncRegistry = syncRegistry.filter(function (item) { return item !== api; });
    }

    var api = {
      start: start,
      refresh: refresh,
      pushNow: pushNow,
      schedulePush: schedulePush,
      destroy: destroy,
      recuperar: recuperar,
      isAvailable: function () { return !!client; }
    };
    syncRegistry.push(api);
    return api;
  }

  var ultimaRecuperacao = 0;
  function recuperarTudo() {
    var agora = Date.now();
    if (agora - ultimaRecuperacao < 1500) return;
    ultimaRecuperacao = agora;
    syncRegistry.forEach(function (item) { try { item.recuperar(); } catch (e) {} });
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") recuperarTudo();
  });
  window.addEventListener("online", recuperarTudo);
  window.addEventListener("focus", recuperarTudo);

  // Aplica o acesso da página assim que possível (antes de pintar, se der).
  if (!acessoLiberado()) trancar();
  function iniciarAcesso() {
    // Com retorno do Google / link de e-mail na URL, o cliente precisa nascer
    // já para trocar o código pela sessão.
    if (/[?&#](code|access_token|error_description)=/.test(window.location.href) || !acessoLiberado()) getClient();
    if (/[?&#](code|access_token|error_description)=/.test(window.location.href)) {
      // A troca termina em onAuthStateChange(SIGNED_IN); limpa a URL depois.
      window.setTimeout(function () {
        try { window.history.replaceState(null, "", urlDeRetorno()); } catch (e) {}
        if (!isSignedIn() && gateModo !== "nova-senha") {
          // Link aberto em outro navegador: o e-mail foi confirmado, mas a
          // sessão nasce só com a senha.
          trancar();
          showAuthGate("", "entrar");
          var aviso = authGateEl && authGateEl.querySelector(".rel-auth-error");
          if (aviso) { aviso.className = "rel-auth-ok"; aviso.textContent = "E-mail confirmado. Entre com o seu e-mail e senha."; }
          return;
        }
        aplicarAcesso();
      }, 1800);
      return;
    }
    aplicarAcesso();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarAcesso);
  else iniciarAcesso();

  return {
    getClient: getClient,
    isAvailable: function () { return !!getClient(); },
    createScopeSync: createScopeSync,
    auth: {
      isSignedIn: acessoLiberado,
      isAdmin: hasAdminSession,
      hasSession: isSignedIn,
      currentUser: currentUser,
      whenAuthorized: whenAuthorized,
      signIn: signIn,
      signUp: signUp,
      signInWithGoogle: signInWithGoogle,
      signOut: signOut,
      showLogin: function (message) { showAuthGate(message, "entrar"); }
    }
  };
})();
