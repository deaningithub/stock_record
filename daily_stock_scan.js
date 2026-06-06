const DAILY_STOCK_SCAN_CONFIG = {
  handlerName: 'runDailyStockScan',
  timezone: 'Asia/Taipei',
  maxSymbols: 100,
  topPickCount: 20,
  minTradableScore: 55
};

function runDailyStockScan() {
  setupDailyStockScanSheet_();
  if (isWeekendTaipei_(new Date())) {
    log_('INFO', 'Skipped daily stock scan on weekend.');
    return;
  }

  const symbols = getEnabledSymbols_().slice(0, DAILY_STOCK_SCAN_CONFIG.maxSymbols);
  if (!symbols.length) {
    log_('WARN', 'Skipped daily stock scan because no enabled symbols were found.');
    return;
  }

  const inputs = buildDailyStockScanInputs_(symbols);
  const rows = inputs.symbols
    .map((item, index) => buildDailyStockScanRow_(item, inputs, index))
    .sort((left, right) => Number(right[7] || 0) - Number(left[7] || 0));

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
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.stockScanSheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = getDailyStockScanHeaders_().length;
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
  }
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, lastColumn).setValues(rows);
  }
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
