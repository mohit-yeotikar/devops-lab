# Interview roadmap: features to build later

Saved 2026-10-31. Applies to MarTech Lab and DevOps Lab.

**When to start:** after the first trainees have finished about 3 sprints and a few practice labs
(roughly 6 weeks of real use). Use their real gaps (interview scores, English trend, where they get stuck)
to confirm the order below before building.

Goal: today the app teaches the work. These features train *performing* in interviews: speaking,
thinking live, handling pushback, and proving the work fast.

## Phase 1: biggest impact

| Feature | Why it helps in interviews | Effort |
|---|---|---|
| Spoken mock interview | Question read aloud, candidate answers by voice (Chrome speech recognition). Coach scores content, structure, filler words, pace and English, then plays a better answer. Closest thing to a real interview. | Medium |
| Live case interviews | AI interviewer runs a 30-minute case ("Canada converts at 1.1%", "CPA doubled"), gives data only when asked, asks follow-ups, scores structure, numbers and recommendation. | Large |
| Job-description matcher | Paste a real job description: gaps against the candidate's verified work, a 7-day prep plan, the 20 most likely questions. | Medium |
| Story builder | Drafts "tell me about a time" stories from approved tickets with real numbers, then drills them to under 2 minutes each. | Small |
| Interview readiness score | One score from tickets, labs, interview scores, English trend and certificates. Apply only when "ready". | Small |

## Phase 2: proof and pressure

| Feature | Why it helps | Effort |
|---|---|---|
| Timed take-home tests | Real hiring tests: GA4 audit in 3 hours, SQL test, Ads account audit, SEO audit. Graded, with a model answer. | Medium |
| Stakeholder role-play | AI plays a CMO who wants to stop a test early, a developer who refuses a tracking change, an agency defending bad numbers. Candidate persuades with evidence. | Medium |
| Measurement architecture board | Drag GTM, server-side GTM, GA4, BigQuery and the Meta API into a diagram and explain it ("design a measurement stack"). | Medium |
| Case-study pages on the portfolio | Each project becomes a public one-page story with before/after numbers and charts. | Small |
| Certificate tracker | Free Google, HubSpot and Microsoft Clarity certificates; the app checks each link and shows a badge. | Small |

## Phase 3: habits that compound

| Feature | Why it helps | Effort |
|---|---|---|
| Daily flashcards | 10 minutes a day on formulas, definitions and benchmarks, so answers come fast. | Small |
| 5-minute speaking warm-up | One daily prompt with feedback on clarity and pronunciation of tool names (Floodlight, hreflang, eVar). | Small |
| Weekly timed incident | A surprise broken scenario, 30-minute limit, team leaderboard. Builds calm under pressure. | Medium |
| Peer review and group mocks | Trainees review each other's tickets and run mock interviews in pairs. | Medium |
| HR and salary round | Notice period, salary expectations, "why are you leaving", negotiation. | Small |

## Recommended first build

Phase 1, starting with the spoken mock interview and the story builder (weak spoken English is the biggest
interview risk), plus the job-description matcher. About one working session. All free: Chrome speech
recognition and the existing coach.
