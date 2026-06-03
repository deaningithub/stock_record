# Taiwan Stock Recorder

Google Apps Script project for recording Taiwan stock market data into Google Sheets, collecting realtime quote features, replaying one-minute candles, and running intraday/backtest reports.

## Project Scope

This repository contains the Apps Script source code and strategy configuration files only. Runtime market data, exported spreadsheets, logs, and other generated datasets are intentionally excluded from GitHub.

## JavaScript Files

| File | Purpose |
| --- | --- |
| `Code.js` | Main Apps Script entry point. Sets sheet names, watchlist defaults, Fugle API access, setup helpers, quote collection, daily candle collection, minute replay collection, backfill flow, logging, and shared utilities. |
| `trigger.js` | Installs and removes Apps Script time-based triggers for daily stock recording, minute replay collection, realtime snapshots, after-close collection, and minute backfill continuation. |
| `ai_valuation.js` | Recalculates morning AI valuations for enabled watchlist stocks using local sheet data, the prior 7 days of valuation history, and OpenAI web search for current Taiwan news, US market context, and catalyst reasoning. |
| `bad_news_monitor.js` | Monitors current negative news, disclosures, downgrades, macro shocks, and US-market read-through, then writes risk signals to `BadNewsMonitor` for strategy risk controls. |
| `limit_up_external_evidence.js` | Defines the `LimitUpExternalEvidence` sheet schema and helper scoring formula for external limit-up evidence. |
| `realtime_gas.js` | Collects realtime Fugle intraday quote snapshots and writes quote-derived features such as bid/ask, midpoint, spread percentage, book imbalance, micro price, trade volume, and last trade metadata. |
| `strategies.js` | Defines baseline intraday backtest strategies, including opening range breakout, VWAP momentum, and dip reversal. |
| `backtest.js` | Runs baseline strategy backtests against `MinuteReplay` data, simulates entries/exits, calculates costs, and writes trades to `BacktestTrades`. |
| `report.js` | Builds summary reports from baseline backtest trades, including win rate, gross/net PnL, returns, profit factor, drawdown, and holding time. |
| `dean_strategy_configs.js` | Defines Dean autostock strategy and risk configuration, including AI rotation, theme stock, limit-up, limit-up swing, fundamental momentum, and TaiwanBull strategy settings. |
| `dean_backtest.js` | Runs Dean autostock strategies using minute replay and feature proxies, creates trades, applies entry/exit/risk rules, and writes output to `DeanBacktestTrades`. |
| `dean_report.js` | Generates Dean strategy backtest summaries into `DeanBacktestReport`. |

## Data Sheets

The code expects these Google Sheets tabs:

| Sheet | Description |
| --- | --- |
| `Config` | Watchlist symbols, enabled flag, display name, and themes. |
| `IntradayQuotes` | Intraday quote snapshots. |
| `RealtimeFeatureSnapshots` | Realtime quote feature snapshots used for strategy scoring. |
| `HistoricalDaily` | Latest daily candle/stat records. |
| `MinuteReplay` | One-minute candle records for replay/backtesting. |
| `BacktestTrades` | Output trades for baseline strategies. |
| `BacktestReport` | Summary report for baseline strategies. |
| `DeanBacktestTrades` | Output trades for Dean autostock strategies. |
| `DeanBacktestReport` | Summary report for Dean autostock strategies. |
| `AIValuations` | Daily AI fair-value and intraday target estimates with news, US-market impact, limit-up plan, confidence, sources, and 7-day trend context for later strategy decisions. |
| `BadNewsMonitor` | Dedicated negative-news monitor output. High-risk rows block new entries, and critical rows can force exits. |
| `LimitUpExternalEvidence` | Dedicated per-symbol per-date external evidence for limit-up setups, including news, institution, branch, chip, external score, and trigger fields. |
| `RunLog` | Runtime logs and API errors. |

## Setup

1. Install clasp if needed:

   ```bash
   npm install -g @google/clasp
   ```

2. Log in to Google Apps Script:

   ```bash
   clasp login
   ```

3. Configure the Fugle API key in Apps Script Script Properties. The code checks these property names:

   ```text
   FUGLE_API_KEY
   FUGLE_APIKEY
   FUGLE_TOKEN
   FUGLE_KEY
   FUGLE
   fugle
   ```

4. Configure the OpenAI API key in Apps Script Script Properties. The code checks these property names:

   ```text
   OPENAI_API_KEY
   OPENAI_APIKEY
   OPENAI_KEY
   OPENAI
   ```

5. Push the Apps Script code:

   ```bash
   clasp push
   ```

6. Open the spreadsheet and run `setupSheets()` or use the custom `Taiwan Stock` menu to initialize sheets.

## Common Apps Script Actions

| Function | Action |
| --- | --- |
| `setupSheets()` | Creates or initializes the required sheets and headers. |
| `syncWatchlist()` | Rewrites the watchlist rows in `Config`. |
| `recordIntradayQuotes()` | Records Fugle intraday quote rows into `IntradayQuotes`. |
| `collectGasRealtimeSnapshots()` | Records realtime quote feature rows into `RealtimeFeatureSnapshots`. |
| `recordMinuteReplayCandles()` | Appends current one-minute candle data into `MinuteReplay`. |
| `recordTodayMinuteReplayCandlesAfterClose()` | Captures the current trading day's minute candles after close. |
| `recalculateAiValuationsAtOpen()` | Uses OpenAI Responses API with web search to recalculate AI valuations for the enabled watchlist. |
| `monitorBadNewsSignals()` | Uses OpenAI Responses API with web search to detect bad-news signals and write `BadNewsMonitor`. |
| `setupLimitUpExternalEvidenceSheet()` | Creates or refreshes the `LimitUpExternalEvidence` header row. |
| `startMinuteReplayBackfill60Days()` | Starts a 60-day minute replay backfill workflow. |
| `continueMinuteReplayBackfill()` | Continues the backfill batch. |
| `runAllStrategyBacktests()` | Runs all baseline backtests. |
| `generateBacktestReport()` | Generates the baseline strategy report. |
| `runDeanAutoStockBacktests()` | Runs all enabled Dean autostock backtests. |
| `generateDeanBacktestReport()` | Generates the Dean strategy report. |

## Trigger Helpers

Use the menu or run these functions manually:

| Function | Trigger |
| --- | --- |
| `installRecommendedProjectTriggers()` | Installs the recommended production trigger set and removes the legacy standalone daily-candle trigger. |
| `auditProjectTriggers()` | Logs the currently installed Apps Script triggers to `RunLog`. |
| `installRecordTriggerEvery1Day()` | Daily stock quote/daily candle recording. |
| `installGasRealtimeSnapshotTrigger()` | Realtime feature collection every minute, with market-hour guard. |
| `installAiValuationTriggerAt9()` | Daily AI valuation recalculation near 09:00 Asia/Taipei, with weekend guard. |
| `installBadNewsMonitorTrigger()` | Bad-news monitor every 15 minutes, with 08:00-14:00 Asia/Taipei weekday guard. |
| `installMinuteReplayTriggerEvery1Minute()` | Minute replay collection every minute, with market-hour guard. |
| `installMinuteReplayTriggerEvery5Minutes()` | Minute replay collection every five minutes. |
| `installAfterCloseMinuteReplayTrigger()` | After-close minute replay capture near 14:30 Asia/Taipei. |
| `installMinuteReplayBackfillTrigger()` | Backfill continuation every five minutes. |
| `removeProjectTriggers()` | Removes project triggers managed by this script. |

## Backtesting Notes

The baseline backtester reads `MinuteReplay` and simulates three intraday strategies:

- Opening range breakout
- VWAP momentum
- Dip reversal

The Dean autostock backtester combines minute replay candles, quote-feature proxies, strategy configuration, and risk settings to simulate:

- AI speculative rotation
- Theme stock
- Limit-up intraday
- Limit-up swing
- Fundamental momentum
- TaiwanBull combined allocation

Backtest outputs are written to Google Sheets and should be treated as generated data, not repository source.

## Repository Hygiene

Do not commit market-data exports or generated files. The `.gitignore` excludes spreadsheet exports, CSV/TSV data, local data folders, logs, and temporary Excel inspection files.
