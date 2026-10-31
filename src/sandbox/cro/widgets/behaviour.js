// Lab: Behaviour lab. Tag 12 simulated session recordings, read a heatmap, write a hypothesis.

export const TAGS = ['Size picker problem', 'Shipping cost surprise', 'Looking for reviews', 'Coupon hunting', 'No problem (left normally)'];
// Each recording: device, country, short timeline, correct tag index.
export const RECS = [
  { d: 'iPhone · Safari', c: 'Canada', t: ['0:03 lands on Hydra Glow Serum', '0:09 taps "50 ml" 5 times fast (rage click)', '0:14 taps "30 ml", nothing changes', '0:21 leaves'], a: 0 },
  { d: 'Android · Chrome', c: 'Canada', t: ['0:02 lands on product page', '0:08 adds 30 ml to cart', '0:15 opens cart, reads "Shipping CA$14.95, duties may apply"', '0:22 closes the tab'], a: 1 },
  { d: 'iPhone · Safari', c: 'Canada', t: ['0:04 lands from Instagram', '0:10 taps the size buttons 4 times (rage click)', '0:18 scrolls up and down', '0:25 goes back to Instagram'], a: 0 },
  { d: 'Desktop · Chrome', c: 'US', t: ['0:05 lands on product page', '0:12 scrolls to the bottom', '0:20 reads 6 reviews', '0:45 adds to cart and buys'], a: 4 },
  { d: 'iPhone · Safari', c: 'Canada', t: ['0:03 lands on product page', '0:07 rage clicks the "50 ml" button', '0:12 zooms the page with two fingers', '0:19 leaves'], a: 0 },
  { d: 'Android · Chrome', c: 'Canada', t: ['0:06 starts checkout', '0:20 reaches the shipping step', '0:24 sees CA$14.95 + "duties paid on delivery"', '0:28 leaves'], a: 1 },
  { d: 'iPhone · Safari', c: 'US', t: ['0:04 adds to cart', '0:09 sees "Have a coupon?" in the cart', '0:12 opens a new tab and searches "glowshop coupon"', '0:40 does not come back'], a: 3 },
  { d: 'iPhone · Safari', c: 'Canada', t: ['0:02 lands on product page', '0:06 taps the size buttons again and again (rage click)', '0:11 leaves'], a: 0 },
  { d: 'Desktop · Firefox', c: 'Canada', t: ['0:07 lands on product page', '0:15 scrolls a lot, looking around', '0:31 finds the reviews tab at the very bottom', '0:52 leaves without adding'], a: 2 },
  { d: 'iPhone · Safari', c: 'Canada', t: ['0:05 lands on product page', '0:11 rage clicks "50 ml"', '0:16 adds the default 30 ml instead', '0:30 buys'], a: 0 },
  { d: 'Android · Chrome', c: 'Canada', t: ['0:03 adds to cart', '0:08 opens cart', '0:10 reads the grey line "Duties and taxes may be due on delivery"', '0:13 leaves'], a: 1 },
  { d: 'iPhone · Safari', c: 'Canada', t: ['0:02 lands on product page', '0:09 rage clicks the size picker', '0:14 leaves'], a: 0 },
];
export const TOP = 0; // Size picker problem: 6 of 12, all on iPhone
/** Checks a hypothesis object { evidence, change, audience, metric } and returns a list of problems. */
export function checkHypothesis(h) {
  const out = [];
  if (!/\d/.test(h.evidence || '')) out.push('Evidence needs a number, e.g. "6 of 12 recordings".');
  if (!/(size|picker|50 ?ml|variant)/i.test(h.evidence || '')) out.push('Evidence should describe the top problem (the size picker).');
  if ((h.change || '').trim().split(/\s+/).length < 4) out.push('Describe the change in at least a few words (what will you change on the page?).');
  if (!/(size|picker|button|variant|50 ?ml)/i.test(h.change || '')) out.push('The change must fix the problem you saw (the size picker).');
  if (!/(iphone|ios|safari|mobile)/i.test(h.audience || '')) out.push('Audience: all 6 size-picker sessions were on iPhone Safari. Name that audience.');
  if (!['Add-to-cart rate', 'Revenue per visitor'].includes(h.metric)) out.push('Pick a primary metric that the size picker can move: add-to-cart rate or revenue per visitor.');
  return out;
}

export function mount(el, ctx) {
  const S = ctx.state;
  S.tags ??= {};
  el.innerHTML = `
    <section class="card"><h3 style="margin-top:0">12 recordings: Canada and US, product page and cart</h3><p class="help">Read each timeline. Pick the tag that explains why the person struggled or left.</p><div class="b-recs"></div></section>
    <section class="card"><h3 style="margin-top:0">Your tag counts</h3><div class="b-counts"></div><div class="b-top"></div></section>
    <section class="card">
      <h3 style="margin-top:0">Heatmap: product page on mobile (dead clicks)</h3>
      <div class="heat" aria-label="Heatmap of a product page">
        <div class="heat-img">Product photo<span class="dot" style="left:30%;top:40%"></span><span class="dot" style="left:46%;top:52%"></span><span class="dot" style="left:60%;top:36%"></span><span class="dot" style="left:52%;top:62%"></span><span class="dot" style="left:38%;top:58%"></span></div>
        <div class="heat-row">Hydra Glow Serum · CA$34</div>
        <div class="heat-row">[ 30 ml ] [ 50 ml ]</div>
        <div class="heat-btn">Add to cart</div>
      </div>
      <p class="help">Red dots = taps that did nothing (dead clicks). 38% of mobile visitors tap the photo.</p>
      <p><b>What do the dead clicks on the photo mean?</b></p>
      <div class="w-opts b-heat"></div>
      <div class="b-heatout"></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">Write the hypothesis</h3>
      <form class="b-form">
        <label>Because we saw… (evidence with a number)<input name="evidence" placeholder="6 of 12 recordings…" /></label>
        <label>we believe that… (the change)<input name="change" placeholder="making the size buttons…" /></label>
        <label>for… (audience)<input name="audience" placeholder="visitors on…" /></label>
        <label>will improve… (primary metric)<select name="metric"><option value="">Pick a metric</option><option>Add-to-cart rate</option><option>Revenue per visitor</option><option>Page views</option><option>Time on page</option><option>Bounce rate</option></select></label>
        <div class="row" style="margin-top:12px"><button class="btn" type="submit">Check my hypothesis</button></div>
      </form>
      <div class="b-hout"></div>
    </section>`;
  const $ = (s) => el.querySelector(s);
  function renderRecs() {
    $('.b-recs').innerHTML = RECS.map((r, i) => {
      const pick = S.tags[i];
      const st = pick === undefined ? '' : pick === r.a ? 'ok' : 'err';
      return `<div class="rec ${st}"><div class="rec-head"><b>Recording ${i + 1}</b><span class="help">${r.d} · ${r.c}</span></div><ol class="rec-t">${r.t.map((x) => `<li>${x}</li>`).join('')}</ol><select data-r="${i}" aria-label="Tag for recording ${i + 1}"><option value="">Pick a tag</option>${TAGS.map((t, j) => `<option value="${j}"${pick === j ? ' selected' : ''}>${t}</option>`).join('')}</select>${st === 'err' ? '<p class="help err">Read the timeline again: what happened just before they left?</p>' : ''}</div>`;
    }).join('');
    el.querySelectorAll('[data-r]').forEach((s) => s.addEventListener('change', () => {
      if (s.value === '') return;
      ctx.act(); S.tags[+s.dataset.r] = Number(s.value); ctx.save(); renderRecs(); counts();
    }));
  }
  function counts() {
    const tagged = Object.keys(S.tags).length, right = RECS.filter((r, i) => S.tags[i] === r.a).length;
    if (tagged >= 6) ctx.done('b1');
    if (right === RECS.length) ctx.done('b2');
    const c = TAGS.map((_, j) => Object.values(S.tags).filter((v) => v === j).length);
    $('.b-counts').innerHTML = `<div class="tbl"><table><thead><tr><th>Tag</th><th>Recordings</th></tr></thead><tbody>${TAGS.map((t, j) => `<tr><td>${t}</td><td>${c[j]}</td></tr>`).join('')}</tbody></table></div><p class="help">${tagged} of 12 tagged, ${right} correct.</p>`;
    $('.b-top').innerHTML = tagged < 12 ? '<p class="help">Tag all 12, then pick the top problem.</p>' : `<p><b>Which problem do you work on first?</b></p><div class="w-opts">${TAGS.slice(0, 4).map((t, j) => `<button type="button" class="w-opt${ctx.isDone('b3') && j === TOP ? ' right' : ''}" data-top="${j}">${t}</button>`).join('')}</div>`;
    el.querySelectorAll('[data-top]').forEach((b) => b.addEventListener('click', () => {
      ctx.act();
      if (+b.dataset.top === TOP) { ctx.done('b3'); counts(); ctx.toast('Right: 6 of 12, all on iPhone Safari. That is your lead.', 'good'); }
      else { b.classList.add('wrong'); ctx.toast('Look at the counts. Which tag has the most recordings?'); }
    }));
  }
  const HEAT = [['People are bored', false], ['People expect to zoom the photo, but tapping does nothing', true], ['The photo is too big', false], ['People want to share the photo', false]];
  $('.b-heat').innerHTML = HEAT.map(([t], i) => `<button type="button" class="w-opt" data-h="${i}">${t}</button>`).join('');
  el.querySelectorAll('[data-h]').forEach((b) => b.addEventListener('click', () => {
    ctx.act();
    const ok = HEAT[+b.dataset.h][1];
    b.classList.add(ok ? 'right' : 'wrong');
    if (ok) { ctx.done('b4'); $('.b-heatout').innerHTML = '<div class="notice ok">Right. Dead clicks show what people expect to work. Fix: tap to zoom, with a small zoom icon on the photo.</div>'; }
  }));
  $('.b-form').addEventListener('submit', (e) => {
    e.preventDefault();
    ctx.act();
    const h = Object.fromEntries(new FormData(e.currentTarget));
    const probs = checkHypothesis(h);
    if (!probs.length) {
      ctx.done('b5');
      $('.b-hout').innerHTML = `<div class="notice ok"><strong>Good hypothesis.</strong> Because we saw ${h.evidence}, we believe that ${h.change} for ${h.audience} will improve ${h.metric.toLowerCase()}.</div>`;
    } else $('.b-hout').innerHTML = `<div class="notice warn"><strong>Almost.</strong><ul style="margin:6px 0 0">${probs.map((p) => `<li>${p}</li>`).join('')}</ul></div>`;
  });
  renderRecs(); counts();
}
