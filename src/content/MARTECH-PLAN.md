# MarTech and Performance Marketing track: plan (source of truth for the 12 sprint files)

Goal: the hands-on skill set of a marketer with 12 years of experience: measurement strategy, GA4 + Analytics 360,
Google Tag Manager + Tag Manager 360 + server-side tagging, BigQuery/SQL, Google Ads, Search Ads 360,
Campaign Manager 360, Display & Video 360 (DSP) and programmatic, Adobe Analytics, HubSpot/CRM and automation,
attribution, incrementality and marketing mix modelling, budgets and leadership.

Company story: **Voltra Mobility**, an Indian electric two-wheeler and three-wheeler brand. It sells through
300 dealers (lead generation) and online (D2C bookings and an accessories store), and is starting exports.
It has a big media budget across Google, Meta, YouTube and programmatic, and moved to the Google Marketing
Platform (360 suite) this year. The learner is the new **marketing technology and performance lead**.

Practice ground. NEVER ask the learner to spend money. Paid enterprise tools are practised with:
- The **simulator labs in this app** (ids below), and the earlier CRO labs where useful.
- Free official places: **GA4 demo account** (Google Merchandise Store), **BigQuery sandbox** (no billing) with the
  public dataset `bigquery-public-data.ga4_obfuscated_sample_ecommerce`, a **Google Ads test manager account**
  (test accounts never serve ads or spend), **Google Skillshop** courses and certifications (Google Ads, GA4,
  Campaign Manager 360, Display & Video 360, Search Ads 360), **Adobe Experience League** tutorials and docs,
  **HubSpot free CRM** + HubSpot Academy, Looker Studio, a free Google Tag Manager container, Stape's free plan for a
  server-side GTM container (optional), Meta Ads Manager without publishing.
- Deliverables a senior produces: measurement plans, tracking plans, naming conventions, trafficking sheets,
  SQL queries, dashboards, test designs, budget models, audit reports, SOPs. Tickets ask for these as evidence
  (Google Docs/Sheets/Slides links, Looker Studio links, SQL in a GitHub gist, screenshots on Google Drive).
- Name the 360 product limits honestly: what is only in 360 (e.g. Analytics 360 sub-properties and roll-ups,
  higher limits, SLA, fresher BigQuery export; Tag Manager 360 zones and approvals; SA360 multi-engine bidding).
  Note: there is no product called "Google Ads 360"; the enterprise search tool is Search Ads 360.

Browser practice labs (reference with "lab": "<id>" on case tickets, or mention in steps):
- `mk-sql`            SQL on GA4 export data in the browser: UNNEST, sessions, funnels, revenue by channel (m04)
- `mk-auction`        Google Ads auction: Ad Rank, Quality Score, actual CPC (m05)
- `mk-bidding`        Smart bidding and budgets: tCPA vs tROAS vs Max conversions, budget limits, learning (m06)
- `mk-cm360`          Campaign Manager 360 trafficking: placements, creatives, Floodlight, click trackers, macros (m08)
- `mk-dv360`          DV360 line items: budget pacing, frequency, targeting, deals, brand safety (m09)
- `mk-adobe`          Adobe Analytics variables: eVar allocation and expiry, props, events, processing rules (m10)
- `mk-hubspot`        HubSpot lifecycle stages, lead scoring and workflows (m11)
- `mk-attribution`    Attribution models compared on real journeys (m12)
- `mk-incrementality` Geo holdout / lift test reading and MMM basics (m12)
- Earlier CRO labs also available: `cro-gtm` (m03), `cro-utm` (m02/m05), `cro-ab` (m06), `cro-funnel` (m02)

| id | weeks | title | what it covers (basic → advanced) | case ticket |
|---|---|---|---|---|
| m01 | 1-2 | Measurement strategy and unit economics | business goals → KPI tree, CAC, LTV, ROAS vs MER, contribution margin, lead funnel for dealers (lead → test ride → booking → delivery), measurement plan, tracking plan sheet, naming conventions | - |
| m02 | 3-4 | GA4 advanced and Analytics 360 | property design (streams, cross-domain, data retention, Google signals), custom dimensions/metrics, audiences, explorations (funnel, path, segment overlap, cohort), attribution settings, Analytics 360: sub-properties, roll-up properties, limits, SLA, BigQuery export freshness, governance and access | case: "booking numbers differ between GA4 and CRM" using `cro-funnel` |
| m03 | 5-6 | Tag Manager, Tag Manager 360 and server-side tagging | workspaces, environments, versioning, naming, Consent Mode v2 with a CMP, enhanced conversions, Tag Manager 360 (zones, approvals, more workspaces), server-side GTM (what it is, clients/tags, first-party domain, cost), a GTM audit | case: "conversions dropped after a cookie banner change" using `cro-gtm` |
| m04 | 7-8 | BigQuery and SQL for marketers | BigQuery sandbox, GA4 export schema (events, event_params, UNNEST), sessions, landing pages, funnels, revenue by source/medium, joining CRM data (concept), scheduled queries, Looker Studio on BigQuery, cost control | case: using `mk-sql` |
| m05 | 9-10 | Google Ads: search mastery | account structure, match types, search terms and negatives, Ad Rank and Quality Score, RSA assets, conversion actions and values, enhanced conversions for leads, offline conversion import from CRM, test manager account | case: "CPC doubled, conversions flat" using `mk-auction` |
| m06 | 11-12 | Google Ads: Performance Max, Demand Gen, YouTube and bidding | Smart bidding (Max conversions, tCPA, tROAS, value-based), learning periods, budgets, PMax asset groups and signals, brand exclusions, Demand Gen, YouTube formats, Merchant Center feed basics, experiments, scripts and automated rules | case: "tROAS campaign stopped spending" using `mk-bidding` |
| m07 | 13-14 | Search Ads 360 and enterprise search | SA360 (multi-engine: Google, Microsoft; Floodlight-based conversions, bid strategies, inventory/feed campaigns, reporting, labels, bulk sheets), manager accounts at scale, governance, agency vs in-house; there is no "Google Ads 360" product | - (project: SA360 migration plan) |
| m08 | 15-16 | Campaign Manager 360 and ad serving | ad server role, advertisers/campaigns/placements/ads/creatives, trafficking sheets, Floodlight activities (counter vs sales), click trackers and macros, verification (viewability, invalid traffic), reach and frequency, path to conversion, cross-channel reports | case: "Floodlight counts double" using `mk-cm360` |
| m09 | 17-18 | Display & Video 360 and programmatic (DSP) | programmatic basics (RTB, SSP, DSP, ad exchange, PMP, programmatic guaranteed), DV360 structure (partner, advertiser, campaign, insertion order, line item), audiences (1P, Google, affinity), bidding and pacing, frequency caps, brand safety and viewability, YouTube in DV360, other DSPs (The Trade Desk, Amazon DSP) | case: "line item under-pacing" using `mk-dv360` |
| m10 | 19-20 | Adobe Analytics and Adobe Experience Platform | report suite, props vs eVars vs events, allocation and expiration, processing rules, Analysis Workspace (freeform, fallout, flow, cohort), segments, calculated metrics, classifications, Adobe Tags (Launch) and Web SDK, GA4 ↔ Adobe mapping | case: "campaign eVar gives credit to the wrong campaign" using `mk-adobe` |
| m11 | 21-22 | HubSpot, CRM and marketing automation | HubSpot free CRM: objects, properties, lifecycle stages, lead status, forms, lead scoring, workflows, sequences (concept), attribution reports, dealer lead routing, CRM ↔ Google Ads offline conversions, Salesforce/CDP basics (Segment), data hygiene | case: "dealers say leads are bad" using `mk-hubspot` |
| m12 | 23-24 | Attribution, incrementality, MMM and leadership capstone | attribution models (last click, data-driven, position), their limits, incrementality (geo holdout, conversion lift, brand lift), MMM (Meridian, Robyn), budget allocation and forecasting, privacy (consent, third-party cookies, server-side), team/agency management, capstone: Voltra full-funnel measurement and media plan | case: using `mk-attribution` and `mk-incrementality` |

Keys: MKT-101…MKT-105 for m01, MKT-201… for m02, … MKT-1201… for m12. Ticket ids m01-t01 … m12-t05. Five tickets per sprint.
