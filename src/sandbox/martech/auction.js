// Lab mk-auction: a simplified Google Ads auction for one keyword. Ad Rank = max CPC × Quality Score,
// with a threshold to show at all and a higher one for the top of the page. Actual CPC = the least you
// need to keep your position: Ad Rank of the ad below (or the threshold) ÷ your Quality Score + ₹0.01.

export const lab = {
  id: 'mk-auction', track: 'martech', kind: 'widget', title: 'Google Ads auction: Ad Rank, Quality Score and CPC', topic: 'Search ads', minutes: 25, sprints: ['m05'],
  summary: 'Bid on "electric scooter price" against four rivals. See how Quality Score moves your position and the price you really pay per click.',
  intro: [
    'Every search runs an auction. Google ranks the ads by Ad Rank. In this simplified model, Ad Rank = your max CPC × your Quality Score. The real formula also uses ad assets, the search context and the user, but the logic is the same.',
    'Quality Score (1 to 10) comes from three parts: expected click-through rate, ad relevance and landing page experience. Each is below average, average or above average. Expected CTR and landing page count more than ad relevance.',
    'You rarely pay your max CPC. You pay the least you need to keep your place: the Ad Rank of the ad below you divided by your Quality Score, plus ₹0.01. A better Quality Score lowers that price.',
  ],
  tasks: [
    { id: 'a1', text: 'Get your ad shown at all.', why: 'Below the Ad Rank threshold your ad does not enter the page, whatever you bid.', hint: 'Your Ad Rank must reach 40. Raise the max CPC, or improve one Quality Score part.' },
    { id: 'a2', text: 'Raise your max CPC without changing your position, and see that your actual CPC stays the same.', why: 'The bid is a ceiling, not the price. The ad below you sets the price.', hint: 'While shown, raise the max CPC by a few rupees. If your position does not change, look at actual CPC.' },
    { id: 'a3', text: 'Reach position 1.', why: 'Position 1 gets the most clicks, but it is not always worth the price.', hint: 'Your Ad Rank must beat Kora EV (176). Bid or quality, or both.' },
    { id: 'a4', text: 'Reach position 1 with a max CPC below ZipRide\'s ₹32.', why: 'High quality beats a big budget. This is why Quality Score matters to finance, not only to the ad team.', hint: 'Set all three Quality Score parts to above average, then lower the max CPC until you only just stay at position 1.' },
    { id: 'a5', text: 'Improve landing page experience and keep the same position: see your actual CPC fall.', why: 'Same click, same place, lower price. A faster, clearer page pays for itself.', hint: 'Keep the max CPC fixed (try ₹15 with all three parts average). Move landing page experience up one level. Your position and your part of the page (top or bottom) must not change.' },
    { id: 'a6', text: 'Solve the case: "CPC doubled, conversions flat".', why: 'This is a weekly question from managers. The answer is in the auction, not in the budget.', hint: 'Read the auction insights and the Quality Score history in the case card.' },
  ],
  quiz: [
    { q: 'Which three parts make up Quality Score?', options: ['Bid, budget and CTR', 'Expected CTR, ad relevance and landing page experience', 'Conversion rate, CPC and impressions', 'Keyword length, match type and device'], answer: 1, why: 'Quality Score is a diagnostic from 1 to 10, built from expected CTR, ad relevance and landing page experience.' },
    { q: 'Your max CPC is ₹40, your QS is 8, and the ad below you has Ad Rank 160. What do you pay per click in this model?', options: ['₹40.00', '₹20.01', '₹160', '₹5.00'], answer: 1, why: '160 ÷ 8 + 0.01 = ₹20.01. You pay what keeps your place, not your max.' },
    { q: 'Why does a better Quality Score save money?', options: ['Google gives a fixed discount', 'The same Ad Rank needs a lower bid, and your actual CPC is divided by your Quality Score', 'It raises your budget', 'It only changes reports'], answer: 1, why: 'Ad Rank = bid × quality. Higher quality means a lower bid for the same position, and a lower price per click.' },
  ],
};

/* ---------------------------------------------------------------- model ---------------------------------------------------------------- */

export const KEYWORD = 'electric scooter price';
export const LEVELS = ['below', 'average', 'above'];
export const LEVEL_TEXT = { below: 'Below average', average: 'Average', above: 'Above average' };
// Points per part. Expected CTR and landing page weigh more than ad relevance (max total 10).
export const QS_POINTS = { ectr: { below: 0, average: 1.75, above: 3.5 }, rel: { below: 0, average: 1, above: 2 }, lp: { below: 0, average: 1.75, above: 3.5 } };
export const SHOW_MIN = 40; // Ad Rank needed to show at all
export const TOP_MIN = 80; // Ad Rank needed to show above the organic results
export const TOP_SLOTS = 4, BOTTOM_SLOTS = 3;
export const COMPETITORS = [
  { name: 'Kora EV', bid: 22, qs: 8 },
  { name: 'ZipRide', bid: 32, qs: 4 },
  { name: 'UrbanVolt', bid: 18, qs: 6 },
  { name: 'Bharat Wheels', bid: 15, qs: 3 },
];
export const START = { bid: 10, ectr: 'below', rel: 'below', lp: 'average' };

export function qualityScore(c) {
  const raw = 1 + QS_POINTS.ectr[c.ectr] + QS_POINTS.rel[c.rel] + QS_POINTS.lp[c.lp];
  return Math.max(1, Math.min(10, Math.round(raw)));
}
const r2 = (n) => Math.round(n * 100) / 100;

/** Run the auction. Returns all ads sorted by position: { name, you, bid, qs, adRank, shown, position, slot, cpc }. */
export function auction(you, competitors = COMPETITORS) {
  const all = [{ name: 'Voltra (you)', you: true, bid: you.bid, qs: qualityScore(you) }, ...competitors.map((c) => ({ ...c, you: false }))]
    .map((a) => ({ ...a, adRank: r2(a.bid * a.qs) }))
    .sort((a, b) => b.adRank - a.adRank || b.qs - a.qs || (a.you ? -1 : b.you ? 1 : 0));
  const eligible = all.filter((a) => a.adRank >= SHOW_MIN);
  let top = 0, bottom = 0;
  eligible.forEach((a) => {
    if (a.adRank >= TOP_MIN && top < TOP_SLOTS) { a.slot = 'top'; top++; } else if (bottom < BOTTOM_SLOTS) { a.slot = 'bottom'; bottom++; } else a.slot = null;
  });
  const shown = eligible.filter((a) => a.slot);
  shown.forEach((a, i) => {
    a.shown = true; a.position = i + 1;
    const below = shown[i + 1];
    const floor = a.slot === 'top' ? TOP_MIN : SHOW_MIN;
    const need = Math.max(below ? below.adRank : 0, floor);
    a.cpc = Math.min(a.bid, r2(need / a.qs + 0.01));
    a.belowRank = below ? below.adRank : null; a.floor = floor;
  });
  for (const a of all) if (!a.shown) { a.shown = false; a.position = null; a.slot = null; a.cpc = 0; }
  return [...shown, ...all.filter((a) => !a.shown)];
}
export const yours = (rows) => rows.find((a) => a.you);

/** Which tasks does this change (prev settings → next settings) complete? a2 needs a raise of at least minRaise. */
export function auctionChecks(prevCfg, nextCfg, minRaise = 0) {
  const out = [];
  const n = yours(auction(nextCfg));
  if (n.shown) out.push('a1');
  if (n.position === 1) out.push('a3');
  if (n.position === 1 && nextCfg.bid < 32) out.push('a4');
  if (prevCfg) {
    const p = yours(auction(prevCfg));
    const same = (k) => prevCfg[k] === nextCfg[k];
    if (same('ectr') && same('rel') && same('lp') && nextCfg.bid > prevCfg.bid && nextCfg.bid - prevCfg.bid >= minRaise && p.shown && n.shown && p.position === n.position && p.slot === n.slot && n.cpc === p.cpc && n.bid > n.cpc + 0.01) out.push('a2');
    if (same('ectr') && same('rel') && same('bid') && LEVELS.indexOf(nextCfg.lp) > LEVELS.indexOf(prevCfg.lp) && p.shown && n.shown && p.position === n.position && p.slot === n.slot && n.cpc < p.cpc) out.push('a5');
  }
  return out;
}

export const CASE = {
  rows: [
    ['Clicks', '1,210', '1,160'], ['Avg. CPC', '₹14.20', '₹28.60'], ['Conversions (test-ride leads)', '97', '94'], ['Cost per lead', '₹177', '₹353'],
    ['Quality Score', '7', '4'], ['Landing page experience', 'Above average', 'Below average'], ['Kora EV: overlap rate', '41%', '72%'], ['Kora EV: position above rate', '22%', '61%'],
  ],
  note: 'In week 2 the web team moved the test-ride page to a new site builder. Mobile load time went from 2.1 s to 6.8 s.',
  qs: [
    { q: 'Why did the average CPC double?', options: ['Google raised prices for everyone in October', 'Kora EV now bids harder in the same auctions, and our Quality Score fell from 7 to 4, so we need a much higher bid for the same place', 'More people clicked, so each click costs more', 'Conversion tracking broke'], answer: 1, why: 'Two auction forces at once: a stronger rival (overlap and position-above rates jumped) and a lower Quality Score. Actual CPC is divided by Quality Score, so 7 → 4 alone raises the price by about 75%.' },
    { q: 'What do you do first?', options: ['Raise max CPC to ₹45 to win back position 1', 'Pause the campaign until Kora EV stops', 'Fix the test-ride page speed and content to restore landing page experience, then review bids with the lower CPC', 'Add more broad match keywords'], answer: 2, why: 'Fix what you control and what multiplies every click: the landing page. Then decide bids. Raising bids alone pays the penalty forever.' },
  ],
};

/* ----------------------------------------------------------------- UI ----------------------------------------------------------------- */

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inr = (n) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function mount(el, ctx) {
  const S = ctx.state;
  S.cfg ??= { ...START };
  S.caseAns ??= [null, null];
  const sel = (k, label, note) => `<div style="flex:1 1 170px"><label>${label}<select data-k="${k}">${LEVELS.map((l) => `<option value="${l}"${S.cfg[k] === l ? ' selected' : ''}>${LEVEL_TEXT[l]}</option>`).join('')}</select></label><span class="help">${note}</span></div>`;
  el.innerHTML = `
    <section class="card">
      <h3 style="margin-top:0">Your ad: Voltra VX1</h3>
      <p class="help">Keyword: <span class="mono">${KEYWORD}</span>. Simplified model: Ad Rank = max CPC × Quality Score. Ad Rank 40 to show at all, 80 to show above the organic results.</p>
      <label>Max CPC (the most you will pay for one click)
        <div class="row"><input class="u-bid-r mk-range" type="range" min="1" max="80" step="0.5" style="flex:3 1 200px" /><input class="u-bid" type="number" min="1" max="200" step="0.5" style="flex:1 1 90px" /></div>
      </label>
      <div class="row" style="align-items:flex-start;margin-top:6px">
        ${sel('ectr', 'Expected CTR', 'Will people click this ad?')}
        ${sel('rel', 'Ad relevance', 'Does the ad match the search?')}
        ${sel('lp', 'Landing page experience', 'Is the page fast, clear and on topic?')}
      </div>
      <div class="kpis u-kpis"></div>
      <div class="w-out u-msg"></div>
    </section>
    <div class="two">
      <section class="card">
        <h3 style="margin-top:0">Search results</h3>
        <div class="mk-serp u-serp" aria-live="polite"></div>
      </section>
      <section class="card">
        <h3 style="margin-top:0">Auction table</h3>
        <p class="help">The learning view. In real life you never see rivals' bids or Quality Scores; you see them indirectly in Auction insights.</p>
        <div class="tbl"><table><thead><tr><th>Advertiser</th><th>Max CPC</th><th>QS</th><th>Ad Rank</th><th>Position</th><th>Actual CPC</th></tr></thead><tbody class="u-tbl"></tbody></table></div>
        <p class="help">Actual CPC = Ad Rank of the ad below (or the threshold, if higher) ÷ own Quality Score + ₹0.01, never more than the max CPC.</p>
      </section>
    </div>
    <section class="card">
      <h3 style="margin-top:0">Case: "CPC doubled, conversions flat"</h3>
      <p class="help">Voltra search campaign, keyword ${KEYWORD}, last 4 weeks compared with the 4 weeks before. ${esc(CASE.note)}</p>
      <div class="tbl"><table><thead><tr><th>Metric</th><th>Before</th><th>Now</th></tr></thead><tbody>${CASE.rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div>
      <div class="u-case"></div>
    </section>`;
  const $ = (s) => el.querySelector(s);
  const bidR = $('.u-bid-r'), bidN = $('.u-bid');
  bidR.value = String(Math.min(80, S.cfg.bid)); bidN.value = String(S.cfg.bid);
  let prev = { ...S.cfg };
  // a2 compares with the settings when your position, price or Quality Score last changed.
  const sig = (c) => { const m = yours(auction(c)); return `${m.shown}|${m.position}|${m.cpc}|${m.qs}`; };
  let anchor = { ...S.cfg };

  function apply(next) {
    const before = prev;
    S.cfg = next; prev = { ...next }; ctx.save();
    render(before);
  }
  bidR.addEventListener('input', () => { bidN.value = bidR.value; apply({ ...S.cfg, bid: Number(bidR.value) }); });
  bidR.addEventListener('change', () => ctx.act());
  bidN.addEventListener('change', () => {
    const v = Math.round(Number(bidN.value) * 100) / 100;
    if (!(v >= 1 && v <= 200)) { ctx.toast('Type a max CPC between ₹1 and ₹200.'); bidN.value = String(S.cfg.bid); return; }
    bidR.value = String(Math.min(80, v)); ctx.act(); apply({ ...S.cfg, bid: v });
  });
  el.querySelectorAll('select[data-k]').forEach((s) => s.addEventListener('change', () => { ctx.act(); apply({ ...S.cfg, [s.dataset.k]: s.value }); }));

  function render(before) {
    const rows = auction(S.cfg), me = yours(rows), qs = me.qs;
    const pts = QS_POINTS.ectr[S.cfg.ectr] + QS_POINTS.rel[S.cfg.rel] + QS_POINTS.lp[S.cfg.lp];
    $('.u-kpis').innerHTML = `
      <div><span class="eyebrow">Quality Score</span><span class="big">${qs}/10</span></div>
      <div><span class="eyebrow">Ad Rank</span><span class="big">${me.adRank}</span></div>
      <div><span class="eyebrow">Position</span><span class="big" style="color:${me.shown ? 'var(--ok)' : 'var(--bad)'}">${me.shown ? `${me.position} · ${me.slot === 'top' ? 'top' : 'bottom'}` : 'Not shown'}</span></div>
      <div><span class="eyebrow">Actual CPC</span><span class="big">${me.shown ? inr(me.cpc) : '–'}</span></div>`;
    let msg = `Quality Score = 1 + ${pts} points, rounded = <b>${qs}</b>. Ad Rank = ₹${S.cfg.bid} × ${qs} = <b>${me.adRank}</b>. `;
    if (!me.shown) msg += me.adRank < SHOW_MIN ? `That is below the threshold of ${SHOW_MIN}, so your ad does not show. You need a max CPC of at least ₹${(Math.ceil((SHOW_MIN / qs) * 2) / 2).toFixed(2)} at this Quality Score.` : 'All ad slots are taken by higher Ad Ranks.';
    else msg += `You pay ${me.belowRank !== null && me.belowRank >= me.floor ? `the Ad Rank below you (${me.belowRank})` : `the ${me.slot === 'top' ? 'top-of-page' : 'show'} threshold (${me.floor})`} ÷ ${qs} + ₹0.01 = <b>${inr(me.cpc)}</b>, not your max CPC of ${inr(S.cfg.bid)}.`;
    $('.u-msg').innerHTML = msg;
    $('.u-tbl').innerHTML = rows.map((a) => `<tr${a.you ? ' class="mk-you"' : ''}><td>${esc(a.name)}</td><td>${inr(a.bid)}</td><td>${a.qs}</td><td>${a.adRank}</td><td>${a.shown ? `${a.position} (${a.slot})` : 'not shown'}</td><td>${a.shown ? inr(a.cpc) : '–'}</td></tr>`).join('');
    const ad = (a) => `<div class="mk-ad${a.you ? ' mk-you' : ''}"><span class="mk-sponsored">Sponsored · ${esc(a.name.replace(' (you)', ''))}</span><b>${a.you ? 'Voltra VX1: on-road price from ₹1.09 lakh' : `${esc(a.name)}: electric scooters, see prices`}</b><span class="help">${a.you ? 'Book a free test ride at 300 dealers. FAME subsidy explained.' : 'Compare models and offers.'}</span></div>`;
    const top = rows.filter((a) => a.slot === 'top'), bottom = rows.filter((a) => a.slot === 'bottom');
    $('.u-serp').innerHTML = `<div class="mk-q mono">${KEYWORD}</div>${top.map(ad).join('')}
      <div class="mk-org"><span class="help">Organic result</span><b>Electric scooter prices in India, 2026 list</b></div>
      <div class="mk-org"><span class="help">Organic result</span><b>Best electric scooters under ₹1.5 lakh</b></div>${bottom.map(ad).join('')}
      ${me.shown ? '' : '<p class="help" style="margin:8px 0 0">Your ad is not on this page.</p>'}`;
    const got = new Set(auctionChecks(before, S.cfg).filter((id) => id !== 'a2'));
    if (sig(anchor) !== sig(S.cfg)) anchor = { ...S.cfg };
    else if (auctionChecks(anchor, S.cfg, 3).includes('a2')) got.add('a2');
    got.forEach((id) => ctx.done(id));
  }

  function renderCase() {
    $('.u-case').innerHTML = CASE.qs.map((q, i) => {
      const a = S.caseAns[i];
      return `<div class="w-q"><p><b>${i + 1}. ${esc(q.q)}</b></p><div class="w-opts">${q.options.map((o, j) => `<button type="button" class="w-opt${a === j ? (j === q.answer ? ' right' : ' wrong') : ''}" data-q="${i}" data-o="${j}">${esc(o)}</button>`).join('')}</div>
        ${a === q.answer ? `<div class="notice ok">${esc(q.why)}</div>` : a !== null ? '<div class="notice warn">Not this one. Look at the Quality Score, landing page and Kora EV rows again.</div>' : ''}</div>`;
    }).join('');
    el.querySelectorAll('.u-case [data-q]').forEach((b) => b.addEventListener('click', () => {
      ctx.act();
      S.caseAns[+b.dataset.q] = +b.dataset.o; ctx.save();
      renderCase();
      if (CASE.qs.every((q, i) => S.caseAns[i] === q.answer)) ctx.done('a6');
    }));
  }
  render(null);
  renderCase();
}
