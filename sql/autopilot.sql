-- Autopilot tables. Writes come only from the Netlify functions (service key). The dashboard reads with the anon key.
create table if not exists ap_positions (
  id bigint generated always as identity primary key,
  coin text not null, side text not null,
  entry_price numeric not null, size numeric not null, notional numeric not null,
  tp numeric not null, sl numeric not null,
  max_hold_until timestamptz not null,
  opened_at timestamptz not null default now(),
  status text not null default 'open',
  exit_price numeric, closed_at timestamptz, pnl numeric, fees numeric, close_reason text,
  decision_id bigint
);
create table if not exists ap_decisions (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  coin text not null, action text not null, confidence numeric, reason text,
  price numeric not null, formula_mom numeric, news_summary text,
  tp_pct numeric, sl_pct numeric, hold_min numeric,
  outcome_price numeric, outcome_at timestamptz,
  taken boolean not null default false
);
create table if not exists ap_news (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  coin text not null, sentiment text, strength numeric, catalyst text, summary text, sources jsonb
);
-- Market snapshots every 5 minutes with what happened next, for pattern mining (no trading involved).
create table if not exists ap_samples (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  coin text not null, price numeric not null,
  ret_5m numeric, ret_15m numeric, ret_30m numeric, ret_60m numeric,
  pullback_pct numeric, bounce_pct numeric, range_60m numeric, vol_1m numeric,
  change24h numeric, funding numeric, spread_bps numeric,
  news_sentiment text, news_strength numeric,
  fwd_15m numeric, fwd_60m numeric
);
create index if not exists ap_samples_coin_ts on ap_samples (coin, ts desc);
alter table ap_samples enable row level security;
create policy "anon read samples" on ap_samples for select to anon using (true);
alter table ap_positions enable row level security;
alter table ap_decisions enable row level security;
alter table ap_news enable row level security;
create policy "anon read positions" on ap_positions for select to anon using (true);
create policy "anon read decisions" on ap_decisions for select to anon using (true);
create policy "anon read news" on ap_news for select to anon using (true);

-- Daily snapshots per desk (Bangkok days), written by netlify/functions/daily.mjs every 30 minutes.
-- One row per day and desk, rewritten until the day is over, so the history survives the live dashboard and can be exported or charted later.
create table if not exists ap_daily_snapshots (
  day date not null,                 -- Bangkok calendar day
  desk text not null,                -- aggressive, normal, super, ultra, maker, gated, algo, algo2, algo3, algoq, algow, algox, algot, rev, rev2, revm
  desk_name text not null,
  snapshot_at timestamptz not null,  -- when the row was last computed (end of day once the day is over)
  trades_closed int not null, wins int not null, win_rate numeric,
  pnl numeric not null, fees numeric not null,                 -- that day, closed trades only, pnl is after fees
  best_trade numeric, worst_trade numeric,
  day_drawdown numeric,              -- worst peak-to-trough of realized P&L inside the day (0 or negative)
  cum_trades int not null, cum_pnl numeric not null, cum_fees numeric not null,   -- since the race start
  peak_cum_pnl numeric not null, max_drawdown numeric not null,                   -- realized, since the race start (max_drawdown is 0 or negative)
  open_count int not null, open_pnl numeric,                   -- trades still open at snapshot time, after entry fee (null if no prices were found)
  start_bank numeric not null, total_value numeric not null,   -- total_value = start_bank + cum_pnl + open_pnl, same formula as the dashboard
  up_60m int, down_60m int, coins int, btc_change24h numeric,  -- market breadth at snapshot time
  primary key (day, desk)
);
alter table ap_daily_snapshots enable row level security;
create policy "anon read daily" on ap_daily_snapshots for select to anon using (true);
