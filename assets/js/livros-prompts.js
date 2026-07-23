(function(){
  if(window.__LIVROS_PROMPTS_BOOTSTRAPPED__ && window.__LIVROS_PROMPTS_VERSION__ === "20260723b") return;
  window.__LIVROS_PROMPTS_BOOTSTRAPPED__ = true;
  window.__LIVROS_PROMPTS_VERSION__ = "20260723b";
  var LIVROS_PROMPTS_URL = "tmp/docs/prompt-capa-sumario-extract.txt";
  var LIVROS_PROMPT_GERAL_URL = "tmp/docs/prompt-geral-livros.txt";
  var LIVROS_PROMPT_SYNC_SCOPE = "livros-prompts:shared-v1";
  var LIVROS_PROMPT_STORAGE_KEY = "livros_prompt_overrides_v1";
  var LIVRO_PROMPT_BUTTON_STYLE = "display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 10px;border-radius:7px;border:2px solid #d8b45b;background:rgba(201,168,76,.12);color:#7a5c10;font:700 .72rem \"DM Sans\",sans-serif;cursor:pointer";
  var DISCIPLINA_ALIASES = {
    lp: ["PORTUGUES", "LINGUA PORTUGUESA"],
    tc: ["TRILHAS DE CIENCIAS HUMANAS"],
    tl: ["TRILHAS DE LINGUAGENS"],
    ar: ["ARTES", "ARTE"],
    art: ["ARTES", "ARTE"],
    ing: ["INGLES", "LINGUA INGLESA"],
    esp: ["ESPANHOL", "LINGUA ESPANHOLA"],
    red: ["REDACAO"]
  };
  var TURMA_LABELS = { t1: "1ª Série", t2: "2ª Série", t3: "3ª Série", t89: "8º e 9º ano", t23: "2ª e 3ª série" };
  var _livrosPromptSectionsPromise = null;
  var _livrosPromptGeralPromise = null;
  var _livrosPromptSync = null;
  var _livrosPromptSyncStarted = false;
  var _livrosPromptRemoteLoaded = false;
  var _livrosPromptState = loadLocalPromptState();
  var _livrosPromptModalContext = null;
  var _livrosPromptModalOriginalText = "";
  var _livrosPromptModalEditando = false;
  var _livrosPromptModalDirty = false;

  function formatarTurmaLabel(turma){
    return TURMA_LABELS[turma] || turma || "";
  }

  function formatarBimestreLabel(bimestre){
    if(bimestre === 0 || bimestre){
      var texto = String(bimestre).trim();
      if(/^[1-4]$/.test(texto)) return texto + "º Bimestre";
      return texto;
    }
    return "";
  }

  function canon(text){
    return String(text || "")
      .replace(/\u00C2/g, "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[–—−]/g, "-")
      .replace(/[º°]/g, "O")
      .replace(/ª/g, "A")
      .replace(/\s+/g, " ")
      .replace(/\s*-\s*/g, " - ")
      .trim()
      .toUpperCase();
  }

  function inferirEscolaAtual(){
    var pathname = String((window.location && window.location.pathname) || "").toLowerCase();
    if(pathname.indexOf("herminio") >= 0) return "herminio";
    return "casavequia";
  }

  function makePromptId(tipo, escola, key){
    if(tipo === "geral") return "geral:" + (escola || inferirEscolaAtual());
    return "livro:" + (escola || inferirEscolaAtual()) + ":" + String(key || "");
  }

  function normalizePromptState(payload){
    var base = payload && typeof payload === "object" ? payload : {};
    var prompts = base.prompts && typeof base.prompts === "object" ? base.prompts : {};
    return {
      version: 1,
      prompts: prompts
    };
  }

  function clonePromptState(payload){
    try {
      return JSON.parse(JSON.stringify(normalizePromptState(payload)));
    } catch (error) {
      return { version: 1, prompts: {} };
    }
  }

  function loadLocalPromptState(){
    try {
      return normalizePromptState(JSON.parse(localStorage.getItem(LIVROS_PROMPT_STORAGE_KEY) || "{}"));
    } catch (error) {
      return { version: 1, prompts: {} };
    }
  }

  function persistPromptState(){
    try {
      localStorage.setItem(LIVROS_PROMPT_STORAGE_KEY, JSON.stringify(_livrosPromptState));
    } catch (error) {}
  }

  function hasPromptEntries(){
    return !!Object.keys((_livrosPromptState && _livrosPromptState.prompts) || {}).length;
  }

  function getPromptEntry(promptId){
    var prompts = (_livrosPromptState && _livrosPromptState.prompts) || {};
    return prompts[promptId] || null;
  }

  function setPromptEntry(contexto, texto){
    var promptId = contexto && contexto.promptId;
    if(!promptId) return null;
    if(!_livrosPromptState || typeof _livrosPromptState !== "object") {
      _livrosPromptState = { version: 1, prompts: {} };
    }
    if(!_livrosPromptState.prompts || typeof _livrosPromptState.prompts !== "object") {
      _livrosPromptState.prompts = {};
    }
    _livrosPromptState.prompts[promptId] = {
      type: contexto.type || "livro",
      escola: contexto.escola || inferirEscolaAtual(),
      key: contexto.key || "",
      title: contexto.title || "Prompt do livro",
      subtitle: contexto.subtitle || "",
      text: String(texto == null ? "" : texto),
      updatedAt: new Date().toISOString()
    };
    persistPromptState();
    return _livrosPromptState.prompts[promptId];
  }

  function getPromptText(promptId, fallbackText){
    var entry = getPromptEntry(promptId);
    if(entry) return String(entry.text == null ? "" : entry.text);
    return String(fallbackText == null ? "" : fallbackText);
  }

  function isHeading(text){
    return /^(?:8O E 9O ANO|1A SERIE|2A SERIE|3A SERIE|2A E 3A SERIE) - .+ - [1-4]O BIMESTRE$/i.test(canon(text));
  }

  function stripLineNumber(line){
    var match = String(line || "").match(/^\s*\d+:\s?(.*)$/);
    return match ? match[1] : String(line || "");
  }

  function parsePromptSections(raw){
    var sections = {};
    var order = [];
    var currentKey = "";
    var currentLines = [];
    String(raw || "").split(/\r?\n/).forEach(function(line){
      var clean = stripLineNumber(line).trim();
      if(!clean){
        if(currentKey) currentLines.push("");
        return;
      }
      if(isHeading(clean)){
        if(currentKey && currentLines.length){
          sections[currentKey] = currentLines.join("\n").trim();
          order.push(currentKey);
        }
        currentKey = canon(clean);
        currentLines = [clean];
        return;
      }
      if(currentKey) currentLines.push(clean);
    });
    if(currentKey && currentLines.length){
      sections[currentKey] = currentLines.join("\n").trim();
      order.push(currentKey);
    }
    return { sections: sections, order: order };
  }

  function loadPromptSections(){
    if(!_livrosPromptSectionsPromise){
      _livrosPromptSectionsPromise = fetch(LIVROS_PROMPTS_URL, { cache: "no-cache" })
        .then(function(res){
          if(!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .then(parsePromptSections)
        .catch(function(err){
          console.error("[livros-prompts]", err);
          return { sections: {}, order: [] };
        });
    }
    return _livrosPromptSectionsPromise;
  }

  function loadPromptGeral(){
    if(!_livrosPromptGeralPromise){
      _livrosPromptGeralPromise = fetch(LIVROS_PROMPT_GERAL_URL, { cache: "no-cache" })
        .then(function(res){
          if(!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .catch(function(err){
          console.error("[livros-prompt-geral]", err);
          return "";
        });
    }
    return _livrosPromptGeralPromise;
  }

  function ensureModal(){
    var modal = document.getElementById("livro-prompt-modal");
    if(modal) return modal;
    modal = document.createElement("div");
    modal.id = "livro-prompt-modal";
    modal.style = "position:fixed;inset:0;background:rgba(0,0,0,.68);z-index:10020;display:none;align-items:center;justify-content:center;padding:18px";
    modal.innerHTML = ""
      + "<div style=\"background:var(--cr);border-radius:18px;width:min(980px,100%);max-height:92vh;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.45);display:flex;flex-direction:column\">"
      + "<div style=\"display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid var(--cl);background:linear-gradient(135deg,rgba(201,168,76,.18),rgba(232,200,106,.08))\">"
      + "<div style=\"min-width:0;flex:1\"><div id=\"livro-prompt-modal-title\" style=\"font-family:'Playfair Display',serif;font-size:1.08rem;font-weight:700;color:var(--vd)\">Prompt do livro</div><div id=\"livro-prompt-modal-subtitle\" style=\"font-size:.77rem;color:var(--cm);margin-top:3px\"></div><div id=\"livro-prompt-modal-status\" style=\"font-size:.74rem;color:#6c5b2d;margin-top:8px\">Carregando prompt...</div></div>"
      + "<div style=\"display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end\">"
      + "<button id=\"livro-prompt-edit-btn\" type=\"button\" onclick=\"editarLivroPromptModal()\" style=\"padding:10px 16px;border:none;border-radius:999px;background:#2d6147;color:#fff;font:700 .8rem 'DM Sans',sans-serif;cursor:pointer\">editar</button>"
      + "<button id=\"livro-prompt-save-btn\" type=\"button\" onclick=\"salvarLivroPromptModal()\" style=\"padding:10px 16px;border:none;border-radius:999px;background:linear-gradient(135deg,#c9a84c,#e8c86a);color:#43310e;font:700 .8rem 'DM Sans',sans-serif;cursor:pointer;display:none\">salvar</button>"
      + "<button id=\"livro-prompt-cancel-btn\" type=\"button\" onclick=\"cancelarEdicaoLivroPrompt()\" style=\"padding:10px 16px;border:none;border-radius:999px;background:#eadfbc;color:#5e4810;font:700 .8rem 'DM Sans',sans-serif;cursor:pointer;display:none\">cancelar</button>"
      + "<button id=\"livro-prompt-copy-btn\" type=\"button\" onclick=\"copiarLivroPromptModal()\" style=\"padding:10px 16px;border:none;border-radius:999px;background:linear-gradient(135deg,#c9a84c,#e8c86a);color:#43310e;font:700 .8rem 'DM Sans',sans-serif;cursor:pointer\">copiar</button>"
      + "<button type=\"button\" onclick=\"fecharLivroPromptModal()\" style=\"padding:10px 16px;border:none;border-radius:999px;background:var(--cl);color:var(--ce);font:700 .8rem 'DM Sans',sans-serif;cursor:pointer\">fechar</button>"
      + "</div></div>"
      + "<div style=\"padding:20px;overflow:auto\">"
      + "<textarea id=\"livro-prompt-modal-texto\" readonly style=\"width:100%;min-height:68vh;padding:16px 18px;border:1px solid var(--cl);border-radius:14px;background:#fff;color:var(--ce);font:400 .84rem/1.7 'DM Sans',sans-serif;resize:vertical;white-space:pre-wrap\"></textarea>"
      + "</div>"
      + "</div>";
    modal.addEventListener("click", function(e){
      if(e.target === modal) fecharLivroPromptModal();
    });
    document.body.appendChild(modal);

    var area = document.getElementById("livro-prompt-modal-texto");
    if(area){
      area.addEventListener("input", function(){
        if(!_livrosPromptModalEditando) return;
        _livrosPromptModalDirty = area.value !== _livrosPromptModalOriginalText;
        updateEditingButtons();
      });
    }

    return modal;
  }

  function getModalElements(){
    ensureModal();
    return {
      modal: document.getElementById("livro-prompt-modal"),
      title: document.getElementById("livro-prompt-modal-title"),
      subtitle: document.getElementById("livro-prompt-modal-subtitle"),
      status: document.getElementById("livro-prompt-modal-status"),
      area: document.getElementById("livro-prompt-modal-texto"),
      edit: document.getElementById("livro-prompt-edit-btn"),
      save: document.getElementById("livro-prompt-save-btn"),
      cancel: document.getElementById("livro-prompt-cancel-btn"),
      copy: document.getElementById("livro-prompt-copy-btn")
    };
  }

  function setModalStatus(texto, tone){
    var els = getModalElements();
    if(!els.status) return;
    var colors = {
      neutral: "#6c5b2d",
      success: "#1f7a4d",
      warning: "#9a6700",
      error: "#b42318",
      saving: "#2d6147"
    };
    els.status.textContent = texto || "";
    els.status.style.color = colors[tone || "neutral"] || colors.neutral;
  }

  function updateEditingButtons(){
    var els = getModalElements();
    if(!els.area) return;
    els.area.readOnly = !_livrosPromptModalEditando;
    els.area.style.background = _livrosPromptModalEditando ? "#fffdf4" : "#fff";
    els.area.style.borderColor = _livrosPromptModalEditando ? "#d8b45b" : "var(--cl)";
    if(els.edit) els.edit.style.display = _livrosPromptModalEditando ? "none" : "inline-flex";
    if(els.save){
      els.save.style.display = _livrosPromptModalEditando ? "inline-flex" : "none";
      els.save.disabled = !_livrosPromptModalDirty;
      els.save.style.opacity = _livrosPromptModalDirty ? "1" : ".6";
      els.save.style.cursor = _livrosPromptModalDirty ? "pointer" : "not-allowed";
    }
    if(els.cancel) els.cancel.style.display = _livrosPromptModalEditando ? "inline-flex" : "none";
  }

  function setModalState(contexto, texto){
    var els = getModalElements();
    _livrosPromptModalContext = contexto || null;
    _livrosPromptModalOriginalText = String(texto == null ? "" : texto);
    _livrosPromptModalEditando = false;
    _livrosPromptModalDirty = false;
    if(els.title) els.title.textContent = (contexto && contexto.title) || "Prompt do livro";
    if(els.subtitle) els.subtitle.textContent = (contexto && contexto.subtitle) || "";
    if(els.area) els.area.value = _livrosPromptModalOriginalText;
    if(els.modal) els.modal.style.display = "flex";
    updateEditingButtons();
  }

  function getTurmaAliases(turma){
    if(turma === "t89") return ["8O E 9O ANO"];
    if(turma === "t1") return ["1A SERIE"];
    if(turma === "t2") return ["2A SERIE"];
    if(turma === "t3") return ["3A SERIE"];
    if(turma === "t23") return ["2A E 3A SERIE", "2A SERIE", "3A SERIE"];
    return [canon(formatarTurmaLabel(turma))].filter(Boolean);
  }

  function getDisciplinaAliases(key, disciplina){
    var parts = String(key || "").split("-");
    var discId = parts.length > 1 ? parts[1] : "";
    var aliases = (DISCIPLINA_ALIASES[discId] || []).slice();
    var canonDisc = canon(disciplina);
    if(canonDisc) aliases.push(canonDisc);
    return aliases.map(canon).filter(Boolean).filter(function(value, index, arr){
      return arr.indexOf(value) === index;
    });
  }

  function getBimestreAlias(bimestre){
    var texto = String(bimestre || "").trim();
    if(/^[1-4]$/.test(texto)) return texto + "O BIMESTRE";
    return canon(texto);
  }

  function sameOrContains(source, candidate){
    return source === candidate || source.indexOf(candidate) >= 0 || candidate.indexOf(source) >= 0;
  }

  function resolverPromptLivro(data, key, turma, disciplina, bimestre){
    var sections = data.sections || {};
    var order = data.order || [];
    var turmaAliases = getTurmaAliases(turma);
    var discAliases = getDisciplinaAliases(key, disciplina);
    var bimestreAlias = getBimestreAlias(bimestre);
    var encontrados = order.filter(function(sectionKey){
      var parts = sectionKey.split(" - ");
      if(parts.length < 3) return false;
      var turmaKey = parts[0];
      var discKey = parts[1];
      var bimKey = parts[parts.length - 1];
      var turmaOk = turmaAliases.some(function(alias){ return sameOrContains(turmaKey, alias); });
      var discOk = discAliases.some(function(alias){ return sameOrContains(discKey, alias); });
      var bimOk = sameOrContains(bimKey, bimestreAlias);
      return turmaOk && discOk && bimOk && sections[sectionKey];
    }).map(function(sectionKey){
      return sections[sectionKey];
    });
    return encontrados.join("\n\n========================================\n\n").trim();
  }

  function copyPromptFeedback(){
    var btn = document.getElementById("livro-prompt-copy-btn");
    if(!btn) return;
    btn.textContent = "copiado!";
    clearTimeout(btn._copyTimer);
    btn._copyTimer = setTimeout(function(){
      btn.textContent = "copiar";
    }, 1600);
  }

  function copiarLivroPromptModal(){
    var area = document.getElementById("livro-prompt-modal-texto");
    if(!area) return;
    function fallback(){
      area.focus();
      area.select();
      try {
        if(document.execCommand("copy")) copyPromptFeedback();
      } catch (error) {}
    }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(area.value || "").then(copyPromptFeedback).catch(fallback);
      return;
    }
    fallback();
  }

  function editarLivroPromptModal(){
    var els = getModalElements();
    if(!_livrosPromptModalContext || !els.area) return;
    _livrosPromptModalEditando = true;
    _livrosPromptModalDirty = false;
    updateEditingButtons();
    setModalStatus("Modo de edição ativado. Altere o texto e clique em salvar.", "neutral");
    els.area.focus();
    els.area.setSelectionRange(els.area.value.length, els.area.value.length);
  }

  function cancelarEdicaoLivroPrompt(){
    var els = getModalElements();
    if(!els.area) return;
    els.area.value = _livrosPromptModalOriginalText;
    _livrosPromptModalDirty = false;
    _livrosPromptModalEditando = false;
    updateEditingButtons();
    setModalStatus("Edição cancelada. O texto voltou ao último conteúdo salvo.", "neutral");
  }

  function applyRemotePromptState(payload){
    _livrosPromptRemoteLoaded = true;
    _livrosPromptState = clonePromptState(payload);
    persistPromptState();
    if(!_livrosPromptModalContext) return;
    if(_livrosPromptModalEditando){
      setModalStatus("Existe uma atualização online disponível. Salve ou cancele sua edição para recarregar o texto.", "warning");
      return;
    }
    var entry = getPromptEntry(_livrosPromptModalContext.promptId);
    if(!entry) return;
    setModalState(_livrosPromptModalContext, entry.text);
    setModalStatus("Prompt atualizado com a versão online mais recente.", "success");
  }

  function ensurePromptSync(){
    if(_livrosPromptSync || !window.RelatorioSupabaseSync || !window.RelatorioSupabaseSync.isAvailable()) return !!_livrosPromptSync;
    _livrosPromptSync = window.RelatorioSupabaseSync.createScopeSync({
      scope: LIVROS_PROMPT_SYNC_SCOPE,
      schoolSlug: "shared",
      classSlug: "livros-prompts",
      source: "livros-prompts-js",
      debounceMs: 350,
      pagePath: window.location.pathname,
      getLocalPayload: function(){
        return clonePromptState(_livrosPromptState);
      },
      onRemotePayload: function(payload){
        applyRemotePromptState(payload);
      },
      onStatus: function(status){
        if(status === "salvando"){
          setModalStatus("Salvando no banco de dados do projeto...", "saving");
          return;
        }
        if(status === "salvo"){
          setModalStatus("Prompt salvo no banco de dados do projeto.", "success");
          return;
        }
        if(status === "erro"){
          setModalStatus("Não foi possível confirmar o salvamento no banco agora. O texto ficou guardado localmente e será reenviado.", "warning");
          return;
        }
        if(status === "online" && !_livrosPromptModalEditando){
          setModalStatus("Sincronização online ativa para os prompts dos livros.", "neutral");
        }
      }
    });
    return true;
  }

  function requestPromptSyncInit(attempt){
    if(_livrosPromptSyncStarted) return;
    if(ensurePromptSync()){
      _livrosPromptSyncStarted = true;
      _livrosPromptSync.start().then(function(ready){
        if(!ready) return;
        if(hasPromptEntries() && !_livrosPromptRemoteLoaded){
          window.setTimeout(function(){
            if(_livrosPromptSync) _livrosPromptSync.pushNow("force");
          }, 900);
        }
      }).catch(function(error){
        console.error("[livros-prompts-sync]", error);
      });
      return;
    }
    if((attempt || 0) >= 15) return;
    window.setTimeout(function(){
      requestPromptSyncInit((attempt || 0) + 1);
    }, 500);
  }

  async function salvarLivroPromptModal(){
    var els = getModalElements();
    if(!_livrosPromptModalContext || !els.area || !_livrosPromptModalEditando) return false;
    setPromptEntry(_livrosPromptModalContext, els.area.value || "");
    _livrosPromptModalOriginalText = els.area.value || "";
    _livrosPromptModalDirty = false;
    _livrosPromptModalEditando = false;
    updateEditingButtons();

    var savedRemote = false;
    if(_livrosPromptSync && typeof _livrosPromptSync.pushNow === "function"){
      try {
        savedRemote = await _livrosPromptSync.pushNow("livros-prompt-save");
      } catch (error) {
        console.error("[livros-prompts-save]", error);
      }
      if(!savedRemote && _livrosPromptSync && typeof _livrosPromptSync.schedulePush === "function"){
        _livrosPromptSync.schedulePush("livros-prompt-retry");
      }
    }

    if(savedRemote){
      setModalStatus("Prompt salvo no banco de dados do projeto.", "success");
    } else if(_livrosPromptSync) {
      setModalStatus("Texto salvo localmente. O sistema vai reenviar esse prompt ao banco automaticamente.", "warning");
    } else {
      setModalStatus("Texto salvo localmente. A conexão com o banco ainda não está pronta nesta página.", "warning");
    }
    return savedRemote;
  }

  function fecharLivroPromptModal(){
    var modal = document.getElementById("livro-prompt-modal");
    if(!modal) return;
    if(_livrosPromptModalEditando && _livrosPromptModalDirty){
      try {
        if(!window.confirm("Existem alterações não salvas neste prompt. Deseja fechar mesmo assim?")) return;
      } catch (error) {}
    }
    _livrosPromptModalContext = null;
    _livrosPromptModalOriginalText = "";
    _livrosPromptModalEditando = false;
    _livrosPromptModalDirty = false;
    modal.style.display = "none";
  }

  function abrirPromptGeralLivros(){
    var escola = inferirEscolaAtual();
    var contexto = {
      type: "geral",
      escola: escola,
      key: "geral",
      promptId: makePromptId("geral", escola, "geral"),
      title: "Prompt geral dos livros",
      subtitle: "Base para iniciar a criação dos livros em HTML."
    };
    setModalState(contexto, "Carregando prompt...");
    setModalStatus("Carregando prompt geral...", "neutral");
    loadPromptGeral().then(function(texto){
      if(!texto) texto = "Não foi possível carregar o prompt geral dos livros.";
      setModalState(contexto, getPromptText(contexto.promptId, texto));
      setModalStatus("Você pode editar esse prompt e salvar no banco do projeto.", "neutral");
    });
  }

  function injetarBotaoPromptGeral(){
    var sec = document.getElementById("sec-livros");
    if(!sec || sec.querySelector("[data-livros-prompt-geral]")) return;
    var th = sec.querySelector(".th");
    if(!th) return;
    var wrap = document.createElement("div");
    wrap.setAttribute("data-livros-prompt-geral", "1");
    wrap.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:-8px 0 18px";
    wrap.innerHTML = ""
      + "<div style=\"font-size:.77rem;color:var(--cm)\">Abra o prompt geral para iniciar a criação dos livros em HTML.</div>"
      + "<button type=\"button\" onclick=\"abrirPromptGeralLivros()\" style=\"display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 18px;border:none;border-radius:999px;background:linear-gradient(135deg,#c9a84c,#e8c86a);color:#43310e;font:700 .82rem 'DM Sans',sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(201,168,76,.18)\">Prompt geral</button>";
    th.insertAdjacentElement("afterend", wrap);
  }

  function abrirLivroPromptLivro(escola, key, turma, disciplina, bimestre, evt){
    if(evt) evt.stopPropagation();
    var subtitulo = [formatarTurmaLabel(turma), disciplina, formatarBimestreLabel(bimestre)].filter(Boolean).join(" • ");
    var contexto = {
      type: "livro",
      escola: escola || inferirEscolaAtual(),
      key: key,
      turma: turma,
      disciplina: disciplina,
      bimestre: bimestre,
      promptId: makePromptId("livro", escola || inferirEscolaAtual(), key),
      title: "Prompt do livro",
      subtitle: subtitulo
    };
    setModalState(contexto, "Carregando prompt...");
    setModalStatus("Carregando prompt do livro...", "neutral");
    loadPromptSections().then(function(data){
      var texto = resolverPromptLivro(data, key, turma, disciplina, bimestre);
      if(!texto){
        texto = "Nenhum prompt mapeado para este livro no arquivo analisado.";
      }
      setModalState(contexto, getPromptText(contexto.promptId, texto));
      setModalStatus("Você pode editar esse prompt e salvar no banco do projeto.", "neutral");
    });
  }

  window.LIVRO_PROMPT_BUTTON_STYLE = LIVRO_PROMPT_BUTTON_STYLE;
  window.abrirLivroPromptLivro = abrirLivroPromptLivro;
  window.abrirPromptGeralLivros = abrirPromptGeralLivros;
  window.fecharLivroPromptModal = fecharLivroPromptModal;
  window.copiarLivroPromptModal = copiarLivroPromptModal;
  window.editarLivroPromptModal = editarLivroPromptModal;
  window.salvarLivroPromptModal = salvarLivroPromptModal;
  window.cancelarEdicaoLivroPrompt = cancelarEdicaoLivroPrompt;

  function initLivrosPrompts(){
    ensureModal();
    injetarBotaoPromptGeral();
    requestPromptSyncInit(0);
  }

  document.addEventListener("keydown", function(e){
    if(e.key === "Escape") fecharLivroPromptModal();
  });

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initLivrosPrompts);
  } else {
    initLivrosPrompts();
  }
})();
