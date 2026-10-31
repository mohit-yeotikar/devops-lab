// One plain-English sentence for every command the practice terminal knows.
// explain(name, args, sudo) is shown under "What you just did" after each command.

const has = (args, ...fl) => args.some((a) => fl.some((f) => a === f || (f.length === 2 && /^-[a-zA-Z]+$/.test(a) && a.includes(f[1]))));
const first = (args) => args.find((a) => !a.startsWith('-'));

const E = {
  help: () => 'shows the commands you can use in this lab.',
  man: (a) => `shows the manual (help page) for ${first(a) || 'a command'}.`,
  pwd: () => 'prints the folder you are in now (pwd = print working directory).',
  whoami: () => 'prints your user name.',
  hostname: () => 'prints the name of this machine.',
  date: () => 'prints the date and time of the server.',
  uname: () => 'prints the Linux kernel and machine type.',
  uptime: () => 'shows how long the server has been running and how busy it is (load average).',
  clear: () => 'cleans the screen. Your files do not change. Shortcut: Ctrl+L.',
  history: () => 'lists the commands you typed before. Press the Up arrow to repeat one.',
  echo: (a) => (a.length ? 'prints the text you wrote. With > it writes the text into a file.' : 'prints an empty line.'),
  cd: (a) => (!a[0] || a[0] === '~' ? 'goes to your home folder.' : a[0] === '..' ? 'goes one folder up (to the parent folder).' : a[0] === '-' ? 'goes back to the folder you were in before.' : `goes into the folder ${a[0]} (cd = change directory).`),
  ls: (a) => {
    const parts = ['lists the files and folders'];
    if (has(a, '-l')) parts.push('with details: permissions, owner, size and date');
    if (has(a, '-a')) parts.push('including hidden files (names that start with a dot)');
    if (has(a, '-h')) parts.push('with sizes easy to read (K, M, G)');
    return parts.join(', ') + (first(a) ? ` in ${first(a)}.` : ' in this folder.');
  },
  mkdir: (a) => (has(a, '-p') ? `creates the folder ${first(a) || ''}, and every missing parent folder on the way (-p).` : `creates a new folder called ${first(a) || '...'}.`),
  touch: (a) => `creates an empty file ${first(a) || ''} (or updates its date if it exists).`,
  cat: (a) => (first(a) ? `prints everything inside ${a.filter((x) => !x.startsWith('-')).join(' and ')}.` : 'prints the text that comes in from the pipe.'),
  head: (a) => `shows the first ${a.find((x) => /^\d+$/.test(x)) || (a.find((x) => /^-\d+$/.test(x)) || '-10').slice(1)} lines${first(a) && !/^\d+$/.test(first(a)) ? ' of ' + a.filter((x) => !x.startsWith('-') && !/^\d+$/.test(x)).pop() : ''}.`,
  tail: (a) => `shows the last ${a.find((x) => /^\d+$/.test(x)) || (a.find((x) => /^-\d+$/.test(x)) || '-10').slice(1)} lines${a.filter((x) => !x.startsWith('-') && !/^\d+$/.test(x)).length ? ' of ' + a.filter((x) => !x.startsWith('-') && !/^\d+$/.test(x)).pop() : ''}. New log lines are at the end, so engineers read logs with tail.${has(a, '-f') ? ' -f keeps following new lines (Ctrl+C stops it).' : ''}`,
  grep: (a) => {
    const pat = a.filter((x) => !x.startsWith('-'))[0];
    const extra = [];
    if (has(a, '-i')) extra.push('big and small letters are the same (-i)');
    if (has(a, '-c')) extra.push('only the number of matching lines is printed (-c)');
    if (has(a, '-n')) extra.push('line numbers are shown (-n)');
    if (has(a, '-v')) extra.push('it shows the lines that do NOT match (-v)');
    if (has(a, '-r')) extra.push('it searches every file in the folder (-r)');
    return `keeps only the lines that contain "${pat ?? '...'}"${extra.length ? '; ' + extra.join('; ') : ''}.`;
  },
  wc: (a) => (has(a, '-l') ? 'counts lines (wc = word count, -l = lines).' : 'counts lines, words and characters.'),
  sort: (a) => `puts the lines in order${has(a, '-n') ? ' by number' : ''}${has(a, '-r') ? ', biggest first' : ''}.`,
  uniq: (a) => (has(a, '-c') ? 'joins lines that are the same and counts them. Use sort before uniq.' : 'removes repeated lines that are next to each other.'),
  cut: () => 'cuts out one column from each line.',
  awk: () => 'prints chosen columns from each line ($1 is the first column).',
  tee: (a) => `writes the text into ${first(a) || 'a file'} and also prints it. With sudo it can write into root files.`,
  rm: (a) => (has(a, '-r') ? `deletes the folder ${first(a) || ''} and everything inside. There is no recycle bin.` : `deletes the file ${first(a) || ''}. There is no recycle bin.`),
  cp: (a) => `copies ${a.filter((x) => !x.startsWith('-'))[0] || 'a file'} to ${a.filter((x) => !x.startsWith('-'))[1] || '...'}${has(a, '-r') ? ' (with everything inside, -r)' : ''}.`,
  mv: (a) => `moves or renames ${a.filter((x) => !x.startsWith('-'))[0] || 'a file'} to ${a.filter((x) => !x.startsWith('-'))[1] || '...'}.`,
  chmod: (a) => (a[0] === '+x' ? `makes ${a[1] || 'the file'} executable, so you can run it with ./${a[1] || 'file'}.` : `changes who can read, write or run ${a[1] || 'the file'}.`),
  sed: (a) => (has(a, '-i') ? `finds and replaces text inside ${a[a.length - 1]} and saves the file (-i = in place).` : 'finds and replaces text and prints the result. The file does not change without -i.'),
  truncate: (a) => `makes ${a[a.length - 1]} empty (size 0). The program that writes it can keep writing.`,
  du: (a) => `shows how much disk space ${a.filter((x) => !x.startsWith('-')).join(', ') || 'this folder'} uses${has(a, '-s') ? ' (one total each, -s)' : ''}.`,
  df: () => 'shows how full each disk is. Look at the Use% column.',
  free: () => 'shows how much memory (RAM) is used and free.',
  find: (a) => `searches for files${a.includes('-name') ? ` named ${a[a.indexOf('-name') + 1]}` : ''}${a.includes('-size') ? ` bigger than ${a[a.indexOf('-size') + 1].slice(1)}` : ''} in ${first(a) || 'this folder'} and all folders inside.`,
  which: (a) => `shows where the program ${a[0] || ''} is installed.`,
  ps: () => 'lists the programs (processes) that are running now.',
  ss: () => 'lists the ports that programs are listening on. Use it to see which program uses which port.',
  systemctl: (a) => {
    const [act, svc] = a.filter((x) => !x.startsWith('-'));
    const s = svc ? svc.replace('.service', '') : 'the service';
    return ({
      status: `shows if ${s} is running, and its last log lines.`,
      start: `starts ${s}.`,
      stop: `stops ${s}.`,
      restart: `stops and starts ${s} again, so it reads its config files again.`,
      reload: `tells ${s} to read its config again without stopping.`,
      enable: `makes ${s} start by itself when the server boots${a.includes('--now') ? ', and starts it now (--now)' : ''}.`,
      disable: `stops ${s} from starting at boot.`,
      'is-active': `answers if ${s} is running (active) or not.`,
      'list-units': 'lists all services.',
      'daemon-reload': 'reads changed service files again.',
    })[act] || 'controls services (programs that run in the background).';
  },
  journalctl: (a) => `shows the log messages${a.includes('-u') ? ' of the ' + a[a.indexOf('-u') + 1] + ' service' : ' of the system'}.`,
  curl: (a) => {
    const url = a.find((x) => /^(https?:\/\/|localhost)/.test(x)) || 'a URL';
    return `sends a web request to ${url} and prints the answer${has(a, '-i') ? ' with the HTTP status line and headers (-i)' : ''}${has(a, '-I') ? '; headers only (-I)' : ''}. Status 200 means OK; 5xx means a server problem.`;
  },
  nano: (a) => `opens ${first(a) || 'a file'} in a text editor. Save with Ctrl+S, close with Ctrl+X.`,
  vim: (a) => `opens ${first(a) || 'a file'} in an editor. (In this sandbox it works like nano: Ctrl+S saves, Ctrl+X closes.)`,
  vi: (a) => E.vim(a),
  edit: (a) => E.nano(a),
  apt: (a) => `installs or updates software packages (${a.slice(1).join(' ') || a[0] || ''}).`,
  'apt-get': (a) => E.apt(a),
  exit: () => 'closes the terminal session.',
  ssh: () => 'connects to another server.',
  sudo: () => 'runs the next command as the admin user (root).',
  true: () => 'does nothing and succeeds.',
  false: () => 'does nothing and fails.',
  ll: () => 'is a short name for ls -la.',
  git: (a) => {
    const sub = a[0];
    const m = {
      init: 'creates a new, empty Git repository in this folder (a hidden .git folder).',
      status: 'shows which files are new, changed, or ready to commit.',
      add: `puts ${a.slice(1).join(' ') === '.' ? 'all changes in this folder' : a.slice(1).join(' ') || 'files'} into the "ready to commit" list (the staging area).`,
      commit: 'saves the staged changes as one snapshot with your message.',
      log: `lists the commits, newest first${a.includes('--oneline') ? ', one line each' : ''}.`,
      branch: a[1] && !a[1].startsWith('-') ? `creates a new branch called ${a[1]}.` : 'lists the branches. The * marks the one you are on.',
      checkout: a.includes('-b') ? `creates the branch ${a[a.indexOf('-b') + 1]} and moves to it.` : `moves to the branch ${a[1] || ''}.`,
      switch: a.includes('-c') ? `creates the branch ${a[a.indexOf('-c') + 1]} and moves to it.` : `moves to the branch ${a[1] || ''}.`,
      diff: 'shows the lines you changed but did not stage yet. - is removed, + is added.',
      config: `saves a Git setting (${a.filter((x) => !x.startsWith('-'))[1] || ''}).`,
      push: 'sends your commits to GitHub (the remote).',
      restore: 'undoes changes in a file.',
    };
    return m[sub] || 'runs Git, the version control tool.';
  },
  docker: (a) => {
    const [sub, sub2] = a;
    if (sub === 'compose') {
      return ({
        up: `starts all services in docker-compose.yml${a.includes('-d') ? ' in the background (-d)' : ''}.`,
        ps: 'lists the containers of this Compose project and their state.',
        logs: `shows the logs of ${a.filter((x) => !x.startsWith('-') && !/^\d+$/.test(x))[2] || 'all services'}.`,
        restart: `restarts ${a[2] || 'all services'}. A container reads its config files again when it starts.`,
        down: 'stops and removes the containers of this project.',
        stop: 'stops the containers but keeps them.',
        config: 'checks the compose file and prints the final version.',
      })[sub2] || 'manages several containers together with one file (docker-compose.yml).';
    }
    return ({
      ps: a.includes('-a') ? 'lists all containers, also the stopped ones (-a).' : 'lists the running containers.',
      images: 'lists the images on this machine. An image is the template, a container is a running copy.',
      run: `creates and starts a new container from the image ${a.filter((x) => !x.startsWith('-')).pop() || ''}.${a.includes('-d') ? ' -d runs it in the background.' : ''}${a.includes('-p') ? ' -p HOST:CONTAINER connects a port on your machine to a port in the container.' : ''}`,
      logs: `shows what the container ${a.filter((x) => !x.startsWith('-') && !/^\d+$/.test(x))[1] || ''} printed.`,
      stop: `stops the container ${a[1] || ''}.`,
      start: `starts the stopped container ${a[1] || ''} again.`,
      restart: `stops and starts the container ${a[1] || ''}.`,
      rm: `deletes the stopped container ${a[1] || ''}.`,
      pull: `downloads the image ${a[1] || ''}.`,
      inspect: `prints all details of ${a.filter((x) => !x.startsWith('-')).pop() || 'a container'} as JSON.`,
      exec: 'runs a command inside a running container.',
    })[sub] || 'runs Docker, the container tool.';
  },
  kubectl: (a) => {
    const [sub, what] = a;
    return ({
      get: `lists the ${what || 'resources'} in the cluster and their state.`,
      describe: `shows the full details and the recent events of ${a.slice(1).join(' ')}. Read the Events part at the bottom.`,
      logs: `shows what the container in ${a[1] || 'the pod'} printed${a.includes('--previous') ? ' before its last crash (--previous)' : ''}.`,
      set: `changes a setting of ${a[2] || 'a deployment'}. Kubernetes then replaces the pods.`,
      rollout: a[1] === 'status' ? 'waits until the new pods are ready.' : a[1] === 'restart' ? 'replaces all pods one by one.' : 'manages a deployment rollout.',
      apply: 'creates or updates resources from a YAML file.',
      delete: `deletes ${a.slice(1).join(' ')}.`,
    })[sub] || 'talks to the Kubernetes cluster.';
  },
};

E.bash = (a) => `runs the script ${a[0] || ''}: the commands inside it run one by one.`;
E.sh = E.bash;

export function explain(name, args = [], sudo = false) {
  if (name && name.includes('/')) return `It runs the script ${name}: the commands inside it run one by one. ./ means "in this folder".`;
  const fn = E[name];
  const text = fn ? fn(args) : 'is not a command this lab knows.';
  return (sudo ? 'With sudo (as admin), it ' : 'It ') + text.replace(/^./, (c) => c.toLowerCase());
}
export function summary(name) {
  const fn = E[name];
  return fn ? fn([]).replace(/^./, (c) => c.toUpperCase()) : '';
}
