# 30-day test, $1,000 bank per strategy (restarted 18 Oct 2026)

Rules fixed in advance so we can't move the goalposts. The first test (old $250-per-leg scale) was reset; its history is archived in `*_archive_1018`.

- Strategies: Neutral Rev, Rev 2, Rev 2 limit, Rev 3 daily. Each has its own $1,000 bank.
- One batch per day: long the 5 weakest, short the 5 strongest coins (24h change) = 10 legs, $100 margin each.
- Coins: top-50 list only, minimum $10M 24h volume.
- Leverage: Neutral Rev 5x. Rev 2 / Rev 3 start 4x, 10% stop on margin, reopen at 5x / 6x / 7x.
- Closed after 24h. No changes during the test. If we change anything, the 30 days restart.
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
