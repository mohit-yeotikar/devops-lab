import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as cm from '../src/sandbox/martech/cm360.js';
import * as dv from '../src/sandbox/martech/dv360.js';
import * as ad from '../src/sandbox/martech/adobe.js';

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('lab metadata follows the widget lab shape', () => {
  const expect = { 'mk-cm360': ['Ad serving', 'm08'], 'mk-dv360': ['Programmatic', 'm09'], 'mk-adobe': ['Analytics platforms', 'm10'] };
  for (const m of [cm, dv, ad]) {
    const l = m.lab;
    assert.equal(l.track, 'martech'); assert.equal(l.kind, 'widget');
    assert.equal(l.topic, expect[l.id][0]); assert.deepEqual(l.sprints, [expect[l.id][1]]);
    assert.ok(l.title && l.summary && l.minutes > 0);
    assert.equal(l.intro.length, 3); assert.match(l.intro[0], /simplified simulator/);
    assert.ok(l.tasks.length >= 5 && l.tasks.length <= 7, l.id);
    assert.equal(new Set(l.tasks.map((t) => t.id)).size, l.tasks.length);
    for (const t of l.tasks) assert.ok(t.id && t.text && t.why && t.hint);
    assert.equal(l.quiz.length, 3);
    for (const q of l.quiz) { assert.ok(q.q && q.why); assert.ok(q.answer >= 0 && q.answer < q.options.length); }
    assert.equal(typeof m.mount, 'function');
  }
});

// ---------------- CM360 ----------------
const goodPlacements = () => cm.MEDIA_PLAN.map((r, i) => ({ id: 401230001 + i, site: r.site, size: r.size, pricing: r.pricing, rate: r.rate, start: r.start, end: r.end }));
const urlFor = (site) => `https://www.voltramobility.in/festive?utm_source=${site}&utm_medium=display&utm_campaign=festive_2026&utm_content=%epid!`;

test('CM360 placements must match the media plan', () => {
  const pl = goodPlacements();
  for (const p of pl) assert.deepEqual(cm.placementIssues(p), []);
  assert.equal(cm.placementIssues({ ...pl[0], rate: 200 }).length, 1);
  assert.match(cm.placementIssues({ ...pl[1], size: '300x250' })[0], /Size/);
  assert.match(cm.placementIssues({ ...pl[2], pricing: 'CPM' })[0], /Pricing/);
  assert.match(cm.placementIssues({ ...pl[0], site: 'ndtv' })[0], /not in the media plan/);
  assert.ok(cm.placementIssues({ ...pl[3], start: '2026-10-15' }).length >= 1);
  assert.ok(!cm.cmChecks({ pl: pl.slice(0, 3) }).includes('p1'));
  assert.ok(cm.cmChecks({ pl }).includes('p1'));
  assert.equal(cm.placementName(pl[0]), 'VOLTRA_FEST26_TIMESOFINDIA_300x250_CPM');
});

test('CM360 creatives must match the placement size', () => {
  const p = goodPlacements()[1];
  assert.match(cm.assignIssue(p, cm.CREATIVES[0]), /Size mismatch/);
  assert.equal(cm.assignIssue(p, cm.CREATIVES.find((c) => c.size === '728x90')), null);
  for (const r of cm.MEDIA_PLAN) assert.ok(cm.CREATIVES.some((c) => c.size === r.size), `a creative exists for ${r.size}`);
});

test('CM360 click-through URL checks', () => {
  assert.deepEqual(cm.clickUrlIssues(urlFor('toi')), []);
  assert.deepEqual(cm.clickUrlIssues('https://voltramobility.in/festive?utm_source=cricbuzz&utm_medium=display&utm_campaign=festive_2026'), []);
  assert.ok(cm.clickUrlIssues('').length);
  assert.ok(cm.clickUrlIssues('http://www.voltramobility.in/?utm_source=a&utm_medium=display&utm_campaign=b').some((x) => /https/.test(x)));
  assert.ok(cm.clickUrlIssues('https://www.example.com/?utm_source=a&utm_medium=display&utm_campaign=b').some((x) => /voltramobility/.test(x)));
  assert.ok(cm.clickUrlIssues('https://www.voltramobility.in/festive?utm_source=TOI&utm_medium=display&utm_campaign=festive').some((x) => /capital/.test(x)));
  assert.ok(cm.clickUrlIssues('https://www.voltramobility.in/festive?utm_source=toi&utm_medium=social&utm_campaign=festive').some((x) => /Display channel/.test(x)));
  assert.ok(cm.clickUrlIssues('https://www.voltramobility.in/festive?utm_source=toi&utm_medium=display').some((x) => /utm_campaign is missing/.test(x)));
  assert.ok(cm.clickUrlIssues('https://www.voltramobility.in/festive?utm_source=toi&utm_medium=display&utm_campaign=f&cb=%%CACHEBUSTER%%').some((x) => /publisher/.test(x)));
  assert.ok(cm.clickUrlIssues('https://www.voltramobility.in/festive?utm_source=toi&utm_medium=display&utm_campaign=festive 2026').length);
  assert.ok(cm.clickUrlIssues('https://www.voltramobility.in/festive?utm_source=toi?utm_medium=display&utm_campaign=f').length);
  assert.ok(cm.clickUrlIssues('https://www.voltramobility.in/f?utm_source=toi&utm_medium=display&utm_campaign=f&utm_content=%efoo!').some((x) => /not a CM360 macro/.test(x)));
});

test('CM360 tag sheet macros', () => {
  assert.equal(cm.macroIssues({ cache: '[timestamp]', click: '' }).length, 2);
  assert.ok(cm.macroIssues({ cache: '%%CACHEBUSTER%%', click: '%%CLICK_URL_ESC%%' }).some((x) => /UNESC/.test(x)));
  assert.ok(cm.macroIssues({ cache: '20261015', click: '%%CLICK_URL_UNESC%%' }).length === 1);
  assert.deepEqual(cm.macroIssues({ cache: '%%CACHEBUSTER%%', click: '%%CLICK_URL_UNESC%%' }), []);
  const tag = cm.placementTag(goodPlacements()[0], { cache: '%%CACHEBUSTER%%', click: '%%CLICK_URL_UNESC%%' });
  assert.match(tag, /data-dcm-click-tracker='%%CLICK_URL_UNESC%%'/);
  assert.match(tag, /ord=%%CACHEBUSTER%%/);
  assert.match(tag, /width:300px;height:250px/);
  const tsv = cm.tagSheetTsv(goodPlacements(), { cache: '%%CACHEBUSTER%%', click: '%%CLICK_URL_UNESC%%' });
  assert.equal(tsv.split('\n').length, 5);
  assert.ok(tsv.split('\n').every((l) => l.split('\t').length === 9));
});

test('CM360 Floodlight activities and tags', () => {
  const booking = { goal: 'booking', name: 'Booking form view', type: 'counter', counting: 'unique' };
  assert.deepEqual(cm.activityIssues(booking), []);
  assert.match(cm.floodlightTag(booking), /cat=bookin0;.*ord=1;num=\[Random Number\]\?$/);
  assert.match(cm.floodlightTag({ ...booking, counting: 'standard' }), /ord=\[Random Number\]\?$/);
  assert.match(cm.floodlightTag({ ...booking, counting: 'session' }), /ord=\[SessionID\]\?$/);
  assert.ok(cm.activityIssues({ ...booking, counting: 'standard' }).length);
  assert.ok(cm.activityIssues({ ...booking, type: 'sales', counting: 'transactions' }).length);
  const acc = { goal: 'accessories', name: 'Accessories purchase', type: 'sales', counting: 'transactions', ord: 'order', cost: true, qty: true };
  assert.deepEqual(cm.activityIssues(acc), []);
  assert.match(cm.floodlightTag(acc), /qty=\[Quantity\];cost=\[Revenue\];ord=\[OrderID\]\?$/);
  assert.ok(cm.activityIssues({ ...acc, ord: 'random' }).length);
  assert.ok(cm.activityIssues({ ...acc, counting: 'items' }).length);
  assert.ok(cm.activityIssues({ ...acc, cost: false }).length);
  const d = cm.cmChecks({ pl: [], acts: [booking, acc] });
  assert.ok(d.includes('f1') && d.includes('f2'));
  assert.ok(!cm.cmChecks({ acts: [{ ...booking, counting: 'session' }] }).includes('f1'));
});

test('CM360 case: Floodlight counts double', () => {
  const legacy = cm.LEGACY();
  const { out } = cm.countFloodlight(legacy);
  assert.equal(out.testride.conv, 12, 'two deployments x 6 thank-you loads');
  assert.equal(out.accessories.conv, 5);
  assert.equal(out.accessories.revenue, 14000);
  assert.ok(!cm.caseStatus(legacy).fixed);
  // Half fixes do not work
  const oneSource = { ...legacy, testride: { ...legacy.testride, page: false } };
  assert.equal(cm.countFloodlight(oneSource).out.testride.conv, 6, 'reloads still count');
  for (const counting of ['unique', 'session']) assert.equal(cm.countFloodlight({ ...legacy, testride: { type: 'counter', counting, gtm: true, page: false } }).out.testride.conv, 3, `${counting} undercounts the second booking`);
  assert.equal(cm.countFloodlight({ ...legacy, accessories: { ...legacy.accessories, ord: 'timestamp' } }).out.accessories.conv, 5);
  assert.equal(cm.countFloodlight({ ...legacy, accessories: { ...legacy.accessories, ord: 'order', counting: 'items' } }).out.accessories.conv, 6);
  // Dedup by ord fixes counts, but two deployments still fail the case
  const dedupBoth = { testride: { type: 'sales', counting: 'transactions', ord: 'order', gtm: true, page: true }, accessories: { ...legacy.accessories, ord: 'order' } };
  const st = cm.caseStatus(dedupBoth);
  assert.ok(st.countsOk && !st.oneSource && !st.fixed);
  // The real fix
  const fixed = { testride: { type: 'sales', counting: 'transactions', ord: 'order', gtm: true, page: false }, accessories: { ...legacy.accessories, ord: 'order' } };
  assert.ok(cm.caseStatus(fixed).fixed);
  assert.deepEqual(cm.countFloodlight(fixed).out.accessories, { conv: 3, revenue: 9200, hits: 5 });
  assert.ok(cm.cmChecks({ case: fixed }).includes('c1'));
  assert.ok(!cm.cmChecks({ case: legacy }).includes('c1'));
});

test('CM360 every task is achievable from one state', () => {
  const pl = goodPlacements().map((p) => ({ ...p, creative: cm.CREATIVES.find((c) => c.size === p.size).id, url: urlFor(p.site) }));
  const S = {
    pl, macros: { cache: '%%CACHEBUSTER%%', click: '%%CLICK_URL_UNESC%%' },
    acts: [{ goal: 'booking', name: 'Booking form view', type: 'counter', counting: 'unique' }, { goal: 'accessories', name: 'Accessories purchase', type: 'sales', counting: 'transactions', ord: 'order', cost: true, qty: true }],
    case: { testride: { type: 'sales', counting: 'transactions', ord: 'order', gtm: true, page: false }, accessories: { type: 'sales', counting: 'transactions', ord: 'order', gtm: true, page: false } },
  };
  assert.deepEqual(cm.cmChecks(S).sort(), cm.lab.tasks.map((t) => t.id).sort());
  // Placements wrong → p2/p3/p4 cannot pass
  const bad = { ...S, pl: pl.map((p, i) => (i === 0 ? { ...p, rate: 1 } : p)) };
  assert.deepEqual(cm.cmChecks(bad).filter((x) => x.startsWith('p')), []);
  // A wrong-size creative stored anyway does not pass p2
  assert.ok(!cm.cmChecks({ ...S, pl: pl.map((p, i) => (i === 0 ? { ...p, creative: 'cr2' } : p)) }).includes('p2'));
  // Empty state: nothing done
  assert.deepEqual(cm.cmChecks({ pl: [], macros: { cache: '[timestamp]', click: '' }, acts: [], case: cm.LEGACY() }), []);
});

// ---------------- DV360 ----------------
const fixedLI = () => ({ ...dv.brokenLI(), aud: 'inmarket', geo: 'dealers', bid: 170, capN: 5, capPer: 'week', view: 70 });

test('DV360 broken line item under-paces for the three causes', () => {
  const b = dv.brokenLI();
  const r = dv.simulate(b);
  assert.equal(r.status, 'Under-pacing');
  assert.ok(r.pacing < 0.01, `pacing ${r.pacing}`);
  assert.ok(r.users > 1000 && r.users < 2000, 'about 1,500 eligible people');
  assert.ok(r.win > 0.02 && r.win < 0.04, 'about 3% win rate');
  assert.ok(r.capacity > 150 && r.capacity < 250, 'cap allows about 200 a day');
  assert.equal(r.days.length, 30);
  assert.deepEqual(dv.policyIssues(b), []);
  // Each cause on its own: raising only the bid makes the cap bind; still under-pacing
  const bidOnly = dv.simulate({ ...b, bid: 200 });
  assert.ok(bidOnly.limits.cap > 25 && bidOnly.status === 'Under-pacing');
  assert.equal(dv.simulate({ ...b, capPer: 'none' }).status, 'Under-pacing');
  assert.equal(dv.simulate({ ...b, aud: 'inmarket', geo: 'dealers' }).status, 'Under-pacing', 'low bid still loses auctions');
  // Diagnosis
  assert.ok(dv.diagOk({ narrow: true, bid: true, cap: true }));
  assert.ok(!dv.diagOk({ narrow: true, bid: true }));
  assert.ok(!dv.diagOk({ narrow: true, bid: true, cap: true, bs: true }));
});

test('DV360 under-pacing fix reaches 95% without breaking brand safety', () => {
  const f = { ...dv.brokenLI(), aud: 'inmarket', geo: 'dealers', bid: 130, capN: 5, capPer: 'week' };
  const r = dv.simulate(f);
  assert.equal(r.status, 'On pace'); assert.ok(r.pacing >= 0.95);
  assert.ok(Math.abs(r.spend - 600000) < 1000);
  assert.ok(dv.pacingFixed(f));
  assert.ok(r.freq > 1 && r.freq <= (5 * 30) / 7 + 1e-9, `avg frequency ${r.freq} within cap`);
  assert.ok(r.reach <= r.users && r.reach > 0);
  // Breaking policy or overbidding does not count
  assert.ok(!dv.pacingFixed({ ...f, label: 'MA' }));
  assert.ok(!dv.pacingFixed({ ...f, sensitive: false }));
  assert.ok(!dv.pacingFixed({ ...f, verification: false }));
  assert.ok(!dv.pacingFixed({ ...f, bid: 300 }));
  assert.ok(!dv.pacingFixed({ ...f, budget: 1000 }), 'cutting the budget is not a fix');
  // ASAP spends early: over-pacing
  const asap = dv.simulate({ ...f, pacing: 'asap', aud: 'affinity', geo: 'india', capPer: 'none' });
  assert.equal(asap.status, 'Over-pacing');
});

test('DV360 frequency cap advice', () => {
  const li = dv.brokenLI();
  assert.ok(!dv.capAdvice(li).ok, '1 per week is too strict');
  assert.ok(!dv.capAdvice({ ...li, capPer: 'none' }).ok);
  assert.ok(!dv.capAdvice({ ...li, capN: 10, capPer: 'day' }).ok);
  assert.ok(dv.capAdvice({ ...li, capN: 5, capPer: 'week' }).ok);
  assert.ok(dv.capAdvice({ ...li, capN: 2, capPer: 'day' }).ok);
  assert.ok(dv.capAdvice({ ...li, capN: 20, capPer: 'month' }).ok);
  assert.equal(dv.capPerDay({ capN: 7, capPer: 'week' }), 1);
});

test('DV360 viewability target with pacing', () => {
  const noTarget = { ...fixedLI(), view: 0, bid: 130 };
  assert.ok(dv.pacingFixed(noTarget) && !dv.viewabilityOk(noTarget), 'open auction alone is about 52% viewable');
  const v70 = fixedLI();
  const r = dv.simulate(v70);
  assert.ok(r.viewability >= 70 && r.status === 'On pace');
  assert.ok(dv.viewabilityOk(v70));
  assert.ok(r.clearing > dv.INVENTORY.open.clearing, 'viewability raises the clearing price');
  // Same target with the old low bid fails pacing
  assert.ok(!dv.viewabilityOk({ ...v70, bid: 100 }));
  assert.ok(!dv.viewabilityOk({ ...v70, view: 60 }), '60% target delivers 68%');
});

test('DV360 PMP for premium news', () => {
  const n = dv.newsLI();
  assert.ok(!dv.pmpOk(n), 'open auction is not the deal');
  assert.ok(!dv.pmpOk({ ...n, inv: 'pmp_news', bid: 200 }), 'below the floor');
  assert.equal(dv.simulate({ ...n, inv: 'pmp_news', bid: 200 }).imps, 0);
  assert.ok(!dv.pmpOk({ ...n, inv: 'pmp_gaming', bid: 230 }));
  const ok = { ...n, inv: 'pmp_news', bid: 230 };
  assert.ok(dv.pmpOk(ok));
  assert.equal(dv.simulate(ok).status, 'On pace');
  const pg = dv.simulate({ ...n, inv: 'pg_ht', bid: 1 });
  assert.equal(pg.paid, 380, 'PG ignores the bid');
});

test('DV360 deal types and every task achievable', () => {
  assert.ok(dv.dealOk({ q1: '0', q2: '1', q3: '2' }));
  assert.ok(!dv.dealOk({ q1: '0', q2: '3', q3: '2' }));
  const S = { li: [fixedLI(), { ...dv.newsLI(), inv: 'pmp_news', bid: 230 }], diagOk: true, dealOk: true };
  assert.deepEqual(dv.dvChecks(S).sort(), dv.lab.tasks.map((t) => t.id).sort());
  assert.deepEqual(dv.dvChecks({ li: [dv.brokenLI(), dv.newsLI()] }), []);
});

// ---------------- Adobe ----------------
const RULE = [{ param: 'cid', target: 'eVar1' }];
const run = (cfg, rules = RULE) => ad.attribute(ad.applyRules(ad.HITS, rules), cfg);

test('Adobe query params and processing rules', () => {
  assert.equal(ad.queryParam('/?cid=a&utm_campaign=b', 'cid'), 'a');
  assert.equal(ad.queryParam('/?cid=a&utm_campaign=b', 'utm_campaign'), 'b');
  assert.equal(ad.queryParam('/?CID=a', 'cid'), null, 'case-sensitive');
  assert.equal(ad.queryParam('/x', 'cid'), null);
  const ph = ad.applyRules(ad.HITS, RULE);
  assert.equal(ph.filter((h) => h.vars.eVar1).length, 8);
  assert.ok(!ad.applyRules(ad.HITS, [{ param: 'CID', target: 'eVar1' }]).some((h) => h.vars.eVar1));
  // Without a rule every event goes to None
  const none = run({ alloc: 'recent', exp: '30d' }, []);
  assert.deepEqual(Object.keys(none.rows), [ad.NONE]);
  assert.equal(none.rows[ad.NONE].orders, 5);
  assert.equal(none.rows[ad.NONE].event1, 3);
});

test('Adobe attribution: most recent, by expiration', () => {
  const r30 = ad.orderCredit(run({ alloc: 'recent', exp: '30d' }));
  assert.deepEqual(r30, { V1: { email_accessories: 1 }, V2: { affiliate_cashback: 1 }, V3: { gads_brand_search: 1 }, V4: { [ad.NONE]: 1 }, V5: { meta_festive_video: 1 } });
  const leads = run({ alloc: 'recent', exp: '30d' }).rows;
  assert.equal(leads.gads_brand_search.event1, 2);
  assert.equal(leads.meta_festive_video.event1, 1, 'Rahul\'s lead on day 2 keeps day 1 meta');
  assert.equal(ad.orderCredit(run({ alloc: 'recent', exp: '90d' })).V4.affiliate_cashback, 1, '49 days < 90');
  assert.equal(ad.orderCredit(run({ alloc: 'recent', exp: 'never' })).V4.affiliate_cashback, 1);
  assert.equal(ad.orderCredit(run({ alloc: 'recent', exp: '7d' })).V5[ad.NONE], 1, '14 days > 7');
  const visit = ad.orderCredit(run({ alloc: 'recent', exp: 'visit' }));
  assert.equal(visit.V1.email_accessories, 1, 'same visit');
  assert.equal(visit.V3[ad.NONE], 1, 'return visit lost');
  const hit = run({ alloc: 'recent', exp: 'hit' });
  assert.equal(hit.rows[ad.NONE].orders, 5, 'no order hit carries cid');
  // Purchase expiration: cleared only after a purchase
  assert.equal(ad.orderCredit(run({ alloc: 'recent', exp: 'purchase' })).V4.affiliate_cashback, 1);
  // Revenue totals are conserved across every configuration
  for (const alloc of ['recent', 'original', 'linear']) for (const [exp] of ad.EXPIRY) {
    const rows = Object.values(run({ alloc, exp }).rows);
    assert.ok(close(rows.reduce((s, r) => s + r.revenue, 0), 20000), `${alloc}/${exp} revenue`);
    assert.ok(close(rows.reduce((s, r) => s + r.orders, 0), 5), `${alloc}/${exp} orders`);
    assert.ok(close(rows.reduce((s, r) => s + r.event1, 0), 3), `${alloc}/${exp} leads`);
  }
});

test('Adobe attribution: original and linear', () => {
  const o = ad.orderCredit(run({ alloc: 'original', exp: '30d' }));
  assert.deepEqual(o, { V1: { dv360_awareness: 1 }, V2: { meta_festive_video: 1 }, V3: { gads_brand_search: 1 }, V4: { [ad.NONE]: 1 }, V5: { meta_festive_video: 1 } });
  const lin = run({ alloc: 'linear', exp: '30d' });
  const l = ad.orderCredit(lin);
  for (const k of ['dv360_awareness', 'gads_brand_search', 'email_accessories']) assert.ok(close(l.V1[k], 1 / 3));
  assert.ok(close(l.V2.meta_festive_video, 0.5) && close(l.V2.affiliate_cashback, 0.5));
  assert.ok(close(lin.rows.email_accessories.revenue, 4000 / 3));
  assert.ok(close(lin.rows.affiliate_cashback.revenue, 1000));
  // Linear with visit expiry: only values of the current visit
  assert.deepEqual(ad.orderCredit(run({ alloc: 'linear', exp: 'visit' })).V1, { email_accessories: 1 });
  // Original with a short window: the first value expires, a later one can become the new original
  const sim = [
    { v: 'X', day: 1, visit: 1, events: [], vars: { eVar1: 'a' } },
    { v: 'X', day: 10, visit: 2, events: [], vars: { eVar1: 'b' } },
    { v: 'X', day: 11, visit: 3, events: ['purchase'], revenue: 100, vars: {} },
  ];
  assert.deepEqual(ad.orderCredit(ad.attribute(sim, { alloc: 'original', exp: '7d' })), { X: { b: 1 } });
  assert.deepEqual(ad.orderCredit(ad.attribute(sim, { alloc: 'original', exp: '30d' })), { X: { a: 1 } });
  // Value set on the same hit as the event gets the credit
  assert.deepEqual(ad.orderCredit(ad.attribute([{ v: 'Y', day: 1, visit: 1, events: ['purchase'], revenue: 5, vars: { eVar1: 'z' } }], { alloc: 'recent', exp: 'hit' })), { Y: { z: 1 } });
  // Purchase expiration: second order without a new click gets None
  const two = [
    { v: 'Z', day: 1, visit: 1, events: [], vars: { eVar1: 'a' } },
    { v: 'Z', day: 1, visit: 1, events: ['purchase'], revenue: 10, vars: {} },
    { v: 'Z', day: 2, visit: 2, events: ['purchase'], revenue: 10, vars: {} },
  ];
  assert.deepEqual(ad.attribute(two, { alloc: 'recent', exp: 'purchase' }).rows, { a: { event1: 0, orders: 1, revenue: 10 }, [ad.NONE]: { event1: 0, orders: 1, revenue: 10 } });
});

test('Adobe props never get credit for later orders', () => {
  const ph = ad.applyRules(ad.HITS, [...RULE, { param: 'cid', target: 'prop1' }]);
  const p = ad.propReport(ph);
  assert.equal(p.rows[ad.NONE].orders, 5);
  assert.equal(p.rows.gads_brand_search, undefined, 'leads are on the thank-you hit, not the landing hit');
});

test('Adobe tasks are achievable and the case needs the 30-day expiration', () => {
  assert.deepEqual(ad.adobeChecks({}), []);
  assert.deepEqual(ad.adobeChecks({ rules: RULE, cfg: { alloc: 'recent', exp: 'visit' } }), ['a1'], 'visit expiry loses Neha\'s order');
  assert.ok(ad.adobeChecks({ rules: RULE, cfg: { alloc: 'recent', exp: '30d' } }).includes('a2'));
  assert.ok(ad.adobeChecks({ rules: RULE, cfg: { alloc: 'original', exp: '30d' } }).includes('a3'));
  assert.ok(!ad.adobeChecks({ rules: RULE, cfg: { alloc: 'original', exp: 'visit' } }).includes('a3'));
  assert.ok(ad.adobeChecks({ rules: RULE, cfg: { alloc: 'linear', exp: '30d' } }).includes('a4'));
  assert.ok(!ad.adobeChecks({ rules: RULE, cfg: { alloc: 'linear', exp: 'visit' } }).includes('a4'));
  // Case
  const caseOn = (exp) => ad.adobeChecks({ rules: RULE, caseOn: true, cfg: { alloc: 'recent', exp } }).includes('a6');
  assert.ok(!caseOn('90d') && !caseOn('never') && !caseOn('7d') && !caseOn('visit') && !caseOn('purchase'));
  assert.ok(caseOn('30d'));
  assert.ok(!ad.adobeChecks({ rules: RULE, caseOn: false, cfg: { alloc: 'recent', exp: '30d' } }).includes('a6'));
  assert.ok(!ad.adobeChecks({ rules: [], caseOn: true, cfg: { alloc: 'recent', exp: '30d' } }).includes('a6'));
  assert.deepEqual(ad.CASE_CFG(), { alloc: 'recent', exp: '90d' });
  // Mapping
  assert.ok(ad.mapOk({ m1: 'eVars and props (custom variables)', m2: 'Success events', m3: 'Analysis Workspace' }));
  assert.ok(!ad.mapOk({ m1: 'Report suite', m2: 'Success events', m3: 'Analysis Workspace' }));
  for (const m of ad.GA4_MAP) assert.ok(ad.ADOBE_TERMS.includes(m.a));
  const all = ad.adobeChecks({ rules: RULE, caseOn: true, cfg: { alloc: 'recent', exp: '30d' }, propOk: true, mapOk: true });
  assert.deepEqual(all.sort(), ['a1', 'a2', 'a5', 'a6', 'a7']);
  const union = new Set([...all, ...ad.adobeChecks({ rules: RULE, cfg: { alloc: 'original', exp: '30d' } }), ...ad.adobeChecks({ rules: RULE, cfg: { alloc: 'linear', exp: '30d' } })]);
  assert.deepEqual([...union].sort(), ad.lab.tasks.map((t) => t.id).sort());
});
