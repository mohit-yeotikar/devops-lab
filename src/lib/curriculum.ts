export type Ticket = {
  id: string; key: string; type: 'task' | 'project' | 'incident' | 'docs'; title: string; priority: string; estimateHours: number;
  goal: string; context: string; steps: string[]; acceptance: string[]; evidence: string[]; hints: string[];
  explain: { en: string }; vocabulary: { term: string; en: string }[];
  interview: { q: string; a: string }[]; resources: { title: string; url: string }[];
  drill?: string; lab?: string;
};
export type Sprint = { id: string; number: number; title: string; weeks: string; theme: string; jobStory: string; outcomes: string[]; tickets: Ticket[] };

export type TrackId = 'devops' | 'cro' | 'martech';
export type Track = {
  id: TrackId; name: string; short: string; role: string; letterRole: string; system: string; pitch: string;
  tools: string[]; letterWork: string; hasDrills: boolean;
};
export const TRACKS: Record<TrackId, Track> = {
  devops: {
    id: 'devops', name: 'DevOps Engineer', short: 'DevOps', role: 'DevOps Engineer', letterRole: 'Trainee DevOps Engineer', system: 'ShopNotes',
    pitch: 'Linux, Git, Docker, CI/CD, AWS, Terraform, Kubernetes and monitoring, on one growing company system.',
    tools: ['Linux', 'Git/GitHub', 'Docker', 'GitHub Actions', 'Jenkins', 'AWS (EC2, VPC, IAM, RDS, S3)', 'Terraform', 'Ansible', 'Kubernetes', 'Helm', 'ArgoCD', 'Prometheus/Grafana/Loki'],
    letterWork: 'building and operating a three-tier web application ("ShopNotes") from local development through containerisation, CI/CD, cloud deployment on AWS, infrastructure as code, Kubernetes, GitOps and monitoring',
    hasDrills: true,
  },
  cro: {
    id: 'cro', name: 'CRO and Analytics Specialist', short: 'CRO', role: 'CRO Specialist', letterRole: 'Trainee CRO and Analytics Specialist', system: 'GlowShop',
    pitch: 'Metrics, GA4, Tag Manager, tracking, research, UX, A/B testing, Shopify and Meta CAPI, on one growing online store.',
    tools: ['Google Sheets', 'GA4', 'Google Tag Manager', 'Shopify (Customer Events, Liquid, Markets)', 'Looker Studio', 'Microsoft Clarity', 'UX heuristics (Baymard, NN/g)', 'Test prioritisation (ICE/PXL)', 'A/B test statistics', 'GrowthBook / VWO', 'Core Web Vitals', 'Meta Pixel + Conversions API'],
    letterWork: 'measuring, researching and improving the conversion rate of a Shopify e-commerce store ("GlowShop"): analytics and tag management, e-commerce tracking, dashboards, customer research, UX audits, test roadmaps, A/B testing, Shopify themes and speed, and international markets',
    hasDrills: false,
  },
  martech: {
    id: 'martech', name: 'MarTech and Performance Marketing', short: 'MarTech', role: 'Performance Marketing and MarTech Lead', letterRole: 'Performance Marketing and MarTech Specialist', system: 'Voltra Mobility',
    pitch: 'GA4 and Analytics 360, Tag Manager 360, BigQuery, Google Ads, Search Ads 360, Campaign Manager 360, DV360, Adobe Analytics, HubSpot, attribution and MMM.',
    tools: ['GA4 and Analytics 360', 'Google Tag Manager and Tag Manager 360', 'Server-side tagging', 'BigQuery and SQL', 'Looker Studio', 'Google Ads', 'Search Ads 360', 'Campaign Manager 360', 'Display & Video 360', 'Adobe Analytics', 'HubSpot', 'Attribution, incrementality and MMM'],
    letterWork: 'planning and running measurement and paid media for a multi-channel brand ("Voltra Mobility"): measurement strategy, GA4 and Analytics 360, tag management and server-side tagging, BigQuery, Google Ads and Search Ads 360, Campaign Manager 360 and Display & Video 360, Adobe Analytics, HubSpot marketing automation, attribution, incrementality and marketing mix modelling',
    hasDrills: false,
  },
};
export const trackOf = (u?: { track?: string | null } | null): TrackId => (u?.track === 'cro' || u?.track === 'martech' ? u.track : 'devops');
export const TRACK_IDS: TrackId[] = ['devops', 'cro', 'martech'];

const sortS = (o: Record<string, Sprint>) => Object.values(o).sort((a, b) => a.number - b.number);
const BY: Record<TrackId, Sprint[]> = {
  devops: sortS(import.meta.glob<Sprint>('../content/curriculum/sprint-*.json', { eager: true, import: 'default' })),
  cro: sortS(import.meta.glob<Sprint>('../content/curriculum-cro/sprint-*.json', { eager: true, import: 'default' })),
  martech: sortS(import.meta.glob<Sprint>('../content/curriculum-martech/sprint-*.json', { eager: true, import: 'default' })),
};
export function track(id: TrackId) {
  const sp = BY[id];
  const tk = sp.flatMap((s) => s.tickets);
  return { ...TRACKS[id], sprints: sp, tickets: tk, totalHours: tk.reduce((n, t) => n + (t.estimateHours || 0), 0) };
}
// Back-compat: the DevOps track.
export const sprints: Sprint[] = BY.devops;
export const tickets: Ticket[] = sprints.flatMap((s) => s.tickets);
export const totalHours = tickets.reduce((n, t) => n + (t.estimateHours || 0), 0);
const ALL = [...BY.devops, ...BY.cro, ...BY.martech];
const byId = new Map(ALL.flatMap((s) => s.tickets).map((t) => [t.id, t]));
export const ticketById = (id: string) => byId.get(id);
export const sprintOf = (ticketId: string) => ALL.find((s) => s.tickets.some((t) => t.id === ticketId));
export const sprintById = (id: string) => ALL.find((s) => s.id === id);
export const trackOfSprint = (sprintId: string): TrackId => (BY.cro.some((s) => s.id === sprintId) ? 'cro' : BY.martech.some((s) => s.id === sprintId) ? 'martech' : 'devops');

// Drill names mentioned in incident tickets: "drills/<name>/" anywhere in steps/context.
export function drillFor(t: Ticket): string | undefined {
  if (t.drill) return t.drill;
  if (t.lab) return undefined;
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
