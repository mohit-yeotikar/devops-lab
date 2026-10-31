// Docker and Docker Compose for the practice terminal. Labs describe images and compose
// services; hooks on the lab decide health, logs and HTTP answers.
import { ok, fail, table, flags, basename } from './shell.js';

const REGISTRY = {
  'nginx:1.27': { id: '3b25b682ea82', size: '192MB', cmd: '"/docker-entrypoint.…"' },
  'nginx:latest': { id: '3b25b682ea82', size: '192MB', cmd: '"/docker-entrypoint.…"' },
  'postgres:16': { id: 'b781f3a53e61', size: '438MB', cmd: '"docker-entrypoint.s…"' },
  'redis:7': { id: '7fe72c486b91', size: '117MB', cmd: '"docker-entrypoint.s…"' },
  'shopnotes-api:1.0': { id: 'a1f07c2d9e44', size: '151MB', cmd: '"gunicorn -b 0.0.0.…"', local: true },
  'hello-world:latest': { id: 'd2c94e258dcb', size: '13.3kB', cmd: '"/hello"' },
};
const norm = (img) => (img.includes(':') ? img : img + ':latest');
const ago = (t) => { const s = Math.max(1, Math.round((Date.now() - t) / 1000)); return s < 60 ? `${s} seconds` : `${Math.round(s / 60)} minute${Math.round(s / 60) > 1 ? 's' : ''}`; };
const rid = () => Array.from({ length: 12 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

export function dockerState(m) {
  return (m.state.docker ??= { images: [], containers: [] });
}
function status(m, c) {
  const s = m.lab.containerStatus?.(m, c);
  if (s) return s;
  if (c.state === 'running') return `Up ${ago(c.started)}`;
  if (c.state === 'restarting') return 'Restarting (1) 3 seconds ago';
  return `Exited (${c.exitCode ?? 0}) ${ago(c.stopped || Date.now())} ago`;
}
function find(m, ref) {
  return dockerState(m).containers.find((c) => c.name === ref || c.id.startsWith(ref));
}
function project(m) {
  const files = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
  if (!files.some((f) => m.fs.isFile(m.cwd + '/' + f))) return null;
  return { name: basename(m.cwd), dir: m.cwd, services: m.lab.compose?.(m) || {} };
}

function compose(m, args, sudo) {
  const { f, rest, v } = flags(args, ['--tail', '-n']);
  const [action, ...svcs] = rest;
  const p = project(m);
  if (!p) return fail('no configuration file provided: not found', 14, 'Go into the folder that has docker-compose.yml first (use cd), then run the command again.');
  const ds = dockerState(m);
  const all = Object.keys(p.services);
  const pick = svcs.length ? svcs : all;
  for (const s of pick) if (!p.services[s]) return fail(`no such service: ${s}`, 1, `The services in this file are: ${all.join(', ')}`);
  const cname = (s) => `${p.name}-${s}-1`;
  if (!action) return fail('Usage: docker compose [OPTIONS] COMMAND', 1, 'Most used: docker compose up -d, ps, logs, restart, down');
  if (action === 'up') {
    const lines = [`[+] Running ${pick.length + 1}/${pick.length + 1}`, ` ✔ Network ${p.name}_default  Created`];
    for (const s of pick) {
      let c = find(m, cname(s));
      if (!c) { c = { id: rid(), name: cname(s), image: p.services[s].image, project: p.name, service: s, ports: p.services[s].ports || '', created: Date.now() }; ds.containers.push(c); }
      c.state = 'running'; c.started = Date.now();
      m.lab.onComposeStart?.(m, s, c);
      lines.push(` ✔ Container ${c.name}  Started`);
    }
    return ok(lines.join('\n') + '\n' + (f.has('d') ? '' : '(In this sandbox Compose always starts in the background, like with -d.)\n'));
  }
  const mine = ds.containers.filter((c) => c.project === p.name);
  if (action === 'ps') {
    const rows = [['NAME', 'IMAGE', 'SERVICE', 'STATUS', 'PORTS']];
    for (const c of mine.filter((c) => f.has('a') || c.state !== 'exited' || true)) rows.push([c.name, c.image, c.service, status(m, c), c.ports ? `0.0.0.0:${c.ports.split(':')[0]}->${c.ports.split(':')[1]}/tcp` : '']);
    return ok(rows.length > 1 ? table(rows) : 'NAME   IMAGE   SERVICE   STATUS   PORTS\n');
  }
  if (action === 'logs') {
    const n = Number(v.tail ?? v.n) || 0;
    const out = [];
    for (const s of pick) {
      if (!find(m, cname(s))) continue;
      let l = String(m.lab.composeLogs?.(m, s) ?? '').split('\n').filter(Boolean);
      if (n) l = l.slice(-n);
      out.push(...l.map((x) => (svcs.length === 1 ? x : `${cname(s).padEnd(16)}| ${x}`)));
    }
    return ok(out.join('\n') + (out.length ? '\n' : '') + (f.has('f') ? '(logs -f keeps following. In this sandbox it stops here. On a real machine press Ctrl+C.)\n' : ''));
  }
  if (action === 'restart' || action === 'start' || action === 'stop') {
    const out = [];
    for (const s of pick) {
      const c = find(m, cname(s));
      if (!c) return fail(`service "${s}" has no container to ${action}`, 1, 'Start the project first: docker compose up -d');
      if (action === 'stop') { c.state = 'exited'; c.exitCode = 0; c.stopped = Date.now(); out.push(` ✔ Container ${c.name}  Stopped`); continue; }
      c.state = 'running'; c.started = Date.now(); c.restarts = (c.restarts || 0) + 1;
      m.lab.onComposeStart?.(m, s, c, action);
      out.push(` ✔ Container ${c.name}  Started`);
    }
    return ok(`[+] ${action === 'stop' ? 'Stopping' : 'Restarting'} ${out.length}/${out.length}\n` + out.join('\n') + '\n');
  }
  if (action === 'down') {
    ds.containers = ds.containers.filter((c) => c.project !== p.name);
    return ok(`[+] Running ${mine.length + 1}/${mine.length + 1}\n` + mine.map((c) => ` ✔ Container ${c.name}  Removed`).join('\n') + `\n ✔ Network ${p.name}_default  Removed\n`);
  }
  if (action === 'config') return ok(m.fs.get(m.cwd + '/docker-compose.yml')?.content || '');
  return fail(`unknown docker compose command: "${action}"`, 1, 'Use up -d, ps, logs, restart, stop, down.');
}

export function docker({ m, args, sudo }) {
  const [sub, ...rest] = args;
  const ds = dockerState(m);
  if (!sub) return ok('Usage:  docker [OPTIONS] COMMAND\n\nCommon Commands:\n  run      Create and run a new container from an image\n  ps       List containers\n  images   List images\n  logs     Fetch the logs of a container\n  stop     Stop a running container\n  rm       Remove a container\n  compose  Run several containers from docker-compose.yml\n');
  if (sub === 'compose') return compose(m, rest, sudo);
  if (sub === '--version' || sub === 'version') return ok('Docker version 27.3.1, build ce12230\n');
  if (sub === 'images' || (sub === 'image' && rest[0] === 'ls')) {
    const rows = [['REPOSITORY', 'TAG', 'IMAGE ID', 'SIZE']];
    for (const i of ds.images) { const [r, t] = i.split(':'); rows.push([r, t, REGISTRY[i]?.id || '0f1e2d3c4b5a', REGISTRY[i]?.size || '100MB']); }
    return ok(table(rows));
  }
  if (sub === 'pull') {
    const img = norm(rest[0] || '');
    if (!rest[0]) return fail('"docker pull" requires exactly 1 argument.', 1, 'Example: docker pull nginx:1.27');
    if (!REGISTRY[img] || REGISTRY[img].local) return fail(`Error response from daemon: manifest for ${img} not found: manifest unknown`, 1, 'This image name or tag does not exist in the registry. Check the spelling and the tag after the colon.');
    if (!ds.images.includes(img)) ds.images.push(img);
    return ok(`${img.split(':')[1]}: Pulling from library/${img.split(':')[0]}\nDigest: sha256:${REGISTRY[img].id}9f0c…\nStatus: Downloaded newer image for ${img}\n`);
  }
  if (sub === 'ps' || (sub === 'container' && rest[0] === 'ls')) {
    const all = rest.includes('-a') || rest.includes('--all');
    const rows = [['CONTAINER ID', 'IMAGE', 'COMMAND', 'STATUS', 'PORTS', 'NAMES']];
    for (const c of ds.containers) if (all || c.state !== 'exited') rows.push([c.id, c.image, REGISTRY[c.image]?.cmd || '"…"', status(m, c), c.ports ? `0.0.0.0:${c.ports.split(':')[0]}->${c.ports.split(':')[1]}/tcp` : '', c.name]);
    return ok(table(rows));
  }
  if (sub === 'run') {
    const { f, v, rest: pos } = flags(rest, ['--name', '-p', '-e', '-v', '--restart', '--network']);
    const img = norm(pos[0] || '');
    if (!pos[0]) return fail('"docker run" requires at least 1 argument.', 125, 'Example: docker run -d --name web -p 8080:80 nginx:1.27');
    const name = v.name || ['brave_turing', 'jolly_hopper', 'calm_curie'][ds.containers.length % 3];
    if (ds.containers.some((c) => c.name === name)) return fail(`docker: Error response from daemon: Conflict. The container name "/${name}" is already in use by container "${find(m, name).id}".`, 125, `Remove the old one first (docker rm -f ${name}) or choose another --name.`);
    if (v.p) {
      if (!/^\d+:\d+$/.test(v.p)) return fail(`docker: invalid publish spec "${v.p}"`, 125, 'Write it as HOST:CONTAINER, for example -p 8080:80');
      const busy = ds.containers.find((c) => c.state === 'running' && c.ports?.split(':')[0] === v.p.split(':')[0]);
      if (busy) return fail(`docker: Error response from daemon: driver failed programming external connectivity: Bind for 0.0.0.0:${v.p.split(':')[0]} failed: port is already allocated.`, 125, `Another container (${busy.name}) already uses port ${v.p.split(':')[0]} on your machine. Use another host port, like -p 8081:80.`);
    }
    let pre = '';
    if (!ds.images.includes(img)) {
      if (!REGISTRY[img] || REGISTRY[img].local) return fail(`Unable to find image '${img}' locally\ndocker: Error response from daemon: manifest for ${img} not found: manifest unknown.`, 125, 'Check the image name and the tag after the colon.');
      ds.images.push(img);
      pre = `Unable to find image '${img}' locally\n${img.split(':')[1]}: Pulling from library/${img.split(':')[0]}\nStatus: Downloaded newer image for ${img}\n`;
    }
    const c = { id: rid(), name, image: img, state: 'running', started: Date.now(), created: Date.now(), ports: v.p || '', env: v.e };
    if (img === 'hello-world:latest') { c.state = 'exited'; c.exitCode = 0; c.stopped = Date.now(); return ok(pre + '\nHello from Docker!\nThis message shows that your installation appears to be working correctly.\n'); }
    ds.containers.push(c);
    m.lab.onRun?.(m, c);
    return ok(pre + (f.has('d') ? c.id + 'e1b9c0d4f2a7…\n' : `${c.id}e1b9c0d4f2a7…\n(Without -d your terminal would stay attached to the container. This sandbox starts it in the background anyway. Next time add -d.)\n`));
  }
  if (sub === 'logs') {
    const { v, rest: pos } = flags(rest, ['--tail', '-n']);
    const c = find(m, pos[0] || '');
    if (!c) return fail(`Error response from daemon: No such container: ${pos[0] || ''}`, 1, 'Use the name from the NAMES column of docker ps -a.');
    let l = String(m.lab.containerLogs?.(m, c) ?? (c.image.startsWith('nginx') ? '/docker-entrypoint.sh: Configuration complete; ready for start up\n2026/10/31 10:41:07 [notice] 1#1: nginx/1.27.2\n2026/10/31 10:41:07 [notice] 1#1: start worker processes\n' + (c.hits || []).map((h) => `172.17.0.1 - - [31/Oct/2026:10:42:13 +0000] "GET ${h} HTTP/1.1" 200 615 "-" "curl/8.5.0"`).join('\n') : '')).split('\n').filter(Boolean);
    const n = Number(v.tail ?? v.n); if (n) l = l.slice(-n);
    return ok(l.join('\n') + (l.length ? '\n' : ''));
  }
  if (['stop', 'start', 'restart', 'rm', 'kill'].includes(sub)) {
    const { f, rest: pos } = flags(rest);
    if (!pos.length) return fail(`"docker ${sub}" requires at least 1 argument.`, 1, `Example: docker ${sub} web`);
    const out = [];
    for (const ref of pos) {
      const c = find(m, ref);
      if (!c) return fail(`Error response from daemon: No such container: ${ref}`, 1, 'Use the name from the NAMES column of docker ps -a.');
      if (sub === 'rm') {
        if (c.state === 'running' && !f.has('f')) return fail(`Error response from daemon: cannot remove container "/${c.name}": container is running: stop the container before removing or force remove`, 1, `Stop it first (docker stop ${c.name}), or use docker rm -f ${c.name}.`);
        ds.containers = ds.containers.filter((x) => x !== c);
      } else if (sub === 'stop' || sub === 'kill') { c.state = 'exited'; c.exitCode = sub === 'kill' ? 137 : 0; c.stopped = Date.now(); }
      else { c.state = 'running'; c.started = Date.now(); m.lab.onRun?.(m, c); }
      out.push(ref);
    }
    return ok(out.join('\n') + '\n');
  }
  if (sub === 'inspect') {
    const c = find(m, rest.filter((a) => !a.startsWith('-'))[0] || '');
    if (!c) return fail(`Error: No such object: ${rest[0] || ''}`);
    return ok(JSON.stringify([{ Id: c.id, Name: '/' + c.name, Image: c.image, State: { Status: c.state, Running: c.state === 'running', ExitCode: c.exitCode ?? 0, OOMKilled: !!c.oom }, HostConfig: { PortBindings: c.ports ? { [c.ports.split(':')[1] + '/tcp']: [{ HostPort: c.ports.split(':')[0] }] } : {} } }], null, 2) + '\n');
  }
  if (sub === 'exec') return fail('docker exec is not available in this sandbox.', 1, 'On a real machine, docker exec -it NAME sh opens a shell inside the container.');
  return fail(`docker: '${sub}' is not a docker command.`, 1, 'Type docker to see the common commands.');
}
