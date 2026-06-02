const BAD_NEWS_CONFIG = {
  sheetName: 'BadNewsMonitor',
  handlerName: 'monitorBadNewsSignals',
  timezone: 'Asia/Taipei',
  openAiBaseUrl: 'https://api.openai.com/v1',
  openAiModel: 'gpt-5',
  maxSymbolsPerRun: 27,
  lookbackHours: 24,
  blockEntryRiskScore: 75,
  forceExitRiskScore: 85,
  severityRanks: {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  }
};

function monitorBadNewsSignals() {
  setupBadNewsMonitorSheet_();
  if (!isBadNewsMonitorWindow_(new Date())) {
    log_('INFO', 'Skipped bad-news monitor outside configured Taiwan monitoring window.');
    return;
  }

  const symbols = getEnabledSymbols_().slice(0, BAD_NEWS_CONFIG.maxSymbolsPerRun);
  if (!symbols.length) {
    log_('WARN', 'Skipped bad-news monitor because no enabled symbols were found.');
    return;
  }

  const inputs = buildBadNewsInputs_(symbols);
  const result = callOpenAiBadNewsMonitor_(inputs);
  writeBadNewsMonitorResult_(result, inputs);
  log_('INFO', `Bad-news monitor wrote ${result.signals.length} signal row(s).`);
}

function setupBadNewsMonitorSheet_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), BAD_NEWS_CONFIG.sheetName);
  setHeader_(sheet, getBadNewsMonitorHeaders_());
}

function buildBadNewsInputs_(symbols) {
  const configRows = getConfigRowsBySymbol_();
  const latestValuations = getLatestSheetRowsBySymbol_(AI_VALUATION_CONFIG.sheetName, 'symbol', 'generatedAt');
  const latestQuotes = getLatestSheetRowsBySymbol_(CONFIG.quoteSheetName, 'symbol', 'recordedAt');
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
        latestValuation: latestValuations[symbol] || {},
        latestQuote: latestQuotes[symbol] || {}
      };
    })
  };
}

function callOpenAiBadNewsMonitor_(inputs) {
  const response = UrlFetchApp.fetch(`${BAD_NEWS_CONFIG.openAiBaseUrl}/responses`, {
    method: 'post',
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey_()}`
    },
    payload: JSON.stringify({
      model: BAD_NEWS_CONFIG.openAiModel,
      reasoning: { effort: 'medium' },
      max_output_tokens: 10000,
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
        'Be conservative with force-exit decisions: only critical or clearly material negative news should force exit.',
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
    })
  });

  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) {
    const error = new Error(`OpenAI bad-news monitor failed (${status}): ${text}`);
    error.statusCode = status;
    error.responseText = text;
    throw error;
  }
  return parseBadNewsResponse_(JSON.parse(text));
}

function buildBadNewsPrompt_(inputs) {
  return [
    `Now: ${inputs.generatedDateTaipei} (${BAD_NEWS_CONFIG.timezone}).`,
    `Look back roughly ${inputs.lookbackHours} hours for each Taiwan stock.`,
    '',
    'Search current news, exchange disclosures, company announcements, analyst downgrades, macro/geopolitical shocks, US market read-through, supply-chain weakness, legal/regulatory issues, credit stress, dilution, customer cuts, production disruption, accounting issues, and ETF/sector-specific negatives.',
    'For each symbol, decide whether there is a credible bad-news signal that should block new entries or force exit existing positions.',
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
  const parsed = JSON.parse(text);
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
    const severity = signal.severity || 'none';
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
  if (isWeekendTaipei_(date)) {
    return false;
  }
  const hhmm = Number(Utilities.formatDate(date, BAD_NEWS_CONFIG.timezone, 'HHmm'));
  return hhmm >= 800 && hhmm <= 1400;
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
      marketRiskSummary: { type: 'string' },
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
            name: { type: 'string' },
            riskScore: { type: 'number' },
            severity: {
              type: 'string',
              enum: ['none', 'low', 'medium', 'high', 'critical']
            },
            riskType: { type: 'string' },
            shouldBlockEntry: { type: 'boolean' },
            shouldForceExit: { type: 'boolean' },
            headlineSummary: { type: 'string' },
            evidence: { type: 'string' },
            reasoning: { type: 'string' },
            sources: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  };
}
