function generateBacktestReport() {
  setupBacktestSheets_();
  clearSheetBody_(BACKTEST_CONFIG.reportSheetName);

  const trades = loadBacktestTrades_();
  const rows = [];
  rows.push(buildBacktestReportRow_('all', 'ALL', trades));

  const byStrategy = groupTrades_(trades, trade => trade.strategyId);
  Object.keys(byStrategy).sort().forEach(strategyId => {
    rows.push(buildBacktestReportRow_('strategy', strategyId, byStrategy[strategyId]));
  });

  const byStrategySymbol = groupTrades_(trades, trade => `${trade.strategyId}|${trade.symbol}`);
  Object.keys(byStrategySymbol).sort().forEach(key => {
    rows.push(buildBacktestReportRow_('strategy_symbol', key, byStrategySymbol[key]));
  });

  if (rows.length) {
    appendRows_(BACKTEST_CONFIG.reportSheetName, rows);
  }
  log_('INFO', `Generated backtest report with ${rows.length} row(s).`);
}

function loadBacktestTrades_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), BACKTEST_CONFIG.tradesSheetName);
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
      cost: Number(row[index.cost] || 0)
    }));
}

function buildBacktestReportRow_(level, key, trades) {
  const totalTrades = trades.length;
  const wins = trades.filter(trade => trade.netPnl > 0).length;
  const losses = trades.filter(trade => trade.netPnl < 0).length;
  const flats = totalTrades - wins - losses;
  const netPnl = sum_(trades.map(trade => trade.netPnl));
  const grossProfit = sum_(trades.filter(trade => trade.netPnl > 0).map(trade => trade.netPnl));
  const grossLoss = sum_(trades.filter(trade => trade.netPnl < 0).map(trade => trade.netPnl));
  const totalCapital = sum_(trades.map(trade => trade.cost));
  const averagePnl = totalTrades ? netPnl / totalTrades : 0;
  const averageReturnPct = totalTrades ? sum_(trades.map(trade => trade.returnPct)) / totalTrades : 0;
  const averageHoldingMinutes = totalTrades ? sum_(trades.map(trade => trade.holdingMinutes)) / totalTrades : 0;
  const winRatePct = totalTrades ? wins / totalTrades * 100 : 0;
  const profitFactor = grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : grossProfit > 0 ? 999 : 0;
  const maxDrawdown = calculateMaxDrawdown_(trades);
  const totalReturnPct = totalCapital ? netPnl / totalCapital * 100 : 0;

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
    averageHoldingMinutes
  ];
}

function calculateMaxDrawdown_(trades) {
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  trades
    .slice()
    .sort((a, b) => `${a.tradeDate} ${a.exitTime}`.localeCompare(`${b.tradeDate} ${b.exitTime}`))
    .forEach(trade => {
      equity += trade.netPnl;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.min(maxDrawdown, equity - peak);
    });

  return maxDrawdown;
}

function groupTrades_(trades, keyFn) {
  return trades.reduce((groups, trade) => {
    const key = keyFn(trade);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(trade);
    return groups;
  }, {});
}

function clearSheetBody_(sheetName) {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow > 1 && lastColumn > 0) {
    sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
  }
}

function sum_(values) {
  return values.reduce((sum, value) => sum + Number(value || 0), 0);
}

function getBacktestReportHeaders_() {
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
    'averageHoldingMinutes'
  ];
}
