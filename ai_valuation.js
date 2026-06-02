const AI_VALUATION_CONFIG = {
  sheetName: 'AIValuations',
  handlerName: 'recalculateAiValuationsAtOpen',
  timezone: 'Asia/Taipei',
  openAiBaseUrl: 'https://api.openai.com/v1',
  openAiModel: 'gpt-5',
  maxSymbolsPerRun: 27,
  valuationHistoryDays: 7,
  openAiKeyProperties: ['OPENAI_API_KEY', 'OPENAI_APIKEY', 'OPENAI_KEY', 'OPENAI'],
  usMarketContext: [
    'NASDAQ futures and prior close',
    'S&P 500 futures and prior close',
    'SOX semiconductor index',
    'NVIDIA, AMD, Broadcom, Intel, Micron, Super Micro Computer, Tesla',
    'USD/TWD, US 10-year yield, major AI/server/semiconductor news'
  ]
};

function recalculateAiValuationsAtOpen() {
  setupAiValuationSheet_();
  if (isWeekendTaipei_(new Date())) {
    log_('INFO', 'Skipped AI valuation recalculation on weekend.');
    return;
  }

  const symbols = getEnabledSymbols_().slice(0, AI_VALUATION_CONFIG.maxSymbolsPerRun);
  if (!symbols.length) {
    log_('WARN', 'Skipped AI valuation recalculation because no enabled symbols were found.');
    return;
  }

  const inputs = buildAiValuationInputs_(symbols);
  const valuationResult = callOpenAiValuation_(inputs);
  writeAiValuationResult_(valuationResult, inputs);
  log_('INFO', `AI valuation recalculated for ${valuationResult.valuations.length} symbol(s).`);
}

function setupAiValuationSheet_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), AI_VALUATION_CONFIG.sheetName);
  setHeader_(sheet, getAiValuationHeaders_());
}

function buildAiValuationInputs_(symbols) {
  const configRows = getConfigRowsBySymbol_();
  const latestDaily = getLatestSheetRowsBySymbol_(CONFIG.historySheetName, 'symbol', 'date');
  const latestQuote = getLatestSheetRowsBySymbol_(CONFIG.quoteSheetName, 'symbol', 'recordedAt');
  const latestRealtime = getLatestSheetRowsBySymbol_(GAS_REALTIME_CONFIG.sheetName, 'symbol', 'recordedAt');
  const valuationHistory = getAiValuationHistoryBySymbol_(symbols, AI_VALUATION_CONFIG.valuationHistoryDays);
  const generatedAt = new Date();

  return {
    generatedAt: generatedAt.toISOString(),
    generatedDateTaipei: Utilities.formatDate(generatedAt, AI_VALUATION_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
    timezone: AI_VALUATION_CONFIG.timezone,
    symbols: symbols.map(symbol => {
      const config = configRows[symbol] || {};
      return {
        symbol,
        name: config.name || '',
        themes: config.themes || '',
        note: config.note || '',
        latestDaily: latestDaily[symbol] || {},
        latestQuote: latestQuote[symbol] || {},
        latestRealtime: latestRealtime[symbol] || {},
        valuationHistory7d: valuationHistory[symbol] || []
      };
    })
  };
}

function callOpenAiValuation_(inputs) {
  const apiKey = getOpenAiApiKey_();
  const response = UrlFetchApp.fetch(`${AI_VALUATION_CONFIG.openAiBaseUrl}/responses`, {
    method: 'post',
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: JSON.stringify({
      model: AI_VALUATION_CONFIG.openAiModel,
      reasoning: { effort: 'medium' },
      max_output_tokens: 12000,
      tools: [{
        type: 'web_search',
        user_location: {
          type: 'approximate',
          country: 'TW',
          city: 'Taipei',
          region: 'Taipei',
          timezone: AI_VALUATION_CONFIG.timezone
        }
      }],
      tool_choice: 'auto',
      include: ['web_search_call.action.sources'],
      instructions: [
        'You are a careful Taiwan equity valuation analyst.',
        'Use current Taiwan news, global news, and US market context before producing valuations.',
        'Focus on whether each stock should be held for limit-up momentum or avoided because the setup is weak.',
        'Do not invent facts. If live evidence is thin, lower confidence and explain the uncertainty.',
        'Return only JSON that matches the schema.'
      ].join('\n'),
      input: buildAiValuationPrompt_(inputs),
      text: {
        format: {
          type: 'json_schema',
          name: 'taiwan_stock_ai_valuation_batch',
          strict: true,
          schema: getAiValuationJsonSchema_()
        }
      }
    })
  });

  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) {
    const error = new Error(`OpenAI valuation request failed (${status}): ${text}`);
    error.statusCode = status;
    error.responseText = text;
    throw error;
  }

  return parseOpenAiValuationResponse_(JSON.parse(text));
}

function buildAiValuationPrompt_(inputs) {
  return [
    `Today is ${inputs.generatedDateTaipei} (${inputs.timezone}).`,
    'Recalculate morning AI valuations for these Taiwan stocks at the 09:00 open.',
    '',
    'Use web search to check:',
    '- Taiwan market/news for each symbol and its themes.',
    `- US market references: ${AI_VALUATION_CONFIG.usMarketContext.join('; ')}.`,
    '- Overnight AI, semiconductor, server, EV, memory, panel, heavy electric, ETF, and macro catalysts.',
    '',
    'For each stock, calculate a thoughtful fair value and intraday target, not just a headline summary.',
    'Use the provided local sheet data as market data context; use web search for fresh news and US-market reasoning.',
    'Also use valuationHistory7d for each symbol. Prefer stocks whose fair value, upside, and confidence have been stable or improving during the last 7 calendar days.',
    'If today news is exciting but the 7-day valuation trend is deteriorating, reduce confidence and explain why.',
    'The strategy preference is to wait for limit-up candidates when momentum is strong, instead of exiting too early.',
    '',
    'Local sheet data:',
    JSON.stringify(inputs.symbols)
  ].join('\n');
}

function parseOpenAiValuationResponse_(responseJson) {
  const text = extractOpenAiOutputText_(responseJson);
  if (!text) {
    throw new Error('OpenAI valuation response did not contain output text.');
  }
  const parsed = JSON.parse(text);
  if (!parsed.valuations || !Array.isArray(parsed.valuations)) {
    throw new Error('OpenAI valuation response missing valuations array.');
  }
  return parsed;
}

function extractOpenAiOutputText_(responseJson) {
  if (responseJson.output_text) {
    return responseJson.output_text;
  }
  const output = responseJson.output || [];
  const texts = [];
  output.forEach(item => {
    (item.content || []).forEach(content => {
      if (content.type === 'output_text' && content.text) {
        texts.push(content.text);
      }
    });
  });
  return texts.join('\n').trim();
}

function writeAiValuationResult_(result, inputs) {
  const runId = `ai_val_${Utilities.formatDate(new Date(), AI_VALUATION_CONFIG.timezone, 'yyyyMMdd_HHmmss')}`;
  const inputBySymbol = {};
  inputs.symbols.forEach(item => {
    inputBySymbol[item.symbol] = item;
  });

  const rows = result.valuations.map(item => {
    const symbol = normalizeSymbol_(item.symbol);
    const input = inputBySymbol[symbol] || {};
    return [
      new Date(),
      runId,
      symbol,
      item.name || input.name || '',
      input.themes || '',
      valueOrBlank_(item.lastPrice),
      valueOrBlank_(item.fairValue),
      valueOrBlank_(item.intradayTarget),
      valueOrBlank_(item.downsideRisk),
      valueOrBlank_(item.upsidePct),
      valueOrBlank_(item.confidence),
      item.rating || '',
      item.limitUpPlan || '',
      item.usMarketImpact || '',
      item.newsSummary || '',
      item.valuationReasoning || '',
      (item.keySources || []).join('\n'),
      result.marketSummary || '',
      AI_VALUATION_CONFIG.openAiModel
    ];
  });

  if (rows.length) {
    appendRows_(AI_VALUATION_CONFIG.sheetName, rows);
  }
}

function getConfigRowsBySymbol_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), CONFIG.configSheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return {};
  }
  const result = {};
  values.slice(1).forEach(row => {
    const symbol = normalizeSymbol_(row[0]);
    if (!symbol) {
      return;
    }
    result[symbol] = {
      enabled: row[1],
      name: row[2],
      themes: row[3],
      note: row[4]
    };
  });
  return result;
}

function getLatestSheetRowsBySymbol_(sheetName, symbolHeader, sortHeader) {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return {};
  }

  const headers = values[0].map(header => String(header));
  const symbolIndex = headers.indexOf(symbolHeader);
  const sortIndex = headers.indexOf(sortHeader);
  if (symbolIndex === -1 || sortIndex === -1) {
    return {};
  }

  const latest = {};
  values.slice(1).forEach(row => {
    const symbol = normalizeSymbol_(row[symbolIndex]);
    if (!symbol) {
      return;
    }
    const current = latest[symbol];
    if (!current || compareSheetValues_(row[sortIndex], current.rawSortValue) >= 0) {
      const object = {};
      headers.forEach((header, index) => {
        object[header] = normalizeAiInputValue_(row[index]);
      });
      object.rawSortValue = row[sortIndex];
      latest[symbol] = object;
    }
  });

  Object.keys(latest).forEach(symbol => {
    delete latest[symbol].rawSortValue;
  });
  return latest;
}

function getAiValuationHistoryBySymbol_(symbols, lookbackDays) {
  const symbolSet = {};
  symbols.forEach(symbol => {
    symbolSet[normalizeSymbol_(symbol)] = true;
  });

  const sheet = getOrCreateSheet_(getSpreadsheet_(), AI_VALUATION_CONFIG.sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return {};
  }

  const headers = values[0].map(header => String(header));
  const index = {};
  headers.forEach((header, columnIndex) => {
    index[header] = columnIndex;
  });
  if (index.symbol === undefined || index.generatedAt === undefined) {
    return {};
  }

  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const history = {};
  values.slice(1).forEach(row => {
    const symbol = normalizeSymbol_(row[index.symbol]);
    if (!symbol || !symbolSet[symbol]) {
      return;
    }
    const generatedAt = normalizeAiGeneratedAtDate_(row[index.generatedAt]);
    if (!generatedAt || generatedAt < cutoff) {
      return;
    }
    if (!history[symbol]) {
      history[symbol] = [];
    }
    history[symbol].push({
      generatedAt: Utilities.formatDate(generatedAt, AI_VALUATION_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
      fairValue: Number(row[index.fairValue] || 0),
      intradayTarget: Number(row[index.intradayTarget] || 0),
      downsideRisk: Number(row[index.downsideRisk] || 0),
      upsidePct: Number(row[index.upsidePct] || 0),
      confidence: Number(row[index.confidence] || 0),
      rating: String(row[index.rating] || ''),
      limitUpPlan: String(row[index.limitUpPlan] || '')
    });
  });

  Object.keys(history).forEach(symbol => {
    history[symbol] = history[symbol]
      .sort((left, right) => compareSheetValues_(left.generatedAt, right.generatedAt))
      .slice(-lookbackDays);
  });
  return history;
}

function compareSheetValues_(left, right) {
  const leftTime = Object.prototype.toString.call(left) === '[object Date]' ? left.getTime() : new Date(left).getTime();
  const rightTime = Object.prototype.toString.call(right) === '[object Date]' ? right.getTime() : new Date(right).getTime();
  if (!isNaN(leftTime) && !isNaN(rightTime)) {
    return leftTime - rightTime;
  }
  return String(left || '').localeCompare(String(right || ''));
}

function normalizeAiInputValue_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, AI_VALUATION_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss');
  }
  return value === undefined || value === null ? '' : value;
}

function normalizeAiGeneratedAtDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function getOpenAiApiKey_() {
  const properties = PropertiesService.getScriptProperties();
  for (const name of AI_VALUATION_CONFIG.openAiKeyProperties) {
    const value = properties.getProperty(name);
    if (value) {
      return value;
    }
  }
  throw new Error(`Missing OpenAI API key. Set one script property: ${AI_VALUATION_CONFIG.openAiKeyProperties.join(', ')}`);
}

function getAiValuationHeaders_() {
  return [
    'generatedAt',
    'runId',
    'symbol',
    'name',
    'themes',
    'lastPrice',
    'fairValue',
    'intradayTarget',
    'downsideRisk',
    'upsidePct',
    'confidence',
    'rating',
    'limitUpPlan',
    'usMarketImpact',
    'newsSummary',
    'valuationReasoning',
    'keySources',
    'marketSummary',
    'model'
  ];
}

function getAiValuationJsonSchema_() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['marketSummary', 'valuations'],
    properties: {
      marketSummary: {
        type: 'string',
        description: 'Brief summary of Taiwan, US market, and catalyst context used for this batch.'
      },
      valuations: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'symbol',
            'name',
            'lastPrice',
            'fairValue',
            'intradayTarget',
            'downsideRisk',
            'upsidePct',
            'confidence',
            'rating',
            'limitUpPlan',
            'usMarketImpact',
            'newsSummary',
            'valuationReasoning',
            'keySources'
          ],
          properties: {
            symbol: { type: 'string' },
            name: { type: 'string' },
            lastPrice: { type: 'number' },
            fairValue: { type: 'number' },
            intradayTarget: { type: 'number' },
            downsideRisk: { type: 'number' },
            upsidePct: { type: 'number' },
            confidence: { type: 'number' },
            rating: {
              type: 'string',
              enum: ['strong_buy', 'buy', 'watch', 'avoid', 'sell']
            },
            limitUpPlan: { type: 'string' },
            usMarketImpact: { type: 'string' },
            newsSummary: { type: 'string' },
            valuationReasoning: { type: 'string' },
            keySources: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  };
}
