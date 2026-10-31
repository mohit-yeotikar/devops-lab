// Lab: Read test results and make the call. Six reports; decision + reason; a calculator for CR, lift, p-value and SRM.
import { pval, srm } from '../logic.js';

const fmt = (n) => Math.round(n).toLocaleString('en-US');
export const DECISIONS = ['Ship B', 'Keep A', 'Keep running to the planned end', 'Do not trust it: fix the set-up'];
export const REPORTS = [
  { id: 'r1', title: 'Big size buttons on the product page', days: '28 of 28 planned days', split: '50/50', a: { n: 40000, c: 800, rev: 68000 }, b: { n: 40100, c: 920, rev: 78200 }, note: 'Primary metric: RPV. Guardrail: AOV.',
    d: 0, reasons: ['B has more orders and more money per visitor; the test ran to plan; the split is healthy; p is below 0.05', 'B looks nicer', 'Any lift is good'], r: 0, why: 'All checks pass: planned duration, healthy split, significant and RPV up. Ship it, then watch the numbers for two weeks.' },
  { id: 'r2', title: 'New cart drawer', days: '28 of 28 planned days', split: '50/50', a: { n: 50000, c: 1000, rev: 85000 }, b: { n: 47600, c: 1050, rev: 89300 }, note: 'The variant uses a redirect to a new cart URL.',
    d: 3, reasons: ['B wins, ship it', 'The traffic split is far from 50/50 (SRM); the redirect probably loses visitors, so the result cannot be trusted', 'The test was too short'], r: 1, why: '50,000 vs 47,600 on a 50/50 plan is a sample ratio mismatch (p far below 0.01). Redirect tests often lose visitors in one arm. Fix the set-up and run again.' },
  { id: 'r3', title: 'Free-shipping progress bar', days: '5 of 28 planned days', split: '50/50', a: { n: 7000, c: 140, rev: 11900 }, b: { n: 7050, c: 178, rev: 15130 }, note: 'The manager says: "p is 0.04, let us ship it today."',
    d: 2, reasons: ['p is below 0.05, ship now', 'Only 5 of 28 days are done; stopping on a good day is peeking, and early lifts often fade', 'Keep A because it is old'], r: 1, why: 'Early results jump around. Finish the planned 28 days (full weeks) and decide once at the end.' },
  { id: 'r4', title: '15% off for first orders', days: '21 of 21 planned days', split: '50/50', a: { n: 30000, c: 600, rev: 51000 }, b: { n: 30000, c: 690, rev: 49335 }, note: 'Primary metric: RPV. CR is a secondary metric.',
    d: 1, reasons: ['CR is up, so ship', 'CR went up but AOV fell more, so revenue per visitor went down; the discount loses money', 'The split is broken'], r: 1, why: 'B: CR +15%, but AOV fell from CA$85 to CA$71.50. RPV fell from CA$1.70 to CA$1.64. More orders, less money. Keep A.' },
  { id: 'r5', title: 'New product photos', days: '28 of 28 planned days', split: '50/50', a: { n: 36000, c: 720, rev: 61200 }, b: { n: 36100, c: 740, rev: 62900 }, note: 'Planned to detect a 10% lift.',
    d: 1, reasons: ['No significant difference at the planned end; keep A, write down the learning, and try a bolder idea', 'Ship B because the number is a bit higher', 'Keep running for 3 more months'], r: 0, why: 'p is around 0.6. The test cannot tell B from A. Most tests end flat. Log it and move to the next idea.' },
  { id: 'r6', title: 'New headline', days: '28 of 28 planned days', split: '50/50', a: { n: 42000, c: 840, rev: 71400 }, b: { n: 42000, c: 846, rev: 71900 }, note: 'Overall flat. The analyst cut the data into 20 segments. "iPhone + Tuesday + email" shows +40% with p = 0.04.',
    d: 1, reasons: ['Ship B for iPhone users on Tuesdays from email', 'With 20 cuts, about one fake "winner" is expected by luck; keep A and test the segment idea on its own if it makes sense', 'The test is broken'], r: 1, why: 'Looking at many segments creates false winners. Keep A. If the segment idea has a real reason, run a new test just for it.' },
];

export function mount(el, ctx) {
  const S = ctx.state;
  S.pick ??= {};
  el.innerHTML = `
    <section class="card">
      <h3 style="margin-top:0">Calculator</h3>
      <div class="row">
        <div style="flex:1 1 110px"><label>A visitors<input class="c-na" type="number" /></label></div><div style="flex:1 1 110px"><label>A orders<input class="c-ca" type="number" /></label></div>
        <div style="flex:1 1 110px"><label>B visitors<input class="c-nb" type="number" /></label></div><div style="flex:1 1 110px"><label>B orders<input class="c-cb" type="number" /></label></div>
        <button type="button" class="btn sm c-go">Calculate</button>
      </div>
      <div class="w-out c-out">Type the counts from a report, or press "Use these numbers" on a report.</div>
    </section>
    <div class="r-list"></div>`;
  const $ = (s) => el.querySelector(s);
  const calc = (na, ca, nb, cb) => {
    const ra = ca / na, rb = cb / nb, p = pval(ca, na, cb, nb), s = srm(na, nb, 0.5);
    return `A: ${(ra * 100).toFixed(2)}% · B: ${(rb * 100).toFixed(2)}% · relative lift ${(((rb - ra) / ra) * 100).toFixed(1)}% · p-value ${p < 0.0001 ? '< 0.0001' : p.toFixed(3)} · split check: ${s.bad ? `<b class="err">SRM (p = ${s.p < 0.0001 ? '< 0.0001' : s.p.toFixed(4)})</b>` : 'healthy'}`;
  };
  $('.c-go').addEventListener('click', () => {
    ctx.act();
    const v = ['.c-na', '.c-ca', '.c-nb', '.c-cb'].map((s) => Number($(s).value));
    if (v.some((x) => !(x > 0)) || v[1] > v[0] || v[3] > v[2]) { $('.c-out').textContent = 'Type four positive numbers. Orders cannot be more than visitors.'; return; }
    $('.c-out').innerHTML = calc(...v);
  });
  function render() {
    $('.r-list').innerHTML = REPORTS.map((r, i) => {
      const p = S.pick[r.id] || {};
      const done = ctx.isDone(r.id);
      const row = (k, x) => `<tr><td>${k}</td><td>${fmt(x.n)}</td><td>${fmt(x.c)}</td><td>${((x.c / x.n) * 100).toFixed(2)}%</td><td>CA$${fmt(x.rev)}</td><td>CA$${(x.rev / x.c).toFixed(2)}</td><td>CA$${(x.rev / x.n).toFixed(2)}</td></tr>`;
      return `<section class="card r-card${done ? ' is-done' : ''}">
        <div class="row between"><h3 style="margin:0">Report ${i + 1}: ${r.title}</h3>${done ? '<span class="pill done">Solved</span>' : ''}</div>
        <p class="help">${r.days} · planned split ${r.split}. ${r.note}</p>
        <div class="tbl"><table><thead><tr><th></th><th>Visitors</th><th>Orders</th><th>CR</th><th>Revenue</th><th>AOV</th><th>RPV</th></tr></thead><tbody>${row('A', r.a)}${row('B', r.b)}</tbody></table></div>
        <button type="button" class="btn sec sm" data-use="${i}">Use these numbers in the calculator</button>
        <div class="row" style="margin-top:10px">
          <div style="flex:1 1 200px"><label>Decision<select data-d="${r.id}"><option value="">Choose</option>${DECISIONS.map((d, j) => `<option value="${j}"${p.d === j ? ' selected' : ''}>${d}</option>`).join('')}</select></label></div>
          <div style="flex:2 1 300px"><label>Main reason<select data-r="${r.id}"><option value="">Choose</option>${r.reasons.map((d, j) => `<option value="${j}"${p.r === j ? ' selected' : ''}>${d}</option>`).join('')}</select></label></div>
          <button type="button" class="btn sm" data-check="${r.id}">Check</button>
        </div>
        <div class="r-out" data-out="${r.id}">${done ? `<div class="notice ok">${r.why}</div>` : ''}</div>
      </section>`;
    }).join('');
    el.querySelectorAll('[data-use]').forEach((b) => b.addEventListener('click', () => {
      const r = REPORTS[+b.dataset.use];
      $('.c-na').value = r.a.n; $('.c-ca').value = r.a.c; $('.c-nb').value = r.b.n; $('.c-cb').value = r.b.c;
      $('.c-out').innerHTML = calc(r.a.n, r.a.c, r.b.n, r.b.c);
      $('.c-out').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    el.querySelectorAll('[data-check]').forEach((b) => b.addEventListener('click', () => {
      ctx.act();
      const r = REPORTS.find((x) => x.id === b.dataset.check);
      const d = el.querySelector(`[data-d="${r.id}"]`).value, rs = el.querySelector(`[data-r="${r.id}"]`).value;
      if (d === '' || rs === '') return ctx.toast('Choose a decision and a reason.');
      S.pick[r.id] = { d: +d, r: +rs }; ctx.save();
      const ok = +d === r.d && +rs === r.r;
      el.querySelector(`[data-out="${r.id}"]`).innerHTML = `<div class="notice ${ok ? 'ok' : 'warn'}">${ok ? `<strong>Right.</strong> ${r.why}` : `<strong>Not quite.</strong> ${+d === r.d ? 'The decision is right, but the reason is not the main one.' : 'Check the set-up first (duration, split), then significance, then money (RPV).'}`}</div>`;
      if (ok) { ctx.done(r.id); b.closest('.r-card').classList.add('is-done'); }
    }));
  }
  render();
}
