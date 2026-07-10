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
  const DISCIPLINES = (config.disciplines || []).map(function (discipline, index) {
    return {
      name: discipline.name,
      shortLabel: discipline.shortLabel || discipline.name,
      automated: discipline.automated !== false,
      aliases: Array.isArray(discipline.aliases) ? discipline.aliases.slice() : [],
      order: typeof discipline.order === "number" ? discipline.order : index
    };
  });
  const MAIN_DISCIPLINE = config.mainDiscipline || (DISCIPLINES[0] ? DISCIPLINES[0].name : "Linguagem");
  const DAILY_SCOPE = "casavequia:daily:shared-v1";
  const PANEL_SCOPE = "casavequia:panel:" + STORAGE_KEY;
  const GRADE_SEEDS = window.CASAVEQUIA_GRADE_SEEDS && window.CASAVEQUIA_GRADE_SEEDS[STORAGE_KEY]
    ? window.CASAVEQUIA_GRADE_SEEDS[STORAGE_KEY]
    : (config.gradeSeeds && typeof config.gradeSeeds === "object" ? config.gradeSeeds : null);

  const searchInput = document.getElementById("searchInput");
  const tableBody = document.getElementById("tableBody");
  const summaryGrid = document.getElementById("summaryGrid");
  const saveStatusText = document.getElementById("saveStatusText");
  const syncHintBox = document.getElementById("syncHintBox");
  const tableTitle = document.getElementById("tableTitle");
  const tableDescription = document.getElementById("tableDescription");
  const tableDisciplineBtn = document.getElementById("tableDisciplineBtn");
  const tableDisciplineMenu = document.getElementById("tableDisciplineMenu");
  const tableDisciplineChip = document.getElementById("tableDisciplineChip");

  let currentProfileId = null;
  let currentReportId = null;
  let currentTableDiscipline = MAIN_DISCIPLINE;
  let currentBoletimDiscipline = MAIN_DISCIPLINE;
  let remotePanelSync = null;
  let remoteDailySync = null;
  let remoteSyncRetryTimer = null;
  let remoteSyncRetryCount = 0;
  let applyingRemotePanelState = false;
  let state = loadState();

  renderDisciplineMenus();
  renderAll();
  setSaveStatus("Painel carregado com sucesso.");
  requestRemoteSyncInit(0);

  searchInput.addEventListener("input", renderTable);
  window.addEventListener("focus", renderAll);
  window.addEventListener("load", function () {
    requestRemoteSyncInit(0);
  });
  window.addEventListener("storage", function (event) {
    if (event.key === SYNC_KEY || event.key === STORAGE_KEY) {
      if (event.key === STORAGE_KEY) {
        state = loadState();
      }
      renderAll();
    }
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "hidden" || !remotePanelSync) return;
    remotePanelSync.pushNow("force");
  });
  window.addEventListener("pagehide", function () {
    if (!remotePanelSync) return;
    remotePanelSync.pushNow("force");
  });

  document.getElementById("resetDataBtn").addEventListener("click", function () {
    const confirmar = window.confirm("Deseja restaurar o modelo original desta pagina? Isso apaga as edicoes salvas localmente.");
    if (!confirmar) return;
    localStorage.removeItem(STORAGE_KEY);
    state = buildDefaultState();
    saveState("Modelo restaurado.");
    renderAll();
    closeModal("profileModal");
    closeModal("reportModal");
  });

  document.getElementById("copyClassSummaryBtn").addEventListener("click", function () {
    copyText(buildClassSummary(currentTableDiscipline));
    setSaveStatus("Resumo da turma copiado.");
  });

  document.addEventListener("click", function (event) {
    const disciplineToggleButton = event.target.closest("[data-toggle-discipline-menu]");
    if (disciplineToggleButton) {
      toggleDisciplineMenu(disciplineToggleButton.dataset.toggleDisciplineMenu);
      return;
    }

    const tableDisciplineOption = event.target.closest("[data-select-table-discipline]");
    if (tableDisciplineOption) {
      setTableDiscipline(tableDisciplineOption.dataset.selectTableDiscipline || MAIN_DISCIPLINE);
      return;
    }

    const profileDisciplineOption = event.target.closest("[data-select-profile-discipline]");
    if (profileDisciplineOption) {
      setProfileDiscipline(profileDisciplineOption.dataset.selectProfileDiscipline || MAIN_DISCIPLINE);
      return;
    }

    const stepButton = event.target.closest("[data-step]");
    if (stepButton) {
      adjustStepper(stepButton);
      return;
    }

    const profileButton = event.target.closest("[data-open-profile]");
    if (profileButton) {
      currentBoletimDiscipline = currentTableDiscipline;
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

    const exportBoletimButton = event.target.closest("[data-open-boletim-export]");
    if (exportBoletimButton) {
      openBoletimExport();
      return;
    }

    const resetAutoButton = event.target.closest("[data-reset-auto]");
    if (resetAutoButton) {
      clearWorkGradeOverride(
        Number(resetAutoButton.dataset.resetAuto),
        resetAutoButton.dataset.bimester,
        resetAutoButton.dataset.discipline || MAIN_DISCIPLINE
      );
      return;
    }

    const insertTemplateButton = event.target.closest("[data-insert-report-template]");
    if (insertTemplateButton) {
      const studentId = Number(insertTemplateButton.dataset.insertReportTemplate);
      const student = getStudent(studentId);
      if (!student) return;
      student.relatorioGeral = buildAnnualReportTemplate(student);
      persistAndRefresh(studentId, "Modelo-base do relatorio inserido.");
      return;
    }

    closeDisciplineMenus();
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
    if (value === "" || value === null || value === undefined) return "";
    return String(value).replace(",", ".");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function getFieldMax(field) {
    return field === "trabalhosRealizados" ? 999 : GRADE_MAX;
  }

  function getFieldStep(field) {
    return field === "trabalhosRealizados" ? 1 : 0.1;
  }

  function sanitizeFieldValue(field, rawValue) {
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      return field === "trabalhosRealizados" ? 0 : "";
    }

    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) {
      return field === "trabalhosRealizados" ? 0 : "";
    }

    const max = getFieldMax(field);
    const rounded = field === "trabalhosRealizados"
      ? Math.round(numeric)
      : Math.round(numeric * 10) / 10;
    const clamped = Math.max(0, Math.min(max, rounded));
    return field === "trabalhosRealizados" ? clamped : Number(clamped.toFixed(1));
  }

  function printableNumber(value, suffix) {
    const parsed = toNumber(value);
    return parsed === null ? "nao preenchido" : formatNumber(parsed) + suffix;
  }

  function summaryCard(label, value, foot) {
    return '<article class="summary-card">'
      + '<div class="summary-label">' + escapeHtml(label) + "</div>"
      + '<div class="summary-value">' + escapeHtml(value) + "</div>"
      + '<div class="summary-foot">' + escapeHtml(foot) + "</div>"
      + "</article>";
  }

  function setSaveStatus(message) {
    const agora = new Date();
    saveStatusText.textContent = message + " Ultima atualizacao: " + formatDate(agora) + " as " + agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) + ".";
  }

  function buildEmptyBimesterState() {
    return { trabalhos: "", prova: "", trabalhosRealizados: 0 };
  }

  function buildEmptyDisciplineState() {
    const bimestres = {};
    BIMESTERS.forEach(function (bim) {
      bimestres[bim] = buildEmptyBimesterState();
    });
    return { bimestres: bimestres };
  }

  function buildDefaultBoletimState() {
    const boletim = {};
    DISCIPLINES.forEach(function (discipline) {
      if (discipline.name === MAIN_DISCIPLINE) return;
      boletim[discipline.name] = buildEmptyDisciplineState();
    });
    return boletim;
  }

  function getStudentGradeSeed(studentId) {
    if (!GRADE_SEEDS || typeof GRADE_SEEDS !== "object") return null;
    return GRADE_SEEDS[String(studentId)] || GRADE_SEEDS[studentId] || null;
  }

  function isBlankNumericField(value) {
    return value === "" || value === null || value === undefined;
  }

  function ensureStudentSeedBimState(student, disciplineName, bim) {
    if (disciplineName === MAIN_DISCIPLINE) {
      if (!student.bimestres[bim]) {
        student.bimestres[bim] = buildEmptyBimesterState();
      }
      return student.bimestres[bim];
    }

    if (!student.boletim) {
      student.boletim = buildDefaultBoletimState();
    }
    if (!student.boletim[disciplineName]) {
      student.boletim[disciplineName] = buildEmptyDisciplineState();
    }
    if (!student.boletim[disciplineName].bimestres[bim]) {
      student.boletim[disciplineName].bimestres[bim] = buildEmptyBimesterState();
    }
    return student.boletim[disciplineName].bimestres[bim];
  }

  function applySeedGradesToStudentState(student) {
    const seed = getStudentGradeSeed(student.id);
    if (!seed || typeof seed !== "object") return student;

    Object.keys(seed).forEach(function (disciplineName) {
      const disciplineSeed = seed[disciplineName];
      const disciplineExists = disciplineName === MAIN_DISCIPLINE || DISCIPLINES.some(function (discipline) {
        return discipline.name === disciplineName;
      });
      if (!disciplineSeed || typeof disciplineSeed !== "object" || !disciplineExists) return;

      Object.keys(disciplineSeed).forEach(function (bim) {
        const source = disciplineSeed[bim];
        if (!source || typeof source !== "object") return;
        const target = ensureStudentSeedBimState(student, disciplineName, bim);

        if (source.trabalhos !== undefined && isBlankNumericField(target.trabalhos)) {
          target.trabalhos = sanitizeFieldValue("trabalhos", source.trabalhos);
        }
        if (source.prova !== undefined && isBlankNumericField(target.prova)) {
          target.prova = sanitizeFieldValue("prova", source.prova);
        }
        if (source.trabalhosRealizados !== undefined && (target.trabalhosRealizados === 0 || isBlankNumericField(target.trabalhosRealizados))) {
          target.trabalhosRealizados = sanitizeFieldValue("trabalhosRealizados", source.trabalhosRealizados);
        }
      });
    });

    return student;
  }

  function buildDefaultState() {
    return {
      __syncUpdatedAt: "",
      escola: SCHOOL_NAME,
      turma: CLASS_NAME,
      periodo: PERIOD_LABEL,
      alunos: (config.students || []).map(function (student) {
        return applySeedGradesToStudentState({
          id: student.id,
          numero: student.numero,
          nome: student.nome,
          transferido: student.transferido === true,
          bimestres: {
            "1": buildEmptyBimesterState(),
            "2": buildEmptyBimesterState(),
            "3": buildEmptyBimesterState(),
            "4": buildEmptyBimesterState()
          },
          boletim: buildDefaultBoletimState(),
          observacoesComplementares: "",
          encaminhamentos: "",
          destaques: "",
          necessidadesApoio: "",
          relatorioGeral: ""
        });
      })
    };
  }

  function mergeStudent(baseStudent, savedStudent) {
    const merged = {
      id: baseStudent.id,
      numero: baseStudent.numero,
      nome: baseStudent.nome,
      transferido: baseStudent.transferido === true,
      observacoesComplementares: savedStudent.observacoesComplementares !== undefined ? savedStudent.observacoesComplementares : baseStudent.observacoesComplementares,
      encaminhamentos: savedStudent.encaminhamentos !== undefined ? savedStudent.encaminhamentos : baseStudent.encaminhamentos,
      destaques: savedStudent.destaques !== undefined ? savedStudent.destaques : baseStudent.destaques,
      necessidadesApoio: savedStudent.necessidadesApoio !== undefined ? savedStudent.necessidadesApoio : baseStudent.necessidadesApoio,
      relatorioGeral: savedStudent.relatorioGeral !== undefined ? savedStudent.relatorioGeral : baseStudent.relatorioGeral,
      boletim: {},
      bimestres: {}
    };

    BIMESTERS.forEach(function (bim) {
      const savedBim = savedStudent.bimestres && savedStudent.bimestres[bim] ? savedStudent.bimestres[bim] : {};
      merged.bimestres[bim] = {
        trabalhos: sanitizeFieldValue("trabalhos", savedBim.trabalhos !== undefined ? savedBim.trabalhos : baseStudent.bimestres[bim].trabalhos),
        prova: sanitizeFieldValue("prova", savedBim.prova !== undefined ? savedBim.prova : baseStudent.bimestres[bim].prova),
        trabalhosRealizados: sanitizeFieldValue("trabalhosRealizados", savedBim.trabalhosRealizados !== undefined ? savedBim.trabalhosRealizados : baseStudent.bimestres[bim].trabalhosRealizados)
      };
    });

    DISCIPLINES.forEach(function (discipline) {
      if (discipline.name === MAIN_DISCIPLINE) return;
      const baseDiscipline = baseStudent.boletim && baseStudent.boletim[discipline.name]
        ? baseStudent.boletim[discipline.name]
        : buildEmptyDisciplineState();
      const savedDiscipline = savedStudent.boletim && savedStudent.boletim[discipline.name]
        ? savedStudent.boletim[discipline.name]
        : {};

      merged.boletim[discipline.name] = { bimestres: {} };
      BIMESTERS.forEach(function (bim) {
        const savedDisciplineBim = savedDiscipline.bimestres && savedDiscipline.bimestres[bim] ? savedDiscipline.bimestres[bim] : {};
        merged.boletim[discipline.name].bimestres[bim] = {
          trabalhos: sanitizeFieldValue("trabalhos", savedDisciplineBim.trabalhos !== undefined ? savedDisciplineBim.trabalhos : baseDiscipline.bimestres[bim].trabalhos),
          prova: sanitizeFieldValue("prova", savedDisciplineBim.prova !== undefined ? savedDisciplineBim.prova : baseDiscipline.bimestres[bim].prova),
          trabalhosRealizados: sanitizeFieldValue("trabalhosRealizados", savedDisciplineBim.trabalhosRealizados !== undefined ? savedDisciplineBim.trabalhosRealizados : baseDiscipline.bimestres[bim].trabalhosRealizados)
        };
      });
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
        __syncUpdatedAt: parsed.__syncUpdatedAt || base.__syncUpdatedAt || "",
        escola: parsed.escola || base.escola,
        turma: parsed.turma || base.turma,
        periodo: parsed.periodo || base.periodo,
        alunos: base.alunos.map(function (student) {
          const saved = parsed.alunos.find(function (item) { return item.id === student.id; }) || {};
          return applySeedGradesToStudentState(mergeStudent(student, saved));
        })
      };
    } catch (error) {
      return base;
    }
  }

  function saveState(message) {
    state.__syncUpdatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    queueRemotePanelSave("panel-save");
    if (message) setSaveStatus(message);
  }

  function readDailySyncData() {
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
    const sync = readDailySyncData();
    if (!sync || !sync.classes) return null;
    return sync.classes[TURMA_ID] || null;
  }

  function findMatchingDisciplineKey(collection, disciplineName) {
    if (!collection || typeof collection !== "object") return null;
    const names = [disciplineName];
    const configItem = getDisciplineConfig(disciplineName);
    if (configItem && Array.isArray(configItem.aliases)) {
      configItem.aliases.forEach(function (alias) { names.push(alias); });
    }
    const normalizedTargets = names.map(normalizeText);
    return Object.keys(collection).find(function (key) {
      return normalizedTargets.includes(normalizeText(key));
    }) || null;
  }

  function buildEmptyDisciplineMetrics() {
    return {
      atividadesFeitas: 0,
      atividadesAplicadas: 0,
      atividadesPorBimestre: { "1": 0, "2": 0, "3": 0, "4": 0 },
      atividadesAplicadasPorBimestre: { "1": 0, "2": 0, "3": 0, "4": 0 }
    };
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

  function getDisciplineMetrics(student, disciplineName) {
    const classSync = getClassSync();
    const studentSync = getSyncStudent(student);
    const result = buildEmptyDisciplineMetrics();
    const classKey = classSync ? findMatchingDisciplineKey(classSync.disciplinas, disciplineName) : null;
    const studentKey = studentSync ? findMatchingDisciplineKey(studentSync.disciplinas, disciplineName) : null;
    const classMetrics = classKey && classSync && classSync.disciplinas ? classSync.disciplinas[classKey] : null;
    const studentMetrics = studentKey && studentSync && studentSync.disciplinas ? studentSync.disciplinas[studentKey] : null;

    BIMESTERS.forEach(function (bim) {
      result.atividadesPorBimestre[bim] = Number(studentMetrics && studentMetrics.atividadesPorBimestre && studentMetrics.atividadesPorBimestre[bim]) || 0;
      result.atividadesAplicadasPorBimestre[bim] = Number(classMetrics && classMetrics.atividadesAplicadasPorBimestre && classMetrics.atividadesAplicadasPorBimestre[bim]) || 0;
    });

    result.atividadesFeitas = Number(studentMetrics && studentMetrics.atividadesFeitas) || BIMESTERS.reduce(function (sum, bim) {
      return sum + result.atividadesPorBimestre[bim];
    }, 0);
    result.atividadesAplicadas = Number(classMetrics && classMetrics.atividadesAplicadas) || BIMESTERS.reduce(function (sum, bim) {
      return sum + result.atividadesAplicadasPorBimestre[bim];
    }, 0);

    if (!classMetrics && disciplineName === MAIN_DISCIPLINE) {
      result.atividadesAplicadas = Number(classSync && classSync.atividadesAplicadas) || result.atividadesAplicadas;
    }
    if (!studentMetrics && disciplineName === MAIN_DISCIPLINE) {
      result.atividadesFeitas = Number(studentSync && studentSync.atividadesFeitas) || result.atividadesFeitas;
      BIMESTERS.forEach(function (bim) {
        result.atividadesPorBimestre[bim] = Number(studentSync && studentSync.atividadesPorBimestre && studentSync.atividadesPorBimestre[bim]) || result.atividadesPorBimestre[bim];
      });
    }

    return result;
  }

  function getAppliedActivitiesCount(disciplineName) {
    const classSync = getClassSync();
    if (!classSync) return 0;
    if (!disciplineName || disciplineName === MAIN_DISCIPLINE) {
      const key = findMatchingDisciplineKey(classSync.disciplinas, disciplineName);
      if (key && classSync.disciplinas[key]) {
        return Number(classSync.disciplinas[key].atividadesAplicadas) || 0;
      }
      return Number(classSync.atividadesAplicadas) || 0;
    }
    const key = findMatchingDisciplineKey(classSync.disciplinas, disciplineName);
    if (!key || !classSync.disciplinas[key]) return 0;
    return Number(classSync.disciplinas[key].atividadesAplicadas) || 0;
  }

  function getDisciplineConfig(disciplineName) {
    return DISCIPLINES.find(function (discipline) {
      return discipline.name === disciplineName;
    }) || DISCIPLINES[0];
  }

  function renderDisciplineMenus() {
    if (tableDisciplineMenu) {
      tableDisciplineMenu.innerHTML = buildDisciplineMenuHtml("table", currentTableDiscipline);
    }
  }

  function buildDisciplineMenuHtml(scope, activeDiscipline) {
    return DISCIPLINES.map(function (discipline) {
      const active = activeDiscipline === discipline.name;
      const dataAttr = scope === "table" ? 'data-select-table-discipline' : 'data-select-profile-discipline';
      return '<button class="discipline-option' + (active ? ' active' : '') + '" type="button" ' + dataAttr + '="' + escapeHtml(discipline.name) + '">'
        + escapeHtml(discipline.name)
        + '<small>' + escapeHtml(discipline.automated ? "Com calculo automatico de trabalhos" : "Notas manuais nesta disciplina") + '</small>'
        + '</button>';
    }).join("");
  }

  function toggleDisciplineMenu(scope) {
    const picker = scope === "profile"
      ? document.getElementById("profileDisciplinePicker")
      : document.getElementById("tableDisciplinePicker");
    if (!picker) return;
    const shouldOpen = !picker.classList.contains("open");
    closeDisciplineMenus();
    if (shouldOpen) picker.classList.add("open");
  }

  function closeDisciplineMenus() {
    document.querySelectorAll(".discipline-picker.open").forEach(function (picker) {
      picker.classList.remove("open");
    });
  }

  function setTableDiscipline(disciplineName) {
    currentTableDiscipline = disciplineName;
    closeDisciplineMenus();
    renderDisciplineMenus();
    renderAll();
  }

  function setProfileDiscipline(disciplineName) {
    currentBoletimDiscipline = disciplineName;
    closeDisciplineMenus();
    if (currentProfileId !== null) {
      renderProfile(currentProfileId);
    }
  }

  function updateTableDisciplinePresentation() {
    const disciplineConfig = getDisciplineConfig(currentTableDiscipline);
    if (tableTitle) {
      tableTitle.textContent = "Tabela geral da turma";
    }
    if (tableDescription) {
      tableDescription.textContent = "Pagina de notas de " + disciplineConfig.name + ". As colunas mostram o total do bimestre desta disciplina; os detalhes continuam no perfil do aluno.";
    }
    if (tableDisciplineBtn) {
      tableDisciplineBtn.textContent = "Disciplina: " + disciplineConfig.shortLabel;
    }
    if (tableDisciplineChip) {
      tableDisciplineChip.textContent = "Disciplina ativa: " + disciplineConfig.name;
    }
  }

  function getStudent(studentId) {
    return state.alunos.find(function (item) { return item.id === studentId; }) || null;
  }

  function getDisciplineState(student, disciplineName) {
    if (disciplineName === MAIN_DISCIPLINE) {
      return { bimestres: student.bimestres };
    }

    if (!student.boletim) {
      student.boletim = buildDefaultBoletimState();
    }
    if (!student.boletim[disciplineName]) {
      student.boletim[disciplineName] = buildEmptyDisciplineState();
    }
    return student.boletim[disciplineName];
  }

  function getDisciplineBimState(student, disciplineName, bim) {
    const disciplineState = getDisciplineState(student, disciplineName);
    if (!disciplineState.bimestres[bim]) {
      disciplineState.bimestres[bim] = buildEmptyBimesterState();
    }
    return disciplineState.bimestres[bim];
  }

  function calculateAutoWorkGrade(student, disciplineName, bim) {
    const metrics = getDisciplineMetrics(student, disciplineName);
    const feitas = Number(metrics.atividadesPorBimestre[bim]) || 0;
    const aplicadas = Number(metrics.atividadesAplicadasPorBimestre[bim]) || 0;
    if (!aplicadas) return null;
    return Number(Math.min(GRADE_MAX, ((feitas / aplicadas) * GRADE_MAX)).toFixed(1));
  }

  function getStoredWorkGrade(student, disciplineName, bim) {
    return toNumber(getDisciplineBimState(student, disciplineName, bim).trabalhos);
  }

  function hasManualWorkGrade(student, disciplineName, bim) {
    return getStoredWorkGrade(student, disciplineName, bim) !== null;
  }

  function getEffectiveWorkGrade(student, disciplineName, bim) {
    const manual = getStoredWorkGrade(student, disciplineName, bim);
    if (manual !== null) return manual;
    return calculateAutoWorkGrade(student, disciplineName, bim);
  }

  function roundFinalGrade(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
    return Number((Math.round(Number(value) * 2) / 2).toFixed(1));
  }

  function calculateDisciplineBimTotal(student, disciplineName, bim) {
    const dados = getDisciplineBimState(student, disciplineName, bim);
    const trabalhos = getEffectiveWorkGrade(student, disciplineName, bim);
    const prova = toNumber(dados.prova);
    if (trabalhos === null && prova === null) return null;
    return roundFinalGrade((trabalhos || 0) + (prova || 0));
  }

  function calculateDisciplineAverage(student, disciplineName) {
    const totals = BIMESTERS.map(function (bim) {
      return calculateDisciplineBimTotal(student, disciplineName, bim);
    }).filter(function (value) {
      return value !== null;
    });
    if (!totals.length) return null;
    return roundFinalGrade(totals.reduce(function (sum, value) { return sum + value; }, 0) / totals.length);
  }

  function calculateAnnualAverage(student) {
    return calculateDisciplineAverage(student, MAIN_DISCIPLINE);
  }

  function calculateAttendance(student) {
    const metrics = getStudentMetrics(student);
    if (!metrics.totalAulas) return 0;
    return Math.max(0, (metrics.presencas / metrics.totalAulas) * 100);
  }

  function calculateWorksTotal(student) {
    return getStudentMetrics(student).atividadesFeitas;
  }

  function renderAll() {
    if (!state || !Array.isArray(state.alunos) || !state.alunos.length) {
      state = buildDefaultState();
    }
    renderDisciplineMenus();
    updateTableDisciplinePresentation();
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
      syncHintBox.innerHTML = "<strong>Sincronizacao pendente</strong>Abra <code>casavequia.html</code> e navegue pelos relatos para consolidar faltas, presencas, observacoes e atividades desta turma.";
      return;
    }

    const updatedAt = classSync.updatedAt ? new Date(classSync.updatedAt) : null;
    syncHintBox.innerHTML = "<strong>Sincronizacao ativa</strong>"
      + " As faltas, presencas, atividades feitas e observacoes desta turma agora sao lidas do painel principal e compartilhadas online."
      + (updatedAt ? " Ultima atualizacao: <code>" + escapeHtml(formatDate(updatedAt)) + "</code>." : "");
  }

  function renderSummary() {
    const disciplineConfig = getDisciplineConfig(currentTableDiscipline);
    const ativos = state.alunos.filter(function (s) { return !s.transferido; });
    const medias = ativos.map(function (student) {
      return calculateDisciplineAverage(student, currentTableDiscipline);
    }).filter(function (value) { return value !== null; });
    const mediaTurma = medias.length ? medias.reduce(function (sum, value) { return sum + value; }, 0) / medias.length : null;
    const totalFaltas = ativos.reduce(function (sum, student) { return sum + getStudentMetrics(student).faltas; }, 0);
    const totalPresencas = ativos.reduce(function (sum, student) { return sum + getStudentMetrics(student).presencas; }, 0);
    const transferidos = state.alunos.length - ativos.length;

    summaryGrid.innerHTML = [
      summaryCard("Alunos ativos", String(ativos.length), transferidos > 0 ? transferidos + " transferido(s) na lista" : "Base da turma"),
      summaryCard("Faltas em h/aula", String(totalFaltas), "Carga horaria ausente consolidada"),
      summaryCard("Presencas em h/aula", String(totalPresencas), "Sincronizadas pelos relatos diarios"),
      summaryCard("Media de " + disciplineConfig.shortLabel, mediaTurma === null ? "-" : formatNumber(mediaTurma), mediaTurma === null ? "Preencha ou sincronize as notas desta disciplina" : "Com base nos bimestres ja lancados"),
      summaryCard("Atividades de " + disciplineConfig.shortLabel, String(getAppliedActivitiesCount(currentTableDiscipline)), disciplineConfig.automated ? "Cada tema desta disciplina conta como 1 atividade aplicada" : "Disciplina em modo manual"),
      summaryCard("Relatorios anuais", String(state.alunos.length), "Todos podem ser gerados automaticamente pelo sistema")
    ].join("");
  }

  function renderTable() {
    const disciplineConfig = getDisciplineConfig(currentTableDiscipline);
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
      if (student.transferido) {
        return '<tr class="student-row-transferido">'
          + '<td class="student-cell">'
          + '<span class="student-number">' + student.numero + "</span>"
          + '<span class="student-name student-name-transferido">' + escapeHtml(student.nome) + "</span>"
          + '<div class="student-meta"><span class="mini-chip chip-transferido">Transferido</span></div>'
          + "</td>"
          + BIMESTERS.map(function () {
            return '<td><span class="grade-badge grade-transferido"><strong>–</strong></span></td>';
          }).join("")
          + "</tr>";
      }
      const media = calculateDisciplineAverage(student, currentTableDiscipline);
      return "<tr>"
        + '<td class="student-cell">'
        + '<span class="student-number">' + student.numero + "</span>"
        + '<button class="student-name-btn" type="button" data-open-profile="' + student.id + '"><span class="student-name">' + escapeHtml(student.nome) + "</span></button>"
        + '<div class="student-meta">'
        + '<span class="mini-chip">Media em ' + escapeHtml(disciplineConfig.shortLabel) + ": " + (media === null ? "-" : formatNumber(media) + "/10") + "</span>"
        + '<span class="mini-chip">Frequencia: ' + formatNumber(calculateAttendance(student)) + "%</span>"
        + "</div>"
        + "</td>"
        + BIMESTERS.map(function (bim) {
          return "<td>" + renderBimGradeBadge(student, bim, currentTableDiscipline) + "</td>";
        }).join("")
        + "</tr>";
    }).join("");
  }

  function renderBimGradeBadge(student, bim, disciplineName) {
    const total = calculateDisciplineBimTotal(student, disciplineName || MAIN_DISCIPLINE, bim);
    if (total === null) {
      return '<span class="grade-badge"><strong>-</strong><small>Sem nota</small></span>';
    }
    const isRecovery = total < 7;
    return '<span class="grade-badge ' + (isRecovery ? "recovery" : "good") + '">'
      + '<strong>' + (isRecovery ? "⚠️ " : "OK ") + formatNumber(total) + "/10</strong>"
      + "<small>" + (isRecovery ? "Recuperacao" : "Acima de 7") + "</small>"
      + "</span>";
  }

  function renderStepper(studentId, bim, field, value, disciplineName) {
    const step = getFieldStep(field);
    const max = getFieldMax(field);
    const disciplineAttr = disciplineName ? ' data-discipline="' + escapeHtml(disciplineName) + '"' : "";
    return '<div class="stepper">'
      + '<button type="button" data-step="-'+ step +'" data-student="'+ studentId +'" data-bimester="'+ bim +'" data-field="'+ field +'"' + disciplineAttr + '>-</button>'
      + '<input type="number" min="0" max="' + max + '" step="' + step + '" value="' + formatInputValue(value) + '" data-student="' + studentId + '" data-bimester="' + bim + '" data-field="' + field + '"' + disciplineAttr + ">"
      + '<button type="button" data-step="'+ step +'" data-student="'+ studentId +'" data-bimester="'+ bim +'" data-field="'+ field +'"' + disciplineAttr + ">+</button>"
      + "</div>";
  }

  function profileMetric(label, value, foot) {
    return '<article class="profile-card">'
      + '<div class="summary-label">' + escapeHtml(label) + "</div>"
      + '<div class="summary-value">' + escapeHtml(value) + "</div>"
      + '<div class="summary-foot">' + escapeHtml(foot) + "</div>"
      + "</article>";
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
    const disciplineConfig = getDisciplineConfig(currentBoletimDiscipline);
    const media = calculateDisciplineAverage(student, currentBoletimDiscipline);
    const disciplineMetrics = getDisciplineMetrics(student, currentBoletimDiscipline);

    document.getElementById("profileTitle").textContent = student.numero + ". " + student.nome;
    document.getElementById("profileSubtitle").textContent = SCHOOL_NAME + " · " + CLASS_NAME + " · " + PERIOD_LABEL;

    document.getElementById("profileBody").innerHTML =
      '<section class="profile-stats">'
        + profileMetric("Faltas em h/aula", String(metrics.faltas), "Carga horaria ausente consolidada")
        + profileMetric("Presencas em h/aula", String(metrics.presencas), "Presencas registradas nos relatos diarios")
        + profileMetric("Atividades em " + disciplineConfig.shortLabel, String(disciplineMetrics.atividadesFeitas || 0), disciplineConfig.automated ? "Contagem automatica da disciplina ativa" : "Disciplina em modo manual")
        + profileMetric("Media em " + disciplineConfig.shortLabel, media === null ? "-" : formatNumber(media) + "/10", media === null ? "Ainda sem notas lancadas nesta disciplina" : "Media dos bimestres preenchidos")
      + "</section>"
      + '<section class="section-block">'
        + "<h3>Boletim por disciplina</h3>"
        + '<p class="section-note">Cada disciplina desta turma possui uma pagina detalhada no perfil. Quando houver temas sincronizados no diario, a nota de trabalhos pode ser calculada automaticamente e continua totalmente editavel.</p>'
        + renderBoletimSection(student)
      + "</section>"
      + '<section class="section-block">'
        + "<h3>Faltas e dias em que o aluno faltou</h3>"
        + '<p class="section-note">A contagem abaixo foi consolidada a partir das chamadas sincronizadas da propria turma. Cada hora/aula ausente equivale a 1 falta.</p>'
        + renderAbsenceDetails(metrics)
      + "</section>"
      + '<section class="section-block">'
        + "<h3>Observacoes de comportamento extraidas dos relatos</h3>"
        + '<p class="section-note">Quando os relatos diarios citam o aluno nominalmente, essas observacoes aparecem aqui e passam a alimentar o relatorio anual automatico.</p>'
        + renderObservationDetails(metrics.observacoes)
      + "</section>"
      + '<section class="section-block">'
        + "<h3>Acompanhamento complementar</h3>"
        + '<div class="text-grid">'
          + renderTextArea(student, "observacoesComplementares", "Observacoes complementares", "Registre evolucao, comportamento recorrente, postura, participacao e fatos relevantes nao capturados automaticamente.")
          + renderTextArea(student, "encaminhamentos", "Encaminhamentos pedagogicos", "Conversa com responsaveis, reforco, recomposicao, avaliacao, orientacoes e proximos passos.")
          + renderTextArea(student, "destaques", "Pontos fortes do aluno", "Participacao, responsabilidade, oralidade, escrita, lideranca, criatividade ou avancos percebidos.")
          + renderTextArea(student, "necessidadesApoio", "Necessidades de apoio", "Frequencia, motivacao, leitura, escrita, concentracao ou rotina de estudos.")
        + "</div>"
      + "</section>"
      + '<div class="report-tools">'
        + '<button class="primary-btn" type="button" data-open-report="' + student.id + '">Relatorio geral</button>'
        + '<button class="ghost-btn" type="button" data-copy-student-summary="' + student.id + '">Copiar resumo para o Codex</button>'
      + "</div>";
  }

  function renderBoletimSection(student) {
    const disciplineConfig = getDisciplineConfig(currentBoletimDiscipline);
    return '<div class="section-head">'
      + '<div class="discipline-picker" id="profileDisciplinePicker">'
        + '<button class="ghost-btn discipline-btn" type="button" data-toggle-discipline-menu="profile">Disciplina: ' + escapeHtml(disciplineConfig.name) + "</button>"
        + '<div class="discipline-menu">' + buildDisciplineMenuHtml("profile", currentBoletimDiscipline) + "</div>"
      + "</div>"
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
      + '<span class="mini-chip">Boletim detalhado: ' + escapeHtml(disciplineConfig.shortLabel) + "</span>"
      + '<button class="ghost-btn" type="button" data-open-boletim-export="1">Exportar</button>'
      + "</div>"
      + "</div>"
      + DISCIPLINES.map(function (discipline) {
        const active = currentBoletimDiscipline === discipline.name;
        const metrics = getDisciplineMetrics(student, discipline.name);
        const note = discipline.automated
          ? "Nesta disciplina, cada tema sincronizado no diario conta como atividade aplicada. A nota de trabalhos e distribuida automaticamente ate 5,0 conforme as atividades feitas no bimestre."
          : "Nesta disciplina, as notas seguem em modo manual nesta fase.";
        return '<div class="boletim-panel' + (active ? " active" : "") + '" data-boletim-panel="' + escapeHtml(discipline.name) + '">'
          + '<div class="report-alert" style="margin-bottom:14px">'
          + escapeHtml(note)
          + (discipline.automated ? " Atividades registradas: " + metrics.atividadesFeitas + " de " + metrics.atividadesAplicadas + "." : "")
          + "</div>"
          + '<div class="bim-grid">'
          + BIMESTERS.map(function (bim) {
            return renderBimCard(student, bim, discipline.name);
          }).join("")
          + "</div>"
          + "</div>";
      }).join("");
  }

  function renderBimCard(student, bim, disciplineName) {
    const dados = getDisciplineBimState(student, disciplineName, bim);
    const total = calculateDisciplineBimTotal(student, disciplineName, bim);
    const autoGrade = calculateAutoWorkGrade(student, disciplineName, bim);
    const effectiveWork = getEffectiveWorkGrade(student, disciplineName, bim);
    const metrics = getDisciplineMetrics(student, disciplineName);
    const isManual = hasManualWorkGrade(student, disciplineName, bim);

    return '<article class="bim-card">'
      + '<div class="bim-card-head">'
        + '<div class="bim-card-title">' + bim + "o Bimestre</div>"
        + '<div class="bim-card-total">' + (total === null ? "-" : formatNumber(total) + "/10") + "</div>"
      + "</div>"
      + '<div class="field-stack">'
        + "<div><label>Nota de trabalhos</label>" + renderStepper(student.id, bim, "trabalhos", effectiveWork, disciplineName) + "</div>"
        + "<div><label>Nota de prova</label>" + renderStepper(student.id, bim, "prova", dados.prova, disciplineName) + "</div>"
        + '<div class="summary-foot">'
          + (isManual
            ? "Nota manual em uso. Sugestao automatica: " + (autoGrade === null ? "indisponivel" : formatNumber(autoGrade) + "/5") + ". "
            : "Sugestao automatica: " + (autoGrade === null ? "aguardando atividades registradas" : formatNumber(autoGrade) + "/5") + ". ")
          + "Atividades feitas: " + (metrics.atividadesPorBimestre[bim] || 0)
          + " de " + (metrics.atividadesAplicadasPorBimestre[bim] || 0) + "."
          + (isManual ? ' <button class="ghost-btn" style="padding:6px 10px;margin-top:8px" type="button" data-reset-auto="' + student.id + '" data-bimester="' + bim + '" data-discipline="' + escapeHtml(disciplineName) + '">Voltar ao automatico</button>' : "")
        + "</div>"
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

  function openBoletimExport() {
    if (!window.BoletimExport) {
      window.alert("O exportador de PDF ainda nao foi carregado. Recarregue a pagina e tente novamente.");
      return;
    }
    window.BoletimExport.open({
      classOptions: [{ value: CLASS_NAME, label: CLASS_NAME }],
      defaultClass: CLASS_NAME,
      disciplineOptions: DISCIPLINES.map(function (discipline) {
        return { value: discipline.name, label: discipline.name };
      }),
      defaultDiscipline: currentBoletimDiscipline,
      bimesterOptions: BIMESTERS.map(function (bim) {
        return { value: bim, label: bim + "o bimestre" };
      }),
      defaultBimesters: BIMESTERS.slice(),
      buildPayload: function (selection) {
        return buildBoletimExportPayload(selection);
      }
    });
  }

  function buildBoletimExportPayload(selection) {
    var students = state.alunos
      .filter(function (student) { return !student.transferido; })
      .slice()
      .sort(function (left, right) { return left.numero - right.numero; });
    var disciplineName = selection.disciplineValue || currentBoletimDiscipline;
    return {
      schoolName: SCHOOL_NAME,
      subtitle: PERIOD_LABEL + " - boletim exportado do painel de alunos",
      classLabel: selection.classLabel || CLASS_NAME,
      disciplineLabel: selection.disciplineLabel || disciplineName,
      generatedAt: formatDate(new Date()) + " " + new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
      fileName: "boletim-" + CLASS_NAME + "-" + disciplineName,
      sections: selection.bimesters.map(function (bim) {
        var totals = [];
        var rows = students.map(function (student) {
          var dados = getDisciplineBimState(student, disciplineName, bim);
          var trabalhos = getEffectiveWorkGrade(student, disciplineName, bim);
          var prova = toNumber(dados.prova);
          var total = calculateDisciplineBimTotal(student, disciplineName, bim);
          if (total !== null) totals.push(total);
          return {
            numero: student.numero,
            nome: student.nome,
            trabalhos: trabalhos === null ? "-" : formatNumber(trabalhos) + "/5",
            prova: prova === null ? "-" : formatNumber(prova) + "/5",
            total: total === null ? "-" : formatNumber(total) + "/10"
          };
        });
        var average = totals.length ? roundFinalGrade(totals.reduce(function (sum, value) { return sum + value; }, 0) / totals.length) : null;
        return {
          title: bim + "o bimestre",
          average: average === null ? "-" : formatNumber(average) + "/10",
          note: "Lista exportada com " + rows.length + " aluno(s) ativos da turma.",
          rows: rows
        };
      })
    };
  }

  function renderObservationDetails(observacoes) {
    if (!observacoes || !observacoes.length) {
      return '<div class="empty-state">Nenhuma observacao nominal sincronizada nos relatos desta turma ate agora.</div>';
    }

    return '<div class="observation-list">'
      + observacoes.map(function (item) {
        return '<article class="observation-item">'
          + '<div class="observation-date">Registro · ' + escapeHtml(item.data || "Sem data") + "</div>"
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
    const generatedReport = buildAutoAnnualReport(student);
    document.getElementById("reportTitle").textContent = "Relatorio geral - " + student.nome;
    document.getElementById("reportSubtitle").textContent = SCHOOL_NAME + " · " + CLASS_NAME + " · relatorio anual do aluno";
    document.getElementById("reportBody").innerHTML =
      '<div class="report-alert">Este relatorio anual e montado automaticamente com base nas notas por disciplina, faltas, presencas, atividades feitas nos relatos diarios e observacoes pedagogicas registradas no perfil do aluno.</div>'
      + '<div class="report-tools">'
        + '<button class="primary-btn" type="button" data-copy-student-summary="' + student.id + '">Copiar resumo completo para o Codex</button>'
      + "</div>"
      + '<section class="report-section"><h3>Resumo estruturado do aluno</h3><div class="report-box">' + escapeHtml(buildStudentSummary(student)) + "</div></section>"
      + '<section class="report-section"><h3>Relatorio anual gerado automaticamente</h3><div class="report-box">' + escapeHtml(generatedReport) + "</div></section>";
  }

  function buildStudentSummary(student) {
    const metrics = getStudentMetrics(student);
    const linhas = [
      SCHOOL_NAME + " - " + CLASS_NAME,
      "Aluno: " + student.numero + ". " + student.nome,
      "Frequencia parcial: " + formatNumber(calculateAttendance(student)) + "% de presenca",
      "Faltas em h/aula: " + metrics.faltas,
      "Presencas em h/aula: " + metrics.presencas,
      "Atividades feitas no total: " + calculateWorksTotal(student)
    ];

    DISCIPLINES.forEach(function (discipline) {
      linhas.push("");
      linhas.push("Disciplina: " + discipline.name);
      linhas.push("Media parcial: " + (calculateDisciplineAverage(student, discipline.name) === null ? "sem notas suficientes" : formatNumber(calculateDisciplineAverage(student, discipline.name)) + "/10"));
      BIMESTERS.forEach(function (bim) {
        const dados = getDisciplineBimState(student, discipline.name, bim);
        const total = calculateDisciplineBimTotal(student, discipline.name, bim);
        const trabalhos = getEffectiveWorkGrade(student, discipline.name, bim);
        const metricsByDiscipline = getDisciplineMetrics(student, discipline.name);
        linhas.push(
          bim + "o bim. - trabalhos: " + (trabalhos === null ? "-" : formatNumber(trabalhos) + "/5")
          + " | prova: " + printableNumber(dados.prova, "/5")
          + " | total: " + (total === null ? "-" : formatNumber(total) + "/10")
          + " | atividades feitas: " + (metricsByDiscipline.atividadesPorBimestre[bim] || 0)
          + " de " + (metricsByDiscipline.atividadesAplicadasPorBimestre[bim] || 0)
        );
      });
    });

    if (metrics.observacoes.length) {
      linhas.push("");
      linhas.push("Observacoes sincronizadas dos relatos:");
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

  function buildClassSummary(disciplineName) {
    const disciplineConfig = getDisciplineConfig(disciplineName || MAIN_DISCIPLINE);
    const linhas = [
      SCHOOL_NAME + " - " + CLASS_NAME,
      "Periodo: " + PERIOD_LABEL,
      "Disciplina em foco: " + disciplineConfig.name,
      "Alunos cadastrados: " + state.alunos.length
    ];

    state.alunos.forEach(function (student) {
      const metrics = getStudentMetrics(student);
      const media = calculateDisciplineAverage(student, disciplineConfig.name);
      linhas.push(
        student.numero + ". " + student.nome
        + " | media: " + (media === null ? "-" : formatNumber(media) + "/10")
        + " | faltas: " + metrics.faltas
        + " | presencas: " + metrics.presencas
        + " | atividades nesta disciplina: " + getDisciplineMetrics(student, disciplineConfig.name).atividadesFeitas
      );
    });

    return linhas.join("\n");
  }

  function buildAnnualReportTemplate(student) {
    const metrics = getStudentMetrics(student);
    const disciplineSummary = DISCIPLINES.map(function (discipline) {
      const media = calculateDisciplineAverage(student, discipline.name);
      const disciplineMetrics = getDisciplineMetrics(student, discipline.name);
      return discipline.name + ": media " + (media === null ? "sem notas suficientes" : formatNumber(media) + "/10")
        + ", atividades feitas " + disciplineMetrics.atividadesFeitas
        + " de " + disciplineMetrics.atividadesAplicadas + ".";
    }).join(" ");
    const obsResumo = metrics.observacoes.slice(0, 6).map(function (item) {
      return item.data + ": " + item.texto;
    }).join(" ");

    return [
      "No VSCode, peca ao Codex para analisar todas as informacoes relatadas sobre este aluno e transformar este texto em um relatorio anual final para a turma " + CLASS_NAME + " da escola " + SCHOOL_NAME + ".",
      "",
      "Resumo automatico do sistema:",
      "Frequencia parcial: " + formatNumber(calculateAttendance(student)) + "% de presenca na carga horaria registrada.",
      "Faltas em hora/aula: " + metrics.faltas + ".",
      "Presencas em hora/aula: " + metrics.presencas + ".",
      "Total de atividades feitas: " + calculateWorksTotal(student) + ".",
      "Panorama por disciplina: " + disciplineSummary,
      obsResumo ? "Observacoes sincronizadas: " + obsResumo : "Observacoes sincronizadas: nenhuma citacao nominal encontrada nos relatos diarios.",
      student.destaques ? "Pontos fortes registrados: " + student.destaques : "Pontos fortes registrados: ainda nao preenchidos.",
      student.necessidadesApoio ? "Necessidades de apoio registradas: " + student.necessidadesApoio : "Necessidades de apoio registradas: ainda nao preenchidas.",
      student.encaminhamentos ? "Encaminhamentos pedagogicos: " + student.encaminhamentos : "Encaminhamentos pedagogicos: ainda nao registrados.",
      student.observacoesComplementares ? "Observacoes complementares: " + student.observacoesComplementares : "Observacoes complementares: ainda nao registradas."
    ].join("\n");
  }

  function buildAutoAnnualReport(student) {
    const metrics = getStudentMetrics(student);
    const observacoes = metrics.observacoes.slice(0, 4).map(function (item) {
      return item.data + ": " + item.texto;
    });
    const disciplines = DISCIPLINES.map(function (discipline) {
      const media = calculateDisciplineAverage(student, discipline.name);
      const lowerBimesters = BIMESTERS.filter(function (bim) {
        const total = calculateDisciplineBimTotal(student, discipline.name, bim);
        return total !== null && total < 7;
      });
      return discipline.name + " - media parcial " + (media === null ? "ainda sem notas suficientes" : formatNumber(media) + "/10")
        + (lowerBimesters.length ? " e necessidade de atencao em " + lowerBimesters.join(", ") + "o bimestre." : ".");
    }).join(" ");

    return [
      "1. Panorama geral: o aluno frequenta a turma " + CLASS_NAME + " da escola " + SCHOOL_NAME + " e possui frequencia parcial de " + formatNumber(calculateAttendance(student)) + "%, com " + metrics.faltas + " falta(s) em hora/aula registrada(s).",
      "2. Desenvolvimento academico: " + disciplines,
      "3. Participacao e rotina: o sistema contabiliza " + calculateWorksTotal(student) + " atividade(s) feita(s) a partir dos relatos diarios sincronizados. " + (observacoes.length ? "Registros nominais relevantes: " + observacoes.join(" ") : "Nao houve observacoes nominais sincronizadas ate o momento."),
      "4. Encaminhamentos e recomendacoes: " + (student.encaminhamentos || "manter acompanhamento continuo, monitorar frequencia, valorizar os pontos fortes e registrar novas evidencias pedagogicas ao longo do ano.") + (student.necessidadesApoio ? " Necessidades de apoio registradas: " + student.necessidadesApoio : ""),
      student.destaques ? "5. Pontos fortes identificados: " + student.destaques : "5. Pontos fortes identificados: ainda nao registrados manualmente no perfil."
    ].join("\n\n");
  }

  function persistAndRefresh(studentId, message) {
    saveState(message);
    renderAll();
    if (studentId && currentProfileId === studentId && document.getElementById("profileModal").classList.contains("open")) {
      renderProfile(studentId);
    }
    if (studentId && currentReportId === studentId && document.getElementById("reportModal").classList.contains("open")) {
      renderReport(studentId);
    }
  }

  function adjustStepper(button) {
    const student = getStudent(Number(button.dataset.student));
    if (!student) return;
    const bim = button.dataset.bimester;
    const field = button.dataset.field;
    const disciplineName = button.dataset.discipline || MAIN_DISCIPLINE;
    const dados = getDisciplineBimState(student, disciplineName, bim);
    const current = field === "trabalhos"
      ? getEffectiveWorkGrade(student, disciplineName, bim)
      : toNumber(dados[field]);
    const next = sanitizeFieldValue(field, (current === null ? 0 : current) + Number(button.dataset.step));
    dados[field] = next;
    persistAndRefresh(student.id, "Notas atualizadas.");
  }

  function updateNumericFieldFromInput(input) {
    const student = getStudent(Number(input.dataset.student));
    if (!student) return;
    const bim = input.dataset.bimester;
    const field = input.dataset.field;
    const disciplineName = input.dataset.discipline || MAIN_DISCIPLINE;
    getDisciplineBimState(student, disciplineName, bim)[field] = sanitizeFieldValue(field, input.value);
    persistAndRefresh(student.id, "Notas atualizadas.");
  }

  function clearWorkGradeOverride(studentId, bim, disciplineName) {
    const student = getStudent(studentId);
    if (!student) return;
    getDisciplineBimState(student, disciplineName, bim).trabalhos = "";
    persistAndRefresh(student.id, "Nota de trabalhos voltou ao calculo automatico.");
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
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove("open");
    if (!document.getElementById("profileModal").classList.contains("open") && !document.getElementById("reportModal").classList.contains("open")) {
      document.body.style.overflow = "";
    }
    if (id === "profileModal") currentProfileId = null;
    if (id === "reportModal") currentReportId = null;
  }

  function applyRemotePanelState(payload, meta) {
    if (!payload || !Array.isArray(payload.alunos)) return;
    const localStamp = Date.parse((state && state.__syncUpdatedAt) || "") || 0;
    const remoteStamp = Date.parse((payload && payload.__syncUpdatedAt) || (meta && meta.updatedAt) || "") || 0;
    if (localStamp && remoteStamp && localStamp > remoteStamp) {
      queueRemotePanelSave("keep-local");
      return;
    }
    applyingRemotePanelState = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    state = loadState();
    renderAll();
    applyingRemotePanelState = false;
  }

  function applyRemoteDailyState(payload) {
    if (!payload || !payload.alunosSync) return;
    localStorage.setItem(SYNC_KEY, JSON.stringify(payload.alunosSync));
    renderAll();
  }

  function queueRemotePanelSave(reason) {
    if (applyingRemotePanelState || !remotePanelSync) return;
    remotePanelSync.schedulePush(reason || "panel-change");
  }

  function requestRemoteSyncInit(delayMs) {
    if (remotePanelSync && remoteDailySync) return;
    if (remoteSyncRetryTimer) {
      window.clearTimeout(remoteSyncRetryTimer);
      remoteSyncRetryTimer = null;
    }
    remoteSyncRetryTimer = window.setTimeout(function () {
      remoteSyncRetryTimer = null;
      initRemoteSync();
    }, typeof delayMs === "number" ? delayMs : 250);
  }

  function initRemoteSync() {
    if (remotePanelSync && remoteDailySync) return;
    if (!window.RelatorioSupabaseSync || !window.RelatorioSupabaseSync.isAvailable()) {
      remoteSyncRetryCount += 1;
      if (remoteSyncRetryCount <= 20) {
        requestRemoteSyncInit(Math.min(3000, 150 * remoteSyncRetryCount));
      } else {
        console.warn("[SupabaseSync] Painel da Casavequia nao conseguiu iniciar o modo online.");
      }
      return;
    }
    remoteSyncRetryCount = 0;

    remotePanelSync = window.RelatorioSupabaseSync.createScopeSync({
      scope: PANEL_SCOPE,
      schoolSlug: "padre-carlos-casavequia",
      classSlug: config.classSlug || TURMA_ID,
      source: "casavequia-alunos-shared",
      debounceMs: 500,
      getLocalPayload: function () {
        return state;
      },
      onRemotePayload: function (payload, meta) {
        applyRemotePanelState(payload, meta);
      },
      onStatus: function (status) {
        if (status === "erro") {
          console.warn("[SupabaseSync] Painel da Casavequia permaneceu em modo local.");
        }
      }
    });

    remoteDailySync = window.RelatorioSupabaseSync.createScopeSync({
      scope: DAILY_SCOPE,
      schoolSlug: "padre-carlos-casavequia",
      classSlug: "relatos-gerais",
      source: "casavequia-alunos-shared-readonly",
      readOnly: true,
      onRemotePayload: function (payload) {
        applyRemoteDailyState(payload);
      }
    });

    remotePanelSync.start().then(function (ready) {
      if (!ready) return;
      window.setTimeout(function () {
        queueRemotePanelSave("bootstrap");
      }, 900);
    });
    remoteDailySync.start();
  }
})();
