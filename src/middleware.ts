import { defineMiddleware } from 'astro:middleware';
import { userFromCookies } from './lib/auth';
import { env } from './lib/env';

export const onRequest = defineMiddleware(async (ctx, next) => {
  const db = env.DB;
  ctx.locals.user = db ? await userFromCookies(db, ctx.cookies) : null;
  const p = ctx.url.pathname;
  if ((p.startsWith('/app') || p.startsWith('/admin')) && !ctx.locals.user) {
    return ctx.redirect('/login?next=' + encodeURIComponent(p));
  }
  if (p.startsWith('/admin') && ctx.locals.user?.role !== 'admin') return ctx.redirect('/app');
  try {
    return await next();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
});
