// CRO practice labs (browser widgets). The widget code lives in ./widgets/<id>.js and marks tasks done by id.
// Order = learning order, from basic to advanced.

const L = (o) => ({ track: 'cro', kind: 'widget', ...o });

export const croLabs = [
  L({
    id: 'cro-metrics', title: 'Metrics drill: CR, AOV and RPV', topic: 'Basics', minutes: 15, sprints: ['c01'],
    summary: 'Calculate the numbers every CRO person uses every day, from a real-looking store report.',
    intro: [
      'A store makes money like this: visitors come, some buy (conversion rate), each order has a size (average order value). Revenue per visitor joins both.',
      'You get a small weekly report from GlowShop. Calculate the number the question asks for and type it. Use a calculator if you want.',
      'After each answer you see the working, step by step. Wrong answers are fine. Read the working, then try the next one.',
    ],
    tasks: [
      { id: 'cr', text: 'Calculate a conversion rate (CR) correctly.', why: 'CR = orders ÷ sessions. It is the first number people ask about.', hint: 'Divide orders by sessions, then multiply by 100 to get a percent.' },
      { id: 'aov', text: 'Calculate an average order value (AOV) correctly.', why: 'AOV = revenue ÷ orders. Discounts and bundles move it.', hint: 'Divide revenue by the number of orders.' },
      { id: 'rpv', text: 'Calculate revenue per visitor (RPV) correctly.', why: 'RPV = revenue ÷ sessions = CR × AOV. The best single number for a test.', hint: 'Divide revenue by sessions.' },
      { id: 'step', text: 'Calculate a funnel step rate correctly.', why: 'Step rate shows where people leave. Compare steps, not only totals.', hint: 'People at this step ÷ people at the step before, × 100.' },
      { id: 'lift', text: 'Calculate a relative lift correctly.', why: '2.0% to 2.2% is +10% relative, but only +0.2 points absolute. Always say which one.', hint: '(new − old) ÷ old × 100.' },
      { id: 'streak', text: 'Get 5 answers right in a row.', why: 'Speed with these numbers makes you sound senior in meetings and interviews.', hint: 'Slow down. Write the formula first, then the numbers.' },
      { id: 'trap', text: 'Solve the trap: which week made more money per visitor?', why: 'A higher CR is not always better. RPV decides.', hint: 'Calculate RPV for both weeks. RPV = CR × AOV.' },
    ],
    quiz: [
      { q: '1,000 sessions, 20 orders, $1,600 revenue. What is RPV?', options: ['$80', '$1.60', '2%', '$16'], answer: 1, why: 'RPV = revenue ÷ sessions = 1,600 ÷ 1,000 = $1.60. AOV is $80 and CR is 2%.' },
      { q: 'CR goes from 2.0% to 2.5%. What is the relative lift?', options: ['+0.5%', '+25%', '+2.5%', '+50%'], answer: 1, why: '(2.5 − 2.0) ÷ 2.0 = 0.25 = +25% relative, or +0.5 percentage points absolute.' },
      { q: 'A discount raised CR by 10% but AOV fell by 20%. What happened to RPV?', options: ['It went up', 'It went down', 'It stayed the same', 'You cannot know'], answer: 1, why: 'RPV = CR × AOV = 1.10 × 0.80 = 0.88, so RPV fell by about 12%.' },
    ],
  }),
  L({
    id: 'cro-funnel', alsoIn: ['martech'], title: 'Funnel detective: why does Canada convert less?', topic: 'Analytics', minutes: 20, sprints: ['c02', 'c12'],
    summary: 'Find the leaking step and the segment, separate traffic mix from site problems, and price the fix.',
    intro: [
      'A funnel is the path to purchase: visit, product, cart, checkout, shipping, payment, purchase. Each step loses people.',
      'Step rate = how many from the previous step made it. Compare step rates between the US and Canada to find where the leak is.',
      'Segments (device, channel) often show a problem that the total hides. Traffic mix can also explain part of a gap.',
    ],
    tasks: [
      { id: 'f1', text: 'Find the step where Canada loses the most extra people.', why: 'Every CRO investigation starts with WHERE, before WHY.', hint: 'Look for the red row with All devices and All channels.' },
      { id: 'f2', text: 'Find the segment: is the leak bigger on mobile or desktop?', why: 'A mobile-only problem needs a mobile fix.', hint: 'Switch the Device filter and compare the gap on the red row.' },
      { id: 'f3', text: 'Find how much of the gap traffic mix explains.', why: 'Stops you blaming the website for a media-buying difference.', hint: 'Press "Recalculate Canada with the US traffic mix".' },
      { id: 'f4', text: 'Pick the hypothesis that the evidence supports.', why: 'Data shows where; recordings and surveys show why.', hint: 'Read the clues that unlock after the segment question.' },
      { id: 'f5', text: 'Price the fix: move the slider until Canada converts at 1.5% or more.', why: 'Managers say yes to money, not to conversion rates.', hint: 'Watch the Canada conversion number under the slider.' },
    ],
    quiz: [
      { q: 'Why compare step rates and not only total conversion?', options: ['They are easier to read', 'They show WHERE in the funnel people leave', 'GA4 only shows step rates', 'They are always higher'], answer: 1, why: 'The total says there is a problem; step rates say where it is.' },
      { q: 'Canada gets more paid-social traffic than the US. What does that do?', options: ['Nothing', 'Lowers Canada\'s conversion a bit, even with a perfect site', 'Raises it', 'Only changes AOV'], answer: 1, why: 'Cold social traffic converts lower. Always check how much of a gap is mix.' },
      { q: 'Which is the best evidence for a hypothesis?', options: ['Your own opinion', 'Funnel data plus recordings plus survey answers that agree', 'One competitor', 'A colour trend'], answer: 1, why: 'Several sources that point to the same cause make a strong hypothesis.' },
    ],
  }),
  L({
    id: 'cro-gtm', alsoIn: ['martech'], title: 'GTM workbench: dataLayer, triggers and tags', topic: 'Tracking', minutes: 30, sprints: ['c03', 'c04'],
    summary: 'Build Google Tag Manager variables, triggers and GA4 tags on a fake store, and fix a broken container.',
    intro: [
      'The website drops notes into a box called the dataLayer, for example: "add_to_cart, 30 ml serum, CA$34".',
      'Google Tag Manager listens. You give it Variables (which part of the note to read), Triggers (which note to react to) and Tags (what to send to GA4).',
      'Use the store buttons, then read the Preview panel: it shows which tags fired, which did not and why, and what GA4 received.',
    ],
    tasks: [
      { id: 'g1', text: 'Send add_to_cart to GA4 when you click Add to cart.', why: 'Add-to-cart rate is the first number you check on a product page.', hint: 'Make a trigger with event name add_to_cart, then a GA4 tag with event name add_to_cart on that trigger. Click Add to cart.' },
      { id: 'g2', text: 'Send add_to_cart with value (a number) and currency = CAD.', why: 'Without currency, GA4 ignores the value, so revenue reports are wrong.', hint: 'Variables with paths ecommerce.value and ecommerce.currency, then in the tag: value = {{DLV - value}} and currency = {{DLV - currency}}.' },
      { id: 'g3', text: 'Track size picks: send select_variant with a variant parameter.', why: 'Shows if people struggle to choose a size.', hint: 'The site pushes select_variant with a key called variant. Make a variable, a trigger and a tag.' },
      { id: 'g4', text: 'Send purchase with transaction_id, value and currency.', why: 'This is the number the business is paid on. It must match Shopify orders.', hint: 'Read the purchase note in the dataLayer log to find the paths, like ecommerce.transaction_id.' },
      { id: 'g5', text: 'Survive the thank-you page reload: GA4 must drop the second purchase.', why: 'People refresh the thank-you page. Without transaction_id, revenue is counted twice.', hint: 'Place an order, then press "Reload thank-you page". Task 4 must work first.' },
      { id: 'g6', text: 'Fix the broken container (3 mistakes) until add_to_cart arrives clean.', why: 'Your first week in any job: tracking that half works.', hint: 'Press "Load broken container". Read the "not fired" reasons and empty-parameter warnings. Check spelling and capital letters.' },
      { id: 'g7', text: 'Use ONE tag and ONE regex trigger for add_to_cart, begin_checkout and purchase.', why: 'Senior set-ups stay small: fewer tags, fewer bugs.', hint: 'Trigger match = matches regex, event = ^(add_to_cart|begin_checkout|purchase)$. Tag event name = {{Event}}. Click Checkout.' },
    ],
    quiz: [
      { q: 'What does a GTM trigger decide?', options: ['What data is sent', 'WHEN a tag fires', 'Where GA4 is', 'The page design'], answer: 1, why: 'Variables = which data, triggers = when, tags = what is sent where.' },
      { q: 'Why must purchase carry transaction_id?', options: ['For the invoice', 'So GA4 can drop duplicates of the same order', 'For SEO', 'It is optional'], answer: 1, why: 'Same transaction_id twice = GA4 counts it once.' },
      { q: 'Your tag waits for "Add To Cart" but the site sends "add_to_cart". What happens?', options: ['It fires', 'It does not fire: event names are case and spelling sensitive', 'GA4 fixes it', 'GTM shows an error page'], answer: 1, why: 'Event names must match exactly.' },
    ],
  }),
  L({
    id: 'cro-utm', alsoIn: ['martech'], title: 'UTMs and GA4 channels', topic: 'Tracking', minutes: 15, sprints: ['c05'],
    summary: 'Predict the GA4 channel of real links, find the classic mistakes, and build clean UTM links.',
    intro: [
      'A UTM is a label on a link: utm_source (who, e.g. facebook), utm_medium (what kind, e.g. paid_social), utm_campaign (which campaign).',
      'GA4 sorts each visit into a channel with fixed rules. The medium decides most of it. A paid ad with medium "social" lands in Organic Social.',
      'Never put UTMs on links inside your own site. They overwrite the real source.',
    ],
    tasks: [
      { id: 'u1', text: 'Predict 4 channels correctly.', why: 'Clean channels tell you which money works.', hint: 'Medium decides most of it. Paid needs a paid-looking medium: cpc, ppc, paid_…' },
      { id: 'u2', text: 'Predict all 8 channels correctly.', why: 'These 8 links cover the mistakes teams make every week.', hint: 'Remember: a social source + a non-paid medium = Organic Social.' },
      { id: 'u3', text: 'Find the internal link and say where GA4 puts it.', why: 'Tagged internal links wipe out the real source of a sale.', hint: 'Look for a source like homepage_banner.' },
      { id: 'u4', text: 'Build a clean link that GA4 puts in Paid Social.', why: 'You will write the UTM rules for the whole marketing team.', hint: 'All small letters, no spaces, source facebook, medium paid_social.' },
      { id: 'u5', text: 'Build a clean link for the newsletter that lands in Email.', why: 'Each channel needs its own rule in your UTM sheet.', hint: 'medium = email. Source can be newsletter.' },
    ],
    quiz: [
      { q: 'A paid Meta ad has utm_medium=social. Which channel?', options: ['Paid Social', 'Organic Social', 'Paid Search', 'Display'], answer: 1, why: 'Medium "social" is not paid, so GA4 calls it Organic Social.' },
      { q: 'Why not tag a homepage banner with UTMs?', options: ['It is slow', 'It overwrites the real source of the visit', 'GA4 blocks it', 'It is fine'], answer: 1, why: 'The sale would look like it came from the banner, not from the ad.' },
      { q: 'Which is a clean medium?', options: ['Paid Social', 'paid social', 'paid_social', 'PAID_SOCIAL'], answer: 2, why: 'Small letters and no spaces.' },
    ],
  }),
  L({
    id: 'cro-behaviour', title: 'Behaviour lab: from recordings to a hypothesis', topic: 'Research', minutes: 20, sprints: ['c06'],
    summary: 'Watch 12 short session recordings, tag what went wrong, read a heatmap, and write a real hypothesis.',
    intro: [
      'Session recordings (Microsoft Clarity, Hotjar) show what real people did: where they tapped, scrolled, and when they left.',
      'Watch with one question in mind. Tag each recording with what you saw. Count the tags. The top pattern is your lead.',
      'Then write a hypothesis: Because [evidence], we believe [change] for [audience] will [result], measured by [metric].',
    ],
    tasks: [
      { id: 'b1', text: 'Tag 6 recordings.', why: 'Tagging turns watching into data you can count.', hint: 'Read the timeline of each recording and pick the tag that explains why the person left.' },
      { id: 'b2', text: 'Tag all 12 recordings correctly.', why: 'Wrong tags lead to the wrong test.', hint: 'Rage clicks on the size buttons = size picker. Leaving after the shipping line = shipping surprise.' },
      { id: 'b3', text: 'Pick the top problem from your tag counts.', why: 'Fix the biggest pattern first.', hint: 'Look at the counts table.' },
      { id: 'b4', text: 'Read the heatmap: what do the dead clicks mean?', why: 'Dead clicks show what people expect to work.', hint: 'Where are the dots, and what does nothing when you tap it?' },
      { id: 'b5', text: 'Write a complete hypothesis for the top problem.', why: 'A hypothesis with evidence and a metric can be tested. An opinion cannot.', hint: 'Use the numbers from your tags as evidence. Name the audience (who) and one primary metric.' },
    ],
    quiz: [
      { q: 'What does a rage click usually mean?', options: ['The user is happy', 'Something looks clickable or slow but does not work', 'A fast reader', 'A bot'], answer: 1, why: 'Many fast clicks in one place = frustration.' },
      { q: 'You watched 50 recordings. What next?', options: ['Ship a redesign', 'Tag, count, confirm with GA4 numbers, then write a hypothesis', 'Delete them', 'Ask a friend'], answer: 1, why: 'Recordings show why; analytics shows how many people it affects.' },
      { q: 'Which is a hypothesis?', options: ['Green buttons sell more', 'Because 7 of 12 iPhone users rage-click the size picker, making it bigger for mobile will raise add-to-cart rate', 'Let us test something', 'Users are confused'], answer: 1, why: 'It has evidence, a change, an audience and a metric.' },
    ],
  }),
  L({
    id: 'cro-ux', title: 'UX audit: find the friction', topic: 'Research', minutes: 20, sprints: ['c07'],
    summary: 'Audit a mobile product page and cart for a Canadian shopper. Find 8 problems, rank them, and decide test or fix.',
    intro: [
      'You see GlowShop on a phone, as a shopper from Canada sees it. Tap any part of the page that looks wrong.',
      'For each problem, choose what is wrong. Some parts are fine on purpose, so do not tap everything.',
      'Then rank the problems by impact, and decide which ones are clear bugs to fix now and which need an A/B test.',
    ],
    tasks: [
      { id: 'x1', text: 'Find 2 problems.', why: 'A heuristic audit is the fastest research you can do.', hint: 'Look at the price, the size picker and the button.' },
      { id: 'x2', text: 'Find 4 problems.', why: 'Mobile hides problems that look fine on a laptop.', hint: 'Think like a Canadian: currency, shipping, duties.' },
      { id: 'x3', text: 'Find all 8 problems.', why: 'Baymard finds most stores have the same few problems again and again.', hint: 'Open the cart too.' },
      { id: 'x4', text: 'Pick the 3 problems to fix first.', why: 'Fix what blocks the most money first.', hint: 'What stops people at the most important steps (choosing, adding to cart, paying)?' },
      { id: 'x5', text: 'Decide for 4 problems: just fix it, or A/B test it?', why: 'Bugs and clear errors are fixed. Ideas with real doubt are tested.', hint: 'Is there any chance the change could make things worse?' },
    ],
    quiz: [
      { q: 'A Canadian sees prices in US$. What is the main risk?', options: ['None', 'They doubt the final cost and leave at checkout', 'They buy more', 'SEO gets worse'], answer: 1, why: 'Unclear cost is a top reason for leaving a cart.' },
      { q: 'A button does not work on iPhone. Test or fix?', options: ['A/B test it', 'Fix it and check the numbers before and after', 'Ignore it', 'Run a survey'], answer: 1, why: 'Bugs are fixed, not tested.' },
      { q: 'What is the top reason people leave carts (Baymard)?', options: ['Colours', 'Extra costs like shipping, taxes and duties', 'Fonts', 'Too many photos'], answer: 1, why: 'Surprise costs are the number one stated reason.' },
    ],
  }),
  L({
    id: 'cro-hypothesis', title: 'Hypotheses and prioritisation', topic: 'Experiments', minutes: 20, sprints: ['c08'],
    summary: 'Separate opinions from hypotheses, build one from research, score ideas with PXL and pick the first test.',
    intro: [
      'A test roadmap is a list of hypotheses in priority order. Each one needs evidence, a change, an audience and a metric.',
      'PXL scores ideas with yes/no questions (for example: is it backed by research? is it easy?). Yes/no answers are less biased than 1-10 guesses.',
      'Primary metric decides the test. A guardrail metric must not get worse.',
    ],
    tasks: [
      { id: 'h1', text: 'Mark each idea as a hypothesis or an opinion.', why: 'Opinions waste test traffic.', hint: 'A hypothesis says "because we saw…" with real data.' },
      { id: 'h2', text: 'Build a hypothesis from the research that makes sense.', why: 'The evidence, the change and the metric must fit together.', hint: 'Shipping-cost evidence goes with a shipping-cost change, measured where people leave.' },
      { id: 'h3', text: 'Add a guardrail metric that protects the business.', why: 'You can win CR and lose money. Guardrails catch that.', hint: 'What could get worse if you show free-shipping messages? Think money per order.' },
      { id: 'h4', text: 'Score all 6 ideas with PXL correctly.', why: 'The same rules for every idea keep the roadmap fair.', hint: 'Read each idea\'s notes. Answer only what the notes say.' },
      { id: 'h5', text: 'Pick the idea to test first.', why: 'Start with the highest score that you can test with your traffic.', hint: 'Look at the scores you made.' },
    ],
    quiz: [
      { q: 'What is a guardrail metric?', options: ['The main metric', 'A metric that must not get worse, like margin or refunds', 'Page views', 'A GA4 report'], answer: 1, why: 'It stops a "win" that hurts the business.' },
      { q: 'Why do teams like PXL?', options: ['It is the newest', 'Yes/no questions are less subjective than 1-10 scores', 'Google made it', 'It needs no data'], answer: 1, why: 'Less room for gut feeling.' },
      { q: 'A clear bug on the checkout page. Where does it go?', options: ['Top of the test roadmap', 'Fix it now, it is not a test', 'Ignore it', 'Ask design'], answer: 1, why: 'Just fix it, then measure.' },
    ],
  }),
  L({
    id: 'cro-ab', alsoIn: ['martech'], title: 'A/B test statistics: peeking, sample size and SRM', topic: 'Experiments', minutes: 30, sprints: ['c09'],
    summary: 'Run simulated tests day by day, see the peeking trap with your own eyes, size tests and catch a broken split.',
    intro: [
      'An A/B test shows the old page (A) to half the visitors and the new one (B) to the other half, then compares who buys more.',
      'Small numbers move by luck. The p-value asks: if A and B were the same, how often would luck make a gap this big? Below 0.05 we call it significant.',
      'Decide the sample size before you start, and look at the result once at the end. Checking every day and stopping early creates fake winners.',
    ],
    tasks: [
      { id: 'a1', text: 'Run 200 A/A tests and watch the peeking trap.', why: 'The most common reason CRO teams ship fake wins.', hint: 'Section 2. Compare "peek daily" with "only at the end".' },
      { id: 'a2', text: 'Size a test: baseline 2%, smallest lift 10%.', why: 'You will be asked this in interviews and on day one.', hint: 'Section 3. Set baseline 2 and lift 10.' },
      { id: 'a3', text: 'Catch an SRM: 50,000 vs 48,200 at a planned 50/50 split.', why: 'A broken split makes the result junk.', hint: 'Section 4, then press Check.' },
      { id: 'a4', text: 'Run a mystery test to the planned end and make the right call.', why: 'Discipline beats gut feeling.', hint: 'Mystery mode on. Ship B only if B is ahead AND p is below 0.05 at the planned end.' },
      { id: 'a5', text: 'Low traffic: run 7 days at 500 visitors a day, look, then run to 28 days.', why: 'Little traffic = only big changes can be tested.', hint: 'Visitors 500, planned days 28, Mystery off. Run 7 days, then Run to planned end.' },
    ],
    quiz: [
      { q: 'p = 0.03 on day 4 of a 28-day test. What do you do?', options: ['Ship B now', 'Keep running to the planned end', 'Stop the test', 'Change the goal'], answer: 1, why: 'Stopping early on a lucky day is peeking.' },
      { q: 'Planned 50/50, got 50,000 vs 48,200. What is it?', options: ['Normal noise', 'Sample ratio mismatch: the split is broken', 'A winner', 'A/A test'], answer: 1, why: 'With these numbers the gap is far too big for luck.' },
      { q: 'What makes the needed sample size much bigger?', options: ['A bigger lift', 'A smaller lift you want to detect', 'More colours', 'A higher price'], answer: 1, why: 'Half the lift needs about four times the visitors.' },
    ],
  }),
  L({
    id: 'cro-results', title: 'Read test results and make the call', topic: 'Experiments', minutes: 25, sprints: ['c10'],
    summary: 'Six real-looking test reports. Decide: ship, keep A, keep running, or do not trust the test, and say why.',
    intro: [
      'A test report is only useful if you read it correctly. Check the set-up first (split, duration), then the numbers, then the money.',
      'Use the calculator on this page: it gives conversion rates, lift, p-value and an SRM check from the raw counts.',
      'For each report, pick a decision and the main reason. Wrong answers show you what a senior would see.',
    ],
    tasks: [
      { id: 'r1', text: 'Report 1: decide and give the reason.', why: 'A clean win must still be checked.', hint: 'Planned days done? Split fine? p below 0.05? RPV up?' },
      { id: 'r2', text: 'Report 2: decide and give the reason.', why: 'Always check the split before the result.', hint: 'Run the SRM check on the visitor counts.' },
      { id: 'r3', text: 'Report 3: decide and give the reason.', why: 'Early results lie.', hint: 'How many of the planned days are done?' },
      { id: 'r4', text: 'Report 4: decide and give the reason.', why: 'More orders can mean less money.', hint: 'Compare RPV, not only CR.' },
      { id: 'r5', text: 'Report 5: decide and give the reason.', why: 'Most tests end flat. Learn and move on.', hint: 'Is anything significant at the planned end?' },
      { id: 'r6', text: 'Report 6: decide and give the reason.', why: 'Cut the data 20 ways and one slice "wins" by luck.', hint: 'How many segments were checked?' },
    ],
    quiz: [
      { q: 'What do you check first in any test report?', options: ['The lift', 'The set-up: planned duration and the traffic split', 'The colours', 'The p-value'], answer: 1, why: 'A broken set-up makes every number after it meaningless.' },
      { q: 'B has higher CR but lower RPV. Ship?', options: ['Yes', 'No: it makes less money per visitor', 'Only on mobile', 'Run it again forever'], answer: 1, why: 'RPV is what pays the bills.' },
      { q: 'Overall flat, one of 20 segments is +40% with p = 0.04. What now?', options: ['Ship for that segment', 'Treat it as a new idea to test on its own; with 20 cuts one fake win is expected', 'Ship for everyone', 'Delete the data'], answer: 1, why: 'Many comparisons create false positives.' },
    ],
  }),
];
