# Midterm Signal — deployable 2026 US election dashboard

Static HTML/CSS/JS + a serverless Netlify Function. No Node dependencies or API keys required.

## Deploy on Netlify (recommended: Git integration)

1. Upload the contents of this directory to a GitHub repository. Do not upload only `index.html`.
2. In Netlify, choose **Add new project → Import an existing project** and select the repo.
3. Leave the build command empty. Publish directory: `public`. Functions directory: `netlify/functions` (already configured in `netlify.toml`).
4. Deploy. Visit the site and press **Refresh sources**. This fetches the published polling snapshot and requests fresh market quotes via the deployed serverless function.

Alternatively, install Netlify CLI and run `netlify deploy --build --prod` in this directory after linking your Netlify site. A plain HTML drag-and-drop deploy may publish the static content but **will not necessarily build or deploy the serverless function**. For market refresh, use Git or `--build` with CLI.

## What refresh actually does

- **Polymarket and Kalshi:** `netlify/functions/markets.mjs` reads public APIs (Gamma events and Kalshi market data). Prices and 24-hour/lifetime trading volumes are refreshed on click. Each section says whether its figure is live API data or an explicitly dated historical reference.
- **Polls, models and battlegrounds:** The client re-reads `public/data/snapshot.json` on every click. These are publisher-sourced human-curated numbers, **not a live scraper**. Update this file when the sources publish new data, commit/redeploy, then click Refresh. A source-date label remains visible. It is not truthful to show a live polling ticker without an actual authenticated/reliable data feed.
- **When APIs fail:** the site displays the old **2 November** reference *as historical*, leaves unverified money-flow numbers blank, and shows errors, not fictitious API values.

## Editing polling values

Edit `public/data/snapshot.json`, then redeploy. You can update the forecasts, state polls, Cook rating categories, battlegrounds and the `asOf`/`updated` timestamps. Keep citations in `sources`, and preserve the JSON structure. Change the `referenceMarkets` historical prices only if you are intentionally publishing a new sourced historical snapshot, along with its source date.

## How money-flow metrics work

- Polymarket volume is trading turnover in **USD**, not net inflows or net buying of one side. 24h is trailing 24 hours and lifetime is total. Liquidity is currently posted liquidity.
- Kalshi volume is traded **contracts**, not directly comparable to Polymarket USD. Open interest is contracts still outstanding; it is not cash inflow.
- Market implied probabilities are derived from exchange quoted yes prices. Different contract rules and bid/ask spreads can produce mismatches, and prices need not total exactly 100%.
- All fetched data is shown with clear source status; no live prediction-market buying/selling automation is included.

## Public sources and documented endpoints

- Forecast: https://votes.decisiondeskhq.com/forecast/2026
- House ratings: https://www.cookpolitical.com/ratings/house-race-ratings
- Generic ballot: https://www.natesilver.net/p/generic-ballot-average-2026-nate-silver-bulletin-congress-polls
- Polymarket public API: https://gamma-api.polymarket.com/events?slug=balance-of-power-2026-midterms
- Kalshi public markets API: https://api.elections.kalshi.com/trade-api/v2/markets?event_ticker=CONTROLH-2026
- Netlify Functions: https://docs.netlify.com/build/functions/get-started/

## Directory layout

```
public/index.html
public/assets/style.css
public/assets/app.js
public/data/snapshot.json
netlify/functions/markets.mjs
netlify.toml
README.md
```

## Local testing

`python -m http.server 8000` serves the static UI, but does not run the Netlify Function; you will see dated reference prices. To test functions locally, use `netlify dev` with Netlify CLI. The Netlify Function is intentionally independent of any third-party npm packages.

## Caveat

The stock forecast snapshot is dated 2 November 2026. It is not automatically updated to election results on 3 November and should not be mistaken for live vote totals. Once voting begins, replace it with official results only if verified; the dashboard doesn't invent results.
