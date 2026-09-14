/* Главная страница: список глав и параграфов + прогресс из localStorage */

const STORE_KEY = 'ms-history-6-progress';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function render(book, progress) {
  const content = document.getElementById('content');
  let total = 0;
  let done = 0;
  let html = '';

  for (const ch of book.chapters) {
    const label = ch.roman ? `<b>Глава ${escapeHtml(ch.roman)}.</b> ${escapeHtml(ch.title)}` : escapeHtml(ch.title);
    html += `<section class="chapter"><h2>${label}</h2><ul class="plist">`;

    for (const p of ch.paragraphs) {
      total++;
      const rec = progress[p.id];
      const isDone = !!(rec && rec.done);
      if (isDone) done++;
      const meta = isDone ? 'пройдено ✓' : 'начать';
      html += `<li><a class="pcard${isDone ? ' done' : ''}" href="test.html?p=${encodeURIComponent(p.id)}">
        <span class="num">${escapeHtml(p.num)}</span>
        <span class="ttl">${escapeHtml(p.title)}</span>
        <span class="meta">${meta}</span>
      </a></li>`;
    }

    html += '</ul></section>';
  }

  content.innerHTML = html;

  const box = document.getElementById('overall');
  box.hidden = false;
  document.getElementById('overall-text').textContent = `${done} из ${total}`;
  document.getElementById('overall-bar').style.width = total ? (done / total * 100) + '%' : '0%';
}

document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Сбросить отметки о пройденных параграфах?')) {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    location.reload();
  }
});

fetch('data/index.json')
  .then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(book => {
    document.title = `${book.title} — ${book.grade}`;
    render(book, loadProgress());
  })
  .catch(err => {
    document.getElementById('content').innerHTML =
      '<p class="error">Не удалось загрузить содержание учебника.<br>' + escapeHtml(err.message) + '</p>';
  });
