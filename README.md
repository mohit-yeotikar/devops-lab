# DevOps Lab

A practice environment where junior DevOps engineers do the work of a real 2-year engineer:
realistic company tickets, broken servers to fix, an AI coach that corrects their English,
mock interviews, a logged work record, a public portfolio and an honest experience letter.

Live: https://devops-lab.mohityeotikar.workers.dev (Cloudflare Workers + D1 + Workers AI).

## What is inside

| Part | Where |
|---|---|
| 12 two-week sprints, 5 tickets each, one growing system ("ShopNotes") | `src/content/curriculum/sprint-*.json` (schema in `src/content/SCHEMA.md`) |
| 8 incident drills (Docker Compose, single root cause, hidden solution) | `drills/<name>/` |
| Login, sessions, roles (trainee / admin), ticket board, work log | `src/pages/app/*`, `src/pages/api/*`, `db/migrations` |
| AI coach: explanation grading, English corrections, chat, interview and drill grading | `src/lib/ai.ts`, `src/pages/api/coach.ts`, `interview.ts`, `drill.ts` |
| Public portfolio | `/u/<handle>` |
| Admin: review queue, trainee pages, experience letter | `/admin`, `/admin/letter/<id>` |

The coach uses Claude (`claude-opus-5-5`) when the `ANTHROPIC_API_KEY` secret is set, and falls back
to Cloudflare Workers AI (free, Llama 3.3 70B) otherwise.

## Run locally

```bash
pnpm install
cp .dev.vars.example .dev.vars        # optional: add ANTHROPIC_API_KEY
pnpm build
pnpm exec wrangler d1 migrations apply devops-lab --local --persist-to .wrangler/state
pnpm exec wrangler dev --config dist/server/wrangler.json --port 8788 --persist-to .wrangler/state
```

Without a Cloudflare login (`CLOUDFLARE_API_TOKEN`), remove the `ai` binding from `dist/server/wrangler.json` first; the pages
render, only the coach is unavailable.

The theme is light by default; the sun/moon button in the header switches to dark and remembers it per browser.

The first account that signs up with the `ADMIN_EMAIL` from `wrangler.jsonc` becomes admin.
Admins can promote others on `/admin/users/<id>`.

## Deploy

```bash
pnpm exec wrangler d1 migrations apply devops-lab --remote
pnpm deploy
pnpm exec wrangler secret put ANTHROPIC_API_KEY   # optional, enables Claude
```

## Trainee flow

1. Sign up, open Sprint 1, start the first ticket.
2. Do the steps on a laptop with Docker and a free AWS account (nothing in the curriculum costs money).
3. Log hours, tick the acceptance list, submit links and notes as proof.
4. Write the explanation in their own words. The coach scores it, corrects the English and gives a script to say in interviews. Hindi helper lines can be switched off in the profile.
5. Once a week: one incident drill and one mock interview.
6. A reviewer approves or asks for changes. Approved work appears on the portfolio.

## Experience letter

`/admin/letter/<id>` fills a letter from the real record: first and last logged day, hours, sprints,
approved tickets, incidents. It warns when the record is thin. State only what the log shows.
Employers verify experience letters, and a false one ends the candidate's offer.

Curriculum content is inspired by the MIT / CC BY 4.0 project
[90 Days of Cloud Engineering](https://github.com/ahmadjawad533/90-days-of-cloud-engineering).
