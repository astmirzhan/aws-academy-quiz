// AWS Academy Quiz: plain JavaScript, no build step. Questions come from js/questions.js.
'use strict';

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'awsquiz'; // question id -> 1 (last answer correct) / 0 (wrong)

const state = {
  picked: new Set(['all']),
  list: [],
  idx: 0,
  current: null,
  checked: false,
  selected: new Set(),
  score: 0,
  streak: 0,
  wrong: [],
};

// ---------- helpers ----------
const questionKey = (q) => q.m + ':' + q.q.slice(0, 60) + (q.k || ''); // q.k separates repeated questions
const moduleName = (m) => (MODS.find((x) => x[0] === m) || [m, 'Module ' + m])[1];
const isCorrect = (q, sel) => q.a.length === sel.size && q.a.every((i) => sel.has(i));

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const history = {
  read() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; }
  },
  write(value) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(value)); } catch (e) { /* private mode */ }
  },
};

function show(section) {
  ['setup', 'play', 'end'].forEach((id) => $(id).classList.toggle('hide', id !== section));
}

// ---------- decorative web in the corner ----------
function drawWeb() {
  const R = 400, spokes = 7, rings = 6;
  let d = '';
  const pt = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
  for (let s = 0; s < spokes; s++) {
    const a = (s / (spokes - 1)) * (Math.PI / 2);
    const [x, y] = pt(a, R);
    d += `M0 0L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  for (let r = 1; r <= rings; r++) {
    const rad = (r / rings) * R * 0.95;
    for (let s = 0; s < spokes - 1; s++) {
      const a1 = (s / (spokes - 1)) * (Math.PI / 2);
      const a2 = ((s + 1) / (spokes - 1)) * (Math.PI / 2);
      const [x1, y1] = pt(a1, rad);
      const [x2, y2] = pt(a2, rad);
      const [cx, cy] = pt((a1 + a2) / 2, rad * 0.86); // sag toward the corner
      d += `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
  }
  $('web').innerHTML = `<path d="${d}"/>`;
}

// ---------- setup screen ----------
function selectionPool() {
  const hist = history.read();
  if (state.picked.has('miss')) return QUESTIONS.filter((q) => hist[questionKey(q)] === 0);
  if (state.picked.has('all')) return QUESTIONS.slice();
  return QUESTIONS.filter((q) => state.picked.has(q.m));
}

function makeChip(key, label) {
  const b = document.createElement('button');
  b.className = 'chip';
  b.textContent = label;
  b.setAttribute('aria-pressed', String(state.picked.has(key)));
  b.onclick = () => {
    if (key === 'all' || key === 'miss') {
      state.picked = new Set([key]);
    } else {
      state.picked.delete('all');
      state.picked.delete('miss');
      state.picked.has(key) ? state.picked.delete(key) : state.picked.add(key);
      if (!state.picked.size) state.picked.add('all');
    }
    renderSetup();
  };
  return b;
}

function renderSetup() {
  const hist = history.read();
  const missCount = QUESTIONS.filter((q) => hist[questionKey(q)] === 0).length;
  const box = $('mods');
  box.innerHTML = '';

  box.appendChild(makeChip('all', `All (${QUESTIONS.length})`));
  box.appendChild(makeChip('miss', `My mistakes (${missCount})`));

  const addGroup = (title, test) => {
    const label = document.createElement('p');
    label.className = 'group-label';
    label.textContent = title;
    box.appendChild(label);
    MODS.filter(([m]) => test(m)).forEach(([m, name]) => box.appendChild(makeChip(m, name)));
  };
  addGroup('Cloud Foundations', (m) => m <= 10);
  addGroup('Developer course', (m) => m >= 11);

  const done = QUESTIONS.filter((q) => questionKey(q) in hist).length;
  $('info').textContent = done ? `You have answered ${done} of ${QUESTIONS.length} before. Progress is saved in this browser.` : '';
  $('sub').textContent = `${QUESTIONS.length} questions for AWS Academy exam practice.`;
}

// ---------- quiz ----------
function start(source) {
  const pool = source || selectionPool();
  if (!pool.length) {
    $('info').textContent = 'No questions in this selection yet.';
    return;
  }
  state.list = pool.slice();
  if ($('shuf').checked) shuffle(state.list);
  Object.assign(state, { idx: 0, score: 0, streak: 0, wrong: [] });
  show('play');
  renderQuestion();
}

function keepAnswerOrder(q) {
  // "All of the above" and True/False only make sense in their original order
  return q.o.length === 2 || q.o.some((t) => /^(all|none) of the above/i.test(t));
}

function renderQuestion() {
  const q = state.list[state.idx];
  state.current = q;
  state.checked = false;
  state.selected = new Set();

  const multi = q.a.length > 1;
  let order = q.o.map((text, i) => ({ text, i }));
  if ($('shufo').checked && !keepAnswerOrder(q)) shuffle(order);
  q.order = order;

  $('card').dataset.tag = moduleName(q.m);
  $('pos').textContent = `Question ${state.idx + 1} of ${state.list.length}`;
  updateScoreboard();
  setProgress(state.idx / state.list.length);

  $('qt').textContent = q.q;
  $('qh').textContent = multi ? `Choose ${q.a.length}` : 'Select the best answer';

  const list = $('ol');
  list.innerHTML = '';
  order.forEach((o) => {
    const b = document.createElement('button');
    b.className = 'o' + (multi ? ' multi' : '');
    b.dataset.i = o.i;
    b.innerHTML = '<span class="m"></span><span class="t"></span>';
    b.querySelector('.t').textContent = o.text;
    b.onclick = () => toggle(o.i, multi);
    list.appendChild(b);
  });

  $('fb').className = 'fb hide';
  $('main').textContent = 'Check';
  $('main').disabled = true;
}

function updateScoreboard() {
  $('sc').textContent = `Score: ${state.score}`;
  $('combo').textContent = state.streak >= 2 ? `COMBO x${state.streak}!` : '';
}

function setProgress(fraction) {
  const pct = Math.round(fraction * 100);
  $('pb').style.width = pct + '%';
  $('spider').style.left = Math.max(2, Math.min(98, pct)) + '%';
}

function toggle(i, multi) {
  if (state.checked) return;
  if (multi) {
    state.selected.has(i) ? state.selected.delete(i) : state.selected.add(i);
  } else {
    state.selected = new Set([i]);
  }
  [...$('ol').children].forEach((b) => b.classList.toggle('sel', state.selected.has(+b.dataset.i)));
  $('main').disabled = state.selected.size === 0;
}

function burst(text, bad) {
  const el = $('pop');
  el.textContent = text;
  el.className = bad ? 'bad' : '';
  void el.offsetWidth; // restart the animation
  el.classList.add('go');
}

function check() {
  const q = state.current;
  state.checked = true;
  const right = isCorrect(q, state.selected);

  [...$('ol').children].forEach((b) => {
    const i = +b.dataset.i;
    b.disabled = true;
    b.classList.remove('sel');
    if (q.a.includes(i)) b.classList.add(state.selected.has(i) ? 'ok' : 'miss');
    else if (state.selected.has(i)) b.classList.add('bad', 'shake');
  });

  if (right) {
    state.score++;
    state.streak++;
    burst(['POW!', 'BAM!', 'ZAP!', 'THWIP!'][Math.floor(Math.random() * 4)], false);
  } else {
    state.streak = 0;
    state.wrong.push(q);
    burst(['OOPS!', 'MISSED!'][Math.floor(Math.random() * 2)], true);
  }

  const hist = history.read();
  hist[questionKey(q)] = right ? 1 : 0;
  history.write(hist);

  const fb = $('fb');
  fb.className = 'fb ' + (right ? 'ok' : 'bad');
  fb.innerHTML = '';
  const title = document.createElement('strong');
  title.textContent = right ? 'Correct!' : 'Not quite.';
  fb.appendChild(title);
  if (q.n) {
    const note = document.createElement('span');
    note.textContent = q.n;
    fb.appendChild(note);
  }

  updateScoreboard();
  setProgress((state.idx + 1) / state.list.length);
  $('main').textContent = state.idx === state.list.length - 1 ? 'Finish' : 'Next';
}

function next() {
  if (state.idx === state.list.length - 1) return finish();
  state.idx++;
  renderQuestion();
}

function rankFor(percent) {
  if (percent >= 90) return 'SPIDER-GENIUS!';
  if (percent >= 70) return 'WEB-SLINGER!';
  if (percent >= 50) return 'NEIGHBORHOOD HERO';
  return 'BACK TO THE LAB';
}

function finish() {
  show('end');
  const total = state.list.length;
  const percent = Math.round((state.score / total) * 100);
  $('rank').textContent = rankFor(percent);
  $('es').textContent = `${state.score} / ${total}`;
  $('et').textContent = state.wrong.length ? `${percent}%. Review the ${state.wrong.length} you missed:` : 'Flawless run!';

  const ul = $('wl');
  ul.innerHTML = '';
  state.wrong.forEach((q) => {
    const li = document.createElement('li');
    li.textContent = q.q;
    const small = document.createElement('small');
    small.textContent = 'Answer: ' + q.a.map((i) => q.o[i]).join(' | ');
    li.appendChild(small);
    ul.appendChild(li);
  });
  $('again').classList.toggle('hide', !state.wrong.length);
}

function backToMenu() {
  show('setup');
  renderSetup();
}

// ---------- wiring ----------
$('go').onclick = () => start();
$('main').onclick = () => (state.checked ? next() : check());
$('quit').onclick = backToMenu;
$('home').onclick = backToMenu;
$('again').onclick = () => start(state.wrong.slice());

document.addEventListener('keydown', (e) => {
  if ($('play').classList.contains('hide')) return;
  if (e.key === 'Enter' && !$('main').disabled) {
    e.preventDefault();
    $('main').click();
    return;
  }
  const n = parseInt(e.key, 10);
  const q = state.current;
  if (n >= 1 && q && q.order[n - 1]) toggle(q.order[n - 1].i, q.a.length > 1);
});

drawWeb();
renderSetup();
