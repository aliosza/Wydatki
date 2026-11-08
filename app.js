/* Spokojny budżet — logika aplikacji. Dane trzymane w localStorage. */
'use strict';

const KEY = 'spokojny-budzet-v1';
const $ = (id) => document.getElementById(id);
const zl = (n) => (Math.round(n * 100) / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';

/* ---------- Stan ---------- */
const defaults = {
  income: 0,
  pct: { fixed: 50, goals: 10, daily: 25, fun: 5 }, // reszta (10%) = oszczędności
  week: Math.min(4, Math.floor((new Date().getDate() - 1) / 7) + 1),
  spends: [],   // {id, week, amount, note, type: 'daily'|'fun'}
  wishes: [],   // {id, name, price, link, unlockAt}
  rescued: 0,   // suma zachcianek, z których zrezygnowano
  freeDays: [], // dni oznaczone jako "nic nie kupiono" (RRRR-MM-DD)
  ui: { calm: false, large: false, still: false },
};
let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved ? { ...defaults, ...saved, pct: { ...defaults.pct, ...saved.pct }, ui: { ...defaults.ui, ...saved.ui } } : structuredClone(defaults);
  } catch { return structuredClone(defaults); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* np. tryb prywatny */ }
}

/* ---------- Pomocnicze ---------- */
const num = (v) => Math.max(0, parseFloat(String(v).replace(',', '.')) || 0);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function el(tag, text, cls) {           // bezpieczne tworzenie elementów (bez innerHTML)
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };

/* ---------- Zakładki i motyw ---------- */
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === b));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === b.dataset.tab));
}));

const root = document.documentElement;
const savedTheme = localStorage.getItem('spokojny-theme');
if (savedTheme) root.dataset.theme = savedTheme;
$('themeBtn').addEventListener('click', () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  localStorage.setItem('spokojny-theme', root.dataset.theme);
});

/* ---------- Pulpit ---------- */
const LABELS = { fixed: 'Stałe opłaty', goals: 'Cele specjalne', daily: 'Codzienne życie', fun: 'Kieszonkowe na dopaminę' };

function buildSplit() {
  const box = $('split');
  Object.keys(LABELS).forEach((k) => {
    const row = el('div', undefined, 'split-row');
    const name = el('span', LABELS[k]);
    const inp = el('input'); inp.type = 'number'; inp.min = 0; inp.max = 100; inp.value = state.pct[k];
    inp.setAttribute('aria-label', 'Procent: ' + LABELS[k]);
    inp.addEventListener('input', () => { state.pct[k] = num(inp.value); save(); renderDashboard(); renderWeek(); });
    const amt = el('span', '', 'amt'); amt.id = 'amt-' + k;
    row.append(name, inp, amt);
    box.append(row);
  });
}

function renderDashboard() {
  const used = Object.values(state.pct).reduce((a, b) => a + b, 0);
  const savePct = 100 - used;
  Object.keys(LABELS).forEach((k) => { $('amt-' + k).textContent = zl(state.income * state.pct[k] / 100); });
  $('savingsAmount').textContent = zl(Math.max(0, state.income * savePct / 100));
  $('savingsAmount').style.color = savePct < 0 ? 'var(--over)' : '';
  $('savingsPct').textContent = savePct < 0
    ? `Przekroczono 100% o ${-savePct}%. Zmniejsz któryś próg.`
    : `${savePct}% wypłaty`;
  $('rescued').textContent = zl(state.rescued);
  renderExtras();
}
$('income').value = state.income || '';
$('income').addEventListener('input', () => { state.income = num($('income').value); save(); renderDashboard(); renderWeek(); });

/* ---------- Tygodnie ---------- */
const weekPool = () => state.income * (state.pct.daily + state.pct.fun) / 100 / 4;
const weekSpent = (w) => state.spends.filter((s) => s.week === w).reduce((a, s) => a + s.amount, 0);

function buildWeekPicker() {
  const box = $('weekPicker');
  for (let w = 1; w <= 4; w++) {
    const b = el('button', 'Tydz. ' + w); b.dataset.w = w;
    b.addEventListener('click', () => { state.week = w; save(); renderWeek(); });
    box.append(b);
  }
}

function renderWeek() {
  const w = state.week, pool = weekPool(), left = pool - weekSpent(w);
  document.querySelectorAll('#weekPicker button').forEach((b) => b.classList.toggle('active', +b.dataset.w === w));
  $('weekTitle').textContent = `Zostało w tygodniu ${w} (pula ${zl(pool)})`;
  $('weekLeft').textContent = zl(left);

  const ratio = pool > 0 ? Math.max(0, left) / pool : 0;
  const level = left < 0 ? 'danger' : ratio <= 0.25 ? 'warn' : '';
  $('weekBar').style.width = (ratio * 100) + '%';
  $('weekBar').parentElement.className = 'bar ' + level;
  const msg = $('weekMsg');
  msg.className = 'msg ' + level;
  msg.textContent = pool <= 0 ? 'Wpisz wypłatę na Pulpicie, żeby zobaczyć limit.'
    : left < 0 ? `Limit przekroczony o ${zl(-left)}. Wstrzymaj wydatki do końca tygodnia.`
    : ratio <= 0.25 ? 'Zostało mniej niż 25% puli. Zwolnij.'
    : 'W normie. Masz zapas.';

  const list = $('spList'); list.replaceChildren();
  state.spends.filter((s) => s.week === w).reverse().forEach((s) => {
    const li = el('li');
    li.append(el('span', `${s.note || 'Wydatek'} (${s.type === 'fun' ? 'przyjemność' : 'codzienne'})`));
    const right = el('span'); right.append(el('span', zl(s.amount) + ' '));
    const del = el('button', 'Usuń', 'link-btn');
    del.addEventListener('click', () => { state.spends = state.spends.filter((x) => x.id !== s.id); save(); renderWeek(); });
    right.append(del); li.append(right); list.append(li);
  });
  renderExtras();
}

$('spAdd').addEventListener('click', () => {
  const amount = num($('spAmount').value);
  if (!amount) return $('spAmount').focus();
  state.spends.push({ id: uid(), week: state.week, date: dayKey(), amount, note: $('spNote').value.trim(), type: $('spType').value });
  $('spAmount').value = ''; $('spNote').value = '';
  save(); renderWeek();
});

/* ---------- Blokada impulsów ---------- */
function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return (d ? d + ' d ' : '') + `${p(h)}:${p(m)}:${p(sec)}`;
}

/* Przeliczenie ceny na godziny pracy (zakładamy 160 h w miesiącu) i udział w puli tygodnia */
function effort(price) {
  if (!state.income || !price) return '';
  const h = price / (state.income / 160), pool = weekPool();
  return `To ok. ${h < 10 ? h.toFixed(1) : Math.round(h)} h pracy` + (pool ? `, ${Math.round(price / pool * 100)}% tygodniowej puli.` : '.');
}
$('wPrice').addEventListener('input', () => { $('wEffort').textContent = effort(num($('wPrice').value)); });

$('wAdd').addEventListener('click', () => {
  const name = $('wName').value.trim();
  if (!name) return $('wName').focus();
  state.wishes.push({
    id: uid(), name, price: num($('wPrice').value), link: safeUrl($('wLink').value.trim()),
    reason: $('wReason').value, want: Number($('wWant').value), wantNow: null,
    unlockAt: Date.now() + Number($('wLock').value) * 3600 * 1000,
  });
  ['wName', 'wPrice', 'wLink'].forEach((id) => { $(id).value = ''; });
  $('wEffort').textContent = '';
  save(); renderWishes();
});

function renderWishes() {
  const list = $('wList'); list.replaceChildren();
  if (!state.wishes.length) list.append(el('p', 'Nic nie czeka. Gdy najdzie Cię ochota na zakup, wpisz ją tutaj.', 'hint'));
  state.wishes.forEach((w) => {
    const card = el('li', undefined, 'wish'); card.dataset.id = w.id;
    const head = el('div', undefined, 'head');
    head.append(el('span', w.name), el('span', zl(w.price)));
    card.append(head, el('p', `Powód: ${w.reason || '-'}. Chęć na starcie: ${w.want || '-'}/5.`, 'hint'));
    const ef = effort(w.price); if (ef) card.append(el('p', ef, 'hint'));
    if (w.link) { const a = el('a', 'Otwórz link'); a.href = w.link; a.target = '_blank'; a.rel = 'noopener noreferrer'; card.append(a); }
    card.append(el('div', '', 'timer'));

    // Po upływie czasu: porównaj chęć teraz z chęcią na starcie
    const now = el('div', undefined, 'now'); now.hidden = true;
    const sel = el('select'); sel.setAttribute('aria-label', 'Jak mocno chcesz tego teraz');
    const ph = el('option', 'Jak mocno chcesz tego teraz?'); ph.value = ''; sel.append(ph);
    for (let i = 1; i <= 5; i++) { const o = el('option', `Chęć ${i} z 5`); o.value = i; sel.append(o); }
    sel.value = w.wantNow ?? '';
    sel.addEventListener('change', () => { w.wantNow = sel.value ? Number(sel.value) : null; save(); });
    now.append(sel); card.append(now);

    const btns = el('div', undefined, 'btns');
    const buy = el('button', 'Kupuję', 'primary'); buy.disabled = true;
    buy.addEventListener('click', () => {
      if (Date.now() < w.unlockAt) return;
      state.spends.push({ id: uid(), week: state.week, date: dayKey(), amount: w.price, note: w.name, type: 'fun' });
      state.wishes = state.wishes.filter((x) => x.id !== w.id); save(); renderWishes(); renderWeek();
    });
    const skip = el('button', 'Rezygnuję', 'primary');
    skip.addEventListener('click', () => {
      state.rescued += w.price; state.wishes = state.wishes.filter((x) => x.id !== w.id);
      save(); renderWishes(); renderDashboard();
    });
    btns.append(buy, skip); card.append(btns); list.append(card);
  });
  tick();
}

/* Co sekundę odświeża liczniki i odblokowuje przyciski po upływie czasu */
function tick() {
  state.wishes.forEach((w) => {
    const card = document.querySelector(`.wish[data-id="${w.id}"]`);
    if (!card) return;
    const left = w.unlockAt - Date.now(), timer = card.querySelector('.timer'), buy = card.querySelector('button');
    timer.textContent = left > 0 ? 'Odblokuje się za ' + fmtTime(left) : 'Czas minął. Czy nadal tego chcesz?';
    timer.classList.toggle('done', left <= 0);
    buy.disabled = left > 0;
    card.querySelector('.now').hidden = left > 0;
  });
}
setInterval(tick, 1000);

/* ---------- Daty, szybki wydatek, przycisk "TERAZ" ---------- */
const pad = (n) => String(n).padStart(2, '0');
function dayKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const calWeek = () => Math.min(4, Math.floor((new Date().getDate() - 1) / 7) + 1);

const quick = $('quick');
function openQuick() { $('qAmount').value = ''; quick.showModal(); $('qAmount').focus(); }
$('fab').addEventListener('click', openQuick);
$('qCancel').addEventListener('click', () => quick.close());
// Jedno tapnięcie w kategorię zapisuje wydatek
quick.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
  const amount = num($('qAmount').value);
  if (!amount) return $('qAmount').focus();
  state.spends.push({ id: uid(), week: calWeek(), date: dayKey(), amount, note: '', type: b.dataset.type });
  save(); quick.close(); renderWeek();
}));

$('panic').addEventListener('click', () => {
  document.querySelector('[data-tab="zachcianki"]').click();
  $('wName').focus();
});

/* ---------- Wieczorny baner, seria, podsumowanie ---------- */
$('evNone').addEventListener('click', () => { state.freeDays.push(dayKey()); save(); renderExtras(); });
$('evAdd').addEventListener('click', openQuick);

// Seria: kolejne dni z wpisem (lub "nic dziś") bez wydatku typu przyjemność
function calcStreak() {
  let n = 0; const d = new Date();
  for (let i = 0; i < 365; i++, d.setDate(d.getDate() - 1)) {
    const k = dayKey(d), sp = state.spends.filter((s) => s.date === k);
    if (!sp.length && !state.freeDays.includes(k)) { if (i === 0) continue; break; } // dzisiejszy brak wpisu nie przerywa serii
    if (sp.some((s) => s.type === 'fun')) break;
    n++;
  }
  return n;
}

function renderExtras() {
  const t = dayKey();
  const logged = state.freeDays.includes(t) || state.spends.some((s) => s.date === t);
  $('eveningCard').hidden = logged || new Date().getHours() < 18;
  $('streak').textContent = calcStreak();

  const fun = state.spends.filter((s) => s.type === 'fun').reduce((a, s) => a + s.amount, 0);
  const hardest = [1, 2, 3, 4].map((w) => [w, weekSpent(w)]).sort((a, b) => b[1] - a[1])[0];
  const rows = [
    `Na przyjemności: ${zl(fun)} z ${zl(state.income * state.pct.fun / 100)}`,
    `Uratowane przed impulsem: ${zl(state.rescued)}`,
  ];
  if (hardest[1] > 0) rows.push(`Najdroższy tydzień: ${hardest[0]} (${zl(hardest[1])})`);
  const ul = $('summary'); ul.replaceChildren();
  rows.forEach((r) => ul.append(el('li', r)));
}

/* ---------- Ustawienia komfortu ---------- */
[['calm', 'uiCalm'], ['large', 'uiLarge'], ['still', 'uiStill']].forEach(([k, id]) => {
  $(id).checked = state.ui[k]; root.classList.toggle(k, state.ui[k]);
  $(id).addEventListener('change', () => { state.ui[k] = $(id).checked; save(); root.classList.toggle(k, state.ui[k]); });
});

/* ---------- Kopia danych i nowy miesiąc ---------- */
$('exp').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  a.download = `spokojny-budzet-${dayKey()}.json`; a.click(); URL.revokeObjectURL(a.href);
});
$('imp').addEventListener('change', async (e) => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    if (typeof d.income !== 'number' || !Array.isArray(d.spends) || !Array.isArray(d.wishes)) throw new Error();
    if (!confirm('Zastąpić obecne dane danymi z pliku?')) return;
    state = { ...defaults, ...d, pct: { ...defaults.pct, ...d.pct }, ui: { ...defaults.ui, ...d.ui } };
    save(); location.reload();
  } catch { alert('To nie jest poprawny plik kopii z tej aplikacji.'); }
});
$('newMonth').addEventListener('click', () => {
  if (!confirm('Wyczyścić wydatki i dni bez zakupów? Zachcianki i uratowana kwota zostają. Zrób wcześniej eksport.')) return;
  state.spends = []; state.freeDays = []; save(); renderWeek(); renderDashboard();
});

/* ---------- Start ---------- */
buildSplit(); buildWeekPicker();
renderDashboard(); renderWeek(); renderWishes();
