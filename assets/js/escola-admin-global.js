// ═══════════════════════════════════════════════════════════════════════
// escola-admin-global.js — ferramentas globais nas escolas do administrador
// (Casavequia e Hermínio), iguais às da conta de qualquer professor:
//   • cabeçalho: botão redondo do perfil (perfil.html, onde fica o Sair) e
//     "🔀 Mudar painel" quando há outra ocupação além de regente;
//   • aba ⚙️ Configurações: escola e vínculo com o INEP, ocupação na escola,
//     alunos da Educação Especial (vínculo pelo código), perfil e zona de perigo.
// Tudo é criado com data-runtime-ui (o editor.js tira antes de salvar o layout).
// Dados da escola: professor_dados, escopo "meu-diario:estrutura:v1",
// em E.fixas.<casavequia|herminio> (o mesmo que a tela Escolas usa).
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var herminio = typeof ALUNOS_RH !== "undefined";
  var ID = herminio ? "herminio" : "casavequia";
  var SCOPE = "meu-diario:estrutura:v1";
  var PAPEIS = { mediador: "Professor mediador", assistente: "Assistente Educacional", aee: "Professor AEE", regente: "Professor regente" };
  var S, C, cli, usuario, E = null, sync = null, pronto = false, FIXA = null, AEE = null;

  function esc(v) { return C.esc(v); }
  function toast(m) {
    var t = document.createElement("div"); t.className = "eg-toast"; t.textContent = m;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3000);
  }
  function perfilNome() { var p = C.perfil.dados(); return (p && p.nome) || usuario.nome || usuario.email; }
  function vinc() { E.fixas = E.fixas || {}; E.fixas[ID] = E.fixas[ID] || {}; return E.fixas[ID]; }
  function ocupacoes() { return vinc().ocupacoes || ["regente"]; }
  function escolaObj() { return { id: ID, nome: FIXA.nome, fixa: FIXA, inep: vinc().inep, ocupacoes: ocupacoes() }; }
  function lsKey() { return "md_estrutura_" + usuario.id; }
  function salvar() {
    if (!pronto) { toast("Aguarde: sincronizando…"); return Promise.resolve(false); }
    E.atualizadoEm = new Date().toISOString();
    try { localStorage.setItem(lsKey(), JSON.stringify(E)); } catch (x) {}
    return sync.pushNow("force");
  }

  // ── Visual (só dentro das peças criadas aqui) ─────────────────────────
  var CSS = ""
    + ".eg-acoes{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-left:auto;position:relative;z-index:2}"
    + ".eg-acoes .eg-pill{background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:7px 14px;font-weight:700;font-size:.8rem;cursor:pointer;text-decoration:none;white-space:nowrap;font-family:'DM Sans',sans-serif}"
    + "#sec-cfgglobal{--eg-sup:#fff;--eg-sup2:#faf8f2;--eg-linha:#e8e5de;--eg-tit:#1a3a2a;--eg-ac:#2d6147;--eg-actx:#fff;--eg-mudo:#5a5a5a;--eg-txt:#2b2b2b;--eg-pg:#c0392b;--eg-pgbg:#fdecea}"
    + "html.dark-2026 #sec-cfgglobal{--eg-sup:#191c1f;--eg-sup2:#202327;--eg-linha:#383d43;--eg-tit:#f4f5f6;--eg-ac:#ffa65b;--eg-actx:#1b130b;--eg-mudo:#aeb4bd;--eg-txt:#e9eaec;--eg-pg:#ef8a80;--eg-pgbg:rgba(185,99,93,.14)}"
    + "#sec-cfgglobal .eg-th{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid var(--eg-linha)}"
    + "#sec-cfgglobal .eg-th b{font-family:'Playfair Display',serif;font-size:1.25rem;color:var(--eg-tit)}#sec-cfgglobal .eg-th small{display:block;font-size:.82rem;color:var(--eg-mudo)}"
    + "#sec-cfgglobal .eg-card{background:var(--eg-sup);color:var(--eg-txt);border-radius:14px;box-shadow:0 4px 24px rgba(26,58,42,.10);padding:18px 20px;margin-bottom:16px;border:1px solid transparent}"
    + "html.dark-2026 #sec-cfgglobal .eg-card{border-color:var(--eg-linha)}"
    + "#sec-cfgglobal .eg-card h3{font-family:'Playfair Display',serif;color:var(--eg-tit);font-size:1.08rem;margin-bottom:8px}"
    + "#sec-cfgglobal .eg-card p{font-size:.88rem;line-height:1.55;color:var(--eg-mudo)}#sec-cfgglobal .eg-card p b{color:var(--eg-txt)}"
    + "#sec-cfgglobal .eg-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--eg-linha);background:var(--eg-sup2);color:var(--eg-txt);border-radius:10px;padding:8px 14px;font:inherit;font-weight:700;font-size:.8rem;cursor:pointer;text-decoration:none}"
    + "#sec-cfgglobal .eg-btn.pri{background:var(--eg-ac);border-color:var(--eg-ac);color:var(--eg-actx)}"
    + "#sec-cfgglobal .eg-btn.perigo{background:var(--eg-pgbg);color:var(--eg-pg);border-color:rgba(192,57,43,.35)}"
    + "#sec-cfgglobal .eg-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}"
    + "#sec-cfgglobal .eg-in{padding:9px 11px;border:2px solid var(--eg-linha);border-radius:10px;font:inherit;font-size:.9rem;color:var(--eg-txt);background:var(--eg-sup2);flex:1 1 180px;min-width:0}"
    + "#sec-cfgglobal .eg-perso{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:12px}"
    + "#sec-cfgglobal .eg-face{width:120px;height:120px;border-radius:20px;overflow:hidden;background:#141712;flex-shrink:0;box-shadow:0 6px 20px rgba(0,0,0,.25)}"
    + "#sec-cfgglobal .eg-face img{width:100%;height:100%;object-fit:contain;display:block}#sec-cfgglobal .eg-face.propria img{object-fit:cover}"
    + "#sec-cfgglobal .eg-check{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:.86rem;color:var(--eg-txt);cursor:pointer}"
    + "#sec-cfgglobal .eg-check input{width:18px;height:18px;accent-color:var(--eg-ac)}"
    + "#sec-cfgglobal .eg-inep{margin-top:12px;padding:12px 14px;border-radius:12px;background:var(--eg-sup2);border:1px solid var(--eg-linha);font-size:.86rem;line-height:1.5}"
    + "#sec-cfgglobal .eg-aluno{display:flex;gap:10px;align-items:center;border-top:1px solid var(--eg-linha);padding:9px 0;font-size:.86rem;flex-wrap:wrap}"
    + "#sec-cfgglobal .eg-aluno span{flex:1;min-width:200px}#sec-cfgglobal .eg-aluno small{color:var(--eg-mudo)}"
    + "#sec-cfgglobal .eg-perigo{border:2px solid rgba(192,57,43,.45)!important}#sec-cfgglobal .eg-perigo h3{color:var(--eg-pg)}"
    + "#sec-cfgglobal .eg-pl{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px 0;border-top:1px solid var(--eg-linha)}"
    + "#sec-cfgglobal .eg-pl>div:first-child{flex:1;min-width:220px}#sec-cfgglobal .eg-pl b{display:block;font-size:.9rem;color:var(--eg-txt)}#sec-cfgglobal .eg-pl span{font-size:.78rem;color:var(--eg-mudo)}"
    + ".eg-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#1a3a2a;color:#fff;padding:10px 18px;border-radius:999px;font-size:.84rem;z-index:40000;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:92vw;text-align:center;font-family:'DM Sans',sans-serif}"
    + "html.dark-2026 .eg-toast{background:#272b30;border:1px solid #383d43}"
    + "@media(max-width:760px){.eg-acoes{margin:10px auto 0;justify-content:center;width:100%}}";

  // ── Cabeçalho ─────────────────────────────────────────────────────────
  function montarCabecalho() {
    var cab = document.querySelector("header.cab .cab-i");
    if (!cab || document.getElementById("eg-acoes")) return;
    var box = document.createElement("div");
    box.id = "eg-acoes"; box.className = "eg-acoes"; box.setAttribute("data-runtime-ui", "escola-global");
    box.innerHTML = '<a class="eg-pill" id="eg-painel" href="#" hidden>🔀 Mudar painel</a><a id="eg-chip" href="perfil.html"></a>';
    cab.appendChild(box);
    C.chip(document.getElementById("eg-chip"));
    // O "← Início" fixo leva à tela Escolas.
    var voltar = document.querySelector('body > a[href="escolas.html"], .rs-topo > a[href="escolas.html"]');
    if (voltar && /Início/.test(voltar.textContent)) voltar.innerHTML = "&#8592; Escolas";
  }
  function atualizarPainel() {
    var pn = document.getElementById("eg-painel");
    if (pn && C.ocupacao.botaoPainel) C.ocupacao.botaoPainel(pn, escolaObj(), "regente");
  }

  // ── Aba ⚙️ Configurações ──────────────────────────────────────────────
  function criarAba() {
    if (document.getElementById("sec-cfgglobal")) return;
    var nav = document.querySelector(".nav-i");
    var bt = document.createElement("button");
    bt.className = "nb"; bt.type = "button"; bt.innerHTML = "&#9881;&#65039; Configurações";
    bt.setAttribute("onclick", herminio ? "aba('sec-cfgglobal',this)" : "aba('cfgglobal',this)");
    bt.setAttribute("data-runtime-ui", "escola-global");
    if (nav) {
      if (!herminio) { var sp = document.createElement("div"); sp.className = "sp"; sp.setAttribute("data-runtime-ui", "escola-global"); nav.appendChild(sp); }
      nav.appendChild(bt);
    }
    bt.addEventListener("click", function () { desenharConfig(); });
    var sec = document.createElement("section");
    sec.className = "sec"; sec.id = "sec-cfgglobal"; sec.setAttribute("data-runtime-ui", "escola-global");
    (document.querySelector("main.main") || document.querySelector("main") || document.body).appendChild(sec);
  }

  function carregarAEE() {
    return cli.from("aee_vinculos").select("aluno_id,papel,disciplina,escola_local,aee_alunos(id,nome,codigo,turma,serie,deficiencias)").eq("user_id", usuario.id)
      .then(function (r) { AEE = (r.data || []).filter(function (v) { return v.aee_alunos && (!v.escola_local || v.escola_local === ID); }); return AEE; });
  }
  function desenharConfig() {
    var sec = document.getElementById("sec-cfgglobal"); if (!sec) return;
    var i = vinc().inep, oc = ocupacoes();
    sec.innerHTML = '<div class="eg-th"><div style="font-size:1.6rem">⚙️</div><div><b>Configurações</b><small>' + esc(FIXA.nome) + " · as mesmas ferramentas da conta de qualquer professor</small></div></div>"
      + '<div class="eg-card"><h3>🏫 Escola</h3><p><b>' + esc(FIXA.nome) + '</b></p>'
      + '<div class="eg-inep">' + (i
        ? "<b>🏛️ INEP " + i.codigo + "</b> — " + esc(i.nome) + "<br>" + esc(i.municipio) + "/" + esc(i.uf) + (i.rede ? " · " + esc(i.rede) : "") + (i.localizacao ? " · " + esc(i.localizacao) : "") + (i.etapas ? " · " + esc(i.etapas) : "")
          + '<div class="eg-row"><button type="button" class="eg-btn" data-eg="inep">Trocar vínculo</button><a class="eg-btn" href="' + C.inep.qedu(i.codigo) + '" target="_blank" rel="noopener">Ver no QEdu ↗</a></div>'
        : "<b>🔗 Ainda não ligada ao INEP.</b><br>O código INEP identifica a escola no país e prepara a ligação com a plataforma da escola (Conex-ED)."
          + '<div class="eg-row"><button type="button" class="eg-btn pri" data-eg="inep">Vincular ao INEP</button></div>') + "</div></div>"
      + '<div class="eg-card"><h3>🎨 Personalização</h3><p>Imagem do botão desta escola na tela Escolas. Ao trocar, você recorta e ajusta a imagem.</p>'
      + '<div class="eg-perso"><div class="eg-face' + (vinc().imagem ? " propria" : "") + '"><img src="' + esc(vinc().imagem || FIXA.img) + '" alt=""></div><div>'
      + '<div class="eg-row" style="margin-top:0"><label class="eg-btn pri" style="cursor:pointer">🖼️ Trocar imagem<input type="file" accept="image/*" data-eg="imagem" hidden></label>'
      + (vinc().imagem ? '<button type="button" class="eg-btn" data-eg="imagem-original">Voltar à imagem original</button>' : "") + "</div>"
      + '<label class="eg-check"><input type="checkbox" data-eg="mostrar-nome"' + (vinc().mostrarNome ? " checked" : "") + "> Mostrar o nome da escola abaixo da imagem, na tela Escolas</label></div></div></div>"
      + '<div class="eg-card"><h3>🧑‍🏫 Sua ocupação nesta escola</h3><p><b>' + esc(C.ocupacao.rotulo(oc)) + "</b>. Regente abre este diário; mediador, assistente ou AEE abrem o painel da Educação Especial. Com mais de uma, o botão 🔀 Mudar painel aparece no cabeçalho.</p>"
      + '<div class="eg-row"><button type="button" class="eg-btn" data-eg="ocupacao">Trocar ocupação</button>' + (C.ocupacao.temAEE(oc) ? '<a class="eg-btn" href="aee.html?escola=' + ID + '">♿ Abrir o painel AEE</a>' : "") + "</div></div>"
      + '<div class="eg-card"><h3>♿ Alunos da Educação Especial</h3><p>Tem aluno com deficiência acompanhado por mediador, assistente ou professor do AEE? Peça o <b>código do aluno</b> (ex.: AEE-7K3M-Q9TX) e vincule-se: você vê o perfil, as orientações e os documentos dele, e lança notas e registros da sua disciplina no mesmo perfil que a equipe usa.</p>'
      + '<div class="eg-row"><input class="eg-in" data-eg="codigo" placeholder="Código do aluno" style="text-transform:uppercase;max-width:230px"><input class="eg-in" data-eg="disc" placeholder="Sua disciplina com ele" list="eg-discs"><button type="button" class="eg-btn pri" data-eg="vincular">Vincular</button></div>'
      + '<datalist id="eg-discs">' + (herminio ? ["Língua Portuguesa", "Língua Inglesa", "Língua Espanhola", "Arte", "Redação"] : ["Língua Portuguesa", "Tecnologia e Linguagens", "Tecnologia e Ciências Humanas", "Arte"]).map(function (d) { return "<option>" + d + "</option>"; }).join("") + "</datalist>"
      + '<div data-eg="lista" style="margin-top:10px"><p>Carregando…</p></div></div>'
      + '<div class="eg-card"><h3>👤 Seu perfil</h3><p>Nome, foto, disciplinas, documentos restritos, troca de senha e o botão Sair ficam no seu perfil.</p><div class="eg-row"><a class="eg-btn" href="perfil.html">Abrir meu perfil</a><a class="eg-btn" href="escolas.html">← Todas as escolas</a></div></div>'
      + '<div class="eg-card eg-perigo"><h3>⚠️ Zona de perigo</h3><p>Cada ação pede confirmação e a senha da sua conta.</p>'
      + '<div class="eg-pl"><div><b>Remover o vínculo com o INEP</b><span>A escola continua; só deixa de estar ligada ao cadastro oficial.</span></div><button type="button" class="eg-btn perigo" data-eg="tirar-inep"' + (i ? "" : " disabled") + ">Remover vínculo</button></div>"
      + '<div class="eg-pl"><div><b>Sair do perfil de um aluno da Educação Especial</b><span>Você deixa de ver o aluno; o perfil continua para a equipe.</span></div><div class="eg-row" style="margin:0"><select class="eg-in" data-eg="sair-aluno"></select><button type="button" class="eg-btn perigo" data-eg="sair">Sair do perfil</button></div></div>'
      + '<div class="eg-pl"><div><b>Excluir a escola</b><span>Apaga do banco TODOS os registros de ' + esc(FIXA.nome) + ': aulas, presenças, atividades, notas lançadas, ocorrências, observações, chamada, turmas, metas e o estado sincronizado das páginas. Uma cópia fica na lixeira permanente. A escola sai da sua conta e a página deixa de publicar no banco. Os relatos escritos no código da página continuam lá até serem removidos num commit.</span></div><button type="button" class="eg-btn perigo" data-eg="excluir-escola">Excluir escola</button></div>'
      + "</div>";
    ligar(sec);
    (AEE ? Promise.resolve(AEE) : carregarAEE()).then(function () { desenharAEE(sec); });
  }
  function desenharAEE(sec) {
    var box = sec.querySelector('[data-eg="lista"]'), sel = sec.querySelector('[data-eg="sair-aluno"]');
    if (!box) return;
    box.innerHTML = AEE.length ? AEE.map(function (v) {
      var a = v.aee_alunos;
      return '<div class="eg-aluno"><span><b>' + esc(a.nome) + "</b><br><small>" + esc([a.serie, a.turma].filter(Boolean).join(" · ")) + " · " + esc((a.deficiencias || []).join(", ")) + " · você: " + esc(PAPEIS[v.papel] || v.papel) + (v.disciplina ? " (" + esc(v.disciplina) + ")" : "") + '</small></span><a class="eg-btn" href="aee.html?escola=' + ID + "&aluno=" + a.id + '">Abrir perfil</a></div>';
    }).join("") : "<p>Nenhum aluno vinculado nesta escola.</p>";
    sel.innerHTML = AEE.map(function (v) { return '<option value="' + v.aluno_id + '">' + esc(v.aee_alunos.nome) + "</option>"; }).join("") || "<option value=''>—</option>";
    sec.querySelector('[data-eg="sair"]').disabled = !AEE.length;
  }
  function ligar(sec) {
    sec.querySelector('[data-eg="inep"]').onclick = vincularInep;
    sec.querySelector('[data-eg="ocupacao"]').onclick = function () {
      C.ocupacao.escolher(FIXA.nome, ocupacoes()).then(function (l) {
        if (!l) return;
        vinc().ocupacoes = l;
        salvar().then(function () {
          if (l.indexOf("regente") < 0) { location.replace("aee.html?escola=" + ID); return; }
          toast("Ocupação salva."); atualizarPainel(); desenharConfig();
        });
      });
    };
    sec.querySelector('[data-eg="vincular"]').onclick = function () {
      var cod = sec.querySelector('[data-eg="codigo"]').value.trim().toUpperCase(), disc = sec.querySelector('[data-eg="disc"]').value.trim();
      if (!cod) return toast("Informe o código do aluno.");
      cli.rpc("aee_vincular", { p_codigo: cod, p_papel: "regente", p_escola_local: ID, p_nome_profissional: perfilNome(), p_disciplina: disc || null }).then(function (r) {
        if (r.error) return toast(r.error.message);
        toast("Vinculado a " + r.data.nome + ".");
        carregarAEE().then(function () { desenharConfig(); });
      });
    };
    // Personalização: imagem própria (recortada) e nome abaixo da imagem.
    sec.querySelector('[data-eg="imagem"]').onchange = function () {
      var f = this.files[0]; this.value = ""; if (!f) return;
      C.recortarImagem(f, 400, 0.88, { titulo: "Ajustar a imagem da escola", texto: "Arraste para posicionar e use o zoom. É assim que a escola aparece no botão da tela Escolas.", botao: "Usar imagem", forma: "quadrado" })
        .then(function (url) { if (!url) return; vinc().imagem = url; return salvar().then(function () { toast("Imagem da escola salva."); desenharConfig(); }); })
        .catch(function (x) { toast(x.message); });
    };
    var orig = sec.querySelector('[data-eg="imagem-original"]');
    if (orig) orig.onclick = function () { delete vinc().imagem; salvar().then(function () { toast("Imagem original de volta."); desenharConfig(); }); };
    sec.querySelector('[data-eg="mostrar-nome"]').onchange = function () {
      var on = this.checked; if (on) vinc().mostrarNome = true; else delete vinc().mostrarNome;
      salvar().then(function () { toast(on ? "O nome vai aparecer abaixo da imagem." : "O nome não aparece mais abaixo da imagem."); });
    };
    sec.querySelector('[data-eg="tirar-inep"]').onclick = function () {
      C.confirmarPerigo({ titulo: "Remover o vínculo com o INEP?", texto: FIXA.nome + " deixa de estar ligada ao cadastro oficial. Dá para vincular de novo quando quiser.", botao: "Sim, remover", botaoFinal: "Remover" }).then(function (ok) {
        if (!ok) return;
        delete vinc().inep;
        salvar().then(function () { C.vincularEscola(ID, { nome: FIXA.nome }); toast("Vínculo removido."); desenharConfig(); });
      });
    };
    sec.querySelector('[data-eg="excluir-escola"]').onclick = excluirEscola;
    sec.querySelector('[data-eg="sair"]').onclick = function () {
      var id = sec.querySelector('[data-eg="sair-aluno"]').value; if (!id) return;
      var v = AEE.filter(function (x) { return x.aluno_id === id; })[0];
      C.confirmarPerigo({ titulo: "Sair do perfil de " + v.aee_alunos.nome + "?", texto: "Para voltar, você vai precisar do código " + esc(v.aee_alunos.codigo) + ".", botao: "Sim, sair" }).then(function (ok) {
        if (!ok) return;
        cli.from("aee_vinculos").delete().eq("aluno_id", id).eq("user_id", usuario.id).then(function (r) {
          if (r.error) return toast(r.error.message);
          toast("Você saiu do perfil."); carregarAEE().then(function () { desenharConfig(); });
        });
      });
    };
  }
  // Exclui a escola (Etapa 16): tudo do banco, com cópia na lixeira permanente.
  function excluirEscola() {
    if (!pronto) return toast("Aguarde: sincronizando…");
    C.confirmarPerigo({
      titulo: "Excluir " + FIXA.nome + "?",
      texto: "<b>Todos os registros desta escola serão apagados do banco</b>: aulas, presenças, atividades, notas lançadas, ocorrências, observações, chamada, turmas, metas e o estado das páginas. Os boletins da Biblioteca ligados a esta escola ficam sem esses dados. Uma cópia fica na lixeira permanente do banco.",
      botao: "Sim, excluir a escola", botaoFinal: "Excluir a escola e todos os registros"
    }).then(function (senha) {
      if (!senha) return;
      toast("Excluindo a escola…");
      C.verificarSenha("").then(function (tem) {
        return cli.rpc("relatorio_excluir_escola_admin", { p_escola: ID, p_senha: tem === null ? "" : senha, p_confirmacao: tem === null ? senha : "" });
      }).then(function (r) {
        if (r.error) throw new Error(r.error.message);
        var c = r.data || {};
        vinc().excluida = { em: new Date().toISOString(), contagem: c };
        delete vinc().inep;
        return Promise.all([salvar(), C.desvincularEscola(ID)]).then(function () {
          alert("Escola excluída.\n\n" + (c.aulas || 0) + " aulas, " + (c.lancamentos || 0) + " lançamentos, " + (c.ocorrencias || 0) + " ocorrências, " + (c.observacoes || 0) + " observações e " + (c.estados || 0) + " estados apagados (cópia na lixeira permanente).");
          location.replace("escolas.html");
        });
      }).catch(function (e) { toast("Não foi possível excluir: " + (e.message || e)); });
    });
  }
  // Escola já excluída: a página não é mais usada (nada volta ao banco).
  function avisarExcluida(quando) {
    if (document.getElementById("eg-excluida")) return;
    var ov = document.createElement("div");
    ov.id = "eg-excluida"; ov.setAttribute("data-runtime-ui", "escola-global");
    ov.style.cssText = "position:fixed;inset:0;z-index:50000;background:rgba(10,12,10,.92);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'DM Sans',sans-serif";
    ov.innerHTML = '<div style="background:#fff;color:#2b2b2b;border-radius:16px;max-width:440px;padding:24px;text-align:center"><div style="font-size:2rem">🗑️</div><h3 style="margin:8px 0">' + esc(FIXA.nome) + " foi excluída</h3><p style=\"font-size:.9rem;color:#5a5a5a;line-height:1.5\">Os registros desta escola foram apagados do banco" + (quando ? " em " + new Date(quando).toLocaleDateString("pt-BR") : "") + ". Uma cópia está na lixeira permanente.</p><a href=\"escolas.html\" style=\"display:inline-block;margin-top:14px;background:#2d6147;color:#fff;border-radius:10px;padding:10px 18px;font-weight:700;text-decoration:none\">← Voltar para as escolas</a></div>";
    document.body.appendChild(ov);
  }
  function conferirExcluida() {
    cli.from("relatorio_escolas_excluidas").select("excluida_em,slug").then(function (r) {
      var slug = herminio ? "raimundo-herminio-de-melo-2" : "padre-carlos-casavequia";
      var x = (r.data || []).filter(function (e) { return e.slug === slug; })[0];
      if (x) avisarExcluida(x.excluida_em);
    });
  }

  function vincularInep() {
    var atual = vinc().inep;
    C.janela('<h3>🔗 Vincular ao INEP</h3><p>Encontre <strong>' + esc(FIXA.nome) + "</strong> no catálogo oficial.</p><div data-sel></div><div class=\"ck-acoes\"><button type=\"button\" class=\"ck-btn\" data-fechar>Fechar</button></div>", function (ov, fechar) {
      ov.querySelector(".ck-jan").style.maxWidth = "720px";
      ov.querySelector("[data-fechar]").onclick = fechar;
      C.seletorInep(ov.querySelector("[data-sel]"), {
        uf: (atual && atual.uf) || "AC", municipio: atual && atual.municipioCodigo,
        aoEscolher: function (x) {
          var r = C.inep.resumo(x);
          vinc().inep = r; vinc().ligadoEm = new Date().toISOString();
          salvar().then(function () { C.vincularEscola(ID, { nome: FIXA.nome, inep: r }); fechar(); toast("Escola ligada ao INEP " + r.codigo + "."); desenharConfig(); });
        }
      });
    });
  }

  // ── Início ────────────────────────────────────────────────────────────
  function iniciar() {
    S = window.RelatorioSupabaseSync; C = window.ContaSkin;
    if (!S || !C) { setTimeout(iniciar, 150); return; }
    S.auth.whenAuthorized().then(function () {
      if (!S.auth.isAdmin()) return;
      cli = S.getClient(); usuario = S.auth.currentUser();
      FIXA = C.FIXAS.filter(function (f) { return f.id === ID; })[0];
      if (!FIXA) return;
      if (!document.getElementById("eg-estilo")) { var st = document.createElement("style"); st.id = "eg-estilo"; st.setAttribute("data-runtime-ui", "escola-global"); st.textContent = CSS; document.head.appendChild(st); }
      try { E = JSON.parse(localStorage.getItem(lsKey()) || "null"); } catch (x) {}
      if (!E || !Array.isArray(E.turmas)) E = { versao: 1, perfil: {}, escolas: [], turmas: [], atualizadoEm: "" };
      C.perfil.iniciar();
      montarCabecalho();
      criarAba();
      atualizarPainel();
      sync = S.createScopeSync({
        perUser: true, scope: SCOPE, source: ID + "-global", debounceMs: 250,
        getLocalPayload: function () { return E; },
        onRemotePayload: function (p) {
          if (!p || !Array.isArray(p.turmas)) return;
          if (String(p.atualizadoEm || "") < String(E.atualizadoEm || "")) { sync.schedulePush("local-mais-novo"); return; }
          E = p;
          try { localStorage.setItem(lsKey(), JSON.stringify(E)); } catch (x) {}
          atualizarPainel();
          var sec = document.getElementById("sec-cfgglobal"); if (sec && sec.classList.contains("on")) desenharConfig();
        }
      });
      sync.start().then(function () { pronto = true; atualizarPainel(); desenharConfig(); if (vinc().excluida) avisarExcluida(vinc().excluida.em); });
      conferirExcluida();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
