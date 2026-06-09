const TRIGGER_CONFIG = {
  handlerName: 'recordStockInfo',
  minuteReplayHandlerName: 'recordMinuteReplayCandles',
  afterCloseMinuteReplayHandlerName: 'recordTodayMinuteReplayCandlesAfterClose',
  minuteBackfillHandlerName: 'continueMinuteReplayBackfill',
  gasRealtimeHandlerName: 'collectGasRealtimeSnapshots',
  aiValuationHandlerName: 'recalculateAiValuationsAtOpen',
  aiValuationContinuationHandlerName: 'continueAiValuationsAtOpen',
  weeklyValuationHandlerName: 'recalculateWeeklyThreeMonthValuations',
  weeklyValuationContinuationHandlerName: 'continueWeeklyThreeMonthValuations',
  allStockUniverseHandlerName: 'refreshAllStockUniverseWeekly',
  stockScanPool500HandlerName: 'refreshStockScanPool500Daily',
  dailyStockScanHandlerName: 'runDailyStockScan',
  badNewsHandlerName: 'monitorBadNewsSignals',
  badNewsContinuationHandlerName: 'continueBadNewsSignals',
  limitUpEvidenceHandlerName: 'refreshLimitUpExternalEvidence',
  limitUpEvidenceContinuationHandlerName: 'continueLimitUpExternalEvidence',
  profileModePropertyName: 'TRIGGER_PROFILE_MODE',
  minIntervalDays: 1,
  maxIntervalDays: 5,
  hour: 16,
  nearMinute: 5,
  timezone: 'Asia/Taipei'
};

TRIGGER_CONFIG.managedHandlerNames = [
  TRIGGER_CONFIG.handlerName,
  TRIGGER_CONFIG.minuteReplayHandlerName,
  TRIGGER_CONFIG.afterCloseMinuteReplayHandlerName,
  TRIGGER_CONFIG.minuteBackfillHandlerName,
  TRIGGER_CONFIG.gasRealtimeHandlerName,
  TRIGGER_CONFIG.aiValuationHandlerName,
  TRIGGER_CONFIG.aiValuationContinuationHandlerName,
  TRIGGER_CONFIG.weeklyValuationHandlerName,
  TRIGGER_CONFIG.weeklyValuationContinuationHandlerName,
  TRIGGER_CONFIG.allStockUniverseHandlerName,
  TRIGGER_CONFIG.stockScanPool500HandlerName,
  TRIGGER_CONFIG.dailyStockScanHandlerName,
  TRIGGER_CONFIG.badNewsHandlerName,
  TRIGGER_CONFIG.badNewsContinuationHandlerName,
  TRIGGER_CONFIG.limitUpEvidenceHandlerName,
  TRIGGER_CONFIG.limitUpEvidenceContinuationHandlerName,
  'recordLatestDailyCandles'
];

function recordStockInfo() {
  recordIntradayQuotes();
  recordLatestDailyCandles();
}

function installRecordTriggerEvery1Day() {
  installRecordTriggerEveryNDays_(1);
}

function installRecommendedProjectTriggers() {
  installV123ProjectTriggers();
}

function installV123ProjectTriggers() {
  setupSheets();
  removeManagedProjectTriggers_();
  setTriggerProfileMode_('v123');
  installRecordTriggerEvery1Day();
  installAiValuationTriggerAt9();
  installWeeklyThreeMonthValuationTrigger();
  installLimitUpExternalEvidenceTriggerV123_();
  auditProjectTriggers();
  getSpreadsheet_().toast('V1.2.3 data triggers installed.', 'Taiwan Stock', 5);
  log_('INFO', 'Installed V1.2.3 recommended data triggers: AIValuations daily before 08:30, WeeklyAIValuations weekly before 08:30, and LimitUpExternalEvidence daily before 08:30. DailyStockScan and BadNewsMonitor are not scheduled for V1.2.3.');
}

function installV24ProjectTriggers() {
  setupSheets();
  removeManagedProjectTriggers_();
  setTriggerProfileMode_('v24');
  installRecordTriggerEvery1Day();
  installAllStockUniverseTrigger();
  installStockScanPool500Trigger();
  installDailyStockScanTrigger();
  installBadNewsMonitorTriggerV24_();
  installLimitUpExternalEvidenceTriggerV24_();
  auditProjectTriggers();
  getSpreadsheet_().toast('V2.4 data triggers installed.', 'Taiwan Stock', 5);
  log_('INFO', 'Installed V2.4 recommended data triggers: AllStockUniverse weekly, StockScanPool500 daily before 08:30, DailyStockScan before 09:00, BadNewsMonitor pre-open and midday, and LimitUpExternalEvidence pre-open and midday. AIValuations and WeeklyAIValuations are not scheduled for V2.4 openai mode.');
}

function oneClickSetupProjectTriggers() {
  installV123ProjectTriggers();
}

function auditProjectTriggers() {
  const rows = ScriptApp.getProjectTriggers().map(trigger => {
    const source = trigger.getTriggerSource ? trigger.getTriggerSource() : '';
    const eventType = trigger.getEventType ? trigger.getEventType() : '';
    return `${trigger.getHandlerFunction()} | source=${source} | event=${eventType}`;
  });
  log_('INFO', `Project triggers (${rows.length}): ${rows.join('; ') || 'none'}`);
}

function installMinuteReplayTriggerEvery1Minute() {
  installMinuteReplayTriggerEveryNMinutes_(1);
}

function installMinuteReplayTriggerEvery5Minutes() {
  installMinuteReplayTriggerEveryNMinutes_(5);
}

function installGasRealtimeSnapshotTrigger() {
  installGasRealtimeSnapshotTriggerEvery1Minute();
}

function installGasRealtimeSnapshotTriggerEvery1Minute() {
  removeTriggersFor_(TRIGGER_CONFIG.gasRealtimeHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.gasRealtimeHandlerName)
    .timeBased()
    .everyMinutes(1)
    .create();

  log_('INFO', 'Installed GAS realtime snapshot trigger every 1 minute. The handler skips outside Taiwan market hours.');
}

function installAiValuationTriggerAt9() {
  removeTriggersFor_(TRIGGER_CONFIG.aiValuationHandlerName);
  removeTriggersFor_(TRIGGER_CONFIG.aiValuationContinuationHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.aiValuationHandlerName)
    .timeBased()
    .atHour(7)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed V1.2.3 AI valuation trigger near 07:00 Asia/Taipei every day, targeting completion before 08:30. The handler skips weekends.');
}

function installWeeklyThreeMonthValuationTrigger() {
  removeTriggersFor_(TRIGGER_CONFIG.weeklyValuationHandlerName);
  removeTriggersFor_(TRIGGER_CONFIG.weeklyValuationContinuationHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.weeklyValuationHandlerName)
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(6)
    .nearMinute(30)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed V1.2.3 weekly three-month valuation trigger near Monday 06:30 Asia/Taipei, targeting completion before 08:30 on the first trading day of the week.');
}

function installAllStockUniverseTrigger() {
  removeTriggersFor_(TRIGGER_CONFIG.allStockUniverseHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.allStockUniverseHandlerName)
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(17)
    .nearMinute(0)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed all-stock universe refresh trigger near Sunday 17:00 Asia/Taipei.');
}

function installStockScanPool500Trigger() {
  removeTriggersFor_(TRIGGER_CONFIG.stockScanPool500HandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.stockScanPool500HandlerName)
    .timeBased()
    .atHour(7)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed 500-stock scan pool trigger near 07:30 Asia/Taipei every day.');
}

function installDailyStockScanTrigger() {
  removeTriggersFor_(TRIGGER_CONFIG.dailyStockScanHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.dailyStockScanHandlerName)
    .timeBased()
    .atHour(8)
    .nearMinute(45)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed daily stock scan trigger near 08:45 Asia/Taipei every day. The handler skips weekends.');
}

function installBadNewsMonitorTrigger() {
  if (getTriggerProfileMode_() === 'v24') {
    installBadNewsMonitorTriggerV24_();
    return;
  }
  installBadNewsMonitorTriggerV123_();
}

function installBadNewsMonitorTriggerV123_() {
  removeTriggersFor_(TRIGGER_CONFIG.badNewsHandlerName);
  removeTriggersFor_(TRIGGER_CONFIG.badNewsContinuationHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.badNewsHandlerName)
    .timeBased()
    .atHour(6)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed optional V1.2.3 bad-news monitor trigger near 06:30 Asia/Taipei every day. This is not installed by the V1.2.3 recommended trigger setup.');
}

function installLimitUpExternalEvidenceTrigger() {
  if (getTriggerProfileMode_() === 'v24') {
    installLimitUpExternalEvidenceTriggerV24_();
    return;
  }
  installLimitUpExternalEvidenceTriggerV123_();
}

function installLimitUpExternalEvidenceTriggerV123_() {
  removeTriggersFor_(TRIGGER_CONFIG.limitUpEvidenceHandlerName);
  removeTriggersFor_(TRIGGER_CONFIG.limitUpEvidenceContinuationHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.limitUpEvidenceHandlerName)
    .timeBased()
    .atHour(7)
    .nearMinute(45)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed V1.2.3 limit-up external evidence trigger near 07:45 Asia/Taipei every day, targeting completion before 08:30. Continuation triggers finish the morning batch session.');
}

function installBadNewsMonitorTriggerV24_() {
  removeTriggersFor_(TRIGGER_CONFIG.badNewsHandlerName);
  removeTriggersFor_(TRIGGER_CONFIG.badNewsContinuationHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.badNewsHandlerName)
    .timeBased()
    .atHour(7)
    .nearMinute(50)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();
  ScriptApp.newTrigger(TRIGGER_CONFIG.badNewsHandlerName)
    .timeBased()
    .atHour(10)
    .nearMinute(55)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed V2.4 bad-news monitor triggers near 07:50 and 10:55 Asia/Taipei every day.');
}

function installLimitUpExternalEvidenceTriggerV24_() {
  removeTriggersFor_(TRIGGER_CONFIG.limitUpEvidenceHandlerName);
  removeTriggersFor_(TRIGGER_CONFIG.limitUpEvidenceContinuationHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.limitUpEvidenceHandlerName)
    .timeBased()
    .atHour(8)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();
  ScriptApp.newTrigger(TRIGGER_CONFIG.limitUpEvidenceHandlerName)
    .timeBased()
    .atHour(11)
    .nearMinute(15)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed V2.4 limit-up external evidence triggers near 08:00 and 11:15 Asia/Taipei every day. Continuation triggers finish each batch session.');
}

function installAfterCloseMinuteReplayTrigger() {
  removeTriggersFor_(TRIGGER_CONFIG.afterCloseMinuteReplayHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.afterCloseMinuteReplayHandlerName)
    .timeBased()
    .atHour(14)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed after-close minute replay trigger near 14:30 Asia/Taipei every day. The handler skips weekends.');
}

function installMinuteReplayBackfillTrigger() {
  removeTriggersFor_(TRIGGER_CONFIG.minuteBackfillHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.minuteBackfillHandlerName)
    .timeBased()
    .everyMinutes(5)
    .create();

  log_('INFO', 'Installed minute replay backfill continuation trigger every 5 minutes.');
}

function removeManagedProjectTriggers_() {
  TRIGGER_CONFIG.managedHandlerNames.forEach(handlerName => removeTriggersFor_(handlerName));
  log_('INFO', `Removed managed project triggers before one-click install: ${TRIGGER_CONFIG.managedHandlerNames.join(', ')}.`);
}

function setTriggerProfileMode_(mode) {
  const normalized = String(mode || '').toLowerCase() === 'v24' ? 'v24' : 'v123';
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(TRIGGER_CONFIG.profileModePropertyName, normalized);
  clearTriggerProfileRunState_();
  log_('INFO', `Set trigger profile mode to ${normalized}.`);
}

function getTriggerProfileMode_() {
  const value = PropertiesService.getScriptProperties().getProperty(TRIGGER_CONFIG.profileModePropertyName);
  return String(value || '').toLowerCase() === 'v24' ? 'v24' : 'v123';
}

function clearTriggerProfileRunState_() {
  const properties = PropertiesService.getScriptProperties();
  [
    'AI_VALUATION_RUN_DATE',
    'AI_VALUATION_SYMBOL_INDEX',
    'WEEKLY_VALUATION_RUN_DATE',
    'WEEKLY_VALUATION_SYMBOL_INDEX',
    'BAD_NEWS_ACTIVE_SESSION',
    'BAD_NEWS_COMPLETED_SESSION',
    'BAD_NEWS_SYMBOL_INDEX',
    'LIMIT_UP_EXTERNAL_EVIDENCE_ACTIVE_SESSION',
    'LIMIT_UP_EXTERNAL_EVIDENCE_COMPLETED_SESSION',
    'LIMIT_UP_EXTERNAL_EVIDENCE_SYMBOL_INDEX'
  ].forEach(name => properties.deleteProperty(name));
}

function installRecordTriggerEveryNDays_(days) {
  const intervalDays = Number(days);
  if (!Number.isInteger(intervalDays) ||
      intervalDays < TRIGGER_CONFIG.minIntervalDays ||
      intervalDays > TRIGGER_CONFIG.maxIntervalDays) {
    throw new Error('Trigger interval must be an integer from 1 to 5 days.');
  }

  removeTriggersFor_(TRIGGER_CONFIG.handlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.handlerName)
    .timeBased()
    .atHour(TRIGGER_CONFIG.hour)
    .nearMinute(TRIGGER_CONFIG.nearMinute)
    .everyDays(intervalDays)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', `Installed stock record trigger every ${intervalDays} day(s) near ${TRIGGER_CONFIG.hour}:${TRIGGER_CONFIG.nearMinute} ${TRIGGER_CONFIG.timezone}.`);
}

function installMinuteReplayTriggerEveryNMinutes_(minutes) {
  const intervalMinutes = Number(minutes);
  if ([1, 5, 10, 15, 30].indexOf(intervalMinutes) === -1) {
    throw new Error('Minute replay trigger interval must be one of: 1, 5, 10, 15, 30.');
  }

  removeTriggersFor_(TRIGGER_CONFIG.minuteReplayHandlerName);
  const builder = ScriptApp.newTrigger(TRIGGER_CONFIG.minuteReplayHandlerName).timeBased();
  if (intervalMinutes === 1) {
    builder.everyMinutes(1).create();
  } else if (intervalMinutes === 5) {
    builder.everyMinutes(5).create();
  } else if (intervalMinutes === 10) {
    builder.everyMinutes(10).create();
  } else if (intervalMinutes === 15) {
    builder.everyMinutes(15).create();
  } else {
    builder.everyMinutes(30).create();
  }

  log_('INFO', `Installed minute replay trigger every ${intervalMinutes} minute(s). Collection skips outside 09:00-13:45 Asia/Taipei weekdays.`);
}
