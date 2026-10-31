import { test } from 'node:test';
import assert from 'node:assert/strict';
import alasql from 'alasql';
import * as SQL from '../src/sandbox/martech/sql.js';
import * as AU from '../src/sandbox/martech/auction.js';
import * as BI from '../src/sandbox/martech/bidding.js';

const LABS = [SQL.lab, AU.lab, BI.lab];

test('lab metadata follows the widget-lab shape', () => {
  const topics = ['Analytics', 'Search ads', 'Programmatic', 'Analytics platforms', 'CRM', 'Measurement'];
  const sprints = { 'mk-sql': ['m04'], 'mk-auction': ['m05'], 'mk-bidding': ['m06'] };
  for (const l of LABS) {
    assert.equal(l.track, 'martech'); assert.equal(l.kind, 'widget');
    assert.ok(topics.includes(l.topic), l.id);
    assert.deepEqual(l.sprints, sprints[l.id]);
    assert.ok(l.title && l.summary && l.minutes > 0);
    assert.equal(l.intro.length, 3);
    assert.ok(l.tasks.length >= 5 && l.tasks.length <= 7, l.id);
    assert.equal(new Set(l.tasks.map((t) => t.id)).size, l.tasks.length);
    for (const t of l.tasks) assert.ok(t.id && t.text && t.why && t.hint);
    assert.equal(l.quiz.length, 3);
    for (const q of l.quiz) assert.ok(q.answer >= 0 && q.answer < q.options.length && q.why);
    assert.equal(typeof (l.id === 'mk-sql' ? SQL : l.id === 'mk-auction' ? AU : BI).mount, 'function');
  }
});

/* ------------------------------------------------------------------ SQL ------------------------------------------------------------------ */

const data = SQL.makeData();
const exp = SQL.expected(data);
const db = SQL.createDb(alasql, data);

test('SQL dataset is deterministic and GA4-like', () => {
  assert.deepEqual(SQL.makeData().events.slice(0, 50), data.events.slice(0, 50));
  const ev = data.events;
  assert.ok(ev.length > 1800 && ev.length < 2600, `events ${ev.length}`);
  const users = new Set(ev.map((e) => e.user_pseudo_id)).size, sessions = new Set(ev.map((e) => `${e.user_pseudo_id}-${e.ga_session_id}`)).size;
  assert.equal(users, 400); assert.equal(sessions, 600);
  assert.ok(new Set(ev.map((e) => e.ga_session_id)).size < sessions, 'ga_session_id alone collides (teaching point)');
  assert.equal(new Set(ev.map((e) => e.event_date)).size, 7);
  for (const e of ev) assert.deepEqual(Object.keys(e), SQL.EVENT_COLS);
  const buys = ev.filter((e) => e.event_name === 'purchase');
  assert.ok(buys.every((b) => b.value > 0 && b.currency === 'INR' && b.transaction_id));
  assert.equal(buys.length - new Set(buys.map((b) => b.transaction_id)).size, 2, 'two duplicate orders');
  assert.ok(data.event_params.every((p) => ev[p.event_id - 1].event_id === p.event_id));
  assert.ok(exp.s6.boundaryGap > 0, 'no tie at the top-5 boundary');
});

test('every SQL task is solved by its reference query, and the expected results match it', () => {
  for (const t of SQL.lab.tasks) {
    const res = SQL.runSql(db, SQL.REFERENCE[t.id]);
    assert.ok(res.ok, `${t.id}: ${res.error}`);
    assert.ok(SQL.checkTask(exp, t.id, res).ok, `${t.id} reference does not pass`);
    assert.ok(SQL.BIGQUERY[t.id].includes('FROM'), `${t.id} has a BigQuery version`);
  }
  // expected s2 numbers equal the SQL result exactly
  const s2 = SQL.runSql(db, SQL.REFERENCE.s2).rows[0];
  assert.deepEqual([s2.users, s2.sessions], exp.s2.variants[0][0]);
});

test('SQL checker: flexible names and order, but strict on numbers, with helpful traps', () => {
  const run = (q) => SQL.runSql(db, q);
  // other column names, other column order, no ORDER BY
  assert.ok(SQL.checkTask(exp, 's1', run('SELECT COUNT(*) AS n, event_name AS what FROM events GROUP BY event_name')).ok);
  // COUNTIF works, and lowercase keywords
  assert.ok(SQL.checkTask(exp, 's4', run(`select device_category,
    count(distinct case when event_name = 'session_start' then user_pseudo_id || '.' || ga_session_id end) a,
    count(distinct case when event_name = 'view_item' then user_pseudo_id || '.' || ga_session_id end) b,
    count(distinct case when event_name = 'purchase' then user_pseudo_id || '.' || ga_session_id end) c
    from events group by device_category`)).ok);
  // naive COUNT(*) purchases are accepted too
  assert.ok(SQL.checkTask(exp, 's3', run("SELECT source, medium, COUNT(*) AS p, SUM(value) AS r FROM events WHERE event_name = 'purchase' GROUP BY source, medium")).ok);
  // a WHERE-join (old style) also reads the param
  assert.ok(SQL.checkTask(exp, 's5', run("SELECT p.string_value, COUNT(*) AS n FROM events e, event_params p WHERE e.event_id = p.event_id AND p.key = 'dealer_city' AND e.source = 'google' AND e.medium = 'cpc' GROUP BY p.string_value")).ok);
  assert.ok(SQL.checkTask(exp, 's7', run("SELECT transaction_id FROM events WHERE event_name = 'purchase' GROUP BY transaction_id HAVING COUNT(*) > 1")).ok);
  // traps
  const s2bad = SQL.checkTask(exp, 's2', run('SELECT COUNT(DISTINCT user_pseudo_id) u, COUNT(DISTINCT ga_session_id) s FROM events'));
  assert.ok(!s2bad.ok && /same second/.test(s2bad.msg));
  const s4bad = SQL.checkTask(exp, 's4', run("SELECT device_category, COUNTIF(event_name='session_start') a, COUNTIF(event_name='view_item') b, COUNTIF(event_name='purchase') c FROM events GROUP BY device_category"));
  assert.ok(!s4bad.ok && /event counts/.test(s4bad.msg));
  const s5bad = SQL.checkTask(exp, 's5', run("SELECT p.string_value, COUNT(*) n FROM events e JOIN event_params p ON p.event_id = e.event_id WHERE p.key = 'dealer_city' GROUP BY p.string_value"));
  assert.ok(!s5bad.ok && /all traffic/.test(s5bad.msg));
  const s6bad = SQL.checkTask(exp, 's6', run("SELECT page_location, COUNT(*) AS s FROM events WHERE event_name = 'session_start' GROUP BY page_location"));
  assert.ok(!s6bad.ok && /top 5/.test(s6bad.msg));
  // wrong answers fail
  assert.ok(!SQL.checkTask(exp, 's1', run("SELECT event_name, COUNT(*) AS n FROM events WHERE device_category = 'mobile' GROUP BY event_name")).ok);
  assert.ok(!SQL.checkTask(exp, 's3', run("SELECT source, medium, COUNT(*) AS p, SUM(value) AS r FROM events WHERE event_name = 'add_to_cart' GROUP BY source, medium")).ok);
});

test('SQL runner: read-only, plain-word errors, BigQuery habits explained', () => {
  const err = (q) => SQL.runSql(db, q).error;
  assert.match(err('DROP TABLE events'), /Only SELECT/);
  assert.match(err('SELECT * INTO x FROM events'), /blocked/);
  assert.match(err('SELECT 1 AS a; SELECT 2 AS b'), /one query/);
  assert.match(err('SELECT Event_Name FROM events'), /lower case here: event_name/);
  assert.match(err('SELECT foo FROM events'), /no column called "foo"/);
  assert.match(err('SELECT * FROM sessions'), /no table called "sessions"/);
  assert.match(err('SELECT event_name, COUNT(*) FROM events GROUP BY 1'), /GROUP BY 1/);
  assert.match(err("SELECT (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'x') FROM events"), /UNNEST is BigQuery/);
  assert.match(err('SELEC event_name FROM events'), /Only SELECT/);
  assert.match(err('SELECT event_name FROM events WHERE'), /could not be read/);
  assert.equal(SQL.runSql(db, 'SELECT COUNT(*) AS n FROM events; ').rows[0].n, data.events.length);
  // the engine keeps the data after a blocked statement, and `value` works as a column name
  assert.equal(SQL.runSql(db, "SELECT SUM(value) AS r FROM events WHERE event_name = 'purchase'").rows[0].r, data.events.filter((e) => e.event_name === 'purchase').reduce((s, e) => s + e.value, 0));
  assert.equal(SQL.runSql(db, "-- comment\nSELECT COUNT(*) AS n FROM events WHERE page_location LIKE '%value%'").ok, true);
});

/* ---------------------------------------------------------------- auction ---------------------------------------------------------------- */

const cfg = (bid, ectr, rel, lp) => ({ bid, ectr, rel, lp });
const me = (c) => AU.yours(AU.auction(c));

test('Quality Score: weights and range', () => {
  assert.equal(AU.qualityScore(cfg(1, 'below', 'below', 'below')), 1);
  assert.equal(AU.qualityScore(cfg(1, 'above', 'above', 'above')), 10);
  assert.equal(AU.qualityScore(cfg(1, 'average', 'average', 'average')), 6);
  // expected CTR and landing page weigh more than ad relevance
  assert.ok(AU.qualityScore(cfg(1, 'above', 'below', 'below')) > AU.qualityScore(cfg(1, 'below', 'above', 'below')));
});

test('auction: CPC rule holds for every shown ad and every setting', () => {
  for (const bid of [5, 10, 14, 20, 30, 45, 60, 80]) for (const e of AU.LEVELS) for (const r of AU.LEVELS) for (const l of AU.LEVELS) {
    const rows = AU.auction(cfg(bid, e, r, l));
    const shown = rows.filter((a) => a.shown);
    shown.forEach((a, i) => {
      assert.equal(a.position, i + 1);
      if (i) assert.ok(shown[i - 1].adRank >= a.adRank, 'sorted by Ad Rank');
      const need = Math.max(shown[i + 1] ? shown[i + 1].adRank : 0, a.slot === 'top' ? AU.TOP_MIN : AU.SHOW_MIN);
      assert.equal(a.cpc, Math.min(a.bid, Math.round((need / a.qs + 0.01) * 100) / 100));
      assert.ok(a.cpc <= a.bid);
      assert.ok(a.cpc * a.qs >= need, 'the price keeps the position');
      assert.ok(a.adRank >= AU.SHOW_MIN);
      if (a.slot === 'top') assert.ok(a.adRank >= AU.TOP_MIN);
    });
    for (const a of rows.filter((x) => !x.shown)) assert.equal(a.cpc, 0);
  }
  // quiz numbers: Ad Rank below 160, QS 8 → ₹20.01
  assert.equal(Math.round((160 / 8 + 0.01) * 100) / 100, 20.01);
});

test('auction: every task is reachable', () => {
  const start = AU.START;
  assert.ok(!me(start).shown, 'starts hidden so task 1 is real');
  assert.ok(!AU.auctionChecks(null, start).includes('a1'));
  // a1: raise the bid until shown
  assert.ok(AU.auctionChecks(start, { ...start, bid: 14 }).includes('a1'));
  // a2: raise bid by ₹3+ at the same position: same price
  const a = cfg(22, 'average', 'average', 'average'), b = { ...a, bid: 26 };
  assert.equal(me(a).position, me(b).position); assert.equal(me(a).cpc, me(b).cpc);
  assert.ok(AU.auctionChecks(a, b, 3).includes('a2'));
  assert.ok(!AU.auctionChecks(a, { ...a, bid: 23 }, 3).includes('a2'), 'too small a raise');
  // a3: position 1 by bidding
  assert.ok(AU.auctionChecks(null, cfg(60, 'below', 'below', 'average')).includes('a3'));
  assert.ok(!AU.auctionChecks(null, cfg(60, 'below', 'below', 'average')).includes('a4'));
  // a4: position 1 with a lower max CPC than ZipRide thanks to quality, paying less than ZipRide bids
  const q = cfg(18, 'above', 'above', 'above');
  assert.equal(me(q).position, 1); assert.ok(me(q).cpc < 32);
  assert.ok(AU.auctionChecks(null, q).includes('a4'));
  // a5: better landing page, same bid, same position, lower CPC
  const l0 = cfg(15, 'average', 'average', 'average'), l1 = { ...l0, lp: 'above' };
  assert.equal(me(l0).position, me(l1).position);
  assert.ok(me(l1).cpc < me(l0).cpc);
  assert.ok(AU.auctionChecks(l0, l1).includes('a5'));
  // case answers exist
  assert.ok(AU.CASE.qs.every((x) => x.answer >= 0 && x.answer < x.options.length));
  // a higher bidder can lose to better quality: ZipRide bids most but is not first
  const rows = AU.auction(start);
  assert.equal(rows[0].name, 'Kora EV');
});

/* ---------------------------------------------------------------- bidding ---------------------------------------------------------------- */

test('bidding model: diminishing returns', () => {
  let prevConv = 0, prevMarg = 0;
  for (let s = 10000; s <= 400000; s += 10000) {
    const c = BI.convAt(s), m = BI.marginalCpaAt(s);
    assert.ok(c > prevConv, 'more spend buys more');
    assert.ok(m > prevMarg, 'marginal CPA rises');
    assert.ok(m >= BI.avgCpaAt(s), 'marginal CPA is above the average');
    prevConv = c; prevMarg = m;
  }
  const r = BI.compareBudgets(70000, 140000);
  assert.ok(r.cb < 2 * r.ca, 'double budget, less than double conversions');
  assert.ok(r.incCpa > r.cpaB && r.cpaB > r.cpaA);
  assert.equal(Math.round(r.ca), 112); assert.equal(Math.round(r.cb), 182); // quiz numbers
  assert.ok(Math.abs(r.incCpa - 1000) < 15);
  // value strategies trade some conversions for more value
  const mc = BI.simulateWeek({ ...BI.START }, { ...BI.START }), mv = BI.simulateWeek({ ...BI.START, strategy: 'maxvalue' }, { ...BI.START, strategy: 'maxvalue' });
  assert.ok(mv.conv < mc.conv && mv.revenue > mc.revenue);
  assert.ok(BI.MAX_ROAS > 4.2 && BI.MAX_ROAS < 4.4, 'quiz says about 430%');
});

test('bidding: statuses, learning and every task reachable', () => {
  const run = (list) => { const h = []; let prev = null; for (const c of list) { h.push({ cfg: c, out: BI.simulateWeek(c, prev) }); prev = c; } return h; };
  const base = { strategy: 'maxconv', daily: 10000, tcpa: 600, troas: 300 };
  // first week learns; same settings next week do not
  const h0 = run([base, base]);
  assert.ok(h0[0].out.learning && !h0[1].out.learning);
  assert.ok(h0[1].out.status.includes('Spends the full budget'));
  // b2: marginal CPA ≈ ₹1,200
  const b2 = run([{ ...base, daily: 18500 }]);
  assert.ok(BI.weekChecks(b2).includes('b2'), `marginal ${b2[0].out.marginalCpa}`);
  assert.ok(!BI.weekChecks(h0).includes('b2'));
  // b3: tCPA just above the average CPA at this budget spends it all
  const avg = BI.avgCpaAt(70000);
  const b3 = run([{ ...base, strategy: 'tcpa', tcpa: Math.ceil(avg / 10) * 10 }]);
  assert.ok(b3[0].out.spend >= 69999 && BI.weekChecks(b3).includes('b3'));
  const low = run([{ ...base, strategy: 'tcpa', tcpa: 550 }]);
  assert.ok(low[0].out.spend < 70000 * 0.6 && !BI.weekChecks(low).includes('b3'), 'too low a tCPA underspends');
  assert.ok(low[0].out.status.some((s) => /too strict/.test(s)));
  const high = run([{ ...base, strategy: 'tcpa', tcpa: 900 }]);
  assert.ok(!BI.weekChecks(high).includes('b3'), 'a far-too-high tCPA is not the sweet spot');
  // b4: tROAS 450% stops; 320% spends
  const b4 = run([{ ...base, strategy: 'troas', troas: 450 }, { ...base, strategy: 'troas', troas: 320 }]);
  assert.ok(b4[0].out.spend < 70000 * 0.05 && b4[0].out.status.some((s) => /Stopped/.test(s)));
  assert.ok(BI.weekChecks(b4).includes('b4'));
  assert.ok(!BI.weekChecks(run([{ ...base, strategy: 'troas', troas: 320 }])).includes('b4'), 'needs the stop first');
  // b5: small step keeps learning; big step restarts it
  const b5 = run([base, base, { ...base, daily: 11500 }]);
  assert.ok(!b5[2].out.learning && BI.weekChecks(b5).includes('b5'));
  const big = run([base, base, { ...base, daily: 15000 }]);
  assert.ok(big[2].out.learning && !BI.weekChecks(big).includes('b5'));
  assert.ok(BI.bigChange({ ...base }, { ...base, strategy: 'tcpa' }));
  // learning costs conversions
  assert.ok(h0[0].out.conv < h0[1].out.conv);
  // b6
  assert.equal(BI.LEADGEN.options[BI.LEADGEN.answer].includes('Maximize conversion value'), true);
});
