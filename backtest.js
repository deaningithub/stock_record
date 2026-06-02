const BACKTEST_CONFIG = {
  tradesSheetName: 'BacktestTrades',
  reportSheetName: 'BacktestReport',
  timezone: 'Asia/Taipei',
  lotSize: 1000
};

function runAllStrategyBacktests() {
  setupBacktestSheets_();
  clearBacktestOutputs_();

  const barsBySymbolDate = loadMinuteReplayBars_();
  const strategies = getBacktestStrategies_();
  let tradeCount = 0;

  strategies.forEach(strategy => {
    const trades = runBacktestForStrategy_(strategy, barsBySymbolDate);
    if (trades.length) {
      appendBacktestTrades_(trades);
    }
    tradeCount += trades.length;
    log_('INFO', `Backtest ${strategy.id} generated ${trades.length} trade(s).`);
  });

  generateBacktestReport();
  log_('INFO', `All strategy backtests completed with ${tradeCount} total trade(s).`);
}

function runBacktestForStrategyId(strategyId) {
  setupBacktestSheets_();
  clearBacktestOutputs_();

  const strategy = getBacktestStrategies_().filter(item => item.id === strategyId)[0];
  if (!strategy) {
    throw new Error(`Unknown strategy: ${strategyId}`);
  }

  const barsBySymbolDate = loadMinuteReplayBars_();
  const trades = runBacktestForStrategy_(strategy, barsBySymbolDate);
  if (trades.length) {
    appendBacktestTrades_(trades);
  }

  generateBacktestReport();
  log_('INFO', `Backtest ${strategy.id} completed with ${trades.length} trade(s).`);
}

function runOpeningRangeBreakoutBacktest() {
  runBacktestForStrategyId('opening_range_breakout');
}

function runVwapMomentumBacktest() {
  runBacktestForStrategyId('vwap_momentum');
}

function runDipReversalBacktest() {
  runBacktestForStrategyId('dip_reversal');
}

function setupBacktestSheets_() {
  const spreadsheet = getSpreadsheet_();
  setHeader_(getOrCreateSheet_(spreadsheet, BACKTEST_CONFIG.tradesSheetName), getBacktestTradeHeaders_());
  setHeader_(getOrCreateSheet_(spreadsheet, BACKTEST_CONFIG.reportSheetName), getBacktestReportHeaders_());
}

function clearBacktestOutputs_() {
  clearSheetBody_(BACKTEST_CONFIG.tradesSheetName);
  clearSheetBody_(BACKTEST_CONFIG.reportSheetName);
}

function runBacktestForStrategy_(strategy, barsBySymbolDate) {
  const trades = [];
  Object.keys(barsBySymbolDate).sort().forEach(key => {
    const bars = barsBySymbolDate[key];
    if (bars.length < 10) {
      return;
    }

    enrichBars_(bars);
    const trade = simulateOneSymbolDay_(strategy, bars);
    if (trade) {
      trades.push(trade);
    }
  });
  return trades;
}

function simulateOneSymbolDay_(strategy, bars) {
  let position = null;
  let highestSinceEntry = 0;

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    if (!position) {
      if (!isEntryWindow_(bar, strategy.entry)) {
        continue;
      }

      if (shouldEnter_(strategy, bars, index)) {
        const entryFill = applySlippage_(bar.close, strategy.risk.slippagePct, 'buy');
        const shares = calculateShares_(entryFill, strategy.risk.capitalPerTrade);
        if (shares <= 0) {
          return null;
        }
        position = {
          strategyId: strategy.id,
          strategyName: strategy.name,
          symbol: bar.symbol,
          tradeDate: bar.tradeDate,
          entryTime: bar.timestampText,
          entryPrice: entryFill,
          shares,
          entryIndex: index,
          entryReason: strategy.entry.type
        };
        highestSinceEntry = bar.high;
      }
      continue;
    }

    highestSinceEntry = Math.max(highestSinceEntry, bar.high);
    const exitSignal = getExitSignal_(strategy, position, bar, index, highestSinceEntry);
    if (exitSignal) {
      return closeTrade_(strategy, position, bar, exitSignal);
    }
  }

  if (position) {
    return closeTrade_(strategy, position, bars[bars.length - 1], 'end_of_data');
  }
  return null;
}

function shouldEnter_(strategy, bars, index) {
  if (strategy.entry.type === 'opening_range_breakout') {
    return shouldEnterOpeningRangeBreakout_(strategy, bars, index);
  }
  if (strategy.entry.type === 'vwap_momentum') {
    return shouldEnterVwapMomentum_(strategy, bars, index);
  }
  if (strategy.entry.type === 'dip_reversal') {
    return shouldEnterDipReversal_(strategy, bars, index);
  }
  throw new Error(`Unsupported strategy entry type: ${strategy.entry.type}`);
}

function shouldEnterOpeningRangeBreakout_(strategy, bars, index) {
  const bar = bars[index];
  const rangeEndMinute = timeToMinutes_('09:00') + strategy.entry.rangeMinutes - 1;
  const rangeBars = bars.filter(item => item.minuteOfDay <= rangeEndMinute);
  if (rangeBars.length < strategy.entry.rangeMinutes) {
    return false;
  }

  const rangeHigh = Math.max.apply(null, rangeBars.map(item => item.high));
  const breakoutPrice = rangeHigh * (1 + strategy.entry.breakoutBufferPct / 100);
  return bar.close > breakoutPrice && hasVolumeConfirmation_(bars, index, strategy.entry);
}

function shouldEnterVwapMomentum_(strategy, bars, index) {
  if (index < 1) {
    return false;
  }

  const previous = bars[index - 1];
  const bar = bars[index];
  const requiredPrice = bar.vwap * (1 + strategy.entry.minPriceAboveVwapPct / 100);
  return previous.close <= previous.vwap &&
    bar.close >= requiredPrice &&
    hasVolumeConfirmation_(bars, index, strategy.entry);
}

function shouldEnterDipReversal_(strategy, bars, index) {
  if (index < 2) {
    return false;
  }

  const bar = bars[index];
  const previous = bars[index - 1];
  const highBeforeNow = Math.max.apply(null, bars.slice(0, index).map(item => item.high));
  const lowBeforeNow = Math.min.apply(null, bars.slice(0, index + 1).map(item => item.low));
  const dipPct = pctChange_(lowBeforeNow, highBeforeNow) * -1;
  const reboundPct = pctChange_(bar.close, lowBeforeNow);
  return dipPct >= strategy.entry.dipFromHighPct &&
    reboundPct >= strategy.entry.reboundPct &&
    bar.close > previous.close &&
    hasVolumeConfirmation_(bars, index, strategy.entry);
}

function getExitSignal_(strategy, position, bar, index, highestSinceEntry) {
  const pnlPct = pctChange_(bar.close, position.entryPrice);
  if (pnlPct <= -strategy.exit.stopLossPct) {
    return 'stop_loss';
  }
  if (pnlPct >= strategy.exit.takeProfitPct) {
    return 'take_profit';
  }
  if (strategy.exit.trailingStopPct) {
    const trailingStopPrice = highestSinceEntry * (1 - strategy.exit.trailingStopPct / 100);
    if (bar.close <= trailingStopPrice && index > position.entryIndex) {
      return 'trailing_stop';
    }
  }
  if (index - position.entryIndex >= strategy.exit.maxHoldingMinutes) {
    return 'max_holding_minutes';
  }
  if (bar.minuteOfDay >= timeToMinutes_(strategy.exit.forceExitTime)) {
    return 'force_exit_time';
  }
  return '';
}

function closeTrade_(strategy, position, bar, exitReason) {
  const exitFill = applySlippage_(bar.close, strategy.risk.slippagePct, 'sell');
  const buyAmount = position.entryPrice * position.shares;
  const sellAmount = exitFill * position.shares;
  const buyFee = buyAmount * strategy.risk.feeRatePct / 100;
  const sellFee = sellAmount * strategy.risk.feeRatePct / 100;
  const tax = sellAmount * strategy.risk.taxRatePct / 100;
  const grossPnl = sellAmount - buyAmount;
  const netPnl = grossPnl - buyFee - sellFee - tax;

  return {
    strategyId: position.strategyId,
    strategyName: position.strategyName,
    symbol: position.symbol,
    tradeDate: position.tradeDate,
    entryTime: position.entryTime,
    exitTime: bar.timestampText,
    entryPrice: position.entryPrice,
    exitPrice: exitFill,
    shares: position.shares,
    grossPnl,
    netPnl,
    returnPct: netPnl / buyAmount * 100,
    holdingMinutes: Math.max(1, bar.indexInDay - position.entryIndex),
    entryReason: position.entryReason,
    exitReason,
    buyFee,
    sellFee,
    tax,
    cost: buyAmount + buyFee,
    proceeds: sellAmount - sellFee - tax,
    generatedAt: new Date()
  };
}

function loadMinuteReplayBars_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.minuteReplaySheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return {};
  }

  const header = values[0].map(value => String(value));
  const index = {
    symbol: header.indexOf('symbol'),
    date: header.indexOf('date'),
    open: header.indexOf('open'),
    high: header.indexOf('high'),
    low: header.indexOf('low'),
    close: header.indexOf('close'),
    volume: header.indexOf('volume'),
    turnover: header.indexOf('turnover')
  };

  const groups = {};
  values.slice(1).forEach(row => {
    const symbol = normalizeSymbol_(row[index.symbol]);
    const timestamp = parseMinuteTimestamp_(row[index.date]);
    if (!symbol || !timestamp) {
      return;
    }

    const tradeDate = Utilities.formatDate(timestamp, BACKTEST_CONFIG.timezone, 'yyyy-MM-dd');
    const key = `${symbol}|${tradeDate}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push({
      symbol,
      tradeDate,
      timestamp,
      timestampText: Utilities.formatDate(timestamp, BACKTEST_CONFIG.timezone, 'yyyy-MM-dd HH:mm'),
      minuteOfDay: Number(Utilities.formatDate(timestamp, BACKTEST_CONFIG.timezone, 'HH')) * 60 +
        Number(Utilities.formatDate(timestamp, BACKTEST_CONFIG.timezone, 'mm')),
      open: Number(row[index.open]),
      high: Number(row[index.high]),
      low: Number(row[index.low]),
      close: Number(row[index.close]),
      volume: Number(row[index.volume] || 0),
      turnover: Number(row[index.turnover] || 0)
    });
  });

  Object.keys(groups).forEach(key => {
    groups[key] = groups[key]
      .filter(bar => isFinite(bar.open) && isFinite(bar.high) && isFinite(bar.low) && isFinite(bar.close))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((bar, indexInDay) => {
        bar.indexInDay = indexInDay;
        return bar;
      });
  });
  return groups;
}

function enrichBars_(bars) {
  let cumulativeVolume = 0;
  let cumulativeTurnover = 0;
  bars.forEach(bar => {
    const estimatedTurnover = bar.close * bar.volume;
    cumulativeVolume += bar.volume;
    cumulativeTurnover += bar.turnover || estimatedTurnover;
    bar.vwap = cumulativeVolume > 0 ? cumulativeTurnover / cumulativeVolume : bar.close;
  });
}

function appendBacktestTrades_(trades) {
  const rows = trades.map(trade => [
    trade.strategyId,
    trade.strategyName,
    trade.symbol,
    trade.tradeDate,
    trade.entryTime,
    trade.exitTime,
    trade.entryPrice,
    trade.exitPrice,
    trade.shares,
    trade.grossPnl,
    trade.netPnl,
    trade.returnPct,
    trade.holdingMinutes,
    trade.entryReason,
    trade.exitReason,
    trade.buyFee,
    trade.sellFee,
    trade.tax,
    trade.cost,
    trade.proceeds,
    trade.generatedAt
  ]);
  appendRows_(BACKTEST_CONFIG.tradesSheetName, rows);
}

function hasVolumeConfirmation_(bars, index, entry) {
  const lookback = entry.volumeLookback || 5;
  if (index < lookback) {
    return false;
  }
  const window = bars.slice(index - lookback, index);
  const averageVolume = window.reduce((sum, bar) => sum + bar.volume, 0) / window.length;
  return averageVolume > 0 && bars[index].volume >= averageVolume * (entry.volumeMultiplier || 1);
}

function isEntryWindow_(bar, entry) {
  return bar.minuteOfDay >= timeToMinutes_(entry.startTime) &&
    bar.minuteOfDay <= timeToMinutes_(entry.endTime);
}

function calculateShares_(price, capital) {
  const boardLots = Math.floor(capital / price / BACKTEST_CONFIG.lotSize);
  return boardLots > 0 ? boardLots * BACKTEST_CONFIG.lotSize : Math.floor(capital / price);
}

function applySlippage_(price, slippagePct, side) {
  const adjustment = price * (slippagePct || 0) / 100;
  return side === 'buy' ? price + adjustment : price - adjustment;
}

function pctChange_(current, base) {
  return base ? (current - base) / base * 100 : 0;
}

function timeToMinutes_(timeText) {
  const parts = String(timeText).split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

function parseMinuteTimestamp_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }
  const text = String(value || '').trim();
  if (!text) {
    return null;
  }
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
}

function getBacktestTradeHeaders_() {
  return [
    'strategyId',
    'strategyName',
    'symbol',
    'tradeDate',
    'entryTime',
    'exitTime',
    'entryPrice',
    'exitPrice',
    'shares',
    'grossPnl',
    'netPnl',
    'returnPct',
    'holdingMinutes',
    'entryReason',
    'exitReason',
    'buyFee',
    'sellFee',
    'tax',
    'cost',
    'proceeds',
    'generatedAt'
  ];
}
