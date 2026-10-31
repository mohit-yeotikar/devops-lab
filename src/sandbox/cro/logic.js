// Pure CRO maths and rules used by the CRO practice labs (and their tests).

/* ---------- metrics ---------- */
export const cr = (orders, sessions) => (sessions ? orders / sessions : 0);
export const aov = (revenue, orders) => (orders ? revenue / orders : 0);
export const rpv = (revenue, sessions) => (sessions ? revenue / sessions : 0);
export const relLift = (a, b) => (a ? (b - a) / a : 0);

/** Is the typed answer close enough? kind: 'pct' (answer in %), 'money', 'num'. */
export function closeEnough(typed, truth, kind) {
  const v = Number(String(typed).replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(v) || String(typed).trim() === '') return false;
  if (kind === 'pct') return Math.abs(v - truth) <= 0.06 + Math.abs(truth) * 0.01;
  if (kind === 'money') return Math.abs(v - truth) <= Math.max(0.011, Math.abs(truth) * 0.01);
  return Math.abs(v - truth) <= Math.max(0.5, Math.abs(truth) * 0.01);
}

/* ---------- statistics ---------- */
export function phi(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}
export function zinv(p) {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425;
  let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
/** Two-sided p-value of a two-proportion z-test. */
export function pval(ca, na, cb, nb) {
  if (!na || !nb) return 1;
  const p = (ca + cb) / (na + nb);
  const se = Math.sqrt(p * (1 - p) * (1 / na + 1 / nb));
  if (!se) return 1;
  const z = (cb / nb - ca / na) / se;
  return 2 * (1 - phi(Math.abs(z)));
}
/** Visitors needed per variant (two-sided alpha 0.05). */
export function sampleSize(baseline, relMde, power = 0.8) {
  const p2 = baseline * (1 + relMde);
  const za = zinv(0.975), zb = zinv(power);
  return Math.ceil(((za + zb) ** 2 * (baseline * (1 - baseline) + p2 * (1 - p2))) / (p2 - baseline) ** 2);
}
/** Sample ratio mismatch check. Returns { chi, p, bad }. */
export function srm(a, b, shareA = 0.5) {
  const n = a + b, ea = n * shareA, eb = n * (1 - shareA);
  const chi = (a - ea) ** 2 / ea + (b - eb) ** 2 / eb;
  const p = 2 * (1 - phi(Math.sqrt(chi)));
  return { chi, p, bad: p < 0.01 };
}
export function randn(rand = Math.random) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
export function binom(n, p, rand = Math.random) { return Math.max(0, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * randn(rand))); }

/* ---------- GA4 default channel group (simplified, the parts that matter for UTMs) ---------- */
const SOCIAL = ['facebook', 'instagram', 'tiktok', 'pinterest', 'linkedin', 'twitter', 'x', 'youtube', 'reddit', 'snapchat', 'm.facebook.com', 'l.instagram.com'];
const SEARCH = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu', 'ecosia'];
export function channel(src, med) {
  src = (src || '').toLowerCase(); med = (med || '').toLowerCase();
  const paid = /^(.*cp.*|ppc|retargeting|paid.*)$/;
  if (src === '(direct)') return 'Direct';
  if (SOCIAL.includes(src) && paid.test(med)) return 'Paid Social';
  if (SEARCH.includes(src) && paid.test(med)) return 'Paid Search';
  if (['display', 'banner', 'expandable', 'interstitial', 'cpm'].includes(med)) return 'Display';
  if (SOCIAL.includes(src) || ['social', 'social-network', 'social-media', 'sm', 'social network', 'social media'].includes(med)) return 'Organic Social';
  if (SEARCH.includes(src) || med === 'organic') return 'Organic Search';
  if (/^(email|e-mail|e_mail|e mail)$/.test(src) || /^(email|e-mail|e_mail|e mail)$/.test(med)) return 'Email';
  if (med === 'affiliate') return 'Affiliates';
  if (med === 'referral') return 'Referral';
  return 'Unassigned';
}
export const CHANNELS = ['Paid Social', 'Organic Social', 'Paid Search', 'Organic Search', 'Email', 'Affiliates', 'Display', 'Referral', 'Unassigned'];

/** UTM link problems, in plain words. */
export function lintUtm(f, host = '') {
  const out = [];
  for (const k of ['source', 'medium', 'campaign']) if (!String(f[k] || '').trim()) out.push(`utm_${k} is empty. It is required.`);
  for (const [k, v] of Object.entries(f)) {
    if (!v) continue;
    if (v !== v.toLowerCase()) out.push(`utm_${k} has capital letters. "${v}" and "${v.toLowerCase()}" become two rows in GA4.`);
    if (/\s/.test(v)) out.push(`utm_${k} has spaces. Use _ or - instead.`);
  }
  if (/glowshop\./.test(host) && /(homepage|banner|internal|nav|footer)/.test(`${f.source} ${f.medium}`)) out.push('This looks like an internal link. Never tag links inside your own site.');
  return out;
}

/* ---------- funnel model (US vs Canada) ---------- */
export const STEPS = ['Sessions', 'Viewed a product', 'Added to cart', 'Started checkout', 'Reached shipping', 'Reached payment', 'Purchased'];
const SESS = { US: 120000, CA: 60000 };
export const MIX = { US: { paid_social: 0.35, search: 0.45, email: 0.2 }, CA: { paid_social: 0.55, search: 0.35, email: 0.1 } };
const DEV = { mobile: 0.7, desktop: 0.3 };
const VIEW = { paid_social: 0.55, search: 0.7, email: 0.75 };
const ATC = { paid_social: 0.085, search: 0.105, email: 0.13 };
const DATC = { mobile: 0.9, desktop: 1.2 };
export const CH = ['paid_social', 'search', 'email'];
function rates(m, d, c, caMobPay) {
  let pay = 0.8;
  if (m === 'CA') pay = d === 'mobile' ? caMobPay : 0.68;
  return [VIEW[c], ATC[c] * DATC[d] * (m === 'CA' ? 0.95 : 1), 0.55, 0.8, pay, 0.88];
}
export function funnel(m, dF = 'all', cF = 'all', mixFrom, caMobPay = 0.5) {
  const t = STEPS.map(() => 0);
  for (const d of ['mobile', 'desktop']) {
    if (dF !== 'all' && d !== dF) continue;
    for (const c of CH) {
      if (cF !== 'all' && c !== cF) continue;
      let n = SESS[m] * MIX[mixFrom || m][c] * DEV[d];
      t[0] += n;
      rates(m, d, c, caMobPay).forEach((r, i) => { n *= r; t[i + 1] += n; });
    }
  }
  return t;
}
/** Index of the step where Canada loses most compared with the US. */
export function worstStep(dF = 'all', cF = 'all', caMobPay = 0.5) {
  const us = funnel('US', dF, cF, undefined, caMobPay), ca = funnel('CA', dF, cF, undefined, caMobPay);
  let worst = -1, wv = -1;
  for (let i = 1; i < STEPS.length; i++) { const g = us[i] / us[i - 1] - ca[i] / ca[i - 1]; if (g > wv) { wv = g; worst = i; } }
  return worst;
}
