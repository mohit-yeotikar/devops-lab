// Lab: A/B test statistics. Day-by-day test simulation, the peeking trap, sample size and SRM.
import { pval, sampleSize, srm, binom } from '../logic.js';

const fmt = (n) => Math.round(n).toLocaleString('en-US');
const pct = (n, d = 2) => (n * 100).toFixed(d) + '%';
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export function mount(el, ctx) {
  el.innerHTML = `
    <section class="card">
      <h3 style="margin-top:0">1 · Run a test, day by day</h3>
      <div class="row">
        <div style="flex:1 1 120px"><label>Baseline CR %<input class="a-base" type="number" step="0.1" value="2" /></label></div>
        <div style="flex:1 1 120px"><label>True lift of B %<input class="a-lift" type="number" step="1" value="10" /></label></div>
        <div style="flex:1 1 140px"><label>Visitors per day, each version<input class="a-vis" type="number" step="100" value="2000" /></label></div>
        <div style="flex:1 1 110px"><label>Planned days<input class="a-plan" type="number" step="1" value="28" /></label></div>
      </div>
      <label class="w-check"><input type="checkbox" class="a-myst" /> Mystery mode (hide the true lift)</label>
      <div class="row" style="margin-top:8px"><button class="btn sec sm a-day" type="button">Run 1 day</button><button class="btn sec sm a-week" type="button">Run 7 days</button><button class="btn sm a-end" type="button">Run to planned end</button><button class="btn sec sm a-new" type="button">New test</button></div>
      <canvas class="a-chart" aria-label="p-value per day"></canvas>
      <div class="legend"><span><i style="background:var(--signal)"></i>p-value by day</span><span><i style="background:var(--bad)"></i>0.05 line (below = "significant")</span></div>
      <div class="kpis a-kpis"></div>
      <div class="row"><span>Your decision:</span><button class="btn sec sm" data-dec="ship" type="button">Ship B</button><button class="btn sec sm" data-dec="keep" type="button">Keep A</button></div>
      <div class="w-out a-msg">Press "Run 1 day" to start.</div>
    </section>
    <div class="two">
      <section class="card">
        <h3 style="margin-top:0">2 · The peeking trap</h3>
        <p class="help">Runs 200 A/A tests (both versions the same, so every "winner" is fake) for 28 days at your baseline and traffic.</p>
        <button class="btn sm a-peek" type="button">Run 200 A/A tests</button>
        <div class="kpis a-peekout"></div>
        <div class="w-out a-peekmsg">If you look only at the end, expect about 5% fake winners. Guess how many you get by checking every day, then press the button.</div>
      </section>
      <section class="card">
        <h3 style="margin-top:0">3 · Sample size calculator</h3>
        <div class="row"><div style="flex:1 1 100px"><label>Baseline %<input class="s-base" type="number" step="0.1" value="3" /></label></div><div style="flex:1 1 140px"><label>Smallest lift you care about %<input class="s-mde" type="number" step="1" value="15" /></label></div></div>
        <div class="row"><div style="flex:1 1 100px"><label>Power<select class="s-pow"><option value="0.8">80%</option><option value="0.9">90%</option></select></label></div><div style="flex:1 1 140px"><label>Visitors per week (total)<input class="s-week" type="number" step="1000" value="40000" /></label></div></div>
        <div class="kpis s-out"></div>
      </section>
    </div>
    <section class="card">
      <h3 style="margin-top:0">4 · SRM checker</h3>
      <div class="row"><div style="flex:1 1 120px"><label>Visitors in A<input class="r-a" type="number" value="50000" /></label></div><div style="flex:1 1 120px"><label>Visitors in B<input class="r-b" type="number" value="48200" /></label></div><div style="flex:1 1 120px"><label>Planned share for A %<input class="r-s" type="number" value="50" /></label></div><button class="btn sm r-btn" type="button">Check</button></div>
      <div class="w-out r-out">Type the visitor counts from your testing tool.</div>
    </section>`;
  const $ = (s) => el.querySelector(s);
  let T = null;
  const num = (s) => Number($(s).value);
  function newTest() {
    const myst = $('.a-myst').checked;
    const lift = myst ? [0, 0, 5, 8, 12, -6][Math.floor(Math.random() * 6)] : num('.a-lift');
    T = { base: num('.a-base') / 100, lift, vis: num('.a-vis'), plan: num('.a-plan'), myst, day: 0, na: 0, ca: 0, nb: 0, cb: 0, ps: [] };
  }
  function run(k) {
    if (!T) newTest();
    ctx.act();
    for (let i = 0; i < k; i++) { T.day++; T.na += T.vis; T.nb += T.vis; T.ca += binom(T.vis, T.base); T.cb += binom(T.vis, T.base * (1 + T.lift / 100)); T.ps.push(pval(T.ca, T.na, T.cb, T.nb)); }
    if (T.day === 7) T.sawEarly = true;
    render();
  }
  function render() {
    if (!T || !T.day) { $('.a-kpis').innerHTML = ''; draw(); return; }
    const ra = T.ca / T.na, rb = T.cb / T.nb, p = T.ps[T.ps.length - 1] ?? 1, obs = (rb / ra - 1) * 100;
    $('.a-kpis').innerHTML = `<div><span class="eyebrow">Day</span><span class="big">${T.day}/${T.plan}</span></div><div><span class="eyebrow">A conv.</span><span class="big">${pct(ra)}</span></div><div><span class="eyebrow">B conv.</span><span class="big">${pct(rb)}</span></div><div><span class="eyebrow">Observed lift</span><span class="big">${obs >= 0 ? '+' : ''}${obs.toFixed(1)}%</span></div><div><span class="eyebrow">p-value</span><span class="big" style="color:${p < 0.05 ? 'var(--ok)' : 'var(--text)'}">${p.toFixed(3)}</span></div>`;
    $('.a-msg').innerHTML = T.day < T.plan
      ? `Day ${T.day}. ${p < 0.05 ? `<b>It looks significant right now.</b> But you planned ${T.plan} days. Stopping now is peeking.` : 'Not significant yet.'} ${T.myst ? 'The true lift is hidden.' : `The true lift is ${T.lift}%.`}`
      : `Planned end reached. ${p < 0.05 ? (obs > 0 ? 'B is significantly better.' : 'B is significantly worse.') : 'No significant difference.'} Make your call. ${T.myst ? '' : `The true lift was ${T.lift}%.`}`;
    if (T.vis <= 500 && T.lift > 0 && !T.myst && T.plan >= 28 && T.day >= T.plan && T.sawEarly) ctx.done('a5');
    draw();
  }
  function draw() {
    const cv = $('.a-chart');
    if (!cv || !cv.clientWidth) return;
    const dpr = devicePixelRatio || 1, w = (cv.width = cv.clientWidth * dpr), h = (cv.height = cv.clientHeight * dpr), x = cv.getContext('2d');
    x.clearRect(0, 0, w, h);
    const pad = 34 * dpr, plan = T ? Math.max(T.plan, T.day) : num('.a-plan') || 28;
    const X = (i) => pad + (w - pad * 1.5) * (i / Math.max(plan, 1)), Y = (v) => h - pad + -(h - pad * 1.6) * v;
    x.strokeStyle = css('--border'); x.lineWidth = 1; x.fillStyle = css('--text-3'); x.font = `${11 * dpr}px ui-monospace, monospace`;
    for (const v of [0, 0.25, 0.5, 0.75, 1]) { x.beginPath(); x.moveTo(pad, Y(v)); x.lineTo(w - pad / 2, Y(v)); x.stroke(); x.fillText(v.toFixed(2), 2, Y(v) + 4); }
    x.fillText('day ' + plan, X(plan) - 48 * dpr, h - 8 * dpr);
    x.strokeStyle = css('--bad'); x.setLineDash([6, 5]); x.beginPath(); x.moveTo(pad, Y(0.05)); x.lineTo(w - pad / 2, Y(0.05)); x.stroke(); x.setLineDash([]);
    if (!T || !T.ps.length) return;
    x.strokeStyle = css('--signal'); x.lineWidth = 2.2 * dpr; x.beginPath();
    T.ps.forEach((p, i) => { const px = X(i + 1), py = Y(p); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.stroke();
  }
  for (const s of ['.a-base', '.a-lift', '.a-vis', '.a-plan', '.a-myst']) $(s).addEventListener('change', () => { newTest(); render(); $('.a-msg').textContent = 'Settings changed, so a new test is ready. Press "Run 1 day".'; });
  $('.a-day').addEventListener('click', () => run(1));
  $('.a-week').addEventListener('click', () => run(7));
  $('.a-end').addEventListener('click', () => { if (!T) newTest(); run(Math.max(0, T.plan - T.day)); });
  $('.a-new').addEventListener('click', () => { newTest(); render(); $('.a-msg').textContent = 'New test ready. Press "Run 1 day".'; });
  el.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => {
    if (!T || !T.day) return ctx.toast('Run the test first.');
    ctx.act();
    const p = T.ps[T.ps.length - 1], up = T.cb / T.nb > T.ca / T.na, right = p < 0.05 && up ? 'ship' : 'keep';
    if (T.day < T.plan) { $('.a-msg').innerHTML = `You decided on day ${T.day} of ${T.plan}. That is peeking. Finish the planned days first, then decide.`; return; }
    const ok = b.dataset.dec === right;
    $('.a-msg').innerHTML = `${ok ? '✓ Correct call.' : '✗ Not the right call.'} ${right === 'ship' ? 'B won clearly at the planned end, so ship it.' : 'There was no clear win for B at the planned end, so keep A.'} The true lift was <b>${T.lift > 0 ? '+' : ''}${T.lift}%</b>.${T.lift !== 0 && right === 'keep' ? ' A real effect can be too small to detect with this traffic. That is why you size tests first.' : ''}`;
    if (ok && T.myst) ctx.done('a4');
  }));
  $('.a-peek').addEventListener('click', () => {
    ctx.act();
    const base = num('.a-base') / 100, vis = num('.a-vis');
    let peek = 0, end = 0;
    for (let t = 0; t < 200; t++) {
      let na = 0, ca = 0, nb = 0, cb = 0, hit = false;
      for (let d = 0; d < 28; d++) { na += vis; nb += vis; ca += binom(vis, base); cb += binom(vis, base); if (pval(ca, na, cb, nb) < 0.05) hit = true; }
      if (hit) peek++;
      if (pval(ca, na, cb, nb) < 0.05) end++;
    }
    $('.a-peekout').innerHTML = `<div><span class="eyebrow">Fake winners if you peek daily</span><span class="big" style="color:var(--bad)">${peek}/200</span></div><div><span class="eyebrow">Fake winners if you look only at the end</span><span class="big" style="color:var(--ok)">${end}/200</span></div>`;
    $('.a-peekmsg').textContent = 'Both versions were the same, so every winner here is fake. Checking every day multiplies false wins. Rule: choose the sample size first, then look once at the end (or use a tool made for sequential testing).';
    ctx.done('a1');
  });
  function size() {
    const p1 = num('.s-base') / 100, mde = num('.s-mde') / 100, pow = num('.s-pow'), wk = num('.s-week');
    if (!(p1 > 0 && p1 < 1 && mde > 0)) { $('.s-out').innerHTML = '<p class="help">Type a baseline between 0 and 100 and a lift above 0.</p>'; return; }
    const n = sampleSize(p1, mde, pow), days = wk > 0 ? Math.ceil((n * 2) / (wk / 7)) : 0;
    $('.s-out').innerHTML = `<div><span class="eyebrow">Visitors per version</span><span class="big">${fmt(n)}</span></div><div><span class="eyebrow">Total</span><span class="big">${fmt(n * 2)}</span></div><div><span class="eyebrow">Days at your traffic</span><span class="big">${days ? fmt(days) : '–'}</span></div>`;
    if (Math.abs(p1 - 0.02) < 1e-9 && Math.abs(mde - 0.1) < 1e-9) ctx.done('a2');
  }
  for (const s of ['.s-base', '.s-mde', '.s-pow', '.s-week']) $(s).addEventListener('input', size);
  $('.r-btn').addEventListener('click', () => {
    ctx.act();
    const a = num('.r-a'), b = num('.r-b'), s = num('.r-s') / 100;
    if (!(a > 0 && b > 0 && s > 0 && s < 1)) { $('.r-out').textContent = 'Type two positive counts and a share between 1 and 99.'; return; }
    const r = srm(a, b, s);
    $('.r-out').innerHTML = `Expected ${fmt((a + b) * s)} vs ${fmt((a + b) * (1 - s))}. Got ${fmt(a)} vs ${fmt(b)}. Chi-square = ${r.chi.toFixed(1)}, p = ${r.p < 0.0001 ? '< 0.0001' : r.p.toFixed(4)}.<br><b>${r.bad ? '⚠ Sample ratio mismatch. The split is broken. Do not trust this test. Look for redirects, bots, or the variant failing on some browsers.' : '✓ The split looks healthy.'}</b>`;
    if (r.bad && a === 50000 && b === 48200) ctx.done('a3');
  });
  newTest(); render(); size();
  addEventListener('resize', draw);
}
