import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Machine, tokenize } from '../src/sandbox/shell.js';
import { labs } from '../src/sandbox/labs.js';

const plain = { id: 'plain', tasks: [] };

for (const lab of labs) {
  test(`lab ${lab.id}: the solution completes every task`, () => {
    const m = new Machine(lab);
    assert.ok(lab.tasks.length >= 5, 'at least 5 tasks');
    assert.ok(lab.quiz.length >= 3, 'at least 3 quiz questions');
    for (const q of lab.quiz) assert.ok(q.answer >= 0 && q.answer < q.options.length);
    assert.ok(!lab.tasks.every((t) => t.check(m)), 'tasks must not be done before starting');
    const log = [];
    for (const line of lab.solution) { const r = m.run(line); log.push(`$ ${line}\n${r.out}${r.tip ? 'TIP ' + r.tip + '\n' : ''}`); }
    const open = lab.tasks.filter((t) => !t.check(m)).map((t) => t.text);
    assert.deepEqual(open, [], `open tasks after solution:\n${open.join('\n')}\n\n${log.join('\n')}`);
  });
  test(`lab ${lab.id}: every task's shown command is accepted by the shell`, () => {
    const m = new Machine(lab);
    for (const t of lab.tasks) { const r = m.run(t.cmd); assert.ok(!/command not found|syntax error/.test(r.out), `${t.cmd}\n${r.out}`); }
  });
}

test('tokenizer handles quotes, variables, operators', () => {
  const { toks } = tokenize(`echo "hi $USER" 'a $b' > f.txt && ls | wc -l`, { USER: 'trainee', HOME: '/home/trainee' });
  assert.deepEqual(toks.map((t) => t.v), ['echo', 'hi trainee', 'a $b', '>', 'f.txt', '&&', 'ls', '|', 'wc', '-l']);
  assert.ok(tokenize(`echo "open`, {}).error);
});

test('basic shell behaviour and clear tips', () => {
  const m = new Machine(plain);
  m.run('mkdir -p a/b && cd a/b');
  assert.equal(m.cwd, '/home/trainee/a/b');
  m.run('echo one > f && echo two >> f');
  assert.equal(m.read('f'), 'one\ntwo\n');
  assert.equal(m.run('cat f | grep -c o').out, '2\n');
  assert.match(m.run('lss').tip, /Did you mean "ls"/);
  assert.match(m.run('mkdir x/y/z').tip, /-p/);
  const r = m.run('touch /etc/hosts.new');
  assert.match(r.out, /Permission denied/); assert.match(r.tip, /sudo/);
  assert.match(m.run('sudo echo hi > /etc/x').tip, /tee/);
  m.run('cd ~ && touch a1.log a2.log');
  assert.equal(m.run('ls *.log').out, 'a1.log  a2.log\n');
  assert.match(m.run('docker-compose up').tip, /docker compose/);
  assert.equal(m.run('false || echo fallback').out, 'fallback\n');
  assert.equal(m.complete('ec').line, 'echo ');
  assert.ok(m.run('ls -l').explain[0].text.includes('details'));
});
