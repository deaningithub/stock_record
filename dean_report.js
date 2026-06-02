function generateDeanBacktestReport() {
  setupDeanBacktestSheets_();
  clearSheetBody_(DEAN_BACKTEST_CONFIG.reportSheetName);

  const trades = loadDeanBacktestTrades_();
  const rows = [];
  rows.push(buildDeanBacktestReportRow_('all', 'ALL', trades));

  const byStrategy = groupTrades_(trades, trade => trade.strategyId);
  Object.keys(byStrategy).sort().forEach(strategyId => {
    rows.push(buildDeanBacktestReportRow_('strategy', strategyId, byStrategy[strategyId]));
  });

  const bySymbol = groupTrades_(trades, trade => trade.symbol);
  Object.keys(bySymbol).sort().forEach(symbol => {
    rows.push(buildDeanBacktestReportRow_('symbol', symbol, bySymbol[symbol]));
  });

  const byStrategySymbol = groupTrades_(trades, trade => `${trade.strategyId}|${trade.symbol}`);
  Object.keys(byStrategySymbol).sort().forEach(key => {
    rows.push(buildDeanBacktestReportRow_('strategy_symbol', key, byStrategySymbol[key]));
  });

  if (rows.length) {
    appendRows_(DEAN_BACKTEST_CONFIG.reportSheetName, rows);
  }
  log_('INFO', `Generated Dean backtest report with ${rows.length} row(s).`);
}

function loadDeanBacktestTrades_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), DEAN_BACKTEST_CONFIG.tradesSheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }

  const header = values[0].map(value => String(value));
  const index = {};
  header.forEach((name, columnIndex) => {
    index[name] = columnIndex;
  });

  return values.slice(1)
    .filter(row => row[index.strategyId] && row[index.symbol])
    .map(row => ({
      strategyId: String(row[index.strategyId]),
      strategyName: String(row[index.strategyName]),
      symbol: String(row[index.symbol]),
      tradeDate: normalizeDateKey_(row[index.tradeDate]),
      entryTime: String(row[index.entryTime]),
      exitTime: String(row[index.exitTime]),
      netPnl: Number(row[index.netPnl] || 0),
      grossPnl: Number(row[index.grossPnl] || 0),
      returnPct: Number(row[index.returnPct] || 0),
      holdingMinutes: Number(row[index.holdingMinutes] || 0),
      cost: Number(row[index.cost] || 0),
      featureMode: String(row[index.featureMode] || '')
    }));
}

function buildDeanBacktestReportRow_(level, key, trades) {
  const totalTrades = trades.length;
  const wins = trades.filter(trade => trade.netPnl > 0).length;
  const losses = trades.filter(trade => trade.netPnl < 0).length;
  const flats = totalTrades - wins - losses;
  const grossProfit = sum_(trades.filter(trade => trade.netPnl > 0).map(trade => trade.netPnl));
  const grossLoss = sum_(trades.filter(trade => trade.netPnl < 0).map(trade => trade.netPnl));
  const netPnl = sum_(trades.map(trade => trade.netPnl));
  const totalCapital = sum_(trades.map(trade => trade.cost));
  const winRatePct = totalTrades ? wins / totalTrades * 100 : 0;
  const averagePnl = totalTrades ? netPnl / totalTrades : 0;
  const averageReturnPct = totalTrades ? sum_(trades.map(trade => trade.returnPct)) / totalTrades : 0;
  const totalReturnPct = totalCapital ? netPnl / totalCapital * 100 : 0;
  const profitFactor = grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : grossProfit > 0 ? 999 : 0;
  const maxDrawdown = calculateMaxDrawdown_(trades);
  const averageHoldingMinutes = totalTrades ? sum_(trades.map(trade => trade.holdingMinutes)) / totalTrades : 0;

  return [
    new Date(),
    level,
    key,
    totalTrades,
    wins,
    losses,
    flats,
    winRatePct,
    grossProfit,
    grossLoss,
    netPnl,
    averagePnl,
    averageReturnPct,
    totalReturnPct,
    profitFactor,
    maxDrawdown,
    averageHoldingMinutes,
    'minute_bar_proxy'
  ];
}

function getDeanBacktestReportHeaders_() {
  return [
    'generatedAt',
    'level',
    'key',
    'totalTrades',
    'wins',
    'losses',
    'flats',
    'winRatePct',
    'grossProfit',
    'grossLoss',
    'netPnl',
    'averagePnl',
    'averageReturnPct',
    'totalReturnPct',
    'profitFactor',
    'maxDrawdown',
    'averageHoldingMinutes',
    'featureMode'
  ];
}
