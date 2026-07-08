(function () {
  var STYLE_ID = "boletim-export-style";
  var MODAL_ID = "boletim-export-modal";
  var currentConfig = null;

  function ensureUi() {
    if (!document.getElementById(STYLE_ID)) {
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = [
        ".be-modal{position:fixed;inset:0;background:rgba(19,29,23,.58);display:none;align-items:center;justify-content:center;padding:20px;z-index:12000}",
        ".be-modal.open{display:flex}",
        ".be-card{width:min(760px,100%);max-height:calc(100vh - 40px);overflow:auto;background:#fffdf8;border-radius:28px;box-shadow:0 28px 70px rgba(0,0,0,.28)}",
        ".be-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:22px 24px 18px;border-bottom:1px solid #e7dfd0;background:linear-gradient(180deg,#fffdf9 0%,#fff9ee 100%)}",
        ".be-title{margin:0;font-family:'Playfair Display',serif;color:#1a3a2a;font-size:1.35rem}",
        ".be-sub{margin-top:6px;color:#5e655f;font-size:.88rem;line-height:1.6}",
        ".be-close{width:42px;height:42px;border:none;border-radius:50%;background:#f3efe6;color:#1a3a2a;cursor:pointer;font-size:1.15rem}",
        ".be-body{padding:22px 24px 26px}",
        ".be-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}",
        ".be-field{display:grid;gap:8px}",
        ".be-field label{font-size:.8rem;color:#5e655f;font-weight:700}",
        ".be-field select{width:100%;border:1px solid #e7dfd0;border-radius:14px;padding:12px 14px;background:#fff;color:#243127}",
        ".be-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:6px}",
        ".be-check{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid #e7dfd0;border-radius:14px;background:#fbf6ea;color:#243127}",
        ".be-check input{width:18px;height:18px;accent-color:#2d6147}",
        ".be-alert{padding:14px 16px;border-radius:16px;background:#fdf6e6;border:1px solid rgba(201,168,76,.24);color:#6d5520;font-size:.88rem;line-height:1.7;margin-bottom:18px}",
        ".be-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:20px}",
        ".be-btn,.be-btn-soft{border:none;border-radius:999px;padding:11px 16px;cursor:pointer;font-weight:700}",
        ".be-btn{background:linear-gradient(135deg,#c9a84c,#e4bf60);color:#4b3810;box-shadow:0 10px 24px rgba(201,168,76,.22)}",
        ".be-btn-soft{background:#fff;color:#1a3a2a;border:1px solid #e7dfd0;box-shadow:0 6px 16px rgba(26,58,42,.06)}",
        "@media(max-width:720px){.be-head,.be-body{padding-left:16px;padding-right:16px}.be-grid,.be-checks{grid-template-columns:1fr}}"
      ].join("");
      document.head.appendChild(style);
    }

    if (document.getElementById(MODAL_ID)) return;

    var modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "be-modal";
    modal.innerHTML = ''
      + '<div class="be-card">'
      + '  <div class="be-head">'
      + '    <div>'
      + '      <h2 class="be-title">Exportar boletim</h2>'
      + '      <div class="be-sub">Escolha a turma, a disciplina e os bimestres para gerar um PDF com a lista dos alunos e a media da turma.</div>'
      + '    </div>'
      + '    <button class="be-close" type="button" data-be-close="1">x</button>'
      + '  </div>'
      + '  <div class="be-body">'
      + '    <div class="be-alert">O PDF e gerado com os dados atuais do painel: nota de trabalhos, nota de prova, nota final do bimestre e media consolidada da turma.</div>'
      + '    <div class="be-grid">'
      + '      <div class="be-field">'
      + '        <label for="be-class-select">Turma</label>'
      + '        <select id="be-class-select"></select>'
      + '      </div>'
      + '      <div class="be-field">'
      + '        <label for="be-discipline-select">Disciplina</label>'
      + '        <select id="be-discipline-select"></select>'
      + '      </div>'
      + '    </div>'
      + '    <div class="be-field" style="margin-top:16px">'
      + '      <label>Bimestres</label>'
      + '      <div class="be-checks" id="be-bimester-checks"></div>'
      + '    </div>'
      + '    <div class="be-actions">'
      + '      <button class="be-btn-soft" type="button" data-be-close="1">Cancelar</button>'
      + '      <button class="be-btn" type="button" id="be-export-btn">Exportar PDF</button>'
      + '    </div>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(modal);

    modal.addEventListener("click", function (event) {
      if (event.target === modal || event.target.closest("[data-be-close]")) {
        close();
      }
    });

    modal.querySelector("#be-export-btn").addEventListener("click", function () {
      handleExport();
    });
  }

  function fillSelect(select, options, selectedValue) {
    select.innerHTML = (options || []).map(function (option) {
      var selected = option.value === selectedValue ? ' selected' : "";
      return '<option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.label) + "</option>";
    }).join("");
  }

  function renderForm(config) {
    var modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    fillSelect(modal.querySelector("#be-class-select"), config.classOptions || [], config.defaultClass || "");
    fillSelect(modal.querySelector("#be-discipline-select"), config.disciplineOptions || [], config.defaultDiscipline || "");
    modal.querySelector("#be-bimester-checks").innerHTML = (config.bimesterOptions || []).map(function (option) {
      var checked = (config.defaultBimesters || []).indexOf(option.value) >= 0 ? " checked" : "";
      return '<label class="be-check"><input type="checkbox" value="' + escapeHtml(option.value) + '"' + checked + '> <span>' + escapeHtml(option.label) + "</span></label>";
    }).join("");
  }

  function open(config) {
    currentConfig = config || null;
    ensureUi();
    renderForm(currentConfig || {});
    document.getElementById(MODAL_ID).classList.add("open");
  }

  function close() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove("open");
  }

  function getSelection() {
    var modal = document.getElementById(MODAL_ID);
    if (!modal || !currentConfig) return null;
    var classSelect = modal.querySelector("#be-class-select");
    var disciplineSelect = modal.querySelector("#be-discipline-select");
    var bimesterValues = Array.prototype.slice.call(modal.querySelectorAll("#be-bimester-checks input:checked")).map(function (input) {
      return input.value;
    });
    return {
      classValue: classSelect.value,
      classLabel: classSelect.options[classSelect.selectedIndex] ? classSelect.options[classSelect.selectedIndex].text : classSelect.value,
      disciplineValue: disciplineSelect.value,
      disciplineLabel: disciplineSelect.options[disciplineSelect.selectedIndex] ? disciplineSelect.options[disciplineSelect.selectedIndex].text : disciplineSelect.value,
      bimesters: bimesterValues
    };
  }

  function handleExport() {
    if (!currentConfig) return;
    var selection = getSelection();
    if (!selection || !selection.bimesters.length) {
      window.alert("Selecione pelo menos um bimestre para exportar.");
      return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      window.alert("A biblioteca de PDF ainda nao foi carregada. Recarregue a pagina e tente novamente.");
      return;
    }
    var payload = typeof currentConfig.buildPayload === "function" ? currentConfig.buildPayload(selection) : null;
    if (!payload || !payload.sections || !payload.sections.length) {
      window.alert("Nao foi possivel montar os dados para exportacao.");
      return;
    }
    generatePdf(payload, selection);
    close();
  }

  function generatePdf(payload, selection) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4"
    });
    var margin = 40;
    var pageWidth = doc.internal.pageSize.getWidth();
    var generatedAt = payload.generatedAt || new Date().toLocaleString("pt-BR");

    payload.sections.forEach(function (section, index) {
      if (index > 0) doc.addPage();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(String(payload.schoolName || ""), margin, 42);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(String(payload.subtitle || ""), margin, 60);
      doc.text("Turma: " + String(payload.classLabel || selection.classLabel || ""), margin, 76);
      doc.text("Disciplina: " + String(payload.disciplineLabel || selection.disciplineLabel || ""), margin, 90);
      doc.text("Gerado em: " + generatedAt, pageWidth - margin, 76, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(String(section.title || ""), margin, 122);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Media da turma: " + String(section.average || "-"), margin, 138);

      if (typeof doc.autoTable === "function") {
        doc.autoTable({
          startY: 154,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 6, valign: "middle" },
          headStyles: { fillColor: [26, 58, 42], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [248, 244, 234] },
          head: [["Nº", "Aluno", "Trabalho", "Prova", "Nota final"]],
          body: (section.rows || []).map(function (row) {
            return [
              String(row.numero || ""),
              String(row.nome || ""),
              String(row.trabalhos || "-"),
              String(row.prova || "-"),
              String(row.total || "-")
            ];
          })
        });
      }

      var finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 22 : 190;
      doc.setFontSize(9);
      doc.setTextColor(95, 101, 95);
      doc.text(String(section.note || "PDF gerado a partir do boletim detalhado da pagina."), margin, finalY);
      doc.text("Pagina " + String(index + 1) + " de " + String(payload.sections.length), pageWidth - margin, doc.internal.pageSize.getHeight() - 18, { align: "right" });
      doc.setTextColor(0, 0, 0);
    });

    doc.save(buildFileName(payload));
  }

  function buildFileName(payload) {
    var base = payload.fileName || [
      "boletim",
      payload.classLabel || "",
      payload.disciplineLabel || ""
    ].join("-");
    return slugify(base || "boletim") + ".pdf";
  }

  function slugify(value) {
    return String(value || "boletim")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.BoletimExport = {
    open: open
  };
})();
