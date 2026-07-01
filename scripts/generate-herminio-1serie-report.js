const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const INPUT_HTML = path.join(ROOT, "herminio.html");
const TEMP_DIR = path.join(ROOT, "tmp", "pdfs");
const OUTPUT_DIR = path.join(ROOT, "output", "pdf");
const HTML_OUTPUT = path.join(TEMP_DIR, "relatorio-aulas-1serie-raimundo-herminio.html");
const PDF_OUTPUT = path.join(OUTPUT_DIR, "relatorio-aulas-1serie-raimundo-herminio.pdf");

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 42;

const MONTH_MAP = {
  Jan: 1,
  Fev: 2,
  Mar: 3,
  Abr: 4,
  Mai: 5,
  Jun: 6,
  Jul: 7,
  Ago: 8,
  Set: 9,
  Out: 10,
  Nov: 11,
  Dez: 12,
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value) {
  return String(value)
    .replaceAll("—", " - ")
    .replaceAll("–", "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDiscipline(value) {
  const plain = normalizeText(value).toLowerCase();
  if (plain.includes("portugues")) return "Língua Portuguesa";
  if (plain.includes("ingles")) return "Língua Inglesa";
  if (plain.includes("espanhol")) return "Espanhol";
  return normalizeText(value);
}

function parseDate(day, monthYear) {
  const [monthLabel, yearLabel] = monthYear.split(" ");
  const month = MONTH_MAP[monthLabel];
  const year = Number(yearLabel);
  return new Date(year, month - 1, Number(day));
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function parseTimeToMinutes(timeRange) {
  const start = timeRange.split("-")[0].trim();
  const [hours, minutes] = start.split(":").map(Number);
  return hours * 60 + minutes;
}

function extractRecords() {
  const text = fs.readFileSync(INPUT_HTML, "utf8");
  const start = text.indexOf("<!-- RH_T1_INICIO -->");
  const end = text.indexOf("<!-- RH_T1_FIM -->");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Nao foi possivel localizar a secao da 1a serie em herminio.html.");
  }

  const section = text.slice(start, end);
  const blocks = section.split('<div class="ea">').slice(1);

  return blocks.map((block, index) => {
    const day = block.match(/<div class="d">(\d{1,2})<\/div>/)?.[1];
    const monthYear = block.match(/<div class="my">([^<]+)<\/div>/)?.[1];
    const title = block.match(/<div class="ed">([^<]+)<\/div>/)?.[1];
    const timeRange = block.match(/<span class="ch ch-h">[^0-9]*(\d{2}:\d{2}[^<]+)<\/span>/)?.[1];

    if (!day || !monthYear || !title || !timeRange) {
      throw new Error(`Falha ao extrair um registro de aula na posicao ${index + 1}.`);
    }

    const date = parseDate(day, monthYear);
    const normalizedTitle = normalizeText(title);
    const [disciplineRaw, durationRaw = ""] = normalizedTitle.split(" - ");
    const normalizedTime = normalizeText(timeRange);

    return {
      index,
      date,
      dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      dateLabel: formatDate(date),
      shortDate: formatShortDate(date),
      discipline: normalizeDiscipline(disciplineRaw),
      duration: durationRaw.trim() || "Sem duracao informada",
      timeRange: normalizedTime,
      sortTime: parseTimeToMinutes(normalizedTime),
    };
  });
}

function buildSummary(records) {
  const sorted = [...records].sort((a, b) => {
    const byDate = a.date - b.date;
    if (byDate !== 0) return byDate;
    const byTime = a.sortTime - b.sortTime;
    if (byTime !== 0) return byTime;
    return a.index - b.index;
  });

  const byDate = new Map();
  const byDiscipline = new Map();

  for (const record of sorted) {
    if (!byDate.has(record.dateKey)) {
      byDate.set(record.dateKey, {
        date: record.date,
        dateLabel: record.dateLabel,
        shortDate: record.shortDate,
        classes: [],
      });
    }

    byDate.get(record.dateKey).classes.push(record);
    byDiscipline.set(record.discipline, (byDiscipline.get(record.discipline) || 0) + 1);
  }

  const groupedDates = [...byDate.values()];
  const disciplineSummary = [...byDiscipline.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .map(([discipline, count]) => ({ discipline, count }));

  return {
    records: sorted,
    groupedDates,
    disciplineSummary,
    totalClasses: sorted.length,
    totalDates: groupedDates.length,
    firstDate: groupedDates[0]?.shortDate || "",
    lastDate: groupedDates[groupedDates.length - 1]?.shortDate || "",
  };
}

function renderDisciplineChips(summary) {
  return summary
    .map(
      (item) => `
        <div class="discipline-chip">
          <span class="discipline-chip-name">${escapeHtml(item.discipline)}</span>
          <strong>${escapeHtml(String(item.count))} aula(s)</strong>
        </div>`
    )
    .join("");
}

function renderRows(groupedDates) {
  return groupedDates
    .map((entry) => {
      const classesHtml = entry.classes
        .map(
          (classItem, classIndex) => `
            <div class="class-item">
              <span class="class-order">${String(classIndex + 1).padStart(2, "0")}</span>
              <div class="class-main">
                <div class="class-discipline">${escapeHtml(classItem.discipline)}</div>
                <div class="class-meta">${escapeHtml(classItem.timeRange)} | ${escapeHtml(classItem.duration)}</div>
              </div>
            </div>`
        )
        .join("");

      return `
        <tr>
          <td class="date-cell">
            <div class="date-main">${escapeHtml(entry.shortDate)}</div>
            <div class="date-sub">${escapeHtml(entry.dateLabel)}</div>
          </td>
          <td class="count-cell">${escapeHtml(String(entry.classes.length))}</td>
          <td class="classes-cell">${classesHtml}</td>
        </tr>`;
    })
    .join("");
}

function buildHtml(summary) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatorio de aulas - 1a Serie - Raimundo Herminio</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 18mm;
    }

    :root {
      --ink: #1b2d21;
      --muted: #5a6b61;
      --line: #d5ddd8;
      --soft: #eef4f0;
      --panel: #f9fbfa;
      --accent: #214d37;
      --accent-2: #8fae99;
      --paper: #ffffff;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: var(--ink);
      background: var(--paper);
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
    }

    .page {
      position: relative;
    }

    .hero {
      padding: 18px 20px;
      border: 1px solid var(--accent-2);
      border-radius: 18px;
      background:
        radial-gradient(circle at top right, rgba(143, 174, 153, 0.28), transparent 34%),
        linear-gradient(135deg, #f7faf8 0%, #edf4ef 100%);
    }

    .eyebrow {
      margin: 0 0 8px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
    }

    h1 {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 24px;
      line-height: 1.15;
    }

    .hero-subtitle {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 11.5px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 16px;
    }

    .summary-card {
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid var(--line);
    }

    .summary-label {
      display: block;
      color: var(--muted);
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .summary-value {
      display: block;
      margin-top: 6px;
      font-size: 20px;
      font-weight: 700;
      color: var(--accent);
    }

    .summary-note {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 10px;
    }

    .discipline-section {
      margin-top: 16px;
    }

    .section-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 700;
      color: var(--accent);
    }

    .discipline-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .discipline-chip {
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: var(--panel);
    }

    .discipline-chip-name {
      display: block;
      margin-bottom: 4px;
      font-weight: 600;
    }

    .table-wrap {
      margin-top: 16px;
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      background: var(--paper);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      display: table-header-group;
    }

    th {
      padding: 11px 12px;
      background: #e9f0eb;
      color: var(--accent);
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 1px solid var(--line);
    }

    td {
      padding: 12px;
      vertical-align: top;
      border-bottom: 1px solid #e9eeeb;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr {
      page-break-inside: avoid;
    }

    .date-cell {
      width: 24%;
      background: #fcfdfc;
    }

    .count-cell {
      width: 11%;
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      color: var(--accent);
    }

    .classes-cell {
      width: 65%;
    }

    .date-main {
      font-size: 14px;
      font-weight: 700;
      color: var(--accent);
    }

    .date-sub {
      margin-top: 4px;
      color: var(--muted);
      font-size: 10px;
      text-transform: capitalize;
    }

    .class-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 7px 0;
    }

    .class-item + .class-item {
      border-top: 1px dashed var(--line);
    }

    .class-order {
      min-width: 24px;
      padding-top: 1px;
      font-size: 10px;
      font-weight: 700;
      color: var(--muted);
    }

    .class-main {
      flex: 1;
    }

    .class-discipline {
      font-size: 11px;
      font-weight: 700;
    }

    .class-meta {
      margin-top: 2px;
      color: var(--muted);
      font-size: 10px;
    }

    .footer-note {
      margin-top: 10px;
      color: var(--muted);
      font-size: 9.5px;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <p class="eyebrow">Escola Raimundo Herminio de Melo</p>
      <h1>Relatorio de aulas - 1a Serie</h1>
      <p class="hero-subtitle">
        Documento organizado com as datas das aulas e a contabilizacao dos registros da turma.
        Nao inclui conteudos ministrados.
      </p>

      <div class="summary-grid">
        <div class="summary-card">
          <span class="summary-label">Total de registros</span>
          <span class="summary-value">${escapeHtml(String(summary.totalClasses))}</span>
          <span class="summary-note">Aulas listadas no relatorio.</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Datas com aula</span>
          <span class="summary-value">${escapeHtml(String(summary.totalDates))}</span>
          <span class="summary-note">Dias diferentes com registros.</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Periodo coberto</span>
          <span class="summary-value" style="font-size:15px">${escapeHtml(summary.firstDate)} a ${escapeHtml(summary.lastDate)}</span>
          <span class="summary-note">Base: arquivo herminio.html.</span>
        </div>
      </div>

      <div class="discipline-section">
        <p class="section-title">Resumo por disciplina</p>
        <div class="discipline-grid">
          ${renderDisciplineChips(summary.disciplineSummary)}
        </div>
      </div>
    </section>

    <section class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Qtde.</th>
            <th>Aulas registradas</th>
          </tr>
        </thead>
        <tbody>
          ${renderRows(summary.groupedDates)}
        </tbody>
      </table>
    </section>

    <div class="footer-note">
      Gerado automaticamente em ${escapeHtml(new Intl.DateTimeFormat("pt-BR").format(new Date()))}.
    </div>
  </div>
</body>
</html>`;
}

function clampColor(value) {
  return Math.max(0, Math.min(255, value));
}

function colorToPdf(color) {
  return color.map((value) => (clampColor(value) / 255).toFixed(3)).join(" ");
}

function pdfTextHex(value) {
  const safe = normalizeText(String(value));
  return `<${Buffer.from(safe, "latin1").toString("hex").toUpperCase()}>`;
}

function wrapText(value, maxChars) {
  const words = normalizeText(value).split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function createPage() {
  return { commands: [] };
}

function pushCommand(page, command) {
  page.commands.push(command);
}

function drawFilledRect(page, x, top, width, height, fillColor) {
  const y = PAGE_HEIGHT - top - height;
  pushCommand(page, `${colorToPdf(fillColor)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
}

function drawStrokedRect(page, x, top, width, height, strokeColor, lineWidth = 1) {
  const y = PAGE_HEIGHT - top - height;
  pushCommand(page, `${lineWidth.toFixed(2)} w ${colorToPdf(strokeColor)} RG ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`);
}

function drawLine(page, x1, top1, x2, top2, strokeColor, lineWidth = 1) {
  const y1 = PAGE_HEIGHT - top1;
  const y2 = PAGE_HEIGHT - top2;
  pushCommand(page, `${lineWidth.toFixed(2)} w ${colorToPdf(strokeColor)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
}

function drawText(page, x, top, text, options = {}) {
  const font = options.font || "F1";
  const size = options.size || 10;
  const color = options.color || [27, 45, 33];
  const y = PAGE_HEIGHT - top - size;
  pushCommand(
    page,
    `BT /${font} ${size.toFixed(2)} Tf ${colorToPdf(color)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${pdfTextHex(text)} Tj ET`
  );
}

function drawCenteredText(page, x, top, width, text, options = {}) {
  const size = options.size || 10;
  const averageCharWidth = size * 0.48;
  const estimatedWidth = normalizeText(text).length * averageCharWidth;
  const startX = x + Math.max(0, (width - estimatedWidth) / 2);
  drawText(page, startX, top, text, options);
}

function drawWrappedText(page, x, top, text, options = {}) {
  const size = options.size || 10;
  const leading = options.leading || size + 3;
  const maxChars = options.maxChars || 60;
  const lines = wrapText(text, maxChars);

  lines.forEach((line, index) => {
    drawText(page, x, top + index * leading, line, options);
  });

  return lines.length;
}

function renderPdf(summary) {
  const pages = [];
  const boxWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const dateWidth = 126;
  const countWidth = 56;
  const classesWidth = boxWidth - dateWidth - countWidth;
  const colors = {
    ink: [27, 45, 33],
    accent: [33, 77, 55],
    muted: [90, 107, 97],
    line: [213, 221, 216],
    soft: [238, 244, 240],
    softStrong: [233, 240, 235],
    white: [255, 255, 255],
  };

  function startPage(isFirstPage, pageNumber) {
    const page = createPage();
    pages.push(page);

    if (isFirstPage) {
      drawFilledRect(page, PAGE_MARGIN, PAGE_MARGIN, boxWidth, 170, colors.soft);
      drawStrokedRect(page, PAGE_MARGIN, PAGE_MARGIN, boxWidth, 170, [143, 174, 153], 1);
      drawText(page, PAGE_MARGIN + 18, PAGE_MARGIN + 16, "ESCOLA RAIMUNDO HERMINIO DE MELO", {
        font: "F2",
        size: 9.5,
        color: colors.accent,
      });
      drawText(page, PAGE_MARGIN + 18, PAGE_MARGIN + 36, "Relatorio de aulas - 1a Serie", {
        font: "F3",
        size: 22,
        color: colors.ink,
      });
      drawWrappedText(
        page,
        PAGE_MARGIN + 18,
        PAGE_MARGIN + 64,
        "Documento organizado com as datas das aulas e a contabilizacao dos registros da turma. Nao inclui os conteudos ministrados.",
        { size: 10.5, color: colors.muted, maxChars: 84, leading: 13 }
      );

      const cardTop = PAGE_MARGIN + 96;
      const cardWidth = (boxWidth - 24) / 3;
      const summaryCards = [
        ["Total de registros", String(summary.totalClasses), "Aulas listadas no relatorio."],
        ["Datas com aula", String(summary.totalDates), "Dias diferentes com registros."],
        ["Periodo coberto", `${summary.firstDate} a ${summary.lastDate}`, "Base: arquivo herminio.html."],
      ];

      summaryCards.forEach((card, index) => {
        const cardX = PAGE_MARGIN + 18 + index * (cardWidth + 12);
        drawFilledRect(page, cardX, cardTop, cardWidth, 52, colors.white);
        drawStrokedRect(page, cardX, cardTop, cardWidth, 52, colors.line, 1);
        drawText(page, cardX + 10, cardTop + 10, card[0], { font: "F2", size: 8.5, color: colors.muted });
        drawText(page, cardX + 10, cardTop + 24, card[1], {
          font: "F2",
          size: index === 2 ? 11 : 18,
          color: colors.accent,
        });
        drawText(page, cardX + 10, cardTop + 40, card[2], { size: 8.5, color: colors.muted });
      });

      drawText(page, PAGE_MARGIN + 18, PAGE_MARGIN + 158, "Resumo por disciplina", {
        font: "F2",
        size: 10,
        color: colors.accent,
      });

      let chipX = PAGE_MARGIN + 18;
      const chipTop = PAGE_MARGIN + 170;
      summary.disciplineSummary.forEach((item) => {
        const chipWidth = 156;
        drawFilledRect(page, chipX, chipTop, chipWidth, 26, colors.white);
        drawStrokedRect(page, chipX, chipTop, chipWidth, 26, colors.line, 1);
        drawText(page, chipX + 8, chipTop + 8, `${item.discipline}: ${item.count} aula(s)`, {
          size: 9,
          color: colors.ink,
        });
        chipX += chipWidth + 8;
      });

      return { page, cursorTop: PAGE_MARGIN + 214 };
    }

    drawText(page, PAGE_MARGIN, PAGE_MARGIN, "Relatorio de aulas - 1a Serie", {
      font: "F3",
      size: 16,
      color: colors.ink,
    });
    drawText(page, PAGE_WIDTH - PAGE_MARGIN - 90, PAGE_MARGIN + 4, `Pagina ${pageNumber}`, {
      font: "F2",
      size: 9,
      color: colors.muted,
    });
    drawLine(page, PAGE_MARGIN, PAGE_MARGIN + 26, PAGE_WIDTH - PAGE_MARGIN, PAGE_MARGIN + 26, colors.line, 1);
    return { page, cursorTop: PAGE_MARGIN + 38 };
  }

  function drawTableHeader(page, top) {
    drawFilledRect(page, PAGE_MARGIN, top, boxWidth, 24, colors.softStrong);
    drawStrokedRect(page, PAGE_MARGIN, top, boxWidth, 24, colors.line, 1);
    drawText(page, PAGE_MARGIN + 10, top + 8, "Data", { font: "F2", size: 9, color: colors.accent });
    drawText(page, PAGE_MARGIN + dateWidth + 10, top + 8, "Qtde.", { font: "F2", size: 9, color: colors.accent });
    drawText(page, PAGE_MARGIN + dateWidth + countWidth + 10, top + 8, "Aulas registradas", {
      font: "F2",
      size: 9,
      color: colors.accent,
    });
  }

  let pageState = startPage(true, 1);
  drawTableHeader(pageState.page, pageState.cursorTop);
  let cursorTop = pageState.cursorTop + 32;
  let currentPageNumber = 1;

  for (const entry of summary.groupedDates) {
    const classLines = entry.classes.flatMap((classItem, index) => {
      const base = `${String(index + 1).padStart(2, "0")}. ${classItem.discipline} | ${classItem.timeRange} | ${classItem.duration}`;
      const wrapped = wrapText(base, 54);
      return wrapped.length > 1
        ? [wrapped[0], ...wrapped.slice(1).map((line) => `    ${line}`)]
        : wrapped;
    });

    const rowHeight = 20 + classLines.length * 12 + 10;

    if (cursorTop + rowHeight > PAGE_HEIGHT - PAGE_MARGIN - 24) {
      currentPageNumber += 1;
      pageState = startPage(false, currentPageNumber);
      drawTableHeader(pageState.page, pageState.cursorTop);
      cursorTop = pageState.cursorTop + 32;
    }

    const rowPage = pageState.page;
    drawFilledRect(rowPage, PAGE_MARGIN, cursorTop, boxWidth, rowHeight, colors.white);
    drawStrokedRect(rowPage, PAGE_MARGIN, cursorTop, boxWidth, rowHeight, colors.line, 1);
    drawLine(rowPage, PAGE_MARGIN + dateWidth, cursorTop, PAGE_MARGIN + dateWidth, cursorTop + rowHeight, colors.line, 1);
    drawLine(
      rowPage,
      PAGE_MARGIN + dateWidth + countWidth,
      cursorTop,
      PAGE_MARGIN + dateWidth + countWidth,
      cursorTop + rowHeight,
      colors.line,
      1
    );

    drawText(rowPage, PAGE_MARGIN + 10, cursorTop + 10, entry.shortDate, {
      font: "F2",
      size: 12,
      color: colors.accent,
    });
    drawWrappedText(rowPage, PAGE_MARGIN + 10, cursorTop + 26, entry.dateLabel, {
      size: 8.5,
      color: colors.muted,
      maxChars: 24,
      leading: 10,
    });

    drawCenteredText(rowPage, PAGE_MARGIN + dateWidth, cursorTop + 18, countWidth, String(entry.classes.length), {
      font: "F2",
      size: 16,
      color: colors.accent,
    });

    classLines.forEach((line, index) => {
      drawText(rowPage, PAGE_MARGIN + dateWidth + countWidth + 10, cursorTop + 10 + index * 12, line, {
        size: 9.2,
        color: colors.ink,
      });
    });

    cursorTop += rowHeight + 8;
  }

  pages.forEach((page, index) => {
    drawText(page, PAGE_MARGIN, PAGE_HEIGHT - PAGE_MARGIN + 4, `Gerado automaticamente em ${new Intl.DateTimeFormat("pt-BR").format(new Date())}.`, {
      size: 8.5,
      color: colors.muted,
    });
    if (index === 0) {
      drawText(page, PAGE_WIDTH - PAGE_MARGIN - 52, PAGE_HEIGHT - PAGE_MARGIN + 4, "Pagina 1", {
        font: "F2",
        size: 8.5,
        color: colors.muted,
      });
    }
  });

  return pages;
}

function buildPdfBuffer(pages) {
  const objects = [null];
  const addObject = (content) => {
    objects.push(Buffer.isBuffer(content) ? content : Buffer.from(String(content), "latin1"));
    return objects.length - 1;
  };

  const fontHelvetica = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontHelveticaBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const fontTimesBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>");

  const pageRefs = [];
  const contentRefs = [];

  pages.forEach((page) => {
    const stream = page.commands.join("\n");
    const streamBuffer = Buffer.from(stream, "latin1");
    const contentRef = addObject(
      Buffer.concat([
        Buffer.from(`<< /Length ${streamBuffer.length} >>\nstream\n`, "latin1"),
        streamBuffer,
        Buffer.from("\nendstream", "latin1"),
      ])
    );
    contentRefs.push(contentRef);
    pageRefs.push(null);
  });

  const pagesRef = addObject("<< /Type /Pages /Kids [] /Count 0 >>");

  pages.forEach((_, index) => {
    const pageRef = addObject(
      `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 ${fontHelvetica} 0 R /F2 ${fontHelveticaBold} 0 R /F3 ${fontTimesBold} 0 R >> >> /Contents ${contentRefs[index]} 0 R >>`
    );
    pageRefs[index] = pageRef;
  });

  objects[pagesRef] = Buffer.from(
    `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`,
    "latin1"
  );

  const catalogRef = addObject(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

  const chunks = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary")];
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = Buffer.concat(chunks).length;
    chunks.push(Buffer.from(`${index} 0 obj\n`, "latin1"));
    chunks.push(objects[index]);
    chunks.push(Buffer.from("\nendobj\n", "latin1"));
  }

  const xrefStart = Buffer.concat(chunks).length;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  chunks.push(Buffer.from(xref, "latin1"));
  chunks.push(
    Buffer.from(
      `trailer\n<< /Size ${objects.length} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`,
      "latin1"
    )
  );

  return Buffer.concat(chunks);
}

function main() {
  ensureDir(TEMP_DIR);
  ensureDir(OUTPUT_DIR);

  const records = extractRecords();
  const summary = buildSummary(records);
  const html = buildHtml(summary);
  const pdfPages = renderPdf(summary);
  const pdfBuffer = buildPdfBuffer(pdfPages);

  fs.writeFileSync(HTML_OUTPUT, html, "utf8");
  fs.writeFileSync(PDF_OUTPUT, pdfBuffer);

  const report = {
    htmlOutput: HTML_OUTPUT,
    pdfOutput: PDF_OUTPUT,
    outputDir: OUTPUT_DIR,
    totalClasses: summary.totalClasses,
    totalDates: summary.totalDates,
    firstDate: summary.firstDate,
    lastDate: summary.lastDate,
  };

  process.stdout.write(JSON.stringify(report, null, 2));
}

main();
