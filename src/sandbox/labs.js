// The practice labs. Each lab sets up a small fake server, lists tasks that are checked
// automatically after every command, gives a hint and the exact command for each task,
// and ends with a short quiz. `solution` is used by the tests to prove every lab can be finished.
import { git } from './git.js';
import { docker, dockerState } from './docker.js';
import { ok, fail, table, flags } from './shell.js';

const H = '/home/trainee';
const G = 2 ** 30;

/* ---------- 1. Files and folders ---------- */
const linuxFiles = {
  id: 'linux-files', title: 'Files and folders', topic: 'Linux', minutes: 15, sprints: ['s01'],
  summary: 'Move around, create folders and files, and write text into files.',
  intro: [
    'You are logged in to a Linux server. You type a command and press Enter. The server answers below it.',
    'Your home folder is /home/trainee. The terminal shows it as ~ (tilde).',
    'Do the tasks in the task list from top to bottom. Each one gets a green tick as soon as you do it. Stuck? Press Hint, then Show the command.',
  ],
  setup(m) { m.file('~/welcome.txt', 'Welcome to the ShopNotes team!\nYour first job: create the project folders for the app.\n'); },
  tasks: [
    { text: 'Print the folder you are in now.', why: 'Before you create or delete anything, always know where you are.', hint: 'The command is three letters: print working directory.', cmd: 'pwd', check: (m) => m.ran(/^pwd$/) },
    { text: 'Read the file welcome.txt.', why: 'cat prints a whole file. Use it for small files.', hint: 'Use cat and the file name.', cmd: 'cat welcome.txt', check: (m) => m.ran(/^cat .*welcome\.txt/) },
    { text: 'Create the folders shopnotes/api, shopnotes/web and shopnotes/db with one command.', why: 'With -p, mkdir also creates the missing parent folder (shopnotes).', hint: 'Use mkdir -p and write the three paths with spaces between them.', cmd: 'mkdir -p shopnotes/api shopnotes/web shopnotes/db', check: (m) => ['api', 'web', 'db'].every((d) => m.fs.isDir(`${H}/shopnotes/${d}`)) },
    { text: 'Go into the shopnotes folder.', why: 'cd changes the folder you work in. Look at the prompt: it changes too.', hint: 'cd and the folder name.', cmd: 'cd shopnotes', check: (m) => m.ran(/^cd\b.*shopnotes\/?$/) },
    { text: 'Create the file api/app.py with the text: print("ShopNotes API")', why: 'echo prints text. > sends it into a file and replaces what was there.', hint: "Put the text in single quotes, because it has double quotes inside.", cmd: `echo 'print("ShopNotes API")' > api/app.py`, check: (m) => /print\("ShopNotes API"\)/.test(m.read(`${H}/shopnotes/api/app.py`) || '') },
    { text: 'Add a second line to api/app.py: # health check comes next. The first line must stay.', why: '>> adds at the end of the file. One > would delete the first line.', hint: 'Same as before, but with >> instead of >.', cmd: "echo '# health check comes next' >> api/app.py", check: (m) => { const t = m.read(`${H}/shopnotes/api/app.py`) || ''; return /print\("ShopNotes API"\)/.test(t) && /# health check comes next/.test(t); } },
    { text: 'List the files with details (size, date, permissions).', why: 'ls -l shows one file per line. The first column shows if it is a folder (d) or a file (-).', hint: 'ls with the -l option. Try also ls -la to see hidden files.', cmd: 'ls -l', check: (m) => m.ran(/^ls\b.*-\w*l/) },
  ],
  solution: ['pwd', 'cat welcome.txt', 'mkdir -p shopnotes/api shopnotes/web shopnotes/db', 'cd shopnotes', `echo 'print("ShopNotes API")' > api/app.py`, "echo '# health check comes next' >> api/app.py", 'ls -l'],
  quiz: [
    { q: 'What is the difference between > and >> ?', options: ['> adds at the end, >> replaces the file', '> replaces the whole file, >> adds at the end', 'There is no difference', '>> deletes the file'], answer: 1, why: 'One arrow replaces everything in the file. Two arrows add to the end. Many beginners lose a config file with a single >.' },
    { q: 'You type mkdir shopnotes/api and see "No such file or directory". Why?', options: ['api already exists', 'The folder shopnotes does not exist yet. Add -p.', 'You need sudo', 'mkdir cannot work in the home folder'], answer: 1, why: 'Without -p, mkdir only creates the last folder. The parent must exist already.' },
    { q: 'What does ~ mean in the prompt?', options: ['The root folder /', 'Your home folder, /home/trainee', 'The last folder you used', 'A hidden folder'], answer: 1, why: '~ is a short way to write your home folder.' },
  ],
};

/* ---------- 2. Read logs ---------- */
function appLog() {
  const out = [];
  const ok200 = ['GET /notes 200 12ms', 'GET /health 200 3ms', 'POST /notes 201 18ms', 'GET /notes 200 9ms', 'GET /static/app.js 200 1ms'];
  let t = 9 * 3600;
  const ts = () => { t += 7 + (out.length * 13) % 29; const h = Math.floor(t / 3600), mi = Math.floor((t % 3600) / 60), s = t % 60; return `2026-10-31 ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
  for (let i = 0; i < 180; i++) {
    if (i % 23 === 7) out.push(`${ts()} ERROR POST /notes 500 psycopg2.OperationalError: connection to server at "db" (172.18.0.2), port 5432 failed: timeout expired`);
    else if (i % 41 === 12) out.push(`${ts()} ERROR GET /notes/42 500 KeyError: 'text'`);
    else if (i % 31 === 5) out.push(`${ts()} WARN  GET /notes 200 1840ms slow request`);
    else out.push(`${ts()} INFO  ${ok200[i % ok200.length]}`);
  }
  return out.join('\n') + '\n';
}
const LOG = '/var/log/shopnotes/app.log';
const errCount = (m) => (m.read(LOG) || '').split('\n').filter((l) => / ERROR /.test(l)).length;
const linuxLogs = {
  id: 'linux-logs', title: 'Read logs like an engineer', topic: 'Linux', minutes: 20, sprints: ['s01'],
  summary: 'Use tail, grep, wc, sort and uniq to find what is going wrong in a log file.',
  intro: [
    'Users say "sometimes saving a note fails". The app writes a log file: /var/log/shopnotes/app.log.',
    'A log file is a text file. Every line is one event: date, time, level (INFO, WARN, ERROR), request, status code.',
    'The | sign (pipe) sends the output of one command into the next command. Engineers chain small commands like this.',
  ],
  setup(m) { m.file(LOG, appLog()); },
  tasks: [
    { text: 'Show the last 20 lines of /var/log/shopnotes/app.log.', why: 'The newest lines are at the end, so you start with tail. Never cat a big log: it fills your screen.', hint: 'tail with -n 20 and the full path. Press Tab to complete the path.', cmd: `tail -n 20 ${LOG}`, check: (m) => m.ran(/^tail\b(?=.*(-n ?20\b|-20\b))(?=.*app\.log)/) },
    { text: 'Show only the lines with ERROR.', why: 'grep keeps only the lines that contain your word. It is the most used command when you read logs.', hint: 'grep, then the word, then the file.', cmd: `grep ERROR ${LOG}`, check: (m) => m.ran(/^grep\b(?!.*-\w*c)(?=.*ERROR)/) },
    { text: 'Count how many ERROR lines there are.', why: 'A number is easier to report than a long list: "17 errors since 9:00".', hint: 'grep has an option that counts: -c. Or send grep into wc -l with a pipe.', cmd: `grep -c ERROR ${LOG}`, check: (m) => m.ran(/^grep\b(?=.*-\w*c)(?=.*ERROR)/) || (m.ran(/^grep\b.*ERROR/) && m.ran(/^wc\b.*-l/)) },
    { text: 'Find which URL path fails most: count the ERROR lines per path.', why: 'awk picks a column (column 5 is the path). sort puts same lines together. uniq -c counts them.', hint: "Chain four commands with |: grep ERROR file | awk '{print $5}' | sort | uniq -c", cmd: `grep ERROR ${LOG} | awk '{print $5}' | sort | uniq -c`, check: (m) => m.ran(/^uniq\b.*-c/) },
    { text: 'Write the path that fails most into the file ~/answer.txt', why: 'In a real incident you write down what you found. Short and exact.', hint: 'Use echo and > . The answer looks like /something.', cmd: 'echo /notes > ~/answer.txt', check: (m) => /^(POST )?\/notes$/.test((m.read(`${H}/answer.txt`) || '').trim()) },
  ],
  solution: [`tail -n 20 ${LOG}`, `grep ERROR ${LOG}`, `grep -c ERROR ${LOG}`, `grep ERROR ${LOG} | awk '{print $5}' | sort | uniq -c | sort -rn`, 'echo /notes > ~/answer.txt'],
  quiz: [
    { q: 'Why do engineers use tail and not cat for logs?', options: ['tail is faster to type', 'The newest lines are at the end, and big logs would fill the screen', 'cat cannot read logs', 'tail fixes the errors'], answer: 1, why: 'Logs grow at the bottom. tail shows the newest part only.' },
    { q: 'Why must you use sort before uniq -c?', options: ['uniq only joins lines that are next to each other', 'sort makes it faster', 'uniq needs numbers', 'You do not need it'], answer: 0, why: 'uniq only compares a line with the line before it. sort puts the same lines together first.' },
    { q: 'What does grep -c ERROR app.log print?', options: ['All error lines', 'The number of lines that contain ERROR', 'The first error', 'Nothing'], answer: 1, why: '-c means count.' },
  ],
};

/* ---------- 3. Permissions and services ---------- */
const linuxServices = {
  id: 'linux-services', title: 'Scripts, permissions and services', topic: 'Linux', minutes: 20, sprints: ['s01'],
  summary: 'Make a script runnable, start a systemd service, check it with curl and ss.',
  intro: [
    'ShopNotes runs as a systemd service called shopnotes. systemd starts programs in the background and restarts them when the server boots.',
    'Some commands need admin rights. Then you put sudo in front of the command. In this lab sudo does not ask for a password.',
    'Read every error message slowly. The error usually tells you exactly what is wrong.',
  ],
  setup(m) {
    m.file('~/shopnotes/deploy.sh', "#!/bin/bash\n# Deploy script for ShopNotes\necho 'Deploy OK: ShopNotes 1.0 is installed.'\n", { mode: 0o644 });
    m.file('~/shopnotes/api/app.py', 'from flask import Flask, jsonify\napp = Flask(__name__)\n\n@app.get("/health")\ndef health():\n    return jsonify(status="ok", db="ok")\n');
    m.file('/etc/systemd/system/shopnotes.service', '[Unit]\nDescription=ShopNotes API (gunicorn)\nAfter=network.target postgresql.service\n\n[Service]\nUser=trainee\nWorkingDirectory=/home/trainee/shopnotes/api\nExecStart=/home/trainee/shopnotes/.venv/bin/gunicorn -b 127.0.0.1:5000 app:app\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n');
    m.cwd = `${H}/shopnotes`;
    m.state.services = {
      shopnotes: { active: false, enabled: false, description: 'ShopNotes API (gunicorn)', exec: 'gunicorn -b 127.0.0.1:5000 app:app', user: 'trainee', pid: 2210, logs: ['Oct 31 09:00:01 shopnotes-dev systemd[1]: shopnotes.service: Deactivated successfully.'] },
      nginx: { active: true, enabled: true, description: 'A high performance web server and a reverse proxy server', exec: 'nginx: master process /usr/sbin/nginx', pid: 811 },
      postgresql: { active: true, enabled: true, description: 'PostgreSQL RDBMS', exec: 'postgres -D /var/lib/postgresql/16/main', user: 'postgres', pid: 702 },
    };
  },
  onService(m, name, action) {
    const s = m.state.services[name];
    if (name === 'shopnotes' && ['start', 'restart', 'enable'].includes(action)) s.logs.push(`Oct 31 10:42:07 shopnotes-dev systemd[1]: Started shopnotes.service - ShopNotes API (gunicorn).`, `Oct 31 10:42:07 shopnotes-dev gunicorn[2210]: [INFO] Listening at: http://127.0.0.1:5000 (2210)`);
  },
  ports(m) {
    const s = m.state.services, out = [];
    if (s.nginx.active) out.push({ port: 80, proc: 'nginx' });
    if (s.postgresql.active) out.push({ port: 5432, addr: '127.0.0.1', proc: 'postgres' });
    if (s.shopnotes.active) out.push({ port: 5000, addr: '127.0.0.1', proc: 'gunicorn' });
    return out;
  },
  http(m, url) {
    const up = m.state.services.shopnotes.active;
    if (/:5000\/health/.test(url)) return up ? { status: 200, body: '{"db":"ok","status":"ok"}', server: 'gunicorn' } : null;
    if (/:5000/.test(url)) return up ? { status: 404, body: '<h1>Not Found</h1>', server: 'gunicorn', type: 'text/html' } : null;
    if (/localhost(\/|$)|127\.0\.0\.1(\/|$)/.test(url)) return up ? { status: 200, body: '{"db":"ok","status":"ok"}' } : { status: 502, body: '<html><head><title>502 Bad Gateway</title></head><body><center><h1>502 Bad Gateway</h1></center></body></html>', type: 'text/html' };
    return null;
  },
  tasks: [
    { text: 'Try to run the script: ./deploy.sh', why: './ means "the file in this folder". You will see an error. That is expected.', hint: 'Type exactly ./deploy.sh', cmd: './deploy.sh', check: (m) => m.ranAny(/^(\.\/|.*\/)deploy\.sh$/) },
    { text: 'Make deploy.sh executable.', why: 'A file can only run if it has the x (execute) permission. ls -l shows it as rwx.', hint: 'chmod +x and the file name.', cmd: 'chmod +x deploy.sh', check: (m) => !!(m.fs.get(`${H}/shopnotes/deploy.sh`).mode & 0o100) },
    { text: 'Run ./deploy.sh again. It must print "Deploy OK".', why: 'Now it works. Check with ls -l: the x is there.', hint: 'Press the Up arrow two times to get the command back.', cmd: './deploy.sh', check: (m) => m.ran(/deploy\.sh$/) },
    { text: 'Check the status of the shopnotes service.', why: 'status shows if it runs (active) or not (inactive), and the last log lines.', hint: 'systemctl status and the service name.', cmd: 'systemctl status shopnotes', check: (m) => m.ran(/^systemctl status shopnotes/) || m.ranAny(/^systemctl status shopnotes/) },
    { text: 'Start the service and make it start by itself after a reboot. Use one command.', why: 'enable = start at boot. --now = also start it now. Starting services needs sudo.', hint: 'sudo systemctl enable --now shopnotes', cmd: 'sudo systemctl enable --now shopnotes', check: (m) => m.state.services.shopnotes.active && m.state.services.shopnotes.enabled },
    { text: 'Call the health URL of the app: http://localhost:5000/health', why: 'curl sends a web request from the terminal. This is how you test an API on a server without a browser.', hint: 'curl and the URL.', cmd: 'curl http://localhost:5000/health', check: (m) => m.lastHttp?.status === 200 && /5000\/health/.test(m.lastHttp.url) },
    { text: 'Show which program listens on port 5000.', why: 'ss -tlnp lists open ports and the program behind each one. Very useful when something "does not answer".', hint: 'ss -tlnp', cmd: 'ss -tlnp', check: (m) => m.ran(/^ss\b/) && m.state.services.shopnotes.active },
  ],
  solution: ['./deploy.sh', 'chmod +x deploy.sh', './deploy.sh', 'systemctl status shopnotes', 'sudo systemctl enable --now shopnotes', 'curl http://localhost:5000/health', 'ss -tlnp'],
  quiz: [
    { q: 'You run ./backup.sh and get "Permission denied". What do you do?', options: ['Delete the file', 'chmod +x backup.sh', 'Restart the server', 'Use cat backup.sh'], answer: 1, why: 'The file needs the execute permission.' },
    { q: 'systemctl start nginx says "Access denied". Why?', options: ['nginx is broken', 'Starting services needs admin rights: use sudo', 'The name is wrong', 'The port is busy'], answer: 1, why: 'Normal users cannot start or stop services.' },
    { q: 'What does systemctl enable do?', options: ['Starts the service now only', 'Makes the service start by itself when the server boots', 'Deletes the service', 'Shows the logs'], answer: 1, why: 'enable is about boot. Add --now to also start it now.' },
  ],
};

/* ---------- 4. Git ---------- */
const gitBasics = {
  id: 'git-basics', title: 'Git: repository, commits and branches', topic: 'Git', minutes: 25, sprints: ['s01'],
  summary: 'Create a repository, ignore secrets, commit, branch and read the history.',
  intro: [
    'Git saves snapshots of your project. One snapshot is a commit.',
    'Changes go in two steps: git add puts them on the "ready" list (the staging area), git commit saves them.',
    'Run git status often. It always tells you where you are and what to do next.',
  ],
  commands: { git },
  setup(m) {
    m.file('~/shopnotes/api/app.py', 'from flask import Flask, jsonify\napp = Flask(__name__)\n');
    m.file('~/shopnotes/api/requirements.txt', 'flask>=3.1,<4\npsycopg2-binary>=2.9,<3\ngunicorn>=23,<24\n');
    m.file('~/shopnotes/web/index.html', '<!doctype html>\n<title>ShopNotes</title>\n<h1>ShopNotes</h1>\n');
    m.file('~/shopnotes/.env', 'DATABASE_URL=postgresql://shopnotes:SECRET-PASSWORD@localhost:5432/shopnotes\n');
    m.file('~/shopnotes/.venv/bin/python', '(python binary)\n');
    m.cwd = `${H}/shopnotes`;
  },
  tasks: [
    { text: 'Create a Git repository in ~/shopnotes with the branch name main.', why: 'git init creates the hidden .git folder. -b main sets the branch name most teams use.', hint: 'git init -b main', cmd: 'git init -b main', check: (m) => !!m.state.git?.repos[`${H}/shopnotes`] },
    { text: 'Create a .gitignore file so Git skips the folder .venv/ and the file .env', why: '.venv is big and can be rebuilt. .env has passwords. Secrets must never go to GitHub.', hint: "Two lines: echo '.venv/' > .gitignore then echo '.env' >> .gitignore", cmd: "echo '.venv/' > .gitignore && echo '.env' >> .gitignore", check: (m) => { const g = m.read(`${H}/shopnotes/.gitignore`) || ''; return /\.venv/.test(g) && /^\.env$/m.test(g); } },
    { text: 'Tell Git your name and email (once per computer).', why: 'Every commit shows who made it. Git refuses to commit without a name and email.', hint: 'git config --global user.name "Your Name", then the same with user.email', cmd: 'git config --global user.name "Your Name" && git config --global user.email "you@example.com"', check: (m) => !!(m.state.git?.config['user.name'] && m.state.git?.config['user.email']) },
    { text: 'Stage all files and make the first commit. Check first with git status that .env is not in the list.', why: 'git add . stages everything in this folder. The commit message says what you did, in a few words.', hint: 'git add . then git commit -m "Add ShopNotes app"', cmd: 'git add . && git commit -m "Add ShopNotes app"', check: (m) => { const r = m.state.git?.repos[`${H}/shopnotes`]; const c = r && Object.values(r.commits)[0]; return !!c && 'api/app.py' in c.tree && '.gitignore' in c.tree && !('.env' in c.tree); } },
    { text: 'Create a new branch called feature/health and switch to it.', why: 'You never work directly on main. A branch keeps your work separate until it is reviewed.', hint: 'git switch -c feature/health', cmd: 'git switch -c feature/health', check: (m) => m.state.git?.repos[`${H}/shopnotes`]?.branch === 'feature/health' },
    { text: 'Add the line @app.get("/health") to api/app.py and commit it on the new branch.', why: 'Small commits with clear messages make code review easy.', hint: "echo '@app.get(\"/health\")' >> api/app.py, then git add and git commit -m", cmd: `echo '@app.get("/health")' >> api/app.py && git add api/app.py && git commit -m "Add health route"`, check: (m) => { const r = m.state.git?.repos[`${H}/shopnotes`]; const id = r?.branches['feature/health']; return !!id && r.commits[id].parent && /health/.test(r.commits[id].tree['api/app.py'] || ''); } },
    { text: 'Show the history, one line per commit.', why: 'git log --oneline shows the commit id and message. You will paste this as proof in many tickets.', hint: 'git log --oneline', cmd: 'git log --oneline', check: (m) => m.ran(/^git log\b.*--oneline/) && Object.keys(m.state.git?.repos[`${H}/shopnotes`]?.commits || {}).length >= 2 },
  ],
  solution: ['git init -b main', "echo '.venv/' > .gitignore", "echo '.env' >> .gitignore", 'git status', 'git config --global user.name "Trainee"', 'git config --global user.email "trainee@example.com"', 'git add .', 'git commit -m "Add ShopNotes app"', 'git switch -c feature/health', `echo '@app.get("/health")' >> api/app.py`, 'git add api/app.py', 'git commit -m "Add health route"', 'git log --oneline'],
  quiz: [
    { q: 'What does git add do?', options: ['Sends files to GitHub', 'Puts changes on the "ready to commit" list (staging area)', 'Creates a new branch', 'Deletes files'], answer: 1, why: 'add stages; commit saves; push sends to GitHub.' },
    { q: 'Why is .env in .gitignore?', options: ['It is too big', 'It contains passwords and secrets', 'Git cannot read it', 'It is a folder'], answer: 1, why: 'Anything pushed to GitHub can be seen and copied. Secrets stay out of Git.' },
    { q: 'What does git switch -c feature/x do?', options: ['Deletes the branch feature/x', 'Creates the branch feature/x and moves to it', 'Commits to feature/x', 'Lists branches'], answer: 1, why: '-c means create.' },
  ],
};

/* ---------- 5. Docker basics ---------- */
const dockerBasics = {
  id: 'docker-basics', title: 'Docker: your first container', topic: 'Docker', minutes: 20, sprints: ['s02'],
  summary: 'Run, check, read logs, stop and delete a container.',
  intro: [
    'An image is a ready package of a program (like a template). A container is one running copy of an image.',
    'With -p 8080:80, port 8080 on your machine goes to port 80 inside the container. Left side = your machine, right side = container.',
    'Container names are your handle: you use them in logs, stop and rm.',
  ],
  commands: { docker },
  setup(m) { dockerState(m).images.push('hello-world:latest'); },
  onRun(m, c) { if (c.name === 'web' && c.image === 'nginx:1.27' && c.ports === '8080:80') m.state.ranWeb = true; },
  http(m, url) {
    const mm = url.match(/^https?:\/\/(localhost|127\.0\.0\.1)(?::(\d+))?(\/[^\s]*)?/);
    if (!mm) return null;
    const port = mm[2] || '80';
    const c = dockerState(m).containers.find((x) => x.state === 'running' && x.ports?.split(':')[0] === port);
    if (!c) return null;
    (c.hits ??= []).push(mm[3] || '/');
    return { status: 200, type: 'text/html', body: '<!DOCTYPE html>\n<html>\n<head><title>Welcome to nginx!</title></head>\n<body>\n<h1>Welcome to nginx!</h1>\n<p>If you see this page, the nginx web server is successfully installed and working.</p>\n</body>\n</html>' };
  },
  tasks: [
    { text: 'Check that Docker works: list the running containers.', why: 'docker ps is the command you will type most. Empty list = nothing runs yet.', hint: 'docker ps', cmd: 'docker ps', check: (m) => m.ran(/^docker ps\b/) },
    { text: 'Start nginx:1.27 in the background. Name it web. Connect port 8080 on your machine to port 80 in the container.', why: '-d = background, --name = your name for it, -p = port mapping HOST:CONTAINER.', hint: 'docker run -d --name web -p 8080:80 nginx:1.27', cmd: 'docker run -d --name web -p 8080:80 nginx:1.27', check: (m) => !!m.state.ranWeb },
    { text: 'Open the web page with curl on port 8080.', why: 'If you see "Welcome to nginx!", the port mapping works.', hint: 'curl localhost:8080', cmd: 'curl localhost:8080', check: (m) => m.lastHttp?.status === 200 && /:8080/.test(m.lastHttp.url) },
    { text: 'Read the logs of the container web.', why: 'Every request appears in the log. Logs are the first place to look when something is wrong.', hint: 'docker logs web', cmd: 'docker logs web', check: (m) => m.ran(/^docker logs\b.*web/) },
    { text: 'Stop the container. Then list ALL containers, also the stopped ones.', why: 'docker ps hides stopped containers. docker ps -a shows them with "Exited".', hint: 'docker stop web, then docker ps -a', cmd: 'docker stop web && docker ps -a', check: (m) => dockerState(m).containers.some((c) => c.name === 'web' && c.state === 'exited') && m.ran(/^docker ps\b.*-a/) || (m.state.webRemoved && m.ran(/^docker ps\b.*-a/)) },
    { text: 'Delete the container web.', why: 'A stopped container still uses disk. rm deletes it. The image stays, so you can start a new one quickly.', hint: 'docker rm web', cmd: 'docker rm web', check: (m) => m.ran(/^docker run\b/) && !dockerState(m).containers.some((c) => c.name === 'web') },
  ],
  afterCommand(m) { if (m.ran(/^docker run\b/) && !dockerState(m).containers.some((c) => c.name === 'web')) m.state.webRemoved = true; },
  solution: ['docker ps', 'docker run -d --name web -p 8080:80 nginx:1.27', 'curl localhost:8080', 'docker logs web', 'docker stop web', 'docker ps -a', 'docker rm web'],
  quiz: [
    { q: 'What does -p 8080:80 mean?', options: ['Port 80 on your machine goes to 8080 in the container', 'Port 8080 on your machine goes to port 80 in the container', 'Use 8080 MB of memory', 'Start 80 containers'], answer: 1, why: 'Always HOST:CONTAINER.' },
    { q: 'What is the difference between an image and a container?', options: ['They are the same', 'An image is the template; a container is a running copy of it', 'A container is bigger', 'An image runs, a container does not'], answer: 1, why: 'You can start many containers from one image.' },
    { q: 'docker rm web says "container is running". What now?', options: ['Restart Docker', 'Stop it first with docker stop web (or use rm -f)', 'Delete the image', 'Reboot'], answer: 1, why: 'Docker protects running containers from rm.' },
  ],
};

/* ---------- 6. Compose ---------- */
const composeYml = `services:
  nginx:
    image: nginx:1.27
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - api
  api:
    image: shopnotes-api:1.0
    environment:
      DATABASE_URL: postgresql://shopnotes:shopnotes@db:5432/shopnotes
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: shopnotes
      POSTGRES_PASSWORD: shopnotes
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`;
const nginxConf = (port) => `server {
    listen 80;
    server_name _;

    location / {
        root /usr/share/nginx/html;
    }

    location /health {
        proxy_pass http://api:${port};
    }

    location /api/ {
        proxy_pass http://api:${port}/;
    }
}
`;
const running = (m, project, svc) => dockerState(m).containers.some((c) => c.project === project && c.service === svc && c.state === 'running');
const composeServices = () => ({ nginx: { image: 'nginx:1.27', ports: '80:80' }, api: { image: 'shopnotes-api:1.0' }, db: { image: 'postgres:16' } });
const page502 = '<html>\n<head><title>502 Bad Gateway</title></head>\n<body>\n<center><h1>502 Bad Gateway</h1></center>\n<hr><center>nginx/1.27.2</center>\n</body>\n</html>';

const composeUp = {
  id: 'compose-up', title: 'Docker Compose: the full stack', topic: 'Docker', minutes: 20, sprints: ['s02'],
  summary: 'Start Nginx, the API and Postgres together, and see what happens when one part stops.',
  intro: [
    'ShopNotes has three parts: Nginx (the front door), the API (Python) and Postgres (the database).',
    'docker-compose.yml describes all three. One command starts them all.',
    'Inside Compose, containers find each other by service name: the API talks to the database at the name db.',
  ],
  commands: { docker },
  compose: composeServices,
  setup(m) {
    m.file('~/shopnotes/docker-compose.yml', composeYml);
    m.file('~/shopnotes/nginx.conf', nginxConf(5000));
    m.cwd = `${H}/shopnotes`;
    dockerState(m).images.push('nginx:1.27', 'shopnotes-api:1.0', 'postgres:16');
  },
  composeLogs(m, s) {
    if (s === 'db') return 'PostgreSQL init process complete; ready for start up.\n2026-10-31 10:41:05.312 UTC [1] LOG:  starting PostgreSQL 16.4\n2026-10-31 10:41:05.318 UTC [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432\n2026-10-31 10:41:05.331 UTC [1] LOG:  database system is ready to accept connections\n';
    if (s === 'api') return '[2026-10-31 10:41:06 +0000] [1] [INFO] Starting gunicorn 23.0.0\n[2026-10-31 10:41:06 +0000] [1] [INFO] Listening at: http://0.0.0.0:5000 (1)\n[2026-10-31 10:41:06 +0000] [1] [INFO] Using worker: sync\n[2026-10-31 10:41:06 +0000] [7] [INFO] Booting worker with pid: 7\n[2026-10-31 10:41:06 +0000] [8] [INFO] Booting worker with pid: 8\n' + (m.state.dbDownSeen ? '[2026-10-31 10:43:12 +0000] [7] [ERROR] health: psycopg2.OperationalError: could not translate host name "db" to address\n' : '');
    return '/docker-entrypoint.sh: Configuration complete; ready for start up\n2026/10/31 10:41:07 [notice] 1#1: nginx/1.27.2\n' + (m.state.hits || []).map((h) => `172.18.0.1 - - [31/Oct/2026:10:42:13 +0000] "GET ${h[0]} HTTP/1.1" ${h[1]} 27 "-" "curl/8.5.0"`).join('\n') + '\n';
  },
  http(m, url) {
    const mm = url.match(/^https?:\/\/(localhost|127\.0\.0\.1)(?::(\d+))?(\/\S*)?/);
    if (!mm || (mm[2] && mm[2] !== '80') || !running(m, 'shopnotes', 'nginx')) return null;
    const path = mm[3] || '/';
    let r;
    if (!running(m, 'shopnotes', 'api')) r = { status: 502, body: page502, type: 'text/html' };
    else if (!running(m, 'shopnotes', 'db')) { r = { status: 503, body: '{"db":"error: could not translate host name \\"db\\" to address","status":"error"}' }; m.state.dbDownSeen = true; m.state.saw503 = true; }
    else { r = { status: 200, body: path.startsWith('/health') ? '{"db":"ok","status":"ok"}' : '<h1>ShopNotes</h1>', type: path.startsWith('/health') ? 'application/json' : 'text/html' }; if (m.state.saw503) m.state.recovered = true; }
    (m.state.hits ??= []).push([path, r.status]);
    return r;
  },
  tasks: [
    { text: 'Read the file docker-compose.yml. Find the three service names.', why: 'Always read the compose file first. It tells you what runs, which image, which ports.', hint: 'cat docker-compose.yml', cmd: 'cat docker-compose.yml', check: (m) => m.ran(/^cat .*docker-compose\.yml/) },
    { text: 'Start all services in the background.', why: 'up creates and starts every service. -d gives you the terminal back.', hint: 'docker compose up -d   (with a space, not docker-compose)', cmd: 'docker compose up -d', check: (m) => ['nginx', 'api', 'db'].every((s) => running(m, 'shopnotes', s)) || m.state.recovered },
    { text: 'Check that all three containers are Up.', why: 'docker compose ps shows only the containers of this project, with their state.', hint: 'docker compose ps', cmd: 'docker compose ps', check: (m) => m.ran(/^docker compose ps/) },
    { text: 'Call the health URL through Nginx: http://localhost/health', why: 'This request goes Nginx → API → database. 200 means all three parts work.', hint: 'curl localhost/health', cmd: 'curl localhost/health', check: (m) => (m.state.hits || []).some((h) => h[0].startsWith('/health') && h[1] === 200) },
    { text: 'Stop only the database. Call /health again with -i and look at the status code.', why: 'You learn what a failure looks like before it happens for real: here the API answers 503.', hint: 'docker compose stop db, then curl -i localhost/health', cmd: 'docker compose stop db && curl -i localhost/health', check: (m) => !!m.state.saw503 },
    { text: 'Start the database again and confirm that /health is 200 again.', why: 'Always confirm the fix with the same check that showed the problem.', hint: 'docker compose start db, then curl localhost/health', cmd: 'docker compose start db && curl localhost/health', check: (m) => !!m.state.recovered },
    { text: 'Show only the last 5 log lines of the api service.', why: 'With many services, logs get long. Choose the service and the number of lines.', hint: 'docker compose logs --tail 5 api', cmd: 'docker compose logs --tail 5 api', check: (m) => m.ran(/^docker compose logs\b(?=.*(--tail[ =]?5|-n ?5))(?=.*\bapi\b)/) },
  ],
  solution: ['cat docker-compose.yml', 'docker compose up -d', 'docker compose ps', 'curl localhost/health', 'docker compose stop db', 'curl -i localhost/health', 'docker compose start db', 'curl localhost/health', 'docker compose logs --tail 5 api'],
  quiz: [
    { q: 'The database is stopped. What did /health answer?', options: ['200 OK', '503 Service Unavailable', '404 Not Found', 'Nothing'], answer: 1, why: 'The API runs but cannot reach the database, so it reports "not healthy" with 503.' },
    { q: 'How does the API container find the database?', options: ['By its IP address that you type', 'By the service name db', 'Through localhost', 'Through the internet'], answer: 1, why: 'Compose gives every service a DNS name: its service name.' },
    { q: 'Which one is correct today?', options: ['docker-compose up -d', 'docker compose up -d', 'docker up compose', 'compose docker up'], answer: 1, why: 'Compose v2 is part of docker: "docker compose" with a space.' },
  ],
};

/* ---------- 7. Incident: 502 ---------- */
const incident502 = {
  id: 'incident-502', title: 'Incident: 502 Bad Gateway', topic: 'Incident', minutes: 25, sprints: ['s05'],
  summary: 'Users see 502. Find why Nginx cannot reach the API, fix it, and prove it.',
  intro: [
    'ALERT 10:42: "ShopNotes shows 502 Bad Gateway for every user." You are on call.',
    '502 means: Nginx is running, but it could not get an answer from the app behind it.',
    'Work like this: 1) see the problem yourself, 2) collect facts (status, logs, config), 3) change one thing, 4) check again, 5) write down the cause.',
  ],
  commands: { docker },
  compose: composeServices,
  setup(m) {
    m.file('~/shop/docker-compose.yml', composeYml);
    m.file('~/shop/nginx.conf', nginxConf(5050));
    m.cwd = `${H}/shop`;
    const ds = dockerState(m);
    ds.images.push('nginx:1.27', 'shopnotes-api:1.0', 'postgres:16');
    const t = Date.now() - 50 * 60000;
    for (const [s, img, ports] of [['db', 'postgres:16', ''], ['api', 'shopnotes-api:1.0', ''], ['nginx', 'nginx:1.27', '80:80']]) ds.containers.push({ id: Math.random().toString(16).slice(2, 14), name: `shop-${s}-1`, image: img, project: 'shop', service: s, state: 'running', started: t, ports });
    m.state.loadedPort = 5050;
  },
  onComposeStart(m, s) { if (s === 'nginx') { const mm = (m.read(`${H}/shop/nginx.conf`) || '').match(/location \/health\s*\{[^}]*proxy_pass\s+http:\/\/api:(\d+)/); m.state.loadedPort = mm ? Number(mm[1]) : 0; } },
  composeLogs(m, s) {
    if (s === 'api') return '[2026-10-31 09:50:01 +0000] [1] [INFO] Starting gunicorn 23.0.0\n[2026-10-31 09:50:01 +0000] [1] [INFO] Listening at: http://0.0.0.0:5000 (1)\n[2026-10-31 09:50:01 +0000] [7] [INFO] Booting worker with pid: 7\n';
    if (s === 'db') return '2026-10-31 09:50:00.104 UTC [1] LOG:  database system is ready to accept connections\n';
    const port = m.state.loadedPort;
    const errs = [];
    for (const [i, path] of ['/health', '/', '/api/notes', '/health'].entries()) errs.push(`2026/10/31 10:4${i}:13 [error] 29#29: *${12 + i} connect() failed (111: Connection refused) while connecting to upstream, client: 172.18.0.1, server: _, request: "GET ${path} HTTP/1.1", upstream: "http://172.18.0.3:5050${path === '/' ? '/' : path}", host: "localhost"`);
    return '/docker-entrypoint.sh: Configuration complete; ready for start up\n' + errs.join('\n') + '\n' + (m.state.fixedAt ? `2026/10/31 10:58:02 [notice] 1#1: signal process started (config reloaded, upstream port ${port})\n` : '');
  },
  http(m, url) {
    const mm = url.match(/^https?:\/\/(localhost|127\.0\.0\.1)(?::(\d+))?(\/\S*)?/);
    if (!mm || (mm[2] && mm[2] !== '80') || !running(m, 'shop', 'nginx')) return null;
    if (m.state.loadedPort === 5000 && running(m, 'shop', 'api')) { m.state.fixedAt = m.history.length; return { status: 200, body: '{"db":"ok","status":"ok"}' }; }
    m.state.saw502 = true;
    return { status: 502, body: page502, type: 'text/html' };
  },
  tasks: [
    { text: 'See the problem yourself: call http://localhost/health with -i.', why: 'Never trust only the alert. Reproduce it first, so you can prove the fix later.', hint: 'curl -i localhost/health', cmd: 'curl -i localhost/health', check: (m) => !!m.state.saw502 },
    { text: 'Check the containers. Are all three Up?', why: 'If a container were down, that would explain a 502. Here they are all Up, so the cause is somewhere else.', hint: 'docker compose ps', cmd: 'docker compose ps', check: (m) => m.ran(/^docker compose ps/) },
    { text: 'Read the Nginx logs. Which port does Nginx try to reach?', why: 'The [error] lines show the upstream address Nginx used. Look at the number after the last colon.', hint: 'docker compose logs nginx', cmd: 'docker compose logs nginx', check: (m) => m.ran(/^docker compose logs\b.*nginx/) },
    { text: 'Read the API logs. Which port does the app really listen on?', why: '"Listening at" tells you the real port. Compare it with the port from the Nginx log.', hint: 'docker compose logs api', cmd: 'docker compose logs api', check: (m) => m.ran(/^docker compose logs\b.*api/) },
    { text: 'Find the wrong line in nginx.conf.', why: 'proxy_pass tells Nginx where to send the request. grep finds the lines fast.', hint: 'grep proxy_pass nginx.conf', cmd: 'grep proxy_pass nginx.conf', check: (m) => m.ran(/^(grep\b.*proxy_pass|cat\b.*nginx\.conf)/) || m.edits.length > 0 },
    { text: 'Fix nginx.conf: the API port must be 5000 in every proxy_pass line.', why: 'Change only what is wrong. Use nano to edit (Ctrl+S saves, Ctrl+X closes) or sed to replace.', hint: "nano nginx.conf, or: sed -i 's/5050/5000/g' nginx.conf", cmd: "sed -i 's/5050/5000/g' nginx.conf", check: (m) => { const c = m.read(`${H}/shop/nginx.conf`) || ''; return /api:5000/.test(c) && !/5050/.test(c); } },
    { text: 'Restart Nginx so it reads the new config.', why: 'A program reads its config file when it starts. Changing the file alone changes nothing.', hint: 'docker compose restart nginx', cmd: 'docker compose restart nginx', check: (m) => m.state.loadedPort === 5000 },
    { text: 'Prove the fix: /health must answer 200.', why: 'The same check that showed the problem must now pass.', hint: 'curl -i localhost/health', cmd: 'curl -i localhost/health', check: (m) => !!m.state.fixedAt },
    { text: 'Write the root cause in one sentence into ~/incident.txt', why: 'A good root cause names the exact thing: what was wrong, where, and the correct value.', hint: "echo 'Nginx sent requests to port 5050, but the API listens on 5000.' > ~/incident.txt", cmd: "echo 'Nginx sent requests to port 5050, but the API listens on port 5000.' > ~/incident.txt", check: (m) => { const t = m.read(`${H}/incident.txt`) || ''; return t.trim().length > 20 && /5050|5000|port/i.test(t); } },
  ],
  solution: ['curl -i localhost/health', 'docker compose ps', 'docker compose logs nginx', 'docker compose logs api', 'grep proxy_pass nginx.conf', "sed -i 's/5050/5000/g' nginx.conf", 'docker compose restart nginx', 'curl -i localhost/health', "echo 'Nginx sent requests to port 5050, but the API listens on port 5000.' > ~/incident.txt"],
  quiz: [
    { q: 'What does 502 Bad Gateway mean?', options: ['The database is full', 'Nginx works, but it could not get an answer from the app behind it', 'The user typed a wrong URL', 'The server is off'], answer: 1, why: 'Nginx is the gateway. "Bad gateway" = the next hop failed.' },
    { q: 'You changed nginx.conf but still get 502. Why?', options: ['The file is wrong again', 'Nginx did not read the new file yet: restart or reload it', 'Docker is broken', 'curl caches the answer'], answer: 1, why: 'Programs read config at start. Restart (or reload) after every config change.' },
    { q: 'All containers are Up but users see 502. Where do you look first?', options: ['Delete and start again', 'The Nginx error log: it shows where it tried to connect', 'The database', 'Reboot the server'], answer: 1, why: 'The log of the component that returns the error tells you what it tried.' },
  ],
};

/* ---------- 8. Incident: disk full ---------- */
const DEBUG = '/var/log/log-agent/debug.log';
const incidentDisk = {
  id: 'incident-disk-full', title: 'Incident: disk full', topic: 'Incident', minutes: 25, sprints: ['s10'],
  summary: 'The API returns 500 because the disk is 100% full. Find what fills it and free space safely.',
  intro: [
    'ALERT 03:10: "ShopNotes returns 500 for every request." The app log says: No space left on device.',
    'df shows how full a disk is. du shows which folders use the space.',
    'Careful: deleting a file that a program still writes does NOT free the space until that program restarts. Emptying the file does.',
  ],
  setup(m) {
    m.file('/var/log/shopnotes/app.log', Array.from({ length: 6 }, (_, i) => `2026-10-31 03:0${i}:12 ERROR POST /notes 500 OSError: [Errno 28] No space left on device: '/var/log/shopnotes/app.log'`).join('\n') + '\n');
    m.file(DEBUG, '2026-10-31 03:09:59 DEBUG tick: read 0 bytes from /proc/stat\n', { size: 27.4 * G });
    m.file('/var/log/log-agent/agent.log', '2026-10-30 22:00:01 INFO log-agent 2.4 started, level=debug, max_size=0 (no limit)\n');
    m.file('/etc/log-agent.conf', '# log-agent settings\nlevel = debug\nmax_size = 0\n');
    m.file('/var/log/syslog', 'Oct 31 03:10:02 shopnotes-dev kernel: EXT4-fs warning (device sda1): ext4_dx_add_entry: Directory index full!\n', { size: 180 * 2 ** 20 });
    m.state.disk = { size: 40 * G, base: 12.4 * G };
    m.state.agentLevel = 'debug';
    m.state.services = {
      shopnotes: { active: true, enabled: true, description: 'ShopNotes API (gunicorn)', exec: 'gunicorn -b 127.0.0.1:5000 app:app', user: 'trainee', pid: 2210 },
      'log-agent': { active: true, enabled: true, description: 'Log shipping agent', exec: '/usr/bin/log-agent --config /etc/log-agent.conf', pid: 1532, logs: ['Oct 30 22:00:01 shopnotes-dev log-agent[1532]: started, level=debug'] },
    };
  },
  pct(m) { const d = m.disk(); return Math.min(100, Math.round((d.used / d.size) * 100)); },
  onRemove(m, p) {
    if (p === DEBUG && m.state.services['log-agent'].active) { m.state.heldBytes = 27.4 * G; m.tip = 'The file is gone, but run df -h again: the space is still used. The log-agent program still has the file open. Restart it to free the space. Next time, empty the file with truncate -s 0 instead.'; }
  },
  onService(m, name, action) {
    if (name === 'log-agent' && ['restart', 'start'].includes(action)) {
      m.state.heldBytes = 0;
      m.state.agentLevel = /level\s*=\s*info/.test(m.read('/etc/log-agent.conf') || '') ? 'info' : 'debug';
      m.state.services['log-agent'].logs.push(`Oct 31 03:25:40 shopnotes-dev log-agent[1533]: started, level=${m.state.agentLevel}`);
    }
  },
  http(m, url) {
    if (!/:5000/.test(url)) return null;
    if (incidentDisk.pct(m) >= 99) { m.state.saw500 = true; return { status: 500, body: '{"error":"[Errno 28] No space left on device","status":"error"}', server: 'gunicorn' }; }
    if (m.state.saw500 && m.state.agentLevel === 'info') m.state.fixed = true;
    return { status: 200, body: '{"db":"ok","status":"ok"}', server: 'gunicorn' };
  },
  tasks: [
    { text: 'See the problem: call http://localhost:5000/health', why: 'Reproduce first. You will use the same command to prove the fix.', hint: 'curl localhost:5000/health', cmd: 'curl localhost:5000/health', check: (m) => !!m.state.saw500 },
    { text: 'Check how full the disk is.', why: 'Look at the Use% column. 100% means no program can write anything.', hint: 'df -h', cmd: 'df -h', check: (m) => m.ran(/^df\b/) },
    { text: 'Find which folder in /var/log uses the most space.', why: 'du -sh gives one total per folder. The * means "every folder in /var/log".', hint: 'du -sh /var/log/*', cmd: 'du -sh /var/log/*', check: (m) => m.ran(/^du\b.*\/var\/log/) },
    { text: 'List the files in that folder with sizes that are easy to read.', why: 'ls -lh shows sizes as K, M and G. Now you see the one huge file.', hint: 'ls -lh /var/log/log-agent', cmd: 'ls -lh /var/log/log-agent', check: (m) => m.ran(/^(ls\b.*-\w*l.*log-agent|find\b.*-size)/) },
    { text: 'Free the space safely: make the big file empty while the agent keeps running.', why: 'truncate -s 0 empties the file in place, so the space is free at once. The file needs sudo: it belongs to root.', hint: `sudo truncate -s 0 ${DEBUG}`, cmd: `sudo truncate -s 0 ${DEBUG}`, check: (m) => incidentDisk.pct(m) < 90 },
    { text: 'Stop the cause: change level = debug to level = info in /etc/log-agent.conf', why: 'If you only empty the file, the disk is full again tomorrow. Fix why it grew.', hint: "sudo nano /etc/log-agent.conf, or: sudo sed -i 's/level = debug/level = info/' /etc/log-agent.conf", cmd: "sudo sed -i 's/level = debug/level = info/' /etc/log-agent.conf", check: (m) => /level\s*=\s*info/.test(m.read('/etc/log-agent.conf') || '') },
    { text: 'Restart the log agent so it uses the new level.', why: 'A config change only works after a restart.', hint: 'sudo systemctl restart log-agent', cmd: 'sudo systemctl restart log-agent', check: (m) => m.state.agentLevel === 'info' },
    { text: 'Prove the fix: /health must answer 200.', why: 'Same check as at the start. Now it passes.', hint: 'curl localhost:5000/health', cmd: 'curl localhost:5000/health', check: (m) => !!m.state.fixed },
  ],
  solution: ['curl localhost:5000/health', 'df -h', 'du -sh /var/log/*', 'ls -lh /var/log/log-agent', `sudo truncate -s 0 ${DEBUG}`, "sudo sed -i 's/level = debug/level = info/' /etc/log-agent.conf", 'sudo systemctl restart log-agent', 'curl localhost:5000/health'],
  quiz: [
    { q: 'What is the difference between df and du?', options: ['No difference', 'df shows how full the disk is; du shows how much space folders use', 'du is for Docker only', 'df deletes files'], answer: 1, why: 'df = disk free (whole disk). du = disk usage (per folder).' },
    { q: 'Why truncate the log and not rm it?', options: ['rm is slower', 'A running program keeps a deleted file open, so the space is not freed until it restarts', 'rm needs sudo', 'truncate makes a backup'], answer: 1, why: 'This surprises many engineers during real incidents.' },
    { q: 'You emptied the file. Why also change the config?', options: ['You do not need to', 'Otherwise the agent fills the disk again', 'To make the app faster', 'Because of Git'], answer: 1, why: 'Fix the cause, not only the symptom.' },
  ],
};

/* ---------- 9. Kubernetes CrashLoopBackOff ---------- */
const GOOD_URL = 'postgresql://shopnotes:shopnotes@postgres:5432/shopnotes';
function k8s(m) {
  return (m.state.k8s ??= { env: { DATABSE_URL: GOOD_URL, PORT: '5000' }, gen: 0, pods: null });
}
function podNames(m) {
  const s = k8s(m);
  const hash = s.gen === 0 ? '7d9f8b6c5d' : ['5c8d7f9b44', '66b9c4d7f8', '9f7c5b8d6a'][(s.gen - 1) % 3];
  return [`shopnotes-api-${hash}-x2k4p`, `shopnotes-api-${hash}-q7m9z`];
}
const healthy = (m) => !!k8s(m).env.DATABASE_URL && /@postgres:5432\//.test(k8s(m).env.DATABASE_URL);
function kubectl({ m, args }) {
  const s = k8s(m);
  const { v, rest } = flags(args, ['-n', '-o', '--namespace']);
  const [sub, what, name] = rest;
  const pods = podNames(m);
  if (!sub) return ok('kubectl controls the Kubernetes cluster.\n\nBasic Commands:\n  get        Display one or many resources\n  describe   Show details of a resource\n  logs       Print the logs for a container in a pod\n  set env    Update environment variables\n  rollout    Manage the rollout of a resource\n');
  if (sub === 'get') {
    if (/^(po|pod|pods)$/.test(what || '')) {
      const ok2 = healthy(m);
      if (ok2) m.state.sawRunning = true;
      const rows = [['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE']];
      for (const p of pods) rows.push([p, ok2 ? '1/1' : '0/1', ok2 ? 'Running' : 'CrashLoopBackOff', ok2 ? '0' : '7 (2m ago)', ok2 ? '20s' : '14m']);
      rows.push(['postgres-0', '1/1', 'Running', '0', '3d']);
      return ok(table(rows));
    }
    if (/^(deploy|deployment|deployments)$/.test(what || '')) return ok(table([['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE'], ['shopnotes-api', healthy(m) ? '2/2' : '0/2', '2', healthy(m) ? '2' : '0', '14m']]));
    if (/^(svc|service|services)$/.test(what || '')) return ok(table([['NAME', 'TYPE', 'CLUSTER-IP', 'PORT(S)', 'AGE'], ['shopnotes-api', 'ClusterIP', '10.43.12.80', '80/TCP', '3d'], ['postgres', 'ClusterIP', '10.43.200.7', '5432/TCP', '3d']]));
    return fail(`error: the server doesn't have a resource type "${what || ''}"`, 1, 'Try: kubectl get pods, kubectl get deploy, kubectl get svc');
  }
  if (sub === 'logs') {
    const target = what || '';
    if (!pods.includes(target) && !/^(deploy|deployment)\/shopnotes-api$/.test(target)) return fail(`error: error from server (NotFound): pods "${target}" not found`, 1, 'Copy the exact pod name from kubectl get pods. Or use deployment/shopnotes-api.');
    if (healthy(m)) return ok('[2026-10-31 11:02:10 +0000] [1] [INFO] Starting gunicorn 23.0.0\n[2026-10-31 11:02:10 +0000] [1] [INFO] Listening at: http://0.0.0.0:5000 (1)\n');
    return ok('[2026-10-31 10:48:02 +0000] [1] [INFO] Starting gunicorn 23.0.0\n[2026-10-31 10:48:02 +0000] [7] [ERROR] Exception in worker process\nTraceback (most recent call last):\n  File "/app/app.py", line 6, in <module>\n    DATABASE_URL = os.environ["DATABASE_URL"]\n                   ~~~~~~~~~~^^^^^^^^^^^^^^^^\n  File "<frozen os>", line 714, in __getitem__\nKeyError: \'DATABASE_URL\'\n[2026-10-31 10:48:02 +0000] [1] [ERROR] Shutting down: Master\n[2026-10-31 10:48:02 +0000] [1] [ERROR] Reason: Worker failed to boot.\n');
  }
  if (sub === 'describe') {
    const ref = name ? `${what}/${name}` : what || '';
    const envLines = Object.entries(s.env).map(([k, val]) => `      ${k}:  ${val}`).join('\n');
    if (/^(deploy|deployment|deployments)\/shopnotes-api$/.test(ref)) return ok(`Name:                   shopnotes-api\nNamespace:              default\nReplicas:               2 desired | 2 updated | 2 total | ${healthy(m) ? 2 : 0} available | ${healthy(m) ? 0 : 2} unavailable\nPod Template:\n  Containers:\n   api:\n    Image:      shopnotes-api:1.0\n    Port:       5000/TCP\n    Environment:\n${envLines}\nConditions:\n  Type           Status  Reason\n  Available      ${healthy(m) ? 'True ' : 'False'}   ${healthy(m) ? 'MinimumReplicasAvailable' : 'MinimumReplicasUnavailable'}\n`);
    if (/^(po|pod|pods)\//.test(ref) && pods.includes(ref.split('/')[1])) {
      return ok(`Name:         ${ref.split('/')[1]}\nNamespace:    default\nStatus:       ${healthy(m) ? 'Running' : 'Running'}\nContainers:\n  api:\n    Image:          shopnotes-api:1.0\n    State:          ${healthy(m) ? 'Running' : 'Waiting\n      Reason:       CrashLoopBackOff'}\n${healthy(m) ? '' : '    Last State:     Terminated\n      Reason:       Error\n      Exit Code:    3\n'}    Environment:\n${envLines}\nEvents:\n  Type     Reason   Age                From     Message\n  ----     ------   ----               ----     -------\n${healthy(m) ? '  Normal   Started  20s                kubelet  Started container api' : '  Warning  BackOff  2m (x47 over 14m)  kubelet  Back-off restarting failed container api in pod'}\n`);
    }
    return fail(`Error from server (NotFound): "${ref}" not found`, 1, 'Examples: kubectl describe deployment shopnotes-api, or kubectl describe pod POD-NAME');
  }
  if (sub === 'set' && what === 'env') {
    const target = rest[2];
    if (!/^(deploy|deployment)\/shopnotes-api$/.test(target || '')) return fail(`error: you must specify the deployment, for example deployment/shopnotes-api`, 1);
    const pairs = rest.slice(3);
    if (!pairs.length) return fail('error: at least one environment variable is required', 1, 'Example: kubectl set env deployment/shopnotes-api KEY=value   (KEY- removes a variable)');
    for (const p of pairs) {
      if (p.endsWith('-') && !p.includes('=')) { if (!(p.slice(0, -1) in s.env)) return fail(`error: variable ${p.slice(0, -1)} does not exist`, 1, 'Check the exact name with kubectl describe deployment shopnotes-api'); delete s.env[p.slice(0, -1)]; }
      else if (/^[A-Za-z_]\w*=/.test(p)) { const i = p.indexOf('='); s.env[p.slice(0, i)] = p.slice(i + 1); }
      else return fail(`error: invalid env: ${p}`, 1, 'Write it as KEY=value, without spaces around =.');
    }
    s.gen++;
    return ok('deployment.apps/shopnotes-api env updated\n');
  }
  if (sub === 'rollout') {
    if (what === 'status') { if (healthy(m)) { m.state.rolled = true; return ok('Waiting for deployment "shopnotes-api" rollout to finish: 1 of 2 updated replicas are available...\ndeployment "shopnotes-api" successfully rolled out\n'); } return fail('Waiting for deployment "shopnotes-api" rollout to finish: 0 of 2 updated replicas are available...\nerror: deployment "shopnotes-api" exceeded its progress deadline', 1, 'The new pods still crash. Read their logs again.'); }
    if (what === 'restart') { s.gen++; return ok('deployment.apps/shopnotes-api restarted\n'); }
    return fail('Use: kubectl rollout status deployment/shopnotes-api');
  }
  return fail(`error: unknown command "${sub}" for "kubectl"`, 1, 'Type kubectl to see the commands you can use here.');
}
const k8sCrash = {
  id: 'k8s-crashloop', title: 'Incident: Kubernetes CrashLoopBackOff', topic: 'Kubernetes', minutes: 25, sprints: ['s07'],
  summary: 'The new pods crash again and again. Read the logs, find the wrong variable, fix the deployment.',
  intro: [
    'ALERT: "shopnotes-api pods are in CrashLoopBackOff after this morning\'s change." Kubernetes keeps restarting the container, and it keeps crashing.',
    'kubectl get shows the state. kubectl logs shows why the container stopped. kubectl describe shows the settings and events.',
    'Settings like DATABASE_URL are environment variables. One wrong letter in the name and the app cannot find it.',
  ],
  commands: { kubectl },
  host: 'k3d-shopnotes',
  tasks: [
    { text: 'List the pods. What is the STATUS of the shopnotes-api pods?', why: 'CrashLoopBackOff = the container starts, crashes, and Kubernetes waits longer before each new try.', hint: 'kubectl get pods', cmd: 'kubectl get pods', check: (m) => m.ran(/^kubectl get (po|pod|pods)\b/) },
    { text: 'Read the logs of one crashing pod. What error do you see?', why: 'The last lines of the log almost always show the reason for the crash.', hint: 'kubectl logs and the pod name. Copy the name from the list.', cmd: 'kubectl logs shopnotes-api-7d9f8b6c5d-x2k4p', check: (m) => m.ran(/^kubectl logs\b/) },
    { text: 'Look at the environment variables of the deployment. Compare the names carefully.', why: 'The app wants DATABASE_URL. Read the names letter by letter.', hint: 'kubectl describe deployment shopnotes-api', cmd: 'kubectl describe deployment shopnotes-api', check: (m) => m.ran(/^kubectl describe (deploy|deployment|deployments)\b/) },
    { text: `Set the correct variable: DATABASE_URL=${GOOD_URL}`, why: 'kubectl set env changes the deployment. Kubernetes then creates new pods with the new setting.', hint: `kubectl set env deployment/shopnotes-api DATABASE_URL=${GOOD_URL}`, cmd: `kubectl set env deployment/shopnotes-api DATABASE_URL=${GOOD_URL}`, check: (m) => healthy(m) },
    { text: 'Remove the wrong variable DATABSE_URL (a - after the name removes it).', why: 'Leave no wrong settings behind. The next person will be confused by them.', hint: 'kubectl set env deployment/shopnotes-api DATABSE_URL-', cmd: 'kubectl set env deployment/shopnotes-api DATABSE_URL-', check: (m) => !('DATABSE_URL' in k8s(m).env) },
    { text: 'Wait until the rollout is finished.', why: 'rollout status waits and tells you when all new pods are ready.', hint: 'kubectl rollout status deployment/shopnotes-api', cmd: 'kubectl rollout status deployment/shopnotes-api', check: (m) => !!m.state.rolled },
    { text: 'Check the pods again. Both must be Running and 1/1 READY.', why: 'Always confirm with the same command that showed the problem.', hint: 'kubectl get pods', cmd: 'kubectl get pods', check: (m) => !!m.state.sawRunning },
  ],
  solution: ['kubectl get pods', 'kubectl logs shopnotes-api-7d9f8b6c5d-x2k4p', 'kubectl describe deployment shopnotes-api', `kubectl set env deployment/shopnotes-api DATABASE_URL=${GOOD_URL}`, 'kubectl set env deployment/shopnotes-api DATABSE_URL-', 'kubectl rollout status deployment/shopnotes-api', 'kubectl get pods'],
  quiz: [
    { q: 'What does CrashLoopBackOff mean?', options: ['The image is missing', 'The container keeps crashing, and Kubernetes waits longer before each restart', 'The node is full', 'The pod is healthy'], answer: 1, why: 'The real reason is in the container logs.' },
    { q: 'Where do you see why a container crashed?', options: ['kubectl get svc', 'kubectl logs POD (add --previous for the crash before)', 'kubectl version', 'The browser'], answer: 1, why: 'logs show what the app printed before it stopped.' },
    { q: 'How do you remove the variable OLD_NAME from a deployment?', options: ['kubectl set env deployment/app OLD_NAME-', 'kubectl delete OLD_NAME', 'kubectl set env OLD_NAME=0', 'You cannot'], answer: 0, why: 'A minus after the name removes the variable.' },
  ],
};

export const labs = [linuxFiles, linuxLogs, linuxServices, gitBasics, dockerBasics, composeUp, incident502, incidentDisk, k8sCrash];
export const labById = (id) => labs.find((l) => l.id === id);
export const TOPICS = ['Linux', 'Git', 'Docker', 'Kubernetes', 'Incident'];
