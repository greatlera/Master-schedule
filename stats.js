/**
 * stats.js — Модуль аналитики и Donut-диаграмм для Master Schedule
 */
(function() {
  let statsCurrentDate = new Date();

  // Инициализация раздела в DOM
  function initStatsModule() {
    // 1. Активируем кнопку в Drawer
    const drawerNav = document.querySelector('.drawer-nav');
    if (drawerNav && !document.getElementById('statsDrawerBtn')) {
      const btn = document.createElement('button');
      btn.className = 'drawer-item';
      btn.id = 'statsDrawerBtn';
      btn.dataset.tab = 'stats';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a10 10 0 0 1 10 10h-10z"></path>
        </svg>
        <span>Статистика</span>
      `;
      // Вставляем после основных пунктов планирования
      const label = drawerNav.querySelector('.drawer-section-label:nth-of-type(2)');
      if (label) {
        drawerNav.insertBefore(btn, label);
      } else {
        drawerNav.appendChild(btn);
      }

      btn.addEventListener('click', () => {
        if (typeof window.setActiveTab === 'function') {
          window.setActiveTab('stats');
        }
        if (typeof window.closeDrawer === 'function') {
          window.closeDrawer();
        }
      });
    }

    // 2. Добавляем стили для диаграмм и карточек статистики
    if (!document.getElementById('stats-injected-styles')) {
      const style = document.createElement('style');
      style.id = 'stats-injected-styles';
      style.textContent = `
        .stats-month-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .stats-kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .stats-kpi-box {
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: var(--radius-elem);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stats-kpi-val {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text);
        }
        .stats-kpi-sub {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .donut-section {
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: var(--radius-elem);
          padding: 14px;
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .donut-header {
          font-size: 0.88rem;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .donut-body {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .donut-chart-svg {
          width: 105px;
          height: 105px;
          transform: rotate(-90deg);
          border-radius: 50%;
          flex-shrink: 0;
        }
        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          font-size: 0.75rem;
        }
        .legend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .legend-dot-label {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .legend-circle {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Генерация цветных секторов кольцевой SVG диаграммы Donut
  function renderSvgDonut(categoryData, totalCount) {
    if (totalCount === 0 || Object.keys(categoryData).length === 0) {
      return `
        <svg class="donut-chart-svg" viewBox="0 0 42 42">
          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#282937" stroke-width="5.5"></circle>
        </svg>
      `;
    }

    let accumulatedPercent = 0;
    const slices = Object.values(categoryData).map(item => {
      const percent = (item.count / totalCount) * 100;
      const strokeDash = `${percent} ${100 - percent}`;
      const strokeOffset = 100 - accumulatedPercent;
      accumulatedPercent += percent;

      return `
        <circle cx="21" cy="21" r="15.915" fill="transparent"
          stroke="${item.color}" 
          stroke-width="5.5" 
          stroke-dasharray="${strokeDash}" 
          stroke-dashoffset="${strokeOffset}">
        </circle>
      `;
    }).join('');

    return `
      <svg class="donut-chart-svg" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.05)" stroke-width="5.5"></circle>
        ${slices}
      </svg>
    `;
  }

  // Основная функция отрисовки вкладки аналитики
  window.renderStatsView = function() {
    const container = document.getElementById('itemsList');
    const headerTitle = document.getElementById('summaryHeaderTitle');
    const counterLabel = document.getElementById('itemsCountLabel');
    const tabControls = document.getElementById('tabControlsGroup');

    if (!container) return;
    if (tabControls) tabControls.style.display = 'none';

    const y = statsCurrentDate.getFullYear();
    const m = statsCurrentDate.getMonth();
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const monthTitle = `${window.monthNames ? window.monthNames[m] : (m + 1)} ${y}`;

    headerTitle.textContent = 'Аналитика и статистика';
    counterLabel.textContent = monthTitle;

    const allEntries = window.entries || [];
    const taskTags = window.TASK_TAGS || {};

    // 1. Поставленные задачи за месяц (дедлайн попадает в этот месяц)
    const monthTasks = allEntries.filter(e => e.type === 'task' && e.date && e.date.startsWith(monthKey));
    const totalSet = monthTasks.length;

    // 2. Выполнено за месяц
    const completedTasks = monthTasks.filter(e => e.completed);
    const totalCompleted = completedTasks.length;
    const completionRate = totalSet > 0 ? Math.round((totalCompleted / totalSet) * 100) : 0;

    // 3. Отложено на следующий месяц
    // (задача исходно перенесена на более поздний месяц, либо имеет метку переноса)
    const nextMonthPrefix = `${m === 11 ? y + 1 : y}-${String(m === 11 ? 1 : m + 2).padStart(2, '0')}`;
    const postponedTasks = allEntries.filter(e => {
      if (e.type !== 'task') return false;
      if (e.postponedFromMonth === monthKey) return true;
      if (e.createdMonth === monthKey && e.date >= nextMonthPrefix) return true;
      return false;
    });
    const totalPostponed = postponedTasks.length;

    // 4. Не сделано / Просрочено
    const todayStr = (typeof window.formatDateKey === 'function') ? window.formatDateKey(new Date()) : '';
    const pendingFailedTasks = monthTasks.filter(e => !e.completed && e.date < todayStr);
    const totalFailed = pendingFailedTasks.length;

    // Функция подсчета распределения по тегам
    function getBreakdown(tasksArray) {
      const map = {};
      tasksArray.forEach(t => {
        const catKey = t.category || 'other';
        const meta = taskTags[catKey] || { label: 'Прочее', color: '#64748b' };
        if (!map[catKey]) {
          map[catKey] = { label: meta.label, color: meta.color, count: 0 };
        }
        map[catKey].count++;
      });
      return map;
    }

    const completedBreakdown = getBreakdown(completedTasks);
    const postponedBreakdown = getBreakdown(postponedTasks);
    const failedBreakdown = getBreakdown(pendingFailedTasks);

    function buildLegend(breakdown, countTotal) {
      if (countTotal === 0 || Object.keys(breakdown).length === 0) {
        return `<span style="color:var(--text-muted); font-size:0.75rem;">Нет данных за период</span>`;
      }
      return Object.values(breakdown).map(b => `
        <div class="legend-row">
          <div class="legend-dot-label">
            <span class="legend-circle" style="background:${b.color};"></span>
            <span>${b.label}</span>
          </div>
          <span style="font-weight:700;">${b.count} (${Math.round((b.count / countTotal) * 100)}%)</span>
        </div>
      `).join('');
    }

    container.innerHTML = `
      <div class="stats-month-nav">
        <button class="arrow-btn" id="statsPrevMonthBtn">&lsaquo;</button>
        <span style="font-size:0.95rem; font-weight:700;">${monthTitle}</span>
        <button class="arrow-btn" id="statsNextMonthBtn">&rsaquo;</button>
      </div>

      <!-- Сводные KPI карточки -->
      <div class="stats-kpi-grid">
        <div class="stats-kpi-box">
          <span class="stats-kpi-val" style="color:var(--accent-blue);">${totalSet}</span>
          <span class="stats-kpi-sub">Поставлено дел</span>
        </div>
        <div class="stats-kpi-box">
          <span class="stats-kpi-val" style="color:#10b981;">${totalCompleted} <small style="font-size:0.75rem;">(${completionRate}%)</small></span>
          <span class="stats-kpi-sub">Сделано</span>
        </div>
        <div class="stats-kpi-box">
          <span class="stats-kpi-val" style="color:#f59e0b;">${totalPostponed}</span>
          <span class="stats-kpi-sub">Отложено на след. месяц</span>
        </div>
        <div class="stats-kpi-box">
          <span class="stats-kpi-val" style="color:var(--danger);">${totalFailed}</span>
          <span class="stats-kpi-sub">Не сделано / Долги</span>
        </div>
      </div>

      <!-- Donut: Сделанные дела -->
      <div class="donut-section">
        <div class="donut-header">
          <span>Сделанные по категориям</span>
          <span style="color:#10b981;">${totalCompleted} задач</span>
        </div>
        <div class="donut-body">
          ${renderSvgDonut(completedBreakdown, totalCompleted)}
          <div class="donut-legend">${buildLegend(completedBreakdown, totalCompleted)}</div>
        </div>
      </div>

      <!-- Donut: Отложенные дела -->
      <div class="donut-section">
        <div class="donut-header">
          <span>Отложенные по категориям</span>
          <span style="color:#f59e0b;">${totalPostponed} задач</span>
        </div>
        <div class="donut-body">
          ${renderSvgDonut(postponedBreakdown, totalPostponed)}
          <div class="donut-legend">${buildLegend(postponedBreakdown, totalPostponed)}</div>
        </div>
      </div>

      <!-- Donut: Не сделанные дела -->
      <div class="donut-section">
        <div class="donut-header">
          <span>Не сделанные по категориям</span>
          <span style="color:var(--danger);">${totalFailed} задач</span>
        </div>
        <div class="donut-body">
          ${renderSvgDonut(failedBreakdown, totalFailed)}
          <div class="donut-legend">${buildLegend(failedBreakdown, totalFailed)}</div>
        </div>
      </div>
    `;

    // Навешиваем слушатели на переключение месяца
    document.getElementById('statsPrevMonthBtn').onclick = () => {
      statsCurrentDate.setMonth(statsCurrentDate.getMonth() - 1);
      window.renderStatsView();
    };
    document.getElementById('statsNextMonthBtn').onclick = () => {
      statsCurrentDate.setMonth(statsCurrentDate.getMonth() + 1);
      window.renderStatsView();
    };
  };

  // Регистрация после загрузки документа
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStatsModule);
  } else {
    initStatsModule();
  }
})();