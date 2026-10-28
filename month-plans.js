/**
 * Модуль: Планы на месяц (Master Schedule)
 */
const MonthPlansModule = (function () {
  let curDate = new Date();
  let calMode = 'events'; // 'events' (Праздники) или 'all' (Все задачи)
  let selectedHabitId = null;
  let selectedCalDayKey = null;

  const STORAGE_KEY = 'master_schedule_month_plans';

  // Минималистичные иконки приложения
  const pinIconSvg = `<svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round;"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-2l-2-3V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7l-2 3v2z"></path></svg>`;
  const checkIconSvg = `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; fill:none; stroke-width:2.8; stroke-linecap:round; stroke-linejoin:round;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const closeIconSvg = `<svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>`;

  function getGlobalEntries() {
    return (typeof window.entries !== 'undefined') ? window.entries : ((typeof entries !== 'undefined') ? entries : []);
  }

  function getGlobalHabits() {
    return (typeof window.habits !== 'undefined') ? window.habits : ((typeof habits !== 'undefined') ? habits : []);
  }

  function getAppTags() {
    if (typeof getThemeColors === 'function') {
      return getThemeColors();
    }
    return {
      taskTags: (typeof customTaskTags !== 'undefined' ? customTaskTags : (window.TASK_TAGS || {})),
      eventTags: (typeof customEventTags !== 'undefined' ? customEventTags : (window.DEFAULT_EVENT_TAGS || {}))
    };
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function initCurrentMonth() {
    curDate = new Date();
    selectedCalDayKey = null;
  }

  function getStorageData() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  }

  function saveStorageData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getMonthKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  function getCurMonthData() {
    const data = getStorageData();
    const key = getMonthKey(curDate);
    if (!data[key]) {
      data[key] = {
        emoji: '🎯',
        focus: '',
        goals: []
      };
    }
    return { allData: data, monthKey: key, cur: data[key] };
  }

  function render() {
    const container = document.getElementById('itemsList');
    if (!container) return;
    container.innerHTML = '';

    const { allData, monthKey, cur } = getCurMonthData();
    const monthNamesList = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    const monthName = monthNamesList[curDate.getMonth()];
    const yearShort = String(curDate.getFullYear()).slice(-2);

    const wrap = document.createElement('div');
    wrap.className = 'month-plans-wrap';
    wrap.style.cssText = 'display:flex; flex-direction:column; gap:16px; width:100%;';

    // 1. Шапка месяца: Стрелка влево — Название месяца — Стрелка вправо (с разных сторон)
    const headerRow = document.createElement('div');
    headerRow.className = 'nav-header-row';
    headerRow.style.margin = '0 0 4px 0';
    headerRow.innerHTML = `
      <button class="nav-arrow-btn" id="mpPrevMonth" aria-label="Предыдущий месяц">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <div style="display:flex; align-items:center; gap:8px;">
        <span id="mpEmojiBtn" style="font-size:1.45rem; cursor:pointer; user-select:none;" title="Изменить значок">${cur.emoji || '🎯'}</span>
        <h2 style="font-size:1.35rem; font-weight:800; letter-spacing:-0.03em;">${monthName}'${yearShort}</h2>
      </div>
      <button class="nav-arrow-btn" id="mpNextMonth" aria-label="Следующий месяц">
        <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    `;

    // 2. Поле фокуса в цветовой гамме приложения
    const focusBox = document.createElement('div');
    focusBox.style.cssText = `
      background: var(--card-bg);
      border: 1px solid var(--input-border);
      color: var(--text);
      padding: 12px 16px;
      border-radius: var(--radius-elem);
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    `;
    focusBox.innerHTML = `
      <span style="font-weight:800; font-size:0.86rem; color:var(--primary); white-space:nowrap; text-transform:uppercase; letter-spacing:0.04em;">Фокус:</span>
      <input type="text" id="mpFocusInput" value="${escapeHtml(cur.focus || '')}" placeholder="Главная цель или девиз месяца..." 
        style="background:transparent; border:none; color:var(--text); font-weight:600; font-size:0.9rem; width:100%; outline:none;" />
    `;

    // 3. Блок главных целей
    const goalsSection = document.createElement('div');
    goalsSection.className = 'card';
    goalsSection.style.padding = '18px 16px';
    goalsSection.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="font-size:1.02rem; font-weight:800;">Главные цели:</h3>
        <div style="display:flex; gap:8px;">
          <button id="mpAddCustomGoalBtn" class="action-icon-btn" title="Добавить цель" style="background:var(--input-bg); border:1px solid var(--input-border); width:32px; height:32px; border-radius:10px; color:var(--text);">＋</button>
          <button id="mpAttachPendingBtn" class="action-icon-btn" title="Закрепить задачу" style="background:var(--input-bg); border:1px solid var(--input-border); width:32px; height:32px; border-radius:10px; color:var(--text);">${pinIconSvg}</button>
        </div>
      </div>
      <div id="mpGoalsList" style="display:flex; flex-direction:column; gap:8px;"></div>
    `;

    // 4. Календарь месяца
    const calSection = document.createElement('div');
    calSection.className = 'card';
    calSection.style.padding = '18px 16px';
    calSection.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <span style="font-size:0.8rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">Календарь</span>
        <div class="subtabs-bar" style="margin-bottom:0; padding:3px; background:var(--input-bg);">
          <button class="subtab-btn ${calMode === 'events' ? 'active' : ''}" id="mpModeEvents" style="padding:6px 12px; font-size:0.75rem;">Праздники</button>
          <button class="subtab-btn ${calMode === 'all' ? 'active' : ''}" id="mpModeAll" style="padding:6px 12px; font-size:0.75rem;">Все задачи</button>
        </div>
      </div>
      <div class="weekdays-row" style="margin-bottom:10px;">
        <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
      </div>
      <div class="days-grid" id="mpDaysGrid"></div>
      <div id="mpCalSubContent" style="margin-top:16px;"></div>
    `;

    // 5. Блок привычек месяца
    const habitSection = document.createElement('div');
    habitSection.className = 'card';
    habitSection.style.padding = '18px 16px';
    habitSection.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <h3 style="font-size:1.02rem; font-weight:800;">Привычки месяца</h3>
        <select id="mpHabitSelect" class="form-ctrl" style="width:auto; max-width:180px; padding:6px 10px; font-size:0.8rem; border-radius:10px;"></select>
      </div>
      <div id="mpHabitGridBox"></div>
    `;

    wrap.appendChild(headerRow);
    wrap.appendChild(focusBox);
    wrap.appendChild(goalsSection);
    wrap.appendChild(calSection);
    wrap.appendChild(habitSection);
    container.appendChild(wrap);

    // Слушатели шапки месяца
    headerRow.querySelector('#mpPrevMonth').onclick = () => {
      curDate.setMonth(curDate.getMonth() - 1);
      selectedCalDayKey = null;
      render();
    };
    headerRow.querySelector('#mpNextMonth').onclick = () => {
      curDate.setMonth(curDate.getMonth() + 1);
      selectedCalDayKey = null;
      render();
    };

    headerRow.querySelector('#mpEmojiBtn').onclick = () => {
      openPromptModal('Значок месяца', 'Введите любой эмодзи:', cur.emoji || '🎯', (val) => {
        cur.emoji = val.trim() || '🎯';
        allData[monthKey] = cur;
        saveStorageData(allData);
        render();
      });
    };

    const focusInput = focusBox.querySelector('#mpFocusInput');
    focusInput.onchange = () => {
      cur.focus = focusInput.value.trim();
      allData[monthKey] = cur;
      saveStorageData(allData);
    };

    renderGoalsList(goalsSection.querySelector('#mpGoalsList'), cur, allData, monthKey);
    renderMonthCalendar(calSection);
    renderHabitSection(habitSection);

    calSection.querySelector('#mpModeEvents').onclick = () => { calMode = 'events'; selectedCalDayKey = null; render(); };
    calSection.querySelector('#mpModeAll').onclick = () => { calMode = 'all'; selectedCalDayKey = null; render(); };

    goalsSection.querySelector('#mpAddCustomGoalBtn').onclick = () => {
      openPromptModal('Новая главная цель', 'Введите цель на месяц:', '', (val) => {
        if (!val.trim()) return;
        cur.goals.push({
          id: 'g_' + Date.now(),
          title: val.trim(),
          completed: false,
          isPendingRef: false
        });
        allData[monthKey] = cur;
        saveStorageData(allData);
        render();
      });
    };

    goalsSection.querySelector('#mpAttachPendingBtn').onclick = () => {
      openAttachPendingPicker(cur, allData, monthKey);
    };
  }

  function renderGoalsList(container, cur, allData, monthKey) {
    container.innerHTML = '';
    if (!cur.goals || cur.goals.length === 0) {
      container.innerHTML = `
        <div style="font-size:0.84rem; color:var(--text-muted); padding:4px 0; display:flex; align-items:center; gap:6px;">
          <span>Нет добавленных целей. Нажмите <b>＋</b> или</span>
          <span style="display:inline-flex; align-items:center; color:var(--text-muted);">${pinIconSvg}</span>
          <span>чтобы закрепить задачу.</span>
        </div>`;
      return;
    }

    cur.goals.forEach(goal => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);';

      const left = document.createElement('div');
      left.style.cssText = 'display:flex; align-items:center; gap:10px; cursor:pointer; flex:1; overflow:hidden;';

      const check = document.createElement('div');
      check.className = `round-check-btn ${goal.completed ? 'checked' : ''}`;
      check.style.color = 'var(--primary)';
      check.innerHTML = checkIconSvg;

      const titleSpan = document.createElement('div');
      titleSpan.style.cssText = 'font-size:0.92rem; font-weight:600; display:flex; align-items:center; gap:6px; overflow:hidden; text-overflow:ellipsis;';
      if (goal.completed) {
        titleSpan.style.textDecoration = 'line-through';
        titleSpan.style.opacity = '0.5';
      }

      if (goal.isPendingRef) {
        titleSpan.innerHTML = `<span style="display:inline-flex; align-items:center; color:var(--accent-blue);">${pinIconSvg}</span> <span>${escapeHtml(goal.title)}</span>`;
      } else {
        titleSpan.textContent = goal.title;
      }

      left.appendChild(check);
      left.appendChild(titleSpan);

      left.onclick = () => {
        goal.completed = !goal.completed;
        allData[monthKey] = cur;
        saveStorageData(allData);
        render();
      };

      const delBtn = document.createElement('button');
      delBtn.className = 'action-icon-btn del-btn';
      delBtn.innerHTML = closeIconSvg;
      delBtn.style.color = 'var(--text-muted)';
      delBtn.onclick = () => {
        cur.goals = cur.goals.filter(g => g.id !== goal.id);
        allData[monthKey] = cur;
        saveStorageData(allData);
        render();
      };

      row.appendChild(left);
      row.appendChild(delBtn);
      container.appendChild(row);
    });
  }

  // Модальное окно выбора висящих задач
  function openAttachPendingPicker(cur, allData, monthKey) {
    const pendings = getGlobalEntries().filter(e => e.type === 'pending');
    if (pendings.length === 0) {
      alert('У вас нет висящих задач. Создайте их в соответствующей вкладке.');
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.display = 'flex';
    backdrop.style.zIndex = '1200';

    let listHtml = pendings.map(p => `
      <div class="bento-entry-card" data-pid="${p.id}" style="padding:10px 14px; background:var(--input-bg); border:1px solid var(--input-border); cursor:pointer;">
        <span style="font-weight:700; font-size:0.9rem;">${escapeHtml(p.title)}</span>
      </div>
    `).join('');

    backdrop.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-sheet-header">
          <h2>Закрепить висящую задачу</h2>
          <button class="modal-close-x">&times;</button>
        </div>
        <div class="modal-sheet-body" style="gap:8px;">
          ${listHtml}
        </div>
        <div class="modal-sheet-footer">
          <button class="modal-btn btn-cancel" style="width:100%;">Отмена</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const closeMe = () => backdrop.remove();
    backdrop.querySelector('.modal-close-x').onclick = closeMe;
    backdrop.querySelector('.btn-cancel').onclick = closeMe;
    backdrop.onclick = (e) => { if (e.target === backdrop) closeMe(); };

    backdrop.querySelectorAll('[data-pid]').forEach(card => {
      card.onclick = () => {
        const p = pendings.find(x => x.id === card.dataset.pid);
        if (p) {
          cur.goals.push({
            id: 'g_' + Date.now(),
            title: p.title,
            completed: false,
            isPendingRef: true,
            pendingId: p.id
          });
          allData[monthKey] = cur;
          saveStorageData(allData);
          closeMe();
          render();
        }
      };
    });
  }

  // Модальное окно для ввода текста
  function openPromptModal(title, label, defaultValue, onDone) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.display = 'flex';
    backdrop.style.zIndex = '1200';

    backdrop.innerHTML = `
      <div class="modal-sheet" style="max-width:400px;">
        <div class="modal-sheet-header">
          <h2>${escapeHtml(title)}</h2>
          <button class="modal-close-x">&times;</button>
        </div>
        <div class="modal-sheet-body">
          <div class="field-group">
            <label>${escapeHtml(label)}</label>
            <input type="text" class="form-ctrl" id="customPromptInput" value="${escapeHtml(defaultValue)}" />
          </div>
        </div>
        <div class="modal-sheet-footer">
          <div class="modal-actions">
            <button class="modal-btn btn-cancel" id="promptCancelBtn">Отмена</button>
            <button class="modal-btn btn-save" id="promptSaveBtn">Сохранить</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    const inp = backdrop.querySelector('#customPromptInput');
    inp.focus();
    inp.select();

    const closeMe = () => backdrop.remove();
    backdrop.querySelector('.modal-close-x').onclick = closeMe;
    backdrop.querySelector('#promptCancelBtn').onclick = closeMe;
    backdrop.onclick = (e) => { if (e.target === backdrop) closeMe(); };

    const saveMe = () => {
      onDone(inp.value);
      closeMe();
    };

    backdrop.querySelector('#promptSaveBtn').onclick = saveMe;
    inp.onkeydown = (e) => { if (e.key === 'Enter') saveMe(); };
  }

  function renderMonthCalendar(cardEl) {
    const { taskTags, eventTags } = getAppTags();
    const y = curDate.getFullYear();
    const m = curDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7;

    const grid = cardEl.querySelector('#mpDaysGrid');
    const subContent = cardEl.querySelector('#mpCalSubContent');
    grid.innerHTML = '';
    subContent.innerHTML = '';

    const prevMonthLastDate = new Date(y, m, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const c = document.createElement('div');
      c.className = 'day-cell other-month';
      c.textContent = prevMonthLastDate - i;
      grid.appendChild(c);
    }

    const monthEventsList = [];
    const allEntries = getGlobalEntries();

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const cellDate = new Date(y, m, d);
      const dKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const sKey = `${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const cell = document.createElement('div');
      cell.className = 'day-cell';
      cell.textContent = d;

      const dayEvts = allEntries.filter(e => e.type === 'event' && (e.isYearly ? (e.date && e.date.endsWith(sKey)) : e.date === dKey));
      const dayTasks = allEntries.filter(e => e.type === 'task' && (typeof taskOccursOnDate === 'function' ? taskOccursOnDate(e, dKey) : e.date === dKey));

      dayEvts.forEach(ev => monthEventsList.push({ day: d, dateKey: dKey, event: ev }));

      if (calMode === 'events') {
        if (dayEvts.length > 0) {
          cell.classList.add('has-entry');
          const cat = eventTags[dayEvts[0].category] || eventTags.holiday;
          cell.style.backgroundColor = cat?.color || '#a855f7';
          cell.style.color = '#ffffff';
        }
      } else {
        const allItems = [...dayEvts, ...dayTasks];
        if (allItems.length > 0) {
          cell.classList.add('has-entry');
          const first = allItems[0];
          const tagObj = (first.type === 'event') ? eventTags[first.category] : taskTags[first.category];
          cell.style.backgroundColor = tagObj?.color || 'var(--primary)';
          cell.style.color = tagObj?.darkText ? '#0e0f12' : '#ffffff';
        }
      }

      if (selectedCalDayKey === dKey) {
        cell.classList.add('selected');
      }

      cell.onclick = () => {
        selectedCalDayKey = dKey;
        renderMonthCalendar(cardEl);
      };

      grid.appendChild(cell);
    }

    if (calMode === 'events') {
      let html = `<h4 style="font-size:0.92rem; font-weight:800; margin-bottom:10px;">События & Праздники:</h4>`;
      if (monthEventsList.length === 0) {
        html += `<div style="font-size:0.84rem; color:var(--text-muted);">В этом месяце нет запланированных событий или дат.</div>`;
      } else {
        html += `<div style="display:flex; flex-direction:column; gap:6px;">`;
        monthEventsList.sort((a, b) => a.day - b.day).forEach(item => {
          html += `<div style="font-size:0.9rem; font-weight:600;"><span style="color:var(--accent-blue); font-weight:800;">${item.day}</span> — ${escapeHtml(item.event.title)}</div>`;
        });
        html += `</div>`;
      }
      subContent.innerHTML = html;
    } else {
      if (!selectedCalDayKey) {
        subContent.innerHTML = `<div style="font-size:0.84rem; color:var(--text-muted); text-align:center; padding:10px 0;">Нажмите на день календаря для просмотра списка задач.</div>`;
      } else {
        const dObj = (typeof parseDateKey === 'function') ? parseDateKey(selectedCalDayKey) : new Date(selectedCalDayKey);
        const dayTasks = allEntries.filter(e => e.type === 'task' && (typeof taskOccursOnDate === 'function' ? taskOccursOnDate(e, selectedCalDayKey) : e.date === selectedCalDayKey));
        const sKey = `${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
        const dayEvts = allEntries.filter(e => e.type === 'event' && (e.isYearly ? (e.date && e.date.endsWith(sKey)) : e.date === selectedCalDayKey));

        const dispDate = (typeof formatDisplayDate === 'function') ? formatDisplayDate(selectedCalDayKey) : selectedCalDayKey;
        let html = `<h4 style="font-size:0.92rem; font-weight:800; margin-bottom:10px;">Задачи на ${dispDate}:</h4>`;
        const total = [...dayEvts, ...dayTasks];
        if (total.length === 0) {
          html += `<div style="font-size:0.84rem; color:var(--text-muted);">На этот день дел нет.</div>`;
        } else {
          html += `<div style="display:flex; flex-direction:column; gap:6px;">`;
          total.forEach(it => {
            html += `<div style="padding:8px 12px; background:var(--input-bg); border:1px solid var(--input-border); border-radius:10px; font-size:0.88rem; font-weight:600;">${escapeHtml(it.title)} ${it.time ? `<small style="color:var(--text-muted);">(${it.time})</small>` : ''}</div>`;
          });
          html += `</div>`;
        }
        subContent.innerHTML = html;
      }
    }
  }

  function renderHabitSection(cardEl) {
    const select = cardEl.querySelector('#mpHabitSelect');
    const box = cardEl.querySelector('#mpHabitGridBox');
    const allHabits = getGlobalHabits();

    if (!allHabits || allHabits.length === 0) {
      select.style.display = 'none';
      box.innerHTML = `<div style="font-size:0.84rem; color:var(--text-muted);">Нет созданных привычек. Создайте их в основном разделе «Трекер привычек».</div>`;
      return;
    }

    select.style.display = 'inline-block';
    select.innerHTML = '';
    allHabits.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = h.title;
      select.appendChild(opt);
    });

    if (!selectedHabitId || !allHabits.find(h => h.id === selectedHabitId)) {
      selectedHabitId = allHabits[0].id;
    }
    select.value = selectedHabitId;

    select.onchange = () => {
      selectedHabitId = select.value;
      drawHabitDots(box);
    };

    drawHabitDots(box);
  }

  function drawHabitDots(box) {
    const allHabits = getGlobalHabits();
    const habit = allHabits.find(h => h.id === selectedHabitId);
    if (!habit) return;

    habit.doneDates = habit.doneDates || [];
    const y = curDate.getFullYear();
    const m = curDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastD = new Date(y, m + 1, 0).getDate();
    const startDay = (firstDay.getDay() + 6) % 7;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let dotsHtml = '';
    for (let i = 0; i < startDay; i++) {
      dotsHtml += `<div class="day-cell other-month" style="opacity:0.1; cursor:default;"></div>`;
    }

    for (let d = 1; d <= lastD; d++) {
      const dKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isDone = habit.doneDates.includes(dKey);
      const isToday = dKey === todayStr;
      const isFuture = dKey > todayStr;

      dotsHtml += `
        <div class="day-cell ${isDone ? 'has-entry' : ''} ${isToday ? 'today-circle' : ''}" 
             data-dkey="${dKey}" 
             style="${isDone ? `background:var(--primary); color:var(--primary-text); font-weight:800;` : ''} ${isFuture ? 'opacity:0.3; cursor:not-allowed;' : ''}">
          ${d}
        </div>
      `;
    }

    box.innerHTML = `
      <div class="weekdays-row" style="margin-bottom:6px; font-size:0.7rem;">
        <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
      </div>
      <div class="days-grid">${dotsHtml}</div>
    `;

    box.querySelectorAll('.day-cell[data-dkey]').forEach(el => {
      el.onclick = () => {
        const k = el.dataset.dkey;
        if (k > todayStr) return;
        if (habit.doneDates.includes(k)) {
          habit.doneDates = habit.doneDates.filter(d => d !== k);
        } else {
          habit.doneDates.push(k);
        }
        if (typeof saveHabits === 'function') saveHabits();
        else localStorage.setItem('master_schedule_habits', JSON.stringify(allHabits));
        drawHabitDots(box);
      };
    });
  }

  return {
    openSection: function() {
      initCurrentMonth();
      render();
    },
    render: render
  };
})();
