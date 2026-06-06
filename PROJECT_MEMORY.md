# Project Memory

Last updated: 2026-06-03 Asia/Taipei

## Current State

This repository is the source of a Google Apps Script project linked by `.clasp.json` to spreadsheet/script ID:

- Spreadsheet ID: `1c1COm9ppqpAgCzbtGqWQKzCPEdcH_oKsLv-qkqrT4No`
- Spreadsheet title: `30-day Taiwan Stocks` in local notes; the actual Google Sheet title is Chinese.
- GitHub repo: `https://github.com/deaningithub/stock_record`
- Runtime: Google Apps Script V8
- Time zone: `Asia/Taipei`

The local Excel export was deleted after Google Sheet connectivity was confirmed. Data exports remain intentionally excluded from GitHub.

## Required Script Properties

Fugle API key, one of:

- `FUGLE_API_KEY`
- `FUGLE_APIKEY`
- `FUGLE_TOKEN`
- `FUGLE_KEY`
- `FUGLE`
- `fugle`

OpenAI API key, one of:

- `OPENAI_API_KEY`
- `OPENAI_APIKEY`
- `OPENAI_KEY`
- `OPENAI`

The user confirmed `OPENAI_API_KEY` is configured in GAS.

## Google Sheet Tabs

Core runtime tabs:

- `Config`: enabled watchlist symbols, names, themes, notes.
- `IntradayQuotes`: Fugle intraday quote snapshots.
- `RealtimeFeatureSnapshots`: realtime quote-derived features, including spread, book imbalance, micro price.
- `HistoricalDaily`: latest daily candle/stat records.
- `MinuteReplay`: one-minute candles for replay/backtesting.
- `RunLog`: runtime logs and trigger audit output.

AI/risk/external evidence tabs:

- `AIValuations`: daily 09:00 intraday AI valuation and target.
- `WeeklyAIValuations`: weekly three-month forward valuation.
- `DailyStockScan`: local daily ranking for the 100-symbol shortlist from `StockScanPool500`, with top-pick flags and combined momentum/order-book/AI/external/bad-news scoring.
- `AllStockUniverse`: weekly refreshed full-market universe from Fugle ticker lists.
- `StockScanPool500`: daily refreshed 500-symbol pool selected from `AllStockUniverse` before the 100-symbol daily scan.
- `BadNewsMonitor`: negative-news risk signals used to block entries or force exits.
- `LimitUpExternalEvidence`: per-symbol per-date external evidence for limit-up setups.

Backtest tabs:

- `BacktestTrades`
- `BacktestReport`
- `DeanBacktestTrades`
- `DeanBacktestReport`

Known sheet ID:

- `MinuteReplay` has gid/sheetId `1973125012`; do not reuse this tab for bad-news or external-evidence data.
- `LimitUpExternalEvidence` was created as a dedicated tab with sheetId `2026060301`.
- `WeeklyAIValuations` was created as a dedicated tab with sheetId `2026060302`.

## Main Files

- `Code.js`: main GAS entry point, watchlist, sheet setup, Fugle helpers, core collection helpers.
- `trigger.js`: trigger installation/audit helpers.
- `ai_valuation.js`: daily AI intraday valuation using OpenAI Responses API and web search.
- `weekly_ai_valuation.js`: weekly three-month forward valuation using OpenAI Responses API and web search.
- `daily_stock_scan.js`: full universe/500-pool/100-shortlist scanner that uses Fugle ticker lists plus local sheet evidence; it does not add new OpenAI calls.
- `bad_news_monitor.js`: negative-news risk monitor using OpenAI Responses API and web search.
- `limit_up_external_evidence.js`: `LimitUpExternalEvidence` AI/web-search refresh handler, freshness fields, material bad-news mapping, and local score/trigger formula.
- `realtime_gas.js`: realtime quote feature snapshots.
- `backtest.js`, `strategies.js`, `report.js`: baseline intraday backtest.
- `dean_strategy_configs.js`, `dean_backtest.js`, `dean_report.js`: Dean strategy suite and reporting.

## Trigger Strategy

Recommended trigger installer:

- `installRecommendedProjectTriggers()`

It installs:

- `recordStockInfo`: daily near 16:05 Asia/Taipei. This records intraday quote and daily candle after Fugle daily data is more stable.
- `recalculateAiValuationsAtOpen`: daily near 09:00 Asia/Taipei.
- `recalculateWeeklyThreeMonthValuations`: weekly near Sunday 18:00 Asia/Taipei.
- `runDailyStockScan`: daily near 16:30 Asia/Taipei, after the 16:05 daily stock recorder, with weekend guard.
- `refreshAllStockUniverseWeekly`: weekly near Sunday 17:00 Asia/Taipei; refreshes all normal TWSE/TPEx equity tickers from Fugle `/intraday/tickers`.
- `refreshStockScanPool500Daily`: daily near 16:20 Asia/Taipei; ranks the full universe into `StockScanPool500` before `runDailyStockScan`.
- `monitorBadNewsSignals`: every 15 minutes; handler runs only on weekdays 08:00-14:00 Asia/Taipei.
- `refreshLimitUpExternalEvidence`: every 30 minutes; handler runs only on weekdays 08:30-13:35 Asia/Taipei.
- `collectGasRealtimeSnapshots`: every 1 minute; handler guards market hours.
- `recordMinuteReplayCandles`: every 5 minutes; handler guards market hours.
- `recordTodayMinuteReplayCandlesAfterClose`: daily near 14:30 Asia/Taipei.

Deprecated trigger setup paths were removed:

- 2/3/4/5-day stock trigger installers.
- standalone `installDailyTrigger()` for `recordLatestDailyCandles`, because it overlapped with `recordStockInfo`.

Manual note:

- `clasp run ...` has repeatedly failed with Google execution permission errors. Run trigger installers manually from Apps Script UI when needed.
- `auditProjectTriggers()` logs installed triggers into `RunLog`.

## Strategy Design Notes

The user wants to catch stocks preparing for limit-up quickly, without exiting just because of short-lived intraday emotion.

The current workflow has three scan layers:

- `AllStockUniverse`: weekly full-market pool from Fugle tickers.
- `StockScanPool500`: daily 500-symbol pool, weighted toward current 100 seeds, strategy themes, existing external evidence, AI valuation rows, realtime features, and bad-news penalties.
- `DailyStockScan`: daily 100-symbol shortlist from the 500 pool.

The current 100-symbol seed list preserves the original 30-symbol watchlist and adds large-cap/current AI, semiconductor, PCB, server, financial, telecom, shipping, and traditional-industry names researched from Taiwan market-cap/index context as of 2026-06-06.

Current Dean strategy logic:

- Uses intraday momentum and quote-feature proxies.
- Uses daily `AIValuations` as a gate and score input.
- Uses 7-day AI valuation history to reward stable or improving valuation, upside, and confidence.
- Strong valuation hold prevents premature exit on temporary imbalance/timeout/take-profit signals.
- Bad-news signals from `BadNewsMonitor` can block entries or force exits.
- `featureMode` marks AI-valuation-aware trades as `minute_bar_proxy_ai_valuation`.

Key current philosophy:

- Hold stronger when valuation and trend support the move.
- Do not ignore real material negative news.
- Prefer limit-up candidates when momentum, valuation, and external evidence align.

## AI Valuation Notes

Daily valuation:

- Function: `recalculateAiValuationsAtOpen()`
- Sheet: `AIValuations`
- Fields include `intradayTarget`, `fairValue`, `downsideRisk`, `upsidePct`, `confidence`, `rating`, `limitUpPlan`, `keySources`.
- Uses `valuationHistory7d` for each symbol.
- JSON truncation was fixed by increasing `max_output_tokens` to `20000` and enforcing concise schema text fields/source limits.

Weekly valuation:

- Function: `recalculateWeeklyThreeMonthValuations()`
- Sheet: `WeeklyAIValuations`
- Fields include `threeMonthFairValue`, `threeMonthUpsidePct`, `thesis`, `catalysts`, `risks`.
- This should not be treated as an intraday target.

Bad-news monitor:

- Function: `monitorBadNewsSignals()`
- Sheet: `BadNewsMonitor`
- Severity output is normalized to `none | watch | serious | critical`; legacy `low | medium | high` values are mapped internally for ranking.
- Risk scoring:
  - `riskScore >= 75` blocks new entries.
  - `riskScore >= 85` can force exit.
  - `severity=high` blocks new entries.
  - `severity=critical` can force exit.

Limit-up external evidence:

- Function: `refreshLimitUpExternalEvidence()`
- Sheet: `LimitUpExternalEvidence`
- Minimal fields needed by downstream strategy: `symbol`, `date`, `news_score`, `institution_score`, `branch_score`, `chip_score`, `trigger`.
- Also provides freshness and material bad-news fields: `data_freshness_minutes`, `news_checked_at`, `institution_data_date`, `margin_short_data_date`, `branch_data_date`, `material_bad_news`, `bad_news_severity`, `bad_news_action`, `bad_news_reason`.
- Current helper formula:
  - `external_score = news_score*0.30 + institution_score*0.25 + branch_score*0.30 + chip_score*0.15`
  - Trigger when `external_score >= 0.70`, no bad news, `branch_score >= 0.60`, and `news_score >= 0.40`.

## Known Operational Issues

- `clasp run` cannot currently execute GAS functions from CLI due to Google permission/API executable behavior. Use Apps Script UI for one-off runs and trigger installation.
- Google Sheets API connector may occasionally hit read quota 429; avoid repeated metadata reads in tight loops.
- OpenAI JSON outputs can be truncated if prompts/outputs grow too large. Daily AI valuation now uses concise schema, but if truncation recurs, implement cursor-based batching in Script Properties.
- Current watchlist names in `Code.js` show mojibake in some local file output; however the `Config` sheet can hold corrected names.
- `README.md`, `.gitignore`, `.clasp.json`, and strategy JSON folder are not tracked by `clasp` but are tracked/used locally or by git as appropriate.

## Maintenance Checklist

After code changes:

1. Run `node --check` on changed JS files.
2. Run `clasp status` to confirm only intended GAS files will push.
3. Run `clasp push`.
4. Commit and `git push`.
5. If trigger handlers changed, run `installRecommendedProjectTriggers()` manually in Apps Script UI.
6. If diagnosing triggers, run `auditProjectTriggers()` manually in Apps Script UI and check `RunLog`.

Useful commands:

```bash
clasp status
clasp push
git status --short
git log --oneline -5
```

## Recent Important Commits

- `b9a0ab4` Add weekly three-month AI valuations
- `9526ed7` Prevent AI valuation JSON truncation
- `00b9cd3` Move daily stock trigger after 16:00
- `14ab3a7` Clean up trigger management
- `1593032` Add limit-up external evidence sheet schema
- `f75a5ba` Add bad-news monitor risk signals
- `0e9a9f7` Reference seven-day AI valuation history
- `cc4c369` Use AI valuations in Dean strategy signals
