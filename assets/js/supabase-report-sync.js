window.RELATORIO_SUPABASE_CONFIG = {
  url: "https://vgceathgwvtmjxbdpecr.supabase.co",
  publishableKey: "sb_publishable_ba-g-ww4KwM2Wq0x2vsGVg_x_9pTqUQ",
  table: "report_sync_state"
};

window.RelatorioSupabaseSync = (function () {
  var config = window.RELATORIO_SUPABASE_CONFIG || {};
  var clientInstance = null;

  function getClient() {
    if (clientInstance) return clientInstance;
    if (!window.supabase || typeof window.supabase.createClient !== "function") return null;
    if (!config.url || !config.publishableKey) return null;

    clientInstance = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      realtime: {
        params: { eventsPerSecond: 4 }
      }
    });

    return clientInstance;
  }

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

      var response = await client
        .from(table)
        .select("scope_key,payload,updated_at")
        .eq("scope_key", scope)
        .maybeSingle();

      if (response.error) {
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
        .channel("report-sync:" + scope)
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
      await fetchLatest();
      subscribe();
      return true;
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
    createScopeSync: createScopeSync
  };
})();
