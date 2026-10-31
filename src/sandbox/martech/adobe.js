// Lab: Adobe Analytics variables (simplified simulator).
// Pure attribution engine (exported for tests) + mount(el, ctx) UI. Voltra Mobility report suite.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const fx = (n) => (Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : n.toFixed(2));

export const lab = {
  id: 'mk-adobe', track: 'martech', kind: 'widget', title: 'Adobe Analytics variables', topic: 'Analytics platforms', minutes: 35, sprints: ['m10'],
  summary: 'Configure eVars, props and a processing rule on Voltra\'s report suite, and watch campaign credit move with allocation and expiration.',
  intro: [
    'This is a simplified simulator of an Adobe Analytics report suite. Real Adobe has many more settings (and Attribution IQ in Analysis Workspace), but eVars, props and success events behave here as they do in the product.',
    'Props are traffic variables: they live only on the hit where they are set. eVars are conversion variables: they persist. Allocation decides which value gets credit when several were set (most recent, original or linear). Expiration decides how long a value lives (a visit, 30 days, until an event).',
    'Below are the hits of five Voltra visitors over several weeks. Campaign links carry ?cid=…. A processing rule copies cid into eVar1. Then the freeform table shows which campaign gets credit for leads (event1) and orders.',
  ],
  tasks: [
    { id: 'a1', text: 'Add a processing rule that copies the query parameter cid into eVar1.', why: 'Processing rules change data on Adobe\'s servers before reports are built, without a code release.', hint: 'Query string parameter: cid. Overwrite: eVar1. Parameter names are case-sensitive.' },
    { id: 'a2', text: 'Give each order to the last campaign the visitor clicked before it.', why: 'Last touch is how most media teams read results, and the default for campaign eVars.', hint: 'Allocation: Most recent. Expiration must outlive the visit, because people come back later to buy.' },
    { id: 'a3', text: 'Switch to first-touch credit: each order goes to the campaign that first brought the visitor.', why: 'First touch shows which channels start journeys, for example awareness display.', hint: 'Allocation: Original value (first). Asha\'s order should go to dv360_awareness.' },
    { id: 'a4', text: 'Split the credit for each order equally across the campaigns before it.', why: 'Linear allocation shares credit across a journey. Fractions of an order in a report are normal then.', hint: 'Allocation: Linear. Asha\'s ₹4,000 order splits into three equal parts.' },
    { id: 'a5', text: 'Explain why a prop cannot get credit for an order.', why: 'Choosing prop or eVar is the first design decision in every Adobe solution design reference (SDR).', hint: 'Copy cid into prop1 with a second rule, switch the table to prop1, then answer the question.' },
    { id: 'a6', text: 'Case "campaign eVar gives credit to the wrong campaign": fix eVar1 so the table follows the 30-day click rule.', why: 'Wrong expiration pays partners for orders they did not drive. This is a real money problem.', hint: 'Load the case. Imran clicked an affiliate link on day 1 and bought on day 50. Most recent stays; change the expiration.' },
    { id: 'a7', text: 'Map three GA4 concepts to their Adobe Analytics equivalents.', why: 'Most teams run both tools or move between them. You must translate in meetings.', hint: 'Event parameters carry data, key events are the goals, explorations are the free analysis tool.' },
  ],
  quiz: [
    { q: 'eVar1 uses Most recent allocation and expires after the visit. A visitor clicks a campaign today and buys tomorrow without a new click. Who gets the order?', options: ['The campaign', 'None (no value): the eVar expired at the end of the first visit', 'The first page', 'It is split'], answer: 1, why: 'Visit expiration ends at the end of the visit. Campaign eVars normally use 30 days or similar so return visits keep the value.' },
    { q: 'Which variable type should hold a campaign tracking code that must get credit for later orders?', options: ['A prop', 'An eVar', 'A list prop', 'A classification'], answer: 1, why: 'Only eVars persist and get credit for success events on later hits.' },
    { q: 'What does a processing rule do?', options: ['Changes the page code', 'Sets, copies or changes variable values on Adobe\'s servers before the data is stored', 'Deletes old data', 'Builds a segment'], answer: 1, why: 'Rules run on incoming hits. They cannot change data that was already processed.' },
  ],
};

// ---------- Data: five visitors ----------
const H = (v, day, visit, url, events = [], revenue = 0) => ({ v, day, visit, url, events, revenue });
export const VISITORS = { V1: 'Asha', V2: 'Rahul', V3: 'Neha', V4: 'Imran', V5: 'Priya' };
export const HITS = [
  H('V1', 1, 1, '/scooters/volt-s?cid=dv360_awareness'),
  H('V1', 1, 1, '/scooters/volt-s/specs'),
  H('V1', 3, 2, '/test-ride?cid=gads_brand_search'),
  H('V1', 3, 2, '/test-ride/thank-you', ['event1']),
  H('V1', 5, 3, '/accessories?cid=email_accessories'),
  H('V1', 5, 3, '/checkout/thank-you', ['purchase'], 4000),
  H('V2', 1, 1, '/?cid=meta_festive_video&utm_campaign=festive_video'),
  H('V2', 2, 2, '/test-ride'),
  H('V2', 2, 2, '/test-ride/thank-you', ['event1']),
  H('V2', 9, 3, '/accessories/helmet?cid=affiliate_cashback'),
  H('V2', 9, 3, '/checkout/thank-you', ['purchase'], 2000),
  H('V3', 2, 1, '/test-ride?cid=gads_brand_search'),
  H('V3', 2, 1, '/test-ride/thank-you', ['event1']),
  H('V3', 4, 2, '/scooters/volt-x'),
  H('V3', 4, 2, '/checkout/thank-you', ['purchase'], 6000),
  H('V4', 1, 1, '/accessories?cid=affiliate_cashback'),
  H('V4', 50, 2, '/accessories/charger'),
  H('V4', 50, 2, '/checkout/thank-you', ['purchase'], 3000),
  H('V5', 1, 1, '/scooters?cid=meta_festive_video'),
  H('V5', 15, 2, '/scooters/volt-s'),
  H('V5', 15, 2, '/checkout/thank-you', ['purchase'], 5000),
];
export const ALLOC = [['recent', 'Most recent (last)'], ['original', 'Original value (first)'], ['linear', 'Linear']];
export const EXPIRY = [['hit', 'Page view (hit)'], ['visit', 'Visit'], ['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['purchase', 'Purchase event'], ['never', 'Never']];
export const TARGETS = ['eVar1', 'eVar2', 'prop1'];
export const NONE = 'None';

/** Read a query string parameter from a raw URL (exact, case-sensitive name). */
export function queryParam(url, name) {
  const i = url.indexOf('?');
  if (i < 0) return null;
  for (const part of url.slice(i + 1).split('#')[0].split('&')) {
    const j = part.indexOf('=');
    const k = j < 0 ? part : part.slice(0, j);
    if (k === name) { const v = j < 0 ? '' : part.slice(j + 1); try { return decodeURIComponent(v); } catch { return v; } }
  }
  return null;
}
/** Apply processing rules in order: "if query parameter P is set, overwrite TARGET with its value". */
export function applyRules(hits, rules) {
  return hits.map((h) => {
    const vars = {};
    for (const r of rules || []) {
      const v = queryParam(h.url, r.param);
      if (v !== null && v !== '' && TARGETS.includes(r.target)) vars[r.target] = v;
    }
    return { ...h, vars };
  });
}

/**
 * Credit success events to the values of one variable.
 * hits: [{ v, day, visit, events: ['event1'|'purchase'], revenue, vars: { [variable]: value } }] in time order.
 * cfg:  { alloc: 'recent'|'original'|'linear', exp: 'hit'|'visit'|'7d'|'30d'|'90d'|'purchase'|'never' }.
 * Rules (simplified Adobe behaviour):
 *  - A value set on a hit applies to events on that same hit.
 *  - recent: a new value replaces the old one and restarts the expiration clock.
 *  - original: while a value is active, new values are ignored; the clock runs from the original set.
 *  - linear: every value set inside the expiration window shares the credit equally (per instance).
 *  - hit: value lives on its own hit only (this is also how props behave). visit: until the visit ends.
 *    Nd: expires when more than N days have passed since it was set. purchase: cleared after a purchase hit.
 *  - Events with no active value go to "None".
 * Returns { rows: { value: { event1, orders, revenue } }, credits: [{ v, day, event, value, share, revenue }] }.
 */
export function attribute(hits, cfg, variable = 'eVar1') {
  const rows = {}, credits = [], held = {};
  const row = (k) => (rows[k] ??= { event1: 0, orders: 0, revenue: 0 });
  const days = { '7d': 7, '30d': 30, '90d': 90 }[cfg.exp];
  for (const h of hits) {
    let list = held[h.v] || [];
    // 1. expire what is no longer valid for this hit
    if (cfg.exp === 'hit') list = [];
    else if (cfg.exp === 'visit') list = list.filter((x) => x.visit === h.visit);
    else if (days) list = list.filter((x) => h.day - x.day <= days);
    // 2. set a new value
    const val = h.vars ? h.vars[variable] : undefined;
    if (val !== undefined && val !== null && val !== '') {
      const inst = { value: val, day: h.day, visit: h.visit };
      if (cfg.alloc === 'original') { if (!list.length) list = [inst]; }
      else if (cfg.alloc === 'linear') list = [...list, inst];
      else list = [inst];
    }
    // 3. credit the events on this hit
    for (const ev of h.events || []) {
      const shares = list.length ? (cfg.alloc === 'linear' ? list.map((x) => [x.value, 1 / list.length]) : [[list[0].value, 1]]) : [[NONE, 1]];
      for (const [value, share] of shares) {
        const r = row(value);
        if (ev === 'event1') r.event1 += share;
        if (ev === 'purchase') { r.orders += share; r.revenue += share * (h.revenue || 0); }
        credits.push({ v: h.v, day: h.day, event: ev, value, share, revenue: ev === 'purchase' ? share * (h.revenue || 0) : 0 });
      }
    }
    // 4. expire on event
    if (cfg.exp === 'purchase' && (h.events || []).includes('purchase')) list = [];
    held[h.v] = list;
  }
  return { rows, credits };
}
/** Props: no persistence and no allocation. Equivalent to an eVar that expires on the hit. */
export const propReport = (hits, variable = 'prop1') => attribute(hits, { alloc: 'recent', exp: 'hit' }, variable);

/** Order credit per visitor: { V1: { value: share } }. */
export function orderCredit(res) {
  const o = {};
  for (const c of res.credits) if (c.event === 'purchase') { o[c.v] ??= {}; o[c.v][c.value] = (o[c.v][c.value] || 0) + c.share; }
  return o;
}
export const ruleOk = (rules, target = 'eVar1') => (rules || []).some((r) => r.param === 'cid' && r.target === target);
export const CASE_CFG = () => ({ alloc: 'recent', exp: '90d' });
export const TRUTH_CFG = { alloc: 'recent', exp: '30d' };
/** Orders and revenue per value, rounded, for comparing two configurations. */
export function orderTable(cfg, rules) {
  const { rows } = attribute(applyRules(HITS, rules), cfg);
  const t = {};
  for (const [k, r] of Object.entries(rows)) if (r.orders > 1e-9) t[k] = [Math.round(r.orders * 1000) / 1000, Math.round(r.revenue)];
  return t;
}
export function sameTable(a, b) {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k][0] === b[k][0] && a[k][1] === b[k][1]);
}

export const PROP_Q = {
  q: 'prop1 holds the same cid values as eVar1, yet every order shows under "Unspecified" in the prop1 table. Why?',
  options: [
    'Props are limited to 100 characters, so the values were cut',
    'Props are traffic variables: they exist only on the hit where they are set and have no allocation or expiration. The order happens on a later hit with no prop1 value.',
    'The processing rule runs after the order',
    'Props only work in the old Reports & Analytics interface',
  ],
  answer: 1,
};
export const GA4_MAP = [
  { id: 'm1', ga4: 'Event parameters and custom dimensions', a: 'eVars and props (custom variables)' },
  { id: 'm2', ga4: 'Key events (formerly conversions)', a: 'Success events' },
  { id: 'm3', ga4: 'Explorations', a: 'Analysis Workspace' },
];
export const ADOBE_TERMS = ['Report suite', 'Success events', 'Classifications', 'Analysis Workspace', 'eVars and props (custom variables)', 'Segments'];
export const mapOk = (ans) => GA4_MAP.every((m) => ans[m.id] === m.a);

export function adobeChecks(S) {
  const d = [];
  const rules = S.rules || [], cfg = S.cfg || { alloc: 'recent', exp: 'visit' };
  const okRule = ruleOk(rules);
  if (okRule) d.push('a1');
  const oc = okRule ? orderCredit(attribute(applyRules(HITS, rules), cfg)) : {};
  const only = (v, val) => oc[v] && Object.keys(oc[v]).length === 1 && oc[v][val] === 1;
  if (okRule && cfg.alloc === 'recent' && only('V1', 'email_accessories') && only('V3', 'gads_brand_search')) d.push('a2');
  if (okRule && cfg.alloc === 'original' && only('V1', 'dv360_awareness') && only('V3', 'gads_brand_search')) d.push('a3');
  if (okRule && cfg.alloc === 'linear' && oc.V1 && ['dv360_awareness', 'gads_brand_search', 'email_accessories'].every((k) => Math.abs((oc.V1[k] || 0) - 1 / 3) < 1e-9)) d.push('a4');
  if (S.propOk) d.push('a5');
  if (S.caseOn && okRule && cfg.alloc === 'recent' && sameTable(orderTable(cfg, rules), orderTable(TRUTH_CFG, [{ param: 'cid', target: 'eVar1' }]))) d.push('a6');
  if (S.mapOk) d.push('a7');
  return d;
}

// ---------- UI ----------
export function mount(el, ctx) {
  const S = ctx.state;
  S.rules ??= []; S.cfg ??= { alloc: 'recent', exp: 'visit' }; S.dim ??= 'eVar1'; S.map ??= {};
  const opt = (v, label, cur) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(label)}</option>`;
  el.innerHTML = `
    <section class="card">
      <p class="eyebrow">Report suite: voltramobilityprod · Currency INR</p>
      <h3 style="margin-top:0">Hits (what the AppMeasurement / Web SDK sent)</h3>
      <div class="tbl"><table class="ad-hits"></table></div>
      <p class="help">event1 = test ride form submitted (lead). purchase = order, with revenue. Each visit is a new session; days count from the start of the festive campaign.</p>
    </section>
    <div class="two">
      <section class="card">
        <h3 style="margin-top:0">Processing rules</h3>
        <p class="help">IF query string parameter <i>name</i> is set, THEN overwrite <i>variable</i> with the value of that parameter.</p>
        <div class="row">
          <div style="flex:1 1 140px"><label>Query string parameter<input class="ad-param mono" placeholder="cid" maxlength="40" /></label></div>
          <div style="flex:1 1 120px"><label>Overwrite<select class="ad-target">${TARGETS.map((t) => opt(t, t)).join('')}</select></label></div>
          <button type="button" class="btn sm ad-radd">Add rule</button>
        </div>
        <div class="list ad-rules"></div>
      </section>
      <section class="card">
        <h3 style="margin-top:0">Report suite settings: eVar1 "Campaign tracking code"</h3>
        <div class="row">
          <div style="flex:1 1 160px"><label>Allocation<select class="ad-alloc">${ALLOC.map(([v, l]) => opt(v, l, S.cfg.alloc)).join('')}</select></label></div>
          <div style="flex:1 1 160px"><label>Expire after<select class="ad-exp">${EXPIRY.map(([v, l]) => opt(v, l, S.cfg.exp)).join('')}</select></label></div>
        </div>
        <p class="help">prop1 "Campaign (traffic)": props have no allocation and no expiration settings. That is not missing from this screen; props do not have them.</p>
        <div class="ad-case-box"></div>
      </section>
    </div>
    <section class="card">
      <div class="row between"><h3 style="margin:0">Freeform table</h3><label style="max-width:220px">Dimension<select class="ad-dim">${opt('eVar1', 'eVar1: Campaign tracking code', S.dim)}${opt('prop1', 'prop1: Campaign (traffic)', S.dim)}</select></label></div>
      <div class="ad-table"></div>
      <details style="margin-top:8px"><summary>Credit per order (who got what)</summary><div class="ad-credit"></div></details>
      <div class="ad-propq"></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">GA4 to Adobe Analytics</h3>
      <p class="help">Match each GA4 concept to the Adobe Analytics concept that does the same job.</p>
      ${GA4_MAP.map((m) => `<div class="row" style="margin:6px 0"><span style="flex:1 1 220px">${esc(m.ga4)}</span><select data-map="${m.id}" style="flex:1 1 240px"><option value="">Choose</option>${ADOBE_TERMS.map((t) => opt(t, t, S.map[m.id])).join('')}</select></div>`).join('')}
      <button type="button" class="btn sm ad-map-go" style="margin-top:8px">Check</button>
      <div class="ad-map-out"></div>
    </section>`;
  const $ = (s) => el.querySelector(s);
  const check = () => { for (const id of adobeChecks(S)) ctx.done(id); };

  function paintHits() {
    const ph = applyRules(HITS, S.rules);
    // active eVar1 value per hit, for the persisted column
    const active = [];
    const held = {}; const days = { '7d': 7, '30d': 30, '90d': 90 }[S.cfg.exp];
    for (const h of ph) {
      let list = held[h.v] || [];
      if (S.cfg.exp === 'hit') list = []; else if (S.cfg.exp === 'visit') list = list.filter((x) => x.visit === h.visit); else if (days) list = list.filter((x) => h.day - x.day <= days);
      const val = h.vars.eVar1;
      if (val) { const inst = { value: val, day: h.day, visit: h.visit }; if (S.cfg.alloc === 'original') { if (!list.length) list = [inst]; } else if (S.cfg.alloc === 'linear') list = [...list, inst]; else list = [inst]; }
      active.push(list.map((x) => x.value).join(' + '));
      if (S.cfg.exp === 'purchase' && h.events.includes('purchase')) list = [];
      held[h.v] = list;
    }
    $('.ad-hits').innerHTML = `<thead><tr><th style="text-align:left">Visitor</th><th>Day</th><th>Visit</th><th style="text-align:left">Page URL</th><th>Events</th><th>eVar1 set</th><th>eVar1 active</th><th>prop1</th></tr></thead><tbody>${ph.map((h, i) => `<tr>
      <td style="text-align:left">${esc(VISITORS[h.v])}</td><td>${h.day}</td><td>${h.visit}</td><td class="mono" style="text-align:left;overflow-wrap:anywhere">${esc(h.url)}</td>
      <td>${h.events.map((e) => e === 'purchase' ? `purchase ${inr(h.revenue)}` : e).join(', ')}</td>
      <td class="mono">${esc(h.vars.eVar1 || '')}</td><td class="mono">${esc(active[i] || '')}</td><td class="mono">${esc(h.vars.prop1 || '')}</td></tr>`).join('')}</tbody>`;
  }
  function paintRules() {
    $('.ad-rules').innerHTML = S.rules.length ? S.rules.map((r, i) => `<div class="item" style="cursor:default"><span class="mono">IF query param "${esc(r.param)}" is set → overwrite ${esc(r.target)}</span><button type="button" class="btn sec sm" data-delrule="${i}" aria-label="Delete rule">✕</button></div>`).join('') : '<p class="help">No rules yet. Without a rule, eVar1 stays empty and every event goes to None.</p>';
  }
  function paintTable() {
    const ph = applyRules(HITS, S.rules);
    const res = S.dim === 'prop1' ? propReport(ph) : attribute(ph, S.cfg);
    const entries = Object.entries(res.rows).sort((a, b) => b[1].revenue - a[1].revenue || b[1].event1 - a[1].event1);
    const label = (k) => (k === NONE ? (S.dim === 'prop1' ? 'Unspecified' : 'None') : k);
    const tot = entries.reduce((t, [, r]) => ({ e: t.e + r.event1, o: t.o + r.orders, rv: t.rv + r.revenue }), { e: 0, o: 0, rv: 0 });
    $('.ad-table').innerHTML = `<div class="tbl"><table><thead><tr><th style="text-align:left">${S.dim === 'prop1' ? 'prop1' : 'eVar1'} value</th><th>Leads (event1)</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>
      ${entries.map(([k, r]) => `<tr><td class="mono" style="text-align:left">${esc(label(k))}</td><td>${fx(r.event1)}</td><td>${fx(r.orders)}</td><td>${inr(r.revenue)}</td></tr>`).join('')}
      <tr><td style="text-align:left"><b>Total</b></td><td><b>${fx(tot.e)}</b></td><td><b>${fx(tot.o)}</b></td><td><b>${inr(tot.rv)}</b></td></tr></tbody></table></div>
      <p class="help">${S.dim === 'prop1' ? 'prop1 is a traffic variable: it only gets events that happen on the same hit.' : `Allocation: ${esc(ALLOC.find((a) => a[0] === S.cfg.alloc)[1])} · expiration: ${esc(EXPIRY.find((a) => a[0] === S.cfg.exp)[1])}.`}</p>`;
    $('.ad-credit').innerHTML = `<ul class="steps">${res.credits.filter((c) => c.event === 'purchase').map((c) => `<li>${esc(VISITORS[c.v])}, day ${c.day}, order ${inr(c.revenue / c.share)} → <span class="mono">${esc(label(c.value))}</span>${c.share < 1 ? ` (${fx(c.share * 100)}%)` : ''}</li>`).join('')}</ul>`;
    if (S.dim === 'prop1') { S.sawProp = true; ctx.save(); }
    paintPropQ();
  }
  function paintPropQ() {
    if (!S.sawProp) { $('.ad-propq').innerHTML = ''; return; }
    $('.ad-propq').innerHTML = `<div class="w-q" style="margin-top:12px"><p><b>${esc(PROP_Q.q)}</b></p><div class="w-opts">${PROP_Q.options.map((o, i) => `<button type="button" class="w-opt${S.propOk && i === PROP_Q.answer ? ' right' : ''}" data-pq="${i}">${esc(o)}</button>`).join('')}</div><div class="ad-pq-out">${S.propOk ? '<div class="notice ok">Right. Use eVars for anything that must get credit for a later success event. Props are for traffic counts (page views, visits) and pathing.</div>' : ''}</div></div>`;
  }
  function paintCase() {
    $('.ad-case-box').innerHTML = S.caseOn
      ? '<div class="notice warn"><strong>Case loaded.</strong> Finance: "Affiliate_cashback is being paid commission on an order placed 49 days after the click. Our contract pays only for orders within 30 days of the last campaign click." eVar1 was set to Most recent, expire after 90 days. Fix eVar1 so the table follows the contract.</div><button type="button" class="btn sec sm ad-case">Reload the case settings</button>'
      : '<button type="button" class="btn sec sm ad-case">Load the case: "wrong campaign gets credit"</button>';
  }
  function paintAll() { paintHits(); paintRules(); paintTable(); paintCase(); }

  $('.ad-radd').addEventListener('click', () => {
    const param = $('.ad-param').value.trim(), target = $('.ad-target').value;
    if (!param) return ctx.toast('Type the query string parameter name.');
    if (!/^[A-Za-z0-9_\-]+$/.test(param)) return ctx.toast('Parameter names use letters, numbers, _ and - only.');
    S.rules.push({ param, target }); ctx.save(); ctx.act();
    $('.ad-param').value = '';
    const n = applyRules(HITS, [{ param, target }]).filter((h) => h.vars[target]).length;
    ctx.toast(n ? `Rule saved. It sets ${target} on ${n} hits.` : `Rule saved, but no hit has a "${param}" parameter. Check the spelling and capital letters.`);
    paintAll(); check();
  });
  $('.ad-alloc').addEventListener('change', (e) => { S.cfg.alloc = e.target.value; ctx.save(); ctx.act(); paintHits(); paintTable(); check(); });
  $('.ad-exp').addEventListener('change', (e) => { S.cfg.exp = e.target.value; ctx.save(); ctx.act(); paintHits(); paintTable(); check(); });
  $('.ad-dim').addEventListener('change', (e) => { S.dim = e.target.value; ctx.save(); paintTable(); });
  $('.ad-map-go').addEventListener('click', () => {
    ctx.act();
    el.querySelectorAll('[data-map]').forEach((x) => { S.map[x.dataset.map] = x.value; });
    const ok = mapOk(S.map);
    S.mapOk = S.mapOk || ok; ctx.save();
    $('.ad-map-out').innerHTML = `<div class="notice ${ok ? 'ok' : 'warn'}">${ok ? '<strong>Right.</strong> GA4 event parameters (registered as custom dimensions) carry data like eVars and props. Key events are your goals, like success events. Explorations are the drag-and-drop analysis tool, like Analysis Workspace.' : '<strong>Not quite.</strong> Think about the job each one does: carry data, mark a goal, or explore freely.'}</div>`;
    check();
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.delrule) { S.rules.splice(+b.dataset.delrule, 1); ctx.save(); paintAll(); check(); }
    if (b.classList.contains('ad-case')) {
      S.caseOn = true; S.cfg = CASE_CFG(); ctx.save(); ctx.act();
      $('.ad-alloc').value = S.cfg.alloc; $('.ad-exp').value = S.cfg.exp;
      if (!ruleOk(S.rules)) ctx.toast('Case loaded. You also need the cid → eVar1 processing rule (task 1).');
      else ctx.toast('Case loaded. Read the finance note and the table.');
      paintAll(); check();
    }
    if (b.dataset.pq !== undefined) {
      ctx.act();
      const i = +b.dataset.pq;
      if (i === PROP_Q.answer) { S.propOk = true; ctx.save(); paintPropQ(); check(); }
      else { b.classList.add('wrong'); el.querySelector('.ad-pq-out').innerHTML = '<div class="notice warn">Not quite. Compare the eVar1 and prop1 tables: on which hit is prop1 set, and on which hit does the order happen?</div>'; }
    }
  });
  paintAll(); check();
}
