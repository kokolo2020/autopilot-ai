import { tickAll } from '../lib/ap.mjs';
// v1.54: answer the scheduler at once and keep working in the background (context.waitUntil). Before this, ticks longer than ~15 s
// were cut off by the scheduler (HTTP 499) and retried, so the same tick ran 2-3 times every 5 minutes.
export default async (req, context) => {
  const job = tickAll(process.env).then((r) => { console.log(JSON.stringify(r)); return r; }).catch((e) => { console.log('tick error ' + String(e && e.message || e)); });
  if (context && typeof context.waitUntil === 'function') { context.waitUntil(job); return new Response('tick started'); }
  return new Response(JSON.stringify(await job));
};
export const config = { schedule: '*/5 * * * *' };
