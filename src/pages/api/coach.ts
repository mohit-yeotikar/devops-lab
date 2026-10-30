import { env } from '../../lib/env';
import type { APIRoute } from 'astro';
import { body, json, requireUser } from '../../lib/auth';
import { thread } from '../../lib/db';
import { ticketById, drillByName } from '../../lib/curriculum';
import { coach, parseJson } from '../../lib/ai';
import { md } from '../../lib/md';

// mode=explain: grade the trainee's explanation of a ticket; mode=chat: ask the coach a question about the ticket.
export const POST: APIRoute = async (ctx) => {
  const u = requireUser(ctx);
  const b = await body<{ mode: string; ticket?: string; drill?: string; text: string }>(ctx.request);
  const text = String(b.text || '').trim();
  if (text.length < 5) return json({ error: 'Please write a little more.' }, 400);
  if (text.length > 4000) return json({ error: 'Too long. Keep it under 4000 characters.' }, 400);
  const t = b.ticket ? ticketById(String(b.ticket)) : undefined;
  const d = b.drill ? drillByName(String(b.drill)) : undefined;
  const key = t ? `ticket:${t.id}` : d ? `drill:${d.name}` : 'general';
  const hindi = !!u.show_hindi;

  if (b.mode === 'explain' && t) {
    const system = `The trainee just finished this ticket and wrote an explanation in their own words. Grade it like a kind senior engineer and English teacher.
TICKET: ${t.key} ${t.title}
GOAL: ${t.goal}
STEPS THEY SHOULD HAVE DONE: ${t.steps.join(' | ')}
MODEL EXPLANATION (simple English): ${t.explain.en}
Return JSON: {"score": 0-10, "praise": "one or two sentences, what is good", "technical": ["up to 3 short points that are wrong or missing technically"], "english": [{"wrong": "their sentence", "right": "corrected sentence", "why": "very short reason"}] (max 4), "better": "their explanation rewritten in simple, correct, first-person English, 5-7 sentences, keeping their facts"${hindi ? ', "hi": "one Hinglish line that tells them the main thing to improve"' : ''}}`;
    const raw = await coach(env, { system, turns: [{ role: 'user', content: text }], json: true });
    const r = parseJson<{ score?: number; praise?: string; technical?: string[]; english?: { wrong: string; right: string; why: string }[]; better?: string; hi?: string; error?: string }>(raw, {});
    if (r.error || r.score === undefined) return json({ error: r.error || 'The coach did not answer well. Try again.' }, 502);
    const score = Math.max(0, Math.min(10, Math.round(Number(r.score))));
    await env.DB.prepare('INSERT INTO ticket_progress (user_id, ticket_id) VALUES (?, ?) ON CONFLICT DO NOTHING').bind(u.id, t.id).run();
    await env.DB.prepare('UPDATE ticket_progress SET explanation=?, explain_score=? WHERE user_id=? AND ticket_id=?').bind(text, score, u.id, t.id).run();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO coach_messages (user_id, thread, role, content) VALUES (?, ?, ?, ?)').bind(u.id, key, 'user', text),
      env.DB.prepare('INSERT INTO coach_messages (user_id, thread, role, content) VALUES (?, ?, ?, ?)').bind(u.id, key, 'assistant', raw),
    ]);
    const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const html = `<div class="card"><div class="row" style="justify-content:space-between"><strong>Score: ${score}/10</strong>${score >= 7 ? '<span class="pill done">interview ready</span>' : '<span class="pill doing">keep practising</span>'}</div>
      <p>${esc(r.praise || '')}</p>
      ${r.technical?.length ? `<h3>Technical points to fix</h3><ul>${r.technical.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${r.english?.length ? `<h3>English corrections</h3><table><tr><th>You wrote</th><th>Better</th><th>Why</th></tr>${r.english.map((e) => `<tr><td>${esc(e.wrong)}</td><td><strong>${esc(e.right)}</strong></td><td class="help">${esc(e.why)}</td></tr>`).join('')}</table>` : ''}
      <h3>Say it like this</h3><blockquote>${esc(r.better || '')}</blockquote>
      ${r.hi ? `<p class="hi">${esc(r.hi)}</p>` : ''}
      <p class="help">Read the "Say it like this" text aloud 3 times. Then write it again from memory.</p></div>`;
    return json({ html, score });
  }

  // chat mode (ticket or drill or general)
  const context = t
    ? `The trainee is working on ticket ${t.key} "${t.title}". Goal: ${t.goal}. Steps: ${t.steps.join(' | ')}. Hints: ${t.hints.join(' | ')}. Help them get unstuck with small hints first, the full answer only if they ask twice.`
    : d
      ? `The trainee is doing incident drill "${d.title}". Alert text: ${d.readme.slice(0, 1500)}. Do NOT tell the root cause directly. Ask what they checked, suggest the next command to run, and explain what the output means. Only confirm when they say the right cause.`
      : 'General DevOps and English help.';
  const history = await thread(env.DB, u.id, key + ':chat', 10);
  const turns = [...history.map((m) => ({ role: m.role, content: m.content })), { role: 'user' as const, content: text }];
  const reply = await coach(env, { system: context + (hindi ? ' End with one short Hinglish line.' : ''), turns });
  await env.DB.batch([
    env.DB.prepare('INSERT INTO coach_messages (user_id, thread, role, content) VALUES (?, ?, ?, ?)').bind(u.id, key + ':chat', 'user', text),
    env.DB.prepare('INSERT INTO coach_messages (user_id, thread, role, content) VALUES (?, ?, ?, ?)').bind(u.id, key + ':chat', 'assistant', reply),
  ]);
  return json({ html: `<div class="msg user">${text.replace(/</g, '&lt;')}</div><div class="msg assistant">${md(reply)}</div>`, reply });
};
