// Lab mk-attribution: rules-based attribution models vs a simplified data-driven (Shapley) model on 200 Voltra
// booking paths. Simplified simulator, fake data.

export const lab = {
  id: 'mk-attribution', track: 'martech', kind: 'widget', title: 'Attribution models compared', topic: 'Measurement', minutes: 30, sprints: ['m12'],
  summary: 'Split the value of 200 Voltra booking paths with six models, see who wins and loses against last click, and learn what attribution cannot tell you.',
  intro: [
    'This is a simplified simulator. Voltra had 200 online bookings last month. Each booking has a path: the ad and site touches before it, with how many days before the booking they happened.',
    'An attribution model splits each booking\'s value between the channels on its path. Last click gives everything to the final touch. Other models spread it: first click, linear, time decay, position-based (40/20/40), and data-driven.',
    'The data-driven model here uses Shapley values. It compares conversion rates of journeys with and without each channel (converting and non-converting journeys), then splits each booking fairly between the channels on its path. Real tools (GA4, Google Ads) use more complex models of the same idea.',
  ],
  tasks: [
    { id: 'at1', text: 'Find the channel that last click under-credits most.', why: 'Upper-funnel video and social start journeys but rarely close them. Last click hides them, so their budgets get cut first.', hint: 'Pick Linear, then Data-driven, and look at the "change vs last click" column. Which channel gains the most share?' },
    { id: 'at2', text: 'Explain why branded search looks great in last click.', why: 'Brand search is often the last step of a decision made elsewhere. Budget follows the model, so this matters.', hint: 'Look at the line under the chart: how often is brand search the last touch when it is on a path?' },
    { id: 'at3', text: 'Set a time-decay half-life that gives YouTube, Meta and DV360 together at least 18% of the credit.', why: 'The half-life decides how much early touches count. Short = close to last click. Long = close to linear.', hint: 'Pick Time decay and move the half-life slider to the right.' },
    { id: 'at4', text: 'Read the data-driven result: which channel loses the most credit compared with last click?', why: 'Data-driven moves credit away from channels that are on many paths but add little to the chance of booking.', hint: 'Pick Data-driven and find the most negative number in the change column.' },
    { id: 'at5', text: 'Split one booking by hand with the position-based model.', why: 'If you can do one path by hand, you can explain any model to a CFO.', hint: 'Four touches: first 40%, last 40%, and the middle 20% shared by the two middle touches (10% each).' },
    { id: 'at6', text: 'Answer the guided question on the limits of attribution.', why: 'Seniors know where the model stops and the experiment starts.', hint: 'Attribution sees paths. It does not see what would have happened without an ad.' },
  ],
  quiz: [
    { q: 'Why does branded search get so much credit in last click?', options: ['It creates the most new demand', 'People who already decided search the brand name just before they book, so it is usually the last touch', 'Google gives it a bonus', 'It has the lowest CPC'], answer: 1, why: 'Brand search captures demand that other channels (and word of mouth) created. Last click rewards the closer.' },
    { q: 'With time decay, what happens when you make the half-life very long?', options: ['It becomes last click', 'It becomes close to linear', 'It becomes first click', 'Nothing'], answer: 1, why: 'A long half-life gives old and new touches almost the same weight, so it approaches linear.' },
    { q: 'Data-driven attribution gives Meta more credit. Does that prove Meta causes extra bookings?', options: ['Yes, the model is data-driven', 'No. Attribution is correlational. Use a holdout or lift test to measure incrementality', 'Yes, if the credit is above 20%', 'Only on mobile'], answer: 1, why: 'Attribution splits observed bookings. Only an experiment shows what would have happened without the channel.' },
  ],
};

/* ---------------- channels and data ---------------- */
export const CHANNELS = [
  { id: 'psb', name: 'Paid search brand', stage: 3, q: 0.004 },
  { id: 'psg', name: 'Paid search generic', stage: 2, q: 0.012 },
  { id: 'meta', name: 'Meta', stage: 1, q: 0.014 },
  { id: 'yt', name: 'YouTube', stage: 1, q: 0.016 },
  { id: 'dv', name: 'DV360 display', stage: 1, q: 0.006 },
  { id: 'email', name: 'Email', stage: 2, q: 0.008 },
  { id: 'org', name: 'Organic', stage: 2, q: 0.010 },
  { id: 'direct', name: 'Direct', stage: 3, q: 0.004 },
  { id: 'dealer', name: 'Dealer referral', stage: 2, q: 0.020 },
];
export const CH_IDS = CHANNELS.map((c) => c.id);
export const chName = (id) => CHANNELS.find((c) => c.id === id)?.name || id;
export const UPPER = ['yt', 'meta', 'dv'];

/** Small seeded random generator (mulberry32) so every learner sees the same data. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const key = (set) => [...set].sort().join('+');

// Common journey patterns. Their subsets are added too, so every combination the Shapley model needs has data.
const PATTERNS = [['yt', 'psg', 'psb'], ['yt', 'meta', 'psb'], ['meta', 'org', 'direct'], ['dv', 'psg', 'psb'], ['yt', 'email', 'direct'], ['meta', 'email', 'psb'], ['org', 'dealer', 'direct'], ['yt', 'org', 'psb']];
// Bookings per combination size (designed so the month has exactly 200 bookings).
const SINGLE = { psb: 16, direct: 16, org: 10, psg: 6, meta: 5, yt: 2, dv: 2, email: 4, dealer: 6 };
function combos() {
  const sets = new Map();
  for (const p of PATTERNS) {
    for (let m = 1; m < 1 << p.length; m++) { const s = p.filter((_, i) => m & (1 << i)); sets.set(key(s), s); }
  }
  return [...sets.values()];
}
/** The "true" chance that a journey with this channel set books (noisy-OR). Used only to create the fake data. */
export const trueRate = (set) => 1 - set.reduce((p, id) => p * (1 - CHANNELS.find((c) => c.id === id).q), 1);

/**
 * Builds the dataset: 200 converting paths, and journey counts per channel combination (converting + not).
 * Returns { paths: [{ id, touches: [{ ch, d }], value }], combos: { key: { set, journeys, conv } } }
 */
export function buildData(seed = 7) {
  const r = rng(seed);
  const sets = combos();
  const conv = {};
  for (const s of sets) conv[key(s)] = s.length === 1 ? SINGLE[s[0]] : s.length === 2 ? 3 : 7;
  // trim or pad to exactly 200 bookings on the biggest triples
  let total = Object.values(conv).reduce((a, b) => a + b, 0);
  const triples = sets.filter((s) => s.length === 3).map(key);
  let i = 0;
  while (total !== 200) { const k = triples[i++ % triples.length]; conv[k] += total < 200 ? 1 : -1; total += total < 200 ? 1 : -1; }
  const table = {};
  for (const s of sets) { const k = key(s); table[k] = { set: [...s].sort(), conv: conv[k], journeys: Math.round(conv[k] / trueRate(s)) }; }
  const prices = [89999, 114999, 129999, 149999];
  const paths = [];
  let n = 0;
  for (const s of sets) {
    for (let j = 0; j < conv[key(s)]; j++) {
      // order: upper funnel first, closers last, random tie-break
      let seq = [...s].map((id) => ({ id, o: CHANNELS.find((c) => c.id === id).stage + r() * 0.9 })).sort((a, b) => a.o - b.o).map((x) => x.id);
      // some journeys repeat a channel (a second visit)
      if (seq.length >= 2 && r() < 0.35) { const at = 1 + Math.floor(r() * (seq.length - 1)); seq.splice(at, 0, seq[at - 1]); }
      if (seq.length >= 2 && r() < 0.15) seq.splice(seq.length - 1, 0, seq[0]);
      seq = seq.slice(0, 5);
      // days before booking: first touch 3-35 days, last touch 0-2 days
      const first = seq.length === 1 ? Math.floor(r() * 3) : 3 + Math.floor(r() * 33);
      const last = Math.floor(r() * 3);
      const touches = seq.map((ch, t) => ({ ch, d: seq.length === 1 ? first : Math.round(first - ((first - last) * t) / (seq.length - 1)) }));
      const value = s.includes('dealer') && r() < 0.3 ? 349999 : prices[Math.floor(r() * prices.length)];
      paths.push({ id: ++n, touches, value });
    }
  }
  return { paths, combos: table };
}

/* ---------------- models ---------------- */
const zero = () => Object.fromEntries(CH_IDS.map((c) => [c, 0]));
/** Weights per touch (sum 1) for a rules-based model. */
export function weights(model, touches, halfLife = 7) {
  const n = touches.length;
  if (!n) return [];
  if (model === 'last') return touches.map((_, i) => (i === n - 1 ? 1 : 0));
  if (model === 'first') return touches.map((_, i) => (i === 0 ? 1 : 0));
  if (model === 'linear') return touches.map(() => 1 / n);
  if (model === 'decay') { const w = touches.map((t) => 2 ** (-t.d / halfLife)); const s = w.reduce((a, b) => a + b, 0); return w.map((x) => x / s); }
  if (model === 'position') {
    if (n === 1) return [1];
    if (n === 2) return [0.5, 0.5];
    return touches.map((_, i) => (i === 0 || i === n - 1 ? 0.4 : 0.2 / (n - 2)));
  }
  throw new Error('unknown model ' + model);
}

/** Exact Shapley values. players: array of ids; v: function(sortedArrayOfIds) → number. */
export function shapley(players, v) {
  const k = players.length;
  const fact = (x) => (x <= 1 ? 1 : x * fact(x - 1));
  const phi = {};
  for (const p of players) {
    const others = players.filter((x) => x !== p);
    let s = 0;
    for (let m = 0; m < 1 << others.length; m++) {
      const S = others.filter((_, i) => m & (1 << i));
      const w = (fact(S.length) * fact(k - S.length - 1)) / fact(k);
      s += w * (v([...S, p].sort()) - v([...S].sort()));
    }
    phi[p] = s;
  }
  return phi;
}
/** Conversion rate of journeys whose channel set is exactly `set` (0 for the empty set). */
export function rateFn(combos) {
  return (set) => { if (!set.length) return 0; const c = combos[key(set)]; return c && c.journeys ? c.conv / c.journeys : 0; };
}
/** Data-driven split of one path: Shapley over the distinct channels on it; negatives are set to 0 and the rest rescaled. */
export function ddaSplit(touches, v) {
  const players = [...new Set(touches.map((t) => t.ch))].sort();
  const phi = shapley(players, v);
  for (const p of players) phi[p] = Math.max(0, phi[p]);
  const s = players.reduce((a, p) => a + phi[p], 0);
  const out = {};
  for (const p of players) out[p] = s ? phi[p] / s : 1 / players.length;
  return out;
}
/** Credit in rupees per channel for a model. model: last | first | linear | decay | position | dda */
export function credit(model, data, halfLife = 7) {
  const out = zero();
  const v = model === 'dda' ? rateFn(data.combos) : null;
  for (const p of data.paths) {
    if (model === 'dda') { const sp = ddaSplit(p.touches, v); for (const c in sp) out[c] += sp[c] * p.value; continue; }
    weights(model, p.touches, halfLife).forEach((w, i) => (out[p.touches[i].ch] += w * p.value));
  }
  return out;
}
export const shares = (cr) => { const t = Object.values(cr).reduce((a, b) => a + b, 0); return Object.fromEntries(Object.entries(cr).map(([k, x]) => [k, t ? x / t : 0])); };
export const totalValue = (data) => data.paths.reduce((a, p) => a + p.value, 0);
/** Channel whose share rises most (or falls most, if dir = -1) vs last click. */
export function biggestShift(data, model, dir = 1, halfLife = 7) {
  const lc = shares(credit('last', data)), m = shares(credit(model, data, halfLife));
  let best = null, bv = -Infinity;
  for (const c of CH_IDS) { const d = dir * (m[c] - lc[c]); if (d > bv) { bv = d; best = c; } }
  return best;
}
export const upperShare = (data, halfLife) => { const s = shares(credit('decay', data, halfLife)); return UPPER.reduce((a, c) => a + s[c], 0); };
export const UPPER_TARGET = 0.18;
/** How often brand search is the last touch on paths that contain it. */
export function brandLastRate(data) {
  const withB = data.paths.filter((p) => p.touches.some((t) => t.ch === 'psb'));
  return withB.length ? withB.filter((p) => p.touches.at(-1).ch === 'psb').length / withB.length : 0;
}
/** The path used for the hand calculation: the first one with exactly 4 touches. */
export const handPath = (data) => data.paths.find((p) => p.touches.length === 4);
export const handAnswer = (p) => weights('position', p.touches)[1] * p.value;

export const MODELS = { last: 'Last click', first: 'First click', linear: 'Linear', decay: 'Time decay', position: 'Position-based (40/20/40)', dda: 'Data-driven (Shapley)' };

export const LIMITS = [
  { t: 'Attribution shows which channels were on the path. It does not show whether the booking would have happened without them.', ok: true },
  { t: 'A data-driven model proves the incremental impact of each channel.', ok: false },
  { t: 'People who refuse cookies, block tracking or switch devices leave gaps: their paths are missing or cut short.', ok: true },
  { t: 'TV, outdoor posters and showroom visits are not on click paths, so they get no credit at all.', ok: true },
  { t: 'If a channel gets twice the credit in data-driven, doubling its budget will double its bookings.', ok: false },
  { t: 'To measure incrementality you need an experiment: a geo holdout or a conversion lift test.', ok: true },
];
export const limitsRight = (picked) => LIMITS.every((l, i) => !!picked[i] === l.ok);

export const BRAND_Q = {
  q: 'Why does "Paid search brand" look so strong in last click?',
  o: ['Brand ads create most new demand for Voltra', 'People who already decided (after YouTube, Meta, a friend or a dealer) search "Voltra" right before booking, so brand search is the last touch even though it rarely changes the decision', 'Brand keywords have the best Quality Score, and Google gives them extra credit', 'Last click counts brand clicks twice'],
  c: 1,
  x: 'Brand search captures demand. Many of those people would have found Voltra anyway through organic results. Test it: pause brand ads in a few cities, or check how much organic brand traffic picks up.',
};

/* ---------------- UI ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const lakh = (n) => '₹' + (n / 100000).toFixed(1) + ' L';
const pc = (x, d = 1) => (x * 100).toFixed(d) + '%';

export function mount(el, ctx) {
  const S = ctx.state;
  S.model ??= 'linear'; S.h ??= 7; S.ans ??= {}; S.lim ??= {};
  const data = buildData();
  const total = totalValue(data);
  const hp = handPath(data);
  el.innerHTML = `
    <section class="card">
      <div class="row">
        <div style="flex:2 1 220px"><label>Model<select class="at-model">${Object.entries(MODELS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label></div>
        <div style="flex:2 1 220px" class="at-hbox"><label>Time-decay half-life: <b class="at-hv"></b><input type="range" class="at-h" min="1" max="30" step="1" style="padding:0" /></label></div>
      </div>
      <div class="kpis at-kpis"></div>
      <div class="legend"><span><i style="background:var(--text-3)"></i>Last click</span><span><i class="mtc-key"></i><span class="at-mname"></span></span></div>
      <div class="mtc-bars at-bars"></div>
      <p class="help at-note"></p>
      <div class="tbl"><table class="at-table"></table></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">Case questions</h3>
      <div class="w-q"><p><b>1. Which channel does last click under-credit most?</b></p><div class="row"><select class="at-under" aria-label="Channel"><option value="">Choose a channel</option>${CHANNELS.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><button type="button" class="btn sm at-under-go">Check</button></div><div class="at-under-out"></div></div>
      <div class="w-q"><p><b>2. ${esc(BRAND_Q.q)}</b></p><div class="w-opts at-brand"></div><div class="at-brand-out"></div></div>
      <div class="w-q"><p><b>3. In the data-driven model, which channel loses the most credit compared with last click?</b></p><div class="row"><select class="at-loss" aria-label="Channel"><option value="">Choose a channel</option>${CHANNELS.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><button type="button" class="btn sm at-loss-go">Check</button></div><div class="at-loss-out"></div></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">Split one booking by hand (position-based)</h3>
      <p>Booking #${hp.id}, value <b>${inr(hp.value)}</b>. Path: ${hp.touches.map((t, i) => `<span class="pill">${i + 1}. ${esc(chName(t.ch))} · ${t.d} d before</span>`).join(' → ')}</p>
      <div class="row"><div style="flex:1 1 200px"><label>Credit for touch 2 (${esc(chName(hp.touches[1].ch))}) in ₹<input class="at-hand" type="text" inputmode="decimal" /></label></div><button type="button" class="btn sm at-hand-go">Check</button></div>
      <div class="at-hand-out"></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">Guided question: what attribution cannot tell you</h3>
      <p class="help">Tick every statement that is true. Then check.</p>
      <div class="at-lim"></div>
      <div class="row" style="margin-top:8px"><button type="button" class="btn sm at-lim-go">Check</button></div>
      <div class="at-lim-out"></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">The data</h3>
      <p class="help">How the data-driven model works here: for each combination of channels, the conversion rate = bookings ÷ all journeys with exactly that combination. For each booking, Shapley adds the channels on its path in every possible order and averages how much each one raises the conversion rate. The booking value is split in those proportions. Negative values (rare) are set to zero.</p>
      <div class="tbl"><table class="at-combos mtc-small"></table></div>
      <details><summary>Show all 200 booking paths</summary><div class="tbl"><table class="at-paths mtc-small"></table></div></details>
    </section>`;
  const $ = (s) => el.querySelector(s);
  $('.at-model').value = S.model; $('.at-h').value = S.h;

  function render() {
    const m = S.model, h = S.h;
    const lc = shares(credit('last', data)), cr = credit(m, data, h), sh = shares(cr);
    $('.at-hv').textContent = `${h} day${h > 1 ? 's' : ''}`;
    $('.at-hbox').style.opacity = m === 'decay' ? 1 : 0.45;
    $('.at-mname').textContent = MODELS[m];
    const sum = Object.values(cr).reduce((a, b) => a + b, 0);
    $('.at-kpis').innerHTML = `<div><span class="eyebrow">Bookings</span><span class="big">${data.paths.length}</span></div><div><span class="eyebrow">Booking value</span><span class="big">${lakh(total)}</span></div><div><span class="eyebrow">Credit given by ${esc(MODELS[m])}</span><span class="big">${lakh(sum)}</span></div><div><span class="eyebrow">Upper funnel (YouTube + Meta + DV360)</span><span class="big">${pc(UPPER.reduce((a, c) => a + sh[c], 0))}</span></div>`;
    const max = Math.max(...CH_IDS.map((c) => Math.max(sh[c], lc[c])), 0.01);
    $('.at-bars').innerHTML = CHANNELS.map((c) => `<div class="mtc-bar"><span>${esc(c.name)}</span><div class="mtc-track"><i class="mtc-b0" style="width:${(lc[c.id] / max) * 100}%"></i><i class="mtc-b1" style="width:${(sh[c.id] / max) * 100}%"></i></div><b>${pc(sh[c.id])}</b></div>`).join('');
    $('.at-note').textContent = `Brand search is on ${data.paths.filter((p) => p.touches.some((t) => t.ch === 'psb')).length} paths and is the last touch on ${pc(brandLastRate(data), 0)} of them.`;
    const all = Object.fromEntries(Object.keys(MODELS).map((k) => [k, shares(credit(k, data, h))]));
    $('.at-table').innerHTML = `<thead><tr><th>Channel</th>${Object.entries(MODELS).map(([k, v]) => `<th${k === m ? ' class="mtc-sel"' : ''}>${esc(v)}</th>`).join('')}<th>${esc(MODELS[m])} vs last click</th></tr></thead><tbody>${CHANNELS.map((c) => { const d = sh[c.id] - lc[c.id]; return `<tr><td>${esc(c.name)}</td>${Object.keys(MODELS).map((k) => `<td${k === m ? ' class="mtc-sel"' : ''}>${pc(all[k][c.id])}</td>`).join('')}<td class="${d > 0.005 ? 'ok' : d < -0.005 ? 'err' : ''}">${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)} pts</td></tr>`; }).join('')}<tr><td><b>Total credit</b></td>${Object.keys(MODELS).map((k) => `<td>${lakh(Object.values(credit(k, data, h)).reduce((a, b) => a + b, 0))}</td>`).join('')}<td></td></tr></tbody>`;
    if (m === 'decay' && upperShare(data, h) >= UPPER_TARGET) ctx.done('at3');
  }
  $('.at-model').addEventListener('change', (e) => { S.model = e.target.value; ctx.act(); ctx.save(); render(); });
  $('.at-h').addEventListener('input', (e) => { S.h = Number(e.target.value); ctx.save(); render(); });
  $('.at-h').addEventListener('change', () => ctx.act());

  $('.at-under-go').addEventListener('click', () => {
    ctx.act();
    const v = $('.at-under').value, right = biggestShift(data, 'linear', 1);
    if (!v) return ctx.toast('Choose a channel.');
    if (v === right) { ctx.done('at1'); $('.at-under-out').innerHTML = `<div class="notice ok"><strong>Right: ${esc(chName(right))}.</strong> It starts many journeys but almost never closes them, so last click gives it close to nothing. Linear and data-driven both move it up the most. Cut it on last-click numbers and brand search volume falls a few weeks later.</div>`; }
    else $('.at-under-out').innerHTML = '<div class="notice warn">Not that one. Compare Linear and Data-driven with last click: which channel gains the most points?</div>';
  });
  function brand() {
    const ok = S.ans.brand === BRAND_Q.c;
    $('.at-brand').innerHTML = BRAND_Q.o.map((o, i) => `<button type="button" class="w-opt${ok && i === BRAND_Q.c ? ' right' : ''}" data-o="${i}">${esc(o)}</button>`).join('');
    $('.at-brand-out').innerHTML = ok ? `<div class="w-out">${esc(BRAND_Q.x)}</div>` : '';
    if (ok) ctx.done('at2');
  }
  $('.at-brand').addEventListener('click', (e) => {
    const b = e.target.closest('.w-opt'); if (!b) return;
    ctx.act();
    if (+b.dataset.o === BRAND_Q.c) { S.ans.brand = BRAND_Q.c; ctx.save(); brand(); } else { b.classList.add('wrong'); ctx.toast('Not quite. Look at where brand search sits on the paths.'); }
  });
  $('.at-loss-go').addEventListener('click', () => {
    ctx.act();
    const v = $('.at-loss').value, right = biggestShift(data, 'dda', -1);
    if (!v) return ctx.toast('Choose a channel.');
    if (v === right) { ctx.done('at4'); $('.at-loss-out').innerHTML = `<div class="notice ok"><strong>Right: ${esc(chName(right))}.</strong> It is the last touch on many paths, but journeys with it convert only a little better than journeys without it. Data-driven moves that credit to the channels that raise the chance of booking.</div>`; }
    else $('.at-loss-out').innerHTML = '<div class="notice warn">Not that one. Pick Data-driven in the model list and find the most negative change.</div>';
  });
  $('.at-hand-go').addEventListener('click', () => {
    ctx.act();
    const v = Number(String($('.at-hand').value).replace(/[^0-9.\-]/g, '')), truth = handAnswer(hp);
    if (String($('.at-hand').value).trim() !== '' && Math.abs(v - truth) <= Math.max(1, truth * 0.005)) { ctx.done('at5'); $('.at-hand-out').innerHTML = `<div class="notice ok"><strong>Right: ${inr(truth)}.</strong> First touch 40% = ${inr(hp.value * 0.4)}, last touch 40% = ${inr(hp.value * 0.4)}, and the two middle touches share 20%: 10% each = ${inr(truth)}.</div>`; }
    else $('.at-hand-out').innerHTML = '<div class="notice warn">Not quite. With 4 touches, the two middle ones share 20% of the value.</div>';
  });
  function limits() {
    $('.at-lim').innerHTML = LIMITS.map((l, i) => `<label class="w-check"><input type="checkbox" data-l="${i}"${S.lim[i] ? ' checked' : ''} /> ${esc(l.t)}</label>`).join('');
  }
  $('.at-lim').addEventListener('change', (e) => { const i = e.target.dataset.l; if (i === undefined) return; S.lim[i] = e.target.checked; ctx.save(); });
  $('.at-lim-go').addEventListener('click', () => {
    ctx.act();
    if (limitsRight(S.lim)) { ctx.done('at6'); $('.at-lim-out').innerHTML = '<div class="notice ok"><strong>Right.</strong> Attribution is correlational: it splits bookings that happened between the touches it can see. Consent gaps, other devices and offline media are invisible to it. It cannot say what would have happened without a channel. That is incrementality, and you measure it with an experiment (next lab), then use it to calibrate attribution and MMM.</div>'; }
    else $('.at-lim-out').innerHTML = '<div class="notice warn">Some ticks are wrong or missing. Ask of each one: does it need to know what would have happened without the ad?</div>';
  });
  function dataTables() {
    const rows = Object.entries(data.combos).sort((a, b) => b[1].conv - a[1].conv);
    $('.at-combos').innerHTML = `<thead><tr><th>Channels on the journey</th><th>Journeys</th><th>Bookings</th><th>Conversion rate</th></tr></thead><tbody>${rows.map(([, c]) => `<tr><td>${c.set.map((x) => esc(chName(x))).join(' + ')}</td><td>${c.journeys.toLocaleString('en-IN')}</td><td>${c.conv}</td><td>${pc(c.conv / c.journeys, 2)}</td></tr>`).join('')}</tbody>`;
    $('.at-paths').innerHTML = `<thead><tr><th>#</th><th>Path (days before booking)</th><th>Value</th></tr></thead><tbody>${data.paths.map((p) => `<tr><td>${p.id}</td><td style="text-align:left">${p.touches.map((t) => `${esc(chName(t.ch))} (${t.d})`).join(' → ')}</td><td>${inr(p.value)}</td></tr>`).join('')}</tbody>`;
  }
  render(); brand(); limits(); dataTables();
}
