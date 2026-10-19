// Read-only proxy for OKX public candle history (study.html daily, study8h.html 4-hourly). GET ?inst=BTC-USDT&after=<ms>&bar=1Dutc|4H  ->  { data: [[ts,o,h,l,c,...], ...] } newest first, 100 rows.
export default async (req) => {
  const u = new URL(req.url), inst = u.searchParams.get('inst') || '', after = u.searchParams.get('after') || '', bar = u.searchParams.get('bar') || '1Dutc';
  if (!/^[A-Z0-9]{2,12}-USDT$/.test(inst) || (after && !/^\d{10,14}$/.test(after)) || !['1Dutc', '4H', '1H'].includes(bar)) return new Response('{"data":[]}', { status: 400, headers: { 'Content-Type': 'application/json' } });
  try {
    const r = await fetch('https://www.okx.com/api/v5/market/history-candles?instId=' + inst + '&bar=' + bar + '&limit=100' + (after ? '&after=' + after : ''), { headers: { 'User-Agent': 'autopilot-study' } });
    const j = await r.json();
    return new Response(JSON.stringify({ data: j.code === '0' ? j.data : [] }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } });
  } catch (e) { return new Response('{"data":[]}', { status: 502, headers: { 'Content-Type': 'application/json' } }); }
};
