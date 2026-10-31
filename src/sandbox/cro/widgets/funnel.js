// Lab: Funnel detective (US vs Canada). Ported from the CRO Dojo.
import { STEPS, MIX, CH, funnel, worstStep } from '../logic.js';

const fmt = (n) => Math.round(n).toLocaleString('en-US');
const pct = (n, d = 1) => (n * 100).toFixed(d) + '%';
const CHN = { paid_social: 'Paid social', search: 'Search', email: 'Email' };
const FQ = [
  { id: 'f1', q: 'At which step does Canada lose the most extra people compared to the US?', o: ['Viewed a product → Added to cart', 'Started checkout → Reached shipping', 'Reached shipping → Reached payment', 'Reached payment → Purchased'], c: 2, x: 'Right. The shipping step is where Canadians first see shipping cost, delivery time and the duties note. Other steps are close to the US.' },
  { id: 'f2', q: 'Is that leak bigger on mobile or on desktop?', o: ['Mobile', 'Desktop', 'About the same'], c: 0, x: 'Mobile. With Device = Mobile the gap at that step gets much bigger. Small screens hide the small print until it is a surprise. The clues below are now open.' },
  { id: 'f3', q: 'Canada gets more paid-social traffic. How much of the total gap does traffic mix explain?', o: ['Almost all of it', 'Roughly a fifth', 'None'], c: 1, x: 'About a fifth. The mix costs Canada a little, but most of the gap is the shipping step. Fixing the site matters more than changing media.' },
  { id: 'f4', q: 'Based on the clues, which hypothesis do you test first?', o: ['Change the Add to cart button colour', 'Show "duties and taxes included" and the CAD shipping cost on the product page and in the cart, so the shipping step holds no surprise', 'Make the homepage video shorter'], c: 1, x: 'Yes. Funnel (where), segment (mobile) and recordings (why) all agree. Primary metric: RPV.' },
];
const CLUES = [
  'Clarity, Canada, mobile, shipping step: 41% of sessions scroll to the small text "Duties and taxes may be due on delivery" and leave within 10 seconds.',
  'Clarity: rage clicks on the shipping options box on iPhone. Only one option shows: "Standard 7–12 business days, CA$14.95".',
  'On-site survey (Canada): "Will I pay customs?" is the number one question, asked 3 times more than in the US.',
];

export function mount(el, ctx) {
  const S = ctx.state;
  S.answered ??= {};
  let caMobPay = 0.5;
  el.innerHTML = `
    <section class="card">
      <div class="row">
        <div style="flex:1 1 160px"><label for="f-dev">Device</label><select id="f-dev" class="f-dev"><option value="all">All devices</option><option value="mobile">Mobile</option><option value="desktop">Desktop</option></select></div>
        <div style="flex:1 1 160px"><label for="f-ch">Channel</label><select id="f-ch" class="f-ch"><option value="all">All channels</option><option value="paid_social">Paid social</option><option value="search">Search</option><option value="email">Email</option></select></div>
      </div>
      <div class="kpis f-kpis"></div>
      <div class="tbl"><table class="f-table"></table></div>
      <p class="help">Red row = the step where Canada loses the most extra people compared with the US. One month of example data for GlowShop.</p>
    </section>
    <div class="two">
      <section class="card">
        <h3 style="margin-top:0">Traffic mix check</h3>
        <div class="tbl"><table class="f-mix"></table></div>
        <button class="btn sec f-mixbtn" type="button" style="margin-top:10px">Recalculate Canada with the US traffic mix</button>
        <div class="w-out f-mixout">Press the button to see what Canada would convert at with the same channels as the US.</div>
      </section>
      <section class="card">
        <h3 style="margin-top:0">What fixing it is worth</h3>
        <label for="f-pay">Canada mobile, shipping → payment step rate: <b class="f-payv"></b></label>
        <input id="f-pay" type="range" class="f-pay" min="40" max="80" step="1" value="50" style="padding:0" />
        <div class="kpis f-impact"></div>
        <p class="help">Average order value CA$85. Drag the slider to see what one fix is worth.</p>
      </section>
    </div>
    <section class="card"><h3 style="margin-top:0">Case questions</h3><div class="f-quiz"></div><div class="f-clues"></div></section>`;
  const $ = (s) => el.querySelector(s);
  function render() {
    const dF = $('.f-dev').value, cF = $('.f-ch').value;
    const us = funnel('US', dF, cF, undefined, caMobPay), ca = funnel('CA', dF, cF, undefined, caMobPay);
    const worst = worstStep(dF, cF, caMobPay);
    let h = `<thead><tr><th>Step</th><th>US people</th><th>US step rate</th><th>Canada people</th><th>Canada step rate</th><th>Gap</th></tr></thead><tbody><tr><td>${STEPS[0]}</td><td>${fmt(us[0])}</td><td>–</td><td>${fmt(ca[0])}</td><td>–</td><td>–</td></tr>`;
    for (let i = 1; i < STEPS.length; i++) {
      const ru = us[i] / us[i - 1], rc = ca[i] / ca[i - 1], g = ru - rc;
      h += `<tr class="${i === worst ? 'hot' : ''}"><td>${STEPS[i]}</td><td>${fmt(us[i])}</td><td>${pct(ru)}</td><td>${fmt(ca[i])}</td><td>${pct(rc)}</td><td>${(g * 100).toFixed(1)} pp<span class="gapbar" style="width:${Math.max(0, Math.round(g * 300))}px"></span></td></tr>`;
    }
    $('.f-table').innerHTML = h + '</tbody>';
    $('.f-kpis').innerHTML = `<div><span class="eyebrow">US conversion</span><span class="big">${pct(us[6] / us[0], 2)}</span></div><div><span class="eyebrow">Canada conversion</span><span class="big">${pct(ca[6] / ca[0], 2)}</span></div><div><span class="eyebrow">Gap</span><span class="big">${((us[6] / us[0] - ca[6] / ca[0]) * 100).toFixed(2)} pp</span></div>`;
    $('.f-mix').innerHTML = `<thead><tr><th>Channel</th><th>US share</th><th>CA share</th><th>US conv.</th><th>CA conv.</th></tr></thead><tbody>` + CH.map((c) => { const u = funnel('US', 'all', c), k = funnel('CA', 'all', c); return `<tr><td>${CHN[c]}</td><td>${pct(MIX.US[c], 0)}</td><td>${pct(MIX.CA[c], 0)}</td><td>${pct(u[6] / u[0], 2)}</td><td>${pct(k[6] / k[0], 2)}</td></tr>`; }).join('') + '</tbody>';
    $('.f-payv').textContent = `${pct(caMobPay, 0)} (US is 80%)`;
    const base = funnel('CA', 'all', 'all', undefined, 0.5), now = funnel('CA', 'all', 'all', undefined, caMobPay);
    const cr = now[6] / now[0], extra = (now[6] - base[6]) * 85;
    $('.f-impact').innerHTML = `<div><span class="eyebrow">Canada conversion</span><span class="big">${pct(cr, 2)}</span></div><div><span class="eyebrow">Extra orders / month</span><span class="big">${fmt(now[6] - base[6])}</span></div><div><span class="eyebrow">Extra revenue / month</span><span class="big">CA$${fmt(extra)}</span></div>`;
    if (cr >= 0.015) ctx.done('f5');
  }
  function quiz() {
    $('.f-quiz').innerHTML = FQ.map((q, qi) => {
      const locked = q.id === 'f4' && !ctx.isDone('f2');
      const done = ctx.isDone(q.id);
      return `<div class="w-q"><p><b>${qi + 1}. ${q.q}</b></p>${locked ? '<p class="help">Answer question 2 first. It opens the clues.</p>' : `<div class="w-opts">${q.o.map((o, oi) => `<button type="button" class="w-opt${done && oi === q.c ? ' right' : ''}" data-q="${qi}" data-o="${oi}">${o}</button>`).join('')}</div>${done ? `<div class="w-out">${q.x}</div>` : ''}`}</div>`;
    }).join('');
    el.querySelectorAll('.f-quiz .w-opt').forEach((b) => b.addEventListener('click', () => {
      ctx.act();
      const q = FQ[+b.dataset.q];
      if (+b.dataset.o === q.c) { ctx.done(q.id); quiz(); } else { b.classList.add('wrong'); ctx.toast('Not quite. Use the filters and the tables, then try again.'); }
    }));
    $('.f-clues').innerHTML = ctx.isDone('f2') ? '<h4 style="margin:16px 0 8px">Clues unlocked</h4>' + CLUES.map((c) => `<div class="clue">${c}</div>`).join('') : '';
  }
  $('.f-dev').addEventListener('change', render);
  $('.f-ch').addEventListener('change', render);
  $('.f-pay').addEventListener('input', (e) => { caMobPay = e.target.value / 100; render(); });
  $('.f-mixbtn').addEventListener('click', () => {
    ctx.act();
    const real = funnel('CA'), mixed = funnel('CA', 'all', 'all', 'US'), us = funnel('US');
    const a = real[6] / real[0], b = mixed[6] / mixed[0], u = us[6] / us[0];
    $('.f-mixout').innerHTML = `Canada today: <b>${pct(a, 2)}</b>. Canada with the US channel mix: <b>${pct(b, 2)}</b>. US: <b>${pct(u, 2)}</b>. So traffic mix explains about <b>${Math.round(((b - a) / (u - a)) * 100)}%</b> of the gap. The rest is the site and the offer.`;
  });
  render(); quiz();
}
