import { env } from '../../../lib/env';
import type { APIRoute } from 'astro';
import { body, json, requireAdmin } from '../../../lib/auth';
import { now } from '../../../lib/db';

export const POST: APIRoute = async (ctx) => {
  requireAdmin(ctx); const db = env.DB;
  const b = await body<{ user: string; ticket: string; decision: string; note: string }>(ctx.request);
  const status = b.decision === 'approve' ? 'done' : 'changes';
  await db.prepare('UPDATE ticket_progress SET status=?, reviewer_note=?, reviewed_at=?, updated_at=? WHERE user_id=? AND ticket_id=?')
    .bind(status, String(b.note || '').slice(0, 1000), now(), now(), String(b.user), String(b.ticket)).run();
  return json({ reload: true });
};
