/* Движок теста.
   Правила:
   - вопросы идут по одному, варианты перемешаны;
   - ответил верно  -> вопрос уходит из круга навсегда;
   - ответил неверно -> сразу показываем разбор с правильным ответом,
     а сам вопрос возвращается в очередь на случайное место среди оставшихся;
   - тест заканчивается, только когда на все вопросы дан верный ответ. */

const STORE_KEY = 'ms-history-6-progress';
const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];

/* Похвала, когда тест пройден без единой ошибки */
const PRAISE_CLEAN = [
  'Весь параграф — с первого раза и без ошибок. Так знают материал по-настоящему.',
  'Ни одного промаха за весь тест. Это отличная подготовка!',
  'Чисто пройденный параграф. Ты действительно выучил тему.'
];

/* Похвала, когда ошибки были, но всё в итоге доведено до верного ответа */
const PRAISE_AFTER_MISTAKES = [
  'Ты не бросил ни один сложный вопрос и довёл каждый до правильного ответа.',
  'Все вопросы в итоге разобраны верно — а это и значит «выучил».',
  'Ошибки были, но ты вернулся к каждой и справился. Так и работает учёба.'
];

/* Мемные реакции */

const MEME_RIGHT = [
  { e: '💯', t: 'Инфа сотка' },
  { e: '🧠', t: 'Мозг работает на 200%' },
  { e: '😎', t: 'Изи катка' },
  { e: '🎩', t: 'Историк в здании' },
  { e: '🔥', t: 'Это было красиво' },
  { e: '🐐', t: 'Ты легенда' },
  { e: '📚', t: 'Учебник доволен' },
  { e: '⚔️', t: 'Вопрос повержен' },
  { e: '🚀', t: 'Летим дальше' },
  { e: '🤓', t: 'Достоверно. Подтверждено' }
];

const MEME_WRONG = [
  { e: '🙈', t: 'Ой... ну бывает' },
  { e: '🎯', t: 'Мимо!' },
  { e: '📖', t: 'Учебник: «я же там написал...»' },
  { e: '😅', t: 'Не в этот раз' },
  { e: '🧲', t: 'Так, сейчас запомним намертво' },
  { e: '💾', t: 'Ошибка сохранена в память' },
  { e: '🛠️', t: 'Чиним знания прямо сейчас' },
  { e: '🐛', t: 'Баг в знаниях найден' },
  { e: '🤔', t: 'Почти. Но нет' }
];

const MEME_FINISH = [
  { e: '🏆', t: 'GG! Параграф пройден' },
  { e: '🎖️', t: 'Ачивка получена' },
  { e: '⚔️', t: 'Параграф повержен' },
  { e: '👑', t: 'Корона твоя' }
];

const CONFETTI_GOOD = ['🎉', '⭐', '🔥', '💯', '🏅', '✨', '🎊', '👑'];
const CONFETTI_BAD = ['😵‍💫', '🌀', '💥', '🫠', '😬'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const state = {
  book: null,
  meta: null,
  queue: [],
  total: 0,
  learned: 0,
  mistakes: 0,
  startedAt: Date.now(),
  current: null,
  answered: false
};

/* ---------- утилиты ---------- */

function $(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function plural(n, one, few, many) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

/* Дождь из эмодзи — топорно, зато весело */
function confetti(emojis, count) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let layer = document.getElementById('confetti');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'confetti';
    document.body.appendChild(layer);
  }

  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.textContent = pick(emojis);
    s.style.left = Math.random() * 96 + '%';
    s.style.fontSize = (20 + Math.random() * 22) + 'px';
    const dur = 1.6 + Math.random() * 1.4;
    s.style.animationDuration = dur + 's';
    s.style.animationDelay = (Math.random() * .4) + 's';
    layer.appendChild(s);
    setTimeout(() => s.remove(), (dur + .6) * 1000);
  }
}

function markDone(id) {
  try {
    const all = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    all[id] = { done: true, at: Date.now(), mistakes: state.mistakes };
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch (e) { /* приватный режим — просто не сохраняем */ }
}

/* ---------- аудиопересказ ---------- */

function renderAudio(meta) {
  if (!meta.audio) return;
  const box = $('audio-box');
  if (!box) return;
  box.innerHTML = `
    <div class="audio-card">
      <p class="audio-title">🎧 Сначала послушай пересказ</p>
      <p class="audio-hint">Короткий рассказ по всему параграфу — после него на вопросы отвечать намного легче.</p>
      <audio controls preload="none" src="${escapeHtml(meta.audio)}"></audio>
    </div>`;
  box.hidden = false;
}

/* ---------- прогресс ---------- */

function updateProgress() {
  $('progress-wrap').hidden = false;
  const left = state.total - state.learned;
  $('p-left').textContent = left > 0
    ? `Осталось выучить: ${left} ${plural(left, 'вопрос', 'вопроса', 'вопросов')}`
    : 'Все вопросы разобраны';
  $('p-done').textContent = `${state.learned} / ${state.total}`;
  $('p-bar').style.width = (state.learned / state.total * 100) + '%';
}

/* ---------- очередь ---------- */

/** Вернуть вопрос в очередь на случайное место среди оставшихся (не первым). */
function requeue(item) {
  const n = state.queue.length;
  if (n === 0) {
    state.queue.push(item);
    return;
  }
  // от 1 до n — чтобы вопрос не выпал сразу же следующим, если есть выбор
  const min = n >= 2 ? 1 : 0;
  const pos = min + Math.floor(Math.random() * (n - min + 1));
  state.queue.splice(pos, 0, item);
}

/* ---------- отрисовка ---------- */

function renderQuestion() {
  if (state.queue.length === 0) return renderFinish();

  const item = state.queue.shift();
  state.current = item;
  state.answered = false;

  const order = shuffle(item.q.options.map((text, i) => ({ text, correct: i === item.q.correct })));
  item.order = order;

  const tag = item.seen > 0
    ? '<p class="repeat-tag">Этот вопрос уже был — попробуй ещё раз</p>'
    : '';

  const opts = order.map((o, i) => `
    <button class="opt" data-i="${i}" type="button">
      <span class="letter">${LETTERS[i]}</span>
      <span class="otext">${escapeHtml(o.text)}</span>
    </button>`).join('');

  $('stage').innerHTML = `
    <div class="card">
      ${tag}
      <p class="question">${escapeHtml(item.q.q)}</p>
      <div class="options" id="options">${opts}</div>
      <div id="feedback"></div>
      <div class="actions" id="actions"></div>
    </div>`;

  $('options').querySelectorAll('.opt').forEach(btn => {
    btn.addEventListener('click', () => answer(parseInt(btn.dataset.i, 10)));
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function answer(idx) {
  if (state.answered) return;
  state.answered = true;

  const item = state.current;
  const order = item.order;
  const chosen = order[idx];
  const correctIdx = order.findIndex(o => o.correct);
  const isRight = chosen.correct;

  item.seen++;

  const buttons = $('options').querySelectorAll('.opt');
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === correctIdx) b.classList.add('is-correct');
    else if (i === idx) b.classList.add('is-wrong');
    else b.classList.add('dim');
  });

  const why = item.q.explain ? `<p>${escapeHtml(item.q.explain)}</p>` : '';
  const card = document.querySelector('.card');

  if (isRight) {
    state.learned++;
    const meme = pick(MEME_RIGHT);
    if (card) card.classList.add('answered-right');
    confetti(CONFETTI_GOOD, 14);
    $('feedback').innerHTML = `
      <div class="feedback good">
        <p class="fb-title"><span class="fb-icon">${meme.e}</span> Верно! ${escapeHtml(meme.t)}</p>
        ${why}
      </div>`;
  } else {
    state.mistakes++;
    requeue(item);
    const meme = pick(MEME_WRONG);
    if (card) card.classList.add('answered-wrong');
    confetti(CONFETTI_BAD, 6);
    $('feedback').innerHTML = `
      <div class="feedback bad">
        <p class="fb-title"><span class="fb-icon">${meme.e}</span> ${escapeHtml(meme.t)}</p>
        <p>Ты выбрал: <span class="answer">${escapeHtml(chosen.text)}</span></p>
        <p>Правильный ответ: <span class="answer">${escapeHtml(order[correctIdx].text)}</span></p>
        ${why}
        <p class="again">Этот вопрос вернётся ещё раз — чуть позже, среди других.</p>
      </div>`;
  }

  updateProgress();

  const last = state.queue.length === 0;
  $('actions').innerHTML =
    `<button class="btn" id="next" type="button">${last ? 'Посмотреть результат' : 'Дальше'}</button>`;
  $('next').addEventListener('click', renderQuestion);
  $('next').focus();
}

function renderFinish() {
  markDone(state.meta.id);
  $('progress-wrap').hidden = true;

  const minutes = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));
  const flawless = state.mistakes === 0;
  const meme = flawless ? { e: '🏆', t: 'Идеально! Ни одной ошибки' } : pick(MEME_FINISH);
  const praise = pick(flawless ? PRAISE_CLEAN : PRAISE_AFTER_MISTAKES);

  confetti(CONFETTI_GOOD, 45);
  setTimeout(() => confetti(CONFETTI_GOOD, 25), 700);

  $('stage').innerHTML = `
    <div class="card finish">
      <div class="emoji">${meme.e}</div>
      <h2>${escapeHtml(meme.t)}!</h2>
      <p class="praise">${praise}</p>
      <div class="stats">
        <div class="stat"><b>${state.total}</b><span>${plural(state.total, 'вопрос', 'вопроса', 'вопросов')}</span></div>
        <div class="stat"><b>${state.mistakes}</b><span>${plural(state.mistakes, 'ошибка', 'ошибки', 'ошибок')}</span></div>
        <div class="stat"><b>${minutes}</b><span>${plural(minutes, 'минута', 'минуты', 'минут')}</span></div>
      </div>
      <div class="actions" style="justify-content:center">
        <a class="btn" href="index.html">Выбрать следующий параграф</a>
        <button class="btn ghost" id="retry" type="button">Пройти ещё раз</button>
      </div>
    </div>`;

  $('retry').addEventListener('click', () => location.reload());
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- запуск ---------- */

function findParagraph(book, id) {
  for (const ch of book.chapters) {
    for (const p of ch.paragraphs) {
      if (p.id === id) return { ...p, chapter: ch };
    }
  }
  return null;
}

function fail(msg) {
  $('q-title').textContent = 'Не получилось открыть тест';
  $('stage').innerHTML = `<p class="error">${escapeHtml(msg)}<br><a href="index.html">Вернуться к списку параграфов</a></p>`;
}

const id = new URLSearchParams(location.search).get('p');

if (!id) {
  fail('Не указан параграф.');
} else {
  fetch('data/index.json')
    .then(r => r.json())
    .then(book => {
      state.book = book;
      const meta = findParagraph(book, id);
      if (!meta) throw new Error('Такого параграфа нет в учебнике.');
      state.meta = meta;

      $('q-title').textContent = `${meta.num}. ${meta.title}`;
      $('q-sub').textContent = meta.chapter.roman
        ? `Глава ${meta.chapter.roman}. ${meta.chapter.title}`
        : meta.chapter.title;
      document.title = `${meta.num} — тест`;
      renderAudio(meta);

      return fetch(`data/q/${encodeURIComponent(id)}.json`);
    })
    .then(r => {
      if (!r.ok) throw new Error('Вопросы к этому параграфу пока не готовы.');
      return r.json();
    })
    .then(data => {
      const qs = data.questions || [];
      if (!qs.length) throw new Error('Вопросы к этому параграфу пока не готовы.');
      state.queue = shuffle(qs).map(q => ({ q, seen: 0 }));
      state.total = qs.length;
      updateProgress();
      renderQuestion();
    })
    .catch(err => fail(err.message || 'Что-то пошло не так.'));
}
