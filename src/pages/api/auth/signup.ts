import { env } from '../../../lib/env';
import type { APIRoute } from 'astro';
import { body, createSession, hashPassword, json } from '../../../lib/auth';
import { uid, userByEmail, userByHandle } from '../../../lib/db';

export const POST: APIRoute = async (ctx) => {
  const b = await body<{ name: string; email: string; password: string; handle: string; track?: string }>(ctx.request);
  const track = b.track === 'cro' || b.track === 'martech' ? b.track : 'devops';
  const name = String(b.name || '').trim(), email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');
  let handle = String(b.handle || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (name.length < 2) return json({ error: 'Please write your full name.' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Please write a correct email address.' }, 400);
  if (password.length < 8) return json({ error: 'Password must have at least 8 characters.' }, 400);
  if (!handle) handle = email.split('@')[0].replace(/[^a-z0-9]/g, '-');
  if (handle.length < 3) return json({ error: 'Username must have at least 3 letters.' }, 400);
  if (await userByEmail(env.DB, email)) return json({ error: 'This email already has an account. Please log in.' }, 400);
  if (await userByHandle(env.DB, handle)) return json({ error: 'This username is taken. Try another one.' }, 400);
  const id = uid();
  const role = email === (env.ADMIN_EMAIL || '').toLowerCase() ? 'admin' : 'trainee';
  await env.DB.prepare('INSERT INTO users (id, email, handle, name, password_hash, role, track, target_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, email, handle, name, await hashPassword(password), role, track, track === 'cro' ? 'CRO Specialist' : track === 'martech' ? 'Performance Marketing Lead' : 'DevOps Engineer').run();
  await createSession(env.DB, ctx.cookies, id);
  return json({ redirect: '/app?welcome=1' });
};
