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
      ".ck-aviso{font-size:.84rem;color:var(--ck-mudo);padding:10px 2px}" +
      ".ck-ocup{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin:6px 0}" +
      ".ck-ocup label{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--ck-linha);background:var(--ck-sup2);border-radius:12px;padding:11px 12px;cursor:pointer;color:var(--ck-txt)}" +
      ".ck-ocup label:has(input:checked){border-color:var(--ck-acento);box-shadow:0 0 0 1px var(--ck-acento) inset}" +
      ".ck-ocup input{margin-top:3px;accent-color:var(--ck-acento);width:auto;padding:0}" +
      ".ck-ocup b{display:block;font-size:.88rem}.ck-ocup small{display:block;font-size:.74rem;color:var(--ck-mudo);margin-top:2px;line-height:1.35}";
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

  // Nome de cadastro para exibir (perfil → conta). Nunca mostra o e-mail.
  function nomeExibicao(p) {
    p = p || perfilDados;
    return String((p && p.nome) || usuario().nome || "").trim();
  }
  // Escreve o nome no elemento e acompanha as mudanças do perfil.
  // opcoes.prefixo: texto antes do nome (ex.: "Bem-vindo, ").
  function nomeEm(el, opcoes) {
    if (!el) return;
    opcoes = opcoes || {};
    function desenhar(p) {
      var nome = nomeExibicao(p);
      el.textContent = opcoes.prefixo ? (nome ? opcoes.prefixo + nome : opcoes.prefixo.replace(/[,\s]+$/, "")) : nome;
      el.title = nome;
    }
    desenhar(perfilDados);
    perfilOuvintes.push(desenhar);
  }

  // Botão redondo do perfil (cabeçalhos).
  function chip(el, opcoes) {
    if (!el) return;
    estilo();
    opcoes = opcoes || {};
    function desenhar(p) {
      var nome = nomeExibicao(p);
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

  // ── Ocupação do professor em cada escola (Etapa 15) ──────────────────
  // Regente abre o diário (meu-diario.html); mediador, assistente e AEE abrem
  // o painel dos alunos da Educação Especial (aee.html). Quem é regente e
  // também outra coisa entra pelo diário e troca pelo botão "Mudar painel".
  var OCUPACOES = [
    ["regente", "Professor regente", "Diário das turmas: aulas, presença, notas, plano e contador."],
    ["mediador", "Professor mediador", "Acompanha de perto um ou mais alunos com deficiência."],
    ["assistente", "Assistente Educacional", "Apoia o aluno nas atividades e na rotina escolar."],
    ["aee", "Professor AEE", "Atendimento Educacional Especializado: gestão de vários alunos."]
  ];
  // Escolas fixas do administrador (páginas próprias).
  var FIXAS = [
    { id: "casavequia", href: "casavequia.html", img: "botao-casavequia.png", nome: "Escola Padre Carlos Casavequia" },
    { id: "herminio", href: "herminio.html", img: "botao-herminio.png", nome: "Escola Raimundo Hermínio de Melo" }
  ];
  function rotuloOcupacoes(l) {
    return (l || []).map(function (k) { var o = OCUPACOES.filter(function (x) { return x[0] === k; })[0]; return o ? o[1] : k; }).join(" · ");
  }
  function temAEE(l) { return (l || []).some(function (k) { return k !== "regente"; }); }
  // Página que a escola abre para a ocupação informada ("" = falta informar).
  function destinoEscola(e, fixa) {
    var l = (e && e.ocupacoes) || [];
    if (!l.length) return "";
    if (l.indexOf("regente") >= 0) return fixa ? fixa.href : "meu-diario.html?escola=" + encodeURIComponent(e.id);
    return "aee.html?escola=" + encodeURIComponent(fixa ? fixa.id : e.id);
  }
  // Botão "🔀 Mudar painel": só com 2 ou mais ocupações na escola. Ao clicar,
  // lista as ocupações; a escolhida abre o painel dela (regente → diário,
  // mediador/assistente/AEE → painel da Educação Especial).
  function botaoPainel(el, e, atual) {
    if (!el) return;
    var l = (e && e.ocupacoes) || [];
    el.hidden = l.length < 2;
    if (el.hidden) return;
    if (!document.getElementById("ck-painel-style")) {
      var s = document.createElement("style");
      s.id = "ck-painel-style";
      s.textContent = ".ck-painel-menu{position:absolute;z-index:3000;min-width:250px;max-width:calc(100vw - 24px);background:#fff;color:#2b2b2b;border:1px solid #e8e5de;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.28);padding:6px;font-family:'DM Sans',sans-serif}" +
        ".ck-painel-menu .t{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#7a7a7a;padding:6px 10px 4px}" +
        ".ck-painel-menu button{display:block;width:100%;background:none;border:none;text-align:left;padding:8px 10px;border-radius:8px;font:inherit;cursor:pointer;color:inherit}" +
        ".ck-painel-menu button:hover:not(:disabled){background:#f5f3ee}.ck-painel-menu button:disabled{cursor:default;opacity:.75}" +
        ".ck-painel-menu b{display:block;font-size:.88rem}.ck-painel-menu small{display:block;font-size:.74rem;color:#6a6a6a;margin-top:2px}" +
        ".ck-painel-menu .aqui{font-size:.66rem;font-weight:700;color:#2d6147;margin-left:6px;text-transform:uppercase}" +
        "html.dark-2026 .ck-painel-menu{background:#191c1f;color:#f4f5f6;border-color:#383d43}html.dark-2026 .ck-painel-menu button:hover:not(:disabled){background:#272b30}" +
        "html.dark-2026 .ck-painel-menu small{color:#aeb4bd}html.dark-2026 .ck-painel-menu .aqui{color:#ffa65b}";
      document.head.appendChild(s);
    }
    el.textContent = "🔀 Mudar painel";
    el.removeAttribute("href");
    el.setAttribute("role", "button");
    el.setAttribute("aria-haspopup", "true");
    el.title = "Escolher o painel";
    el.onclick = function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      var velho = document.getElementById("ck-painel-menu");
      if (velho) { velho.remove(); return; }
      var fixa = e.fixa;
      var m = document.createElement("div");
      m.id = "ck-painel-menu"; m.className = "ck-painel-menu"; m.setAttribute("role", "menu");
      m.innerHTML = '<div class="t">Abrir o painel de</div>' + l.map(function (k) {
        var o = OCUPACOES.filter(function (x) { return x[0] === k; })[0] || [k, k, ""];
        var painel = k === "regente" ? "regente" : "aee";
        var href = painel === "regente" ? (fixa ? fixa.href : "meu-diario.html?escola=" + encodeURIComponent(e.id))
          : "aee.html?escola=" + encodeURIComponent(fixa ? fixa.id : e.id);
        var aqui = painel === atual;
        return '<button type="button" role="menuitem" data-href="' + esc(href) + '"' + (aqui ? " disabled" : "") + "><b>" + esc(o[1]) +
          (aqui ? '<span class="aqui">aberto</span>' : "") + "</b><small>" + esc(o[2]) + "</small></button>";
      }).join("");
      document.body.appendChild(m);
      var r = el.getBoundingClientRect();
      var esq = Math.min(r.left, window.innerWidth - m.offsetWidth - 12);
      m.style.top = (r.bottom + window.scrollY + 6) + "px";
      m.style.left = (Math.max(12, esq) + window.scrollX) + "px";
      m.onclick = function (x) { var b = x.target.closest("[data-href]"); if (b && !b.disabled) window.location.href = b.getAttribute("data-href"); };
      setTimeout(function () {
        document.addEventListener("click", function fora(x) { if (!m.contains(x.target)) { m.remove(); document.removeEventListener("click", fora); } });
      }, 0);
    };
  }
  function camposOcupacao(atual) {
    estilo();
    atual = atual || [];
    return '<div class="ck-ocup">' + OCUPACOES.map(function (o) {
      return '<label><input type="checkbox" value="' + o[0] + '"' + (atual.indexOf(o[0]) >= 0 ? " checked" : "") + "><span><b>" + o[1] + "</b><small>" + o[2] + "</small></span></label>";
    }).join("") + "</div>";
  }
  function lerOcupacao(box) { return [].slice.call(box.querySelectorAll(".ck-ocup input:checked")).map(function (i) { return i.value; }); }
  // Janela obrigatória: resolve com a lista escolhida ou null se desistir.
  function escolherOcupacao(nomeEscola, atual) {
    return new Promise(function (resolve) {
      var feito = false;
      janela("<h3>🧑‍🏫 Sua ocupação nesta escola</h3><p>Em <strong>" + esc(nomeEscola) + "</strong> você atua como… (marque uma ou mais)</p>" + camposOcupacao(atual)
        + '<div class="ck-erro" data-erro></div><div class="ck-acoes"><button type="button" class="ck-btn" data-n>Cancelar</button><button type="button" class="ck-btn pri" data-s>Salvar</button></div>',
        function (ov, fechar) {
          ov.querySelector("[data-n]").onclick = function () { fechar(); if (!feito) { feito = true; resolve(null); } };
          ov.addEventListener("mousedown", function (e) { if (e.target === ov && !feito) { feito = true; resolve(null); } });
          ov.querySelector("[data-s]").onclick = function () {
            var l = lerOcupacao(ov);
            if (!l.length) { ov.querySelector("[data-erro]").textContent = "Marque ao menos uma ocupação."; return; }
            feito = true; fechar(); resolve(l);
          };
        });
    });
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
    nomeExibicao: nomeExibicao,
    nomeEm: nomeEm,
    inep: { municipios: municipios, buscar: buscarEscolas, escola: escolaInep, resumo: resumoInep, nomeBonito: nomeBonito, linha: linhaInep, qedu: linkQedu },
    seletorInep: seletorInep,
    ocupacao: { lista: OCUPACOES, rotulo: rotuloOcupacoes, temAEE: temAEE, destino: destinoEscola, botaoPainel: botaoPainel, campos: camposOcupacao, ler: lerOcupacao, escolher: escolherOcupacao },
    FIXAS: FIXAS,
    vincularEscola: vincularEscola,
    desvincularEscola: desvincularEscola
  };
})();
