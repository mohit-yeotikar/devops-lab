// Lab: UX audit. A mobile product page and cart for a Canadian shopper with 8 problems and some parts that are fine.

const FINE = 'Nothing. This part is fine.';
export const SPOTS = {
  menu: { label: 'Header and menu', issue: false, opts: ['The logo is too small', FINE, 'The menu needs more links'], why: 'A simple header with menu and cart is standard. Leave it.' },
  photo: { label: 'Product photo', issue: true, opts: ['The photo is too bright', 'Tapping the photo does nothing: people expect to zoom', FINE], c: 1, why: 'Dead clicks on photos are common. Add tap-to-zoom with a small zoom icon.' },
  title: { label: 'Title area', issue: true, opts: ['No star rating near the title; reviews are hidden at the very bottom', 'The title font is wrong', FINE], c: 0, why: 'Social proof near the price answers "is it good?" early. Show stars and the review count under the title.' },
  price: { label: 'Price', issue: true, opts: [FINE, 'The price is in US dollars for a shopper in Canada', 'The price is too low'], c: 1, why: 'Canadians must guess the final cost. Show CAD prices with Shopify Markets.' },
  size: { label: 'Size picker', issue: true, opts: ['A tiny dropdown that says only "Select"; sizes are hidden', FINE, 'There are too many sizes'], c: 0, why: 'Show sizes as big buttons (30 ml / 50 ml) with the price of each.' },
  ship: { label: 'Shipping line', issue: true, opts: ['"Shipping calculated at checkout": the cost is hidden until the end', FINE, 'The text is too long'], c: 0, why: 'Hidden costs are the top reason for leaving. Show the CAD shipping cost or a free-shipping threshold on the page.' },
  desc: { label: 'Description', issue: false, opts: ['It needs more words', FINE, 'It should be a video'], why: 'A short description with how to use it is fine.' },
  atc: { label: 'Add to cart button', issue: true, opts: [FINE, 'Small grey outline button far down the page, not sticky on mobile', 'The button text is too short'], c: 1, why: 'On mobile the main button should be clear, high contrast and easy to reach (sticky bar).' },
  item: { label: 'Cart item', issue: false, opts: [FINE, 'The photo should be bigger', 'Quantity should be hidden'], why: 'Product, size, quantity and price are all shown. Good.' },
  coupon: { label: 'Coupon box', issue: true, opts: ['A big "Have a coupon code?" box at the top sends people to search for codes', FINE, 'The box should be red'], c: 0, why: 'A big coupon field makes people leave to hunt for codes. Make it a small link near the total.' },
  duties: { label: 'Duties note', issue: true, opts: [FINE, 'Tiny grey text: "Duties and taxes may be due on delivery" creates fear of extra costs', 'It should be in bold red'], c: 1, why: 'Canadians fear customs fees at the door. Offer duties-included prices (DDP) and say it clearly.' },
  checkout: { label: 'Checkout button', issue: false, opts: [FINE, 'It should say "Buy now"', 'It should be smaller'], why: 'A clear checkout button is fine.' },
};
export const ISSUE_IDS = Object.keys(SPOTS).filter((k) => SPOTS[k].issue);
export const TOP3_MUST = ['duties', 'size']; // plus one of ship, price, atc
export const TOP3_OK = ['ship', 'price', 'atc'];
export const DECIDE = [
  { id: 'price', q: 'Show prices in CAD for Canadian visitors', a: 'fix', why: 'Wrong currency is an error, not an idea. Fix it with Shopify Markets.' },
  { id: 'photo', q: 'Add tap-to-zoom on the product photo', a: 'fix', why: 'People clearly expect it and it cannot hurt. Fix and measure.' },
  { id: 'coupon', q: 'Hide the coupon box behind a small link', a: 'test', why: 'It may lower coupon hunting but could annoy people who have a code. Test it.' },
  { id: 'duties', q: 'Switch to duties-included pricing for Canada', a: 'test', why: 'It changes price and margin. Test the impact on RPV before rolling it out.' },
];

export function mount(el, ctx) {
  const S = ctx.state;
  S.found ??= {}; S.top ??= []; S.dec ??= {};
  const spot = (id, inner, cls = '') => `<button type="button" class="ux-spot ${cls}${S.found[id] ? ' found' : ''}" data-spot="${id}">${inner}</button>`;
  el.innerHTML = `
    <div class="two">
      <section class="card">
        <div class="row between"><h3 style="margin:0">GlowShop on a phone (Canada)</h3><button type="button" class="btn sec sm ux-tog">Open the cart</button></div>
        <div class="phone">
          <div class="ux-page">
            ${spot('menu', '☰ <b>GlowShop</b> <span style="float:right">🛒 1</span>', 'ux-head')}
            ${spot('photo', '<span class="ux-photo">Hydra Glow Serum photo</span>')}
            ${spot('title', '<b style="font-size:17px">Hydra Glow Serum</b><br><span class="help">Hydrating serum with hyaluronic acid</span>')}
            ${spot('price', '<b style="font-size:18px">$34.00 USD</b>')}
            ${spot('size', 'Size: <span class="ux-select">Select ▾</span>')}
            ${spot('ship', '<span class="help" style="font-size:12px">Shipping calculated at checkout.</span>')}
            ${spot('desc', '<span style="font-size:13px">Apply 2–3 drops on clean skin, morning and night. Suitable for all skin types. 30 ml or 50 ml glass bottle with dropper…</span>')}
            ${spot('atc', '<span class="ux-atc">Add to cart</span>')}
          </div>
          <div class="ux-cart" hidden>
            <b>Your cart</b>
            ${spot('coupon', '<span class="ux-coupon">Have a coupon code? <span>Apply</span></span>')}
            ${spot('item', 'Hydra Glow Serum · 30 ml × 1 <span style="float:right">$34.00</span>')}
            ${spot('duties', '<span style="font-size:10px;color:#9aa0a6">Duties and taxes may be due on delivery.</span>')}
            ${spot('checkout', '<span class="ux-checkout">Check out</span>')}
          </div>
        </div>
      </section>
      <section class="card">
        <h3 style="margin-top:0">Your audit</h3>
        <p class="help">Tap a part of the phone page. Then choose what is wrong.</p>
        <div class="ux-ask"></div>
        <div class="ux-found"></div>
      </section>
    </div>
    <section class="card ux-next"></section>`;
  const $ = (s) => el.querySelector(s);
  $('.ux-tog').addEventListener('click', () => { const c = $('.ux-cart'); c.hidden = !c.hidden; $('.ux-page').hidden = !c.hidden; $('.ux-tog').textContent = c.hidden ? 'Open the cart' : 'Back to the product'; });
  function ask(id) {
    const sp = SPOTS[id];
    $('.ux-ask').innerHTML = `<div class="w-q"><p><b>${sp.label}: what is wrong here?</b></p><div class="w-opts">${sp.opts.map((o, i) => `<button type="button" class="w-opt" data-o="${i}">${o}</button>`).join('')}</div><div class="ux-res"></div></div>`;
    $('.ux-ask').querySelectorAll('[data-o]').forEach((b) => b.addEventListener('click', () => {
      ctx.act();
      const pick = sp.opts[+b.dataset.o];
      const right = sp.issue ? +b.dataset.o === sp.c : pick === FINE;
      b.classList.add(right ? 'right' : 'wrong');
      $('.ux-res').innerHTML = `<div class="notice ${right ? 'ok' : 'warn'}">${right ? '<strong>Right.</strong> ' : '<strong>Not quite.</strong> '}${right ? sp.why : 'Look again and think like a shopper in Canada on a phone.'}</div>`;
      if (right && sp.issue) { S.found[id] = true; ctx.save(); paint(); }
    }));
  }
  function paint() {
    el.querySelectorAll('[data-spot]').forEach((b) => b.classList.toggle('found', !!S.found[b.dataset.spot]));
    const n = ISSUE_IDS.filter((k) => S.found[k]).length;
    if (n >= 2) ctx.done('x1'); if (n >= 4) ctx.done('x2'); if (n === ISSUE_IDS.length) ctx.done('x3');
    $('.ux-found').innerHTML = `<h4 style="margin:16px 0 6px">Problems found: ${n} of ${ISSUE_IDS.length}</h4><ul class="steps">${ISSUE_IDS.filter((k) => S.found[k]).map((k) => `<li><b>${SPOTS[k].label}</b>: ${SPOTS[k].why}</li>`).join('')}</ul>`;
    if (n < ISSUE_IDS.length) { $('.ux-next').hidden = true; return; }
    $('.ux-next').hidden = false;
    $('.ux-next').innerHTML = `
      <h3 style="margin-top:0">Rank: pick the 3 problems to fix first</h3>
      <div class="w-checks">${ISSUE_IDS.map((k) => `<label class="w-check"><input type="checkbox" data-top="${k}" ${S.top.includes(k) ? 'checked' : ''}> ${SPOTS[k].label}</label>`).join('')}</div>
      <button type="button" class="btn sm ux-rank" style="margin-top:8px">Check my top 3</button><div class="ux-rankout"></div>
      <h3>Just fix it, or A/B test it?</h3>
      ${DECIDE.map((d) => `<div class="row" style="margin:6px 0"><span style="flex:1 1 240px">${d.q}</span><select data-dec="${d.id}" style="flex:0 1 160px"><option value="">Choose</option><option value="fix"${S.dec[d.id] === 'fix' ? ' selected' : ''}>Just fix it</option><option value="test"${S.dec[d.id] === 'test' ? ' selected' : ''}>A/B test it</option></select></div>`).join('')}
      <button type="button" class="btn sm ux-dec" style="margin-top:8px">Check my decisions</button><div class="ux-decout"></div>`;
    $('.ux-rank').addEventListener('click', () => {
      ctx.act();
      S.top = [...el.querySelectorAll('[data-top]:checked')].map((x) => x.dataset.top); ctx.save();
      const ok = S.top.length === 3 && TOP3_MUST.every((k) => S.top.includes(k)) && S.top.some((k) => TOP3_OK.includes(k));
      $('.ux-rankout').innerHTML = `<div class="notice ${ok ? 'ok' : 'warn'}">${ok ? '<strong>Good ranking.</strong> ' : '<strong>Think again.</strong> '}The size picker blocks adding to cart, and the duties note scares people away at the most valuable step. Third: one of shipping cost, price currency or the hidden button. Zoom, reviews and the coupon box matter, but less.</div>`;
      if (ok) ctx.done('x4');
    });
    $('.ux-dec').addEventListener('click', () => {
      ctx.act();
      el.querySelectorAll('[data-dec]').forEach((s) => (S.dec[s.dataset.dec] = s.value)); ctx.save();
      const wrong = DECIDE.filter((d) => S.dec[d.id] !== d.a);
      $('.ux-decout').innerHTML = `<div class="notice ${wrong.length ? 'warn' : 'ok'}">${wrong.length ? `<strong>${wrong.length} to rethink.</strong>` : '<strong>All right.</strong>'}<ul style="margin:6px 0 0">${DECIDE.map((d) => `<li>${d.q}: <b>${d.a === 'fix' ? 'just fix it' : 'A/B test it'}</b>. ${d.why}</li>`).join('')}</ul></div>`;
      if (!wrong.length) ctx.done('x5');
    });
  }
  el.querySelectorAll('[data-spot]').forEach((b) => b.addEventListener('click', () => ask(b.dataset.spot)));
  paint();
}
