// Fails when app files changed but version.json did not.  Usage: node scripts/check-version.mjs <base> <head>   or   node scripts/check-version.mjs --staged
import { execSync } from 'node:child_process';
const args = process.argv.slice(2), cmd = args[0] === '--staged' ? 'git diff --cached --name-only' : 'git diff --name-only ' + (args[0] || 'HEAD~1') + ' ' + (args[1] || 'HEAD');
const files = execSync(cmd, { encoding: 'utf8' }).split('\n').filter(Boolean);
const app = files.filter((f) => /^(index\.html|research\.html|horizons\.html|control\.html|netlify\/|sql\/)/.test(f));
if (app.length && !files.includes('version.json')) { console.error('App files changed but the version did not move:\n  ' + app.join('\n  ') + '\nRun: node scripts/bump.mjs minor "what changed"'); process.exit(1); }
console.log('version check ok');
