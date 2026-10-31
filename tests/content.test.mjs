import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';

const load = (d) => { const dir = new URL(`../src/content/${d}/`, import.meta.url); return existsSync(dir) ? readdirSync(dir).filter((f) => /^sprint-\d\d\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))) : []; };
const files = load('curriculum').map((s) => s.id);
const sprints = [...load('curriculum'), ...load('curriculum-cro'), ...load('curriculum-martech')];

test('12 DevOps sprint files exist', () => assert.equal(files.length, 12, `found ${files.join(', ')}`));

test('every sprint has the required shape', () => {
  const keys = new Set(), ids = new Set();
  for (const s of sprints) {
    for (const k of ['id', 'number', 'title', 'weeks', 'theme', 'jobStory', 'outcomes', 'tickets']) assert.ok(k in s, `${s.id} missing ${k}`);
    assert.ok(s.tickets.length >= 4 && s.tickets.length <= 5, `${s.id} has ${s.tickets.length} tickets`);
    for (const t of s.tickets) {
      for (const k of ['id', 'key', 'type', 'title', 'priority', 'estimateHours', 'goal', 'context', 'steps', 'acceptance', 'evidence', 'hints', 'explain', 'vocabulary', 'interview', 'resources']) assert.ok(k in t, `${t.id ?? '?'} missing ${k}`);
      assert.ok(['task', 'project', 'incident', 'docs'].includes(t.type), `${t.id} bad type ${t.type}`);
      assert.equal(t.interview.length, 3, `${t.id} needs exactly 3 interview questions`);
      assert.ok(t.explain.en, `${t.id} needs explain.en`);
      assert.ok(t.steps.length >= 3, `${t.id} too few steps`);
      assert.ok(!keys.has(t.key), `duplicate key ${t.key}`); keys.add(t.key);
      assert.ok(!ids.has(t.id), `duplicate id ${t.id}`); ids.add(t.id);
      for (const r of t.resources) assert.match(r.url, /^https:\/\//, `${t.id} resource url ${r.url}`);
    }
  }
});

test('incident tickets point to an existing drill', () => {
  for (const s of sprints) for (const t of s.tickets) {
    if (t.type !== 'incident' || t.lab || !/^s\d/.test(s.id)) continue;
    const text = [t.drill, t.context, t.goal, ...t.steps].join(' ');
    const m = text.match(/drills\/([a-z0-9-]+)\/?/);
    assert.ok(m, `${t.id} incident ticket does not name a drill`);
    assert.ok(existsSync(new URL(`../drills/${m[1]}/SOLUTION.md`, import.meta.url)), `${t.id} drill ${m[1]} missing`);
  }
});

test('every drill has README, SOLUTION, compose and check.sh', () => {
  const d = new URL('../drills/', import.meta.url);
  const names = readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  assert.ok(names.length >= 8);
  for (const n of names) for (const f of ['README.md', 'SOLUTION.md', 'docker-compose.yml', 'check.sh']) assert.ok(existsSync(new URL(`../drills/${n}/${f}`, import.meta.url)), `${n}/${f} missing`);
});

test('no Hindi or Hinglish anywhere in the content', () => {
  const text = JSON.stringify(sprints);
  assert.ok(!/"hi"\s*:/.test(text), 'a "hi" field is left');
  assert.ok(!/\b(karo|kijiye|tumhe|aapko|nahi hai|kya hai)\b/i.test(text), 'Hinglish words found');
});

test('case tickets point to an existing practice lab', async () => {
  const { allLabs } = await import('../src/sandbox/registry.js');
  const ids = new Set(allLabs.map((l) => l.id));
  for (const s of sprints) for (const t of s.tickets) if (t.lab) assert.ok(ids.has(t.lab), `${t.id} points to unknown lab ${t.lab}`);
});
