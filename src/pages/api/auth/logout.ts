import { env } from '../../../lib/env';
import type { APIRoute } from 'astro';
import { destroySession } from '../../../lib/auth';
export const POST: APIRoute = async (ctx) => {
  await destroySession(env.DB, ctx.cookies);
  return ctx.redirect('/');
};
