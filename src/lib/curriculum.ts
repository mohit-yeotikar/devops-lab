export type Ticket = {
  id: string; key: string; type: 'task' | 'project' | 'incident' | 'docs'; title: string; priority: string; estimateHours: number;
  goal: string; context: string; steps: string[]; acceptance: string[]; evidence: string[]; hints: string[];
  explain: { en: string }; vocabulary: { term: string; en: string }[];
  interview: { q: string; a: string }[]; resources: { title: string; url: string }[];
  drill?: string;
};
export type Sprint = { id: string; number: number; title: string; weeks: string; theme: string; jobStory: string; outcomes: string[]; tickets: Ticket[] };

const files = import.meta.glob<Sprint>('../content/curriculum/sprint-*.json', { eager: true, import: 'default' });
export const sprints: Sprint[] = Object.values(files).sort((a, b) => a.number - b.number);
export const tickets: Ticket[] = sprints.flatMap((s) => s.tickets);
const byId = new Map(tickets.map((t) => [t.id, t]));
export const ticketById = (id: string) => byId.get(id);
export const sprintOf = (ticketId: string) => sprints.find((s) => s.tickets.some((t) => t.id === ticketId));
export const sprintById = (id: string) => sprints.find((s) => s.id === id);
export const totalHours = tickets.reduce((n, t) => n + (t.estimateHours || 0), 0);

// Drill names mentioned in incident tickets: "drills/<name>/" anywhere in steps/context.
export function drillFor(t: Ticket): string | undefined {
  if (t.drill) return t.drill;
  const text = [t.context, t.goal, ...t.steps].join(' ');
  const m = text.match(/drills\/([a-z0-9-]+)\/?/i);
  return m?.[1];
}

export type Drill = { name: string; readme: string; solution: string; title: string };
const readmes = import.meta.glob<string>('../../drills/*/README.md', { eager: true, query: '?raw', import: 'default' });
const solutions = import.meta.glob<string>('../../drills/*/SOLUTION.md', { eager: true, query: '?raw', import: 'default' });
export const drills: Drill[] = Object.entries(readmes).map(([path, readme]) => {
  const name = path.split('/').slice(-2, -1)[0];
  const solution = solutions[path.replace('README.md', 'SOLUTION.md')] ?? '';
  const title = (readme.match(/^#\s+(.+)$/m)?.[1] ?? name).trim();
  return { name, readme, solution, title };
}).sort((a, b) => a.name.localeCompare(b.name));
export const drillByName = (n: string) => drills.find((d) => d.name === n);
