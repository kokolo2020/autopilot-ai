/* Lab desks, part 2 (from 22 Oct 2026). Paper only. Runs in its own scheduled function (netlify/functions/lab2.mjs, every 5 minutes) so its extra API calls
   never slow the main tick. Each desk uses information the older desks never looked at (funding clock, crowd positioning, BTC-neutral strength, pairs,
   a second exchange). Taker fees both ways; OKX funding is booked at close for every OKX leg (closePos); the Hyperliquid leg books Hyperliquid funding here.

   :fdt  FUNDING-TIME DRIFT - 35-45 minutes before each 8-hourly settlement (00/08/16 UTC = 07/15/23 Bangkok) take the 3 top-50 coins with the most extreme
         funding (|rate| >= 0.012%) and trade against the side that pays (rate > 0 -> short). Close 5 minutes after the settlement. TP/SL 1%. Funding is booked.
   :lsr  CROWD VS TOP TRADERS - every 8 hours (01/09/17 UTC) on 10 big coins: compare OKX's long/short ratio of all accounts with the top traders' position ratio.
         Long the 2 coins where top traders are most long relative to the crowd, short the 2 where they are most short. 8h hold, TP 3%, SL 2%.
   :rmom RESIDUAL MOMENTUM - weekly (30-40 minutes after the 07:00 close, every 7 days): for each top-50 coin remove its normal BTC move (beta from 60 days of
         daily returns) and rank the leftover 30-day strength (skipping the last day), scaled by its noise. Long the top 4, short the bottom 4 ($250 each),
         plus a BTC leg that cancels the basket's net BTC exposure. 7-day hold, 25% stop per leg.
   :pair PAIRS - 6 fixed pairs of related coins. Hourly: z-score of today's price ratio against the last 60 daily closes. |z| >= 2: short the rich coin, long
         the cheap one ($250 each). Exit when |z| <= 0.5, stop at |z| >= 3.5, or after 10 days. Both legs always close together.
   :fspo + :fsph  FUNDING SPREAD OKX vs HYPERLIQUID - every 30 minutes compare each coin's annualised funding on the two exchanges. Spread >= 15%/yr: short
         where funding is higher, long where it is lower, $500 each leg (price moves cancel, the funding difference is the profit). Exit when the spread falls
         below 3%/yr or flips, or after 7 days. Up to 3 coins. Hyperliquid fees 0.045% per side. */
import { sb, okx, closePos, manageOpen, ctlBlocks, loadControl, autoPaused, decFor, REV_UNI, boundaryAt, nextClose, batchDue, dailyCloses } from './ap.mjs';

export const FDT = { minAbs: 0.00012, k: 3, from: 35, to: 45, afterMin: 5, tp: 1, sl: 1, n: 500 };
export const LSR = { coins: ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'LINK', 'AVAX', 'SUI'], k: 2, holdH: 8, tp: 3, sl: 2, n: 500 };
export const RMOM = { k: 4, leg: 250, look: 30, betaDays: 60, holdDays: 7, stop: 0.25, hedgeMax: 1000, minHedge: 50, minVol: 10e6 };
export const PAIR = { pairs: [['SOL', 'AVAX'], ['SUI', 'APT'], ['ARB', 'OP'], ['AAVE', 'UNI'], ['LTC', 'BCH'], ['DOGE', 'SHIB']], look: 60, zIn: 2, zOut: 0.5, zStop: 3.5, maxDays: 10, leg: 250 };
export const FSP = { enterAnn: 15, exitAnn: 3, slots: 3, leg: 500, maxDays: 7, hlFee: 0.00045 };
const STABLE = new Set(['USDC', 'USDT', 'DAI', 'FDUSD', 'TUSD', 'USDE']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const far = (px, dir, d) => ({ tp: +(px * (dir > 0 ? 100 : 0.01)).toFixed(d), sl: +(px * (dir > 0 ? 0.0001 : 100)).toFixed(d) }); // levels that never trigger (desk manages its own exits)

async function open(db, coin, suf, dir, px, notional, tp, sl, until) {
  const d = decFor(px) + 2;
  await db.insert('ap_positions', { coin: coin + ':' + suf, side: dir > 0 ? 'LONG' : 'SHORT', entry_price: px, size: notional / px, notional, tp: +(+tp).toFixed(d), sl: +(+sl).toFixed(d), max_hold_until: new Date(until).toISOString() });
}
const lvl = (px, dir, tpPct, slPct) => ({ tp: px * (1 + dir * tpPct / 100), sl: px * (1 - dir * slPct / 100) });

/* ---------- data ---------- */
async function candles1m(inst, n) { const d = await okx('/api/v5/market/candles?instId=' + inst + '&bar=1m&limit=' + n); return d.map((k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] })).sort((a, b) => a.t - b.t); }
let FUND = null;
export const _resetFund = () => { FUND = null; }; // test hook
async function allFunding() { if (FUND && Date.now() - FUND.at < 60000) return FUND.map; const m = {}; for (const f of await okx('/api/v5/public/funding-rate?instId=ANY')) m[f.instId] = f; FUND = { at: Date.now(), map: m }; return m; }
async function hl(body) { const r = await fetch('https://api.hyperliquid.xyz/info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error('hyperliquid ' + r.status); return r.json(); }
async function hlMarkets() { const [meta, ctx] = await hl({ type: 'metaAndAssetCtxs' }); const m = {}; meta.universe.forEach((u, i) => { if (ctx[i] && !u.isDelisted) m[u.name] = { funding: +ctx[i].funding, mark: +ctx[i].markPx }; }); return m; }

/* every open lab2 position (except pair legs and the Hyperliquid leg) is checked against the 1-minute candles since it opened: stop first, then take profit, then time */
async function manageAll(db, list, tk, out) {
  const coins = [...new Set(list.map((p) => p.coin.split(':')[0]))], mk = {};
  for (let i = 0; i < coins.length; i += 10) await Promise.all(coins.slice(i, i + 10).map(async (c) => { try { const cd = await candles1m(c + '-USDT-SWAP', 12); const t = tk[c + '-USDT-SWAP']; mk[c] = { price: t ? +t.last : cd[cd.length - 1].c, candles: cd }; } catch (e) {} }));
  const gone = new Set();
  for (const p of list) {
    const m = mk[p.coin.split(':')[0]]; if (!m) continue;
    const t0 = new Date(p.opened_at).getTime(), x = await manageOpen(db, p, Object.assign({}, m, { candles: m.candles.filter((k) => k.t >= t0) })).catch(() => null);
    if (x && x.closed) { gone.add(p.id); out.push(p.coin + ' ' + x.why.split(' ')[0] + ' ' + x.pnl.toFixed(2)); }
  }
  return gone;
}

/* ---------- :fdt funding-time drift ---------- */
export async function fdtTick(db, live, tk, ctl, now, out) {
  const T = Math.ceil(now / 288e5) * 288e5, mins = (T - now) / 60000; // next 00/08/16 UTC settlement
  if (mins <= FDT.from || mins > FDT.to || ctlBlocks(ctl, 'fdt', '') || live.length) return;
  const f = await allFunding(), c = [];
  for (const coin of REV_UNI) { const x = f[coin + '-USDT-SWAP'], t = tk[coin + '-USDT-SWAP']; if (!x || !t || +x.fundingTime !== T || ctl && ctl.coinsOff && ctl.coinsOff[coin]) continue; const r = +x.fundingRate; if (Math.abs(r) >= FDT.minAbs) c.push({ coin, r, px: +t.last }); }
  c.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  for (const x of c.slice(0, FDT.k)) { const dir = x.r > 0 ? -1 : 1, L = lvl(x.px, dir, FDT.tp, FDT.sl); await open(db, x.coin, 'fdt', dir, x.px, FDT.n, L.tp, L.sl, T + FDT.afterMin * 60000); out.push('fdt ' + (dir > 0 ? 'LONG ' : 'SHORT ') + x.coin + ' funding ' + (x.r * 100).toFixed(4) + '% before ' + new Date(T).toISOString().slice(11, 16) + ' UTC'); }
  if (!c.length) out.push('fdt: no top-50 coin with funding beyond ' + (FDT.minAbs * 100).toFixed(3) + '% this settlement');
}

/* ---------- :lsr crowd vs top traders ---------- */
export async function lsrTick(db, live, tk, ctl, now, out) {
  const d = new Date(now); if (d.getUTCHours() % 8 !== 1 || d.getUTCMinutes() >= 5 || ctlBlocks(ctl, 'lsr', '') || live.length) return;
  const sc = [];
  for (let i = 0; i < LSR.coins.length; i += 2) {
    await Promise.all(LSR.coins.slice(i, i + 2).map(async (c) => {
      try {
        const inst = c + '-USDT-SWAP';
        const [a, t] = await Promise.all([okx('/api/v5/rubik/stat/contracts/long-short-account-ratio-contract?instId=' + inst + '&period=1H&limit=1'), okx('/api/v5/rubik/stat/contracts/long-short-position-ratio-contract-top-trader?instId=' + inst + '&period=1H&limit=1')]);
        const crowd = +a[0][1], top = +t[0][1];
        if (crowd > 0 && top > 0 && tk[inst]) sc.push({ c, crowd, top, s: Math.log(top) - Math.log(crowd), px: +tk[inst].last });
      } catch (e) {}
    }));
    await sleep(900); // OKX allows about 5 of these calls per 2 seconds
  }
  if (sc.length < 2 * LSR.k) { out.push('lsr: only ' + sc.length + ' coins with data'); return; }
  sc.sort((a, b) => b.s - a.s);
  const legs = sc.slice(0, LSR.k).filter((x) => x.s > 0).map((x) => [x, 1]).concat(sc.slice(-LSR.k).filter((x) => x.s < 0).map((x) => [x, -1]));
  for (const [x, dir] of legs) { if (ctl && ctl.coinsOff && ctl.coinsOff[x.c]) continue; const L = lvl(x.px, dir, LSR.tp, LSR.sl); await open(db, x.c, 'lsr', dir, x.px, LSR.n, L.tp, L.sl, now + LSR.holdH * 3600e3 - 10 * 60000); out.push('lsr ' + (dir > 0 ? 'LONG ' : 'SHORT ') + x.c + ' (crowd L/S ' + x.crowd.toFixed(2) + ', top traders ' + x.top.toFixed(2) + ')'); }
}

/* ---------- :rmom residual momentum ---------- */
export function residualScores(series, btc) {
  // series/btc: daily closes, newest first. Returns { beta, score } or null.
  const n = Math.min(series.length, btc.length) - 1; if (n < RMOM.betaDays) return null;
  const r = [], b = []; for (let t = 0; t < RMOM.betaDays; t++) { r.push(Math.log(series[t] / series[t + 1])); b.push(Math.log(btc[t] / btc[t + 1])); }
  const h = (a) => a.slice(1); // skip the most recent day
  const rr = h(r), bb = h(b), mr = rr.reduce((x, y) => x + y, 0) / rr.length, mb = bb.reduce((x, y) => x + y, 0) / bb.length;
  let cov = 0, vb = 0; for (let i = 0; i < rr.length; i++) { cov += (rr[i] - mr) * (bb[i] - mb); vb += (bb[i] - mb) ** 2; }
  if (!(vb > 0)) return null;
  const beta = cov / vb, e = rr.map((x, i) => x - beta * bb[i]), me = e.reduce((x, y) => x + y, 0) / e.length;
  const sd = Math.sqrt(e.reduce((x, y) => x + (y - me) ** 2, 0) / e.length); if (!(sd > 0)) return null;
  const sum = e.slice(0, RMOM.look - 1).reduce((x, y) => x + y, 0);
  return { beta, score: sum / (sd * Math.sqrt(RMOM.look - 1)) };
}
/* :rmomr (v1.58) is the same desk pointed the other way: long the 4 weakest residual scores, short the 4 strongest. A one-year backtest (Oct 2025-Oct 2026, weekly,
   taker fees) had the original direction at -$630 and the reversed one at +$402; neither is statistically solid, so both run side by side on paper. */
let RMOM_CACHE = null;
export async function rmomTick(db, live, tk, ctl, now, out, suf = 'rmom', rev = false) {
  const since = now - boundaryAt(now); if (since < 30 * 60000 || since >= 40 * 60000 || ctlBlocks(ctl, suf, '') || live.length) return;
  const last = (await db.select('ap_positions', 'select=opened_at&coin=like.*:' + suf + '&order=opened_at.desc&limit=1').catch(() => []))[0];
  if (!batchDue(last, now, RMOM.holdDays)) return;
  let sc;
  if (RMOM_CACHE && RMOM_CACHE.day === boundaryAt(now)) sc = RMOM_CACHE.sc.slice(); else {
  const btc = await dailyCloses('BTC-USDT', RMOM.betaDays + 2);
  const uni = [...REV_UNI].filter((c) => c !== 'BTC' && !STABLE.has(c) && tk[c + '-USDT-SWAP'] && +tk[c + '-USDT-SWAP'].volCcy24h * +tk[c + '-USDT-SWAP'].last >= RMOM.minVol && !(ctl && ctl.coinsOff && ctl.coinsOff[c]));
  sc = [];
  for (let i = 0; i < uni.length; i += 10) { await Promise.all(uni.slice(i, i + 10).map(async (c) => { try { const s = residualScores(await dailyCloses(c + '-USDT', RMOM.betaDays + 2), btc); if (s) sc.push(Object.assign({ c, px: +tk[c + '-USDT-SWAP'].last }, s)); } catch (e) {} })); await sleep(400); }
  RMOM_CACHE = { day: boundaryAt(now), sc: sc.slice() };
  }
  if (sc.length < 2 * RMOM.k + 4) { out.push(suf + ': only ' + sc.length + ' coins scored'); return; }
  sc.sort((a, b) => b.score - a.score);
  const until = nextClose(now, RMOM.holdDays), top = sc.slice(0, RMOM.k), bottom = sc.slice(-RMOM.k), longs = rev ? bottom : top, shorts = rev ? top : bottom;
  let net = 0;
  for (const [g, dir] of [[longs, 1], [shorts, -1]]) for (const x of g) { await open(db, x.c, suf, dir, x.px, RMOM.leg, x.px * (dir > 0 ? 100 : 0.01), x.px * (1 - dir * RMOM.stop), until); net += dir * x.beta * RMOM.leg; out.push(suf + ' ' + (dir > 0 ? 'LONG ' : 'SHORT ') + x.c + ' (residual score ' + x.score.toFixed(2) + ', beta ' + x.beta.toFixed(2) + ')'); }
  const h = Math.min(Math.abs(net), RMOM.hedgeMax), bt = tk['BTC-USDT-SWAP'];
  if (h >= RMOM.minHedge && bt) { const dir = net > 0 ? -1 : 1, px = +bt.last; await open(db, 'BTC', suf, dir, px, +h.toFixed(2), px * (dir > 0 ? 100 : 0.01), px * (1 - dir * RMOM.stop), until); out.push(suf + ' BTC hedge ' + (dir > 0 ? 'LONG' : 'SHORT') + ' $' + h.toFixed(0)); }
}

/* ---------- :pair pairs ---------- */
export function pairZ(ca, cb, pa, pb) {
  const n = Math.min(ca.length, cb.length, PAIR.look); if (n < 30) return null;
  const x = []; for (let i = 0; i < n; i++) x.push(Math.log(ca[i] / cb[i]));
  const m = x.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / n);
  return sd > 0 ? (Math.log(pa / pb) - m) / sd : null;
}
export async function pairTick(db, legs, tk, ctl, now, out) {
  if (new Date(now).getUTCMinutes() < 10 || new Date(now).getUTCMinutes() >= 15) return; // hourly, at :10
  const zs = [];
  for (const [A, B] of PAIR.pairs) {
    const ta = tk[A + '-USDT-SWAP'], tb = tk[B + '-USDT-SWAP']; if (!ta || !tb) continue;
    const pa = +ta.last, pb = +tb.last, mine = legs.filter((p) => p.coin === A + ':pair' || p.coin === B + ':pair');
    let z; try { z = pairZ(await dailyCloses(A + '-USDT', PAIR.look), await dailyCloses(B + '-USDT', PAIR.look), pa, pb); } catch (e) { continue; }
    if (z == null) continue;
    zs.push(A + '/' + B + ' ' + z.toFixed(2));
    if (mine.length) {
      const la = mine.find((p) => p.coin === A + ':pair'), s = la && la.side === 'SHORT' ? 1 : -1, age = (now - new Date(mine[0].opened_at).getTime()) / 864e5;
      const why = s * z <= PAIR.zOut ? 'pair converged (z ' + z.toFixed(2) + ')' : s * z >= PAIR.zStop ? 'pair stop (z ' + z.toFixed(2) + ')' : age >= PAIR.maxDays ? 'pair time limit (z ' + z.toFixed(2) + ')' : null;
      if (why) { let tot = 0; for (const p of mine) tot += await closePos(db, p, p.coin === A + ':pair' ? pa : pb, why); out.push(A + '/' + B + ' ' + why + ' ' + tot.toFixed(2)); }
      continue;
    }
    if (Math.abs(z) < PAIR.zIn || Math.abs(z) >= PAIR.zStop || ctlBlocks(ctl, 'pair', A) || ctlBlocks(ctl, 'pair', B)) continue;
    const s = z > 0 ? 1 : -1, until = now + (PAIR.maxDays + 1) * 864e5; // A rich (z > 0): short A, long B
    await open(db, A, 'pair', -s, pa, PAIR.leg, far(pa, -s, decFor(pa) + 2).tp, far(pa, -s, decFor(pa) + 2).sl, until);
    await open(db, B, 'pair', s, pb, PAIR.leg, far(pb, s, decFor(pb) + 2).tp, far(pb, s, decFor(pb) + 2).sl, until);
    out.push('pair opened ' + (s > 0 ? 'SHORT ' + A + ' / LONG ' + B : 'LONG ' + A + ' / SHORT ' + B) + ' (z ' + z.toFixed(2) + ')');
  }
  out.push('pairs z: ' + (zs.join(', ') || 'no data'));
}

/* ---------- :fspo / :fsph funding spread OKX vs Hyperliquid ---------- */
export const annOkx = (f) => { const iv = (+f.fundingTime - +f.prevFundingTime) / 3600e3; return +f.fundingRate * (24 / (iv > 0 && iv <= 24 ? iv : 8)) * 365 * 100; };
export const annHl = (rate) => rate * 24 * 365 * 100;
async function closeHL(db, p, exit, why) {
  const dir = p.side === 'LONG' ? 1 : -1, t0 = new Date(p.opened_at).getTime(), n = +p.notional;
  let fund = 0; try { for (const h of await hl({ type: 'fundingHistory', coin: p.coin.split(':')[0], startTime: t0 })) if (+h.time > t0) fund -= dir * n * +h.fundingRate; } catch (e) {}
  const fees = n * FSP.hlFee * 2, pnl = n * dir * (exit - +p.entry_price) / +p.entry_price - fees + fund;
  await db.update('ap_positions', 'id=eq.' + p.id, { status: 'closed', exit_price: exit, closed_at: new Date().toISOString(), pnl, fees, close_reason: why + ' | funding ' + (fund >= 0 ? '+' : '') + fund.toFixed(2) });
  return pnl;
}
export async function fspTick(db, legs, tk, ctl, now, out) {
  const mn = new Date(now).getUTCMinutes(); if (!((mn >= 20 && mn < 25) || (mn >= 50 && mn < 55))) return;
  let H, F; try { [H, F] = await Promise.all([hlMarkets(), allFunding()]); } catch (e) { out.push('fsp error: ' + String(e.message || e).slice(0, 80)); return; }
  const spread = (c) => { const f = F[c + '-USDT-SWAP'], h = H[c]; return f && h && isFinite(h.funding) ? annOkx(f) - annHl(h.funding) : null; };
  const held = [...new Set(legs.map((p) => p.coin.split(':')[0]))];
  for (const c of held) {
    const o = legs.find((p) => p.coin === c + ':fspo'), h = legs.find((p) => p.coin === c + ':fsph'), sp = spread(c), s = o && o.side === 'SHORT' ? 1 : -1;
    const age = (now - new Date((o || h).opened_at).getTime()) / 864e5;
    const why = sp == null ? null : s * sp < FSP.exitAnn ? 'spread closed (' + sp.toFixed(1) + '%/yr)' : age >= FSP.maxDays ? 'time limit (' + sp.toFixed(1) + '%/yr)' : null;
    if (!why) continue;
    let tot = 0;
    if (o && tk[c + '-USDT-SWAP']) tot += await closePos(db, o, +tk[c + '-USDT-SWAP'].last, why);
    if (h && H[c]) tot += await closeHL(db, h, H[c].mark, why);
    out.push('fsp closed ' + c + ' ' + why + ' ' + tot.toFixed(2));
  }
  const free = FSP.slots - held.length; if (free <= 0 || ctlBlocks(ctl, 'fsp', '')) return;
  const c = [...REV_UNI].filter((x) => !held.includes(x) && H[x] && tk[x + '-USDT-SWAP'] && !(ctl && ctl.coinsOff && ctl.coinsOff[x])).map((x) => ({ c: x, sp: spread(x) })).filter((x) => x.sp != null && Math.abs(x.sp) >= FSP.enterAnn).sort((a, b) => Math.abs(b.sp) - Math.abs(a.sp)).slice(0, free);
  for (const x of c) {
    const s = x.sp > 0 ? 1 : -1, po = +tk[x.c + '-USDT-SWAP'].last, ph = H[x.c].mark, until = now + (FSP.maxDays + 1) * 864e5; // s > 0: OKX pays more -> short OKX, long Hyperliquid
    await open(db, x.c, 'fspo', -s, po, FSP.leg, far(po, -s, decFor(po) + 2).tp, far(po, -s, decFor(po) + 2).sl, until);
    await open(db, x.c, 'fsph', s, ph, FSP.leg, far(ph, s, decFor(ph) + 2).tp, far(ph, s, decFor(ph) + 2).sl, until);
    out.push('fsp opened ' + x.c + ': ' + (s > 0 ? 'short OKX / long Hyperliquid' : 'long OKX / short Hyperliquid') + ', spread ' + x.sp.toFixed(1) + '%/yr');
  }
  if (!c.length) out.push('fsp: no coin with a funding gap of ' + FSP.enterAnn + '%/yr or more (' + Object.keys(H).length + ' Hyperliquid markets)');
}

export async function lab2Tick(env, now = Date.now()) {
  if (!env.SUPABASE_SERVICE_KEY) return { skipped: 'missing key' };
  const db = sb(env.SUPABASE_SERVICE_KEY), out = [];
  const ctl = await loadControl(db); ctl.auto = await autoPaused(db, ctl.lossLimit).catch(() => ({}));
  const tk = {}; for (const t of await okx('/api/v5/market/tickers?instType=SWAP')) tk[t.instId] = t;
  const all = await db.select('ap_positions', 'select=*&status=eq.open&or=(coin.like.*:fdt,coin.like.*:lsr,coin.like.*:rmom,coin.like.*:rmomr,coin.like.*:pair,coin.like.*:fspo,coin.like.*:fsph)');
  const gone = await manageAll(db, all.filter((p) => /:(fdt|lsr|rmom|rmomr)$/.test(p.coin)), tk, out);
  const live = (suf) => all.filter((p) => p.coin.endsWith(':' + suf) && !gone.has(p.id));
  const run = async (name, f) => { try { await f(); } catch (e) { out.push(name + ' error ' + String(e.message || e).slice(0, 100)); } };
  await run('fdt', () => fdtTick(db, live('fdt'), tk, ctl, now, out));
  await run('lsr', () => lsrTick(db, live('lsr'), tk, ctl, now, out));
  await run('rmom', () => rmomTick(db, live('rmom'), tk, ctl, now, out));
  await run('rmomr', () => rmomTick(db, live('rmomr'), tk, ctl, now, out, 'rmomr', true));
  await run('pair', () => pairTick(db, live('pair'), tk, ctl, now, out));
  await run('fsp', () => fspTick(db, all.filter((p) => /:fsp[oh]$/.test(p.coin)), tk, ctl, now, out));
  const mn = new Date(now).getUTCMinutes(), worth = out.some((x) => /opened|closed|converged|stop|limit|error|LONG|SHORT/.test(x)) || (mn >= 10 && mn < 15);
  if (out.length && worth) await db.insert('ap_decisions', { coin: 'Lab desks', action: 'PASS', confidence: 0, reason: out.join(' · ').slice(0, 340), price: 0, taken: out.some((x) => / opened |^(fdt|lsr|rmom|rmomr) (LONG|SHORT)/.test(x)) }).catch(() => null); // visible log on the research page
  return { at: new Date(now).toISOString(), open: all.length, out };
}
