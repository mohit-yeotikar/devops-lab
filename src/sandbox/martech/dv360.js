// Lab: Display & Video 360 line items (simplified simulator).
// Pure delivery model (exported for tests) + mount(el, ctx) UI. Voltra Mobility festive awareness.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const num = (n) => Math.round(n).toLocaleString('en-IN');

export const lab = {
  id: 'mk-dv360', track: 'martech', kind: 'widget', title: 'Display & Video 360 line items', topic: 'Programmatic', minutes: 35, sprints: ['m09'],
  summary: 'Set up DV360 line items for Voltra\'s festive awareness push, run a 30-day delivery simulation, and fix an under-pacing line item without breaking brand safety.',
  intro: [
    'This is a simplified simulator of Display & Video 360 (DV360), Google\'s demand-side platform (DSP). Real DV360 has many more settings and real auctions; the cause and effect here follows the real product.',
    'Structure: partner (the agency seat) → advertiser (Voltra Mobility) → campaign → insertion order (IO: budget, pacing, flight dates) → line items (bids, frequency caps, targeting, inventory, brand safety). Line items are where delivery is won or lost.',
    'Each day the simulator works out how many people your targeting can reach, how many auctions your bid wins against the market clearing price, how many impressions the frequency cap allows, and how much budget pacing lets you spend.',
  ],
  tasks: [
    { id: 'd1', text: 'Run the under-pacing line item and name its three causes.', why: 'Diagnose before you change anything. Changing everything at once teaches you nothing.', hint: 'Press "Save and run". Look at eligible people, win rate and which limit binds each day.' },
    { id: 'd2', text: 'Case "line item under-pacing": get LI_Awareness_OpenAuction to 95% pacing or more, with a bid of ₹250 or less and Voltra\'s brand-safety policy intact.', why: 'Under-delivery means lost reach in the most important weeks of the year, and unspent budget is hard to win back.', hint: 'Widen the audience and geography, bid near or above the clearing price, and loosen the frequency cap. Do not touch the brand-safety settings.' },
    { id: 'd3', text: 'Set a sensible frequency cap for an awareness line item.', why: 'Too strict and you cannot reach anyone often enough to be remembered; no cap and the same people see you 40 times.', hint: 'For awareness, 1 to 3 per day, or 3 to 10 per week, is a common range.' },
    { id: 'd4', text: 'Keep delivered viewability at 70% or more on the awareness line item while it stays on pace.', why: 'An ad that is never on screen builds no awareness. Viewability targets are in most media contracts.', hint: 'Use the "Predicted viewability" target. It removes low-viewability inventory but raises the price, so check your bid.' },
    { id: 'd5', text: 'Buy premium news inventory through a PMP deal on LI_Premium_News, and make it deliver.', why: 'A PMP gives access to premium inventory the publisher does not sell in the open auction, with a floor price.', hint: 'Pick the Times Internet news PMP. A bid below the floor price wins nothing.' },
    { id: 'd6', text: 'Match open auction, PMP and programmatic guaranteed to what they mean.', why: 'Choosing the right deal type is a daily senior decision: price, control and commitment differ.', hint: 'Who can bid? Is the price fixed? Is the volume reserved?' },
  ],
  quiz: [
    { q: 'A line item spends 40% of its daily budget. The win rate is 3%. What do you check first?', options: ['The creative colour', 'The bid compared with the market clearing price', 'The IO name', 'The Floodlight tag'], answer: 1, why: 'A very low win rate means you lose most auctions. Compare your bid with the clearing price before you widen targeting.' },
    { q: 'What is the main difference between a PMP and programmatic guaranteed?', options: ['PMP is only for video', 'PMP is an invite-only auction without reserved volume; PG has a fixed price and reserved impressions you commit to buy', 'PG is cheaper', 'There is none'], answer: 1, why: 'PMP: auction with a floor, no guarantee. PG: fixed price, fixed volume, like a direct buy run through the DSP.' },
    { q: 'Raising the predicted viewability target from none to 70% usually…', options: ['Raises viewability, removes inventory and raises the price you must pay', 'Changes nothing', 'Lowers the CPM', 'Increases reach'], answer: 0, why: 'You only bid on impressions likely to be seen. There are fewer of them and others want them too.' },
  ],
};

// ---------- Model data ----------
export const PARTNER = 'Voltra Media (agency partner)';
export const IO = { name: 'IO_Festive_Awareness_Nov26', budget: 900000, days: 30, start: '1 Nov 2026', end: '30 Nov 2026', pacing: 'Even' };
export const AUDIENCES = {
  rmkt: { label: '1P remarketing: booking form visitors (30 days)', users: 40000 },
  inmarket: { label: 'Google in-market: two-wheelers', users: 3000000 },
  affinity: { label: 'Google affinity: green living', users: 6000000 },
  none: { label: 'No audience (contextual or deal only)', users: 20000000 },
};
export const GEOS = { pune: { label: 'Pune only', f: 0.06 }, metros: { label: 'Top 8 metros', f: 0.45 }, dealers: { label: 'Voltra dealer cities (40)', f: 0.7 }, india: { label: 'All India', f: 1 } };
export const INVENTORY = {
  open: { label: 'Open auction (all exchanges)', type: 'open', clearing: 110, opps: 4, reach: 0.9, view: 52 },
  pmp_news: { label: 'PMP: Times Internet premium news (floor ₹220)', type: 'pmp', floor: 220, avails: 150000, users: 4000000, opps: 3, view: 68, news: true },
  pmp_gaming: { label: 'PMP: casual gaming apps (floor ₹90)', type: 'pmp', floor: 90, avails: 400000, users: 8000000, opps: 5, view: 45, news: false },
  pg_ht: { label: 'PG: Hindustan Times homepage (fixed ₹380, 40,000 impressions a day, committed)', type: 'pg', price: 380, daily: 40000, users: 2500000, view: 72, news: true },
};
export const LABELS = { G: 0.35, PG: 0.6, T: 0.85, MA: 1 };
export const VIEW = { 0: { supply: 1, prem: 0 }, 40: { supply: 0.85, prem: 0.05 }, 50: { supply: 0.7, prem: 0.1 }, 60: { supply: 0.5, prem: 0.18 }, 70: { supply: 0.32, prem: 0.3 }, 80: { supply: 0.15, prem: 0.5 } };
export const CAP_PER = { day: 1, week: 7, month: 30 };
export const MAX_OPEN_BID = 250;
export const VIEW_TARGET = 70;

export const brokenLI = () => ({ name: 'LI_Awareness_OpenAuction', budget: 600000, bid: 60, pacing: 'even', capN: 1, capPer: 'week', aud: 'rmkt', geo: 'pune', inv: 'open', label: 'T', sensitive: true, verification: true, view: 0 });
export const newsLI = () => ({ name: 'LI_Premium_News', budget: 300000, bid: 150, pacing: 'even', capN: 5, capPer: 'week', aud: 'none', geo: 'india', inv: 'open', label: 'PG', sensitive: true, verification: true, view: 0 });

/** Voltra brand-safety policy: content label T or stricter, sensitive categories excluded, pre-bid verification on. */
export function policyIssues(li) {
  const out = [];
  if (!['G', 'PG', 'T'].includes(li.label)) out.push(`Digital content label ${li.label} allows mature content. Voltra's policy is T or stricter.`);
  if (!li.sensitive) out.push('Sensitive categories (tragedy, conflict, adult and similar) must stay excluded.');
  if (!li.verification) out.push('Pre-bid verification (third-party brand safety) must stay on.');
  return out;
}
export function capPerDay(li) {
  if (li.capPer === 'none' || !(li.capN > 0)) return Infinity;
  return li.capN / CAP_PER[li.capPer];
}
/** Is this a sensible awareness frequency cap? */
export function capAdvice(li) {
  if (li.capPer === 'none' || !(li.capN > 0)) return { ok: false, msg: 'No cap: the same people can see the ad dozens of times while others never see it. Awareness needs a cap.' };
  const ranges = { day: [1, 3], week: [3, 10], month: [10, 30] };
  const [lo, hi] = ranges[li.capPer];
  if (li.capN < lo) return { ok: false, msg: `${li.capN} per ${li.capPer} is very strict: people barely see the ad and delivery is blocked. Try ${lo} to ${hi} per ${li.capPer}.` };
  if (li.capN > hi) return { ok: false, msg: `${li.capN} per ${li.capPer} is loose: budget goes to people who already saw the ad many times. Try ${lo} to ${hi} per ${li.capPer}.` };
  return { ok: true, msg: `${li.capN} per ${li.capPer} is a sensible awareness cap.` };
}

/** Day-by-day delivery simulation for one line item. Pure and deterministic. */
export function simulate(li, days = IO.days) {
  const inv = INVENTORY[li.inv], aud = AUDIENCES[li.aud], geo = GEOS[li.geo].f;
  const v = VIEW[li.view] || VIEW[0];
  const bs = LABELS[li.label] * (li.sensitive ? 0.9 : 1) * (li.verification ? 0.92 : 1);
  let users, avail, paid, clearing = null, win;
  if (inv.type === 'open') {
    users = aud.users * geo * inv.reach * bs * v.supply;
    clearing = inv.clearing * (1 + v.prem) * (li.label === 'G' ? 1.1 : 1);
    win = 0.6 / (1 + Math.exp(-(li.bid - clearing) / (0.15 * clearing)));
    avail = users * inv.opps * win;
    paid = li.bid * 0.9;
  } else if (inv.type === 'pmp') {
    users = (li.aud === 'none' ? inv.users : Math.min(inv.users, aud.users) * 0.5) * geo * bs * v.supply;
    clearing = inv.floor;
    win = li.bid >= inv.floor ? 0.85 : 0;
    avail = Math.min(inv.avails * geo * bs * v.supply, users * inv.opps) * win;
    paid = Math.max(inv.floor, li.bid * 0.9);
  } else {
    users = inv.users * geo;
    win = 1;
    avail = inv.daily * geo;
    paid = inv.price;
  }
  const capacity = users * capPerDay(li);
  const out = []; let spent = 0, imps = 0, over = false;
  const limits = { supply: 0, cap: 0, budget: 0 };
  for (let d = 1; d <= days; d++) {
    const remaining = li.budget - spent, left = days - d + 1;
    const target = li.pacing === 'asap' ? remaining : li.pacing === 'ahead' ? Math.min(remaining, (1.25 * li.budget) / days) : remaining / left;
    const byBudget = Math.max(0, (target / paid) * 1000);
    const di = Math.floor(Math.min(avail, capacity, byBudget));
    const lim = di >= Math.floor(byBudget) ? 'budget' : di >= Math.floor(capacity) ? 'cap' : 'supply';
    limits[lim]++;
    const ds = (di * paid) / 1000;
    spent += ds; imps += di;
    const expected = (li.budget * d) / days;
    const ratio = spent / expected;
    if (ratio > 1.1) over = true;
    out.push({ d, imps: di, spend: ds, cum: spent, expected, ratio, lim });
  }
  const reach = users > 0 ? users * (1 - Math.exp(-imps / users)) : 0;
  const viewability = Math.min(90, li.view ? Math.max(inv.view, li.view + 8) : inv.view);
  const pacing = li.budget ? spent / li.budget : 0;
  const status = over ? 'Over-pacing' : pacing < 0.95 ? 'Under-pacing' : 'On pace';
  return { days: out, imps, spend: spent, reach, freq: reach ? imps / reach : 0, viewability, pacing, status, users, clearing, win, paid, capacity, avail, limits, ecpm: imps ? (spent / imps) * 1000 : 0 };
}

export const DIAG = [
  { id: 'narrow', text: 'Targeting is too narrow: a small remarketing list in one city.', right: true },
  { id: 'bid', text: 'The bid is far below the market clearing price, so it wins few auctions.', right: true },
  { id: 'cap', text: 'The frequency cap of 1 per week blocks most impressions to the few people it can reach.', right: true },
  { id: 'bs', text: 'Brand safety is too strict and should be switched off.', right: false },
  { id: 'budget', text: 'The IO budget is too small.', right: false },
  { id: 'creative', text: 'The creative is not approved.', right: false },
];
export const diagOk = (picked) => DIAG.every((x) => !!picked[x.id] === x.right);

export const DEAL_TYPES = ['Open auction', 'Private marketplace (PMP)', 'Programmatic guaranteed (PG)', 'Preferred deal'];
export const DEAL_Q = [
  { id: 'q1', text: 'Any buyer can bid in real time. The price comes from the auction. No volume is promised.', a: 0 },
  { id: 'q2', text: 'Only invited buyers can bid. The publisher sets a floor price. No volume is promised.', a: 1 },
  { id: 'q3', text: 'Fixed price and a fixed number of impressions reserved for you. You commit to buy them.', a: 2 },
];
export const dealOk = (ans) => DEAL_Q.every((q) => Number(ans[q.id]) === q.a);

export function pacingFixed(li) {
  const r = simulate(li);
  return r.status === 'On pace' && policyIssues(li).length === 0 && li.bid <= MAX_OPEN_BID && li.budget === brokenLI().budget;
}
export function viewabilityOk(li) {
  return pacingFixed(li) && simulate(li).viewability >= VIEW_TARGET;
}
export function pmpOk(li) {
  const inv = INVENTORY[li.inv];
  return li.inv === 'pmp_news' && li.bid >= inv.floor && policyIssues(li).length === 0 && simulate(li).imps > 0;
}
export function dvChecks(S) {
  const d = [];
  const [a, n] = S.li || [];
  if (S.diagOk) d.push('d1');
  if (a && pacingFixed(a)) d.push('d2');
  if (a && capAdvice(a).ok) d.push('d3');
  if (a && viewabilityOk(a)) d.push('d4');
  if (n && pmpOk(n)) d.push('d5');
  if (S.dealOk) d.push('d6');
  return d;
}

function chart(r, budget, days) {
  const W = 600, H = 180, pad = 24, bw = (W - pad * 2) / days;
  const daily = budget / days;
  const max = Math.max(daily * 1.6, ...r.days.map((x) => x.spend)) || 1;
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  const bars = r.days.map((x, i) => `<rect x="${(pad + i * bw + 1).toFixed(1)}" y="${y(x.spend).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${(H - pad - y(x.spend)).toFixed(1)}" fill="var(--signal)" opacity=".85"><title>Day ${x.d}: ${inr(x.spend)}</title></rect>`).join('');
  return `<svg class="a-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily spend against the even daily budget">
    ${bars}<line x1="${pad}" x2="${W - pad}" y1="${y(daily).toFixed(1)}" y2="${y(daily).toFixed(1)}" stroke="var(--warn)" stroke-width="2" stroke-dasharray="6 4"/>
    <line x1="${pad}" x2="${W - pad}" y1="${H - pad}" y2="${H - pad}" stroke="var(--border-strong)"/>
    <text x="${pad}" y="${H - 6}" font-size="11" fill="var(--text-3)">Day 1</text><text x="${W - pad}" y="${H - 6}" font-size="11" fill="var(--text-3)" text-anchor="end">Day ${days}</text>
  </svg><div class="legend"><span><i style="background:var(--signal);height:8px"></i>Daily spend</span><span><i style="background:var(--warn)"></i>Even daily budget ${inr(daily)}</span></div>`;
}

// ---------- UI ----------
export function mount(el, ctx) {
  const S = ctx.state;
  if (!Array.isArray(S.li) || S.li.length !== 2) S.li = [brokenLI(), newsLI()];
  S.cur ??= 0; S.diag ??= {}; S.deal ??= {};
  const opt = (v, label, cur) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(label)}</option>`;
  el.innerHTML = `
    <section class="card">
      <p class="eyebrow">Partner: ${esc(PARTNER)} → Advertiser: Voltra Mobility → Campaign: Festive awareness 2026</p>
      <h3 style="margin-top:0">Insertion order <span class="mono">${esc(IO.name)}</span></h3>
      <div class="kpis"><div><span class="eyebrow">IO budget</span><span class="big">${inr(IO.budget)}</span></div><div><span class="eyebrow">Flight</span><span class="big">${IO.start} to ${IO.end}</span></div><div><span class="eyebrow">IO pacing</span><span class="big">${IO.pacing}</span></div></div>
      <p class="help">Two line items share the IO: LI_Awareness_OpenAuction (${inr(600000)}) and LI_Premium_News (${inr(300000)}). Voltra's brand-safety policy: content label T or stricter, sensitive categories excluded, pre-bid verification on. Max open-auction bid: ${inr(MAX_OPEN_BID)} CPM.</p>
    </section>
    <section class="card">
      <div class="row between"><h3 style="margin:0">Line item</h3><div class="row"><select class="dv-cur" style="max-width:260px">${S.li.map((l, i) => opt(i, l.name, S.cur)).join('')}</select><button type="button" class="btn sec sm dv-reset">Reset this line item</button></div></div>
      <div class="dv-form"></div>
      <div class="row" style="margin-top:10px"><button type="button" class="btn sm dv-run">Save and run 30 days</button></div>
      <div class="dv-out"></div>
    </section>
    <div class="two">
      <section class="card">
        <h3 style="margin-top:0">Diagnosis: why is the awareness line item under-pacing?</h3>
        <p class="help">Run the line item as you found it first. Tick every real cause.</p>
        <div class="dv-diag">${DIAG.map((x) => `<label class="w-check"><input type="checkbox" data-diag="${x.id}"${S.diag[x.id] ? ' checked' : ''}> ${esc(x.text)}</label>`).join('')}</div>
        <button type="button" class="btn sm dv-diag-go" style="margin-top:10px">Check my diagnosis</button>
        <div class="dv-diag-out"></div>
      </section>
      <section class="card">
        <h3 style="margin-top:0">Deal types</h3>
        <p class="help">Match each description to the deal type.</p>
        ${DEAL_Q.map((q) => `<div class="w-q"><p>${esc(q.text)}</p><select data-deal="${q.id}"><option value="">Choose</option>${DEAL_TYPES.map((t, j) => opt(j, t, S.deal[q.id])).join('')}</select></div>`).join('')}
        <button type="button" class="btn sm dv-deal-go" style="margin-top:10px">Check</button>
        <div class="dv-deal-out"></div>
      </section>
    </div>`;
  const $ = (s) => el.querySelector(s);
  const check = () => { for (const id of dvChecks(S)) ctx.done(id); };

  function paintForm() {
    const li = S.li[S.cur];
    $('.dv-form').innerHTML = `
      <h4 style="margin:12px 0 4px">Budget and bidding</h4>
      <div class="row">
        <div style="flex:1 1 140px"><label>Budget (flight)<input value="${inr(li.budget)}" disabled /></label></div>
        <div style="flex:1 1 140px"><label>Pacing<select data-f="pacing">${opt('even', 'Even', li.pacing)}${opt('ahead', 'Ahead', li.pacing)}${opt('asap', 'ASAP', li.pacing)}</select></label></div>
        <div style="flex:1 1 140px"><label>Fixed bid (₹ CPM)<input data-f="bid" type="number" min="1" max="1000" step="1" value="${li.bid}" /></label></div>
      </div>
      <div class="row">
        <div style="flex:1 1 100px"><label>Frequency cap<input data-f="capN" type="number" min="0" max="100" step="1" value="${li.capN}" /></label></div>
        <div style="flex:1 1 140px"><label>impressions per<select data-f="capPer">${opt('day', 'day', li.capPer)}${opt('week', 'week', li.capPer)}${opt('month', 'month', li.capPer)}${opt('none', 'no cap', li.capPer)}</select></label></div>
      </div>
      <h4 style="margin:12px 0 4px">Targeting and inventory</h4>
      <div class="row">
        <div style="flex:1 1 220px"><label>Audience<select data-f="aud">${Object.entries(AUDIENCES).map(([k, a]) => opt(k, `${a.label} · ${num(a.users)} people`, li.aud)).join('')}</select></label></div>
        <div style="flex:1 1 180px"><label>Geography<select data-f="geo">${Object.entries(GEOS).map(([k, g]) => opt(k, g.label, li.geo)).join('')}</select></label></div>
      </div>
      <label>Inventory source<select data-f="inv">${Object.entries(INVENTORY).map(([k, x]) => opt(k, x.label, li.inv)).join('')}</select></label>
      <h4 style="margin:12px 0 4px">Brand safety and viewability</h4>
      <div class="row">
        <div style="flex:1 1 160px"><label>Max digital content label<select data-f="label">${['G', 'PG', 'T', 'MA'].map((x) => opt(x, x === 'MA' ? 'MA (mature)' : x, li.label)).join('')}</select></label></div>
        <div style="flex:1 1 180px"><label>Predicted viewability (Active View)<select data-f="view">${Object.keys(VIEW).map((x) => opt(x, x === '0' ? 'No target' : `${x}% or more`, li.view)).join('')}</select></label></div>
      </div>
      <label class="w-check"><input type="checkbox" data-f="sensitive"${li.sensitive ? ' checked' : ''}> Exclude sensitive categories</label>
      <label class="w-check"><input type="checkbox" data-f="verification"${li.verification ? ' checked' : ''}> Pre-bid verification (third-party brand safety)</label>`;
  }
  function readForm() {
    const li = S.li[S.cur];
    el.querySelectorAll('.dv-form [data-f]').forEach((x) => {
      const f = x.dataset.f;
      if (x.type === 'checkbox') li[f] = x.checked;
      else if (['bid', 'capN', 'view'].includes(f)) li[f] = Math.max(0, Math.min(f === 'bid' ? 1000 : 100, Number(x.value) || 0));
      else li[f] = x.value;
    });
  }
  function paintResult() {
    const li = S.li[S.cur], r = simulate(li);
    const pol = policyIssues(li), cap = capAdvice(li);
    const pill = r.status === 'On pace' ? 'done' : r.status === 'Under-pacing' ? 'changes' : 'doing';
    const main = Object.entries(r.limits).sort((a, b) => b[1] - a[1])[0][0];
    const why = { supply: 'Supply: too few eligible people or auctions won. Widen targeting or raise the bid.', cap: 'Frequency cap: the people you can reach have already seen the ad enough times.', budget: 'Budget: delivery is limited only by the pacing plan. This is what you want.' }[main];
    $('.dv-out').innerHTML = `
      <div class="kpis">
        <div><span class="eyebrow">Spend</span><span class="big">${inr(r.spend)}</span></div>
        <div><span class="eyebrow">Pacing</span><span class="big">${(r.pacing * 100).toFixed(1)}%</span></div>
        <div><span class="eyebrow">Status</span><span class="pill ${pill}" style="margin-top:6px">${r.status}</span></div>
        <div><span class="eyebrow">Impressions</span><span class="big">${num(r.imps)}</span></div>
        <div><span class="eyebrow">Reach</span><span class="big">${num(r.reach)}</span></div>
        <div><span class="eyebrow">Avg. frequency</span><span class="big">${r.freq.toFixed(1)}</span></div>
        <div><span class="eyebrow">Viewability</span><span class="big ${r.viewability >= VIEW_TARGET ? 'ok' : 'err'}">${r.viewability}%</span></div>
        <div><span class="eyebrow">eCPM</span><span class="big">${inr(r.ecpm)}</span></div>
      </div>
      ${chart(r, li.budget, IO.days)}
      <div class="w-out">
        Eligible people after targeting, brand safety and viewability: <b>${num(r.users)}</b><br>
        ${INVENTORY[li.inv].type === 'open' ? `Market clearing price: <b>${inr(r.clearing)}</b> CPM · your bid ${inr(li.bid)} · win rate <b>${(r.win * 100).toFixed(1)}%</b>` : INVENTORY[li.inv].type === 'pmp' ? `Deal floor: <b>${inr(r.clearing)}</b> CPM · your bid ${inr(li.bid)} · ${r.win ? 'bid clears the floor' : '<span class="err">bid is below the floor: you win nothing</span>'}` : `Programmatic guaranteed: fixed ${inr(INVENTORY[li.inv].price)} CPM, the bid is ignored, volume is reserved.`}<br>
        Impressions a day: auctions won ${num(r.avail)} · frequency cap allows ${Number.isFinite(r.capacity) ? num(r.capacity) : 'any number'} · budget allows ${num((li.budget / IO.days / r.paid) * 1000)}<br>
        Main limit: <b>${why}</b>
      </div>
      ${pol.length ? `<div class="notice warn"><strong>Brand-safety policy broken.</strong> ${pol.map(esc).join(' ')}</div>` : ''}
      ${S.cur === 0 && li.bid > MAX_OPEN_BID ? `<div class="notice warn">Bid ${inr(li.bid)} is above Voltra's max open-auction CPM of ${inr(MAX_OPEN_BID)}.</div>` : ''}
      ${S.cur === 0 ? `<div class="notice ${cap.ok ? 'ok' : 'warn'}">${esc(cap.msg)}</div>` : ''}
      ${S.cur === 0 && r.status === 'On pace' && r.viewability < VIEW_TARGET ? `<div class="notice warn">On pace, but viewability is ${r.viewability}%. The contract target is ${VIEW_TARGET}%.</div>` : ''}
      ${S.cur === 1 && li.inv !== 'pmp_news' ? '<div class="notice">This line item is meant for premium news sites. Open auction gives you mostly long-tail sites; check the inventory options.</div>' : ''}`;
  }
  $('.dv-cur').addEventListener('change', (e) => { S.cur = +e.target.value; ctx.save(); paintForm(); paintResult(); });
  $('.dv-reset').addEventListener('click', () => { S.li[S.cur] = S.cur === 0 ? brokenLI() : newsLI(); ctx.save(); paintForm(); paintResult(); ctx.toast('Line item reset.'); });
  $('.dv-run').addEventListener('click', () => { readForm(); ctx.save(); ctx.act(); paintResult(); check(); });
  $('.dv-diag-go').addEventListener('click', () => {
    ctx.act();
    el.querySelectorAll('[data-diag]').forEach((x) => { S.diag[x.dataset.diag] = x.checked; });
    const ok = diagOk(S.diag);
    S.diagOk = S.diagOk || ok; ctx.save();
    const missing = DIAG.filter((x) => x.right && !S.diag[x.id]).length, wrong = DIAG.filter((x) => !x.right && S.diag[x.id]).length;
    $('.dv-diag-out').innerHTML = `<div class="notice ${ok ? 'ok' : 'warn'}">${ok ? '<strong>Right.</strong> Narrow targeting gives about 1,500 eligible people, a ₹60 bid against a ₹110 clearing price wins about 3% of auctions, and 1 per week allows only about 200 impressions a day even if you won every auction. Brand safety at T is normal and is Voltra policy.' : `<strong>Not quite.</strong> ${missing ? `${missing} real cause${missing > 1 ? 's are' : ' is'} missing. ` : ''}${wrong ? `${wrong} ticked item${wrong > 1 ? 's are' : ' is'} not a cause. ` : ''}Run the line item and read the numbers under the chart.`}</div>`;
    check();
  });
  $('.dv-deal-go').addEventListener('click', () => {
    ctx.act();
    el.querySelectorAll('[data-deal]').forEach((x) => { S.deal[x.dataset.deal] = x.value; });
    const ok = dealOk(S.deal);
    S.dealOk = S.dealOk || ok; ctx.save();
    $('.dv-deal-out').innerHTML = `<div class="notice ${ok ? 'ok' : 'warn'}">${ok ? '<strong>Right.</strong> Open auction: anyone, auction price. PMP: invited buyers, floor price, no guarantee. PG: fixed price and reserved volume you must buy. A preferred deal is in between: fixed price and first look, but no commitment on either side.' : '<strong>Not quite.</strong> Ask for each one: who can bid, is the price fixed, and is the volume reserved?'}</div>`;
    check();
  });
  paintForm(); paintResult(); check();
}
