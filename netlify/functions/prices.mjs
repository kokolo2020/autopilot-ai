// Live last prices for the dashboard (read-only, public data). GET returns { COIN: lastPrice }.
// OKX USDT perpetuals first; My-picks coins without an OKX perpetual (e.g. RUNE, CARDS) fall back to OKX spot, then Gate.io / MEXC perpetuals.
import { MYPICKS, pickQuote } from '../lib/ap.mjs';
export default async () => {
  try {
    const r = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP');
    const j = await r.json(), out = {};
    for (const t of j.data || []) if (/-USDT-SWAP$/.test(t.instId)) out[t.instId.split('-')[0]] = +t.last;
    const miss = MYPICKS.coins.filter((c) => out[c] == null);
    if (miss.length) {
      const okxSpot = {};
      try { const s = await (await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT')).json(); for (const t of s.data || []) okxSpot[t.instId] = { last: +t.last, ask: +t.askPx || +t.last }; } catch (e) { /* skip */ }
      await Promise.all(miss.map(async (c) => { const q = await pickQuote(c, okxSpot); if (q) out[c] = q.last; }));
    }
    return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=5' } });
  } catch (e) { return new Response('{}', { status: 502, headers: { 'Content-Type': 'application/json' } }); }
};
