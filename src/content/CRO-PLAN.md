# CRO track: curriculum plan (source of truth for the 12 sprint files)

Company story: **GlowShop**, a D2C skincare brand on Shopify that sells in the US (USD) and Canada (CAD, English + French).
The trainee joins as a junior CRO and analytics specialist. Over 12 sprints they learn to measure, research, test and
improve the store, from the basics to an advanced CRO programme.

Practice ground (all free, never spend money):
- **Practice store**: a free Shopify Partner development store with the free Dawn theme (shopify.com/partners).
  The trainee adds 6-8 GlowShop products (serums, creams, cleanser) with variants (30 ml / 50 ml).
- **GA4 demo account** (Google Merchandise Store, real data) and the trainee's own **GA4 property** + **GTM container**
  connected to the practice store.
- Microsoft **Clarity** (free), **Looker Studio** (free), **PageSpeed Insights**, Chrome DevTools.
- Experiments: **GrowthBook Cloud free plan** (or a VWO free trial if they prefer; start it only in sprint 10).
- Meta: a free Business account, Events Manager **Test events** (no ad spend).
- The browser practice labs in this app (ids below). Tickets point to them when they practise a skill.

Browser practice labs (ids to reference with "lab": "<id>" on case tickets, or mention in steps):
- `cro-metrics`   Metrics drill: CR, AOV, RPV, step rates, relative vs absolute lift (sprint 1)
- `cro-funnel`    Funnel detective: find the leaking step and segment, US vs Canada (sprint 2)
- `cro-gtm`       GTM workbench: dataLayer, variables, triggers, GA4 tags, Preview, fix a broken container (sprints 3-4)
- `cro-utm`       UTMs and GA4 channels (sprint 5)
- `cro-behaviour` Behaviour lab: recordings and heatmap signals to a hypothesis (sprint 6)
- `cro-ux`        UX audit: find friction on a mobile product page and cart (sprint 7)
- `cro-hypothesis` Hypotheses and prioritisation (ICE) to a roadmap (sprint 8)
- `cro-ab`        A/B statistics: sample size, peeking, SRM (sprint 9)
- `cro-results`   Read test results and make the right call (sprint 10)

| id | weeks | title | what it covers (basic → advanced) | case ticket |
|---|---|---|---|---|
| c01 | 1-2 | How online stores make money | funnel, CR/AOV/RPV, micro vs macro conversions, set up the practice store with products and variants, a metrics sheet in Google Sheets, a one-page "how GlowShop makes money" note | - |
| c02 | 3-4 | Google Analytics 4 basics | GA4 demo account, reports vs explorations, events and parameters, key events, funnel exploration by device and country, segments, comparisons | case: "mobile conversion fell" using `cro-funnel` |
| c03 | 5-6 | Tag Manager and the dataLayer | create GTM container + GA4 property for the practice store, Google tag, dataLayer, variables/triggers/tags, Preview + DebugView, naming conventions | case: "add_to_cart missing in GA4" using `cro-gtm` |
| c04 | 7-8 | E-commerce tracking end to end | GA4 e-commerce events, Shopify Customer Events + custom pixel (checkout_started, checkout_completed), transaction_id + dedup, reconcile GA4 vs Shopify orders, Consent Mode v2 | case: "GA4 shows 30% fewer purchases than Shopify" |
| c05 | 9-10 | Traffic, UTMs and dashboards | UTM rules sheet, GA4 default channel groups, unassigned traffic, attribution basics, Looker Studio CRO dashboard (CR, AOV, RPV by channel/device/country) | case: "paid social looks like it sells nothing" using `cro-utm` |
| c06 | 11-12 | Customer research and behaviour analytics | Clarity install, recordings, heatmaps, rage/dead clicks, quick backs, on-site survey questions, review mining, research summary | case: "rage clicks on the size picker" using `cro-behaviour` |
| c07 | 13-14 | UX of product, collection, cart and checkout | heuristic audit (Baymard, NN/g), mobile first, PDP elements, filters, cart drawer, shipping and returns clarity, trust, copywriting; audit + fixes in Dawn theme editor | case: using `cro-ux` |
| c08 | 15-16 | From research to hypotheses and a roadmap | hypothesis format, primary/secondary/guardrail metrics, ICE/PIE/PXL scoring, test vs just-fix, a 6-test roadmap in a sheet, presenting it | - (project: the roadmap) |
| c09 | 17-18 | A/B testing statistics | significance, power, MDE, sample size calculator, test duration and business cycles, peeking, SRM, novelty effect, A/B vs MVT | case: "the stakeholder wants to stop on day 4" using `cro-ab` |
| c10 | 19-20 | Running real experiments | GrowthBook (or VWO) on the practice store, A/A test, QA checklist, flicker, launching an A/B test, analysing results, writing the test report, learning log | case: "this test result looks too good" using `cro-results` |
| c11 | 21-22 | Shopify themes, speed and Meta Conversions API | Liquid basics, sections and blocks in Dawn, a delivery-estimate line, Core Web Vitals (LCP, INP, CLS), app bloat, Meta Pixel + CAPI, event_id deduplication, Event Match Quality | case: "Meta shows double purchases" |
| c12 | 23-24 | Advanced CRO and capstone | Shopify Markets (Canada, CAD, French, duties, taxes), cohorts and LTV, personalisation, CRO ROI in money, the "Canada converts at 1.1% vs US 2.0%" case end to end, final CRO programme report and handover | case: the Canada vs US case |

Keys: CRO-101…CRO-105 for sprint 1, CRO-201… for sprint 2, … CRO-1201… for sprint 12.
Ticket ids: c01-t01 … c12-t05. Sprint ids c01 … c12. Five tickets per sprint.
