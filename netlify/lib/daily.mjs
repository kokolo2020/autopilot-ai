// Daily snapshot per desk (Bangkok days) into ap_daily_snapshots. Every run rebuilds today, yesterday and any day that has no rows yet,
// so the table fills itself from the race start and the last 30 minutes of a day are never lost. Each day continues from the previous day's
// cumulative numbers, so only one day of closed trades is read at a time (the table grows past Supabase's paging limit within a month otherwise).
import { START, START100, FEE, selectAll } from './ap.mjs';

export const RACE_START = Date.parse('2026-10-14T11:00:00Z'); // 18:00 Bangkok, Wed 14 Oct 2026, same start as the dashboard
const DAY = 86400000, BKK = 7 * 3600000;
export const DESKS = [
  ['aggressive', 'Aggressive AI'], ['normal', 'Normal AI'], ['super', 'Super AI'], ['ultra', 'Ultra AI'], ['maker', 'Maker AI'], ['gated', 'Gated AI'],
  ['algo', 'Algo'], ['algo2', 'Algo v2'], ['algo3', 'Algo v3'], ['algoq', 'Quiet-hours Algo'], ['algow', 'Wild Algo'], ['algox', 'Extra-wild Algo'], ['algot', 'Algo Top10'],
  ['rev', 'Neutral Reversal'], ['rev2', 'Neutral Rev 2'], ['revm', 'Neutral Rev 2 limit'], ['algo100', 'Algo top 100 ($100)'], ['rev100', 'Neutral Rev top 100 ($100)']
];
const SUFFIX = { n: 'normal', s: 'super', u: 'ultra', m: 'maker', g: 'gated', algo: 'algo', algo2: 'algo2', algo3: 'algo3', algoq: 'algoq', algow: 'algow', algox: 'algox', algot: 'algot', rev: 'rev', rev2: 'rev2', revm: 'revm', algo100: 'algo100', rev100: 'rev100' };
export const deskOf = (coin) => (coin.includes(':') ? SUFFIX[coin.split(':')[1]] || null : 'aggressive');
export const bkkDay = (ms) => new Date(ms + BKK).toISOString().slice(0, 10);
const dayStartMs = (day) => Date.parse(day + 'T00:00:00Z') - BKK;
const r2 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 100) / 100);

/* Pure part: turns one day's closed trades, the trades open at snapshot time, and the market rows into 16 snapshot rows. prev = {desk: {cum_trades, cum_pnl, cum_fees, peak, maxDd}} */
export function buildDay({ day, T, closed, open, samples, prev, samples100 = [], old = {} }) {
  const px100 = {}; for (const x of samples100) px100[x.coin] = +x.price;
  const is100 = (id) => id === 'algo100' || id === 'rev100';
  const px = {}, ret = {};
  for (const x of samples) if (px[x.coin] === undefined) { px[x.coin] = +x.price; ret[x.coin] = x.ret_60m == null ? null : +x.ret_60m; }
  const coins = Object.keys(px), have = coins.length > 0;
  const up = coins.filter((c) => ret[c] != null && ret[c] > 0).length, down = coins.filter((c) => ret[c] != null && ret[c] < 0).length;
  const btc = samples.find((x) => x.coin === 'BTC');
  const bank = START * (coins.length || 50);
  const rows = [], next = {};
  for (const [id, name] of DESKS) {
    const tr = closed.filter((x) => deskOf(x.coin) === id), op = open.filter((x) => deskOf(x.coin) === id), pv = prev[id] || { cum_trades: 0, cum_pnl: 0, cum_fees: 0, peak: 0, maxDd: 0 };
    let cum = pv.cum_pnl, peak = pv.peak, maxDd = pv.maxDd, dRun = 0, dPeak = 0, dDd = 0;
    for (const x of tr) { const v = +x.pnl; cum += v; peak = Math.max(peak, cum); maxDd = Math.min(maxDd, cum - peak); dRun += v; dPeak = Math.max(dPeak, dRun); dDd = Math.min(dDd, dRun - dPeak); }
    const pnl = tr.reduce((s, x) => s + +x.pnl, 0), fees = tr.reduce((s, x) => s + +x.fees, 0), wins = tr.filter((x) => +x.pnl > 0).length;
    let unr = 0, priced = true;
    for (const x of op) { const p = (is100(id) ? px100 : px)[x.coin.split(':')[0]]; if (p == null) { priced = false; continue; } unr += (x.side === 'LONG' ? 1 : -1) * +x.notional * (p - +x.entry_price) / +x.entry_price - +x.notional * FEE; }
    const state = { cum_trades: pv.cum_trades + tr.length, cum_pnl: cum, cum_fees: pv.cum_fees + fees, peak, maxDd };
    next[id] = state;
    if (!state.cum_trades && !op.length) continue; // desk did not exist yet
    const pn = tr.map((x) => +x.pnl);
    const tv = (is100(id) ? START100 * (Object.keys(px100).length || 100) : bank) + cum + (priced ? unr : 0), o = old[id] || {}; // lowest / highest total value over the day: keep what earlier runs saw
    rows.push({
      day, desk: id, desk_name: name, snapshot_at: new Date(T).toISOString(),
      trades_closed: tr.length, wins, win_rate: tr.length ? r2((wins / tr.length) * 100) : null, pnl: r2(pnl), fees: r2(fees),
      best_trade: pn.length ? r2(Math.max(...pn)) : null, worst_trade: pn.length ? r2(Math.min(...pn)) : null, day_drawdown: r2(dDd),
      cum_trades: state.cum_trades, cum_pnl: r2(cum), cum_fees: r2(state.cum_fees), peak_cum_pnl: r2(peak), max_drawdown: r2(maxDd),
      open_count: op.length, open_pnl: op.length && !priced ? null : r2(unr), start_bank: is100(id) ? START100 * (Object.keys(px100).length || 100) : bank, total_value: r2(tv), low_total_value: r2(o.low == null ? tv : Math.min(o.low, tv)), high_total_value: r2(o.high == null ? tv : Math.max(o.high, tv)),
      up_60m: have ? up : null, down_60m: have ? down : null, coins: have ? coins.length : null, btc_change24h: btc && btc.change24h != null ? r2(+btc.change24h) : null
    });
  }
  return { rows, next };
}

export async function runDaily(db, now = Date.now()) {
  const today = bkkDay(now), first = bkkDay(RACE_START);
  const have = new Set((await selectAll(db, 'ap_daily_snapshots', 'select=day&order=day.asc').catch(() => [])).map((x) => x.day));
  const days = [];
  for (let ms = dayStartMs(first); ms <= dayStartMs(today); ms += DAY) { const d = bkkDay(ms + 12 * 3600000); if (!have.has(d) || d >= bkkDay(now - DAY)) days.push(d); }
  const olds = {}; // low / high seen by earlier runs, so a day's lowest point survives each rewrite
  for (const x of await db.select('ap_daily_snapshots', 'select=day,desk,low_total_value,high_total_value&day=in.(' + days.join(',') + ')').catch(() => [])) (olds[x.day] = olds[x.day] || {})[x.desk] = { low: x.low_total_value == null ? null : +x.low_total_value, high: x.high_total_value == null ? null : +x.high_total_value };
  let prev = null, written = 0;
  for (const d of days) {
    const s0 = Math.max(dayStartMs(d), RACE_START), T = Math.min(now, dayStartMs(d) + DAY - 1), iso = (ms) => new Date(ms).toISOString();
    if (prev === null) { // continue from the row of the day before, or start from zero on the first day
      prev = {};
      const pd = bkkDay(dayStartMs(d) - 12 * 3600000);
      for (const x of await db.select('ap_daily_snapshots', 'select=desk,cum_trades,cum_pnl,cum_fees,peak_cum_pnl,max_drawdown&day=eq.' + pd).catch(() => [])) prev[x.desk] = { cum_trades: +x.cum_trades, cum_pnl: +x.cum_pnl, cum_fees: +x.cum_fees, peak: +x.peak_cum_pnl, maxDd: +x.max_drawdown };
    }
    const closed = await selectAll(db, 'ap_positions', 'select=coin,pnl,fees,closed_at&status=eq.closed&closed_at=gte.' + iso(s0) + '&closed_at=lte.' + iso(T) + '&order=closed_at.asc,id.asc');
    const open = await selectAll(db, 'ap_positions', 'select=coin,side,entry_price,notional&status=in.(open,closed)&opened_at=lte.' + iso(T) + '&or=(closed_at.is.null,closed_at.gt.' + iso(T) + ')&order=id.asc');
    const samples = await db.select('ap_samples', 'select=coin,price,ret_60m,change24h&ts=lte.' + iso(T) + '&ts=gte.' + iso(T - 20 * 60000) + '&order=ts.desc&limit=300').catch(() => []);
    // the top-100 track only keeps its latest prices, so its open P&L is filled in only for a snapshot taken right now
    const samples100 = now - T < 20 * 60000 ? await db.select('ap_prices100', 'select=coin,price&updated_at=gte.' + iso(now - 20 * 60000)).catch(() => []) : [];
    const { rows, next } = buildDay({ day: d, T, closed, open, samples, prev, samples100, old: olds[d] || {} });
    await db.upsert('ap_daily_snapshots', rows, 'day,desk');
    written += rows.length; prev = next;
  }
  return { days, rows: written };
}
