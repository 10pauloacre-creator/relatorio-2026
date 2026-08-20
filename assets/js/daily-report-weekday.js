(() => {
  const MONTH_INDEX = {
    jan: 0,
    janeiro: 0,
    fev: 1,
    fevereiro: 1,
    mar: 2,
    março: 2,
    marco: 2,
    abr: 3,
    abril: 3,
    mai: 4,
    maio: 4,
    jun: 5,
    junho: 5,
    jul: 6,
    julho: 6,
    ago: 7,
    agosto: 7,
    set: 8,
    setembro: 8,
    out: 9,
    outubro: 9,
    nov: 10,
    novembro: 10,
    dez: 11,
    dezembro: 11
  };

  function injectWeekdayStyles() {
    if (document.getElementById('daily-report-weekday-style')) return;

    const style = document.createElement('style');
    style.id = 'daily-report-weekday-style';
    style.textContent = `
      .edb.has-weekday{
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:3px;
      }
      .edb .dw{
        font-family:'DM Mono',monospace;
        font-size:.72rem;
        font-weight:500;
        line-height:1;
        letter-spacing:.06em;
        opacity:.82;
        text-transform:capitalize;
        white-space:nowrap;
      }
      @media (max-width:680px){
        .edb .dw{
          font-size:.62rem;
          letter-spacing:.04em;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeMonth(rawMonth) {
    return String(rawMonth || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function getCardDate(edb) {
    const dayNode = edb.querySelector('.d');
    const monthYearNode = edb.querySelector('.my');
    if (!dayNode || !monthYearNode) return null;

    const day = parseInt(dayNode.textContent.trim(), 10);
    if (!Number.isFinite(day)) return null;

    const parts = monthYearNode.textContent.trim().split(/\s+/);
    if (parts.length < 2) return null;

    const monthIndex = MONTH_INDEX[normalizeMonth(parts[0])];
    const year = parseInt(parts[1], 10);
    if (!Number.isFinite(monthIndex) || !Number.isFinite(year)) return null;

    return new Date(year, monthIndex, day, 12, 0, 0, 0);
  }

  function formatWeekday(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

    const weekday = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long'
    }).format(date);

    const simpleWeekday = weekday.replace(/-feira$/i, '').trim();
    return simpleWeekday.charAt(0).toUpperCase() + simpleWeekday.slice(1);
  }

  function applyWeekdayToCard(edb) {
    if (!(edb instanceof HTMLElement)) return;

    const dayNode = edb.querySelector('.d');
    if (!dayNode) return;

    const weekday = formatWeekday(getCardDate(edb));
    if (!weekday) return;

    let weekdayNode = edb.querySelector('.dw');
    if (!weekdayNode) {
      weekdayNode = document.createElement('div');
      weekdayNode.className = 'dw';
      edb.insertBefore(weekdayNode, dayNode);
    }

    weekdayNode.textContent = weekday;
    edb.classList.add('has-weekday');
  }

  function applyWeekdays(root = document) {
    root.querySelectorAll('.ea .edb').forEach(applyWeekdayToCard);
  }

  function startObserver() {
    if (!document.body) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;

          if (node.matches('.ea .edb, .edb')) {
            applyWeekdayToCard(node);
          } else if (node.querySelector) {
            applyWeekdays(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    injectWeekdayStyles();
    applyWeekdays();
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
