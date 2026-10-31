// Lab: Metrics drill. Random weekly reports; the learner calculates CR, AOV, RPV, step rates and lifts.
import { closeEnough } from '../logic.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const n0 = (n) => Math.round(n).toLocaleString('en-US');
const m2 = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function week() {
  const sessions = rint(18, 60) * 100;
  const atc = Math.round(sessions * (0.06 + Math.random() * 0.04));
  const chk = Math.round(atc * (0.5 + Math.random() * 0.12));
  const orders = Math.round(chk * (0.55 + Math.random() * 0.2));
  const revenue = Math.round(orders * (45 + Math.random() * 45) * 100) / 100;
  return { sessions, atc, chk, orders, revenue };
}
const TYPES = ['cr', 'aov', 'rpv', 'step', 'lift'];

function makeQuestion(type) {
  const w = week();
  if (type === 'cr') return { type, w, q: 'What is the conversion rate (CR)? Answer in %.', kind: 'pct', truth: (w.orders / w.sessions) * 100, unit: '%', work: `CR = orders ÷ sessions = ${n0(w.orders)} ÷ ${n0(w.sessions)} = ${((w.orders / w.sessions) * 100).toFixed(2)}%` };
  if (type === 'aov') return { type, w, q: 'What is the average order value (AOV)? Answer in CA$.', kind: 'money', truth: w.revenue / w.orders, unit: 'CA$', work: `AOV = revenue ÷ orders = CA$${m2(w.revenue)} ÷ ${n0(w.orders)} = CA$${m2(w.revenue / w.orders)}` };
  if (type === 'rpv') return { type, w, q: 'What is the revenue per visitor (RPV)? Answer in CA$.', kind: 'money', truth: w.revenue / w.sessions, unit: 'CA$', work: `RPV = revenue ÷ sessions = CA$${m2(w.revenue)} ÷ ${n0(w.sessions)} = CA$${m2(w.revenue / w.sessions)}. Check: CR × AOV gives the same.` };
  if (type === 'step') {
    const pick = Math.random() < 0.5;
    return pick
      ? { type, w, q: 'What % of people who added to cart started checkout? (step rate)', kind: 'pct', truth: (w.chk / w.atc) * 100, unit: '%', work: `Step rate = started checkout ÷ added to cart = ${n0(w.chk)} ÷ ${n0(w.atc)} = ${((w.chk / w.atc) * 100).toFixed(1)}%` }
      : { type, w, q: 'What % of people who started checkout placed an order? (step rate)', kind: 'pct', truth: (w.orders / w.chk) * 100, unit: '%', work: `Step rate = orders ÷ started checkout = ${n0(w.orders)} ÷ ${n0(w.chk)} = ${((w.orders / w.chk) * 100).toFixed(1)}%` };
  }
  const w2 = { ...w, orders: Math.round(w.orders * (1.05 + Math.random() * 0.25)) };
  w2.revenue = Math.round(w2.orders * (w.revenue / w.orders) * 100) / 100;
  const a = w.orders / w.sessions, b = w2.orders / w2.sessions;
  return { type, w, w2, q: 'Same traffic both weeks. By how many % (relative) did CR change from week 1 to week 2?', kind: 'pct', truth: ((b - a) / a) * 100, unit: '%', work: `CR week 1 = ${(a * 100).toFixed(2)}%, week 2 = ${(b * 100).toFixed(2)}%. Relative lift = (${(b * 100).toFixed(2)} − ${(a * 100).toFixed(2)}) ÷ ${(a * 100).toFixed(2)} = ${(((b - a) / a) * 100).toFixed(1)}%. In points it is only +${((b - a) * 100).toFixed(2)} pp.` };
}

const row = (label, w) => `<tr><td>${label}</td><td>${n0(w.sessions)}</td><td>${n0(w.atc)}</td><td>${n0(w.chk)}</td><td>${n0(w.orders)}</td><td>CA$${m2(w.revenue)}</td></tr>`;

export function mount(el, ctx) {
  const S = ctx.state;
  S.streak ??= 0; S.best ??= 0; S.seen ??= [];
  let cur = null;
  el.innerHTML = `
    <section class="card">
      <div class="row between"><h3 style="margin:0">GlowShop weekly report</h3><span class="help">Streak: <b class="m-streak">0</b> · best <b class="m-best">0</b></span></div>
      <div class="tbl"><table class="m-table"></table></div>
      <p class="m-q" style="font-weight:600;margin:12px 0 8px"></p>
      <form class="row m-form" style="align-items:flex-end">
        <div style="flex:0 1 220px"><label for="m-ans">Your answer <span class="help m-unit"></span></label><input id="m-ans" class="m-ans" inputmode="decimal" autocomplete="off" placeholder="e.g. 2.15" /></div>
        <button class="btn" type="submit">Check</button>
        <button class="btn sec m-next" type="button">Next question</button>
      </form>
      <div class="m-out" aria-live="polite"></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">The trap: which week made more money per visitor?</h3>
      <div class="tbl"><table><thead><tr><th>Week</th><th>Sessions</th><th>Orders</th><th>CR</th><th>Revenue</th></tr></thead>
        <tbody><tr><td>Week A (10% off sale)</td><td>4,000</td><td>96</td><td>2.40%</td><td>CA$4,992</td></tr><tr><td>Week B (no sale)</td><td>4,000</td><td>80</td><td>2.00%</td><td>CA$5,600</td></tr></tbody></table></div>
      <div class="row" style="margin-top:10px"><button class="btn sec t-pick" data-w="A" type="button">Week A</button><button class="btn sec t-pick" data-w="B" type="button">Week B</button></div>
      <div class="t-out" aria-live="polite"></div>
    </section>`;
  const $ = (s) => el.querySelector(s);
  const paint = () => { $('.m-streak').textContent = S.streak; $('.m-best').textContent = S.best; };
  function next() {
    const left = TYPES.filter((t) => !ctx.isDone(t === 'cr' ? 'cr' : t));
    const type = left.length && Math.random() < 0.7 ? left[Math.floor(Math.random() * left.length)] : TYPES[Math.floor(Math.random() * TYPES.length)];
    cur = makeQuestion(type);
    $('.m-table').innerHTML = `<thead><tr><th>Week</th><th>Sessions</th><th>Added to cart</th><th>Started checkout</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>${row(cur.w2 ? 'Week 1' : 'This week', cur.w)}${cur.w2 ? row('Week 2', cur.w2) : ''}</tbody>`;
    $('.m-q').textContent = cur.q;
    $('.m-unit').textContent = `(${cur.unit})`;
    $('.m-out').innerHTML = '';
    const a = $('.m-ans'); a.value = ''; a.disabled = false; a.focus({ preventScroll: true });
  }
  $('.m-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!cur || $('.m-ans').disabled) return;
    const typed = $('.m-ans').value;
    if (!typed.trim()) { ctx.toast('Type a number first.'); return; }
    ctx.act();
    const ok = closeEnough(typed, cur.truth, cur.kind);
    $('.m-ans').disabled = true;
    if (ok) { S.streak++; S.best = Math.max(S.best, S.streak); ctx.done(cur.type); if (S.streak >= 5) ctx.done('streak'); }
    else S.streak = 0;
    ctx.save(); paint();
    $('.m-out').innerHTML = `<div class="notice ${ok ? 'ok' : 'warn'}"><strong>${ok ? 'Right.' : 'Not quite.'}</strong> ${esc(cur.work)}</div>`;
  });
  $('.m-next').addEventListener('click', next);
  el.querySelectorAll('.t-pick').forEach((b) => b.addEventListener('click', () => {
    ctx.act();
    const ok = b.dataset.w === 'B';
    $('.t-out').innerHTML = `<div class="notice ${ok ? 'ok' : 'warn'}"><strong>${ok ? 'Right: Week B.' : 'Look again.'}</strong> RPV A = 4,992 ÷ 4,000 = CA$1.25. RPV B = 5,600 ÷ 4,000 = CA$1.40. Week A sold more orders (higher CR) but each order was smaller (AOV CA$52 vs CA$70). Week B made 12% more money per visitor.</div>`;
    if (ok) ctx.done('trap');
  }));
  paint(); next();
}
