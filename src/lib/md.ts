// Tiny markdown renderer (headings, lists, code, bold, links, inline code). Enough for READMEs and coach replies.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(s: string) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
export function md(src: string): string {
  const lines = src.replace(/\r/g, '').split('\n');
  let out = '', inCode = false, list: 'ul' | 'ol' | null = null, para: string[] = [];
  const flushP = () => { if (para.length) { out += `<p>${inline(para.join(' '))}</p>`; para = []; } };
  const closeList = () => { if (list) { out += `</${list}>`; list = null; } };
  for (const raw of lines) {
    if (raw.startsWith('```')) { flushP(); closeList(); out += inCode ? '</code></pre>' : '<pre><code>'; inCode = !inCode; continue; }
    if (inCode) { out += esc(raw) + '\n'; continue; }
    const h = raw.match(/^(#{1,4})\s+(.*)$/);
    if (h) { flushP(); closeList(); out += `<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`; continue; }
    const ul = raw.match(/^\s*[-*]\s+(.*)$/), ol = raw.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) { flushP(); const kind = ul ? 'ul' : 'ol'; if (list !== kind) { closeList(); out += `<${kind}>`; list = kind; } out += `<li>${inline((ul || ol)![1])}</li>`; continue; }
    if (!raw.trim()) { flushP(); closeList(); continue; }
    if (raw.startsWith('>')) { flushP(); closeList(); out += `<blockquote>${inline(raw.slice(1).trim())}</blockquote>`; continue; }
    para.push(raw.trim());
  }
  flushP(); closeList(); if (inCode) out += '</code></pre>';
  return out;
}
