import { env } from '../../../lib/env';
import type { APIRoute } from 'astro';
import { body, json, requireUser } from '../../../lib/auth';
import { now, progressOne, today } from '../../../lib/db';
import { ticketById } from '../../../lib/curriculum';

export const POST: APIRoute = async (ctx) => {
  const u = requireUser(ctx);
  const db = env.DB;
  const id = ctx.params.id!;
  const t = ticketById(id);
  if (!t) return json({ error: 'Ticket not found.' }, 404);
  const b = await body<Record<string, any>>(ctx.request);
  const action = String(b.action || '');
  const cur = await progressOne(db, u.id, id);
  const ensure = async () => {
    if (!cur) await db.prepare('INSERT INTO ticket_progress (user_id, ticket_id) VALUES (?, ?)').bind(u.id, id).run();
  };

  if (action === 'start') {
    await ensure();
    await db.prepare("UPDATE ticket_progress SET status='doing', started_at=COALESCE(started_at, ?), updated_at=? WHERE user_id=? AND ticket_id=?").bind(now(), now(), u.id, id).run();
    await db.prepare('UPDATE users SET started_at = COALESCE(started_at, ?) WHERE id = ?').bind(now(), u.id).run();
    return json({ reload: true });
  }
  if (action === 'checklist') {
    await ensure();
    const list = Array.isArray(b.checked) ? b.checked.map(Number) : [];
    await db.prepare('UPDATE ticket_progress SET checklist=?, updated_at=? WHERE user_id=? AND ticket_id=?').bind(JSON.stringify(list), now(), u.id, id).run();
    return json({ ok: true });
  }
  if (action === 'log') {
    const hours = Math.min(12, Math.max(0.25, Number(b.hours) || 0));
    const day = /^\d{4}-\d{2}-\d{2}$/.test(String(b.day || '')) ? String(b.day) : today();
    await ensure();
    await db.prepare('INSERT INTO work_log (user_id, ticket_id, day, hours, note) VALUES (?, ?, ?, ?, ?)').bind(u.id, id, day, hours, String(b.note || '').slice(0, 300)).run();
    await db.prepare('UPDATE ticket_progress SET hours = hours + ?, updated_at=? WHERE user_id=? AND ticket_id=?').bind(hours, now(), u.id, id).run();
    return json({ reload: true });
  }
  if (action === 'submit') {
    const links = String(b.links || '').split(/\s+/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s));
    const notes = String(b.notes || '').slice(0, 3000);
    if (!links.length && notes.length < 20) return json({ error: 'Please add at least one link (repo, screenshot) or write what you did (20+ characters).' }, 400);
    await ensure();
    await db.prepare("UPDATE ticket_progress SET status='review', evidence=?, submitted_at=?, updated_at=? WHERE user_id=? AND ticket_id=?")
      .bind(JSON.stringify({ links, notes }), now(), now(), u.id, id).run();
    return json({ reload: true });
  }
  return json({ error: 'Unknown action.' }, 400);
};
