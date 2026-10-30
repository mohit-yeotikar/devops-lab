import { env } from '../../../lib/env';
import type { APIRoute } from 'astro';
import { body, createSession, json, verifyPassword } from '../../../lib/auth';
import { userByEmail } from '../../../lib/db';

export const POST: APIRoute = async (ctx) => {
  const b = await body<{ email: string; password: string; next?: string }>(ctx.request);
  const u = await userByEmail(env.DB, String(b.email || ''));
  if (!u || !(await verifyPassword(String(b.password || ''), u.password_hash))) return json({ error: 'Email or password is wrong.' }, 400);
  await createSession(env.DB, ctx.cookies, u.id);
  const next = String(b.next || '');
  return json({ redirect: next.startsWith('/') ? next : '/app' });
};
