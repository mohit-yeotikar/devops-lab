// Browser UI for a practice lab: terminal, live task list, explanations, editor, quiz.
// Progress is saved in this browser (a journal of commands and edits) and replayed on load.
import { Machine } from './shell.js';
import { labById } from './labs.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function boot(root) {
  const lab = labById(root.dataset.lab);
  if (!lab) return;
  const key = `practice:${root.dataset.user}:${lab.id}`;
  const load = () => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const save = (s) => { try { localStorage.setItem(key, JSON.stringify(s)); } catch {} };
  let saved = load() || { journal: [], started: Date.now(), quiz: null };

  const term = $('.term', root), screen = $('.term-screen', root), input = $('.term-input', root), promptEl = $('.term-prompt', root);
  const explainBox = $('.explain', root), tasksEl = $$('[data-task]', root), bar = $('.lab-bar i', root), count = $('.lab-count', root);
  const doneBox = $('.lab-done', root), editor = $('.editor', root);
  let m = new Machine(lab);
  let hist = [], hi = -1, draft = '';
  let wasDone = new Set();

  function renderPrompt() {
    const p = m.prompt();
    const [uh, path] = [p.slice(0, p.indexOf(':')), p.slice(p.indexOf(':') + 1, -1)];
    promptEl.innerHTML = '';
    promptEl.append(el('span', 'p-user', uh), el('span', 'p-sep', ':'), el('span', 'p-path', path), el('span', 'p-sep', '$'));
  }
  function line(cls, text) { const d = el('div', cls, text); screen.append(d); return d; }
  function echoCmd(cmd) {
    const d = el('div', 't-cmd');
    const p = promptEl.cloneNode(true); p.className = 'term-prompt';
    d.append(p, document.createTextNode(' ' + cmd));
    screen.append(d);
  }
  function scroll() { screen.scrollTop = screen.scrollHeight; }

  function showExplain(res) {
    explainBox.innerHTML = '';
    if (!res.explain.length && !res.tip) { explainBox.append(el('p', 'help', 'Run a command. Here you will see what it did, in simple words.')); return; }
    for (const x of res.explain.slice(0, 4)) {
      const item = el('div', 'ex-item');
      item.append(el('code', null, x.cmd), el('p', null, x.text));
      explainBox.append(item);
    }
    if (res.tip) { const t = el('div', 'ex-tip'); t.append(el('strong', null, 'Tip: '), document.createTextNode(res.tip)); explainBox.append(t); }
  }

  function updateTasks(animate) {
    let n = 0, current = -1;
    lab.tasks.forEach((t, i) => {
      const d = t.check(m);
      if (d) n++; else if (current < 0) current = i;
      const li = tasksEl[i];
      li.classList.toggle('done', d);
      li.classList.toggle('current', i === current);
      if (d && animate && !wasDone.has(i)) { li.classList.add('pop'); setTimeout(() => li.classList.remove('pop'), 600); }
      if (d) wasDone.add(i);
    });
    bar.style.transform = `scaleX(${n / lab.tasks.length})`;
    const nn = $('.now-n', root), nt = $('.now-text', root);
    if (nn && nt) { if (current >= 0) { nn.textContent = String(current + 1); nt.textContent = lab.tasks[current].text; } else { nn.textContent = String(lab.tasks.length); nt.textContent = 'All done. Scroll down for the quiz.'; } }
    count.textContent = `${n} of ${lab.tasks.length} done`;
    const all = n === lab.tasks.length;
    doneBox.hidden = !all;
    if (all && animate && !root.classList.contains('all-done')) { root.classList.add('all-done'); setTimeout(() => doneBox.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300); }
    if (all) root.classList.add('all-done');
    if (current >= 0 && animate) tasksEl[current].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function exec(cmd, { record = true, show = true } = {}) {
    if (show) echoCmd(cmd);
    const res = m.run(cmd);
    if (res.clear) screen.innerHTML = '';
    if (show && res.out) line('t-out', res.out.replace(/\n$/, ''));
    if (show && res.tip) line('t-tip', 'Tip: ' + res.tip);
    if (record) { saved.journal.push({ c: cmd }); save(saved); }
    hist.push(cmd);
    renderPrompt();
    return res;
  }

  // Replay saved progress.
  function replay() {
    screen.innerHTML = '';
    line('t-welcome', `Practice terminal · ${lab.title}\nType a command and press Enter. Type help to see the commands. Start with task 1.`);
    for (const j of saved.journal) {
      if (j.c !== undefined) exec(j.c, { record: false });
      else if (j.e) { m.saveEdit(j.e, j.v); line('t-tip', `Saved ${j.e}`); }
    }
    updateTasks(false);
    scroll();
  }

  function openEditor(path) {
    const ta = $('textarea', editor);
    $('.editor-name', editor).textContent = path;
    ta.value = m.fs.get(path)?.content ?? '';
    const orig = ta.value;
    const state = $('.editor-state', editor);
    state.textContent = '';
    editor.hidden = false;
    requestAnimationFrame(() => { editor.classList.add('open'); ta.focus(); ta.setSelectionRange(0, 0); ta.scrollTop = 0; });
    const close = () => { editor.classList.remove('open'); setTimeout(() => { editor.hidden = true; input.focus(); }, 180); cleanup(); };
    const doSave = () => { m.saveEdit(path, ta.value); saved.journal.push({ e: path, v: ta.value }); save(saved); state.textContent = 'Saved'; line('t-tip', `Saved ${path}`); updateTasks(true); scroll(); };
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && !ta.value.slice(ta.selectionStart, ta.selectionEnd)) { e.preventDefault(); close(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('    ', s, ta.selectionEnd, 'end'); }
    };
    const onInput = () => { state.textContent = ta.value === orig ? '' : 'Not saved yet'; };
    const bSave = $('.editor-save', editor), bClose = $('.editor-close', editor), bBoth = $('.editor-saveclose', editor);
    const sc = () => { doSave(); close(); };
    function cleanup() { ta.removeEventListener('keydown', onKey); ta.removeEventListener('input', onInput); bSave.removeEventListener('click', doSave); bClose.removeEventListener('click', close); bBoth.removeEventListener('click', sc); }
    ta.addEventListener('keydown', onKey); ta.addEventListener('input', onInput);
    bSave.addEventListener('click', doSave); bClose.addEventListener('click', close); bBoth.addEventListener('click', sc);
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = input.value;
      input.value = ''; hi = -1;
      if (!cmd.trim()) { echoCmd(''); scroll(); return; }
      const res = exec(cmd);
      showExplain(res);
      updateTasks(true);
      scroll();
      if (res.editor) openEditor(res.editor);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const h = m.history; if (!h.length) return;
      if (hi < 0) { draft = input.value; hi = h.length; }
      hi = Math.max(0, hi - 1); input.value = h[hi];
      requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const h = m.history; if (hi < 0) return;
      hi++; if (hi >= h.length) { hi = -1; input.value = draft; } else input.value = h[hi];
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const r = m.complete(input.value);
      input.value = r.line;
      if (r.options.length) { echoCmd(input.value); line('t-opts', r.options.join('   ')); scroll(); }
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault(); screen.innerHTML = '';
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      if (input.selectionStart !== input.selectionEnd) return;
      e.preventDefault(); echoCmd(input.value + '^C'); input.value = ''; scroll();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'u') {
      e.preventDefault(); input.value = '';
    }
  });
  term.addEventListener('mouseup', () => { if (!window.getSelection()?.toString()) input.focus(); });

  // Task help buttons.
  for (const li of tasksEl) {
    const i = Number(li.dataset.task);
    $('.t-hint', li)?.addEventListener('click', (e) => { li.classList.add('show-hint'); e.currentTarget.hidden = true; });
    $('.t-show', li)?.addEventListener('click', (e) => { li.classList.add('show-cmd'); e.currentTarget.hidden = true; });
    $('.t-use', li)?.addEventListener('click', () => { input.value = lab.tasks[i].cmd; input.focus(); input.setSelectionRange(input.value.length, input.value.length); });
  }
  $('.lab-reset', root)?.addEventListener('click', () => {
    if (!confirm('Start this lab again from the beginning? Your commands in this lab will be cleared.')) return;
    saved = { journal: [], started: Date.now(), quiz: null }; save(saved);
    m = new Machine(lab); hist = []; wasDone = new Set(); root.classList.remove('all-done');
    $$('.quiz input', root).forEach((x) => { x.checked = false; x.disabled = false; });
    $$('.quiz li', root).forEach((x) => x.classList.remove('right', 'wrong'));
    $('.quiz-result', root).innerHTML = '';
    replay(); renderPrompt(); showExplain({ explain: [], tip: '' }); input.focus();
  });
  $('.lab-help', root)?.addEventListener('click', () => { const res = exec('help'); showExplain(res); scroll(); input.focus(); });

  // Quiz.
  const quiz = $('.quiz', root);
  quiz?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(quiz);
    let score = 0;
    lab.quiz.forEach((q, i) => {
      const pick = Number(fd.get('q' + i));
      const block = $(`[data-q="${i}"]`, quiz);
      $$('li', block).forEach((li, j) => { li.classList.toggle('right', j === q.answer); li.classList.toggle('wrong', j === pick && pick !== q.answer); });
      $$('input', block).forEach((x) => (x.disabled = true));
      $('.why', block).hidden = false;
      if (pick === q.answer) score++;
    });
    const missing = lab.quiz.some((_, i) => fd.get('q' + i) === null);
    const res = $('.quiz-result', root);
    if (missing) { res.innerHTML = '<div class="notice warn">Answer every question first.</div>'; $$('.quiz input', root).forEach((x) => (x.disabled = false)); return; }
    $('button[type=submit]', quiz).disabled = true;
    saved.quiz = score; save(saved);
    try {
      await fetch('/api/practice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lab: lab.id, commands: m.history.length, seconds: Math.round((Date.now() - saved.started) / 1000), quiz_score: score, quiz_total: lab.quiz.length }) });
    } catch {}
    res.innerHTML = '';
    const box = el('div', `notice ${score === lab.quiz.length ? 'ok' : ''}`);
    box.append(el('strong', null, `${score} of ${lab.quiz.length} right. `), document.createTextNode(score === lab.quiz.length ? 'Lab finished and saved. Well done.' : 'Lab finished and saved. Read the green answers and the explanations under each question.'));
    res.append(box);
    root.querySelector('.lab-status')?.replaceChildren(el('span', 'pill done', 'Finished'));
  });

  renderPrompt();
  replay();
  showExplain({ explain: [], tip: '' });
  if (!matchMedia('(pointer: coarse)').matches) input.focus({ preventScroll: true });
}
