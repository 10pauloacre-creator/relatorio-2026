// ═══════════════════════════════════════════════════════════════════════════
// Conduta do aluno no perfil do painel (relatório individual)
// ───────────────────────────────────────────────────────────────────────────
// Lê do banco tudo o que a IA ligou a este aluno: ocorrências dos relatos e
// tags das Observações (autor, vítima, testemunha, envolvido, destaque), com
// data, horário, disciplina, gravidade, categoria, interferência e contexto.
// Comportamento desconta na nota do bimestre da disciplina (Etapa 8B):
// leve 0,25 · médio 0,5 · grave 1,0 · muito grave 2,0, até 2,0 por bimestre.
// ═══════════════════════════════════════════════════════════════════════════
window.RelatorioCondutaAluno = (function () {
  var ROTULOS = { leve: "Leve", medio: "Médio", grave: "Grave", muito_grave: "Muito grave" };
  var PAPEIS = { vitima: "Vítima", testemunha: "Testemunha", envolvido: "Envolvido", destaque: "⭐ Destaque" };
  var CORES = {
    leve: "background:#e3f3ea;color:#1f5f3c", medio: "background:#fdf1d8;color:#7a5305",
    grave: "background:#fde4d8;color:#8c3514", muito_grave: "background:#f9d4d4;color:#7d1414",
    neutro: "background:#eef1f5;color:#3f4a5a", destaque: "background:#fff5d6;color:#6b5205"
  };
  var cache = {};

  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function chip(texto, estilo) {
    return '<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:.72rem;font-weight:600;margin:0 4px 4px 0;' + estilo + '">' + esc(texto) + "</span>";
  }

  async function buscar(opcoes) {
    var chave = opcoes.escolaSlug + "|" + opcoes.turma + "|" + opcoes.numero;
    if (cache[chave] && Date.now() - cache[chave].em < 30000) return cache[chave].dados;
    var sync = window.RelatorioSupabaseSync;
    var client = sync && sync.getClient ? sync.getClient() : null;
    if (!client) throw new Error("sem conexão");
    await sync.auth.whenAuthorized();
    var r = await client.from("relatorio_ocorrencias")
      .select("id,data,horario,disciplina,texto,origem,papel,positiva,gravidade,gravidade_origem,gravidade_justificativa,categoria,interferencia,sem_infracao,fraude_academica,reincidencia_aplicada,contexto,escolas!inner(slug)")
      .eq("escolas.slug", opcoes.escolaSlug).eq("turma_codigo", opcoes.turma).eq("numero_chamada", opcoes.numero)
      .eq("removida", false).order("data", { ascending: false }).order("horario", { ascending: false });
    if (r.error) throw r.error;
    cache[chave] = { em: Date.now(), dados: r.data || [] };
    return cache[chave].dados;
  }

  function renderItem(o) {
    var ctx = o.contexto || {};
    var dataBr = String(o.data || "").split("-").reverse().join("/");
    var chips = "";
    if (o.papel && o.papel !== "autor") chips += chip(PAPEIS[o.papel] || o.papel, o.papel === "destaque" ? CORES.destaque : CORES.neutro);
    else if (o.positiva) chips += chip("⭐ Positivo", CORES.destaque);
    else if (o.sem_infracao) chips += chip("Sem infração", CORES.neutro);
    else if (o.gravidade) chips += chip(ROTULOS[o.gravidade] + (o.reincidencia_aplicada ? " (reincidência)" : "") + (o.gravidade_origem === "professor" ? " ✓" : ""), CORES[o.gravidade]);
    else chips += chip("IA analisando…", CORES.neutro);
    if (o.categoria && o.categoria !== "outro" && o.categoria !== "positivo") chips += chip(o.categoria.replace(/_/g, " "), CORES.neutro);
    if (o.interferencia && o.papel === "autor") chips += chip("interferência " + o.interferencia, CORES.neutro);
    if (o.fraude_academica) chips += chip("fraude acadêmica", CORES.grave);

    var principal = ctx.descricao || o.texto;
    return '<article class="observation-item">'
      + '<div class="observation-date">' + esc(dataBr) + (o.horario ? " · " + esc(o.horario) : "") + (o.disciplina ? " · " + esc(o.disciplina) : "")
      + (o.origem === "observacao" ? " · observação" : "") + "</div>"
      + "<div>" + chips + "</div>"
      + "<div>" + esc(principal) + "</div>"
      + (ctx.descricao && o.texto ? '<div style="font-size:.78rem;opacity:.75;margin-top:4px">Relato: ' + esc(o.texto) + "</div>" : "")
      + (o.gravidade_justificativa ? '<div style="font-size:.78rem;opacity:.75;margin-top:4px">' + esc(o.gravidade_justificativa) + "</div>" : "")
      + "</article>";
  }

  async function render(container, opcoes) {
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Carregando registros de conduta…</div>';
    try {
      var itens = await buscar(opcoes);
      if (!container.isConnected) return;
      if (!itens.length) {
        container.innerHTML = '<div class="empty-state">Nenhum registro de conduta ligado a este aluno.</div>';
        return;
      }
      var cont = { leve: 0, medio: 0, grave: 0, muito_grave: 0 }, destaques = 0;
      itens.forEach(function (o) {
        if (o.papel === "destaque" || o.positiva) destaques++;
        else if (o.papel === "autor" && o.gravidade) cont[o.gravidade]++;
      });
      container.innerHTML = '<div style="margin-bottom:10px">'
        + Object.keys(cont).map(function (g) { return chip(ROTULOS[g] + ": " + cont[g], CORES[g]); }).join("")
        + chip("Destaques: " + destaques, CORES.destaque)
        + '</div><div class="observation-list">' + itens.map(renderItem).join("") + "</div>";
    } catch (error) {
      console.warn("[Conduta] não foi possível carregar.", error);
      if (container.isConnected) container.innerHTML = '<div class="empty-state">Entre com a conta do professor para ver os registros de conduta.</div>';
    }
  }

  return { render: render };
})();
