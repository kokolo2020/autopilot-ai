// Autopilot core: paper trading decided by Claude, with news. Paper money only, no exchange keys.
export const SB_URL = 'https://seiqqvplosnwquaksshm.supabase.co';
export const START = 250, FEE = 0.00055, LEV = 5, COOLDOWN_MIN = 10, MODEL = 'claude-haiku-5-5';
// v1.13: top-20 universe (OKX USDT perpetuals). Contract sizes are read from OKX at run time; coins OKX does not list are dropped.
export const TOP_N = 50;
// market-cap order; extras at the end are spares, so 50 stay live if OKX lacks a few
export const TOP = ['BTC', 'ETH', 'XRP', 'BNB', 'SOL', 'DOGE', 'TRX', 'ADA', 'LINK', 'AVAX', 'SUI', 'XLM', 'BCH', 'HBAR', 'LTC', 'TON', 'DOT', 'UNI', 'AAVE', 'NEAR', 'SHIB', 'PEPE', 'ETC', 'APT', 'ARB', 'OP', 'ATOM', 'FIL', 'ICP', 'INJ', 'TAO', 'ONDO', 'POL', 'CRO', 'ALGO', 'VET', 'TIA', 'SEI', 'RENDER', 'WLD', 'FET', 'ENA', 'JUP', 'PENDLE', 'LDO', 'STX', 'IMX', 'GRT', 'CRV', 'MKR', 'XMR', 'ZEC', 'TRUMP', 'BONK', 'WIF', 'FLOKI'];
export const COINS = {};
/* Rev desks only rank the fixed top-50 list, never the dashboard watchlist or coins held open by other desks (stock and ETF perps, thin tokens). Batches 1 and 2 of Neutral Rev ran on this list. */
export const REV_UNI = new Set(TOP.slice(0, TOP_N));
/* 18 Oct reset: only the Rev family runs, $1,000 per strategy. Each leg is $100 margin (RM), 5 weakest long + 5 strongest short = 10 legs. Coins must also have at least REV_MIN_VOL USD of 24h volume. */
export const RM = 100, REV_MIN_VOL = 10e6;
export const revOk = (r) => REV_UNI.has(r.coin) && (r.vol_usd == null || r.vol_usd >= REV_MIN_VOL);
export const RETIRED = new Set(['ai', 'n', 's', 'u', 'm', 'g', 'algo', 'algo2', 'algo3', 'algoq', 'algow', 'algox', 'algot', 'algo3b', 'algo100', 'rev100', 'flip', 'revv', 'r3w', 'r3m', 'r3y',
  /* retired 21 Oct 2026 (Koko: trim to the desks worth a full 30 days): no new batches or resets; legs already open run to their normal close */
  'revs', 'rev2', 'revx', 'spm', 'r3d']); // rev2s and spl back on 22 Oct (in profit, Koko's call)
export const MAX_SPREAD_BPS = 12;
/* Four AI desks read the SAME Claude decision and differ only in how easily they act on it. Each has its own $250 per coin.
   Normal ':n', Aggressive '' (the original desk), Super ':s', Ultra ':u'. picks = how many of the biggest movers it may trade. */
export const MODES = [
  { id: 'n', suffix: ':n', name: 'Normal', gate: 0.55, cap: 5, picks: 4, minTp: 0.5 },
  { id: 'a', suffix: '', name: 'Aggressive', gate: 0.50, cap: 10, picks: 8, minTp: 0.35 },
  { id: 's', paused: true, suffix: ':s', name: 'Super', gate: 0.45, cap: 15, picks: 12, minTp: 0.3 },
  { id: 'u', paused: true, suffix: ':u', name: 'Ultra', gate: 0.40, cap: 25, picks: 16, minTp: 0.25 },
  // Maker: same calls as Aggressive but enters with a LIMIT order 0.10% better than the price, waits up to 10 minutes, pays maker fees (0.02%) on entry and on take profit
  { id: 'm', paused: true, suffix: ':m', name: 'Maker', gate: 0.50, cap: 10, picks: 8, minTp: 0.35, limit: true },
  // Gated AI: same calls as Aggressive, but SHORT calls are ignored unless 90%+ of coins are falling over 60 minutes (forward test of the Algo v3 gate on the AI)
  { id: 'g', suffix: ':g', name: 'Gated AI', gate: 0.50, cap: 10, picks: 8, minTp: 0.35, gateShort: true }
];
export const SHORT_GATE_BREADTH = 0.9;
/* v1.43: Rev 2 limit (:revm) also exits at the 20:00 close with a limit order (maker fee). Stops and resets stay market orders (taker). Rows closed before v1.43 keep the taker exit fee they were booked with. */
export const MAKER_FEE = 0.0002, LIMIT_OFF = 0.10, LIMIT_WAIT_MIN = 10, FILL_THROUGH = 0.0002;
export const PICKS = 16;
const modeOf = (key) => (/:m$/.test(key) ? 'm' : /:g$/.test(key) ? 'g' : /:n$/.test(key) ? 'n' : /:s$/.test(key) ? 's' : /:u$/.test(key) ? 'u' : key.includes(':') ? null : 'a');
export const decFor = (p) => (p >= 1000 ? 2 : p >= 10 ? 3 : p >= 1 ? 4 : 6);
let instAt = 0, INST = {};
export const _setInst = (x) => { INST = x; }; // test hook
/* Watchlist: the page appends a desk_events row (kind 'watchlist', data.list). The newest one wins. Always 50 live coins:
   invalid or unlisted entries are replaced by the next spare from TOP. Coins with open trades stay until the trade closes. */
async function loadInstruments(db) {
  if (Date.now() - instAt > 3600000) {
    const list = await okx('/api/v5/public/instruments?instType=SWAP'); INST = {};
    for (const i of list) INST[i.instId] = i; instAt = Date.now();
  }
  let want = TOP.slice();
  if (db) {
    try {
      const w = await db.select('desk_events', 'select=data&kind=eq.watchlist&order=ts.desc&limit=1');
      const l = w[0] && w[0].data && w[0].data.list;
      if (Array.isArray(l)) want = l.map((x) => String(x).toUpperCase().replace(/[^A-Z0-9]/g, '')).filter(Boolean);
    } catch (e) {}
  }
  const live = (x) => INST[x + '-USDT-SWAP'] && INST[x + '-USDT-SWAP'].state === 'live';
  const keep = []; for (const x of want.concat(TOP)) if (!keep.includes(x) && live(x) && keep.length < TOP_N) keep.push(x);
  let hold = [];
  if (db) { try { hold = (await db.select('ap_positions', 'select=coin&status=eq.open')).map((p) => p.coin.split(':')[0]); } catch (e) {} }
  for (const x of Object.keys(COINS)) delete COINS[x];
  for (const x of keep.concat(hold)) if (!COINS[x] && live(x)) { const i = INST[x + '-USDT-SWAP']; COINS[x] = { name: x, inst: x + '-USDT-SWAP', ct: +i.ctVal * (+i.ctMult || 1) || 1 }; }
}

/* ---------- Supabase (service key, server only) ---------- */
function sbHeaders(key, extra) {
  const h = { apikey: key, 'Content-Type': 'application/json' };
  if (key.startsWith('eyJ')) h.Authorization = 'Bearer ' + key;
  return Object.assign(h, extra || {});
}
/* Supabase returns at most 1000 rows per request, so page through bigger result sets. */
export async function selectAll(db, table, query) {
  let out = [];
  for (let off = 0; off < 20000; off += 1000) { const r = await db.select(table, query + '&limit=1000&offset=' + off); out = out.concat(r); if (r.length < 1000) break; }
  return out;
}
export function sb(key) {
  return {
    async select(table, query) {
      const r = await fetch(SB_URL + '/rest/v1/' + table + '?' + query, { headers: sbHeaders(key) });
      if (!r.ok) throw new Error('select ' + table + ' ' + r.status + ' ' + (await r.text()).slice(0, 120));
      return r.json();
    },
    async insert(table, row) {
      const r = await fetch(SB_URL + '/rest/v1/' + table, { method: 'POST', headers: sbHeaders(key, { Prefer: 'return=representation' }), body: JSON.stringify(row) });
      if (!r.ok) throw new Error('insert ' + table + ' ' + r.status + ' ' + (await r.text()).slice(0, 120));
      return (await r.json())[0];
    },
    async insertMany(table, rows) {
      if (!rows.length) return;
      const r = await fetch(SB_URL + '/rest/v1/' + table, { method: 'POST', headers: sbHeaders(key, { Prefer: 'return=minimal' }), body: JSON.stringify(rows) });
      if (!r.ok) throw new Error('insertMany ' + table + ' ' + r.status + ' ' + (await r.text()).slice(0, 120));
    },
    async upsert(table, rows, conflict) {
      if (!rows.length) return;
      const r = await fetch(SB_URL + '/rest/v1/' + table + '?on_conflict=' + conflict, { method: 'POST', headers: sbHeaders(key, { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(rows) });
      if (!r.ok) throw new Error('upsert ' + table + ' ' + r.status + ' ' + (await r.text()).slice(0, 120));
    },
    async del(table, query) {
      const r = await fetch(SB_URL + '/rest/v1/' + table + '?' + query, { method: 'DELETE', headers: sbHeaders(key, { Prefer: 'return=minimal' }) });
      if (!r.ok) throw new Error('delete ' + table + ' ' + r.status + ' ' + (await r.text()).slice(0, 120));
    },
    async update(table, query, patch) {
      const r = await fetch(SB_URL + '/rest/v1/' + table + '?' + query, { method: 'PATCH', headers: sbHeaders(key, { Prefer: 'return=minimal' }), body: JSON.stringify(patch) });
      if (!r.ok) throw new Error('update ' + table + ' ' + r.status + ' ' + (await r.text()).slice(0, 120));
    }
  };
}

/* ---------- Market data (OKX public API) ---------- */
async function okx(path) {
  const r = await fetch('https://www.okx.com' + path, { headers: { 'User-Agent': 'agent-desk-autopilot' } });
  if (!r.ok) throw new Error('okx ' + r.status);
  const j = await r.json();
  if (j.code !== '0') throw new Error('okx ' + j.code + ' ' + j.msg);
  return j.data;
}
export async function getMarket(coin) {
  const c = COINS[coin];
  const [cd, tk, fr, bk] = await Promise.all([
    okx('/api/v5/market/candles?instId=' + c.inst + '&bar=1m&limit=100'),
    okx('/api/v5/market/ticker?instId=' + c.inst),
    okx('/api/v5/public/funding-rate?instId=' + c.inst),
    okx('/api/v5/market/books?instId=' + c.inst + '&sz=20')
  ]);
  const candles = cd.map((k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] })).sort((a, b) => a.t - b.t);
  const t = tk[0], price = +t.last;
  const asks = bk[0].asks, bids = bk[0].bids;
  const spread = ((+asks[0][0] - +bids[0][0]) / price) * 1e4;
  const depth = asks.concat(bids).reduce((s, x) => s + +x[0] * +x[1] * c.ct, 0);
  const n = candles.length, ref = candles[Math.max(0, n - 7)].c;
  return {
    coin, price, candles,
    mom6m_pct: ((price - ref) / ref) * 100,
    change24h_pct: ((price - +t.open24h) / +t.open24h) * 100,
    funding_pct: +fr[0].fundingRate * 100,
    spread_bps: spread, book_depth_usd: depth
  };
}

/* ---------- Swing features (rallies and pullbacks) ---------- */
export function features(m) {
  const k = m.candles, n = k.length, p = m.price;
  const back = (mins) => k[Math.max(0, n - 1 - mins)].c;
  const ret = (mins) => ((p - back(mins)) / back(mins)) * 100;
  const w = k.slice(-60), hi = Math.max.apply(null, w.map((x) => x.h)), lo = Math.min.apply(null, w.map((x) => x.l));
  const rets = []; for (let i = n - 30; i < n; i++) if (i > 0) rets.push((k[i].c - k[i - 1].c) / k[i - 1].c * 100);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  return {
    ret_5m: ret(5), ret_15m: ret(15), ret_30m: ret(30), ret_60m: ret(60),
    pullback_pct: ((hi - p) / hi) * 100,   // how far below the 60m high we are
    bounce_pct: ((p - lo) / lo) * 100,     // how far above the 60m low we are
    range_60m: ((hi - lo) / lo) * 100,
    vol_1m: Math.sqrt(rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / rets.length)
  };
}
const r4 = (x) => +Number(x).toFixed(4);

/* ---------- Claude ---------- */
async function claude(key, body) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(Object.assign({ model: MODEL }, body))
  });
  if (!r.ok) throw new Error('anthropic ' + r.status + ' ' + (await r.text()).slice(0, 300));
  const j = await r.json();
  return (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}
function lastJson(text) {
  const e = text.lastIndexOf('}');
  if (e < 0) return null;
  for (let s = text.lastIndexOf('{', e); s >= 0; s = text.lastIndexOf('{', s - 1)) {
    try { return JSON.parse(text.slice(s, e + 1)); } catch (x) {}
  }
  return null;
}

/* ---------- News scan (runs every ~2h per coin) ---------- */
export async function newsJob(env, coin) {
  if (RETIRED.has('ai')) return { skipped: 'AI desks retired' };
  if (!env.SUPABASE_SERVICE_KEY || !env.ANTHROPIC_API_KEY) return { skipped: 'missing keys' };
  const db = sb(env.SUPABASE_SERVICE_KEY);
  await loadInstruments(db);
  await db.select('ap_news', 'select=id&limit=1'); // fails fast if tables are missing, before spending on Claude
  const c = COINS[coin];
  const text = await claude(env.ANTHROPIC_API_KEY, {
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
    system: 'You are the news analyst of a paper-trading desk. Search the web for NEWS FROM THE LAST 48 HOURS that could move the price of the coin: protocol announcements, tokenomics or emissions changes, ETF or listing news, partnerships, hacks or outages, regulation, big macro events. Ignore generic price-prediction articles. Be skeptical: many headlines are already priced in. Dates matter: use the date given in the question. If you name a scheduled event (CPI, Fed, ETF launch), give its exact date and say whether it has ALREADY happened as of now; never call a past event upcoming. If sources disagree on a figure or date, say so and use the more conservative reading. Finish with ONLY a JSON object: {"sentiment":"bullish"|"bearish"|"neutral","strength":0..1,"catalyst":"short label or none","summary":"max 350 chars, say what happened and when","sources":["url","url"]}',
    messages: [{ role: 'user', content: 'Coin: ' + c.name + ' (' + coin + '). Today is ' + new Date().toISOString().slice(0, 10) + '. What recent news matters for its price in the next few hours? Today is ' + new Date().toUTCString() + '.' }]
  });
  const j = lastJson(text) || { sentiment: 'neutral', strength: 0, catalyst: 'none', summary: 'could not parse news reply', sources: [] };
  const row = {
    coin, sentiment: ['bullish', 'bearish', 'neutral'].includes(j.sentiment) ? j.sentiment : 'neutral',
    strength: Math.max(0, Math.min(1, Number(j.strength) || 0)),
    catalyst: String(j.catalyst || 'none').slice(0, 80), summary: String(j.summary || '').slice(0, 500),
    sources: Array.isArray(j.sources) ? j.sources.slice(0, 4) : []
  };
  await db.insert('ap_news', row);
  return row;
}

/* ---------- Decision loop (runs every 5 min) ---------- */
/* Funding paid or received by a Rev 3 position while it was open: every settlement between open and close, rate x notional, longs pay when the rate is positive. Booked into pnl when the position closes (no schema change), and noted in close_reason. */
/* Funding for one perpetual position: sum of OKX settlements (realized rate) after it opened and up to its close; a long pays when the rate is positive, a short receives.
   Since v1.48 this is booked for EVERY perpetual desk (not only Rev 3 and My picks). Settlement history is fetched once per coin per tick and reused (FUND_CACHE), extra pages only for long holds. */
const FUND_CACHE = new Map();
async function fundHist(sym, t0) {
  const hit = FUND_CACHE.get(sym);
  if (hit && Date.now() - hit.at < 120000 && (hit.complete || hit.oldest <= t0)) return hit.rows;
  let after = '', rows = [], complete = false;
  for (let i = 0; i < 12; i++) {
    const url = '/api/v5/public/funding-rate-history?instId=' + sym + '&limit=100' + (after ? '&after=' + after : '');
    const h = await okx(url).catch(async (e) => { if (/51001|doesn't exist|does not exist/i.test(String(e.message))) return []; await new Promise((r) => setTimeout(r, 400)); return okx(url); }); // one retry (rate limit), none for coins without a perpetual
    if (!h || !h.length) { complete = true; break; }
    rows = rows.concat(h); const oldest = +h[h.length - 1].fundingTime;
    if (h.length < 100) { complete = true; break; } if (oldest <= t0) break; after = h[h.length - 1].fundingTime;
  }
  FUND_CACHE.set(sym, { at: Date.now(), rows, complete, oldest: rows.length ? +rows[rows.length - 1].fundingTime : Infinity });
  return rows;
}
export async function rev3Funding(p, endMs = Date.now()) {
  const t0 = new Date(p.opened_at).getTime(), sym = p.coin.split(':')[0] + '-USDT-SWAP', dir = p.side === 'LONG' ? 1 : -1; let sum = 0;
  for (const x of await fundHist(sym, t0)) { const t = +x.fundingTime, rate = x.realizedRate != null && x.realizedRate !== '' ? +x.realizedRate : +x.fundingRate; if (t > t0 && t <= endMs && isFinite(rate)) sum -= dir * +p.notional * rate; }
  return sum;
}
export const perpFunded = (coin) => coin.includes(':') && !/:(sp[lm])$/.test(coin);
/* warm the funding cache in parallel (8 at a time) for every perpetual leg that is due to close, so the 07:00 close does not fetch ~50 coins one by one */
export async function prefetchFunding(rows, now = Date.now()) {
  const due = {}; for (const p of rows) if (perpFunded(p.coin) && p.opened_at && p.max_hold_until && new Date(p.max_hold_until).getTime() <= now + 60000) { const sym = p.coin.split(':')[0] + '-USDT-SWAP', t0 = new Date(p.opened_at).getTime(); due[sym] = Math.min(due[sym] ?? Infinity, t0); }
  const list = Object.entries(due);
  for (let i = 0; i < list.length; i += 8) await Promise.all(list.slice(i, i + 8).map(([sym, t0]) => fundHist(sym, t0).catch(() => null)));
  return list.length;
}
/* Non-perpetual paper desks. Spot: taker 0.10% per side, no leverage, no funding. Spot margin short: the coin is borrowed, so the short leg also pays borrow interest (ASSUMED 0.03% per day; OKX's real rate varies by coin and day). Prices come from the perpetual mid, so the spot/perp basis is ignored. */
export const SPOT = { fee: 0.001, borrowPerDay: 0.0003, longLeg: 200, pairLeg: 100 };
export const spotFees = (p, endMs) => +p.notional * SPOT.fee * 2 + (/:spm$/.test(p.coin) && p.side === 'SHORT' ? +p.notional * SPOT.borrowPerDay * Math.max(0, (endMs - new Date(p.opened_at).getTime()) / 864e5) : 0);
const closePos = async (db, p, exit, why) => {
  const dir = p.side === 'LONG' ? 1 : -1;
  const funding = perpFunded(p.coin) && p.opened_at ? await rev3Funding(p).catch(() => 0) : 0;
  const fees = /:sp[lm]$/.test(p.coin) ? spotFees(p, Date.now()) : /:revm$/.test(p.coin) ? p.notional * ((Math.abs(+p.notional - RM * REV2.lev0) < 1e-6 ? MAKER_FEE : FEE) + (String(why) === 'time exit' ? MAKER_FEE : FEE)) : /:m$/.test(p.coin) ? p.notional * (MAKER_FEE + (String(why).startsWith('take profit') ? MAKER_FEE : FEE)) : p.notional * FEE * 2, pnl = p.notional * (dir * (exit - p.entry_price)) / p.entry_price - fees + funding;
  await db.update('ap_positions', 'id=eq.' + p.id, { status: 'closed', exit_price: exit, closed_at: new Date().toISOString(), pnl, fees, close_reason: funding ? why + ' | funding ' + (funding >= 0 ? '+' : '') + funding.toFixed(2) : why });
  return pnl;
};

async function manageOpen(db, p, m) {
  const t0 = new Date(p.opened_at).getTime(), tp = +p.tp, sl = +p.sl;
  for (const k of m.candles.filter((x) => x.t >= t0 - 60000)) {
    const long = p.side === 'LONG';
    const hitSl = long ? k.l <= sl : k.h >= sl, hitTp = long ? k.h >= tp : k.l <= tp;
    if (hitSl) return { closed: true, why: 'stop hit', pnl: await closePos(db, p, sl, 'stop hit') }; // stop first if both in one candle
    if (hitTp) return { closed: true, why: 'take profit hit', pnl: await closePos(db, p, tp, 'take profit hit') };
  }
  if (Date.now() >= new Date(p.max_hold_until).getTime()) return { closed: true, why: 'time exit', pnl: await closePos(db, p, m.price, 'time exit') };
  return { closed: false };
}

async function backfillOutcomes(db, coin, m) {
  const rows = await db.select('ap_decisions', 'select=id,ts,price&coin=eq.' + coin + '&outcome_price=is.null&ts=lt.' + new Date(Date.now() - 15 * 60000).toISOString() + '&ts=gt.' + new Date(Date.now() - 90 * 60000).toISOString());
  for (const d of rows) {
    const target = new Date(d.ts).getTime() + 15 * 60000;
    const k = m.candles.reduce((b, x) => (Math.abs(x.t - target) < Math.abs(b.t - target) ? x : b), m.candles[0]);
    await db.update('ap_decisions', 'id=eq.' + d.id, { outcome_price: k.c, outcome_at: new Date(k.t).toISOString() });
  }
}

async function backfillSamples(db, coin, m) {
  const at = (ts, mins) => { const target = new Date(ts).getTime() + mins * 60000; return m.candles.reduce((b, x) => (Math.abs(x.t - target) < Math.abs(b.t - target) ? x : b), m.candles[0]); };
  const a = await db.select('ap_samples', 'select=id,ts,price&coin=eq.' + coin + '&fwd_15m=is.null&ts=lt.' + new Date(Date.now() - 16 * 60000).toISOString() + '&ts=gt.' + new Date(Date.now() - 95 * 60000).toISOString());
  for (const x of a) await db.update('ap_samples', 'id=eq.' + x.id, { fwd_15m: r4(((at(x.ts, 15).c - +x.price) / +x.price) * 100) });
  const b = await db.select('ap_samples', 'select=id,ts,price&coin=eq.' + coin + '&fwd_60m=is.null&ts=lt.' + new Date(Date.now() - 61 * 60000).toISOString() + '&ts=gt.' + new Date(Date.now() - 98 * 60000).toISOString());
  for (const x of b) await db.update('ap_samples', 'id=eq.' + x.id, { fwd_60m: r4(((at(x.ts, 60).c - +x.price) / +x.price) * 100) });
}

const SYSTEM = 'You are CHIEF of an autonomous PAPER trading desk covering the top 50 coins (at most 10 open trades at once; 5x leverage, $250 bank per coin; a rule-based algo desk trades the same coins beside you and you are being compared with it). Round-trip taker fees are 0.11%, so a trade must have a realistic expected move of at least 0.35% to be worth it. You are in AGGRESSIVE mode: the owner wants more trades, so act on good-enough setups instead of waiting for perfect ones. Think in this order and let it show in your reason: (1) REGIME: use market_context (breadth of the top 20, BTC trend) to say whether this is a trend, a range or an event-driven chop; (2) EDGE: is this coin stronger or weaker than BTC (this_coin_vs_btc_60m_pct) and is that move continuing or exhausted; (3) CATALYST: only count news that is under 6 hours old, is not already priced in, and whose scheduled event has not already happened; (4) COST: expected move vs the 0.11% fee and the spread; (5) TRACK RECORD: desk_track_record and recent_decisions show what has worked, so do not repeat a losing pattern. Take a trade whenever one side has a clear edge (momentum continuing with BTC, or an exhausted spike worth fading); PASS only when there is truly no edge or the move already ran. Never chase a move that already ran more than 2.5x the coin\'s normal 15 minute range. Confidence means your honest probability that the trade reaches take profit before the stop: use 0.5 for a coin flip, 0.55+ when two of regime, edge and catalyst agree. You choose the exit plan: tp_pct (0.35 to 3), sl_pct (0.25 to 1.5), hold_min (15 to 360); tp_pct must be at least 1.2x sl_pct. Reply with ONLY JSON: {"action":"LONG"|"SHORT"|"PASS","confidence":0..1,"reason":"max 260 chars: regime, edge, catalyst, cost, in that order","tp_pct":number,"sl_pct":number,"hold_min":number}';

export async function tick(env, coin, shared) {
  shared = shared || { modes: { n: { n: 5 }, a: { n: 10 }, s: { n: 15 }, u: { n: 25 }, m: { n: 10 }, g: { n: 10 } }, rank: {}, breadth: 0 };
  const rank = shared.rank && shared.rank[coin] != null ? shared.rank[coin] : 99;
  if (!env.SUPABASE_SERVICE_KEY || !env.ANTHROPIC_API_KEY) return { skipped: 'missing keys' };
  const db = sb(env.SUPABASE_SERVICE_KEY);
  const m = await getMarket(coin);
  const out = { coin, price: m.price };
  const closedAll = await db.select('ap_positions', 'select=pnl,closed_at,side,close_reason,decision_id&coin=eq.' + coin + '&status=eq.closed&order=closed_at.desc&limit=200');
  const bank = START + closedAll.reduce((s, x) => s + +x.pnl, 0);
  out.bank = +bank.toFixed(2);

  const F = features(m);
  const open = (await db.select('ap_positions', 'select=*&coin=eq.' + coin + '&status=eq.open&limit=1'))[0];
  if (open) {
    const r = await manageOpen(db, open, m);
    out.managed = r.closed ? 'closed ' + r.pnl.toFixed(2) : 'holding';
    if (!r.closed) return out;
    out.bank = +(bank + r.pnl).toFixed(2);
    return out; // cooldown starts now
  }
  if (m.spread_bps > MAX_SPREAD_BPS) { out.skip = 'spread too wide ' + m.spread_bps.toFixed(1) + 'bps'; return out; }
  // which desks could act on a decision for this coin right now
  const mir = await db.select('ap_positions', 'select=coin,pnl,closed_at,status&or=(coin.eq.' + coin + ':n,coin.eq.' + coin + ':s,coin.eq.' + coin + ':u,coin.eq.' + coin + ':m,coin.eq.' + coin + ':g)&order=closed_at.desc.nullsfirst&limit=400').catch(() => []);
  const elig = {};
  for (const md of MODES) {
    const key = coin + md.suffix, rows = md.id === 'a' ? closedAll : mir.filter((x) => x.coin === key && x.status === 'closed'), hasOpen = md.id !== 'a' && mir.some((x) => x.coin === key && (x.status === 'open' || x.status === 'pending'));
    const bk = START + rows.reduce((q, x) => q + +x.pnl, 0), last = rows[0] && rows[0].closed_at;
    elig[md.id] = { bank: bk, ok: !md.paused && rank < md.picks && shared.modes[md.id].n > 0 && !hasOpen && bk >= 20 && !(last && Date.now() - new Date(last).getTime() < COOLDOWN_MIN * 60000) };
  }
  if (!MODES.some((md) => elig[md.id].ok)) { out.skip = 'no desk can trade this coin now'; return out; }

  const news = (await db.select('ap_news', 'select=*&coin=eq.' + coin + '&order=ts.desc&limit=1'))[0];
  const newsAgeH = news ? (Date.now() - new Date(news.ts).getTime()) / 3600000 : 99;
  const newsHot = news && newsAgeH < 3 && news.sentiment !== 'neutral' && +news.strength >= 0.4; // v1.12: only decides whether Claude is asked in a quiet market
  if (Math.abs(m.mom6m_pct) < 0.10 && !newsHot) { out.skip = 'quiet market, no hot news'; return out; }
  const lastDec = (await db.select('ap_decisions', 'select=ts&coin=eq.' + coin + '&order=ts.desc&limit=1'))[0];
  if (lastDec && Date.now() - new Date(lastDec.ts).getTime() < 4 * 60000) { out.skip = 'asked recently'; return out; }

  const hist = await db.select('ap_decisions', 'select=ts,action,confidence,reason,price,outcome_price,taken&coin=eq.' + coin + '&order=ts.desc&limit=8');
  const trades = await db.select('ap_positions', 'select=side,pnl,close_reason,opened_at&coin=eq.' + coin + '&status=eq.closed&order=closed_at.desc&limit=6');
  const ctx = {
    coin, now: new Date().toISOString(), bank: +bank.toFixed(2),
    market_context: shared.mkt ? Object.assign({}, shared.mkt, { this_coin_vs_btc_60m_pct: shared.btc60 == null ? null : r4(F.ret_60m - shared.btc60) }) : null,
    desk_track_record: shared.track || null,
    market: { price: m.price, mom6m_pct: +m.mom6m_pct.toFixed(3), change24h_pct: +m.change24h_pct.toFixed(2), funding_pct: +m.funding_pct.toFixed(4), spread_bps: +m.spread_bps.toFixed(2), book_depth_usd: Math.round(m.book_depth_usd), swings: { ret_15m_pct: r4(F.ret_15m), ret_30m_pct: r4(F.ret_30m), ret_60m_pct: r4(F.ret_60m), pullback_from_60m_high_pct: r4(F.pullback_pct), bounce_from_60m_low_pct: r4(F.bounce_pct), range_60m_pct: r4(F.range_60m), vol_1m_pct: r4(F.vol_1m) }, closes_1m_last30: m.candles.slice(-30).map((k) => k.c) },
    news: news && newsAgeH < 6 ? { age_hours: +newsAgeH.toFixed(1), sentiment: news.sentiment, strength: +news.strength, catalyst: news.catalyst, summary: news.summary } : (news ? 'last news scan is over 6 hours old, ignore it' : 'no news scan yet'),
    recent_decisions: hist.map((d) => ({ minutes_ago: Math.round((Date.now() - new Date(d.ts).getTime()) / 60000), action: d.action, confidence: +d.confidence, taken: d.taken, move_after_15m_pct: d.outcome_price ? +(((+d.outcome_price - +d.price) / +d.price) * 100).toFixed(3) : null, reason: String(d.reason || '').slice(0, 120) })),
    recent_closed_trades: trades.map((x) => ({ side: x.side, pnl: +(+x.pnl).toFixed(2), exit: x.close_reason }))
  };
  const text = await claude(env.ANTHROPIC_API_KEY, { max_tokens: 1500, system: SYSTEM, messages: [{ role: 'user', content: JSON.stringify(ctx) }] });
  const j = lastJson(text) || { action: 'PASS', confidence: 0, reason: 'could not parse model reply' };
  const action = ['LONG', 'SHORT', 'PASS'].includes(String(j.action).toUpperCase()) ? String(j.action).toUpperCase() : 'PASS';
  let tpP = Math.max(0.35, Math.min(3, Number(j.tp_pct) || 0.8)), slP = Math.max(0.25, Math.min(1.5, Number(j.sl_pct) || 0.4));
  if (tpP < slP * 1.2) tpP = +(slP * 1.2).toFixed(2);
  const hold = Math.max(15, Math.min(360, Number(j.hold_min) || 60));
  const conf = Math.max(0, Math.min(1, Number(j.confidence) || 0));
  const go = action !== 'PASS' && conf >= 0.5 && elig.a.ok;
  const dec = await db.insert('ap_decisions', { coin, action, confidence: conf, reason: String(j.reason || '').slice(0, 340), price: m.price, formula_mom: +m.mom6m_pct.toFixed(3), news_summary: news ? (news.catalyst + ': ' + news.summary).slice(0, 300) : null, tp_pct: tpP, sl_pct: slP, hold_min: hold, taken: go });
  out.decision = action + ' ' + conf.toFixed(2);
  const opened = [];
  if (action !== 'PASS') for (const md of MODES) {
    if (!elig[md.id].ok || conf < md.gate) continue;
    if (ctlBlocks(shared.ctl, md.id === 'a' ? 'ai' : md.id, coin)) { opened.push(md.id + '(paused)'); continue; }
    if (md.gateShort && action === 'SHORT' && !(shared.breadth >= SHORT_GATE_BREADTH)) { opened.push(md.id + '(short blocked)'); continue; }
    const tpM = Math.max(md.minTp, tpP), dir = action === 'LONG' ? 1 : -1, bk = elig[md.id].bank, notional = bk * LEV, d = decFor(m.price) + 2;
    shared.modes[md.id].n--;
    if (md.limit) {
      const lp = +(m.price * (1 - dir * LIMIT_OFF / 100)).toFixed(d), nm = bk * LEV;
      await db.insert('ap_positions', { coin: coin + md.suffix, side: action, status: 'pending', entry_price: lp, size: nm / lp, notional: nm, tp: +(lp * (1 + dir * tpM / 100)).toFixed(d), sl: +(lp * (1 - dir * slP / 100)).toFixed(d), max_hold_until: new Date(Date.now() + hold * 60000).toISOString(), decision_id: dec.id });
      opened.push(md.id + '(limit)'); continue;
    }
    await db.insert('ap_positions', { coin: coin + md.suffix, side: action, entry_price: m.price, size: notional / m.price, notional, tp: +(m.price * (1 + dir * tpM / 100)).toFixed(d), sl: +(m.price * (1 - dir * slP / 100)).toFixed(d), max_hold_until: new Date(Date.now() + hold * 60000).toISOString(), decision_id: dec.id });
    opened.push(md.id);
  }
  if (opened.length) out.opened = action + ' on ' + opened.join(',');
  return out;
}

/* ---------- Scanner over the top 20 (v1.13) ---------- */
async function scanCoin(coin, tk, instId) {
  const cd = await okx('/api/v5/market/candles?instId=' + (instId || COINS[coin].inst) + '&bar=1m&limit=100');
  const candles = cd.map((k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] })).sort((a, b) => a.t - b.t);
  if (candles.length < 61) throw new Error('few candles');
  const price = +tk.last, n = candles.length, ref = candles[n - 7].c;
  const m = { coin, price, candles, mom6m_pct: ((price - ref) / ref) * 100, change24h_pct: ((price - +tk.open24h) / +tk.open24h) * 100 };
  const F = features(m);
  const z = Math.abs(m.mom6m_pct) / (F.vol_1m * Math.sqrt(6) + 0.01); // move size relative to this coin's own noise
  return { coin, m, F, z, vol_usd: +tk.volCcy24h > 0 ? +tk.volCcy24h * price : null, spread_bps: tk.bidPx && tk.askPx ? ((+tk.askPx - +tk.bidPx) / price) * 1e4 : null };
}

export async function scanAll(env) {
  const db = sb(env.SUPABASE_SERVICE_KEY);
  await loadInstruments(db);
  const tks = {}; for (const t of await okx('/api/v5/market/tickers?instType=SWAP')) tks[t.instId] = t;
  const coins = Object.keys(COINS).filter((s) => tks[COINS[s].inst]), rows = [];
  for (let i = 0; i < coins.length; i += 10) {
    const part = await Promise.all(coins.slice(i, i + 10).map((s) => scanCoin(s, tks[COINS[s].inst]).catch(() => null)));
    for (const r of part) if (r) rows.push(r);
    if (i + 10 < coins.length) await new Promise((r) => setTimeout(r, 600));
  }
  const byCoin = {}; for (const r of rows) byCoin[r.coin] = r;
  // one snapshot row per coin, for pattern mining
  await db.insertMany('ap_samples', rows.map((r) => ({ coin: r.coin, price: r.m.price, ret_5m: r4(r.F.ret_5m), ret_15m: r4(r.F.ret_15m), ret_30m: r4(r.F.ret_30m), ret_60m: r4(r.F.ret_60m), pullback_pct: r4(r.F.pullback_pct), bounce_pct: r4(r.F.bounce_pct), range_60m: r4(r.F.range_60m), vol_1m: r4(r.F.vol_1m), change24h: r4(r.m.change24h_pct), spread_bps: r.spread_bps == null ? null : r4(r.spread_bps) }))).catch(() => {});
  const at = (cd, ts, mins) => { const target = new Date(ts).getTime() + mins * 60000; return cd.reduce((b, x) => (Math.abs(x.t - target) < Math.abs(b.t - target) ? x : b), cd[0]); };
  const iso = (ms) => new Date(Date.now() - ms).toISOString();
  const decs = await db.select('ap_decisions', 'select=id,ts,price,coin&outcome_price=is.null&ts=lt.' + iso(15 * 60000) + '&ts=gt.' + iso(90 * 60000)).catch(() => []);
  for (const d of decs) { const r = byCoin[d.coin]; if (!r) continue; const k = at(r.m.candles, d.ts, 15); await db.update('ap_decisions', 'id=eq.' + d.id, { outcome_price: k.c, outcome_at: new Date(k.t).toISOString() }).catch(() => {}); }
  const s15 = await db.select('ap_samples', 'select=id,ts,price,coin&fwd_15m=is.null&ts=lt.' + iso(16 * 60000) + '&ts=gt.' + iso(95 * 60000)).catch(() => []);
  await Promise.all(s15.map(async (x) => { const r = byCoin[x.coin]; if (r) await db.update('ap_samples', 'id=eq.' + x.id, { fwd_15m: r4(((at(r.m.candles, x.ts, 15).c - +x.price) / +x.price) * 100) }).catch(() => {}); }));
  const s60 = await db.select('ap_samples', 'select=id,ts,price,coin&fwd_60m=is.null&ts=lt.' + iso(61 * 60000) + '&ts=gt.' + iso(98 * 60000)).catch(() => []);
  await Promise.all(s60.map(async (x) => { const r = byCoin[x.coin]; if (r) await db.update('ap_samples', 'id=eq.' + x.id, { fwd_60m: r4(((at(r.m.candles, x.ts, 60).c - +x.price) / +x.price) * 100) }).catch(() => {}); }));
  return { rows, db };
}

/* ---------- Maker desk: a resting limit order. It fills only when price trades THROUGH the limit (by 0.02%), which is stricter than touching it. Unfilled orders are cancelled after 10 minutes. ---------- */
async function limitTick(db, p, m) {
  const created = new Date(p.opened_at).getTime(), long = p.side === 'LONG', lim = +p.entry_price;
  for (const k of m.candles.filter((x) => x.t >= Math.floor(created / 60000) * 60000 + 60000)) {
    if (long ? k.l < lim * (1 - FILL_THROUGH) : k.h > lim * (1 + FILL_THROUGH)) {
      const hold = new Date(p.max_hold_until).getTime() - created, at = k.t + 60000;
      await db.update('ap_positions', 'id=eq.' + p.id, { status: 'open', opened_at: new Date(at).toISOString(), max_hold_until: /:revm$/.test(p.coin) ? p.max_hold_until : new Date(at + hold).toISOString() }); // Rev 2 limit keeps the 20:00 Bangkok close
      return 'filled';
    }
  }
  if (Date.now() - created > LIMIT_WAIT_MIN * 60000) { await db.update('ap_positions', 'id=eq.' + p.id, { status: 'cancelled', close_reason: 'limit not filled in ' + LIMIT_WAIT_MIN + ' min' }); return 'cancelled'; }
  return 'waiting';
}

/* ---------- Control: settings row kept in ap_news with coin 'CONTROL' (no schema change). Edited only through netlify/functions/control.mjs after a PIN check. ---------- */
export const CTL_DEFAULT = { paused: false, off: {}, coinsOff: {}, lossLimit: 0, fails: [], updated: null };
export async function loadControl(db) {
  const r = (await db.select('ap_news', 'select=id,summary&coin=eq.CONTROL&limit=1').catch(() => []))[0];
  let body = {}; try { body = r ? JSON.parse(r.summary) : {}; } catch (e) { body = {}; }
  return { ...CTL_DEFAULT, ...body, auto: {}, _id: r && r.id };
}
export async function saveControl(db, ctl) {
  const body = { paused: !!ctl.paused, off: ctl.off || {}, coinsOff: ctl.coinsOff || {}, lossLimit: +ctl.lossLimit || 0, fails: ctl.fails || [], updated: ctl.updated || null };
  if (ctl._id) await db.update('ap_news', 'id=eq.' + ctl._id, { summary: JSON.stringify(body) });
  else await db.insert('ap_news', { coin: 'CONTROL', catalyst: 'control settings', sentiment: 'neutral', strength: 0, summary: JSON.stringify(body), sources: [] });
}
export const ctlBlocks = (ctl, desk, coin) => RETIRED.has(desk) || !!(ctl && (ctl.paused || (ctl.off && ctl.off[desk]) || (ctl.auto && ctl.auto[desk]) || (ctl.coinsOff && ctl.coinsOff[coin])));
export async function autoPaused(db, limit) {
  const a = {}; if (!(limit > 0)) return a;
  const since = new Date(Date.now() - 86400000).toISOString(), sum = {};
  for (let off = 0; off < 5000; off += 1000) {
    const rows = await db.select('ap_positions', 'select=coin,pnl&status=eq.closed&closed_at=gte.' + since + '&order=id.asc&limit=1000&offset=' + off).catch(() => []);
    for (const x of rows) { const k = x.coin.includes(':') ? x.coin.split(':')[1] : 'ai'; sum[k] = (sum[k] || 0) + +x.pnl; }
    if (rows.length < 1000) break;
  }
  for (const k in sum) if (sum[k] <= -limit) a[k] = true;
  return a;
}

/* ---------- Algo desk: plain rules, no AI, $250 per coin, stored as coin 'XXX:algo' ---------- */
export const ALGO = { rmin: 0.012, dev: 0.0035, tp: 0.6, sl: 0.6, holdMin: 30, cooldownMin: 10 };
export function algoSignal(m) {
  const k = m.candles, n = k.length, p = m.price;
  let hi = -1e18, lo = 1e18, sum = 0, i;
  for (i = n - 30; i < n; i++) { hi = Math.max(hi, k[i].h); lo = Math.min(lo, k[i].l); }
  for (i = n - 20; i < n; i++) sum += k[i].c;
  const mean = sum / 20, dev = (p - mean) / mean, range = (hi - lo) / p;
  const net30 = Math.abs(k[n - 5].c - k[n - 30].c) / p, net60 = Math.abs(k[n - 5].c - k[n - 60].c) / p, s60 = (k[n - 1].c - k[n - 60].c) / p;
  if (range < ALGO.rmin) return { why: 'range too quiet' };
  if (net30 > 0.4 * range || net60 >= 0.01) return { why: 'trending, not a range' };
  if (Math.abs(dev) < ALGO.dev) return { why: 'not stretched' };
  const side = dev < 0 ? 'LONG' : 'SHORT';
  if ((side === 'LONG' && s60 <= -0.005) || (side === 'SHORT' && s60 >= 0.005)) return { why: 'not fighting the 60m move' };
  let m3 = side === 'LONG' ? 1e18 : -1e18;
  for (i = n - 4; i <= n - 2; i++) m3 = side === 'LONG' ? Math.min(m3, k[i].c) : Math.max(m3, k[i].c);
  if (!(side === 'LONG' ? p >= m3 * 1.0003 : p <= m3 * 0.9997)) return { why: 'no turn yet' };
  return { side };
}
/* Algo v2 (found in the 14 Oct snapshot analysis): SHORT after a 1.5%+ bounce off the 60m low while the last 5 minutes are still rising. Forward test only. */
export const bounceFade = (r) => (r.F.bounce_pct >= 1.5 && r.F.ret_5m > 0 ? { side: 'SHORT' } : { why: 'no bounce to fade' });
export const QUIET_HOURS_UTC = [11, 12, 13, 20, 21];
export const ALGO3 = { tp: 2, sl: 1, holdMin: 120, cooldownMin: 15, breadth: 0.9 };
/* Crash Shorter+ (:algo3b): Algo v3 with the market gate relaxed from 90% to 80% of coins down, so it trades more often. Everything else identical. */
export const ALGO3B = { ...ALGO3, breadth: 0.8 };
/* Wild desks: Algo entry rules, wider take-profit, same 0.6% stop. :algow = 1.2% TP / 60 min, :algox (extra wild) = 3% TP / 4 h. Forward test. */
export const ALGOW = { tp: 1.2, sl: 0.6, holdMin: 60, cooldownMin: 10 }, ALGOX = { tp: 3, sl: 0.6, holdMin: 240, cooldownMin: 10 };
/* Algo Top10 (:algot): Algo rules on the 10 coins with 5+ trades and best P/L in the first 40 h (AAVE TIA ICP ZEC ENA APT ARB OP ONDO DOT). Picked in hindsight, so this is a forward test of whether the pick holds. */
/* 16 Oct: Koko narrowed Algo, Wild, Extra-wild and Quiet-hours to 40 coins by dropping the 10 most volatile/thin ones. Open trades on these coins are still managed to their exit. */
export const ALGO_SKIP = ['PEPE', 'SHIB', 'BONK', 'WIF', 'FLOKI', 'TRUMP', 'SEI', 'JUP', 'PENDLE', 'GRT'];
export const ALGOT_COINS = ['AAVE', 'TIA', 'ICP', 'ZEC', 'ENA', 'APT', 'ARB', 'OP', 'ONDO', 'DOT'];
/* Neutral Reversal 2 (:rev2, market orders) and its limit-order twin (:revm). Same ranking as :rev (long the 8 weakest, short the 8 strongest by 24h change, one batch per 24h, 24h hold, no take profit).
   Differences: leg 1 opens at 4x with a 10% stop (15% before v1.27). When the stop hits, the loss is booked and the SAME side reopens at the market price one leverage step higher (5x, 6x, 7x) with the same batch deadline.
   After the stop at 7x the leg is done (3 resets max). Every entry is a fresh $250 margin, so one leg can commit up to $1,000 margin and book up to roughly $825 of losses.
   The stop is kept just inside liquidation (1/lev minus 1%), so at 7x it would be 13.3%, which the 10% stop never reaches (a real 7x position is liquidated near 14.3%). :revm places leg 1 as a limit order 0.10% better, waits 10 minutes, pays maker fee on that entry; from v1.43 it also exits at the 20:00 close as a limit order (maker fee, filled at the close price); stops and resets are market orders. Forward test. */
/* All Rev-family batches close at 20:00 Bangkok (13:00 UTC) every day and the next batch opens right after. The first batch after a reset is shorter. */
export const CLOSE_UTC_H = 0; // 07:00 Bangkok since v1.44 (was 13 = 20:00 Bangkok)
/* Daily desks whose batch deadline follows the daily close. When the close time moves, open legs with a later deadline are pulled in to the next close (pullDeadlines). Weekly/monthly/yearly desks and My picks are not touched. */
export const DAILY_DESK_RE = /:(rev|rev2|revm|rev2s|revs|revx|flip|revv|caprev|spl|spm|r3d|r3l)$/;
export async function pullDeadlines(db, rows, now = Date.now()) {
  const nc = nextClose(now), out = [];
  for (const p of rows) if (DAILY_DESK_RE.test(p.coin) && p.max_hold_until && new Date(p.max_hold_until).getTime() > nc + 60000) { p.max_hold_until = new Date(nc).toISOString(); await db.update('ap_positions', 'id=eq.' + p.id, { max_hold_until: p.max_hold_until }); out.push(p.coin); }
  return out;
}
export const boundaryAt = (now) => { const d = new Date(now); let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), CLOSE_UTC_H); if (t > now) t -= 86400000; return t; }; // latest 20:00 Bangkok at or before now
export const nextClose = (now, days = 1) => boundaryAt(now) + days * 86400000;
export const batchDue = (last, now, days = 1) => !last || new Date(last.opened_at).getTime() < boundaryAt(now) - (days - 1) * 86400000;
export const REV2 = { K: 5, holdH: 24, lev0: 4, levMax: 7, stopPct: 0.10 }; // stop was 15% until v1.27; a back-test on 43 batches found 10% earned more with a smaller worst batch
const rev2Lev = (p) => (/^so-w:/.test(p.close_reason || '') ? +p.close_reason.split(':')[2] : Math.round(+p.notional / RM)), rev2Stop = (lev) => Math.min(REV2.stopPct, 1 / lev - 0.01);
/* :rev2s Rev 2 + winner scale-out (paper). Rev 2 exactly as it is (4x, 10% price stop, reopens 5x/6x/7x on a stop), plus the winner exit from the scale-out desk: when a leg reaches +7% of its $100 margin, sell half; the other half closes at +10% or when it falls back to +5%. Losers are left to Rev 2's own stop and reset logic. */
export async function rev2WinnerOut(db, p, m) {
  const dir = p.side === 'LONG' ? 1 : -1, e = +p.entry_price, lev = rev2Lev(p), d = decFor(e) + 2, L = (f) => +(e * (1 + dir * f / lev)).toFixed(d), adv = (k, lv) => (dir > 0 ? k.l <= lv : k.h >= lv), fav = (k, lv) => (dir > 0 ? k.h >= lv : k.l <= lv);
  let half = /^so-w:/.test(p.close_reason || ''), since = half ? +p.close_reason.split(':')[1] : 0;
  for (const k of m.candles.filter((x) => x.t >= new Date(p.opened_at).getTime() - 60000)) {
    if (!half) {
      if (adv(k, +p.sl)) break; // Rev 2's own stop decides
      if (fav(k, L(SCALE.w1))) { await scSplit(db, p, +p.notional / 2, L(SCALE.w1), 'scale-out +7%'); p.close_reason = 'so-w:' + k.t + ':' + lev; p.tp = L(SCALE.w2); p.sl = L(SCALE.wBack); await db.update('ap_positions', 'id=eq.' + p.id, { close_reason: p.close_reason, tp: p.tp, sl: p.sl }); half = true; since = k.t; }
    } else if (k.t > since) {
      if (adv(k, L(SCALE.wBack))) return { half, closed: true, why: 'scale-out back to +5%', pnl: await closePos(db, p, L(SCALE.wBack), 'scale-out back to +5%') };
      if (fav(k, L(SCALE.w2))) return { half, closed: true, why: 'scale-out +10%', pnl: await closePos(db, p, L(SCALE.w2), 'scale-out +10%') };
    }
  }
  if (half && Date.now() >= new Date(p.max_hold_until).getTime()) return { half, closed: true, why: 'time exit', pnl: await closePos(db, p, m.price, 'time exit') };
  return { half, closed: false };
}

async function rev2Tick(db, rows, openPos, ctl, desk) {
  const sfx = ':' + desk, limit = desk === 'revm', out = [], lev0N = RM * REV2.lev0;
  for (const p of openPos) {
    const base = p.coin.split(':')[0], r = rows.find((x) => x.coin === base); if (!r) continue;
    let x = null;
    if (desk === 'rev2s') { const w = await rev2WinnerOut(db, p, r.m).catch(() => null); if (w && w.closed) { out.push(p.coin + ' closed ' + w.pnl.toFixed(2) + ' (' + w.why + ')'); continue; } if (w && w.half) continue; }
    x = await manageOpen(db, p, r.m).catch(() => null);
    if (!x || !x.closed) continue;
    out.push(p.coin + ' closed ' + x.pnl.toFixed(2) + ' (' + x.why + ')');
    const lev = rev2Lev(p);
    if (x.why !== 'stop hit' || lev >= REV2.levMax || new Date(p.max_hold_until).getTime() <= Date.now() || ctlBlocks(ctl, desk, base)) continue;
    const dir = p.side === 'LONG' ? 1 : -1, m = r.m, nl = lev + 1, notional = RM * nl, d = decFor(m.price) + 2, sp = rev2Stop(nl);
    await db.insert('ap_positions', { coin: p.coin, side: p.side, entry_price: m.price, size: notional / m.price, notional, tp: +(m.price * (1 + dir * 0.5)).toFixed(d), sl: +(m.price * (1 - dir * sp)).toFixed(d), max_hold_until: p.max_hold_until });
    out.push(p.coin + ' reset to ' + nl + 'x');
  }
  if (openPos.length) return out;
  if (ctlBlocks(ctl, desk, '')) return out;
  const last = (await db.select('ap_positions', 'select=opened_at&coin=like.*' + sfx + '&notional=eq.' + lev0N + '&order=opened_at.desc&limit=1').catch(() => []))[0];
  if (!batchDue(last, Date.now(), REV2.holdH / 24)) return out;
  const rk = rows.filter((r) => revOk(r) && !(ctl && ctl.coinsOff && ctl.coinsOff[r.coin]) && r.m.change24h_pct != null && (r.spread_bps == null || r.spread_bps <= MAX_SPREAD_BPS)).sort((a, b) => a.m.change24h_pct - b.m.change24h_pct);
  if (rk.length < REV2.K * 2 + 4) return out;
  const legs = rk.slice(0, REV2.K).map((r) => [r, 1]).concat(rk.slice(-REV2.K).map((r) => [r, -1]));
  for (const [r, dir] of legs) {
    const m = r.m, d = decFor(m.price) + 2, px = limit ? m.price * (1 - dir * LIMIT_OFF / 100) : m.price, sp = rev2Stop(REV2.lev0);
    await db.insert('ap_positions', { coin: r.coin + sfx, side: dir > 0 ? 'LONG' : 'SHORT', status: limit ? 'pending' : 'open', entry_price: px, size: lev0N / px, notional: lev0N, tp: +(px * (1 + dir * 0.5)).toFixed(d), sl: +(px * (1 - dir * sp)).toFixed(d), max_hold_until: new Date(nextClose(Date.now(), REV2.holdH / 24)).toISOString() });
    out.push(desk + (limit ? ' limit ' : ' opened ') + (dir > 0 ? 'LONG ' : 'SHORT ') + r.coin);
  }
  return out;
}

/* Rev 3 (:r3d daily, :r3w weekly, :r3m monthly, :r3y yearly). Koko's idea: limit the loss on every entry, keep the upside open.
   Same picks as Neutral Rev (long the 8 weakest, short the 8 strongest by 24h change, one batch, market orders, no take profit), but the stop is a share of the $250 MARGIN, not of the price:
   10% of margin = $25 per entry, so the price stop is 10% / leverage (2.5% at 4x, 2% at 5x, 1.67% at 6x, 1.43% at 7x). A stopped leg books the loss and reopens the SAME side at the next leverage step (4x -> 5x -> 6x -> 7x, fresh $250 margin each),
   with the same deadline. After the stop at 7x the leg is done. Worst case per leg is therefore 4 x $25 = $100 plus fees (plus any gap past the stop). At the deadline everything left open is closed at the market; the next batch starts one horizon later.
   Horizons: daily 24 h, weekly 7 d, monthly 30 d, yearly 365 d. Funding is booked into pnl when each entry closes (see rev3Funding). Back-test (42 overlapping 24 h batches, one falling market) favoured the 10% margin stop with the ladder; longer horizons are untested. Forward test. */
export const REV3 = { K: 5, lev0: 4, levMax: 7, stopMargin: 0.10, hours: { r3d: 24, r3l: 24 }, hoursAll: { r3d: 24, r3l: 24, r3w: 168, r3m: 720, r3y: 8760 }, lev: { r3l: { lev0: 2, levMax: 3 } } };
const r3p = (desk) => Object.assign({ lev0: REV3.lev0, levMax: REV3.levMax }, REV3.lev[desk]); /* r3l = low-leverage Rev 3: 2x then 3x */
export const rev3Stop = (lev) => REV3.stopMargin / lev;
export async function rev3Tick(db, rows, openPos, ctl, desk) {
  const sfx = ':' + desk, holdH = REV3.hoursAll[desk], out = [], P3 = r3p(desk), lev0N = RM * P3.lev0;
  for (const p of openPos) {
    const base = p.coin.split(':')[0], r = rows.find((x) => x.coin === base); if (!r) continue;
    const x = await manageOpen(db, p, r.m).catch(() => null);
    if (!x || !x.closed) continue;
    out.push(p.coin + ' closed ' + x.pnl.toFixed(2) + ' (' + x.why + ')');
    const lev = rev2Lev(p);
    if (x.why !== 'stop hit' || lev >= P3.levMax || new Date(p.max_hold_until).getTime() <= Date.now() || ctlBlocks(ctl, desk, base)) continue;
    const dir = p.side === 'LONG' ? 1 : -1, m = r.m, nl = lev + 1, notional = RM * nl, d = decFor(m.price) + 2, sp = rev3Stop(nl);
    await db.insert('ap_positions', { coin: p.coin, side: p.side, entry_price: m.price, size: notional / m.price, notional, tp: +(m.price * (dir > 0 ? 100 : 0.01)).toFixed(d), sl: +(m.price * (1 - dir * sp)).toFixed(d), max_hold_until: p.max_hold_until });
    out.push(p.coin + ' reset to ' + nl + 'x');
  }
  if (openPos.length) return out;
  if (ctlBlocks(ctl, desk, '')) return out;
  const last = (await db.select('ap_positions', 'select=opened_at&coin=like.*' + sfx + '&notional=eq.' + lev0N + '&order=opened_at.desc&limit=1').catch(() => []))[0];
  if (!batchDue(last, Date.now(), holdH / 24)) return out;
  const rk = rows.filter((r) => revOk(r) && !(ctl && ctl.coinsOff && ctl.coinsOff[r.coin]) && r.m.change24h_pct != null && (r.spread_bps == null || r.spread_bps <= MAX_SPREAD_BPS)).sort((a, b) => a.m.change24h_pct - b.m.change24h_pct);
  if (rk.length < REV3.K * 2 + 4) return out;
  const legs = rk.slice(0, REV3.K).map((r) => [r, 1]).concat(rk.slice(-REV3.K).map((r) => [r, -1]));
  const deadline = new Date(nextClose(Date.now(), holdH / 24)).toISOString(); // one deadline for the whole batch
  for (const [r, dir] of legs) {
    const m = r.m, d = decFor(m.price) + 2, px = m.price, sp = rev3Stop(P3.lev0);
    await db.insert('ap_positions', { coin: r.coin + sfx, side: dir > 0 ? 'LONG' : 'SHORT', entry_price: px, size: lev0N / px, notional: lev0N, tp: +(px * (dir > 0 ? 100 : 0.01)).toFixed(d), sl: +(px * (1 - dir * sp)).toFixed(d), max_hold_until: deadline });
    out.push(desk + ' opened ' + (dir > 0 ? 'LONG ' : 'SHORT ') + r.coin);
  }
  return out;
}

async function algoTick(db, r, openAlgo, closedAlgo, v, breadth, ctl) {
  v = v || 'algo';
  const P = v === 'algow' ? ALGOW : v === 'algox' ? ALGOX : v === 'algo3' ? ALGO3 : v === 'algo3b' ? ALGO3B : v === 'algo2' ? { ...ALGO, cooldownMin: 15 } : ALGO;
  const key = r.coin + ':' + v, m = r.m;
  if (v === 'algot' && !ALGOT_COINS.includes(r.coin)) return 'not top10';
  const open = openAlgo[key];
  if (open) { const x = await manageOpen(db, open, m); return x.closed ? 'closed ' + x.pnl.toFixed(2) : 'holding'; }
  if ((v === 'algo' || v === 'algow' || v === 'algox' || v === 'algoq' || v === 'algo100') && ALGO_SKIP.includes(r.coin)) return 'excluded';
  const closed = closedAlgo[key] || [], bank = (v === 'algo100' ? START100 : START) + closed.reduce((s, x) => s + +x.pnl, 0);
  if (closed[0] && Date.now() - new Date(closed[0].closed_at).getTime() < P.cooldownMin * 60000) return 'cooldown';
  if (ctlBlocks(ctl, v, r.coin)) return 'paused';
  if (bank < 20 || (r.spread_bps != null && r.spread_bps > MAX_SPREAD_BPS)) return 'skip';
  const sig = v === 'algoq' && QUIET_HOURS_UTC.includes(new Date().getUTCHours()) ? { why: 'quiet hours' } : v === 'algo3' || v === 'algo3b' ? (breadth >= P.breadth ? bounceFade(r) : { why: 'breadth ' + breadth.toFixed(2) + ' < gate' }) : v === 'algo2' ? bounceFade(r) : algoSignal(m);
  if (!sig.side) return sig.why;
  const dir = sig.side === 'LONG' ? 1 : -1, notional = bank * LEV, d = decFor(m.price) + 2;
  await db.insert('ap_positions', { coin: key, side: sig.side, entry_price: m.price, size: notional / m.price, notional, tp: +(m.price * (1 + dir * P.tp / 100)).toFixed(d), sl: +(m.price * (1 - dir * P.sl / 100)).toFixed(d), max_hold_until: new Date(Date.now() + P.holdMin * 60000).toISOString() });
  return 'opened ' + sig.side;
}

/* ---------- Top-100 research track (separate scheduled function, every 5 min at minutes 2,7,12...) ----------
   100 liquid OKX USDT perpetuals ranked by 24h USD volume (OKX has no market cap, so volume is the proxy), $100 per coin instead of $250.
   Two rule-based desks only, no Claude calls: Algo rules (:algo100) and Neutral Reversal (:rev100, 16 weakest long / 16 strongest short = the same 16% of the universe as 8 of 50, 24h hold, no stops).
   Latest prices go to ap_prices100 (100 rows, overwritten each run); nothing is written to ap_samples, so the top-50 dashboard and race chart are untouched. */
export const START100 = 100, TOP100_N = 100, REV100 = { K: 16, holdH: 24 };
const STABLES = ['USDC', 'USDT', 'DAI', 'FDUSD', 'TUSD', 'USDE', 'USDG', 'PYUSD', 'XAUT', 'PAXG'];
async function rev100Tick(db, rows, openRev, ctl) {
  const out = [];
  for (const p of openRev) { const r = rows.find((x) => x.coin === p.coin.split(':')[0]); if (r) { const x = await manageOpen(db, p, r.m).catch(() => null); if (x && x.closed) out.push(p.coin + ' closed ' + x.pnl.toFixed(2)); } }
  if (openRev.length || ctlBlocks(ctl, 'rev100', '')) return out;
  const last = (await db.select('ap_positions', 'select=opened_at&coin=like.*:rev100&order=opened_at.desc&limit=1').catch(() => []))[0];
  if (last && Date.now() - new Date(last.opened_at).getTime() < REV100.holdH * 3600000) return out;
  const rk = rows.filter((r) => !(ctl && ctl.coinsOff && ctl.coinsOff[r.coin]) && r.m.change24h_pct != null && (r.spread_bps == null || r.spread_bps <= MAX_SPREAD_BPS)).sort((a, b) => a.m.change24h_pct - b.m.change24h_pct);
  if (rk.length < REV100.K * 2 + 8) return out;
  const legs = rk.slice(0, REV100.K).map((r) => [r, 1]).concat(rk.slice(-REV100.K).map((r) => [r, -1]));
  for (const [r, dir] of legs) {
    const m = r.m, notional = START100 * LEV, d = decFor(m.price) + 2;
    await db.insert('ap_positions', { coin: r.coin + ':rev100', side: dir > 0 ? 'LONG' : 'SHORT', entry_price: m.price, size: notional / m.price, notional, tp: +(m.price * (1 + dir * 0.5)).toFixed(d), sl: +(m.price * (1 - dir * 0.5)).toFixed(d), max_hold_until: new Date(Date.now() + REV100.holdH * 3600000).toISOString() });
    out.push('rev100 opened ' + (dir > 0 ? 'LONG ' : 'SHORT ') + r.coin);
  }
  return out;
}
export async function top100Tick(env) {
  if (RETIRED.has('algo100')) return { skipped: 'retired' };
  if (!env.SUPABASE_SERVICE_KEY) return { skipped: 'missing keys' };
  const db = sb(env.SUPABASE_SERVICE_KEY), tk = {};
  for (const t of await okx('/api/v5/market/tickers?instType=SWAP')) if (/^[A-Z0-9]+-USDT-SWAP$/.test(t.instId) && +t.last > 0) tk[t.instId.replace('-USDT-SWAP', '')] = t;
  const vol = (s) => +tk[s].volCcy24h * +tk[s].last;
  const ranked = Object.keys(tk).filter((s) => !STABLES.includes(s)).sort((a, b) => vol(b) - vol(a));
  const openAll = (await db.select('ap_positions', 'select=*&status=eq.open')).filter((p) => /:(algo|rev)100$/.test(p.coin));
  const coins = ranked.slice(0, TOP100_N); // coins that still have an open trade stay in the scan until it closes
  for (const p of openAll) { const b = p.coin.split(':')[0]; if (tk[b] && !coins.includes(b)) coins.push(b); }
  const rows = [];
  for (let i = 0; i < coins.length; i += 10) {
    const part = await Promise.all(coins.slice(i, i + 10).map((s) => scanCoin(s, tk[s], tk[s].instId).catch(() => null)));
    for (const r of part) if (r) rows.push(r);
    if (i + 10 < coins.length) await new Promise((r) => setTimeout(r, 600));
  }
  if (rows.length < 60) return { skipped: 'only ' + rows.length + ' coins scanned' };
  const now = new Date().toISOString();
  await db.upsert('ap_prices100', rows.map((r) => ({ coin: r.coin, price: r.m.price, ret_60m: r4(r.F.ret_60m), change24h: r4(r.m.change24h_pct), vol_usd: Math.round(vol(r.coin)), rank: ranked.indexOf(r.coin) + 1 || null, updated_at: now })), 'coin').catch((e) => console.log('prices100 ' + String(e.message || e).slice(0, 100)));
  const ctl = await loadControl(db); ctl.auto = {};
  const openAlgo = {}; for (const p of openAll) if (p.coin.endsWith(':algo100')) openAlgo[p.coin] = p;
  const closedAlgo = {}; for (const x of await selectAll(db, 'ap_positions', 'select=coin,pnl,closed_at&status=eq.closed&coin=like.*:algo100&order=closed_at.desc,id.desc').catch(() => [])) (closedAlgo[x.coin] = closedAlgo[x.coin] || []).push(x);
  const algoRes = await Promise.all(rows.map((r) => algoTick(db, r, openAlgo, closedAlgo, 'algo100', 0.5, ctl).then((s) => r.coin + ' ' + s).catch((e) => r.coin + ' error ' + String(e.message || e).slice(0, 60))));
  const revRes = await rev100Tick(db, rows, openAll.filter((p) => p.coin.endsWith(':rev100')), ctl).catch((e) => ['rev100 error ' + String(e.message || e).slice(0, 60)]);
  return { scanned: rows.length, algo: algoRes.filter((x) => /opened|closed|error/.test(x)), rev: revRes };
}

/* Neutral Reversal desk (:rev): every 24h long the 8 weakest and short the 8 strongest coins by 24h change. No stops, 24h hold. Backtest: positive in bear and bull, but only 14 days of data. Forward test. */
export const REV = { K: 5, holdH: 24 };
async function revTick(db, rows, openRev, ctl) {
  const mine = Object.values(openRev);
  const out = [];
  const holdH = REV.holdH;
  for (const p of mine) { const r = rows.find((x) => x.coin === p.coin.split(':')[0]); if (r) { const x = await manageOpen(db, p, r.m).catch(() => null); if (x && x.closed) out.push(p.coin + ' closed ' + x.pnl.toFixed(2)); } }
  if (mine.length) return out;
  if (ctlBlocks(ctl, 'rev', '')) return out;
  const last = (await db.select('ap_positions', 'select=opened_at&coin=like.*:rev&order=opened_at.desc&limit=1').catch(() => []))[0];
  if (!batchDue(last, Date.now(), holdH / 24)) return out;
  const rk = rows.filter((r) => revOk(r) && !(ctl && ctl.coinsOff && ctl.coinsOff[r.coin]) && r.m.change24h_pct != null && (r.spread_bps == null || r.spread_bps <= MAX_SPREAD_BPS)).sort((a, b) => a.m.change24h_pct - b.m.change24h_pct);
  if (rk.length < REV.K * 2 + 4) return out;
  const legs = rk.slice(0, REV.K).map((r) => [r, 1]).concat(rk.slice(-REV.K).map((r) => [r, -1]));
  /* One request inserts the whole batch, so two overlapping runs cannot interleave their legs. If two runs both opened a batch, the first one's 16 legs (lowest ids) stay and the rest are deleted. */
  const t0 = new Date(Date.now() - 120000).toISOString();
  await db.insertMany('ap_positions', legs.map(([r, dir]) => { const m = r.m, notional = RM * LEV, d = decFor(m.price) + 2; return { coin: r.coin + ':rev', side: dir > 0 ? 'LONG' : 'SHORT', entry_price: m.price, size: notional / m.price, notional, tp: +(m.price * (1 + dir * 0.5)).toFixed(d), sl: +(m.price * (1 - dir * 0.5)).toFixed(d), max_hold_until: new Date(nextClose(Date.now(), REV.holdH / 24)).toISOString() }; }));
  for (const [r, dir] of legs) out.push('rev opened ' + (dir > 0 ? 'LONG ' : 'SHORT ') + r.coin);
  const fresh = await db.select('ap_positions', 'select=id&coin=like.*:rev&status=eq.open&opened_at=gte.' + encodeURIComponent(t0) + '&order=id.asc').catch(() => []);
  if (fresh.length > REV.K * 2) { await db.del('ap_positions', 'coin=like.*:rev&status=eq.open&id=gt.' + fresh[REV.K * 2 - 1].id).catch(() => null); out.push('rev duplicate batch removed (' + (fresh.length - REV.K * 2) + ' legs)'); }
  return out;
}

/* Two Neutral Reversal variants, same ranking and 24h batch cadence as :rev (no stops, 24h hold), forward test.
   :flip  Trend Flip. Reversed: long the 8 STRONGEST, short the 8 WEAKEST by 24h change, $1,250 per leg. Tests whether momentum beats reversion in the current market.
   :revv  Risk-balanced Rev. Same picks as :rev, but each leg is sized by 1 / its recent volatility (1-minute return stdev), so every leg carries about the same risk. Total notional targets $20,000 (16 x $1,250) but the caps can leave it lower; a leg is kept between $300 and $1,750 (1.2x to 7x of its $250 margin). */
/* :caprev Capitulation Rev. Back-test on 2.75 days of samples (one V-shaped rebound, so a hypothesis, not proof): Neutral Rev made about +$450 per batch when it started right after the market had fallen (average 24h change <= -1%) and about -$70 per batch otherwise.
   So this desk runs the same Rev batch (long 8 weakest, short 8 strongest, $1,250 per leg, 24h hold, no stops) ONLY when the average 24h change of the scanned coins is at or below CAP_GATE, and otherwise waits in cash. */
export const CAP_GATE = -1;
export const mkt24 = (rk) => rk.reduce((s, r) => s + r.m.change24h_pct, 0) / Math.max(1, rk.length);
export const volOf = (r) => Math.max(+r.F.vol_1m || 0, 0.02);
export function riskSizes(legs) {
  const inv = legs.map(([r]) => 1 / volOf(r)), tot = inv.reduce((a, b) => a + b, 0), gross = legs.length * START * LEV;
  return inv.map((w) => Math.min(START * 7, Math.max(START * 1.2, (gross * w) / tot)));
}
export function revVariantLegs(rk, desk) {
  const weak = rk.slice(0, REV.K), strong = rk.slice(-REV.K);
  const legs = desk === 'flip' ? weak.map((r) => [r, -1]).concat(strong.map((r) => [r, 1])) : weak.map((r) => [r, 1]).concat(strong.map((r) => [r, -1]));
  const sizes = desk === 'revv' ? riskSizes(legs) : legs.map(() => RM * LEV);
  return legs.map(([r, dir], i) => [r, dir, sizes[i]]);
}
/* :spl Spot long-only: buy the 5 weakest top-50 coins ($200 each, no leverage) and sell at 20:00 Bangkok. :spm Spot margin Neutral Rev: 5 weakest bought, 5 strongest borrowed and sold, $100 each, same close. */
export async function spotDeskTick(db, rows, openPos, ctl, desk) {
  const out = [], sfx = ':' + desk;
  for (const p of openPos) { const r = rows.find((x) => x.coin === p.coin.split(':')[0]); if (r) { const x = await manageOpen(db, p, r.m).catch(() => null); if (x && x.closed) out.push(p.coin + ' closed ' + x.pnl.toFixed(2)); } }
  if (openPos.length) return out;
  if (ctlBlocks(ctl, desk, '')) return out;
  const last = (await db.select('ap_positions', 'select=opened_at&coin=like.*' + sfx + '&order=opened_at.desc&limit=1').catch(() => []))[0];
  if (!batchDue(last, Date.now(), 1)) return out;
  const rk = rows.filter((r) => revOk(r) && !(ctl && ctl.coinsOff && ctl.coinsOff[r.coin]) && r.m.change24h_pct != null && (r.spread_bps == null || r.spread_bps <= MAX_SPREAD_BPS)).sort((a, b) => a.m.change24h_pct - b.m.change24h_pct);
  if (rk.length < REV.K * 2 + 4) return out;
  const legs = rk.slice(0, REV.K).map((r) => [r, 1]).concat(desk === 'spm' ? rk.slice(-REV.K).map((r) => [r, -1]) : []);
  const notional = desk === 'spm' ? SPOT.pairLeg : SPOT.longLeg, deadline = new Date(nextClose(Date.now(), 1)).toISOString();
  for (const [r, dir] of legs) {
    const m = r.m, d = decFor(m.price) + 2;
    await db.insert('ap_positions', { coin: r.coin + sfx, side: dir > 0 ? 'LONG' : 'SHORT', entry_price: m.price, size: notional / m.price, notional, tp: +(m.price * (dir > 0 ? 100 : 0.01)).toFixed(d), sl: +(m.price * (dir > 0 ? 0.01 : 100)).toFixed(d), max_hold_until: deadline });
    out.push(desk + ' opened ' + (dir > 0 ? 'BUY ' : 'BORROW-SELL ') + r.coin + ' $' + notional);
  }
  return out;
}

/* Dated-futures carry (paper): long spot + short a dated USDT future (cash carry), $100 per leg, 5 slots, held to expiry. Rows live in ap_carry with coin = the futures instId (it contains '-'), last_funding_ts = expiry in ms, entry_rate = annualised basis at entry.
   Enter when the annualised basis, after round-trip fees, is at least DFC.minAnn. At expiry the future settles at spot, so the basis is locked in; the mark before that is spot_bid vs future ask. */
export const DFC = { slots: 5, leg: 100, spotFee: 0.001, futFee: FEE, settleFee: 0.0002, minAnn: 0.10, scanEveryMin: 30 };
export const dfcEntryFees = () => DFC.leg * (DFC.spotFee + DFC.futFee), dfcExitFees = () => DFC.leg * (DFC.spotFee + DFC.settleFee);
let dfcScanAt = 0;
export async function dfcTick(db, ctl, now = Date.now()) {
  const out = [];
  const open = await db.select('ap_carry', 'select=*&status=eq.open&coin=like.*-*');
  const q = (t) => ({ last: +t.last, bid: +t.bidPx > 0 ? +t.bidPx : +t.last, ask: +t.askPx > 0 ? +t.askPx : +t.last });
  const spotT = {}, futT = {};
  for (const t of await okx('/api/v5/market/tickers?instType=SPOT')) spotT[t.instId] = q(t);
  for (const t of await okx('/api/v5/market/tickers?instType=FUTURES')) futT[t.instId] = q(t);
  for (const row of open) {
    const base = row.coin.split('-')[0], sp = spotT[base + '-USDT'], fu = futT[row.coin], expired = now >= +row.last_funding_ts;
    if (!sp || !(sp.bid > 0)) continue;
    const futPx = expired ? sp.bid : fu && fu.ask > 0 ? fu.ask : null; if (futPx == null) continue; // at expiry the future settles at spot
    const priceNet = (+row.spot_qty) * (sp.bid - +row.spot_entry) + (+row.perp_qty) * (+row.perp_entry - futPx), fees = +row.fees + (expired ? dfcExitFees() : 0);
    await db.update('ap_carry', 'id=eq.' + row.id, Object.assign({ spot_last: sp.bid, perp_last: futPx, price_pnl: priceNet, fees, net_pnl: priceNet - fees, updated_at: new Date(now).toISOString() }, expired ? { status: 'closed', closed_at: new Date(now).toISOString(), close_reason: 'expiry' } : {}));
    if (expired) out.push(row.coin + ' expired, net ' + (priceNet - fees).toFixed(2));
  }
  const free = DFC.slots - open.length;
  if (free <= 0 || ctlBlocks(ctl, 'dfc', '') || now - dfcScanAt < DFC.scanEveryMin * 60000) return out;
  dfcScanAt = now;
  const held = new Set(open.map((r) => r.coin.split('-')[0]));
  const cands = [];
  for (const c of TOP.slice(0, 12)) {
    if (held.has(c)) continue;
    const list = await okx('/api/v5/public/instruments?instType=FUTURES&uly=' + c + '-USDT').catch(() => []);
    for (const i of list || []) if (i.state === 'live' && +i.expTime - now > 5 * 864e5) cands.push({ c, id: i.instId, exp: +i.expTime });
  }
  const best = [];
  for (const x of cands) {
    const S = spotT[x.c + '-USDT'], F = futT[x.id]; if (!S || !F || !(S.ask > 0) || !(F.bid > 0)) continue;
    const days = (x.exp - now) / 864e5, gross = (F.bid - S.ask) / S.ask, net = gross - (dfcEntryFees() + dfcExitFees()) / DFC.leg, ann = net * 365 / days;
    if (ann >= DFC.minAnn) best.push(Object.assign(x, { S, F, ann, days }));
  }
  best.sort((a, b) => b.ann - a.ann);
  const used = new Set();
  for (const x of best) {
    if (used.size >= free) break; if (used.has(x.c)) continue; used.add(x.c);
    const sp = x.S.ask, pp = x.F.bid, drift = (DFC.leg / sp) * (x.S.bid - sp) + (DFC.leg / pp) * (pp - x.F.ask);
    await db.insert('ap_carry', { coin: x.id, status: 'open', opened_at: new Date(now).toISOString(), leg_usd: DFC.leg, spot_entry: sp, perp_entry: pp, spot_qty: DFC.leg / sp, perp_qty: DFC.leg / pp, entry_rate: x.ann, funding_total: 0, last_funding_ts: x.exp, spot_last: x.S.bid, perp_last: x.F.ask, price_pnl: drift, fees: dfcEntryFees(), net_pnl: drift - dfcEntryFees(), updated_at: new Date(now).toISOString() });
    out.push('dfc opened ' + x.id + ' annualised ' + (x.ann * 100).toFixed(1) + '% over ' + x.days.toFixed(0) + 'd');
  }
  if (!best.length) out.push('dfc: no dated future with annualised basis >= ' + (DFC.minAnn * 100) + '% after fees (' + cands.length + ' checked)');
  return out;
}

export async function revVariantTick(db, rows, openPos, ctl, desk) {
  const out = [], sfx = ':' + desk, holdH = desk === 'revw' ? 168 : REV.holdH;
  if (desk === 'revs') { const by = {}; for (const p of openPos) (by[p.coin] = by[p.coin] || []).push(p); for (const g of Object.values(by)) { const r = rows.find((x) => x.coin === g[0].coin.split(':')[0]); if (r) out.push(...await revsManage(db, g, r.m).catch((e) => [g[0].coin + ' error ' + String(e.message || e).slice(0, 60)])); } }
  else for (const p of openPos) { const r = rows.find((x) => x.coin === p.coin.split(':')[0]); if (r) { const x = await manageOpen(db, p, r.m).catch(() => null); if (x && x.closed) out.push(p.coin + ' closed ' + x.pnl.toFixed(2)); } }
  if (desk === 'revs' ? (await db.select('ap_positions', 'select=id&status=eq.open&coin=like.*:revs&limit=1').catch(() => [1])).length : openPos.length) return out;
  if (ctlBlocks(ctl, desk, '')) return out;
  const last = (await db.select('ap_positions', 'select=opened_at&coin=like.*' + sfx + '&order=opened_at.desc&limit=1').catch(() => []))[0];
  if (!batchDue(last, Date.now(), holdH / 24)) return out;
  const rk = rows.filter((r) => revOk(r) && !(ctl && ctl.coinsOff && ctl.coinsOff[r.coin]) && r.m.change24h_pct != null && (r.spread_bps == null || r.spread_bps <= MAX_SPREAD_BPS)).sort((a, b) => a.m.change24h_pct - b.m.change24h_pct);
  if (rk.length < REV.K * 2 + 4) return out;
  if (desk === 'caprev' && mkt24(rk) > CAP_GATE) { out.push('caprev waiting: market 24h ' + mkt24(rk).toFixed(2) + '% > ' + CAP_GATE + '%'); return out; }
  for (const [r, dir, notional] of revVariantLegs(rk, desk)) {
    const m = r.m, d = decFor(m.price) + 2;
    await db.insert('ap_positions', { coin: r.coin + sfx, side: dir > 0 ? 'LONG' : 'SHORT', entry_price: m.price, size: notional / m.price, notional, tp: +(m.price * (1 + dir * 0.5)).toFixed(d), sl: desk === 'revs' ? +(m.price * (1 + dir * SCALE.stop / SCALE.lev)).toFixed(d) : +(m.price * (1 - dir * 0.5)).toFixed(d), max_hold_until: new Date(nextClose(Date.now(), holdH / 24)).toISOString() });
    out.push(desk + ' opened ' + (dir > 0 ? 'LONG ' : 'SHORT ') + r.coin + ' $' + Math.round(notional));
  }
  return out;
}

/* :revs Neutral Rev scale-out (paper). Same 10 picks as Neutral Rev (5x, $100 margin per leg, 20:00 Bangkok close). Every percentage below is of the $100 margin (so +7% = +$7 = a 1.4% price move at 5x).
   Winners: at +7% sell half; the other half then closes at +10% or when it falls back to +5%, whichever comes first; if neither, it rides to 20:00.
   Losers: at -2.5% sell half; at -5% buy that half back at the lower price; a disaster stop at -10% closes everything left. A leg closed early does not reopen that day. State lives in close_reason of the open row: so-w / so-l / so-l2 plus the stage time. */
export const SCALE = { lev: LEV, w1: 0.07, w2: 0.10, wBack: 0.05, l1: -0.025, rebuy: -0.05, stop: -0.10 };
const scLvl = (e, dir, f) => e * (1 + dir * f / SCALE.lev);
const scSplit = async (db, p, half, exit, why) => { // close `half` of the position at `exit`, keep the rest open
  const clone = await db.insert('ap_positions', { coin: p.coin, side: p.side, entry_price: p.entry_price, size: +p.size * half / +p.notional, notional: half, tp: p.tp, sl: p.sl, max_hold_until: p.max_hold_until, opened_at: p.opened_at, status: 'open' });
  await closePos(db, clone, exit, why);
  const n0 = +p.notional, z0 = +p.size, n1 = n0 - half, z1 = z0 * (n1 / n0);
  await db.update('ap_positions', 'id=eq.' + p.id, { notional: n1, size: z1 });
  p.notional = n1; p.size = z1;
};
export async function revsManage(db, grp, m) {
  const out = [], main = grp.find((x) => !/^so-rb/.test(x.close_reason || '')), rb = grp.find((x) => /^so-rb/.test(x.close_reason || ''));
  if (!main) return out;
  const dir = main.side === 'LONG' ? 1 : -1, e = +main.entry_price, d = decFor(e) + 2, L = (f) => +scLvl(e, dir, f).toFixed(d), adv = (k, lv) => (dir > 0 ? k.l <= lv : k.h >= lv), fav = (k, lv) => (dir > 0 ? k.h >= lv : k.l <= lv);
  let st = (main.close_reason || '').split(':')[0] || 'full', since = +(String(main.close_reason || '').split(':')[1] || 0) || new Date(main.opened_at).getTime();
  const set = async (stage, ts, extra) => { main.close_reason = stage + ':' + ts; await db.update('ap_positions', 'id=eq.' + main.id, Object.assign({ close_reason: main.close_reason }, extra || {})); st = stage; since = ts; };
  const shut = async (lv, why) => { for (const x of [main, rb].filter(Boolean)) { await closePos(db, x, lv, why); } out.push(main.coin + ' closed ' + why); return out; };
  for (const k of m.candles.filter((x) => x.t > since - 60000 * 0 && x.t >= new Date(main.opened_at).getTime() - 60000)) {
    if (k.t <= since && st !== 'full') continue;
    if (st === 'full') {
      if (adv(k, L(SCALE.l1))) { await scSplit(db, main, +main.notional / 2, L(SCALE.l1), 'scale-out -2.5%'); await set('so-l', k.t); out.push(main.coin + ' sold half at -2.5%'); continue; }
      if (fav(k, L(SCALE.w1))) { await scSplit(db, main, +main.notional / 2, L(SCALE.w1), 'scale-out +7%'); await set('so-w', k.t, { tp: L(SCALE.w2), sl: L(SCALE.wBack) }); main.tp = L(SCALE.w2); main.sl = L(SCALE.wBack); out.push(main.coin + ' sold half at +7%'); continue; }
    } else if (st === 'so-w') {
      if (adv(k, L(SCALE.wBack))) return shut(L(SCALE.wBack), 'scale-out back to +5%');
      if (fav(k, L(SCALE.w2))) return shut(L(SCALE.w2), 'scale-out +10%');
    } else if (st === 'so-l') {
      if (adv(k, L(SCALE.stop))) return shut(L(SCALE.stop), 'stop hit');
      if (adv(k, L(SCALE.rebuy))) {
        const half = +main.notional, px = L(SCALE.rebuy), nr = await db.insert('ap_positions', { coin: main.coin, side: main.side, entry_price: px, size: half / px, notional: half, tp: main.tp, sl: main.sl, max_hold_until: main.max_hold_until, status: 'open', close_reason: 'so-rb:' + k.t });
        grp.push(nr); await set('so-l2', k.t); out.push(main.coin + ' bought half back at -5%'); continue;
      }
    } else if (st === 'so-l2') {
      if (adv(k, L(SCALE.stop))) return shut(L(SCALE.stop), 'stop hit');
    }
  }
  if (Date.now() >= new Date(main.max_hold_until).getTime()) { for (const x of grp) await closePos(db, x, m.price, 'time exit'); out.push(main.coin + ' time exit'); }
  return out;
}

/* :revx Reverse extremes (paper, Koko's idea). After each 20:00 close, look at the Neutral Rev batch that just closed: its best leg and its worst leg (net pnl) are re-entered with the side REVERSED
   (best leg flipped, worst leg flipped), $100 margin each at 5x, held to the next 20:00. Two legs a day, so it is a tiny sample: forward test only. */
export async function revxTick(db, rows, openPos, ctl) {
  const out = [];
  for (const p of openPos) { const r = rows.find((x) => x.coin === p.coin.split(':')[0]); if (r) { const x = await manageOpen(db, p, r.m).catch(() => null); if (x && x.closed) out.push(p.coin + ' closed ' + x.pnl.toFixed(2)); } }
  if (openPos.length) return out;
  if (ctlBlocks(ctl, 'revx', '')) return out;
  const last = (await db.select('ap_positions', 'select=opened_at&coin=like.*:revx&order=opened_at.desc&limit=1').catch(() => []))[0];
  if (!batchDue(last, Date.now(), 1)) return out;
  const prev = await db.select('ap_positions', 'select=coin,side,pnl,closed_at,max_hold_until&status=eq.closed&coin=like.*:rev&order=closed_at.desc&limit=30').catch(() => []);
  if (!prev.length || Date.now() - new Date(prev[0].closed_at).getTime() > 3 * 3600e3) return out;
  const ref = prev.filter((x) => x.max_hold_until === prev[0].max_hold_until);
  if (ref.length < 4) return out;
  const best = ref.reduce((a, b) => (+b.pnl > +a.pnl ? b : a)), worst = ref.reduce((a, b) => (+b.pnl < +a.pnl ? b : a));
  if (best.coin === worst.coin) return out;
  for (const x of [best, worst]) {
    const base = x.coin.split(':')[0], r = rows.find((y) => y.coin === base); if (!r) continue;
    const dir = x.side === 'LONG' ? -1 : 1, m = r.m, d = decFor(m.price) + 2, notional = RM * LEV;
    await db.insert('ap_positions', { coin: base + ':revx', side: dir > 0 ? 'LONG' : 'SHORT', entry_price: m.price, size: notional / m.price, notional, tp: +(m.price * (1 + dir * 0.5)).toFixed(d), sl: +(m.price * (1 - dir * 0.5)).toFixed(d), max_hold_until: new Date(nextClose(Date.now(), 1)).toISOString() });
    out.push('revx opened ' + (dir > 0 ? 'LONG ' : 'SHORT ') + base + (x === best ? ' (reversing best leg, was ' : ' (reversing worst leg, was ') + x.side + ' ' + (+x.pnl).toFixed(2) + ')');
  }
  return out;
}

/* :pick My picks (paper, Koko's own 20 coins). $250 margin each at 3x on OKX perpetuals ($750 notional, $5,000 in total), all LONG, opened once at the first tick and then held (no daily close, no take profit).
   A long at 3x is liquidated near -33%, so a leg is closed at -32% as "liquidated". Funding is booked into pnl when a leg closes. Coins with no OKX USDT perpetual are skipped and listed on picks.html. */
export const MYPICKS = { coins: ['ZEN', 'NEAR', 'OP', 'ARB', 'RUNE', 'JTO', 'MON', 'EGLD', 'HYPE', 'SOL', 'SUI', 'GRAM', 'WLD', 'VVV', 'JUP', 'RAY', 'AERO', 'XRP', 'AVAX', 'CARDS'], margin: 250, lev: 3, liqAt: -0.32, addAt: -0.18, addMargin: 100, maxAdds: 4 };
/* Price for a My-picks coin that has no OKX USDT perpetual: OKX spot first, then Gate.io and MEXC USDT perpetuals (public tickers). Returns { last, ask, src } or null. */
export async function pickQuote(c, okxSpot, withSod = false) {
  const sp = okxSpot && okxSpot[c + '-USDT']; if (sp && sp.last > 0) return Object.assign({ src: 'OKX spot' }, sp);
  const tries = [
    ['Gate perp', 'https://api.gateio.ws/api/v4/futures/usdt/tickers?contract=' + c + '_USDT', (j) => j && j[0] && { last: +j[0].last, ask: +j[0].lowest_ask || +j[0].last }],
    ['MEXC perp', 'https://contract.mexc.com/api/v1/contract/ticker?symbol=' + c + '_USDT', (j) => j && j.data && { last: +j.data.lastPrice, ask: +j.data.ask1 || +j.data.lastPrice }],
    ['Gate spot', 'https://api.gateio.ws/api/v4/spot/tickers?currency_pair=' + c + '_USDT', (j) => j && j[0] && { last: +j[0].last, ask: +j[0].lowest_ask || +j[0].last }],
  ];
  for (const [src, url, f] of tries) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'agent-desk-autopilot' } }); if (!r.ok) continue; const q = f(await r.json()); if (!(q && q.last > 0)) continue;
      if (withSod && src === 'Gate perp') { try { const k = await (await fetch('https://api.gateio.ws/api/v4/futures/usdt/candlesticks?contract=' + c + '_USDT&interval=1d&limit=1')).json(); if (k && k[0]) q.sod = +k[0].o; } catch (e) { /* no day open */ } }
      return Object.assign({ src }, q);
    } catch (e) { /* next source */ }
  }
  return null;
}
export async function picksTick(db, ctl) {
  const out = [];
  if (ctlBlocks(ctl, 'pick', '')) return out;
  const all = await db.select('ap_positions', 'select=id,coin,status,entry_price,notional,opened_at,side,close_reason&coin=like.*:pick&limit=200');
  const tk = {}; for (const t of await okx('/api/v5/market/tickers?instType=SWAP')) tk[t.instId] = { last: +t.last, ask: +t.askPx > 0 ? +t.askPx : +t.last };
  const miss = MYPICKS.coins.filter((c) => !tk[c + '-USDT-SWAP']);
  if (miss.length) { // RUNE, CARDS etc.: no OKX perpetual, so price them from OKX spot or another exchange's perpetual (paper only)
    const okxSpot = {}; try { for (const t of await okx('/api/v5/market/tickers?instType=SPOT')) okxSpot[t.instId] = { last: +t.last, ask: +t.askPx > 0 ? +t.askPx : +t.last }; } catch (e) { /* spot list unavailable */ }
    for (const c of miss) { const q = await pickQuote(c, okxSpot); if (q) tk[c + '-USDT-SWAP'] = q; }
  }
  for (const p of all.filter((x) => x.status === 'open')) { const t = tk[p.coin.split(':')[0] + '-USDT-SWAP']; if (t && t.last <= +p.entry_price * (1 + MYPICKS.liqAt)) { const x = await closePos(db, p, +p.entry_price * (1 + MYPICKS.liqAt), 'liquidated'); out.push(p.coin + ' liquidated ' + x.toFixed(2)); } }
  const had = new Set(all.map((x) => x.coin.split(':')[0]));
  const byCoin = {}; for (const x of all) (byCoin[x.coin] = byCoin[x.coin] || []).push(x);
  for (const g of Object.values(byCoin)) { // ladder: +$100 margin at 3x each time the price is another 18% below the latest entry of that coin, at most MYPICKS.maxAdds add-ons
    g.sort((x, y) => x.id - y.id); const c = g[0].coin.split(':')[0], t = tk[c + '-USDT-SWAP'], last = g[g.length - 1];
    if (!t || !g.some((x) => x.status === 'open') || g.length - 1 >= MYPICKS.maxAdds || !(t.last <= +last.entry_price * (1 + MYPICKS.addAt))) continue;
    const notional = MYPICKS.addMargin * MYPICKS.lev, d = decFor(t.ask);
    await db.insert('ap_positions', { coin: g[0].coin, side: 'LONG', entry_price: t.ask, size: notional / t.ask, notional, tp: +(t.ask * 100).toFixed(d), sl: +(t.ask * (1 + MYPICKS.liqAt)).toFixed(d), max_hold_until: '2099-12-31T00:00:00Z', close_reason: 'pick-add' });
    out.push('pick add-on #' + g.length + ' LONG ' + c + ' $' + notional + ' at ' + t.ask);
  }
  for (const c of MYPICKS.coins) {
    if (had.has(c)) continue;
    const t = tk[c + '-USDT-SWAP']; if (!t || !(t.ask > 0)) { out.push('pick ' + c + ' has no price on OKX, Gate or MEXC'); continue; }
    const notional = MYPICKS.margin * MYPICKS.lev, d = decFor(t.ask);
    await db.insert('ap_positions', { coin: c + ':pick', side: 'LONG', entry_price: t.ask, size: notional / t.ask, notional, tp: +(t.ask * 100).toFixed(d), sl: +(t.ask * (1 + MYPICKS.liqAt)).toFixed(d), max_hold_until: '2099-12-31T00:00:00Z' });
    out.push('pick opened LONG ' + c + ' $' + notional + (t.src ? ' (priced from ' + t.src + ')' : ''));
  }
  return out;
}

/* ---------- Funding Carry (paper): $5,000 of spot + $5,000 short perpetual at 1x, split over 20 coins ($250 per leg per coin) ----------
   Each slot holds one coin: buy $250 spot and short $250 of the USDT perpetual (1x, so no liquidation risk to speak of). Price moves cancel; the profit is the funding the short receives
   every settlement (00:00, 08:00, 16:00 UTC; some coins settle every 4h) while the rate is positive. Slots are filled with the 20 coins that have the highest positive funding among the top-coin list
   (needs a live OKX perpetual and a spot market). A slot is closed after 3 settlements in a row with negative funding, then refilled with the best remaining coin.
   Costs: spot taker 0.10% + perp taker 0.055% on each leg and each of entry and exit, plus the bid/ask spread (spot bought at the ask and perp shorted at the bid; marks use the exit side). Spot is simulated from OKX spot prices, nothing is bought. Rows live in table ap_carry. Forward test. */
/* v2 ($1,000 reset): 5 slots x ($100 spot + $100 short perp) = $1,000. Enter only when funding clears the round-trip cost (0.03% per settlement is about 3.4 days to break even); exit after 3 settlements in a row below exitBelow. */
export const CARRY = { slots: 5, leg: 100, spotFee: 0.001, perpFee: FEE, minRate: 0.0003, exitBelow: 0.00005, exitNegative: 3, scanEveryMin: 30 };
export const carryFees = () => CARRY.leg * (CARRY.spotFee + CARRY.perpFee);
/* funding the short received for settlements newer than `sinceMs`; history = OKX rows { fundingRate, fundingTime } */
export function carryFunding(history, sinceMs, notional) {
  const fresh = history.filter((h) => +h.fundingTime > sinceMs).sort((a, b) => +a.fundingTime - +b.fundingTime);
  return { earned: fresh.reduce((s, h) => s + notional * +h.fundingRate, 0), lastTs: fresh.length ? +fresh[fresh.length - 1].fundingTime : sinceMs, n: fresh.length };
}
export const carryShouldExit = (history) => { const h = history.slice().sort((a, b) => +b.fundingTime - +a.fundingTime).slice(0, CARRY.exitNegative); return h.length >= CARRY.exitNegative && h.every((x) => +x.fundingRate < CARRY.exitBelow); };
export const carryPriceNet = (row, spot, perp) => (+row.spot_qty) * (spot - +row.spot_entry) + (+row.perp_qty) * (+row.perp_entry - perp);
let carryScanAt = 0;
export async function carryTick(db, ctl, now = Date.now()) {
  const out = [];
  const open = await db.select('ap_carry', 'select=*&status=eq.open&coin=not.like.*-*');
  const spotT = {}, swapT = {};
  const quote = (t) => ({ last: +t.last, bid: +t.bidPx > 0 ? +t.bidPx : +t.last, ask: +t.askPx > 0 ? +t.askPx : +t.last });
  for (const t of await okx('/api/v5/market/tickers?instType=SPOT')) spotT[t.instId] = quote(t);
  for (const t of await okx('/api/v5/market/tickers?instType=SWAP')) swapT[t.instId] = quote(t);
  const settleWindow = new Date(now).getUTCMinutes() < 30;
  for (const row of open) {
    const sp = spotT[row.coin + '-USDT'], pp = swapT[row.coin + '-USDT-SWAP']; // marks use the exit side: sell spot at the bid, buy the short back at the ask
    let hist = [], funding = +row.funding_total, lastTs = +row.last_funding_ts;
    if (settleWindow) {
      hist = await okx('/api/v5/public/funding-rate-history?instId=' + row.coin + '-USDT-SWAP&limit=10').catch(() => []);
      const f = carryFunding(hist, lastTs, +row.leg_usd); funding += f.earned; lastTs = f.lastTs; if (f.n) out.push(row.coin + ' funding ' + f.earned.toFixed(4) + ' (' + f.n + ' settlements)');
    }
    if (!sp || !pp || !(sp.bid > 0) || !(pp.ask > 0)) { if (settleWindow) await db.update('ap_carry', 'id=eq.' + row.id, { funding_total: funding, last_funding_ts: lastTs }); continue; }
    const priceNet = carryPriceNet(row, sp.bid, pp.ask), exit = settleWindow && carryShouldExit(hist), fees = +row.fees + (exit ? carryFees() : 0);
    await db.update('ap_carry', 'id=eq.' + row.id, Object.assign({ funding_total: funding, last_funding_ts: lastTs, spot_last: sp.bid, perp_last: pp.ask, price_pnl: priceNet, fees, net_pnl: funding + priceNet - fees, updated_at: new Date(now).toISOString() }, exit ? { status: 'closed', closed_at: new Date(now).toISOString(), close_reason: 'funding negative ' + CARRY.exitNegative + 'x' } : {}));
    if (exit) out.push(row.coin + ' closed (funding negative)');
  }
  const recent = await db.select('ap_carry', 'select=coin&status=eq.closed&closed_at=gte.' + new Date(now - 86400000).toISOString()).catch(() => []);
  const held = new Set(open.map((r) => r.coin).concat(recent.map((r) => r.coin))); // a coin that just turned negative waits 24h
  const free = CARRY.slots - open.length;
  if (free <= 0 || ctlBlocks(ctl, 'carry', '') || now - carryScanAt < CARRY.scanEveryMin * 60000) return out;
  carryScanAt = now;
  const cands = TOP.filter((c) => !held.has(c) && INST[c + '-USDT-SWAP'] && INST[c + '-USDT-SWAP'].state === 'live' && spotT[c + '-USDT'] && spotT[c + '-USDT'].last > 0 && swapT[c + '-USDT-SWAP'] && swapT[c + '-USDT-SWAP'].last > 0 && !(ctl && ctl.coinsOff && ctl.coinsOff[c]));
  const rates = [];
  for (let i = 0; i < cands.length; i += 8) {
    const part = await Promise.all(cands.slice(i, i + 8).map((c) => okx('/api/v5/public/funding-rate?instId=' + c + '-USDT-SWAP').then((d) => ({ c, r: +d[0].fundingRate })).catch(() => null)));
    for (const x of part) if (x && isFinite(x.r)) { const s = spotT[x.c + '-USDT'], p = swapT[x.c + '-USDT-SWAP']; x.spread = (s.ask - s.bid) / s.last + (p.ask - p.bid) / p.last; rates.push(x); }
    if (i + 8 < cands.length) await new Promise((r) => setTimeout(r, 1000));
  }
  // many coins sit at the same 0.01% base rate, so ties (to 0.001%) go to the coin with the tightest spreads; coins whose two spreads add up to more than 0.2% are skipped
  const bucket = (r) => Math.round(r * 1e5);
  const best = rates.filter((x) => x.r >= CARRY.minRate && x.spread <= 0.002).sort((a, b) => bucket(b.r) - bucket(a.r) || a.spread - b.spread).slice(0, free);
  for (const { c, r } of best) {
    const S = spotT[c + '-USDT'], P = swapT[c + '-USDT-SWAP'], sp = S.ask, pp = P.bid, drift = (CARRY.leg / sp) * (S.bid - sp) + (CARRY.leg / pp) * (pp - P.ask); // buy spot at the ask, short the perp at the bid; the spread shows up as price drift
    await db.insert('ap_carry', { coin: c, status: 'open', opened_at: new Date(now).toISOString(), leg_usd: CARRY.leg, spot_entry: sp, perp_entry: pp, spot_qty: CARRY.leg / sp, perp_qty: CARRY.leg / pp, entry_rate: r, funding_total: 0, last_funding_ts: now, spot_last: S.bid, perp_last: P.ask, price_pnl: drift, fees: carryFees(), net_pnl: drift - carryFees(), updated_at: new Date(now).toISOString() });
    out.push('carry opened ' + c + ' funding ' + (r * 100).toFixed(4) + '%');
  }
  if (!best.length) out.push('carry: no coin with funding >= ' + (CARRY.minRate * 100).toFixed(3) + '% (' + rates.length + ' checked)');
  return out;
}

const shared0Breadth = (rows) => rows.filter((r) => r.F.ret_60m < 0).length / Math.max(1, rows.length);
/* :sig AI signals, PAPER (Koko's old "Volume Harvester" n8n bot, rebuilt as a tracked paper desk). Every 30 minutes Claude reads 24h stats for 8 liquid coins
   and proposes up to 3 scalps with the old rules: SL 0.2-0.4% away, TP 0.4-0.7% away, TP at least 1.5x SL, leverage max 3x, skip coins that moved more than 6% in 24h.
   Each valid signal opens at the live price (the TP/SL distances are kept, re-based on the real entry), $100 margin x the signal's leverage, taker fees both ways,
   funding booked at close, stop checked before take profit inside the same minute (conservative), 24h time limit. One open signal per coin. Paper only: nothing is sent to an exchange. */
export const SIG = { coins: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'AVAX', 'DOGE', 'ARB'], margin: 100, maxLev: 3, slMin: 0.2, slMax: 0.4, tpMin: 0.4, tpMax: 0.7, rrMin: 1.5, holdH: 24, everyMin: 30 };
export function sigValid(s) {
  const e = +s.entry, sl = +s.sl, tp = +s.tp, dir = s.direction === 'LONG' ? 1 : s.direction === 'SHORT' ? -1 : 0;
  if (!dir || !(e > 0) || !(sl > 0) || !(tp > 0)) return null;
  const slPct = (dir * (e - sl)) / e * 100, tpPct = (dir * (tp - e)) / e * 100;
  if (slPct < SIG.slMin || slPct > SIG.slMax || tpPct < SIG.tpMin || tpPct > SIG.tpMax || tpPct < slPct * SIG.rrMin) return null;
  return { dir, slPct, tpPct, lev: Math.max(1, Math.min(SIG.maxLev, Math.round(+s.leverage) || 1)) };
}
/* :trend Trend momentum (weekly, from 21 Oct 2026). Follow the trend instead of fighting it, and only when the market is in an up-trend.
   v1.53: only coins with a positive 30-day return are bought (absolute momentum); fewer than 5 qualifying means part of the desk stays in cash.
   Once a week, shortly after the 07:00 Bangkok close (07:10-07:25): if BTC is above its 200-day average, buy the 5 coins (top-50 universe) with the strongest 30-day return, $200 margin each at 2x
   ($400 position each, $2,000 in total on the $1,000 desk), held 7 days, then rebalanced. Each leg has a -20% price stop (well before liquidation at 2x).
   Every day after the 07:00 close: if BTC closes below its 200-day average, every trend leg is closed and the desk waits in cash. Taker fees and funding booked. Paper. */
export const TREND = { k: 5, margin: 200, lev: 2, holdDays: 7, stop: 0.20, lookback: 30, sma: 200 };
async function dailyCloses(inst, n) {
  let out = [], after = '';
  while (out.length < n) { const d = await okx('/api/v5/market/history-candles?instId=' + inst + '&bar=1Dutc&limit=100' + (after ? '&after=' + after : '')); if (!d || !d.length) break; out = out.concat(d.filter((k) => k[8] !== '0')); after = d[d.length - 1][0]; if (d.length < 100) break; }
  return out.slice(0, n).map((k) => +k[4]); // newest first, confirmed daily closes
}
export function trendRegime(btcCloses) { if (btcCloses.length < TREND.sma) return null; const sma = btcCloses.slice(0, TREND.sma).reduce((a, b) => a + b, 0) / TREND.sma; return { above: btcCloses[0] > sma, btc: btcCloses[0], sma }; }
export async function trendTick(db, rows, openPos, ctl, now = Date.now()) {
  const out = [];
  for (const p of openPos) { const r = rows.find((x) => x.coin === p.coin.split(':')[0]); if (r) { const x = await manageOpen(db, p, r.m).catch(() => null); if (x && x.closed) out.push(p.coin + ' ' + x.why + ' ' + x.pnl.toFixed(2)); } }
  const since = now - boundaryAt(now); if (since < 10 * 60000 || since > 25 * 60000) return out; // decide 10-25 minutes after the 07:00 close, away from the busy close tick
  const reg = trendRegime(await dailyCloses('BTC-USDT', TREND.sma + 5));
  if (!reg) return out.concat(['trend: not enough BTC history']);
  const still = (await db.select('ap_positions', 'select=*&status=eq.open&coin=like.*:trend').catch(() => openPos.filter((p) => p.status === 'open')));
  if (!reg.above) {
    for (const p of still) { const r = rows.find((x) => x.coin === p.coin.split(':')[0]); if (r) { const v = await closePos(db, p, r.m.price, 'regime: BTC below 200-day average'); out.push(p.coin + ' closed (BTC below 200d) ' + v.toFixed(2)); } }
    return out.concat(['trend: cash, BTC ' + reg.btc.toFixed(0) + ' below 200-day average ' + reg.sma.toFixed(0)]);
  }
  if (still.length || ctlBlocks(ctl, 'trend', '')) return out;
  const last = (await db.select('ap_positions', 'select=opened_at&coin=like.*:trend&order=opened_at.desc&limit=1').catch(() => []))[0];
  if (!batchDue(last, now, TREND.holdDays)) return out;
  const cand = rows.filter((r) => revOk(r) && !(ctl && ctl.coinsOff && ctl.coinsOff[r.coin]) && (r.spread_bps == null || r.spread_bps <= MAX_SPREAD_BPS));
  const ranked = [];
  for (let i = 0; i < cand.length; i += 10) await Promise.all(cand.slice(i, i + 10).map(async (r) => { try { const c = await dailyCloses(r.coin + '-USDT', TREND.lookback + 1); if (c.length > TREND.lookback) ranked.push({ r, ret: r.m.price / c[TREND.lookback - 1] - 1 }); } catch (e) {} }));
  ranked.sort((a, b) => b.ret - a.ret);
  const deadline = new Date(nextClose(now, TREND.holdDays)).toISOString();
  const winners = ranked.filter((x) => x.ret > 0).slice(0, TREND.k); // v1.53: only coins that are actually up over 30 days; the rest of the money stays in cash
  if (!winners.length) out.push('trend: no coin is up over 30 days, cash this week');
  for (const { r, ret } of winners) {
    const px = r.m.price, d = decFor(px) + 2, notional = TREND.margin * TREND.lev;
    await db.insert('ap_positions', { coin: r.coin + ':trend', side: 'LONG', entry_price: px, size: notional / px, notional, tp: +(px * 100).toFixed(d), sl: +(px * (1 - TREND.stop)).toFixed(d), max_hold_until: deadline });
    out.push('trend opened LONG ' + r.coin + ' (30d ' + (ret * 100).toFixed(1) + '%)');
  }
  return out;
}

/* :thold Trend hold (from 22 Oct 2026). The "hold good coins with controlled risk" idea as a rule: BTC $400, ETH $300, SOL $300 of margin at 2x, each held only while
   its daily close is above its own 100-day average; below it, that coin is sold and waits in cash until it closes back above. Checked once a day just after the 07:00 close.
   A -30% price stop per coin guards against a crash between checks. Very few trades, so fees stay low. Taker fees and funding booked. Paper. */
export const THOLD = { coins: { BTC: 400, ETH: 300, SOL: 300 }, lev: 2, sma: 100, stop: 0.30 };
export async function tholdTick(db, rows, openPos, ctl, now = Date.now()) {
  const out = [];
  for (const p of openPos) { const r = rows.find((x) => x.coin === p.coin.split(':')[0]); if (r) { const x = await manageOpen(db, p, r.m).catch(() => null); if (x && x.closed) out.push(p.coin + ' ' + x.why + ' ' + x.pnl.toFixed(2)); } }
  const since = now - boundaryAt(now); if (since < 10 * 60000 || since > 25 * 60000) return out;
  const open = await db.select('ap_positions', 'select=*&status=eq.open&coin=like.*:thold').catch(() => openPos);
  for (const c of Object.keys(THOLD.coins)) {
    const r = rows.find((x) => x.coin === c); if (!r) continue;
    let closes; try { closes = await dailyCloses(c + '-USDT', THOLD.sma + 2); } catch (e) { out.push('thold ' + c + ' history error'); continue; }
    if (closes.length < THOLD.sma) continue;
    const sma = closes.slice(0, THOLD.sma).reduce((a, b) => a + b, 0) / THOLD.sma, above = closes[0] > sma, mine = open.filter((p) => p.coin === c + ':thold');
    if (!above && mine.length) { for (const p of mine) { const v = await closePos(db, p, r.m.price, 'trend exit: close below 100-day average'); out.push(c + ':thold sold (below 100d) ' + v.toFixed(2)); } }
    else if (above && !mine.length && !ctlBlocks(ctl, 'thold', c)) {
      const px = r.m.price, d = decFor(px) + 2, notional = THOLD.coins[c] * THOLD.lev;
      await db.insert('ap_positions', { coin: c + ':thold', side: 'LONG', entry_price: px, size: notional / px, notional, tp: +(px * 100).toFixed(d), sl: +(px * (1 - THOLD.stop)).toFixed(d), max_hold_until: '2099-12-31T00:00:00Z' });
      out.push('thold bought ' + c + ' (close ' + closes[0] + ' above 100d ' + sma.toFixed(2) + ')');
    } else out.push('thold ' + c + (above ? ' holding (above 100d)' : ' cash (below 100d)'));
  }
  return out;
}
/* :crash Crash buyer (from 22 Oct 2026). The one pattern the 5-year study liked: after the market falls hard, the weakest coins bounce over the next few days.
   At the 07:00 close, only if the average top-50 coin is down 3% or more over 24h: buy the 5 weakest, $100 margin each at 3x, hold 3 days (-15% price stop). Otherwise cash. Paper. */
export const CRASH = { trigger: -3, k: 5, margin: 100, lev: 3, holdDays: 3, stop: 0.15 };
export async function crashTick(db, rows, openPos, ctl, now = Date.now()) {
  const out = [];
  for (const p of openPos) { const r = rows.find((x) => x.coin === p.coin.split(':')[0]); if (r) { const x = await manageOpen(db, p, r.m).catch(() => null); if (x && x.closed) out.push(p.coin + ' ' + x.why + ' ' + x.pnl.toFixed(2)); } }
  const since = now - boundaryAt(now); if (since < 10 * 60000 || since > 25 * 60000) return out;
  if (openPos.length || ctlBlocks(ctl, 'crash', '')) return out;
  const u = rows.filter((r) => revOk(r) && r.m.change24h_pct != null && (r.spread_bps == null || r.spread_bps <= MAX_SPREAD_BPS));
  if (u.length < 20) return out;
  const mk = u.reduce((t, r) => t + r.m.change24h_pct, 0) / u.length;
  if (mk > CRASH.trigger) return out.concat(['crash waiting: market 24h ' + mk.toFixed(2) + '% (needs ' + CRASH.trigger + '% or worse)']);
  const last = (await db.select('ap_positions', 'select=opened_at&coin=like.*:crash&order=opened_at.desc&limit=1').catch(() => []))[0];
  if (last && now - new Date(last.opened_at).getTime() < 20 * 3600e3) return out;
  const deadline = new Date(nextClose(now, CRASH.holdDays)).toISOString();
  for (const r of u.sort((a, b) => a.m.change24h_pct - b.m.change24h_pct).slice(0, CRASH.k)) {
    const px = r.m.price, d = decFor(px) + 2, notional = CRASH.margin * CRASH.lev;
    await db.insert('ap_positions', { coin: r.coin + ':crash', side: 'LONG', entry_price: px, size: notional / px, notional, tp: +(px * 100).toFixed(d), sl: +(px * (1 - CRASH.stop)).toFixed(d), max_hold_until: deadline });
    out.push('crash bought ' + r.coin + ' (' + r.m.change24h_pct.toFixed(1) + '% 24h, market ' + mk.toFixed(1) + '%)');
  }
  return out;
}

export async function sigTick(db, rows, openPos, ctl, env, now = Date.now()) {
  const out = [];
  for (const p of openPos) { const r = rows.find((x) => x.coin === p.coin.split(':')[0]); if (r) { const x = await manageOpen(db, p, r.m).catch(() => null); if (x && x.closed) out.push(p.coin + ' ' + x.why + ' ' + x.pnl.toFixed(2)); } }
  if (now % (SIG.everyMin * 60000) >= 5 * 60000 || ctlBlocks(ctl, 'sig', '') || !env.ANTHROPIC_API_KEY) return out; // one run per 30-minute window
  const tk = {}; for (const t of await okx('/api/v5/market/tickers?instType=SWAP')) tk[t.instId] = t;
  let msg = 'Watchlist (24h stats)\n\n';
  for (const c of SIG.coins) { const t = tk[c + '-USDT-SWAP']; if (!t) continue; const last = +t.last, o = +t.open24h, hi = +t.high24h, lo = +t.low24h;
    msg += c + 'USDT\nPrice: $' + last + '\n24h: ' + ((last / o - 1) * 100).toFixed(2) + '%\n24h Range: ' + ((hi - lo) / lo * 100).toFixed(2) + '%\nVolume: $' + (+t.volCcy24h * last / 1e6).toFixed(0) + 'M\n\n'; }
  const prompt = 'You are a high-frequency crypto scanner.\n\nRULES:\n- TP distance must be between 0.4% and 0.7% from entry\n- SL distance must be between 0.2% and 0.4% from entry\n- TP must be at least 1.5x SL distance\n- Leverage: max 3x\n- Max 3 setups per run\n- Confidence 5 or higher\n- Both LONG and SHORT allowed\n- Match direction to short-term momentum\n- Skip extremely volatile (24h move above 6%)\n\nOUTPUT: JSON array only.\nFormat: [{"symbol":"BTCUSDT","direction":"LONG","entry":78000,"sl":77766,"tp":78390,"leverage":3,"confidence":6,"reason":"brief"}]\n\nIf nothing qualifies: []\n\nData:\n' + msg;
  let arr = [];
  try { const text = await claude(env.ANTHROPIC_API_KEY, { max_tokens: 800, messages: [{ role: 'user', content: prompt }] }); const a = text.indexOf('['), b = text.lastIndexOf(']'); if (a >= 0 && b > a) arr = JSON.parse(text.slice(a, b + 1)); } catch (e) { out.push('sig claude error ' + String(e.message).replace(/\s+/g, ' ').slice(0, 260)); return out; }
  for (const s of (Array.isArray(arr) ? arr : []).slice(0, 3)) {
    const coin = String(s.symbol || '').replace(/USDT$/, '').toUpperCase(), v = sigValid(s), r = rows.find((x) => x.coin === coin);
    if (!SIG.coins.includes(coin)) continue;
    if (!v) { out.push('sig rejected ' + coin + ' (outside the TP/SL rules)'); continue; }
    if (!r || openPos.some((p) => p.coin === coin + ':sig') || (ctl && ctl.coinsOff && ctl.coinsOff[coin])) continue;
    const px = r.m.price, d = decFor(px) + 2, notional = SIG.margin * v.lev;
    await db.insert('ap_positions', { coin: coin + ':sig', side: v.dir > 0 ? 'LONG' : 'SHORT', entry_price: px, size: notional / px, notional, tp: +(px * (1 + v.dir * v.tpPct / 100)).toFixed(d), sl: +(px * (1 - v.dir * v.slPct / 100)).toFixed(d), max_hold_until: new Date(now + SIG.holdH * 3600e3).toISOString(), close_reason: 'sig: conf ' + (+s.confidence || 0) + ' · ' + String(s.reason || '').slice(0, 120) });
    out.push('sig opened ' + (v.dir > 0 ? 'LONG ' : 'SHORT ') + coin + ' ' + v.lev + 'x TP +' + v.tpPct.toFixed(2) + '% SL -' + v.slPct.toFixed(2) + '%');
  }
  return out;
}

export async function tickAll(env) {
  if (!env.SUPABASE_SERVICE_KEY || !env.ANTHROPIC_API_KEY) return [{ skipped: 'missing keys' }];
  const { rows, db } = await scanAll(env);
  const ctl = await loadControl(db); ctl.auto = await autoPaused(db, ctl.lossLimit);
  const openAll = await db.select('ap_positions', 'select=*&status=eq.open');
  const pulled = await pullDeadlines(db, openAll).catch(() => []);
  const funded = await prefetchFunding(openAll).catch(() => 0);
  const open = openAll.filter((p) => !p.coin.includes(':')), openAlgo = {}, openMir = openAll.filter((p) => /:[nsumg]$/.test(p.coin)), cnt = { n: 0, a: 0, s: 0, u: 0, m: 0, g: 0 };
  for (const p of openAll) { const k = modeOf(p.coin); if (k) cnt[k]++; }
  const pend = await db.select('ap_positions', 'select=*&status=eq.pending').catch(() => []);
  await pullDeadlines(db, pend).catch(() => []);
  cnt.m += pend.filter((pp) => !/:rev/.test(pp.coin)).length;
  const pendRes = await Promise.all(pend.map((pp) => { const r = rows.find((x) => x.coin === pp.coin.split(':')[0]); return r ? limitTick(db, pp, r.m).then((x) => { if (x !== 'waiting' && !/:rev/.test(pp.coin)) cnt.m--; return pp.coin + ' ' + x; }).catch(() => null) : null; }));
  for (const p of openAll) if (p.coin.endsWith(':algo') || p.coin.endsWith(':algo2') || p.coin.endsWith(':algo3') || p.coin.endsWith(':algo3b') || p.coin.endsWith(':algoq') || p.coin.endsWith(':algow') || p.coin.endsWith(':algox') || p.coin.endsWith(':algot')) openAlgo[p.coin] = p;
  const openRev = {}; for (const p of openAll) if (p.coin.endsWith(':rev')) openRev[p.coin] = p;
  const openFlip = openAll.filter((p) => p.coin.endsWith(':flip')), openRevv = openAll.filter((p) => p.coin.endsWith(':revv')), openCap = openAll.filter((p) => p.coin.endsWith(':caprev')), openRevw = openAll.filter((p) => p.coin.endsWith(':revw')), openRev2s = openAll.filter((p) => p.coin.endsWith(':rev2s')), openRevx = openAll.filter((p) => p.coin.endsWith(':revx')), openRevs = openAll.filter((p) => p.coin.endsWith(':revs')), openSpl = openAll.filter((p) => p.coin.endsWith(':spl')), openSpm = openAll.filter((p) => p.coin.endsWith(':spm'));
  const openRev2 = openAll.filter((p) => p.coin.endsWith(':rev2')), openRevm = openAll.filter((p) => p.coin.endsWith(':revm'));
  const openR3 = Object.fromEntries(Object.keys(REV3.hours).map((k) => [k, openAll.filter((p) => p.coin.endsWith(':' + k))]));
  const openSet = new Set(open.map((p) => p.coin)), closedAlgo = {};
  for (const x of await selectAll(db, 'ap_positions', 'select=coin,pnl,closed_at&status=eq.closed&coin=like.*:algo&order=closed_at.desc,id.desc').catch(() => [])) (closedAlgo[x.coin] = closedAlgo[x.coin] || []).push(x);
  for (const x of await selectAll(db, 'ap_positions', 'select=coin,pnl,closed_at&status=eq.closed&coin=like.*:algo2&order=closed_at.desc,id.desc').catch(() => [])) (closedAlgo[x.coin] = closedAlgo[x.coin] || []).push(x);
  for (const x of await selectAll(db, 'ap_positions', 'select=coin,pnl,closed_at&status=eq.closed&coin=like.*:algoq&order=closed_at.desc,id.desc').catch(() => [])) (closedAlgo[x.coin] = closedAlgo[x.coin] || []).push(x);
  for (const x of await selectAll(db, 'ap_positions', 'select=coin,pnl,closed_at&status=eq.closed&coin=like.*:algo3&order=closed_at.desc,id.desc').catch(() => [])) (closedAlgo[x.coin] = closedAlgo[x.coin] || []).push(x);
  for (const x of await selectAll(db, 'ap_positions', 'select=coin,pnl,closed_at&status=eq.closed&coin=like.*:algow&order=closed_at.desc,id.desc').catch(() => [])) (closedAlgo[x.coin] = closedAlgo[x.coin] || []).push(x);
  for (const x of await selectAll(db, 'ap_positions', 'select=coin,pnl,closed_at&status=eq.closed&coin=like.*:algox&order=closed_at.desc,id.desc').catch(() => [])) (closedAlgo[x.coin] = closedAlgo[x.coin] || []).push(x);
  for (const x of await selectAll(db, 'ap_positions', 'select=coin,pnl,closed_at&status=eq.closed&coin=like.*:algot&order=closed_at.desc,id.desc').catch(() => [])) (closedAlgo[x.coin] = closedAlgo[x.coin] || []).push(x);
  for (const x of await selectAll(db, 'ap_positions', 'select=coin,pnl,closed_at&status=eq.closed&coin=like.*:algo3b&order=closed_at.desc,id.desc').catch(() => [])) (closedAlgo[x.coin] = closedAlgo[x.coin] || []).push(x);
  const breadth = shared0Breadth(rows), VN = ['algo', 'algo2', 'algo3', 'algoq', 'algow', 'algox', 'algot', 'algo3b'], TAG = [' ', ' v2 ', ' v3 ', ' q ', ' w ', ' x ', ' t ', ' v3+ '];
  const revRes = await revTick(db, rows, openRev, ctl).catch((e) => ['rev error ' + String(e.message || e).slice(0, 60)]);
  const rev2Res = await rev2Tick(db, rows, openRev2, ctl, 'rev2').catch((e) => ['rev2 error ' + String(e.message || e).slice(0, 60)]);
  const revmRes = await rev2Tick(db, rows, openRevm, ctl, 'revm').catch((e) => ['revm error ' + String(e.message || e).slice(0, 60)]);
  const flipRes = await revVariantTick(db, rows, openFlip, ctl, 'flip').catch((e) => ['flip error ' + String(e.message || e).slice(0, 60)]);
  const revvRes = await revVariantTick(db, rows, openRevv, ctl, 'revv').catch((e) => ['revv error ' + String(e.message || e).slice(0, 60)]);
  const splRes = await spotDeskTick(db, rows, openSpl, ctl, 'spl').catch((e) => ['spl error ' + String(e.message || e).slice(0, 60)]);
  const spmRes = await spotDeskTick(db, rows, openSpm, ctl, 'spm').catch((e) => ['spm error ' + String(e.message || e).slice(0, 60)]);
  const dfcRes = await dfcTick(db, ctl).catch((e) => ['dfc error ' + String(e.message || e).slice(0, 80)]);
  const revwRes = await revVariantTick(db, rows, openRevw, ctl, 'revw').catch((e) => ['revw error ' + String(e.message || e).slice(0, 60)]);
  const rev2sRes = await rev2Tick(db, rows, openRev2s, ctl, 'rev2s').catch((e) => ['rev2s error ' + String(e.message || e).slice(0, 60)]);
  const tholdRes = await tholdTick(db, rows, openAll.filter((p) => p.coin.endsWith(':thold')), ctl).catch((e) => ['thold error ' + String(e.message || e).slice(0, 80)]);
  const crashRes = await crashTick(db, rows, openAll.filter((p) => p.coin.endsWith(':crash')), ctl).catch((e) => ['crash error ' + String(e.message || e).slice(0, 80)]);
  const trendRes = await trendTick(db, rows, openAll.filter((p) => p.coin.endsWith(':trend')), ctl).catch((e) => ['trend error ' + String(e.message || e).slice(0, 80)]);
  const sigRes = await sigTick(db, rows, openAll.filter((p) => p.coin.endsWith(':sig')), ctl, env).catch((e) => ['sig error ' + String(e.message || e).slice(0, 60)]);
  const revxRes = await revxTick(db, rows, openRevx, ctl).catch((e) => ['revx error ' + String(e.message || e).slice(0, 60)]);
  const pickRes = await picksTick(db, ctl).catch((e) => ['pick error ' + String(e.message || e).slice(0, 80)]);
  const revsRes = await revVariantTick(db, rows, openRevs, ctl, 'revs').catch((e) => ['revs error ' + String(e.message || e).slice(0, 60)]);
  const capRes = await revVariantTick(db, rows, openCap, ctl, 'caprev').catch((e) => ['caprev error ' + String(e.message || e).slice(0, 60)]);
  const r3Res = {}; for (const k of Object.keys(REV3.hours)) r3Res[k] = await rev3Tick(db, rows, openR3[k], ctl, k).catch((e) => [k + ' error ' + String(e.message || e).slice(0, 60)]);
  const carryRes = RETIRED.has('carry') ? ['carry retired'] : await carryTick(db, ctl).catch((e) => ['carry error ' + String(e.message || e).slice(0, 80)]);
  const algoRes = await Promise.all(VN.flatMap((v, vi) => rows.map((r) => algoTick(db, r, openAlgo, closedAlgo, v, breadth, ctl).then((s) => r.coin + TAG[vi] + s).catch((e) => r.coin + ' error ' + String(e.message || e).slice(0, 60)))));
  const mirRes = await Promise.all(openMir.map((pp) => { const r = rows.find((x) => x.coin === pp.coin.split(':')[0]); return r ? manageOpen(db, pp, r.m).then((x) => { if (x.closed) cnt[modeOf(pp.coin)]--; return x.closed ? pp.coin + ' closed ' + x.pnl.toFixed(2) : null; }).catch(() => null) : null; }));
  const rets = rows.map((r) => r.F.ret_60m).sort((x, y) => x - y), btc = rows.find((r) => r.coin === 'BTC');
  const closed = await db.select('ap_positions', 'select=side,pnl&status=eq.closed&coin=not.like.*:*&order=closed_at.desc&limit=40').catch(() => []);
  const trk = (s) => { const a = closed.filter((x) => x.side === s); return { trades: a.length, wins: a.filter((x) => +x.pnl > 0).length, pnl: +a.reduce((p, x) => p + +x.pnl, 0).toFixed(2) }; };
  const shared = {
    breadth: rows.filter((r) => r.F.ret_60m < 0).length / Math.max(1, rows.length), ctl,
    modes: Object.fromEntries(MODES.map((md) => [md.id, { n: md.cap - cnt[md.id] }])), btc60: btc ? btc.F.ret_60m : null,
    mkt: { coins_scanned: rows.length, up_60m: rows.filter((r) => r.F.ret_60m > 0).length, down_60m: rows.filter((r) => r.F.ret_60m < 0).length, median_ret_60m_pct: r4(rets[Math.floor(rets.length / 2)] || 0), btc_ret_60m_pct: btc ? r4(btc.F.ret_60m) : null, btc_change24h_pct: btc ? r4(btc.m.change24h_pct) : null },
    track: { last_40_closed: { LONG: trk('LONG'), SHORT: trk('SHORT') } }
  };
  // manage every open trade, then ask Claude about the PICKS coins whose move is biggest versus their own noise
  const picks = rows.filter((r) => !openSet.has(r.coin)).sort((a, b) => b.z - a.z).slice(0, PICKS).map((r) => r.coin);
  shared.rank = {}; picks.forEach((c, i) => { shared.rank[c] = i; });
  for (const md of MODES) shared.modes[md.id].n = md.cap - cnt[md.id];
  const todo = RETIRED.has('ai') ? [] : Array.from(openSet).concat(picks).filter((s) => COINS[s]); // AI desks retired 18 Oct: no Claude calls
  const res = await Promise.all(todo.map((coin) => tick(env, coin, shared).catch((e) => ({ coin, error: String(e.message || e).slice(0, 200) }))));
  return [{ scanned: rows.length, deadlinesPulled: pulled.length, fundingPrefetched: funded, picks, open: Array.from(openSet), algo: algoRes.filter((x) => /opened|closed|error/.test(x)), rev: revRes, rev2: rev2Res, revm: revmRes, flip: flipRes, revv: revvRes, caprev: capRes, revw: revwRes, revs: revsRes, pick: pickRes, revx: revxRes, sig: sigRes, trend: trendRes, thold: tholdRes, crash: crashRes, rev2s: rev2sRes, spl: splRes, spm: spmRes, dfc: dfcRes, rev3: r3Res, carry: carryRes, breadth: +breadth.toFixed(2), control: { paused: ctl.paused, off: Object.keys(ctl.off).filter((k) => ctl.off[k]), auto: Object.keys(ctl.auto), coinsOff: Object.keys(ctl.coinsOff).filter((k) => ctl.coinsOff[k]) }, mirrorsClosed: mirRes.filter(Boolean), limits: pendRes.filter(Boolean), openByDesk: cnt }].concat(res);
}

/* Pick which coin the news job scans next: coins with an open trade or the biggest 24h move, oldest scan first. */
export async function pickNewsCoin(env) {
  const db = sb(env.SUPABASE_SERVICE_KEY);
  await loadInstruments(db);
  const [tk, news, open] = await Promise.all([okx('/api/v5/market/tickers?instType=SWAP'), db.select('ap_news', 'select=coin,ts&order=ts.desc&limit=300'), db.select('ap_positions', 'select=coin&status=eq.open&coin=not.like.*:*')]);
  const last = {}; for (const n of news) if (!last[n.coin]) last[n.coin] = new Date(n.ts).getTime();
  const move = {}; for (const t of tk) { const s = t.instId.replace('-USDT-SWAP', ''); if (COINS[s]) move[s] = Math.abs((+t.last - +t.open24h) / +t.open24h); }
  const openSet = new Set(open.map((p) => p.coin)), hot = Object.keys(move).sort((a, b) => move[b] - move[a]).slice(0, 5);
  const cand = Array.from(new Set(['BTC'].concat(Array.from(openSet), hot))).filter((s) => COINS[s] && Date.now() - (last[s] || 0) > 2 * 3600000);
  cand.sort((x, y) => (openSet.has(y) - openSet.has(x)) || ((last[x] || 0) - (last[y] || 0)));
  return cand[0] || null;
}
