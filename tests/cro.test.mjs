import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cr, aov, rpv, closeEnough, pval, sampleSize, srm, channel, lintUtm, funnel, worstStep } from '../src/sandbox/cro/logic.js';
import { croLabs } from '../src/sandbox/cro/labs.js';
import { UQ } from '../src/sandbox/cro/widgets/utm.js';
import { RECS, TAGS, TOP, checkHypothesis } from '../src/sandbox/cro/widgets/behaviour.js';
import { SPOTS, ISSUE_IDS, DECIDE } from '../src/sandbox/cro/widgets/ux.js';
import { PXL, FIRST, pxlScore, validCombo } from '../src/sandbox/cro/widgets/hypothesis.js';
import { REPORTS } from '../src/sandbox/cro/widgets/results.js';
import { createEngine, BROKEN, gtmChecks } from '../src/sandbox/cro/widgets/gtm.js';
import { allLabs } from '../src/sandbox/registry.js';

test('metrics and tolerance', () => {
  assert.equal(cr(20, 1000), 0.02); assert.equal(aov(1600, 20), 80); assert.equal(rpv(1600, 1000), 1.6);
  assert.ok(closeEnough('2.0', 2.0, 'pct')); assert.ok(closeEnough('2.04%', 2.0, 'pct')); assert.ok(!closeEnough('2.3', 2.0, 'pct'));
  assert.ok(closeEnough('CA$80.00', 80, 'money')); assert.ok(!closeEnough('', 80, 'money'));
});
test('statistics', () => {
  const n = sampleSize(0.02, 0.1, 0.8);
  assert.ok(n > 75000 && n < 85000, `sample size ${n}`);
  assert.ok(srm(50000, 48200).bad); assert.ok(!srm(50000, 49900).bad);
  assert.ok(pval(800, 40000, 920, 40100) < 0.05);
  assert.ok(pval(720, 36000, 740, 36100) > 0.3);
});
test('GA4 channel rules used in the UTM lab', () => {
  const ch = (u) => { const p = new URLSearchParams(u); return channel(p.get('utm_source'), p.get('utm_medium')); };
  assert.deepEqual(UQ.map((q) => ch(q.u)), ['Paid Social', 'Organic Social', 'Email', 'Paid Search', 'Organic Social', 'Affiliates', 'Unassigned', 'Paid Social']);
  assert.equal(lintUtm({ source: 'facebook', medium: 'paid_social', campaign: 'bf_ca' }).length, 0);
  assert.ok(lintUtm({ source: 'Facebook', medium: 'Paid Social', campaign: 'x' }).length >= 2);
});
test('funnel model tells the intended story', () => {
  assert.equal(worstStep(), 5, 'shipping → payment is the worst step');
  const gap = (d) => { const us = funnel('US', d), ca = funnel('CA', d); return us[5] / us[4] - ca[5] / ca[4]; };
  assert.ok(gap('mobile') > gap('desktop'));
  const a = funnel('CA'), b = funnel('CA', 'all', 'all', 'US'), u = funnel('US');
  const share = (b[6] / b[0] - a[6] / a[0]) / (u[6] / u[0] - a[6] / a[0]);
  assert.ok(share > 0.1 && share < 0.35, `mix share ${share}`);
  const fixed = funnel('CA', 'all', 'all', undefined, 0.8);
  assert.ok(fixed[6] / fixed[0] >= 0.015, 'slider can reach 1.5%');
});
test('GTM engine: solution path completes all tasks', () => {
  const E = createEngine({ vars: [], triggers: [], tags: [] });
  E.G.vars.push({ name: 'v', path: 'ecommerce.value' }, { name: 'c', path: 'ecommerce.currency' }, { name: 't', path: 'ecommerce.transaction_id' }, { name: 'var', path: 'variant' });
  E.G.triggers.push({ name: 'atc', event: 'add_to_cart', match: 'equals' }, { name: 'sv', event: 'select_variant', match: 'equals' }, { name: 'buy', event: 'purchase', match: 'equals' }, { name: 'many', event: '^(add_to_cart|begin_checkout|purchase)$', match: 'regex' });
  E.G.tags.push({ name: 'A', ev: 'add_to_cart', trigger: 'atc', params: [{ k: 'value', v: '{{v}}' }, { k: 'currency', v: '{{c}}' }] }, { name: 'S', ev: 'select_variant', trigger: 'sv', params: [{ k: 'variant', v: '{{var}}' }] }, { name: 'P', ev: 'purchase', trigger: 'buy', params: [{ k: 'transaction_id', v: '{{t}}' }, { k: 'value', v: '{{v}}' }, { k: 'currency', v: '{{c}}' }] }, { name: 'M', ev: '{{Event}}', trigger: 'many', params: [] });
  const ecom = (event, e) => { E.push({ ecommerce: null }); E.push({ event, ecommerce: e }); };
  E.push({ event: 'select_variant', variant: '50ml' });
  ecom('add_to_cart', { currency: 'CAD', value: 52 });
  ecom('begin_checkout', { currency: 'CAD', value: 52 });
  const p = { transaction_id: 'CA-1', currency: 'CAD', value: 52 };
  ecom('purchase', p); ecom('purchase', { ...p });
  const before = gtmChecks(E, -1);
  for (const id of ['g1', 'g2', 'g3', 'g4', 'g5', 'g7']) assert.ok(before.includes(id), id);
  const B = createEngine(BROKEN()); B.push({ ecommerce: null }); B.push({ event: 'add_to_cart', ecommerce: { currency: 'CAD', value: 34 } });
  assert.ok(!gtmChecks(B, 0).includes('g6'), 'broken container must not pass');
  B.G.vars[0].path = 'ecommerce.value'; B.G.vars[1].path = 'ecommerce.currency'; B.G.triggers[0].event = 'add_to_cart';
  B.push({ ecommerce: null }); B.push({ event: 'add_to_cart', ecommerce: { currency: 'CAD', value: 34 } });
  assert.ok(gtmChecks(B, 0).includes('g6'), 'fixed container passes');
});
test('behaviour lab data is consistent', () => {
  const counts = TAGS.map((_, j) => RECS.filter((r) => r.a === j).length);
  assert.equal(counts.indexOf(Math.max(...counts)), TOP);
  assert.ok(RECS.filter((r) => r.a === TOP).every((r) => /iPhone/.test(r.d)));
  assert.deepEqual(checkHypothesis({ evidence: '6 of 12 iPhone recordings rage-click the size picker', change: 'big buttons for each size', audience: 'iPhone Safari visitors', metric: 'Add-to-cart rate' }), []);
  assert.ok(checkHypothesis({ evidence: 'people', change: 'green', audience: 'all', metric: 'Page views' }).length >= 4);
});
test('UX, hypothesis and results labs have one right answer each', () => {
  assert.equal(ISSUE_IDS.length, 8);
  for (const k of ISSUE_IDS) assert.ok(SPOTS[k].opts[SPOTS[k].c]);
  assert.equal(DECIDE.length, 4);
  const scores = PXL.map((r) => pxlScore(r.a));
  assert.equal(scores.indexOf(Math.max(...scores)), FIRST);
  assert.equal(scores.filter((s) => s === Math.max(...scores)).length, 1, 'single top idea');
  assert.ok(validCombo('ship', 'ship', 'payrate') && !validCombo('ship', 'size', 'atc') && !validCombo('size', 'size', 'pv'));
  const r = Object.fromEntries(REPORTS.map((x) => [x.id, x]));
  assert.ok(pval(r.r1.a.c, r.r1.a.n, r.r1.b.c, r.r1.b.n) < 0.05 && r.r1.b.rev / r.r1.b.n > r.r1.a.rev / r.r1.a.n);
  assert.ok(srm(r.r2.a.n, r.r2.b.n).bad);
  assert.ok(r.r4.b.rev / r.r4.b.n < r.r4.a.rev / r.r4.a.n && r.r4.b.c > r.r4.a.c);
  assert.ok(pval(r.r5.a.c, r.r5.a.n, r.r5.b.c, r.r5.b.n) > 0.05);
  assert.ok(!srm(r.r1.a.n, r.r1.b.n).bad && !srm(r.r3.a.n, r.r3.b.n).bad);
});
test('every lab has unique ids, tasks and a 3-question quiz', () => {
  const ids = allLabs.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const l of croLabs) {
    assert.ok(l.tasks.length >= 5, l.id); assert.equal(l.quiz.length, 3, l.id);
    assert.equal(new Set(l.tasks.map((t) => t.id)).size, l.tasks.length, l.id);
    for (const q of l.quiz) assert.ok(q.answer >= 0 && q.answer < q.options.length, l.id);
  }
});
