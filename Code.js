const CONFIG = {
  spreadsheetId: '1c1COm9ppqpAgCzbtGqWQKzCPEdcH_oKsLv-qkqrT4No',
  fugleBaseUrl: 'https://api.fugle.tw/marketdata/v1.0/stock',
  configSheetName: 'Config',
  quoteSheetName: 'IntradayQuotes',
  historySheetName: 'HistoricalDaily',
  minuteReplaySheetName: 'MinuteReplay',
  allStockUniverseSheetName: 'AllStockUniverse',
  stockScanPool500SheetName: 'StockScanPool500',
  stockScanSheetName: 'DailyStockScan',
  logSheetName: 'RunLog',
  minuteBackfillDays: 60,
  minuteBackfillBatchDays: 5,
  minuteReplayBatchSize: 8,
  minuteReplayMaxRunMs: 240000,
  fugleHistoricalRequestGapMs: 1100,
  fugleRateLimitRetryMs: 61000,
  watchlist: [
    { symbol: '2382', name: '廣達', themes: 'ai_server, cloud_server, ai_datacenter, compute_infrastructure, hot_rotation' },
    { symbol: '1301', name: '台塑', themes: 'plastics, traditional_industry' },
    { symbol: '1304', name: '台聚', themes: 'plastics, petrochemical, traditional_industry' },
    { symbol: '1326', name: '台化', themes: 'plastics, traditional_industry' },
    { symbol: '6505', name: '台塑化', themes: 'petrochemical, traditional_industry' },
    { symbol: '2408', name: '南亞科', themes: 'memory, hot_rotation' },
    { symbol: '1513', name: '中興電', themes: 'power, heavy_electric, hot_rotation' },
    { symbol: '3163', name: '波若威', themes: 'optical_cpo, optical_communication, cpo, quantum_photonics, ai_datacenter, hot_rotation' },
    { symbol: '2344', name: '華邦電', themes: 'memory, hot_rotation' },
    { symbol: '3481', name: '群創', themes: 'panel, hot_rotation' },
    { symbol: '2313', name: '華通', themes: 'pcb_ccl, high_frequency_pcb, leo_satellite, ai_server, hot_rotation' },
    { symbol: '3491', name: '昇達科', themes: 'leo_satellite, satellite_ground_equipment, rf, communications, space_ai, lunar_space, hot_rotation' },
    { symbol: '5274', name: '信驊', themes: 'asic, semiconductor, hot_rotation' },
    { symbol: '3017', name: '奇鋐', themes: 'cooling, ai_server, hot_rotation' },
    { symbol: '6285', name: '啟碁', themes: 'communications, networking, satellite_terminal, leo_satellite, cloud_networking' },
    { symbol: '2368', name: '金像電', themes: 'pcb_ccl, ai_server, hot_rotation' },
    { symbol: '00981A', name: '主動統一台股增長', themes: 'active_etf, hot_rotation' },
    { symbol: '2359', name: '所羅門', themes: 'robotics, automation, hot_rotation' },
    { symbol: '2464', name: '盟立', themes: 'robotics, automation' },
    { symbol: '2383', name: '台光電', themes: 'pcb_ccl, high_frequency_pcb, ai_server, leo_satellite, hot_rotation' },
    { symbol: '2454', name: '聯發科', themes: 'semiconductor, edge_ai, hot_rotation' },
    { symbol: '3231', name: '緯創', themes: 'ai_server, cloud_server, ai_datacenter, compute_infrastructure, hot_rotation' },
    { symbol: '1519', name: '華城', themes: 'heavy_electric, power, hot_rotation' },
    { symbol: '2409', name: '友達', themes: 'panel, hot_rotation' },
    { symbol: '2330', name: '台積電', themes: 'semiconductor, ai_chip, hot_rotation' },
    { symbol: '2308', name: '台達電', themes: 'power, heavy_electric, ai_power_infrastructure, ai_server, ev, robotics, datacenter, hot_rotation' },
    { symbol: '6669', name: '緯穎', themes: 'ai_server, cloud_server, ai_datacenter, compute_infrastructure, hot_rotation' },
    { symbol: '2317', name: '鴻海', themes: 'ai_server, ev, hot_rotation' },
    { symbol: '3711', name: '日月光投控', themes: 'semiconductor, ic_packaging, hot_rotation' },
    { symbol: '1802', name: '台玻', themes: 'glass, traditional_industry' },
    { symbol: '2303', name: '聯電', themes: 'semiconductor, foundry, large_cap' },
    { symbol: '2327', name: '國巨', themes: 'passive_components, large_cap' },
    { symbol: '3037', name: '欣興', themes: 'pcb_ic_substrate, ai_server, hot_rotation' },
    { symbol: '2881', name: '富邦金', themes: 'financial, large_cap' },
    { symbol: '2345', name: '智邦', themes: 'networking, cloud_networking, ai_server, ai_datacenter, compute_infrastructure, hot_rotation' },
    { symbol: '2891', name: '中信金', themes: 'financial, large_cap' },
    { symbol: '2882', name: '國泰金', themes: 'financial, large_cap' },
    { symbol: '2412', name: '中華電', themes: 'telecom, defensive, large_cap' },
    { symbol: '2360', name: '致茂', themes: 'testing_equipment, ev, ai_server, robotics, precision_equipment' },
    { symbol: '1303', name: '南亞', themes: 'plastics, pcb_ccl, traditional_industry' },
    { symbol: '2885', name: '元大金', themes: 'financial, brokerage, large_cap' },
    { symbol: '2887', name: '台新金', themes: 'financial, large_cap' },
    { symbol: '2357', name: '華碩', themes: 'pc, ai_pc, large_cap' },
    { symbol: '2886', name: '兆豐金', themes: 'financial, large_cap' },
    { symbol: '3443', name: '創意', themes: 'asic, semiconductor, hot_rotation' },
    { symbol: '8046', name: '南電', themes: 'pcb_ic_substrate, ai_server, hot_rotation' },
    { symbol: '3653', name: '健策', themes: 'cooling, thermal, semiconductor, ai_server, ai_datacenter, hot_rotation' },
    { symbol: '2301', name: '光寶科', themes: 'power, ai_power_infrastructure, ai_server, cloud_server, ev, hot_rotation' },
    { symbol: '4958', name: '臻鼎-KY', themes: 'pcb, ai_server, hot_rotation' },
    { symbol: '2884', name: '玉山金', themes: 'financial, large_cap' },
    { symbol: '3008', name: '大立光', themes: 'optical_lens, large_cap' },
    { symbol: '2603', name: '長榮', themes: 'shipping, cyclical' },
    { symbol: '2059', name: '川湖', themes: 'server_rails, ai_server, hot_rotation' },
    { symbol: '2880', name: '華南金', themes: 'financial, large_cap' },
    { symbol: '3665', name: '貿聯-KY', themes: 'cable_harness, ai_server, ev, robotics, drone, hot_rotation' },
    { symbol: '2395', name: '研華', themes: 'industrial_pc, edge_ai, robotics, cloud_infrastructure, drone' },
    { symbol: '2890', name: '永豐金', themes: 'financial, large_cap' },
    { symbol: '2883', name: '開發金', themes: 'financial, large_cap' },
    { symbol: '2892', name: '第一金', themes: 'financial, large_cap' },
    { symbol: '1216', name: '統一', themes: 'consumer, defensive, large_cap' },
    { symbol: '2449', name: '京元電子', themes: 'semiconductor_testing, ai_chip' },
    { symbol: '3661', name: '世芯-KY', themes: 'asic, semiconductor, hot_rotation' },
    { symbol: '3036', name: '文曄', themes: 'semiconductor_distribution, large_cap' },
    { symbol: '5880', name: '合庫金', themes: 'financial, large_cap' },
    { symbol: '4904', name: '遠傳', themes: 'telecom, defensive' },
    { symbol: '3045', name: '台灣大', themes: 'telecom, defensive' },
    { symbol: '3189', name: '景碩', themes: 'pcb_ic_substrate, semiconductor' },
    { symbol: '2379', name: '瑞昱', themes: 'semiconductor, edge_ai' },
    { symbol: '2356', name: '英業達', themes: 'ai_server, notebook, hot_rotation' },
    { symbol: '3034', name: '聯詠', themes: 'display_driver, semiconductor' },
    { symbol: '2337', name: '旺宏', themes: 'memory, hot_rotation' },
    { symbol: '6515', name: '穎崴', themes: 'semiconductor_testing, ai_chip, hot_rotation' },
    { symbol: '2002', name: '中鋼', themes: 'steel, traditional_industry' },
    { symbol: '3533', name: '嘉澤', themes: 'connectors, ai_server, ai_datacenter, robotics, ev' },
    { symbol: '1590', name: '亞德客-KY', themes: 'automation, robotics, motion_control' },
    { symbol: '2207', name: '和泰車', themes: 'auto, traditional_industry' },
    { symbol: '3044', name: '健鼎', themes: 'pcb, large_cap' },
    { symbol: '2376', name: '技嘉', themes: 'ai_pc, server, hot_rotation' },
    { symbol: '4938', name: '和碩', themes: 'ems, ai_pc, large_cap' },
    { symbol: '6239', name: '力成', themes: 'semiconductor_packaging, memory' },
    { symbol: '2912', name: '統一超', themes: 'consumer, defensive' },
    { symbol: '2801', name: '彰銀', themes: 'financial, large_cap' },
    { symbol: '2615', name: '萬海', themes: 'shipping, cyclical' },
    { symbol: '6415', name: '矽力*-KY', themes: 'power_ic, semiconductor' },
    { symbol: '2404', name: '漢唐', themes: 'semiconductor_equipment, facility' },
    { symbol: '2888', name: '新光金', themes: 'financial, large_cap' },
    { symbol: '2492', name: '華新科', themes: 'passive_components, hot_rotation' },
    { symbol: '2324', name: '仁寶', themes: 'notebook, ai_pc' },
    { symbol: '2618', name: '長榮航', themes: 'airline, tourism' },
    { symbol: '5871', name: '中租-KY', themes: 'leasing, financial' },
    { symbol: '3702', name: '大聯大', themes: 'semiconductor_distribution' },
    { symbol: '5876', name: '上海商銀', themes: 'financial, large_cap' },
    { symbol: '1504', name: '東元', themes: 'motor, robotics, ev, power, ai_power_infrastructure, hot_rotation' },
    { symbol: '1101', name: '台泥', themes: 'cement, traditional_industry' },
    { symbol: '1605', name: '華新', themes: 'cable, power, traditional_industry' },
    { symbol: '2609', name: '陽明', themes: 'shipping, cyclical' },
    { symbol: '6139', name: '亞翔', themes: 'semiconductor_equipment, facility' },
    { symbol: '8210', name: '勤誠', themes: 'server_chassis, ai_server, hot_rotation' },
    { symbol: '6531', name: '愛普*', themes: 'memory, semiconductor, hot_rotation' },
    { symbol: '6789', name: '采鈺', themes: 'semiconductor, optical_sensor, space_ai, lunar_space' },
    { symbol: '2367', name: '燿華', themes: 'leo_satellite, pcb, high_frequency_pcb, space_ai, hot_rotation' },
    { symbol: '2314', name: '台揚', themes: 'leo_satellite, satellite_ground_equipment, rf, communications' },
    { symbol: '3138', name: '耀登', themes: 'leo_satellite, antenna, rf_testing, communications, hot_rotation' },
    { symbol: '2485', name: '兆赫', themes: 'leo_satellite, rf, communications' },
    { symbol: '6568', name: '宏觀', themes: 'leo_satellite, rf_ic, communications' },
    { symbol: '6672', name: '騰輝電子-KY', themes: 'leo_satellite, high_frequency_pcb, aerospace_materials' },
    { symbol: '3363', name: '上詮', themes: 'cpo, silicon_photonics, optical_communication, quantum_photonics, ai_datacenter, hot_rotation' },
    { symbol: '4979', name: '華星光', themes: 'optical_communication, cpo, ai_datacenter, hot_rotation' },
    { symbol: '3234', name: '光環', themes: 'optical_communication, photonics, quantum_photonics, ai_datacenter' },
    { symbol: '6442', name: '光聖', themes: 'optical_communication, cpo, ai_datacenter, hot_rotation' },
    { symbol: '3081', name: '聯亞', themes: 'optical_communication, laser, silicon_photonics, quantum_photonics' },
    { symbol: '4908', name: '前鼎', themes: 'optical_communication, photonics, ai_datacenter' },
    { symbol: '6451', name: '訊芯-KY', themes: 'advanced_packaging, silicon_photonics, cpo, ai_chip' },
    { symbol: '6829', name: '千附精密', themes: 'quantum_compute, precision_equipment, semiconductor_equipment, hot_rotation' },
    { symbol: '8033', name: '雷虎', themes: 'drone, uav, defense, robotics, hot_rotation' },
    { symbol: '5371', name: '中光電', themes: 'drone, uav, robotics, optical_sensor, defense' },
    { symbol: '4916', name: '事欣科', themes: 'drone, defense, rugged_computing, uav' },
    { symbol: '3416', name: '融程電', themes: 'drone, rugged_computing, industrial_pc, defense' },
    { symbol: '4551', name: '智伸科', themes: 'ev, automotive_electronics, robotics, precision_components' },
    { symbol: '1536', name: '和大', themes: 'ev, robotics, gear_reducer, automotive_components' },
    { symbol: '8374', name: '羅昇', themes: 'robotics, automation, motion_control, hot_rotation' },
    { symbol: '4562', name: '穎漢', themes: 'robotics, automation, machine_tool, hot_rotation' },
    { symbol: '6640', name: '均華', themes: 'semiconductor_equipment, ai_chip, automation' },
    { symbol: '3324', name: '雙鴻', themes: 'cooling, thermal, ai_server, ai_datacenter, hot_rotation' },
    { symbol: '6274', name: '台燿', themes: 'pcb_ccl, high_frequency_pcb, ai_server, leo_satellite' },
    { symbol: '5439', name: '高技', themes: 'pcb, ai_server, high_frequency_pcb' },
    { symbol: '3013', name: '晟銘電', themes: 'server_chassis, ai_server, cloud_server' },
    { symbol: '6414', name: '樺漢', themes: 'edge_ai, industrial_pc, robotics, cloud_infrastructure' },
    { symbol: '3029', name: '零壹', themes: 'cloud_service, cybersecurity, ai_cloud' },
    { symbol: '6214', name: '精誠', themes: 'cloud_service, cybersecurity, ai_cloud' },
    { symbol: '3576', name: '聯合再生', themes: 'space_power, perovskite, lunar_space, solar' },
    { symbol: '6443', name: '元晶', themes: 'space_power, perovskite, lunar_space, solar' },
    { symbol: '5483', name: '中美晶', themes: 'space_power, perovskite, semiconductor_materials, lunar_space' },
    { symbol: '3508', name: '位速', themes: 'space_power, perovskite, lunar_space' }
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
    .addItem('Refresh all-stock universe', 'refreshAllStockUniverseWeekly')
    .addItem('Refresh 500-stock scan pool', 'refreshStockScanPool500Daily')
    .addItem('Run daily stock scan', 'runDailyStockScan')
    .addItem('Run daily stock scan manually', 'runDailyStockScanManual')
    .addItem('Monitor bad-news signals', 'monitorBadNewsSignals')
    .addItem('Refresh limit-up external evidence', 'refreshLimitUpExternalEvidence')
    .addItem('Setup limit-up external evidence', 'setupLimitUpExternalEvidenceSheet')
    .addSeparator()
    .addItem('Start 60-day minute backfill', 'startMinuteReplayBackfill60Days')
    .addItem('Continue minute backfill now', 'continueMinuteReplayBackfill')
    .addItem('Stop minute backfill', 'stopMinuteReplayBackfill')
    .addSeparator()
    .addItem('One-click setup V1.2.3 triggers', 'installV123ProjectTriggers')
    .addItem('One-click setup V2.4 triggers', 'installV24ProjectTriggers')
    .addItem('One-click setup recommended triggers', 'oneClickSetupProjectTriggers')
    .addItem('Audit project triggers', 'auditProjectTriggers')
    .addItem('Install stock trigger: every 1 day', 'installRecordTriggerEvery1Day')
    .addItem('Install GAS realtime snapshot trigger', 'installGasRealtimeSnapshotTrigger')
    .addItem('Install AI valuation trigger: 09:00', 'installAiValuationTriggerAt9')
    .addItem('Install weekly 3-month valuation trigger', 'installWeeklyThreeMonthValuationTrigger')
    .addItem('Install all-stock universe trigger', 'installAllStockUniverseTrigger')
    .addItem('Install 500-stock pool trigger', 'installStockScanPool500Trigger')
    .addItem('Install daily stock scan trigger', 'installDailyStockScanTrigger')
    .addItem('Install bad-news monitor trigger', 'installBadNewsMonitorTrigger')
    .addItem('Install limit-up evidence trigger', 'installLimitUpExternalEvidenceTrigger')
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
  const allStockUniverseSheet = getOrCreateSheet_(spreadsheet, CONFIG.allStockUniverseSheetName);
  const stockScanPool500Sheet = getOrCreateSheet_(spreadsheet, CONFIG.stockScanPool500SheetName);
  const stockScanSheet = getOrCreateSheet_(spreadsheet, CONFIG.stockScanSheetName);
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

  setHeader_(allStockUniverseSheet, getAllStockUniverseHeaders_());
  setHeader_(stockScanPool500Sheet, getStockScanPool500Headers_());
  setHeader_(stockScanSheet, getDailyStockScanHeaders_());
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
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    log_('WARN', 'Skipped minute replay collection because the previous run is still active.');
    return;
  }

  try {
    setupMinuteReplaySheet_();
    if (!isTaiwanMarketCollectionWindow_(new Date())) {
      log_('INFO', 'Skipped minute replay collection outside Taiwan market replay window.');
      return;
    }

    const symbols = getEnabledSymbols_();
    if (!symbols.length) {
      log_('WARN', 'Skipped minute replay collection because no enabled symbols were found.');
      return;
    }

    const cursor = createSymbolBatchCursor_(
      symbols,
      'MINUTE_REPLAY_SYMBOL_INDEX',
      CONFIG.minuteReplayBatchSize,
      CONFIG.minuteReplayMaxRunMs
    );
    let written = 0;
    let processed = 0;
    let errors = 0;

    while (cursor.hasNext()) {
      const symbol = cursor.next();
      try {
        const count = appendNewMinuteReplayCandles_(symbol);
        written += count;
      } catch (error) {
        errors += 1;
        log_('ERROR', `Minute replay failed for ${symbol}: ${error.message}`);
      }
      processed += 1;
      cursor.save();
    }

    log_('INFO', `Minute replay processed ${processed}/${symbols.length} symbol(s), wrote ${written} new row(s), errors=${errors}, nextCursor=${cursor.index()}.`);
  } finally {
    lock.releaseLock();
  }
}

function setupMinuteReplaySheet_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.minuteReplaySheetName);
  setHeader_(sheet, [
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
    return CONFIG.defaultSymbols.filter(isValidTaiwanSymbol_);
  }

  return values.slice(1)
    .filter(row => String(row[0] || '').trim() && row[1] !== false && String(row[1]).toLowerCase() !== 'false')
    .map(row => normalizeSymbol_(row[0]))
    .filter(isValidTaiwanSymbol_)
    .filter(Boolean);
}

function syncWatchlistRows_(sheet) {
  formatSymbolColumnsAsText_(sheet);
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
    const themes = mergeThemeTokens_(current.themes, item.themes);
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

function mergeThemeTokens_(currentThemes, defaultThemes) {
  const merged = [];
  const seen = {};
  [currentThemes, defaultThemes].forEach(value => {
    String(value || '')
      .split(',')
      .map(token => token.trim())
      .filter(Boolean)
      .forEach(token => {
        const key = token.toLowerCase();
        if (seen[key]) {
          return;
        }
        seen[key] = true;
        merged.push(key);
      });
  });
  return merged.join(', ');
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
  formatSymbolColumnsAsText_(sheet);
  const range = sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length);
  formatSymbolColumnsAsText_(sheet, range.getRow(), range.getNumRows());
  range.setValues(rows);
}

function setHeader_(sheet, headers) {
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight('bold');
  sheet.setFrozenRows(1);
  formatSymbolColumnsAsText_(sheet);
}

function formatSymbolColumnsAsText_(sheet, startRow, numRows) {
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) {
    return;
  }
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(header => String(header));
  headers.forEach((header, index) => {
    if (header !== 'symbol') {
      return;
    }
    const row = startRow || 1;
    const rows = numRows || sheet.getMaxRows();
    sheet.getRange(row, index + 1, rows, 1).setNumberFormat('@');
  });
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

function isValidTaiwanSymbol_(symbol) {
  return /^\d{4,6}[A-Z]?$/.test(String(symbol || ''));
}

function createSymbolBatchCursor_(symbols, propertyName, batchSize, maxRunMs) {
  const properties = PropertiesService.getScriptProperties();
  const total = symbols.length;
  let cursor = Number(properties.getProperty(propertyName) || '0');
  if (!Number.isInteger(cursor) || cursor < 0 || cursor >= total) {
    cursor = 0;
  }
  const startedAt = Date.now();
  const limit = Math.min(Math.max(Number(batchSize) || 1, 1), total);
  let processed = 0;

  return {
    hasNext() {
      return processed < limit && Date.now() - startedAt < maxRunMs;
    },
    next() {
      const symbol = symbols[cursor];
      cursor = (cursor + 1) % total;
      processed += 1;
      return symbol;
    },
    save() {
      properties.setProperty(propertyName, String(cursor));
    },
    index() {
      return cursor;
    }
  };
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
