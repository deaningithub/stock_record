const DEAN_BACKTEST_CONFIG = {
  tradesSheetName: 'DeanBacktestTrades',
  reportSheetName: 'DeanBacktestReport',
  timezone: 'Asia/Taipei',
  openTime: '09:00',
  defaultSyntheticSpreadPct: 0.15
};

function runDeanAutoStockBacktests() {
  setupDeanBacktestSheets_();
  clearDeanBacktestOutputs_();

  const barsBySymbolDate = loadMinuteReplayBars_();
  const dayContexts = buildDeanDayContexts_(barsBySymbolDate);
  const strategies = getDeanAutoStockStrategies_();
  let totalTrades = 0;

  strategies.forEach(strategy => {
    const trades = runDeanStrategy_(strategy, dayContexts);
    if (trades.length) {
      appendDeanBacktestTrades_(trades);
    }
    totalTrades += trades.length;
    log_('INFO', `Dean backtest ${strategy.id} generated ${trades.length} trade(s).`);
  });

  generateDeanBacktestReport();
  log_('INFO', `Dean autostock backtests completed with ${totalTrades} total trade(s).`);
}

function runDeanStrategyBacktest(strategyId) {
  setupDeanBacktestSheets_();
  clearDeanBacktestOutputs_();

  const strategy = getDeanAutoStockStrategy_(strategyId);
  if (!strategy) {
    throw new Error(`Unknown Dean strategy: ${strategyId}`);
  }

  const dayContexts = buildDeanDayContexts_(loadMinuteReplayBars_());
  const trades = runDeanStrategy_(strategy, dayContexts);
  if (trades.length) {
    appendDeanBacktestTrades_(trades);
  }
  generateDeanBacktestReport();
  log_('INFO', `Dean strategy ${strategyId} completed with ${trades.length} trade(s).`);
}

function runDeanAiRotationBacktest() {
  runDeanStrategyBacktest('dean_ai_rotation');
}

function runDeanThemeStockBacktest() {
  runDeanStrategyBacktest('dean_theme_stock');
}

function runDeanLimitUpBacktest() {
  runDeanStrategyBacktest('dean_limit_up');
}

function runDeanLimitUpSwingBacktest() {
  runDeanStrategyBacktest('dean_limit_up_swing');
}

function runDeanFundamentalMomentumBacktest() {
  runDeanStrategyBacktest('dean_fundamental_momentum');
}

function runDeanTaiwanBullBacktest() {
  runDeanStrategyBacktest('dean_taiwan_bull');
}

function setupDeanBacktestSheets_() {
  const spreadsheet = getSpreadsheet_();
  setHeader_(getOrCreateSheet_(spreadsheet, DEAN_BACKTEST_CONFIG.tradesSheetName), getDeanBacktestTradeHeaders_());
  setHeader_(getOrCreateSheet_(spreadsheet, DEAN_BACKTEST_CONFIG.reportSheetName), getDeanBacktestReportHeaders_());
}

function clearDeanBacktestOutputs_() {
  clearSheetBody_(DEAN_BACKTEST_CONFIG.tradesSheetName);
  clearSheetBody_(DEAN_BACKTEST_CONFIG.reportSheetName);
}

function runDeanStrategy_(strategy, dayContexts) {
  if (strategy.type === 'limit_up_swing') {
    return runDeanLimitUpSwing_(strategy, dayContexts);
  }
  if (strategy.type === 'fundamental_momentum') {
    return runDeanFundamentalMomentum_(strategy, dayContexts, {});
  }
  if (strategy.type === 'taiwan_bull') {
    return runDeanTaiwanBull_(strategy, dayContexts);
  }
  return runDeanIntradayStrategy_(strategy, dayContexts);
}

function runDeanIntradayStrategy_(strategy, dayContexts) {
  const trades = [];
  const sortedKeys = Object.keys(dayContexts).sort();
  const dailyEntryCount = {};

  sortedKeys.forEach(key => {
    const context = dayContexts[key];
    const state = {
      openPositions: {},
      dailyEntryCount,
      lastExitAt: {}
    };

    context.bars.forEach((bar, index) => {
      const position = state.openPositions[bar.symbol];
      if (position) {
        const exitReason = getDeanIntradayExitReason_(strategy, position, bar, context);
        if (exitReason) {
          trades.push(closeDeanTrade_(strategy, position, bar, exitReason));
          delete state.openPositions[bar.symbol];
          state.lastExitAt[bar.symbol] = bar.timestamp.getTime();
        }
        return;
      }

      if (Object.keys(state.openPositions).length >= getDeanMaxConcurrentPositions_(strategy)) {
        return;
      }
      if (!canDeanEnterSymbolToday_(strategy, dailyEntryCount, bar)) {
        return;
      }
      if (!passesDeanCooldown_(strategy, state.lastExitAt, bar)) {
        return;
      }
      if (!shouldDeanEnter_(strategy, context, bar, index)) {
        return;
      }

      const newPosition = openDeanPosition_(strategy, bar, getDeanBudget_(strategy, bar), getDeanEntryReason_(strategy));
      if (newPosition) {
        state.openPositions[bar.symbol] = newPosition;
        incrementDeanDailyEntry_(dailyEntryCount, strategy, bar);
      }
    });
  });

  return trades;
}

function shouldDeanEnter_(strategy, context, bar, index) {
  if (bar.minuteOfDay < timeToMinutes_(DEAN_BACKTEST_CONFIG.openTime) + (strategy.entry.openDelayMinutes || 0)) {
    return false;
  }
  if (strategy.type === 'ai_rotation') {
    const symbolScore = calculateDeanRotationScore_(strategy, bar);
    const themeScore = calculateDeanThemeScore_(strategy, context, bar);
    return symbolScore >= strategy.entry.minSymbolScore &&
      themeScore >= strategy.entry.minThemeScore &&
      bar.bookImbalance >= strategy.entry.minBookImbalance &&
      bar.spreadPct <= strategy.entry.maxSpreadPct &&
      bar.volume >= strategy.entry.minTradeVolume;
  }
  if (strategy.type === 'theme_stock') {
    const levels = calculateDeanLevels_(context.bars, index, strategy);
    if (!levels) {
      return false;
    }
    const inSupportBand = bar.close <= levels.support * (1 + strategy.entry.supportTolerancePct / 100) &&
      bar.close >= levels.support * (1 - strategy.entry.supportTolerancePct / 100);
    const risk = Math.max(0.01, bar.close - levels.stopPrice);
    const reward = levels.targetPrice - bar.close;
    return inSupportBand &&
      bar.close >= levels.support &&
      bar.volume >= bar.sessionAverageVolume * strategy.entry.volumeMultiplier &&
      bar.bookImbalance >= strategy.entry.minBookImbalance &&
      reward / risk >= strategy.entry.minRewardRisk;
  }
  if (strategy.type === 'limit_up') {
    return bar.dailyChangePct >= strategy.entry.minDailyChangePct &&
      bar.dailyChangePct < strategy.entry.maxDailyChangePct &&
      bar.volume >= bar.sessionAverageVolume * strategy.entry.volumeMultiplier &&
      bar.bookImbalance >= strategy.entry.minBookImbalance;
  }
  return false;
}

function getDeanIntradayExitReason_(strategy, position, bar, context) {
  if (strategy.type === 'ai_rotation') {
    if (isDeanNearLimitUpHold_(strategy, bar)) {
      if (bar.minuteOfDay >= timeToMinutes_(strategy.exit.forceExitTime)) {
        return 'near_limit_up_eod';
      }
      return '';
    }
    if (bar.bestBid >= position.entryPrice * (1 + strategy.exit.takeProfitPct / 100)) {
      return 'take_profit';
    }
    if (bar.bestBid <= position.entryPrice * (1 - strategy.exit.stopLossPct / 100)) {
      return 'stop_loss';
    }
    if ((bar.timestamp.getTime() - position.entryTimestamp.getTime()) / 1000 >= strategy.exit.maxHoldingSeconds) {
      return 'timeout';
    }
    if (bar.minuteOfDay >= timeToMinutes_(strategy.exit.forceExitTime)) {
      return 'force_exit';
    }
    if ((bar.timestamp.getTime() - position.entryTimestamp.getTime()) / 1000 >= strategy.exit.imbalanceReversalAfterSeconds &&
        bar.bookImbalance < strategy.exit.imbalanceReversalBelow) {
      return 'imbalance_reversal';
    }
  }
  if (strategy.type === 'theme_stock') {
    if (isDeanNearLimitUpHold_(strategy, bar)) {
      if (bar.minuteOfDay >= timeToMinutes_(strategy.exit.forceExitTime)) {
        return 'near_limit_up_eod';
      }
      return '';
    }
    if (bar.close >= position.meta.targetPrice) {
      return 'target_resistance';
    }
    if (bar.close <= position.meta.stopPrice) {
      return 'support_break';
    }
    if (bar.minuteOfDay >= timeToMinutes_(strategy.exit.forceExitTime)) {
      return 'eod_force_exit';
    }
    if (bar.bookImbalance < strategy.exit.imbalanceProfitExitBelow && bar.close > position.entryPrice) {
      return 'imbalance_profit_exit';
    }
  }
  if (strategy.type === 'limit_up') {
    if (bar.dailyChangePct >= strategy.exit.takeProfitDailyChangePct) {
      if (strategy.exit.holdNearLimitUp && bar.minuteOfDay < timeToMinutes_(strategy.exit.forceExitTime)) {
        return '';
      }
      return 'near_limit_up_eod';
    }
    if (bar.dailyChangePct <= strategy.exit.stopLossDailyChangePct) {
      return 'momentum_reversal';
    }
    if (bar.minuteOfDay >= timeToMinutes_(strategy.exit.forceExitTime)) {
      return 'eod_force_exit';
    }
  }
  return '';
}

function isDeanNearLimitUpHold_(strategy, bar) {
  return strategy.exit &&
    strategy.exit.nearLimitUpHoldPct !== undefined &&
    bar.dailyChangePct >= strategy.exit.nearLimitUpHoldPct;
}

function runDeanLimitUpSwing_(strategy, dayContexts) {
  const trades = [];
  const bySymbol = groupDeanContextsBySymbol_(dayContexts);

  Object.keys(bySymbol).sort().forEach(symbol => {
    const days = bySymbol[symbol];
    for (let i = 0; i < days.length - 1; i += 1) {
      const day1 = days[i];
      const day1Change = pctChange_(day1.close, day1.open);
      if (day1Change < strategy.candidate.day1CloseChangePct) {
        continue;
      }

      const entryDay = days[i + 1];
      const entryBar = entryDay.bars.filter(bar => bar.indexInDay < strategy.entry.nextDayOpenWindowMinutes)[0];
      if (!entryBar) {
        continue;
      }
      const openDropPct = pctChange_(entryBar.close, day1.close);
      if (openDropPct < -strategy.entry.maxOpenDropPct || entryBar.bookImbalance < strategy.entry.minBookImbalance) {
        continue;
      }

      const position = openDeanPosition_(strategy, entryBar, strategy.entry.budgetTwd, 'limit_up_swing_next_day');
      if (!position) {
        continue;
      }
      position.meta.limitUpDate = day1.tradeDate;
      position.meta.day1Close = day1.close;

      const exit = findDeanSwingExit_(strategy, position, days.slice(i + 1, i + 4));
      if (exit) {
        trades.push(exit);
      }
    }
  });
  return trades;
}

function findDeanSwingExit_(strategy, position, holdingDays) {
  let highest = position.entryPrice;
  for (let dayOffset = 0; dayOffset < holdingDays.length; dayOffset += 1) {
    const context = holdingDays[dayOffset];
    for (let i = 0; i < context.bars.length; i += 1) {
      const bar = context.bars[i];
      highest = Math.max(highest, bar.high);
      if (dayOffset >= strategy.exit.maxDaysFromLimitUp - 1) {
        return closeDeanTrade_(strategy, position, bar, 'day3_force_exit');
      }
      if (dayOffset === 1 && strategy.exit.day3OpenExit && i < 15) {
        return closeDeanTrade_(strategy, position, bar, 'day3_open_exit');
      }
      if (i < 15 && pctChange_(bar.close, position.meta.day1Close) <= -strategy.exit.momentumBreakOpenDropPct) {
        return closeDeanTrade_(strategy, position, bar, 'momentum_break_open_drop');
      }
      if (pctChange_(bar.close, highest) <= -strategy.exit.trailingStopPct) {
        return closeDeanTrade_(strategy, position, bar, 'trailing_stop');
      }
      if (dayOffset === 0 && pctChange_(bar.close, position.entryPrice) <= -strategy.exit.entryDayStopPct) {
        return closeDeanTrade_(strategy, position, bar, 'entry_day_stop');
      }
      if (bar.minuteOfDay >= timeToMinutes_(strategy.exit.forceExitTime) && dayOffset >= holdingDays.length - 1) {
        return closeDeanTrade_(strategy, position, bar, 'eod_force_exit');
      }
    }
  }
  const lastDay = holdingDays[holdingDays.length - 1];
  return lastDay ? closeDeanTrade_(strategy, position, lastDay.bars[lastDay.bars.length - 1], 'end_of_data') : null;
}

function runDeanFundamentalMomentum_(strategy, dayContexts, overrides) {
  const trades = [];
  const bySymbol = groupDeanContextsBySymbol_(dayContexts);
  const minConfidence = overrides.minConfidence || strategy.entry.minConfidence;
  const maxConcurrent = overrides.maxConcurrentPositions || 999;
  let openCount = 0;

  Object.keys(bySymbol).sort().forEach(symbol => {
    if (openCount >= maxConcurrent) {
      return;
    }
    const days = bySymbol[symbol];
    const valuation = buildProxyValuation_(strategy, days);
    if (valuation.confidence < minConfidence) {
      return;
    }
    const confidenceRule = getDeanConfidenceRule_(strategy, valuation.confidence);
    const budget = (overrides.budgetTwd || strategy.risk.baseBudgetTwd) * confidenceRule.positionRatio;

    for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
      const context = days[dayIndex];
      const entryBar = findDeanFundamentalEntryBar_(strategy, context, valuation);
      if (!entryBar) {
        continue;
      }
      const position = openDeanPosition_(strategy, entryBar, budget, 'fundamental_entry_zone');
      if (!position) {
        return;
      }
      position.meta.targetPrice = valuation.targetPrice;
      position.meta.stopLossPct = confidenceRule.stopLossPct;
      position.meta.maxHoldingDays = confidenceRule.maxHoldingDays;
      trades.push(findDeanFundamentalExit_(strategy, position, days.slice(dayIndex, dayIndex + confidenceRule.maxHoldingDays + 1)));
      openCount += 1;
      return;
    }
  });
  return trades.filter(Boolean);
}

function runDeanTaiwanBull_(strategy, dayContexts) {
  const fundamental = getDeanAutoStockStrategy_(strategy.core.strategyRef);
  const swing = getDeanAutoStockStrategy_(strategy.tactical.strategyRef);
  const coreBudget = strategy.capitalTwd * strategy.core.capitalRatio / strategy.core.maxConcurrentPositions;
  const coreTrades = runDeanFundamentalMomentum_(fundamental, dayContexts, {
    minConfidence: strategy.core.minConfidence,
    maxConcurrentPositions: strategy.core.maxConcurrentPositions,
    budgetTwd: coreBudget
  }).map(trade => {
    trade.strategyId = strategy.id;
    trade.strategyName = `${strategy.name}:Core`;
    trade.entryReason = `core_${trade.entryReason}`;
    return trade;
  });

  const coreSymbols = new Set(coreTrades.map(trade => trade.symbol));
  const tacticalTrades = runDeanLimitUpSwing_(swing, dayContexts)
    .filter(trade => !strategy.conflict.skipTacticalIfCoreHeld || !coreSymbols.has(trade.symbol))
    .slice(0, strategy.tactical.maxConcurrentPositions)
    .map(trade => {
      trade.strategyId = strategy.id;
      trade.strategyName = `${strategy.name}:Tactical`;
      trade.entryReason = `tactical_${trade.entryReason}`;
      return trade;
    });
  return coreTrades.concat(tacticalTrades);
}

function findDeanFundamentalEntryBar_(strategy, context, valuation) {
  for (let i = 0; i < context.bars.length; i += 1) {
    const bar = context.bars[i];
    if (bar.minuteOfDay < timeToMinutes_(DEAN_BACKTEST_CONFIG.openTime) + strategy.entry.openDelayMinutes) {
      continue;
    }
    const lookback = context.bars.slice(Math.max(0, i - strategy.entry.directionLookbackBars), i + 1);
    const recentLow = Math.min.apply(null, lookback.map(item => item.low));
    const recentHigh = Math.max.apply(null, lookback.map(item => item.high));
    const inEntryZone = Math.abs(pctChange_(bar.close, valuation.entryPrice)) <= strategy.entry.entryTolerancePct;
    const remainingUpside = pctChange_(valuation.targetPrice, bar.close);
    if (inEntryZone &&
        recentLow >= valuation.entryPrice * (1 - strategy.entry.entryTolerancePct / 100) &&
        recentHigh > valuation.entryPrice &&
        bar.volume >= bar.sessionAverageVolume * strategy.entry.volumeMultiplier &&
        bar.bookImbalance >= strategy.entry.minBookImbalance &&
        remainingUpside >= strategy.entry.minRemainingUpsidePct) {
      return bar;
    }
  }
  return null;
}

function findDeanFundamentalExit_(strategy, position, holdingDays) {
  for (let dayOffset = 0; dayOffset < holdingDays.length; dayOffset += 1) {
    const context = holdingDays[dayOffset];
    for (let i = 0; i < context.bars.length; i += 1) {
      const bar = context.bars[i];
      if (bar.close >= position.meta.targetPrice * 0.97) {
        return closeDeanTrade_(strategy, position, bar, 'target_price_97pct');
      }
      if (bar.close <= position.entryPrice * (1 - position.meta.stopLossPct / 100)) {
        return closeDeanTrade_(strategy, position, bar, 'confidence_stop_loss');
      }
      if (dayOffset >= position.meta.maxHoldingDays) {
        return closeDeanTrade_(strategy, position, bar, 'max_holding_days');
      }
    }
  }
  const lastDay = holdingDays[holdingDays.length - 1];
  return lastDay ? closeDeanTrade_(strategy, position, lastDay.bars[lastDay.bars.length - 1], 'end_of_data') : null;
}

function buildDeanDayContexts_(barsBySymbolDate) {
  const contexts = {};
  Object.keys(barsBySymbolDate).sort().forEach(key => {
    const bars = barsBySymbolDate[key];
    if (!bars.length) {
      return;
    }
    enrichBars_(bars);
    const context = {
      key,
      symbol: bars[0].symbol,
      tradeDate: bars[0].tradeDate,
      bars,
      open: bars[0].open,
      close: bars[bars.length - 1].close,
      high: Math.max.apply(null, bars.map(bar => bar.high)),
      low: Math.min.apply(null, bars.map(bar => bar.low))
    };
    enrichDeanFeatureProxies_(context);
    context.bars.forEach(bar => {
      bar.__contextBars = context.bars;
    });
    contexts[key] = context;
  });
  return contexts;
}

function enrichDeanFeatureProxies_(context) {
  let cumulativeVolume = 0;
  context.bars.forEach((bar, index) => {
    cumulativeVolume += bar.volume;
    bar.sessionAverageVolume = cumulativeVolume / (index + 1);
    bar.dailyChangePct = pctChange_(bar.close, context.open);
    const range = Math.max(0.01, bar.high - bar.low);
    const closeLocation = (bar.close - bar.low) / range;
    const directionBoost = bar.close >= bar.open ? 0.08 : -0.08;
    bar.bookImbalance = clamp_(closeLocation + directionBoost, 0, 1);
    bar.spreadPct = Math.min(DEAN_BACKTEST_CONFIG.defaultSyntheticSpreadPct, range / bar.close * 100);
    bar.midpoint = (bar.high + bar.low) / 2;
    bar.microPrice = bar.close;
    bar.bestAsk = applySlippage_(bar.close, 0.02, 'buy');
    bar.bestBid = applySlippage_(bar.close, 0.02, 'sell');
    bar.theme = getDeanThemeForSymbol_(bar.symbol);
  });
}

function calculateDeanRotationScore_(strategy, bar) {
  const weights = strategy.scoreWeights;
  const spreadThreshold = Math.min(strategy.entry.maxSpreadPct, 0.2);
  return clamp_(
    weights.bookImbalance * bar.bookImbalance +
    weights.microPriceAboveMidpoint * (bar.microPrice > bar.midpoint ? 1 : 0) +
    weights.spreadTight * (bar.spreadPct <= spreadThreshold ? 1 : 0) +
    weights.aboveShortVwap * (bar.close >= bar.vwap ? 1 : 0) +
    weights.hasRecentVolume * (bar.volume > 0 ? 1 : 0),
    0,
    1
  );
}

function calculateDeanThemeScore_(strategy, context, bar) {
  const sameThemeBars = context.bars.filter(item => item.theme === bar.theme && item.indexInDay <= bar.indexInDay);
  const recent = sameThemeBars.slice(-5);
  if (!recent.length) {
    return calculateDeanRotationScore_(strategy, bar);
  }
  const scores = recent.map(item => calculateDeanRotationScore_(strategy, item));
  const average = sum_(scores) / scores.length;
  const breadth = scores.filter(score => score >= strategy.theme.breadthScoreThreshold).length / scores.length;
  return clamp_(average + breadth * strategy.theme.maxBreadthBonus, 0, 1);
}

function calculateDeanLevels_(bars, index, strategy) {
  if (index < 3) {
    return null;
  }
  const supportWindow = bars.slice(Math.max(0, index - strategy.levels.defaultSupportLookbackBars), index);
  const resistanceWindow = bars.slice(Math.max(0, index - strategy.levels.defaultResistanceLookbackBars), index);
  const support = Math.min.apply(null, supportWindow.map(bar => bar.low));
  const resistance = Math.max.apply(null, resistanceWindow.map(bar => bar.high));
  const targetPrice = resistance > bars[index].close ? resistance : bars[index].close * (1 + strategy.entry.defaultTargetPct / 100);
  return {
    support,
    targetPrice,
    stopPrice: support * (1 - strategy.exit.supportBreakPct / 100)
  };
}

function openDeanPosition_(strategy, bar, budget, entryReason) {
  const entryPrice = strategy.type === 'ai_rotation' ? bar.bestAsk : applySlippage_(bar.close, strategy.risk.slippagePct, 'buy');
  const quantity = strategy.type === 'ai_rotation'
    ? strategy.risk.paperQuantityLots * strategy.risk.lotSize
    : calculateShares_(entryPrice, budget);
  if (quantity <= 0) {
    return null;
  }
  const position = {
    strategyId: strategy.id,
    strategyName: strategy.name,
    symbol: bar.symbol,
    tradeDate: bar.tradeDate,
    entryTime: bar.timestampText,
    entryTimestamp: bar.timestamp,
    entryPrice,
    shares: quantity,
    entryReason,
    meta: {}
  };
  if (strategy.type === 'theme_stock') {
    const levels = calculateDeanLevels_(bar.__contextBars || [], bar.indexInDay, strategy);
    position.meta.targetPrice = levels ? levels.targetPrice : entryPrice * (1 + strategy.entry.defaultTargetPct / 100);
    position.meta.stopPrice = levels ? levels.stopPrice : entryPrice * (1 - strategy.exit.supportBreakPct / 100);
  }
  return position;
}

function closeDeanTrade_(strategy, position, bar, exitReason) {
  const risk = strategy.risk || {};
  const exitPrice = strategy.type === 'ai_rotation' ? bar.bestBid : applySlippage_(bar.close, risk.slippagePct || 0, 'sell');
  const buyAmount = position.entryPrice * position.shares;
  const sellAmount = exitPrice * position.shares;
  const buyFee = buyAmount * (risk.feeRatePct || 0) / 100;
  const sellFee = sellAmount * (risk.feeRatePct || 0) / 100;
  const tax = sellAmount * (risk.taxRatePct || 0) / 100;
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
    exitPrice,
    shares: position.shares,
    grossPnl,
    netPnl,
    returnPct: buyAmount ? netPnl / buyAmount * 100 : 0,
    holdingMinutes: Math.max(1, (bar.timestamp.getTime() - position.entryTimestamp.getTime()) / 60000),
    entryReason: position.entryReason,
    exitReason,
    cost: buyAmount + buyFee,
    proceeds: sellAmount - sellFee - tax,
    generatedAt: new Date(),
    featureMode: 'minute_bar_proxy'
  };
}

function appendDeanBacktestTrades_(trades) {
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
    trade.cost,
    trade.proceeds,
    trade.featureMode,
    trade.generatedAt
  ]);
  appendRows_(DEAN_BACKTEST_CONFIG.tradesSheetName, rows);
}

function getDeanMaxConcurrentPositions_(strategy) {
  return strategy.entry && strategy.entry.maxConcurrentPositions ? strategy.entry.maxConcurrentPositions : 999;
}

function getDeanBudget_(strategy, bar) {
  if (strategy.risk.paperQuantityLots) {
    return strategy.risk.paperQuantityLots * strategy.risk.lotSize * bar.close;
  }
  return strategy.risk.budgetTwd || strategy.risk.baseBudgetTwd || 100000;
}

function getDeanEntryReason_(strategy) {
  return strategy.type;
}

function canDeanEnterSymbolToday_(strategy, dailyEntryCount, bar) {
  const limit = strategy.entry.maxDailyEntriesPerSymbol || 1;
  const key = `${strategy.id}|${bar.symbol}|${bar.tradeDate}`;
  return (dailyEntryCount[key] || 0) < limit;
}

function incrementDeanDailyEntry_(dailyEntryCount, strategy, bar) {
  const key = `${strategy.id}|${bar.symbol}|${bar.tradeDate}`;
  dailyEntryCount[key] = (dailyEntryCount[key] || 0) + 1;
}

function passesDeanCooldown_(strategy, lastExitAt, bar) {
  if (!strategy.entry.cooldownSeconds || !lastExitAt[bar.symbol]) {
    return true;
  }
  return (bar.timestamp.getTime() - lastExitAt[bar.symbol]) / 1000 >= strategy.entry.cooldownSeconds;
}

function groupDeanContextsBySymbol_(dayContexts) {
  return Object.keys(dayContexts).sort().reduce((groups, key) => {
    const context = dayContexts[key];
    if (!groups[context.symbol]) {
      groups[context.symbol] = [];
    }
    groups[context.symbol].push(context);
    return groups;
  }, {});
}

function buildProxyValuation_(strategy, days) {
  const firstClose = days[0].close;
  return {
    entryPrice: firstClose,
    targetPrice: firstClose * (1 + strategy.valuation.defaultTargetUpsidePct / 100),
    confidence: strategy.valuation.defaultConfidence
  };
}

function getDeanConfidenceRule_(strategy, confidence) {
  const sorted = strategy.confidenceTable.slice().sort((a, b) => b.min - a.min);
  return sorted.filter(rule => confidence >= rule.min)[0] || sorted[sorted.length - 1];
}

function getDeanThemeForSymbol_(symbol) {
  const item = CONFIG.watchlist.filter(entry => normalizeSymbol_(entry.symbol) === symbol)[0];
  if (!item || !item.themes) {
    return 'unknown';
  }
  return String(item.themes).split(',')[0].trim();
}

function clamp_(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getDeanBacktestTradeHeaders_() {
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
    'cost',
    'proceeds',
    'featureMode',
    'generatedAt'
  ];
}
