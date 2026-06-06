const GAS_REALTIME_CONFIG = {
  sheetName: 'RealtimeFeatureSnapshots',
  triggerHandlerName: 'collectGasRealtimeSnapshots',
  timezone: 'Asia/Taipei',
  source: 'fugle_intraday_quote_rest',
  minRequestGapMs: 300,
  historyLookbackRows: 5000,
  maxHistoryStalenessMs: 15 * 60 * 1000
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
    const historyContext = buildRealtimeHistoryContext_(symbols);
    const rows = [];

    symbols.forEach(symbol => {
      try {
        Utilities.sleep(GAS_REALTIME_CONFIG.minRequestGapMs);
        const quote = fugleGet_(`/intraday/quote/${encodeURIComponent(symbol)}`);
        rows.push(buildRealtimeSnapshotRow_(quote, symbol, recordedAt, historyContext));
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

function buildRealtimeSnapshotRow_(quote, fallbackSymbol, recordedAt, historyContext) {
  const symbol = normalizeSymbol_(quote.symbol || fallbackSymbol);
  const bestBid = quote.bids && quote.bids.length ? Number(quote.bids[0].price) : '';
  const bestBidSize = quote.bids && quote.bids.length ? Number(quote.bids[0].size || 0) : '';
  const bestAsk = quote.asks && quote.asks.length ? Number(quote.asks[0].price) : '';
  const bestAskSize = quote.asks && quote.asks.length ? Number(quote.asks[0].size || 0) : '';
  const bidSizeTotal5 = sumBookSize_(quote.bids, 5);
  const askSizeTotal5 = sumBookSize_(quote.asks, 5);
  const midpoint = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : '';
  const spreadPct = bestBid && bestAsk && midpoint ? (bestAsk - bestBid) / midpoint * 100 : '';
  const bookImbalance = calculateBookImbalance_(quote.bids, quote.asks);
  const microPrice = calculateMicroPrice_(bestBid, bestAsk, bestBidSize, bestAskSize);
  const lastPrice = valueOrBlank_(quote.lastPrice || quote.closePrice);
  const previousClose = calculatePreviousClose_(quote);
  const openPrice = valueOrBlank_(quote.openPrice);
  const highPrice = valueOrBlank_(quote.highPrice);
  const lowPrice = valueOrBlank_(quote.lowPrice);
  const tradeVolume = quote.total ? valueOrBlank_(quote.total.tradeVolume) : '';
  const tradeValue = quote.total ? valueOrBlank_(quote.total.tradeValue) : '';
  const transaction = quote.total ? valueOrBlank_(quote.total.transaction) : '';
  const limitUpPrice = calculateLimitUpPrice_(quote, previousClose);
  const distanceToLimitPct = calculateDistanceToLimitPct_(lastPrice, limitUpPrice);
  const microPricePremiumPct = calculateMicroPricePremiumPct_(microPrice, midpoint);
  const observations = historyContext[symbol] || [];
  const previousObservation = findRealtimeObservationAtOrBefore_(observations, recordedAt.getTime() - 1);
  const observation1m = findRealtimeObservationAtOrBefore_(observations, recordedAt.getTime() - 60 * 1000);
  const observation3m = findRealtimeObservationAtOrBefore_(observations, recordedAt.getTime() - 3 * 60 * 1000);
  const observation5m = findRealtimeObservationAtOrBefore_(observations, recordedAt.getTime() - 5 * 60 * 1000);
  const priceChange1m = calculateRealtimePriceChangePct_(lastPrice, observation1m);
  const priceChange3m = calculateRealtimePriceChangePct_(lastPrice, observation3m);
  const priceChange5m = calculateRealtimePriceChangePct_(lastPrice, observation5m);
  const distanceChange5m = distanceToLimitPct !== '' && observation5m && observation5m.distanceToLimitPct !== ''
    ? Number(distanceToLimitPct) - Number(observation5m.distanceToLimitPct)
    : '';
  const volumeChange5m = tradeVolume !== '' && observation5m && observation5m.volume !== ''
    ? Number(tradeVolume) - Number(observation5m.volume)
    : '';
  const bookImbalanceDelta = bookImbalance !== '' && previousObservation && previousObservation.bookImbalance !== ''
    ? Number(bookImbalance) - Number(previousObservation.bookImbalance)
    : '';
  const bidSizeDelta = previousObservation && previousObservation.bidSizeTotal5 !== ''
    ? Number(bidSizeTotal5) - Number(previousObservation.bidSizeTotal5)
    : '';
  const askSizeDelta = previousObservation && previousObservation.askSizeTotal5 !== ''
    ? Number(askSizeTotal5) - Number(previousObservation.askSizeTotal5)
    : '';

  return [
    recordedAt,
    quote.date || '',
    symbol,
    quote.name || '',
    valueOrBlank_(quote.market),
    valueOrBlank_(quote.exchange),
    openPrice,
    highPrice,
    lowPrice,
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
    GAS_REALTIME_CONFIG.source,
    recordedAt,
    previousClose,
    openPrice,
    highPrice,
    lowPrice,
    tradeVolume,
    valueOrBlank_(quote.changePercent),
    limitUpPrice,
    distanceToLimitPct,
    priceChange1m,
    priceChange3m,
    priceChange5m,
    distanceChange5m,
    volumeChange5m,
    bidSizeTotal5,
    askSizeTotal5,
    bookImbalanceDelta,
    bidSizeDelta,
    askSizeDelta,
    microPricePremiumPct
  ];
}

function calculateBookImbalance_(bids, asks) {
  const bidSize = sumBookSize_(bids, 5);
  const askSize = sumBookSize_(asks, 5);
  const total = bidSize + askSize;
  return total ? bidSize / total : '';
}

function calculateMicroPrice_(bestBid, bestAsk, bestBidSize, bestAskSize) {
  if (!bestBid || !bestAsk || !bestBidSize || !bestAskSize) {
    return '';
  }
  return (bestAsk * bestBidSize + bestBid * bestAskSize) / (bestBidSize + bestAskSize);
}

function sumBookSize_(levels, maxLevels) {
  if (!levels || !levels.length) {
    return 0;
  }
  return levels.slice(0, maxLevels || levels.length)
    .reduce((sum, level) => sum + Number(level.size || 0), 0);
}

function calculatePreviousClose_(quote) {
  const direct = valueOrBlank_(quote.previousClose || quote.referencePrice || quote.priorClose || quote.lastClosePrice);
  if (direct !== '') {
    return direct;
  }

  const lastPrice = Number(quote.lastPrice || quote.closePrice);
  const change = Number(quote.change);
  if (lastPrice && !isNaN(change)) {
    return lastPrice - change;
  }
  return valueOrBlank_(quote.closePrice);
}

function calculateLimitUpPrice_(quote, previousClose) {
  const direct = valueOrBlank_(quote.limitUpPrice || quote.limitUp || quote.limitUpLimitPrice);
  if (direct !== '') {
    return direct;
  }

  const base = Number(previousClose);
  if (!base) {
    return '';
  }
  return roundTaiwanPrice_(base * 1.1);
}

function roundTaiwanPrice_(price) {
  const value = Number(price);
  if (!value) {
    return '';
  }

  let tick = 0.01;
  if (value >= 1000) {
    tick = 5;
  } else if (value >= 500) {
    tick = 1;
  } else if (value >= 100) {
    tick = 0.5;
  } else if (value >= 50) {
    tick = 0.1;
  } else if (value >= 10) {
    tick = 0.05;
  }
  return Math.floor(value / tick) * tick;
}

function calculateDistanceToLimitPct_(lastPrice, limitUpPrice) {
  const last = Number(lastPrice);
  const limit = Number(limitUpPrice);
  if (!last || !limit) {
    return '';
  }
  return (limit - last) / limit * 100;
}

function calculateMicroPricePremiumPct_(microPrice, midpoint) {
  const micro = Number(microPrice);
  const mid = Number(midpoint);
  if (!micro || !mid) {
    return '';
  }
  return (micro - mid) / mid * 100;
}

function calculateRealtimePriceChangePct_(lastPrice, observation) {
  const current = Number(lastPrice);
  const previous = observation ? Number(observation.lastPrice) : 0;
  if (!current || !previous) {
    return '';
  }
  return (current - previous) / previous * 100;
}

function buildRealtimeHistoryContext_(symbols) {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), GAS_REALTIME_CONFIG.sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) {
    return {};
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(header => String(header));
  const headerIndex = buildHeaderIndex_(headers);
  const startRow = Math.max(2, lastRow - GAS_REALTIME_CONFIG.historyLookbackRows + 1);
  const values = sheet.getRange(startRow, 1, lastRow - startRow + 1, lastColumn).getValues();
  const symbolSet = symbols.reduce((accumulator, symbol) => {
    accumulator[normalizeSymbol_(symbol)] = true;
    return accumulator;
  }, {});
  const context = {};

  values.forEach(row => {
    const symbol = normalizeSymbol_(getRealtimeRowValue_(row, headerIndex, ['symbol']));
    if (!symbol || !symbolSet[symbol]) {
      return;
    }

    const timestamp = normalizeRealtimeDate_(getRealtimeRowValue_(row, headerIndex, ['timestamp', 'recordedAt', 'lastUpdated']));
    if (!timestamp) {
      return;
    }

    if (!context[symbol]) {
      context[symbol] = [];
    }
    context[symbol].push({
      timestamp,
      lastPrice: valueOrBlank_(getRealtimeRowValue_(row, headerIndex, ['lastPrice'])),
      volume: valueOrBlank_(getRealtimeRowValue_(row, headerIndex, ['volume', 'tradeVolume'])),
      distanceToLimitPct: valueOrBlank_(getRealtimeRowValue_(row, headerIndex, ['distanceToLimitPct'])),
      bookImbalance: valueOrBlank_(getRealtimeRowValue_(row, headerIndex, ['bookImbalance'])),
      bidSizeTotal5: valueOrBlank_(getRealtimeRowValue_(row, headerIndex, ['bidSizeTotal5', 'bestBidSize'])),
      askSizeTotal5: valueOrBlank_(getRealtimeRowValue_(row, headerIndex, ['askSizeTotal5', 'bestAskSize']))
    });
  });

  Object.keys(context).forEach(symbol => {
    context[symbol].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
  });
  return context;
}

function buildHeaderIndex_(headers) {
  return headers.reduce((index, header, column) => {
    index[String(header)] = column;
    return index;
  }, {});
}

function getRealtimeRowValue_(row, headerIndex, names) {
  for (let i = 0; i < names.length; i += 1) {
    const index = headerIndex[names[i]];
    if (index !== undefined) {
      return row[index];
    }
  }
  return '';
}

function normalizeRealtimeDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function findRealtimeObservationAtOrBefore_(observations, targetMs) {
  let match = null;
  for (let i = observations.length - 1; i >= 0; i -= 1) {
    const observation = observations[i];
    const observationMs = observation.timestamp.getTime();
    if (observationMs <= targetMs) {
      match = observation;
      break;
    }
  }

  if (!match || targetMs - match.timestamp.getTime() > GAS_REALTIME_CONFIG.maxHistoryStalenessMs) {
    return null;
  }
  return match;
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
    'source',
    'timestamp',
    'previousClose',
    'open',
    'high',
    'low',
    'volume',
    'changePct',
    'limitUpPrice',
    'distanceToLimitPct',
    'priceChange1m',
    'priceChange3m',
    'priceChange5m',
    'distanceChange5m',
    'volumeChange5m',
    'bidSizeTotal5',
    'askSizeTotal5',
    'bookImbalanceDelta',
    'bidSizeDelta',
    'askSizeDelta',
    'microPricePremiumPct'
  ];
}
