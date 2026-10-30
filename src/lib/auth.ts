import type { APIContext, AstroCookies } from 'astro';
import { uid, now, userById, type User } from './db';

const COOKIE = 'dl_session';
const ITER = 100_000;

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITER }, key, 256);
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2(password, salt);
  return `pbkdf2$${ITER}$${b64(salt.buffer)}$${b64(bits)}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [, , salt, hash] = stored.split('$');
  const bits = await pbkdf2(password, unb64(salt));
  const a = new Uint8Array(bits), b = unb64(hash);
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createSession(db: D1Database, cookies: AstroCookies, userId: string) {
  const id = uid() + uid();
  const expires = new Date(Date.now() + 30 * 86400_000);
  await db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(id, userId, expires.toISOString()).run();
  cookies.set(COOKIE, id, { path: '/', httpOnly: true, sameSite: 'lax', secure: true, expires });
}
export async function destroySession(db: D1Database, cookies: AstroCookies) {
  const id = cookies.get(COOKIE)?.value;
  if (id) await db.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
  cookies.delete(COOKIE, { path: '/' });
}
export async function userFromCookies(db: D1Database, cookies: AstroCookies): Promise<User | null> {
  const id = cookies.get(COOKIE)?.value;
  if (!id) return null;
  const s = await db.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?').bind(id).first<{ user_id: string; expires_at: string }>();
  if (!s || new Date(s.expires_at) < new Date()) return null;
  const u = await userById(db, s.user_id);
  if (u) await db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').bind(now(), u.id).run();
  return u;
}
export function requireUser(ctx: APIContext): User {
  if (!ctx.locals.user) throw new Response(JSON.stringify({ error: 'Please log in.' }), { status: 401, headers: { 'content-type': 'application/json' } });
  return ctx.locals.user;
}
export function requireAdmin(ctx: APIContext): User {
  const u = requireUser(ctx);
  if (u.role !== 'admin') throw new Response(JSON.stringify({ error: 'Admin only.' }), { status: 403, headers: { 'content-type': 'application/json' } });
  return u;
}
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
export async function body<T = Record<string, unknown>>(request: Request): Promise<T> {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) return (await request.json()) as T;
  const fd = await request.formData();
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.endsWith('[]')) ((o[k.slice(0, -2)] ||= []) as unknown[]).push(v);
    else o[k] = v;
  }
  return o as T;
}
