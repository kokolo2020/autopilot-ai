# Autopilot learnings log

Paper trading only. Race started 2026-10-14 11:00 UTC (18:00 Bangkok). $250 per coin, 50 coins per desk, 5x leverage, taker fee 0.055% per side.
Decision (Koko, 2026-10-16): keep every desk running, including Algo v2, so we can learn from each strategy.

## Checkpoint 1: 2026-10-15 17:00 UTC (about 30 hours in)

All desks: 2,312 closed trades, net -$4,720, fees $2,973 (63% of the loss), gross about -$1,750.

| Desk | Trades | Net | Before fees | Note |
|---|---|---|---|---|
| Algo (range rules) | 195 | +$98 | +$365 | Only profitable desk. Win rate 71% vs 68% break-even. |
| Algo v3 (gated v2) | 4 | -$18 | -$12 | Took 4 trades while v2 took 418 in the same window. Too few to judge. |
| Neutral Reversal | 0 closed | n/a | n/a | 16 open, about +$240 unrealized. First 24h exit about 13:30 UTC on 16 Oct. |
| Aggressive AI | 344 | -$319 | +$142 | Longs +$169, shorts -$488. |
| Normal AI | 117 | -$247 | -$91 | |
| Maker AI | 203 | -$538 | -$368 | Paused for new trades. |
| Super AI | 317 | -$793 | -$369 | Paused for new trades. |
| Ultra AI | 413 | -$1,120 | -$574 | Paused for new trades. |
| Algo v2 | 722 | -$1,783 | -$839 | All shorts. -$1,679 came in the 12:00-18:00 UTC window on 15 Oct when the market bounced. 387 stop-outs. |

### Findings
1. Algo v2 is bear-market beta. It looked breakeven while the market fell, then gave back everything in one bounce, as the 14-day backtest predicted.
2. The breadth gate in Algo v3 (90%+ of coins falling over 60 minutes) kept it out of that bounce. Needs a full bounce cycle to confirm.
3. AI desks: shorts lose in bounces. Aggressive shorts -$488 vs longs +$169.
4. AI desk stops (about 1.5x more than take-profits) and fees (about $1.34 per trade against an average win of $7 to $10) leave no edge. Break-even win rate is about 52% to 58%.
5. Losses cluster by UTC hour (all desks except Algo v2): 11:00-13:59 about -$1,370 (US data and cash open) and 17:00, 20:00-21:59 about -$1,390. Hypothesis only, not tested.
6. Worst coins (all desks except Algo v2): ZEC -$197, SEI -$176, CRV -$172, INJ -$114, TRUMP -$109. Best: SUI +$62, LINK +$32.
7. AI decision confidence is all below 0.60, so the gates (0.40 to 0.55) sit in a narrow band.

## Upgrade candidates (not built yet)
A. Quiet-hours Algo: same as Algo, skips new entries 12:00-13:59 and 20:00-21:59 UTC. Forward A/B against Algo.
B. Regime-aware AI: block AI shorts unless breadth is high (same gate as Algo v3). Tests whether the AI shorts are the problem.
C. Neutral Reversal variants once the first result is in: 12h rebalance, K=5, K=12.
D. Fewer, bigger trades: wider take-profit (v3 uses 2%) so fees are a smaller share of each win.
E. Log breadth and BTC trend per position (can be rebuilt from ap_samples) to measure each desk's market exposure.
F. A volatile-coin filter (ZEC, SEI, CRV, INJ, TRUMP), only after more days of data, to avoid overfitting.

Caveats: 30 hours, one market, overlapping trades, simulator slightly optimistic, funding ignored.

## Built 2026-10-16: two new forward-test desks
- Quiet-hours Algo (`:algoq`): same rules as Algo, but no new entries 11:00-13:59 and 20:00-21:59 UTC. Tests the timing idea. Compare with Algo.
- Gated AI (`:g`): same Claude calls as Aggressive, but SHORT calls are ignored unless 90%+ of coins are falling over 60 minutes. Tests whether the shorts are the AI's problem. Compare with Aggressive.

## Built 2026-10-16: wild desks (Koko: "go but wild and extra wild")
- Wild Algo (`:algow`): Algo entries, TP 1.2% / SL 0.6% / 60 min hold. Break-even win rate about 40% before fees.
- Extra-wild Algo (`:algox`): TP 3% / SL 0.6% / 4 h hold. Needs about 25% wins. Expect many time-outs.
- Compare both with plain Algo (TP 0.6 / SL 0.6 / 30 min) after 2-3 days. Paper only.
