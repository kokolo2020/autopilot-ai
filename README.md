# AI Autopilot

Paper-trading autopilot for the top 50 coins (OKX USDT swaps). $250 per coin on two desks side by side: an AI desk (Claude decides) and an Algo desk (plain rules). Paper money only.

- `index.html`: the live page (race chart, leaderboard, decisions, news, Manage coins, 6h recap button).
- `netlify/functions/autopilot.mjs`: scan every 5 minutes. `news-scan.mjs`: news every 15 minutes. `ap-tick.mjs`: manual trigger.
- `netlify/lib/ap.mjs`: all the trading logic.
- `sql/autopilot.sql`: Supabase tables (`ap_positions`, `ap_decisions`, `ap_news`, `ap_samples`). Manage coins and the watchlist also use a `desk_events` table.
- `.github/workflows/recap.yml`: every 6 hours records a 3 minute recap video and posts it under Releases. Set the repo variable `SITE_URL` to the site address.

Deploy: connect the repo to Netlify (publish directory `/`). Environment variables: `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`.

**Run only one Netlify site with these keys.** Two sites running the scheduled functions against the same Supabase project will trade twice.
