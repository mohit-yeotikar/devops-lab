import Anthropic from '@anthropic-ai/sdk';

export type Turn = { role: 'user' | 'assistant'; content: string };

const SYSTEM_BASE = (track: string) => `You are the coach inside "DevOps Lab", a training app for junior ${track === 'cro' ? 'CRO and analytics specialists (conversion rate optimisation for Shopify e-commerce)' : 'DevOps engineers'} from India whose English is weak.
Rules for every answer:
- Use very simple English. Short sentences. Common words. No idioms. Explain any hard word in brackets.
- Be warm and direct. Praise what is right first, then fix what is wrong.
- Keep technical facts correct and current (${track === 'cro' ? 'GA4, Google Tag Manager, Shopify Customer Events and Checkout Extensibility, Consent Mode v2, Microsoft Clarity, A/B test statistics, Meta Conversions API' : 'Docker Compose v2, Terraform 1.x, Kubernetes, GitHub Actions, AWS'}).
- When you correct English, show the corrected sentence, then one line "Why" in simple words.
- Write in English only. Never write Hindi, Hinglish or any other language, even if asked.
- Never suggest anything that costs money. ${track === 'cro' ? 'Use free tools: Shopify Partner development store, GA4, GTM, Clarity, Looker Studio, free test tools.' : 'Keep everything on AWS Free Tier or local Docker.'}
- Keep answers under 250 words unless the task says otherwise.`;

export async function coach(env: Env, opts: { system: string; turns: Turn[]; json?: boolean; maxTokens?: number; track?: string }): Promise<string> {
  const system = SYSTEM_BASE(opts.track || 'devops') + '\n\n' + opts.system + (opts.json ? '\n\nReply with ONLY a JSON object, no markdown fences.' : '');
  const turns = opts.turns.length ? opts.turns : [{ role: 'user' as const, content: 'Start.' }];
  if (env.ANTHROPIC_API_KEY) {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const res = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: opts.maxTokens ?? 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: turns.map((t) => ({ role: t.role, content: t.content })),
    } as Parameters<typeof client.beta.messages.create>[0]) as Anthropic.Beta.BetaMessage;
    if (res.stop_reason === 'refusal') return opts.json ? '{"error":"The coach could not answer this. Please rephrase."}' : 'Sorry, I cannot answer this one. Please ask in another way.';
    return res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
  }
  // Free fallback: Workers AI.
  const out = (await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast' as never, {
    messages: [{ role: 'system', content: system }, ...turns],
    max_tokens: opts.maxTokens ?? 1500,
  } as never)) as { response?: unknown; choices?: { message?: { content?: string } }[] };
  const r = out.response;
  const text = typeof r === 'string' ? r : out.choices?.[0]?.message?.content ?? (r && typeof r === 'object' ? JSON.stringify(r) : '');
  return String(text).trim();
}

export function parseJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]) as T; } catch {} }
  return fallback;
}
