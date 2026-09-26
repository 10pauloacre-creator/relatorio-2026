/* ═══════════════════════════════════════════════════════════════════════════
   Casavequia — sincronia do Plano Anual, Livros e timers entre aparelhos
   ───────────────────────────────────────────────────────────────────────────
   Antes (até 26/09/2026) isso ia para o Firestore do projeto relatorio-c693d,
   com regras "allow read, write: if true": qualquer pessoa na internet podia
   ler e reescrever os dados, e a página aplicava o que viesse de lá no diário.
   Agora vai para o escopo casavequia:storage:shared-v1 do Supabase, que só a
   conta do administrador lê e grava (RLS de report_sync_state).

   Chaves sincronizadas (localStorage): ps_* (botões do plano), liv_status,
   liv_urls, plano_ultima_mod e cl_fim_* (timers). O retrato mais novo vence,
   como no herminio:storage:shared-v1.

   Migração única: se o escopo ainda não tem "firestoreMigrado", lê o Firestore
   antigo pela API REST (só leitura, sem chave), confere o formato de cada
   valor e grava aqui. Com as regras do Firestore já fechadas (403), marca como
   migrado e segue com o que o aparelho tem.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SCOPE = "casavequia:storage:shared-v1";
  var TS_KEY = "pc_storage_sync_local_ts";
  var FLAG_KEY = "pc_storage_firestore_migrado";
  var EXATAS = ["liv_status", "liv_urls", "plano_ultima_mod"];
  var PREFIXOS = ["ps_", "cl_fim_"];
  var FIRESTORE = "https://firestore.googleapis.com/v1/projects/relatorio-c693d/databases/(default)/documents/";
  var CLAUDE_IDS = ["c1", "c2", "c3", "c4", "c5", "c6"];
  var LIV_STATUS = ["", "criando", "concluido"];

  var sync = null;
  var aplicando = false;

  function chaveSincronizada(key) {
    if (!key) return false;
    if (EXATAS.indexOf(key) >= 0) return true;
    return PREFIXOS.some(function (p) { return key.indexOf(p) === 0; });
  }

  function lerJson(key, padrao) {
    try { var v = JSON.parse(localStorage.getItem(key) || "null"); return v == null ? padrao : v; } catch (e) { return padrao; }
  }

  function tocar(ts) {
    try { localStorage.setItem(TS_KEY, ts || new Date().toISOString()); } catch (e) {}
  }

  function payloadLocal() {
    var values = {};
    for (var i = 0; i < localStorage.length; i += 1) {
      var key = localStorage.key(i);
      if (chaveSincronizada(key)) values[key] = localStorage.getItem(key);
    }
    return {
      localUpdatedAt: localStorage.getItem(TS_KEY) || new Date().toISOString(),
      firestoreMigrado: localStorage.getItem(FLAG_KEY) || null,
      values: values
    };
  }

  function avisarPagina() {
    try { if (typeof window.pcStorageRemotoAplicado === "function") window.pcStorageRemotoAplicado(); }
    catch (e) { console.warn("[PC storage] atualizar tela", e && e.message); }
  }

  function aplicarRemoto(payload, meta) {
    if (!payload || typeof payload !== "object") return;
    if (payload.firestoreMigrado) {
      try { localStorage.setItem(FLAG_KEY, String(payload.firestoreMigrado)); } catch (e) {}
    }
    var remoto = Date.parse(payload.localUpdatedAt || (meta && meta.updatedAt) || "") || 0;
    var local = Date.parse(localStorage.getItem(TS_KEY) || "") || 0;
    if (local && remoto && local > remoto) { agendar("keep-local"); return; }
    var values = payload.values && typeof payload.values === "object" ? payload.values : {};
    aplicando = true;
    try {
      var remover = [];
      for (var i = 0; i < localStorage.length; i += 1) {
        var k = localStorage.key(i);
        if (chaveSincronizada(k) && !Object.prototype.hasOwnProperty.call(values, k)) remover.push(k);
      }
      remover.forEach(function (k) { localStorage.removeItem(k); });
      Object.keys(values).forEach(function (k) {
        if (!chaveSincronizada(k)) return;
        if (values[k] == null) localStorage.removeItem(k);
        else localStorage.setItem(k, String(values[k]));
      });
      tocar(payload.localUpdatedAt || (meta && meta.updatedAt) || new Date().toISOString());
    } finally {
      aplicando = false;
    }
    avisarPagina();
  }

  function agendar(reason) {
    if (aplicando || !sync) return;
    tocar();
    sync.schedulePush(reason || "storage-change");
  }

  /* ── Migração única do Firestore (somente leitura) ─────────────────────── */

  function valorFirestore(v) {
    if (!v || typeof v !== "object") return undefined;
    if ("booleanValue" in v) return !!v.booleanValue;
    if ("stringValue" in v) return String(v.stringValue);
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return Number(v.doubleValue);
    if ("mapValue" in v) {
      var out = {};
      var f = (v.mapValue && v.mapValue.fields) || {};
      Object.keys(f).forEach(function (k) { out[k] = valorFirestore(f[k]); });
      return out;
    }
    return undefined;
  }

  function camposDoc(doc) {
    var out = {};
    var f = (doc && doc.fields) || {};
    Object.keys(f).forEach(function (k) { out[k] = valorFirestore(f[k]); });
    return out;
  }

  function idDoc(doc) {
    var nome = String((doc && doc.name) || "");
    return nome.slice(nome.lastIndexOf("/") + 1);
  }

  function urlSegura(url) {
    if (typeof url !== "string" || url.length > 2000) return "";
    try {
      var u = new URL(url);
      return (u.protocol === "https:" || u.protocol === "http:") ? u.href : "";
    } catch (e) { return ""; }
  }

  function textoCurto(v) {
    return typeof v === "string" ? v.slice(0, 80) : "";
  }

  // 403 = regras já fechadas (nada a migrar); 404 = documento não existe.
  function buscar(caminho) {
    return fetch(FIRESTORE + caminho, { credentials: "omit", cache: "no-store" }).then(function (r) {
      if (r.status === 403 || r.status === 401 || r.status === 404) return { fechado: r.status !== 404, dados: null };
      if (!r.ok) throw new Error("Firestore HTTP " + r.status);
      return r.json().then(function (dados) { return { fechado: false, dados: dados }; });
    });
  }

  function listar(colecao) {
    var docs = [];
    var fechado = false;
    function pagina(token, n) {
      var q = colecao + "?pageSize=300" + (token ? "&pageToken=" + encodeURIComponent(token) : "");
      return buscar(q).then(function (r) {
        if (r.fechado) { fechado = true; return; }
        var d = r.dados || {};
        (d.documents || []).forEach(function (doc) { docs.push(doc); });
        if (d.nextPageToken && n < 40) return pagina(d.nextPageToken, n + 1);
      });
    }
    return pagina("", 0).then(function () { return { fechado: fechado, docs: docs }; });
  }

  function migrarFirestore() {
    if (localStorage.getItem(FLAG_KEY)) return Promise.resolve(false);
    if (typeof fetch !== "function") return Promise.resolve(false);
    var resumo = { plano: 0, livros: 0, timers: 0, ultimaMod: false };
    return Promise.all([
      listar("plano_status"),
      buscar("app_data/livros"),
      buscar("app_data/plano_ultima_mod"),
      listar("claude_timers")
    ]).then(function (res) {
      var plano = res[0], livros = res[1], ultima = res[2], timers = res[3];

      plano.docs.forEach(function (doc) {
        var id = idDoc(doc);
        if (!/^aula_[A-Za-z0-9]{1,64}$/.test(id)) return;
        var campos = camposDoc(doc);
        var limpo = {};
        ["pl", "ap", "pu", "sm"].forEach(function (c) { if (typeof campos[c] === "boolean") limpo[c] = campos[c]; });
        if (!Object.keys(limpo).length) return;
        var atual = lerJson("ps_" + id, {});
        localStorage.setItem("ps_" + id, JSON.stringify(Object.assign({}, atual, limpo)));
        resumo.plano += 1;
      });

      if (livros.dados) {
        var lv = camposDoc(livros.dados);
        var status = lerJson("liv_status", {});
        var urls = lerJson("liv_urls", {});
        var chaveLivro = /^t[0-9]{1,2}-[a-z0-9]{1,12}-b[1-4]$/;
        Object.keys(lv.status || {}).forEach(function (k) {
          var st = lv.status[k];
          if (chaveLivro.test(k) && LIV_STATUS.indexOf(st) >= 0) { status[k] = st; resumo.livros += 1; }
        });
        Object.keys(lv.urls || {}).forEach(function (k) {
          var u = urlSegura(lv.urls[k]);
          if (chaveLivro.test(k) && u) urls[k] = u;
        });
        localStorage.setItem("liv_status", JSON.stringify(status));
        localStorage.setItem("liv_urls", JSON.stringify(urls));
      }

      if (ultima.dados) {
        var r = camposDoc(ultima.dados);
        var atualMod = lerJson("plano_ultima_mod", null);
        if (typeof r.ts === "number" && isFinite(r.ts) && (!atualMod || !(atualMod.ts >= r.ts))) {
          localStorage.setItem("plano_ultima_mod", JSON.stringify({
            ts: r.ts, dia: textoCurto(r.dia), hora: textoCurto(r.hora), serie: textoCurto(r.serie),
            bim: textoCurto(r.bim), num: textoCurto(r.num), acao: textoCurto(r.acao)
          }));
          resumo.ultimaMod = true;
        }
      }

      timers.docs.forEach(function (doc) {
        var id = idDoc(doc);
        if (CLAUDE_IDS.indexOf(id) < 0) return;
        var fim = Number(camposDoc(doc).fim || 0);
        if (isFinite(fim) && fim > Date.now() && fim < Date.now() + 7 * 864e5) {
          localStorage.setItem("cl_fim_" + id, String(Math.round(fim)));
          resumo.timers += 1;
        }
      });

      localStorage.setItem(FLAG_KEY, new Date().toISOString());
      console.info("[PC storage] Firestore antigo " + (plano.fechado ? "já fechado" : "migrado") + ":", resumo);
      return true;
    }).catch(function (e) {
      // Sem internet ou erro do Google: tenta de novo na próxima abertura.
      console.warn("[PC storage] migração do Firestore adiada:", e && e.message);
      return false;
    });
  }

  /* ── Início ────────────────────────────────────────────────────────────── */

  function iniciar(tentativa) {
    if (sync) return;
    var S = window.RelatorioSupabaseSync;
    if (!S || !S.isAvailable || !S.isAvailable()) {
      if ((tentativa || 0) < 15) window.setTimeout(function () { iniciar((tentativa || 0) + 1); }, 1200);
      return;
    }
    // Página de arquivo de ano encerrado: só leitura, sem migração.
    var arquivo = !!document.documentElement.getAttribute("data-arquivo-ate");
    sync = S.createScopeSync({
      scope: SCOPE,
      schoolSlug: "padre-carlos-casavequia",
      classSlug: "storage",
      source: "casavequia-storage",
      debounceMs: 450,
      getLocalPayload: payloadLocal,
      onRemotePayload: aplicarRemoto,
      onStatus: function (status) {
        try { if (typeof window.pcStorageSyncStatus === "function") window.pcStorageSyncStatus(status); } catch (e) {}
      }
    });
    sync.start().then(function (ok) {
      if (!ok || arquivo) return;
      migrarFirestore().then(function (migrou) {
        if (migrou) { tocar(); avisarPagina(); sync.pushNow("force"); }
        else window.setTimeout(function () { agendar("bootstrap-storage"); }, 700);
      });
    });
  }

  window.PcStorageSync = {
    agendar: agendar,
    urlSegura: urlSegura,
    estado: function () { return payloadLocal(); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { iniciar(0); });
  else iniciar(0);
})();
