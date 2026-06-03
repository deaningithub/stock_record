const CONFIG = {
  spreadsheetId: '1c1COm9ppqpAgCzbtGqWQKzCPEdcH_oKsLv-qkqrT4No',
  fugleBaseUrl: 'https://api.fugle.tw/marketdata/v1.0/stock',
  configSheetName: 'Config',
  quoteSheetName: 'IntradayQuotes',
  historySheetName: 'HistoricalDaily',
  minuteReplaySheetName: 'MinuteReplay',
  logSheetName: 'RunLog',
  minuteBackfillDays: 60,
  minuteBackfillBatchDays: 5,
  fugleHistoricalRequestGapMs: 1100,
  fugleRateLimitRetryMs: 61000,
  watchlist: [
    { symbol: '2382', name: '廣達', themes: 'ai_server, hot_rotation' },
    { symbol: '1301', name: '台塑', themes: 'plastics, traditional_industry' },
    { symbol: '1326', name: '台化', themes: 'plastics, traditional_industry' },
    { symbol: '6505', name: '台塑化', themes: 'petrochemical, traditional_industry' },
    { symbol: '2408', name: '南亞科', themes: 'memory, hot_rotation' },
    { symbol: '1513', name: '中興電', themes: 'power, heavy_electric, hot_rotation' },
    { symbol: '3163', name: '波若威', themes: 'optical_cpo, hot_rotation' },
    { symbol: '2344', name: '華邦電', themes: 'memory, hot_rotation' },
    { symbol: '3481', name: '群創', themes: 'panel, hot_rotation' },
    { symbol: '2313', name: '華通', themes: 'pcb_ccl, hot_rotation' },
    { symbol: '3491', name: '昇達科', themes: 'satellite, communications, hot_rotation' },
    { symbol: '5274', name: '信驊', themes: 'asic, semiconductor, hot_rotation' },
    { symbol: '3017', name: '奇鋐', themes: 'cooling, ai_server, hot_rotation' },
    { symbol: '6285', name: '啟碁', themes: 'communications, networking' },
    { symbol: '2368', name: '金像電', themes: 'pcb_ccl, ai_server, hot_rotation' },
    { symbol: '00981A', name: '主動統一台股增長', themes: 'active_etf, hot_rotation' },
    { symbol: '2359', name: '所羅門', themes: 'robotics, automation, hot_rotation' },
    { symbol: '2464', name: '盟立', themes: 'robotics, automation' },
    { symbol: '2383', name: '台光電', themes: 'pcb_ccl, ai_server, hot_rotation' },
    { symbol: '2454', name: '聯發科', themes: 'semiconductor, edge_ai, hot_rotation' },
    { symbol: '3231', name: '緯創', themes: 'ai_server, hot_rotation' },
    { symbol: '1519', name: '華城', themes: 'heavy_electric, power, hot_rotation' },
    { symbol: '2409', name: '友達', themes: 'panel, hot_rotation' },
    { symbol: '2330', name: '台積電', themes: 'semiconductor, ai_chip, hot_rotation' },
    { symbol: '2317', name: '鴻海', themes: 'ai_server, ev, hot_rotation' },
    { symbol: '3711', name: '日月光投控', themes: 'semiconductor, ic_packaging, hot_rotation' },
    { symbol: '1802', name: '台玻', themes: 'glass, traditional_industry' }
  ],
  apiKeyProperties: ['FUGLE_API_KEY', 'FUGLE_APIKEY', 'FUGLE_TOKEN', 'FUGLE_KEY', 'FUGLE', 'fugle']
};

CONFIG.defaultSymbols = CONFIG.watchlist.map(item => item.symbol);

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Taiwan Stock')
    .addItem('Setup sheets', 'setupSheets')
    .addItem('Sync watchlist', 'syncWatchlist')
    .addSeparator()
    .addItem('Record intraday quotes', 'recordIntradayQuotes')
    .addItem('Record minute replay candles', 'recordMinuteReplayCandles')
    .addItem('Record latest daily candles', 'recordLatestDailyCandles')
    .addItem('Recalculate AI valuations', 'recalculateAiValuationsAtOpen')
    .addItem('Recalculate weekly 3-month valuations', 'recalculateWeeklyThreeMonthValuations')
    .addItem('Monitor bad-news signals', 'monitorBadNewsSignals')
    .addItem('Setup limit-up external evidence', 'setupLimitUpExternalEvidenceSheet')
    .addSeparator()
    .addItem('Start 60-day minute backfill', 'startMinuteReplayBackfill60Days')
    .addItem('Continue minute backfill now', 'continueMinuteReplayBackfill')
    .addItem('Stop minute backfill', 'stopMinuteReplayBackfill')
    .addSeparator()
    .addItem('Run all strategy backtests', 'runAllStrategyBacktests')
    .addItem('Run ORB backtest', 'runOpeningRangeBreakoutBacktest')
    .addItem('Run VWAP momentum backtest', 'runVwapMomentumBacktest')
    .addItem('Run dip reversal backtest', 'runDipReversalBacktest')
    .addItem('Generate backtest report', 'generateBacktestReport')
    .addSeparator()
    .addItem('Run Dean autostock backtests', 'runDeanAutoStockBacktests')
    .addItem('Run Dean AI rotation', 'runDeanAiRotationBacktest')
    .addItem('Run Dean theme stock', 'runDeanThemeStockBacktest')
    .addItem('Run Dean limit up', 'runDeanLimitUpBacktest')
    .addItem('Run Dean limit up swing', 'runDeanLimitUpSwingBacktest')
    .addItem('Run Dean fundamental momentum', 'runDeanFundamentalMomentumBacktest')
    .addItem('Run Dean TaiwanBull', 'runDeanTaiwanBullBacktest')
    .addItem('Generate Dean backtest report', 'generateDeanBacktestReport')
    .addSeparator()
    .addItem('Install recommended triggers', 'installRecommendedProjectTriggers')
    .addItem('Audit project triggers', 'auditProjectTriggers')
    .addItem('Install stock trigger: every 1 day', 'installRecordTriggerEvery1Day')
    .addItem('Install GAS realtime snapshot trigger', 'installGasRealtimeSnapshotTrigger')
    .addItem('Install AI valuation trigger: 09:00', 'installAiValuationTriggerAt9')
    .addItem('Install weekly 3-month valuation trigger', 'installWeeklyThreeMonthValuationTrigger')
    .addItem('Install bad-news monitor trigger', 'installBadNewsMonitorTrigger')
    .addItem('Install minute replay trigger: every 1 minute', 'installMinuteReplayTriggerEvery1Minute')
    .addItem('Install minute replay trigger: every 5 minutes', 'installMinuteReplayTriggerEvery5Minutes')
    .addItem('Install after-close minute replay trigger', 'installAfterCloseMinuteReplayTrigger')
    .addItem('Remove project triggers', 'removeProjectTriggers')
    .addToUi();
}

function setupSheets() {
  const spreadsheet = getSpreadsheet_();
  const configSheet = getOrCreateSheet_(spreadsheet, CONFIG.configSheetName);
  const quoteSheet = getOrCreateSheet_(spreadsheet, CONFIG.quoteSheetName);
  const historySheet = getOrCreateSheet_(spreadsheet, CONFIG.historySheetName);
  const minuteReplaySheet = getOrCreateSheet_(spreadsheet, CONFIG.minuteReplaySheetName);
  const logSheet = getOrCreateSheet_(spreadsheet, CONFIG.logSheetName);
  const aiValuationSheet = getOrCreateSheet_(spreadsheet, AI_VALUATION_CONFIG.sheetName);
  const weeklyAiValuationSheet = getOrCreateSheet_(spreadsheet, WEEKLY_AI_VALUATION_CONFIG.sheetName);
  const badNewsSheet = getOrCreateSheet_(spreadsheet, BAD_NEWS_CONFIG.sheetName);
  const limitUpExternalEvidenceSheet = getOrCreateSheet_(spreadsheet, LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.sheetName);

  setHeader_(configSheet, ['symbol', 'enabled', 'name', 'themes', 'note']);
  syncWatchlistRows_(configSheet);

  setHeader_(quoteSheet, [
    'recordedAt',
    'date',
    'symbol',
    'name',
    'market',
    'exchange',
    'openPrice',
    'highPrice',
    'lowPrice',
    'closePrice',
    'lastPrice',
    'change',
    'changePercent',
    'tradeVolume',
    'tradeValue',
    'transaction',
    'isClose',
    'lastUpdated'
  ]);

  setHeader_(historySheet, [
    'symbol',
    'date',
    'open',
    'high',
    'low',
    'close',
    'volume',
    'turnover',
    'change',
    'recordedAt'
  ]);

  setHeader_(minuteReplaySheet, [
    'symbol',
    'date',
    'open',
    'high',
    'low',
    'close',
    'volume',
    'turnover',
    'recordedAt',
    'source'
  ]);

  setHeader_(logSheet, ['time', 'level', 'message']);
  setHeader_(aiValuationSheet, getAiValuationHeaders_());
  setHeader_(weeklyAiValuationSheet, getWeeklyAiValuationHeaders_());
  setHeader_(badNewsSheet, getBadNewsMonitorHeaders_());
  setHeader_(limitUpExternalEvidenceSheet, getLimitUpExternalEvidenceHeaders_());
  spreadsheet.toast('Taiwan stock recorder sheets are ready.', 'Setup complete', 5);
}

function syncWatchlist() {
  setupSheets();
  getSpreadsheet_().toast('Watchlist synced.', 'Taiwan Stock', 5);
}

function recordIntradayQuotes() {
  setupSheets();
  const symbols = getEnabledSymbols_();
  const recordedAt = new Date();
  const rows = [];

  symbols.forEach(symbol => {
    try {
      const quote = fugleGet_(`/intraday/quote/${encodeURIComponent(symbol)}`);
      rows.push([
        recordedAt,
        quote.date || '',
        quote.symbol || symbol,
        quote.name || '',
        quote.market || '',
        quote.exchange || '',
        valueOrBlank_(quote.openPrice),
        valueOrBlank_(quote.highPrice),
        valueOrBlank_(quote.lowPrice),
        valueOrBlank_(quote.closePrice),
        valueOrBlank_(quote.lastPrice),
        valueOrBlank_(quote.change),
        valueOrBlank_(quote.changePercent),
        valueOrBlank_(quote.total && quote.total.tradeVolume),
        valueOrBlank_(quote.total && quote.total.tradeValue),
        valueOrBlank_(quote.total && quote.total.transaction),
        quote.isClose === true,
        microTimestampToDate_(quote.lastUpdated)
      ]);
    } catch (error) {
      log_('ERROR', `Intraday quote failed for ${symbol}: ${error.message}`);
    }
  });

  if (rows.length) {
    appendRows_(CONFIG.quoteSheetName, rows);
  }
  log_('INFO', `Recorded ${rows.length} intraday quote row(s).`);
}

function recordLatestDailyCandles() {
  setupSheets();
  const symbols = getEnabledSymbols_();
  const today = new Date();
  const from = formatDate_(new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000));
  const to = formatDate_(today);
  let written = 0;

  symbols.forEach(symbol => {
    try {
      const latest = fetchLatestDailyCandle_(symbol, from, to);
      if (!latest) {
        log_('WARN', `No daily data returned for ${symbol}.`);
        return;
      }

      upsertHistoricalRow_(symbol, latest);
      written += 1;
    } catch (error) {
      log_('ERROR', `Daily record failed for ${symbol}: ${error.message}`);
    }
  });

  log_('INFO', `Upserted ${written} latest daily candle row(s).`);
}

function recordMinuteReplayCandles() {
  setupSheets();
  if (!isTaiwanMarketCollectionWindow_(new Date())) {
    log_('INFO', 'Skipped minute replay collection outside Taiwan market replay window.');
    return;
  }

  const symbols = getEnabledSymbols_();
  let written = 0;
  symbols.forEach(symbol => {
    try {
      const count = appendNewMinuteReplayCandles_(symbol);
      written += count;
    } catch (error) {
      log_('ERROR', `Minute replay failed for ${symbol}: ${error.message}`);
    }
  });

  log_('INFO', `Recorded ${written} new minute replay row(s).`);
}

function recordTodayMinuteReplayCandlesAfterClose() {
  setupSheets();
  const today = new Date();
  if (isWeekendTaipei_(today)) {
    log_('INFO', 'Skipped after-close minute replay collection on weekend.');
    return;
  }

  const date = formatDate_(today);
  const symbols = getEnabledSymbols_();
  let written = 0;
  symbols.forEach(symbol => {
    try {
      written += appendHistoricalMinuteReplayCandlesForDate_(symbol, date);
    } catch (error) {
      log_('ERROR', `After-close minute replay failed for ${symbol} ${date}: ${error.message}`);
    }
  });

  log_('INFO', `After-close minute replay recorded ${written} row(s) for ${date}.`);
}

function startMinuteReplayBackfill60Days() {
  setupSheets();
  const properties = PropertiesService.getScriptProperties();
  const dates = getBackfillDates_(CONFIG.minuteBackfillDays);
  properties.setProperty('MINUTE_BACKFILL_DATES', JSON.stringify(dates));
  properties.setProperty('MINUTE_BACKFILL_SYMBOL_INDEX', '0');
  properties.setProperty('MINUTE_BACKFILL_DATE_INDEX', '0');
  properties.setProperty('MINUTE_BACKFILL_ACTIVE', 'true');
  installMinuteReplayBackfillTrigger();
  log_('INFO', `Started ${CONFIG.minuteBackfillDays}-day minute replay backfill for ${getEnabledSymbols_().length} symbol(s).`);
  continueMinuteReplayBackfill();
}

function continueMinuteReplayBackfill() {
  setupSheets();
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('MINUTE_BACKFILL_ACTIVE') !== 'true') {
    log_('INFO', 'Minute replay backfill is not active.');
    return;
  }

  const symbols = getEnabledSymbols_();
  const dates = JSON.parse(properties.getProperty('MINUTE_BACKFILL_DATES') || '[]');
  let symbolIndex = Number(properties.getProperty('MINUTE_BACKFILL_SYMBOL_INDEX') || '0');
  let dateIndex = Number(properties.getProperty('MINUTE_BACKFILL_DATE_INDEX') || '0');
  let processed = 0;
  let written = 0;

  while (symbolIndex < symbols.length && processed < CONFIG.minuteBackfillBatchDays) {
    const symbol = symbols[symbolIndex];
    const date = dates[dateIndex];
    if (!date) {
      symbolIndex += 1;
      dateIndex = 0;
      continue;
    }

    try {
      written += appendHistoricalMinuteReplayCandlesForDate_(symbol, date);
    } catch (error) {
      log_('ERROR', `Minute backfill failed for ${symbol} ${date}: ${error.message}`);
    }

    processed += 1;
    dateIndex += 1;
    if (dateIndex >= dates.length) {
      symbolIndex += 1;
      dateIndex = 0;
    }
  }

  properties.setProperty('MINUTE_BACKFILL_SYMBOL_INDEX', String(symbolIndex));
  properties.setProperty('MINUTE_BACKFILL_DATE_INDEX', String(dateIndex));
  log_('INFO', `Minute backfill chunk processed ${processed} symbol-day(s), wrote ${written} row(s). Cursor symbol=${symbolIndex + 1}/${symbols.length}, date=${dateIndex + 1}/${dates.length}.`);

  if (symbolIndex >= symbols.length) {
    stopMinuteReplayBackfill();
    log_('INFO', 'Minute replay backfill completed.');
  }
}

function stopMinuteReplayBackfill() {
  removeTriggersFor_('continueMinuteReplayBackfill');
  const properties = PropertiesService.getScriptProperties();
  properties.deleteProperty('MINUTE_BACKFILL_ACTIVE');
  properties.deleteProperty('MINUTE_BACKFILL_DATES');
  properties.deleteProperty('MINUTE_BACKFILL_SYMBOL_INDEX');
  properties.deleteProperty('MINUTE_BACKFILL_DATE_INDEX');
  log_('INFO', 'Stopped minute replay backfill.');
}

function removeProjectTriggers() {
  ScriptApp.getProjectTriggers().forEach(trigger => ScriptApp.deleteTrigger(trigger));
  log_('INFO', 'Removed all project triggers.');
}

function getEnabledSymbols_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.configSheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return CONFIG.defaultSymbols;
  }

  return values.slice(1)
    .filter(row => String(row[0] || '').trim() && row[1] !== false && String(row[1]).toLowerCase() !== 'false')
    .map(row => normalizeSymbol_(row[0]))
    .filter(Boolean);
}

function syncWatchlistRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  const existing = new Map();

  values.slice(1).forEach((row, index) => {
    const symbol = normalizeSymbol_(row[0]);
    if (symbol) {
      existing.set(symbol, {
        rowNumber: index + 2,
        enabled: row[1],
        name: row[2],
        themes: row[3],
        note: row[4]
      });
    }
  });

  const rowsToAppend = [];
  CONFIG.watchlist.forEach(item => {
    const symbol = normalizeSymbol_(item.symbol);
    const current = existing.get(symbol);
    if (!current) {
      rowsToAppend.push([symbol, true, item.name, item.themes, '']);
      return;
    }

    const enabled = current.enabled === '' ? true : current.enabled;
    const name = current.name || item.name;
    const themes = current.themes || item.themes;
    sheet.getRange(current.rowNumber, 1, 1, 5).setValues([[
      symbol,
      enabled,
      name,
      themes,
      current.note || ''
    ]]);
  });

  if (rowsToAppend.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 5).setValues(rowsToAppend);
  }
}

function fetchLatestDailyCandle_(symbol, from, to) {
  const path = `/historical/candles/${encodeURIComponent(symbol)}`;
  const query = {
    from,
    to,
    timeframe: 'D',
    fields: 'open,high,low,close,volume,turnover,change',
    sort: 'asc',
    adjusted: 'false'
  };

  try {
    const result = fugleGet_(path, query);
    const candles = (result.data || []).filter(candle => candle && candle.date);
    return candles.length ? candles[candles.length - 1] : null;
  } catch (error) {
    if (error.statusCode !== 404) {
      throw error;
    }
    log_('WARN', `Candles endpoint returned 404 for ${symbol}; using historical stats fallback.`);
    return fetchLatestDailyStatsAsCandle_(symbol);
  }
}

function fetchLatestDailyStatsAsCandle_(symbol) {
  const stats = fugleGet_(`/historical/stats/${encodeURIComponent(symbol)}`);
  if (!stats || !stats.date) {
    return null;
  }
  return {
    date: stats.date,
    open: stats.openPrice,
    high: stats.highPrice,
    low: stats.lowPrice,
    close: stats.closePrice,
    volume: stats.tradeVolume,
    turnover: stats.tradeValue,
    change: stats.change
  };
}

function appendNewMinuteReplayCandles_(symbol) {
  const result = fugleGet_(`/intraday/candles/${encodeURIComponent(symbol)}`, {
    timeframe: '1',
    fields: 'open,high,low,close,volume,turnover'
  });
  const candles = (result.data || []).filter(candle => candle && candle.date);
  if (!candles.length) {
    return 0;
  }

  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.minuteReplaySheetName);
  const existingKeys = getExistingMinuteReplayKeys_(sheet, symbol);
  const recordedAt = new Date();
  const rows = candles
    .filter(candle => !existingKeys.has(`${symbol}|${normalizeDateKey_(candle.date)}`))
    .map(candle => [
      symbol,
      candle.date,
      valueOrBlank_(candle.open),
      valueOrBlank_(candle.high),
      valueOrBlank_(candle.low),
      valueOrBlank_(candle.close),
      valueOrBlank_(candle.volume),
      valueOrBlank_(candle.turnover),
      recordedAt,
      'fugle_intraday_candles_1m'
    ]);

  if (rows.length) {
    appendRows_(CONFIG.minuteReplaySheetName, rows);
  }
  return rows.length;
}

function appendHistoricalMinuteReplayCandlesForDate_(symbol, date) {
  const result = fugleGet_(`/historical/candles/${encodeURIComponent(symbol)}`, {
    from: date,
    to: date,
    timeframe: '1',
    fields: 'open,high,low,close,volume,turnover',
    sort: 'asc',
    adjusted: 'false'
  });
  const candles = (result.data || []).filter(candle => candle && candle.date);
  if (!candles.length) {
    return 0;
  }

  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.minuteReplaySheetName);
  const existingKeys = getExistingMinuteReplayKeysForDate_(sheet, symbol, date);
  const recordedAt = new Date();
  const rows = candles
    .filter(candle => !existingKeys.has(`${symbol}|${normalizeDateKey_(candle.date)}`))
    .map(candle => [
      symbol,
      candle.date,
      valueOrBlank_(candle.open),
      valueOrBlank_(candle.high),
      valueOrBlank_(candle.low),
      valueOrBlank_(candle.close),
      valueOrBlank_(candle.volume),
      valueOrBlank_(candle.turnover),
      recordedAt,
      'fugle_historical_candles_1m'
    ]);

  if (rows.length) {
    appendRows_(CONFIG.minuteReplaySheetName, rows);
  }
  return rows.length;
}

function getExistingMinuteReplayKeysForDate_(sheet, symbol, date) {
  const lastRow = sheet.getLastRow();
  const keys = new Set();
  if (lastRow < 2) {
    return keys;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  values.forEach(row => {
    const rowSymbol = normalizeSymbol_(row[0]);
    const rowDate = normalizeDateKey_(row[1]);
    if (rowSymbol === symbol && rowDate.indexOf(date) === 0) {
      keys.add(`${rowSymbol}|${rowDate}`);
    }
  });
  return keys;
}

function getExistingMinuteReplayKeys_(sheet, symbol) {
  const lastRow = sheet.getLastRow();
  const keys = new Set();
  if (lastRow < 2) {
    return keys;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  values.forEach(row => {
    const rowSymbol = normalizeSymbol_(row[0]);
    if (rowSymbol === symbol) {
      keys.add(`${rowSymbol}|${normalizeDateKey_(row[1])}`);
    }
  });
  return keys;
}

function isTaiwanMarketCollectionWindow_(date) {
  if (isWeekendTaipei_(date)) {
    return false;
  }

  const hhmm = Number(Utilities.formatDate(date, 'Asia/Taipei', 'HHmm'));
  return hhmm >= 900 && hhmm <= 1345;
}

function isWeekendTaipei_(date) {
  const day = Number(Utilities.formatDate(date, 'Asia/Taipei', 'u'));
  return day > 5;
}

function getBackfillDates_(days) {
  const dates = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
    const day = Number(Utilities.formatDate(date, 'Asia/Taipei', 'u'));
    if (day <= 5) {
      dates.push(formatDate_(date));
    }
  }
  return dates;
}

function fugleGet_(path, query) {
  const apiKey = getFugleApiKey_();
  const url = CONFIG.fugleBaseUrl + path + buildQuery_(query || {});
  rateLimitFugleRequest_(path);
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'X-API-KEY': apiKey,
      Accept: 'application/json'
    }
  });
  const status = response.getResponseCode();
  const text = response.getContentText();

  if (status === 429) {
    log_('WARN', `Fugle rate limit hit at ${path}; retrying once after ${CONFIG.fugleRateLimitRetryMs / 1000} seconds.`);
    Utilities.sleep(CONFIG.fugleRateLimitRetryMs);
    rateLimitFugleRequest_(path);
    return fugleGetWithoutRetry_(url, apiKey, path);
  }

  if (status < 200 || status >= 300) {
    const error = new Error(`Fugle request failed (${status}) at ${path}: ${text}`);
    error.statusCode = status;
    error.responseText = text;
    throw error;
  }
  return JSON.parse(text);
}

function fugleGetWithoutRetry_(url, apiKey, path) {
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'X-API-KEY': apiKey,
      Accept: 'application/json'
    }
  });
  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) {
    const error = new Error(`Fugle request failed (${status}) at ${path}: ${text}`);
    error.statusCode = status;
    error.responseText = text;
    throw error;
  }
  return JSON.parse(text);
}

function rateLimitFugleRequest_(path) {
  if (path.indexOf('/historical/') !== 0) {
    return;
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const now = Date.now();
    const last = Number(properties.getProperty('FUGLE_LAST_HISTORICAL_REQUEST_MS') || '0');
    const waitMs = CONFIG.fugleHistoricalRequestGapMs - (now - last);
    if (waitMs > 0) {
      Utilities.sleep(waitMs);
    }
    properties.setProperty('FUGLE_LAST_HISTORICAL_REQUEST_MS', String(Date.now()));
  } finally {
    lock.releaseLock();
  }
}

function getFugleApiKey_() {
  const properties = PropertiesService.getScriptProperties();
  for (const name of CONFIG.apiKeyProperties) {
    const value = properties.getProperty(name);
    if (value) {
      return value;
    }
  }
  throw new Error(`Missing Fugle API key. Set one script property: ${CONFIG.apiKeyProperties.join(', ')}`);
}

function upsertHistoricalRow_(symbol, candle) {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.historySheetName);
  const values = sheet.getDataRange().getValues();
  const key = `${symbol}|${normalizeDateKey_(candle.date)}`;
  const row = [
    symbol,
    candle.date,
    valueOrBlank_(candle.open),
    valueOrBlank_(candle.high),
    valueOrBlank_(candle.low),
    valueOrBlank_(candle.close),
    valueOrBlank_(candle.volume),
    valueOrBlank_(candle.turnover),
    valueOrBlank_(candle.change),
    new Date()
  ];

  for (let i = 1; i < values.length; i += 1) {
    if (`${values[i][0]}|${normalizeDateKey_(values[i][1])}` === key) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  appendRows_(CONFIG.historySheetName, [row]);
}

function appendRows_(sheetName, rows) {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), sheetName);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function setHeader_(sheet, headers) {
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.spreadsheetId);
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function log_(level, message) {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.logSheetName);
  if (sheet.getLastRow() === 0) {
    setHeader_(sheet, ['time', 'level', 'message']);
  }
  sheet.appendRow([new Date(), level, message]);
}

function removeTriggersFor_(handlerName) {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === handlerName)
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

function buildQuery_(query) {
  const parts = Object.keys(query)
    .filter(key => query[key] !== undefined && query[key] !== null && query[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

function normalizeSymbol_(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/^TWSE[:\-]/, '')
    .replace(/^TPEX[:\-]/, '')
    .replace(/^OTC[:\-]/, '')
    .replace(/\.(TW|TWO|TSE|OTC)$/, '')
    .replace(/[^0-9A-Z]/g, '');
}

function valueOrBlank_(value) {
  return value === undefined || value === null ? '' : value;
}

function formatDate_(date) {
  return Utilities.formatDate(date, 'Asia/Taipei', 'yyyy-MM-dd');
}

function normalizeDateKey_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return formatDate_(value);
  }
  return String(value || '').trim();
}

function microTimestampToDate_(value) {
  if (!value) {
    return '';
  }
  return new Date(Math.floor(Number(value) / 1000));
}
