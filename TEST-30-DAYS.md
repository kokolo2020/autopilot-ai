# 30-day test, $1,000 bank per strategy (restarted 18 Oct 2026)

> **19 Oct 2026 (v1.44): the daily close moved from 20:00 to 07:00 Bangkok (00:00 UTC) at Koko's request.** Open daily legs were closed at 07:00 on 19 Oct and a new batch opened right after. Under the rule above this restarts the 30-day count: day 1 is the 19 Oct 07:00 batch. The weekly desk and My picks are unchanged.

> **19 Oct 2026 (v1.48): real OKX funding is now booked on every perpetual desk** (before: only Rev 3 and My picks). It is calculated at close over the whole time a leg was open, so day 1 (opened 19 Oct 07:00) is fully covered. Spot desks pay no funding.

> **21 Oct 2026 (v1.52): trimmed.** Retired (no new batches; open legs run to their close): Neutral Rev 2, Rev 2 + winner exit, scale-out, Reverse extremes, Spot long-only, Spot margin Rev, Rev 3 daily. Kept for the full 30 days: Neutral Rev (baseline), Neutral Rev weekly, Rev 2 limit, Capitulation Rev, Rev 3 low-leverage, My picks, AI signals (paper; needs Anthropic credit). New: **Trend momentum** (weekly, long the 5 strongest 30-day coins only while BTC is above its 200-day average, otherwise cash).

Rules fixed in advance so we can't move the goalposts. The first test (old $250-per-leg scale) was reset; its history is archived in `*_archive_1018`.

- Strategies: Neutral Rev, Rev 2, Rev 2 limit, Rev 3 daily. Each has its own $1,000 bank.
- One batch per day: long the 5 weakest, short the 5 strongest coins (24h change) = 10 legs, $100 margin each.
- Coins: top-50 list only, minimum $10M 24h volume.
- Leverage: Neutral Rev 5x. Rev 2 / Rev 3 start 4x, 10% stop on margin, reopen at 5x / 6x / 7x.
- Every batch closes at 20:00 Bangkok (13:00 UTC) daily and the next opens right after, so each full batch is 24h. The first batch after the reset is shorter. No changes during the test. If we change anything, the 30 days restart.
- Batch 1 opens right after the reset; batch 30 closes about 30 days later.
- All numbers net after fees, paper money.

## Pass (per strategy, all four must hold) — proposed, to confirm
1. Total net P&L after 30 batches at least +$250 (25% of the bank).
2. At least 18 of 30 batches positive.
3. No single batch worse than -$125.
4. Biggest drop from a peak no more than $250.

## Fail
Anything else. Say so in the Day 30 post and name the rule that failed.

## Extra (not part of pass/fail): Funding Carry v2, added 18 Oct 2026
$1,000 bank: up to 5 coins, each $100 spot + $100 short perp (1x). Enters only when funding is at least 0.03% per settlement; exits after 3 settlements in a row below 0.005%. Judged on net P&L after fees and yearly pace on money in use. Idea from the perp/spot carry research (Sharpe about 1.8 for BTC at retail costs).

## Extra test desks (added 18 Oct 2026, not part of pass/fail; each has its own $1,000 bank)
Ideas for lower losses in a bear market, all paper, all judged on the same four numbers at Day 30:
1. Capitulation Rev: Neutral Rev (5x, no stops) opens a batch only when the average 24h change of the coins is -1% or lower, otherwise it stays in cash.
2. Rev 3 low-leverage: Rev 3 rules but 2x then 3x instead of 4x to 7x. Worst case per leg is about $20 instead of $40.
3. Neutral Rev weekly: one batch per 7 days (5x, no stops) to cut fees.

## Closing time (18 Oct 2026)
All batches close at 20:00 Bangkok every day. Neutral Rev weekly closes at 20:00 on day 7. Batch 1 of the reset (opened 18 Oct 12:05) closes at 20:00 the same day and counts as a partial day.

## Non-perpetual extras (added 18 Oct 2026, not part of pass/fail; each has its own $1,000 bank)
1. Spot long-only: buys the 5 weakest coins ($200 each, no leverage), sells at 8pm daily. Taker fee 0.10% per side. This is the control that shows how much of Neutral Rev's profit comes from the short leg.
2. Spot margin Rev: 5 weakest bought and 5 strongest borrowed and sold, $100 each, 8pm close. The borrow interest is an ASSUMPTION (0.03% per day); the real OKX rate varies.
3. Dated-futures carry: $100 spot + $100 short dated future per coin, up to 5 coins, held to expiry, entered only at 10%+ yearly basis after fees. Funding does not matter; the price gap closes at expiry. It may open nothing, and its trades last weeks, so a 7-day check says little about it.
Prices for 1 and 2 come from the perpetual mid price, so the spot/perp gap is ignored.

## Extra: Neutral Rev scale-out (added 18 Oct, runs outside the pass/fail test)
Same 10 picks as Neutral Rev (5x, $100 margin per leg, 20:00 Bangkok close). All percentages are of the $100 margin (+7% = +$7 = a 1.4% price move at 5x).
- Winners: at +7% sell half. The other half closes at +10%, or when it falls back to +5%, whichever comes first; if neither, it rides to 20:00.
- Losers: at -2.5% sell half; at -5% buy that half back at the lower price; a -10% disaster stop closes everything left.
- A leg closed early does not reopen that day. Compare it with plain Neutral Rev after 30 days: does scaling out beat doing nothing?

## Extra: Rev 2 + winner exit (added 18 Oct)
Rev 2 exactly as it is (4x, 10% price stop, reopens at 5x/6x/7x), plus the winner exit: at +7% of the $100 margin sell half; the rest closes at +10% or back at +5%. Compare with plain Rev 2.

## Extra: Reverse extremes (added 18 Oct)
After each 20:00 close, the previous Neutral Rev batch's best and worst legs (by net P&L) are re-entered with the side reversed ($100 margin each, 5x), held to the next 20:00. Two legs a day: a tiny sample, forward test only.

## Extra: My picks (added 18 Oct)
Koko's own 20 coins (ZEN, NEAR, OP, ARB, RUNE, JTO, MON, EGLD, HYPE, SOL, SUI, GRAM, WLD, VVV, JUP, RAY, AERO, XRP, AVAX, CARDS): $250 margin each at 3x on OKX perpetuals ($750 notional, $5,000 total), all long (assumed), opened once and held, no daily close. Closed as "liquidated" at -32%. Coins with no OKX USDT perpetual are skipped and retried each tick. Page: /picks.html.
My picks add-on: once a coin trades 18% below its first entry, add $100 margin at 3x (one add-on per coin, its own isolated line).
My picks ladder: the add-on repeats each time a coin is another 18% below its latest entry, up to 4 add-ons per coin.

> **22 Oct 2026 (v1.53): two new desks, old ones kept for comparison.** Trend hold (BTC/ETH/SOL at 2x, each held only above its own 100-day average) and Crash buyer (cash unless the market falls 3%+ in 24h, then the 5 weakest for 3 days). Trend momentum now only buys coins that are up over 30 days. Funding carry: no slot has qualified since the reset (top-coin funding is below its 0.03%/8h entry level), so it stays as is.

> **22 Oct 2026 (v1.53.2): Rev 2 + winner exit and Spot long-only are back in the active group** (both in profit). Their first new batch opens on the next tick and closes at the 07:00 close.

> **22 Oct 2026 (v1.54): Scalp lab started** (separate page, not in the $1,000 desk table). Every 15 minutes: a momentum entry and a random control entry, each in four TP/SL sizes (0.3/0.3, 0.5/0.25, 1/0.5, 2/1 %), $500 per trade, 24h limit. Question: does any quick-trade setup win often enough to beat 0.11% taker (or 0.04% maker) round-trip fees? Also: the 5-minute tick now answers the scheduler at once and finishes in the background, which stops the same tick running 2-3 times.

> **22 Oct 2026 (v1.55): Lab desks, 9 new paper desks using information no earlier desk looked at** (teal "Lab" group on the research page). In the main tick: Liquidation snapback (15-min move + open interest falling), OI follow / OI fade (60-min move with open interest up or down), BTC lead-lag (altcoins that have not caught up with a sharp BTC move). In their own scheduled function (lab2): Funding-time drift (before each 8h funding payment), Crowd vs top traders (OKX long/short ratios), Residual momentum (BTC-neutral weekly long/short), Pairs (6 related-coin pairs, z-score), Funding spread OKX vs Hyperliquid. Each run of lab2 writes a line to "Latest decisions".

> **22 Oct 2026 (v1.57):** AI signals widened to TP 0.5-2% / SL 0.3-1% and now also sees each coin's 15-minute and 1-hour moves (it returned 0 setups all day under the old 0.4-0.7% / 0.2-0.4% bands). New desk **Trend momentum vs BTC** (:trendx): Trend momentum rules, but only coins beating BTC's 30-day return; the original Trend momentum keeps running for comparison.

> **22 Oct 2026 (v1.58): backtests + two changes.** One-year backtests with taker fees: Pairs +$190 on 65 trades (positive in all 4 settings, weak), residual momentum -$630 (reversed +$402, weak), funding drift (90 days) +0.05%/trade with market orders and +0.12% with limit orders, only when funding is beyond 0.012%. Changes: new desk Residual momentum reversed (:rmomr); Funding-time drift now booked at maker fees (stops at taker).

> **23 Oct 2026 (v1.59): Core desk + reactivations + tabs.** New desk **Core**: up to 5 top-50 coins held while each closes above its 50-day average and beats BTC over 30 days; checked daily after the 07:00 close (07:45-07:55 Bangkok), sold when the trend breaks, $200 margin at 2x, -15% stop, limit-order fees. Reactivated to collect more data: Neutral Rev 2, Neutral Rev scale-out, Reverse extremes, Spot margin Rev, Rev 3 daily, Trend Flip, Risk-balanced Rev. Still off: Claude AI desks (API cost) and per-coin Algo desks (tick time). Research page desk table now has tabs: All / New desks / Lab / Active / Reactivated.
