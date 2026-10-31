// Lab: GTM workbench. A fake store pushes to a dataLayer; the learner builds variables, triggers and GA4 tags.
// Engine (pure) + UI. Ported and cleaned up from the CRO Dojo.

const RECOMMENDED = ['view_item', 'select_variant', 'add_to_cart', 'begin_checkout', 'purchase', 'view_item_list', 'select_item', 'view_cart', 'add_shipping_info', 'add_payment_info'];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function merge(t, s) {
  for (const k in s) {
    const v = s[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) { if (!t[k] || typeof t[k] !== 'object' || Array.isArray(t[k])) t[k] = {}; merge(t[k], v); }
    else t[k] = Array.isArray(v) ? JSON.parse(JSON.stringify(v)) : v;
  }
}

/** Pure GTM engine: container + dataLayer model → what fires and what GA4 receives. */
export function createEngine(container) {
  const E = { G: container, model: {}, ga4: [], seenTx: new Set(), log: [] };
  const resolve = (str, ev, missing) => {
    const one = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/.exec(str);
    const look = (name) => {
      if (name === 'Event') return ev;
      const v = E.G.vars.find((x) => x.name === name);
      if (!v) { missing.push(`no variable called {{${name}}}`); return undefined; }
      const r = getPath(E.model, v.path);
      if (r === undefined) missing.push(`{{${name}}} found nothing at "${v.path}"`);
      return r;
    };
    if (one) return look(one[1]);
    return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, n) => { const r = look(n); return r === undefined ? '' : String(r); });
  };
  E.push = (obj) => {
    merge(E.model, obj);
    const entry = { obj, fired: [], skipped: [], received: [] };
    if (obj.event) {
      const ev = obj.event;
      for (const tag of E.G.tags) {
        const tr = E.G.triggers.find((t) => t.name === tag.trigger);
        if (!tr) { entry.skipped.push(`${tag.name}: its trigger "${tag.trigger}" does not exist`); continue; }
        let hit;
        if (tr.match === 'regex') { try { hit = new RegExp(tr.event).test(ev); } catch { entry.skipped.push(`${tag.name}: regex "${tr.event}" is not valid`); continue; } }
        else hit = tr.event === ev;
        if (!hit) { entry.skipped.push(`${tag.name}: waits for "${tr.event}"${tr.match === 'regex' ? ' (regex)' : ''}, this event is "${ev}"`); continue; }
        const miss = [];
        const name = resolve(tag.ev, ev, miss);
        const params = {};
        for (const p of tag.params) params[p.k] = resolve(p.v, ev, miss);
        entry.fired.push(tag.name);
        const warns = miss.map((m) => 'Empty parameter: ' + m);
        if (!name) warns.push('Event name is empty');
        else if (!RECOMMENDED.includes(name) && RECOMMENDED.includes(String(name).toLowerCase())) warns.push(`GA4 event names are case-sensitive. "${name}" is not "${String(name).toLowerCase()}"`);
        if (params.value !== undefined && typeof params.value !== 'number') warns.push('value is not a number');
        if (params.value !== undefined && !params.currency) warns.push('value sent without currency: GA4 will not count it as revenue');
        let dup = false;
        if (name === 'purchase') { if (!params.transaction_id) warns.push('purchase without transaction_id: GA4 cannot remove duplicates'); else if (E.seenTx.has(params.transaction_id)) dup = true; else E.seenTx.add(params.transaction_id); }
        const rec = { name, params, warns, dup, tagEv: tag.ev, idx: E.ga4.length };
        E.ga4.push(rec); entry.received.push(rec);
      }
    }
    E.log.unshift(entry);
    return entry;
  };
  return E;
}
export const BROKEN = () => ({ vars: [{ name: 'DLV - value', path: 'ecommerce.price' }, { name: 'DLV - currency', path: 'ecommerce.curency' }], triggers: [{ name: 'CE - add to cart', event: 'Add To Cart', match: 'equals' }], tags: [{ name: 'GA4 - add_to_cart', ev: 'add_to_cart', trigger: 'CE - add to cart', params: [{ k: 'value', v: '{{DLV - value}}' }, { k: 'currency', v: '{{DLV - currency}}' }] }] });
/** Which tasks are done, given the engine and container. */
export function gtmChecks(E, brokenFrom) {
  const valid = (r) => typeof r.params.value === 'number' && r.params.currency === 'CAD';
  const d = [];
  if (E.ga4.some((r) => r.name === 'add_to_cart')) d.push('g1');
  if (E.ga4.some((r) => r.name === 'add_to_cart' && valid(r))) d.push('g2');
  if (E.ga4.some((r) => r.name === 'select_variant' && ['30ml', '50ml'].includes(r.params.variant))) d.push('g3');
  if (E.ga4.some((r) => r.name === 'purchase' && r.params.transaction_id && valid(r))) d.push('g4');
  if (E.ga4.some((r) => r.name === 'purchase' && r.dup)) d.push('g5');
  if (brokenFrom >= 0 && E.ga4.some((r) => r.idx >= brokenFrom && r.name === 'add_to_cart' && valid(r))) d.push('g6');
  if (E.ga4.some((r) => r.name === 'begin_checkout' && /\{\{\s*Event\s*\}\}/.test(r.tagEv)) && E.G.triggers.some((t) => t.match === 'regex')) d.push('g7');
  return d;
}

export function mount(el, ctx) {
  const S = ctx.state;
  if (!S.G?.vars) S.G = { vars: [], triggers: [], tags: [] };
  const E = createEngine(S.G);
  let variant = { size: '30ml', price: 34, id: 'HG-30' }, order = 1041, lastPurchase = null, brokenFrom = -1;
  const item = () => ({ item_id: variant.id, item_name: 'Hydra Glow Serum', item_variant: variant.size, price: variant.price, quantity: 1 });

  el.innerHTML = `
    <div class="two">
      <section class="card">
        <h3 style="margin-top:0">The store</h3>
        <div class="store">
          <div class="prod"><div class="bottle" aria-hidden="true"></div><div><b>Hydra Glow Serum</b><div class="mono g-price">CA$34.00 · 30ml</div><div class="help mono">glowshop.ca/products/hydra-glow</div></div></div>
          <div class="row"><button class="btn sec sm" data-act="v30" type="button">30 ml</button><button class="btn sec sm" data-act="v50" type="button">50 ml</button></div>
          <div class="row"><button class="btn sm" data-act="atc" type="button">Add to cart</button><button class="btn sec sm" data-act="chk" type="button">Checkout</button><button class="btn sec sm" data-act="buy" type="button">Place order</button></div>
          <div class="thanks g-thanks" hidden><span class="g-thx"></span><button class="btn sec sm" data-act="reload" type="button">Reload thank-you page</button></div>
        </div>
        <h4 style="margin:12px 0 6px">dataLayer (what the site said)</h4>
        <div class="feed g-dl"></div>
      </section>
      <section class="card">
        <h3 style="margin-top:0">Your GTM container</h3>
        <div class="row"><button class="btn sec sm g-broken" type="button">Load broken container (task 6)</button><button class="btn sec sm g-empty" type="button">Empty container</button></div>
        <h4 style="margin:12px 0 4px">Variables</h4>
        <div class="row"><div style="flex:1 1 120px"><label>Name<input class="g-vn" placeholder="DLV - value" /></label></div><div style="flex:1 1 140px"><label>Data layer path<input class="g-vp" placeholder="ecommerce.value" /></label></div><button class="btn sec sm g-vadd" type="button">Save</button></div>
        <div class="list g-vl"></div>
        <p class="help">Built-in: <code>{{Event}}</code> is the event name. Paths use dots, e.g. <code>ecommerce.transaction_id</code></p>
        <h4 style="margin:12px 0 4px">Triggers (custom event)</h4>
        <div class="row"><div style="flex:1 1 120px"><label>Name<input class="g-tn" placeholder="CE - add_to_cart" /></label></div><div style="flex:1 1 120px"><label>Event name<input class="g-te" placeholder="add_to_cart" /></label></div><div style="flex:0 1 130px"><label>Match<select class="g-tm"><option value="equals">equals</option><option value="regex">matches regex</option></select></label></div><button class="btn sec sm g-tadd" type="button">Save</button></div>
        <div class="list g-tl"></div>
        <h4 style="margin:12px 0 4px">GA4 event tags</h4>
        <div class="row"><div style="flex:1 1 120px"><label>Tag name<input class="g-gn" placeholder="GA4 - add_to_cart" /></label></div><div style="flex:1 1 120px"><label>GA4 event name<input class="g-ge" placeholder="add_to_cart" /></label></div><div style="flex:1 1 140px"><label>Firing trigger<select class="g-gt"></select></label></div></div>
        <label>Parameters, one per line: <code>key = value</code><textarea class="g-gp mono" rows="3" placeholder="value = {{DLV - value}}&#10;currency = {{DLV - currency}}"></textarea></label>
        <div class="row" style="margin-top:8px"><button class="btn sm g-gadd" type="button">Save tag</button></div>
        <div class="list g-gl"></div>
        <p class="help">Click a saved item to load it back into the form. Saving with the same name replaces it.</p>
      </section>
    </div>
    <section class="card"><h3 style="margin-top:0">Preview and GA4 DebugView</h3><p class="help">For every event: which tags fired, which did not and why, and what GA4 received.</p><div class="feed g-pv"></div></section>`;
  const $ = (s) => el.querySelector(s);
  const saveG = () => { S.G = E.G; ctx.save(); };
  const check = () => { for (const id of gtmChecks(E, brokenFrom)) ctx.done(id); };
  function renderLogs() {
    $('.g-dl').innerHTML = E.log.length ? E.log.slice(0, 20).map((e) => `<div class="ev"><span class="mono"><b>${e.obj.event ? esc(e.obj.event) : '(no event)'}</b></span><pre>${esc(JSON.stringify(e.obj, null, 1))}</pre></div>`).join('') : '<p class="help">Click something in the store. Each click drops a note here.</p>';
    const evs = E.log.filter((e) => e.obj.event);
    $('.g-pv').innerHTML = evs.length ? evs.slice(0, 15).map((e) => {
      const f = e.fired.length ? `<div class="ok">Fired: ${e.fired.map(esc).join(', ')}</div>` : '<div class="help">No tags fired</div>';
      const s = e.skipped.length ? `<div class="help">${e.skipped.map((x) => 'Not fired · ' + esc(x)).join('<br>')}</div>` : '';
      const r = e.received.map((rc) => {
        const chip = rc.dup ? '<span class="pill doing">duplicate · GA4 drops it</span>' : rc.warns.length ? `<span class="pill changes">${rc.warns.length} issue${rc.warns.length > 1 ? 's' : ''}</span>` : '<span class="pill done">clean</span>';
        return `<div>GA4 received <b class="mono">${esc(rc.name)}</b> ${chip}<pre>${esc(JSON.stringify(rc.params, null, 1))}</pre>${rc.warns.map((w) => `<div class="err">⚠ ${esc(w)}</div>`).join('')}</div>`;
      }).join('');
      return `<div class="ev"><b class="mono">${esc(e.obj.event)}</b>${f}${s}${r}</div>`;
    }).join('') : '<p class="help">Nothing yet. Build a trigger and a tag, then use the store.</p>';
  }
  function renderG() {
    const G = E.G;
    $('.g-vl').innerHTML = G.vars.map((v, i) => `<div class="item" data-k="v" data-i="${i}"><div><b>${esc(v.name)}</b> <span class="mono">${esc(v.path)}</span></div><button class="btn sec sm" data-del="v${i}" type="button" aria-label="Delete">✕</button></div>`).join('') || '<p class="help">No variables yet</p>';
    $('.g-tl').innerHTML = G.triggers.map((t, i) => `<div class="item" data-k="t" data-i="${i}"><div><b>${esc(t.name)}</b> <span class="mono">event ${t.match === 'regex' ? '~' : '='} ${esc(t.event)}</span></div><button class="btn sec sm" data-del="t${i}" type="button" aria-label="Delete">✕</button></div>`).join('') || '<p class="help">No triggers yet</p>';
    $('.g-gl').innerHTML = G.tags.map((g, i) => `<div class="item" data-k="g" data-i="${i}"><div><b>${esc(g.name)}</b> <span class="mono">${esc(g.ev)} · on "${esc(g.trigger)}"${g.params.length ? ' · ' + g.params.map((p) => esc(p.k)).join(', ') : ''}</span></div><button class="btn sec sm" data-del="g${i}" type="button" aria-label="Delete">✕</button></div>`).join('') || '<p class="help">No tags yet</p>';
    $('.g-gt').innerHTML = G.triggers.length ? G.triggers.map((t) => `<option>${esc(t.name)}</option>`).join('') : '<option value="">Create a trigger first</option>';
    el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); const k = b.dataset.del[0], i = +b.dataset.del.slice(1); ({ v: G.vars, t: G.triggers, g: G.tags })[k].splice(i, 1); saveG(); renderG(); }));
    el.querySelectorAll('.item[data-k]').forEach((it) => it.addEventListener('click', () => {
      const i = +it.dataset.i;
      if (it.dataset.k === 'v') { const v = G.vars[i]; $('.g-vn').value = v.name; $('.g-vp').value = v.path; }
      if (it.dataset.k === 't') { const t = G.triggers[i]; $('.g-tn').value = t.name; $('.g-te').value = t.event; $('.g-tm').value = t.match; }
      if (it.dataset.k === 'g') { const g = G.tags[i]; $('.g-gn').value = g.name; $('.g-ge').value = g.ev; $('.g-gt').value = g.trigger; $('.g-gp').value = g.params.map((p) => p.k + ' = ' + p.v).join('\n'); }
    }));
  }
  const upsert = (arr, obj) => { const i = arr.findIndex((x) => x.name === obj.name); if (i >= 0) arr[i] = obj; else arr.push(obj); };
  $('.g-vadd').addEventListener('click', () => { const name = $('.g-vn').value.trim(), path = $('.g-vp').value.trim(); if (!name || !path) return ctx.toast('Give the variable a name and a path.'); upsert(E.G.vars, { name, path }); saveG(); renderG(); $('.g-vn').value = ''; $('.g-vp').value = ''; ctx.act(); });
  $('.g-tadd').addEventListener('click', () => { const name = $('.g-tn').value.trim(), event = $('.g-te').value.trim(); if (!name || !event) return ctx.toast('Give the trigger a name and an event name.'); upsert(E.G.triggers, { name, event, match: $('.g-tm').value }); saveG(); renderG(); $('.g-tn').value = ''; $('.g-te').value = ''; ctx.act(); });
  $('.g-gadd').addEventListener('click', () => {
    const name = $('.g-gn').value.trim(), ev = $('.g-ge').value.trim(), trigger = $('.g-gt').value;
    if (!name || !ev || !trigger) return ctx.toast('A tag needs a name, an event name and a trigger.');
    const params = $('.g-gp').value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf('='); return i < 0 ? null : { k: l.slice(0, i).trim(), v: l.slice(i + 1).trim() }; }).filter((p) => p && p.k);
    upsert(E.G.tags, { name, ev, trigger, params }); saveG(); renderG(); ctx.act(); ctx.toast('Tag saved. Now use the store.');
  });
  $('.g-empty').addEventListener('click', () => { E.G = { vars: [], triggers: [], tags: [] }; brokenFrom = -1; saveG(); renderG(); ctx.toast('Container emptied.'); });
  $('.g-broken').addEventListener('click', () => { E.G = BROKEN(); brokenFrom = E.ga4.length; saveG(); renderG(); ctx.toast('Broken container loaded. Click Add to cart and read the Preview panel.'); });
  const ecom = (event, ecommerce) => { E.push({ ecommerce: null }); E.push({ event, ecommerce }); };
  el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
    ctx.act();
    const a = b.dataset.act;
    if (a === 'v30' || a === 'v50') { variant = a === 'v30' ? { size: '30ml', price: 34, id: 'HG-30' } : { size: '50ml', price: 52, id: 'HG-50' }; $('.g-price').textContent = `CA$${variant.price.toFixed(2)} · ${variant.size}`; E.push({ event: 'select_variant', variant: variant.size, variant_price: variant.price }); }
    if (a === 'atc') ecom('add_to_cart', { currency: 'CAD', value: variant.price, items: [item()] });
    if (a === 'chk') ecom('begin_checkout', { currency: 'CAD', value: variant.price, items: [item()] });
    if (a === 'buy') { order++; const tx = 'CA-' + order; lastPurchase = { transaction_id: tx, currency: 'CAD', value: variant.price, tax: +(variant.price * 0.13).toFixed(2), shipping: 9, items: [item()] }; ecom('purchase', lastPurchase); $('.g-thanks').hidden = false; $('.g-thx').textContent = 'Thank you! Order ' + tx; }
    if (a === 'reload' && lastPurchase) ecom('purchase', JSON.parse(JSON.stringify(lastPurchase)));
    renderLogs(); check();
  }));
  renderG();
  E.push({ ecommerce: null }); E.push({ event: 'view_item', ecommerce: { currency: 'CAD', value: 34, items: [item()] } });
  renderLogs();
}
