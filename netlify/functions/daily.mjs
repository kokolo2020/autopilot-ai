// Writes the daily per-desk snapshots (see lib/daily.mjs). Needs the table from sql/autopilot.sql.
import { sb } from '../lib/ap.mjs';
import { runDaily } from '../lib/daily.mjs';
export default async () => {
  if (!process.env.SUPABASE_SERVICE_KEY) return new Response(JSON.stringify({ skipped: 'missing keys' }));
  try { const r = await runDaily(sb(process.env.SUPABASE_SERVICE_KEY)); console.log(JSON.stringify(r)); return new Response(JSON.stringify(r)); }
  catch (e) { console.log('daily error ' + String(e.message || e).slice(0, 200)); return new Response(JSON.stringify({ error: String(e.message || e).slice(0, 200) }), { status: 500 }); }
};
export const config = { schedule: '*/30 * * * *' };
