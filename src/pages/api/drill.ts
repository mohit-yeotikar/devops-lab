import { env } from '../../lib/env';
import type { APIRoute } from 'astro';
import { body, json, requireUser } from '../../lib/auth';
import { drillByName } from '../../lib/curriculum';
import { coach, parseJson } from '../../lib/ai';

export const POST: APIRoute = async (ctx) => {
  const u = requireUser(ctx);
  const b = await body<{ drill: string; root_cause: string; fix: string; minutes: string }>(ctx.request);
  const d = drillByName(String(b.drill || ''));
  if (!d) return json({ error: 'Drill not found.' }, 404);
  const rc = String(b.root_cause || '').trim(), fix = String(b.fix || '').trim();
  if (rc.length < 15) return json({ error: 'Please describe the root cause in at least one full sentence.' }, 400);
  const system = `Grade an incident drill answer. The OFFICIAL SOLUTION (secret, do not quote it fully):\n${d.solution.slice(0, 3000)}\n\nReturn JSON: {"verdict": "correct" | "partly" | "wrong", "feedback": "2-4 simple sentences. If correct, say what a senior would add. If partly or wrong, give a hint about WHERE to look next, not the answer."${u.show_hindi ? ', "hi": "one Hinglish line"' : ''}}`;
  const raw = await coach(env, { system, turns: [{ role: 'user', content: `Root cause: ${rc}\nFix: ${fix || '(not given)'}` }], json: true });
  const r = parseJson<{ verdict?: string; feedback?: string; hi?: string }>(raw, {});
  const verdict = ['correct', 'partly', 'wrong'].includes(String(r.verdict)) ? String(r.verdict) : 'partly';
  const feedback = (r.feedback || 'Checked.') + (r.hi ? ` ${r.hi}` : '');
  await env.DB.prepare('INSERT INTO drill_results (user_id, drill, root_cause, fix, minutes, verdict, feedback) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(u.id, d.name, rc, fix, Number(b.minutes) || null, verdict, feedback).run();
  return json({ reload: true });
};
