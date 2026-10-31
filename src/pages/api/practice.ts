import { env } from '../../lib/env';
import type { APIRoute } from 'astro';
import { body, json, requireUser } from '../../lib/auth';
import { labById } from '../../sandbox/labs.js';

// Records a finished practice lab. Hours are NOT logged automatically: the trainee logs real work hours on tickets.
export const POST: APIRoute = async (ctx) => {
  const u = requireUser(ctx);
  const b = await body<Record<string, unknown>>(ctx.request);
  const lab = labById(String(b.lab || ''));
  if (!lab) return json({ error: 'Unknown lab.' }, 400);
  const int = (v: unknown, max: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : null; };
  await env.DB.prepare('INSERT INTO practice_runs (user_id, lab, commands, seconds, quiz_score, quiz_total) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(u.id, lab.id, int(b.commands, 5000) ?? 0, int(b.seconds, 86400), int(b.quiz_score, 50), int(b.quiz_total, 50)).run();
  return json({ ok: true });
};
