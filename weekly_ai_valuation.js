const WEEKLY_AI_VALUATION_CONFIG = {
  sheetName: 'WeeklyAIValuations',
  handlerName: 'recalculateWeeklyThreeMonthValuations',
  timezone: 'Asia/Taipei',
  horizonMonths: 3,
  maxSymbolsPerRun: 27,
  maxOutputTokens: 20000
};

function recalculateWeeklyThreeMonthValuations() {
  setupWeeklyAiValuationSheet_();
  const symbols = getEnabledSymbols_().slice(0, WEEKLY_AI_VALUATION_CONFIG.maxSymbolsPerRun);
  if (!symbols.length) {
    log_('WARN', 'Skipped weekly three-month valuation because no enabled symbols were found.');
    return;
  }

  const inputs = buildWeeklyValuationInputs_(symbols);
  const result = callOpenAiWeeklyValuation_(inputs);
  writeWeeklyValuationResult_(result, inputs);
  log_('INFO', `Weekly three-month AI valuation recalculated for ${result.valuations.length} symbol(s).`);
}

function setupWeeklyAiValuationSheet_() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), WEEKLY_AI_VALUATION_CONFIG.sheetName);
  setHeader_(sheet, getWeeklyAiValuationHeaders_());
}

function buildWeeklyValuationInputs_(symbols) {
  const configRows = getConfigRowsBySymbol_();
  const latestDaily = getLatestSheetRowsBySymbol_(CONFIG.historySheetName, 'symbol', 'date');
  const latestAiValuation = getLatestSheetRowsBySymbol_(AI_VALUATION_CONFIG.sheetName, 'symbol', 'generatedAt');
  const generatedAt = new Date();

  return {
    generatedAt: generatedAt.toISOString(),
    generatedDateTaipei: Utilities.formatDate(generatedAt, WEEKLY_AI_VALUATION_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
    horizonMonths: WEEKLY_AI_VALUATION_CONFIG.horizonMonths,
    symbols: symbols.map(symbol => {
      const config = configRows[symbol] || {};
      return {
        symbol,
        name: config.name || '',
        themes: config.themes || '',
        note: config.note || '',
        latestDaily: latestDaily[symbol] || {},
        latestIntradayValuation: latestAiValuation[symbol] || {}
      };
    })
  };
}

function callOpenAiWeeklyValuation_(inputs) {
  const response = UrlFetchApp.fetch(`${AI_VALUATION_CONFIG.openAiBaseUrl}/responses`, {
    method: 'post',
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey_()}`
    },
    payload: JSON.stringify({
      model: AI_VALUATION_CONFIG.openAiModel,
      reasoning: { effort: 'medium' },
      max_output_tokens: WEEKLY_AI_VALUATION_CONFIG.maxOutputTokens,
      tools: [{
        type: 'web_search',
        user_location: {
          type: 'approximate',
          country: 'TW',
          city: 'Taipei',
          region: 'Taipei',
          timezone: WEEKLY_AI_VALUATION_CONFIG.timezone
        }
      }],
      tool_choice: 'auto',
      include: ['web_search_call.action.sources'],
      instructions: [
        'You are a careful Taiwan equity analyst building weekly three-month forward valuations.',
        'Use current news, earnings outlook, sector catalysts, US market read-through, valuation context, and risk factors.',
        'This is not an intraday target. Estimate a realistic fair value three months from now.',
        'Keep text concise: thesis <= 180 chars, catalysts <= 160 chars, risks <= 160 chars.',
        'Use at most 2 source URLs per symbol.',
        'Return only JSON matching the schema.'
      ].join('\n'),
      input: buildWeeklyValuationPrompt_(inputs),
      text: {
        format: {
          type: 'json_schema',
          name: 'taiwan_stock_weekly_three_month_valuation',
          strict: true,
          schema: getWeeklyValuationJsonSchema_()
        }
      }
    })
  });

  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) {
    const error = new Error(`OpenAI weekly valuation failed (${status}): ${text}`);
    error.statusCode = status;
    error.responseText = text;
    throw error;
  }
  return parseWeeklyValuationResponse_(JSON.parse(text));
}

function buildWeeklyValuationPrompt_(inputs) {
  return [
    `Today is ${inputs.generatedDateTaipei} (${WEEKLY_AI_VALUATION_CONFIG.timezone}).`,
    `Estimate each stock's fair value ${inputs.horizonMonths} months from now.`,
    'Use web search for recent company news, sector catalysts, US-market read-through, and macro conditions.',
    'Use latestDaily and latestIntradayValuation only as local context. Do not copy intradayTarget as the three-month value.',
    '',
    'Symbols:',
    JSON.stringify(inputs.symbols)
  ].join('\n');
}

function parseWeeklyValuationResponse_(responseJson) {
  const text = extractOpenAiOutputText_(responseJson);
  if (!text) {
    throw new Error('OpenAI weekly valuation response did not contain output text.');
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const preview = text.slice(Math.max(0, text.length - 500));
    throw new Error(`OpenAI weekly valuation JSON parse failed: ${error.message}. outputLength=${text.length}. tail=${preview}`);
  }
  if (!parsed.valuations || !Array.isArray(parsed.valuations)) {
    throw new Error('OpenAI weekly valuation response missing valuations array.');
  }
  return parsed;
}

function writeWeeklyValuationResult_(result, inputs) {
  const runId = `weekly_val_${Utilities.formatDate(new Date(), WEEKLY_AI_VALUATION_CONFIG.timezone, 'yyyyMMdd_HHmmss')}`;
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
      WEEKLY_AI_VALUATION_CONFIG.horizonMonths,
      valueOrBlank_(item.lastPrice),
      valueOrBlank_(item.threeMonthFairValue),
      valueOrBlank_(item.threeMonthUpsidePct),
      valueOrBlank_(item.confidence),
      item.rating || '',
      item.thesis || '',
      item.catalysts || '',
      item.risks || '',
      (item.keySources || []).join('\n'),
      result.marketSummary || '',
      AI_VALUATION_CONFIG.openAiModel
    ];
  });

  if (rows.length) {
    appendRows_(WEEKLY_AI_VALUATION_CONFIG.sheetName, rows);
  }
}

function getWeeklyAiValuationHeaders_() {
  return [
    'generatedAt',
    'runId',
    'symbol',
    'name',
    'themes',
    'horizonMonths',
    'lastPrice',
    'threeMonthFairValue',
    'threeMonthUpsidePct',
    'confidence',
    'rating',
    'thesis',
    'catalysts',
    'risks',
    'keySources',
    'marketSummary',
    'model'
  ];
}

function getWeeklyValuationJsonSchema_() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['marketSummary', 'valuations'],
    properties: {
      marketSummary: { type: 'string', maxLength: 500 },
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
            'threeMonthFairValue',
            'threeMonthUpsidePct',
            'confidence',
            'rating',
            'thesis',
            'catalysts',
            'risks',
            'keySources'
          ],
          properties: {
            symbol: { type: 'string' },
            name: { type: 'string', maxLength: 40 },
            lastPrice: { type: 'number' },
            threeMonthFairValue: { type: 'number' },
            threeMonthUpsidePct: { type: 'number' },
            confidence: { type: 'number' },
            rating: {
              type: 'string',
              enum: ['strong_buy', 'buy', 'watch', 'avoid', 'sell']
            },
            thesis: { type: 'string', maxLength: 180 },
            catalysts: { type: 'string', maxLength: 160 },
            risks: { type: 'string', maxLength: 160 },
            keySources: {
              type: 'array',
              maxItems: 2,
              items: { type: 'string' }
            }
          }
        }
      }
    }
  };
}
