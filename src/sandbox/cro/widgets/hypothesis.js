// Lab: Hypotheses and prioritisation. Opinion vs hypothesis, build one from research, PXL scoring, pick the first test.

export const IDEAS = [
  { t: 'Make the Add to cart button green, because green feels positive.', a: 'opinion' },
  { t: 'Because 41% of mobile Canadians leave at the shipping step after reading the duties note, showing duties-included prices on the product page will raise shipping → payment rate.', a: 'hypothesis' },
  { t: 'Our competitor has a video on the product page, so we should too.', a: 'opinion' },
  { t: 'Because 6 of 12 iPhone recordings show rage clicks on the size picker, big size buttons for iPhone users will raise add-to-cart rate.', a: 'hypothesis' },
];
export const EVIDENCE = [
  { id: 'ship', t: 'Funnel: Canada mobile loses 30 points more than the US between shipping and payment.' },
  { id: 'size', t: 'Clarity: 6 of 12 iPhone sessions rage-click the size picker.' },
  { id: 'reviews', t: 'Survey: "Does it work for dry skin?" is the top question on the product page.' },
];
export const CHANGES = [
  { id: 'ship', t: 'Show CAD shipping cost and "duties included" on the product page and in the cart' },
  { id: 'size', t: 'Replace the size dropdown with big 30 ml / 50 ml buttons' },
  { id: 'reviews', t: 'Show stars and a "best for dry skin" review under the title' },
  { id: 'color', t: 'Change the button colour to green' },
];
export const METRICS = [
  { id: 'payrate', t: 'Shipping → payment step rate', fits: ['ship'] },
  { id: 'atc', t: 'Add-to-cart rate', fits: ['size', 'reviews'] },
  { id: 'rpv', t: 'Revenue per visitor (RPV)', fits: ['ship', 'size', 'reviews'] },
  { id: 'pv', t: 'Page views', fits: [] },
];
export const GUARDRAILS = [{ id: 'margin', t: 'Gross margin per order', ok: true }, { id: 'aov', t: 'Average order value', ok: true }, { id: 'pv', t: 'Page views', ok: false }, { id: 'time', t: 'Time on site', ok: false }];
export const PXL_Q = ['Above the fold on mobile?', 'Backed by user research (recordings, survey)?', 'Backed by analytics (GA4 numbers)?', 'Easy: under 4 hours of work?', 'On a page with high traffic?'];
export const PXL = [
  { t: 'Duties-included message on product page and cart', n: 'Near the price (above the fold). Recordings and survey show it. GA4 funnel shows it. Needs a theme change and a pricing decision: 2 days. All product pages: high traffic.', a: [1, 1, 1, 0, 1] },
  { t: 'Big size buttons instead of a dropdown', n: 'Above the fold. Recordings show it. GA4 add-to-cart rate on iPhone is low. Theme edit: 2 hours. All product pages: high traffic.', a: [1, 1, 1, 1, 1] },
  { t: 'Stars under the title', n: 'Above the fold. Survey shows it. No GA4 number yet. Review app setting: 1 hour. All product pages.', a: [1, 1, 0, 1, 1] },
  { t: 'New "About us" page', n: 'Not on the product page. No research. No numbers. 2 days of writing. Low traffic.', a: [0, 0, 0, 0, 0] },
  { t: 'Green button', n: 'Above the fold. No research. No numbers. 10 minutes. High traffic.', a: [1, 0, 0, 1, 1] },
  { t: 'Shorter checkout footer', n: 'Bottom of the checkout page. No research. No numbers. 1 hour. Medium traffic, not high.', a: [0, 0, 0, 1, 0] },
];
export const FIRST = 1; // highest PXL score
export const pxlScore = (row) => row.reduce((a, b) => a + b, 0);
export const validCombo = (ev, ch, me) => ev === ch && ch !== 'color' && METRICS.find((m) => m.id === me)?.fits.includes(ch);

export function mount(el, ctx) {
  const S = ctx.state;
  S.ideas ??= {}; S.pxl ??= PXL.map(() => [null, null, null, null, null]);
  el.innerHTML = `
    <section class="card"><h3 style="margin-top:0">1 · Hypothesis or opinion?</h3><div class="h-ideas"></div></section>
    <section class="card">
      <h3 style="margin-top:0">2 · Build a hypothesis from the research</h3>
      <label>Because we saw (evidence)<select class="h-ev"><option value="">Choose</option>${EVIDENCE.map((e) => `<option value="${e.id}">${e.t}</option>`).join('')}</select></label>
      <label>We believe that (change)<select class="h-ch"><option value="">Choose</option>${CHANGES.map((e) => `<option value="${e.id}">${e.t}</option>`).join('')}</select></label>
      <label>Will improve (primary metric)<select class="h-me"><option value="">Choose</option>${METRICS.map((e) => `<option value="${e.id}">${e.t}</option>`).join('')}</select></label>
      <label>And must not hurt (guardrail metric)<select class="h-gu"><option value="">Choose</option>${GUARDRAILS.map((e) => `<option value="${e.id}">${e.t}</option>`).join('')}</select></label>
      <div class="row" style="margin-top:12px"><button type="button" class="btn sm h-check">Check</button></div>
      <div class="h-out"></div>
    </section>
    <section class="card">
      <h3 style="margin-top:0">3 · Score 6 ideas with PXL</h3>
      <p class="help">Answer each question with yes or no, using only the notes. Each yes = 1 point.</p>
      <div class="tbl"><table class="h-pxl"></table></div>
      <div class="row" style="margin-top:10px"><button type="button" class="btn sm h-score">Check my scores</button></div>
      <div class="h-pxlout"></div>
    </section>
    <section class="card"><h3 style="margin-top:0">4 · Which idea do you test first?</h3><div class="w-opts h-first"></div><div class="h-firstout"></div></section>`;
  const $ = (s) => el.querySelector(s);
  function ideas() {
    $('.h-ideas').innerHTML = IDEAS.map((d, i) => {
      const a = S.ideas[i];
      return `<div class="w-q"><p>${d.t}</p><div class="row"><button type="button" class="btn sec sm${a === 'hypothesis' ? (d.a === a ? ' is-right' : ' is-wrong') : ''}" data-i="${i}" data-a="hypothesis">Hypothesis</button><button type="button" class="btn sec sm${a === 'opinion' ? (d.a === a ? ' is-right' : ' is-wrong') : ''}" data-i="${i}" data-a="opinion">Opinion</button></div></div>`;
    }).join('');
    el.querySelectorAll('.h-ideas [data-a]').forEach((b) => b.addEventListener('click', () => { ctx.act(); S.ideas[b.dataset.i] = b.dataset.a; ctx.save(); ideas(); }));
    if (IDEAS.every((d, i) => S.ideas[i] === d.a)) ctx.done('h1');
  }
  $('.h-check').addEventListener('click', () => {
    ctx.act();
    const ev = $('.h-ev').value, ch = $('.h-ch').value, me = $('.h-me').value, gu = $('.h-gu').value;
    const probs = [];
    if (!ev || !ch || !me) probs.push('Choose evidence, a change and a primary metric.');
    else {
      if (ch === 'color') probs.push('No evidence supports a colour change. That is an opinion.');
      else if (ev !== ch) probs.push('The change must fix what the evidence shows.');
      if (ch !== 'color' && !METRICS.find((m) => m.id === me)?.fits.includes(ch)) probs.push('This metric cannot show the effect of that change. Pick the step the change affects, or RPV.');
    }
    if (!probs.length && validCombo(ev, ch, me)) ctx.done('h2');
    const g = GUARDRAILS.find((x) => x.id === gu);
    if (gu && g?.ok && validCombo(ev, ch, me)) ctx.done('h3');
    else if (gu && !g?.ok) probs.push('A guardrail protects money: margin or order value. Page views and time on site do not.');
    else if (!gu) probs.push('Add a guardrail metric too.');
    $('.h-out').innerHTML = probs.length ? `<div class="notice warn"><ul style="margin:0">${probs.map((p) => `<li>${p}</li>`).join('')}</ul></div>` : `<div class="notice ok"><strong>Strong hypothesis.</strong> Because ${EVIDENCE.find((e) => e.id === ev).t.toLowerCase()} we believe "${CHANGES.find((c) => c.id === ch).t.toLowerCase()}" will improve ${METRICS.find((m) => m.id === me).t.toLowerCase()}, without hurting ${g.t.toLowerCase()}.</div>`;
  });
  function table() {
    $('.h-pxl').innerHTML = `<thead><tr><th>Idea</th>${PXL_Q.map((q) => `<th style="min-width:90px">${q}</th>`).join('')}<th>Score</th></tr></thead><tbody>${PXL.map((r, i) => `<tr><td><b>${r.t}</b><br><span class="help">${r.n}</span></td>${PXL_Q.map((_, j) => `<td><select data-p="${i}-${j}" aria-label="${r.t}: ${PXL_Q[j]}"><option value=""></option><option value="1"${S.pxl[i][j] === 1 ? ' selected' : ''}>Yes</option><option value="0"${S.pxl[i][j] === 0 ? ' selected' : ''}>No</option></select></td>`).join('')}<td class="big">${S.pxl[i].every((v) => v !== null) ? pxlScore(S.pxl[i]) : '–'}</td></tr>`).join('')}</tbody>`;
    el.querySelectorAll('[data-p]').forEach((s) => s.addEventListener('change', () => { const [i, j] = s.dataset.p.split('-').map(Number); S.pxl[i][j] = s.value === '' ? null : Number(s.value); ctx.save(); table(); }));
  }
  $('.h-score').addEventListener('click', () => {
    ctx.act();
    const wrong = [];
    PXL.forEach((r, i) => r.a.forEach((v, j) => { if (S.pxl[i][j] !== v) wrong.push(`${r.t}: "${PXL_Q[j]}"`); }));
    $('.h-pxlout').innerHTML = wrong.length ? `<div class="notice warn"><strong>${wrong.length} answers to check.</strong> Read the notes again for: ${wrong.slice(0, 4).join('; ')}${wrong.length > 4 ? '…' : ''}</div>` : '<div class="notice ok"><strong>All scores right.</strong> Now pick the first test.</div>';
    if (!wrong.length) ctx.done('h4');
    first();
  });
  function first() {
    $('.h-first').innerHTML = ctx.isDone('h4') ? PXL.map((r, i) => `<button type="button" class="w-opt" data-f="${i}">${r.t} (${pxlScore(r.a)})</button>`).join('') : '<p class="help">Score the ideas first.</p>';
    el.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => {
      ctx.act();
      const ok = +b.dataset.f === FIRST;
      b.classList.add(ok ? 'right' : 'wrong');
      $('.h-firstout').innerHTML = ok ? '<div class="notice ok"><strong>Right.</strong> Big size buttons score 5 of 5: research and numbers back it, it is easy and on every product page. The duties message is next (it needs a pricing decision first). The green button scores 3 but has no evidence: never start there.</div>' : '<div class="notice warn">Pick the highest score. If two are close, start with the easier one.</div>';
      if (ok) ctx.done('h5');
    }));
  }
  ideas(); table(); first();
}
