const LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG = {
  sheetName: 'LimitUpExternalEvidence',
  handlerName: 'refreshLimitUpExternalEvidence',
  timezone: 'Asia/Taipei',
  maxSymbolsPerRun: 27,
  maxOutputTokens: 18000
};

function setupLimitUpExternalEvidenceSheet() {
  const sheet = getOrCreateSheet_(getSpreadsheet_(), LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.sheetName);
  setHeader_(sheet, getLimitUpExternalEvidenceHeaders_());
  getSpreadsheet_().toast('Limit-up external evidence sheet is ready.', 'Taiwan Stock', 5);
}

function getLimitUpExternalEvidenceHeaders_() {
  return [
    'symbol',
    'date',
    'checked_at',
    'news_score',
    'has_bad_news',
    'has_good_news',
    'news_sentiment',
    'news_summary',
    'news_source_url',
    'institution_score',
    'foreign_net',
    'investment_trust_net',
    'trust_net',
    'dealer_net',
    'institution_total_net',
    'branch_score',
    'top_buy_branches',
    'top_sell_branches',
    'main_force_net',
    'day_trade_risk',
    'chip_score',
    'margin_balance',
    'margin_change',
    'short_balance',
    'short_change',
    'margin_short_note',
    'external_score',
    'trigger',
    'confidence_note',
    'data_freshness_minutes',
    'news_checked_at',
    'institution_data_date',
    'margin_short_data_date',
    'branch_data_date',
    'material_bad_news',
    'bad_news_severity',
    'bad_news_action',
    'bad_news_reason'
  ];
}

function refreshLimitUpExternalEvidence() {
  setupLimitUpExternalEvidenceSheet();
  if (!isLimitUpExternalEvidenceWindow_(new Date())) {
    log_('INFO', 'Skipped limit-up external evidence refresh outside configured Taiwan monitoring window.');
    return;
  }

  const symbols = getEnabledSymbols_().slice(0, LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.maxSymbolsPerRun);
  if (!symbols.length) {
    log_('WARN', 'Skipped limit-up external evidence refresh because no enabled symbols were found.');
    return;
  }

  const inputs = buildLimitUpExternalEvidenceInputs_(symbols);
  const result = callOpenAiLimitUpExternalEvidence_(inputs);
  writeLimitUpExternalEvidenceResult_(result, inputs);
  log_('INFO', `Limit-up external evidence refreshed for ${result.evidence.length} symbol(s).`);
}

function buildLimitUpExternalEvidenceInputs_(symbols) {
  const configRows = getConfigRowsBySymbol_();
  const latestQuotes = getLatestSheetRowsBySymbol_(CONFIG.quoteSheetName, 'symbol', 'recordedAt');
  const latestDaily = getLatestSheetRowsBySymbol_(CONFIG.historySheetName, 'symbol', 'date');
  const latestBadNews = getLatestSheetRowsBySymbol_(BAD_NEWS_CONFIG.sheetName, 'symbol', 'generatedAt');
  const latestAiValuation = getLatestSheetRowsBySymbol_(AI_VALUATION_CONFIG.sheetName, 'symbol', 'generatedAt');
  const generatedAt = new Date();

  return {
    generatedAt: generatedAt.toISOString(),
    checkedAtTaipei: Utilities.formatDate(generatedAt, LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
    tradeDate: formatDate_(generatedAt),
    symbols: symbols.map(symbol => {
      const config = configRows[symbol] || {};
      return {
        symbol,
        name: config.name || '',
        themes: config.themes || '',
        latestQuote: latestQuotes[symbol] || {},
        latestDaily: latestDaily[symbol] || {},
        latestBadNews: latestBadNews[symbol] || {},
        latestAiValuation: latestAiValuation[symbol] || {}
      };
    })
  };
}

function callOpenAiLimitUpExternalEvidence_(inputs) {
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
      max_output_tokens: LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.maxOutputTokens,
      tools: [{
        type: 'web_search',
        user_location: {
          type: 'approximate',
          country: 'TW',
          city: 'Taipei',
          region: 'Taipei',
          timezone: LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.timezone
        }
      }],
      tool_choice: 'auto',
      include: ['web_search_call.action.sources'],
      instructions: [
        'You are a Taiwan limit-up external-evidence analyst.',
        'For every symbol, estimate news, institution, branch/main-force, margin-short, and chip evidence for an intraday limit-up setup.',
        'Do not pretend stale data is realtime. Always provide data dates and data_freshness_minutes.',
        'Use material bad-news fields exactly: material_bad_news boolean; bad_news_severity none/watch/serious/critical; bad_news_action ignore/observe/reduce/sell_before_reaction.',
        'Use numbers in shares or lots consistently per field when source units are clear; otherwise explain uncertainty in confidence_note.',
        'Keep summaries concise. Return only JSON matching the schema.'
      ].join('\n'),
      input: buildLimitUpExternalEvidencePrompt_(inputs),
      text: {
        format: {
          type: 'json_schema',
          name: 'taiwan_limit_up_external_evidence',
          strict: true,
          schema: getLimitUpExternalEvidenceJsonSchema_()
        }
      }
    })
  });

  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) {
    const error = new Error(`OpenAI limit-up external evidence failed (${status}): ${text}`);
    error.statusCode = status;
    error.responseText = text;
    throw error;
  }
  return parseLimitUpExternalEvidenceResponse_(JSON.parse(text));
}

function buildLimitUpExternalEvidencePrompt_(inputs) {
  return [
    `Now: ${inputs.checkedAtTaipei} (${LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.timezone}).`,
    `Trade date: ${inputs.tradeDate}.`,
    'Find the freshest available evidence for each Taiwan stock. If institution, branch, or margin-short data is latest official previous day, set the relevant *_data_date and freshness accordingly.',
    'Score rules: news_score, institution_score, branch_score, chip_score, external_score are 0~1.',
    'external_score = news_score*0.30 + institution_score*0.25 + branch_score*0.30 + chip_score*0.15.',
    'trigger true only if external_score >= 0.70, material_bad_news is false, has_bad_news is false, branch_score >= 0.60, and news_score >= 0.40.',
    'Symbols and local context:',
    JSON.stringify(inputs.symbols)
  ].join('\n');
}

function parseLimitUpExternalEvidenceResponse_(responseJson) {
  const text = extractOpenAiOutputText_(responseJson);
  if (!text) {
    throw new Error('OpenAI limit-up external evidence response did not contain output text.');
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const preview = text.slice(Math.max(0, text.length - 500));
    throw new Error(`OpenAI limit-up evidence JSON parse failed: ${error.message}. outputLength=${text.length}. tail=${preview}`);
  }
  if (!parsed.evidence || !Array.isArray(parsed.evidence)) {
    throw new Error('OpenAI limit-up evidence response missing evidence array.');
  }
  return parsed;
}

function writeLimitUpExternalEvidenceResult_(result, inputs) {
  const rows = result.evidence.map(item => {
    const externalScore = calculateLimitUpExternalScore_(item);
    const trigger = shouldTriggerLimitUpExternalEvidence_({
      external_score: externalScore,
      has_bad_news: item.has_bad_news || item.material_bad_news,
      branch_score: item.branch_score,
      news_score: item.news_score
    });
    return [
      normalizeSymbol_(item.symbol),
      item.date || inputs.tradeDate,
      item.checked_at || inputs.checkedAtTaipei,
      valueOrBlank_(item.news_score),
      item.has_bad_news === true,
      item.has_good_news === true,
      item.news_sentiment || '',
      item.news_summary || '',
      item.news_source_url || '',
      valueOrBlank_(item.institution_score),
      valueOrBlank_(item.foreign_net),
      valueOrBlank_(item.investment_trust_net),
      valueOrBlank_(item.trust_net === undefined || item.trust_net === null ? item.investment_trust_net : item.trust_net),
      valueOrBlank_(item.dealer_net),
      valueOrBlank_(item.institution_total_net),
      valueOrBlank_(item.branch_score),
      JSON.stringify(item.top_buy_branches || []),
      JSON.stringify(item.top_sell_branches || []),
      valueOrBlank_(item.main_force_net),
      item.day_trade_risk || '',
      valueOrBlank_(item.chip_score),
      valueOrBlank_(item.margin_balance),
      valueOrBlank_(item.margin_change),
      valueOrBlank_(item.short_balance),
      valueOrBlank_(item.short_change),
      item.margin_short_note || '',
      externalScore,
      trigger,
      item.confidence_note || '',
      valueOrBlank_(item.data_freshness_minutes),
      item.news_checked_at || '',
      item.institution_data_date || '',
      item.margin_short_data_date || '',
      item.branch_data_date || '',
      item.material_bad_news === true,
      normalizeLimitUpBadNewsSeverity_(item.bad_news_severity),
      normalizeLimitUpBadNewsAction_(item.bad_news_action),
      item.bad_news_reason || ''
    ];
  });

  if (rows.length) {
    appendRows_(LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.sheetName, rows);
  }
}

function calculateLimitUpExternalScore_(evidence) {
  return clamp_(
    Number(evidence.news_score || 0) * 0.30 +
    Number(evidence.institution_score || 0) * 0.25 +
    Number(evidence.branch_score || 0) * 0.30 +
    Number(evidence.chip_score || 0) * 0.15,
    0,
    1
  );
}

function shouldTriggerLimitUpExternalEvidence_(evidence) {
  const externalScore = evidence.external_score === undefined || evidence.external_score === ''
    ? calculateLimitUpExternalScore_(evidence)
    : Number(evidence.external_score || 0);
  return externalScore >= 0.70 &&
    evidence.has_bad_news !== true &&
    String(evidence.has_bad_news).toLowerCase() !== 'true' &&
    Number(evidence.branch_score || 0) >= 0.60 &&
    Number(evidence.news_score || 0) >= 0.40;
}

function isLimitUpExternalEvidenceWindow_(date) {
  if (isWeekendTaipei_(date)) {
    return false;
  }
  const hhmm = Number(Utilities.formatDate(date, LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG.timezone, 'HHmm'));
  return hhmm >= 830 && hhmm <= 1335;
}

function normalizeLimitUpBadNewsSeverity_(severity) {
  const value = String(severity || '').toLowerCase();
  if (value === 'low' || value === 'medium') {
    return 'watch';
  }
  if (value === 'high') {
    return 'serious';
  }
  if (['none', 'watch', 'serious', 'critical'].indexOf(value) !== -1) {
    return value;
  }
  return 'none';
}

function normalizeLimitUpBadNewsAction_(action) {
  const value = String(action || '').toLowerCase();
  return ['ignore', 'observe', 'reduce', 'sell_before_reaction'].indexOf(value) !== -1 ? value : 'ignore';
}

function getLimitUpExternalEvidenceJsonSchema_() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['evidence'],
    properties: {
      evidence: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: getLimitUpExternalEvidenceHeaders_(),
          properties: {
            symbol: { type: 'string' },
            date: { type: 'string' },
            checked_at: { type: 'string' },
            news_score: { type: 'number' },
            has_bad_news: { type: 'boolean' },
            has_good_news: { type: 'boolean' },
            news_sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'mixed', 'unknown'] },
            news_summary: { type: 'string', maxLength: 160 },
            news_source_url: { type: 'string' },
            institution_score: { type: 'number' },
            foreign_net: { type: 'number' },
            investment_trust_net: { type: 'number' },
            trust_net: { type: 'number' },
            dealer_net: { type: 'number' },
            institution_total_net: { type: 'number' },
            branch_score: { type: 'number' },
            top_buy_branches: {
              type: 'array',
              maxItems: 5,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['broker', 'buy'],
                properties: {
                  broker: { type: 'string' },
                  buy: { type: 'number' }
                }
              }
            },
            top_sell_branches: {
              type: 'array',
              maxItems: 5,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['broker', 'sell'],
                properties: {
                  broker: { type: 'string' },
                  sell: { type: 'number' }
                }
              }
            },
            main_force_net: { type: 'number' },
            day_trade_risk: { type: 'string', maxLength: 80 },
            chip_score: { type: 'number' },
            margin_balance: { type: 'number' },
            margin_change: { type: 'number' },
            short_balance: { type: 'number' },
            short_change: { type: 'number' },
            margin_short_note: { type: 'string', maxLength: 120 },
            external_score: { type: 'number' },
            trigger: { type: 'boolean' },
            confidence_note: { type: 'string', maxLength: 180 },
            data_freshness_minutes: { type: 'number' },
            news_checked_at: { type: 'string' },
            institution_data_date: { type: 'string' },
            margin_short_data_date: { type: 'string' },
            branch_data_date: { type: 'string' },
            material_bad_news: { type: 'boolean' },
            bad_news_severity: { type: 'string', enum: ['none', 'watch', 'serious', 'critical'] },
            bad_news_action: { type: 'string', enum: ['ignore', 'observe', 'reduce', 'sell_before_reaction'] },
            bad_news_reason: { type: 'string', maxLength: 160 }
          }
        }
      }
    }
  };
}
