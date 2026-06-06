const TRIGGER_CONFIG = {
  handlerName: 'recordStockInfo',
  minuteReplayHandlerName: 'recordMinuteReplayCandles',
  afterCloseMinuteReplayHandlerName: 'recordTodayMinuteReplayCandlesAfterClose',
  minuteBackfillHandlerName: 'continueMinuteReplayBackfill',
  gasRealtimeHandlerName: 'collectGasRealtimeSnapshots',
  aiValuationHandlerName: 'recalculateAiValuationsAtOpen',
  weeklyValuationHandlerName: 'recalculateWeeklyThreeMonthValuations',
  allStockUniverseHandlerName: 'refreshAllStockUniverseWeekly',
  stockScanPool500HandlerName: 'refreshStockScanPool500Daily',
  dailyStockScanHandlerName: 'runDailyStockScan',
  badNewsHandlerName: 'monitorBadNewsSignals',
  limitUpEvidenceHandlerName: 'refreshLimitUpExternalEvidence',
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
  TRIGGER_CONFIG.weeklyValuationHandlerName,
  TRIGGER_CONFIG.allStockUniverseHandlerName,
  TRIGGER_CONFIG.stockScanPool500HandlerName,
  TRIGGER_CONFIG.dailyStockScanHandlerName,
  TRIGGER_CONFIG.badNewsHandlerName,
  TRIGGER_CONFIG.limitUpEvidenceHandlerName,
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
  setupSheets();
  removeManagedProjectTriggers_();
  installRecordTriggerEvery1Day();
  installAiValuationTriggerAt9();
  installWeeklyThreeMonthValuationTrigger();
  installAllStockUniverseTrigger();
  installStockScanPool500Trigger();
  installDailyStockScanTrigger();
  installBadNewsMonitorTrigger();
  installLimitUpExternalEvidenceTrigger();
  installGasRealtimeSnapshotTriggerEvery1Minute();
  installMinuteReplayTriggerEvery1Minute();
  installAfterCloseMinuteReplayTrigger();
  auditProjectTriggers();
  getSpreadsheet_().toast('Recommended Taiwan stock triggers installed.', 'Taiwan Stock', 5);
  log_('INFO', 'Installed recommended project triggers with one-click setup. Realtime snapshots and minute replay run every 1 minute during guarded market windows.');
}

function oneClickSetupProjectTriggers() {
  installRecommendedProjectTriggers();
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
    .atHour(16)
    .nearMinute(20)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed 500-stock scan pool trigger near 16:20 Asia/Taipei every day, before the 100-stock daily scan.');
}

function installDailyStockScanTrigger() {
  removeTriggersFor_(TRIGGER_CONFIG.dailyStockScanHandlerName);
  ScriptApp.newTrigger(TRIGGER_CONFIG.dailyStockScanHandlerName)
    .timeBased()
    .atHour(16)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone(TRIGGER_CONFIG.timezone)
    .create();

  log_('INFO', 'Installed daily stock scan trigger near 16:30 Asia/Taipei every day. The handler skips weekends.');
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

function removeManagedProjectTriggers_() {
  TRIGGER_CONFIG.managedHandlerNames.forEach(handlerName => removeTriggersFor_(handlerName));
  log_('INFO', `Removed managed project triggers before one-click install: ${TRIGGER_CONFIG.managedHandlerNames.join(', ')}.`);
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
