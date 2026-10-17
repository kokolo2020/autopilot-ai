// Top-100 research track at $100 per coin (see lib/ap.mjs). OFF by default: it only runs when the Netlify variable TOP100_ENABLED is 1. Offset 2 minutes from the main tick so the two never hit OKX at the same moment.
import { top100Tick } from '../lib/ap.mjs';
export default async () => {
  if (process.env.TOP100_ENABLED !== '1') return new Response(JSON.stringify({ skipped: 'top-100 track is off (set TOP100_ENABLED=1 in Netlify to turn it on)' }));
  try { const r = await top100Tick(process.env); console.log(JSON.stringify(r)); return new Response(JSON.stringify(r)); }
  catch (e) { console.log('top100 error ' + String(e.message || e).slice(0, 200)); return new Response(JSON.stringify({ error: String(e.message || e).slice(0, 200) }), { status: 500 }); }
};
export const config = { schedule: '2-59/5 * * * *' };
