// A small Git for the practice terminal: init, status, add, commit, log, branch, checkout/switch, diff, config.
import { ok, fail, normalize, globToRe } from './shell.js';

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7); };

function repoOf(m) {
  const repos = (m.state.git ??= { repos: {}, config: {} }).repos;
  let p = m.cwd;
  while (true) { if (repos[p]) return { root: p, r: repos[p] }; if (p === '/') return null; p = normalize(p + '/..'); }
}
function ignored(m, root, rel) {
  const gi = m.fs.get(root + '/.gitignore')?.content || '';
  const parts = rel.split('/');
  for (let pat of gi.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))) {
    const dir = pat.endsWith('/'); pat = pat.replace(/\/$/, '').replace(/^\//, '');
    const re = globToRe(pat);
    if (pat.includes('/')) { if (re.test(rel) || rel.startsWith(pat + '/')) return true; continue; }
    const segs = dir ? parts.slice(0, -1) : parts;
    if (segs.some((s) => re.test(s))) return true;
  }
  return false;
}
function work(m, root) {
  const t = {};
  for (const k of m.fs.walk(root)) {
    const rel = k.slice(root.length + 1);
    if (!rel || rel === '.git' || rel.startsWith('.git/')) continue;
    if (m.fs.isFile(k) && !ignored(m, root, rel)) t[rel] = m.fs.get(k).content;
  }
  return t;
}
const headTree = (r) => (r.branches[r.branch] ? r.commits[r.branches[r.branch]].tree : {});
function diffTrees(a, b) {
  const out = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!(k in a)) out.push(['new file', k]); else if (!(k in b)) out.push(['deleted', k]); else if (a[k] !== b[k]) out.push(['modified', k]);
  }
  return out.sort((x, y) => x[1].localeCompare(y[1]));
}
const relTo = (m, root, rel) => { const abs = root + '/' + rel; return abs.startsWith(m.cwd + '/') ? abs.slice(m.cwd.length + 1) : abs.slice(root.length + 1); };

export function git({ m, args }) {
  const [sub, ...rest] = args;
  const st = (m.state.git ??= { repos: {}, config: {} });
  if (!sub) return ok('usage: git <command>\n\nThe ones you need most:\n   init      create a new repository\n   status    show what changed\n   add       stage changes\n   commit    save a snapshot\n   log       list snapshots\n   branch    list or create branches\n   switch    change branch\n');
  if (sub === '--version' || sub === 'version') return ok('git version 2.43.0\n');
  if (sub === 'config') {
    const vals = rest.filter((a) => !a.startsWith('--'));
    if (rest.includes('--list') || rest.includes('-l')) return ok(Object.entries(st.config).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
    if (vals.length === 1) return st.config[vals[0]] ? ok(st.config[vals[0]] + '\n') : { out: '', err: '', code: 1 };
    if (vals.length >= 2) { st.config[vals[0]] = vals.slice(1).join(' '); return ok(); }
    return fail('error: key does not contain a section', 2, 'Example: git config --global user.name "Your Name"');
  }
  if (sub === 'init') {
    const { root: existing } = repoOf(m) || {};
    const b = rest.includes('-b') ? rest[rest.indexOf('-b') + 1] : rest.find((a) => a.startsWith('--initial-branch='))?.split('=')[1] || 'master';
    const target = m.resolve(rest.filter((a) => !a.startsWith('-') && a !== b)[0] || '.');
    m.fs.mkdirp(target + '/.git');
    if (st.repos[target]) return ok(`Reinitialized existing Git repository in ${target}/.git/\n`);
    st.repos[target] = { branch: b, branches: { [b]: null }, commits: {}, index: {} };
    const hint = b === 'master' ? 'hint: Using \'master\' as the name for the initial branch. Most teams use "main".\nhint: Next time run: git init -b main\n' : '';
    return ok(`${hint}Initialized empty Git repository in ${target}/.git/\n${existing && existing !== target ? '(Note: this is inside another repository: ' + existing + '. Usually you want only one.)\n' : ''}`);
  }
  const found = repoOf(m);
  if (!found) return fail('fatal: not a git repository (or any of the parent directories): .git', 128, 'Go into your project folder with cd, or create a repository first with git init -b main');
  const { root, r } = found;
  const w = work(m, root);
  if (sub === 'status') {
    const staged = diffTrees(headTree(r), r.index);
    const unstaged = diffTrees(r.index, Object.fromEntries(Object.entries(w).filter(([k]) => k in r.index))).concat(Object.keys(r.index).filter((k) => !(k in w)).map((k) => ['deleted', k]));
    const uniqU = [...new Map(unstaged.map((x) => [x[1], x])).values()];
    const untrackedFiles = Object.keys(w).filter((k) => !(k in r.index));
    const untracked = [...new Set(untrackedFiles.map((k) => {
      const parts = k.split('/');
      for (let i = 1; i < parts.length; i++) { const d = parts.slice(0, i).join('/') + '/'; if (!Object.keys(r.index).some((x) => x.startsWith(d))) return d; }
      return k;
    }))].sort();
    let out = `On branch ${r.branch}\n`;
    if (!r.branches[r.branch]) out += '\nNo commits yet\n';
    if (staged.length) out += '\nChanges to be committed:\n  (use "git restore --staged <file>..." to unstage)\n' + staged.map(([k, f]) => `\t${(k + ':').padEnd(12)}${relTo(m, root, f)}`).join('\n') + '\n';
    if (uniqU.length) out += '\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n' + uniqU.map(([k, f]) => `\t${(k + ':').padEnd(12)}${relTo(m, root, f)}`).join('\n') + '\n';
    if (untracked.length) out += '\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)\n' + untracked.map((f) => '\t' + relTo(m, root, f)).join('\n') + '\n';
    if (!staged.length && !uniqU.length && !untracked.length) out += r.branches[r.branch] ? 'nothing to commit, working tree clean\n' : '\nnothing to commit (create/copy files and use "git add" to track)\n';
    else if (!staged.length) out += untracked.length && !uniqU.length ? '\nnothing added to commit but untracked files present (use "git add" to track)\n' : '\nno changes added to commit (use "git add" and/or "git commit -a")\n';
    return ok(out);
  }
  if (sub === 'add') {
    const paths = rest.filter((a) => !a.startsWith('-'));
    if (!paths.length && !rest.includes('-A') && !rest.includes('--all')) return fail('Nothing specified, nothing added.', 0, 'Write what to add. "git add ." adds everything in this folder.');
    const all = rest.includes('-A') || rest.includes('--all');
    const targets = all ? [root] : paths.map((p) => m.resolve(p));
    for (const t of targets) {
      const rel = t === root ? '' : t.slice(root.length + 1);
      if (t !== root && !t.startsWith(root + '/')) return fail(`fatal: ${t}: '${t}' is outside repository at '${root}'`, 128);
      const hit = Object.keys(w).filter((k) => !rel || k === rel || k.startsWith(rel + '/'));
      const gone = Object.keys(r.index).filter((k) => !(k in w) && (!rel || k === rel || k.startsWith(rel + '/')));
      if (!hit.length && !gone.length) {
        if (rel && ignored(m, root, rel)) return fail(`The following paths are ignored by one of your .gitignore files:\n${rel}`, 1, 'This file is in .gitignore on purpose, so Git skips it. That is correct for things like .venv/ and .env.');
        if (!m.fs.get(t)) return fail(`fatal: pathspec '${paths[0]}' did not match any files`, 128, 'Check the file name with ls.');
      }
      for (const k of hit) r.index[k] = w[k];
      for (const k of gone) delete r.index[k];
    }
    return ok();
  }
  if (sub === 'commit') {
    const msgI = rest.findIndex((a) => a === '-m' || a === '-am' || a === '-a');
    if (rest.includes('-a') || rest.includes('-am')) for (const k of Object.keys(r.index)) { if (k in w) r.index[k] = w[k]; else delete r.index[k]; }
    const mIdx = rest.findIndex((a) => a === '-m' || a === '-am');
    const msg = mIdx >= 0 ? rest[mIdx + 1] : undefined;
    if (msgI < 0 || msg === undefined) return fail('error: this sandbox has no text editor for commit messages.', 1, 'Write the message on the same line: git commit -m "Add health check"');
    if (!st.config['user.name'] || !st.config['user.email']) return fail(`Author identity unknown\n\n*** Please tell me who you are.\n\nRun\n\n  git config --global user.email "you@example.com"\n  git config --global user.name "Your Name"\n\nto set your account's default identity.\nfatal: unable to auto-detect email address (got 'trainee@${m.host}.(none)')`, 128, 'Git needs your name and email once. Use the two git config commands above, then commit again.');
    if (!diffTrees(headTree(r), r.index).length) return fail(`On branch ${r.branch}\n${Object.keys(w).some((k) => !(k in r.index) || w[k] !== r.index[k]) ? 'no changes added to commit (use "git add" and/or "git commit -a")' : 'nothing to commit, working tree clean'}`, 1, 'First stage your changes with git add, then commit.');
    const parent = r.branches[r.branch];
    const changes = diffTrees(headTree(r), r.index);
    const id = hash(msg + JSON.stringify(r.index) + (parent || '') + Object.keys(r.commits).length);
    r.commits[id] = { id, msg, parent, tree: { ...r.index }, author: st.config['user.name'], date: new Date().toUTCString() };
    r.branches[r.branch] = id;
    return ok(`[${r.branch}${parent ? '' : ' (root-commit)'} ${id}] ${msg}\n ${changes.length} file${changes.length > 1 ? 's' : ''} changed\n`);
  }
  if (sub === 'log') {
    let id = r.branches[r.branch];
    if (!id) return fail(`fatal: your current branch '${r.branch}' does not have any commits yet`, 128, 'Make your first commit with git add and git commit -m "message".');
    const one = rest.includes('--oneline');
    const out = [];
    let first = true;
    while (id) {
      const c = r.commits[id];
      const refs = Object.entries(r.branches).filter(([, v]) => v === id).map(([b]) => (b === r.branch && first ? `HEAD -> ${b}` : b));
      const deco = refs.length ? ` (${refs.join(', ')})` : '';
      out.push(one ? `${c.id}${deco} ${c.msg}` : `commit ${c.id}${'0'.repeat(33)}${deco}\nAuthor: ${c.author} <${st.config['user.email']}>\nDate:   ${c.date}\n\n    ${c.msg}\n`);
      id = c.parent; first = false;
    }
    return ok(out.join('\n') + '\n');
  }
  if (sub === 'branch') {
    const names = rest.filter((a) => !a.startsWith('-'));
    if (rest.includes('-d') || rest.includes('-D')) { const n = names[0]; if (n === r.branch) return fail(`error: Cannot delete branch '${n}' checked out at '${root}'`); if (!(n in r.branches)) return fail(`error: branch '${n}' not found.`); delete r.branches[n]; return ok(`Deleted branch ${n}.\n`); }
    if (names.length) { if (!r.branches[r.branch]) return fail(`fatal: not a valid object name: '${r.branch}'.`, 128, 'Make your first commit before you create branches.'); if (names[0] in r.branches) return fail(`fatal: a branch named '${names[0]}' already exists`, 128); r.branches[names[0]] = r.branches[r.branch]; return ok(); }
    return ok(Object.keys(r.branches).sort().map((b) => (b === r.branch ? '* ' : '  ') + b).join('\n') + '\n');
  }
  if (sub === 'checkout' || sub === 'switch') {
    const create = rest.includes('-b') || rest.includes('-c');
    const name = rest.filter((a) => !a.startsWith('-'))[0];
    if (!name) return fail(`fatal: missing branch name`, 128, `Example: git ${sub} ${sub === 'checkout' ? '-b' : '-c'} feature/health`);
    if (create) {
      if (name in r.branches) return fail(`fatal: a branch named '${name}' already exists`, 128, `To move to it, run: git switch ${name}`);
      r.branches[name] = r.branches[r.branch]; r.branch = name;
      return ok(`Switched to a new branch '${name}'\n`);
    }
    if (!(name in r.branches)) return fail(`error: pathspec '${name}' did not match any file(s) known to git`, 1, `This branch does not exist. Create it with: git ${sub} ${sub === 'checkout' ? '-b' : '-c'} ${name}`);
    const from = headTree(r); r.branch = name; const to = headTree(r);
    for (const k of Object.keys(from)) if (!(k in to)) m.fs.remove(root + '/' + k);
    for (const [k, v] of Object.entries(to)) { m.fs.mkdirp(normalize(root + '/' + k + '/..')); m.fs.write(root + '/' + k, v); }
    r.index = { ...to };
    return ok(`Switched to branch '${name}'\n`);
  }
  if (sub === 'diff') {
    const staged = rest.includes('--staged') || rest.includes('--cached');
    const a = staged ? headTree(r) : r.index, b = staged ? r.index : Object.fromEntries(Object.entries(w).filter(([k]) => k in r.index));
    let out = '';
    for (const [kind, f] of diffTrees(a, b)) {
      const A = (a[f] || '').split('\n').filter(Boolean), Bv = (b[f] || '').split('\n').filter(Boolean);
      out += `diff --git a/${f} b/${f}\n--- ${kind === 'new file' ? '/dev/null' : 'a/' + f}\n+++ b/${f}\n@@ @@\n`;
      for (const l of A) if (!Bv.includes(l)) out += '-' + l + '\n';
      for (const l of Bv) if (!A.includes(l)) out += '+' + l + '\n';
    }
    return ok(out);
  }
  if (sub === 'push' || sub === 'pull' || sub === 'clone' || sub === 'remote') return fail(sub === 'remote' ? '' : 'fatal: No configured push destination.', 128, 'This sandbox has no GitHub. On your laptop, you add GitHub with git remote add origin <url> and then git push -u origin main.');
  if (sub === 'restore') {
    const files = rest.filter((x) => !x.startsWith('-'));
    for (const f of files) { const rel = m.resolve(f).slice(root.length + 1); if (rest.includes('--staged')) { const h = headTree(r); if (rel in h) r.index[rel] = h[rel]; else delete r.index[rel]; } else if (rel in r.index) m.fs.write(root + '/' + rel, r.index[rel]); }
    return ok();
  }
  return fail(`git: '${sub}' is not a git command in this sandbox.`, 1, 'Type git to see the commands you can use.');
}
