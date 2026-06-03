const TRIGGER_CONFIG = {
  handlerName: 'recordStockInfo',
  minuteReplayHandlerName: 'recordMinuteReplayCandles',
  afterCloseMinuteReplayHandlerName: 'recordTodayMinuteReplayCandlesAfterClose',
  minuteBackfillHandlerName: 'continueMinuteReplayBackfill',
  gasRealtimeHandlerName: 'collectGasRealtimeSnapshots',
  aiValuationHandlerName: 'recalculateAiValuationsAtOpen',
  weeklyValuationHandlerName: 'recalculateWeeklyThreeMonthValuations',
  badNewsHandlerName: 'monitorBadNewsSignals',
  limitUpEvidenceHandlerName: 'refreshLimitUpExternalEvidence',
  minIntervalDays: 1,
  maxIntervalDays: 5,
  hour: 16,
  nearMinute: 5,
  timezone: 'Asia/Taipei'
};

function recordStockInfo() {
  recordIntradayQuotes();
  recordLatestDailyCandles();
}

function installRecordTriggerEvery1Day() {
  installRecordTriggerEveryNDays_(1);
}

function installRecommendedProjectTriggers() {
  removeTriggersFor_('recordLatestDailyCandles');
  installRecordTriggerEvery1Day();
  installAiValuationTriggerAt9();
  installWeeklyThreeMonthValuationTrigger();
  installBadNewsMonitorTrigger();
  installLimitUpExternalEvidenceTrigger();
  installGasRealtimeSnapshotTrigger();
  installMinuteReplayTriggerEvery5Minutes();
  installAfterCloseMinuteReplayTrigger();
  auditProjectTriggers();
  log_('INFO', 'Installed recommended project triggers and removed legacy standalone daily-candle trigger.');
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
  removeTriggersFor_(TRIGGER_CONFIG.gasRealtimeHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.gasRealtimeHandlerName)
    .timeBased()
    .everyMinutes(1)
    .create();

  log_('INFO', 'Installed GAS realtime snapshot trigger every 1 minute. The handler skips outside Taiwan market hours.');
}

function installAiValuationTriggerAt9() {
  removeTriggersFor_(TRIGGER_CONFIG.aiValuationHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.aiValuationHandlerName)
    .timeBased()
    .atHour(9)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed AI valuation trigger near 09:00 Asia/Taipei every day. The handler skips weekends.');
}

function installWeeklyThreeMonthValuationTrigger() {
  removeTriggersFor_(TRIGGER_CONFIG.weeklyValuationHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.weeklyValuationHandlerName)
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(18)
    .nearMinute(0)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed weekly three-month valuation trigger near Sunday 18:00 Asia/Taipei.');
}

function installBadNewsMonitorTrigger() {
  removeTriggersFor_(TRIGGER_CONFIG.badNewsHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.badNewsHandlerName)
    .timeBased()
    .everyMinutes(15)
    .create();

  log_('INFO', 'Installed bad-news monitor trigger every 15 minutes. The handler skips outside 08:00-14:00 Asia/Taipei weekdays.');
}

function installLimitUpExternalEvidenceTrigger() {
  removeTriggersFor_(TRIGGER_CONFIG.limitUpEvidenceHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.limitUpEvidenceHandlerName)
    .timeBased()
    .everyMinutes(30)
    .create();

  log_('INFO', 'Installed limit-up external evidence trigger every 30 minutes. The handler skips outside 08:30-13:35 Asia/Taipei weekdays.');
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
