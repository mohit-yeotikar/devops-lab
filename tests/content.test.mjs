import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';

const dir = new URL('../src/content/curriculum/', import.meta.url);
const files = readdirSync(dir).filter((f) => /^sprint-\d\d\.json$/.test(f)).sort();
const sprints = files.map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));

test('12 sprint files exist', () => assert.equal(files.length, 12, `found ${files.join(', ')}`));

test('every sprint has the required shape', () => {
  const keys = new Set(), ids = new Set();
  for (const s of sprints) {
    for (const k of ['id', 'number', 'title', 'weeks', 'theme', 'jobStory', 'outcomes', 'tickets']) assert.ok(k in s, `${s.id} missing ${k}`);
    assert.ok(s.tickets.length >= 4 && s.tickets.length <= 5, `${s.id} has ${s.tickets.length} tickets`);
    for (const t of s.tickets) {
      for (const k of ['id', 'key', 'type', 'title', 'priority', 'estimateHours', 'goal', 'context', 'steps', 'acceptance', 'evidence', 'hints', 'explain', 'vocabulary', 'interview', 'resources']) assert.ok(k in t, `${t.id ?? '?'} missing ${k}`);
      assert.ok(['task', 'project', 'incident', 'docs'].includes(t.type), `${t.id} bad type ${t.type}`);
      assert.equal(t.interview.length, 3, `${t.id} needs exactly 3 interview questions`);
      assert.ok(t.explain.en && t.explain.hi, `${t.id} needs explain.en and explain.hi`);
      assert.ok(t.steps.length >= 3, `${t.id} too few steps`);
      assert.ok(!keys.has(t.key), `duplicate key ${t.key}`); keys.add(t.key);
      assert.ok(!ids.has(t.id), `duplicate id ${t.id}`); ids.add(t.id);
      for (const r of t.resources) assert.match(r.url, /^https:\/\//, `${t.id} resource url ${r.url}`);
    }
  }
});

test('incident tickets point to an existing drill', () => {
  for (const s of sprints) for (const t of s.tickets) {
    if (t.type !== 'incident') continue;
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
