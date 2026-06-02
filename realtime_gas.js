const GAS_REALTIME_CONFIG = {
  sheetName: 'RealtimeFeatureSnapshots',
  triggerHandlerName: 'collectGasRealtimeSnapshots',
  timezone: 'Asia/Taipei',
  source: 'fugle_intraday_quote_rest',
  minRequestGapMs: 300
};

function collectGasRealtimeSnapshots() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    log_('WARN', 'Skipped realtime collection because the previous run is still active.');
    return;
  }

  try {
    setupGasRealtimeSheet_();
    if (!isTaiwanMarketCollectionWindow_(new Date())) {
      log_('INFO', 'Skipped realtime quote collection outside Taiwan market window.');
      return;
    }

    const symbols = getEnabledSymbols_();
    const recordedAt = new Date();
    const rows = [];

    symbols.forEach(symbol => {
      try {
        Utilities.sleep(GAS_REALTIME_CONFIG.minRequestGapMs);
        const quote = fugleGet_(`/intraday/quote/${encodeURIComponent(symbol)}`);
        rows.push(buildRealtimeSnapshotRow_(quote, symbol, recordedAt));
      } catch (error) {
        log_('ERROR', `Realtime quote failed for ${symbol}: ${error.message}`);
      }
    });

    if (rows.length) {
      appendRows_(GAS_REALTIME_CONFIG.sheetName, rows);
    }
    log_('INFO', `Recorded ${rows.length} realtime feature snapshot row(s).`);
  } finally {
    lock.releaseLock();
  }
}

function setupGasRealtimeSheet_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), GAS_REALTIME_CONFIG.sheetName);
  setHeader_(sheet, getGasRealtimeHeaders_());
}

function buildRealtimeSnapshotRow_(quote, fallbackSymbol, recordedAt) {
  const bestBid = quote.bids && quote.bids.length ? Number(quote.bids[0].price) : '';
  const bestBidSize = quote.bids && quote.bids.length ? Number(quote.bids[0].size || 0) : '';
  const bestAsk = quote.asks && quote.asks.length ? Number(quote.asks[0].price) : '';
  const bestAskSize = quote.asks && quote.asks.length ? Number(quote.asks[0].size || 0) : '';
  const midpoint = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : '';
  const spreadPct = bestBid && bestAsk && midpoint ? (bestAsk - bestBid) / midpoint * 100 : '';
  const bookImbalance = calculateBookImbalance_(quote.bids, quote.asks);
  const microPrice = calculateMicroPrice_(bestBid, bestAsk, bestBidSize, bestAskSize);
  const lastPrice = valueOrBlank_(quote.lastPrice || quote.closePrice);
  const tradeVolume = quote.total ? valueOrBlank_(quote.total.tradeVolume) : '';
  const tradeValue = quote.total ? valueOrBlank_(quote.total.tradeValue) : '';
  const transaction = quote.total ? valueOrBlank_(quote.total.transaction) : '';

  return [
    recordedAt,
    quote.date || '',
    quote.symbol || fallbackSymbol,
    quote.name || '',
    valueOrBlank_(quote.market),
    valueOrBlank_(quote.exchange),
    valueOrBlank_(quote.openPrice),
    valueOrBlank_(quote.highPrice),
    valueOrBlank_(quote.lowPrice),
    valueOrBlank_(quote.closePrice),
    lastPrice,
    valueOrBlank_(quote.avgPrice),
    valueOrBlank_(quote.change),
    valueOrBlank_(quote.changePercent),
    bestBid,
    bestBidSize,
    bestAsk,
    bestAskSize,
    midpoint,
    spreadPct,
    bookImbalance,
    microPrice,
    tradeVolume,
    tradeValue,
    transaction,
    quote.lastTrade ? valueOrBlank_(quote.lastTrade.price) : '',
    quote.lastTrade ? valueOrBlank_(quote.lastTrade.size) : '',
    quote.lastTrade ? microTimestampToDate_(quote.lastTrade.time) : '',
    microTimestampToDate_(quote.lastUpdated),
    quote.isClose === true,
    GAS_REALTIME_CONFIG.source
  ];
}

function calculateBookImbalance_(bids, asks) {
  const bidSize = sumBookSize_(bids);
  const askSize = sumBookSize_(asks);
  const total = bidSize + askSize;
  return total ? bidSize / total : '';
}

function calculateMicroPrice_(bestBid, bestAsk, bestBidSize, bestAskSize) {
  if (!bestBid || !bestAsk || !bestBidSize || !bestAskSize) {
    return '';
  }
  return (bestAsk * bestBidSize + bestBid * bestAskSize) / (bestBidSize + bestAskSize);
}

function sumBookSize_(levels) {
  if (!levels || !levels.length) {
    return 0;
  }
  return levels.reduce((sum, level) => sum + Number(level.size || 0), 0);
}

function getGasRealtimeHeaders_() {
  return [
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
    'avgPrice',
    'change',
    'changePercent',
    'bestBid',
    'bestBidSize',
    'bestAsk',
    'bestAskSize',
    'midpoint',
    'spreadPct',
    'bookImbalance',
    'microPrice',
    'tradeVolume',
    'tradeValue',
    'transaction',
    'lastTradePrice',
    'lastTradeSize',
    'lastTradeTime',
    'lastUpdated',
    'isClose',
    'source'
  ];
}
