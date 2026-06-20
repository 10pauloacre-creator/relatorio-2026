(function () {
  const config = window.CASAVEQUIA_ALUNOS_CONFIG;
  if (!config) {
    throw new Error("CASAVEQUIA_ALUNOS_CONFIG nao definido.");
  }

  const STORAGE_KEY = config.storageKey;
  const SYNC_KEY = "pc_alunos_sync_v1";
  const SCHOOL_NAME = config.schoolName;
  const CLASS_NAME = config.className;
  const TURMA_ID = config.turmaId;
  const PERIOD_LABEL = config.periodLabel || "Ano letivo de 2026";
  const BIMESTERS = ["1", "2", "3", "4"];
  const GRADE_MAX = 5;

  const searchInput = document.getElementById("searchInput");
  const tableBody = document.getElementById("tableBody");
  const summaryGrid = document.getElementById("summaryGrid");
  const saveStatusText = document.getElementById("saveStatusText");
  const syncHintBox = document.getElementById("syncHintBox");

  let currentProfileId = null;
  let currentReportId = null;
  let state = loadState();

  renderAll();
  setSaveStatus("Painel carregado com sucesso.");

  searchInput.addEventListener("input", renderTable);
  window.addEventListener("focus", renderAll);
  window.addEventListener("storage", function (event) {
    if (event.key === SYNC_KEY || event.key === STORAGE_KEY) {
      if (event.key === STORAGE_KEY) {
        state = loadState();
      }
      renderAll();
    }
  });

  document.getElementById("resetDataBtn").addEventListener("click", function () {
    const confirmar = window.confirm("Deseja restaurar o modelo original desta pagina? Isso apaga as edicoes salvas localmente.");
    if (!confirmar) return;
    localStorage.removeItem(STORAGE_KEY);
    state = buildDefaultState();
    renderAll();
    closeModal("profileModal");
    closeModal("reportModal");
    setSaveStatus("Modelo restaurado.");
  });

  document.getElementById("copyClassSummaryBtn").addEventListener("click", function () {
    copyText(buildClassSummary());
    setSaveStatus("Resumo da turma copiado.");
  });

  document.addEventListener("click", function (event) {
    const stepButton = event.target.closest("[data-step]");
    if (stepButton) {
      adjustStepper(stepButton);
      return;
    }

    const profileButton = event.target.closest("[data-open-profile]");
    if (profileButton) {
      openProfile(Number(profileButton.dataset.openProfile));
      return;
    }

    const reportButton = event.target.closest("[data-open-report]");
    if (reportButton) {
      openReport(Number(reportButton.dataset.openReport));
      return;
    }

    const closeButton = event.target.closest("[data-close-modal]");
    if (closeButton) {
      closeModal(closeButton.dataset.closeModal);
      return;
    }

    const copyStudentButton = event.target.closest("[data-copy-student-summary]");
    if (copyStudentButton) {
      const studentId = Number(copyStudentButton.dataset.copyStudentSummary);
      copyText(buildStudentSummary(getStudent(studentId)));
      setSaveStatus("Resumo do aluno copiado para o Codex.");
      return;
    }

    const insertTemplateButton = event.target.closest("[data-insert-report-template]");
    if (insertTemplateButton) {
      const studentId = Number(insertTemplateButton.dataset.insertReportTemplate);
      const student = getStudent(studentId);
      if (!student) return;
      student.relatorioGeral = buildAnnualReportTemplate(student);
      persistAndRefresh(studentId, "Modelo-base do relatorio inserido.");
    }
  });

  document.addEventListener("change", function (event) {
    const numericInput = event.target.closest("input[data-student][data-bimester][data-field]");
    if (numericInput) {
      updateNumericFieldFromInput(numericInput);
      return;
    }
  });

  document.addEventListener("input", function (event) {
    const textArea = event.target.closest("textarea[data-student][data-textfield]");
    if (!textArea) return;
    const student = getStudent(Number(textArea.dataset.student));
    if (!student) return;
    student[textArea.dataset.textfield] = textArea.value;
    saveState("Texto atualizado.");
  });

  window.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (document.getElementById("reportModal").classList.contains("open")) {
      closeModal("reportModal");
      return;
    }
    if (document.getElementById("profileModal").classList.contains("open")) {
      closeModal("profileModal");
    }
  });

  document.querySelectorAll(".modal").forEach(function (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal(modal.id);
    });
  });

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  function formatNumber(value) {
    return Number(value).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }

  function formatInputValue(value) {
    return value === "" || value === null || value === undefined ? "" : Number(value);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getFieldMax(field) {
    return field === "trabalhos" || field === "prova" ? GRADE_MAX : 999;
  }

  function getFieldStep(field) {
    return field === "trabalhos" || field === "prova" ? 0.5 : 1;
  }

  function sanitizeNumeric(value, max) {
    if (value === "" || value === null || value === undefined) return "";
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return "";
    return Math.max(0, Math.min(max, numeric));
  }

  function buildDefaultState() {
    return {
      escola: SCHOOL_NAME,
      turma: CLASS_NAME,
      periodo: PERIOD_LABEL,
      alunos: (config.students || []).map(function (student) {
        return {
          id: student.id,
          numero: student.numero,
          nome: student.nome,
          bimestres: {
            "1": { trabalhos: "", prova: "" },
            "2": { trabalhos: "", prova: "" },
            "3": { trabalhos: "", prova: "" },
            "4": { trabalhos: "", prova: "" }
          },
          observacoesComplementares: "",
          encaminhamentos: "",
          destaques: "",
          necessidadesApoio: "",
          relatorioGeral: ""
        };
      })
    };
  }

  function mergeStudent(baseStudent, savedStudent) {
    const merged = {
      id: baseStudent.id,
      numero: baseStudent.numero,
      nome: baseStudent.nome,
      observacoesComplementares: savedStudent.observacoesComplementares !== undefined ? savedStudent.observacoesComplementares : baseStudent.observacoesComplementares,
      encaminhamentos: savedStudent.encaminhamentos !== undefined ? savedStudent.encaminhamentos : baseStudent.encaminhamentos,
      destaques: savedStudent.destaques !== undefined ? savedStudent.destaques : baseStudent.destaques,
      necessidadesApoio: savedStudent.necessidadesApoio !== undefined ? savedStudent.necessidadesApoio : baseStudent.necessidadesApoio,
      relatorioGeral: savedStudent.relatorioGeral !== undefined ? savedStudent.relatorioGeral : baseStudent.relatorioGeral,
      bimestres: {}
    };

    BIMESTERS.forEach(function (bim) {
      const savedBim = savedStudent.bimestres && savedStudent.bimestres[bim] ? savedStudent.bimestres[bim] : {};
      merged.bimestres[bim] = {
        trabalhos: sanitizeNumeric(savedBim.trabalhos !== undefined ? savedBim.trabalhos : baseStudent.bimestres[bim].trabalhos, GRADE_MAX),
        prova: sanitizeNumeric(savedBim.prova !== undefined ? savedBim.prova : baseStudent.bimestres[bim].prova, GRADE_MAX)
      };
    });

    return merged;
  }

  function loadState() {
    const base = buildDefaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.alunos)) return base;

      return {
        escola: parsed.escola || base.escola,
        turma: parsed.turma || base.turma,
        periodo: parsed.periodo || base.periodo,
        alunos: base.alunos.map(function (student) {
          const saved = parsed.alunos.find(function (item) { return item.id === student.id; }) || {};
          return mergeStudent(student, saved);
        })
      };
    } catch (error) {
      return base;
    }
  }

  function saveState(message) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (message) setSaveStatus(message);
  }

  function setSaveStatus(message) {
    saveStatusText.textContent = message;
  }

  function readSyncData() {
    try {
      const raw = localStorage.getItem(SYNC_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.classes ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function getClassSync() {
    const sync = readSyncData();
    if (!sync || !sync.classes) return null;
    return sync.classes[TURMA_ID] || null;
  }

  function getSyncStudent(seedStudent) {
    const classSync = getClassSync();
    if (!classSync || !Array.isArray(classSync.students)) return null;
    return classSync.students.find(function (item) {
      return normalizeText(item.nome) === normalizeText(seedStudent.nome);
    }) || null;
  }

  function getStudentMetrics(seedStudent) {
    const synced = getSyncStudent(seedStudent);
    if (!synced) {
      return {
        faltas: 0,
        presencas: 0,
        totalAulas: 0,
        porDia: {},
        dias: [],
        atividadesFeitas: 0,
        atividadesPorBimestre: { "1": 0, "2": 0, "3": 0, "4": 0 },
        observacoes: []
      };
    }

    return {
      faltas: Number(synced.faltas) || 0,
      presencas: Number(synced.presencas) || 0,
      totalAulas: Number(synced.totalAulas) || 0,
      porDia: synced.porDia && typeof synced.porDia === "object" ? synced.porDia : {},
      dias: Array.isArray(synced.dias) ? synced.dias : [],
      atividadesFeitas: Number(synced.atividadesFeitas) || 0,
      atividadesPorBimestre: synced.atividadesPorBimestre || { "1": 0, "2": 0, "3": 0, "4": 0 },
      observacoes: Array.isArray(synced.observacoes) ? synced.observacoes : []
    };
  }

  function getStudent(studentId) {
    return state.alunos.find(function (item) { return item.id === studentId; }) || null;
  }

  function calculateBimTotal(student, bim) {
    const dados = student.bimestres[bim];
    const trabalhos = dados.trabalhos === "" ? null : Number(dados.trabalhos);
    const prova = dados.prova === "" ? null : Number(dados.prova);
    if (trabalhos === null && prova === null) return null;
    return (trabalhos || 0) + (prova || 0);
  }

  function calculateAnnualAverage(student) {
    const totais = BIMESTERS.map(function (bim) { return calculateBimTotal(student, bim); }).filter(function (value) {
      return value !== null;
    });
    if (!totais.length) return null;
    return totais.reduce(function (sum, value) { return sum + value; }, 0) / totais.length;
  }

  function calculateWorksTotal(student) {
    return BIMESTERS.reduce(function (sum, bim) {
      return sum + getBimesterWorksCount(student, bim);
    }, 0);
  }

  function getBimesterWorksCount(student, bim) {
    return Number(getStudentMetrics(student).atividadesPorBimestre[bim]) || 0;
  }

  function calculateAttendance(student) {
    const metrics = getStudentMetrics(student);
    if (!metrics.totalAulas) return 0;
    return Math.max(0, (metrics.presencas / metrics.totalAulas) * 100);
  }

  function renderAll() {
    if (!state || !Array.isArray(state.alunos) || !state.alunos.length) {
      state = buildDefaultState();
    }
    renderSummary();
    renderTable();
    renderSyncHint();
    if (currentProfileId !== null && document.getElementById("profileModal").classList.contains("open")) {
      renderProfile(currentProfileId);
    }
    if (currentReportId !== null && document.getElementById("reportModal").classList.contains("open")) {
      renderReport(currentReportId);
    }
  }

  function renderSyncHint() {
    const classSync = getClassSync();
    if (!classSync) {
      syncHintBox.innerHTML = "<strong>Sincronizacao pendente</strong>Abra <code>casavequia.html</code>, navegue pelos relatos e use a pagina principal para atualizar os dados de faltas, presencas e atividades desta turma.";
      return;
    }

    const updatedAt = classSync.updatedAt ? new Date(classSync.updatedAt) : null;
    syncHintBox.innerHTML = "<strong>Sincronizacao ativa</strong>"
      + "As faltas, presencas, atividades feitas e observacoes extraidas desta turma estao sendo lidas do painel principal."
      + (updatedAt ? " Ultima atualizacao: <code>" + escapeHtml(formatDate(updatedAt)) + "</code>." : "");
  }

  function renderSummary() {
    const medias = state.alunos.map(calculateAnnualAverage).filter(function (value) { return value !== null; });
    const mediaTurma = medias.length ? medias.reduce(function (sum, value) { return sum + value; }, 0) / medias.length : null;
    const totalFaltas = state.alunos.reduce(function (sum, student) { return sum + getStudentMetrics(student).faltas; }, 0);
    const totalPresencas = state.alunos.reduce(function (sum, student) { return sum + getStudentMetrics(student).presencas; }, 0);
    const classSync = getClassSync();
    const atividadesAplicadas = classSync ? Number(classSync.atividadesAplicadas) || 0 : 0;

    summaryGrid.innerHTML = [
      summaryCard("Alunos cadastrados", String(state.alunos.length), "Base da turma"),
      summaryCard("Faltas em h/aula", String(totalFaltas), "Carga horaria ausente consolidada"),
      summaryCard("Presencas em h/aula", String(totalPresencas), "Sincronizadas pelos relatos diarios"),
      summaryCard("Media parcial da turma", mediaTurma === null ? "—" : formatNumber(mediaTurma), mediaTurma === null ? "Preencha as notas para calcular" : "Com base nos bimestres ja lancados"),
      summaryCard("Atividades aplicadas", String(atividadesAplicadas), "Cada tema registrado conta como 1 atividade aplicada"),
      summaryCard("Relatorios anuais", String(state.alunos.length), "Todos podem ser gerados automaticamente pelo sistema")
    ].join("");
  }

  function summaryCard(label, value, foot) {
    return '<article class="summary-card">'
      + '<div class="summary-label">' + escapeHtml(label) + "</div>"
      + '<div class="summary-value">' + escapeHtml(value) + "</div>"
      + '<div class="summary-foot">' + escapeHtml(foot) + "</div>"
      + "</article>";
  }

  function renderTable() {
    const query = normalizeText(searchInput.value || "");
    const rows = state.alunos.filter(function (student) {
      if (!query) return true;
      const haystack = normalizeText(student.nome + " " + student.numero);
      return haystack.includes(query);
    });

    if (!rows.length) {
      tableBody.innerHTML = '<tr><td class="table-empty" colspan="5">Nenhum aluno encontrado para esta busca.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map(function (student) {
      const media = calculateAnnualAverage(student);
      return '<tr>'
        + '<td class="student-cell">'
        + '<span class="student-number">' + student.numero + "</span>"
        + '<button class="student-name-btn" type="button" data-open-profile="' + student.id + '"><span class="student-name">' + escapeHtml(student.nome) + "</span></button>"
        + '<div class="student-meta">'
        + '<span class="mini-chip">Media parcial: ' + (media === null ? "—" : formatNumber(media) + "/10") + "</span>"
        + '<span class="mini-chip">Frequencia: ' + formatNumber(calculateAttendance(student)) + "%</span>"
        + "</div>"
        + "</td>"
        + BIMESTERS.map(function (bim) {
          return "<td>" + renderBimGradeBadge(student, bim) + "</td>";
        }).join("")
        + "</tr>";
    }).join("");
  }

  function renderBimGradeBadge(student, bim) {
    const total = calculateBimTotal(student, bim);
    if (total === null) {
      return '<span class="grade-badge"><strong>—</strong><small>Sem nota</small></span>';
    }
    const isRecovery = total < 7;
    return '<span class="grade-badge ' + (isRecovery ? "recovery" : "good") + '">'
      + '<strong>' + (isRecovery ? "⚠️ " : "✅ ") + formatNumber(total) + "/10</strong>"
      + '<small>' + (isRecovery ? "Recuperacao" : "Acima de 7") + "</small>"
      + "</span>";
  }

  function renderStepper(studentId, bim, field, value) {
    const step = getFieldStep(field);
    const max = getFieldMax(field);
    return '<div class="stepper">'
      + '<button type="button" data-step="-'+ step +'" data-student="'+ studentId +'" data-bimester="'+ bim +'" data-field="'+ field +'">-</button>'
      + '<input type="number" min="0" max="' + max + '" step="' + step + '" value="' + formatInputValue(value) + '" data-student="' + studentId + '" data-bimester="' + bim + '" data-field="' + field + '">'
      + '<button type="button" data-step="'+ step +'" data-student="'+ studentId +'" data-bimester="'+ bim +'" data-field="'+ field +'">+</button>'
      + "</div>";
  }

  function openProfile(studentId) {
    currentProfileId = studentId;
    renderProfile(studentId);
    openModal("profileModal");
  }

  function renderProfile(studentId) {
    const student = getStudent(studentId);
    if (!student) return;
    const metrics = getStudentMetrics(student);
    const media = calculateAnnualAverage(student);

    document.getElementById("profileTitle").textContent = student.numero + ". " + student.nome;
    document.getElementById("profileSubtitle").textContent = SCHOOL_NAME + " · " + CLASS_NAME + " · " + PERIOD_LABEL;

    document.getElementById("profileBody").innerHTML =
      '<section class="profile-stats">'
        + profileMetric("Faltas em h/aula", String(metrics.faltas), "Carga horaria ausente consolidada")
        + profileMetric("Presencas em h/aula", String(metrics.presencas), "Presencas registradas nos relatos diarios")
        + profileMetric("Atividades feitas", String(calculateWorksTotal(student)), "Soma automatica registrada nos relatos")
        + profileMetric("Media anual parcial", media === null ? "—" : formatNumber(media) + "/10", media === null ? "Ainda sem notas lancadas" : "Media dos bimestres preenchidos")
      + "</section>"
      + '<section class="section-block">'
        + "<h3>Panorama por bimestre</h3>"
        + '<p class="section-note">Aqui voce pode ajustar as notas. A quantidade de atividades feitas em cada bimestre e lida automaticamente a partir do painel principal da escola.</p>'
        + '<div class="bim-grid">'
        + BIMESTERS.map(function (bim) { return renderBimCard(student, bim); }).join("")
        + "</div>"
      + "</section>"
      + '<section class="section-block">'
        + "<h3>Faltas e dias em que o aluno faltou</h3>"
        + '<p class="section-note">A contagem abaixo foi consolidada a partir das chamadas da propria turma. Cada hora/aula ausente equivale a 1 falta.</p>'
        + renderAbsenceDetails(metrics)
      + "</section>"
      + '<section class="section-block">'
        + "<h3>Observacoes de comportamento extraidas dos relatos</h3>"
        + '<p class="section-note">Quando os relatos diarios citam o aluno nominalmente, o sistema reaproveita essas anotacoes aqui para fortalecer o relatorio anual.</p>'
        + renderObservationDetails(metrics.observacoes)
      + "</section>"
      + '<section class="section-block">'
        + "<h3>Acompanhamento complementar</h3>"
        + '<div class="text-grid">'
          + renderTextArea(student, "observacoesComplementares", "Observacoes complementares", "Registre evolucao, comportamento recorrente, participacao, postura e fatos relevantes nao capturados automaticamente.")
          + renderTextArea(student, "encaminhamentos", "Encaminhamentos pedagogicos", "Conversa com responsaveis, reforco, acordos, recomposicao, avaliacao, orientacoes e proximos passos.")
          + renderTextArea(student, "destaques", "Pontos fortes do aluno", "Participacao, responsabilidade, oralidade, escrita, lideranca, criatividade ou avancos percebidos.")
          + renderTextArea(student, "necessidadesApoio", "Necessidades de apoio", "Frequencia, motivacao, dificuldades de leitura, escrita, concentracao ou rotina de estudos.")
        + "</div>"
      + "</section>"
      + '<div class="report-tools">'
        + '<button class="primary-btn" type="button" data-open-report="' + student.id + '">Relatorio geral</button>'
        + '<button class="ghost-btn" type="button" data-copy-student-summary="' + student.id + '">Copiar resumo para o Codex</button>'
      + "</div>";
  }

  function profileMetric(label, value, foot) {
    return '<article class="profile-card">'
      + '<div class="summary-label">' + escapeHtml(label) + "</div>"
      + '<div class="summary-value">' + escapeHtml(value) + "</div>"
      + '<div class="summary-foot">' + escapeHtml(foot) + "</div>"
      + "</article>";
  }

  function renderBimCard(student, bim) {
    const dados = student.bimestres[bim];
    const total = calculateBimTotal(student, bim);
    return '<article class="bim-card">'
      + '<div class="bim-card-head">'
        + '<div class="bim-card-title">' + bim + "º Bimestre</div>"
        + '<div class="bim-card-total">' + (total === null ? "—" : formatNumber(total) + "/10") + "</div>"
      + "</div>"
      + '<div class="field-stack">'
        + "<div><label>Nota de trabalhos</label>" + renderStepper(student.id, bim, "trabalhos", dados.trabalhos) + "</div>"
        + "<div><label>Nota de prova</label>" + renderStepper(student.id, bim, "prova", dados.prova) + "</div>"
        + '<div class="summary-foot">Atividades feitas nos relatos diarios: ' + getBimesterWorksCount(student, bim) + "</div>"
      + "</div>"
      + "</article>";
  }

  function renderAbsenceDetails(metrics) {
    if (!metrics.dias.length) {
      return '<div class="empty-state">Nenhuma falta registrada para este aluno nas chamadas sincronizadas ate agora.</div>';
    }
    return '<div class="absence-chips">'
      + metrics.dias.map(function (date) {
        return '<span class="absence-chip"><strong>' + escapeHtml(date) + "</strong> · " + escapeHtml(metrics.porDia[date]) + " falta(s) em h/aula</span>";
      }).join("")
      + "</div>";
  }

  function renderObservationDetails(observacoes) {
    if (!observacoes || !observacoes.length) {
      return '<div class="empty-state">Nenhuma observacao nominal sincronizada nos relatos desta turma ate agora.</div>';
    }

    return '<div class="observation-list">'
      + observacoes.map(function (item) {
        return '<article class="observation-item">'
          + '<div class="observation-date">📌 ' + escapeHtml(item.data || "Sem data") + "</div>"
          + "<strong>" + escapeHtml(item.titulo || "Registro de comportamento") + "</strong>"
          + "<div>" + escapeHtml(item.texto || "") + "</div>"
          + "</article>";
      }).join("")
      + "</div>";
  }

  function renderTextArea(student, field, label, placeholder) {
    return '<div class="text-stack">'
      + "<label>" + escapeHtml(label) + "</label>"
      + '<textarea data-student="' + student.id + '" data-textfield="' + field + '" placeholder="' + escapeHtml(placeholder) + '">' + escapeHtml(student[field] || "") + "</textarea>"
      + "</div>";
  }

  function openReport(studentId) {
    currentReportId = studentId;
    renderReport(studentId);
    openModal("reportModal");
  }

  function renderReport(studentId) {
    const student = getStudent(studentId);
    if (!student) return;
    const metrics = getStudentMetrics(student);
    const media = calculateAnnualAverage(student);
    const reportText = student.relatorioGeral && student.relatorioGeral.trim() ? student.relatorioGeral : buildAnnualReportTemplate(student);

    document.getElementById("reportTitle").textContent = "Relatorio geral - " + student.nome;
    document.getElementById("reportSubtitle").textContent = SCHOOL_NAME + " · " + CLASS_NAME + " · Relatorio anual";
    document.getElementById("reportBody").innerHTML =
      '<div class="report-alert">Este relatorio anual e montado automaticamente com base nas notas, faltas, presencas, atividades feitas nos relatos diarios e observacoes pedagogicas registradas para este aluno.</div>'
      + '<section class="report-section"><h3>Painel sintetico</h3><div class="report-box">'
      + "Media anual parcial: " + (media === null ? "ainda sem notas lancadas." : formatNumber(media) + "/10.") + "\n"
      + "Frequencia parcial: " + formatNumber(calculateAttendance(student)) + "% de presenca na carga horaria registrada." + "\n"
      + "Faltas em hora/aula: " + metrics.faltas + "." + "\n"
      + "Presencas em hora/aula: " + metrics.presencas + "." + "\n"
      + "Atividades feitas: " + calculateWorksTotal(student) + "." + "\n"
      + "Observacoes sincronizadas: " + (metrics.observacoes.length ? metrics.observacoes.length + " registro(s)." : "nenhuma citacao nominal sincronizada ate o momento.")
      + "</div></section>"
      + '<section class="report-section"><h3>Texto anual</h3><div class="report-box">' + escapeHtml(reportText) + "</div></section>"
      + '<div class="report-actions">'
      + '<button class="ghost-btn" type="button" data-copy-student-summary="' + student.id + '">Copiar resumo para o Codex</button>'
      + '<button class="primary-btn" type="button" data-insert-report-template="' + student.id + '">Gerar modelo automatico</button>'
      + "</div>";
  }

  function buildAnnualReportTemplate(student) {
    const metrics = getStudentMetrics(student);
    const media = calculateAnnualAverage(student);
    const filledBimesters = BIMESTERS.filter(function (bim) {
      return calculateBimTotal(student, bim) !== null;
    }).length;
    const obsResumo = metrics.observacoes.slice(0, 6).map(function (item) {
      return item.data + ": " + item.texto;
    }).join(" ");

    return [
      "No VSCode, peca ao Codex para analisar todas as informacoes relatadas sobre este aluno e transformar este texto em um relatorio anual final para a turma " + CLASS_NAME + " da escola " + SCHOOL_NAME + ".",
      "",
      "Resumo automatico do sistema:",
      media === null
        ? "O aluno ainda nao possui notas lancadas suficientes para calcular a media anual parcial."
        : "O aluno apresenta media anual parcial de " + formatNumber(media) + "/10, com " + filledBimesters + " bimestre(s) ja lancado(s) no sistema.",
      "Frequencia parcial: " + formatNumber(calculateAttendance(student)) + "% de presenca na carga horaria registrada.",
      "Faltas em hora/aula: " + metrics.faltas + ".",
      "Presencas em hora/aula: " + metrics.presencas + ".",
      "Total de atividades feitas: " + calculateWorksTotal(student) + ".",
      obsResumo ? "Observacoes sincronizadas: " + obsResumo : "Observacoes sincronizadas: nenhuma citacao nominal encontrada nos relatos diarios.",
      student.destaques ? "Pontos fortes registrados: " + student.destaques : "Pontos fortes registrados: ainda nao preenchidos.",
      student.necessidadesApoio ? "Necessidades de apoio registradas: " + student.necessidadesApoio : "Necessidades de apoio registradas: ainda nao preenchidas.",
      student.encaminhamentos ? "Encaminhamentos pedagogicos: " + student.encaminhamentos : "Encaminhamentos pedagogicos: ainda nao registrados.",
      student.observacoesComplementares ? "Observacoes complementares: " + student.observacoesComplementares : "Observacoes complementares: ainda nao registradas."
    ].join("\n");
  }

  function buildStudentSummary(student) {
    if (!student) return "";
    const metrics = getStudentMetrics(student);
    const media = calculateAnnualAverage(student);
    const linhas = [
      SCHOOL_NAME + " - " + CLASS_NAME,
      "Aluno: " + student.numero + ". " + student.nome,
      "Media anual parcial: " + (media === null ? "sem notas suficientes" : formatNumber(media) + "/10"),
      "Frequencia parcial: " + formatNumber(calculateAttendance(student)) + "% de presenca",
      "Faltas em h/aula: " + metrics.faltas,
      "Presencas em h/aula: " + metrics.presencas,
      "Atividades feitas: " + calculateWorksTotal(student)
    ];

    BIMESTERS.forEach(function (bim) {
      const total = calculateBimTotal(student, bim);
      linhas.push(
        bim + "º bim. - trabalhos: " + (student.bimestres[bim].trabalhos === "" ? "—" : formatNumber(student.bimestres[bim].trabalhos))
        + " | prova: " + (student.bimestres[bim].prova === "" ? "—" : formatNumber(student.bimestres[bim].prova))
        + " | total: " + (total === null ? "—" : formatNumber(total) + "/10")
        + " | atividades feitas: " + getBimesterWorksCount(student, bim)
      );
    });

    if (metrics.observacoes.length) {
      linhas.push("Observacoes dos relatos:");
      metrics.observacoes.slice(0, 8).forEach(function (item) {
        linhas.push("- " + item.data + ": " + item.texto);
      });
    }

    if (student.destaques) linhas.push("Pontos fortes: " + student.destaques);
    if (student.necessidadesApoio) linhas.push("Necessidades de apoio: " + student.necessidadesApoio);
    if (student.encaminhamentos) linhas.push("Encaminhamentos: " + student.encaminhamentos);
    if (student.observacoesComplementares) linhas.push("Observacoes complementares: " + student.observacoesComplementares);

    return linhas.join("\n");
  }

  function buildClassSummary() {
    const linhas = [
      SCHOOL_NAME + " - " + CLASS_NAME,
      "Periodo: " + PERIOD_LABEL,
      "Alunos cadastrados: " + state.alunos.length
    ];

    state.alunos.forEach(function (student) {
      const metrics = getStudentMetrics(student);
      const media = calculateAnnualAverage(student);
      linhas.push(
        student.numero + ". " + student.nome
        + " | media: " + (media === null ? "—" : formatNumber(media) + "/10")
        + " | atividades feitas: " + calculateWorksTotal(student)
        + " | faltas em h/aula: " + metrics.faltas
        + " | presencas em h/aula: " + metrics.presencas
      );
    });

    return linhas.join("\n");
  }

  function persistAndRefresh(studentId, message) {
    saveState(message);
    if (studentId && currentProfileId === studentId && document.getElementById("profileModal").classList.contains("open")) {
      renderProfile(studentId);
    }
    if (studentId && currentReportId === studentId && document.getElementById("reportModal").classList.contains("open")) {
      renderReport(studentId);
    }
    renderSummary();
    renderTable();
  }

  function adjustStepper(button) {
    const student = getStudent(Number(button.dataset.student));
    if (!student) return;
    const bim = button.dataset.bimester;
    const field = button.dataset.field;
    const current = student.bimestres[bim][field] === "" ? 0 : Number(student.bimestres[bim][field]);
    const next = Math.max(0, Math.min(getFieldMax(field), current + Number(button.dataset.step)));
    student.bimestres[bim][field] = sanitizeNumeric(next, getFieldMax(field));
    persistAndRefresh(student.id, "Notas atualizadas.");
  }

  function updateNumericFieldFromInput(input) {
    const student = getStudent(Number(input.dataset.student));
    if (!student) return;
    const bim = input.dataset.bimester;
    const field = input.dataset.field;
    student.bimestres[bim][field] = sanitizeNumeric(input.value, getFieldMax(field));
    persistAndRefresh(student.id, "Notas atualizadas.");
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {
        fallbackCopy(text);
      });
      return;
    }
    fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
  }

  function openModal(id) {
    document.getElementById(id).classList.add("open");
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove("open");
    if (id === "profileModal") currentProfileId = null;
    if (id === "reportModal") currentReportId = null;
  }
})();
