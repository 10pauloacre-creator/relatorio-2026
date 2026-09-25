// ═══════════════════════════════════════════════════════════════════════
// diario-extras.js — regras globais dos relatos diários (25/09/2026):
// Casavequia, Hermínio e Meu Diário (todas as escolas das contas).
//
// 1. JUSTIFICATIVA DE FALTA: todo aluno em "falta justificada" na aba 👥
//    ganha o ícone 📄. O ícone abre a janela da justificativa (texto e
//    anexos: arrastar, colar ou escolher o arquivo) com "Salvar". Fica
//    guardada naquele dia (aula) e abre de novo pelo mesmo ícone.
// 2. PRAZO PARA ENTREGA: cada atividade (aba 📝) ganha no topo a barra
//    "⏰ Prazo para entrega" (dias e horas). Ativado, a contagem começa;
//    ao terminar, aparece na tela o aviso de que o prazo acabou.
//
// A página só precisa carregar o script: os alunos e as atividades são
// achados no DOM de cada página (seletores em ONDE). Nada vai para o layout
// salvo (data-runtime-ui).
//
// DADOS: professor_dados, escopo "diario:extras:v1" (só o dono), + cópia
// local. Chaves: "<escola>|<chave da presença>|<nº>" e "<escola>|<chave da
// atividade>". Mescla por item, vale o mais novo ("em"). Anexos no bucket
// privado professor-arquivos, pasta <user_id>/justificativas/.
// API: window.DiarioExtras (prazo, definirPrazo, moverPrazo, justificativa).
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var SCOPE = "diario:extras:v1";
  var BUCKET = "professor-arquivos";
  var TIPOS_OK = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png", "image/webp"];
  var MAX = 10 * 1024 * 1024;

  function escolaDaPagina() {
    if (document.getElementById("md-main")) return "md:" + (new URLSearchParams(location.search).get("escola") || "");
    if (typeof ALUNOS_RH !== "undefined") return "herminio";
    if (typeof ALUNOS !== "undefined" && typeof PRESENCA !== "undefined") return "casavequia";
    return "";
  }
  var ESC = "";

  // Onde estão os alunos (presença) e as atividades em cada página.
  var ONDE = {
    casavequia: {
      linhas: ".ar2[data-pres][data-n]",
      linha: function (el) { return { chave: el.getAttribute("data-pres"), n: el.getAttribute("data-n"), fj: el.classList.contains("fj"), nome: txt(el.querySelector(".anm")) }; },
      atividades: '.ipane[id^="a-t"]',
      chaveAtv: function (pane) { return "atv-" + pane.id.slice(2); }
    },
    herminio: {
      linhas: 'button.rh-mark-btn[data-rh-toggle="presenca"]',
      linha: function (el) { return { chave: "pl-" + String(el.getAttribute("data-pane") || "").slice(2), n: el.getAttribute("data-aluno"), fj: el.classList.contains("is-just"), nome: txt(el.querySelector(".mk-name")) }; },
      atividades: '.ipane[id^="a-t"]',
      chaveAtv: function (pane) { return "a-" + pane.id.slice(2); }
    },
    md: {
      linhas: "[data-md-pres] .md-m[data-n]",
      linha: function (el) { var h = el.closest("[data-md-pres]"); return { chave: "pl-" + h.getAttribute("data-md-pres"), n: el.getAttribute("data-n"), fj: el.classList.contains("fj"), nome: txt(el.querySelector(".nm")) }; },
      atividades: "[data-md-atv]",
      chaveAtv: function (host) { return "atv-" + host.getAttribute("data-md-atv"); },
      antesDe: true
    }
  };
  function onde() { return ONDE[ESC.indexOf("md:") === 0 ? "md" : ESC] || null; }

  var S = null, sync = null, pronto = false, uid = "";
  var D = vazio(), pendentes = [];

  function vazio() { return { versao: 1, just: {}, prazos: {}, atualizadoEm: "" }; }
  function txt(el) { return el ? el.textContent.trim() : ""; }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
  function agoraIso() { return new Date().toISOString(); }
  function dois(n) { return ("0" + n).slice(-2); }
  function dataHora(iso) { var d = new Date(iso); return dois(d.getDate()) + "/" + dois(d.getMonth() + 1) + " às " + dois(d.getHours()) + ":" + dois(d.getMinutes()); }
  function toast(msg, fixo) {
    var t = document.createElement("div"); t.className = "dx-toast" + (fixo ? " fixo" : ""); t.setAttribute("data-runtime-ui", "diario-extras");
    t.innerHTML = '<span>' + esc(msg) + "</span>" + (fixo ? '<button type="button" aria-label="Fechar">✕</button>' : "");
    var pilha = document.getElementById("dx-pilha");
    if (!pilha) { pilha = document.createElement("div"); pilha.id = "dx-pilha"; pilha.setAttribute("data-runtime-ui", "diario-extras"); document.body.appendChild(pilha); }
    pilha.appendChild(t);
    if (fixo) t.querySelector("button").onclick = function () { t.remove(); };
    else setTimeout(function () { t.remove(); }, 3200);
  }
  function kJust(chave, n) { return ESC + "|" + chave + "|" + n; }
  function kAtv(chave) { return ESC + "|" + chave; }

  // ── dados ──────────────────────────────────────────────────────────
  function lsKey() { return "dx_extras_" + uid; }
  function lerLocal() { try { var r = JSON.parse(localStorage.getItem(lsKey()) || "null"); if (r && r.just) return normalizar(r); } catch (e) {} return vazio(); }
  function normalizar(r) { r = r || vazio(); r.just = r.just || {}; r.prazos = r.prazos || {}; return r; }
  function gravar() {
    D.atualizadoEm = agoraIso();
    try { localStorage.setItem(lsKey(), JSON.stringify(D)); } catch (e) {}
    if (sync && pronto) sync.pushNow("force");
  }
  function mesclarMapa(local, remoto) {
    var mudouLocal = false, faltaNoRemoto = false;
    Object.keys(remoto || {}).forEach(function (k) {
      var r = remoto[k], l = local[k];
      if (!l || String(r.em || "") > String(l.em || "")) { local[k] = r; mudouLocal = true; }
    });
    Object.keys(local).forEach(function (k) { var r = (remoto || {})[k]; if (!r || String(local[k].em || "") > String(r.em || "")) faltaNoRemoto = true; });
    return { mudou: mudouLocal, enviar: faltaNoRemoto };
  }
  function aplicarRemoto(p) {
    if (!p || typeof p !== "object") return;
    var a = mesclarMapa(D.just, p.just), b = mesclarMapa(D.prazos, p.prazos);
    try { localStorage.setItem(lsKey(), JSON.stringify(D)); } catch (e) {}
    if (a.mudou || b.mudou) agendarDecorar(true);
    if ((a.enviar || b.enviar) && sync) sync.schedulePush("merge");
  }

  // ── prazos ─────────────────────────────────────────────────────────
  function prazo(chave) { var p = D.prazos[kAtv(chave)]; return p && p.ativo ? p : null; }
  function definirPrazo(chave, o, rotulo) {
    if (!chave) return;
    if (!pronto) { pendentes.push(function () { definirPrazo(chave, o, rotulo); }); return; }
    o = o || {};
    var k = kAtv(chave), atual = D.prazos[k];
    var dias = Math.max(0, parseInt(o.dias, 10) || 0), horas = Math.max(0, parseInt(o.horas, 10) || 0);
    if (!o.ativo || (!dias && !horas)) {
      if (atual && atual.ativo) { D.prazos[k] = { ativo: false, em: agoraIso() }; gravar(); agendarDecorar(true); }
      return;
    }
    // Mesmo prazo já correndo: a contagem continua de onde estava.
    if (atual && atual.ativo && atual.dias === dias && atual.horas === horas) {
      if (rotulo && atual.rotulo !== rotulo) { atual.rotulo = rotulo; atual.em = agoraIso(); gravar(); }
      return;
    }
    var ini = new Date();
    D.prazos[k] = { ativo: true, dias: dias, horas: horas, inicio: ini.toISOString(), fim: new Date(ini.getTime() + (dias * 24 + horas) * 3600000).toISOString(), rotulo: rotulo || (atual && atual.rotulo) || "", em: agoraIso() };
    esquecerAviso(k);
    gravar(); agendarDecorar(true);
  }
  function moverPrazo(de, para) {
    if (!de || !para || de === para) return;
    if (!pronto) { pendentes.push(function () { moverPrazo(de, para); }); return; }
    var p = D.prazos[kAtv(de)];
    if (!p || !p.ativo) return;
    D.prazos[kAtv(para)] = Object.assign({}, p, { em: agoraIso() });
    D.prazos[kAtv(de)] = { ativo: false, em: agoraIso() };
    gravar();
  }
  function restante(p) {
    var ms = new Date(p.fim).getTime() - Date.now();
    if (ms <= 0) return null;
    var min = Math.ceil(ms / 60000), d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
    if (ms < 120000) return Math.ceil(ms / 1000) + " s";
    return (d ? d + "d " : "") + (d || h ? dois(h) + "h " : "") + dois(m) + "min";
  }
  function avisadosKey() { return "dx_avisados_" + uid; }
  function avisados() { try { return JSON.parse(localStorage.getItem(avisadosKey()) || "{}"); } catch (e) { return {}; } }
  function esquecerAviso(k) { var a = avisados(); if (a[k]) { delete a[k]; try { localStorage.setItem(avisadosKey(), JSON.stringify(a)); } catch (e) {} } }
  function conferirPrazos() {
    if (!pronto) return;
    var a = avisados(), mudou = false, agora = Date.now();
    Object.keys(D.prazos).forEach(function (k) {
      if (k.indexOf(ESC + "|") !== 0) return;
      var p = D.prazos[k];
      if (!p.ativo || !p.fim || a[k] === p.fim || new Date(p.fim).getTime() > agora) return;
      a[k] = p.fim; mudou = true;
      toast("⏰ O prazo para entrega " + (p.rotulo ? "de “" + p.rotulo + "” " : "da atividade ") + "acabou (" + dataHora(p.fim) + ").", true);
    });
    if (mudou) try { localStorage.setItem(avisadosKey(), JSON.stringify(a)); } catch (e) {}
  }

  // Barra no topo da atividade.
  function rotuloDaAtividade(slot) {
    if (slot.getAttribute("data-dx-rotulo")) return slot.getAttribute("data-dx-rotulo");
    var card = slot.closest(".ea"), pane = slot.closest(".ipane") || slot.parentNode;
    var tema = pane && pane.querySelector(".atv-tema strong");
    var d = card ? txt(card.querySelector(".edb .d")) + "/" + txt(card.querySelector(".edb .my")).split(/\s+/)[0] : "";
    var disc = card ? txt(card.querySelector(".em .ed")).split("—")[0].trim() : "";
    var sec = slot.closest(".sec"), turma = sec ? txt(document.querySelector('.nb[onclick*="' + sec.id.replace(/^sec-/, "") + '\'"]')) : "";
    return [tema ? txt(tema) : disc, turma, d].filter(Boolean).join(" · ");
  }
  function htmlBarra(chave) {
    var p = prazo(chave);
    if (!p) return '<span class="dx-p-ic">⏰</span><span class="dx-p-t">Prazo para entrega: <strong>sem prazo</strong></span><button type="button" class="dx-p-b" data-dx-acao="definir">Definir prazo</button>';
    var r = restante(p);
    return '<span class="dx-p-ic">' + (r ? "⏰" : "⛔") + '</span><span class="dx-p-t">' +
      (r ? "Prazo para entrega: até <strong>" + dataHora(p.fim) + "</strong> · faltam <strong data-dx-conta>" + r + "</strong>" : "<strong>Prazo encerrado</strong> em " + dataHora(p.fim)) +
      ' <small>(' + (p.dias ? p.dias + (p.dias > 1 ? " dias" : " dia") : "") + (p.dias && p.horas ? " e " : "") + (p.horas ? p.horas + (p.horas > 1 ? " horas" : " hora") : "") + ")</small></span>" +
      '<button type="button" class="dx-p-b" data-dx-acao="definir">Alterar</button><button type="button" class="dx-p-b" data-dx-acao="remover">Remover</button>';
  }
  function classeBarra(chave) {
    var p = prazo(chave);
    if (!p) return "dx-prazo";
    var ms = new Date(p.fim).getTime() - Date.now();
    return "dx-prazo " + (ms <= 0 ? "fim" : ms < 86400000 ? "perto" : "ativo");
  }
  function desenharBarra(slot) {
    var chave = slot.getAttribute("data-dx-prazo");
    if (slot.querySelector(".dx-p-form")) return;
    var cl = classeBarra(chave), html = htmlBarra(chave);
    if (slot.className !== cl) slot.className = cl;
    if (slot.__dxHtml !== html || !slot.firstChild) { slot.innerHTML = html; slot.__dxHtml = html; }
  }
  function abrirFormPrazo(slot) {
    var chave = slot.getAttribute("data-dx-prazo"), p = prazo(chave) || { dias: 1, horas: 0 };
    slot.className = "dx-prazo edit";
    slot.innerHTML = '<div class="dx-p-form"><span class="dx-p-ic">⏰</span><strong>Prazo para entrega</strong>' +
      '<label><input type="number" min="0" max="365" data-dx-dias value="' + (p.dias || 0) + '"> dias</label>' +
      '<label><input type="number" min="0" max="23" data-dx-horas value="' + (p.horas || 0) + '"> horas</label>' +
      '<button type="button" class="dx-p-b pri" data-dx-acao="salvar">Iniciar contagem</button><button type="button" class="dx-p-b" data-dx-acao="cancelar">Cancelar</button></div>';
    var i = slot.querySelector("[data-dx-dias]"); if (i) i.focus();
  }

  // ── justificativas ─────────────────────────────────────────────────
  function justificativa(chave, n) { var j = D.just[kJust(chave, n)]; return j && !j.removido ? j : null; }
  function cliente() { return S && S.getClient ? S.getClient() : null; }
  function slug(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 60) || "arquivo"; }

  function contextoDaLinha(el) {
    var card = el.closest(".ea");
    var dia = card ? txt(card.querySelector(".edb .d")) + " " + txt(card.querySelector(".edb .my")) : "";
    var aula = card ? txt(card.querySelector(".em .ed")) : "";
    return [dia, aula].filter(Boolean).join(" · ");
  }
  var janela = null;
  function fecharJanela() { if (janela) { janela.remove(); janela = null; } }
  function abrirJustificativa(el) {
    var O = onde(); if (!O) return;
    var info = O.linha(el);
    if (!info.chave || !info.n) return;
    if (!pronto) return toast("Aguarde: sincronizando as justificativas…");
    var j = justificativa(info.chave, info.n) || { texto: "", anexos: [] };
    var novos = [], remover = [], manter = (j.anexos || []).slice();
    fecharJanela();
    janela = document.createElement("div");
    janela.className = "dx-ov"; janela.setAttribute("data-runtime-ui", "diario-extras");
    janela.innerHTML = '<div class="dx-box" role="dialog" aria-modal="true" aria-labelledby="dx-tit">' +
      '<button type="button" class="dx-fechar" data-dx-j="cancelar" aria-label="Fechar">✕</button>' +
      '<div class="dx-tit" id="dx-tit">📄 Justificativa da falta</div>' +
      '<div class="dx-sub"><strong>' + esc(info.nome || "Aluno " + info.n) + "</strong>" + (contextoDaLinha(el) ? " · " + esc(contextoDaLinha(el)) : "") + "</div>" +
      '<label class="dx-lb" for="dx-texto">Justificativa (escrita)</label>' +
      '<textarea id="dx-texto" placeholder="Ex.: atestado médico de 2 dias; consulta; viagem da família…">' + esc(j.texto || "") + "</textarea>" +
      '<div class="dx-lb">Documentos</div>' +
      '<div class="dx-drop" tabindex="0"><div>📎 <strong>Arraste o arquivo aqui</strong>, cole (Ctrl+V) ou</div><button type="button" class="dx-p-b" data-dx-j="escolher">Anexar arquivo</button>' +
      '<small>PDF, Word ou imagem · até 10 MB cada</small><input type="file" multiple accept=".pdf,.doc,.docx,image/*" hidden></div>' +
      '<div class="dx-anexos"></div><div class="dx-msg"></div>' +
      '<div class="dx-acts"><button type="button" class="dx-b" data-dx-j="cancelar">Cancelar</button><button type="button" class="dx-b pri" data-dx-j="salvar">💾 Salvar</button></div></div>';
    document.body.appendChild(janela);
    var box = janela.querySelector(".dx-box"), drop = janela.querySelector(".dx-drop"), input = drop.querySelector("input"), lista = janela.querySelector(".dx-anexos"), msg = janela.querySelector(".dx-msg");
    function desenharLista() {
      lista.innerHTML = manter.map(function (a, i) {
        return '<div class="dx-anexo"><span>' + (/^image/.test(a.tipo) ? "🖼️" : "📄") + " " + esc(a.nome) + '</span><button type="button" data-dx-abrir="' + i + '">Abrir</button><button type="button" data-dx-tirar="m' + i + '" aria-label="Remover">✕</button></div>';
      }).join("") + novos.map(function (f, i) {
        return '<div class="dx-anexo novo"><span>' + (/^image/.test(f.type) ? "🖼️" : "📄") + " " + esc(f.name) + ' <small>(novo)</small></span><button type="button" data-dx-tirar="n' + i + '" aria-label="Remover">✕</button></div>';
      }).join("");
    }
    function adicionar(files) {
      Array.prototype.forEach.call(files || [], function (f) {
        if (!f) return;
        if (TIPOS_OK.indexOf(f.type) < 0 && !/^image\//.test(f.type) && !/\.(pdf|docx?)$/i.test(f.name)) { msg.textContent = "“" + f.name + "” não é PDF, Word nem imagem."; return; }
        novos.push(f);
      });
      desenharLista();
    }
    desenharLista();
    drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("sobre"); });
    drop.addEventListener("dragleave", function () { drop.classList.remove("sobre"); });
    drop.addEventListener("drop", function (e) { e.preventDefault(); drop.classList.remove("sobre"); adicionar(e.dataTransfer && e.dataTransfer.files); });
    box.addEventListener("dragover", function (e) { e.preventDefault(); });
    box.addEventListener("drop", function (e) { if (!drop.contains(e.target)) { e.preventDefault(); adicionar(e.dataTransfer && e.dataTransfer.files); } });
    janela.addEventListener("paste", function (e) {
      var fs = e.clipboardData && e.clipboardData.files;
      if (fs && fs.length) { e.preventDefault(); adicionar(Array.prototype.map.call(fs, function (f, i) { return f.name && f.name !== "image.png" ? f : new File([f], "colado-" + Date.now() + "-" + i + "." + ((f.type.split("/")[1] || "png").replace("jpeg", "jpg")), { type: f.type }); })); }
    });
    input.addEventListener("change", function () { adicionar(input.files); input.value = ""; });
    janela.addEventListener("mousedown", function (e) { if (e.target === janela) fecharJanela(); });
    janela.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var a = b.getAttribute("data-dx-j");
      if (a === "cancelar") return fecharJanela();
      if (a === "escolher") return input.click();
      if (b.hasAttribute("data-dx-tirar")) {
        var t = b.getAttribute("data-dx-tirar"), i = parseInt(t.slice(1), 10);
        if (t.charAt(0) === "m") remover.push(manter.splice(i, 1)[0]); else novos.splice(i, 1);
        return desenharLista();
      }
      if (b.hasAttribute("data-dx-abrir")) return abrirAnexo(manter[parseInt(b.getAttribute("data-dx-abrir"), 10)]);
      if (a === "salvar") salvarJustificativa(b);
    });
    janela.querySelector("#dx-texto").focus();

    async function salvarJustificativa(btn) {
      var texto = janela.querySelector("#dx-texto").value.trim();
      if (!texto && !manter.length && !novos.length && !justificativa(info.chave, info.n)) { msg.textContent = "Escreva a justificativa ou anexe um documento."; return; }
      btn.disabled = true; btn.textContent = "Salvando…"; msg.textContent = "";
      try {
        var c = cliente();
        if (novos.length && !c) throw new Error("Sem conexão: os anexos precisam de internet.");
        var enviados = [];
        for (var i = 0; i < novos.length; i++) {
          var f = await prepararArquivo(novos[i]);
          var caminho = uid + "/justificativas/" + slug(ESC) + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "-" + slug(f.name);
          var r = await c.storage.from(BUCKET).upload(caminho, f, { contentType: f.type, upsert: false });
          if (r.error) throw new Error("Não consegui enviar “" + f.name + "”: " + r.error.message);
          enviados.push({ nome: f.name, tipo: f.type, tamanho: f.size, caminho: caminho });
        }
        if (remover.length && c) c.storage.from(BUCKET).remove(remover.map(function (a) { return a.caminho; })).then(function () {}, function () {});
        var anexos = manter.concat(enviados);
        D.just[kJust(info.chave, info.n)] = (texto || anexos.length)
          ? { texto: texto, anexos: anexos, aluno: info.nome || "", aula: contextoDaLinha(el), em: agoraIso() }
          : { removido: true, em: agoraIso() };
        gravar();
        fecharJanela();
        agendarDecorar(true);
        toast("Justificativa salva.");
      } catch (erro) {
        btn.disabled = false; btn.textContent = "💾 Salvar";
        msg.textContent = String((erro && erro.message) || erro);
      }
    }
  }
  // Imagem fora do padrão do bucket (ou grande demais) vira JPEG.
  function prepararArquivo(f) {
    var nomeOk = f.name || "arquivo";
    if (/\.docx?$/i.test(nomeOk) && TIPOS_OK.indexOf(f.type) < 0) f = new File([f], nomeOk, { type: /x$/i.test(nomeOk) ? TIPOS_OK[2] : TIPOS_OK[1] });
    if (/\.pdf$/i.test(nomeOk) && f.type !== "application/pdf") f = new File([f], nomeOk, { type: "application/pdf" });
    var precisa = /^image\//.test(f.type) && (TIPOS_OK.indexOf(f.type) < 0 || f.size > 4 * 1024 * 1024);
    if (!precisa) {
      if (f.size > MAX) return Promise.reject(new Error("“" + nomeOk + "” passa de 10 MB."));
      return Promise.resolve(f);
    }
    return new Promise(function (ok, erro) {
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var esc2 = Math.min(1, 2200 / Math.max(img.width, img.height)), cv = document.createElement("canvas");
        cv.width = Math.round(img.width * esc2); cv.height = Math.round(img.height * esc2);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { b ? ok(new File([b], nomeOk.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })) : erro(new Error("Não consegui ler a imagem “" + nomeOk + "”.")); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); erro(new Error("Não consegui ler a imagem “" + nomeOk + "”. Envie em JPG, PNG ou PDF.")); };
      img.src = url;
    });
  }
  function abrirAnexo(a) {
    var c = cliente(); if (!a || !c) return toast("Sem conexão para abrir o anexo.");
    var w = window.open("", "_blank");
    c.storage.from(BUCKET).createSignedUrl(a.caminho, 300).then(function (r) {
      if (r.error || !r.data) { if (w) w.close(); return toast("Não consegui abrir o anexo."); }
      if (w) w.location.href = r.data.signedUrl; else location.href = r.data.signedUrl;
    });
  }

  // ── decoração do DOM ───────────────────────────────────────────────
  var slots = [];
  function decorar() {
    var O = onde(); if (!O) return;
    var classeFj = ESC === "herminio" ? "is-just" : "fj";
    document.querySelectorAll(O.linhas).forEach(function (el) {
      var ic = el.querySelector(":scope > .dx-just");
      if (!el.classList.contains(classeFj)) { if (ic) ic.remove(); return; }
      var info = O.linha(el);
      var tem = !!justificativa(info.chave, info.n);
      if (!ic) {
        ic = document.createElement("span");
        ic.className = "dx-just"; ic.setAttribute("role", "button"); ic.setAttribute("tabindex", "0"); ic.setAttribute("data-runtime-ui", "diario-extras");
        ic.textContent = "📄";
        el.appendChild(ic);
      }
      ic.classList.toggle("tem", tem);
      ic.title = tem ? "Ver a justificativa" : "Adicionar a justificativa";
      ic.setAttribute("aria-label", ic.title);
    });
    document.querySelectorAll(O.atividades).forEach(function (pane) {
      var chave = O.chaveAtv(pane);
      if (O.antesDe) {
        var prev = pane.previousElementSibling;
        if (!prev || !prev.hasAttribute("data-dx-prazo")) { prev = criarSlot(chave); pane.parentNode.insertBefore(prev, pane); }
      } else if (!pane.querySelector(':scope > [data-dx-prazo="' + chave + '"]')) {
        pane.insertBefore(criarSlot(chave), pane.firstChild);
      }
    });
    slots = Array.prototype.slice.call(document.querySelectorAll("[data-dx-prazo]"));
    slots.forEach(desenharBarra);
  }
  function criarSlot(chave) {
    var s = document.createElement("div");
    s.setAttribute("data-dx-prazo", chave); s.setAttribute("data-runtime-ui", "diario-extras");
    return s;
  }
  var tDecorar = null, decorando = false;
  function agendarDecorar(ja) {
    if (!pronto && !ja) return;
    clearTimeout(tDecorar);
    tDecorar = setTimeout(function () {
      decorando = true;
      try { decorar(); } finally { if (obs) obs.takeRecords(); decorando = false; }
    }, ja ? 0 : 160);
  }
  var obs = null;
  function observar() {
    obs = new MutationObserver(function (lista) {
      if (decorando) return;
      for (var i = 0; i < lista.length; i++) {
        var m = lista[i], t = m.target;
        if (t && t.closest && t.closest("[data-dx-prazo],.dx-ov,#dx-pilha")) continue;
        if (m.type === "attributes" && !(t.matches && t.matches(".ar2,.rh-mark-btn,.md-m"))) continue;
        return agendarDecorar();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }
  function tique() {
    conferirPrazos();
    slots.forEach(function (s) {
      if (!s.isConnected || s.querySelector(".dx-p-form")) return;
      var chave = s.getAttribute("data-dx-prazo"), p = prazo(chave);
      if (!p) return;
      var r = restante(p), conta = s.querySelector("[data-dx-conta]");
      if (r && conta) { if (conta.textContent !== r) conta.textContent = r; }
      else if (!r && conta) desenharBarra(s);
      var cl = classeBarra(chave); if (s.className !== cl) s.className = cl;
    });
  }

  // Cliques: na captura da janela, antes dos cliques da presença de cada página.
  window.addEventListener("click", function (e) {
    var ic = e.target && e.target.closest && e.target.closest(".dx-just");
    if (ic) {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      var O = onde(), linha = O && ic.closest(O.linhas);
      if (linha) abrirJustificativa(linha);
      return;
    }
    var b = e.target && e.target.closest && e.target.closest("[data-dx-prazo] [data-dx-acao]");
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var slot = b.closest("[data-dx-prazo]"), chave = slot.getAttribute("data-dx-prazo"), a = b.getAttribute("data-dx-acao");
    if (!pronto) return toast("Aguarde: sincronizando…");
    if (a === "definir") return abrirFormPrazo(slot);
    if (a === "cancelar") { slot.innerHTML = ""; return desenharBarra(slot); }
    if (a === "remover") { if (!confirm("Remover o prazo desta atividade?")) return; definirPrazo(chave, { ativo: false }); return; }
    if (a === "salvar") {
      var dias = parseInt(slot.querySelector("[data-dx-dias]").value, 10) || 0, horas = parseInt(slot.querySelector("[data-dx-horas]").value, 10) || 0;
      if (!dias && !horas) return toast("Informe os dias ou as horas do prazo.");
      slot.innerHTML = "";
      D.prazos[kAtv(chave)] = { ativo: false, em: agoraIso() };
      definirPrazo(chave, { ativo: true, dias: dias, horas: horas }, rotuloDaAtividade(slot));
      toast("Prazo iniciado: a contagem começou agora.");
    }
  }, true);
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && janela) { e.stopPropagation(); fecharJanela(); return; }
    var ic = e.target && e.target.closest && e.target.closest(".dx-just");
    if (ic && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ic.click(); }
  }, true);

  function estilo() {
    if (document.getElementById("dx-style")) return;
    var s = document.createElement("style"); s.id = "dx-style";
    s.textContent =
      ".dx-just{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;margin-left:4px;border-radius:7px;border:1px dashed #c29a5b;background:#fff8e6;font-size:.82rem;cursor:pointer;flex-shrink:0;position:relative;line-height:1}" +
      ".dx-just:hover{background:#ffeec2}.dx-just.tem{border-style:solid;border-color:#2d6147;background:#e6f6ec}.dx-just.tem::after{content:'';position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:#2d6147}" +
      ".dx-prazo{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px;padding:9px 12px;border-radius:10px;border:1px dashed var(--cl,#e8e5de);background:var(--cr,#faf8f2);font-size:.82rem;color:var(--ce,#2b2b2b)}" +
      ".dx-prazo.ativo{border-style:solid;border-color:#9cc7a8;background:#eef8f1}.dx-prazo.perto{border-style:solid;border-color:#e0b25f;background:#fff5e0}.dx-prazo.fim{border-style:solid;border-color:#e0a39d;background:#fdecea}" +
      ".dx-p-t{flex:1;min-width:180px}.dx-p-t small{color:var(--cm,#6b6b6b)}.dx-p-ic{font-size:1rem}" +
      ".dx-p-b{border:1px solid var(--cl,#d9d5cc);background:#fff;color:inherit;border-radius:8px;padding:5px 10px;font:inherit;font-size:.76rem;font-weight:700;cursor:pointer}.dx-p-b.pri{background:#2d6147;border-color:#2d6147;color:#fff}" +
      ".dx-p-form{display:flex;flex-wrap:wrap;align-items:center;gap:8px;width:100%}.dx-p-form label{display:flex;align-items:center;gap:4px}.dx-p-form input{width:64px;padding:5px 7px;border:2px solid var(--cl,#e8e5de);border-radius:8px;font:inherit;font-size:.84rem;background:#fff;color:inherit}" +
      ".dx-ov{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:14px}" +
      ".dx-box{position:relative;background:var(--cr,#faf8f2);color:var(--ce,#2b2b2b);border-radius:16px;padding:22px;max-width:560px;width:100%;max-height:94vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.5);font-family:'DM Sans',sans-serif}" +
      ".dx-tit{font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;margin-bottom:4px;padding-right:36px}.dx-sub{font-size:.82rem;color:var(--cm,#5a5a5a);margin-bottom:14px}" +
      ".dx-lb{display:block;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#2d6147;margin:10px 0 5px}" +
      ".dx-box textarea{width:100%;min-height:110px;padding:10px 12px;border:2px solid var(--cl,#e8e5de);border-radius:10px;font:inherit;font-size:.9rem;background:#fff;color:inherit;resize:vertical}" +
      ".dx-drop{border:2px dashed var(--cl,#d9d5cc);border-radius:12px;padding:16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:.84rem;transition:background .15s,border-color .15s}.dx-drop.sobre{border-color:#2d6147;background:#eef8f1}.dx-drop small{color:var(--cm,#6b6b6b)}" +
      ".dx-anexos{display:flex;flex-direction:column;gap:6px;margin-top:10px}.dx-anexo{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--cl,#e8e5de);border-radius:9px;font-size:.84rem;background:#fff}.dx-anexo span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".dx-anexo button{border:none;background:none;cursor:pointer;font:inherit;font-size:.8rem;font-weight:700;color:#2d6147}.dx-anexo button[data-dx-tirar]{color:#c0392b}" +
      ".dx-msg{color:#c0392b;font-size:.82rem;min-height:1em;margin-top:8px}.dx-acts{display:flex;gap:10px;margin-top:12px}" +
      ".dx-b{flex:1;border:none;border-radius:10px;padding:11px 14px;font:inherit;font-weight:700;font-size:.88rem;cursor:pointer;background:var(--cl,#e8e5de);color:inherit}.dx-b.pri{background:#2d6147;color:#fff}.dx-b:disabled{opacity:.6;cursor:wait}" +
      ".dx-fechar{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;border:1px solid var(--cl,#e8e5de);background:transparent;color:inherit;cursor:pointer}" +
      "#dx-pilha{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:20010;display:flex;flex-direction:column;gap:8px;align-items:center;max-width:94vw}" +
      ".dx-toast{display:flex;align-items:center;gap:10px;background:#1a3a2a;color:#fff;padding:10px 16px;border-radius:999px;font-size:.86rem;box-shadow:0 8px 24px rgba(0,0,0,.3);font-family:'DM Sans',sans-serif}" +
      ".dx-toast.fixo{background:#8a2a20;border-radius:14px;padding:12px 14px 12px 18px;font-weight:600}.dx-toast button{background:rgba(255,255,255,.18);border:none;color:#fff;border-radius:50%;width:26px;height:26px;cursor:pointer;flex-shrink:0}" +
      "html.dark-2026 .dx-prazo{background:var(--dark-surface-2,#202327);border-color:var(--dark-line,#383d43);color:var(--dark-text,#f4f5f6)}" +
      "html.dark-2026 .dx-prazo.ativo{background:rgba(111,155,113,.14);border-color:#4f7a55}html.dark-2026 .dx-prazo.perto{background:rgba(194,154,91,.16);border-color:#8a6a35}html.dark-2026 .dx-prazo.fim{background:rgba(185,99,93,.16);border-color:#7a3530}" +
      "html.dark-2026 .dx-p-b,html.dark-2026 .dx-p-form input,html.dark-2026 .dx-box textarea,html.dark-2026 .dx-anexo{background:var(--dark-surface-3,#272b30);color:var(--dark-text,#f4f5f6);border-color:var(--dark-line,#383d43)}" +
      "html.dark-2026 .dx-p-b.pri,html.dark-2026 .dx-b.pri{background:var(--dark-accent,#ffa65b);border-color:var(--dark-accent,#ffa65b);color:#151719}" +
      "html.dark-2026 .dx-box{background:var(--dark-surface,#191c1f);color:var(--dark-text,#f4f5f6);border:1px solid var(--dark-line,#383d43)}html.dark-2026 .dx-lb{color:var(--dark-accent,#ffa65b)}html.dark-2026 .dx-b{background:var(--dark-surface-3,#272b30);color:var(--dark-text,#f4f5f6)}" +
      "html.dark-2026 .dx-just{background:rgba(194,154,91,.18)}html.dark-2026 .dx-just.tem{background:rgba(111,155,113,.2)}" +
      ".rh-mark-btn.is-just{background:#fff4d6;border-color:#e0c87a;color:#7a5c10}.rh-mark-btn.is-just .mk-flag{font-size:.62rem;font-weight:800}.rh-mark-help .dot.j{background:#e0b25f}" +
      "html.dark-2026 .rh-mark-btn.is-just{color:var(--dark-warning,#e0b25f)!important;background:var(--dark-warning-soft,rgba(194,154,91,.16))!important;border-color:#8a6a35!important}" +
      "@media(max-width:560px){.dx-box{padding:16px}.dx-acts{flex-direction:column-reverse}}";
    document.head.appendChild(s);
  }

  window.DiarioExtras = {
    escola: function () { return ESC; },
    pronto: function () { return pronto; },
    prazo: function (chave) { return prazo(chave); },
    definirPrazo: definirPrazo,
    moverPrazo: moverPrazo,
    justificativa: justificativa,
    decorar: function () { agendarDecorar(true); }
  };

  function iniciar() {
    S = window.RelatorioSupabaseSync;
    if (!S || !document.body) { setTimeout(iniciar, 200); return; }
    ESC = escolaDaPagina();
    if (!ESC) return;
    estilo();
    S.auth.whenAuthorized().then(function () {
      var u = S.auth.currentUser(); uid = (u && u.id) || "";
      if (!uid) return;
      D = lerLocal();
      sync = S.createScopeSync({
        perUser: true, scope: SCOPE, source: "diario-extras", debounceMs: 400,
        getLocalPayload: function () { return D; },
        onRemotePayload: aplicarRemoto
      });
      var pronto2 = function () {
        pronto = true;
        pendentes.splice(0).forEach(function (f) { f(); });
        observar();
        agendarDecorar(true);
        setInterval(tique, 1000);
      };
      Promise.resolve(sync.start()).then(pronto2, pronto2);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
