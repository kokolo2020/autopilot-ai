// KuCoin live executor for "My picks" (real money). Runs on Koko's Tokyo VPS, never on Netlify.
// No dependencies: Node 18+ (fetch, crypto). Config comes from /etc/kclive.env (see install.sh).
// Safety: starts in DRY RUN (orders go to KuCoin's /orders/test endpoint and nothing is bought), every API call needs the LIVE_KEY header,
// at most MAX_COINS coins, per-coin margin capped, isolated margin per coin, account-level pause when equity falls KILL_PCT below the start value.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const VERSION = '1.0.0';
const ENV = process.env;
const PORT = +(ENV.PORT || 8787);
const STATE_FILE = ENV.STATE_FILE || path.join(ENV.STATE_DIRECTORY || '/var/lib/kclive', 'state.json');
const ALLOW_ORIGIN = ENV.ALLOW_ORIGIN || 'https://auto-pilotai.netlify.app';
const BASE = 'https://api-futures.kucoin.com';
const PICKS = ['ZEN', 'NEAR', 'OP', 'ARB', 'RUNE', 'JTO', 'MON', 'EGLD', 'HYPE', 'SOL', 'SUI', 'GRAM', 'WLD', 'VVV', 'JUP', 'RAY', 'AERO', 'XRP', 'AVAX', 'CARDS'];
const LIMITS = { maxCoins: 10, maxPerCoin: 100, minPerCoin: 5, maxLev: 5, minKill: 5, maxKill: 50 };
const TICK_MS = 60000;

/* ---------- state ---------- */
const DEFAULT = { settings: { perCoin: 25, lev: 3, killPct: 20, dryRun: true }, coins: [], enabled: false, paused: false, pauseReason: '', baseline: null, baselineAt: null, opened: {}, done: {}, sim: {}, simRealised: 0, log: [] };
let S = load();
function load() {
  try { const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); return Object.assign(structuredClone(DEFAULT), s, { settings: Object.assign({}, DEFAULT.settings, s.settings || {}) }); }
  catch (e) { return structuredClone(DEFAULT); }
}
function save() { try { fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true }); fs.writeFileSync(STATE_FILE + '.tmp', JSON.stringify(S)); fs.renameSync(STATE_FILE + '.tmp', STATE_FILE); } catch (e) { console.error('save failed', e.message); } }
function log(kind, msg, extra) { const e = Object.assign({ t: Date.now(), kind, msg }, extra || {}); S.log.unshift(e); S.log = S.log.slice(0, 300); console.log(new Date().toISOString(), kind, msg); save(); }

/* ---------- KuCoin ---------- */
const hasKeys = () => !!(ENV.KC_KEY && ENV.KC_SECRET && ENV.KC_PASSPHRASE);
const hmac = (s) => crypto.createHmac('sha256', ENV.KC_SECRET).update(s).digest('base64');
let skew = 0, skewAt = 0;
async function syncTime() { if (Date.now() - skewAt < 3600e3) return; try { const r = await (await fetch(BASE + '/api/v1/timestamp')).json(); if (r.code === '200000') { skew = +r.data - Date.now(); skewAt = Date.now(); } } catch (e) {} }
async function kc(method, p, body, isPrivate = true) {
  const b = body ? JSON.stringify(body) : '', headers = { 'Content-Type': 'application/json' };
  if (isPrivate) {
    if (!hasKeys()) throw new Error('No KuCoin API key on the server yet (run: sudo kclive-setkeys)');
    await syncTime(); const ts = String(Date.now() + skew);
    Object.assign(headers, { 'KC-API-KEY': ENV.KC_KEY, 'KC-API-SIGN': hmac(ts + method + p + b), 'KC-API-TIMESTAMP': ts, 'KC-API-PASSPHRASE': hmac(ENV.KC_PASSPHRASE), 'KC-API-KEY-VERSION': ENV.KC_KEY_VERSION || '3' });
  }
  const r = await fetch(BASE + p, { method, headers, body: b || undefined, signal: AbortSignal.timeout(15000) });
  let j; try { j = await r.json(); } catch (e) { throw new Error('KuCoin HTTP ' + r.status); }
  if (j.code !== '200000') throw new Error('KuCoin ' + j.code + ': ' + (j.msg || 'error'));
  return j.data;
}

/* ---------- market data ---------- */
let CONTRACTS = {}, contractsAt = 0;
async function contracts() {
  if (Date.now() - contractsAt < 55000 && Object.keys(CONTRACTS).length) return CONTRACTS;
  const d = await kc('GET', '/api/v1/contracts/active', null, false), by = {};
  for (const k of d) if (k.quoteCurrency === 'USDT' && /USDTM$/.test(k.symbol) && PICKS.includes(k.baseCurrency)) by[k.baseCurrency] = { symbol: k.symbol, multiplier: +k.multiplier, lotSize: +k.lotSize || 1, maxLev: +k.maxLeverage, price: +k.markPrice, last: +k.lastTradePrice || +k.markPrice, status: k.status };
  CONTRACTS = by; contractsAt = Date.now(); return by;
}
const lotsFor = (c, usd) => { const k = CONTRACTS[c]; if (!k || !(k.price > 0)) return 0; return Math.floor(usd / (k.multiplier * k.price) / k.lotSize) * k.lotSize; };

/* ---------- account snapshot ---------- */
let SNAP = { at: 0, account: null, positions: [], history: [], error: '' };
async function snapshot() {
  await contracts().catch((e) => { SNAP.error = 'contracts: ' + e.message; });
  if (!hasKeys()) { SNAP = Object.assign(SNAP, { at: Date.now(), account: null, positions: [], error: 'No KuCoin API key on the server yet' }); return SNAP; }
  try {
    const [acc, pos] = await Promise.all([kc('GET', '/api/v1/account-overview?currency=USDT'), kc('GET', '/api/v1/positions?currency=USDT')]);
    let hist = SNAP.history; if (Date.now() - (SNAP.histAt || 0) > 300000) { try { const h = await kc('GET', '/api/v1/history-positions?limit=50'); hist = (h && h.items) || []; SNAP.histAt = Date.now(); } catch (e) {} }
    SNAP = Object.assign(SNAP, { at: Date.now(), account: acc, positions: (pos || []).filter((p) => p.isOpen), history: hist, error: '' });
  } catch (e) { SNAP.error = e.message; SNAP.at = Date.now(); }
  return SNAP;
}
const symOf = (c) => CONTRACTS[c] && CONTRACTS[c].symbol;
const posOf = (c) => SNAP.positions.find((p) => p.symbol === symOf(c));
function simPnl(c) { const s = S.sim[c], k = CONTRACTS[c]; if (!s || !k) return 0; return s.size * k.multiplier * (k.price - s.entry); }
function equity() {
  if (S.settings.dryRun) { const base = S.baseline != null ? S.baseline : (SNAP.account ? +SNAP.account.accountEquity : 0); return base + (S.simRealised || 0) + Object.keys(S.sim).reduce((t, c) => t + simPnl(c), 0); }
  return SNAP.account ? +SNAP.account.accountEquity : null;
}

/* ---------- orders ---------- */
const oid = () => 'kl' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
async function openCoin(c) {
  const k = CONTRACTS[c]; if (!k) { S.done[c] = 'no KuCoin USDT futures contract'; log('skip', c + ': no KuCoin USDT futures contract'); return; }
  if (k.status !== 'Open') { log('skip', c + ': contract status ' + k.status); return; }
  const st = S.settings, usd = st.perCoin * st.lev, size = lotsFor(c, usd);
  if (size < 1) { S.done[c] = 'one contract is bigger than $' + usd; log('skip', c + ': one contract (' + (k.multiplier * k.price).toFixed(2) + ' USDT) is bigger than the $' + usd + ' position'); return; }
  const lev = Math.min(st.lev, k.maxLev), order = { clientOid: oid(), side: 'buy', symbol: k.symbol, type: 'market', leverage: lev, size, marginMode: 'ISOLATED', remark: 'mypicks' };
  if (st.dryRun) {
    if (hasKeys()) await kc('POST', '/api/v1/orders/test', order); // KuCoin validates the order; nothing is bought
    S.sim[c] = { size, entry: k.price, at: Date.now(), lev }; S.opened[c] = { at: Date.now(), size, dry: true };
    log('dry', 'DRY RUN buy ' + c + ': ' + size + ' contracts ≈ $' + (size * k.multiplier * k.price).toFixed(2) + ' at ' + k.price + ' (' + lev + 'x isolated)', { coin: c });
    return;
  }
  const a = SNAP.account ? +SNAP.account.availableBalance : 0;
  if (a < st.perCoin * 1.05) { log('skip', c + ': not enough available USDT in the futures account ($' + a.toFixed(2) + ')'); return; }
  try { await kc('POST', '/api/v2/position/changeMarginMode', { symbol: k.symbol, marginMode: 'ISOLATED' }); } catch (e) { /* already isolated, or has an open order */ }
  const r = await kc('POST', '/api/v1/orders', order);
  S.opened[c] = { at: Date.now(), size, orderId: r.orderId };
  log('buy', 'BUY ' + c + ': ' + size + ' contracts ≈ $' + (size * k.multiplier * k.price).toFixed(2) + ' (' + lev + 'x isolated), order ' + r.orderId, { coin: c });
}
async function closeCoin(c, why) {
  S.done[c] = why || 'closed by you';
  if (S.settings.dryRun || S.sim[c]) {
    if (S.sim[c]) { const p = simPnl(c); log('dry', 'DRY RUN close ' + c + ': P&L ' + (p >= 0 ? '+' : '') + p.toFixed(2) + ' USDT (' + S.done[c] + ')', { coin: c }); S.simRealised = (S.simRealised || 0) + p; delete S.sim[c]; }
    if (S.settings.dryRun) { delete S.opened[c]; save(); return; }
  }
  const p = posOf(c); if (!p) { log('info', c + ': no open position to close'); save(); return; }
  const r = await kc('POST', '/api/v1/orders', { clientOid: oid(), symbol: p.symbol, type: 'market', closeOrder: true, marginMode: p.marginMode || 'ISOLATED', remark: 'mypicks close' });
  log('sell', 'CLOSE ' + c + ' (' + S.done[c] + '): unrealised P&L was ' + (+p.unrealisedPnl).toFixed(2) + ' USDT, order ' + r.orderId, { coin: c });
  delete S.opened[c];
}

/* ---------- engine ---------- */
let busy = false, lastTick = 0, lastErr = '';
async function tick() {
  if (busy) return; busy = true;
  try {
    await snapshot();
    if (!S.settings.dryRun && SNAP.error) { lastErr = SNAP.error; return; }
    // positions that vanished (closed in the KuCoin app, or liquidated) are not reopened
    if (!S.settings.dryRun) for (const c of Object.keys(S.opened)) { if (!S.done[c] && !posOf(c) && Date.now() - S.opened[c].at > 3 * 60000) { S.done[c] = 'position gone (closed in KuCoin or liquidated)'; delete S.opened[c]; log('warn', c + ': position is no longer open on KuCoin; it will not be reopened', { coin: c }); } }
    const eq = equity();
    if (S.enabled && !S.paused && S.baseline != null && eq != null && eq <= S.baseline * (1 - S.settings.killPct / 100)) {
      S.paused = true; S.pauseReason = 'Safety stop: equity ' + eq.toFixed(2) + ' fell ' + S.settings.killPct + '% below the start value ' + S.baseline.toFixed(2) + '. No new buys. Close positions yourself if you want out.';
      log('kill', S.pauseReason);
    }
    if (S.enabled && !S.paused) {
      let n = 0;
      for (const c of S.coins) {
        if (n >= 10) break;
        if (S.done[c] || S.opened[c] || posOf(c)) { if (posOf(c) && !S.opened[c]) S.opened[c] = { at: Date.now(), adopted: true }; continue; }
        try { await openCoin(c); n++; } catch (e) { log('error', c + ': ' + e.message, { coin: c }); S.opened[c] = { at: Date.now(), failed: true }; setTimeout(() => { if (S.opened[c] && S.opened[c].failed) { delete S.opened[c]; save(); } }, 10 * 60000); }
      }
    }
    lastErr = ''; save();
  } catch (e) { lastErr = e.message; console.error(e); }
  finally { busy = false; lastTick = Date.now(); }
}
setInterval(tick, TICK_MS); setTimeout(tick, 3000);

/* ---------- API ---------- */
function stateOut() {
  const coins = PICKS.map((c) => { const k = CONTRACTS[c]; return k ? { coin: c, symbol: k.symbol, price: k.price, lotUsd: +(k.multiplier * k.price).toFixed(4), maxLev: k.maxLev, estLots: lotsFor(c, S.settings.perCoin * S.settings.lev), status: k.status } : { coin: c, missing: true }; });
  const positions = S.settings.dryRun
    ? Object.keys(S.sim).map((c) => { const s = S.sim[c], k = CONTRACTS[c] || {}; const val = s.size * (k.multiplier || 0) * (k.price || 0), pnl = simPnl(c), margin = s.size * (k.multiplier || 0) * s.entry / s.lev; return { coin: c, symbol: k.symbol, dry: true, size: s.size, entry: s.entry, mark: k.price, value: val, margin, pnl, roe: margin ? pnl / margin * 100 : 0, liq: s.entry * (1 - 1 / s.lev * 0.95), lev: s.lev, at: s.at }; })
    : SNAP.positions.map((p) => { const c = (Object.keys(CONTRACTS).find((x) => CONTRACTS[x].symbol === p.symbol)) || p.symbol.replace(/USDTM$/, ''); return { coin: c, symbol: p.symbol, mine: S.coins.includes(c), size: p.currentQty, entry: p.avgEntryPrice, mark: p.markPrice, value: p.markValue, margin: p.posMargin, pnl: p.unrealisedPnl, roe: p.unrealisedRoePcnt * 100, liq: p.liquidationPrice, lev: p.realLeverage || p.leverage, mode: p.marginMode, funding: p.posFunding, realised: p.realisedPnl, at: p.openingTimestamp }; });
  return { ok: true, version: VERSION, simRealised: S.simRealised || 0, now: Date.now(), hasKeys: hasKeys(), settings: S.settings, limits: LIMITS, coins: S.coins, enabled: S.enabled, paused: S.paused, pauseReason: S.pauseReason, baseline: S.baseline, baselineAt: S.baselineAt, equity: equity(), account: SNAP.account, positions, history: (SNAP.history || []).slice(0, 30), done: S.done, contracts: coins, log: S.log.slice(0, 120), lastTick, lastError: lastErr || SNAP.error || '' };
}
const safeEq = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length === y.length && crypto.timingSafeEqual(x, y); };
let fails = 0, failsAt = 0;
async function action(a, body) {
  const st = S.settings;
  if (a === 'start') {
    const coins = [...new Set((body.coins || []).map((x) => String(x).toUpperCase()))].filter((c) => PICKS.includes(c));
    if (!coins.length) throw new Error('Pick at least one coin');
    if (coins.length > LIMITS.maxCoins) throw new Error('At most ' + LIMITS.maxCoins + ' coins');
    await snapshot(); for (const c of coins) delete S.done[c];
    S.coins = coins; S.enabled = true; S.paused = false; S.pauseReason = '';
    if (S.baseline == null || body.resetBaseline) { S.baseline = st.dryRun ? (SNAP.account ? +SNAP.account.accountEquity : st.perCoin * coins.length) : (SNAP.account ? +SNAP.account.accountEquity : null); S.baselineAt = Date.now(); }
    if (!st.dryRun && S.baseline == null) throw new Error('Could not read the KuCoin futures balance: ' + (SNAP.error || 'unknown'));
    log('start', 'Started ' + (st.dryRun ? 'DRY RUN' : 'LIVE') + ' with ' + coins.join(', ') + ' at $' + st.perCoin + ' x ' + st.lev + ' each. Start value ' + (S.baseline != null ? S.baseline.toFixed(2) : '?') + ' USDT, safety stop at -' + st.killPct + '%');
    setTimeout(tick, 200); return;
  }
  if (a === 'stop') { S.enabled = false; log('stop', 'Stopped: no new buys. Open positions are left as they are.'); return; }
  if (a === 'pause') { S.paused = true; S.pauseReason = 'Paused by you'; log('pause', 'Paused by you: no new buys'); return; }
  if (a === 'resume') { if (/Safety stop/.test(S.pauseReason) && body.confirm !== 'RESUME') throw new Error('Safety stop is on. Send confirm "RESUME" to override.'); S.paused = false; S.pauseReason = ''; log('resume', 'Resumed'); setTimeout(tick, 200); return; }
  if (a === 'close') { const c = String(body.coin || '').toUpperCase(); if (!c) throw new Error('coin?'); await snapshot(); await closeCoin(c, 'closed by you'); setTimeout(tick, 1500); return; }
  if (a === 'closeAll') { await snapshot(); const list = st.dryRun ? Object.keys(S.sim) : SNAP.positions.map((p) => (Object.keys(CONTRACTS).find((x) => CONTRACTS[x].symbol === p.symbol))).filter(Boolean).filter((c) => body.all || S.coins.includes(c)); S.paused = true; S.pauseReason = 'Closed everything (you)'; for (const c of list) { try { await closeCoin(c, 'close all (you)'); } catch (e) { log('error', 'close ' + c + ': ' + e.message); } } log('pause', 'Close all done, buying paused'); return; }
  if (a === 'settings') {
    const n = Object.assign({}, st);
    if (body.perCoin != null) n.perCoin = Math.max(LIMITS.minPerCoin, Math.min(LIMITS.maxPerCoin, +body.perCoin || st.perCoin));
    if (body.lev != null) n.lev = Math.max(1, Math.min(LIMITS.maxLev, Math.round(+body.lev) || st.lev));
    if (body.killPct != null) n.killPct = Math.max(LIMITS.minKill, Math.min(LIMITS.maxKill, +body.killPct || st.killPct));
    if (body.dryRun != null && !!body.dryRun !== st.dryRun) {
      if (!body.dryRun && body.confirm !== 'LIVE') throw new Error('To trade real money send confirm "LIVE"');
      if (!body.dryRun && !hasKeys()) throw new Error('No KuCoin API key on the server yet');
      n.dryRun = !!body.dryRun; S.sim = {}; S.simRealised = 0; S.opened = {}; S.done = {}; S.baseline = null; S.enabled = false; S.coins = n.dryRun ? S.coins : []; 
      log('mode', n.dryRun ? 'Switched to DRY RUN' : 'Switched to LIVE: real orders from the next Start');
    }
    S.settings = n; log('settings', 'Settings: $' + n.perCoin + ' per coin, ' + n.lev + 'x, safety stop -' + n.killPct + '%, ' + (n.dryRun ? 'DRY RUN' : 'LIVE')); return;
  }
  if (a === 'resetBaseline') { await snapshot(); S.baseline = equity(); S.simRealised = 0; if (S.settings.dryRun) S.baseline -= Object.keys(S.sim).reduce((t, c) => t + simPnl(c), 0); S.baselineAt = Date.now(); log('settings', 'Start value reset to ' + (S.baseline || 0).toFixed(2)); return; }
  throw new Error('Unknown action ' + a);
}
const server = http.createServer(async (req, res) => {
  const cors = { 'Access-Control-Allow-Origin': ALLOW_ORIGIN, 'Access-Control-Allow-Headers': 'content-type, x-live-key', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
  const send = (code, obj) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, cors)); res.end(JSON.stringify(obj)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') return send(200, { ok: true, version: VERSION });
  if (Date.now() - failsAt > 600000) fails = 0;
  if (fails > 20) return send(429, { ok: false, error: 'Too many wrong keys, wait 10 minutes' });
  if (!ENV.LIVE_KEY || !safeEq(req.headers['x-live-key'], ENV.LIVE_KEY)) { fails++; failsAt = Date.now(); return send(401, { ok: false, error: 'Wrong or missing live key' }); }
  try {
    if (req.method === 'GET' && url.pathname === '/state') { if (Date.now() - SNAP.at > 20000) await snapshot(); return send(200, stateOut()); }
    if (req.method === 'POST' && url.pathname.startsWith('/action/')) {
      let raw = ''; for await (const ch of req) { raw += ch; if (raw.length > 10000) throw new Error('too big'); }
      const body = raw ? JSON.parse(raw) : {};
      await action(url.pathname.slice(8), body); save(); await snapshot(); return send(200, stateOut());
    }
    send(404, { ok: false, error: 'not found' });
  } catch (e) { send(400, { ok: false, error: String(e.message || e).slice(0, 300) }); }
});
server.listen(PORT, '127.0.0.1', () => console.log('kclive ' + VERSION + ' on 127.0.0.1:' + PORT + (hasKeys() ? '' : ' (no KuCoin key yet)')));
