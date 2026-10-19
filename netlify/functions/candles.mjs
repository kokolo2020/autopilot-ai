// Read-only candle proxy for the My picks charts. GET ?coin=SOL&bar=5m|15m|1H|4H|1D&limit=1..300
// -> { src, data: [[tsMs, open, high, low, close, volumeCoin], ...] } oldest first.
// Source order: OKX USDT perpetual, OKX spot, Gate.io USDT perpetual (for coins OKX does not list, e.g. RUNE, CARDS).
const GATE = { '5m': '5m', '15m': '15m', '1H': '1h', '4H': '4h', '1D': '1d' };
const json = (o, status = 200, age = 30) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + age } });
async function okx(inst, bar, limit) {
  const r = await fetch('https://www.okx.com/api/v5/market/candles?instId=' + inst + '&bar=' + bar + '&limit=' + limit, { headers: { 'User-Agent': 'autopilot-picks' } });
  const j = await r.json(); if (j.code !== '0' || !j.data || !j.data.length) return null;
  return j.data.map((k) => [+k[0], +k[1], +k[2], +k[3], +k[4], +k[5]]).reverse();
}
async function gate(coin, bar, limit) {
  const r = await fetch('https://api.gateio.ws/api/v4/futures/usdt/candlesticks?contract=' + coin + '_USDT&interval=' + GATE[bar] + '&limit=' + limit, { headers: { 'User-Agent': 'autopilot-picks' } });
  if (!r.ok) return null; const j = await r.json(); if (!Array.isArray(j) || !j.length) return null;
  return j.map((k) => [k.t * 1000, +k.o, +k.h, +k.l, +k.c, +k.v]);
}
export default async (req) => {
  const u = new URL(req.url), coin = (u.searchParams.get('coin') || '').toUpperCase(), bar = u.searchParams.get('bar') || '5m', limit = Math.max(1, Math.min(300, +u.searchParams.get('limit') || 300));
  if (!/^[A-Z0-9]{2,12}$/.test(coin) || !GATE[bar]) return json({ src: null, data: [] }, 400);
  try {
    let d = await okx(coin + '-USDT-SWAP', bar, limit).catch(() => null); if (d) return json({ src: 'OKX perpetual', data: d });
    d = await okx(coin + '-USDT', bar, limit).catch(() => null); if (d) return json({ src: 'OKX spot', data: d });
    d = await gate(coin, bar, limit).catch(() => null); if (d) return json({ src: 'Gate.io perpetual', data: d });
    return json({ src: null, data: [] }, 404, 60);
  } catch (e) { return json({ src: null, data: [] }, 502, 5); }
};
