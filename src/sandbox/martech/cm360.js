// Lab: Campaign Manager 360 trafficking (simplified simulator).
// Pure logic (exported for tests) + mount(el, ctx) UI. Voltra Mobility festive campaign.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

export const lab = {
  id: 'mk-cm360', track: 'martech', kind: 'widget', title: 'Campaign Manager 360 trafficking', topic: 'Ad serving', minutes: 40, sprints: ['m08'],
  summary: 'Traffic Voltra\'s festive campaign: placements from a media plan, creatives, click-through URLs, a tag sheet, Floodlight activities and the "Floodlight counts double" case.',
  intro: [
    'This is a simplified simulator of Campaign Manager 360 (CM360), Google\'s ad server. The real product has many more settings, but the rules you practise here work the same way there.',
    'The hierarchy is advertiser (Voltra Mobility) → campaign (Festive Diwali 2026) → placements (the ad slots you bought on each site) → ads (a creative on a placement, with a click-through URL) → creatives (the banners). Each publisher gets a tag sheet with one tag per placement.',
    'Floodlight is CM360\'s conversion tag on voltramobility.in. A counter activity counts actions. A sales activity also records revenue (cost), quantity (qty) and an order ID (ord), and CM360 counts each ord value only once.',
  ],
  tasks: [
    { id: 'p1', text: 'Build the 4 placements from the media plan (site, size, pricing, rate and dates must match).', why: 'Placements are what you bought. If they differ from the signed plan, the publisher invoices one thing and you report another.', hint: 'Copy each media plan row exactly. The pill on each placement says what does not match.' },
    { id: 'p2', text: 'Assign a creative of the right size to every placement.', why: 'An ad puts a creative on a placement. A 300x250 slot can only show a 300x250 creative.', hint: 'Pick the creative whose size matches the placement size. CM360 refuses a size mismatch.' },
    { id: 'p3', text: 'Give every ad a clean click-through URL with UTM parameters.', why: 'Clean UTMs put the clicks in the Display channel in GA4 and keep campaign names the same everywhere.', hint: 'Example: https://www.voltramobility.in/festive?utm_source=toi&utm_medium=display&utm_campaign=festive_2026. Lowercase, no spaces, no %%…%% macros. Optional: utm_content=%epid! (CM360 fills in the placement ID).' },
    { id: 'p4', text: 'Prepare the tag sheet for publishers on Google Ad Manager: set the cache-buster and the click macro.', why: 'Without a cache-buster, browsers can reuse an old ad call and impressions go missing. Without the click macro, the publisher cannot count clicks.', hint: 'Google Ad Manager fills %%CACHEBUSTER%% with a random number and %%CLICK_URL_UNESC%% with its own click tracker.' },
    { id: 'f1', text: 'Create a Floodlight counter activity for the booking form view that counts each person once per day.', why: 'Counters measure actions without money. The counting method decides what "one conversion" means.', hint: 'Type: counter. Counting method: Unique (one per user per 24 hours).' },
    { id: 'f2', text: 'Create a Floodlight sales activity for accessories purchases that counts orders and revenue.', why: 'Sales activities give ROAS. ord = order ID stops reloads from adding fake orders.', hint: 'Type: sales. Counting: Transactions. ord = order ID, cost = revenue, qty = quantity.' },
    { id: 'c1', text: 'Case "Floodlight counts double": make Floodlight match the backend (4 test rides, 3 orders, ₹9,200), with each tag firing from one place only.', why: 'Inflated conversions make media look better than it is, and bidding tools optimise on the wrong numbers.', hint: 'Read the event log: who fires each tag, and what is in ord? Use a sales activity with Transactions and ord = booking or order ID, and remove the duplicate deployment.' },
  ],
  quiz: [
    { q: 'What is the difference between a Floodlight counter activity and a sales activity?', options: ['Counters are for display, sales activities are for search', 'A counter counts conversions; a sales activity also records revenue and quantity and de-duplicates by order ID', 'Sales activities cost extra', 'There is no difference'], answer: 1, why: 'Use counters for actions without money (form views, sign-ups) and sales activities for orders, with ord = order ID.' },
    { q: 'Why does a publisher replace ord=[timestamp] with a cache-buster macro such as %%CACHEBUSTER%%?', options: ['To add the date to reports', 'So every ad call is a unique URL and browsers do not reuse a cached response, which would lose impressions', 'To stop ad blockers', 'It sets the click-through URL'], answer: 1, why: 'A random value per request makes each call unique, so every impression is really requested and counted.' },
    { q: 'A sales activity uses ord=[Random Number]. A buyer loads the thank-you page and then reloads it twice. How many orders does CM360 count?', options: ['1', '3', '0', '2'], answer: 1, why: 'Each load sends a new random ord, so nothing is de-duplicated: 3 orders. With ord = the order ID, CM360 counts 1.' },
  ],
};

// ---------- Data ----------
export const CAMPAIGN = { advertiser: 'Voltra Mobility', name: 'VOLTRA_Festive_Diwali_2026', start: '2026-10-15', end: '2026-11-15', landing: 'https://www.voltramobility.in/festive' };
export const SITES = {
  toi: { name: 'Times of India', code: 'TIMESOFINDIA', domain: 'timesofindia.indiatimes.com' },
  autocar: { name: 'Autocar India', code: 'AUTOCARINDIA', domain: 'autocarindia.com' },
  cricbuzz: { name: 'Cricbuzz (mobile web)', code: 'CRICBUZZ', domain: 'cricbuzz.com' },
  ht: { name: 'Hindustan Times', code: 'HINDUSTANTIMES', domain: 'hindustantimes.com' },
  ndtv: { name: 'NDTV Auto', code: 'NDTVAUTO', domain: 'auto.ndtv.com' },
};
export const MEDIA_PLAN = [
  { site: 'toi', size: '300x250', pricing: 'CPM', rate: 180, start: '2026-10-15', end: '2026-11-15', units: '2,000,000 impressions' },
  { site: 'autocar', size: '728x90', pricing: 'CPM', rate: 240, start: '2026-10-20', end: '2026-11-10', units: '600,000 impressions' },
  { site: 'cricbuzz', size: '320x50', pricing: 'CPC', rate: 14, start: '2026-10-15', end: '2026-11-15', units: '25,000 clicks' },
  { site: 'ht', size: '300x600', pricing: 'CPM', rate: 210, start: '2026-10-25', end: '2026-11-15', units: '800,000 impressions' },
];
export const SIZES = ['300x250', '728x90', '320x50', '300x600', '160x600', '970x250'];
export const PRICING = ['CPM', 'CPC', 'Flat rate'];
export const CREATIVES = [
  { id: 'cr1', name: 'Festive_VoltS_Offer_300x250.jpg', size: '300x250' },
  { id: 'cr2', name: 'Festive_VoltS_Offer_728x90.jpg', size: '728x90' },
  { id: 'cr3', name: 'Festive_VoltS_Offer_320x50.png', size: '320x50' },
  { id: 'cr4', name: 'Festive_VoltS_Offer_300x600.jpg', size: '300x600' },
  { id: 'cr5', name: 'Festive_VoltS_Offer_160x600.jpg', size: '160x600' },
  { id: 'cr6', name: 'Festive_Cargo3W_HTML5_970x250.zip', size: '970x250' },
];
export const CM_MACROS = ['%eadv!', '%ebuy!', '%epid!', '%eaid!', '%ecid!', '%esid!'];

// ---------- Placements and ads ----------
export const placementName = (p) => `VOLTRA_FEST26_${(SITES[p.site]?.code || 'UNKNOWN')}_${p.size}_${p.pricing === 'Flat rate' ? 'FLAT' : p.pricing}`;

/** Differences between a placement and the media plan row for its site. Empty = matches. */
export function placementIssues(p) {
  const row = MEDIA_PLAN.find((r) => r.site === p.site);
  if (!row) return [`${SITES[p.site]?.name || 'This site'} is not in the media plan. You did not buy anything there.`];
  const out = [];
  if (p.size !== row.size) out.push(`Size is ${p.size}, the plan says ${row.size}.`);
  if (p.pricing !== row.pricing) out.push(`Pricing is ${p.pricing}, the plan says ${row.pricing}.`);
  if (Number(p.rate) !== row.rate) out.push(`Rate is ${inr(Number(p.rate) || 0)}, the plan says ${inr(row.rate)}.`);
  if (p.start !== row.start) out.push(`Start date is ${p.start || 'empty'}, the plan says ${row.start}.`);
  if (p.end !== row.end) out.push(`End date is ${p.end || 'empty'}, the plan says ${row.end}.`);
  if (p.start && p.end && p.start > p.end) out.push('The start date is after the end date.');
  return out;
}
/** For each media plan row: a placement that matches it exactly, or null. Prefers the most complete one. */
export function planMatches(placements) {
  return MEDIA_PLAN.map((row) => {
    const ok = placements.filter((p) => p.site === row.site && placementIssues(p).length === 0);
    return ok.find((p) => adReady(p)) || ok.find((p) => p.creative) || ok[0] || null;
  });
}
/** null if the creative can serve on the placement, else the reason. */
export function assignIssue(p, creative) {
  if (!creative) return 'Choose a creative.';
  if (creative.size !== p.size) return `Size mismatch: a ${p.size} placement cannot serve a ${creative.size} creative. CM360 only lets you assign creatives of the placement size.`;
  return null;
}

/** Problems with a click-through (landing page) URL. Empty = clean. */
export function clickUrlIssues(url) {
  const u = String(url || '').trim();
  if (!u) return ['The click-through URL is empty.'];
  if (/\s/.test(u)) return ['The URL contains spaces. Use _ or - inside values.'];
  const out = [];
  if (/%%[A-Z_]+%%/i.test(u)) out.push('%%…%% macros belong to the publisher\'s ad server tag, not to your landing page URL. They would arrive raw in GA4.');
  let parsed;
  try { parsed = new URL(u); } catch { return [...out, 'This is not a valid URL. Start with https://']; }
  if (parsed.protocol !== 'https:') out.push('Use https://. CM360 ads and Voltra\'s site are https only.');
  if (!/^(www\.)?voltramobility\.in$/.test(parsed.hostname)) out.push(`The landing page must be on voltramobility.in, not ${parsed.hostname}.`);
  if ((u.match(/\?/g) || []).length > 1) out.push('There are two "?" in the URL. Join extra parameters with "&".');
  const q = u.includes('?') ? u.slice(u.indexOf('?') + 1).split('#')[0] : '';
  const params = {};
  for (const part of q.split('&').filter(Boolean)) { const i = part.indexOf('='); params[i < 0 ? part : part.slice(0, i)] = i < 0 ? '' : part.slice(i + 1); }
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) if (!params[k]) out.push(`${k} is missing.`);
  for (const [k, v] of Object.entries(params)) {
    if (!k.startsWith('utm_')) continue;
    const macros = v.match(/%e[a-z]+!/g) || [];
    for (const m of macros) if (!CM_MACROS.includes(m)) out.push(`${m} is not a CM360 macro. Use ${CM_MACROS.join(', ')}.`);
    const plain = v.replace(/%e[a-z]+!/g, '');
    if (plain !== plain.toLowerCase()) out.push(`${k} has capital letters. GA4 treats "Display" and "display" as different values. Use lowercase.`);
    else if (/[^a-z0-9_\-.]/.test(plain)) out.push(`${k} has special characters. Use only a-z, 0-9, _ and -.`);
  }
  if (params.utm_medium && !/^(display|banner|cpm|expandable|interstitial)$/.test(params.utm_medium.toLowerCase())) out.push(`utm_medium=${params.utm_medium} does not put these clicks in GA4's Display channel. Use display.`);
  return out;
}
export function adReady(p) {
  const cr = CREATIVES.find((c) => c.id === p.creative);
  return !!cr && !assignIssue(p, cr) && clickUrlIssues(p.url).length === 0;
}

// ---------- Tag sheet ----------
export const CACHE_OPTIONS = ['[timestamp]', '%%CACHEBUSTER%%', '%%CLICK_URL_UNESC%%', '20261015'];
export const CLICK_OPTIONS = ['', '%%CLICK_URL_UNESC%%', '%%CLICK_URL_ESC%%', '%%CACHEBUSTER%%'];
export function macroIssues(m) {
  const out = [];
  if (m.cache === '[timestamp]') out.push('ord=[timestamp] is a placeholder. The publisher must replace it, or every call looks the same and can be cached.');
  else if (m.cache === '20261015') out.push('A fixed number is not a cache-buster: every ad call is the same URL again.');
  else if (m.cache !== '%%CACHEBUSTER%%') out.push(`${m.cache} is not a random number. In Google Ad Manager the cache-buster is %%CACHEBUSTER%%.`);
  if (!m.click) out.push('The click tracker is empty, so the publisher cannot count clicks on your ad.');
  else if (m.click === '%%CLICK_URL_ESC%%') out.push('%%CLICK_URL_ESC%% is URL-encoded. CM360\'s click-tracker attribute needs the unescaped version, %%CLICK_URL_UNESC%%.');
  else if (m.click !== '%%CLICK_URL_UNESC%%') out.push(`${m.click} is not a click macro.`);
  return out;
}
export function placementTag(p, m = { cache: '[timestamp]', click: '' }) {
  const [w, h] = p.size.split('x');
  const code = `N8812.${SITES[p.site]?.code || 'SITE'}/B30045678.${p.id}`;
  return `<ins class='dcmads' style='display:inline-block;width:${w}px;height:${h}px'
    data-dcm-placement='${code}'
    data-dcm-rendering-mode='iframe'
    data-dcm-https-only
    data-dcm-click-tracker='${m.click}'
    data-dcm-resettable-device-id=''
    data-dcm-app-id=''>
  <script src='https://www.googletagservices.com/dcm/dcmads.js'></script>
</ins>
<noscript><a href='https://ad.doubleclick.net/ddm/jump/${code};sz=${p.size};ord=${m.cache}?'><img src='https://ad.doubleclick.net/ddm/ad/${code};sz=${p.size};ord=${m.cache};dc_lat=;dc_rdid=;tag_for_child_directed_treatment=;tfua=?' width='${w}' height='${h}' alt=''></a></noscript>`;
}
export function tagSheetTsv(placements, m) {
  const head = ['Placement ID', 'Placement name', 'Site', 'Size', 'Start', 'End', 'Creative', 'Click-through URL', 'Tag'];
  const rows = placements.map((p) => [p.id, placementName(p), SITES[p.site]?.name, p.size, p.start, p.end, CREATIVES.find((c) => c.id === p.creative)?.name || '', p.url || '', placementTag(p, m).replace(/\s*\n\s*/g, ' ')]);
  return [head, ...rows].map((r) => r.join('\t')).join('\n');
}

// ---------- Floodlight ----------
export const FL = { src: '8812345', type: 'voltr0' };
export const GOALS = { booking: 'Booking form view', accessories: 'Accessories purchase', testride: 'Test ride booked' };
export const COUNTING = {
  counter: [['standard', 'Standard (every load)'], ['unique', 'Unique (1 per user per day)'], ['session', 'Per session']],
  sales: [['transactions', 'Transactions (1 per order)'], ['items', 'Items sold (quantity)']],
};
export const ORD = [['order', '[OrderID] (order or booking ID)'], ['random', '[Random Number]'], ['timestamp', '[Timestamp]']];
export const activityCat = (name) => (String(name).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'activ') + '0';

export function floodlightTag(a) {
  const base = `https://ad.doubleclick.net/activity;src=${FL.src};type=${FL.type};cat=${activityCat(a.name)};dc_lat=;dc_rdid=;tag_for_child_directed_treatment=;tfua=;npa=;gdpr=\${GDPR};gdpr_consent=\${GDPR_CONSENT_755};`;
  if (a.type === 'counter') {
    if (a.counting === 'unique') return base + 'ord=1;num=[Random Number]?';
    if (a.counting === 'session') return base + 'ord=[SessionID]?';
    return base + 'ord=[Random Number]?';
  }
  const ordV = { order: '[OrderID]', random: '[Random Number]', timestamp: '[Timestamp]' }[a.ord] || '[OrderID]';
  return base + (a.qty ? 'qty=[Quantity];' : '') + (a.cost ? 'cost=[Revenue];' : '') + `ord=${ordV}?`;
}
/** What is wrong with an activity for its goal. Empty = right. */
export function activityIssues(a, goal = a.goal) {
  const out = [];
  if (goal === 'booking') {
    if (a.type !== 'counter') out.push('A form view has no revenue or order ID. Use a counter activity.');
    else if (a.counting !== 'unique') out.push(a.counting === 'standard' ? 'Standard counts every page load, so one person can count 5 times. The task asks for once per person per day.' : 'Per session counts once per visit. One person on two visits a day counts twice. The task asks for once per person per day.');
  } else if (goal === 'accessories') {
    if (a.type !== 'sales') out.push('An order has revenue and an order ID. Use a sales activity.');
    else {
      if (a.counting !== 'transactions') out.push('Items sold counts the quantity (3 helmets = 3). The task asks for orders: use Transactions.');
      if (a.ord !== 'order') out.push('ord must be the order ID. Then a reload of the thank-you page sends the same ord and CM360 drops it.');
      if (!a.cost) out.push('Pass the order value in cost, or you cannot report revenue and ROAS.');
      if (!a.qty) out.push('Pass the number of items in qty.');
    }
  } else out.push('Choose what this activity measures.');
  return out;
}

// ---------- Case: Floodlight counts double ----------
export const CASE_LOG = [
  { t: 'Day 1 10:02', day: 1, user: 'u1', session: 's1', act: 'testride', id: 'TR-501', note: 'Books a test ride. Thank-you page loads.' },
  { t: 'Day 1 10:03', day: 1, user: 'u1', session: 's1', act: 'testride', id: 'TR-501', note: 'Reloads the thank-you page.' },
  { t: 'Day 1 11:20', day: 1, user: 'u2', session: 's2', act: 'accessories', id: 'AC-9001', revenue: 2400, qty: 2, note: 'Buys a helmet and a cover (₹2,400).' },
  { t: 'Day 1 11:21', day: 1, user: 'u2', session: 's2', act: 'accessories', id: 'AC-9001', revenue: 2400, qty: 2, note: 'Reloads the order confirmation.' },
  { t: 'Day 1 16:40', day: 1, user: 'u3', session: 's3', act: 'testride', id: 'TR-502', note: 'Books a test ride of the Volt S scooter.' },
  { t: 'Day 1 16:52', day: 1, user: 'u3', session: 's3', act: 'testride', id: 'TR-503', note: 'Books a second test ride: the cargo three-wheeler, at another dealer.' },
  { t: 'Day 2 09:15', day: 2, user: 'u4', session: 's4', act: 'accessories', id: 'AC-9002', revenue: 1200, qty: 1, note: 'Buys a phone mount (₹1,200).' },
  { t: 'Day 2 09:40', day: 2, user: 'u2', session: 's5', act: 'accessories', id: 'AC-9001', revenue: 2400, qty: 2, note: 'Opens yesterday\'s order confirmation again from browser history.' },
  { t: 'Day 2 12:05', day: 2, user: 'u5', session: 's6', act: 'testride', id: 'TR-504', note: 'Books a test ride.' },
  { t: 'Day 2 12:06', day: 2, user: 'u5', session: 's6', act: 'testride', id: 'TR-504', note: 'Reloads the thank-you page.' },
  { t: 'Day 2 18:30', day: 2, user: 'u1', session: 's7', act: 'accessories', id: 'AC-9003', revenue: 5600, qty: 3, note: 'Buys a charger, a helmet and a lock (₹5,600).' },
];
export const CASE_TRUTH = { testride: { conv: 4, revenue: 0 }, accessories: { conv: 3, revenue: 9200 } };
export const LEGACY = () => ({
  testride: { type: 'counter', counting: 'standard', ord: 'random', gtm: true, page: true },
  accessories: { type: 'sales', counting: 'transactions', ord: 'random', gtm: true, page: false },
});
/** Simulate the case log against a Floodlight set-up. Returns totals per activity and every hit with counted / de-duplicated. */
export function countFloodlight(cfg, log = CASE_LOG) {
  const out = {}, seen = {}, events = [];
  for (const k of Object.keys(cfg)) { out[k] = { conv: 0, revenue: 0, hits: 0 }; seen[k] = new Set(); }
  log.forEach((a, i) => {
    const c = cfg[a.act], fired = [];
    if (c) for (const src of ['gtm', 'page']) {
      if (!c[src]) continue;
      out[a.act].hits++;
      let key, ord;
      if (c.type === 'counter') {
        if (c.counting === 'unique') { key = a.user + '|' + a.day; ord = '1;num=random'; }
        else if (c.counting === 'session') { key = a.session; ord = a.session; }
        else { key = `r${i}${src}`; ord = 'random ' + (100000 + ((i * 7919 + (src === 'gtm' ? 13 : 71)) % 899999)); }
      } else if (c.ord === 'order') { key = a.id; ord = a.id; }
      else if (c.ord === 'timestamp') { key = 't' + i; ord = a.t; }
      else { key = `r${i}${src}`; ord = 'random ' + (100000 + ((i * 7919 + (src === 'gtm' ? 13 : 71)) % 899999)); }
      const counted = !seen[a.act].has(key);
      if (counted) {
        seen[a.act].add(key);
        out[a.act].conv += c.type === 'sales' && c.counting === 'items' ? (a.qty || 1) : 1;
        if (c.type === 'sales') out[a.act].revenue += a.revenue || 0;
      }
      fired.push({ src, ord, counted });
    }
    events.push({ ...a, fired });
  });
  return { out, events };
}
export function caseStatus(cfg) {
  const { out } = countFloodlight(cfg);
  const countsOk = Object.keys(CASE_TRUTH).every((k) => out[k] && out[k].conv === CASE_TRUTH[k].conv && out[k].revenue === CASE_TRUTH[k].revenue);
  const oneSource = Object.keys(CASE_TRUTH).every((k) => cfg[k] && (cfg[k].gtm ? 1 : 0) + (cfg[k].page ? 1 : 0) === 1);
  return { countsOk, oneSource, fixed: countsOk && oneSource, out };
}

/** All task ids that the state satisfies. */
export function cmChecks(S) {
  const d = [];
  const m = planMatches(S.pl || []);
  const p1 = m.every(Boolean);
  if (p1) d.push('p1');
  if (p1 && m.every((p) => { const cr = CREATIVES.find((c) => c.id === p.creative); return cr && !assignIssue(p, cr); })) d.push('p2');
  if (p1 && m.every((p) => p.url && clickUrlIssues(p.url).length === 0)) d.push('p3');
  if (p1 && S.macros && macroIssues(S.macros).length === 0) d.push('p4');
  if ((S.acts || []).some((a) => a.goal === 'booking' && activityIssues(a).length === 0)) d.push('f1');
  if ((S.acts || []).some((a) => a.goal === 'accessories' && activityIssues(a).length === 0)) d.push('f2');
  if (S.case && caseStatus(S.case).fixed) d.push('c1');
  return d;
}

// ---------- UI ----------
export function mount(el, ctx) {
  const S = ctx.state;
  S.pl ??= []; S.macros ??= { cache: '[timestamp]', click: '' }; S.acts ??= []; S.case ??= LEGACY(); S.seq ??= 0;
  const opt = (v, label, cur) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(label)}</option>`;
  el.innerHTML = `
    <section class="card">
      <p class="eyebrow">Advertiser: ${esc(CAMPAIGN.advertiser)} → Campaign: <span class="mono">${esc(CAMPAIGN.name)}</span> · 15 Oct to 15 Nov 2026</p>
      <h3 style="margin-top:0">Media plan (signed insertion orders)</h3>
      <div class="tbl"><table><thead><tr><th>Site</th><th>Size</th><th>Pricing</th><th>Rate</th><th>Start</th><th>End</th><th>Booked</th></tr></thead><tbody>
        ${MEDIA_PLAN.map((r) => `<tr><td>${esc(SITES[r.site].name)}</td><td class="mono">${r.size}</td><td>${r.pricing}</td><td>${inr(r.rate)}</td><td class="mono">${r.start}</td><td class="mono">${r.end}</td><td>${r.units}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="help">CPM = price per 1,000 impressions. CPC = price per click. Landing page: <span class="mono">${esc(CAMPAIGN.landing)}</span></p>
    </section>
    <div class="two">
      <section class="card">
        <h3 style="margin-top:0">New placement</h3>
        <div class="row">
          <div style="flex:1 1 160px"><label>Site<select class="cm-site">${Object.entries(SITES).map(([k, s]) => opt(k, s.name)).join('')}</select></label></div>
          <div style="flex:1 1 110px"><label>Size<select class="cm-size">${SIZES.map((s) => opt(s, s)).join('')}</select></label></div>
        </div>
        <div class="row">
          <div style="flex:1 1 110px"><label>Pricing<select class="cm-pr">${PRICING.map((s) => opt(s, s)).join('')}</select></label></div>
          <div style="flex:1 1 110px"><label>Rate (₹)<input class="cm-rate" type="number" min="0" step="1" /></label></div>
        </div>
        <div class="row">
          <div style="flex:1 1 140px"><label>Start date<input class="cm-start" type="date" value="${CAMPAIGN.start}" /></label></div>
          <div style="flex:1 1 140px"><label>End date<input class="cm-end" type="date" value="${CAMPAIGN.end}" /></label></div>
        </div>
        <div class="row" style="margin-top:8px"><button type="button" class="btn sm cm-add">Create placement</button></div>
        <p class="help">The placement name follows Voltra's naming convention automatically: <span class="mono">VOLTRA_FEST26_SITE_SIZE_PRICING</span>.</p>
        <h4 style="margin:14px 0 6px">Creative library</h4>
        <div class="list">${CREATIVES.map((c) => `<div class="item" style="cursor:default"><span class="mono">${esc(c.name)}</span><span class="pill">${c.size}</span></div>`).join('')}</div>
      </section>
      <section class="card">
        <h3 style="margin-top:0">Placements and ads</h3>
        <div class="cm-pl"></div>
      </section>
    </div>
    <section class="card">
      <h3 style="margin-top:0">Tag sheet (what you send to the publisher)</h3>
      <p class="help">Times of India, Autocar India, Cricbuzz and Hindustan Times all serve your tags through Google Ad Manager. Their trafficker pastes each tag into a line item, after replacing the placeholders with Ad Manager macros.</p>
      <div class="row">
        <div style="flex:1 1 220px"><label>Replace <span class="mono">ord=[timestamp]</span> with<select class="cm-cache">${CACHE_OPTIONS.map((o) => opt(o, o, S.macros.cache)).join('')}</select></label></div>
        <div style="flex:1 1 220px"><label>Click tracker (<span class="mono">data-dcm-click-tracker</span>)<select class="cm-click">${CLICK_OPTIONS.map((o) => opt(o, o || '(empty)', S.macros.click)).join('')}</select></label></div>
      </div>
      <div class="cm-macro-out"></div>
      <div class="cm-sheet"></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">Floodlight activities</h3>
      <p class="help">Floodlight configuration <span class="mono">src=${FL.src}</span> · activity group <span class="mono">type=${FL.type}</span>. The tag goes on voltramobility.in (usually through Google Tag Manager).</p>
      <div class="row">
        <div style="flex:1 1 180px"><label>What it measures<select class="fl-goal">${opt('booking', GOALS.booking)}${opt('accessories', GOALS.accessories)}</select></label></div>
        <div style="flex:1 1 180px"><label>Activity name<input class="fl-name" value="${esc(GOALS.booking)}" maxlength="60" /></label></div>
        <div style="flex:1 1 120px"><label>Type<select class="fl-type">${opt('counter', 'Counter')}${opt('sales', 'Sales')}</select></label></div>
      </div>
      <div class="row fl-dyn"></div>
      <div class="row" style="margin-top:8px"><button type="button" class="btn sm fl-add">Create activity</button></div>
      <div class="fl-list"></div>
    </section>
    <section class="card">
      <div class="row between"><h3 style="margin:0">Case: "Floodlight counts double"</h3><button type="button" class="btn sec sm cs-reset">Reload the broken set-up</button></div>
      <p class="help">The finance team says: "Floodlight shows 12 test rides and 5 accessories orders for two days. Our booking system has 4 test rides and 3 orders worth ₹9,200." An old agency set up the tags. Read the event log, then change the set-up until Floodlight matches the backend.</p>
      <div class="cs-cfg"></div>
      <div class="cs-report"></div>
      <h4 style="margin:12px 0 6px">Event log (Tag Assistant view)</h4>
      <div class="feed cs-log"></div>
    </section>`;
  const $ = (s) => el.querySelector(s);
  const check = () => { for (const id of cmChecks(S)) ctx.done(id); };

  function paintPlacements() {
    $('.cm-pl').innerHTML = S.pl.length ? S.pl.map((p) => {
      const iss = placementIssues(p), cr = CREATIVES.find((c) => c.id === p.creative);
      const urlIss = p.url ? clickUrlIssues(p.url) : [];
      const ok = iss.length === 0 && adReady(p);
      return `<div class="rec ${ok ? 'ok' : iss.length ? 'err' : ''}">
        <div class="rec-head"><b class="mono" style="overflow-wrap:anywhere">${esc(placementName(p))}</b>${iss.length ? '<span class="pill changes">Does not match the plan</span>' : ok ? '<span class="pill done">Ready to serve</span>' : '<span class="pill doing">Matches the plan</span>'}</div>
        <div class="help">ID ${p.id} · ${esc(SITES[p.site]?.name)} · ${p.size} · ${esc(p.pricing)} ${inr(p.rate)} · ${esc(p.start)} → ${esc(p.end)}</div>
        ${iss.map((x) => `<div class="err" style="font-size:13px">${esc(x)}</div>`).join('')}
        <div class="row" style="margin-top:6px"><div style="flex:1 1 220px"><label>Ad: creative<select data-cr="${p.id}"><option value="">Choose a creative</option>${CREATIVES.map((c) => opt(c.id, `${c.name} (${c.size})`, p.creative)).join('')}</select></label></div></div>
        <label>Click-through URL<input class="mono" data-url="${p.id}" value="${esc(p.url || '')}" placeholder="https://www.voltramobility.in/festive?utm_source=…" /></label>
        <div class="row" style="margin-top:6px"><button type="button" class="btn sec sm" data-saveurl="${p.id}">Save URL</button><button type="button" class="btn sec sm" data-delpl="${p.id}">Delete placement</button></div>
        ${p.url ? (urlIss.length ? urlIss.map((x) => `<div class="err" style="font-size:13px">${esc(x)}</div>`).join('') : '<div class="ok" style="font-size:13px">Click-through URL is clean.</div>') : ''}
        ${cr ? '' : '<div class="help">No creative yet.</div>'}
      </div>`;
    }).join('') : '<p class="help">No placements yet. Create one from the media plan.</p>';
  }
  function paintSheet() {
    const iss = macroIssues(S.macros);
    $('.cm-macro-out').innerHTML = iss.length ? `<div class="notice warn">${iss.map(esc).join('<br>')}</div>` : '<div class="notice ok">Macros are right: Ad Manager adds a random number to every call and wraps the click with its own tracker before it reaches CM360.</div>';
    const pls = planMatches(S.pl).filter(Boolean);
    if (!pls.length) { $('.cm-sheet').innerHTML = '<p class="help">Tags appear here when placements match the media plan.</p>'; return; }
    $('.cm-sheet').innerHTML = `<div class="tbl"><table><thead><tr><th>Placement</th><th>Creative</th><th>Click-through URL</th></tr></thead><tbody>${pls.map((p) => `<tr><td class="mono" style="text-align:left">${p.id}<br>${esc(placementName(p))}</td><td style="text-align:left">${esc(CREATIVES.find((c) => c.id === p.creative)?.name || '(none)')}</td><td class="mono" style="text-align:left;overflow-wrap:anywhere">${esc(p.url || '(none)')}</td></tr>`).join('')}</tbody></table></div>
      <h4 style="margin:10px 0 4px">Tag for ${esc(placementName(pls[0]))}</h4><pre class="mono mtb-pre">${esc(placementTag(pls[0], S.macros))}</pre>
      <label>Export (tab-separated, paste into Google Sheets)<textarea class="mono" rows="4" readonly>${esc(tagSheetTsv(pls, S.macros))}</textarea></label>`;
  }
  function paintFlForm() {
    const type = $('.fl-type').value;
    $('.fl-dyn').innerHTML = `<div style="flex:1 1 200px"><label>Counting method<select class="fl-count">${COUNTING[type].map(([v, l]) => opt(v, l)).join('')}</select></label></div>` + (type === 'sales'
      ? `<div style="flex:1 1 200px"><label>ord =<select class="fl-ord">${ORD.map(([v, l]) => opt(v, l)).join('')}</select></label></div>
         <div style="flex:1 1 140px"><label>cost =<select class="fl-cost">${opt('1', '[Revenue] order value')}${opt('', '(not set)')}</select></label></div>
         <div style="flex:1 1 140px"><label>qty =<select class="fl-qty">${opt('1', '[Quantity] items')}${opt('', '(not set)')}</select></label></div>` : '');
  }
  function paintActs() {
    $('.fl-list').innerHTML = S.acts.length ? S.acts.map((a, i) => {
      const iss = activityIssues(a);
      return `<div class="rec ${iss.length ? 'err' : 'ok'}"><div class="rec-head"><b>${esc(a.name)}</b><span><span class="pill">${a.type}</span> <span class="pill">${esc(COUNTING[a.type].find((x) => x[0] === a.counting)?.[1] || a.counting)}</span></span></div>
        <div class="help">Measures: ${esc(GOALS[a.goal])}</div>
        <pre class="mono mtb-pre">${esc(floodlightTag(a))}</pre>
        ${iss.length ? iss.map((x) => `<div class="err" style="font-size:13px">${esc(x)}</div>`).join('') : '<div class="ok" style="font-size:13px">Right set-up for this goal.</div>'}
        <button type="button" class="btn sec sm" data-delact="${i}" style="margin-top:6px">Delete</button></div>`;
    }).join('') : '<p class="help">No activities yet.</p>';
  }
  function paintCase() {
    const C = S.case;
    $('.cs-cfg').innerHTML = `<div class="two">${Object.keys(CASE_TRUTH).map((k) => {
      const c = C[k];
      return `<div class="rec"><b>${esc(GOALS[k])}</b>
        <div class="row"><div style="flex:1 1 120px"><label>Type<select data-cs="${k}" data-f="type">${opt('counter', 'Counter', c.type)}${opt('sales', 'Sales', c.type)}</select></label></div>
        <div style="flex:1 1 180px"><label>Counting method<select data-cs="${k}" data-f="counting">${COUNTING[c.type].map(([v, l]) => opt(v, l, c.counting)).join('')}</select></label></div></div>
        ${c.type === 'sales' ? `<label>ord =<select data-cs="${k}" data-f="ord">${ORD.map(([v, l]) => opt(v, l, c.ord)).join('')}</select></label>` : '<p class="help">Counters set ord from the counting method.</p>'}
        <label class="w-check"><input type="checkbox" data-cs="${k}" data-f="gtm"${c.gtm ? ' checked' : ''}> Fired by a GTM tag</label>
        <label class="w-check"><input type="checkbox" data-cs="${k}" data-f="page"${c.page ? ' checked' : ''}> Hard-coded in the page source</label>
      </div>`;
    }).join('')}</div>`;
    const st = caseStatus(C);
    const row = (k, label) => { const o = st.out[k], t = CASE_TRUTH[k]; const ok = o.conv === t.conv && o.revenue === t.revenue; return `<tr><td>${label}</td><td>${o.hits}</td><td class="${ok ? 'ok' : 'err'}">${o.conv}${k === 'accessories' ? ' · ' + inr(o.revenue) : ''}</td><td>${t.conv}${k === 'accessories' ? ' · ' + inr(t.revenue) : ''}</td></tr>`; };
    $('.cs-report').innerHTML = `<div class="tbl"><table><thead><tr><th>Activity</th><th>Tag hits</th><th>Floodlight conversions</th><th>Backend</th></tr></thead><tbody>${row('testride', 'Test ride booked')}${row('accessories', 'Accessories purchase')}</tbody></table></div>
      ${st.fixed ? '<div class="notice ok"><strong>Fixed.</strong> Floodlight matches the backend and each tag fires from one place. Reloads now send the same ord, so CM360 drops them.</div>' : st.countsOk ? '<div class="notice warn">The numbers match because ord removes the duplicates, but the tag still fires from two places (or none). Keep one deployment: two copies double the requests and break again when someone changes one copy.</div>' : ''}`;
    const { events } = countFloodlight(C);
    $('.cs-log').innerHTML = events.map((e) => `<div class="ev"><div class="row between"><b>${esc(e.t)} · ${esc(e.user)}</b><span class="mono">${esc(e.act === 'testride' ? e.id : e.id + ' · ' + inr(e.revenue))}</span></div><div class="help">${esc(e.note)}</div>
      ${e.fired.length ? e.fired.map((f) => `<div class="mono">${f.src === 'gtm' ? 'GTM tag' : 'Page source'} → ord=${esc(f.ord)} · ${f.counted ? '<span class="ok">counted</span>' : '<span class="help">duplicate, not counted</span>'}</div>`).join('') : '<div class="help">No Floodlight tag fired.</div>'}</div>`).join('');
  }
  function paintAll() { paintPlacements(); paintSheet(); paintActs(); paintCase(); }

  $('.cm-add').addEventListener('click', () => {
    const p = { site: $('.cm-site').value, size: $('.cm-size').value, pricing: $('.cm-pr').value, rate: Number($('.cm-rate').value), start: $('.cm-start').value, end: $('.cm-end').value };
    if (!(p.rate > 0)) return ctx.toast('Type the rate from the media plan.');
    S.seq += 1; p.id = 401230000 + S.seq;
    S.pl.push(p); ctx.save(); ctx.act();
    const iss = placementIssues(p);
    ctx.toast(iss.length ? 'Placement created, but it does not match the plan. Read the red lines.' : 'Placement created and matches the plan.');
    paintPlacements(); paintSheet(); check();
  });
  $('.fl-type').addEventListener('change', paintFlForm);
  $('.fl-goal').addEventListener('change', () => { $('.fl-name').value = GOALS[$('.fl-goal').value]; });
  $('.fl-add').addEventListener('click', () => {
    const type = $('.fl-type').value;
    const a = { goal: $('.fl-goal').value, name: $('.fl-name').value.trim() || GOALS[$('.fl-goal').value], type, counting: $('.fl-count').value };
    if (type === 'sales') { a.ord = $('.fl-ord').value; a.cost = !!$('.fl-cost').value; a.qty = !!$('.fl-qty').value; }
    S.acts.push(a); ctx.save(); ctx.act(); paintActs(); check();
  });
  $('.cm-cache').addEventListener('change', (e) => { S.macros.cache = e.target.value; ctx.save(); ctx.act(); paintSheet(); check(); });
  $('.cm-click').addEventListener('change', (e) => { S.macros.click = e.target.value; ctx.save(); ctx.act(); paintSheet(); check(); });
  $('.cs-reset').addEventListener('click', () => { S.case = LEGACY(); ctx.save(); paintCase(); ctx.toast('Broken set-up loaded again.'); });

  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.cr) {
      const p = S.pl.find((x) => String(x.id) === t.dataset.cr), cr = CREATIVES.find((c) => c.id === t.value);
      if (!p) return;
      if (!t.value) { delete p.creative; } else {
        const iss = assignIssue(p, cr);
        if (iss) { ctx.toast(iss); t.value = p.creative || ''; return; }
        p.creative = cr.id;
      }
      ctx.save(); ctx.act(); paintPlacements(); paintSheet(); check();
    }
    if (t.dataset.cs) {
      const c = S.case[t.dataset.cs], f = t.dataset.f;
      if (f === 'gtm' || f === 'page') c[f] = t.checked;
      else c[f] = t.value;
      if (f === 'type') c.counting = COUNTING[c.type][0][0];
      ctx.save(); ctx.act(); paintCase(); check();
    }
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.saveurl) {
      const p = S.pl.find((x) => String(x.id) === b.dataset.saveurl);
      const inp = el.querySelector(`[data-url="${b.dataset.saveurl}"]`);
      if (!p || !inp) return;
      p.url = inp.value.trim(); ctx.save(); ctx.act();
      ctx.toast(clickUrlIssues(p.url).length ? 'Saved, but the URL has problems. Read the red lines.' : 'Click-through URL saved.');
      paintPlacements(); paintSheet(); check();
    }
    if (b.dataset.delpl) { S.pl = S.pl.filter((x) => String(x.id) !== b.dataset.delpl); ctx.save(); paintPlacements(); paintSheet(); }
    if (b.dataset.delact) { S.acts.splice(+b.dataset.delact, 1); ctx.save(); paintActs(); }
  });
  paintFlForm();
  paintAll();
  check();
}
