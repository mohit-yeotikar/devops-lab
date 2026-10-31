// Lab mk-hubspot: HubSpot lifecycle stages, lead scoring, MQL quality vs dealer bookings, a routing workflow,
// lead status vs lifecycle stage, and offline conversions to Google Ads. Simplified simulator, fake data.

export const lab = {
  id: 'mk-hubspot', track: 'martech', kind: 'widget', title: 'HubSpot lifecycle, lead scoring and workflows', topic: 'CRM', minutes: 35, sprints: ['m11'],
  summary: 'Score 30 Voltra leads, set the MQL line, check it against real dealer bookings, fix the routing workflow, and send good leads back to Google Ads.',
  intro: [
    'This is a simplified HubSpot simulator with 30 fake Voltra contacts. Each one has a source, a city, web behaviour, email engagement and a budget answer. The last column shows what the dealer reported: booked or not.',
    'A lead score adds points for buying signals and removes points for bad signals. Contacts at or above your threshold become MQLs (marketing qualified leads) and go to a dealer. Precision = how many MQLs booked. Recall = how many real bookers you caught.',
    'Then you fix the workflow that sends MQLs to dealers, and answer two questions that every CRM lead gets: lifecycle stage vs lead status, and sending qualified leads back to Google Ads.',
  ],
  tasks: [
    { id: 'hs1', text: 'Build a lead score with at least 3 positive and 2 negative criteria.', why: 'A score with only positive points rewards curiosity. Negative points remove students, job seekers and people with no budget.', hint: 'Give points to the green rows (e.g. test ride +30, price page +10) and minus points to the red rows (e.g. student −15, no budget −20).' },
    { id: 'hs2', text: 'Measure your MQLs: type their precision and recall.', why: 'Dealers judge marketing by precision (do MQLs book?). The business also needs recall (do we miss buyers?).', hint: 'Precision = MQLs that booked ÷ all MQLs. Recall = MQLs that booked ÷ all contacts that booked. Count the table rows.' },
    { id: 'hs3', text: 'Case "dealers say leads are bad": reach an MQL booking rate of 60% or more while keeping 80% or more of the real bookers.', why: 'Raising the threshold alone cuts real buyers too. Better signals fix quality without losing volume.', hint: 'Add budget "ready" +15 and B2B fleet +20, use the negative criteria, then try a threshold around 40.' },
    { id: 'hs4', text: 'Fix the dealer-routing workflow until it has no errors.', why: 'A broken workflow sends leads to nobody, or spams dealers with the same lead again and again.', hint: 'Trigger on lifecycle stage = MQL. Assign the owner first, then task and internal email, then a delay, then a branch. Re-enrol only on a new test-ride form. Give every city an owner or a fallback.' },
    { id: 'hs5', text: 'Answer the guided question: lifecycle stage or lead status?', why: 'Mixing the two breaks every funnel report in HubSpot.', hint: 'Lifecycle stage is where the person is in the funnel and moves forward. Lead status is what sales is doing with them right now.' },
    { id: 'hs6', text: 'Answer both guided questions on offline conversions to Google Ads.', why: 'Smart bidding optimises to what you send it. Send qualified leads and bookings, not raw form fills.', hint: 'Think about the gclid stored on the contact, and the 90-day limit after the click.' },
  ],
  quiz: [
    { q: 'Your MQL booking rate is 25% and dealers complain. What is the best first move?', options: ['Raise the threshold until only 5 MQLs remain', 'Add negative criteria (students, job seekers, no budget) and stronger buying signals, then check precision and recall against bookings', 'Stop scoring and send every lead to dealers', 'Give dealers fewer cities'], answer: 1, why: 'Raising the threshold alone also drops real buyers. Better criteria raise precision while keeping recall.' },
    { q: 'A dealer called an SQL. The person will buy after Diwali. What changes in HubSpot?', options: ['Lifecycle stage goes back to Lead', 'Lead status becomes "Bad timing" with a follow-up task; the lifecycle stage stays', 'The contact is deleted', 'Lifecycle stage becomes Other'], answer: 1, why: 'Lifecycle stage moves forward only. Lead status records the sales situation inside the stage.' },
    { q: 'Why store the gclid on the HubSpot contact?', options: ['For GDPR', 'So a later CRM stage (SQL, booking) can be uploaded to Google Ads and matched to the ad click', 'To score the lead', 'HubSpot needs it to send email'], answer: 1, why: 'The gclid links the CRM outcome to the click. Upload within 90 days of the click so it counts.' },
  ],
};

/* ---------------- data ---------------- */
// mail: none | open | click | bounce. budget: yes | unsure | no. fleet: number of three-wheelers (B2B), 0 = consumer.
const C = (n, src, city, pages, price, ride, mail, budget, o = {}) => ({ n, src, city, pages, price, ride, mail, budget, fleet: 0, student: false, jobs: false, gclid: src === 'Google Ads', booked: false, fb: '', ...o });
export const CONTACTS = [
  C('Ananya Rao', 'Google Ads', 'Pune', 7, true, true, 'click', 'yes', { booked: true, fb: 'Booked the Volt S on the test ride day.' }),
  C('Rahul Mehta', 'Meta lead form', 'Bengaluru', 4, true, true, 'open', 'yes', { booked: true, fb: 'Booked after a second test ride.' }),
  C('Sharma Logistics', 'Organic', 'Lucknow', 6, true, false, 'click', 'yes', { fleet: 12, booked: true, fb: 'Fleet order: 12 Cargo 3W.' }),
  C('Priya Nair', 'Dealer referral', 'Kochi', 2, false, true, 'none', 'yes', { booked: true, fb: 'Referred by her brother. Booked.' }),
  C('Vikram Singh', 'Google Ads', 'Jaipur', 5, true, true, 'open', 'unsure', { booked: true, fb: 'Booked with EMI.' }),
  C('Kiran Patel', 'Organic', 'Surat', 8, true, false, 'click', 'yes', { booked: true, fb: 'Booked in the showroom, no test ride.' }),
  C('QuickKart Deliveries', 'Google Ads', 'Bengaluru', 3, true, false, 'open', 'yes', { fleet: 25, booked: true, fb: 'Fleet pilot: 25 Cargo 3W.' }),
  C('Sneha Kulkarni', 'YouTube', 'Nagpur', 6, true, true, 'click', 'yes', { booked: true, fb: 'Booked. Saw the YouTube review first.' }),
  C('Arjun Das', 'Meta lead form', 'Guwahati', 3, false, true, 'none', 'yes', { booked: true, fb: 'Drove 2 hours to the nearest dealer. Booked.' }),
  C('Meera Iyer', 'Direct', 'Delhi', 2, true, false, 'none', 'unsure', { booked: true, fb: 'Walked in and booked. Few online signals.' }),
  C('Rohan Joshi', 'Google Ads', 'Pune', 9, true, true, 'open', 'no', { student: true, fb: 'College student. Wanted a ride for a project.' }),
  C('Aditi Verma', 'Meta lead form', 'Bengaluru', 6, true, false, 'click', 'no', { student: true, fb: 'Student, no budget.' }),
  C('Karan Malhotra', 'Organic', 'Delhi', 12, true, false, 'open', 'unsure', { jobs: true, fb: 'Asked about jobs at Voltra.' }),
  C('Neha Gupta', 'Google Ads', 'Delhi', 3, true, true, 'open', 'no', { fb: '"Just exploring EVs."' }),
  C('Sameer Khan', 'YouTube', 'Jaipur', 5, false, true, 'open', 'no', { fb: 'No budget this year.' }),
  C('Pooja Shah', 'Meta lead form', 'Indore', 7, true, false, 'open', 'unsure', { fb: 'Bought a petrol scooter.' }),
  C('Dev Tiwari', 'Meta lead form', 'Lucknow', 2, false, true, 'open', 'no', { fb: 'Did not pick up 4 calls.' }),
  C('Ishaan Bose', 'Google Ads', 'Indore', 3, true, true, 'open', 'no', { student: true, fb: 'Student. Test ride for fun.' }),
  C('Tanvi Desai', 'Organic', 'Pune', 6, true, false, 'bounce', 'unsure', { fb: 'Wrong phone number.' }),
  C('Farhan Ali', 'Organic', 'Bengaluru', 15, false, false, 'click', 'unsure', { jobs: true, fb: 'Job seeker. Sent his CV.' }),
  C('Lakshmi Menon', 'Google Ads', 'Kochi', 4, true, true, 'open', 'unsure', { fb: 'EMI was not approved.' }),
  C('Manoj Yadav', 'Meta lead form', 'Surat', 1, false, false, 'none', 'no', { fb: 'Did not remember filling a form.' }),
  C('Ritu Saxena', 'Meta lead form', 'Nagpur', 2, false, false, 'open', 'unsure', { fb: 'No answer.' }),
  C('Gaurav Bora', 'Organic', 'Guwahati', 3, false, false, 'none', 'no', { fb: 'No dealer nearby, not interested.' }),
  C('Ravi Transport', 'Organic', 'Indore', 3, true, false, 'open', 'unsure', { fleet: 2, fb: 'Two vehicles only. Not now.' }),
  C('Anil Chauhan', 'Meta lead form', 'Jaipur', 2, false, false, 'bounce', 'no', { fb: 'Fake email.' }),
  C('Sunita Reddy', 'Meta lead form', 'Delhi', 1, false, false, 'none', 'unsure', { fb: 'No answer.' }),
  C('Nikhil Pillai', 'YouTube', 'Kochi', 4, true, false, 'click', 'no', { student: true, fb: 'Student, writing a blog post.' }),
  C('Divya Krishnan', 'YouTube', 'Bengaluru', 4, false, false, 'open', 'unsure', { fb: 'Maybe next year.' }),
  C('Harsh Agarwal', 'Google Ads', 'Lucknow', 3, true, false, 'open', 'yes', { fb: 'Bought a rival EV, cheaper.' }),
];
export const CITIES = [...new Set(CONTACTS.map((c) => c.city))];

export const CRITERIA = [
  { id: 'ride', group: 'pos', label: 'Submitted the test-ride form', test: (c) => c.ride },
  { id: 'price', group: 'pos', label: 'Viewed the price / EMI page', test: (c) => c.price },
  { id: 'pages', group: 'pos', label: 'Viewed 5 or more pages', test: (c) => c.pages >= 5 },
  { id: 'open', group: 'pos', label: 'Opened a marketing email', test: (c) => c.mail === 'open' || c.mail === 'click' },
  { id: 'click', group: 'pos', label: 'Clicked a link in a marketing email', test: (c) => c.mail === 'click' },
  { id: 'budget', group: 'pos', label: 'Budget answer: "ready to buy in 3 months"', test: (c) => c.budget === 'yes' },
  { id: 'fleet', group: 'pos', label: 'B2B: fleet of 5 or more three-wheelers', test: (c) => c.fleet >= 5 },
  { id: 'dealer', group: 'pos', label: 'Source is a dealer referral', test: (c) => c.src === 'Dealer referral' },
  { id: 'student', group: 'neg', label: 'Student email (.ac.in or .edu)', test: (c) => c.student },
  { id: 'nobudget', group: 'neg', label: 'Budget answer: "no budget, just looking"', test: (c) => c.budget === 'no' },
  { id: 'jobs', group: 'neg', label: 'Viewed the careers page (job seeker)', test: (c) => c.jobs },
  { id: 'bounce', group: 'neg', label: 'Email hard-bounced', test: (c) => c.mail === 'bounce' },
];
/** The agency's set-up the learner inherits: positive points only, low threshold. */
export const AGENCY = { points: { ride: 30, price: 10, pages: 10, open: 10 }, threshold: 20 };
export const TARGET = { precision: 0.6, recall: 0.8 };

/* ---------------- scoring logic ---------------- */
export function scoreOf(c, pts) {
  let s = 0;
  for (const k of CRITERIA) if (k.test(c)) s += Number(pts[k.id]) || 0;
  return s;
}
export function evaluate(pts, threshold, contacts = CONTACTS) {
  const rows = contacts.map((c) => { const s = scoreOf(c, pts); return { c, s, mql: s >= threshold }; });
  const mqls = rows.filter((r) => r.mql).length;
  const tp = rows.filter((r) => r.mql && r.c.booked).length;
  const bookers = rows.filter((r) => r.c.booked).length;
  return { rows, mqls, tp, bookers, precision: mqls ? tp / mqls : 0, recall: bookers ? tp / bookers : 0 };
}
/** Counts criteria used with the right sign. Returns { pos, neg, flipped: [labels with the wrong sign] }. */
export function modelShape(pts) {
  let pos = 0, neg = 0; const flipped = [];
  for (const k of CRITERIA) {
    const v = Number(pts[k.id]) || 0;
    if (!v) continue;
    if (k.group === 'pos' && v > 0) pos++;
    else if (k.group === 'neg' && v < 0) neg++;
    else flipped.push(k.label);
  }
  return { pos, neg, flipped };
}
export const meetsTarget = (ev) => ev.precision >= TARGET.precision && ev.recall >= TARGET.recall;
/** Typed percentage close to the truth (±1.5 points). */
export const pctClose = (typed, truth) => { const v = Number(String(typed).replace(/[^0-9.\-]/g, '')); return String(typed).trim() !== '' && Number.isFinite(v) && Math.abs(v - truth * 100) <= 1.5; };

/* ---------------- workflow logic ---------------- */
export const DEALERS = { Pune: 'Sai Motors, Pune', Bengaluru: 'GreenWheel, Bengaluru', Delhi: 'Capital EV, Delhi', Jaipur: 'Pink City EV, Jaipur', Lucknow: 'Awadh Motors, Lucknow', Surat: 'Tapi EV, Surat', Indore: 'Malwa Motors, Indore', Kochi: 'Coastline EV, Kochi', Nagpur: 'Orange City EV, Nagpur' };
export const INSIDE = 'Inside sales team (HQ)';
export const TRIGGERS = { created: 'Contact is created', form: 'Any form is submitted', score: 'HubSpot score is above 20', mql: 'Lifecycle stage is Marketing qualified lead' };
export const REENROL = { off: 'Off (never re-enrol)', any: 'Re-enrol when any property changes', form: 'Re-enrol when the test-ride form is submitted again' };
export const STEP_TYPES = {
  owner: 'Rotate/assign contact owner by city (dealer map)',
  task: 'Create task for the contact owner: call within 2 working hours',
  notify: 'Send internal email to the contact owner',
  delay: 'Delay 1 business day',
  branch: 'Branch: if lead status is still "New", reassign to inside sales and alert the regional manager',
  mail: 'Send marketing email "Your test ride" to the contact',
};
export function startWorkflow() {
  const map = {};
  for (const c of ['Pune', 'Bengaluru', 'Delhi', 'Jaipur', 'Lucknow', 'Surat', 'Indore']) map[c] = DEALERS[c];
  return { trigger: 'created', reenrol: 'any', steps: ['task', 'owner', 'notify'], map, fallback: '' };
}
/** Returns { errors: [], warnings: [] } in plain words. */
export function validateWorkflow(wf, cities = CITIES) {
  const errors = [], warnings = [];
  const st = wf.steps || [];
  const at = (t) => st.indexOf(t);
  if (wf.trigger === 'created') errors.push('Trigger "contact is created" sends every new contact to a dealer, including students and job seekers. Trigger on lifecycle stage = MQL.');
  else if (wf.trigger === 'form') errors.push('Trigger "any form" includes newsletter and careers forms. Trigger on lifecycle stage = MQL, which your score sets.');
  else if (wf.trigger === 'score') errors.push('A score trigger copies the MQL rule into a second place. When you change the threshold, the two drift apart. Trigger on lifecycle stage = MQL.');
  if (wf.reenrol === 'any') errors.push('Re-enrolment on any property change re-runs the workflow every time an email is opened: the dealer gets the same lead again and again.');
  else if (wf.reenrol === 'off') errors.push('Re-enrolment is off. A contact who asks for a test ride again in 3 months never reaches a dealer again. Re-enrol on a new test-ride form submission.');
  if (at('owner') < 0) errors.push('No owner is assigned. Tasks and internal emails need a contact owner.');
  else {
    if (at('task') >= 0 && at('task') < at('owner')) errors.push('The task is created before the owner is assigned, so it has no owner.');
    if (at('notify') >= 0 && at('notify') < at('owner')) errors.push('The internal email runs before the owner is assigned, so nobody gets it.');
  }
  if (at('task') < 0) errors.push('Add a task: dealers work from a task list with a due time, not from emails.');
  if (at('notify') < 0) errors.push('Add the internal email so the dealer knows at once.');
  if (at('branch') < 0) errors.push('Add the branch: if nobody calls the lead, it must be escalated, not forgotten.');
  else if (at('delay') < 0 || at('delay') > at('branch')) errors.push('The branch runs seconds after assignment, when the lead status is always still "New". Put a delay before the branch.');
  const missing = cities.filter((c) => !wf.map?.[c]);
  if (missing.length && !wf.fallback) errors.push(`No owner for leads from ${missing.join(', ')}. Map each city to a dealer, or set a fallback owner.`);
  if (st.includes('mail')) warnings.push('A marketing email inside a sales-routing workflow is fine, but the contact must have marketing consent.');
  if (st.length > new Set(st).size) warnings.push('Some steps appear twice.');
  return { errors, warnings };
}

/* ---------------- guided questions ---------------- */
export const QUESTIONS = [
  { id: 'q-life', task: 'hs5', q: 'Dealer Amit called Rahul (lifecycle stage: Sales qualified lead). Rahul wants the scooter, but only after Diwali, in 3 months. What do you change in HubSpot?',
    o: ['Move the lifecycle stage back to Lead', 'Keep the lifecycle stage. Set lead status to "Bad timing" and create a follow-up task for the date', 'Delete the contact so dealers do not see him', 'Set the lifecycle stage to Other'], c: 1,
    x: 'Lifecycle stage says where a person is in the funnel (Subscriber → Lead → MQL → SQL → Opportunity → Customer). It moves forward only; moving it back breaks funnel and conversion reports. Lead status (New, Attempted to contact, Connected, Bad timing, Unqualified) is the sales team\'s working state inside a stage.' },
  { id: 'q-gclid', task: 'hs6', q: 'How do you send "qualified lead" and "booking" from HubSpot back to Google Ads?',
    o: ['Ask dealers to email a spreadsheet of names to the agency each month', 'Save the gclid in a hidden form field on the contact (plus consented, hashed email and phone). When the lifecycle stage becomes SQL or Customer, upload an offline conversion with the gclid, the conversion action and the conversion time', 'Put the Google Ads tag on the showroom Wi-Fi page', 'Type the MQL count into the campaign notes'], c: 1,
    x: 'The gclid links the CRM outcome to the ad click. Hashed email and phone (enhanced conversions for leads) match the rest. Then bidding can optimise for SQLs and bookings instead of raw form fills.' },
  { id: 'q-time', task: 'hs6', q: 'Arjun clicked a Google ad on 2 March, became an MQL on 4 March and booked on 15 June. Your booking upload runs on 16 June. What happens?',
    o: ['It is counted: any date works', 'It is not counted: the booking is more than 90 days after the click, outside the longest click-through window. Also upload an earlier stage (SQL) that happens within days, and upload every day', 'It is counted twice', 'Google Ads moves it to the MQL action'], c: 1,
    x: 'Offline conversions must fall inside the conversion window, at most 90 days after the click. Long dealer cycles need an earlier, well-defined stage (SQL or test ride done). Daily uploads help Smart bidding learn quickly.' },
];

/* ---------------- UI ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
const pc = (x) => (x * 100).toFixed(0) + '%';

export function mount(el, ctx) {
  const S = ctx.state;
  S.pts ??= { ...AGENCY.points };
  S.th ??= AGENCY.threshold;
  S.wf ??= startWorkflow();
  S.ans ??= {};
  el.innerHTML = `
    <section class="card">
      <div class="row between"><h3 style="margin:0">1 · Lead score</h3><button type="button" class="btn sec sm hs-reset">Back to the agency set-up</button></div>
      <p class="help">You inherit the agency's score: positive points only, threshold 20. Change the points (minus numbers for bad signals) and the threshold. The table below updates at once.</p>
      <div class="two">
        <div><h4>Buying signals</h4><div class="hs-crit" data-g="pos"></div></div>
        <div><h4>Bad signals</h4><div class="hs-crit" data-g="neg"></div>
          <label style="margin-top:12px">MQL threshold (score at or above = MQL)<input type="number" class="hs-th" step="5" min="0" max="200" /></label></div>
      </div>
      <div class="kpis hs-kpis"></div>
      <div class="hs-shape"></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">2 · Contacts and dealer outcomes</h3>
      <p class="help">30 contacts from the last month. "Booked" comes from dealer feedback 30 days later. gclid = the contact clicked a Google ad.</p>
      <div class="tbl"><table class="hs-table mtc-small"></table></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">3 · Measure your MQLs</h3>
      <p class="help">Count from the table, using your current score. Type percentages.</p>
      <div class="row">
        <div style="flex:1 1 140px"><label>Precision (MQL booking rate) %<input class="hs-p" type="text" inputmode="decimal" /></label></div>
        <div style="flex:1 1 140px"><label>Recall (bookers caught) %<input class="hs-r" type="text" inputmode="decimal" /></label></div>
        <button type="button" class="btn sm hs-measure">Check</button>
      </div>
      <div class="hs-mout"></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">4 · Workflow: send MQLs to the right dealer</h3>
      <p class="help">The agency built this workflow. Dealers say they get leads twice, some get none, and leads from three cities vanish. Fix it.</p>
      <div class="two">
        <div>
          <label>Enrolment trigger<select class="wf-trig">${Object.entries(TRIGGERS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
          <label style="margin-top:8px">Re-enrolment<select class="wf-re">${Object.entries(REENROL).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
          <h4 style="margin:14px 0 6px">Actions, in order</h4>
          <ol class="steps wf-steps"></ol>
          <div class="row" style="margin-top:8px"><select class="wf-add" aria-label="Action to add">${Object.entries(STEP_TYPES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select><button type="button" class="btn sec sm wf-addbtn">Add action</button></div>
        </div>
        <div>
          <h4 style="margin:0 0 6px">Owner by city</h4>
          <div class="tbl"><table class="wf-map"></table></div>
          <label>Fallback owner when a city has no dealer<select class="wf-fb"><option value="">None</option><option value="${esc(INSIDE)}">${esc(INSIDE)}</option></select></label>
        </div>
      </div>
      <div class="row" style="margin-top:12px"><button type="button" class="btn sm wf-check">Validate workflow</button></div>
      <div class="wf-out"></div>
    </section>
    <section class="card"><h3 style="margin-top:0">5 · Guided questions</h3><div class="hs-q"></div></section>`;
  const $ = (s) => el.querySelector(s);

  function crit() {
    for (const box of el.querySelectorAll('.hs-crit')) {
      box.innerHTML = CRITERIA.filter((k) => k.group === box.dataset.g).map((k) => `<label class="row between mtc-crit"><span>${esc(k.label)}</span><input type="number" step="5" min="-100" max="100" data-k="${k.id}" value="${Number(S.pts[k.id]) || 0}" aria-label="Points for ${esc(k.label)}" /></label>`).join('');
    }
    $('.hs-th').value = S.th;
  }
  function render() {
    const ev = evaluate(S.pts, S.th);
    $('.hs-kpis').innerHTML = `<div><span class="eyebrow">MQLs</span><span class="big">${ev.mqls}</span></div><div><span class="eyebrow">MQLs that booked</span><span class="big">${ev.tp}</span></div><div><span class="eyebrow">Bookers missed</span><span class="big">${ev.bookers - ev.tp}</span></div><div><span class="eyebrow">Target</span><span class="big">≥ ${pc(TARGET.precision)} / ≥ ${pc(TARGET.recall)}</span></div>`;
    const sh = modelShape(S.pts);
    const notes = [];
    if (sh.flipped.length) notes.push(`<div class="notice warn">Wrong sign: ${sh.flipped.map(esc).join('; ')}. Buying signals add points, bad signals remove them.</div>`);
    if (ctx.isDone('hs2')) notes.push(`<div class="notice ${meetsTarget(ev) ? 'ok' : ''}">Precision <b>${pc(ev.precision)}</b> · recall <b>${pc(ev.recall)}</b>. ${meetsTarget(ev) ? 'Dealers get fewer, better leads and you still catch most buyers.' : 'Target: precision 60% or more and recall 80% or more.'}</div>`);
    $('.hs-shape').innerHTML = notes.join('');
    if (sh.pos >= 3 && sh.neg >= 2 && !sh.flipped.length) ctx.done('hs1');
    if (ctx.isDone('hs1') && meetsTarget(ev)) ctx.done('hs3');
    const yn = (b) => (b ? 'Yes' : '–');
    $('.hs-table').innerHTML = `<thead><tr><th>Contact</th><th>Source</th><th>City</th><th>Pages</th><th>Price page</th><th>Test ride</th><th>Email</th><th>Budget</th><th>Fleet</th><th>gclid</th><th>Score</th><th>Stage</th><th>Dealer outcome</th></tr></thead><tbody>${ev.rows.map(({ c, s, mql }) => `<tr class="${mql && !c.booked ? 'mtc-fp' : ''}"><td><b>${esc(c.n)}</b>${c.student ? ' <span class="pill">student</span>' : ''}${c.jobs ? ' <span class="pill">careers</span>' : ''}</td><td>${esc(c.src)}</td><td>${esc(c.city)}</td><td>${c.pages}</td><td>${yn(c.price)}</td><td>${yn(c.ride)}</td><td>${esc(c.mail)}</td><td>${esc(c.budget)}</td><td>${c.fleet || '–'}</td><td>${yn(c.gclid)}</td><td><b>${s}</b></td><td>${mql ? '<span class="pill review">MQL</span>' : '<span class="pill">Lead</span>'}</td><td style="text-align:left">${c.booked ? '<span class="pill done">Booked</span> ' : '<span class="pill changes">No</span> '}<span class="help">${esc(c.fb)}</span></td></tr>`).join('')}</tbody>`;
  }
  el.addEventListener('input', (e) => {
    const k = e.target.dataset?.k;
    if (k) { S.pts[k] = Math.max(-100, Math.min(100, Number(e.target.value) || 0)); ctx.save(); render(); }
    if (e.target.classList.contains('hs-th')) { S.th = Number(e.target.value) || 0; ctx.save(); render(); }
  });
  el.addEventListener('change', (e) => { if (e.target.dataset?.k || e.target.classList.contains('hs-th')) ctx.act(); });
  $('.hs-reset').addEventListener('click', () => { S.pts = { ...AGENCY.points }; S.th = AGENCY.threshold; ctx.save(); crit(); render(); });
  $('.hs-measure').addEventListener('click', () => {
    ctx.act();
    const ev = evaluate(S.pts, S.th);
    const okP = pctClose($('.hs-p').value, ev.precision), okR = pctClose($('.hs-r').value, ev.recall);
    if (okP && okR) { ctx.done('hs2'); $('.hs-mout').innerHTML = `<div class="notice ok"><strong>Right.</strong> ${ev.tp} of ${ev.mqls} MQLs booked = ${pc(ev.precision)} precision. ${ev.tp} of ${ev.bookers} bookers were MQLs = ${pc(ev.recall)} recall. Dealers feel precision; finance feels recall.</div>`; render(); }
    else $('.hs-mout').innerHTML = `<div class="notice warn">${okP ? 'Precision is right.' : 'Check precision: count MQL rows, then the MQL rows marked Booked.'} ${okR ? 'Recall is right.' : 'Check recall: count all Booked rows, then how many of them are MQLs.'}</div>`;
  });

  /* workflow */
  function wfRender() {
    const wf = S.wf;
    $('.wf-trig').value = wf.trigger; $('.wf-re').value = wf.reenrol; $('.wf-fb').value = wf.fallback || '';
    $('.wf-steps').innerHTML = wf.steps.length ? wf.steps.map((t, i) => `<li><div class="row between"><span>${esc(STEP_TYPES[t])}</span><span class="row"><button type="button" class="btn sec sm" data-mv="${i}" data-d="-1" aria-label="Move up"${i ? '' : ' disabled'}>↑</button><button type="button" class="btn sec sm" data-mv="${i}" data-d="1" aria-label="Move down"${i < wf.steps.length - 1 ? '' : ' disabled'}>↓</button><button type="button" class="btn sec sm" data-rm="${i}" aria-label="Remove">✕</button></span></div></li>`).join('') : '<li class="help">No actions yet.</li>';
    $('.wf-map').innerHTML = `<thead><tr><th>City</th><th>Owner</th></tr></thead><tbody>${CITIES.map((c) => `<tr><td>${esc(c)}</td><td><select data-city="${esc(c)}" aria-label="Owner for ${esc(c)}"><option value="">No owner</option>${DEALERS[c] ? `<option value="${esc(DEALERS[c])}"${wf.map[c] === DEALERS[c] ? ' selected' : ''}>${esc(DEALERS[c])}</option>` : ''}<option value="${esc(INSIDE)}"${wf.map[c] === INSIDE ? ' selected' : ''}>${esc(INSIDE)}</option></select></td></tr>`).join('')}</tbody>`;
  }
  const wfSave = () => { ctx.save(); wfRender(); $('.wf-out').innerHTML = ''; };
  $('.wf-trig').addEventListener('change', (e) => { S.wf.trigger = e.target.value; ctx.act(); wfSave(); });
  $('.wf-re').addEventListener('change', (e) => { S.wf.reenrol = e.target.value; ctx.act(); wfSave(); });
  $('.wf-fb').addEventListener('change', (e) => { S.wf.fallback = e.target.value; ctx.act(); wfSave(); });
  $('.wf-addbtn').addEventListener('click', () => { if (S.wf.steps.length >= 10) return ctx.toast('Ten actions is enough for this workflow.'); S.wf.steps.push($('.wf-add').value); ctx.act(); wfSave(); });
  $('.wf-steps').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const st = S.wf.steps;
    if (b.dataset.rm !== undefined) st.splice(+b.dataset.rm, 1);
    else if (b.dataset.mv !== undefined) { const i = +b.dataset.mv, j = i + Number(b.dataset.d); if (j < 0 || j >= st.length) return; [st[i], st[j]] = [st[j], st[i]]; }
    ctx.act(); wfSave();
  });
  $('.wf-map').addEventListener('change', (e) => { const c = e.target.dataset.city; if (!c) return; if (e.target.value) S.wf.map[c] = e.target.value; else delete S.wf.map[c]; ctx.act(); wfSave(); });
  $('.wf-check').addEventListener('click', () => {
    ctx.act();
    const { errors, warnings } = validateWorkflow(S.wf);
    const w = warnings.length ? `<div class="notice warn"><ul style="margin:0">${warnings.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
    if (!errors.length) { ctx.done('hs4'); $('.wf-out').innerHTML = `<div class="notice ok"><strong>No errors.</strong> MQL → owner by city (fallback for cities without a dealer) → task and internal email → wait a day → escalate if still "New". Re-enrolment only on a new test-ride request.</div>${w}`; }
    else $('.wf-out').innerHTML = `<div class="notice warn"><strong>${errors.length} error${errors.length > 1 ? 's' : ''}.</strong><ul style="margin:6px 0 0">${errors.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>${w}`;
  });

  /* guided questions */
  function questions() {
    $('.hs-q').innerHTML = QUESTIONS.map((q, qi) => {
      const ok = S.ans[q.id] === q.c;
      return `<div class="w-q"><p><b>${qi + 1}. ${esc(q.q)}</b></p><div class="w-opts">${q.o.map((o, oi) => `<button type="button" class="w-opt${ok && oi === q.c ? ' right' : ''}" data-q="${qi}" data-o="${oi}">${esc(o)}</button>`).join('')}</div>${ok ? `<div class="w-out">${esc(q.x)}</div>` : ''}</div>`;
    }).join('');
    for (const t of ['hs5', 'hs6']) if (QUESTIONS.filter((q) => q.task === t).every((q) => S.ans[q.id] === q.c)) ctx.done(t);
  }
  $('.hs-q').addEventListener('click', (e) => {
    const b = e.target.closest('.w-opt'); if (!b) return;
    ctx.act();
    const q = QUESTIONS[+b.dataset.q];
    if (+b.dataset.o === q.c) { S.ans[q.id] = q.c; ctx.save(); questions(); }
    else { b.classList.add('wrong'); ctx.toast('Not quite. Read the options again.'); }
  });

  crit(); render(); wfRender(); questions();
}
