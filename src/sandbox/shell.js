// Practice terminal engine. Pure JS, no DOM: runs in the browser and in node tests.
// A Machine has a small virtual file system, a shell parser (quotes, $VARS, ~, globs,
// pipes, &&, ||, ;, > and >>), common Linux commands, and per-lab extra commands.
import { explain, summary } from './explain.js';

/* ---------- paths ---------- */
export function normalize(p) {
  const out = [];
  for (const part of p.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop(); else out.push(part);
  }
  return '/' + out.join('/');
}
export const dirname = (p) => normalize(p + '/..');
export const basename = (p) => normalize(p).split('/').pop() || '/';

/* ---------- sizes ---------- */
export function human(n) {
  const u = ['', 'K', 'M', 'G', 'T'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  if (i === 0) return String(Math.round(n));
  return (n < 10 ? n.toFixed(1) : String(Math.round(n))) + u[i];
}
export function parseSize(s) {
  const m = String(s).match(/^(\d+(?:\.\d+)?)([KMGT]?)B?$/i);
  if (!m) return NaN;
  return Math.round(Number(m[1]) * 1024 ** ' KMGT'.indexOf((m[2] || ' ').toUpperCase()));
}

/* ---------- file system ---------- */
export class FS {
  constructor() { this.n = new Map([['/', { type: 'dir', mode: 0o755, mtime: Date.now() }]]); }
  get(p) { return this.n.get(normalize(p)); }
  isDir(p) { return this.get(p)?.type === 'dir'; }
  isFile(p) { return this.get(p)?.type === 'file'; }
  mkdirp(p) {
    let cur = '';
    for (const part of normalize(p).split('/').filter(Boolean)) {
      cur += '/' + part;
      const e = this.n.get(cur);
      if (!e) this.n.set(cur, { type: 'dir', mode: 0o755, mtime: Date.now() });
      else if (e.type !== 'dir') return `${cur}: Not a directory`;
    }
    return null;
  }
  write(p, content, { append = false, size, mode } = {}) {
    p = normalize(p);
    if (!this.isDir(dirname(p))) return `${p}: No such file or directory`;
    const e = this.n.get(p);
    if (e?.type === 'dir') return `${p}: Is a directory`;
    const text = append && e ? e.content + content : content;
    this.n.set(p, { type: 'file', content: text, size: size ?? undefined, mode: mode ?? e?.mode ?? 0o644, mtime: Date.now() });
    return null;
  }
  list(p) {
    p = normalize(p);
    const pre = p === '/' ? '/' : p + '/';
    const out = [];
    for (const k of this.n.keys()) if (k !== p && k.startsWith(pre) && !k.slice(pre.length).includes('/')) out.push(k.slice(pre.length));
    return out.sort((a, b) => a.localeCompare(b));
  }
  remove(p) {
    p = normalize(p);
    for (const k of [...this.n.keys()]) if (k === p || k.startsWith(p + '/')) this.n.delete(k);
  }
  fileSize(p) { const e = this.get(p); return e?.type === 'file' ? (e.size ?? e.content.length) : 4096; }
  size(p) {
    p = normalize(p);
    let total = 0;
    for (const [k, e] of this.n) if ((k === p || k.startsWith(p === '/' ? '/' : p + '/')) && e.type === 'file') total += e.size ?? e.content.length;
    return total;
  }
  walk(p) {
    p = normalize(p);
    return [...this.n.keys()].filter((k) => k === p || k.startsWith(p === '/' ? '/' : p + '/')).sort();
  }
}

/* ---------- tokenizer ---------- */
const OPS = ['&&', '||', '2>&1', '2>>', '2>', '>>', '|', ';', '>', '<'];
export function tokenize(line, vars) {
  const toks = [];
  let i = 0, cur = null;
  const push = () => { if (cur) { toks.push(cur); cur = null; } };
  const word = () => (cur ??= { t: 'w', v: '', q: false, glob: false });
  const expand = (s, j) => {
    let m = s.slice(j).match(/^\$\{([A-Za-z_]\w*)\}|^\$([A-Za-z_]\w*)|^\$\?/);
    if (!m) return null;
    const name = m[1] || m[2] || '?';
    return { text: String(vars[name] ?? ''), len: m[0].length };
  };
  while (i < line.length) {
    const c = line[i];
    if (c === ' ' || c === '\t') { push(); i++; continue; }
    if (c === '#' && !cur) break;
    const op = OPS.find((o) => line.startsWith(o, i));
    if (op && !(op === '2>' || op === '2>>' || op === '2>&1') || (op && !cur)) { push(); toks.push({ t: 'op', v: op }); i += op.length; continue; }
    if (c === "'") {
      const j = line.indexOf("'", i + 1);
      if (j < 0) return { error: "Missing closing ' (single quote)." };
      word().v += line.slice(i + 1, j); cur.q = true; i = j + 1; continue;
    }
    if (c === '"') {
      let j = i + 1; const w = word(); w.q = true;
      while (j < line.length && line[j] !== '"') {
        if (line[j] === '\\' && j + 1 < line.length && '"\\$'.includes(line[j + 1])) { w.v += line[j + 1]; j += 2; continue; }
        if (line[j] === '$') { const e = expand(line, j); if (e) { w.v += e.text; j += e.len; continue; } }
        w.v += line[j++];
      }
      if (j >= line.length) return { error: 'Missing closing " (double quote).' };
      i = j + 1; continue;
    }
    if (c === '\\' && i + 1 < line.length) { word().v += line[i + 1]; i += 2; continue; }
    if (c === '$') { const e = expand(line, i); if (e) { word().v += e.text; i += e.len; continue; } }
    if (c === '~' && !cur && (i + 1 === line.length || '/ '.includes(line[i + 1]))) { word().v += vars.HOME; i++; continue; }
    if (c === '*' || c === '?') word().glob = true;
    word().v += c; i++;
  }
  push();
  return { toks };
}

/* ---------- glob ---------- */
export function globToRe(g) {
  return new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
}

/* ---------- helpers for commands ---------- */
export function flags(args, withValue = []) {
  const f = new Set(), v = {}, rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { rest.push(...args.slice(i + 1)); break; }
    if (a.startsWith('--')) {
      const [k, val] = a.slice(2).split('=');
      if (withValue.includes('--' + k) && val === undefined) { v[k] = args[++i]; f.add(k); }
      else { f.add(k); if (val !== undefined) v[k] = val; }
    } else if (a.startsWith('-') && a.length > 1 && !/^-\d/.test(a)) {
      for (let j = 1; j < a.length; j++) {
        const ch = a[j];
        if (withValue.includes('-' + ch)) { v[ch] = a.slice(j + 1) || args[++i]; f.add(ch); break; }
        f.add(ch);
      }
    } else rest.push(a);
  }
  return { f, v, rest };
}
export const ok = (out = '') => ({ out, err: '', code: 0 });
export const fail = (err, code = 1, tip) => ({ out: '', err, code, tip });
const lines = (s) => (s === '' ? [] : s.replace(/\n$/, '').split('\n'));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const lsDate = (t) => { const d = new Date(t); return `${MON[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const modeStr = (e) => (e.type === 'dir' ? 'd' : '-') + [6, 3, 0].map((s) => { const b = (e.mode >> s) & 7; return (b & 4 ? 'r' : '-') + (b & 2 ? 'w' : '-') + (b & 1 ? 'x' : '-'); }).join('');
export function table(rows, gap = 3) {
  const w = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i] ?? '').length)));
  return rows.map((r) => r.map((c, i) => (i === r.length - 1 ? String(c) : String(c).padEnd(w[i] + gap))).join('').trimEnd()).join('\n') + '\n';
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/* ---------- built-in commands ---------- */
const B = {};

B.help = ({ m }) => {
  const names = Object.keys(m.commands).filter((n) => !m.hidden.has(n)).sort();
  return ok('Commands you can use in this lab:\n' + names.map((n) => `  ${n.padEnd(11)}${summary(n)}`).join('\n') + '\n\nTip: press the Up arrow to repeat a command. Press Tab to complete a name.\n');
};
B.man = ({ args }) => (args[0] ? ok(`${args[0]}: ${explain(args[0], args.slice(1))}\n(This sandbox shows a short summary. On a real machine, man ${args[0]} shows the full manual. Press q to leave it.)\n`) : fail('What manual page do you want?\nFor example, try: man ls'));
B.pwd = ({ m }) => ok(m.cwd + '\n');
B.whoami = ({ m, sudo }) => ok((sudo ? 'root' : m.user) + '\n');
B.hostname = ({ m }) => ok(m.host + '\n');
B.date = () => ok(new Date().toString().replace(/ \(.*\)$/, '') + '\n');
B.uname = ({ m, args }) => ok(args.includes('-a') ? `Linux ${m.host} 6.8.0-45-generic #45-Ubuntu SMP x86_64 x86_64 x86_64 GNU/Linux\n` : 'Linux\n');
B.uptime = () => ok(' 10:42:07 up 3 days,  2:11,  1 user,  load average: 0.12, 0.08, 0.05\n');
B.clear = () => ({ out: '', err: '', code: 0, clear: true });
B.history = ({ m }) => ok(m.history.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`).join('\n') + '\n');
B.echo = ({ args }) => { const { f, rest } = flags(args); return ok(rest.join(' ') + (f.has('n') ? '' : '\n')); };
B.true = () => ok();
B.false = () => ({ out: '', err: '', code: 1 });

B.cd = ({ m, args }) => {
  let t = args[0];
  if (!t || t === '~') t = m.home;
  if (t === '-') t = m.oldCwd || m.cwd;
  const p = m.resolve(t);
  if (!m.fs.get(p)) return fail(`bash: cd: ${args[0]}: No such file or directory`, 1, `Check the name with ls. You are now in ${m.cwd}.`);
  if (!m.fs.isDir(p)) return fail(`bash: cd: ${args[0]}: Not a directory`, 1, 'cd only goes into folders. To read a file, use cat.');
  m.oldCwd = m.cwd; m.cwd = p; return ok();
};

B.ls = ({ m, args }) => {
  const { f, rest } = flags(args);
  const long = f.has('l'), all = f.has('a') || f.has('A'), hum = f.has('h');
  const targets = rest.length ? rest : ['.'];
  const outs = [], errs = [], fileItems = [];
  const fmt = (name, e) => {
    if (!long) return name + (e.type === 'dir' ? '/' : '');
    const size = e.type === 'dir' ? 4096 : (e.size ?? e.content.length);
    return `${modeStr(e)} 1 ${e.owner || 'trainee'} ${e.owner || 'trainee'} ${(hum ? human(size) : String(size)).padStart(6)} ${lsDate(e.mtime)} ${name}`;
  };
  for (const t of targets) {
    const p = m.resolve(t), e = m.fs.get(p);
    if (!e) { errs.push(`ls: cannot access '${t}': No such file or directory`); continue; }
    if (e.type === 'file') { fileItems.push(fmt(t, m.entry(p))); continue; }
    let names = m.fs.list(p);
    if (!all) names = names.filter((n) => !n.startsWith('.'));
    const items = names.map((n) => fmt(n, m.entry(p === '/' ? '/' + n : p + '/' + n)));
    if (all && long) items.unshift(fmt('.', m.entry(p)), fmt('..', m.entry(dirname(p))));
    const head = targets.length > 1 ? `${t}:\n` : '';
    const total = long ? `total ${hum ? human(m.fs.size(p)) : Math.ceil(m.fs.size(p) / 1024)}\n` : '';
    outs.push(head + total + (long ? items.join('\n') : items.join('  ')));
  }
  if (fileItems.length) outs.unshift(fileItems.join(long ? '\n' : '  '));
  return { out: outs.filter((x) => x !== '').join('\n\n') + (outs.some((x) => x) ? '\n' : ''), err: errs.join('\n'), code: errs.length ? 2 : 0 };
};

B.mkdir = ({ m, args, sudo }) => {
  const { f, rest } = flags(args);
  if (!rest.length) return fail('mkdir: missing operand', 1, 'Write the folder name after mkdir. Example: mkdir logs');
  for (const t of rest) {
    const p = m.resolve(t);
    const w = m.canWrite(p, sudo); if (w) return w;
    if (m.fs.get(p)) { if (f.has('p')) continue; return fail(`mkdir: cannot create directory '${t}': File exists`); }
    if (!f.has('p') && !m.fs.isDir(dirname(p))) return fail(`mkdir: cannot create directory '${t}': No such file or directory`, 1, 'The parent folder does not exist. Add -p to create all missing folders: mkdir -p ' + t);
    const e = m.fs.mkdirp(p); if (e) return fail('mkdir: ' + e);
  }
  return ok();
};

B.touch = ({ m, args, sudo }) => {
  if (!args.length) return fail('touch: missing file operand', 1, 'Write a file name after touch. Example: touch notes.txt');
  for (const t of args) {
    const p = m.resolve(t);
    const w = m.canWrite(p, sudo); if (w) return w;
    const e = m.fs.get(p);
    if (e) { e.mtime = Date.now(); continue; }
    const err = m.fs.write(p, ''); if (err) return fail(`touch: cannot touch '${t}': No such file or directory`, 1, 'The folder does not exist yet. Create it first with mkdir -p.');
  }
  return ok();
};

B.cat = ({ m, args, stdin }) => {
  const { rest, f } = flags(args);
  if (!rest.length) return ok(stdin);
  let out = '', err = [];
  for (const t of rest) {
    const p = m.resolve(t), e = m.fs.get(p);
    if (!e) { err.push(`cat: ${t}: No such file or directory`); continue; }
    if (e.type === 'dir') { err.push(`cat: ${t}: Is a directory`); continue; }
    if (e.size && e.size > 1e6) { err.push(`cat: ${t}: this file is ${human(e.size)}. Printing it all would freeze your screen. Use tail or less.`); continue; }
    if (!m.canRead(p) && !m.lastSudo) { err.push(`cat: ${t}: Permission denied`); continue; }
    out += e.content;
  }
  if (f.has('n')) out = lines(out).map((l, i) => `${String(i + 1).padStart(6)}\t${l}`).join('\n') + '\n';
  return { out, err: err.join('\n'), code: err.length ? 1 : 0 };
};

function headTail(which) {
  return ({ m, args, stdin }) => {
    const norm = args.map((a) => (/^-\d+$/.test(a) ? ['-n', a.slice(1)] : [a])).flat();
    const { v, rest, f } = flags(norm, ['-n']);
    const n = Number(v.n ?? 10);
    const read = (t) => { const e = m.fs.get(m.resolve(t)); if (!e) return { err: `${which}: cannot open '${t}' for reading: No such file or directory` }; if (e.type === 'dir') return { err: `${which}: error reading '${t}': Is a directory` }; return { text: e.content }; };
    const src = rest.length ? read(rest[0]) : { text: stdin };
    if (src.err) return fail(src.err);
    const l = lines(src.text);
    const pick = which === 'head' ? l.slice(0, n) : l.slice(Math.max(0, l.length - n));
    const note = which === 'tail' && f.has('f') ? '\n(tail -f keeps waiting for new lines. In this sandbox it stops here. On a real server, press Ctrl+C to stop it.)\n' : '';
    return { out: pick.join('\n') + (pick.length ? '\n' : ''), err: note.trim() ? note.trim() : '', code: 0, info: !!note };
  };
}
B.head = headTail('head');
B.tail = headTail('tail');

B.grep = ({ m, args, stdin }) => {
  const { f, rest, v } = flags(args, ['-e', '-m']);
  const pat = v.e ?? rest.shift();
  if (pat === undefined) return fail('Usage: grep [OPTION]... PATTERNS [FILE]...', 2, 'Write what to search for, then the file. Example: grep ERROR app.log');
  let re;
  try { re = new RegExp(f.has('F') ? pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pat.replace(/\\\|/g, '|'), f.has('i') ? 'i' : ''); }
  catch { return fail(`grep: invalid pattern '${pat}'`, 2); }
  const sources = [];
  if (!rest.length) sources.push({ name: '', text: stdin });
  for (const t of rest) {
    const p = m.resolve(t), e = m.fs.get(p);
    if (!e) return fail(`grep: ${t}: No such file or directory`, 2);
    if (e.type === 'dir') {
      if (!f.has('r') && !f.has('R')) return fail(`grep: ${t}: Is a directory`, 2, 'Add -r to search all files inside a folder: grep -r ' + pat + ' ' + t);
      for (const k of m.fs.walk(p)) if (m.fs.isFile(k)) sources.push({ name: k.replace(m.cwd + '/', ''), text: m.fs.get(k).content });
    } else sources.push({ name: t, text: e.content });
  }
  const many = sources.length > 1 || f.has('r');
  let out = '', count = 0;
  for (const s of sources) {
    let c = 0;
    lines(s.text).forEach((l, i) => {
      if (re.test(l) !== f.has('v')) {
        c++;
        if (!f.has('c') && !f.has('l')) out += (many ? s.name + ':' : '') + (f.has('n') ? i + 1 + ':' : '') + l + '\n';
      }
    });
    if (f.has('c')) out += (many ? s.name + ':' : '') + c + '\n';
    if (f.has('l') && c) out += s.name + '\n';
    count += c;
  }
  return { out, err: '', code: count ? 0 : 1 };
};

B.wc = ({ m, args, stdin }) => {
  const { f, rest } = flags(args);
  const text = rest.length ? m.fs.get(m.resolve(rest[0]))?.content : stdin;
  if (text === undefined) return fail(`wc: ${rest[0]}: No such file or directory`);
  const l = lines(text).length, w = text.split(/\s+/).filter(Boolean).length, c = text.length;
  const parts = [];
  if (f.has('l')) parts.push(l); if (f.has('w')) parts.push(w); if (f.has('c') || f.has('m')) parts.push(c);
  if (!parts.length) parts.push(l, w, c);
  return ok(parts.join(' ') + (rest[0] ? ' ' + rest[0] : '') + '\n');
};

B.sort = ({ m, args, stdin }) => {
  const { f, rest } = flags(args);
  const text = rest.length ? m.fs.get(m.resolve(rest[0]))?.content ?? '' : stdin;
  let l = lines(text);
  l = f.has('n') ? l.sort((a, b) => parseFloat(a) - parseFloat(b)) : l.sort();
  if (f.has('r')) l.reverse();
  if (f.has('u')) l = [...new Set(l)];
  return ok(l.join('\n') + (l.length ? '\n' : ''));
};

B.uniq = ({ args, stdin }) => {
  const { f } = flags(args);
  const out = [];
  for (const l of lines(stdin)) { const last = out[out.length - 1]; if (last && last.v === l) last.c++; else out.push({ v: l, c: 1 }); }
  return ok(out.map((x) => (f.has('c') ? `${String(x.c).padStart(7)} ${x.v}` : x.v)).join('\n') + (out.length ? '\n' : ''));
};

B.cut = ({ args, stdin }) => {
  const { v } = flags(args, ['-d', '-f']);
  const d = v.d ?? '\t', fields = String(v.f ?? '1').split(',').map(Number);
  return ok(lines(stdin).map((l) => fields.map((i) => l.split(d)[i - 1] ?? '').join(d)).join('\n') + '\n');
};

B.awk = ({ args, stdin }) => {
  const prog = args.find((a) => /\{.*\}/.test(a)) || '';
  const m = prog.match(/\{\s*print\s+([^}]*)\}/);
  if (!m) return fail('awk: this sandbox only supports {print $N}. Example: awk \'{print $1}\'');
  const cols = m[1].split(/[ ,]+/).filter(Boolean);
  return ok(lines(stdin).map((l) => { const p = l.trim().split(/\s+/); return cols.map((c) => (c === '$0' ? l : c.startsWith('$') ? p[Number(c.slice(1)) - 1] ?? '' : c.replace(/"/g, ''))).join(' '); }).join('\n') + '\n');
};

B.tee = ({ m, args, stdin, sudo }) => {
  const { f, rest } = flags(args);
  for (const t of rest) {
    const p = m.resolve(t);
    const w = m.canWrite(p, sudo); if (w) return { ...w, out: stdin };
    const e = m.fs.write(p, stdin, { append: f.has('a') }); if (e) return fail('tee: ' + e);
    m.touched(p);
  }
  return ok(stdin);
};

B.rm = ({ m, args, sudo }) => {
  const { f, rest } = flags(args);
  if (!rest.length) return fail('rm: missing operand', 1, 'Write the file name after rm. Careful: rm deletes for ever, there is no bin.');
  for (const t of rest) {
    const p = m.resolve(t), e = m.fs.get(p);
    if (!e) { if (f.has('f')) continue; return fail(`rm: cannot remove '${t}': No such file or directory`); }
    if (p === '/' || p === m.home) return fail(`rm: refusing to remove '${t}'. This would delete everything.`);
    if (e.type === 'dir' && !f.has('r') && !f.has('R')) return fail(`rm: cannot remove '${t}': Is a directory`, 1, 'To delete a folder and everything in it, use rm -r ' + t);
    const w = m.canWrite(p, sudo); if (w) return w;
    m.fs.remove(p); m.removed(p);
  }
  return ok();
};

function copyTree(m, from, to) {
  for (const k of m.fs.walk(from)) {
    const dest = to + k.slice(from.length), e = m.fs.get(k);
    if (e.type === 'dir') m.fs.mkdirp(dest); else m.fs.write(dest, e.content, { size: e.size, mode: e.mode });
  }
}
function cpmv(kind) {
  return ({ m, args, sudo }) => {
    const { f, rest } = flags(args);
    if (rest.length < 2) return fail(`${kind}: missing destination file operand`, 1, `Write two names: ${kind} FROM TO`);
    const dest = m.resolve(rest.pop());
    for (const s of rest) {
      const from = m.resolve(s), e = m.fs.get(from);
      if (!e) return fail(`${kind}: cannot stat '${s}': No such file or directory`);
      if (e.type === 'dir' && kind === 'cp' && !f.has('r') && !f.has('R')) return fail(`cp: -r not specified; omitting directory '${s}'`, 1, 'To copy a folder, add -r: cp -r ' + s + ' ...');
      const to = m.fs.isDir(dest) ? dest + '/' + basename(from) : dest;
      const w = m.canWrite(to, sudo); if (w) return w;
      if (e.type === 'dir') copyTree(m, from, to); else { const er = m.fs.write(to, e.content, { size: e.size, mode: e.mode }); if (er) return fail(`${kind}: ${er}`); }
      if (kind === 'mv') { m.fs.remove(from); m.removed(from); }
      m.touched(to);
    }
    return ok();
  };
}
B.cp = cpmv('cp');
B.mv = cpmv('mv');

B.chmod = ({ m, args, sudo }) => {
  const [mode, ...files] = args.filter((a) => a !== '-R');
  if (!mode || !files.length) return fail('chmod: missing operand', 1, 'Example: chmod +x deploy.sh (makes the file runnable)');
  for (const t of files) {
    const p = m.resolve(t), e = m.fs.get(p);
    if (!e) return fail(`chmod: cannot access '${t}': No such file or directory`);
    const w = m.canWrite(p, sudo); if (w) return w;
    if (/^[0-7]{3,4}$/.test(mode)) e.mode = parseInt(mode.slice(-3), 8);
    else {
      const mm = mode.match(/^([ugoa]*)([+-=])([rwx]+)$/);
      if (!mm) return fail(`chmod: invalid mode: '${mode}'`, 1, 'Use +x, -w, 755 or 644.');
      const who = mm[1] || 'a', bits = (mm[3].includes('r') ? 4 : 0) | (mm[3].includes('w') ? 2 : 0) | (mm[3].includes('x') ? 1 : 0);
      let mask = 0;
      if (/[ua]/.test(who)) mask |= bits << 6; if (/[ga]/.test(who)) mask |= bits << 3; if (/[oa]/.test(who)) mask |= bits;
      e.mode = mm[2] === '+' ? e.mode | mask : mm[2] === '-' ? e.mode & ~mask : mask;
    }
  }
  return ok();
};

B.sed = ({ m, args, stdin, sudo }) => {
  const { f, rest } = flags(args);
  const expr = rest.shift();
  const mm = expr?.match(/^s(.)(.*?)\1(.*?)\1(g?)$/);
  if (!mm) return fail("sed: this sandbox supports replace only: sed 's/OLD/NEW/' file", 1, "Add -i to change the file itself: sed -i 's/OLD/NEW/' file");
  let re; try { re = new RegExp(mm[2], mm[4] ? 'g' : ''); } catch { return fail('sed: bad pattern'); }
  const apply = (t) => lines(t).map((l) => l.replace(re, mm[3].replace(/\\\//g, '/').replace(/&/g, '$&'))).join('\n') + (t.endsWith('\n') ? '\n' : '');
  if (!rest.length) return ok(apply(stdin));
  const p = m.resolve(rest[0]), e = m.fs.get(p);
  if (!e || e.type !== 'file') return fail(`sed: can't read ${rest[0]}: No such file or directory`, 2);
  if (!f.has('i')) return ok(apply(e.content));
  const w = m.canWrite(p, sudo); if (w) return w;
  m.fs.write(p, apply(e.content)); m.touched(p);
  return ok();
};

B.truncate = ({ m, args, sudo }) => {
  const { v, rest } = flags(args, ['-s']);
  if (v.s === undefined || !rest.length) return fail('truncate: you must specify a size', 1, 'To empty a file: truncate -s 0 FILE');
  for (const t of rest) {
    const p = m.resolve(t), e = m.fs.get(p);
    if (!e) return fail(`truncate: cannot open '${t}' for writing: No such file or directory`);
    const w = m.canWrite(p, sudo); if (w) return w;
    const size = parseSize(v.s); e.content = ''; e.size = size || undefined; e.mtime = Date.now(); m.touched(p);
  }
  return ok();
};

B.du = ({ m, args }) => {
  const { f, rest } = flags(args);
  const ts = rest.length ? rest : ['.'];
  return ok(ts.map((t) => { const p = m.resolve(t); if (!m.fs.get(p)) return `du: cannot access '${t}': No such file or directory`; const s = m.fs.size(p); return `${f.has('h') ? human(s) : Math.ceil(s / 1024)}\t${t}`; }).join('\n') + '\n');
};

B.df = ({ m, args }) => {
  const { f } = flags(args);
  const d = m.disk();
  const fmt = (n) => (f.has('h') ? human(n) : String(Math.round(n / 1024)));
  const pct = Math.min(100, Math.round((d.used / d.size) * 100));
  return ok(table([[ 'Filesystem', f.has('h') ? 'Size' : '1K-blocks', 'Used', 'Avail', 'Use%', 'Mounted on'], ['/dev/sda1', fmt(d.size), fmt(d.used), fmt(Math.max(0, d.size - d.used)), pct + '%', '/'], ['tmpfs', fmt(2 ** 30), '0', fmt(2 ** 30), '0%', '/dev/shm']], 2));
};

B.free = ({ m }) => { const x = m.state.mem || { total: '7.6Gi', used: '2.1Gi', free: '3.9Gi', avail: '5.2Gi' }; return ok(table([['', 'total', 'used', 'free', 'available'], ['Mem:', x.total, x.used, x.free, x.avail], ['Swap:', '2.0Gi', '0B', '2.0Gi', '']], 4)); };

B.find = ({ m, args }) => {
  const start = args[0] && !args[0].startsWith('-') ? args[0] : '.';
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const name = opt('-name'), type = opt('-type'), size = opt('-size');
  const root = m.resolve(start);
  if (!m.fs.get(root)) return fail(`find: '${start}': No such file or directory`);
  const re = name ? globToRe(name) : null;
  let min = 0;
  if (size) { const mm = size.match(/^\+(\d+)([kMG])$/); if (mm) min = Number(mm[1]) * 1024 ** ({ k: 1, M: 2, G: 3 })[mm[2]]; }
  const out = m.fs.walk(root).filter((k) => {
    const e = m.fs.get(k);
    if (type === 'f' && e.type !== 'file') return false;
    if (type === 'd' && e.type !== 'dir') return false;
    if (re && !re.test(basename(k))) return false;
    if (min && (e.type !== 'file' || (e.size ?? e.content.length) <= min)) return false;
    return true;
  }).map((k) => (start.startsWith('/') ? k : '.' + k.slice(root.length) || '.'));
  return ok(out.join('\n') + (out.length ? '\n' : ''));
};

B.which = ({ m, args }) => ok(args.filter((a) => m.commands[a]).map((a) => `/usr/bin/${a}`).join('\n') + '\n');

B.ps = ({ m }) => {
  const rows = [['USER', 'PID', '%CPU', '%MEM', 'COMMAND']];
  for (const p of m.processes()) rows.push([p.user, p.pid, p.cpu ?? '0.0', p.mem ?? '0.1', p.cmd]);
  return ok(table(rows, 2));
};

B.ss = ({ m }) => {
  const rows = [['State', 'Local Address:Port', 'Process']];
  for (const p of m.ports()) rows.push(['LISTEN', `${p.addr || '0.0.0.0'}:${p.port}`, `users:(("${p.proc}"))`]);
  return ok(table(rows, 4));
};

B.systemctl = ({ m, args, sudo }) => {
  const { f, rest } = flags(args);
  const [action, raw] = rest;
  const svcs = m.state.services || {};
  if (!action) return fail('systemctl: tell me what to do. Example: systemctl status nginx');
  if (action === 'daemon-reload') return sudo ? ok() : fail('Failed to reload daemon: Access denied', 1, 'Put sudo in front.');
  if (action === 'list-units' || action === '--type=service') return ok(Object.entries(svcs).map(([n, s]) => `${(n + '.service').padEnd(28)} loaded ${s.active ? 'active   running' : 'inactive dead   '} ${s.description}`).join('\n') + '\n');
  if (!raw) return fail(`Too few arguments. Example: systemctl ${action} nginx`);
  const name = raw.replace(/\.service$/, ''), s = svcs[name];
  if (!s) return fail(`Unit ${name}.service could not be found.`, 4, 'Check the name. List services with: systemctl list-units --type=service');
  if (action === 'status') {
    const since = s.since || 'Fri 2026-10-30 09:12:44 UTC; 1 day ago';
    const state = s.failed ? `failed (Result: exit-code) since ${since}` : s.active ? `active (running) since ${since}` : 'inactive (dead)';
    const logs = (s.logs || []).slice(-5).map((l) => '  ' + l).join('\n');
    return { out: `${s.active ? '●' : '○'} ${name}.service - ${s.description}\n     Loaded: loaded (/etc/systemd/system/${name}.service; ${s.enabled ? 'enabled' : 'disabled'}; preset: enabled)\n     Active: ${state}\n${s.active ? `   Main PID: ${s.pid || 1234} (${s.exec || name})\n` : ''}${logs ? '\n' + logs + '\n' : ''}`, err: '', code: s.active ? 0 : 3 };
  }
  if (action === 'is-active') return { out: (s.active ? 'active' : 'inactive') + '\n', err: '', code: s.active ? 0 : 3 };
  if (action === 'is-enabled') return { out: (s.enabled ? 'enabled' : 'disabled') + '\n', err: '', code: s.enabled ? 0 : 1 };
  if (!['start', 'stop', 'restart', 'reload', 'enable', 'disable'].includes(action)) return fail(`Unknown command verb ${action}.`);
  if (!sudo) return fail(`Failed to ${action} ${name}.service: Access denied`, 1, `Starting and stopping services needs admin rights. Run: sudo systemctl ${action} ${name}`);
  const r = m.lab.onService?.(m, name, action, f) ?? null;
  if (r && r.code) return r;
  if (action === 'enable') { s.enabled = true; if (f.has('now')) { s.active = true; s.failed = false; } return ok(`Created symlink /etc/systemd/system/multi-user.target.wants/${name}.service → /etc/systemd/system/${name}.service.\n`); }
  if (action === 'disable') { s.enabled = false; return ok(); }
  if (action === 'stop') { s.active = false; return ok(); }
  s.active = !s.cannotStart; s.failed = !!s.cannotStart; s.restarts = (s.restarts || 0) + 1; s.since = new Date().toUTCString();
  return s.cannotStart ? fail(`Job for ${name}.service failed because the control process exited with error code.\nSee "systemctl status ${name}.service" and "journalctl -xeu ${name}.service" for details.`) : ok();
};

B.journalctl = ({ m, args }) => {
  const { v } = flags(args, ['-u', '-n']);
  const name = (v.u || '').replace(/\.service$/, '');
  const s = m.state.services?.[name];
  if (!name) return ok((m.state.syslog || []).join('\n') + '\n');
  if (!s) return ok('-- No entries --\n');
  const l = s.logs || [];
  return ok(l.slice(-(Number(v.n) || 50)).join('\n') + '\n');
};

B.curl = ({ m, args }) => {
  const { f, v, rest } = flags(args, ['-X', '-d', '-H', '-o', '-w', '--data', '--header', '--request', '--max-time']);
  const url = rest[0];
  if (!url) return fail('curl: no URL specified!', 2, 'Example: curl http://localhost:5000/health');
  const u = /^https?:\/\//.test(url) ? url : 'http://' + url;
  const r = m.lab.http?.(m, u, v.X || v.request || (v.d || v.data ? 'POST' : 'GET'));
  if (!r) {
    const mm = u.match(/^https?:\/\/([^/:]+)(?::(\d+))?/);
    return fail(`curl: (7) Failed to connect to ${mm[1]} port ${mm[2] || (u.startsWith('https') ? 443 : 80)} after 0 ms: Couldn't connect to server`, 7, 'Nothing is listening on that address and port. Is the service running? Check the port number.');
  }
  if (r.error) return fail(r.error, r.code || 35);
  const reason = { 200: 'OK', 201: 'Created', 301: 'Moved Permanently', 400: 'Bad Request', 404: 'Not Found', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout' }[r.status] || '';
  const head = `HTTP/1.1 ${r.status} ${reason}\nServer: ${r.server || 'nginx/1.27.2'}\nContent-Type: ${r.type || 'application/json'}\n\n`;
  let out = f.has('I') ? head : (f.has('i') ? head : '') + r.body + (r.body.endsWith('\n') ? '' : '\n');
  if (v.o === '/dev/null') out = '';
  if (v.w) out += v.w.replace('%{http_code}', String(r.status)).replace(/\\n/g, '\n');
  m.lastHttp = { url: u, status: r.status, at: m.history.length };
  return ok(out);
};

const EDITORS = ['nano', 'vim', 'vi', 'edit'];
for (const ed of EDITORS) {
  B[ed] = ({ m, args, sudo }) => {
    const t = args.filter((a) => !a.startsWith('-'))[0];
    if (!t) return fail(`${ed}: write the file name. Example: ${ed} notes.txt`);
    const p = m.resolve(t);
    if (m.fs.isDir(p)) return fail(`${ed}: ${t} is a folder, not a file.`);
    if (!m.fs.isDir(dirname(p))) return fail(`${ed}: the folder ${dirname(p)} does not exist.`, 1, 'Create it first: mkdir -p ' + dirname(p));
    const w = m.canWrite(p, sudo); if (w) return fail(`[ ${t} is not writable. It belongs to root. ]`, 1, `Open it with admin rights: sudo ${ed} ${t}`);
    return { out: '', err: '', code: 0, editor: p };
  };
}

function runScript(m, p, shown) {
  const e = m.fs.get(p);
  const lines = e.content.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
  let out = '';
  for (const l of lines) { const r = m.run(l, { nested: true }); out += r.out; }
  return { out, err: '', code: 0, script: shown };
}
B.bash = ({ m, args }) => {
  if (!args[0]) return fail('bash: this sandbox cannot open a second shell. Write a script name: bash deploy.sh');
  const p = m.resolve(args[0]);
  if (!m.fs.isFile(p)) return fail(`bash: ${args[0]}: No such file or directory`, 127);
  return runScript(m, p, args[0]);
};
B.sh = B.bash;
B.sudo = () => fail('sudo: write a command after sudo. Example: sudo systemctl restart nginx');
B.exit = () => ok('logout\n(The lab stays open. Use "Reset lab" to start again.)\n');
B.ssh = () => fail('ssh: in this lab you are already on the server.', 255);
B.apt = ({ sudo, args }) => (sudo ? ok(`Reading package lists... Done\n(${args.slice(1).join(' ') || 'nothing'}: in this sandbox the tools are already installed.)\n`) : fail('E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock, are you root?', 100, 'Installing software needs admin rights: sudo apt ' + args.join(' ')));
B['apt-get'] = B.apt;

export const BUILTINS = B;

/* ---------- the machine ---------- */
export class Machine {
  constructor(lab, extra = {}) {
    this.lab = lab;
    this.user = 'trainee';
    this.home = '/home/trainee';
    this.host = lab.host || 'shopnotes-dev';
    this.fs = new FS();
    for (const d of ['/home/trainee', '/etc', '/var/log', '/tmp', '/usr/bin', '/opt']) this.fs.mkdirp(d);
    this.cwd = this.home;
    this.oldCwd = this.home;
    this.history = [];
    this.events = []; // {name, args, code, line}
    this.edits = [];
    this.state = {};
    this.vars = { HOME: this.home, USER: this.user };
    this.hidden = new Set(['sh', 'true', 'false', 'vi', 'edit', 'apt-get', 'exit', 'ssh', 'sudo', 'uname', 'uptime', 'hostname', 'which', 'man', 'awk', 'cut']);
    this.commands = { ...BUILTINS, ...(extra.commands || {}), ...(lab.commands || {}) };
    lab.setup?.(this);
    this.fs.write(this.home + '/.bashrc', '# ~/.bashrc\nalias ll="ls -la"\n');
  }
  resolve(p) { if (!p) return this.cwd; if (p === '~' || p.startsWith('~/')) p = this.home + p.slice(1); return normalize(p.startsWith('/') ? p : this.cwd + '/' + p); }
  rootOwned(p) { return !(p === this.home || p.startsWith(this.home + '/') || p.startsWith('/tmp')); }
  canWrite(p, sudo) {
    if (sudo || !this.rootOwned(p)) return null;
    return fail(`${basename(p)}: Permission denied`, 1, 'This file or folder belongs to root (the admin user). Run the same command again with sudo in front.');
  }
  canRead(p) { const e = this.fs.get(p); return !e?.secret; }
  entry(p) { const e = this.fs.get(p); return { ...e, owner: this.rootOwned(p) ? 'root' : 'trainee' }; }
  file(p, content, opts = {}) { const path = this.resolve(p); this.fs.mkdirp(dirname(path)); this.fs.write(path, content, opts); return this; }
  read(p) { return this.fs.get(this.resolve(p))?.content; }
  touched(p) { this.lab.onWrite?.(this, p); }
  removed(p) { this.lab.onRemove?.(this, p); }
  disk() { const d = this.state.disk || { size: 40 * 2 ** 30, base: 12 * 2 ** 30 }; return { size: d.size, used: d.base + this.fs.size('/') + (this.state.heldBytes || 0) }; }
  processes() {
    const ps = [{ user: 'root', pid: 1, cmd: '/sbin/init' }];
    for (const [n, s] of Object.entries(this.state.services || {})) if (s.active) ps.push({ user: s.user || 'root', pid: s.pid || 1000 + n.length * 37, cmd: s.exec || n });
    ps.push(...(this.state.processes || []));
    ps.push({ user: 'trainee', pid: 4242, cmd: '-bash' });
    return ps;
  }
  ports() { return (this.lab.ports?.(this) || []); }
  saveEdit(path, content) {
    const p = normalize(path);
    this.fs.write(p, content.endsWith('\n') ? content : content + '\n');
    this.edits.push(p);
    this.events.push({ name: 'edit', args: [p], code: 0, line: `edit ${p}` });
    this.touched(p);
  }
  prompt() { const d = this.cwd === this.home ? '~' : this.cwd.startsWith(this.home + '/') ? '~' + this.cwd.slice(this.home.length) : this.cwd; return `${this.user}@${this.host}:${d}$`; }
  ran(re) { return this.events.some((e) => e.code === 0 && re.test(e.line)); }
  ranAny(re) { return this.events.some((e) => re.test(e.line)); }

  expandWords(words) {
    const out = [];
    for (const w of words) {
      if (!w.glob || w.q) { out.push(w.v); continue; }
      const p = this.resolve(w.v), dir = dirname(p), re = globToRe(basename(p));
      const hits = this.fs.isDir(dir) ? this.fs.list(dir).filter((n) => re.test(n) && (!n.startsWith('.') || basename(p).startsWith('.'))) : [];
      if (!hits.length) { out.push(w.v); continue; }
      const prefix = w.v.includes('/') ? w.v.slice(0, w.v.lastIndexOf('/') + 1) : '';
      out.push(...hits.map((h) => prefix + h));
    }
    return out;
  }

  exec(argv, stdin) {
    let sudo = false;
    while (argv[0] === 'sudo') { sudo = true; argv = argv.slice(1); }
    if (argv[0] && /^[A-Za-z_]\w*=/.test(argv[0]) && argv.length === 1) { const [k, ...v] = argv[0].split('='); this.vars[k] = v.join('='); return ok(); }
    const [name, ...args] = argv;
    if (!name) return sudo ? B.sudo() : ok();
    if (name === 'll') return this.exec(['ls', '-la', ...args], stdin);
    if (name.includes('/')) {
      const p = this.resolve(name), e = this.fs.get(p);
      if (!e) return fail(`bash: ${name}: No such file or directory`, 127, 'Check the name with ls. To run a file in this folder, write ./ before its name.');
      if (e.type === 'dir') return fail(`bash: ${name}: Is a directory`, 126);
      if (!(e.mode & 0o100)) return fail(`bash: ${name}: Permission denied`, 126, `The file is not executable yet. Make it runnable with: chmod +x ${basename(p)}`);
      return runScript(this, p, name);
    }
    if (this.fs.isFile(this.resolve(name)) && !this.commands[name]) return fail(`${name}: command not found`, 127, `To run a file in this folder, write ./ before its name: ./${name}`);
    if (name === 'docker-compose') return fail('docker-compose: command not found', 127, 'Use "docker compose" with a space. docker-compose with a dash is the old version.');
    const fn = this.commands[name];
    this.lastSudo = sudo;
    if (!fn) {
      const near = Object.keys(this.commands).filter((c) => !this.hidden.has(c)).map((c) => [c, lev(name, c)]).sort((a, b) => a[1] - b[1])[0];
      const tip = near && near[1] <= 2 ? `Did you mean "${near[0]}"? Check the spelling.` : 'Type help to see the commands you can use here.';
      return fail(`${name}: command not found`, 127, tip);
    }
    const r = fn({ m: this, args, stdin, sudo, name }) || ok();
    if (sudo && name !== 'sudo') r.sudo = true;
    return r;
  }

  /** Run one line. Returns { out, tip, explain: [{cmd, text}], clear, editor }. */
  run(line, { nested = false } = {}) {
    line = line.trim();
    const res = { out: '', tip: '', explain: [], clear: false, editor: null };
    if (!line) return res;
    if (!nested) this.history.push(line);
    const tk = tokenize(line, { ...this.vars, PWD: this.cwd, '?': this.vars['?'] ?? 0 });
    if (tk.error) { res.out = 'bash: ' + tk.error + '\n'; res.tip = 'Every quote you open must be closed.'; return res; }
    const toks = tk.toks;
    // split on ; && ||
    const chain = [];
    let cur = [], op = null;
    for (const t of toks) {
      if (t.t === 'op' && [';', '&&', '||'].includes(t.v)) { chain.push({ op, toks: cur }); cur = []; op = t.v; } else cur.push(t);
    }
    chain.push({ op, toks: cur });
    let code = 0;
    for (const step of chain) {
      if (step.op === '&&' && code !== 0) continue;
      if (step.op === '||' && code === 0) continue;
      if (!step.toks.length) continue;
      const r = this.pipeline(step.toks, res);
      code = r.code;
      this.vars['?'] = code;
    }
    if (!res.out.endsWith('\n') && res.out) res.out += '\n';
    if (!nested) this.lab.afterCommand?.(this, line);
    if (this.tip) { res.tip = this.tip; this.tip = null; }
    return res;
  }

  pipeline(toks, res) {
    const parts = [[]];
    for (const t of toks) { if (t.t === 'op' && t.v === '|') parts.push([]); else parts[parts.length - 1].push(t); }
    let stdin = '', last = { code: 0 };
    for (let i = 0; i < parts.length; i++) {
      const words = [], redir = [];
      const ts = parts[i];
      for (let j = 0; j < ts.length; j++) {
        const t = ts[j];
        if (t.t === 'op' && ['>', '>>', '2>', '2>>', '<'].includes(t.v)) { redir.push({ op: t.v, target: ts[++j]?.v }); continue; }
        if (t.t === 'op' && t.v === '2>&1') { redir.push({ op: '2>&1' }); continue; }
        if (t.t === 'w') words.push(t);
      }
      for (const r of redir) if (r.op !== '2>&1' && !r.target) { res.out += 'bash: syntax error near unexpected token `newline\'\n'; res.tip = `Write a file name after ${r.op}`; return { code: 2 }; }
      const argv = this.expandWords(words);
      const inR = redir.find((r) => r.op === '<');
      if (inR) { const e = this.fs.get(this.resolve(inR.target)); if (!e) { res.out += `bash: ${inR.target}: No such file or directory\n`; return { code: 1 }; } stdin = e.content; }
      const r = this.exec(argv, stdin);
      const cmdText = argv.join(' ');
      this.events.push({ name: argv[0] === 'sudo' ? argv[1] : argv[0], args: argv, code: r.code, line: cmdText, sudo: !!r.sudo });
      if (argv.length) res.explain.push({ cmd: cmdText, text: explain(argv[0] === 'sudo' ? argv[1] : argv[0], argv[0] === 'sudo' ? argv.slice(2) : argv.slice(1), argv[0] === 'sudo') });
      if (r.clear) { res.clear = true; res.out = ''; }
      if (r.editor) res.editor = r.editor;
      if (r.tip && !res.tip) res.tip = r.tip;
      let out = r.out || '', err = r.err || '';
      if (redir.some((x) => x.op === '2>&1')) { out = err + (err && !err.endsWith('\n') ? '\n' : '') + out; err = ''; }
      for (const x of redir) {
        if (x.op === '2>' || x.op === '2>>') { if (x.target !== '/dev/null') this.fs.write(this.resolve(x.target), err, { append: x.op === '2>>' }); err = ''; }
      }
      const outR = redir.filter((x) => x.op === '>' || x.op === '>>').pop();
      if (outR) {
        if (outR.target !== '/dev/null') {
          const p = this.resolve(outR.target);
          if (this.rootOwned(p)) { res.out += `bash: ${outR.target}: Permission denied\n`; res.tip = 'The > is done by your own shell, not by sudo, so sudo does not help here. Use: echo "text" | sudo tee ' + outR.target; this.events[this.events.length - 1].code = 1; return { code: 1 }; }
          if (this.fs.isDir(p)) { res.out += `bash: ${outR.target}: Is a directory\n`; return { code: 1 }; }
          const e = this.fs.write(p, out, { append: outR.op === '>>' });
          if (e) { res.out += `bash: ${outR.target}: No such file or directory\n`; res.tip = 'The folder does not exist. Create it first with mkdir -p.'; return { code: 1 }; }
          this.touched(p);
        }
        out = '';
      }
      if (err) res.out += err.endsWith('\n') ? err : err + '\n';
      if (i === parts.length - 1) res.out += out; else stdin = out;
      last = r;
    }
    return last;
  }

  /** Tab completion: returns the completed line (or the same line) and a list of options. */
  complete(line) {
    const m = line.match(/(\S*)$/), word = m[1], before = line.slice(0, line.length - word.length);
    const first = !before.trim() || /(\||&&|;|sudo)\s*$/.test(before);
    let opts;
    if (first) opts = Object.keys(this.commands).filter((c) => !this.hidden.has(c) && c.startsWith(word));
    else {
      const raw = word.replace(/^~(?=\/|$)/, this.home);
      const dirPart = raw.includes('/') ? raw.slice(0, raw.lastIndexOf('/') + 1) : '';
      const dir = this.resolve(dirPart || '.');
      const base = raw.slice(dirPart.length);
      opts = this.fs.isDir(dir) ? this.fs.list(dir).filter((n) => n.startsWith(base) && (base.startsWith('.') || !n.startsWith('.'))).map((n) => word.slice(0, word.length - base.length) + n + (this.fs.isDir(dir + '/' + n) ? '/' : '')) : [];
    }
    if (!opts.length) return { line, options: [] };
    if (opts.length === 1) return { line: before + opts[0] + (opts[0].endsWith('/') ? '' : ' '), options: [] };
    let pre = opts[0];
    for (const o of opts) while (!o.startsWith(pre)) pre = pre.slice(0, -1);
    return { line: before + pre, options: opts.map((o) => o.replace(/^.*\/(?=.)/, '')) };
  }
}
