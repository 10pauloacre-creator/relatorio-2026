window.RELATORIO_SUPABASE_CONFIG = {
  url: "https://vgceathgwvtmjxbdpecr.supabase.co",
  publishableKey: "sb_publishable_ba-g-ww4KwM2Wq0x2vsGVg_x_9pTqUQ",
  table: "report_sync_state",
  // Mesma conta de administrador da Biblioteca Digital (mesmo projeto Supabase).
  adminEmail: "10pauloacre@gmail.com",
  authStorageKey: "relatorio-2026-admin-auth"
};

window.RelatorioSupabaseSync = (function () {
  var config = window.RELATORIO_SUPABASE_CONFIG || {};
  var clientInstance = null;
  var syncInstanceCounter = 0;

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
        detectSessionInUrl: false,
        storageKey: config.authStorageKey
      },
      realtime: {
        params: { eventsPerSecond: 4 }
      }
    });

    return clientInstance;
  }

  // ── Login do administrador ────────────────────────────────────────────────
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

  function sessionEmail(session) {
    if (session.user && session.user.email) return session.user.email;
    try {
      var part = String(session.access_token || "").split(".")[1] || "";
      var json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(json).email || "";
    } catch (error) {
      return "";
    }
  }

  function hasAdminSession() {
    var session = readStoredSession();
    return !!session && normalizeEmail(sessionEmail(session)) === normalizeEmail(config.adminEmail);
  }

  function resolveAuthWaiters() {
    var waiters = authWaiters;
    authWaiters = [];
    waiters.forEach(function (resolve) { resolve(true); });
  }

  function whenAuthorized() {
    if (hasAdminSession()) return Promise.resolve(true);
    return new Promise(function (resolve) {
      authWaiters.push(resolve);
      showAuthGate();
    });
  }

  function translateAuthError(error) {
    var message = String(error && error.message || "");
    if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
    if (/email not confirmed/i.test(message)) return "Este e-mail ainda não foi confirmado.";
    if (/failed to fetch|network/i.test(message)) return "Sem internet. Conecte-se para entrar pela primeira vez.";
    if (/rate limit|too many/i.test(message)) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
    return message || "Não foi possível entrar agora.";
  }

  async function signIn(email, password) {
    var client = getClient();
    if (!client) throw new Error("Supabase indisponível nesta página.");
    if (normalizeEmail(email) !== normalizeEmail(config.adminEmail)) {
      throw new Error("Somente a conta de administrador pode usar o Relatório.");
    }
    var response = await client.auth.signInWithPassword({ email: normalizeEmail(email), password: password });
    if (response.error) throw new Error(translateAuthError(response.error));
    hideAuthGate();
    resolveAuthWaiters();
    reauthListeners.forEach(function (listener) {
      try { listener(); } catch (error) { console.warn("[SupabaseSync] reauth listener failed", error); }
    });
    return response.data.session;
  }

  async function signOut() {
    var client = getClient();
    if (client) await client.auth.signOut();
    try { window.localStorage.removeItem(config.authStorageKey); } catch (error) {}
    window.location.reload();
  }

  var AUTH_GATE_CSS = ""
    + ".rel-auth-gate{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;"
    + "background:rgba(4,12,8,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:'Segoe UI',Tahoma,sans-serif}"
    + ".rel-auth-card{width:100%;max-width:380px;border-radius:20px;padding:26px 22px 22px;background:#0f2418;color:#e9f3ec;"
    + "border:1px solid rgba(143,208,164,.22);box-shadow:0 30px 80px rgba(0,0,0,.55)}"
    + ".rel-auth-card h2{margin:0 0 6px;font-size:1.15rem;font-weight:800;color:#f1f8f3}"
    + ".rel-auth-card p{margin:0 0 18px;font-size:.86rem;line-height:1.5;color:#a9c4b2}"
    + ".rel-auth-card label{display:block;margin:0 0 6px;font-size:.78rem;font-weight:600;color:#c7dccf}"
    + ".rel-auth-card input{width:100%;box-sizing:border-box;min-height:46px;margin:0 0 14px;padding:0 14px;border-radius:12px;"
    + "border:1px solid rgba(255,255,255,.14);background:#08150e;color:#f1f8f3;font-size:1rem;outline:none}"
    + ".rel-auth-card input:focus{border-color:#6fcf97;box-shadow:0 0 0 3px rgba(111,207,151,.18)}"
    + ".rel-auth-pass{position:relative}.rel-auth-pass input{padding-right:64px}"
    + ".rel-auth-toggle{position:absolute;right:8px;top:7px;height:32px;padding:0 10px;border:0;border-radius:8px;background:transparent;"
    + "color:#8fd0a4;font-size:.78rem;font-weight:700;cursor:pointer}"
    + ".rel-auth-submit{width:100%;min-height:48px;border:0;border-radius:12px;background:linear-gradient(135deg,#6fcf97,#2f9e5f);"
    + "color:#06140c;font-size:.95rem;font-weight:800;cursor:pointer}"
    + ".rel-auth-submit[disabled]{opacity:.6;cursor:progress}"
    + ".rel-auth-error{min-height:20px;margin:10px 0 0;font-size:.82rem;color:#ffb3b3}"
    + ".rel-auth-foot{margin-top:12px;font-size:.74rem;color:#7f9b89;line-height:1.45}";

  function showAuthGate(message) {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", function () { showAuthGate(message); }, { once: true });
      return;
    }
    if (authGateEl) {
      if (message) authGateEl.querySelector(".rel-auth-error").textContent = message;
      return;
    }

    if (!document.getElementById("rel-auth-gate-style")) {
      var style = document.createElement("style");
      style.id = "rel-auth-gate-style";
      style.textContent = AUTH_GATE_CSS;
      document.head.appendChild(style);
    }

    authGateEl = document.createElement("div");
    authGateEl.className = "rel-auth-gate";
    authGateEl.setAttribute("role", "dialog");
    authGateEl.setAttribute("aria-modal", "true");
    authGateEl.setAttribute("aria-labelledby", "rel-auth-title");
    authGateEl.innerHTML = ""
      + '<form class="rel-auth-card" novalidate>'
      + '<h2 id="rel-auth-title">Entrar no Relatório 2026</h2>'
      + '<p>Use a mesma conta de administrador da Biblioteca Digital. Você só precisa entrar uma vez neste aparelho.</p>'
      + '<label for="rel-auth-email">E-mail</label>'
      + '<input id="rel-auth-email" type="email" autocomplete="username" inputmode="email" required>'
      + '<label for="rel-auth-password">Senha</label>'
      + '<div class="rel-auth-pass">'
      + '<input id="rel-auth-password" type="password" autocomplete="current-password" required>'
      + '<button class="rel-auth-toggle" type="button" aria-label="Mostrar senha">Mostrar</button>'
      + '</div>'
      + '<button class="rel-auth-submit" type="submit">Entrar</button>'
      + '<div class="rel-auth-error" role="alert"></div>'
      + '<div class="rel-auth-foot">Esqueceu a senha? Recupere pela tela de login da Biblioteca Digital. É a mesma conta.</div>'
      + '</form>';
    document.body.appendChild(authGateEl);

    var form = authGateEl.querySelector("form");
    var emailInput = authGateEl.querySelector("#rel-auth-email");
    var passwordInput = authGateEl.querySelector("#rel-auth-password");
    var toggle = authGateEl.querySelector(".rel-auth-toggle");
    var submit = authGateEl.querySelector(".rel-auth-submit");
    var errorBox = authGateEl.querySelector(".rel-auth-error");

    emailInput.value = config.adminEmail || "";
    if (message) errorBox.textContent = message;
    window.setTimeout(function () { passwordInput.focus(); }, 60);

    toggle.addEventListener("click", function () {
      var show = passwordInput.type === "password";
      passwordInput.type = show ? "text" : "password";
      toggle.textContent = show ? "Ocultar" : "Mostrar";
      toggle.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      errorBox.textContent = "";
      if (!passwordInput.value) {
        errorBox.textContent = "Digite a senha.";
        return;
      }
      submit.disabled = true;
      submit.textContent = "Entrando…";
      try {
        await signIn(emailInput.value, passwordInput.value);
      } catch (error) {
        errorBox.textContent = error.message;
        submit.disabled = false;
        submit.textContent = "Entrar";
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

  // Outra aba saiu da conta ou entrou: mantém esta página coerente.
  window.addEventListener("storage", function (event) {
    if (event.key !== config.authStorageKey) return;
    if (hasAdminSession()) {
      hideAuthGate();
      resolveAuthWaiters();
    }
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

  function createScopeSync(options) {
    options = options || {};

    var client = getClient();
    var table = config.table || "report_sync_state";
    var scope = options.scope || "";
    var channelTopic = options.channelTopic || ("report-sync:" + scope + ":" + (++syncInstanceCounter));
    var debounceMs = typeof options.debounceMs === "number" ? options.debounceMs : 450;
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
          showAuthGate("Sua sessão expirou. Entre novamente.");
        }
        emitStatus("erro", response.error);
        console.error("[SupabaseSync] fetch failed for", scope, response.error);
        return null;
      }

      if (!response.data) return null;
      applyRemote(response.data.payload, response.data.updated_at, "fetch");
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

      emitStatus("salvando", { reason: reason || "manual" });

      var row = {
        scope_key: scope,
        payload: payload,
        updated_at: new Date().toISOString(),
        page_path: options.pagePath || window.location.pathname,
        source: options.source || "browser"
      };

      if (options.schoolSlug) row.school_slug = options.schoolSlug;
      if (options.classSlug) row.class_slug = options.classSlug;

      var response = await client
        .from(table)
        .upsert(row, { onConflict: "scope_key" });

      if (response.error) {
        if (isAuthError(response.error)) {
          pendingAuthPush = true;
          showAuthGate("Sua sessão expirou. Entre novamente para salvar.");
        }
        emitStatus("erro", response.error);
        console.error("[SupabaseSync] save failed for", scope, response.error);
        return false;
      }

      lastSavedSignature = signature;
      lastRemoteSignature = signature;
      emitStatus("salvo", { reason: reason || "manual" });
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
          if (event && event.new) {
            applyRemote(event.new.payload, event.new.updated_at, "realtime");
          }
        })
        .subscribe(function (status) {
          if (status === "SUBSCRIBED") {
            emitStatus("online");
            fetchLatest();
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
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
    }

    return {
      start: start,
      refresh: refresh,
      pushNow: pushNow,
      schedulePush: schedulePush,
      destroy: destroy,
      isAvailable: function () { return !!client; }
    };
  }

  return {
    getClient: getClient,
    isAvailable: function () { return !!getClient(); },
    createScopeSync: createScopeSync,
    auth: {
      isSignedIn: hasAdminSession,
      whenAuthorized: whenAuthorized,
      signIn: signIn,
      signOut: signOut,
      showLogin: showAuthGate
    }
  };
})();
