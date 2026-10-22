// Koko's real-trade journal (manual entries from the app). POST { pin, action: 'add' | 'del', trade | id }. Same CONTROL_PIN and lockout as the control page.
// Rows live in desk_events (kind 'mytrade'); the page reads them with the public key like the rest of the dashboard. No exchange keys anywhere.
import { timingSafeEqual } from 'node:crypto';
import { sb, loadControl, saveControl } from '../lib/ap.mjs';
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const num = (v, lo, hi) => { const n = +v; return isFinite(n) && n >= lo && n <= hi ? n : null; };
export function cleanTrade(t) {
  if (!t || typeof t !== 'object') return null;
  const coin = String(t.coin || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12), side = t.side === 'SHORT' ? 'SHORT' : t.side === 'LONG' ? 'LONG' : null;
  const at = Date.parse(t.at), entry = num(t.entry, 1e-12, 1e9), exit = num(t.exit, 1e-12, 1e9), qty = num(t.qty, 1e-12, 1e12);
  const fees = num(t.fees == null || t.fees === '' ? 0 : t.fees, 0, 1e6), funding = num(t.funding == null || t.funding === '' ? 0 : t.funding, -1e6, 1e6), lev = num(t.lev == null || t.lev === '' ? 1 : t.lev, 1, 200);
  if (!coin || !side || !isFinite(at) || entry == null || exit == null || qty == null || fees == null || funding == null || lev == null) return null;
  const pnl = (side === 'LONG' ? 1 : -1) * (exit - entry) * qty - fees + funding;
  return { at: new Date(at).toISOString(), coin, side, entry, exit, qty, fees, funding, lev, pnl: +pnl.toFixed(4), exchange: String(t.exchange || 'KuCoin').slice(0, 20), note: String(t.note || '').slice(0, 200) };
}
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const origin = req.headers.get('origin') || '';
  if (origin && !/auto-pilotai\.netlify\.app$/.test(new URL(origin).host)) return json({ error: 'origin' }, 403);
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  const env = process.env;
  if (!env.CONTROL_PIN || !env.SUPABASE_SERVICE_KEY) return json({ error: 'not configured' }, 500);
  const db = sb(env.SUPABASE_SERVICE_KEY), ctl = await loadControl(db), now = Date.now();
  ctl.fails = (ctl.fails || []).filter((t) => now - t < 15 * 60000);
  if (ctl.fails.length >= 5) return json({ error: 'locked', retryMin: Math.ceil((15 * 60000 - (now - ctl.fails[0])) / 60000) }, 429);
  if (!same(String(b.pin || ''), String(env.CONTROL_PIN))) { ctl.fails.push(now); await saveControl(db, ctl); return json({ error: 'wrong pin', triesLeft: 5 - ctl.fails.length }, 401); }
  if (ctl.fails.length) { ctl.fails = []; await saveControl(db, ctl); }
  if (b.action === 'add') {
    const t = cleanTrade(b.trade); if (!t) return json({ error: 'check the fields: coin, side, time, entry, exit and quantity are required' }, 400);
    const row = await db.insert('desk_events', { coin: t.coin, kind: 'mytrade', data: t });
    return json({ ok: true, row });
  }
  if (b.action === 'del') {
    const id = String(b.id || ''); if (!/^[0-9a-f-]{1,40}$/i.test(id)) return json({ error: 'bad id' }, 400);
    await db.del('desk_events', 'id=eq.' + id + '&kind=eq.mytrade');
    return json({ ok: true });
  }
  return json({ ok: true }); // action 'check': PIN is right
};
