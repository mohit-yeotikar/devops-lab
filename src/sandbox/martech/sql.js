// Lab mk-sql: SQL on GA4 export data. A real SQL engine (alasql, loaded only when the lab opens) runs
// the learner's query on a fake, deterministic GA4-like export for Voltra Mobility. Each task is checked by
// comparing the learner's result set with the expected one (column names free, row order free).

export const lab = {
  id: 'mk-sql', track: 'martech', kind: 'widget', title: 'SQL on GA4 export data', topic: 'Analytics', minutes: 40, sprints: ['m04'],
  summary: 'Write real SQL on a week of Voltra GA4 events: users and sessions, revenue by source/medium, a device funnel, event params and landing pages.',
  intro: [
    'GA4 can export every event to BigQuery. One row is one event: a page_view, a view_item, a purchase. Users, sessions and funnels do not exist as rows. You build them with SQL.',
    'Here you get one week of Voltra website events (5 to 11 October 2026) in a table called events, and the event parameters in a second table called event_params. The SQL engine runs in your browser.',
    'In real BigQuery the parameters sit inside each event row as a list, and you read them with UNNEST(event_params). Here they are already flat, so you JOIN them on event_id. The note under the schema shows both versions.',
  ],
  tasks: [
    { id: 's1', text: 'Count the events per event_name.', why: 'The first query on any new export. It shows what is tracked and spots missing or doubled events.', hint: "SELECT event_name, COUNT(*) AS events FROM events GROUP BY event_name ORDER BY events DESC" },
    { id: 's2', text: 'Count users and sessions for the week in one row.', why: 'GA4 has no session table. A session is a user_pseudo_id plus a ga_session_id. Get this wrong and every rate is wrong.', hint: "COUNT(DISTINCT user_pseudo_id) for users. For sessions, glue both ids: COUNT(DISTINCT user_pseudo_id || '-' || ga_session_id). ga_session_id alone is not unique." },
    { id: 's3', text: 'Show purchases and revenue by source and medium.', why: 'This is the table the media team asks for every Monday. It must match the ad platforms roughly, never exactly.', hint: "Filter WHERE event_name = 'purchase', then GROUP BY source, medium. Purchases = COUNT(*) or COUNT(DISTINCT transaction_id); revenue = SUM(value)." },
    { id: 's4', text: 'Build a 3-step session funnel by device: session_start, view_item, purchase.', why: 'Funnels in SQL are counts of sessions that did each step. Split by device to find where mobile leaks.', hint: "Make a session key (user_pseudo_id || '-' || ga_session_id), then COUNT(DISTINCT CASE WHEN event_name = 'view_item' THEN <key> END) for each step, GROUP BY device_category." },
    { id: 's5', text: 'Count test-ride leads by dealer_city, for google / cpc traffic only, reading dealer_city from event_params.', why: 'Most useful GA4 data lives in event parameters. Reading them is the UNNEST skill in BigQuery.', hint: "JOIN event_params p ON p.event_id = e.event_id AND p.key = 'dealer_city', filter e.event_name = 'generate_lead' AND e.source = 'google' AND e.medium = 'cpc', GROUP BY p.string_value." },
    { id: 's6', text: 'List the top 5 landing pages by sessions.', why: 'The landing page is where paid traffic first meets the site. It is the first place to look when a campaign does not convert.', hint: "The page_location of the session_start event is the landing page. WHERE event_name = 'session_start' GROUP BY page_location ORDER BY sessions DESC LIMIT 5." },
    { id: 's7', text: 'Find the orders that were counted more than once.', why: 'A reloaded thank-you page sends purchase twice. Finance counts each order once, so your revenue must too.', hint: "Purchases only, GROUP BY transaction_id, HAVING COUNT(*) > 1." },
  ],
  quiz: [
    { q: 'In the GA4 BigQuery export, how do you count sessions?', options: ['COUNT(*) of all rows', 'COUNT(DISTINCT ga_session_id)', "COUNT(DISTINCT user_pseudo_id plus ga_session_id)", 'COUNT of page_view events'], answer: 2, why: 'ga_session_id is the start time of the session in seconds, so two users can share it. Only the pair with user_pseudo_id is unique.' },
    { q: 'Why do you need UNNEST(event_params) in BigQuery?', options: ['To delete duplicates', 'Parameters are stored as a list inside each event row; UNNEST turns the list into rows you can filter by key', 'To speed up the query for free', 'It converts dates'], answer: 1, why: 'event_params is a repeated record of key + value. A subquery like (SELECT value.string_value FROM UNNEST(event_params) WHERE key = "page_location") reads one parameter.' },
    { q: 'Revenue by source/medium from the export is 3% higher than GA4 reports. What is a likely cause?', options: ['BigQuery adds tax', 'Duplicate purchase events with the same transaction_id; GA4 reports drop some of them, a plain SUM does not', 'SQL rounds up', 'The export is always 3% higher'], answer: 1, why: 'Count orders with COUNT(DISTINCT transaction_id) and deduplicate revenue by transaction_id before you report it.' },
  ],
};

/* ---------------------------------------------------------------- data ---------------------------------------------------------------- */

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pickW = (r, pairs) => { let x = r() * pairs.reduce((s, p) => s + p[1], 0); for (const [v, w] of pairs) { x -= w; if (x <= 0) return v; } return pairs[pairs.length - 1][0]; };

export const SITE = 'https://voltra.in';
const LANDING = [['/', 30], ['/scooters/vx1', 20], ['/offers/festive', 16], ['/scooters/vx2', 11], ['/test-ride', 9], ['/blog/ev-subsidy-guide', 7], ['/accessories', 6]];
const PAGES = ['/', '/scooters/vx1', '/scooters/vx2', '/offers/festive', '/test-ride', '/accessories', '/compare', '/dealers'];
const TRAFFIC = [
  [['google', 'cpc', 'vx_search_generic'], 20], [['google', 'cpc', 'vx_search_brand'], 10], [['google', 'organic', '(organic)'], 20],
  [['(direct)', '(none)', '(direct)'], 18], [['facebook', 'paid_social', 'festive_reels'], 15], [['dv360', 'display', 'festive_prospecting'], 10],
  [['newsletter', 'email', 'oct_newsletter'], 7],
];
const CITIES = [['Pune', 22], ['Bengaluru', 26], ['Delhi', 18], ['Hyderabad', 14], ['Jaipur', 9], ['Kochi', 11]];
const ITEMS = [['VX1-BOOKING', 2999, 45], ['VX2-BOOKING', 4999, 25], ['ACC-HELMET', 1899, 18], ['ACC-CHARGER', 3499, 12]];
const DAY0 = Date.UTC(2026, 9, 5) / 1000 - 19800; // 5 Oct 2026, 00:00 India time (UTC+5:30), in seconds
const ymd = (sec) => { const d = new Date((sec + 19800) * 1000); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`; };

export const EVENT_COLS = ['event_id', 'event_date', 'event_timestamp', 'event_name', 'user_pseudo_id', 'ga_session_id', 'source', 'medium', 'campaign', 'device_category', 'country', 'page_location', 'value', 'currency', 'transaction_id', 'item_id'];
export const PARAM_COLS = ['event_id', 'key', 'string_value', 'int_value'];

/** Deterministic fake GA4 export for Voltra: { events, event_params }. */
export function makeData(seed = 20261005) {
  const r = rng(seed);
  const users = [];
  for (let i = 0; i < 400; i++) {
    users.push({
      id: `${1000000000 + Math.floor(r() * 8999999999)}.${1759000000 + Math.floor(r() * 900000)}`,
      device: pickW(r, [['mobile', 69], ['desktop', 26], ['tablet', 5]]),
      country: pickW(r, [['India', 93], ['United Arab Emirates', 3], ['Nepal', 2], ['United States', 2]]),
      isNew: r() < 0.8,
    });
  }
  // one session per user, plus 200 return sessions
  const sessions = users.map((u) => ({ u }));
  for (let i = 0; i < 200; i++) sessions.push({ u: users[Math.floor(r() ** 1.6 * users.length)] });
  for (const s of sessions) s.start = DAY0 + Math.floor(r() * 7 * 86400);
  // ga_session_id is the session start in seconds: two people can start in the same second.
  for (let i = 50; i < sessions.length; i += 100) sessions[i].start = sessions[i - 1].u === sessions[i].u ? sessions[i].start : sessions[i - 1].start;
  sessions.sort((a, b) => a.start - b.start || (a.u.id < b.u.id ? -1 : 1));
  const firstSeen = new Set();
  const events = [], params = [];
  let eid = 0, order = 0;
  const add = (s, t, name, page, extra = {}, more = []) => {
    const e = {
      event_id: ++eid, event_date: ymd(Math.floor(t / 1e6)), event_timestamp: t, event_name: name, user_pseudo_id: s.u.id, ga_session_id: s.start,
      source: s.src[0], medium: s.src[1], campaign: s.src[2], device_category: s.u.device, country: s.u.country, page_location: SITE + page,
      value: null, currency: null, transaction_id: null, item_id: null, ...extra,
    };
    events.push(e);
    params.push({ event_id: e.event_id, key: 'ga_session_id', string_value: null, int_value: s.start });
    params.push({ event_id: e.event_id, key: 'page_location', string_value: e.page_location, int_value: null });
    for (const [k, sv, iv] of more) params.push({ event_id: e.event_id, key: k, string_value: sv ?? null, int_value: iv ?? null });
    return e;
  };
  let dupes = 0;
  for (const s of sessions) {
    s.src = pickW(r, TRAFFIC);
    const land = s.src[1] === 'cpc' && r() < 0.5 ? (r() < 0.6 ? '/scooters/vx1' : '/test-ride') : pickW(r, LANDING);
    let t = s.start * 1e6 + Math.floor(r() * 1e6);
    const step = () => (t += Math.floor((5 + r() * 90) * 1e6));
    if (!firstSeen.has(s.u.id)) { firstSeen.add(s.u.id); if (s.u.isNew) add(s, t, 'first_visit', land); }
    add(s, t, 'session_start', land);
    add(s, t, 'page_view', land);
    if (r() < 0.12) add(s, step(), 'scroll', land);
    const extraViews = pickW(r, [[0, 65], [1, 25], [2, 10]]);
    let page = land;
    for (let i = 0; i < extraViews; i++) { page = PAGES[Math.floor(r() * PAGES.length)]; add(s, step(), 'page_view', page); }
    const leadP = land === '/test-ride' ? 0.4 : s.src[1] === 'cpc' ? 0.1 : 0.05;
    if (r() < leadP) {
      add(s, step(), 'generate_lead', '/test-ride', {}, [['dealer_city', pickW(r, CITIES)], ['lead_type', 'test_ride']]);
    }
    const viewP = /scooters|accessories|festive/.test(land) ? 0.48 : s.src[1] === 'email' ? 0.4 : 0.26;
    if (r() < viewP) {
      const it = pickW(r, ITEMS.map((x) => [x, x[2]]));
      const pp = it[0].startsWith('ACC') ? '/accessories' : it[0] === 'VX2-BOOKING' ? '/scooters/vx2' : '/scooters/vx1';
      add(s, step(), 'view_item', pp, { item_id: it[0] });
      const buyBoost = s.u.device === 'desktop' ? 1.35 : s.u.device === 'tablet' ? 1 : 0.8;
      if (r() < 0.36) {
        add(s, step(), 'add_to_cart', pp, { item_id: it[0], value: it[1], currency: 'INR' });
        if (r() < 0.68) {
          add(s, step(), 'begin_checkout', '/checkout', { item_id: it[0], value: it[1], currency: 'INR' });
          if (r() < 0.72 * buyBoost) {
            const tid = `VLT-${26100 + ++order}`;
            const p = { item_id: it[0], value: it[1], currency: 'INR', transaction_id: tid };
            add(s, step(), 'purchase', '/checkout/thank-you', p);
            if (order % 11 === 4 && dupes < 2) { dupes++; add(s, t + 41e6, 'purchase', '/checkout/thank-you', p); }
          }
        }
      }
    }
  }
  return { events, event_params: params };
}

/* ------------------------------------------------------------ expected results ------------------------------------------------------------ */

const groupCount = (rows, keyFn, valFn = () => 1) => { const m = new Map(); for (const x of rows) { const k = keyFn(x); m.set(k, (m.get(k) || 0) + valFn(x)); } return m; };
const skey = (e) => `${e.user_pseudo_id}-${e.ga_session_id}`;

/** Expected answers computed in plain JS (independent from SQL). Each task: { variants: [rows[][]], traps: [{rows, msg}] }. */
export function expected(data) {
  const ev = data.events;
  const out = {};
  out.s1 = { variants: [[...groupCount(ev, (e) => e.event_name)].map(([k, n]) => [k, n])] };
  const users = new Set(ev.map((e) => e.user_pseudo_id)).size, sess = new Set(ev.map(skey)).size, gsid = new Set(ev.map((e) => e.ga_session_id)).size;
  out.s2 = { variants: [[[users, sess]]], traps: [{ rows: [[users, gsid]], msg: `Users are right. Sessions are ${gsid}, but the true number is higher. ga_session_id is the session start time in seconds, so two people who start in the same second share it. Count user_pseudo_id and ga_session_id together.` }, { rows: [[users, ev.length]], msg: 'Users are right, but the second number counts events, not sessions. Use COUNT(DISTINCT ...) on a session key.' }] };
  const buys = ev.filter((e) => e.event_name === 'purchase');
  const sm = (e) => `${e.source}\u0001${e.medium}`;
  const naive = [...groupCount(buys, sm)].map(([k, n]) => [...k.split('\u0001'), n, buys.filter((b) => sm(b) === k).reduce((s, b) => s + b.value, 0)]);
  const seen = new Set(), uniq = buys.filter((b) => (seen.has(b.transaction_id) ? false : seen.add(b.transaction_id)));
  const dedup = [...groupCount(uniq, sm)].map(([k, n]) => [...k.split('\u0001'), n, uniq.filter((b) => sm(b) === k).reduce((s, b) => s + b.value, 0)]);
  const mixed = [...groupCount(uniq, sm)].map(([k, n]) => [...k.split('\u0001'), n, buys.filter((b) => sm(b) === k).reduce((s, b) => s + b.value, 0)]);
  out.s3 = { variants: [naive, dedup, mixed], note: 'Two orders appear twice in this data (see the last task), so COUNT(*) and COUNT(DISTINCT transaction_id) give different numbers. Both are accepted here; in a real report, deduplicate.' };
  const devs = [...new Set(ev.map((e) => e.device_category))];
  const stepSet = (d, name) => new Set(ev.filter((e) => e.device_category === d && e.event_name === name).map(skey)).size;
  out.s4 = {
    variants: [devs.map((d) => [d, stepSet(d, 'session_start'), stepSet(d, 'view_item'), stepSet(d, 'purchase')])],
    traps: [{ rows: devs.map((d) => [d, ...['session_start', 'view_item', 'purchase'].map((n) => ev.filter((e) => e.device_category === d && e.event_name === n).length)]), msg: 'Close. These are event counts. A funnel counts sessions that did the step: one session can send the same event twice (look at purchase). Use COUNT(DISTINCT session key).' }],
  };
  const pmap = new Map(data.event_params.filter((p) => p.key === 'dealer_city').map((p) => [p.event_id, p.string_value]));
  const leads = ev.filter((e) => e.event_name === 'generate_lead');
  const cpcLeads = leads.filter((e) => e.source === 'google' && e.medium === 'cpc');
  out.s5 = {
    variants: [[...groupCount(cpcLeads, (e) => pmap.get(e.event_id))].map(([k, n]) => [k, n])],
    traps: [{ rows: [...groupCount(leads, (e) => pmap.get(e.event_id))].map(([k, n]) => [k, n]), msg: 'These are leads from all traffic. Add the filter for source = google and medium = cpc.' }],
  };
  const land = [...groupCount(ev.filter((e) => e.event_name === 'session_start'), (e) => e.page_location)].sort((a, b) => b[1] - a[1]);
  out.s6 = {
    variants: [land.slice(0, 5)],
    traps: [{ rows: land, msg: 'The counts are right. Now keep only the top 5: ORDER BY sessions DESC LIMIT 5.' }],
    boundaryGap: land[4][1] - land[5][1],
  };
  const dup = [...groupCount(buys, (e) => e.transaction_id)].filter(([, n]) => n > 1);
  out.s7 = { variants: [dup.map(([k, n]) => [k, n]), dup.map(([k]) => [k])] };
  return out;
}

/* --------------------------------------------------------------- engine --------------------------------------------------------------- */

/** Register the BigQuery-style helpers learners often type. */
export function setupEngine(alasql) {
  if (alasql.__mk) return;
  alasql.__mk = true;
  alasql.aggr.COUNTIF = function (v, s, stage) { if (stage === 1) return v ? 1 : 0; if (stage === 2) return s + (v ? 1 : 0); return s; };
  alasql.fn.SAFE_DIVIDE = (a, b) => (b ? a / b : null);
}

export function createDb(alasql, data = makeData()) {
  setupEngine(alasql);
  const db = new alasql.Database();
  db.exec('CREATE TABLE events (event_id INT, event_date STRING, event_timestamp NUMBER, event_name STRING, user_pseudo_id STRING, ga_session_id INT, source STRING, medium STRING, campaign STRING, device_category STRING, country STRING, page_location STRING, `value` NUMBER, currency STRING, transaction_id STRING, item_id STRING)');
  db.exec('CREATE TABLE event_params (event_id INT, `key` STRING, string_value STRING, int_value INT)');
  db.tables.events.data = data.events.map((e) => ({ ...e }));
  db.tables.event_params.data = data.event_params.map((p) => ({ ...p }));
  return db;
}

/** Walk SQL outside strings and comments. Returns { code (comments removed), outside (strings blanked) }. */
function scan(sql) {
  let code = '', outside = '', i = 0;
  while (i < sql.length) {
    const c = sql[i], n = sql[i + 1];
    if (c === '-' && n === '-') { while (i < sql.length && sql[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const j = sql.indexOf('*/', i + 2); i = j < 0 ? sql.length : j + 2; code += ' '; outside += ' '; continue; }
    if (c === "'" || c === '"' || c === '`' || c === '[') {
      const close = c === '[' ? ']' : c;
      let j = i + 1;
      while (j < sql.length && sql[j] !== close) j += sql[j] === '\\' ? 2 : 1;
      const lit = sql.slice(i, j + 1);
      code += lit; outside += c === '`' || c === '[' ? lit : ' '.repeat(lit.length);
      i = j + 1; continue;
    }
    code += c; outside += c; i++;
  }
  return { code, outside };
}
/** alasql reads a bare `value` as a keyword. Quote it when it is a column name. */
function quoteValue(code) {
  let out = '', i = 0;
  while (i < code.length) {
    const c = code[i];
    if (c === "'" || c === '"' || c === '`' || c === '[') {
      const close = c === '[' ? ']' : c;
      let j = i + 1;
      while (j < code.length && code[j] !== close) j += code[j] === '\\' ? 2 : 1;
      out += code.slice(i, j + 1); i = j + 1; continue;
    }
    if (/[A-Za-z_]/.test(c) && !/[A-Za-z0-9_]/.test(code[i - 1] || '')) {
      let j = i; while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) j++;
      const w = code.slice(i, j);
      out += w.toLowerCase() === 'value' && code[j] !== '.' ? '`value`' : w;
      i = j; continue;
    }
    out += c; i++;
  }
  return out;
}

/** Turn engine errors into plain words. */
export function plainError(msg, sql = '') {
  const m = String(msg || '');
  if (/UNNEST/i.test(sql)) return 'UNNEST is BigQuery syntax. Here the parameters are already in their own table, event_params. JOIN it on event_id and filter on key.';
  if (/value\s*\.\s*(string|int)_value/i.test(sql)) return 'value.string_value is how BigQuery reads a parameter. Here use string_value or int_value from the event_params table.';
  let x;
  if ((x = m.match(/Table does not exist: (\S+)/i))) return `There is no table called "${x[1]}". The tables are events and event_params.`;
  if ((x = m.match(/Column does not exist: (\S+)/i))) {
    const c = x[1];
    const all = [...EVENT_COLS, ...PARAM_COLS];
    const near = all.find((k) => k.toLowerCase() === c.toLowerCase());
    return near ? `There is no column called "${c}". Column names are lower case here: ${near}.` : `There is no column called "${c}". Check the schema panel for the exact names.`;
  }
  if ((x = m.match(/alasql\.fn\.(\w+) is not a function/))) return `The function ${x[1]}() does not exist in this engine. Try CASE WHEN ... THEN ... END, COUNTIF(), SAFE_DIVIDE(), ROUND(), COALESCE().`;
  if (/Parse error/i.test(m)) {
    const lines = m.split('\n');
    const where = lines[1] ? `near: ${lines[1].trim().slice(0, 80)}` : '';
    return `The SQL could not be read ${where}. Check commas between columns, closing brackets and quotes. Text values need single quotes: 'purchase'.`;
  }
  return m.split('\n')[0] || 'The query failed.';
}

/** Run one read-only SELECT. Returns { ok, rows, cols } or { ok: false, error }. */
export function runSql(db, sql) {
  const { code, outside } = scan(String(sql || ''));
  const body = code.trim().replace(/;\s*$/, '').trim();
  const outBody = outside.trim().replace(/;\s*$/, '');
  if (!body) return { ok: false, error: 'Type a query first.' };
  if (!/^(SELECT|WITH)\b/i.test(body)) return { ok: false, error: 'Only SELECT queries run here (they read data and change nothing). Start with SELECT or WITH.' };
  if (outBody.includes(';')) return { ok: false, error: 'Run one query at a time. Remove the extra semicolon.' };
  if (/\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|ATTACH|DETACH|INTO)\b/i.test(outBody)) return { ok: false, error: 'Only reading queries run here. INSERT, UPDATE, DELETE, DROP, CREATE and SELECT INTO are blocked.' };
  if (/GROUP\s+BY\s+\d/i.test(outBody)) return { ok: false, error: 'GROUP BY 1 works in BigQuery, but not in this engine. Write the column name, for example GROUP BY event_name.' };
  try {
    const rows = db.exec(quoteValue(body));
    if (!Array.isArray(rows)) return { ok: false, error: 'This query did not return a table.' };
    const cols = [];
    for (const r of rows.slice(0, 50)) for (const k of Object.keys(r || {})) if (!cols.includes(k)) cols.push(k);
    return { ok: true, rows, cols };
  } catch (e) {
    return { ok: false, error: plainError(e && e.message, body) };
  }
}

/* -------------------------------------------------------------- checking -------------------------------------------------------------- */

export function normVal(v) {
  if (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))) return '∅';
  if (typeof v === 'number') return String(Math.round(v * 100) / 100);
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v).trim();
  if (/^-?\d+(\.\d+)?$/.test(s) && s.length < 15) return String(Math.round(Number(s) * 100) / 100);
  return s.toLowerCase();
}

/** Do the learner's rows contain the expected table? Column names and order, and row order, do not matter. Extra columns are allowed. */
export function sameTable(rows, cols, want) {
  if (!Array.isArray(rows) || rows.length !== want.length) return false;
  if (!want.length) return true;
  const E = want[0].length;
  if (cols.length < E) return false;
  const L = rows.map((r) => cols.map((c) => normVal(r[c])));
  const X = want.map((r) => r.map(normVal));
  const colKey = (M, j) => M.map((r) => r[j]).sort().join('\u0001');
  const cand = X[0].map((_, j) => { const k = colKey(X, j); return cols.map((_, i) => i).filter((i) => colKey(L, i) === k); });
  if (cand.some((c) => !c.length)) return false;
  const target = X.map((r) => r.join('\u0002')).sort().join('\u0003');
  const used = new Set(), pick = [];
  const bt = (j) => {
    if (j === E) return L.map((r) => pick.map((i) => r[i]).join('\u0002')).sort().join('\u0003') === target;
    for (const i of cand[j]) { if (used.has(i)) continue; used.add(i); pick.push(i); if (bt(j + 1)) return true; used.delete(i); pick.pop(); }
    return false;
  };
  return bt(0);
}

/** Check a result against one task. Returns { ok, msg }. */
export function checkTask(exp, id, res) {
  const t = exp[id];
  if (!t || !res || !res.ok) return { ok: false, msg: '' };
  if (t.variants.some((v) => sameTable(res.rows, res.cols, v))) return { ok: true, msg: t.note || '' };
  for (const tr of t.traps || []) if (sameTable(res.rows, res.cols, tr.rows)) return { ok: false, msg: tr.msg };
  const want = t.variants[0];
  if (res.rows.length !== want.length) return { ok: false, msg: `Your result has ${res.rows.length} row${res.rows.length === 1 ? '' : 's'}; the answer has ${want.length}. Check your GROUP BY, WHERE and LIMIT.` };
  if (res.cols.length < want[0].length) return { ok: false, msg: `The row count is right, but the answer needs at least ${want[0].length} columns. You have ${res.cols.length}.` };
  return { ok: false, msg: 'The shape is right, but some numbers differ. Check the filter (WHERE), what you count (COUNT(*) or COUNT(DISTINCT ...)), and the grouping.' };
}

/* --------------------------------------------------------------- content --------------------------------------------------------------- */

const BQ_FROM = "`voltra-ga4.analytics_312345678.events_*`\nWHERE _TABLE_SUFFIX BETWEEN '20261005' AND '20261011'";
const SID = "(SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id')";
export const BIGQUERY = {
  s1: `SELECT event_name, COUNT(*) AS events\nFROM ${BQ_FROM}\nGROUP BY event_name\nORDER BY events DESC`,
  s2: `SELECT\n  COUNT(DISTINCT user_pseudo_id) AS users,\n  COUNT(DISTINCT CONCAT(user_pseudo_id, '-',\n    CAST(${SID} AS STRING))) AS sessions\nFROM ${BQ_FROM}`,
  s3: `SELECT\n  session_traffic_source_last_click.cross_channel_campaign.source AS source,\n  session_traffic_source_last_click.cross_channel_campaign.medium AS medium,\n  COUNT(DISTINCT ecommerce.transaction_id) AS purchases,\n  SUM(ecommerce.purchase_revenue) AS revenue  -- dedupe by transaction_id first for finance\nFROM ${BQ_FROM}\n  AND event_name = 'purchase'\nGROUP BY source, medium\nORDER BY revenue DESC`,
  s4: `WITH e AS (\n  SELECT device.category AS device_category, event_name,\n    CONCAT(user_pseudo_id, '-', CAST(${SID} AS STRING)) AS session_key\n  FROM ${BQ_FROM.replace('\n', '\n  ')}\n)\nSELECT device_category,\n  COUNT(DISTINCT IF(event_name = 'session_start', session_key, NULL)) AS sessions,\n  COUNT(DISTINCT IF(event_name = 'view_item', session_key, NULL)) AS viewed_item,\n  COUNT(DISTINCT IF(event_name = 'purchase', session_key, NULL)) AS purchased\nFROM e\nGROUP BY device_category`,
  s5: `SELECT\n  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'dealer_city') AS dealer_city,\n  COUNT(*) AS leads\nFROM ${BQ_FROM}\n  AND event_name = 'generate_lead'\n  AND session_traffic_source_last_click.cross_channel_campaign.source = 'google'\n  AND session_traffic_source_last_click.cross_channel_campaign.medium = 'cpc'\nGROUP BY dealer_city\nORDER BY leads DESC`,
  s6: `SELECT\n  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') AS landing_page,\n  COUNT(*) AS sessions\nFROM ${BQ_FROM}\n  AND event_name = 'session_start'\nGROUP BY landing_page\nORDER BY sessions DESC\nLIMIT 5`,
  s7: `SELECT ecommerce.transaction_id, COUNT(*) AS times\nFROM ${BQ_FROM}\n  AND event_name = 'purchase'\nGROUP BY ecommerce.transaction_id\nHAVING COUNT(*) > 1`,
};

/** Reference solutions in this engine's SQL (used by the tests to prove each task is solvable). */
export const REFERENCE = {
  s1: 'SELECT event_name, COUNT(*) AS events FROM events GROUP BY event_name ORDER BY events DESC',
  s2: "SELECT COUNT(DISTINCT user_pseudo_id) AS users, COUNT(DISTINCT user_pseudo_id || '-' || ga_session_id) AS sessions FROM events",
  s3: "SELECT source, medium, COUNT(DISTINCT transaction_id) AS purchases, SUM(value) AS revenue FROM events WHERE event_name = 'purchase' GROUP BY source, medium ORDER BY revenue DESC",
  s4: `SELECT device_category,
  COUNT(DISTINCT CASE WHEN event_name = 'session_start' THEN user_pseudo_id || '-' || ga_session_id END) AS sessions,
  COUNT(DISTINCT CASE WHEN event_name = 'view_item' THEN user_pseudo_id || '-' || ga_session_id END) AS viewed_item,
  COUNT(DISTINCT CASE WHEN event_name = 'purchase' THEN user_pseudo_id || '-' || ga_session_id END) AS purchased
FROM events GROUP BY device_category`,
  s5: `SELECT p.string_value AS dealer_city, COUNT(*) AS leads
FROM events e JOIN event_params p ON p.event_id = e.event_id AND p.key = 'dealer_city'
WHERE e.event_name = 'generate_lead' AND e.source = 'google' AND e.medium = 'cpc'
GROUP BY p.string_value ORDER BY leads DESC`,
  s6: "SELECT page_location, COUNT(*) AS sessions FROM events WHERE event_name = 'session_start' GROUP BY page_location ORDER BY sessions DESC LIMIT 5",
  s7: "SELECT transaction_id, COUNT(*) AS times FROM events WHERE event_name = 'purchase' GROUP BY transaction_id HAVING COUNT(*) > 1",
};

export const SNIPPETS = [
  ['Look at 20 events', 'SELECT event_date, event_name, user_pseudo_id, ga_session_id, source, medium, page_location\nFROM events\nORDER BY event_timestamp\nLIMIT 20'],
  ['All parameters of one event', 'SELECT key, string_value, int_value\nFROM event_params\nWHERE event_id = 5'],
  ['Which parameter keys exist?', 'SELECT key, COUNT(*) AS rows_count\nFROM event_params\nGROUP BY key'],
  ['Events per day', 'SELECT event_date, COUNT(*) AS events\nFROM events\nGROUP BY event_date\nORDER BY event_date'],
  ['COUNT DISTINCT', 'SELECT country, COUNT(DISTINCT user_pseudo_id) AS users\nFROM events\nGROUP BY country\nORDER BY users DESC'],
  ['Conditional count (CASE WHEN)', "SELECT medium,\n  COUNT(*) AS events,\n  SUM(CASE WHEN event_name = 'add_to_cart' THEN 1 ELSE 0 END) AS add_to_carts\nFROM events\nGROUP BY medium"],
  ['Read a parameter (JOIN)', "SELECT e.event_name, p.string_value AS lead_type\nFROM events e\nJOIN event_params p ON p.event_id = e.event_id AND p.key = 'lead_type'\nLIMIT 10"],
];

const SCHEMA = [
  ['event_id', 'INT', 'Row id (only here; links to event_params)'], ['event_date', 'STRING', "'20261005' (YYYYMMDD)"], ['event_timestamp', 'INT', 'Microseconds since 1970'],
  ['event_name', 'STRING', 'page_view, view_item, purchase, generate_lead …'], ['user_pseudo_id', 'STRING', 'Cookie id of the browser'], ['ga_session_id', 'INT', 'Session start in seconds (not unique alone)'],
  ['source / medium / campaign', 'STRING', 'Traffic source of the session'], ['device_category', 'STRING', 'mobile, desktop, tablet'], ['country', 'STRING', 'India, …'],
  ['page_location', 'STRING', 'Full page URL'], ['value / currency', 'NUMBER / STRING', 'Money on ecommerce events (INR)'], ['transaction_id', 'STRING', 'Order id on purchase'], ['item_id', 'STRING', 'Product on item events'],
];

/* ----------------------------------------------------------------- UI ----------------------------------------------------------------- */

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const cell = (v) => (v === null || v === undefined ? '<span class="mk-null">null</span>' : typeof v === 'number' ? esc(Math.round(v * 100) / 100) : esc(typeof v === 'object' ? JSON.stringify(v) : v));
const MAX_ROWS = 200;

export function mount(el, ctx) {
  const S = ctx.state;
  S.sql ??= SNIPPETS[0][1];
  el.innerHTML = `
    <section class="card">
      <div class="row between"><h3 style="margin:0">SQL editor</h3><span class="help s-status">Loading the SQL engine…</span></div>
      <p class="help">One week of Voltra web events, 5 to 11 October 2026. Tables: <span class="mono">events</span> and <span class="mono">event_params</span>. Press Ctrl+Enter (or Cmd+Enter) to run.</p>
      <textarea class="mk-sql-editor mono s-sql" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="SQL query">${esc(S.sql)}</textarea>
      <div class="row" style="margin-top:8px">
        <button class="btn sm s-run" type="button" disabled>Run query</button>
        <label class="row" style="gap:6px;flex:1 1 260px">Check against
          <select class="s-task" style="flex:1">${lab.tasks.map((t, i) => `<option value="${t.id}">Task ${i + 1}: ${esc(t.text)}</option>`).join('')}</select>
        </label>
      </div>
      <div class="s-msg"></div>
      <div class="s-out"></div>
    </section>
    <div class="two">
      <section class="card">
        <h3 style="margin-top:0">Schema</h3>
        <h4>events <span class="help s-nev"></span></h4>
        <div class="tbl mk-schema"><table><thead><tr><th>Column</th><th>Type</th><th>Meaning</th></tr></thead><tbody>${SCHEMA.map((r) => `<tr><td class="mono">${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div>
        <h4>event_params <span class="help s-npr"></span></h4>
        <p class="help">One row per parameter: <span class="mono">event_id</span>, <span class="mono">key</span>, <span class="mono">string_value</span>, <span class="mono">int_value</span>. Keys: ga_session_id, page_location on every event; dealer_city and lead_type on generate_lead.</p>
        <details class="mk-details"><summary>How this looks in real BigQuery (UNNEST)</summary>
          <p class="help">In the real export there is no event_params table. Each event row carries a list called event_params, and each item has a key and a value with string_value, int_value, float_value and double_value. You read one parameter with a small subquery:</p>
          <pre class="mk-pre">-- BigQuery
SELECT
  event_name,
  (SELECT value.string_value FROM UNNEST(event_params)
   WHERE key = 'dealer_city') AS dealer_city
FROM \`voltra-ga4.analytics_312345678.events_*\`
WHERE _TABLE_SUFFIX BETWEEN '20261005' AND '20261011'
  AND event_name = 'generate_lead'</pre>
          <pre class="mk-pre">-- This lab (same result)
SELECT e.event_name, p.string_value AS dealer_city
FROM events e
JOIN event_params p
  ON p.event_id = e.event_id AND p.key = 'dealer_city'
WHERE e.event_name = 'generate_lead'</pre>
          <p class="help">Other differences: in BigQuery, source and medium of the session sit in <span class="mono">session_traffic_source_last_click</span>, device in <span class="mono">device.category</span>, country in <span class="mono">geo.country</span>, order data in <span class="mono">ecommerce.transaction_id</span> and <span class="mono">ecommerce.purchase_revenue</span>. Always filter <span class="mono">_TABLE_SUFFIX</span>: BigQuery charges by the data a query reads.</p>
        </details>
      </section>
      <section class="card">
        <h3 style="margin-top:0">Snippets</h3>
        <p class="help">Click one to load it into the editor. They are building blocks, not task answers.</p>
        <div class="list">${SNIPPETS.map((s, i) => `<button type="button" class="item s-snip" data-i="${i}"><span>${esc(s[0])}</span><span class="help">load</span></button>`).join('')}</div>
        <h4 style="margin-top:14px">Works here</h4>
        <p class="help">SELECT, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, JOIN, WITH, subqueries, COUNT(DISTINCT …), CASE WHEN, COUNTIF(), SAFE_DIVIDE(), ROUND(), COALESCE(), || to join text. Text values need single quotes. Column names are lower case.</p>
      </section>
    </div>`;
  const $ = (s) => el.querySelector(s);
  const ta = $('.s-sql'), sel = $('.s-task');
  const firstOpen = () => lab.tasks.find((t) => !ctx.isDone(t.id))?.id || lab.tasks[0].id;
  sel.value = S.sel && !ctx.isDone(S.sel) ? S.sel : firstOpen();
  let db = null, exp = null;

  ta.addEventListener('input', () => { S.sql = ta.value; ctx.save(); });
  ta.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); const a = ta.selectionStart, b = ta.selectionEnd; ta.setRangeText('  ', a, b, 'end'); S.sql = ta.value; ctx.save(); }
  });
  sel.addEventListener('change', () => { S.sel = sel.value; ctx.save(); $('.s-msg').innerHTML = ''; });
  el.querySelectorAll('.s-snip').forEach((b) => b.addEventListener('click', () => { ta.value = SNIPPETS[+b.dataset.i][1]; S.sql = ta.value; ctx.save(); ta.focus(); }));
  $('.s-run').addEventListener('click', run);

  function table(res) {
    const shown = res.rows.slice(0, MAX_ROWS);
    if (!res.rows.length) return '<p class="help">The query ran and returned no rows.</p>';
    return `<p class="help">${res.rows.length.toLocaleString('en-US')} row${res.rows.length === 1 ? '' : 's'}${res.rows.length > MAX_ROWS ? `, showing the first ${MAX_ROWS}` : ''}.</p>
      <div class="tbl mk-result"><table><thead><tr>${res.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${shown.map((r) => `<tr>${res.cols.map((c) => `<td>${cell(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function run() {
    if (!db) return;
    ctx.act();
    const res = runSql(db, ta.value);
    if (!res.ok) { $('.s-out').innerHTML = ''; $('.s-msg').innerHTML = `<div class="notice warn"><strong>The query did not run.</strong> ${esc(res.error)}</div>`; return; }
    $('.s-out').innerHTML = table(res);
    const newly = [];
    for (const t of lab.tasks) if (!ctx.isDone(t.id) && checkTask(exp, t.id, res).ok) newly.push(t.id);
    const chosen = sel.value, c = checkTask(exp, chosen, res);
    const n = (id) => lab.tasks.findIndex((t) => t.id === id) + 1;
    let html = '';
    if (newly.length || c.ok) {
      const id = c.ok ? chosen : newly[0];
      const note = checkTask(exp, id, res).msg;
      html = `<div class="notice ok"><strong>Correct: task ${n(id)}.</strong> ${esc(note)}<details class="mk-details"><summary>The same query in BigQuery</summary><pre class="mk-pre">${esc(BIGQUERY[id])}</pre></details></div>`;
    } else if (ctx.isDone(chosen)) html = `<div class="notice">Task ${n(chosen)} is already done. Pick another task in "Check against".</div>`;
    else if (c.msg) html = `<div class="notice warn"><strong>Not task ${n(chosen)} yet.</strong> ${esc(c.msg)}</div>`;
    $('.s-msg').innerHTML = html;
    newly.forEach((id) => ctx.done(id));
    if (newly.includes(sel.value) || ctx.isDone(sel.value)) { const nx = firstOpen(); if (!ctx.isDone(nx)) { sel.value = nx; S.sel = nx; ctx.save(); } }
  }

  import('alasql').then((m) => {
    const alasql = m.default || m;
    const data = makeData();
    db = createDb(alasql, data);
    exp = expected(data);
    $('.s-nev').textContent = `(${data.events.length.toLocaleString('en-US')} rows)`;
    $('.s-npr').textContent = `(${data.event_params.length.toLocaleString('en-US')} rows)`;
    $('.s-status').textContent = 'Engine ready';
    $('.s-run').disabled = false;
  }).catch(() => {
    $('.s-status').textContent = 'Engine failed to load';
    $('.s-msg').innerHTML = '<div class="notice warn">The SQL engine could not load. Check your connection and reload the page.</div>';
  });
}
