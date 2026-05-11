/* -------------------------------------------------
   Planner‑Cat 2026‑2035 – Dark Theme + Glassmorphism
------------------------------------------------- */

const STATE = {
    year: 2026,
    month: new Date().getMonth(),
    selectedDate: new Date(),
    tasks: {}                     // {"2026-03-15":[{text,done,time,repeat,tag},...] }
};

const MIN_YEAR = 2026;
const MAX_YEAR = 2035;

/* ---------- Утилиты ---------- */
function pad(n) { return n < 10 ? '0' + n : n; }
function fmt(date) { return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }

function load() { const raw = localStorage.getItem('plannerCatTasks'); if (raw) STATE.tasks = JSON.parse(raw); }
function save() { localStorage.setItem('plannerCatTasks', JSON.stringify(STATE.tasks)); }

/* ---------- Перенос невыполненных задач ---------- */
function rollOverPending() {
    const today = fmt(new Date());
    if (localStorage.getItem('plannerCatLastRoll') === today) return;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yStr = fmt(yesterday);
    const pending = STATE.tasks[yStr];
    if (pending && pending.some(t => !t.done)) {
        const toMove = pending.filter(t => !t.done);
        STATE.tasks[yStr] = pending.filter(t => t.done);
        const tomorrow = fmt(new Date(yesterday.getTime() + 86400000));
        if (!STATE.tasks[tomorrow]) STATE.tasks[tomorrow] = [];
        STATE.tasks[tomorrow].push(...toMove);
        save();
    }
    localStorage.setItem('plannerCatLastRoll', today);
}

/* ---------- Рендер календаря ---------- */
function renderCalendar() {
    const label = document.getElementById('monthLabel');
    const tbody = document.querySelector('#calendarTable tbody');
    tbody.innerHTML = '';

    const first = new Date(STATE.year, STATE.month, 1);
    const startDow = (first.getDay() + 6) % 7; // 0 = Monday
    const days = new Date(STATE.year, STATE.month + 1, 0).getDate();

    label.textContent = first.toLocaleString('ru', { month: 'long', year: 'numeric' });

    let d = 1;
    for (let wk = 0; wk < 6; wk++) {
        const tr = document.createElement('tr');
        for (let i = 0; i < 7; i++) {
            const td = document.createElement('td');
            if (wk === 0 && i < startDow) { td.className = 'empty'; tr.appendChild(td); continue; }
            if (d > days) { td.className = 'empty'; tr.appendChild(td); continue; }

            const cur = new Date(STATE.year, STATE.month, d);
            const iso = fmt(cur);
            td.textContent = d;
            td.dataset.date = iso;

            const today = new Date();
            if (cur.toDateString() === today.toDateString()) td.classList.add('today');
            if (STATE.selectedDate && iso === fmt(STATE.selectedDate)) td.classList.add('selected');
            if (STATE.tasks[iso] && STATE.tasks[iso].length) td.classList.add('has-tasks');

            td.addEventListener('click', () => selectDate(iso));
            tr.appendChild(td);
            d++;
        }
        tbody.appendChild(tr);
        if (d > days) break;
    }

    document.getElementById('prevMonth').disabled = (STATE.year === MIN_YEAR && STATE.month === 0);
    document.getElementById('nextMonth').disabled = (STATE.year === MAX_YEAR && STATE.month === 11);

    renderTaskPanel();
    updateCatState();
}

/* ---------- Выбор даты ---------- */
function selectDate(iso) {
    const [y,m,day] = iso.split('-').map(Number);
    STATE.selectedDate = new Date(y, m-1, day);
    renderCalendar();
}

/* ---------- Список задач ---------- */
function renderTaskPanel() {
    const list = document.getElementById('taskList');
    list.innerHTML = '';

    if (!STATE.selectedDate) return;
    const iso = fmt(STATE.selectedDate);
    const filter = document.getElementById('filterSelect').value;
    const dayTasks = (STATE.tasks[iso] || []).filter(t => !filter || t.tag === filter);

    dayTasks.forEach((t,i) => {
        const li = document.createElement('li');
        li.className = t.done ? 'completed' : '';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = t.done;
        cb.addEventListener('change', () => {
            t.done = cb.checked; save(); renderTaskPanel(); renderCalendar();
        });

        const label = document.createElement('label');

        if (t.time) {
            const timeSpan = document.createElement('span');
            timeSpan.textContent = `⏰ ${t.time}`;
            timeSpan.style.fontSize = '.85rem';
            timeSpan.style.color = '#bbb';
            label.append(timeSpan, ' ');
        }

        label.append(t.text);

        if (t.tag) {
            const tagEl = document.createElement('span');
            tagEl.textContent = ` #${t.tag}`;
            tagEl.style.fontSize = '.75rem';
            tagEl.style.color = '#ffca28';
            label.append(tagEl);
        }

        const del = document.createElement('button');
        del.textContent = '✕';
        del.style.background = 'transparent';
        del.style.border = 'none';
        del.style.cursor = 'pointer';
        del.addEventListener('click', () => {
            STATE.tasks[iso].splice(i,1);
            if (!STATE.tasks[iso].length) delete STATE.tasks[iso];
            save(); renderTaskPanel(); renderCalendar();
        });

        li.append(cb, label, del);
        list.appendChild(li);
    });
}

/* ---------- Добавление задачи (модальное окно) ---------- */
document.getElementById('addTaskBtn').addEventListener('click', () => {
    document.getElementById('taskModal').classList.remove('hidden');
    document.getElementById('taskText').value = '';
    document.getElementById('taskTime').value = '';
    document.getElementById('taskRepeat').value = '';
    document.getElementById('taskTag').value = '';
});

/* ---------- Сохранить задачу ---------- */
document.getElementById('saveTaskBtn').addEventListener('click', () => {
    const txt   = document.getElementById('taskText').value.trim();
    if (!txt) return;
    const iso   = fmt(STATE.selectedDate);
    const time  = document.getElementById('taskTime').value;
    const repeat= document.getElementById('taskRepeat').value;
    const tag   = document.getElementById('taskTag').value.trim();

    if (!STATE.tasks[iso]) STATE.tasks[iso] = [];
    STATE.tasks[iso].push({ text:txt, done:false, time, repeat, tag });
    if (tag) addTagOption(tag);
    save();
    renderTaskPanel(); renderCalendar();
    document.getElementById('taskModal').classList.add('hidden');
});

/* ---------- Месяцы ---------- */
document.getElementById('prevMonth').addEventListener('click', () => {
    if (STATE.month === 0) { if (STATE.year > MIN_YEAR) { STATE.year--; STATE.month = 11; } }
    else STATE.month--;
    renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
    if (STATE.month === 11) { if (STATE.year < MAX_YEAR) { STATE.year++; STATE.month = 0; } }
    else STATE.month++;
    renderCalendar();
});

/* ---------- Кот и его состояния ---------- */
function updateCatState() {
    const catImg = document.getElementById('catImg');
    const catTxt = document.getElementById('catState');
    const today = fmt(new Date());
    const todayTasks = STATE.tasks[today] || [];

    const total   = todayTasks.length;
    const done    = todayTasks.filter(t=>t.done).length;
    const percent = total ? (done/total)*100 : 0;

    let img='cat-normal.png', txt='Нормальный кот';
    if (total===0) { /* оставляем нормальный */ }
    else if (percent===100) { img='cat-happy2.png'; txt='Счастливый кот 2'; }
    else if (percent>0 && percent<100) { img='cat-happy1.png'; txt='Счастливый кот 1'; }
    else if (percent===0 && total>0) { img='cat-sad2.png'; txt='Грустный кот 2 (меньше 10 % выполнено)'; }
    else { img='cat-sad1.png'; txt='Грустный кот 1'; }

    catImg.src = img;
    catTxt.textContent = txt;
}

/* ---------- Инструкция ---------- */
const helpModal = document.getElementById('helpModal');
document.getElementById('showHelp').addEventListener('click', () => helpModal.classList.remove('hidden'));
document.getElementById('closeHelp').addEventListener('click', () => helpModal.classList.add('hidden'));
window.addEventListener('click', e=>{ if(e.target===helpModal) helpModal.classList.add('hidden'); });

/* ---------- Окно задачи ---------- */
document.getElementById('closeTask').addEventListener('click', () => {
    document.getElementById('taskModal').classList.add('hidden');
});
window.addEventListener('click', e=>{ if(e.target===document.getElementById('taskModal')) document.getElementById('taskModal').classList.add('hidden'); });

/* ---------- Теги/фильтры ---------- */
function addTagOption(tag){
    const sel=document.getElementById('filterSelect');
    if([...sel.options].some(o=>o.value===tag))return;
    const opt=document.createElement('option');
    opt.value=tag; opt.textContent=`#${tag}`;
    sel.appendChild(opt);
}
document.getElementById('filterSelect').addEventListener('change', renderTaskPanel);

/* ---------- Инициализация ---------- */
load();
rollOverPending();
renderCalendar();
