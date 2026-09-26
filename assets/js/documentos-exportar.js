// ═══════════════════════════════════════════════════════════════════════
// documentos-exportar.js — baixa documentos (texto em markdown simples) em
// PDF, Word (.docx de verdade), Excel (.xlsx), HTML, Markdown e texto, e
// uma pasta inteira em .zip (com as subpastas) ou num PDF único.
//
// Usado pela aba 📁 Documentos (meu-diario-documentos.js) e pelos botões
// "Baixar" das respostas da aba 🤖 I.A. Bibliotecas carregadas do jsDelivr
// só quando precisa: docx (Word), SheetJS (Excel) e JSZip (pasta).
//
// API: window.DocExportar
//   .baixar(doc, formato)          doc = {titulo, conteudo, info?:[[rótulo, valor]]}
//   .baixarPasta(nome, itens, fmt) itens = [{caminho:"Sub/Outra", doc}]
//   .html(markdown)                corpo HTML seguro (para prévia)
//   .FORMATOS                      [{id, rotulo}]
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var LIBS = {
    docx: "https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.iife.js",
    xlsx: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    zip: "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"
  };
  var FORMATOS = [
    { id: "pdf", rotulo: "📕 PDF (imprimir)" },
    { id: "docx", rotulo: "📄 Word (.docx)" },
    { id: "xlsx", rotulo: "📊 Excel (.xlsx)" },
    { id: "html", rotulo: "🌐 Página (.html)" },
    { id: "md", rotulo: "📝 Markdown (.md)" },
    { id: "txt", rotulo: "🔤 Texto (.txt)" }
  ];

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  var GLOBAIS = {};
  GLOBAIS[LIBS.docx] = "docx"; GLOBAIS[LIBS.xlsx] = "XLSX"; GLOBAIS[LIBS.zip] = "JSZip";
  function carregar(url) {
    return new Promise(function (ok, erro) {
      if (window[GLOBAIS[url]]) return ok();
      if (document.querySelector('script[src="' + url + '"]')) {
        var s0 = document.querySelector('script[src="' + url + '"]');
        if (s0.dataset.ok) return ok();
        s0.addEventListener("load", function () { ok(); });
        s0.addEventListener("error", function () { erro(new Error("Não consegui carregar o gerador de arquivos. Verifique a internet.")); });
        return;
      }
      var s = document.createElement("script"); s.src = url;
      s.onload = function () { s.dataset.ok = "1"; ok(); };
      s.onerror = function () { erro(new Error("Não consegui carregar o gerador de arquivos. Verifique a internet.")); };
      document.head.appendChild(s);
    });
  }
  // Nome de arquivo sem caracteres que o Windows recusa.
  function nomeArquivo(t) {
    return (String(t || "documento").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90) || "documento");
  }
  function salvarBlob(blob, nome) {
    var a = document.createElement("a"), url = URL.createObjectURL(blob);
    a.href = url; a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  // ── markdown → blocos ─────────────────────────────────────────────────
  // Só o que a I.A e o professor usam: títulos, parágrafos, listas, tabelas,
  // citações, linha e bloco de código.
  function blocos(md) {
    var linhas = String(md || "").replace(/\r/g, "").split("\n"), out = [], i = 0;
    function ehTabela(l) { return /^\s*\|.*\|\s*$/.test(l); }
    while (i < linhas.length) {
      var l = linhas[i];
      if (/^\s*```/.test(l)) {
        var cod = []; i++;
        while (i < linhas.length && !/^\s*```/.test(linhas[i])) cod.push(linhas[i++]);
        i++; out.push({ t: "code", txt: cod.join("\n") }); continue;
      }
      if (!l.trim()) { i++; continue; }
      var h = /^\s*(#{1,6})\s+(.*)$/.exec(l);
      if (h) { out.push({ t: "h", n: Math.min(h[1].length, 4), txt: h[2].replace(/\s*#+\s*$/, "") }); i++; continue; }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { out.push({ t: "hr" }); i++; continue; }
      if (ehTabela(l)) {
        var rows = [];
        while (i < linhas.length && ehTabela(linhas[i])) {
          var cel = linhas[i].trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); });
          if (!cel.every(function (c) { return /^:?-{2,}:?$/.test(c) || !c; })) rows.push(cel);
          i++;
        }
        if (rows.length) out.push({ t: "table", rows: rows });
        continue;
      }
      var ul = /^(\s*)[-*•]\s+(.*)$/.exec(l), ol = /^(\s*)\d+[.)]\s+(.*)$/.exec(l);
      if (ul || ol) {
        var tipo = ul ? "ul" : "ol", itens = [];
        while (i < linhas.length) {
          var a = /^(\s*)[-*•]\s+(.*)$/.exec(linhas[i]), b = /^(\s*)\d+[.)]\s+(.*)$/.exec(linhas[i]);
          var m = tipo === "ul" ? a : b;
          if (!m) {
            // Sub-item do outro tipo continua na mesma lista, um nível abaixo.
            var outro = tipo === "ul" ? b : a;
            if (outro && outro[1].length >= 2) { itens.push({ nivel: 1, txt: outro[2] }); i++; continue; }
            break;
          }
          itens.push({ nivel: m[1].length >= 2 ? 1 : 0, txt: m[2] }); i++;
        }
        out.push({ t: tipo, itens: itens }); continue;
      }
      if (/^\s*>/.test(l)) {
        var q = [];
        while (i < linhas.length && /^\s*>/.test(linhas[i])) q.push(linhas[i++].replace(/^\s*>\s?/, ""));
        out.push({ t: "quote", txt: q.join(" ") }); continue;
      }
      var p = [];
      while (i < linhas.length && linhas[i].trim() && !/^\s*(#{1,6}\s|```|>|[-*•]\s|\d+[.)]\s|\|)/.test(linhas[i])) p.push(linhas[i++].trim());
      if (!p.length) { p.push(l.trim()); i++; }
      out.push({ t: "p", txt: p.join(" ") });
    }
    return out;
  }
  // **negrito**, *itálico*, `código` → pedaços com estilo.
  function trechos(txt) {
    var out = [], re = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|`([^`]+)`)/g, m, ult = 0;
    txt = String(txt || "");
    while ((m = re.exec(txt))) {
      if (m.index > ult) out.push({ texto: txt.slice(ult, m.index) });
      if (m[2] || m[3]) out.push({ texto: m[2] || m[3], b: true });
      else if (m[4]) out.push({ texto: m[4], i: true });
      else out.push({ texto: m[5], c: true });
      ult = re.lastIndex;
    }
    if (ult < txt.length) out.push({ texto: txt.slice(ult) });
    return out;
  }
  function inlineHtml(txt) {
    return trechos(txt).map(function (p) {
      var s = esc(p.texto);
      return p.b ? "<strong>" + s + "</strong>" : p.i ? "<em>" + s + "</em>" : p.c ? "<code>" + s + "</code>" : s;
    }).join("");
  }
  function textoPuro(txt) { return trechos(txt).map(function (p) { return p.texto; }).join(""); }

  function html(md) {
    return blocos(md).map(function (b) {
      if (b.t === "h") return "<h" + (b.n + 1) + ">" + inlineHtml(b.txt) + "</h" + (b.n + 1) + ">";
      if (b.t === "p") return "<p>" + inlineHtml(b.txt) + "</p>";
      if (b.t === "hr") return "<hr>";
      if (b.t === "quote") return "<blockquote>" + inlineHtml(b.txt) + "</blockquote>";
      if (b.t === "code") return "<pre>" + esc(b.txt) + "</pre>";
      if (b.t === "table") return '<table class="doc-tab">' + b.rows.map(function (r, i) {
        return "<tr>" + r.map(function (c) { return (i ? "<td>" : "<th>") + inlineHtml(c) + (i ? "</td>" : "</th>"); }).join("") + "</tr>";
      }).join("") + "</table>";
      var tag = b.t;
      return "<" + tag + ">" + b.itens.map(function (it) { return "<li" + (it.nivel ? ' class="sub"' : "") + ">" + inlineHtml(it.txt) + "</li>"; }).join("") + "</" + tag + ">";
    }).join("\n");
  }

  // ── página completa (PDF e HTML) ──────────────────────────────────────
  var CSS_DOC = "@page{size:A4;margin:18mm 16mm}" +
    "body{font-family:'Times New Roman',Georgia,serif;font-size:12pt;line-height:1.5;color:#111;margin:0;background:#fff}" +
    ".folha{max-width:180mm;margin:0 auto;padding:18px}" +
    "h1{font-size:17pt;margin:0 0 6px}h2{font-size:14.5pt;margin:18px 0 6px}h3{font-size:13pt;margin:14px 0 4px}h4,h5{font-size:12pt;margin:12px 0 4px}" +
    "p{margin:0 0 8px;text-align:justify}ul,ol{margin:0 0 8px 22px;padding:0}li{margin:2px 0}li.sub{margin-left:22px;list-style-type:circle}" +
    "blockquote{border-left:3px solid #999;margin:8px 0;padding:4px 12px;color:#333;font-style:italic}" +
    "pre{background:#f4f4f4;padding:8px;border-radius:4px;white-space:pre-wrap;font-size:10pt}code{background:#f1f1f1;padding:0 3px}" +
    ".doc-tab{border-collapse:collapse;width:100%;margin:8px 0 12px;font-size:10.5pt;page-break-inside:auto}.doc-tab th,.doc-tab td{border:1px solid #555;padding:4px 6px;vertical-align:top;text-align:left}.doc-tab th{background:#e9e9e9}" +
    ".doc-info{border:1px solid #bbb;border-radius:6px;padding:8px 12px;margin:0 0 14px;font-size:10.5pt;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 16px}" +
    ".doc-info b{font-weight:700}.quebra{page-break-before:always}" +
    ".barra{position:sticky;top:0;background:#1a3a2a;color:#fff;padding:10px 16px;display:flex;gap:10px;align-items:center;font-family:system-ui,sans-serif;font-size:14px;z-index:5}" +
    ".barra button{background:#fff;color:#1a3a2a;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer}" +
    "@media print{.barra{display:none}.folha{padding:0;max-width:none}}";
  function infoHtml(info) {
    info = (info || []).filter(function (x) { return x && x[1]; });
    return info.length ? '<div class="doc-info">' + info.map(function (x) { return "<div><b>" + esc(x[0]) + ":</b> " + esc(x[1]) + "</div>"; }).join("") + "</div>" : "";
  }
  function docHtml(d, i) {
    return '<section class="' + (i ? "quebra" : "") + '"><h1>' + esc(d.titulo || "Documento") + "</h1>" + infoHtml(d.info) + html(d.conteudo) + "</section>";
  }
  function paginaCompleta(titulo, docs, comBarra) {
    return "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + esc(titulo) + "</title><style>" + CSS_DOC + "</style></head><body>" +
      (comBarra ? '<div class="barra"><span style="flex:1">' + esc(titulo) + '</span><button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button></div>' : "") +
      '<div class="folha">' + docs.map(docHtml).join("") + "</div></body></html>";
  }
  function abrirPdf(titulo, docs) {
    var w = window.open("", "_blank");
    if (!w) throw new Error("O navegador bloqueou a janela. Permita pop-ups deste site para gerar o PDF.");
    w.document.open(); w.document.write(paginaCompleta(titulo, docs, true)); w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 500);
  }

  // ── Word (.docx) ──────────────────────────────────────────────────────
  function docxFilhos(D, d, contador) {
    var filhos = [];
    var runs = function (txt, extra) {
      return trechos(txt).map(function (p) { return new D.TextRun(Object.assign({ text: p.texto, bold: !!p.b, italics: !!p.i, font: p.c ? "Consolas" : undefined }, extra || {})); });
    };
    filhos.push(new D.Paragraph({ heading: D.HeadingLevel.TITLE, children: [new D.TextRun({ text: d.titulo || "Documento", bold: true })] }));
    (d.info || []).filter(function (x) { return x && x[1]; }).forEach(function (x) {
      filhos.push(new D.Paragraph({ children: [new D.TextRun({ text: x[0] + ": ", bold: true }), new D.TextRun({ text: String(x[1]) })] }));
    });
    if ((d.info || []).length) filhos.push(new D.Paragraph({ text: "" }));
    var niveis = [D.HeadingLevel.HEADING_1, D.HeadingLevel.HEADING_2, D.HeadingLevel.HEADING_3, D.HeadingLevel.HEADING_4];
    blocos(d.conteudo).forEach(function (b) {
      if (b.t === "h") filhos.push(new D.Paragraph({ heading: niveis[b.n - 1], children: runs(b.txt) }));
      else if (b.t === "p") filhos.push(new D.Paragraph({ children: runs(b.txt), alignment: D.AlignmentType.JUSTIFIED, spacing: { after: 120 } }));
      else if (b.t === "quote") filhos.push(new D.Paragraph({ children: runs(b.txt, { italics: true }), indent: { left: 567 } }));
      else if (b.t === "code") b.txt.split("\n").forEach(function (l) { filhos.push(new D.Paragraph({ children: [new D.TextRun({ text: l, font: "Consolas", size: 20 })] })); });
      else if (b.t === "hr") filhos.push(new D.Paragraph({ border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } } }));
      else if (b.t === "ul") b.itens.forEach(function (it) { filhos.push(new D.Paragraph({ children: runs(it.txt), bullet: { level: it.nivel } })); });
      else if (b.t === "ol") {
        contador.n++;
        b.itens.forEach(function (it) {
          filhos.push(it.nivel
            ? new D.Paragraph({ children: runs(it.txt), bullet: { level: 1 } })
            : new D.Paragraph({ children: runs(it.txt), numbering: { reference: "num", level: 0, instance: contador.n } }));
        });
      } else if (b.t === "table") {
        var cols = Math.max.apply(null, b.rows.map(function (r) { return r.length; }));
        filhos.push(new D.Table({
          width: { size: 100, type: D.WidthType.PERCENTAGE },
          rows: b.rows.map(function (r, i) {
            var cel = r.slice(); while (cel.length < cols) cel.push("");
            return new D.TableRow({
              tableHeader: i === 0,
              children: cel.map(function (c) {
                return new D.TableCell({
                  width: { size: Math.floor(100 / cols), type: D.WidthType.PERCENTAGE },
                  shading: i === 0 ? { fill: "E9E9E9", type: D.ShadingType.CLEAR, color: "auto" } : undefined,
                  children: [new D.Paragraph({ children: runs(c, i === 0 ? { bold: true } : null) })]
                });
              })
            });
          })
        }));
        filhos.push(new D.Paragraph({ text: "" }));
      }
    });
    return filhos;
  }
  async function blobDocx(docs) {
    await carregar(LIBS.docx);
    var D = window.docx, contador = { n: 0 };
    var doc = new D.Document({
      creator: "RELATORIO SKIN",
      styles: { default: { document: { run: { font: "Times New Roman", size: 24 } } } },
      numbering: { config: [{ reference: "num", levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: "%1.", alignment: D.AlignmentType.START, style: { paragraph: { indent: { left: 567, hanging: 283 } } } }] }] },
      sections: docs.map(function (d) {
        return { properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: docxFilhos(D, d, contador) };
      })
    });
    return D.Packer.toBlob(doc);
  }

  // ── Excel (.xlsx): cada tabela vira uma aba; sem tabela, o texto em linhas ──
  async function blobXlsx(d) {
    await carregar(LIBS.xlsx);
    var X = window.XLSX, wb = X.utils.book_new(), n = 0, usados = {};
    var nomeAba = function (base) {
      var s = String(base || "Aba").replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || "Aba", k = s, i = 2;
      while (usados[k.toLowerCase()]) k = s.slice(0, 25) + " " + (i++);
      usados[k.toLowerCase()] = 1; return k;
    };
    var ultimoTitulo = "";
    var linhas = [["Documento", d.titulo || ""]].concat((d.info || []).filter(function (x) { return x && x[1]; }).map(function (x) { return [x[0], String(x[1])]; }));
    linhas.push([]);
    blocos(d.conteudo).forEach(function (b) {
      if (b.t === "h") { ultimoTitulo = textoPuro(b.txt); linhas.push([textoPuro(b.txt).toUpperCase()]); }
      else if (b.t === "p" || b.t === "quote") linhas.push([textoPuro(b.txt)]);
      else if (b.t === "code") b.txt.split("\n").forEach(function (l) { linhas.push([l]); });
      else if (b.t === "ul" || b.t === "ol") b.itens.forEach(function (it, i) { linhas.push([(b.t === "ol" && !it.nivel ? (i + 1) + ". " : "• ") + textoPuro(it.txt)]); });
      else if (b.t === "table") {
        n++;
        var ws = X.utils.aoa_to_sheet(b.rows.map(function (r) { return r.map(textoPuro); }));
        ws["!cols"] = b.rows[0].map(function (c, j) { return { wch: Math.min(60, Math.max(10, Math.max.apply(null, b.rows.map(function (r) { return textoPuro(r[j] || "").length; })) + 2)) }; });
        X.utils.book_append_sheet(wb, ws, nomeAba(ultimoTitulo || "Tabela " + n));
        linhas.push(["[Tabela na aba \"" + wb.SheetNames[wb.SheetNames.length - 1] + "\"]"]);
      }
    });
    var wsT = X.utils.aoa_to_sheet(linhas); wsT["!cols"] = [{ wch: 110 }];
    X.utils.book_append_sheet(wb, wsT, nomeAba("Documento"));
    // A aba do texto vai para o começo.
    wb.SheetNames.unshift(wb.SheetNames.pop());
    var bin = X.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([bin], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  function textoMd(d) {
    var info = (d.info || []).filter(function (x) { return x && x[1]; }).map(function (x) { return "**" + x[0] + ":** " + x[1]; }).join("  \n");
    return "# " + (d.titulo || "Documento") + "\n\n" + (info ? info + "\n\n" : "") + String(d.conteudo || "") + "\n";
  }
  function textoTxt(d) {
    var out = [(d.titulo || "Documento").toUpperCase(), ""];
    (d.info || []).filter(function (x) { return x && x[1]; }).forEach(function (x) { out.push(x[0] + ": " + x[1]); });
    out.push("");
    blocos(d.conteudo).forEach(function (b) {
      if (b.t === "h") out.push("", textoPuro(b.txt).toUpperCase());
      else if (b.t === "p" || b.t === "quote") out.push(textoPuro(b.txt), "");
      else if (b.t === "code") out.push(b.txt, "");
      else if (b.t === "hr") out.push("----------------------------------------");
      else if (b.t === "ul" || b.t === "ol") { b.itens.forEach(function (it, i) { out.push((it.nivel ? "    " : "") + (b.t === "ol" && !it.nivel ? (i + 1) + ". " : "- ") + textoPuro(it.txt)); }); out.push(""); }
      else if (b.t === "table") { b.rows.forEach(function (r) { out.push(r.map(textoPuro).join(" | ")); }); out.push(""); }
    });
    return out.join("\r\n");
  }

  async function arquivo(d, fmt) {
    var nome = nomeArquivo(d.titulo);
    if (fmt === "docx") return { nome: nome + ".docx", blob: await blobDocx([d]) };
    if (fmt === "xlsx") return { nome: nome + ".xlsx", blob: await blobXlsx(d) };
    if (fmt === "html") return { nome: nome + ".html", blob: new Blob([paginaCompleta(d.titulo || "Documento", [d], false)], { type: "text/html;charset=utf-8" }) };
    if (fmt === "md") return { nome: nome + ".md", blob: new Blob([textoMd(d)], { type: "text/markdown;charset=utf-8" }) };
    return { nome: nome + ".txt", blob: new Blob(["﻿" + textoTxt(d)], { type: "text/plain;charset=utf-8" }) };
  }

  // Plano (Etapa 17): cada exportação conta 1 documento. Confere antes de abrir a
  // janela do PDF (tem de ser no mesmo clique, senão o navegador bloqueia).
  function cabeNoPlano(origem) { return !window.SkinPlanos || window.SkinPlanos.tentar("documento", { origem: origem }); }

  async function baixar(d, fmt) {
    if (!cabeNoPlano("exportar")) return;
    if (fmt === "pdf") return abrirPdf(d.titulo || "Documento", [d]);
    var a = await arquivo(d, fmt);
    salvarBlob(a.blob, a.nome);
  }

  // Pasta inteira: .zip com as subpastas (cada documento no formato escolhido)
  // ou, em "pdf", um documento só com uma página por documento.
  async function baixarPasta(nome, itens, fmt) {
    if (!itens.length) throw new Error("A pasta está vazia.");
    if (!cabeNoPlano("exportar-pasta")) return;
    if (fmt === "pdf") return abrirPdf(nome, itens.map(function (x) { return x.doc; }));
    await carregar(LIBS.zip);
    var zip = new window.JSZip(), usados = {};
    for (var i = 0; i < itens.length; i++) {
      var a = await arquivo(itens[i].doc, fmt);
      var dir = (itens[i].caminho || "").split("/").filter(function (x) { return x.trim(); }).map(nomeArquivo).join("/");
      var caminho = (dir ? dir + "/" : "") + a.nome, k = caminho.toLowerCase(), n = 2;
      while (usados[k]) { caminho = (dir ? dir + "/" : "") + a.nome.replace(/(\.\w+)$/, " (" + n++ + ")$1"); k = caminho.toLowerCase(); }
      usados[k] = 1;
      zip.file(caminho, a.blob);
    }
    salvarBlob(await zip.generateAsync({ type: "blob" }), nomeArquivo(nome) + ".zip");
  }

  window.DocExportar = { baixar: baixar, baixarPasta: baixarPasta, html: html, blocos: blocos, FORMATOS: FORMATOS, nomeArquivo: nomeArquivo };
})();
