// All practice labs of both tracks. DevOps labs run in the terminal; CRO labs are widgets.
import { labs as terminalLabs } from './labs.js';
import { croLabs } from './cro/labs.js';

for (const l of terminalLabs) { l.track = 'devops'; l.kind = 'terminal'; }
export const allLabs = [...terminalLabs, ...croLabs];
export const labById = (id) => allLabs.find((l) => l.id === id);
export const labsFor = (track) => allLabs.filter((l) => l.track === track || (l.alsoIn || []).includes(track));
export const topicsFor = (track) => [...new Set(labsFor(track).map((l) => l.topic))];
