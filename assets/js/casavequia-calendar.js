(function () {
  'use strict';

  var DATA = window.CASAVEQUIA_CALENDAR_DATA;
  var YEAR = 2026;
  var MONTH_NAMES = [
    'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  var WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  var WEEKDAY_LONG = ['Domingo', 'Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sabado'];
  var CATEGORY_LABELS = {
    feriado: 'Feriado',
    ferias: 'Ferias',
    planejamento: 'Planejamento',
    avaliacao: 'Avaliacao',
    reuniao: 'Reuniao',
    reposicao: 'Reposicao',
    evento: 'Evento',
    atividade: 'Atividade',
    marco: 'Marco',
    agenda: 'Agenda'
  };
  var SCOPE_SHORT = {
    regular: 'Fund./1a/2a',
    third: '3a serie'
  };

  var state = {
    view: 'month',
    filter: 'all',
    cursor: createInitialCursor(),
    selectedDate: null
  };

  var index = DATA ? buildIndex(DATA) : null;

  if (!DATA) {
    return;
  }

  function createInitialCursor() {
    var now = new Date();
    if (now.getFullYear() === YEAR) {
      return stripTime(now);
    }
    return new Date(YEAR, 6, 1);
  }

  function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function pad(number) {
    return number < 10 ? '0' + number : String(number);
  }

  function toIso(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function parseIso(iso) {
    var parts = String(iso || '').split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function normalizeText(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function formatDateLong(date) {
    var weekday = WEEKDAY_LONG[date.getDay()];
    return weekday + ', ' + pad(date.getDate()) + ' de ' + MONTH_NAMES[date.getMonth()] + ' de ' + date.getFullYear();
  }

  function formatDateShort(date) {
    return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear();
  }

  function formatMonthTitle(date) {
    return MONTH_NAMES[date.getMonth()].charAt(0).toUpperCase() + MONTH_NAMES[date.getMonth()].slice(1) + ' de ' + date.getFullYear();
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function rangeLabel(event) {
    if (!event) return '';
    if (event.start === event.end) return formatDateShort(parseIso(event.start));
    return formatDateShort(parseIso(event.start)) + ' a ' + formatDateShort(parseIso(event.end));
  }

  function getScopeData(scope) {
    return DATA && DATA.scopes ? DATA.scopes[scope] : null;
  }

  function buildIndex(data) {
    var allEvents = [];
    var dayMap = {};
    var scopes = data.scopes || {};
    Object.keys(scopes).forEach(function (scopeKey) {
      var scopeData = scopes[scopeKey];
      (scopeData.events || []).forEach(function (event) {
        var normalized = {
          scope: event.scope,
          scopeLabel: event.scopeLabel,
          title: event.title,
          category: event.category || 'agenda',
          start: event.start,
          end: event.end,
          rangeText: event.rangeText,
          allDay: event.allDay !== false,
          sourceType: event.sourceType,
          sourceSheet: event.sourceSheet
        };
        allEvents.push(normalized);
        eachDateInclusive(parseIso(normalized.start), parseIso(normalized.end), function (date) {
          var iso = toIso(date);
          if (!dayMap[iso]) dayMap[iso] = [];
          upsertDayEvent(dayMap[iso], normalized, iso);
        });
      });
    });
    return {
      allEvents: allEvents.sort(compareEvents),
      byDate: dayMap
    };
  }

  function eachDateInclusive(startDate, endDate, callback) {
    var cursor = stripTime(startDate);
    var limit = stripTime(endDate);
    while (cursor <= limit) {
      callback(cursor);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
  }

  function compareEvents(a, b) {
    if (a.start !== b.start) return a.start < b.start ? -1 : 1;
    if (a.end !== b.end) return a.end < b.end ? -1 : 1;
    if (a.scope !== b.scope) return a.scope < b.scope ? -1 : 1;
    return a.title.localeCompare(b.title, 'pt-BR');
  }

  function upsertDayEvent(bucket, event, iso) {
    var normalizedTitle = normalizeText(event.title);
    for (var i = 0; i < bucket.length; i++) {
      var current = bucket[i];
      if (current.scope !== event.scope) continue;
      if (current.start !== event.start || current.end !== event.end) continue;
      var currentTitle = normalizeText(current.title);
      if (currentTitle === normalizedTitle || currentTitle.indexOf(normalizedTitle) >= 0 || normalizedTitle.indexOf(currentTitle) >= 0) {
        if (event.title.length > current.title.length) {
          bucket[i] = cloneEvent(event, iso);
        }
        return;
      }
    }
    bucket.push(cloneEvent(event, iso));
    bucket.sort(compareDayEvents);
  }

  function cloneEvent(event, iso) {
    return {
      scope: event.scope,
      scopeLabel: event.scopeLabel,
      title: event.title,
      category: event.category,
      start: event.start,
      end: event.end,
      rangeText: event.rangeText,
      sourceType: event.sourceType,
      sourceSheet: event.sourceSheet,
      day: iso
    };
  }

  function compareDayEvents(a, b) {
    if (a.scope !== b.scope) return a.scope < b.scope ? -1 : 1;
    if (a.category !== b.category) return a.category < b.category ? -1 : 1;
    return a.title.localeCompare(b.title, 'pt-BR');
  }

  function clampDate(date) {
    if (date.getFullYear() !== YEAR) {
      return new Date(YEAR, 0, 1);
    }
    return stripTime(date);
  }

  function getEventsForIso(iso) {
    var all = index.byDate[iso] || [];
    if (state.filter === 'all') return all.slice();
    return all.filter(function (event) {
      return event.scope === state.filter;
    });
  }

  function getMonthMeta(monthKey) {
    if (state.filter === 'all') {
      return [getScopeMonthMeta('regular', monthKey), getScopeMonthMeta('third', monthKey)].filter(Boolean);
    }
    var single = getScopeMonthMeta(state.filter, monthKey);
    return single ? [single] : [];
  }

  function getScopeMonthMeta(scope, monthKey) {
    var scopeData = getScopeData(scope);
    if (!scopeData || !scopeData.monthlyTotals) return null;
    var value = scopeData.monthlyTotals[monthKey];
    if (!value) return null;
    return {
      scope: scope,
      scopeLabel: scopeData.scopeLabel,
      label: value.label,
      letivos: value.letivos
    };
  }

  function getVisibleMonthDays(date) {
    var first = new Date(date.getFullYear(), date.getMonth(), 1);
    var start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    var end = new Date(start);
    end.setDate(start.getDate() + 41);
    var days = [];
    eachDateInclusive(start, end, function (cursor) {
      days.push(new Date(cursor));
    });
    return days;
  }

  function getWeekDays(date) {
    var anchor = stripTime(date);
    var start = new Date(anchor);
    start.setDate(anchor.getDate() - anchor.getDay());
    var days = [];
    for (var i = 0; i < 7; i++) {
      days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    return days;
  }

  function summariseVisibleEvents(dates) {
    var count = 0;
    dates.forEach(function (date) {
      count += getEventsForIso(toIso(date)).length;
    });
    return count;
  }

  function renderMeta() {
    var titleEl = document.getElementById('pc-cal-title');
    var metaEl = document.getElementById('pc-cal-meta');
    var anchorInput = document.getElementById('pc-cal-anchor');
    if (!titleEl || !metaEl || !anchorInput) return;

    anchorInput.value = toIso(state.cursor);
    setActiveButtons();

    if (state.view === 'month') {
      var monthKey = state.cursor.getFullYear() + '-' + pad(state.cursor.getMonth() + 1);
      titleEl.textContent = formatMonthTitle(state.cursor);
      metaEl.innerHTML = buildMetaHtml(getMonthMeta(monthKey), summariseVisibleEvents(getVisibleMonthDays(state.cursor)));
      return;
    }

    if (state.view === 'week') {
      var days = getWeekDays(state.cursor);
      titleEl.textContent = 'Semana de ' + formatDateShort(days[0]) + ' a ' + formatDateShort(days[6]);
      metaEl.innerHTML = buildMetaHtml([], summariseVisibleEvents(days));
      return;
    }

    if (state.view === 'day') {
      titleEl.textContent = formatDateLong(state.cursor);
      metaEl.innerHTML = buildMetaHtml([], getEventsForIso(toIso(state.cursor)).length);
      return;
    }

    titleEl.textContent = 'Ano letivo 2026 completo';
    metaEl.innerHTML = '<span>Visualizacao consolidada dos 12 meses</span><span>' + index.allEvents.length + ' registros mapeados da planilha</span>';
  }

  function buildMetaHtml(monthMetaList, visibleCount) {
    var parts = [];
    if (monthMetaList && monthMetaList.length) {
      monthMetaList.forEach(function (item) {
        if (item.letivos) {
          parts.push(item.scopeLabel + ': ' + item.letivos + ' dias letivos');
        } else {
          parts.push(item.scopeLabel + ': sem total letivo informado');
        }
      });
    }
    parts.push(visibleCount + ' registro(s) visiveis nesta tela');
    return parts.map(function (part) {
      return '<span>' + escapeHtml(part) + '</span>';
    }).join('');
  }

  function setActiveButtons() {
    document.querySelectorAll('[data-cal-view]').forEach(function (button) {
      button.classList.toggle('on', button.getAttribute('data-cal-view') === state.view);
    });
    document.querySelectorAll('[data-cal-filter]').forEach(function (button) {
      button.classList.toggle('on', button.getAttribute('data-cal-filter') === state.filter);
    });
  }

  function render() {
    var content = document.getElementById('pc-cal-content');
    if (!content || !index) return;
    renderMeta();
    if (state.view === 'month') {
      content.innerHTML = renderMonthView(state.cursor);
      return;
    }
    if (state.view === 'week') {
      content.innerHTML = renderWeekView(state.cursor);
      return;
    }
    if (state.view === 'day') {
      content.innerHTML = renderDayView(state.cursor);
      return;
    }
    content.innerHTML = renderYearView();
  }

  function renderMonthView(date) {
    var monthDays = getVisibleMonthDays(date);
    var html = [];
    html.push('<div class="pc-cal-board">');
    html.push('<div class="pc-cal-weekdays">' + WEEKDAY_SHORT.map(function (label) {
      return '<div class="pc-cal-weekday">' + label + '</div>';
    }).join('') + '</div>');
    html.push('<div class="pc-cal-grid">');
    monthDays.forEach(function (day) {
      html.push(renderDayCell(day, {
        month: date.getMonth(),
        compact: false
      }));
    });
    html.push('</div></div>');
    return html.join('');
  }

  function renderWeekView(date) {
    var days = getWeekDays(date);
    var html = [];
    html.push('<div class="pc-cal-week-board">');
    days.forEach(function (day) {
      var iso = toIso(day);
      var events = getEventsForIso(iso);
      html.push('<button type="button" class="pc-cal-week-card' + (iso === toIso(stripTime(new Date())) ? ' today' : '') + '" onclick="pcCalendarOpenDay(\'' + iso + '\')">');
      html.push('<div class="pc-cal-week-top"><span>' + WEEKDAY_LONG[day.getDay()] + '</span><strong>' + pad(day.getDate()) + '/' + pad(day.getMonth() + 1) + '</strong></div>');
      if (events.length) {
        html.push('<div class="pc-cal-week-events">');
        events.forEach(function (event) {
          html.push('<div class="pc-cal-week-event ' + event.category + '"><span class="pc-cal-week-scope">' + escapeHtml(SCOPE_SHORT[event.scope] || event.scopeLabel) + '</span><span>' + escapeHtml(shortTitle(event.title, 56)) + '</span></div>');
        });
        html.push('</div>');
      } else {
        html.push('<div class="pc-cal-empty-day">Nenhum registro neste dia</div>');
      }
      html.push('</button>');
    });
    html.push('</div>');
    return html.join('');
  }

  function renderDayView(date) {
    var iso = toIso(date);
    var events = getEventsForIso(iso);
    var html = [];
    html.push('<div class="pc-cal-day-view">');
    html.push('<div class="pc-cal-day-summary">');
    html.push('<div class="pc-cal-day-date">' + escapeHtml(formatDateLong(date)) + '</div>');
    html.push('<button type="button" class="pc-cal-open-modal" onclick="pcCalendarOpenDay(\'' + iso + '\')">Abrir detalhes em modal</button>');
    html.push('</div>');
    html.push(renderEventList(events, iso));
    html.push('</div>');
    return html.join('');
  }

  function renderYearView() {
    var html = [];
    html.push('<div class="pc-cal-year-grid">');
    for (var month = 0; month < 12; month++) {
      var date = new Date(YEAR, month, 1);
      var monthKey = YEAR + '-' + pad(month + 1);
      var meta = getMonthMeta(monthKey);
      html.push('<section class="pc-cal-mini-month">');
      html.push('<div class="pc-cal-mini-top"><div><h3>' + escapeHtml(formatMonthTitle(date)) + '</h3><p>' + escapeHtml(formatMiniMeta(meta)) + '</p></div></div>');
      html.push('<div class="pc-cal-mini-weekdays">' + WEEKDAY_SHORT.map(function (label) {
        return '<span>' + label.slice(0, 1) + '</span>';
      }).join('') + '</div>');
      html.push('<div class="pc-cal-mini-grid">');
      getVisibleMonthDays(date).forEach(function (day) {
        html.push(renderDayCell(day, {
          month: month,
          compact: true
        }));
      });
      html.push('</div></section>');
    }
    html.push('</div>');
    return html.join('');
  }

  function formatMiniMeta(metaList) {
    if (!metaList || !metaList.length) return 'Sem total letivo informado';
    return metaList.map(function (item) {
      return item.scopeLabel + ': ' + (item.letivos || '-');
    }).join(' · ');
  }

  function renderDayCell(day, options) {
    var iso = toIso(day);
    var events = getEventsForIso(iso);
    var inMonth = day.getMonth() === options.month;
    var classes = ['pc-cal-day'];
    if (!inMonth) classes.push('other-month');
    if (iso === toIso(stripTime(new Date()))) classes.push('today');
    if (events.length) classes.push('has-events');
    if (options.compact) classes.push('compact');
    var summary = renderDaySummary(events, options.compact);
    return '<button type="button" class="' + classes.join(' ') + '" onclick="pcCalendarOpenDay(\'' + iso + '\')">'
      + '<div class="pc-cal-day-head"><span class="pc-cal-day-number">' + day.getDate() + '</span>'
      + (events.length ? '<span class="pc-cal-day-count">' + events.length + '</span>' : '') + '</div>'
      + summary
      + '</button>';
  }

  function renderDaySummary(events, compact) {
    if (!events.length) {
      return compact ? '<div class="pc-cal-dots"></div>' : '<div class="pc-cal-day-empty">Sem eventos</div>';
    }
    if (compact) {
      return '<div class="pc-cal-dots">' + events.slice(0, 3).map(function (event) {
        return '<span class="pc-cal-dot ' + event.category + '"></span>';
      }).join('') + (events.length > 3 ? '<span class="pc-cal-dot more"></span>' : '') + '</div>';
    }
    var visible = events.slice(0, 2).map(function (event) {
      return '<div class="pc-cal-chip ' + event.category + '"><span class="pc-cal-chip-scope">' + escapeHtml(SCOPE_SHORT[event.scope] || event.scopeLabel) + '</span><span>' + escapeHtml(shortTitle(event.title, 30)) + '</span></div>';
    }).join('');
    if (events.length > 2) {
      visible += '<div class="pc-cal-more">+' + (events.length - 2) + ' registro(s)</div>';
    }
    return '<div class="pc-cal-day-body">' + visible + '</div>';
  }

  function shortTitle(text, maxLength) {
    var clean = String(text || '');
    if (clean.length <= maxLength) return clean;
    return clean.slice(0, maxLength - 1).trim() + '…';
  }

  function renderEventList(events, iso) {
    if (!events.length) {
      return '<div class="pc-cal-list-empty">Nenhum evento registrado para ' + escapeHtml(formatDateShort(parseIso(iso))) + ' no filtro atual.</div>';
    }
    return '<div class="pc-cal-list">' + events.map(function (event) {
      return '<article class="pc-cal-list-item ' + event.category + '">'
        + '<div class="pc-cal-list-top"><span class="pc-cal-list-scope">' + escapeHtml(event.scopeLabel) + '</span><span class="pc-cal-list-cat">' + escapeHtml(CATEGORY_LABELS[event.category] || 'Agenda') + '</span></div>'
        + '<h4>' + escapeHtml(event.title) + '</h4>'
        + '<p>' + escapeHtml(rangeLabel(event)) + '</p>'
        + '<small>' + escapeHtml(event.sourceSheet) + '</small>'
        + '</article>';
    }).join('') + '</div>';
  }

  function openDayModal(iso) {
    var modal = document.getElementById('pc-cal-modal');
    var body = document.getElementById('pc-cal-modal-body');
    if (!modal || !body) return;
    state.selectedDate = iso;
    var date = parseIso(iso);
    var events = getEventsForIso(iso);
    body.innerHTML = '<div class="pc-cal-modal-date">' + escapeHtml(formatDateLong(date)) + '</div>'
      + '<div class="pc-cal-modal-sub">' + events.length + ' registro(s) no filtro atual</div>'
      + renderEventList(events, iso);
    modal.classList.add('on');
  }

  function closeDayModal() {
    var modal = document.getElementById('pc-cal-modal');
    if (modal) modal.classList.remove('on');
  }

  function shiftCursor(step) {
    if (state.view === 'all') {
      return;
    }
    if (state.view === 'month') {
      state.cursor = clampDate(new Date(state.cursor.getFullYear(), state.cursor.getMonth() + step, 1));
    } else if (state.view === 'week') {
      state.cursor = clampDate(new Date(state.cursor.getFullYear(), state.cursor.getMonth(), state.cursor.getDate() + (step * 7)));
    } else {
      state.cursor = clampDate(new Date(state.cursor.getFullYear(), state.cursor.getMonth(), state.cursor.getDate() + step));
    }
    render();
  }

  function setView(view) {
    state.view = view;
    render();
  }

  function setFilter(filter) {
    state.filter = filter;
    render();
  }

  function pickDate(value) {
    if (!value) return;
    state.cursor = clampDate(parseIso(value));
    render();
  }

  function goToday() {
    state.cursor = createInitialCursor();
    render();
  }

  function initKeyboardAndModal() {
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeDayModal();
      }
    });
  }

  function init() {
    if (!document.getElementById('sec-cal')) return;
    render();
    initKeyboardAndModal();
  }

  window.renderCasavequiaCalendar = render;
  window.pcCalendarSetView = setView;
  window.pcCalendarSetFilter = setFilter;
  window.pcCalendarShift = shiftCursor;
  window.pcCalendarPickDate = pickDate;
  window.pcCalendarToday = goToday;
  window.pcCalendarOpenDay = openDayModal;
  window.pcCalendarCloseModal = closeDayModal;

  document.addEventListener('DOMContentLoaded', init);
})();
