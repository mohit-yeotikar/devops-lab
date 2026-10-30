# Curriculum content schema

One JSON file per sprint: `src/content/curriculum/sprint-01.json` … `sprint-12.json`.
Everything a trainee reads must be SIMPLE ENGLISH (short sentences, common words, no idioms) because
their English is weak. Every ticket also carries a Hindi/Hinglish helper text.
Every ticket must be doable on AWS Free Tier (12 months) + a laptop with Docker. No EKS (costs money):
use k3d locally or k3s on a free-tier EC2. Never ask them to spend money.

```jsonc
{
  "id": "s01",                 // s01 … s12
  "number": 1,
  "title": "Linux, Git and the company app",
  "weeks": "1-2",
  "theme": "one line: what this sprint is about",
  "jobStory": "3-4 simple sentences: what a real junior DevOps engineer does in this period at a company. Written as 'In this sprint you ...'",
  "outcomes": ["bullet", "bullet"],            // 3-5 bullets, what they can say they did
  "tickets": [
    {
      "id": "s01-t01",
      "key": "OPS-101",         // Jira-style key, unique across all sprints: sprint 1 = OPS-1xx, sprint 2 = OPS-2xx …
      "type": "task",           // task | project | incident | docs
      "title": "Set up the ShopNotes dev server on Linux",
      "priority": "high",       // high | medium | low
      "estimateHours": 6,
      "goal": "One sentence: the result the company needs.",
      "context": "2-4 sentences written like a message from a team lead. 'Hi, we need … because …'",
      "steps": ["Numbered, concrete steps. Include the exact commands in backticks.", "..."],
      "acceptance": ["Checkable lines. 'The app answers on http://localhost:5000/health with status ok'"],
      "evidence": ["What they must paste/upload: 'Link to your GitHub repo', 'Screenshot of …', 'Output of `docker ps`'"],
      "hints": ["Short help if stuck. Max 3."],
      "explain": {
        "en": "5-7 very simple first-person sentences the trainee can SAY in an interview about this ticket. Start with 'In this task I …'. Use past tense. No hard words.",
        "hi": "The same idea in Hinglish (Roman script Hindi mixed with the English tech words), so they understand the meaning."
      },
      "vocabulary": [ { "term": "reverse proxy", "en": "a server that takes the request and sends it to the app", "hi": "ek server jo request leke app ko bhejta hai" } ],  // 3-6 per ticket
      "interview": [ { "q": "Why did you use Nginx in front of the app?", "a": "Simple English model answer, 3-4 sentences, first person." } ],  // exactly 3 per ticket
      "resources": [ { "title": "Docker docs: Dockerfile", "url": "https://docs.docker.com/reference/dockerfile/" } ]  // 1-3, official docs preferred
    }
  ]
}
```

Rules
- 5 tickets per sprint (4 if two are big projects). Mix: mostly `task`, one `project` per sprint, one `docs` ticket in most sprints
  (write a README / runbook / architecture note), and from sprint 5 on, one `incident` ticket that points to a drill in `drills/<name>/`.
- All sprints build ONE company system: the "ShopNotes" app (a small Python Flask API + a static frontend + a
  Postgres/MariaDB database) that grows from laptop → Docker → CI → AWS 3-tier → Terraform → Kubernetes → GitOps → monitored.
- Steps must be real and complete enough to follow without a teacher.
- Keys: OPS-101…, OPS-201…, OPS-1201… Ticket ids: s01-t01 … s12-t05.
