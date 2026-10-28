/**
 * Модуль: Планы на месяц (Master Schedule)
 */
const MonthPlansModule = (function () {
  let curDate = new Date(); // Переменная для навигации по месяцам
  let calMode = 'events';   // 'events' (События/Праздники) или 'all' (Все задачи)
  let selectedHabitId = null;
  let selectedCalDayKey = null;

  const STORAGE_KEY = 'master_schedule_month_plans';

  // Метод автоматического сброса на текущий актуальный месяц
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

    // 1. Шапка месяца с навигацией
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
    headerRow.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span id="mpEmojiBtn" style="font-size:1.6rem; cursor:pointer; user-select:none;" title="Изменить эмодзи">${cur.emoji || '🎯'}</span>
        <h2 style="font-size:1.45rem; font-weight:800; letter-spacing:-0.03em;">${monthName}'${yearShort}</h2>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="arrow-btn" id="mpPrevMonth" style="font-size:1.4rem; padding:2px 8px; cursor:pointer;">&lsaquo;</button>
        <button class="arrow-btn" id="mpNextMonth" style="font-size:1.4rem; padding:2px 8px; cursor:pointer;">&rsaquo;</button>
      </div>
    `;

    // 2. Фокус на месяц
    const focusBox = document.createElement('div');
    focusBox.style.cssText = `
      background: rgba(255, 120, 75, 0.14);
      border: 1px solid rgba(255, 120, 75, 0.35);
      color: #ff8a65;
      padding: 10px 14px;
      border-radius: var(--radius-elem);
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    focusBox.innerHTML = `
      <span style="font-weight:800; font-size:0.86rem; white-space:nowrap;">Фокус на:</span>
      <input type="text" id="mpFocusInput" value="${escapeHtml(cur.focus || '')}" placeholder="главной задаче месяца..." 
        style="background:transparent; border:none; color:inherit; font-weight:600; font-size:0.86rem; width:100%; outline:none;" />
    `;

    // 3. Главные цели
    const goalsSection = document.createElement('div');
    goalsSection.className = 'card';
    goalsSection.style.padding = '16px';
    goalsSection.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="font-size:1.02rem; font-weight:800;">Главные цели:</h3>
        <div style="display:flex; gap:6px;">
          <button id="mpAddCustomGoalBtn" class="action-icon-btn" title="Добавить цель вручную" style="border:1px solid var(--input-border); width:28px; height:28px; border-radius:8px;">＋</button>
          <button id="mpAttachPendingBtn" class="action-icon-btn" title="Прикрепить висящую задачу" style="border:1px solid var(--input-border); width:28px; height:28px; border-radius:8px;">📌</button>
        </div>
      </div>
      <div id="mpGoalsList" style="display:flex; flex-direction:column; gap:8px;"></div>
    `;

    // 4. Календарь месяца (2 режима)
    const calSection = document.createElement('div');
    calSection.className = 'card';
    calSection.style.padding = '16px';
    calSection.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-size:0.8rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Календарь</span>
        <div style="display:flex; background:var(--input-bg); border:1px solid var(--input-border); border-radius:10px; padding:2px;">
          <button class="subtab-btn ${calMode === 'events' ? 'active' : ''}" id="mpModeEvents" style="padding:4px 10px; font-size:0.75rem; border:none; background:${calMode === 'events' ? 'var(--primary)' : 'transparent'}; color:${calMode === 'events' ? '#fff' : 'var(--text-muted)'}; border-radius:8px; cursor:pointer; font-weight:700;">Праздники</button>
          <button class="subtab-btn ${calMode === 'all' ? 'active' : ''}" id="mpModeAll" style="padding:4px 10px; font-size:0.75rem; border:none; background:${calMode === 'all' ? 'var(--primary)' : 'transparent'}; color:${calMode === 'all' ? '#fff' : 'var(--text-muted)'}; border-radius:8px; cursor:pointer; font-weight:700;">Все задачи</button>
        </div>
      </div>
      <div class="weekdays-row" style="margin-bottom:8px;">
        <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
      </div>
      <div class="days-grid" id="mpDaysGrid"></div>
      <div id="mpCalSubContent" style="margin-top:16px;"></div>
    `;

    // 5. Трекер привычек на месяц
    const habitSection = document.createElement('div');
    habitSection.className = 'card';
    habitSection.style.padding = '16px';
    habitSection.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="font-size:1.02rem; font-weight:800;">Привычки месяца</h3>
        <select id="mpHabitSelect" class="form-ctrl" style="width:auto; padding:5px 10px; font-size:0.8rem; border-radius:10px;"></select>
      </div>
      <div id="mpHabitGridBox"></div>
    `;

    wrap.appendChild(headerRow);
    wrap.appendChild(focusBox);
    wrap.appendChild(goalsSection);
    wrap.appendChild(calSection);
    wrap.appendChild(habitSection);
    container.appendChild(wrap);

    // Слушатели стрелок переключения месяцев:
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
      const e = prompt('Введите эмодзи для этого месяца:', cur.emoji || '🎯');
      if (e !== null) {
        cur.emoji = e.trim() || '🎯';
        allData[monthKey] = cur;
        saveStorageData(allData);
        render();
      }
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
      const text = prompt('Введите главную цель на этот месяц:');
      if (text && text.trim()) {
        cur.goals.push({
          id: 'g_' + Date.now(),
          title: text.trim(),
          completed: false,
          isPendingRef: false
        });
        allData[monthKey] = cur;
        saveStorageData(allData);
        render();
      }
    };

    goalsSection.querySelector('#mpAttachPendingBtn').onclick = () => {
      openAttachPendingDialog(cur, allData, monthKey);
    };
  }

  function renderGoalsList(container, cur, allData, monthKey) {
    container.innerHTML = '';
    if (!cur.goals || cur.goals.length === 0) {
      container.innerHTML = `<div style="font-size:0.84rem; color:var(--text-muted);">Нет добавленных целей. Нажмите ＋ или 📌, чтобы закрепить задачу.</div>`;
      return;
    }

    cur.goals.forEach(goal => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:10px; padding:4px 0;';

      const left = document.createElement('div');
      left.style.cssText = 'display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;';

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'item-checkbox';
      check.checked = !!goal.completed;

      const titleSpan = document.createElement('span');
      titleSpan.style.fontSize = '0.9rem';
      titleSpan.style.fontWeight = '600';
      if (goal.completed) {
        titleSpan.style.textDecoration = 'line-through';
        titleSpan.style.opacity = '0.5';
      }
      titleSpan.textContent = (goal.isPendingRef ? '📌 ' : '') + goal.title;

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
      delBtn.innerHTML = `&times;`;
      delBtn.style.fontSize = '1.2rem';
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

  function openAttachPendingDialog(cur, allData, monthKey) {
    const pendings = (typeof entries !== 'undefined' ? entries : []).filter(e => e.type === 'pending');
    if (pendings.length === 0) {
      alert('У вас нет висящих задач в соответствующем разделе.');
      return;
    }

    const titles = pendings.map((p, i) => `${i + 1}. ${p.title}`).join('\n');
    const choice = prompt(`Выберите номер висящей задачи:\n\n${titles}`);
    const num = parseInt(choice, 10);
    if (!isNaN(num) && num >= 1 && num <= pendings.length) {
      const selected = pendings[num - 1];
      cur.goals.push({
        id: 'g_' + Date.now(),
        title: selected.title,
        completed: false,
        isPendingRef: true,
        pendingId: selected.id
      });
      allData[monthKey] = cur;
      saveStorageData(allData);
      render();
    }
  }

  function renderMonthCalendar(cardEl) {
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
    const allEntries = typeof entries !== 'undefined' ? entries : [];

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const cellDate = new Date(y, m, d);
      const dKey = formatDateKey(cellDate);
      const sKey = formatShortDateKey(cellDate);

      const cell = document.createElement('div');
      cell.className = 'day-cell';
      cell.textContent = d;

      const dayEvts = allEntries.filter(e => e.type === 'event' && (e.isYearly ? e.date.endsWith(sKey) : e.date === dKey));
      const dayTasks = allEntries.filter(e => e.type === 'task' && (typeof taskOccursOnDate === 'function' ? taskOccursOnDate(e, dKey) : e.date === dKey));

      dayEvts.forEach(ev => monthEventsList.push({ day: d, dateKey: dKey, event: ev }));

      if (calMode === 'events') {
        if (dayEvts.length > 0) {
          cell.classList.add('has-entry');
          const cat = EVENT_TAGS[dayEvts[0].category] || EVENT_TAGS.holiday;
          cell.style.backgroundColor = cat?.color || '#a855f7';
          cell.style.color = '#ffffff';
        }
      } else {
        const allItems = [...dayEvts, ...dayTasks];
        if (allItems.length > 0) {
          cell.classList.add('has-entry');
          const first = allItems[0];
          const tagObj = (first.type === 'event') ? EVENT_TAGS[first.category] : TASK_TAGS[first.category];
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
      let html = `<h4 style="font-size:0.92rem; font-weight:800; margin-bottom:8px;">События месяца:</h4>`;
      if (monthEventsList.length === 0) {
        html += `<div style="font-size:0.84rem; color:var(--text-muted);">В этом месяце нет запланированных событий или праздников.</div>`;
      } else {
        html += `<div style="display:flex; flex-direction:column; gap:6px;">`;
        monthEventsList.sort((a, b) => a.day - b.day).forEach(item => {
          html += `<div style="font-size:0.88rem; font-weight:600;"><span style="color:var(--accent-blue); font-weight:800;">${item.day}</span> — ${escapeHtml(item.event.title)}</div>`;
        });
        html += `</div>`;
      }
      subContent.innerHTML = html;
    } else {
      if (!selectedCalDayKey) {
        subContent.innerHTML = `<div style="font-size:0.84rem; color:var(--text-muted); text-align:center; padding:8px 0;">Нажмите на день календаря для просмотра задач.</div>`;
      } else {
        const dObj = parseDateKey(selectedCalDayKey);
        const dayTasks = allEntries.filter(e => e.type === 'task' && (typeof taskOccursOnDate === 'function' ? taskOccursOnDate(e, selectedCalDayKey) : e.date === selectedCalDayKey));
        const dayEvts = allEntries.filter(e => e.type === 'event' && (e.isYearly ? e.date.endsWith(formatShortDateKey(dObj)) : e.date === selectedCalDayKey));
        
        let html = `<h4 style="font-size:0.92rem; font-weight:800; margin-bottom:8px;">Задачи на ${formatDisplayDate(selectedCalDayKey)}:</h4>`;
        const total = [...dayEvts, ...dayTasks];
        if (total.length === 0) {
          html += `<div style="font-size:0.84rem; color:var(--text-muted);">На этот день дел нет.</div>`;
        } else {
          html += `<div style="display:flex; flex-direction:column; gap:6px;">`;
          total.forEach(it => {
            html += `<div style="padding:8px 12px; background:var(--input-bg); border:1px solid var(--input-border); border-radius:10px; font-size:0.86rem; font-weight:600;">${escapeHtml(it.title)} ${it.time ? `<small style="color:var(--text-muted);">(${it.time})</small>` : ''}</div>`;
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
    const allHabits = typeof habits !== 'undefined' ? habits : [];

    if (!allHabits || allHabits.length === 0) {
      select.style.display = 'none';
      box.innerHTML = `<div style="font-size:0.84rem; color:var(--text-muted);">Нет созданных привычек. Создайте их в основном разделе привычек.</div>`;
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
    const allHabits = typeof habits !== 'undefined' ? habits : [];
    const habit = allHabits.find(h => h.id === selectedHabitId);
    if (!habit) return;

    habit.doneDates = habit.doneDates || [];
    const y = curDate.getFullYear();
    const m = curDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastD = new Date(y, m + 1, 0).getDate();
    const startDay = (firstDay.getDay() + 6) % 7;
    const todayStr = formatDateKey(new Date());

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
             style="${isDone ? `background:var(--primary); color:#ffffff; font-weight:800;` : ''} ${isFuture ? 'opacity:0.3; cursor:not-allowed;' : ''}">
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
        drawHabitDots(box);
      };
    });
  }

  return {
    openSection: function() {
      initCurrentMonth(); // Принудительно устанавливаем текущий актуальный месяц при каждом входе
      render();
    },
    render: render
  };
})();
