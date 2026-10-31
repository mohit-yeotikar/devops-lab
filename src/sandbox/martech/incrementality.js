// Lab mk-incrementality: a geo holdout test (difference-in-differences with a scaled control, CI, iCPA, iROAS)
// and marketing mix modelling basics (adstock, Hill saturation, fit, marginal ROI, budget reallocation).
// Simplified simulator, fake data.

export const lab = {
  id: 'mk-incrementality', track: 'martech', kind: 'widget', title: 'Incrementality and MMM basics', topic: 'Measurement', minutes: 40, sprints: ['m12'],
  summary: 'Design and read a geo holdout test for Meta across 20 Indian cities, then fit a small media mix model and move budget to where the next rupee works hardest.',
  intro: [
    'This is a simplified simulator with fake Voltra data. Part 1 is a geo holdout: Meta prospecting runs only in treatment cities. Control cities show what would have happened without it. The difference is the incremental effect.',
    'You pick the cities and the test length. The tool scales the control to match the treatment before the test (pre-period fit), then compares the gap after launch (difference-in-differences). It shows a 95% confidence interval and the incremental cost per booking (iCPA).',
    'Part 2 is marketing mix modelling (MMM) on 52 weeks of spend and sales. You set adstock (how long an ad keeps working) and saturation (when more spend stops helping) per channel, then use the fitted model to move budget. Real teams use open-source tools for this, such as Google Meridian and Meta Robyn.',
  ],
  tasks: [
    { id: 'in1', text: 'Pick a balanced control: pre-period fit error (MAPE) of 2.5% or less, with at least 4 cities in each group.', why: 'If control cities do not move like treatment cities before the test, the "lift" after launch is partly their different trend.', hint: 'Press "Use matched pairs", or mix big metros and smaller cities in both groups.' },
    { id: 'in2', text: 'Run the test long enough that the 95% confidence interval of the lift excludes zero.', why: 'A short test gives a wide interval. "Not significant" after 2 weeks usually means "too short", not "no effect".', hint: 'Keep the balanced groups and move the test length up to 6-8 weeks.' },
    { id: 'in3', text: 'Calculate the iCPA and the iROAS of your test.', why: 'iCPA is what one extra booking really costs. It is the number for budget decisions, not the platform CPA.', hint: 'iCPA = Meta spend ÷ incremental bookings. iROAS = incremental bookings × ₹4,800 ÷ spend.' },
    { id: 'in4', text: 'Fit the MMM: reach R² of 0.90 or more, with no negative channel effect.', why: 'A model that does not explain past sales cannot guide future budgets.', hint: 'TV ads keep working for weeks (high decay). Search works the same week (decay near 0). Lower the saturation point for channels that flatten quickly.' },
    { id: 'in5', text: 'Read the model: find the channel with the highest marginal ROI.', why: 'Average ROI looks back. Marginal ROI says what the next rupee will do.', hint: 'Look at the "Next ₹1 returns" column.' },
    { id: 'in6', text: 'Reallocate the budget: raise predicted weekly sales by 2% or more without going over the total.', why: 'Moving money from saturated to unsaturated channels is the cheapest growth there is.', hint: 'Take money from the channel with the lowest marginal ROI and give it to the highest. Watch the total.' },
    { id: 'in7', text: 'Case: Meta says CPA ₹400, the holdout says iCPA ₹1,100. Answer what you tell the CMO.', why: 'This conversation happens in every company that runs its first lift test.', hint: 'Platforms count bookings by people who saw an ad. A holdout counts only the extra bookings.' },
  ],
  quiz: [
    { q: 'A 2-week geo test shows +4% bookings with a 95% CI of −3% to +11%. What do you say?', options: ['Meta does not work', 'The test is too short to tell; extend it or plan a longer test with a power calculation', 'Meta lifts bookings by 4%', 'Use the upper bound'], answer: 1, why: 'The interval includes zero and big effects. The test lacked power, so it cannot tell.' },
    { q: 'What does adstock with a decay of 0.7 mean?', options: ['70% of spend is wasted', 'Each week 70% of last week\'s ad effect carries over', 'Sales fall 70%', 'Spend is capped at 70%'], answer: 1, why: 'Adstock models carry-over. A high decay means the ad keeps working for weeks (typical for TV).' },
    { q: 'Meta reports CPA ₹400. A clean holdout shows iCPA ₹1,100. Which number goes into the budget plan?', options: ['₹400, it has more data', '₹1,100, it measures the extra bookings caused by the ads', 'The average, ₹750', 'Neither'], answer: 1, why: 'Plan on incremental cost. Use the ratio (about 2.75×) to calibrate platform numbers until the next test.' },
  ],
};

/** Seeded random numbers (mulberry32) and normal draws, so every learner sees the same data. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const randn = (r) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/* ======================= Part 1: geo holdout ======================= */
export const PRE = 8, MAX_POST = 12;
export const LIFT = 0.06;          // true incremental lift of Meta in treatment cities
export const TRUE_ICPA = 1100;     // spend is set so that one extra booking costs ₹1,100
export const PLATFORM_CPA = 400;   // what Meta Ads Manager reports
export const BOOKING_VALUE = 4800; // contribution per booking: 40% become deliveries × ₹12,000 contribution
export const MAPE_MAX = 0.025;
const METRO = 0.02, TIER2 = 0.002;
export const GEO = [
  ['Delhi', 320, METRO], ['Mumbai', 300, METRO], ['Bengaluru', 340, METRO], ['Pune', 220, METRO], ['Hyderabad', 240, METRO], ['Chennai', 200, METRO],
  ['Kolkata', 150, TIER2], ['Ahmedabad', 160, TIER2], ['Jaipur', 120, TIER2], ['Lucknow', 110, TIER2], ['Indore', 90, TIER2], ['Surat', 100, TIER2],
  ['Kochi', 80, TIER2], ['Chandigarh', 70, TIER2], ['Nagpur', 75, TIER2], ['Bhopal', 60, TIER2], ['Coimbatore', 85, TIER2], ['Visakhapatnam', 65, TIER2],
  ['Vadodara', 70, TIER2], ['Guwahati', 50, TIER2],
].map(([name, base, trend]) => ({ name, base: base * 1.5, trend }));
const SEASON = Array.from({ length: PRE + MAX_POST }, (_, w) => 1 + 0.06 * Math.sin((w / 20) * Math.PI * 2) + (w === 5 ? 0.05 : 0));

/** Weekly bookings per city without any test (expected and observed with noise). Noise is fixed per city-week. */
export function geoBase(seed = 4) {
  const r = rng(seed);
  return GEO.map((c) => {
    const exp = [], obs = [];
    for (let w = 0; w < PRE + MAX_POST; w++) {
      const e = c.base * (1 + c.trend) ** w * SEASON[w];
      exp.push(e);
      obs.push(Math.max(0, e * (1 + 0.03 * randn(r)) + Math.sqrt(e) * randn(r)));
    }
    return { ...c, exp, obs };
  });
}
/** assign: array of 'T' | 'C' | '' per city. Returns weekly series with the test effect added to treatment cities. */
export function geoRun(base, assign, weeks) {
  const n = PRE + weeks;
  const T = Array(n).fill(0), Cn = Array(n).fill(0);
  let spend = 0, trueIncr = 0;
  base.forEach((c, i) => {
    for (let w = 0; w < n; w++) {
      let y = c.obs[w];
      if (assign[i] === 'T' && w >= PRE) { const inc = LIFT * c.exp[w]; y += inc; trueIncr += inc; spend += inc * TRUE_ICPA; }
      if (assign[i] === 'T') T[w] += y; else if (assign[i] === 'C') Cn[w] += y;
    }
  });
  return { T: T.map(Math.round), C: Cn.map(Math.round), spend: Math.round(spend / 100) * 100, trueIncr };
}
// two-sided 95% t critical values by degrees of freedom
const T95 = [12.71, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228];
export const tcrit = (df) => (df >= 1 && df <= 10 ? T95[df - 1] : 1.96 + 2.5 / df);
/**
 * Difference-in-differences with a scaled control.
 * k = treatment ÷ control in the pre-period. gap_w = T_w − k·C_w.
 * Lift per week = mean(gap after launch) − mean(gap before launch).
 * Standard error from the week-to-week spread of the gap before launch.
 */
export function did(T, C, pre = PRE) {
  const n = T.length, post = n - pre;
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const k = sum(T.slice(0, pre)) / sum(C.slice(0, pre));
  const gap = T.map((t, w) => t - k * C[w]);
  const gPre = gap.slice(0, pre), gPost = gap.slice(pre);
  const mPre = sum(gPre) / pre, mPost = post ? sum(gPost) / post : 0;
  const sd = Math.sqrt(sum(gPre.map((g) => (g - mPre) ** 2)) / (pre - 1));
  const mape = sum(gPre.map((g, w) => Math.abs(g) / T[w])) / pre;
  const perWeek = mPost - mPre;
  const se = post ? sd * Math.sqrt(1 / pre + 1 / post) : Infinity;
  const tc = tcrit(pre - 1);
  const incr = perWeek * post;
  const counter = sum(C.slice(pre).map((c) => k * c)) + mPre * post;
  return { k, gap, mape, perWeek, se, incr, lo: (perWeek - tc * se) * post, hi: (perWeek + tc * se) * post, liftPct: counter ? incr / counter : 0, fitted: C.map((c) => k * c + mPre) };
}
export function matchedPairs(base, seed = 5) {
  const r = rng(seed);
  const order = base.map((c, i) => ({ i, m: c.obs.slice(0, PRE).reduce((a, b) => a + b, 0) })).sort((a, b) => b.m - a.m);
  const assign = Array(base.length).fill('');
  for (let j = 0; j < order.length; j += 2) {
    const flip = r() < 0.5;
    assign[order[j].i] = flip ? 'T' : 'C';
    if (order[j + 1]) assign[order[j + 1].i] = flip ? 'C' : 'T';
  }
  return assign;
}
export const groupSizes = (assign) => ({ t: assign.filter((a) => a === 'T').length, c: assign.filter((a) => a === 'C').length });
export const balanced = (assign, res) => { const g = groupSizes(assign); return g.t >= 4 && g.c >= 4 && res.mape <= MAPE_MAX; };
export function geoReport(base, assign, weeks) {
  const run = geoRun(base, assign, weeks);
  const d = did(run.T, run.C);
  const icpa = d.incr > 0 ? run.spend / d.incr : Infinity;
  const iroas = run.spend ? (d.incr * BOOKING_VALUE) / run.spend : 0;
  return { ...run, ...d, icpa, iroas, platformConv: run.spend / PLATFORM_CPA, weeks };
}

/* ======================= Part 2: MMM ======================= */
export const WEEKS = 52;
export const MMM_CH = [
  { id: 'tv', name: 'TV' }, { id: 'yt', name: 'YouTube' }, { id: 'meta', name: 'Meta' }, { id: 'search', name: 'Search' },
];
/** The hidden truth that generated the sales data (₹ lakh per week). */
export const MMM_TRUE = { tv: { decay: 0.6, K: 20, beta: 80 }, yt: { decay: 0.3, K: 60, beta: 120 }, meta: { decay: 0.1, K: 60, beta: 120 }, search: { decay: 0, K: 10, beta: 25 } };
export const MMM_START = { tv: { decay: 0, K: 100 }, yt: { decay: 0, K: 100 }, meta: { decay: 0, K: 100 }, search: { decay: 0, K: 100 } };
export const BASE_SALES = 300, FESTIVE_LIFT = 40;

export function adstock(x, decay) { const out = []; let a = 0; for (const v of x) { a = v + decay * a; out.push(a); } return out; }
export const hill = (a, K) => (a <= 0 ? 0 : a / (a + K));

export function mmmData(seed = 5) {
  const r = rng(seed);
  const spend = { tv: [], yt: [], meta: [], search: [] }, festive = [];
  for (let w = 0; w < WEEKS; w++) {
    const tvOn = (w >= 3 && w <= 8) || (w >= 17 && w <= 22) || (w >= 31 && w <= 35) || (w >= 40 && w <= 46);
    spend.tv.push(tvOn ? Math.round(50 + r() * 30) : 0);
    spend.yt.push(r() < 0.25 ? 0 : Math.round(6 + r() * 18));
    spend.meta.push(Math.round(8 + r() * 16));
    festive.push(w >= 41 && w <= 45 ? 1 : 0);
    spend.search.push(Math.round(2 + r() * 16 + festive[w] * 4));
  }
  const parts = {};
  for (const c of MMM_CH) parts[c.id] = adstock(spend[c.id], MMM_TRUE[c.id].decay).map((a) => MMM_TRUE[c.id].beta * hill(a, MMM_TRUE[c.id].K));
  const sales = spend.tv.map((_, w) => Math.round((BASE_SALES + FESTIVE_LIFT * festive[w] + MMM_CH.reduce((s, c) => s + parts[c.id][w], 0) + 5 * randn(r)) * 10) / 10);
  return { spend, festive, sales };
}
/** Solve A·x = b (small dense system) with Gaussian elimination and partial pivoting. */
export function solve(A, b) {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) return null;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((row, i) => row[n] / row[i]);
}
/** Ordinary least squares. X: rows of features (include a 1 for the intercept). */
export function ols(X, y) {
  const p = X[0].length;
  const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0)));
  const Xty = Array.from({ length: p }, (_, i) => X.reduce((s, r, k) => s + r[i] * y[k], 0));
  return solve(XtX, Xty);
}
/** Fits base, festive and one coefficient (beta) per channel for the given adstock decay and Hill half-saturation K. */
export function fitMMM(data, params) {
  const feats = MMM_CH.map((c) => adstock(data.spend[c.id], params[c.id].decay).map((a) => hill(a, params[c.id].K)));
  const X = data.sales.map((_, w) => [1, data.festive[w], ...feats.map((f) => f[w])]);
  const coef = ols(X, data.sales);
  if (!coef) return null;
  const fitted = X.map((row) => row.reduce((s, x, i) => s + x * coef[i], 0));
  const mean = data.sales.reduce((a, b) => a + b, 0) / data.sales.length;
  const sse = data.sales.reduce((s, y, i) => s + (y - fitted[i]) ** 2, 0), sst = data.sales.reduce((s, y) => s + (y - mean) ** 2, 0);
  const beta = {}; MMM_CH.forEach((c, i) => (beta[c.id] = coef[2 + i]));
  return { base: coef[0], festive: coef[1], beta, fitted, r2: 1 - sse / sst };
}
export const fitOk = (fit) => !!fit && fit.r2 >= 0.9 && Object.values(fit.beta).every((b) => b >= 0);
/** Weekly sales effect of a steady weekly spend x (steady-state adstock = x ÷ (1 − decay)). */
export const response = (beta, decay, K, x) => beta * hill(x / (1 - decay), K);
/** Extra sales from the next ₹1 of weekly spend (derivative of the response curve). */
export const marginal = (beta, decay, K, x) => { const A = x / (1 - decay); return (beta * K) / ((A + K) ** 2 * (1 - decay)); };
export const currentPlan = (data) => Object.fromEntries(MMM_CH.map((c) => [c.id, Math.round(data.spend[c.id].reduce((a, b) => a + b, 0) / WEEKS)]));
export function predict(fit, params, plan) {
  return fit.base + MMM_CH.reduce((s, c) => s + response(fit.beta[c.id], params[c.id].decay, params[c.id].K, plan[c.id] || 0), 0);
}
export const bestMarginal = (fit, params, plan) => MMM_CH.map((c) => ({ id: c.id, m: marginal(fit.beta[c.id], params[c.id].decay, params[c.id].K, plan[c.id]) })).sort((a, b) => b.m - a.m)[0].id;
/** Greedy allocation in ₹1 lakh steps by marginal ROI (used by the tests to show the task is achievable). */
export function greedyPlan(fit, params, total) {
  const plan = Object.fromEntries(MMM_CH.map((c) => [c.id, 0]));
  for (let i = 0; i < total; i++) {
    const best = MMM_CH.map((c) => ({ id: c.id, g: response(fit.beta[c.id], params[c.id].decay, params[c.id].K, plan[c.id] + 1) - response(fit.beta[c.id], params[c.id].decay, params[c.id].K, plan[c.id]) })).sort((a, b) => b.g - a.g)[0];
    plan[best.id]++;
  }
  return plan;
}
export const REALLOC_TARGET = 0.02;

/* ======================= Case question ======================= */
export const CMO_Q = {
  q: 'Meta Ads Manager says CPA ₹400. Your geo holdout says the incremental CPA is about ₹1,100. What do you tell the CMO?',
  o: [
    'The holdout is wrong because it disagrees with Meta, which has far more data',
    'Meta still works, but each extra booking costs about ₹1,100, not ₹400. Meta also counts people who saw an ad and would have booked anyway. We plan budgets on ₹1,100, compare it with other channels\' incremental CPA and with the ₹4,800 contribution per booking, use the ratio (about 2.75×) to correct Meta\'s daily numbers, feed the result into the MMM, and re-test in two quarters',
    'Switch Meta off at once, because ₹1,100 is almost three times ₹400',
    'Report the average of the two numbers, ₹750, to keep everyone happy',
  ],
  c: 1,
  x: 'Platform attribution counts view-through and click-through bookings, including people who were going to book anyway. The holdout counts only extra bookings. Both are true answers to different questions. Decisions use the incremental number; the platform number is still useful for daily optimisation once calibrated.',
};

/* ======================= UI ======================= */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const num = (n) => Math.round(n).toLocaleString('en-IN');
const pc = (x, d = 1) => (x * 100).toFixed(d) + '%';
function lineChart(series, opts = {}) {
  const W = 600, H = 200, P = 8;
  const all = series.flatMap((s) => s.y);
  const lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
  const n = Math.max(...series.map((s) => s.y.length));
  const X = (i) => P + (i / Math.max(1, n - 1)) * (W - 2 * P), Y = (v) => H - P - ((v - lo) / span) * (H - 2 * P);
  const mark = opts.mark != null ? `<line x1="${X(opts.mark)}" x2="${X(opts.mark)}" y1="0" y2="${H}" class="mtc-mark" />` : '';
  return `<svg class="a-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(opts.label || 'Chart')}">${mark}${series.map((s) => `<polyline fill="none" class="${s.cls}" points="${s.y.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" />`).join('')}</svg>`;
}

export function mount(el, ctx) {
  const S = ctx.state;
  const base = geoBase(), data = mmmData(), plan0 = currentPlan(data);
  const total = Object.values(plan0).reduce((a, b) => a + b, 0);
  S.assign ??= Array(GEO.length).fill('');
  S.weeks ??= 2;
  S.params ??= JSON.parse(JSON.stringify(MMM_START));
  S.plan ??= { ...plan0 };
  S.ans ??= {};
  el.innerHTML = `
    <section class="card">
      <h3 style="margin-top:0">Part 1 · Geo holdout for Meta prospecting</h3>
      <p class="help">Tap a city to cycle: not in test → Treatment (Meta on) → Control (Meta off). The pre-period is the ${PRE} weeks before launch. Platform-reported Meta CPA: ${inr(PLATFORM_CPA)}.</p>
      <div class="row"><button type="button" class="btn sec sm g-pairs">Use matched pairs</button><button type="button" class="btn sec sm g-clear">Clear</button><span class="help g-sizes"></span></div>
      <div class="mtc-cities g-cities"></div>
      <label style="margin-top:12px">Test length: <b class="g-wv"></b><input type="range" class="g-weeks" min="1" max="${MAX_POST}" step="1" style="padding:0" /></label>
      <div class="legend"><span><i style="background:var(--signal)"></i>Treatment cities</span><span><i style="background:var(--warn)"></i>Control, scaled to match before launch</span><span><i style="background:var(--text-3)"></i>Launch</span></div>
      <div class="g-chart"></div>
      <div class="kpis g-kpis"></div>
      <div class="g-msg"></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">Calculate iCPA and iROAS</h3>
      <p class="help">Use the numbers of the test above. Contribution per booking: ₹4,800 (40% of bookings become deliveries × ₹12,000 contribution per scooter).</p>
      <div class="row"><div style="flex:1 1 150px"><label>iCPA in ₹<input class="g-icpa" type="text" inputmode="decimal" /></label></div><div style="flex:1 1 150px"><label>iROAS (e.g. 4.4)<input class="g-iroas" type="text" inputmode="decimal" /></label></div><button type="button" class="btn sm g-calc">Check</button></div>
      <div class="g-calcout"></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">Part 2 · Media mix model (MMM)</h3>
      <p class="help">52 weeks of spend (₹ lakh per week) and sales (₹ lakh per week). For each channel set the adstock decay (share of last week's effect that carries over) and the saturation point K (adstocked spend at which the channel gives half its maximum effect; Hill curve with shape 1). The tool then fits the base, a Diwali effect and one coefficient per channel by least squares. Google Meridian (Bayesian) and Meta Robyn (ridge regression with automatic search) do this for real, with priors, uncertainty and calibration from lift tests.</p>
      <div class="tbl"><table class="m-params"></table></div>
      <div class="legend"><span><i style="background:var(--text-3)"></i>Actual sales</span><span><i style="background:var(--signal)"></i>Model</span></div>
      <div class="m-chart"></div>
      <div class="kpis m-kpis"></div>
      <div class="m-msg"></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">Marginal ROI and budget</h3>
      <div class="m-locked"></div>
      <div class="m-body">
        <div class="tbl"><table class="m-roi"></table></div>
        <div class="w-q"><p><b>Which channel has the highest marginal ROI at today's spend?</b></p><div class="row"><select class="m-best" aria-label="Channel"><option value="">Choose</option>${MMM_CH.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><button type="button" class="btn sm m-bestgo">Check</button></div><div class="m-bestout"></div></div>
        <div class="kpis m-pkpis"></div>
        <div class="m-pmsg"></div>
      </div>
    </section>
    <section class="card"><h3 style="margin-top:0">Case question for the CMO</h3><div class="w-q"><p><b>${esc(CMO_Q.q)}</b></p><div class="w-opts c-opts"></div><div class="c-out"></div></div></section>`;
  const $ = (s) => el.querySelector(s);
  $('.g-weeks').value = S.weeks;

  /* ---- geo ---- */
  function geo() {
    $('.g-cities').innerHTML = base.map((c, i) => `<button type="button" class="mtc-city ${S.assign[i] === 'T' ? 'is-t' : S.assign[i] === 'C' ? 'is-c' : ''}" data-i="${i}" aria-label="${esc(c.name)}: ${S.assign[i] === 'T' ? 'treatment' : S.assign[i] === 'C' ? 'control' : 'not in test'}"><b>${esc(c.name)}</b><span>${Math.round(c.obs.slice(0, PRE).reduce((a, b) => a + b, 0) / PRE)}/wk · ${S.assign[i] === 'T' ? 'Treatment' : S.assign[i] === 'C' ? 'Control' : '–'}</span></button>`).join('');
    const g = groupSizes(S.assign);
    $('.g-sizes').textContent = `${g.t} treatment · ${g.c} control`;
    $('.g-wv').textContent = `${S.weeks} week${S.weeks > 1 ? 's' : ''}`;
    if (!g.t || !g.c) { $('.g-chart').innerHTML = ''; $('.g-kpis').innerHTML = ''; $('.g-msg').innerHTML = '<p class="help">Put at least one city in each group.</p>'; return; }
    const R = geoReport(base, S.assign, S.weeks);
    $('.g-chart').innerHTML = lineChart([{ y: R.T, cls: 'mtc-l1' }, { y: R.fitted, cls: 'mtc-l2' }], { mark: PRE - 0.5, label: 'Treatment vs scaled control by week' });
    const sig = R.lo > 0, bal = balanced(S.assign, R);
    $('.g-kpis').innerHTML = `<div><span class="eyebrow">Pre-period fit error (MAPE)</span><span class="big ${R.mape <= MAPE_MAX ? 'ok' : 'err'}">${pc(R.mape, 1)}</span></div><div><span class="eyebrow">Incremental bookings</span><span class="big">${num(R.incr)}</span></div><div><span class="eyebrow">95% CI</span><span class="big ${sig ? 'ok' : ''}">${num(R.lo)} to ${num(R.hi)}</span></div><div><span class="eyebrow">Lift</span><span class="big">${pc(R.liftPct)}</span></div><div><span class="eyebrow">Meta spend</span><span class="big">${inr(R.spend)}</span></div><div><span class="eyebrow">Platform-reported conversions</span><span class="big">${num(R.platformConv)}</span></div><div><span class="eyebrow">iCPA</span><span class="big">${Number.isFinite(R.icpa) ? inr(R.icpa) : '–'}</span></div>`;
    const msg = [];
    if (g.t < 4 || g.c < 4) msg.push('Use at least 4 cities in each group, so one city\'s local event cannot decide the result.');
    if (R.mape > MAPE_MAX) msg.push('The control does not track the treatment before launch. The metros grow faster than smaller cities; mix both types into each group.');
    if (bal && !sig) msg.push('Balanced, but the confidence interval still includes zero. The test is too short to tell. Add weeks.');
    if (bal && sig) msg.push(`Clean read: about ${num(R.incr)} extra bookings (${pc(R.liftPct)} lift). Meta claims ${num(R.platformConv)} conversions for the same spend, so platform CPA ${inr(PLATFORM_CPA)} vs incremental CPA ${inr(R.icpa)}.`);
    $('.g-msg').innerHTML = msg.length ? `<div class="notice ${bal && sig ? 'ok' : 'warn'}">${msg.map(esc).join(' ')}</div>` : '';
    if (bal) ctx.done('in1');
    if (bal && sig) ctx.done('in2');
  }
  $('.g-cities').addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    const i = +b.dataset.i; S.assign[i] = S.assign[i] === '' ? 'T' : S.assign[i] === 'T' ? 'C' : '';
    ctx.act(); ctx.save(); geo();
  });
  $('.g-pairs').addEventListener('click', () => { S.assign = matchedPairs(base); ctx.act(); ctx.save(); geo(); });
  $('.g-clear').addEventListener('click', () => { S.assign = Array(GEO.length).fill(''); ctx.save(); geo(); });
  $('.g-weeks').addEventListener('input', (e) => { S.weeks = Number(e.target.value); ctx.save(); geo(); });
  $('.g-weeks').addEventListener('change', () => ctx.act());
  $('.g-calc').addEventListener('click', () => {
    ctx.act();
    const g = groupSizes(S.assign);
    if (!g.t || !g.c) return ctx.toast('Set up the test first.');
    const R = geoReport(base, S.assign, S.weeks);
    if (!(R.lo > 0 && balanced(S.assign, R))) { $('.g-calcout').innerHTML = '<div class="notice warn">First get a balanced test with a confidence interval above zero. An iCPA from an inconclusive test is noise.</div>'; return; }
    const v = (s) => Number(String($(s).value).replace(/[^0-9.\-]/g, ''));
    const okC = Math.abs(v('.g-icpa') - R.icpa) <= R.icpa * 0.02, okR = Math.abs(v('.g-iroas') - R.iroas) <= Math.max(0.05, R.iroas * 0.02);
    if (okC && okR) { ctx.done('in3'); $('.g-calcout').innerHTML = `<div class="notice ok"><strong>Right.</strong> iCPA = ${inr(R.spend)} ÷ ${num(R.incr)} = ${inr(R.icpa)}. iROAS = ${num(R.incr)} × ₹4,800 ÷ ${inr(R.spend)} = ${R.iroas.toFixed(2)}. Every ₹1 on Meta returns about ₹${R.iroas.toFixed(1)} of contribution. Positive, but far less than the platform CPA suggests (₹4,800 ÷ ₹400 = 12).</div>`; }
    else $('.g-calcout').innerHTML = `<div class="notice warn">${okC ? 'iCPA is right.' : 'Check iCPA: spend ÷ incremental bookings (use the unrounded numbers shown).'} ${okR ? 'iROAS is right.' : 'Check iROAS: incremental bookings × 4,800 ÷ spend.'}</div>`;
  });

  /* ---- MMM ---- */
  function mmmParams() {
    $('.m-params').innerHTML = `<thead><tr><th>Channel</th><th>Avg spend / wk</th><th>Adstock decay</th><th>Saturation point K</th><th>Fitted effect (β)</th></tr></thead><tbody>${MMM_CH.map((c) => `<tr><td>${esc(c.name)}</td><td>₹${plan0[c.id]} L</td><td><input type="range" min="0" max="0.9" step="0.05" data-p="${c.id}" data-f="decay" value="${S.params[c.id].decay}" aria-label="${esc(c.name)} decay" style="padding:0" /> <span class="mono" data-v="${c.id}-decay"></span></td><td><input type="range" min="5" max="150" step="5" data-p="${c.id}" data-f="K" value="${S.params[c.id].K}" aria-label="${esc(c.name)} saturation point" style="padding:0" /> <span class="mono" data-v="${c.id}-K"></span></td><td class="mono" data-b="${c.id}"></td></tr>`).join('')}</tbody>`;
  }
  function mmm() {
    for (const c of MMM_CH) { el.querySelector(`[data-v="${c.id}-decay"]`).textContent = S.params[c.id].decay.toFixed(2); el.querySelector(`[data-v="${c.id}-K"]`).textContent = S.params[c.id].K; }
    const fit = fitMMM(data, S.params);
    if (!fit) { $('.m-msg').innerHTML = '<div class="notice warn">The model cannot be fitted with these settings.</div>'; return; }
    for (const c of MMM_CH) { const b = fit.beta[c.id]; el.querySelector(`[data-b="${c.id}"]`).innerHTML = `<span class="${b < 0 ? 'err' : ''}">${b.toFixed(1)}</span>`; }
    $('.m-chart').innerHTML = lineChart([{ y: data.sales, cls: 'mtc-l0' }, { y: fit.fitted, cls: 'mtc-l1' }], { label: 'Actual vs model sales by week' });
    const ok = fitOk(fit);
    $('.m-kpis').innerHTML = `<div><span class="eyebrow">Fit (R²)</span><span class="big ${fit.r2 >= 0.9 ? 'ok' : ''}">${fit.r2.toFixed(3)}</span></div><div><span class="eyebrow">Base sales / wk</span><span class="big">₹${fit.base.toFixed(0)} L</span></div><div><span class="eyebrow">Diwali effect / wk</span><span class="big">₹${fit.festive.toFixed(0)} L</span></div>`;
    const neg = MMM_CH.filter((c) => fit.beta[c.id] < 0).map((c) => c.name);
    $('.m-msg').innerHTML = neg.length ? `<div class="notice warn">Negative effect for ${esc(neg.join(', '))}. Ads do not reduce sales: the settings for that channel do not match how it works.</div>` : ok ? '<div class="notice ok">Good fit. R² alone is not proof, though: real MMMs are checked against holdout weeks and lift tests.</div>' : '';
    if (ok) ctx.done('in4');
    budget(fit);
  }
  function budget(fit) {
    const unlocked = ctx.isDone('in4');
    $('.m-locked').innerHTML = unlocked ? '' : '<p class="help">Fit the model first (R² 0.90 or more, no negative effects). Budget advice from a bad model is worse than none.</p>';
    $('.m-body').hidden = !unlocked;
    if (!unlocked || !fit) return;
    const P = S.params;
    $('.m-roi').innerHTML = `<thead><tr><th>Channel</th><th>Today ₹ L / wk</th><th>Average ROI today</th><th>Next ₹1 returns</th><th>New plan ₹ L / wk</th><th>Next ₹1 in new plan</th></tr></thead><tbody>${MMM_CH.map((c) => { const x = plan0[c.id], y = S.plan[c.id] || 0; return `<tr><td>${esc(c.name)}</td><td>${x}</td><td>₹${(response(fit.beta[c.id], P[c.id].decay, P[c.id].K, x) / x).toFixed(2)}</td><td>₹${marginal(fit.beta[c.id], P[c.id].decay, P[c.id].K, x).toFixed(2)}</td><td><input type="number" min="0" max="200" step="1" data-plan="${c.id}" value="${y}" aria-label="${esc(c.name)} new weekly spend" style="max-width:90px" /></td><td>₹${marginal(fit.beta[c.id], P[c.id].decay, P[c.id].K, y).toFixed(2)}</td></tr>`; }).join('')}</tbody>`;
    planKpis(fit);
  }
  function planKpis(fit) {
    const P = S.params, used = MMM_CH.reduce((s, c) => s + (Number(S.plan[c.id]) || 0), 0);
    const now = predict(fit, P, plan0), next = predict(fit, P, S.plan), gain = next / now - 1;
    $('.m-pkpis').innerHTML = `<div><span class="eyebrow">Budget used</span><span class="big ${used > total ? 'err' : ''}">₹${used} L of ₹${total} L</span></div><div><span class="eyebrow">Predicted sales / wk today</span><span class="big">₹${now.toFixed(1)} L</span></div><div><span class="eyebrow">With the new plan</span><span class="big ${gain >= REALLOC_TARGET && used <= total ? 'ok' : ''}">₹${next.toFixed(1)} L (${gain >= 0 ? '+' : ''}${pc(gain)})</span></div>`;
    $('.m-pmsg').innerHTML = used > total ? '<div class="notice warn">Over budget. The total must stay the same.</div>' : gain >= REALLOC_TARGET ? '<div class="notice ok">Same money, more sales. Before you move real money: check the model against a lift test, move in steps (for example 20% per month), and watch for channels that were cut too far below their minimum effective spend.</div>' : '';
    if (used <= total && gain >= REALLOC_TARGET && ctx.isDone('in4')) ctx.done('in6');
  }
  el.querySelector('.m-params').addEventListener('input', (e) => {
    const c = e.target.dataset.p; if (!c) return;
    S.params[c][e.target.dataset.f] = Number(e.target.value); ctx.save(); mmm();
  });
  el.querySelector('.m-params').addEventListener('change', () => ctx.act());
  el.querySelector('.m-roi').addEventListener('change', (e) => {
    const c = e.target.dataset.plan; if (!c) return;
    S.plan[c] = Math.max(0, Math.min(200, Math.round(Number(e.target.value) || 0))); ctx.act(); ctx.save();
    budget(fitMMM(data, S.params));
  });
  $('.m-bestgo').addEventListener('click', () => {
    ctx.act();
    const fit = fitMMM(data, S.params), v = $('.m-best').value;
    if (!v) return ctx.toast('Choose a channel.');
    const right = bestMarginal(fit, S.params, plan0);
    if (v === right) { ctx.done('in5'); $('.m-bestout').innerHTML = `<div class="notice ok"><strong>Right: ${esc(MMM_CH.find((c) => c.id === right).name)}.</strong> Its response curve is still steep at today's spend. The channel with the lowest marginal ROI is closest to saturation: money there buys little extra.</div>`; }
    else $('.m-bestout').innerHTML = '<div class="notice warn">Not that one. Compare the "Next ₹1 returns" column, not the average ROI.</div>';
  });

  /* ---- case ---- */
  function cmo() {
    const ok = S.ans.cmo === CMO_Q.c;
    $('.c-opts').innerHTML = CMO_Q.o.map((o, i) => `<button type="button" class="w-opt${ok && i === CMO_Q.c ? ' right' : ''}" data-o="${i}">${esc(o)}</button>`).join('');
    $('.c-out').innerHTML = ok ? `<div class="w-out">${esc(CMO_Q.x)}</div>` : '';
    if (ok) ctx.done('in7');
  }
  $('.c-opts').addEventListener('click', (e) => {
    const b = e.target.closest('.w-opt'); if (!b) return;
    ctx.act();
    if (+b.dataset.o === CMO_Q.c) { S.ans.cmo = CMO_Q.c; ctx.save(); cmo(); } else { b.classList.add('wrong'); ctx.toast('Not quite. Both numbers are real; they answer different questions.'); }
  });

  geo(); mmmParams(); mmm(); cmo();
}
