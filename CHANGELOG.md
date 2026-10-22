# Changelog

Every push bumps the version. The version shows next to the title on the page, so you can tell which build Netlify is serving.

































































## v1.53
- New desks: Trend hold (BTC/ETH/SOL at 2x, held only above their own 100-day average) and Crash buyer (5 weakest after a 3%+ market drop, 3-day hold). Trend momentum now buys only coins up over 30 days. Old desks kept for comparison

## v1.52
- Trimmed: Rev 2, Rev 2 + winner exit, scale-out, Reverse extremes, both spot desks and Rev 3 daily retired (open legs run to their close). New: Trend momentum desk (weekly, long the 5 strongest 30-day coins while BTC is above its 200-day average, otherwise cash)

## v1.51.1
- AI signals: longer error message in logs (Claude API call is failing with HTTP 400)

## v1.51
- New paper desk: AI signals (your old Volume Harvester bot rebuilt and tracked): Claude proposes up to 3 scalps every 30 min, TP 0.4-0.7%, SL 0.2-0.4%, max 3x, $100 margin, real taker fees and funding, 24h limit

## v1.50
- New: Live page (live.html) and KuCoin order service for My picks: your own Tokyo server (live/server.mjs, one-command live/install.sh), dry run by default, up to 10 coins at $25 x 3 isolated, -20% safety pause, close one or all from the page

## v1.49
- New: Round 3 adaptive study. Daily market regime (Bull/Bear/Chop/Panic from BTC trend and breadth), 10 strategies tested in every regime, a pre-set playbook and a switcher trained on 2022-23 and tested on 2024-26, with equity curve, drawdowns and year by year

## v1.48
- Real funding on every perpetual desk: OKX settlements paid or received while a leg is open are booked into its P&L at close (before: only Rev 3 and My picks). Funding history is prefetched in parallel at the 7am close. Daily report shows booked fees and funding per desk

## v1.47
- New: 8h study page. Does closing every 8 hours (7am, 3pm, 11pm Bangkok) beat the 24h batch? 4-hour OKX history, per-day net after costs, per session, after falling markets, month by month

## v1.46
- My picks: Today column (% since the 7am close) and a tap-to-open candle chart per coin (Today / 1W / 1M / Since entry) with volume, entry and add-on lines and markers, next add-on level and liquidation line; new candles function (OKX perp, OKX spot, Gate.io fallback)

## v1.45
- New: Daily report page (report.html). Every 7am close: totals, market move, highlights, desks ranked, 30-day leaderboard, My picks at the close, every leg; pick any past close; Download PDF

## v1.44.1
- Pages now show the 7am Bangkok close (arena countdown, batch tracker, saga, research labels); 30-day test note

## v1.44
- Daily close moved from 8pm to 7am Bangkok for all daily desks; open legs close at 7am today and the next batch opens right after (weekly desk and My picks unchanged)

## v1.43.1
- Fix: Neutral Rev scale-out rules were wired into the wrong function, so the desk ran as Neutral Rev with a plain -10% stop (full-size stops). Scale-out now runs as designed

## v1.43
- Rev 2 limit now exits at 20:00 with a limit order too (maker fee both ways; stops and resets stay market). My picks: RUNE and CARDS open using OKX spot, Gate.io or MEXC prices since OKX has no perpetual for them

## v1.42
- Study round 2: month (30-day BTC) trend tables, year-by-year down-day signal, non-overlapping trades, long weakest + short BTC hedge

## v1.41
- Study v2: compares against the market average (fixes the median error), holds of 1, 3 and 7 days, fee scenarios (0.11%, 0.075%, 0.04%), and down-day thresholds of -1%, -2%, -3%

## v1.40
- New: History study page (years of daily OKX data: does buying the weakest and shorting the strongest work in bear, transition and bull phases, and what long/short split is best)

## v1.39.2
- My picks: add-on ladder (+$100 at 3x every further 18% down, max 4 per coin)

## v1.39.1
- My picks: add $100 margin at 3x when a coin falls 18% below entry (once per coin)

## v1.39
- New section: My picks (Koko's 20 coins, $250 margin each at 3x long, held) with its own page

## v1.38.3
- New page: Market regimes (desk P&L per 8pm batch against the market move, with averages for down / flat / up days)

## v1.38.2
- New extra desk: Reverse extremes (best and worst leg of the last Neutral Rev batch, side reversed)

## v1.38.1
- New extra desk: Rev 2 + winner exit (half out at +7%, rest at +10% or back at +5%)

## v1.38
- New extra desk: Neutral Rev scale-out (half out at +7%, +10%/+5% for the rest; losers -2.5% half out, -5% rebuy, -10% stop)

## v1.37.8
- Saga: coins green when winning, red when losing

## v1.37.7
- Saga: each coin lane scaled to its own stop so the graph reads clearly; no label overlaps; legend line

## v1.37.6
- Saga: premium gold styling, sunglasses and money rain on winners, coin quips, breaking-news ticker, verdict stamp

## v1.37.5
- Bold red stop line with danger zone and STOP flag in Saga and Batch tracker

## v1.37.4
- Saga: stop gauges, danger drama near the stop, stop-hit explosions, desk chips

## v1.37.3
- Links to Tide Room, Batch tracker, Stories and Saga from the research and public pages

## v1.37.2
- Saga page: animated story with all 10 coins of the batch (live data)

## v1.37.1
- Stories page: animated bear (short BNB) and bull (long FIL)

## v1.37
- Batch Tracker page: per-trade price, stop and take-profit charts with time rewind

## v1.36.1
- Tide Room: replay slider and 8pm closing bell

## v1.36
- Tide Room: live animated infographic of every desk (arena.html)

## v1.35
- Non-perp test desks: spot long-only, spot margin Rev, dated-futures carry; fix Rev 2 limit maker fee after reset

## v1.34
- All batches close at 20:00 Bangkok daily (weekly desk day 7)

## v1.33
- Three extra test desks: Capitulation Rev, Rev 3 low-leverage, Neutral Rev weekly

## v1.32
- Funding Carry v2: 5 coins, $100 per leg, enter only at 0.03%+ funding

## v1.31.1
- Research page labels for the reset

## v1.31
- Reset: ,000 bank per strategy, 00 per leg, 5+5 legs, 4 desks only, top-50 + min volume

## v1.30.6
- Rev desks: rank only the fixed top-50 list (not watchlist extras)

## v1.30.5
- Neutral Rev: open each batch in one request and remove a duplicate batch

## v1.30.4
- Batch card: fix long prices overlapping

## v1.30.3
- X post batch card: nicer design, perpetual futures + leverage label

## v1.30.2
- Post Drafts: new Batch card mode: one image with every coin of a batch (entry, exit, P/L, short and long side totals) and a matching short draft; Neutral Rev, Rev 2 and Rev 3 daily

## v1.30.1
- Post Drafts: new Strategy spotlight mode (default): features a strategy that is up since the start, with a rule line, a results image, and a draft that states how many strategies lost and that the sample is small; daily recap stays as a second tab

## v1.30
- New Post Drafts page (/posts.html): a daily recap for X from the daily snapshots, with a downloadable results image and three editable draft posts (scoreboard, fees lesson, race standings), copy button and Open in X

## v1.29.4
- Research dashboard: roll back the premium look to the compact original

## v1.29.3
- Research dashboard: premium look (type, spacing, ledger-style tables, connected KPI strip, desk names stay in view when the table scrolls sideways). Looks only, no content or logic changes

## v1.29.2
- Rev 3: funding paid or received is booked into each entry's P/L when it closes (OKX funding history, longs pay when the rate is positive); Horizons shows funding per batch

## v1.29.1
- Rev 3: one shared deadline per batch; Horizons page groups legs into batches by deadline window (it showed each leg as its own batch)

## v1.29
- Rev 3: four paper desks (daily, weekly, monthly, yearly) with a $25 stop per entry (10% of margin) and the 4x->7x ladder, plus a Horizons page with one tab per horizon

## v1.28.1
- Funding Carry: entries now use real executable prices (spot bought at the ask, perp shorted at the bid) and marks use the exit side (spot at the bid, perp at the ask). Before, it used last-trade prices, which for thin coins can be minutes apart between spot and perp and showed up as fake price drift of up to -$0.56 per coin.
- Many coins sit at the same 0.01% base funding rate, so ties (to 0.001%) are now broken by the tightest combined spot + perp spread, and coins with combined spread above 0.2% are skipped.
- To restart the desk on the new pricing, run `delete from ap_carry;` once in the Supabase SQL Editor (the first rows were opened with last-trade prices).
- Funding Carry uses bid/ask prices and prefers tight-spread coins

## v1.28
- Funding Carry (paper): $5,000 of simulated spot plus $5,000 short USDT perpetual at 1x, split over 20 coins ($250 per leg each). Price moves cancel; the profit is the funding the short receives at each settlement.
- Picks the 20 coins with the highest positive funding among the top-coin list that have both a live OKX perpetual and a spot market (at least 0.005% per settlement). Closes a coin after 3 settlements in a row with negative funding, refills the slot with the next best coin, and does not re-enter a closed coin for 24h.
- Costs modelled: spot taker 0.10% + perp taker 0.055%, on each leg at entry and exit. Spot is simulated from OKX spot prices; nothing is bought.
- New table `ap_carry` (SQL block at the end of sql/autopilot.sql, run it once in Supabase). New "Funding Carry" card on the research page, kill switch `carry` on the control page (stops new coins only).

## v1.27
- Neutral Rev 2 stop tightened from 15% to 10%
- Applies to Neutral Rev 2 and Neutral Rev 2 limit, for new entries and resets; legs already open keep the stop they were opened with. Back-test over 43 hourly 24h Rev batches: 10% averaged +$299 per batch with a worst batch of -$170, versus +$279 and -$287 at 15%; stops of 6% or tighter earned less (+$196 at 6%, +$138 at 3%). About 2.75 days of data, so a forward test.

## v1.26.2
- NEW desk rows back to orange
- Research table: NEW rows are orange (tint across the whole row, orange left bar and badge) instead of blue. Green still wins for profitable desks.

## v1.26.1
- NEW desk rows highlighted blue across the whole row
- Research table: rows tagged NEW (Wild, Extra-wild, Neutral Rev 2, Rev 2 limit and the v1.25/v1.26 desks) now have a blue tint across the whole row, blue left bar and blue badge instead of amber. A green profit row still wins over blue.

## v1.26
- Capitulation Rev desk (Rev only after a market drop)
- Capitulation Rev (`XXX:caprev`): the Neutral Rev batch, but only started when the average 24h change of the scanned coins is -1% or lower; otherwise it waits in cash. Based on a back-test of 2.75 days of ap_samples: Rev made about +$454 per batch after a market drop and -$67 otherwise (one rebound episode, so a hypothesis). Same kill switch, snapshot and research-table wiring as the other new desks.

## v1.25
- Three new paper desks: Trend Flip, Risk-balanced Rev, Crash Shorter+
- Trend Flip (`XXX:flip`): Neutral Rev reversed. Long the 8 strongest, short the 8 weakest by 24h change, $1,250 per leg, 24h hold, no stops. Tests momentum against reversion.
- Risk-balanced Rev (`XXX:revv`): same picks as Neutral Rev, each leg sized by 1 / its 1-minute volatility (leg between $300 and $1,750, total targets $20,000), so long and short legs carry similar risk.
- Crash Shorter+ (`XXX:algo3b`): Algo v3 with the market gate at 80% of coins down instead of 90%.
- All three are in the daily snapshots, the control page kill switches and the research table (green when in profit). Paper only.
- Removed two stray screenshots from the repo root.

## v1.24.1
- Research table: green row follows total value (incl. open trades)

## v1.24
- Highlight profitable strategies in green (public page and research table)

## v1.23.2
- Removed the two empty top-100 rows from the research dashboard (the top-100 track is off).

## v1.23.1
- Top-100 research track is switched off by default (the desks stay on the top 50 coins). To run it, set the Netlify environment variable TOP100_ENABLED=1; nothing else needs to change, and the table ap_prices100 is only needed then.

## v1.20
- Neutral Rev 2 (stored as `XXX:rev2`) and Neutral Rev 2 limit (`XXX:revm`): same picks as Neutral Rev (long the 8 weakest, short the 8 strongest by 24h change, one batch per 24h, 24h hold, no take profit). Leg 1 opens at 4x with a 15% stop. When the stop hits, the loss is booked and the same side reopens at the market price one step higher (5x, 6x, 7x), with the same batch deadline. After the stop at 7x the leg is done (3 resets max). Every entry is a fresh $250 margin, so one leg can commit up to $1,000 margin and book roughly $800 of losses if price keeps running. The stop sits just inside liquidation (1/lev minus 1%), so at 7x it is 13.3%, not 15%.
- The limit twin places leg 1 as a limit order 0.10% better, waits 10 minutes, pays the maker fee on that entry; resets and exits are market (taker). Unfilled legs are cancelled, so fill rate can be compared against the market version.
- Original Neutral Rev (`:rev`) is unchanged and keeps running as the control. Both new desks are in the kill switch list.

## v1.23
- New public summary page at `/` (`index.html`): plain-language leaderboard with one-sentence ideas and technical details on demand, a profit and loss chart for all featured strategies (hover or touch to compare a moment, tap a name to hide it), a market-mood line, and a clear paper-money notice. Strategies keep their real numbers, including losses; each is marked "too early to judge" until it has 150+ closed trades over 7+ days. It reads the same Supabase tables as before (last 7 days only, so it stays light), and works on phones and in dark mode.
- The detailed dashboard moved to `/research.html` unchanged, with a link back to the summary. The 6h recap video script now records `/research.html`.
- Shown on the summary page: Neutral Reversal ("Balanced Bounce"), Neutral Rev 2, Algo ("Range Trader"), Algo v3 ("Crash Shorter"), Normal AI ("Cautious AI") and Aggressive AI ("Bold AI"). The rest stay on the research page. Edit the `DESKS` list in `index.html` to change that.
- Version number: `version.json` is now the single source and both pages read it (the page had been stuck at ap-v1.13). `scripts/bump.mjs` bumps it and starts the changelog entry; `scripts/check-version.mjs` plus the `.githooks/pre-commit` hook block commits that change the app without a bump. See "Releasing" in the README.

## v1.22
- Top-100 research track, running next to the top-50 desks and changing none of them. New scheduled function `top100.mjs` (every 5 minutes at minutes 2, 7, 12 ..., so it never hits OKX at the same moment as the main tick) scans 100 liquid OKX USDT perpetuals ranked by 24h USD volume (OKX has no market cap, so volume is the proxy; stablecoins and gold tokens are excluded; a coin with an open trade stays in the scan until it closes). Paper bank is $100 per coin instead of $250.
- Two rule-based desks only, no Claude calls: Algo rules (`XXX:algo100`, same rules and skip list as Algo, bank compounds per coin from $100) and Neutral Reversal (`XXX:rev100`, 16 weakest long and 16 strongest short, which is the same 16% of the universe as 8 of 50, $500 per leg, 24h hold, no stops). The AI desks stay on the top-50 set.
- New table `ap_prices100` (latest price, 60m return, 24h change, volume and rank per coin, overwritten each run). Nothing is written to `ap_samples`, so the race chart and the top-50 numbers are unchanged. Run the new block at the bottom of `sql/autopilot.sql` once.
- Both desks are in the kill switch list and in the daily snapshots. Dashboard rows show closed trades, fees and a "$10,000 + closed P&L" total (open P&L is not shown there because coins 51 to 100 have no rows in `ap_samples`); the daily table fills in open P&L for snapshots taken right now.

## v1.21
- Daily snapshots: new table `ap_daily_snapshots` (run the new block at the bottom of `sql/autopilot.sql` in the Supabase SQL editor once) and a new scheduled function `daily.mjs` (every 30 minutes). One row per Bangkok day and desk, for all 16 desks (the 14 existing plus Neutral Rev 2 and its limit twin; a desk only gets rows from its first trade).
- Each row: trades closed that day, wins, win rate, P&L after fees, fees, best and worst trade, worst intraday drawdown of realized P&L, cumulative trades / P&L / fees since the 18:00 Bangkok 14 Oct start, peak and max drawdown to date, trades still open and their open P&L, total value (same formula as the dashboard), and market breadth (coins up / down over 60 minutes, BTC 24h change).
- Scoring support: each row also keeps the lowest and highest total value seen that day (open trades included, so intraday drawdown is not hidden by the 30-minute snapshots; a backfilled day only has its end-of-day point). New view `ap_desk_scorecard` per desk: trading days, trades, P&L, green-day %, best / worst day, average and spread of daily P&L, worst intraday and realized drawdown, lowest total value, and pass/fail checks (150+ trades, 7+ trading days, 60%+ green days, no day worse than -3% and no realized drawdown worse than -8% of the start bank). The thresholds are plain numbers at the bottom of `sql/autopilot.sql`, edit them to taste.
- Today and yesterday are rewritten every run, and any earlier day without rows is rebuilt from `ap_positions`, so the table backfills itself from the race start. Each day continues from the previous day's cumulative numbers, so only one day of trades is read at a time. Breadth and open P&L for a backfilled day come from the `ap_samples` rows near that day's end, and are empty if those were already deleted.

## v1.19
- Algo v2 desk (stored as `XXX:algo2`): plain rule found by analysing the first 5.7 hours of snapshots. SHORT after a 1.5%+ bounce off the 60 minute low while the last 5 minutes are still rising; take profit 0.6%, stop 0.6%, 30 minute hold, 10 minute cooldown, $250 per coin. A paper forward-test, not a proven edge. Shown as its own row in the desk table.

## v1.18
- Maker desk (limit orders): reads the same Claude calls as the Aggressive desk (gate 50%, max 10 open, top 8 movers) but enters with a limit order 0.10% better than the price (below for longs, above for shorts). The order fills only if price trades through it by 0.02%; otherwise it is cancelled after 10 minutes and counted as a miss. Fees: 0.02% maker on entry and on take profit, 0.055% taker on stop and time exits. Stored as coin `XXX:m` with status `pending` / `cancelled`. The page shows the fill rate in the desk table and has a Maker button in the AI desk mode switch.

## v1.17.1
- Autopilot page shows total value per desk (the $250 per coin plus closed P&L plus what open trades are worth now, minus the entry fee), with open P&L and % change, in the desk table and two new tiles. All desk numbers now count trades since 18:00 Bangkok only.

## v1.17
- Four AI desks side by side, each with its own $250 per coin and all reading the same Claude decision: Normal (gate 55%, max 5 open, top 4 movers), Aggressive (50%, 10, top 8, the original desk), Super (45%, 15, top 12, TP min 0.30%) and Ultra (40%, 25, top 16, TP min 0.25%). Claude now looks at the 16 biggest movers per scan. Stored as coin `XXX:n`, `XXX:s`, `XXX:u` (Aggressive stays `XXX`).
- Autopilot page: comparison table of all desks and an AI desk mode switch (Normal, Aggressive, Super, Ultra) that drives the KPI tile and the chart.

## v1.16
- Manage coins panel on the autopilot page: remove a coin, or add any live OKX USDT swap (checked against OKX first; at 50 you pick which coin it replaces). Saved as a watchlist row in desk_events, and the server reads the newest one every scan. Always exactly 50 coins (an empty slot is filled by the next spare), and a coin with an open trade stays until the trade closes.

## v1.15.1
- Main page now has an AUTOPILOT button linking to /autopilot.html.

## v1.15
- AI desk is more aggressive: asks Claude about the 8 biggest movers per scan (was 4), up to 10 open trades (was 5), confidence gate 0.50 (was 0.55), spread limit 12 bps (was 8), minimum take profit 0.35%, TP only needs to be 1.2x the stop, and the prompt now says to trade a clear edge instead of defaulting to PASS.
- Recap workflow fixed (installs ffmpeg).

## v1.14.2
- Automatic 6h recap video: a GitHub Action runs at 00:05, 06:05, 12:05 and 18:05 Bangkok time, records the 3 minute recap of the live page and posts it as an MP4 on the repo's Releases page.

## v1.14.1
- Autopilot page: 6h recap button. Replays the last 6 hours of the race over 3 minutes and records it to a video file (WebM) you can download.

## v1.14
- Autopilot now covers the top 50 coins by market cap (OKX swaps; the list has spares so 50 stay live). Every coin gets $250 on the Algo desk and the AI desk. Claude still only looks at the 4 biggest movers per scan, so AI cost stays flat.
- Forward-return backfill runs in parallel so the 5 minute run stays fast with 50 coins.

## v1.13.1
- Autopilot page refreshes every 5 minutes, lined up with the server scan, with a countdown and a refresh-now button.

## v1.13
- Autopilot now covers the top 20 coins (BTC, ETH, XRP, BNB, SOL, DOGE, TRX, ADA, LINK, AVAX, SUI, XLM, BCH, HBAR, LTC, TON, DOT, UNI, AAVE, NEAR). Contract sizes come from OKX at run time, and a coin OKX does not list is dropped.
- Every 5 minutes it scans all of them (one snapshot row each for pattern mining), then asks Claude only about the 4 coins whose move is biggest compared with their own noise, plus any coin with an open trade. At most 5 AI trades open at once; skips a coin when the spread is over 8 bps.
- New Algo desk: plain rules, no AI, $250 per coin, stored as coin `XXX:algo` in `ap_positions` (no new table needed). Rule: range fade (30m range 1.2%+, price 0.35%+ from its 20m average, not trending, price has turned, not fighting a 60m move of 0.5%+), take profit 0.6%, stop 0.6%, 30 minute hold, 10 minute cooldown.
- Both desks start at $250 per coin (was $150 for the AI desk), so the Autopilot page compares them side by side with a total and an "AI minus Algo" column.
- AI thinking upgrade: it now sees market breadth across the top 20, BTC's trend, how the coin moves against BTC, and the desk's recent win/loss by side. The prompt makes it reason in order (regime, edge, catalyst, cost, track record), defines confidence as the chance of hitting take profit first, raises the minimum take profit to 0.5%, and tells it a rule-based desk is being compared with it. Reasons are stored up to 340 characters.
- News scan: one coin every 15 minutes (BTC, coins with an open trade, or the biggest 24h movers, oldest scan first) instead of fixed BTC and NEAR jobs.
- Autopilot page redesigned (decisions list is collapsible, one line each until opened): summary tiles, the "$250 race": an animated chart where every coin starts at $250 and the line shows what that $250 is worth over time (3h/6h/24h/3d). Switch between just holding the coin, the Algo desk and the AI desk (real value including open trades). Live leaderboard beside it, hover to spotlight a coin, click a coin to see Holding vs Algo vs AI with trade open/close markers, Replay button. Table view underneath, decisions with a confidence bar and what price did afterwards.

- Race chart: every coin has its own fixed colour (lines, labels, leaderboard dots, tooltips); value text is green above $250 and red below.
- All times on both pages are Bangkok time (UTC+7): the clock, chart axes, tooltips, activity tape and the Autopilot status line.

- Race chart tabs for leverage: Holding 1x, 1.5x, 2x, 3x. Value = $250 x (1 + leverage x the coin's move since the start of the window), no fees or funding; a coin that falls far enough to hit zero is shown as wiped out at $0. The Algo and AI desk tabs are labelled 5x, which is what those desks use. Opening a coin also draws the selected leverage line.

- Race chart now starts at 18:00 Bangkok time on 14 Oct 2026 (new default tab "Since 18:00"; every line starts at $250 there). 3h, 6h, 24h and 3d tabs remain. To restart the race later, change `RACE_START` in `autopilot.html`.

## v1.12
- Tuned from the first two days of data (162 trades, -$167 net, $119 of it fees; NEAR longs -$151, NEAR shorts +$4).
- Fade bot trades less: needs a 1.2% range (was 0.8%) and a 0.35% stretch (was 0.25%), and it no longer buys a dip when the last hour is down 0.5%+ (or shorts a bounce when it is up 0.5%+).
- Autopilot news: the scan is told today's date and must say whether a named event (CPI, Fed) has already happened; conflicting sources are read conservatively. Scans older than 6 hours are no longer shown to the decision step.
- Autopilot asks Claude in a quiet market when news is 0.4+ strength and under 3 hours old (was 0.6 and 6 hours). The 0.55 confidence gate is unchanged: both skipped 0.50 shorts would have lost.

## v1.11
- "Jev stand-in" panel. We don't have the Jev model, so this is our version of the idea: the same paper spread quoter, but it only opens a position on the side a signal picks. Signal = order-book imbalance over the top 10 levels (buy side if the bid side is 25%+ heavier and price isn't falling, sell side for the reverse, otherwise stay out). The side that reduces inventory is always quoted. It runs beside the plain two-sided quoter so the two can be compared.
- Both quoters now log the signal (book imbalance, 10-second flow) with every fill and every minute (`mm_*` and `jev_*` events in `desk_events`), so we can later train a real buy/sell classifier on our own data.
- Inventory cap now counts the next quote, so it no longer overshoots $225.

## v1.10
- New "Spread quoter" panel on each desk (paper only). It rests a bid at the best bid and an ask at the best ask, never crosses the spread, and shows spread capture before fees plus the net result at three fee levels: standard maker 0.02%, 0%, and a 0.005% rebate. This tests whether market-making (the Jev idea) beats fees.
- Fill rule is strict: a bid fills only when a trade prints below it (an ask: above it), with no credit for queue position. Quotes refresh from each book snapshot (now every 3 seconds, was every 9), and a filled side stays empty until the next snapshot.
- Risk: inventory capped at $225 per side; a 0.4% adverse move flattens at the touch as taker. Fills are logged as `mm_fill` and `mm_flatten`, plus a once-a-minute `mm_snap`, in `desk_events`. Nothing goes to `paper_trades`.
- Open the page with `?mm=only` to run only the quoter (the formula desks, twin and fade bot stay off), so it can run beside a fade-bot tab without doubling trades.

## v1.9
- Tuned from the overnight run (42 trades, -$26.65; the judge's 30 early exits lost $31.10, the plain rules made +$4.47).
- The judge can now only cut a LOSING trade: it is asked only once the trade is down 0.3% and held 30s+, and a CLOSE acts only at down 0.4% or worse. Winners are left to the take profit.
- Trend filter: no entry when the 30-minute net move (measured up to 5 minutes ago, so the dip itself does not count) is over 40% of the range, or the 60-minute move is 1% or more.
- Circuit breaker: 3 losses in a row pauses the bot for 30 minutes (`fade_pause` event).
- Gate logging: once a minute the reason for staying out is logged as `fade_gate`, and the panel shows seconds spent out per gate (range, trend, stretch, turn, pause).

## v1.8
- Fade bot now has an "instinct" layer. Every 20 seconds while a trade is open, a new Netlify function (`exit-judge`, Claude Haiku) is shown the position (entry, price, P&L, peak, worst, time held, last 12 one-minute closes, range, distance from average) and answers HOLD or CLOSE.
- A CLOSE exits at market (taker fee). The hard rules stay as guardrails: take profit 0.5%, stop 0.8%, exit after 6 minutes. If the function is down, the bot just follows the rules.
- Every judgement is logged as `fade_judge` in `desk_events` (action, reason, P&L, time held), so we can later check whether the judge's early exits beat simply holding.

## v1.7
- Fade bot on each coin, copying the manual range pattern (7 wins, 1 loss on NEAR). Own $150 bank, compounding, runs on its own with no clicks.
- Rules: only in a range wide enough to beat fees (30-minute high to low of at least 0.8%); price at least 0.25% away from its 20-minute average; buy the dip or short the bounce only once price has turned (no catching a falling knife). Take profit 0.5% (maker), stop 0.8%, exit after 6 minutes, 60-second cooldown.
- Entry is market (taker 0.055%), take profit is a limit (maker 0.02%), stop and time exit are taker. Round trip is about $0.80 on a $750 position.
- Closed trades saved to Supabase under run `v1.7-fade`; entries logged as `fade_entry` in `desk_events`.
- The numbers are first guesses from 8 manual trades, to be tuned on real data.

## v1.6
- Manual order: TP and SL boxes reset to blank after every close or cancel. A blank box now means the default: TP 3% in profit and SL 3% against, from the entry price (before: +0.4% / −0.2%).
- You can still type your own prices, or change them later with UPDATE TP / SL.

## v1.5
- Manual order: new UPDATE TP / SL button. Change the TP and SL boxes, then tap it to move them on a resting limit order or an open position. A blank box keeps the current value.
- The TP and SL boxes now fill in with the position's levels when an order is placed or filled.
- Checks: TP must be beyond the current price and SL on the other side of it, so a stop can be moved up (long) or down (short) to lock in profit. Each change is logged as `manual_adjust` in `desk_events`.

## v1.4
- New table `desk_events` (SQL in `sql/events.sql`). Every step around a trade is now logged: formula signals, Claude's verdict (action, confidence, reason, whether it agreed), market entries, limit-twin orders, fills and misses, manual orders, fills and cancels. Closed trades still go to `paper_trades`.
- Logging is silent: if the table is missing, the page keeps working and only the ledger counter in the header ignores it.
- Older v0.8 tab has no ledger; its last closed trades were back-filled once under run `v0.8-backfill` (the tape only keeps the last 5 per coin, so earlier v0.8 trades are lost).

## v1.3
- Manual order: TP and SL are now entered as prices (for example TP 5.20, SL 5.75), not percentages. Leave a box blank to use the default +0.40% / −0.20% from the entry price.
- The panel checks the direction: a SHORT needs TP below and SL above the entry; a LONG needs TP above and SL below. Otherwise it shows a message and does not open the order.

## v1.2
- Manual order panel on each coin: place paper LONG or SHORT yourself, market or limit, with your own TP % and SL %, and size of 100%, 50% or 25% of the bank at 5x.
- Own $150 bank per coin, separate from the agent desk and the limit twin, so the comparison stays clean. Saved to Supabase with run `v1.2-manual`.
- Market fills at the last price (taker 0.055%). A limit rests until price trades through it by 0.01% (maker 0.02%); a limit already past the market fills at once as taker. TP exits as maker, SL and the close button as taker. No time limit; cancel or close any time.

## v1.1
- Limit-order twin on each coin. When the market desk enters (after the LLM Chief agrees), the twin rests a limit order at the near side of the book (long at the bid, short at the ask) instead of paying the spread.
- Fills only if price trades through the limit by 0.01%. If not filled within 3 minutes it counts as missed.
- Fees: maker 0.02% on entry and on take profit; taker 0.055% on stop and time exit. Same TP +0.40%, SL −0.20%, 15 min max hold. Own $150 bank.
- New "Limit twin" panel per coin compares limit vs market (wins, losses, filled, missed, P&L, fees). Twin trades are saved to Supabase with run `v1.1-limit`; market trades with run `v1.1`.

## Autopilot v1 (separate from the dashboard versions)
- New server-side desk that runs on Netlify with no browser open. Every 5 minutes it manages open paper trades and, when the market moves or news is hot, asks Claude for LONG, SHORT or PASS.
- News: every 2 hours per coin, Claude searches the web for catalysts from the last 48 hours and stores a summary, sentiment and strength in Supabase.
- Claude chooses its own take profit, stop and hold time (longer holds allowed), sees its own recent decisions and what price did 15 minutes later, and stays flat by default.
- Viewer page: `/autopilot.html`. Tables: `ap_positions`, `ap_decisions`, `ap_news` (SQL in `sql/autopilot.sql`).
- Pattern dataset: every 5 minutes it saves a snapshot per coin (rally and pullback size over 5/15/30/60 minutes, distance from the 60-minute high and low, range, volatility, funding, 24h change, news) and fills in what price did 15 and 60 minutes later (`ap_samples`). Claude also sees these swing numbers when deciding.
- Paper money only. No exchange keys, no real orders.

## v1.0
- LLM Chief. When the formula wants a trade, the desk asks a Claude model (through a small Netlify function that holds the API key) and only enters if Claude agrees. Claude sees the price, 6-minute move, spread, depth, funding, recent closes and the last 5 closed trades.
- Claude's reason shows on the desk and is saved in the ledger `reason` column (`| llm: ...`).
- If the LLM Chief is offline the desk stays flat (no trade) and says so.

## v0.9
- Every closed paper trade is now saved to a Supabase table (`paper_trades`) with run version, session, coin, side, entry/exit, size, fees, P&L and reason. Trades survive reloads, so versions can be compared fairly.
- Header shows `ledger: N saved` (turns red with the error if a save fails).
- Uses the public anon key only; the table's row rules allow adding and reading trades, nothing else. Trading logic unchanged from v0.8.

## v0.8
- Result of v0.7 after 52 minutes: about 76 trades, gross P&L +$8, fees $57, net -$49 on $300. Fees dominated.
- Far fewer trades: 10-minute cooldown after each trade, and entry only on a 6-minute move of at least 0.15% (BTC) or 0.30% (NEAR).
- Wider targets: take profit +0.40%, stop -0.20%, max hold 15 minutes. A fee of 0.11% is now a smaller share of each trade.
- Momentum score scale lowered so it no longer saturates at 0.95.

## v0.7
- BTC and NEAR now run side by side. Each coin has its own desk: six agents, live chart, $150 paper balance, activity tape and verdict. The header shows the total of both balances.
- NEAR thresholds are first guesses: momentum gate 0.06%, depth minimum $0.5M, max spread 8 bps.
- KuCoin futures added as the last backup price source, untested.
- Backup sources are keyed per coin (Bybit, Binance, OKX, KuCoin).

## v0.6
- Paper bank is now $150.

## v0.5
- Price stream tries several exchange WebSocket addresses and switches if one sends nothing for 6 seconds.
- Book depth is measured on the top of the order book only, so the threshold is now $5M and the metric is renamed book_depth_usd.
- Chief passes unless the 6-minute move is at least 0.03%, so it stops trading tiny moves that fees would eat.

## v0.4
- Trade-by-trade price from the exchange WebSocket, so the price and last candle move many times per second.
- Badge shows ticks per second.
- Polling every 2 seconds as backup.

## v0.3
- Backup price sources: Binance and OKX if Bybit is blocked.
- Feed badge shows the source name, or the exact error when down.
- Version number shown on the page.

## v0.2
- Live Bybit BTCUSDT price, candles, open interest, funding, order book.
- Paper trades fill at the real price with fees, take profit and stop.

## v0.1
- Mock dashboard with random data, $2,000 starting bank.
