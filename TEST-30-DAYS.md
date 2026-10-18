# 30-day test, $1,000 bank per strategy (restarted 18 Oct 2026)

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
