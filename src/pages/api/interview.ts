import { env } from '../../lib/env';
import type { APIRoute } from 'astro';
import { body, json, requireUser } from '../../lib/auth';
import { sprints, tickets, ticketById } from '../../lib/curriculum';
import { progressFor, uid } from '../../lib/db';
import { coach, parseJson } from '../../lib/ai';

type Q = { q: string; ticketId: string };
type A = { a: string; score: number; feedback: string; better: string; hi?: string };

export const POST: APIRoute = async (ctx) => {
  const u = requireUser(ctx);
  const b = await body<{ action: string; scope?: string; id?: string; answer?: string }>(ctx.request);

  if (b.action === 'start') {
    const scope = String(b.scope || 'all');
    const prog = await progressFor(env.DB, u.id);
    let pool = scope === 'all' ? tickets.filter((t) => ['done', 'review', 'doing'].includes(prog.get(t.id)?.status ?? '')) : (sprints.find((s) => s.id === scope)?.tickets ?? []);
    if (pool.length < 3) pool = scope === 'all' ? sprints[0].tickets : pool;
    if (!pool.length) return json({ error: 'No questions for this scope yet.' }, 400);
    const all: Q[] = pool.flatMap((t) => t.interview.map((q) => ({ q: q.q, ticketId: t.id })));
    const qs = all.sort(() => Math.random() - 0.5).slice(0, 6);
    qs.unshift({ q: 'Tell me about yourself and the project you worked on.', ticketId: '' });
    const id = uid();
    await env.DB.prepare('INSERT INTO interviews (id, user_id, scope, questions) VALUES (?, ?, ?, ?)').bind(id, u.id, scope, JSON.stringify(qs)).run();
    return json({ redirect: `/app/interview/${id}` });
  }

  if (b.action === 'answer') {
    const row = await env.DB.prepare('SELECT * FROM interviews WHERE id = ? AND user_id = ?').bind(String(b.id), u.id).first<{ questions: string; answers: string; finished_at: string | null }>();
    if (!row || row.finished_at) return json({ error: 'Interview not found or finished.' }, 404);
    const qs: Q[] = JSON.parse(row.questions); const as: A[] = JSON.parse(row.answers);
    const i = as.length; const q = qs[i];
    if (!q) return json({ error: 'All questions are answered.' }, 400);
    const answer = String(b.answer || '').trim();
    if (answer.length < 10) return json({ error: 'Please answer in at least one full sentence. Saying "I do not know" with a guess is also fine.' }, 400);
    const t = q.ticketId ? ticketById(q.ticketId) : undefined;
    const model = t ? t.interview.find((x) => x.q === q.q)?.a : `A good answer: name, education, the ShopNotes project (what it is, which tools: Docker, GitHub Actions, AWS, Terraform, Kubernetes, monitoring), one problem they solved, what job they want.`;
    const system = `You are a friendly technical interviewer for a junior DevOps role in India. Grade this one answer.
QUESTION: ${q.q}
MODEL ANSWER: ${model}
${t ? `CONTEXT TICKET: ${t.key} ${t.title}. ${t.explain.en}` : ''}
Return JSON: {"score": 0-10, "feedback": "2-3 simple sentences: what was good, what was missing", "better": "a strong simple-English answer in first person, 3-5 sentences, that this trainee could say"${u.show_hindi ? ', "hi": "one Hinglish line with the main tip"' : ''}}`;
    const raw = await coach(env, { system, turns: [{ role: 'user', content: answer }], json: true });
    const r = parseJson<Partial<A>>(raw, {});
    const a: A = { a: answer, score: Math.max(0, Math.min(10, Math.round(Number(r.score ?? 5)))), feedback: r.feedback || '', better: r.better || '', hi: r.hi };
    as.push(a);
    const finished = as.length >= qs.length;
    const score = as.reduce((n, x) => n + x.score, 0) / as.length;
    await env.DB.prepare('UPDATE interviews SET answers = ?, score = ?, finished_at = ? WHERE id = ?').bind(JSON.stringify(as), score, finished ? new Date().toISOString() : null, String(b.id)).run();
    return json({ reload: true });
  }
  return json({ error: 'Unknown action.' }, 400);
};
