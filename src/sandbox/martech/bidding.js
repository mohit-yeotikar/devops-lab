// Lab mk-bidding: Smart bidding and budgets. A week-by-week campaign simulator with a demand curve
// (more spend → more conversions, with diminishing returns), four bid strategies, budget limits,
// too-strict targets, and a simplified learning period after big changes.

export const lab = {
  id: 'mk-bidding', track: 'martech', kind: 'widget', title: 'Smart bidding and budgets', topic: 'Search ads', minutes: 30, sprints: ['m06'],
  summary: 'Run a Voltra booking campaign week by week. Choose Max conversions, tCPA, tROAS or Max conversion value, set budgets and targets, and learn why campaigns stop spending.',
  intro: [
    'Smart bidding sets a bid for every auction. You choose the goal: as many conversions as the budget buys (Max conversions), conversions at a target cost (target CPA), or conversion value at a target return (target ROAS, Max conversion value).',
    'Demand is limited. The first rupees buy the cheapest conversions; each extra rupee buys fewer. So the average CPA rises slowly and the cost of the next conversion (marginal CPA) rises fast. A target that is too strict leaves the campaign with almost nothing to buy.',
    'After a big change the strategy re-learns and results wobble. Here, a change of more than 20% to the budget or target, or a new strategy, starts one learning week. This is a simplified rule: Google speaks of about a week or 50 conversions, and gives no exact threshold.',
  ],
  tasks: [
    { id: 'b1', text: 'In the budget planner, compare a budget with one at least twice as big, and see the cost of the extra conversions.', why: 'Doubling budget never doubles conversions. The extra ones always cost more than the average.', hint: 'Type a weekly budget A and a budget B that is 2× A or more, then press Compare.' },
    { id: 'b2', text: 'Run a Max conversions week where one more booking costs about ₹1,200 (marginal CPA within 10%).', why: 'Voltra keeps about ₹1,200 margin per booking. Past that point each extra booking loses money, even if the average CPA looks fine.', hint: 'Watch "Marginal CPA" in the forecast while you change the daily budget. It should read between ₹1,080 and ₹1,320.' },
    { id: 'b3', text: 'With target CPA, find a target that spends the full budget, with the actual CPA no more than 10% under the target.', why: 'If the target is too low, the budget is not used. If it is far too high, you overpay. The sweet spot spends the budget at a CPA close to the target.', hint: 'Start near the average CPA that Max conversions gave at this budget. Raise the target in small steps until spend reaches the budget.' },
    { id: 'b4', text: 'Make a target ROAS campaign stop spending, then fix it so it spends at least 60% of the budget.', why: 'This is the classic "tROAS campaign stopped spending" ticket. The target is above what the market can return.', hint: 'Try a target ROAS of 450%. Then lower it below the best possible ROAS shown in the forecast.' },
    { id: 'b5', text: 'Change the budget or target by 20% or less on a campaign that is out of learning, and run a week without restarting learning.', why: 'Small steps keep the learned model. Big jumps throw it away and cost a week of wobble.', hint: 'Run two weeks with the same settings first. Then change the target or budget by 10 to 20% and run one more week.' },
    { id: 'b6', text: 'Choose the right strategy for dealer test-ride leads that are qualified later in the CRM.', why: 'Optimising for raw form fills buys junk leads. Value-based bidding on qualified leads buys sales.', hint: 'Read the lead-gen card and pick the option that uses the CRM outcome and its value.' },
  ],
  quiz: [
    { q: 'A tROAS campaign at 500% suddenly spends almost nothing. The best possible ROAS in this market is about 430%. What is the fix?', options: ['Raise the budget', 'Lower the tROAS to a level the market can deliver, in steps, then raise it slowly if volume allows', 'Switch the campaign off and on', 'Add more ads'], answer: 1, why: 'Budget is not the limit; the target is. Set it below what the auctions can return.' },
    { q: 'Weekly budget goes from ₹70,000 to ₹1,40,000 and conversions go from 112 to 182. What does each extra conversion cost?', options: ['₹625', '₹769', '₹1,000', '₹1,400'], answer: 2, why: '(1,40,000 − 70,000) ÷ (182 − 112) = ₹1,000. The new average CPA (₹769) hides how expensive the extra conversions are.' },
    { q: 'Why does a large change to a target or budget hurt results for a while?', options: ['Google punishes changes', 'The strategy enters a learning period and explores new bids before it is stable again', 'Ads must be approved again', 'It deletes conversion history'], answer: 1, why: 'Big changes push the bidder into new auctions it has not learned yet. Make changes in steps of about 20% or less.' },
  ],
};

/* ---------------------------------------------------------------- model ---------------------------------------------------------------- */

export const MODEL = {
  cmax: 300, // conversions per week if money were unlimited
  k: 150000, // spend scale of the curve (₹ per week)
  value: 2000, // average conversion value (₹) for conversion-count strategies
  valueBias: { conv: 0.9, value: 2400 }, // value strategies buy 10% fewer conversions worth more each
  learningEff: 0.85, // conversions × 0.85 in a learning week
  margin: 1200, // Voltra margin per booking (₹)
};
export const STRATEGIES = { maxconv: 'Maximize conversions', tcpa: 'Target CPA', troas: 'Target ROAS', maxvalue: 'Maximize conversion value' };
const isValue = (st) => st === 'troas' || st === 'maxvalue';

/** Conversions bought with weekly spend s (base curve). */
export const convAt = (s) => MODEL.cmax * (1 - Math.exp(-Math.max(0, s) / MODEL.k));
export const avgCpaAt = (s) => (s > 0 ? s / convAt(s) : MODEL.k / MODEL.cmax);
/** Cost of the next conversion at spend s: 1 ÷ (d conversions / d spend). */
export const marginalCpaAt = (s) => (MODEL.k / MODEL.cmax) * Math.exp(Math.max(0, s) / MODEL.k);
export const valueRoasAt = (s) => (s > 0 ? (MODEL.valueBias.conv * convAt(s) * MODEL.valueBias.value) / s : (MODEL.valueBias.conv * MODEL.valueBias.value * MODEL.cmax) / MODEL.k);
export const MIN_CPA = MODEL.k / MODEL.cmax; // 500: the best possible average CPA
export const MAX_ROAS = valueRoasAt(0); // 4.32: the best possible ROAS

/** Largest spend where fn(s) still meets the target (fn monotonic). */
function solve(ok) {
  if (!ok(1)) return 0;
  let lo = 1, hi = 5e6;
  if (ok(hi)) return hi;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
  return lo;
}
/** Spend the bidder wants without a budget limit. */
export function wantedSpend(cfg) {
  if (cfg.strategy === 'tcpa') return solve((s) => avgCpaAt(s) <= cfg.tcpa);
  if (cfg.strategy === 'troas') return solve((s) => valueRoasAt(s) >= cfg.troas / 100);
  return Infinity;
}

/** Is the change from a to b big enough to restart learning? (simplified: new strategy, or > 20% budget/target change) */
export function bigChange(a, b) {
  if (!a) return true;
  if (a.strategy !== b.strategy) return true;
  const rel = (x, y) => Math.abs(y - x) / x;
  if (rel(a.daily, b.daily) > 0.2) return true;
  if (b.strategy === 'tcpa' && rel(a.tcpa, b.tcpa) > 0.2) return true;
  if (b.strategy === 'troas' && rel(a.troas, b.troas) > 0.2) return true;
  return false;
}
/** Relative size of the change that matters for this strategy (0 if nothing changed). */
export function changeSize(a, b) {
  if (!a || a.strategy !== b.strategy) return Infinity;
  const rel = (x, y) => Math.abs(y - x) / x;
  const t = b.strategy === 'tcpa' ? rel(a.tcpa, b.tcpa) : b.strategy === 'troas' ? rel(a.troas, b.troas) : 0;
  return Math.max(rel(a.daily, b.daily), t);
}

/** Simulate one week. prev = settings of the week before (null for the first week). */
export function simulateWeek(cfg, prev) {
  const budget = cfg.daily * 7;
  const want = wantedSpend(cfg);
  const spend = Math.min(budget, want);
  const learning = bigChange(prev, cfg);
  const eff = learning ? MODEL.learningEff : 1;
  const value = isValue(cfg.strategy);
  const conv = convAt(spend) * (value ? MODEL.valueBias.conv : 1) * eff;
  const revenue = conv * (value ? MODEL.valueBias.value : MODEL.value);
  const status = [];
  if (learning) status.push('Learning');
  if (want >= budget) status.push(cfg.strategy === 'maxconv' || cfg.strategy === 'maxvalue' ? 'Spends the full budget' : 'Limited by budget');
  else if (spend < budget * 0.05) status.push('Stopped spending: target cannot be reached');
  else if (spend < budget * 0.6) status.push('Target too strict: low volume');
  else status.push('Target limits spend');
  return {
    budget, spend, conv, revenue, learning, status,
    cpa: conv > 0 ? spend / conv : null, roas: spend > 0 ? revenue / spend : null,
    marginalCpa: marginalCpaAt(spend) / (value ? MODEL.valueBias.conv : 1),
  };
}

/** Budget planner: compare two weekly budgets on the base curve (no learning). */
export function compareBudgets(a, b) {
  const ca = convAt(a), cb = convAt(b);
  return { ca, cb, cpaA: a / ca, cpaB: b / cb, extraConv: cb - ca, incCpa: (b - a) / (cb - ca) };
}

/** Which tasks does the week history complete? history = [{ cfg, out }]. */
export function weekChecks(history) {
  const ids = new Set();
  history.forEach((w, i) => {
    const { cfg, out } = w;
    if (cfg.strategy === 'maxconv' && out.marginalCpa >= MODEL.margin * 0.9 && out.marginalCpa <= MODEL.margin * 1.1) ids.add('b2');
    if (cfg.strategy === 'tcpa' && out.spend >= out.budget * 0.98 && out.cpa && out.cpa >= cfg.tcpa / 1.1) ids.add('b3');
    if (cfg.strategy === 'troas' && out.spend >= out.budget * 0.6 && history.slice(0, i).some((p) => p.cfg.strategy === 'troas' && p.out.spend < p.out.budget * 0.05)) ids.add('b4');
    const p = history[i - 1];
    if (p && !p.out.learning && !out.learning && p.cfg.strategy === cfg.strategy) {
      const c = changeSize(p.cfg, cfg);
      if (c > 0.001 && c <= 0.2) ids.add('b5');
    }
  });
  return [...ids];
}

export const LEADGEN = {
  text: 'Voltra dealers get test-ride form fills from search. The call centre qualifies each lead within 3 days in the CRM: about 20% become qualified (a real buyer with a date), and 6% become a sale worth ₹1.1 lakh on average. Spam and duplicate forms are common. The CRM can send qualified leads and sales back to Google Ads with a value (offline conversion import with the GCLID, or enhanced conversions for leads).',
  q: 'Which bidding set-up do you choose?',
  options: [
    'Maximize conversions on every form submit, because it gives the most leads',
    'Import qualified leads and sales from the CRM with values (for example ₹2,000 for qualified, ₹11,000 for a sale), make them the primary conversions, and bid with Maximize conversion value, adding a target ROAS once volume is stable',
    'Manual CPC, because Smart bidding cannot see lead quality',
    'Target CPA on form submits at the lowest CPA you have ever seen',
  ],
  answer: 1,
  why: 'Bid on what the business values. Form fills teach the bidder to find cheap, junk forms. Qualified leads and sales from the CRM, with values, teach it to find buyers. Start with Maximize conversion value; add a tROAS when there are enough conversions (aim for 30 to 50 a month). The form submit can stay as a secondary conversion for reporting.',
};

/* ----------------------------------------------------------------- UI ----------------------------------------------------------------- */

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inr = (n) => (n === null || !Number.isFinite(n) ? '–' : '₹' + Math.round(n).toLocaleString('en-IN'));
const n0 = (n) => Math.round(n).toLocaleString('en-IN');
const pc = (r) => (r === null || !Number.isFinite(r) ? '–' : Math.round(r * 100) + '%');
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
export const START = { strategy: 'maxconv', daily: 10000, tcpa: 600, troas: 300 };

export function mount(el, ctx) {
  const S = ctx.state;
  S.cfg ??= { ...START };
  S.weeks ??= [];
  S.lead ??= null;
  el.innerHTML = `
    <section class="card">
      <h3 style="margin-top:0">Campaign settings: Voltra VX1 bookings (Search)</h3>
      <div class="row" style="align-items:flex-end">
        <div style="flex:1 1 200px"><label>Bid strategy<select class="b-st">${Object.entries(STRATEGIES).map(([k, v]) => `<option value="${k}"${S.cfg.strategy === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label></div>
        <div style="flex:1 1 140px"><label>Daily budget (₹)<input class="b-daily" type="number" min="1000" max="100000" step="500" /></label></div>
        <div style="flex:1 1 130px" class="b-tcpa-w"><label>Target CPA (₹)<input class="b-tcpa" type="number" min="100" max="5000" step="10" /></label></div>
        <div style="flex:1 1 130px" class="b-troas-w"><label>Target ROAS (%)<input class="b-troas" type="number" min="50" max="1000" step="10" /></label></div>
      </div>
      <p class="help">A week = daily budget × 7. Each booking is worth about ₹${n0(MODEL.value)} on average; Voltra keeps about ₹${n0(MODEL.margin)} margin per booking.</p>
      <h4>Forecast for the next week</h4>
      <div class="kpis b-fc"></div>
      <div class="b-fcmsg"></div>
      <div class="row"><button class="btn sm b-run" type="button">Run 1 week</button><button class="btn sec sm b-reset" type="button">New campaign</button></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">Weeks run</h3>
      <canvas class="mk-chart b-chart" aria-label="Conversions by weekly spend"></canvas>
      <div class="legend"><span><i style="background:var(--signal)"></i>Conversions you can buy per week (Max conversions, learned)</span><span><i style="background:var(--warn)"></i>Your weeks</span></div>
      <div class="tbl"><table><thead><tr><th>Week</th><th>Strategy</th><th>Budget</th><th>Target</th><th>Spend</th><th>Conv.</th><th>CPA</th><th>Marginal CPA</th><th>Value</th><th>ROAS</th><th>Status</th></tr></thead><tbody class="b-hist"></tbody></table></div>
    </section>
    <div class="two">
      <section class="card">
        <h3 style="margin-top:0">Budget planner</h3>
        <p class="help">Weekly budgets on the learned curve, Max conversions.</p>
        <div class="row"><div style="flex:1 1 120px"><label>Budget A (₹/week)<input class="p-a" type="number" step="5000" value="70000" /></label></div><div style="flex:1 1 120px"><label>Budget B (₹/week)<input class="p-b" type="number" step="5000" value="105000" /></label></div><button class="btn sm p-go" type="button">Compare</button></div>
        <div class="w-out p-out">Type two budgets and press Compare.</div>
      </section>
      <section class="card">
        <h3 style="margin-top:0">Lead-gen goal</h3>
        <p class="help">${esc(LEADGEN.text)}</p>
        <p><b>${esc(LEADGEN.q)}</b></p>
        <div class="w-opts b-lead"></div>
        <div class="b-leadout"></div>
      </section>
    </div>`;
  const $ = (s) => el.querySelector(s);
  const inputs = { st: $('.b-st'), daily: $('.b-daily'), tcpa: $('.b-tcpa'), troas: $('.b-troas') };
  const fill = () => { inputs.daily.value = S.cfg.daily; inputs.tcpa.value = S.cfg.tcpa; inputs.troas.value = S.cfg.troas; };
  fill();
  const lastCfg = () => (S.weeks.length ? S.weeks[S.weeks.length - 1].cfg : null);

  function read() {
    const d = Number(inputs.daily.value), t = Number(inputs.tcpa.value), r = Number(inputs.troas.value);
    if (!(d >= 1000 && d <= 100000)) return 'Daily budget must be between ₹1,000 and ₹1,00,000.';
    if (!(t >= 100 && t <= 5000)) return 'Target CPA must be between ₹100 and ₹5,000.';
    if (!(r >= 50 && r <= 1000)) return 'Target ROAS must be between 50% and 1,000%.';
    S.cfg = { strategy: inputs.st.value, daily: d, tcpa: t, troas: r }; ctx.save();
    return '';
  }
  for (const k of ['st', 'daily', 'tcpa', 'troas']) inputs[k].addEventListener('input', () => { const e = read(); forecast(e); });

  function forecast(err) {
    $('.b-tcpa-w').hidden = S.cfg.strategy !== 'tcpa';
    $('.b-troas-w').hidden = S.cfg.strategy !== 'troas';
    if (err) { $('.b-fcmsg').innerHTML = `<div class="notice warn">${esc(err)}</div>`; return; }
    const prev = lastCfg(), o = simulateWeek(S.cfg, prev);
    $('.b-fc').innerHTML = `
      <div><span class="eyebrow">Spend</span><span class="big">${inr(o.spend)}</span></div>
      <div><span class="eyebrow">Conversions</span><span class="big">${o.conv.toFixed(0)}</span></div>
      <div><span class="eyebrow">CPA</span><span class="big">${inr(o.cpa)}</span></div>
      <div><span class="eyebrow">Marginal CPA</span><span class="big">${inr(o.marginalCpa)}</span></div>
      <div><span class="eyebrow">Value</span><span class="big">${inr(o.revenue)}</span></div>
      <div><span class="eyebrow">ROAS</span><span class="big">${pc(o.roas)}</span></div>`;
    const notes = [];
    notes.push(`Status: <b>${o.status.map(esc).join(' · ')}</b>.`);
    if (o.learning) notes.push(prev ? `This change is ${changeSize(prev, S.cfg) === Infinity ? 'a new strategy' : `a ${Math.round(changeSize(prev, S.cfg) * 100)}% change`}, so the strategy will re-learn for a week (conversions about 15% lower).` : 'A new campaign always starts with a learning week.');
    if (S.cfg.strategy === 'troas') notes.push(`The best ROAS this market can return is about ${pc(MAX_ROAS)}. A higher target leaves nothing to buy.`);
    if (S.cfg.strategy === 'tcpa') notes.push(`The cheapest possible average CPA is about ${inr(MIN_CPA)}. At this budget, Max conversions would average ${inr(avgCpaAt(o.budget))}.`);
    notes.push('Marginal CPA = the cost of one more conversion at this spend.');
    const bad = o.status.some((s) => /Stopped|too strict/.test(s));
    $('.b-fcmsg').innerHTML = `<div class="notice ${bad ? 'warn' : ''}">${notes.join(' ')}</div>`;
  }

  function hist() {
    const target = (c) => (c.strategy === 'tcpa' ? inr(c.tcpa) : c.strategy === 'troas' ? `${c.troas}%` : '–');
    $('.b-hist').innerHTML = S.weeks.length ? S.weeks.map((w, i) => `<tr><td>${i + 1}</td><td>${esc(STRATEGIES[w.cfg.strategy])}</td><td>${inr(w.out.budget)}</td><td>${target(w.cfg)}</td><td>${inr(w.out.spend)}</td><td>${w.out.conv.toFixed(0)}</td><td>${inr(w.out.cpa)}</td><td>${inr(w.out.marginalCpa)}</td><td>${inr(w.out.revenue)}</td><td>${pc(w.out.roas)}</td><td>${w.out.status.map((s) => `<span class="pill ${/Learning/.test(s) ? 'doing' : /Stopped|strict/.test(s) ? 'changes' : ''}">${esc(s)}</span>`).join(' ')}</td></tr>`).join('') : '<tr><td colspan="11">No weeks yet. Press "Run 1 week".</td></tr>';
    draw();
  }

  function draw() {
    const cv = $('.b-chart');
    if (!cv || !cv.clientWidth) return;
    const dpr = devicePixelRatio || 1, w = (cv.width = cv.clientWidth * dpr), h = (cv.height = cv.clientHeight * dpr), x = cv.getContext('2d');
    x.clearRect(0, 0, w, h);
    const maxS = Math.max(400000, ...S.weeks.map((wk) => wk.out.spend * 1.1)), maxC = MODEL.cmax;
    const pad = 36 * dpr, X = (s) => pad + (w - pad * 1.4) * (s / maxS), Y = (c) => h - pad + -(h - pad * 1.6) * (c / maxC);
    x.strokeStyle = css('--border'); x.fillStyle = css('--text-3'); x.lineWidth = 1; x.font = `${11 * dpr}px ui-monospace, monospace`;
    for (const c of [0, 100, 200, 300]) { x.beginPath(); x.moveTo(pad, Y(c)); x.lineTo(w - pad * 0.4, Y(c)); x.stroke(); x.fillText(String(c), 4, Y(c) + 4); }
    for (const s of [0, 100000, 200000, 300000, 400000]) if (s <= maxS) x.fillText(s ? `₹${s / 1000}k` : '₹0', X(s) - 12 * dpr, h - 10 * dpr);
    x.strokeStyle = css('--signal'); x.lineWidth = 2.2 * dpr; x.beginPath();
    for (let i = 0; i <= 100; i++) { const s = (maxS * i) / 100, px = X(s), py = Y(convAt(s)); i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke();
    x.fillStyle = css('--warn');
    for (const wk of S.weeks) { x.beginPath(); x.arc(X(wk.out.spend), Y(wk.out.conv), 4.5 * dpr, 0, Math.PI * 2); x.fill(); }
  }

  $('.b-run').addEventListener('click', () => {
    const e = read();
    if (e) return ctx.toast(e);
    ctx.act();
    const out = simulateWeek(S.cfg, lastCfg());
    S.weeks.push({ cfg: { ...S.cfg }, out });
    if (S.weeks.length > 30) S.weeks.shift();
    ctx.save();
    hist(); forecast();
    for (const id of weekChecks(S.weeks)) ctx.done(id);
    const last = S.weeks.length > 1 ? S.weeks[S.weeks.length - 2] : null;
    if (last && !last.out.learning && out.learning) ctx.toast('That change restarted learning. Next time, move in steps of 20% or less.');
  });
  $('.b-reset').addEventListener('click', () => { ctx.act(); S.weeks = []; ctx.save(); hist(); forecast(); });

  $('.p-go').addEventListener('click', () => {
    ctx.act();
    const a = Number($('.p-a').value), b = Number($('.p-b').value);
    if (!(a >= 1000 && b >= 1000 && a <= 5e6 && b <= 5e6) || a === b) { $('.p-out').textContent = 'Type two different weekly budgets between ₹1,000 and ₹50,00,000.'; return; }
    const lo = Math.min(a, b), hi = Math.max(a, b), r = compareBudgets(lo, hi);
    $('.p-out').innerHTML = `${inr(lo)} buys ${r.ca.toFixed(0)} conversions (average CPA ${inr(r.cpaA)}). ${inr(hi)} buys ${r.cb.toFixed(0)} (average CPA ${inr(r.cpaB)}).<br>
      The extra ${inr(hi - lo)} buys only ${r.extraConv.toFixed(0)} more conversions: <b>${inr(r.incCpa)} each</b>, ${(r.incCpa / r.cpaA).toFixed(1)}× the first budget's average. ${r.incCpa > MODEL.margin ? `That is more than the ₹${n0(MODEL.margin)} margin per booking, so the extra budget loses money.` : `That is still under the ₹${n0(MODEL.margin)} margin per booking.`}`;
    if (hi >= 2 * lo) ctx.done('b1');
    else $('.p-out').innerHTML += '<br><span class="help">For the task, make one budget at least twice the other.</span>';
  });

  function lead() {
    $('.b-lead').innerHTML = LEADGEN.options.map((o, j) => `<button type="button" class="w-opt${S.lead === j ? (j === LEADGEN.answer ? ' right' : ' wrong') : ''}" data-o="${j}">${esc(o)}</button>`).join('');
    $('.b-leadout').innerHTML = S.lead === null ? '' : S.lead === LEADGEN.answer ? `<div class="notice ok">${esc(LEADGEN.why)}</div>` : '<div class="notice warn">Not this one. Ask: what does this teach the bidder to find more of?</div>';
    el.querySelectorAll('.b-lead [data-o]').forEach((b) => b.addEventListener('click', () => {
      ctx.act(); S.lead = +b.dataset.o; ctx.save(); lead();
      if (S.lead === LEADGEN.answer) ctx.done('b6');
    }));
  }

  hist(); forecast(); lead();
  addEventListener('resize', draw);
}
