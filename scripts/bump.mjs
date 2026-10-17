// Bump the Autopilot version and start a changelog entry.  Usage: node scripts/bump.mjs [minor|patch] "what changed"
// minor: 1.23 -> 1.24   patch: 1.23 -> 1.23.1 (then 1.23.2 ...)
// Edits version.json (the one source of truth, both pages read it), the fallback text in index.html and research.html, and CHANGELOG.md.
import { readFileSync, writeFileSync } from 'node:fs';
const kind = ['minor', 'patch'].includes(process.argv[2]) ? process.argv[2] : 'minor';
const note = process.argv.slice(['minor', 'patch'].includes(process.argv[2]) ? 3 : 2).join(' ').trim();
if (!note) { console.error('Say what changed: node scripts/bump.mjs minor "what changed"'); process.exit(1); }
const v = JSON.parse(readFileSync('version.json', 'utf8')), old = v.version, [a, b, c] = old.split('.').map(Number);
const next = kind === 'patch' ? a + '.' + b + '.' + ((c || 0) + 1) : a + '.' + (b + 1);
v.version = next; v.released = new Date().toISOString().slice(0, 10);
writeFileSync('version.json', JSON.stringify(v) + '\n');
for (const f of ['index.html', 'research.html']) { const s = readFileSync(f, 'utf8'); writeFileSync(f, s.split('ap-v' + old).join('ap-v' + next)); }
const cl = readFileSync('CHANGELOG.md', 'utf8'), i = cl.indexOf('\n## ');
writeFileSync('CHANGELOG.md', cl.slice(0, i + 1) + '\n## v' + next + '\n- ' + note + '\n' + cl.slice(i));
console.log('version ' + old + ' -> ' + next);
