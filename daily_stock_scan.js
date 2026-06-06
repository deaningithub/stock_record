const DAILY_STOCK_SCAN_CONFIG = {
  handlerName: 'runDailyStockScan',
  allUniverseHandlerName: 'refreshAllStockUniverseWeekly',
  pool500HandlerName: 'refreshStockScanPool500Daily',
  timezone: 'Asia/Taipei',
  pool500Size: 500,
  maxSymbols: 100,
  topPickCount: 20,
  minTradableScore: 55,
  universeSources: [
    { exchange: 'TWSE', market: 'TSE' },
    { exchange: 'TPEx', market: 'OTC' }
  ]
};

function refreshAllStockUniverseWeekly() {
  setupAllStockUniverseSheet_();
  const fetchedAt = new Date();
  const bySymbol = {};

  DAILY_STOCK_SCAN_CONFIG.universeSources.forEach(source => {
    const result = fugleGet_('/intraday/tickers', {
      type: 'EQUITY',
      exchange: source.exchange,
      isNormal: 'true'
    });
    (result.data || []).forEach(item => {
      const symbol = normalizeSymbol_(item.symbol);
      if (!symbol) {
        return;
      }
      bySymbol[symbol] = {
        symbol,
        name: item.name || '',
        exchange: source.exchange,
        market: source.market,
        sourceDate: result.date || '',
        fetchedAt
      };
    });
  });

  CONFIG.watchlist.forEach(item => {
    const symbol = normalizeSymbol_(item.symbol);
    if (!symbol || bySymbol[symbol]) {
      return;
    }
    bySymbol[symbol] = {
      symbol,
      name: item.name || '',
      exchange: 'MANUAL',
      market: 'CONFIG_SEED',
      sourceDate: '',
      fetchedAt
    };
  });

  const rows = Object.keys(bySymbol)
    .sort()
    .map(symbol => {
      const item = bySymbol[symbol];
      return [
        item.fetchedAt,
        item.sourceDate,
        item.symbol,
        item.name,
        item.exchange,
        item.market,
        isCoreWatchlistSymbol_(symbol),
        'fugle_intraday_tickers'
      ];
    });

  replaceSheetRows_(CONFIG.allStockUniverseSheetName, getAllStockUniverseHeaders_(), rows);
  log_('INFO', `All-stock universe refreshed with ${rows.length} symbol(s) from Fugle tickers plus manual seeds.`);
  return rows.length;
}

function refreshStockScanPool500Daily() {
  setupStockScanPool500Sheet_();
  let universe = readAllStockUniverse_();
  if (!universe.length) {
    refreshAllStockUniverseWeekly();
    universe = readAllStockUniverse_();
  }
  if (!universe.length) {
    universe = CONFIG.watchlist.map(item => ({
      symbol: normalizeSymbol_(item.symbol),
      name: item.name,
      exchange: 'MANUAL',
      market: 'CONFIG_SEED',
      isCoreWatchlist: true
    }));
  }

  const inputs = buildPoolEvidenceInputs_();
  const scanAt = new Date();
  const rows = universe
    .map(item => buildStockScanPool500Row_(item, inputs, scanAt))
    .sort((left, right) => Number(right[5] || 0) - Number(left[5] || 0))
    .slice(0, DAILY_STOCK_SCAN_CONFIG.pool500Size);

  rows.forEach((row, index) => {
    row[2] = index + 1;
  });

  replaceSheetRows_(CONFIG.stockScanPool500SheetName, getStockScanPool500Headers_(), rows);
  log_('INFO', `500-stock scan pool refreshed with ${rows.length} symbol(s).`);
  return rows.length;
}

function runDailyStockScan() {
  setupDailyStockScanSheet_();
  if (isWeekendTaipei_(new Date())) {
    log_('INFO', 'Skipped daily stock scan on weekend.');
    return;
  }

  let poolSymbols = getStockScanPool500Symbols_();
  if (!poolSymbols.length) {
    refreshStockScanPool500Daily();
    poolSymbols = getStockScanPool500Symbols_();
  }
  if (!poolSymbols.length) {
    poolSymbols = getEnabledSymbols_();
  }
  const symbols = poolSymbols.slice(0, DAILY_STOCK_SCAN_CONFIG.pool500Size);
  if (!symbols.length) {
    log_('WARN', 'Skipped daily stock scan because no enabled symbols were found.');
    return;
  }

  const inputs = buildDailyStockScanInputs_(symbols);
  const rows = inputs.symbols
    .map((item, index) => buildDailyStockScanRow_(item, inputs, index))
    .sort((left, right) => Number(right[7] || 0) - Number(left[7] || 0))
    .slice(0, DAILY_STOCK_SCAN_CONFIG.maxSymbols);

  rows.forEach((row, index) => {
    row[2] = index + 1;
    row[3] = index < DAILY_STOCK_SCAN_CONFIG.topPickCount;
  });

  replaceDailyStockScanRows_(rows);
  log_('INFO', `Daily stock scan ranked ${rows.length} symbol(s); top ${DAILY_STOCK_SCAN_CONFIG.topPickCount} marked as pick candidates.`);
}

function setupDailyStockScanSheet_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.stockScanSheetName);
  setHeader_(sheet, getDailyStockScanHeaders_());
}

function setupAllStockUniverseSheet_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.allStockUniverseSheetName);
  setHeader_(sheet, getAllStockUniverseHeaders_());
}

function setupStockScanPool500Sheet_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.stockScanPool500SheetName);
  setHeader_(sheet, getStockScanPool500Headers_());
}

function getAllStockUniverseHeaders_() {
  return [
    'fetchedAt',
    'sourceDate',
    'symbol',
    'name',
    'exchange',
    'market',
    'isCoreWatchlist',
    'source'
  ];
}

function getStockScanPool500Headers_() {
  return [
    'scanAt',
    'sourceDate',
    'rank',
    'symbol',
    'name',
    'score',
    'isCoreWatchlist',
    'exchange',
    'market',
    'themes',
    'externalScore',
    'externalTrigger',
    'badNewsRiskScore',
    'badNewsSeverity',
    'aiRating',
    'aiUpsidePct',
    'changePct',
    'distanceToLimitPct',
    'reasons',
    'source'
  ];
}

function getDailyStockScanHeaders_() {
  return [
    'scanAt',
    'tradeDate',
    'rank',
    'isTopPick',
    'symbol',
    'name',
    'themes',
    'score',
    'action',
    'rating',
    'lastPrice',
    'changePct',
    'distanceToLimitPct',
    'priceChange1m',
    'priceChange3m',
    'priceChange5m',
    'volumeChange5m',
    'bookImbalance',
    'bookImbalanceDelta',
    'bidSizeDelta',
    'askSizeDelta',
    'microPricePremiumPct',
    'upsidePct',
    'aiConfidence',
    'externalScore',
    'externalTrigger',
    'badNewsRiskScore',
    'badNewsSeverity',
    'shouldBlockEntry',
    'reasons',
    'latestNews',
    'model'
  ];
}

function buildPoolEvidenceInputs_() {
  return {
    configRows: getConfigRowsBySymbol_(),
    latestQuote: getLatestSheetRowsBySymbol_(CONFIG.quoteSheetName, 'symbol', 'recordedAt'),
    latestRealtime: getLatestSheetRowsBySymbol_(GAS_REALTIME_CONFIG.sheetName, 'symbol', 'recordedAt'),
    latestAiValuation: getLatestSheetRowsBySymbol_(AI_VALUATION_CONFIG.sheetName, 'symbol', 'generatedAt'),
    latestBadNews: getLatestSheetRowsBySymbol_(BAD_NEWS_CONFIG.sheetName, 'symbol', 'generatedAt'),
    latestExternalEvidence: getLatestSheetRowsBySymbol_(LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.sheetName, 'symbol', 'checked_at')
  };
}

function buildStockScanPool500Row_(universeItem, inputs, scanAt) {
  const symbol = normalizeSymbol_(universeItem.symbol);
  const config = inputs.configRows[symbol] || {};
  const item = {
    symbol,
    config,
    quote: inputs.latestQuote[symbol] || {},
    realtime: inputs.latestRealtime[symbol] || {},
    valuation: inputs.latestAiValuation[symbol] || {},
    badNews: inputs.latestBadNews[symbol] || {},
    external: inputs.latestExternalEvidence[symbol] || {}
  };
  const scoreResult = scoreStockPoolCandidate_(item, universeItem);

  return [
    scanAt,
    universeItem.sourceDate || '',
    0,
    symbol,
    config.name || universeItem.name || item.valuation.name || '',
    scoreResult.score,
    isCoreWatchlistSymbol_(symbol),
    universeItem.exchange || '',
    universeItem.market || '',
    config.themes || '',
    valueOrBlank_(item.external.external_score),
    item.external.trigger === true || String(item.external.trigger).toLowerCase() === 'true',
    valueOrBlank_(item.badNews.riskScore),
    item.badNews.severity || '',
    item.valuation.rating || '',
    valueOrBlank_(item.valuation.upsidePct),
    firstNumber_(item.realtime.changePct, item.quote.changePercent),
    valueOrBlank_(item.realtime.distanceToLimitPct),
    scoreResult.reasons.join('; '),
    'local_pool500_v1'
  ];
}

function scoreStockPoolCandidate_(item, universeItem) {
  let score = 20;
  const reasons = [];

  if (isCoreWatchlistSymbol_(item.symbol)) {
    score += 35;
    reasons.push('current 100 seed');
  }

  const themeText = String(item.config.themes || '').toLowerCase();
  if (/(ai_server|semiconductor|pcb|memory|robotics|power|heavy_electric|cooling|asic|hot_rotation)/.test(themeText)) {
    score += 15;
    reasons.push('preferred strategy theme');
  }

  const externalScore = Number(item.external.external_score);
  if (!isNaN(externalScore)) {
    score += Math.round(externalScore * 30);
    reasons.push('external evidence score');
  }
  if (item.external.trigger === true || String(item.external.trigger).toLowerCase() === 'true') {
    score += 20;
    reasons.push('external trigger');
  }

  const upsidePct = Number(item.valuation.upsidePct);
  if (!isNaN(upsidePct)) {
    score += Math.max(-15, Math.min(20, Math.round(upsidePct)));
    reasons.push('AI valuation exists');
  }

  const rating = String(item.valuation.rating || '').toLowerCase();
  if (rating === 'strong_buy') {
    score += 15;
    reasons.push('AI strong buy');
  } else if (rating === 'buy') {
    score += 10;
  } else if (rating === 'avoid' || rating === 'sell') {
    score -= 20;
    reasons.push('AI avoid/sell');
  }

  score = addScore_(score, reasons, Number(item.realtime.changePct), 0, 5, 10, 'positive intraday change');
  score = addScore_(score, reasons, Number(item.realtime.priceChange5m), 0, 3, 8, '5m momentum');
  score = addScore_(score, reasons, Number(item.realtime.bookImbalance), 0.55, 0.8, 8, 'bid-side imbalance');

  const badNewsRisk = Number(item.badNews.riskScore || 0);
  if (badNewsRisk >= BAD_NEWS_CONFIG.forceExitRiskScore) {
    score -= 60;
    reasons.push('critical bad news');
  } else if (badNewsRisk >= BAD_NEWS_CONFIG.blockEntryRiskScore) {
    score -= 40;
    reasons.push('bad news blocks entry');
  } else if (badNewsRisk >= 50) {
    score -= 15;
    reasons.push('watch bad news');
  }

  if (universeItem.market === 'TSE') {
    score += 2;
  }

  return {
    score: clamp_(Math.round(score), 0, 100),
    reasons: reasons.slice(0, 8)
  };
}

function buildDailyStockScanInputs_(symbols) {
  const configRows = getConfigRowsBySymbol_();
  const latestDaily = getLatestSheetRowsBySymbol_(CONFIG.historySheetName, 'symbol', 'date');
  const latestQuote = getLatestSheetRowsBySymbol_(CONFIG.quoteSheetName, 'symbol', 'recordedAt');
  const latestRealtime = getLatestSheetRowsBySymbol_(GAS_REALTIME_CONFIG.sheetName, 'symbol', 'recordedAt');
  const latestAiValuation = getLatestSheetRowsBySymbol_(AI_VALUATION_CONFIG.sheetName, 'symbol', 'generatedAt');
  const latestBadNews = getLatestSheetRowsBySymbol_(BAD_NEWS_CONFIG.sheetName, 'symbol', 'generatedAt');
  const latestExternalEvidence = getLatestSheetRowsBySymbol_(LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.sheetName, 'symbol', 'checked_at');
  const scanAt = new Date();

  return {
    scanAt,
    tradeDate: formatDate_(scanAt),
    symbols: symbols.map(symbol => ({
      symbol,
      config: configRows[symbol] || {},
      daily: latestDaily[symbol] || {},
      quote: latestQuote[symbol] || {},
      realtime: latestRealtime[symbol] || {},
      valuation: latestAiValuation[symbol] || {},
      badNews: latestBadNews[symbol] || {},
      external: latestExternalEvidence[symbol] || {}
    }))
  };
}

function buildDailyStockScanRow_(item, inputs, index) {
  const scoreResult = scoreDailyStockCandidate_(item);
  const action = decideDailyStockScanAction_(scoreResult.score, item);
  const latestNews = item.external.news_summary || item.valuation.newsSummary || item.badNews.headlineSummary || '';

  return [
    inputs.scanAt,
    inputs.tradeDate,
    index + 1,
    false,
    item.symbol,
    item.config.name || item.valuation.name || '',
    item.config.themes || '',
    scoreResult.score,
    action,
    item.valuation.rating || '',
    firstNumber_(item.realtime.lastPrice, item.quote.lastPrice, item.daily.close),
    firstNumber_(item.realtime.changePct, item.quote.changePercent),
    valueOrBlank_(item.realtime.distanceToLimitPct),
    valueOrBlank_(item.realtime.priceChange1m),
    valueOrBlank_(item.realtime.priceChange3m),
    valueOrBlank_(item.realtime.priceChange5m),
    valueOrBlank_(item.realtime.volumeChange5m),
    valueOrBlank_(item.realtime.bookImbalance),
    valueOrBlank_(item.realtime.bookImbalanceDelta),
    valueOrBlank_(item.realtime.bidSizeDelta),
    valueOrBlank_(item.realtime.askSizeDelta),
    valueOrBlank_(item.realtime.microPricePremiumPct),
    valueOrBlank_(item.valuation.upsidePct),
    valueOrBlank_(item.valuation.confidence),
    valueOrBlank_(item.external.external_score),
    item.external.trigger === true || String(item.external.trigger).toLowerCase() === 'true',
    valueOrBlank_(item.badNews.riskScore),
    item.badNews.severity || '',
    item.badNews.shouldBlockEntry === true || String(item.badNews.shouldBlockEntry).toLowerCase() === 'true',
    scoreResult.reasons.join('; '),
    latestNews,
    'local_daily_scan_v1'
  ];
}

function scoreDailyStockCandidate_(item) {
  const realtime = item.realtime;
  const valuation = item.valuation;
  const badNews = item.badNews;
  const external = item.external;
  let score = 50;
  const reasons = [];

  score = addScore_(score, reasons, Number(realtime.changePct), 0, 4, 10, 'positive intraday change');
  score = addScore_(score, reasons, Number(realtime.priceChange5m), 0, 2.5, 8, '5m price acceleration');
  score = addScore_(score, reasons, Number(realtime.priceChange3m), 0, 1.8, 5, '3m momentum');
  score = addScore_(score, reasons, Number(realtime.volumeChange5m), 0, 1000, 5, '5m volume expansion');
  score = addScore_(score, reasons, Number(realtime.bookImbalance), 0.55, 0.8, 8, 'bid-side book imbalance');
  score = addScore_(score, reasons, Number(realtime.bookImbalanceDelta), 0, 0.15, 5, 'book imbalance improving');
  score = addScore_(score, reasons, Number(realtime.bidSizeDelta), 0, 100, 4, 'bid depth building');
  score = addScore_(score, reasons, Number(realtime.microPricePremiumPct), 0, 0.08, 4, 'micro price premium');

  const distanceToLimit = Number(realtime.distanceToLimitPct);
  if (!isNaN(distanceToLimit) && distanceToLimit >= 0 && distanceToLimit <= 4) {
    score += 10;
    reasons.push('near limit-up');
  } else if (!isNaN(distanceToLimit) && distanceToLimit > 8) {
    score -= 4;
  }

  const upsidePct = Number(valuation.upsidePct);
  if (!isNaN(upsidePct)) {
    if (upsidePct >= 8) {
      score += 8;
      reasons.push('AI upside support');
    } else if (upsidePct < -3) {
      score -= 8;
      reasons.push('AI downside risk');
    }
  }

  const confidence = Number(valuation.confidence);
  if (!isNaN(confidence) && confidence >= 0.65) {
    score += 4;
    reasons.push('AI confidence');
  }

  const rating = String(valuation.rating || '').toLowerCase();
  if (rating === 'strong_buy') {
    score += 8;
    reasons.push('AI strong buy');
  } else if (rating === 'buy') {
    score += 5;
  } else if (rating === 'avoid' || rating === 'sell') {
    score -= 12;
    reasons.push('AI avoid/sell');
  }

  const externalScore = Number(external.external_score);
  if (!isNaN(externalScore)) {
    score += Math.round(externalScore * 12);
    if (externalScore >= 0.7) {
      reasons.push('external evidence trigger zone');
    }
  }
  if (external.trigger === true || String(external.trigger).toLowerCase() === 'true') {
    score += 10;
    reasons.push('external trigger');
  }

  const badNewsRisk = Number(badNews.riskScore || 0);
  if (badNewsRisk >= BAD_NEWS_CONFIG.forceExitRiskScore) {
    score -= 45;
    reasons.push('critical bad news');
  } else if (badNewsRisk >= BAD_NEWS_CONFIG.blockEntryRiskScore) {
    score -= 30;
    reasons.push('bad news blocks entry');
  } else if (badNewsRisk >= 50) {
    score -= 12;
    reasons.push('watch bad news');
  }

  if (badNews.shouldBlockEntry === true || String(badNews.shouldBlockEntry).toLowerCase() === 'true') {
    score -= 20;
    reasons.push('entry blocked');
  }

  return {
    score: clamp_(Math.round(score), 0, 100),
    reasons: reasons.slice(0, 8)
  };
}

function addScore_(score, reasons, value, start, full, points, reason) {
  if (isNaN(value) || value <= start) {
    return score;
  }
  const ratio = full === start ? 1 : Math.min((value - start) / (full - start), 1);
  const delta = Math.round(points * ratio);
  if (delta > 0) {
    reasons.push(reason);
  }
  return score + delta;
}

function decideDailyStockScanAction_(score, item) {
  const badNews = item.badNews;
  if (badNews.shouldForceExit === true || String(badNews.shouldForceExit).toLowerCase() === 'true') {
    return 'avoid_force_exit_risk';
  }
  if (badNews.shouldBlockEntry === true || String(badNews.shouldBlockEntry).toLowerCase() === 'true') {
    return 'avoid_blocked_by_bad_news';
  }
  if (score >= 75) {
    return 'priority_watch';
  }
  if (score >= DAILY_STOCK_SCAN_CONFIG.minTradableScore) {
    return 'watch';
  }
  return 'low_priority';
}

function replaceDailyStockScanRows_(rows) {
  replaceSheetRows_(CONFIG.stockScanSheetName, getDailyStockScanHeaders_(), rows);
}

function replaceSheetRows_(sheetName, headers, rows) {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = headers.length;
  setHeader_(sheet, headers);
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
  }
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, lastColumn).setValues(rows);
  }
}

function readAllStockUniverse_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.allStockUniverseSheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }
  const headers = values[0].map(header => String(header));
  const index = {};
  headers.forEach((header, column) => {
    index[header] = column;
  });
  return values.slice(1)
    .map(row => ({
      symbol: normalizeSymbol_(row[index.symbol]),
      name: row[index.name] || '',
      exchange: row[index.exchange] || '',
      market: row[index.market] || '',
      sourceDate: row[index.sourceDate] || '',
      isCoreWatchlist: row[index.isCoreWatchlist] === true || String(row[index.isCoreWatchlist]).toLowerCase() === 'true'
    }))
    .filter(item => item.symbol);
}

function getStockScanPool500Symbols_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.stockScanPool500SheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }
  const headers = values[0].map(header => String(header));
  const symbolIndex = headers.indexOf('symbol');
  const rankIndex = headers.indexOf('rank');
  if (symbolIndex === -1) {
    return [];
  }
  return values.slice(1)
    .filter(row => normalizeSymbol_(row[symbolIndex]))
    .sort((left, right) => Number(left[rankIndex] || 999999) - Number(right[rankIndex] || 999999))
    .map(row => normalizeSymbol_(row[symbolIndex]));
}

function isCoreWatchlistSymbol_(symbol) {
  const normalized = normalizeSymbol_(symbol);
  return CONFIG.defaultSymbols.indexOf(normalized) !== -1;
}

function firstNumber_() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (value !== '' && value !== undefined && value !== null && !isNaN(Number(value))) {
      return Number(value);
    }
  }
  return '';
}

function clamp_(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
