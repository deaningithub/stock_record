const LIMIT_UP_EXTERNAL_EVIDENCE_CONFIG = {
  sheetName: 'LimitUpExternalEvidence'
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
    'confidence_note'
  ];
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
