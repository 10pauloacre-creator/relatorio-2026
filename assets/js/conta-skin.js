// ═══════════════════════════════════════════════════════════════════════
// conta-skin.js — peças da conta usadas por escolas.html, meu-diario.html e
// perfil.html (Etapa 14, 21/09/2026). API: window.ContaSkin.
//
//   ContaSkin.perfil        perfil do professor (professor_dados, escopo
//                           "meu-diario:perfil:v1"): foto, dados públicos e
//                           a área "Restritos".
//   ContaSkin.chip(el)      botão redondo com a foto, que abre perfil.html.
//   ContaSkin.seletorInep   Estado › Município › Escola no catálogo do INEP
//                           (tabelas inep_*, Censo Escolar).
//   ContaSkin.confirmarPerigo  confirmação + senha da conta antes de excluir.
//   ContaSkin.vincularEscola   grava a escola em professor_escolas.
//   ContaSkin.reduzirImagem    foto/ícone reduzidos para data URL (webp).
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var SCOPE_PERFIL = "meu-diario:perfil:v1";
  var UFS = [["AC","Acre"],["AL","Alagoas"],["AP","Amapá"],["AM","Amazonas"],["BA","Bahia"],["CE","Ceará"],["DF","Distrito Federal"],["ES","Espírito Santo"],["GO","Goiás"],["MA","Maranhão"],["MT","Mato Grosso"],["MS","Mato Grosso do Sul"],["MG","Minas Gerais"],["PA","Pará"],["PB","Paraíba"],["PR","Paraná"],["PE","Pernambuco"],["PI","Piauí"],["RJ","Rio de Janeiro"],["RN","Rio Grande do Norte"],["RS","Rio Grande do Sul"],["RO","Rondônia"],["RR","Roraima"],["SC","Santa Catarina"],["SP","São Paulo"],["SE","Sergipe"],["TO","Tocantins"]];

  function S() { return window.RelatorioSupabaseSync; }
  function cliente() { return S() && S().getClient(); }
  function usuario() { return (S() && S().auth.currentUser()) || {}; }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function iniciais(nome) {
    var p = String(nome || "").split(/\s+/).filter(Boolean);
    return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() : "👤";
  }

  // ── Estilo próprio (claro por padrão; escuro com html.dark-2026) ──────
  function estilo() {
    if (document.getElementById("ck-estilo")) return;
    var s = document.createElement("style");
    s.id = "ck-estilo";
    s.textContent =
      ":root{--ck-sup:#fff;--ck-sup2:#f6f5f0;--ck-linha:#e2dfd6;--ck-txt:#23261f;--ck-mudo:#686b62;--ck-acento:#2d6147;--ck-acento-txt:#fff;--ck-perigo:#b9392d;--ck-perigo-bg:#fdecea}" +
      "html.dark-2026,html[data-ck-tema=escuro]{--ck-sup:#181B17;--ck-sup2:#20231E;--ck-linha:#30352D;--ck-txt:#F3F1E9;--ck-mudo:#B6B7AE;--ck-acento:#A7B58A;--ck-acento-txt:#12140f;--ck-perigo:#e2837b;--ck-perigo-bg:rgba(185,99,93,.16)}" +
      ".ck-ov{position:fixed;inset:0;background:rgba(5,6,5,.72);z-index:30000;display:flex;align-items:center;justify-content:center;padding:14px}" +
      ".ck-jan{background:var(--ck-sup);color:var(--ck-txt);border:1px solid var(--ck-linha);border-radius:18px;max-width:520px;width:100%;max-height:92vh;overflow:auto;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.45);font-family:inherit}" +
      ".ck-jan h3{font-size:1.1rem;margin-bottom:8px}.ck-jan p{font-size:.88rem;line-height:1.55;color:var(--ck-mudo);margin-bottom:12px}" +
      ".ck-jan input{width:100%;padding:10px 12px;border-radius:10px;border:2px solid var(--ck-linha);background:var(--ck-sup2);color:var(--ck-txt);font:inherit;font-size:.95rem}" +
      ".ck-acoes{display:flex;gap:10px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}" +
      ".ck-btn{border:1px solid var(--ck-linha);background:var(--ck-sup2);color:var(--ck-txt);border-radius:10px;padding:10px 16px;font:inherit;font-weight:700;font-size:.86rem;cursor:pointer}" +
      ".ck-btn.pri{background:var(--ck-acento);border-color:var(--ck-acento);color:var(--ck-acento-txt)}" +
      ".ck-btn.perigo{background:var(--ck-perigo);border-color:var(--ck-perigo);color:#fff}" +
      ".ck-btn:disabled{opacity:.5;cursor:not-allowed}" +
      ".ck-erro{color:var(--ck-perigo);font-size:.84rem;margin-top:8px;min-height:1em}" +
      ".ck-chip{width:42px;height:42px;border-radius:50%;border:2px solid rgba(201,168,76,.75);background:rgba(255,255,255,.1);color:#f5e6be;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:.9rem;cursor:pointer;overflow:hidden;padding:0;flex-shrink:0;text-decoration:none}" +
      ".ck-chip img{width:100%;height:100%;object-fit:cover;display:block}" +
      /* seletor do INEP */
      ".ck-inep{display:flex;flex-direction:column;gap:12px}" +
      ".ck-inep-l{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}" +
      ".ck-inep label{display:block;font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ck-acento);margin-bottom:5px}" +
      ".ck-inep select,.ck-inep input{width:100%;padding:11px 12px;border-radius:11px;border:2px solid var(--ck-linha);background:var(--ck-sup2);color:var(--ck-txt);font:inherit;font-size:.95rem}" +
      ".ck-inep select:disabled,.ck-inep input:disabled{opacity:.55}" +
      ".ck-res{display:flex;flex-direction:column;gap:8px;max-height:52vh;overflow:auto;padding-right:2px}" +
      ".ck-res button{display:block;width:100%;text-align:left;border:1px solid var(--ck-linha);background:var(--ck-sup);color:var(--ck-txt);border-radius:12px;padding:12px 14px;cursor:pointer;font:inherit;transition:border-color .15s,transform .15s}" +
      ".ck-res button:hover,.ck-res button:focus-visible{border-color:var(--ck-acento);transform:translateY(-1px)}" +
      ".ck-res b{display:block;font-size:.95rem}.ck-res small{display:block;color:var(--ck-mudo);font-size:.78rem;margin-top:3px;line-height:1.45}" +
      ".ck-tag{display:inline-block;font-size:.68rem;font-weight:800;padding:2px 8px;border-radius:99px;background:var(--ck-sup2);border:1px solid var(--ck-linha);margin-right:4px}" +
      ".ck-aviso{font-size:.84rem;color:var(--ck-mudo);padding:10px 2px}";
    document.head.appendChild(s);
  }

  // ── Janela genérica ───────────────────────────────────────────────────
  function janela(html, ligar) {
    estilo();
    var ov = document.createElement("div");
    ov.className = "ck-ov";
    ov.innerHTML = '<div class="ck-jan" role="dialog" aria-modal="true">' + html + "</div>";
    function fechar() { ov.remove(); document.removeEventListener("keydown", tecla); }
    function tecla(e) { if (e.key === "Escape") fechar(); }
    document.addEventListener("keydown", tecla);
    ov.addEventListener("mousedown", function (e) { if (e.target === ov) fechar(); });
    document.body.appendChild(ov);
    if (ligar) ligar(ov, fechar);
    return { el: ov, fechar: fechar };
  }

  // ── Senha ─────────────────────────────────────────────────────────────
  // true = senha certa; false = errada; null = conta sem senha (Google).
  function verificarSenha(senha) {
    var c = cliente();
    if (!c) return Promise.reject(new Error("Sem conexão com o servidor."));
    return c.rpc("conta_verificar_senha", { p_senha: senha || "" }).then(function (r) {
      if (r.error) throw new Error(r.error.message);
      return r.data;
    });
  }

  // Duas etapas: 1) confirmar a ação; 2) digitar a senha da conta (ou, em conta
  // só do Google, o e-mail). Resolve com a senha digitada, ou null se desistir.
  function confirmarPerigo(o) {
    o = o || {};
    return new Promise(function (resolve) {
      var concluido = false;
      function fim(v) { if (!concluido) { concluido = true; resolve(v); } }
      var j1 = janela("<h3>⚠️ " + esc(o.titulo || "Confirmar") + "</h3><p>" + (o.texto || "Esta ação não pode ser desfeita.") + "</p>"
        + '<div class="ck-acoes"><button type="button" class="ck-btn" data-n>Cancelar</button><button type="button" class="ck-btn perigo" data-s>' + esc(o.botao || "Sim, continuar") + "</button></div>",
        function (ov, fechar) {
          ov.querySelector("[data-n]").onclick = function () { fechar(); fim(null); };
          ov.querySelector("[data-s]").onclick = function () { fechar(); pedirSenha(); };
        });
      j1.el.addEventListener("mousedown", function (e) { if (e.target === j1.el) fim(null); });
      function pedirSenha() {
        verificarSenha("").then(function (temSenha) {
          var semSenha = temSenha === null;
          janela("<h3>🔒 Confirme com a sua " + (semSenha ? "conta" : "senha") + "</h3><p>"
            + (semSenha ? "Sua conta entra pelo Google e não tem senha. Digite o seu e-mail (<strong>" + esc(usuario().email) + "</strong>) para confirmar." : "Digite a senha da sua conta para concluir.") + "</p>"
            + '<input type="' + (semSenha ? "email" : "password") + '" data-senha autocomplete="' + (semSenha ? "off" : "current-password") + '" placeholder="' + (semSenha ? "Seu e-mail" : "Senha") + '">'
            + '<div class="ck-erro" data-erro></div><div class="ck-acoes"><button type="button" class="ck-btn" data-n>Cancelar</button><button type="button" class="ck-btn perigo" data-s>' + esc(o.botaoFinal || "Excluir definitivamente") + "</button></div>",
            function (ov, fechar) {
              var inp = ov.querySelector("[data-senha]"), erro = ov.querySelector("[data-erro]"), ok = ov.querySelector("[data-s]");
              setTimeout(function () { inp.focus(); }, 30);
              ov.querySelector("[data-n]").onclick = function () { fechar(); fim(null); };
              ov.addEventListener("mousedown", function (e) { if (e.target === ov) fim(null); });
              function tentar() {
                var v = inp.value;
                if (!v) { erro.textContent = semSenha ? "Digite o e-mail." : "Digite a senha."; return; }
                ok.disabled = true; erro.textContent = "Conferindo…";
                var conf = semSenha
                  ? Promise.resolve(v.trim().toLowerCase() === String(usuario().email || "").toLowerCase())
                  : verificarSenha(v);
                conf.then(function (certo) {
                  if (!certo) { ok.disabled = false; erro.textContent = semSenha ? "O e-mail não confere." : "Senha incorreta."; inp.select(); return; }
                  fechar(); fim(v);
                }).catch(function (e) { ok.disabled = false; erro.textContent = e.message || "Não foi possível conferir agora."; });
              }
              ok.onclick = tentar;
              inp.addEventListener("keydown", function (e) { if (e.key === "Enter") tentar(); });
            });
        }).catch(function (e) { alert(e.message || "Sem conexão. Tente de novo."); fim(null); });
      }
    });
  }

  // ── Imagens ───────────────────────────────────────────────────────────
  // Recorta no centro (quadrado) e reduz para `lado` px. Devolve data URL.
  function reduzirImagem(arquivo, lado, qualidade) {
    lado = lado || 320;
    return new Promise(function (resolve, reject) {
      if (!arquivo || !/^image\//.test(arquivo.type)) { reject(new Error("Escolha uma imagem (JPG, PNG ou WEBP).")); return; }
      var leitor = new FileReader();
      leitor.onerror = function () { reject(new Error("Não consegui ler a imagem.")); };
      leitor.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("Imagem inválida.")); };
        img.onload = function () {
          var m = Math.min(img.width, img.height), cv = document.createElement("canvas");
          cv.width = cv.height = lado;
          cv.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, lado, lado);
          var url = cv.toDataURL("image/webp", qualidade || 0.85);
          if (url.indexOf("data:image/webp") !== 0) url = cv.toDataURL("image/jpeg", qualidade || 0.85);
          resolve(url);
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  // ── Perfil ────────────────────────────────────────────────────────────
  var perfilDados = null, perfilSync = null, perfilOuvintes = [], perfilPronto = null;
  function perfilVazio() {
    var u = usuario(), nome = u.nome || "";
    try { var e = JSON.parse(localStorage.getItem("md_estrutura_" + u.id) || "null"); if (e && e.perfil && e.perfil.nome) nome = e.perfil.nome; } catch (x) {}
    return { versao: 1, foto: "", nome: nome, nascimento: "", disciplinas: [], formacao: "", cidade: "", uf: "", sobre: "", emailContato: "", telefone: "", lattes: "",
      restrito: { matricula: "", certificados: [], linkPlanos: "", linkSequencias: "", linkRelatorios: "" }, atualizadoEm: "" };
  }
  function normalizarPerfil(p) {
    var v = perfilVazio();
    p = p || {};
    Object.keys(v).forEach(function (k) { if (p[k] === undefined) p[k] = v[k]; });
    p.restrito = p.restrito || {};
    Object.keys(v.restrito).forEach(function (k) { if (p.restrito[k] === undefined) p.restrito[k] = v.restrito[k]; });
    if (!Array.isArray(p.disciplinas)) p.disciplinas = [];
    if (!Array.isArray(p.restrito.certificados)) p.restrito.certificados = [];
    return p;
  }
  function perfilLsKey() { return "md_perfil_" + usuario().id; }
  function avisarPerfil() { perfilOuvintes.forEach(function (f) { try { f(perfilDados); } catch (e) {} }); }
  function iniciarPerfil() {
    if (perfilPronto) return perfilPronto;
    try { perfilDados = normalizarPerfil(JSON.parse(localStorage.getItem(perfilLsKey()) || "null")); } catch (e) { perfilDados = normalizarPerfil(null); }
    perfilSync = S().createScopeSync({
      perUser: true, scope: SCOPE_PERFIL, source: "perfil", debounceMs: 300,
      getLocalPayload: function () { return perfilDados; },
      onRemotePayload: function (p) {
        if (!p) return;
        if (String(p.atualizadoEm || "") < String(perfilDados.atualizadoEm || "")) { perfilSync.schedulePush("local-mais-novo"); return; }
        perfilDados = normalizarPerfil(p);
        try { localStorage.setItem(perfilLsKey(), JSON.stringify(perfilDados)); } catch (e) {}
        avisarPerfil();
      }
    });
    perfilPronto = perfilSync.start().then(function () { avisarPerfil(); return perfilDados; });
    avisarPerfil();
    return perfilPronto;
  }
  function salvarPerfil() {
    perfilDados.atualizadoEm = new Date().toISOString();
    try { localStorage.setItem(perfilLsKey(), JSON.stringify(perfilDados)); } catch (e) {}
    avisarPerfil();
    return perfilSync ? perfilSync.pushNow("force") : Promise.resolve(false);
  }
  function idade(nasc) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nasc || "")) return null;
    var h = new Date(), a = h.getFullYear() - parseInt(nasc.slice(0, 4), 10);
    var mmdd = ("0" + (h.getMonth() + 1)).slice(-2) + "-" + ("0" + h.getDate()).slice(-2);
    if (mmdd < nasc.slice(5)) a--;
    return a >= 0 && a < 130 ? a : null;
  }

  // Botão redondo do perfil (cabeçalhos).
  function chip(el, opcoes) {
    if (!el) return;
    estilo();
    opcoes = opcoes || {};
    function desenhar(p) {
      var nome = (p && p.nome) || usuario().nome || usuario().email || "";
      el.className = "ck-chip" + (opcoes.classe ? " " + opcoes.classe : "");
      el.title = "Meu perfil";
      el.setAttribute("aria-label", "Abrir meu perfil");
      el.innerHTML = p && p.foto ? '<img src="' + esc(p.foto) + '" alt="">' : esc(iniciais(nome));
    }
    if (el.tagName === "A") el.href = "perfil.html"; else el.onclick = function () { window.location.href = "perfil.html"; };
    desenhar(perfilDados);
    perfilOuvintes.push(desenhar);
  }

  // ── Catálogo do INEP ──────────────────────────────────────────────────
  var cacheMun = {};
  function municipios(uf) {
    if (cacheMun[uf]) return Promise.resolve(cacheMun[uf]);
    return cliente().rpc("inep_municipios_da_uf", { p_uf: uf }).then(function (r) {
      if (r.error) throw new Error(r.error.message);
      cacheMun[uf] = r.data || [];
      return cacheMun[uf];
    });
  }
  function buscarEscolas(municipio, termo) {
    return cliente().rpc("inep_buscar_escolas", { p_municipio: municipio || 0, p_termo: termo || "", p_limite: 120 }).then(function (r) {
      if (r.error) throw new Error(r.error.message);
      return r.data || [];
    });
  }
  function escolaInep(codigo) {
    return cliente().rpc("inep_escola", { p_codigo: parseInt(codigo, 10) || 0 }).then(function (r) {
      if (r.error) throw new Error(r.error.message);
      return (r.data || [])[0] || null;
    });
  }
  // Registro guardado na escola do professor (cópia dos dados do INEP).
  function resumoInep(e) {
    return { codigo: e.codigo, nome: e.nome, uf: e.uf, municipio: e.municipio, municipioCodigo: e.municipio_codigo, rede: e.rede || "", localizacao: e.localizacao || "",
      endereco: e.endereco || "", bairro: e.bairro || "", cep: e.cep || "", telefone: e.telefone || "", etapas: e.etapas || "", matriculas: e.matriculas || null, anoCenso: e.ano_censo || null };
  }
  function nomeBonito(nome) {
    // "ESC PADRE CARLOS CASAVEQUIA" → "Escola Padre Carlos Casavequia"
    var mapa = { esc: "Escola", ee: "E.E.", eef: "E.E.F.", eeef: "E.E.E.F.", emef: "E.M.E.F.", emei: "E.M.E.I.", cmei: "CMEI", ceb: "CEB", cei: "CEI", eem: "E.E.M.", "e.e.": "E.E." };
    var peq = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1 };
    return String(nome || "").toLowerCase().split(/\s+/).map(function (p, i) {
      if (mapa[p] && i === 0) return mapa[p];
      if (peq[p] && i) return p;
      if (/^[ivx]+$/.test(p) && p.length <= 4) return p.toUpperCase();
      return p.charAt(0).toUpperCase() + p.slice(1);
    }).join(" ");
  }
  function linhaInep(e) {
    return "INEP " + e.codigo + " · " + esc(e.municipio) + "/" + esc(e.uf)
      + (e.rede ? " · " + esc(e.rede) : "") + (e.localizacao ? " · " + esc(e.localizacao) : "")
      + (e.matriculas ? " · " + e.matriculas + " matrículas" : "") + (e.situacao && e.situacao !== "Em atividade" ? " · " + esc(e.situacao) : "");
  }
  function linkQedu(codigo) { return "https://qedu.org.br/escola/" + codigo; }

  // Estado › Município › Escola. o.aoEscolher(escolaDoInep). o.uf/o.municipio
  // pré-selecionam (ex.: vínculo de uma escola já existente).
  function seletorInep(box, o) {
    estilo();
    o = o || {};
    var ufIni = o.uf || "";
    try { if (!ufIni) ufIni = localStorage.getItem("ck-inep-uf") || ""; } catch (e) {}
    box.innerHTML = '<div class="ck-inep">'
      + '<div class="ck-inep-l"><div><label for="ck-uf">1. Estado</label><select id="ck-uf"><option value="">Escolha o estado…</option>'
      + UFS.map(function (u) { return '<option value="' + u[0] + '"' + (u[0] === ufIni ? " selected" : "") + ">" + u[1] + " (" + u[0] + ")</option>"; }).join("") + "</select></div>"
      + '<div><label for="ck-mun">2. Município</label><select id="ck-mun" disabled><option value="">Escolha o estado primeiro</option></select></div></div>'
      + '<div><label for="ck-termo">3. Escola</label><input id="ck-termo" type="search" autocomplete="off" disabled placeholder="Digite parte do nome ou o código INEP (8 dígitos)"></div>'
      + '<div class="ck-res" aria-live="polite"></div></div>';
    var selUf = box.querySelector("#ck-uf"), selMun = box.querySelector("#ck-mun"), termo = box.querySelector("#ck-termo"), res = box.querySelector(".ck-res");
    var lista = [], pedido = 0, timer = null;

    function aviso(t) { res.innerHTML = '<div class="ck-aviso">' + t + "</div>"; }
    function desenhar(escolas) {
      lista = escolas;
      if (!escolas.length) { aviso(termo.value.trim() ? "Nenhuma escola encontrada com esse nome neste município. Tente outra palavra ou o código INEP." : "Nenhuma escola neste município."); return; }
      res.innerHTML = escolas.map(function (e, i) {
        return '<button type="button" data-i="' + i + '"><b>' + esc(nomeBonito(e.nome)) + "</b><small>" + linhaInep(e) + "</small>"
          + (e.etapas ? '<small>' + esc(e.etapas) + "</small>" : "") + "</button>";
      }).join("") + (escolas.length >= 120 ? '<div class="ck-aviso">Mostrando as 120 primeiras. Digite parte do nome para filtrar.</div>' : "");
      res.querySelectorAll("[data-i]").forEach(function (b) { b.onclick = function () { if (o.aoEscolher) o.aoEscolher(lista[parseInt(b.getAttribute("data-i"), 10)]); }; });
    }
    function buscar() {
      var t = termo.value.trim(), mun = parseInt(selMun.value, 10) || 0;
      if (!mun && !/^\d{8}$/.test(t)) return;
      var meu = ++pedido;
      aviso("Buscando…");
      buscarEscolas(mun, t).then(function (r) { if (meu === pedido) desenhar(r); })
        .catch(function (e) { if (meu === pedido) aviso("Não foi possível buscar agora (" + esc(e.message) + ")."); });
    }
    function carregarMunicipios(uf, municipio) {
      selMun.disabled = true; termo.disabled = true; res.innerHTML = "";
      if (!uf) { selMun.innerHTML = '<option value="">Escolha o estado primeiro</option>'; return; }
      try { localStorage.setItem("ck-inep-uf", uf); } catch (e) {}
      selMun.innerHTML = "<option>Carregando…</option>";
      municipios(uf).then(function (ms) {
        selMun.innerHTML = '<option value="">Escolha o município…</option>' + ms.map(function (m) {
          return '<option value="' + m.codigo + '"' + (String(m.codigo) === String(municipio || "") ? " selected" : "") + ">" + esc(m.nome) + " (" + m.escolas + " escolas)</option>";
        }).join("");
        selMun.disabled = false;
        if (selMun.value) { termo.disabled = false; buscar(); }
      }).catch(function (e) { selMun.innerHTML = "<option>Erro ao carregar</option>"; aviso("Não foi possível carregar os municípios (" + esc(e.message) + ")."); });
    }
    selUf.onchange = function () { carregarMunicipios(selUf.value); };
    selMun.onchange = function () { termo.disabled = !selMun.value; termo.value = ""; if (selMun.value) { buscar(); termo.focus(); } else res.innerHTML = ""; };
    termo.oninput = function () { clearTimeout(timer); timer = setTimeout(buscar, 260); };
    if (ufIni) carregarMunicipios(ufIni, o.municipio);
  }

  // Liga a escola à conta no banco (para a futura plataforma da escola).
  function vincularEscola(escolaLocal, escola) {
    var c = cliente(), u = usuario();
    if (!c || !u.id || !escola) return Promise.resolve(false);
    var inep = escola.inep || null;
    return c.from("professor_escolas").upsert({
      user_id: u.id, escola_local: escolaLocal, inep_codigo: inep ? inep.codigo : null,
      nome: escola.nome || (inep && inep.nome) || "", municipio: inep ? inep.municipio : (escola.municipio || null), uf: inep ? inep.uf : (escola.uf || null),
      atualizado_em: new Date().toISOString()
    }, { onConflict: "user_id,escola_local" }).then(function (r) { if (r.error) console.warn("[ContaSkin] vínculo", r.error); return !r.error; });
  }
  function desvincularEscola(escolaLocal) {
    var c = cliente(), u = usuario();
    if (!c || !u.id) return Promise.resolve(false);
    return c.from("professor_escolas").delete().eq("user_id", u.id).eq("escola_local", escolaLocal).then(function (r) { return !r.error; });
  }

  window.ContaSkin = {
    esc: esc, iniciais: iniciais, janela: janela, estilo: estilo, UFS: UFS,
    verificarSenha: verificarSenha, confirmarPerigo: confirmarPerigo, reduzirImagem: reduzirImagem,
    perfil: {
      iniciar: iniciarPerfil,
      dados: function () { return perfilDados; },
      salvar: salvarPerfil,
      aoMudar: function (f) { perfilOuvintes.push(f); if (perfilDados) f(perfilDados); },
      idade: idade
    },
    chip: chip,
    inep: { municipios: municipios, buscar: buscarEscolas, escola: escolaInep, resumo: resumoInep, nomeBonito: nomeBonito, linha: linhaInep, qedu: linkQedu },
    seletorInep: seletorInep,
    vincularEscola: vincularEscola,
    desvincularEscola: desvincularEscola
  };
})();
