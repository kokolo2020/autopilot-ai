# AI Autopilot

Paper-trading autopilot for the top 50 coins (OKX USDT swaps). $250 per coin on two desks side by side: an AI desk (Claude decides) and an Algo desk (plain rules). Paper money only.

- `index.html`: the public summary page (plain-language leaderboard, profit and loss chart, paper-trading notice). Which strategies it shows is the `DESKS` list at the top of its script.
- `research.html`: the detailed dashboard (race chart, every desk, decisions, news, Manage coins, 6h recap button).
- `version.json`: the one place the version lives. Both pages read it.
- `netlify/functions/autopilot.mjs`: scan every 5 minutes. `news-scan.mjs`: news every 15 minutes. `ap-tick.mjs`: manual trigger.
- `netlify/lib/ap.mjs`: all the trading logic.
- `sql/autopilot.sql`: Supabase tables (`ap_positions`, `ap_decisions`, `ap_news`, `ap_samples`). Manage coins and the watchlist also use a `desk_events` table.
- `.github/workflows/recap.yml`: every 6 hours records a 3 minute recap video and posts it under Releases. Set the repo variable `SITE_URL` to the site address.

Deploy: connect the repo to Netlify (publish directory `/`). Environment variables: `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`.

**Run only one Netlify site with these keys.** Two sites running the scheduled functions against the same Supabase project will trade twice.

Control page: /control.html (PIN-protected). Settings live in an ap_news row with coin CONTROL; the PIN is the CONTROL_PIN env var on Netlify.

## Releasing (version number)

Every change to the app bumps the version, so the number on both pages matches the build that is live.

1. `node scripts/bump.mjs minor "what changed"` (or `patch` for a small fix). It updates `version.json`, the fallback text in both pages, and adds a `CHANGELOG.md` entry.
2. Add detail under that changelog heading, commit and push.
3. Turn on the check once per clone: `git config core.hooksPath .githooks`. The pre-commit hook then refuses a commit that changes `index.html`, `research.html`, `control.html`, `netlify/` or `sql/` without a version bump (`node scripts/check-version.mjs --staged`).
