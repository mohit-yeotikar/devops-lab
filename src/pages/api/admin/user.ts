import { env } from '../../../lib/env';
import type { APIRoute } from 'astro';
import { body, json, requireAdmin } from '../../../lib/auth';

export const POST: APIRoute = async (ctx) => {
  const admin = requireAdmin(ctx); const db = env.DB;
  const b = await body<{ user: string; action: string; role?: string }>(ctx.request);
  if (b.user === admin.id) return json({ error: 'You cannot change your own account here.' }, 400);
  if (b.action === 'role') await db.prepare('UPDATE users SET role = ? WHERE id = ?').bind(b.role === 'admin' ? 'admin' : 'trainee', b.user).run();
  else if (b.action === 'delete') await db.prepare('DELETE FROM users WHERE id = ?').bind(b.user).run();
  else return json({ error: 'Unknown action.' }, 400);
  return json({ reload: true });
};
