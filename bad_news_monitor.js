const BAD_NEWS_CONFIG = {
  sheetName: 'BadNewsMonitor',
  handlerName: 'monitorBadNewsSignals',
  continuationHandlerName: 'continueBadNewsSignals',
  timezone: 'Asia/Taipei',
  openAiBaseUrl: 'https://api.openai.com/v1',
  openAiModel: 'gpt-5',
  maxSymbolsPerRun: 8,
  symbolUniverseLimit: 21,
  continuationMinutes: 5,
  maxRunMs: 240000,
  maxOutputTokens: 6000,
  lookbackHours: 24,
  blockEntryRiskScore: 75,
  forceExitRiskScore: 85,
  severityRanks: {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
    watch: 1,
    serious: 3,
    critical: 4
  }
};

function monitorBadNewsSignals() {
  return runBadNewsSignalsBatch_(false);
}

function continueBadNewsSignals() {
  return runBadNewsSignalsBatch_(true);
}

function runBadNewsSignalsBatch_(continuation) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    log_('WARN', 'Skipped bad-news monitor because the previous run is still active.');
    return 0;
  }

  try {
    setupBadNewsMonitorSheet_();
    const now = new Date();
    const sessionKey = getBadNewsMonitorSessionKey_(now);
    if (!sessionKey) {
      log_('INFO', `Skipped bad-news monitor outside ${getTriggerProfileMode_()} refresh windows.`);
      return 0;
    }

    const symbols = getBadNewsMonitorSymbols_();
    if (!symbols.length) {
      log_('WARN', 'Skipped bad-news monitor because no enabled symbols were found.');
      return 0;
    }

    const properties = PropertiesService.getScriptProperties();
    const activeSessionKey = 'BAD_NEWS_ACTIVE_SESSION';
    const completedSessionKey = 'BAD_NEWS_COMPLETED_SESSION';
    const cursorKey = 'BAD_NEWS_SYMBOL_INDEX';

    if (!continuation && properties.getProperty(completedSessionKey) === sessionKey) {
      log_('INFO', `Skipped bad-news monitor because session ${sessionKey} is already complete.`);
      return 0;
    }
    if (properties.getProperty(activeSessionKey) !== sessionKey) {
      properties.setProperty(activeSessionKey, sessionKey);
      properties.setProperty(cursorKey, '0');
    }

    let cursor = Number(properties.getProperty(cursorKey) || '0');
    if (!Number.isInteger(cursor) || cursor < 0 || cursor >= symbols.length) {
      cursor = 0;
    }

    const batch = symbols.slice(cursor, cursor + BAD_NEWS_CONFIG.maxSymbolsPerRun);
    if (!batch.length) {
      completeBadNewsSession_(sessionKey);
      return 0;
    }

    try {
      const inputs = buildBadNewsInputs_(batch);
      const result = callOpenAiBadNewsMonitor_(inputs);
      writeBadNewsMonitorResult_(result, inputs);
      cursor += batch.length;
      properties.setProperty(cursorKey, String(cursor));
      log_('INFO', `Bad-news monitor session=${sessionKey} processed ${batch.length} symbol(s), wrote ${result.signals.length} signal row(s), cursor=${Math.min(cursor, symbols.length)}/${symbols.length}.`);
    } catch (error) {
      log_('ERROR', `Bad-news monitor session=${sessionKey} batch failed at cursor=${cursor}: ${error.message}`);
      installBadNewsContinuationTrigger_();
      return 0;
    }

    if (cursor < symbols.length) {
      installBadNewsContinuationTrigger_();
    } else {
      completeBadNewsSession_(sessionKey);
      log_('INFO', `Bad-news monitor completed session=${sessionKey} for ${symbols.length} symbol(s).`);
    }
    return batch.length;
  } finally {
    lock.releaseLock();
  }
}

function setupBadNewsMonitorSheet_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), BAD_NEWS_CONFIG.sheetName);
  setHeader_(sheet, getBadNewsMonitorHeaders_());
}

function buildBadNewsInputs_(symbols) {
  const configRows = getConfigRowsBySymbol_();
  const dailyScanRows = getDailyStockScanRowsForSymbols_(symbols);
  const latestValuations = getLatestSheetRowsBySymbol_(AI_VALUATION_CONFIG.sheetName, 'symbol', 'generatedAt');
  const latestQuotes = getLatestSheetRowsBySymbol_(CONFIG.quoteSheetName, 'symbol', 'recordedAt', 10000);
  const generatedAt = new Date();

  return {
    generatedAt: generatedAt.toISOString(),
    generatedDateTaipei: Utilities.formatDate(generatedAt, BAD_NEWS_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
    lookbackHours: BAD_NEWS_CONFIG.lookbackHours,
    symbols: symbols.map(symbol => {
      const config = configRows[symbol] || {};
      return {
        symbol,
        name: config.name || '',
        themes: config.themes || '',
        dailyScan: dailyScanRows[symbol] || {},
        latestValuation: latestValuations[symbol] || {},
        latestQuote: latestQuotes[symbol] || {}
      };
    })
  };
}

function callOpenAiBadNewsMonitor_(inputs) {
  const payload = {
      model: BAD_NEWS_CONFIG.openAiModel,
      reasoning: { effort: 'low' },
      max_output_tokens: BAD_NEWS_CONFIG.maxOutputTokens,
      tools: [{
        type: 'web_search',
        user_location: {
          type: 'approximate',
          country: 'TW',
          city: 'Taipei',
          region: 'Taipei',
          timezone: BAD_NEWS_CONFIG.timezone
        }
      }],
      tool_choice: 'auto',
      include: ['web_search_call.action.sources'],
      instructions: [
        'You are a Taiwan equity risk monitor.',
        'Detect credible bad-news signals that could invalidate a bullish valuation or limit-up momentum setup.',
        'Separate real material negatives from routine volatility, rumors, and repeated old news.',
        'Use severity only from: none, watch, serious, critical.',
        'Be conservative with force-exit decisions: only critical or clearly material negative news should force exit.',
        'Keep every per-symbol text field concise: headlineSummary <= 100 chars, evidence <= 160 chars, reasoning <= 160 chars.',
        'Use at most 2 source URLs per symbol.',
        'Return only JSON matching the schema.'
      ].join('\n'),
      input: buildBadNewsPrompt_(inputs),
      text: {
        format: {
          type: 'json_schema',
          name: 'taiwan_stock_bad_news_monitor',
          strict: true,
          schema: getBadNewsJsonSchema_()
        }
      }
  };

  return parseBadNewsResponse_(fetchOpenAiResponsesWithRetry_(
    `${BAD_NEWS_CONFIG.openAiBaseUrl}/responses`,
    payload,
    getOpenAiApiKey_(),
    'bad-news monitor'
  ));
}

function buildBadNewsPrompt_(inputs) {
  return [
    `Now: ${inputs.generatedDateTaipei} (${BAD_NEWS_CONFIG.timezone}).`,
    `Look back roughly ${inputs.lookbackHours} hours for each Taiwan stock.`,
    '',
    'Search current news, exchange disclosures, company announcements, analyst downgrades, macro/geopolitical shocks, US market read-through, supply-chain weakness, legal/regulatory issues, credit stress, dilution, customer cuts, production disruption, accounting issues, and ETF/sector-specific negatives.',
    'For each symbol, decide whether there is a credible bad-news signal that should block new entries or force exit existing positions.',
    'The monitored symbols are the DailyStockScan top 21 ranked names when available. Use dailyScan context to prioritize active top-ranked candidates.',
    'Use latest valuation and quote context, but do not let bullish valuation override material negative evidence.',
    '',
    'Risk scoring guide:',
    '- 0-24: none/no material negative',
    '- 25-49: low concern',
    '- 50-74: medium concern, watch but not automatic block',
    `- ${BAD_NEWS_CONFIG.blockEntryRiskScore}-84: high concern, block new entries`,
    `- ${BAD_NEWS_CONFIG.forceExitRiskScore}-100: critical concern, force exit unless explicitly contradicted by reliable evidence`,
    '',
    'Symbols and local context:',
    JSON.stringify(inputs.symbols)
  ].join('\n');
}

function parseBadNewsResponse_(responseJson) {
  const text = extractOpenAiOutputText_(responseJson);
  if (!text) {
    throw new Error('OpenAI bad-news response did not contain output text.');
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const preview = text.slice(Math.max(0, text.length - 500));
    throw new Error(`OpenAI bad-news JSON parse failed: ${error.message}. outputLength=${text.length}. tail=${preview}`);
  }
  if (!parsed.signals || !Array.isArray(parsed.signals)) {
    throw new Error('OpenAI bad-news response missing signals array.');
  }
  return parsed;
}

function writeBadNewsMonitorResult_(result, inputs) {
  const runId = `bad_news_${Utilities.formatDate(new Date(), BAD_NEWS_CONFIG.timezone, 'yyyyMMdd_HHmmss')}`;
  const inputBySymbol = {};
  inputs.symbols.forEach(item => {
    inputBySymbol[item.symbol] = item;
  });

  const rows = result.signals.map(signal => {
    const symbol = normalizeSymbol_(signal.symbol);
    const input = inputBySymbol[symbol] || {};
    const riskScore = Number(signal.riskScore || 0);
    const severity = normalizeBadNewsSeverity_(signal.severity || 'none');
    return [
      new Date(),
      runId,
      symbol,
      signal.name || input.name || '',
      input.themes || '',
      riskScore,
      severity,
      signal.riskType || '',
      signal.shouldBlockEntry === true || riskScore >= BAD_NEWS_CONFIG.blockEntryRiskScore,
      signal.shouldForceExit === true || riskScore >= BAD_NEWS_CONFIG.forceExitRiskScore,
      signal.headlineSummary || '',
      signal.evidence || '',
      signal.reasoning || '',
      (signal.sources || []).join('\n'),
      result.marketRiskSummary || '',
      BAD_NEWS_CONFIG.openAiModel
    ];
  });

  if (rows.length) {
    appendRows_(BAD_NEWS_CONFIG.sheetName, rows);
  }
}

function isBadNewsMonitorWindow_(date) {
  return Boolean(getBadNewsMonitorSessionKey_(date));
}

function getBadNewsMonitorSymbols_() {
  const topScanSymbols = getDailyStockScanTopSymbols_(BAD_NEWS_CONFIG.symbolUniverseLimit);
  if (topScanSymbols.length) {
    log_('INFO', `Bad-news monitor using DailyStockScan top ${topScanSymbols.length} symbol(s): ${topScanSymbols.join(', ')}.`);
    return topScanSymbols;
  }

  const fallbackSymbols = getEnabledSymbols_().slice(0, BAD_NEWS_CONFIG.symbolUniverseLimit);
  log_('WARN', `Bad-news monitor fell back to Config enabled symbols because DailyStockScan has no top-ranked rows. symbolCount=${fallbackSymbols.length}.`);
  return fallbackSymbols;
}

function getDailyStockScanTopSymbols_(limit) {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.stockScanSheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(header => String(header));
  const symbolIndex = headers.indexOf('symbol');
  const rankIndex = headers.indexOf('rank');
  const topPickIndex = headers.indexOf('isTopPick');
  const scoreIndex = headers.indexOf('score');
  if (symbolIndex === -1) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const seen = {};
  return values
    .map((row, rowIndex) => ({
      symbol: normalizeSymbol_(row[symbolIndex]),
      rank: Number(rankIndex === -1 ? rowIndex + 1 : row[rankIndex]),
      isTopPick: topPickIndex !== -1 && (row[topPickIndex] === true || String(row[topPickIndex]).toLowerCase() === 'true'),
      score: Number(scoreIndex === -1 ? 0 : row[scoreIndex]),
      rowIndex
    }))
    .filter(item => {
      if (!item.symbol || seen[item.symbol]) {
        return false;
      }
      seen[item.symbol] = true;
      return true;
    })
    .sort((left, right) => {
      const leftRank = Number.isFinite(left.rank) && left.rank > 0 ? left.rank : 999999;
      const rightRank = Number.isFinite(right.rank) && right.rank > 0 ? right.rank : 999999;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      if (left.isTopPick !== right.isTopPick) {
        return left.isTopPick ? -1 : 1;
      }
      if (Number.isFinite(left.score) && Number.isFinite(right.score) && left.score !== right.score) {
        return right.score - left.score;
      }
      return left.rowIndex - right.rowIndex;
    })
    .slice(0, limit)
    .map(item => item.symbol);
}

function getDailyStockScanRowsForSymbols_(symbols) {
  const wanted = {};
  symbols.forEach(symbol => {
    const normalized = normalizeSymbol_(symbol);
    if (normalized) {
      wanted[normalized] = true;
    }
  });

  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.stockScanSheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) {
    return {};
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(header => String(header));
  const symbolIndex = headers.indexOf('symbol');
  const rankIndex = headers.indexOf('rank');
  if (symbolIndex === -1) {
    return {};
  }

  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const latest = {};
  values.forEach((row, rowIndex) => {
    const symbol = normalizeSymbol_(row[symbolIndex]);
    if (!symbol || !wanted[symbol]) {
      return;
    }

    const current = latest[symbol];
    const rank = Number(rankIndex === -1 ? rowIndex + 1 : row[rankIndex]);
    const currentRank = current ? Number(current.rank) : NaN;
    if (!current || !Number.isFinite(currentRank) || (Number.isFinite(rank) && rank < currentRank)) {
      const item = {};
      headers.forEach((header, columnIndex) => {
        item[header] = normalizeAiInputValue_(row[columnIndex]);
      });
      latest[symbol] = item;
    }
  });
  return latest;
}

function getBadNewsMonitorSessionKey_(date) {
  if (isWeekendTaipei_(date)) {
    return '';
  }
  const hhmm = Number(Utilities.formatDate(date, BAD_NEWS_CONFIG.timezone, 'HHmm'));
  const dateKey = Utilities.formatDate(date, BAD_NEWS_CONFIG.timezone, 'yyyy-MM-dd');
  if (getTriggerProfileMode_() === 'v24') {
    if (hhmm >= 735 && hhmm <= 835) {
      return `${dateKey}_open`;
    }
    if (hhmm >= 1045 && hhmm <= 1135) {
      return `${dateKey}_midday`;
    }
    return '';
  }
  if (hhmm >= 630 && hhmm <= 735) {
    return `${dateKey}_open`;
  }
  return '';
}

function installBadNewsContinuationTrigger_() {
  removeTriggersFor_(BAD_NEWS_CONFIG.continuationHandlerName);
  ScriptApp.newTrigger(BAD_NEWS_CONFIG.continuationHandlerName)
    .timeBased()
    .everyMinutes(BAD_NEWS_CONFIG.continuationMinutes)
    .create();
  log_('INFO', `Installed bad-news continuation trigger every ${BAD_NEWS_CONFIG.continuationMinutes} minutes.`);
}

function completeBadNewsSession_(sessionKey) {
  removeTriggersFor_(BAD_NEWS_CONFIG.continuationHandlerName);
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('BAD_NEWS_COMPLETED_SESSION', sessionKey);
  properties.deleteProperty('BAD_NEWS_ACTIVE_SESSION');
  properties.deleteProperty('BAD_NEWS_SYMBOL_INDEX');
}

function getBadNewsMonitorHeaders_() {
  return [
    'generatedAt',
    'runId',
    'symbol',
    'name',
    'themes',
    'riskScore',
    'severity',
    'riskType',
    'shouldBlockEntry',
    'shouldForceExit',
    'headlineSummary',
    'evidence',
    'reasoning',
    'sources',
    'marketRiskSummary',
    'model'
  ];
}

function getBadNewsJsonSchema_() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['marketRiskSummary', 'signals'],
    properties: {
      marketRiskSummary: { type: 'string', maxLength: 500 },
      signals: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'symbol',
            'name',
            'riskScore',
            'severity',
            'riskType',
            'shouldBlockEntry',
            'shouldForceExit',
            'headlineSummary',
            'evidence',
            'reasoning',
            'sources'
          ],
          properties: {
            symbol: { type: 'string' },
            name: { type: 'string', maxLength: 40 },
            riskScore: { type: 'number' },
            severity: {
              type: 'string',
              enum: ['none', 'watch', 'serious', 'critical']
            },
            riskType: { type: 'string', maxLength: 80 },
            shouldBlockEntry: { type: 'boolean' },
            shouldForceExit: { type: 'boolean' },
            headlineSummary: { type: 'string', maxLength: 100 },
            evidence: { type: 'string', maxLength: 160 },
            reasoning: { type: 'string', maxLength: 160 },
            sources: {
              type: 'array',
              maxItems: 2,
              items: { type: 'string', maxLength: 300 }
            }
          }
        }
      }
    }
  };
}

function normalizeBadNewsSeverity_(severity) {
  const value = String(severity || '').toLowerCase();
  if (value === 'low' || value === 'medium') {
    return 'watch';
  }
  if (value === 'high') {
    return 'serious';
  }
  if (value === 'critical') {
    return 'critical';
  }
  return value === 'watch' || value === 'serious' ? value : 'none';
}
