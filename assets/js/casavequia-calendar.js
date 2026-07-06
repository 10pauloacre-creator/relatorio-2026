(function () {
  'use strict';

  var DATA = window.CASAVEQUIA_CALENDAR_DATA;
  var YEAR = 2026;
  var STORAGE_KEY = 'pc_calendar_overrides_v1';
  var MONTH_NAMES = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  var WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  var WEEKDAY_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  var CATEGORY_LABELS = {
    feriado: 'Feriado',
    ferias: 'Férias',
    planejamento: 'Planejamento',
    avaliacao: 'Avaliação',
    reuniao: 'Reunião',
    reposicao: 'Reposição',
    evento: 'Evento',
    atividade: 'Atividade',
    marco: 'Marco',
    agenda: 'Agenda'
  };
  var SCOPE_SHORT = {
    regular: 'Fund./1ª/2ª',
    third: '3ª série'
  };
  var TONE_PRIORITY = {
    holiday: 100,
    physical: 95,
    focus: 90,
    review: 85,
    milestone: 80,
    recovery: 75,
    pedagogic: 70,
    break: 65,
    eval: 60,
    note: 50
  };

  if (!DATA) {
    return;
  }

  var state = {
    view: 'month',
    filter: 'all',
    cursor: createInitialCursor(),
    selectedDate: null,
    modalFocusEventId: null,
    editingEventId: null
  };

  var overrides = loadOverrides();
  var index = buildIndex();

  function repairText(text) {
    var value = String(text || '');
    if (!/[ÃÂâ€]/.test(value)) {
      return value;
    }
    try {
      return decodeURIComponent(escape(value));
    } catch (error) {
      return value.replace(/Â/g, '');
    }
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
    return repairText(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDateShort(date) {
    return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear();
  }

  function formatDateLong(date) {
    return WEEKDAY_LONG[date.getDay()] + ', ' + pad(date.getDate()) + ' de ' + MONTH_NAMES[date.getMonth()] + ' de ' + date.getFullYear();
  }

  function formatMonthTitle(date) {
    return MONTH_NAMES[date.getMonth()].charAt(0).toUpperCase() + MONTH_NAMES[date.getMonth()].slice(1) + ' de ' + date.getFullYear();
  }

  function shortTitle(text, maxLength) {
    var clean = repairText(text);
    if (clean.length <= maxLength) {
      return clean;
    }
    return clean.slice(0, maxLength - 1).trim() + '…';
  }

  function rangeLabel(event) {
    if (!event) {
      return '';
    }
    if (event.start === event.end) {
      return formatDateShort(parseIso(event.start));
    }
    return formatDateShort(parseIso(event.start)) + ' a ' + formatDateShort(parseIso(event.end));
  }

  function compactRangeLabel(event) {
    var start = parseIso(event.start);
    var end = parseIso(event.end);
    if (event.start === event.end) {
      return String(start.getDate());
    }
    if (start.getMonth() === end.getMonth()) {
      return start.getDate() + ' a ' + end.getDate();
    }
    return pad(start.getDate()) + '/' + pad(start.getMonth() + 1) + ' a ' + pad(end.getDate()) + '/' + pad(end.getMonth() + 1);
  }

  function displayRangeText(event) {
    var raw = repairText(event.rangeText || '').replace(/\s+/g, ' ').trim();
    if (!raw || /^\d{5}$/.test(raw)) {
      return compactRangeLabel(event);
    }
    return raw;
  }

  function sanitizeHexColor(color) {
    var value = String(color || '').trim();
    if (!value) {
      return '';
    }
    var match = value.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (!match) {
      return '';
    }
    var hex = match[1];
    if (hex.length === 3) {
      hex = hex.split('').map(function (char) { return char + char; }).join('');
    }
    return '#' + hex.toLowerCase();
  }

  function hexToRgb(color) {
    var hex = sanitizeHexColor(color).slice(1);
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }

  function rgbToHex(rgb) {
    return '#' + [rgb.r, rgb.g, rgb.b].map(function (value) {
      var clamped = Math.max(0, Math.min(255, Math.round(value)));
      return clamped.toString(16).padStart(2, '0');
    }).join('');
  }

  function mixWithWhite(color, amount) {
    var rgb = hexToRgb(color);
    return rgbToHex({
      r: rgb.r + ((255 - rgb.r) * amount),
      g: rgb.g + ((255 - rgb.g) * amount),
      b: rgb.b + ((255 - rgb.b) * amount)
    });
  }

  function rgbaFromHex(color, alpha) {
    var rgb = hexToRgb(color);
    return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
  }

  function getReadableTextColor(color) {
    var rgb = hexToRgb(color);
    var brightness = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;
    return brightness >= 160 ? '#14324f' : '#ffffff';
  }

  function getDefaultEventColor(event) {
    if (event && event.category === 'feriado') {
      return '#d62828';
    }
    return '';
  }

  function getEventBaseColor(event) {
    return sanitizeHexColor(event && event.customColor) || getDefaultEventColor(event);
  }

  function getEventPalette(event) {
    var base = getEventBaseColor(event);
    if (!base) {
      return null;
    }
    var baseText = getReadableTextColor(base);
    var surface = mixWithWhite(base, 0.84);
    var surfaceText = getReadableTextColor(surface);
    return {
      base: base,
      baseText: baseText,
      surface: surface,
      surfaceText: surfaceText,
      border: mixWithWhite(base, 0.22),
      muted: rgbaFromHex(surfaceText, 0.78),
      soft: rgbaFromHex(base, 0.14),
      countBg: baseText === '#ffffff' ? 'rgba(255,255,255,.22)' : 'rgba(20,50,79,.14)',
      countText: baseText
    };
  }

  function buildStyleAttribute(styleMap) {
    var parts = [];
    Object.keys(styleMap || {}).forEach(function (key) {
      if (styleMap[key] === undefined || styleMap[key] === null || styleMap[key] === '') {
        return;
      }
      parts.push(key + ':' + styleMap[key]);
    });
    return parts.length ? ' style="' + escapeHtml(parts.join(';')) + '"' : '';
  }

  function buildPaletteStyleAttribute(palette) {
    if (!palette) {
      return '';
    }
    return buildStyleAttribute({
      '--pc-cal-base': palette.base,
      '--pc-cal-base-fg': palette.baseText,
      '--pc-cal-surface': palette.surface,
      '--pc-cal-surface-fg': palette.surfaceText,
      '--pc-cal-border': palette.border,
      '--pc-cal-muted': palette.muted,
      '--pc-cal-soft': palette.soft,
      '--pc-cal-count-bg': palette.countBg,
      '--pc-cal-count-fg': palette.countText
    });
  }

  function clampDate(date) {
    if (date.getFullYear() !== YEAR) {
      return new Date(YEAR, 0, 1);
    }
    return stripTime(date);
  }

  function eachDateInclusive(startDate, endDate, callback) {
    var cursor = stripTime(startDate);
    var limit = stripTime(endDate);
    while (cursor <= limit) {
      callback(cursor);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
  }

  function eventMatchesFilter(event) {
    return state.filter === 'all' || event.scope === state.filter;
  }

  function intersectsRange(event, startDate, endDate) {
    var eventStart = parseIso(event.start);
    var eventEnd = parseIso(event.end);
    return eventStart <= endDate && eventEnd >= startDate;
  }

  function toneClassName(tone) {
    return 'tone-' + (tone || 'note');
  }

  function tonePriority(tone) {
    return TONE_PRIORITY[tone] || 0;
  }

  function resolveTone(event) {
    var text = normalizeText(event.title);
    if (event.category === 'feriado') {
      return 'holiday';
    }
    if (text.indexOf('educacao fisica') >= 0) {
      return 'physical';
    }
    if (text.indexOf('contra-turno') >= 0 || text.indexOf('contraturno') >= 0 || text.indexOf('pre-enem') >= 0 || text.indexOf('planejamento escolar') >= 0) {
      return 'focus';
    }
    if (text.indexOf('revis') >= 0) {
      return 'review';
    }
    if (text.indexOf('recupera') >= 0) {
      return 'recovery';
    }
    if (text.indexOf('termino') >= 0 || text.indexOf('inicio') >= 0 || text.indexOf('sabado letivo') >= 0) {
      return 'milestone';
    }
    if (text.indexOf('jornada pedagogica') >= 0) {
      return 'pedagogic';
    }
    if (text.indexOf('recesso') >= 0 || text.indexOf('ferias') >= 0 || event.category === 'ferias') {
      return 'break';
    }
    if (text.indexOf('avaliac') >= 0 || event.category === 'avaliacao') {
      return 'eval';
    }
    if (event.category === 'reposicao') {
      return 'focus';
    }
    if (event.category === 'planejamento') {
      return 'pedagogic';
    }
    return 'note';
  }

  function getScopeLabel(scope, fallback) {
    var scopeData = DATA && DATA.scopes ? DATA.scopes[scope] : null;
    return repairText((scopeData && scopeData.scopeLabel) || fallback || scope);
  }

  function createEventId(scopeKey, event, eventIndex) {
    return [
      scopeKey,
      event.start,
      event.end,
      normalizeText(event.title).replace(/[^a-z0-9]+/g, '-'),
      String(eventIndex)
    ].join('__');
  }

  function loadOverrides() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function saveOverrides() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch (error) {
      /* noop */
    }
  }

  function buildIndex() {
    var allEvents = [];
    var dayMap = {};
    var scopes = DATA.scopes || {};

    Object.keys(scopes).forEach(function (scopeKey) {
      var scopeData = scopes[scopeKey];
      (scopeData.events || []).forEach(function (rawEvent, eventIndex) {
        var event = normalizeEvent(scopeKey, scopeData, rawEvent, eventIndex);
        if (!event) {
          return;
        }
        allEvents.push(event);
        eachDateInclusive(parseIso(event.start), parseIso(event.end), function (date) {
          var iso = toIso(date);
          if (!dayMap[iso]) {
            dayMap[iso] = [];
          }
          dayMap[iso].push(cloneEvent(event, iso));
        });
      });
    });

    allEvents.sort(compareEvents);
    Object.keys(dayMap).forEach(function (iso) {
      dayMap[iso].sort(compareDayEvents);
    });

    return {
      allEvents: allEvents,
      byDate: dayMap
    };
  }

  function normalizeEvent(scopeKey, scopeData, rawEvent, eventIndex) {
    var id = createEventId(scopeKey, rawEvent, eventIndex);
    var override = overrides[id];

    if (override && override.deleted) {
      return null;
    }

    var scope = override && override.scope ? override.scope : rawEvent.scope;
    var event = {
      id: id,
      scope: scope,
      scopeLabel: getScopeLabel(scope, override && override.scopeLabel ? override.scopeLabel : rawEvent.scopeLabel || scopeData.scopeLabel),
      title: repairText(override && override.title ? override.title : rawEvent.title),
      category: override && override.category ? override.category : (rawEvent.category || 'agenda'),
      start: override && override.start ? override.start : rawEvent.start,
      end: override && override.end ? override.end : rawEvent.end,
      rangeText: repairText(override && override.rangeText ? override.rangeText : rawEvent.rangeText),
      customColor: sanitizeHexColor(override && override.color ? override.color : ''),
      sourceType: rawEvent.sourceType,
      sourceSheet: repairText(rawEvent.sourceSheet)
    };

    event.tone = resolveTone(event);
    return event;
  }

  function cloneEvent(event, iso) {
    return {
      id: event.id,
      scope: event.scope,
      scopeLabel: event.scopeLabel,
      title: event.title,
      category: event.category,
      start: event.start,
      end: event.end,
      rangeText: event.rangeText,
      customColor: event.customColor,
      sourceType: event.sourceType,
      sourceSheet: event.sourceSheet,
      tone: event.tone,
      day: iso
    };
  }

  function compareEvents(a, b) {
    if (a.start !== b.start) {
      return a.start < b.start ? -1 : 1;
    }
    if (a.end !== b.end) {
      return a.end < b.end ? -1 : 1;
    }
    if (tonePriority(a.tone) !== tonePriority(b.tone)) {
      return tonePriority(b.tone) - tonePriority(a.tone);
    }
    return a.title.localeCompare(b.title, 'pt-BR');
  }

  function compareDayEvents(a, b) {
    if (tonePriority(a.tone) !== tonePriority(b.tone)) {
      return tonePriority(b.tone) - tonePriority(a.tone);
    }
    if (a.scope !== b.scope) {
      return a.scope < b.scope ? -1 : 1;
    }
    return a.title.localeCompare(b.title, 'pt-BR');
  }

  function rebuildIndex() {
    index = buildIndex();
  }

  function getEventsForIso(iso) {
    var all = index.byDate[iso] || [];
    if (state.filter === 'all') {
      return all.slice();
    }
    return all.filter(function (event) {
      return event.scope === state.filter;
    });
  }

  function getEventById(id) {
    for (var i = 0; i < index.allEvents.length; i++) {
      if (index.allEvents[i].id === id) {
        return index.allEvents[i];
      }
    }
    return null;
  }

  function getVisibleEventsBetween(startDate, endDate) {
    return index.allEvents.filter(function (event) {
      return eventMatchesFilter(event) && intersectsRange(event, startDate, endDate);
    });
  }

  function getVisibleMonthDays(date) {
    var first = new Date(date.getFullYear(), date.getMonth(), 1);
    var days = [];
    var last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    eachDateInclusive(first, last, function (cursor) {
      days.push(new Date(cursor));
    });
    return days;
  }

  function getMonthGridCells(date) {
    var monthDays = getVisibleMonthDays(date);
    var firstDay = monthDays.length ? monthDays[0].getDay() : 0;
    var trailing = monthDays.length ? (6 - monthDays[monthDays.length - 1].getDay()) : 0;
    var cells = [];
    var i;
    for (i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    monthDays.forEach(function (day) {
      cells.push(day);
    });
    for (i = 0; i < trailing; i++) {
      cells.push(null);
    }
    return cells;
  }

  function getWeekDays(date) {
    var start = stripTime(date);
    start.setDate(start.getDate() - start.getDay());
    var days = [];
    for (var i = 0; i < 7; i++) {
      days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    return days;
  }

  function getMonthMeta(monthKey) {
    if (state.filter === 'all') {
      return [getScopeMonthMeta('regular', monthKey), getScopeMonthMeta('third', monthKey)].filter(Boolean);
    }
    var single = getScopeMonthMeta(state.filter, monthKey);
    return single ? [single] : [];
  }

  function getScopeMonthMeta(scope, monthKey) {
    var scopeData = DATA && DATA.scopes ? DATA.scopes[scope] : null;
    if (!scopeData || !scopeData.monthlyTotals) {
      return null;
    }
    var value = scopeData.monthlyTotals[monthKey];
    if (!value) {
      return null;
    }
    return {
      scope: scope,
      scopeLabel: repairText(scopeData.scopeLabel),
      label: repairText(value.label),
      letivos: String(value.letivos || '')
    };
  }

  function getMonthRange(date) {
    return {
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0)
    };
  }

  function pickDayTone(events) {
    if (!events.length) {
      return null;
    }
    return events.slice().sort(compareDayEvents)[0].tone;
  }

  function buildMetaHtml(monthMetaList, visibleCount) {
    var parts = [];
    if (monthMetaList && monthMetaList.length) {
      monthMetaList.forEach(function (item) {
        parts.push(item.scopeLabel + ': ' + (item.letivos || '-') + ' dias letivos');
      });
    }
    parts.push(visibleCount + ' registro(s) visíveis no período');
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

  function renderMeta() {
    var titleEl = document.getElementById('pc-cal-title');
    var metaEl = document.getElementById('pc-cal-meta');
    var anchorInput = document.getElementById('pc-cal-anchor');
    if (!titleEl || !metaEl || !anchorInput) {
      return;
    }

    anchorInput.value = toIso(state.cursor);
    setActiveButtons();

    if (state.view === 'month') {
      var monthKey = state.cursor.getFullYear() + '-' + pad(state.cursor.getMonth() + 1);
      var monthRange = getMonthRange(state.cursor);
      titleEl.textContent = formatMonthTitle(state.cursor);
      metaEl.innerHTML = buildMetaHtml(getMonthMeta(monthKey), getVisibleEventsBetween(monthRange.start, monthRange.end).length);
      return;
    }

    if (state.view === 'week') {
      var weekDays = getWeekDays(state.cursor);
      titleEl.textContent = 'Semana de ' + formatDateShort(weekDays[0]) + ' a ' + formatDateShort(weekDays[6]);
      metaEl.innerHTML = buildMetaHtml([], getVisibleEventsBetween(weekDays[0], weekDays[6]).length);
      return;
    }

    if (state.view === 'day') {
      titleEl.textContent = formatDateLong(state.cursor);
      metaEl.innerHTML = buildMetaHtml([], getEventsForIso(toIso(state.cursor)).length);
      return;
    }

    titleEl.textContent = 'Ano letivo 2026 completo';
    metaEl.innerHTML = '<span>Visualização consolidada dos 12 meses</span><span>' + index.allEvents.length + ' registro(s) mapeados da planilha</span>';
  }

  function render() {
    var content = document.getElementById('pc-cal-content');
    if (!content) {
      return;
    }
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
    var monthCells = getMonthGridCells(date);
    var monthRange = getMonthRange(date);
    var events = getVisibleEventsBetween(monthRange.start, monthRange.end);
    var html = [];
    html.push('<div class="pc-cal-board">');
    html.push('<div class="pc-cal-weekdays">' + WEEKDAY_SHORT.map(function (label) {
      return '<div class="pc-cal-weekday">' + label + '</div>';
    }).join('') + '</div>');
    html.push('<div class="pc-cal-grid">');
    monthCells.forEach(function (day) {
      html.push(day ? renderDayCell(day, {
        month: date.getMonth(),
        compact: false
      }) : renderEmptyDayCell(false));
    });
    html.push('</div></div>');
    html.push(renderAgendaSection('Acontecimentos do mês', events, 'Nenhum evento encontrado para este mês no filtro atual.'));
    return html.join('');
  }

  function renderWeekView(date) {
    var days = getWeekDays(date);
    var html = [];
    html.push('<div class="pc-cal-board pc-cal-board-week">');
    html.push('<div class="pc-cal-weekdays">' + WEEKDAY_SHORT.map(function (label) {
      return '<div class="pc-cal-weekday">' + label + '</div>';
    }).join('') + '</div>');
    html.push('<div class="pc-cal-grid pc-cal-grid-week">');
    days.forEach(function (day) {
      html.push(renderDayCell(day, {
        month: day.getMonth(),
        compact: false,
        weekMode: true
      }));
    });
    html.push('</div></div>');
    html.push(renderWeekAgenda(days));
    return html.join('');
  }

  function renderDayView(date) {
    var iso = toIso(date);
    var events = getEventsForIso(iso);
    return '<div class="pc-cal-day-view">'
      + '<div class="pc-cal-day-summary">'
      + '<div><div class="pc-cal-day-date">' + escapeHtml(formatDateLong(date)) + '</div><p>Lista completa dos registros deste dia.</p></div>'
      + '<button type="button" class="pc-cal-open-modal" onclick="pcCalendarOpenDay(\'' + iso + '\')">Abrir modal</button>'
      + '</div>'
      + renderAgendaSection('Ocorrências do dia', events, 'Nenhum evento registrado para esta data no filtro atual.', false)
      + '</div>';
  }

  function renderYearView() {
    var html = [];
    html.push('<div class="pc-cal-year-grid">');
    for (var month = 0; month < 12; month++) {
      var date = new Date(YEAR, month, 1);
      var monthKey = YEAR + '-' + pad(month + 1);
      html.push('<section class="pc-cal-mini-month">');
      html.push('<div class="pc-cal-mini-top"><div><h3>' + escapeHtml(formatMonthTitle(date)) + '</h3><p>' + escapeHtml(formatMiniMeta(getMonthMeta(monthKey))) + '</p></div></div>');
      html.push('<div class="pc-cal-mini-weekdays">' + WEEKDAY_SHORT.map(function (label) {
        return '<span>' + label.slice(0, 1) + '</span>';
      }).join('') + '</div>');
      html.push('<div class="pc-cal-mini-grid">');
      getMonthGridCells(date).forEach(function (day) {
        html.push(day ? renderDayCell(day, {
          month: month,
          compact: true
        }) : renderEmptyDayCell(true));
      });
      html.push('</div></section>');
    }
    html.push('</div>');
    return html.join('');
  }

  function formatMiniMeta(metaList) {
    if (!metaList || !metaList.length) {
      return 'Sem total letivo informado';
    }
    return metaList.map(function (item) {
      return item.scopeLabel + ': ' + (item.letivos || '-');
    }).join(' · ');
  }

  function renderDayCell(day, options) {
    var iso = toIso(day);
    var events = getEventsForIso(iso);
    var inMonth = day.getMonth() === options.month;
    var tone = pickDayTone(events);
    var leadEvent = events.length ? events[0] : null;
    var palette = leadEvent ? getEventPalette(leadEvent) : null;
    var classes = ['pc-cal-day', options.compact ? 'compact' : 'full'];
    if (!inMonth) {
      classes.push('other-month');
    }
    if (iso === toIso(stripTime(new Date()))) {
      classes.push('today');
    }
    if (events.length) {
      classes.push('has-events', toneClassName(tone));
      if (palette) {
        classes.push('custom-color');
      }
    }
    var label = events.length ? events.length + ' registro(s)' : (options.compact ? '' : 'Sem eventos');
    var footer = options.compact
      ? ''
      : '<div class="pc-cal-day-footer">' + escapeHtml(label) + '</div>';

    return '<button type="button" class="' + classes.join(' ') + '"' + buildPaletteStyleAttribute(palette) + ' onclick="pcCalendarOpenDay(\'' + iso + '\')">'
      + '<div class="pc-cal-day-head">'
      + '<span class="pc-cal-day-number">' + day.getDate() + '</span>'
      + (events.length ? '<span class="pc-cal-day-count">' + events.length + '</span>' : '')
      + '</div>'
      + (events.length && !options.compact ? '<div class="pc-cal-day-label">' + escapeHtml(shortTitle(events[0].title, 34)) + '</div>' : '<div class="pc-cal-day-label pc-cal-day-label-empty">' + (options.compact ? '' : '&nbsp;') + '</div>')
      + footer
      + '</button>';
  }

  function renderEmptyDayCell(compact) {
    return '<div class="pc-cal-day pc-cal-day-placeholder' + (compact ? ' compact' : '') + '" aria-hidden="true"></div>';
  }

  function renderAgendaSection(title, events, emptyLabel, modalMode) {
    if (!events.length) {
      return '<div class="pc-cal-agenda"><div class="pc-cal-agenda-head"><h3>' + escapeHtml(title) + '</h3></div><div class="pc-cal-list-empty">' + escapeHtml(emptyLabel) + '</div></div>';
    }
    return '<div class="pc-cal-agenda">'
      + '<div class="pc-cal-agenda-head"><h3>' + escapeHtml(title) + '</h3><span>' + events.length + ' item(ns)</span></div>'
      + '<div class="pc-cal-agenda-list">'
      + events.map(function (event) {
        return renderAgendaItem(event, modalMode);
      }).join('')
      + '</div></div>';
  }

  function renderAgendaItem(event, modalMode) {
    var buttonTarget = modalMode ? "pcCalendarStartEdit('" + event.id + "')" : "pcCalendarOpenEvent('" + event.id + "')";
    var palette = getEventPalette(event);
    return '<button type="button" class="pc-cal-agenda-item ' + toneClassName(event.tone) + (palette ? ' custom-color' : '') + '"' + buildPaletteStyleAttribute(palette) + ' onclick="' + buttonTarget + '">'
      + '<span class="pc-cal-agenda-range">' + escapeHtml(displayRangeText(event)) + '</span>'
      + '<span class="pc-cal-agenda-body">'
      + '<span class="pc-cal-agenda-meta"><strong>' + escapeHtml(event.scopeLabel) + '</strong><em>' + escapeHtml(CATEGORY_LABELS[event.category] || 'Agenda') + '</em></span>'
      + '<span class="pc-cal-agenda-title">' + escapeHtml(event.title) + '</span>'
      + '<span class="pc-cal-agenda-source">' + escapeHtml(rangeLabel(event)) + '</span>'
      + '</span>'
      + '</button>';
  }

  function renderWeekAgenda(days) {
    var sections = days.map(function (day) {
      var iso = toIso(day);
      var events = getEventsForIso(iso);
      return '<section class="pc-cal-week-section">'
        + '<div class="pc-cal-week-section-top"><strong>' + escapeHtml(WEEKDAY_LONG[day.getDay()]) + '</strong><span>' + escapeHtml(formatDateShort(day)) + '</span></div>'
        + (events.length ? '<div class="pc-cal-agenda-list">' + events.map(function (event) {
          return renderAgendaItem(event, false);
        }).join('') + '</div>' : '<div class="pc-cal-list-empty">Nenhum evento neste dia.</div>')
        + '</section>';
    }).join('');
    return '<div class="pc-cal-week-sections">' + sections + '</div>';
  }

  function renderModalEventCard(event, focused) {
    if (state.editingEventId === event.id) {
      return renderModalEditor(event);
    }
    var palette = getEventPalette(event);
    return '<article class="pc-cal-modal-card ' + toneClassName(event.tone) + (focused ? ' is-focused' : '') + (palette ? ' custom-color' : '') + '"' + buildPaletteStyleAttribute(palette) + '>'
      + '<div class="pc-cal-modal-card-top"><div><span class="pc-cal-modal-pill">' + escapeHtml(event.scopeLabel) + '</span><span class="pc-cal-modal-pill soft">' + escapeHtml(CATEGORY_LABELS[event.category] || 'Agenda') + '</span></div><strong>' + escapeHtml(displayRangeText(event)) + '</strong></div>'
      + '<h4>' + escapeHtml(event.title) + '</h4>'
      + '<p>' + escapeHtml(rangeLabel(event)) + '</p>'
      + '<small>' + escapeHtml(event.sourceSheet) + '</small>'
      + '<div class="pc-cal-modal-actions-row">'
      + '<button type="button" class="pc-cal-action-btn" onclick="pcCalendarStartEdit(\'' + event.id + '\')">Editar</button>'
      + '<button type="button" class="pc-cal-action-btn danger" onclick="pcCalendarDeleteEvent(\'' + event.id + '\')">Excluir</button>'
      + '</div>'
      + '</article>';
  }

  function renderModalEditor(event) {
    var initialColor = sanitizeHexColor(event.customColor) || sanitizeHexColor(getDefaultEventColor(event)) || '#4a9467';
    return '<form class="pc-cal-edit-form" onsubmit="pcCalendarSaveEdit(event,\'' + event.id + '\')">'
      + '<div class="pc-cal-edit-grid">'
      + '<label><span>Título</span><input type="text" name="title" value="' + escapeHtml(event.title) + '" required></label>'
      + '<label><span>Categoria</span><select name="category">' + renderCategoryOptions(event.category) + '</select></label>'
      + '<label><span>Escopo</span><select name="scope">' + renderScopeOptions(event.scope) + '</select></label>'
      + '<label><span>Data inicial</span><input type="date" name="start" min="' + YEAR + '-01-01" max="' + YEAR + '-12-31" value="' + escapeHtml(event.start) + '" required></label>'
      + '<label><span>Data final</span><input type="date" name="end" min="' + YEAR + '-01-01" max="' + YEAR + '-12-31" value="' + escapeHtml(event.end) + '" required></label>'
      + '<label class="pc-cal-edit-color"><span>Cor do evento</span><div class="pc-cal-edit-color-row"><input type="color" name="color" value="' + escapeHtml(initialColor) + '"><span class="pc-cal-edit-check"><input type="checkbox" name="useColor"' + (event.customColor ? ' checked' : '') + '> Usar cor personalizada</span></div></label>'
      + '</div>'
      + '<div class="pc-cal-edit-actions">'
      + '<button type="submit" class="pc-cal-action-btn primary">Salvar</button>'
      + '<button type="button" class="pc-cal-action-btn" onclick="pcCalendarCancelEdit()">Cancelar</button>'
      + '</div>'
      + '</form>';
  }

  function renderCategoryOptions(selected) {
    return Object.keys(CATEGORY_LABELS).map(function (key) {
      return '<option value="' + escapeHtml(key) + '"' + (key === selected ? ' selected' : '') + '>' + escapeHtml(CATEGORY_LABELS[key]) + '</option>';
    }).join('');
  }

  function renderScopeOptions(selected) {
    return ['regular', 'third'].map(function (key) {
      return '<option value="' + escapeHtml(key) + '"' + (key === selected ? ' selected' : '') + '>' + escapeHtml(getScopeLabel(key, key)) + '</option>';
    }).join('');
  }

  function renderModalBody(iso, focusId) {
    var date = parseIso(iso);
    var events = getEventsForIso(iso);
    return '<div class="pc-cal-modal-date">' + escapeHtml(formatDateLong(date)) + '</div>'
      + '<div class="pc-cal-modal-sub">' + events.length + ' registro(s) no filtro atual</div>'
      + (events.length ? '<div class="pc-cal-modal-cards">' + events.map(function (event) {
        return renderModalEventCard(event, focusId === event.id);
      }).join('') + '</div>' : '<div class="pc-cal-list-empty">Nenhum evento registrado nesta data.</div>');
  }

  function openDayModal(iso, focusId) {
    var modal = document.getElementById('pc-cal-modal');
    var body = document.getElementById('pc-cal-modal-body');
    if (!modal || !body) {
      return;
    }
    state.selectedDate = iso;
    state.modalFocusEventId = focusId || null;
    body.innerHTML = renderModalBody(iso, state.modalFocusEventId);
    modal.classList.add('on');
  }

  function openEvent(id) {
    var event = getEventById(id);
    if (!event) {
      return;
    }
    state.cursor = clampDate(parseIso(event.start));
    render();
    openDayModal(event.start, id);
  }

  function closeDayModal() {
    var modal = document.getElementById('pc-cal-modal');
    if (modal) {
      modal.classList.remove('on');
    }
    state.modalFocusEventId = null;
    state.editingEventId = null;
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
    if (state.selectedDate) {
      openDayModal(state.selectedDate, state.modalFocusEventId);
    }
  }

  function pickDate(value) {
    if (!value) {
      return;
    }
    state.cursor = clampDate(parseIso(value));
    render();
  }

  function goToday() {
    state.cursor = createInitialCursor();
    render();
  }

  function startEdit(id) {
    state.editingEventId = id;
    if (state.selectedDate) {
      openDayModal(state.selectedDate, id);
    }
  }

  function cancelEdit() {
    state.editingEventId = null;
    if (state.selectedDate) {
      openDayModal(state.selectedDate, state.modalFocusEventId);
    }
  }

  function saveEdit(domEvent, id) {
    domEvent.preventDefault();
    var form = domEvent.target;
    var title = form.elements.title.value.trim();
    var category = form.elements.category.value;
    var scope = form.elements.scope.value;
    var start = form.elements.start.value;
    var end = form.elements.end.value;
    var customColor = form.elements.useColor.checked ? sanitizeHexColor(form.elements.color.value) : '';

    if (!title || !start || !end) {
      return;
    }

    if (end < start) {
      var swap = start;
      start = end;
      end = swap;
    }

    overrides[id] = {
      title: title,
      category: category,
      scope: scope,
      scopeLabel: getScopeLabel(scope, scope),
      start: start,
      end: end,
      rangeText: start === end ? String(parseIso(start).getDate()) : (parseIso(start).getDate() + ' a ' + parseIso(end).getDate()),
      color: customColor
    };
    saveOverrides();
    rebuildIndex();
    state.editingEventId = null;
    state.cursor = clampDate(parseIso(start));
    render();
    openDayModal(start, id);
  }

  function deleteEvent(id) {
    var event = getEventById(id);
    if (!event) {
      return;
    }
    if (!window.confirm('Excluir "' + event.title + '" do calendário?')) {
      return;
    }
    overrides[id] = Object.assign({}, overrides[id] || {}, { deleted: true });
    saveOverrides();
    rebuildIndex();
    state.editingEventId = null;
    render();
    openDayModal(state.selectedDate || event.start, null);
  }

  function initKeyboardAndModal() {
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeDayModal();
      }
    });
  }

  function init() {
    if (!document.getElementById('sec-cal')) {
      return;
    }
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
  window.pcCalendarOpenEvent = openEvent;
  window.pcCalendarCloseModal = closeDayModal;
  window.pcCalendarStartEdit = startEdit;
  window.pcCalendarCancelEdit = cancelEdit;
  window.pcCalendarSaveEdit = saveEdit;
  window.pcCalendarDeleteEvent = deleteEvent;

  document.addEventListener('DOMContentLoaded', init);
})();
