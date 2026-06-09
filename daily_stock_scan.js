const DAILY_STOCK_SCAN_CONFIG = {
  handlerName: 'runDailyStockScan',
  allUniverseHandlerName: 'refreshAllStockUniverseWeekly',
  pool500HandlerName: 'refreshStockScanPool500Daily',
  timezone: 'Asia/Taipei',
  pool500Size: 500,
  maxSymbols: 100,
  topPickCount: 20,
  minTradableScore: 55,
  preferredThemePattern: /(ai_server|ai_chip|ai_datacenter|ai_infrastructure|compute_infrastructure|semiconductor|pcb|memory|hbm|robotics|power|heavy_electric|cooling|asic|server|cloud_server|cloud_service|cloud_infrastructure|ai_cloud|cloud_networking|edge_ai|ai_pc|leo_satellite|satellite|quantum|drone|uav|lunar_space|space_ai)/,
  targetThemeMaxScore: 38,
  targetThemeRules: [
    { pattern: /(ai_server|ai_chip|ai_datacenter|ai_infrastructure|compute_infrastructure|semiconductor|advanced_packaging|pcb|pcb_ccl|pcb_ic_substrate|high_frequency_pcb|memory|hbm|asic|server|cloud_server|cloud_service|cloud_infrastructure|ai_cloud|cloud_networking|datacenter|cooling|thermal|power|heavy_electric|optical_communication|cpo|silicon_photonics|networking)/, points: 20, reason: 'AI infrastructure theme' },
    { pattern: /(leo_satellite|satellite|satellite_terminal|satellite_ground_equipment|rf|antenna|aerospace|space_ai|high_frequency_pcb|communications)/, points: 16, reason: 'LEO/space communications theme' },
    { pattern: /(quantum|quantum_compute|quantum_comm|quantum_photonics|photonics|silicon_photonics|optical_communication|cybersecurity|precision_equipment)/, points: 12, reason: 'quantum/photonics theme' },
    { pattern: /(robotics|automation|motion_control|gear_reducer|ev|drone|uav|autonomous|motor|industrial_pc|rugged_computing|defense)/, points: 14, reason: 'robot/EV/drone theme' },
    { pattern: /(lunar_space|moonshot|space_power|perovskite|solar|aerospace|space_ai|optical_sensor|robotics|uav)/, points: 8, reason: 'lunar/space optionality' }
  ],
  nonTargetThemePattern: /(financial|consumer|defensive|shipping|airline|tourism|cement|steel|plastics|petrochemical|traditional_industry|brokerage)/,
  nonTargetThemePenalty: 10,
  snapshotMarkets: ['TSE', 'OTC'],
  minUsefulTradeValue: 10000000,
  fullLiquidityTradeValue: 1000000000,
  freshExternalEvidenceHours: 12,
  freshAiValuationHours: 48,
  freshBadNewsHours: 36,
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
  if (isWeekendTaipei_(new Date())) {
    log_('INFO', 'Skipped 500-stock scan pool refresh on weekend.');
    return 0;
  }

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
  return runDailyStockScan_(false);
}

function runDailyStockScanManual() {
  return runDailyStockScan_(true);
}

function runDailyStockScan_(forceRun) {
  setupDailyStockScanSheet_();
  if (!forceRun && isWeekendTaipei_(new Date())) {
    log_('INFO', 'Skipped daily stock scan on weekend.');
    return 0;
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
    return 0;
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
  log_('INFO', `Daily stock scan ranked ${rows.length} symbol(s); top ${DAILY_STOCK_SCAN_CONFIG.topPickCount} marked as pick candidates.${forceRun ? ' Manual force run bypassed weekend guard.' : ''}`);
  return rows.length;
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
    'snapshotChangePct',
    'snapshotTradeValue',
    'snapshotMoverRank',
    'snapshotActiveValueRank',
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
    'setupType',
    'riskFlag',
    'poolScore',
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
    latestQuote: getLatestSheetRowsBySymbol_(CONFIG.quoteSheetName, 'symbol', 'recordedAt', 10000),
    latestRealtime: getLatestSheetRowsBySymbol_(GAS_REALTIME_CONFIG.sheetName, 'symbol', 'recordedAt', GAS_REALTIME_CONFIG.historyLookbackRows),
    latestAiValuation: getLatestSheetRowsBySymbol_(AI_VALUATION_CONFIG.sheetName, 'symbol', 'generatedAt'),
    latestBadNews: getLatestSheetRowsBySymbol_(BAD_NEWS_CONFIG.sheetName, 'symbol', 'generatedAt'),
    latestExternalEvidence: getLatestSheetRowsBySymbol_(LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.sheetName, 'symbol', 'checked_at'),
    snapshotEvidence: fetchFugleSnapshotEvidence_()
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
    external: inputs.latestExternalEvidence[symbol] || {},
    snapshot: inputs.snapshotEvidence[symbol] || {}
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
    valueOrBlank_(item.snapshot.changePercent),
    valueOrBlank_(item.snapshot.tradeValue),
    valueOrBlank_(item.snapshot.moverRank),
    valueOrBlank_(item.snapshot.activeValueRank),
    valueOrBlank_(item.realtime.distanceToLimitPct),
    scoreResult.reasons.join('; '),
    'local_pool500_v1'
  ];
}

function scoreStockPoolCandidate_(item, universeItem) {
  let score = 5;
  const reasons = [];

  if (isCoreWatchlistSymbol_(item.symbol)) {
    score += 24;
    reasons.push('priority seed');
  }

  const themeResult = scoreTargetThemes_(item.config.themes);
  score += themeResult.score;
  if (themeResult.reasons.length) {
    reasons.push.apply(reasons, themeResult.reasons);
  }

  const externalScore = Number(item.external.external_score);
  if (!isNaN(externalScore) && isEvidenceFresh_(item.external.checked_at || item.external.news_checked_at, DAILY_STOCK_SCAN_CONFIG.freshExternalEvidenceHours)) {
    score += Math.round(externalScore * 28);
    reasons.push('external evidence score');
  } else if (!isNaN(externalScore)) {
    score += Math.round(externalScore * 10);
    reasons.push('stale external evidence');
  }
  if (item.external.trigger === true || String(item.external.trigger).toLowerCase() === 'true') {
    score += 18;
    reasons.push('external trigger');
  }

  score = addScore_(score, reasons, Number(item.snapshot.changePercent), 0, 8, 20, 'snapshot mover');
  score = addScore_(score, reasons, Number(item.snapshot.tradeValue), DAILY_STOCK_SCAN_CONFIG.minUsefulTradeValue, DAILY_STOCK_SCAN_CONFIG.fullLiquidityTradeValue, 16, 'liquid active');
  score = addRankScore_(score, reasons, Number(item.snapshot.moverRank), 120, 14, 'mover rank');
  score = addRankScore_(score, reasons, Number(item.snapshot.activeValueRank), 160, 12, 'active value rank');

  const upsidePct = Number(item.valuation.upsidePct);
  if (!isNaN(upsidePct) && isEvidenceFresh_(item.valuation.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshAiValuationHours)) {
    score += Math.max(-15, Math.min(20, Math.round(upsidePct)));
    reasons.push('fresh AI valuation');
  } else if (!isNaN(upsidePct)) {
    score += Math.max(-6, Math.min(8, Math.round(upsidePct / 2)));
    reasons.push('stale AI valuation');
  }

  const rating = String(item.valuation.rating || '').toLowerCase();
  if (rating === 'strong_buy' && isEvidenceFresh_(item.valuation.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshAiValuationHours)) {
    score += 15;
    reasons.push('AI strong buy');
  } else if (rating === 'buy' && isEvidenceFresh_(item.valuation.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshAiValuationHours)) {
    score += 10;
  } else if (rating === 'avoid' || rating === 'sell') {
    score -= 20;
    reasons.push('AI avoid/sell');
  }

  score = addScore_(score, reasons, Number(item.realtime.changePct), 0, 5, 10, 'positive intraday change');
  score = addScore_(score, reasons, Number(item.realtime.priceChange5m), 0, 3, 8, '5m momentum');
  score = addScore_(score, reasons, Number(item.realtime.bookImbalance), 0.55, 0.8, 8, 'bid-side imbalance');

  const badNewsRisk = Number(item.badNews.riskScore || 0);
  if (badNewsRisk >= BAD_NEWS_CONFIG.forceExitRiskScore && isEvidenceFresh_(item.badNews.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshBadNewsHours)) {
    score -= 60;
    reasons.push('critical bad news');
  } else if (badNewsRisk >= BAD_NEWS_CONFIG.blockEntryRiskScore && isEvidenceFresh_(item.badNews.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshBadNewsHours)) {
    score -= 40;
    reasons.push('bad news blocks entry');
  } else if (badNewsRisk >= 50 && isEvidenceFresh_(item.badNews.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshBadNewsHours)) {
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
  const latestQuote = getLatestSheetRowsBySymbol_(CONFIG.quoteSheetName, 'symbol', 'recordedAt', 10000);
  const latestRealtime = getLatestSheetRowsBySymbol_(GAS_REALTIME_CONFIG.sheetName, 'symbol', 'recordedAt', GAS_REALTIME_CONFIG.historyLookbackRows);
  const latestAiValuation = getLatestSheetRowsBySymbol_(AI_VALUATION_CONFIG.sheetName, 'symbol', 'generatedAt');
  const latestBadNews = getLatestSheetRowsBySymbol_(BAD_NEWS_CONFIG.sheetName, 'symbol', 'generatedAt');
  const latestExternalEvidence = getLatestSheetRowsBySymbol_(LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.sheetName, 'symbol', 'checked_at');
  const latestPool500 = getLatestSheetRowsBySymbol_(CONFIG.stockScanPool500SheetName, 'symbol', 'scanAt');
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
      external: latestExternalEvidence[symbol] || {},
      pool: latestPool500[symbol] || {}
    }))
  };
}

function buildDailyStockScanRow_(item, inputs, index) {
  const scoreResult = scoreDailyStockCandidate_(item);
  const action = decideDailyStockScanAction_(scoreResult.score, item);
  const setupType = classifyDailyStockSetup_(item, scoreResult.score);
  const riskFlag = classifyDailyStockRisk_(item);
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
    setupType,
    riskFlag,
    valueOrBlank_(item.pool.score),
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

  const themeResult = scoreTargetThemes_(item.config.themes);
  if (themeResult.score > 0) {
    score += Math.round(themeResult.score / 4);
    reasons.push(themeResult.reasons[0] || 'target theme');
  } else if (themeResult.score < 0) {
    score += Math.round(themeResult.score / 3);
    reasons.push(themeResult.reasons[0] || 'non-target theme');
  }

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
  if (!isNaN(externalScore) && isEvidenceFresh_(external.checked_at || external.news_checked_at, DAILY_STOCK_SCAN_CONFIG.freshExternalEvidenceHours)) {
    score += Math.round(externalScore * 12);
    if (externalScore >= 0.7) {
      reasons.push('external evidence trigger zone');
    }
  } else if (!isNaN(externalScore)) {
    score += Math.round(externalScore * 4);
    reasons.push('stale external evidence');
  }
  if (external.trigger === true || String(external.trigger).toLowerCase() === 'true') {
    score += 10;
    reasons.push('external trigger');
  }

  const poolScore = Number(item.pool.score);
  if (!isNaN(poolScore)) {
    score += Math.round((poolScore - 50) / 8);
    if (poolScore >= 75) {
      reasons.push('high 500-pool score');
    }
  }

  const badNewsRisk = Number(badNews.riskScore || 0);
  if (badNewsRisk >= BAD_NEWS_CONFIG.forceExitRiskScore && isEvidenceFresh_(badNews.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshBadNewsHours)) {
    score -= 45;
    reasons.push('critical bad news');
  } else if (badNewsRisk >= BAD_NEWS_CONFIG.blockEntryRiskScore && isEvidenceFresh_(badNews.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshBadNewsHours)) {
    score -= 30;
    reasons.push('bad news blocks entry');
  } else if (badNewsRisk >= 50 && isEvidenceFresh_(badNews.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshBadNewsHours)) {
    score -= 12;
    reasons.push('watch bad news');
  }

  if ((badNews.shouldBlockEntry === true || String(badNews.shouldBlockEntry).toLowerCase() === 'true') &&
      isEvidenceFresh_(badNews.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshBadNewsHours)) {
    score -= 20;
    reasons.push('entry blocked');
  }

  return {
    score: clamp_(Math.round(score), 0, 100),
    reasons: reasons.slice(0, 8)
  };
}

function scoreTargetThemes_(themes) {
  const text = String(themes || '').toLowerCase();
  if (!text) {
    return { score: 0, reasons: [] };
  }
  let score = 0;
  const reasons = [];
  DAILY_STOCK_SCAN_CONFIG.targetThemeRules.forEach(rule => {
    if (rule.pattern.test(text)) {
      score += rule.points;
      reasons.push(rule.reason);
    }
  });
  if (DAILY_STOCK_SCAN_CONFIG.nonTargetThemePattern.test(text)) {
    score -= DAILY_STOCK_SCAN_CONFIG.nonTargetThemePenalty;
    reasons.push('legacy non-target theme');
  }
  return {
    score: clamp_(score, -DAILY_STOCK_SCAN_CONFIG.nonTargetThemePenalty, DAILY_STOCK_SCAN_CONFIG.targetThemeMaxScore),
    reasons: reasons.slice(0, 5)
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

function addRankScore_(score, reasons, rank, maxRank, points, reason) {
  if (isNaN(rank) || rank < 1 || rank > maxRank) {
    return score;
  }
  const delta = Math.round(points * (maxRank - rank + 1) / maxRank);
  if (delta > 0) {
    reasons.push(reason);
  }
  return score + delta;
}

function fetchFugleSnapshotEvidence_() {
  const evidence = {};
  DAILY_STOCK_SCAN_CONFIG.snapshotMarkets.forEach(market => {
    mergeSnapshotEvidence_(evidence, fetchFugleSnapshotList_(`/snapshot/quotes/${market}`, {
      type: 'COMMONSTOCK'
    }), market, 'quote');
    mergeSnapshotEvidence_(evidence, fetchFugleSnapshotList_(`/snapshot/movers/${market}`, {
      direction: 'up',
      change: 'percent',
      type: 'COMMONSTOCK'
    }), market, 'mover');
    mergeSnapshotEvidence_(evidence, fetchFugleSnapshotList_(`/snapshot/actives/${market}`, {
      trade: 'value',
      type: 'COMMONSTOCK'
    }), market, 'activeValue');
  });
  return evidence;
}

function fetchFugleSnapshotList_(path, query) {
  try {
    const result = fugleGet_(path, query);
    return result.data || [];
  } catch (error) {
    log_('WARN', `Skipped Fugle snapshot evidence ${path}: ${error.message}`);
    return [];
  }
}

function mergeSnapshotEvidence_(evidence, rows, market, sourceType) {
  rows.forEach((row, index) => {
    const symbol = normalizeSymbol_(row.symbol);
    if (!symbol) {
      return;
    }
    if (!evidence[symbol]) {
      evidence[symbol] = { symbol, market };
    }
    const target = evidence[symbol];
    target.name = target.name || row.name || '';
    target.changePercent = firstNumber_(target.changePercent, row.changePercent);
    target.tradeVolume = firstNumber_(target.tradeVolume, row.tradeVolume);
    target.tradeValue = firstNumber_(target.tradeValue, row.tradeValue);
    target.lastUpdated = firstNumber_(target.lastUpdated, row.lastUpdated);
    if (sourceType === 'mover' && !target.moverRank) {
      target.moverRank = index + 1;
    }
    if (sourceType === 'activeValue' && !target.activeValueRank) {
      target.activeValueRank = index + 1;
    }
  });
}

function decideDailyStockScanAction_(score, item) {
  const badNews = item.badNews;
  if ((badNews.shouldForceExit === true || String(badNews.shouldForceExit).toLowerCase() === 'true') &&
      isEvidenceFresh_(badNews.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshBadNewsHours)) {
    return 'avoid_force_exit_risk';
  }
  if ((badNews.shouldBlockEntry === true || String(badNews.shouldBlockEntry).toLowerCase() === 'true') &&
      isEvidenceFresh_(badNews.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshBadNewsHours)) {
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

function classifyDailyStockSetup_(item, score) {
  const distanceToLimit = Number(item.realtime.distanceToLimitPct);
  const externalScore = Number(item.external.external_score);
  const priceChange5m = Number(item.realtime.priceChange5m);
  const bookImbalance = Number(item.realtime.bookImbalance);
  const upsidePct = Number(item.valuation.upsidePct);
  const poolScore = Number(item.pool.score);

  if (!isNaN(distanceToLimit) && distanceToLimit >= 0 && distanceToLimit <= 3 &&
      (!isNaN(bookImbalance) && bookImbalance >= 0.6 || !isNaN(externalScore) && externalScore >= 0.7)) {
    return 'limit_up_chase';
  }
  if (!isNaN(priceChange5m) && priceChange5m >= 1.5 && !isNaN(bookImbalance) && bookImbalance >= 0.58) {
    return 'intraday_momentum';
  }
  if (!isNaN(externalScore) && externalScore >= 0.7) {
    return 'external_evidence';
  }
  if (!isNaN(upsidePct) && upsidePct >= 8 && score >= DAILY_STOCK_SCAN_CONFIG.minTradableScore) {
    return 'valuation_momentum';
  }
  const themeSetup = classifyTargetThemeSetup_(item.config.themes);
  if (themeSetup) {
    return themeSetup;
  }
  if (!isNaN(poolScore) && poolScore >= 75) {
    return 'pool_leader';
  }
  return 'watchlist_candidate';
}

function classifyTargetThemeSetup_(themes) {
  const text = String(themes || '').toLowerCase();
  if (/(lunar_space|moonshot|space_power|perovskite|space_ai)/.test(text)) {
    return 'lunar_space';
  }
  if (/(leo_satellite|satellite|satellite_terminal|satellite_ground_equipment|rf|antenna|aerospace)/.test(text)) {
    return 'space_satellite';
  }
  if (/(quantum|quantum_compute|quantum_comm|quantum_photonics|photonics|silicon_photonics)/.test(text)) {
    return 'quantum_photonics';
  }
  if (/(robotics|automation|motion_control|gear_reducer|ev|drone|uav|autonomous|industrial_pc|rugged_computing|defense)/.test(text)) {
    return 'robot_ev_drone';
  }
  if (/(ai_server|ai_chip|ai_datacenter|ai_infrastructure|compute_infrastructure|semiconductor|advanced_packaging|pcb|memory|hbm|asic|server|cloud_server|cloud_service|cloud_infrastructure|ai_cloud|cloud_networking|datacenter|cooling|thermal|power|heavy_electric|cpo|optical_communication|networking)/.test(text)) {
    return 'ai_infrastructure';
  }
  return '';
}

function classifyDailyStockRisk_(item) {
  const badNews = item.badNews;
  const badNewsRisk = Number(badNews.riskScore || 0);
  const freshBadNews = isEvidenceFresh_(badNews.generatedAt, DAILY_STOCK_SCAN_CONFIG.freshBadNewsHours);
  if ((badNews.shouldForceExit === true || String(badNews.shouldForceExit).toLowerCase() === 'true') && freshBadNews) {
    return 'force_exit_risk';
  }
  if ((badNews.shouldBlockEntry === true || String(badNews.shouldBlockEntry).toLowerCase() === 'true') && freshBadNews) {
    return 'block_entry';
  }
  if (badNewsRisk >= 50 && freshBadNews) {
    return 'watch_bad_news';
  }
  const spreadPct = Number(item.realtime.spreadPct);
  if (!isNaN(spreadPct) && spreadPct > 1) {
    return 'wide_spread';
  }
  return 'normal';
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
    formatSymbolColumnsAsText_(sheet, 2, rows.length);
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

function isEvidenceFresh_(value, maxHours) {
  const date = normalizeScanDate_(value);
  if (!date) {
    return false;
  }
  return Date.now() - date.getTime() <= maxHours * 60 * 60 * 1000;
}

function normalizeScanDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
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
