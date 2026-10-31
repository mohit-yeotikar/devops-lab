export type User = {
  id: string; email: string; handle: string; name: string; role: 'trainee' | 'admin';
  city: string; github: string; linkedin: string; bio: string; target_role: string;
  show_hindi: number; public_portfolio: number; created_at: string; started_at: string | null; last_seen_at: string | null;
};
export type Progress = {
  user_id: string; ticket_id: string; status: 'todo' | 'doing' | 'review' | 'changes' | 'done';
  checklist: string; evidence: string; hours: number; explanation: string; explain_score: number | null;
  reviewer_note: string; started_at: string | null; submitted_at: string | null; reviewed_at: string | null; updated_at: string;
};

export const uid = () => crypto.randomUUID().replace(/-/g, '');
export const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
export const today = () => new Date().toISOString().slice(0, 10);

export async function userByEmail(db: D1Database, email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first<User & { password_hash: string }>();
}
export async function userById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
}
export async function userByHandle(db: D1Database, handle: string) {
  return db.prepare('SELECT * FROM users WHERE handle = ?').bind(handle.toLowerCase()).first<User>();
}
export async function progressFor(db: D1Database, userId: string) {
  const { results } = await db.prepare('SELECT * FROM ticket_progress WHERE user_id = ?').bind(userId).all<Progress>();
  return new Map(results.map((p) => [p.ticket_id, p]));
}
export async function progressOne(db: D1Database, userId: string, ticketId: string) {
  return db.prepare('SELECT * FROM ticket_progress WHERE user_id = ? AND ticket_id = ?').bind(userId, ticketId).first<Progress>();
}
export async function hoursFor(db: D1Database, userId: string) {
  const r = await db.prepare('SELECT COALESCE(SUM(hours),0) AS h, COUNT(DISTINCT day) AS days, MIN(day) AS first, MAX(day) AS last FROM work_log WHERE user_id = ?').bind(userId).first<{ h: number; days: number; first: string | null; last: string | null }>();
  return r ?? { h: 0, days: 0, first: null, last: null };
}
export async function workLog(db: D1Database, userId: string, limit = 200) {
  const { results } = await db.prepare('SELECT * FROM work_log WHERE user_id = ? ORDER BY day DESC, id DESC LIMIT ?').bind(userId, limit).all<{ id: number; ticket_id: string | null; day: string; hours: number; note: string }>();
  return results;
}
export async function thread(db: D1Database, userId: string, thread: string, limit = 20) {
  const { results } = await db.prepare('SELECT role, content, created_at FROM coach_messages WHERE user_id = ? AND thread = ? ORDER BY id DESC LIMIT ?').bind(userId, thread, limit).all<{ role: 'user' | 'assistant'; content: string; created_at: string }>();
  return results.reverse();
}
export async function drillResults(db: D1Database, userId: string) {
  const { results } = await db.prepare('SELECT * FROM drill_results WHERE user_id = ? ORDER BY id DESC').bind(userId).all<{ id: number; drill: string; root_cause: string; fix: string; minutes: number | null; verdict: string; feedback: string; created_at: string }>();
  return results;
}
export type PracticeRun = { lab: string; commands: number; seconds: number | null; quiz_score: number | null; quiz_total: number | null; created_at: string };
export async function practiceRuns(db: D1Database, userId: string) {
  try {
    const { results } = await db.prepare('SELECT lab, commands, seconds, quiz_score, quiz_total, created_at FROM practice_runs WHERE user_id = ? ORDER BY id DESC').bind(userId).all<PracticeRun>();
    return results;
  } catch { return [] as PracticeRun[]; } // table missing until migration 0002 is applied
}
