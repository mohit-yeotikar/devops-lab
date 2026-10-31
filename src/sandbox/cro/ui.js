// Browser UI shell for CRO widget labs: live task list, hints, toasts, quiz, saved progress.
import { croLabs } from './labs.js';
import { mount as metrics } from './widgets/metrics.js';
import { mount as funnel } from './widgets/funnel.js';
import { mount as gtm } from './widgets/gtm.js';
import { mount as utm } from './widgets/utm.js';
import { mount as behaviour } from './widgets/behaviour.js';
import { mount as ux } from './widgets/ux.js';
import { mount as hypothesis } from './widgets/hypothesis.js';
import { mount as ab } from './widgets/ab.js';
import { mount as results } from './widgets/results.js';

const WIDGETS = { 'cro-metrics': metrics, 'cro-funnel': funnel, 'cro-gtm': gtm, 'cro-utm': utm, 'cro-behaviour': behaviour, 'cro-ux': ux, 'cro-hypothesis': hypothesis, 'cro-ab': ab, 'cro-results': results };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function bootWidget(root) {
  const lab = croLabs.find((l) => l.id === root.dataset.lab);
  if (!lab) return;
  const key = `practice:${root.dataset.user}:${lab.id}`;
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch { saved = null; }
  saved = saved || { done: [], state: {}, started: Date.now(), quiz: null, actions: 0 };
  const persist = () => { try { localStorage.setItem(key, JSON.stringify(saved)); } catch {} };
  const doneSet = new Set(saved.done);
  const tasksEl = $$('[data-task]', root), bar = $('.lab-bar i', root), count = $('.lab-count', root), doneBox = $('.lab-done', root);
  const toastEl = $('.toast', root);
  let toastT;
  const toast = (t, kind = '') => { toastEl.textContent = t; toastEl.className = `toast ${kind}`; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.hidden = true), 3200); };
  const wasDone = new Set(doneSet);

  function refresh(animate) {
    let n = 0, current = -1;
    lab.tasks.forEach((t, i) => {
      const d = doneSet.has(t.id);
      if (d) n++; else if (current < 0) current = i;
      const li = tasksEl[i];
      li.classList.toggle('done', d);
      li.classList.toggle('current', i === current);
      if (d && animate && !wasDone.has(t.id)) { li.classList.add('pop'); setTimeout(() => li.classList.remove('pop'), 600); }
      if (d) wasDone.add(t.id);
    });
    bar.style.transform = `scaleX(${n / lab.tasks.length})`;
    count.textContent = `${n} of ${lab.tasks.length} done`;
    const nn = $('.now-n', root), nt = $('.now-text', root);
    if (nn && nt) { if (current >= 0) { nn.textContent = String(current + 1); nt.textContent = lab.tasks[current].text; } else { nn.textContent = String(lab.tasks.length); nt.textContent = 'All done. Scroll down for the quiz.'; } }
    const all = n === lab.tasks.length;
    doneBox.hidden = !all;
    if (all && animate && !root.classList.contains('all-done')) setTimeout(() => doneBox.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
    root.classList.toggle('all-done', all);
  }

  const ctx = {
    state: saved.state,
    save: persist,
    toast,
    isDone: (id) => doneSet.has(id),
    act() { saved.actions = (saved.actions || 0) + 1; persist(); },
    done(id) {
      if (doneSet.has(id)) return;
      const t = lab.tasks.find((x) => x.id === id);
      if (!t) return;
      doneSet.add(id); saved.done = [...doneSet]; persist();
      toast('Task done: ' + t.text, 'good');
      refresh(true);
    },
  };

  for (const li of tasksEl) {
    $('.t-hint', li)?.addEventListener('click', (e) => { li.classList.add('show-hint'); e.currentTarget.hidden = true; });
  }
  $('.lab-reset', root)?.addEventListener('click', () => {
    if (!confirm('Start this lab again from the beginning? Your work in this lab will be cleared.')) return;
    try { localStorage.removeItem(key); } catch {}
    location.reload();
  });

  const quiz = $('.quiz', root);
  quiz?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(quiz);
    if (lab.quiz.some((_, i) => fd.get('q' + i) === null)) { $('.quiz-result', root).innerHTML = '<div class="notice warn">Answer every question first.</div>'; return; }
    let score = 0;
    lab.quiz.forEach((q, i) => {
      const pick = Number(fd.get('q' + i));
      const block = $(`[data-q="${i}"]`, quiz);
      $$('li', block).forEach((li, j) => { li.classList.toggle('right', j === q.answer); li.classList.toggle('wrong', j === pick && pick !== q.answer); });
      $$('input', block).forEach((x) => (x.disabled = true));
      $('.why', block).hidden = false;
      if (pick === q.answer) score++;
    });
    $('button[type=submit]', quiz).disabled = true;
    saved.quiz = score; persist();
    try {
      await fetch('/api/practice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lab: lab.id, commands: saved.actions || 0, seconds: Math.round((Date.now() - saved.started) / 1000), quiz_score: score, quiz_total: lab.quiz.length }) });
    } catch {}
    const res = $('.quiz-result', root);
    res.innerHTML = '';
    const box = document.createElement('div');
    box.className = `notice ${score === lab.quiz.length ? 'ok' : ''}`;
    box.innerHTML = `<strong>${score} of ${lab.quiz.length} right.</strong> ${score === lab.quiz.length ? 'Lab finished and saved. Well done.' : 'Lab finished and saved. Read the green answers and the explanations under each question.'}`;
    res.append(box);
    $('.lab-status', root)?.replaceChildren(Object.assign(document.createElement('span'), { className: 'pill done', textContent: 'Finished' }));
  });

  const stage = $('.widget', root);
  WIDGETS[lab.id]?.(stage, ctx);
  refresh(false);
}
