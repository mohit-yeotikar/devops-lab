import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as HS from '../src/sandbox/martech/hubspot.js';
import * as AT from '../src/sandbox/martech/attribution.js';
import * as IN from '../src/sandbox/martech/incrementality.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test('lab metadata follows the widget-lab shape', () => {
  const sprints = { 'mk-hubspot': ['m11'], 'mk-attribution': ['m12'], 'mk-incrementality': ['m12'] };
  for (const m of [HS, AT, IN]) {
    const l = m.lab;
    assert.equal(l.track, 'martech'); assert.equal(l.kind, 'widget');
    assert.ok(['CRM', 'Measurement'].includes(l.topic));
    assert.deepEqual(l.sprints, sprints[l.id]);
    assert.equal(l.intro.length, 3);
    assert.ok(/simplified/i.test(l.intro.join(' ')), `${l.id} intro says it is a simplified simulator`);
    assert.ok(l.tasks.length >= 5 && l.tasks.length <= 7, `${l.id} task count`);
    assert.equal(new Set(l.tasks.map((t) => t.id)).size, l.tasks.length);
    for (const t of l.tasks) for (const k of ['id', 'text', 'why', 'hint']) assert.ok(t[k], `${l.id}/${t.id}.${k}`);
    assert.equal(l.quiz.length, 3);
    for (const q of l.quiz) { assert.ok(q.answer >= 0 && q.answer < q.options.length); assert.ok(q.why); }
    assert.equal(typeof m.mount, 'function');
  }
});

/* ---------------- HubSpot ---------------- */
test('hubspot: data and scoring', () => {
  assert.equal(HS.CONTACTS.length, 30);
  assert.equal(HS.CONTACTS.filter((c) => c.booked).length, 10);
  // scoring adds the points of matched criteria only
  const c = HS.CONTACTS[0];
  assert.equal(HS.scoreOf(c, { ride: 30, price: 10, student: -15 }), 40);
  // precision and recall by hand
  const ev = HS.evaluate(HS.AGENCY.points, HS.AGENCY.threshold);
  assert.equal(ev.mqls, ev.rows.filter((r) => r.mql).length);
  near(ev.precision, ev.tp / ev.mqls); near(ev.recall, ev.tp / 10);
  assert.ok(HS.pctClose(String((ev.precision * 100).toFixed(1)), ev.precision));
  assert.ok(!HS.pctClose('', ev.precision));
});
test('hubspot: the agency set-up is the "bad leads" case and a threshold alone cannot fix it', () => {
  const ev = HS.evaluate(HS.AGENCY.points, HS.AGENCY.threshold);
  assert.ok(ev.precision < 0.5, `agency precision ${ev.precision}`);
  assert.ok(!HS.meetsTarget(ev));
  for (let th = 0; th <= 100; th += 5) assert.ok(!HS.meetsTarget(HS.evaluate(HS.AGENCY.points, th)), `threshold ${th} alone should not reach the target`);
  assert.equal(HS.modelShape(HS.AGENCY.points).neg, 0);
});
test('hubspot: hs1 and hs3 are achievable with the hinted score', () => {
  const pts = { ride: 30, price: 10, pages: 10, open: 10, budget: 15, fleet: 20, student: -15, nobudget: -20, jobs: -30 };
  const sh = HS.modelShape(pts);
  assert.ok(sh.pos >= 3 && sh.neg >= 2 && !sh.flipped.length, 'hs1');
  const ev = HS.evaluate(pts, 40);
  assert.ok(HS.meetsTarget(ev), `precision ${ev.precision} recall ${ev.recall}`);
  assert.deepEqual(HS.modelShape({ ride: 30, student: 15 }).flipped, ['Student email (.ac.in or .edu)']);
});
test('hubspot: workflow validation catches the agency mistakes and passes a correct workflow', () => {
  const bad = HS.validateWorkflow(HS.startWorkflow());
  assert.ok(bad.errors.length >= 5);
  assert.ok(bad.errors.some((e) => /Kochi/.test(e) && /Nagpur/.test(e) && /Guwahati/.test(e)), 'missing owners listed');
  assert.ok(bad.errors.some((e) => /Re-enrolment/.test(e)));
  const wf = HS.startWorkflow();
  Object.assign(wf, { trigger: 'mql', reenrol: 'form', steps: ['owner', 'task', 'notify', 'delay', 'branch'], fallback: HS.INSIDE });
  assert.deepEqual(HS.validateWorkflow(wf).errors, []);
  // also fine without fallback when every city is mapped
  const wf2 = { ...wf, fallback: '', map: Object.fromEntries(HS.CITIES.map((c) => [c, HS.DEALERS[c] || HS.INSIDE])) };
  assert.deepEqual(HS.validateWorkflow(wf2).errors, []);
  // branch without a delay before it is an error
  assert.ok(HS.validateWorkflow({ ...wf, steps: ['owner', 'task', 'notify', 'branch', 'delay'] }).errors.length === 1);
  assert.ok(HS.validateWorkflow({ ...wf, reenrol: 'off' }).errors.length === 1);
});
test('hubspot: guided questions have one valid answer each and cover hs5 and hs6', () => {
  for (const q of HS.QUESTIONS) assert.ok(q.c >= 0 && q.c < q.o.length && q.x);
  assert.deepEqual([...new Set(HS.QUESTIONS.map((q) => q.task))].sort(), ['hs5', 'hs6']);
});

/* ---------------- Attribution ---------------- */
const data = AT.buildData();
const total = AT.totalValue(data);
test('attribution: dataset shape', () => {
  assert.equal(data.paths.length, 200);
  const conv = Object.values(data.combos).reduce((a, c) => a + c.conv, 0);
  assert.equal(conv, 200, 'combination table holds the same 200 bookings');
  for (const p of data.paths) {
    assert.ok(p.touches.length >= 1 && p.touches.length <= 5);
    for (let i = 1; i < p.touches.length; i++) assert.ok(p.touches[i].d <= p.touches[i - 1].d, 'touches in time order');
    assert.ok(data.combos[[...new Set(p.touches.map((t) => t.ch))].sort().join('+')], 'path combination is in the table');
  }
  for (const id of AT.CH_IDS) assert.ok(data.paths.some((p) => p.touches.some((t) => t.ch === id)), `${id} appears`);
  // every subset of every combination has data, so Shapley never meets a hole
  for (const c of Object.values(data.combos)) {
    for (let m = 1; m < 1 << c.set.length; m++) { const s = c.set.filter((_, i) => m & (1 << i)); assert.ok(data.combos[s.join('+')], s.join('+')); }
  }
  assert.deepEqual(AT.buildData(), data, 'deterministic');
});
test('attribution: weights sum to 1 for every rules-based model and half-life', () => {
  for (const p of data.paths) for (const m of ['last', 'first', 'linear', 'position']) near(AT.weights(m, p.touches).reduce((a, b) => a + b, 0), 1, 1e-9);
  for (const h of [1, 7, 30]) for (const p of data.paths) near(AT.weights('decay', p.touches, h).reduce((a, b) => a + b, 0), 1, 1e-9);
  const t = [{ ch: 'yt', d: 20 }, { ch: 'meta', d: 10 }, { ch: 'psg', d: 5 }, { ch: 'psb', d: 0 }];
  assert.deepEqual(AT.weights('position', t).map((x) => +x.toFixed(10)), [0.4, 0.1, 0.1, 0.4]);
  const d7 = AT.weights('decay', [{ ch: 'a', d: 7 }, { ch: 'b', d: 0 }], 7);
  near(d7[1] / d7[0], 2, 1e-12); // a touch one half-life older gets half the weight
});
test('attribution: every model gives out exactly the total booking value', () => {
  for (const m of Object.keys(AT.MODELS)) for (const h of [1, 7, 30]) {
    const sum = Object.values(AT.credit(m, data, h)).reduce((a, b) => a + b, 0);
    near(sum, total, 1e-3);
  }
});
test('attribution: Shapley values are exact and efficient', () => {
  // glove game: L owns a left glove, R1 and R2 right gloves; a pair is worth 1
  const v = (s) => (s.includes('L') && (s.includes('R1') || s.includes('R2')) ? 1 : 0);
  const phi = AT.shapley(['L', 'R1', 'R2'], v);
  near(phi.L, 2 / 3); near(phi.R1, 1 / 6); near(phi.R2, 1 / 6);
  // additive game: Shapley returns each player's own value
  const add = AT.shapley(['a', 'b', 'c'], (s) => s.reduce((x, p) => x + { a: 1, b: 2, c: 5 }[p], 0));
  near(add.a, 1); near(add.b, 2); near(add.c, 5);
  // efficiency on the real conversion-rate function for every path
  const rate = AT.rateFn(data.combos);
  for (const p of data.paths) {
    const players = [...new Set(p.touches.map((t) => t.ch))].sort();
    const sv = AT.shapley(players, rate);
    near(Object.values(sv).reduce((a, b) => a + b, 0), rate(players) - rate([]), 1e-12);
    const split = AT.ddaSplit(p.touches, rate);
    near(Object.values(split).reduce((a, b) => a + b, 0), 1, 1e-12);
  }
});
test('attribution: the story behind each task holds', () => {
  // at1: YouTube is the channel last click under-credits most, in linear and in data-driven
  assert.equal(AT.biggestShift(data, 'linear', 1), 'yt');
  assert.equal(AT.biggestShift(data, 'dda', 1), 'yt');
  // at2: brand search is nearly always the last touch when present, and dominates last click
  assert.ok(AT.brandLastRate(data) >= 0.9);
  const lc = AT.shares(AT.credit('last', data));
  assert.equal(Object.entries(lc).sort((a, b) => b[1] - a[1])[0][0], 'psb');
  // at3: the default 7-day half-life is below the target, a longer one reaches it, and decay moves from last click to linear
  assert.ok(AT.upperShare(data, 7) < AT.UPPER_TARGET);
  assert.ok(AT.upperShare(data, 14) >= AT.UPPER_TARGET);
  for (let h = 2; h <= 30; h++) assert.ok(AT.upperShare(data, h) >= AT.upperShare(data, h - 1) - 1e-12, 'monotone in half-life');
  // at4: brand search loses the most in data-driven
  assert.equal(AT.biggestShift(data, 'dda', -1), 'psb');
  // at5: the hand path has 4 touches and the middle touch gets 10%
  const hp = AT.handPath(data);
  assert.equal(hp.touches.length, 4);
  near(AT.handAnswer(hp), hp.value * 0.1, 1e-6);
  // at6: the right ticks pass, anything else fails
  const right = Object.fromEntries(AT.LIMITS.map((l, i) => [i, l.ok]));
  assert.ok(AT.limitsRight(right));
  assert.ok(!AT.limitsRight({ ...right, 1: true }));
  assert.ok(!AT.limitsRight({}));
});

/* ---------------- Incrementality ---------------- */
test('incrementality: DiD recovers a known lift on a constructed dataset', () => {
  // control grows like treatment (treatment = 2 × control); +50 bookings per week after launch
  const pre = 8, post = 6;
  const C = Array.from({ length: pre + post }, (_, w) => 100 + 3 * w + (w % 2 ? 2 : -2));
  const T = C.map((c, w) => 2 * c + (w >= pre ? 50 : 0) + (w % 3 === 0 ? 1 : -0.5));
  const d = IN.did(T, C, pre);
  near(d.k, T.slice(0, pre).reduce((a, b) => a + b, 0) / C.slice(0, pre).reduce((a, b) => a + b, 0));
  assert.ok(Math.abs(d.perWeek - 50) < 3, `per week ${d.perWeek}`);
  near(d.incr, d.perWeek * post);
  assert.ok(d.lo > 0 && d.hi > d.incr && d.lo < d.incr);
  // no effect: the estimate is near zero and the interval covers zero
  const T0 = C.map((c, w) => 2 * c + (w % 3 === 0 ? 1 : -0.5));
  const z = IN.did(T0, C, pre);
  assert.ok(Math.abs(z.perWeek) < 2 && z.lo < 0 && z.hi > 0);
});
test('incrementality: noise-free geo data gives the true lift', () => {
  const base = IN.geoBase().map((c) => ({ ...c, obs: c.exp.slice() }));
  const R = IN.geoReport(base, IN.matchedPairs(base), 8);
  assert.ok(Math.abs(R.incr / R.trueIncr - 1) < 0.08, `estimate ${R.incr} vs truth ${R.trueIncr}`);
  assert.ok(Math.abs(R.icpa / IN.TRUE_ICPA - 1) < 0.08);
  near(R.platformConv, R.spend / IN.PLATFORM_CPA);
});
test('incrementality: geo tasks in1-in3 are achievable and a bad design is caught', () => {
  const base = IN.geoBase();
  const mp = IN.matchedPairs(base);
  const g = IN.groupSizes(mp);
  assert.equal(g.t + g.c, 20);
  const short = IN.geoReport(base, mp, 2), long = IN.geoReport(base, mp, 8);
  assert.ok(IN.balanced(mp, long), `in1: mape ${long.mape}`);
  assert.ok(short.lo <= 0, 'a 2-week test is inconclusive');
  assert.ok(long.lo > 0, 'in2: an 8-week test excludes zero');
  assert.ok(long.icpa > 900 && long.icpa < 1400, `iCPA ${long.icpa} is near the true ₹1,100`);
  near(long.iroas, (long.incr * IN.BOOKING_VALUE) / long.spend);
  assert.ok(long.icpa > 2 * IN.PLATFORM_CPA, 'incremental CPA is far above the platform CPA');
  // all metros in treatment, smaller cities in control: the pre-period fit fails
  const bad = base.map((_, i) => (i < 6 ? 'T' : 'C'));
  assert.ok(!IN.balanced(bad, IN.geoReport(base, bad, 8)));
  // too few cities fails too
  const few = base.map((_, i) => (i < 2 ? 'T' : i < 4 ? 'C' : ''));
  assert.ok(!IN.balanced(few, IN.geoReport(base, few, 8)));
});
test('incrementality: MMM building blocks', () => {
  assert.deepEqual(IN.adstock([10, 0, 0], 0.5), [10, 5, 2.5]);
  near(IN.hill(20, 20), 0.5); assert.equal(IN.hill(0, 20), 0);
  const x = IN.solve([[2, 1], [1, 3]], [3, 5]); near(x[0], 0.8); near(x[1], 1.4);
  const b = IN.ols([[1, 0], [1, 1], [1, 2], [1, 3]], [1, 3, 5, 7]); near(b[0], 1); near(b[1], 2);
  // marginal = numerical derivative of the response curve
  const [beta, d, K, s] = [100, 0.4, 30, 12];
  near(IN.marginal(beta, d, K, s), (IN.response(beta, d, K, s + 1e-5) - IN.response(beta, d, K, s - 1e-5)) / 2e-5, 1e-5);
});
test('incrementality: MMM tasks in4-in6 are achievable', () => {
  const data = IN.mmmData();
  const start = IN.fitMMM(data, IN.MMM_START);
  assert.ok(!IN.fitOk(start), `start R² ${start.r2}`);
  const fit = IN.fitMMM(data, IN.MMM_TRUE);
  assert.ok(IN.fitOk(fit), `true-parameter R² ${fit.r2}`);
  // the true parameters are reachable with the sliders (decay step 0.05, K step 5 from 5 to 150)
  for (const c of IN.MMM_CH) { const p = IN.MMM_TRUE[c.id]; assert.ok(Math.abs(p.decay / 0.05 - Math.round(p.decay / 0.05)) < 1e-9 && p.K % 5 === 0 && p.K >= 5 && p.K <= 150); }
  // the fitted coefficients are close to the truth
  for (const c of IN.MMM_CH) assert.ok(Math.abs(fit.beta[c.id] / IN.MMM_TRUE[c.id].beta - 1) < 0.35, `${c.id} beta ${fit.beta[c.id]}`);
  const plan = IN.currentPlan(data), total = Object.values(plan).reduce((a, b) => a + b, 0);
  assert.ok(['yt', 'meta'].includes(IN.bestMarginal(fit, IN.MMM_TRUE, plan)), 'in5: video/social have the steepest curves');
  const better = IN.greedyPlan(fit, IN.MMM_TRUE, total);
  assert.equal(Object.values(better).reduce((a, b) => a + b, 0), total);
  const gain = IN.predict(fit, IN.MMM_TRUE, better) / IN.predict(fit, IN.MMM_TRUE, plan) - 1;
  assert.ok(gain >= IN.REALLOC_TARGET, `in6: gain ${gain}`);
  // a simple manual move also works: shift ₹12 L a week from TV to YouTube and Meta
  const manual = { ...plan, tv: plan.tv - 12, yt: plan.yt + 6, meta: plan.meta + 6 };
  assert.ok(IN.predict(fit, IN.MMM_TRUE, manual) / IN.predict(fit, IN.MMM_TRUE, plan) - 1 >= IN.REALLOC_TARGET);
});
test('incrementality: CMO case question', () => {
  assert.ok(IN.CMO_Q.c >= 0 && IN.CMO_Q.c < IN.CMO_Q.o.length);
  assert.ok(/1,100/.test(IN.CMO_Q.o[IN.CMO_Q.c]));
});
