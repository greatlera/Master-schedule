/**
 * stats.js — Bento-аналитика, крупный Donut-график и интерактивные списки задач
 */
(function() {
  let statsCurrentDate = new Date();
  let activeStatusTab = 'all'; // По умолчанию открывается 'all' (Поставлено дел)
  let selectedCategoryFilter = null;

  const STATUS_META = {
    all: {
      title: 'Поставленные дела',
      centerSub: 'поставлено',
      badgeText: 'ПОСТАВЛЕНО ДЕЛ',
      accentColor: '#5b9ffc',
      darkText: false
    },
    completed: {
      title: 'Сделанные дела',
      centerSub: 'сделано',
      badgeText: 'ВЫПОЛНЕНО',
      accentColor: '#cbf532',
      darkText: true
    },
    failed: {
      title: 'Просроченные дела (Долги)',
      centerSub: 'просрочено',
      badgeText: 'ПРОСРОЧЕНО',
      accentColor: '#EF3838',
      darkText: false
    },
    postponed: {
      title: 'Перенесенные дела',
      centerSub: 'перенесено',
      badgeText: 'ПЕРЕНЕСЕНО',
      accentColor: '#FF652F',
      darkText: false
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
  }

  function initStatsModule() {
    // 1. Добавляем кнопку в боковое меню
    const drawerNav = document.querySelector('.drawer-nav');
    if (drawerNav && !document.getElementById('statsDrawerBtn')) {
      const btn = document.createElement('button');
      btn.className = 'drawer-item';
      btn.id = 'statsDrawerBtn';
      btn.dataset.tab = 'stats';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
          <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
        </svg>
        <span>Статистика</span>
      `;
      const trashBtn = drawerNav.querySelector('[data-tab="trash"]');
      if (trashBtn) {
        drawerNav.insertBefore(btn, trashBtn);
      } else {
        drawerNav.appendChild(btn);
      }

      btn.addEventListener('click', () => {
        if (typeof window.setActiveTab === 'function') window.setActiveTab('stats');
        if (typeof window.closeDrawer === 'function') window.closeDrawer();
      });
    }

    // 2. Перехватываем сохранение задачи в модальном окне,
    // чтобы после редактирования задачи из статистики экран не пустел
    const saveEntryBtn = document.getElementById('saveEntryBtn');
    if (saveEntryBtn && !saveEntryBtn.dataset.statsHooked) {
      saveEntryBtn.dataset.statsHooked = 'true';
      saveEntryBtn.addEventListener('click', () => {
        setTimeout(() => {
          const statsBtn = document.getElementById('statsDrawerBtn');
          if (statsBtn && statsBtn.classList.contains('active')) {
            window.renderStatsView();
          }
        }, 30);
      });
    }

    // также перехватываем удаление задачи
    ['customConfirmActionBtn', 'deleteThisOccurrenceOnlyBtn', 'deleteAllOccurrencesBtn'].forEach(btnId => {
      const el = document.getElementById(btnId);
      if (el && !el.dataset.statsHooked) {
        el.dataset.statsHooked = 'true';
        el.addEventListener('click', () => {
          setTimeout(() => {
            const statsBtn = document.getElementById('statsDrawerBtn');
            if (statsBtn && statsBtn.classList.contains('active')) {
              window.renderStatsView();
            }
          }, 30);
        });
      }
    });

    // 3. Инжектируем стили
    if (!document.getElementById('stats-bento-styles')) {
      const style = document.createElement('style');
      style.id = 'stats-bento-styles';
      style.textContent = `
        .stats-bento-wrapper {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .stats-kpi-bento-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .stats-kpi-card {
          background: var(--input-bg);
          border: 1.5px solid var(--input-border);
          border-radius: 22px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
          position: relative;
          overflow: hidden;
          user-select: none;
        }
        .stats-kpi-card:active {
          transform: scale(0.96);
        }
        .stats-kpi-card.active-card {
          border-width: 2px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
        }
        .stats-kpi-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .stats-kpi-pill {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .stats-kpi-number {
          font-family: 'Unbounded', sans-serif;
          font-size: 1.65rem;
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }
        .stats-kpi-label {
          font-size: 0.78rem;
          font-weight: 700;
          opacity: 0.85;
        }

        /* Главная карточка с большим Donut */
        .stats-hero-donut-card {
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 26px;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }
        .stats-hero-top-bar {
          width: 100%;
          display: flex;
          justify-content: flex-start;
          align-items: center;
        }
        .stats-status-pill {
          font-size: 0.7rem;
          font-weight: 800;
          padding: 5px 12px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .donut-visual-box {
          position: relative;
          width: 220px;
          height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .donut-big-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
          overflow: visible;
        }
        .donut-segment-path {
          transition: opacity 0.2s ease, stroke-width 0.2s ease;
          cursor: pointer;
        }
        .donut-segment-path:hover {
          opacity: 0.85;
        }
        .donut-center-info {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          text-align: center;
          padding: 28px;
        }
        .donut-center-big-num {
          font-family: 'Unbounded', sans-serif;
          font-size: 2.45rem;
          font-weight: 800;
          line-height: 1;
          color: var(--text);
          letter-spacing: -0.04em;
        }
        .donut-center-sub-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          margin-top: 6px;
        }

        /* Полосы категорий */
        .stats-cat-bars-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .stats-cat-bar-item {
          background: var(--card-bg);
          border: 1.5px solid var(--input-border);
          border-radius: 16px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .stats-cat-bar-item:active {
          transform: scale(0.98);
        }
        .stats-cat-bar-item.selected-cat {
          border-color: var(--text);
          background: rgba(255, 255, 255, 0.04);
        }
        .stats-cat-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.82rem;
          font-weight: 700;
        }
        .stats-cat-dot-name {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .stats-cat-color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .stats-cat-track {
          width: 100%;
          height: 10px;
          background: var(--input-bg);
          border-radius: 999px;
          overflow: hidden;
        }
        .stats-cat-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.4s cubic-bezier(0.1, 0.9, 0.2, 1);
        }

        /* Список задач под графиком */
        .stats-tasks-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 4px;
        }
        .stats-tasks-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 4px;
        }
        .stats-tasks-title {
          font-size: 0.92rem;
          font-weight: 800;
          color: var(--text);
        }
        .stats-reset-cat-btn {
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          color: var(--accent-blue);
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          cursor: pointer;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Точное построение дуги в полярных координатах без наложений
  function polarToCartesian(cx, cy, r, angleInDegrees) {
    const rad = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  }

  function renderLargeSvgDonut(categories, totalCount, centerLabel, breakdownMap) {
    const r = 38;
    const cx = 50, cy = 50;

    if (totalCount === 0 || categories.length === 0) {
      return `
        <div class="donut-visual-box">
          <svg class="donut-big-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="${r}" fill="transparent" stroke="var(--card-bg)" stroke-width="11"></circle>
          </svg>
          <div class="donut-center-info">
            <span class="donut-center-big-num">0</span>
            <span class="donut-center-sub-label">${escapeHtml(centerLabel)}</span>
          </div>
        </div>
      `;
    }

    let displayNum = totalCount;
    let displaySub = centerLabel;
    if (selectedCategoryFilter && breakdownMap[selectedCategoryFilter]) {
      displayNum = breakdownMap[selectedCategoryFilter].count;
      displaySub = breakdownMap[selectedCategoryFilter].label;
    }

    // Если всего одна категория — рисуем цельное кольцо без разрывов
    if (categories.length === 1) {
      const singleCat = categories[0];
      const strokeW = (selectedCategoryFilter === singleCat.key) ? 13 : 11;
      return `
        <div class="donut-visual-box">
          <svg class="donut-big-svg" viewBox="0 0 100 100">
            <circle class="donut-segment-path"
              data-catkey="${singleCat.key}"
              cx="50" cy="50" r="${r}"
              fill="transparent"
              stroke="${singleCat.color}"
              stroke-width="${strokeW}">
            </circle>
          </svg>
          <div class="donut-center-info">
            <span class="donut-center-big-num">${displayNum}</span>
            <span class="donut-center-sub-label">${escapeHtml(displaySub)}</span>
          </div>
        </div>
      `;
    }

    // Если категорий несколько — рассчитываем точные углы с учётом скругления концов,
    // чтобы сегменты гарантированно не накладывались друг на друга
    const strokeBase = 10.5;
    // Угол, который съедает один полукруглый cap: (strokeWidth / 2) / r в радианах -> градусах
    const capDeg = ((strokeBase / 2) / r) * (180 / Math.PI); // ~7.9° с каждой стороны
    const visualGapDeg = 4.5; // Чистый видимый зазор между соседними капсулами

    // Полный отступ между центрами концов двух соседних дуг
    const totalPadPerSegment = (capDeg * 2) + visualGapDeg;
    const totalPadsAll = totalPadPerSegment * categories.length;

    // Если секторов очень много или есть совсем крошечные сектора, используем четкие прямые стыки без наложений
    const minFraction = Math.min(...categories.map(c => c.count / totalCount));
    const useRoundCaps = (totalPadsAll < 240) && (minFraction * 360 > totalPadPerSegment + 2);

    let currentAngle = 0;
    const pathsHtml = categories.map(cat => {
      const fraction = cat.count / totalCount;
      const rawSweep = fraction * 360;
      const isSelected = selectedCategoryFilter === cat.key;
      const sw = isSelected ? strokeBase + 2 : strokeBase;

      let startA, endA, capStyle;
      if (useRoundCaps) {
        startA = currentAngle + capDeg + (visualGapDeg / 2);
        endA = currentAngle + rawSweep - capDeg - (visualGapDeg / 2);
        if (endA <= startA) {
          endA = startA + 0.5;
        }
        capStyle = 'round';
      } else {
        // Для мелких долей — чистый зазор 2.5 градуса без нахлёста
        const flatGap = 2.5;
        startA = currentAngle + (flatGap / 2);
        endA = currentAngle + Math.max(2, rawSweep - (flatGap / 2));
        capStyle = 'butt';
      }

      currentAngle += rawSweep;
      const dPath = describeArc(cx, cy, r, startA, endA);

      return `
        <path class="donut-segment-path"
          data-catkey="${cat.key}"
          d="${dPath}"
          fill="none"
          stroke="${cat.color}"
          stroke-width="${sw}"
          stroke-linecap="${capStyle}">
        </path>
      `;
    }).join('');

    return `
      <div class="donut-visual-box">
        <svg class="donut-big-svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="${r}" fill="transparent" stroke="rgba(255,255,255,0.04)" stroke-width="${strokeBase}"></circle>
          ${pathsHtml}
        </svg>
        <div class="donut-center-info">
          <span class="donut-center-big-num">${displayNum}</span>
          <span class="donut-center-sub-label">${escapeHtml(displaySub)}</span>
        </div>
      </div>
    `;
  }

  window.renderStatsView = function() {
    const container = document.getElementById('itemsList');
    const headerTitle = document.getElementById('summaryHeaderTitle');
    const tabControls = document.getElementById('tabControlsGroup');

    if (!container) return;
    if (tabControls) tabControls.style.display = 'none';

    const y = statsCurrentDate.getFullYear();
    const m = statsCurrentDate.getMonth();
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const monthTitle = `${window.monthNames ? window.monthNames[m] : (m + 1)} ${y}`;

    if (headerTitle) headerTitle.textContent = 'Статистика';

    const allEntries = window.entries || [];
    const taskTags = window.TASK_TAGS || {};
    const todayStr = (typeof window.formatDateKey === 'function') ? window.formatDateKey(new Date()) : '';

    // 1. Все поставленные задачи на выбранный месяц
    const monthTasks = allEntries.filter(e => e.type === 'task' && e.date && e.date.startsWith(monthKey));
    const totalSet = monthTasks.length;

    // 2. Сделанные задачи
    const completedTasks = monthTasks.filter(e => {
      if (e.isRecurring && Array.isArray(e.completedDates)) {
        return e.completedDates.some(d => d.startsWith(monthKey));
      }
      return !!e.completed;
    });
    const totalCompleted = completedTasks.length;
    const completionRate = totalSet > 0 ? Math.round((totalCompleted / totalSet) * 100) : 0;

    // 3. Просроченные / Не сделанные (Долги)
    const failedTasks = monthTasks.filter(e => {
      const isDone = e.isRecurring && Array.isArray(e.completedDates)
        ? e.completedDates.some(d => d.startsWith(monthKey))
        : !!e.completed;
      return !isDone && e.date < todayStr;
    });
    const totalFailed = failedTasks.length;

    // 4. Перенесенные / Отложенные задачи
    const nextMonthPrefix = `${m === 11 ? y + 1 : y}-${String(m === 11 ? 1 : m + 2).padStart(2, '0')}`;
    const postponedTasks = allEntries.filter(e => {
      if (e.type !== 'task') return false;
      if (e.postponedFromMonth === monthKey) return true;
      if (e.createdMonth === monthKey && e.date >= nextMonthPrefix) return true;
      return false;
    });
    const totalPostponed = postponedTasks.length;

    const taskPools = {
      all: monthTasks,
      completed: completedTasks,
      failed: failedTasks,
      postponed: postponedTasks
    };

    const currentPool = taskPools[activeStatusTab] || monthTasks;
    const currentMeta = STATUS_META[activeStatusTab] || STATUS_META.all;

    // Группировка по категориям
    const breakdownMap = {};
    currentPool.forEach(t => {
      const catKey = t.category || 'other';
      const tagMeta = taskTags[catKey] || { label: 'Прочее', color: '#94a3b8' };
      if (!breakdownMap[catKey]) {
        breakdownMap[catKey] = {
          key: catKey,
          label: tagMeta.label,
          color: tagMeta.color,
          count: 0
        };
      }
      breakdownMap[catKey].count++;
    });

    const sortedCategories = Object.values(breakdownMap).sort((a, b) => b.count - a.count);

    const barsHtml = sortedCategories.length === 0
      ? `<div style="text-align:center; color:var(--text-muted); font-size:0.82rem; padding:8px 0;">В этой группе нет задач за ${monthTitle}</div>`
      : sortedCategories.map(cat => {
          const pct = currentPool.length > 0 ? Math.round((cat.count / currentPool.length) * 100) : 0;
          const isSelected = selectedCategoryFilter === cat.key;
          return `
            <div class="stats-cat-bar-item ${isSelected ? 'selected-cat' : ''}" data-catkey="${cat.key}">
              <div class="stats-cat-bar-header">
                <div class="stats-cat-dot-name">
                  <span class="stats-cat-color-dot" style="background:${cat.color};"></span>
                  <span>${escapeHtml(cat.label)}</span>
                </div>
                <span style="color:var(--text-muted); font-weight:800;">${cat.count} <small>(${pct}%)</small></span>
              </div>
              <div class="stats-cat-track">
                <div class="stats-cat-fill" style="width:${pct}%; background:${cat.color};"></div>
              </div>
            </div>
          `;
        }).join('');

    function getKpiCardStyle(tabKey, accentHex, isNeonLime = false) {
      const isActive = activeStatusTab === tabKey;
      if (!isActive) return '';
      if (isNeonLime) {
        return `background:#cbf532; color:#0d0e12; border-color:#cbf532;`;
      }
      return `border-color:${accentHex}; background:${accentHex}18;`;
    }

    container.innerHTML = `
      <div class="stats-bento-wrapper">
        <!-- Переключатель месяца -->
        <div class="nav-header-row" style="margin-bottom:2px;">
          <button class="nav-arrow-btn" id="statsPrevMonthBtn" aria-label="Предыдущий месяц">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <span class="nav-header-title">${monthTitle}</span>
          <button class="nav-arrow-btn" id="statsNextMonthBtn" aria-label="Следующий месяц">
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <!-- Порядок карточек: 1. Поставлено, 2. Сделано, 3. Просрочено, 4. Перенесено -->
        <div class="stats-kpi-bento-grid">
          <div class="stats-kpi-card ${activeStatusTab === 'all' ? 'active-card' : ''}" data-statustab="all" style="${getKpiCardStyle('all', '#5b9ffc')}">
            <div class="stats-kpi-top">
              <span class="stats-kpi-pill" style="background:rgba(91,159,252,0.16); color:#5b9ffc;">За месяц</span>
            </div>
            <div class="stats-kpi-number" style="color:#5b9ffc;">${totalSet}</div>
            <div class="stats-kpi-label">Поставлено дел</div>
          </div>

          <div class="stats-kpi-card ${activeStatusTab === 'completed' ? 'active-card' : ''}" data-statustab="completed" style="${getKpiCardStyle('completed', '#cbf532', true)}">
            <div class="stats-kpi-top">
              <span class="stats-kpi-pill" style="${activeStatusTab === 'completed' ? 'background:#0d0e12; color:#cbf532;' : 'background:rgba(203,245,50,0.15); color:#cbf532;'}">↑ ${completionRate}%</span>
            </div>
            <div class="stats-kpi-number" style="${activeStatusTab === 'completed' ? 'color:#0d0e12;' : 'color:#cbf532;'}">${totalCompleted}</div>
            <div class="stats-kpi-label">Сделано дел</div>
          </div>

          <div class="stats-kpi-card ${activeStatusTab === 'failed' ? 'active-card' : ''}" data-statustab="failed" style="${getKpiCardStyle('failed', '#EF3838')}">
            <div class="stats-kpi-top">
              <span class="stats-kpi-pill" style="background:rgba(239,56,56,0.16); color:#EF3838;">Долги</span>
            </div>
            <div class="stats-kpi-number" style="color:#EF3838;">${totalFailed}</div>
            <div class="stats-kpi-label">Просрочено</div>
          </div>

          <div class="stats-kpi-card ${activeStatusTab === 'postponed' ? 'active-card' : ''}" data-statustab="postponed" style="${getKpiCardStyle('postponed', '#FF652F')}">
            <div class="stats-kpi-top">
              <span class="stats-kpi-pill" style="background:rgba(255,101,47,0.16); color:#FF652F;">Перенос</span>
            </div>
            <div class="stats-kpi-number" style="color:#FF652F;">${totalPostponed}</div>
            <div class="stats-kpi-label">Перенесено</div>
          </div>
        </div>

        <!-- Карточка с крупным Donut-графиком (без надписи справа сверху) -->
        <div class="stats-hero-donut-card">
          <div class="stats-hero-top-bar">
            <span class="stats-status-pill" style="background:${currentMeta.accentColor}; color:${currentMeta.darkText ? '#0d0e12' : '#ffffff'};">
              ${currentMeta.badgeText}
            </span>
          </div>

          ${renderLargeSvgDonut(sortedCategories, currentPool.length, currentMeta.centerSub, breakdownMap)}

          <div class="stats-cat-bars-list">
            ${barsHtml}
          </div>
        </div>

        <!-- Список задач выбранного среза -->
        <div class="stats-tasks-section" id="statsTasksListWrapper">
          <div class="stats-tasks-header">
            <span class="stats-tasks-title">
              ${escapeHtml(currentMeta.title)}
              ${selectedCategoryFilter && breakdownMap[selectedCategoryFilter] ? ` • ${escapeHtml(breakdownMap[selectedCategoryFilter].label)}` : ''}
            </span>
            ${selectedCategoryFilter ? `<button class="stats-reset-cat-btn" id="statsResetCatBtn">Показать все</button>` : ''}
          </div>
          <div class="items-container" id="statsFilteredTasksContainer"></div>
        </div>
      </div>
    `;

    // Рендерим карточки задач
    const tasksListEl = document.getElementById('statsFilteredTasksContainer');
    const filteredTasks = selectedCategoryFilter
      ? currentPool.filter(t => (t.category || 'other') === selectedCategoryFilter)
      : currentPool;

    if (filteredTasks.length === 0) {
      tasksListEl.innerHTML = `<div class="empty-state-text" style="padding:20px;">Задач в этом списке нет.</div>`;
    } else {
      filteredTasks.forEach(item => {
        const cat = taskTags[item.category] || {
          label: 'Прочее',
          color: '#94a3b8',
          bg: 'rgba(148, 163, 184, 0.16)'
        };
        const isDone = item.isRecurring && Array.isArray(item.completedDates)
          ? item.completedDates.includes(item.date)
          : !!item.completed;

        const card = document.createElement('div');
        card.className = 'bento-entry-card';
        card.style.background = cat.bg || `${cat.color}22`;
        card.style.borderColor = cat.color;
        card.style.cursor = 'pointer';

        card.innerHTML = `
          <div class="bento-entry-left">
            <button class="round-check-btn ${isDone ? 'checked' : ''}" style="color:${cat.color};" title="Отметить выполнение">
              <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
            <div class="bento-entry-info">
              <div class="bento-entry-title" style="color:${cat.color};">
                ${escapeHtml(item.title)}
              </div>
              <div class="bento-entry-badges">
                <span class="badge" style="background:${cat.color}25; color:${cat.color};">${escapeHtml(cat.label)}</span>
                ${item.date ? `<span class="badge" style="background:${cat.color}25; color:${cat.color};">${formatDisplayDate(item.date)}</span>` : ''}
                ${item.time ? `<span class="badge" style="background:${cat.color}25; color:${cat.color};">${escapeHtml(item.time)}</span>` : ''}
              </div>
              ${item.notes ? `<div class="bento-entry-notes" style="color:${cat.color};">${escapeHtml(item.notes)}</div>` : ''}
            </div>
          </div>
          <div class="item-actions">
            <button class="action-icon-btn edit-task-btn" style="color:${cat.color};" title="Открыть задачу">
              <svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
          </div>
        `;

        // Переключение галочки выполнения
        const checkBtn = card.querySelector('.round-check-btn');
        checkBtn.onclick = (e) => {
          e.stopPropagation();
          if (typeof window.setTaskCompletedOnDate === 'function') {
            window.setTaskCompletedOnDate(item, item.date, !isDone);
            window.renderStatsView();
          }
        };

        // Открытие задачи по клику
        const openTaskHandler = () => {
          if (typeof window.openEditModal === 'function') {
            window.openEditModal(item);
          }
        };
        card.querySelector('.bento-entry-info').onclick = openTaskHandler;
        card.querySelector('.edit-task-btn').onclick = (e) => {
          e.stopPropagation();
          openTaskHandler();
        };

        tasksListEl.appendChild(card);
      });
    }

    // Листание месяцев
    document.getElementById('statsPrevMonthBtn').onclick = () => {
      statsCurrentDate.setMonth(statsCurrentDate.getMonth() - 1);
      selectedCategoryFilter = null;
      window.renderStatsView();
    };
    document.getElementById('statsNextMonthBtn').onclick = () => {
      statsCurrentDate.setMonth(statsCurrentDate.getMonth() + 1);
      selectedCategoryFilter = null;
      window.renderStatsView();
    };

    // Переключение между карточками KPI
    container.querySelectorAll('.stats-kpi-card[data-statustab]').forEach(card => {
      card.onclick = () => {
        activeStatusTab = card.dataset.statustab;
        selectedCategoryFilter = null;
        window.renderStatsView();
      };
    });

    // Фильтрация по клику на дугу Donut или полосу категории
    container.querySelectorAll('[data-catkey]').forEach(el => {
      el.onclick = () => {
        const key = el.dataset.catkey;
        selectedCategoryFilter = (selectedCategoryFilter === key) ? null : key;
        window.renderStatsView();
      };
    });

    const resetBtn = document.getElementById('statsResetCatBtn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        selectedCategoryFilter = null;
        window.renderStatsView();
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStatsModule);
  } else {
    initStatsModule();
  }
})();