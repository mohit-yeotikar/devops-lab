import { env } from '../../lib/env';
import type { APIRoute } from 'astro';
import { body, json, requireUser } from '../../lib/auth';
import { userByHandle } from '../../lib/db';

export const POST: APIRoute = async (ctx) => {
  const u = requireUser(ctx);
  const db = env.DB;
  const b = await body<Record<string, string>>(ctx.request);
  const handle = String(b.handle || u.handle).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (handle !== u.handle) {
    if (handle.length < 3) return json({ error: 'Username must have at least 3 letters.' }, 400);
    if (await userByHandle(db, handle)) return json({ error: 'This username is taken.' }, 400);
  }
  await db.prepare('UPDATE users SET name=?, handle=?, city=?, github=?, linkedin=?, bio=?, target_role=?, public_portfolio=?, track=? WHERE id=?')
    .bind(String(b.name || u.name).trim(), handle, String(b.city || ''), String(b.github || '').trim(), String(b.linkedin || '').trim(), String(b.bio || '').slice(0, 600),
      String(b.target_role || 'DevOps Engineer'), b.public_portfolio ? 1 : 0, ['devops', 'cro', 'martech'].includes(String(b.track)) ? String(b.track) : (u.track || 'devops'), u.id).run();
  return json({ reload: true });
};
