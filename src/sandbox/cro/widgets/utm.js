// Lab: UTMs and GA4 channels. Predict the channel of 8 links, then build clean links.
import { channel, CHANNELS, lintUtm } from '../logic.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const UQ = [
  { u: '?utm_source=facebook&utm_medium=paid_social&utm_campaign=bf_ca', x: 'facebook is a social source and paid_social matches the paid pattern (paid…).' },
  { u: '?utm_source=facebook&utm_medium=social&utm_campaign=bf_ca', x: 'The classic mistake. This is a PAID ad, but medium "social" puts it in Organic Social. Meta spend now looks like it brings nothing.' },
  { u: '?utm_source=newsletter&utm_medium=email&utm_campaign=oct_restock', x: 'Medium "email" means Email, whatever the source is called.' },
  { u: '?utm_source=google&utm_medium=cpc&utm_campaign=brand_ca', x: 'google is a search source and cpc is a paid medium: Paid Search.' },
  { u: '?utm_source=instagram&utm_medium=influencer&utm_campaign=creator_jane', x: '"influencer" is not a paid medium, but instagram is a social source, so Organic Social. If you pay creators, use a medium like paid_influencer.' },
  { u: '?utm_source=partner_blog&utm_medium=affiliate&utm_campaign=skincare_review', x: 'Medium "affiliate" goes to Affiliates.' },
  { u: '?utm_source=homepage_banner&utm_medium=internal&utm_campaign=sale', x: 'Unassigned. Worse: this is an internal link. It wipes out the visitor\'s real source. Never tag internal links.' },
  { u: '?utm_source=tiktok&utm_medium=cpc&utm_campaign=spark_ads', x: 'tiktok is social and cpc is paid: Paid Social (not Paid Search, because tiktok is not a search engine).' },
];
const truth = (q) => { const p = new URLSearchParams(q.u); return channel(p.get('utm_source'), p.get('utm_medium')); };

export function mount(el, ctx) {
  const S = ctx.state;
  S.ans ??= {};
  el.innerHTML = `
    <section class="card"><h3 style="margin-top:0">Predict the channel</h3><p class="help">For each link, pick the channel GA4 puts it in, then press Check.</p><div class="u-qs"></div></section>
    <section class="card">
      <h3 style="margin-top:0">UTM builder and checker</h3>
      <div class="row"><div style="flex:2 1 260px"><label>Landing page<input class="u-url" value="https://glowshop.ca/products/hydra-glow" /></label></div></div>
      <div class="row">
        <div style="flex:1 1 140px"><label>utm_source<input class="u-f" data-k="source" value="Facebook" /></label></div>
        <div style="flex:1 1 140px"><label>utm_medium<input class="u-f" data-k="medium" value="Paid Social" /></label></div>
        <div style="flex:1 1 160px"><label>utm_campaign<input class="u-f" data-k="campaign" value="BF 2026 CA serum" /></label></div>
        <div style="flex:1 1 140px"><label>utm_content<input class="u-f" data-k="content" value="video_15s_v2" /></label></div>
      </div>
      <div class="w-out mono u-out"></div>
      <div class="list u-lint"></div>
    </section>`;
  const $ = (s) => el.querySelector(s);
  function renderQs() {
    $('.u-qs').innerHTML = UQ.map((q, i) => {
      const a = S.ans[i], right = truth(q);
      return `<div class="lk"><span class="mono">glowshop.ca/${esc(q.u)}</span><select data-u="${i}" aria-label="Channel for link ${i + 1}"><option value="">Pick a channel</option>${CHANNELS.map((c) => `<option${a === c ? ' selected' : ''}>${c}</option>`).join('')}</select><button class="btn sec sm" data-uc="${i}" type="button">Check</button>${a ? `<div class="lk-res ${a === right ? 'ok' : 'err'}">${a === right ? '✓ Correct. ' : `✗ GA4 says ${right}. `}${esc(q.x)}</div>` : ''}</div>`;
    }).join('');
    el.querySelectorAll('[data-uc]').forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.uc, pick = el.querySelector(`[data-u="${i}"]`).value;
      if (!pick) return ctx.toast('Pick a channel first.');
      ctx.act(); S.ans[i] = pick; ctx.save(); renderQs(); score();
    }));
  }
  function score() {
    const right = UQ.filter((q, i) => S.ans[i] === truth(q)).length;
    if (right >= 4) ctx.done('u1');
    if (right === UQ.length) ctx.done('u2');
    if (S.ans[6] === truth(UQ[6])) ctx.done('u3');
  }
  function build() {
    const f = {};
    el.querySelectorAll('.u-f').forEach((i) => (f[i.dataset.k] = i.value));
    let url;
    try { url = new URL($('.u-url').value); } catch { $('.u-out').textContent = 'The landing page is not a valid URL. Start it with https://'; $('.u-lint').innerHTML = ''; return; }
    const lint = lintUtm(f, url.hostname);
    for (const [k, v] of Object.entries(f)) if (v.trim()) url.searchParams.set('utm_' + k, v.trim());
    const ch = channel(f.source.trim(), f.medium.trim());
    $('.u-out').textContent = url.toString();
    $('.u-lint').innerHTML = `<div class="item"><div>GA4 channel: <b>${ch}</b></div></div>` + (lint.length ? lint.map((l) => `<div class="item err">⚠ ${esc(l)}</div>`).join('') : '<div class="item ok">✓ No problems found</div>');
    if (!lint.length && ch === 'Paid Social') ctx.done('u4');
    if (!lint.length && ch === 'Email') ctx.done('u5');
  }
  el.querySelectorAll('.u-f, .u-url').forEach((i) => i.addEventListener('input', () => { build(); }));
  el.querySelectorAll('.u-f').forEach((i) => i.addEventListener('change', () => ctx.act()));
  renderQs(); score(); build();
}
