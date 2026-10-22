import { lab2Tick } from '../lib/lab2.mjs';
// Lab desks part 2 (from 22 Oct 2026): funding-time drift, crowd vs top traders, residual momentum, pairs, OKX vs Hyperliquid funding spread.
// Own schedule so the extra API calls never slow the main tick. Answers the scheduler at once and finishes in the background.
export default async (req, context) => {
  const job = lab2Tick(process.env).then((r) => { console.log(JSON.stringify(r)); return r; }).catch((e) => { console.log('lab2 error ' + String(e && e.message || e)); });
  if (context && typeof context.waitUntil === 'function') { context.waitUntil(job); return new Response('lab2 started'); }
  return new Response(JSON.stringify(await job));
};
export const config = { schedule: '*/5 * * * *' };
