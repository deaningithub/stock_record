const TRIGGER_CONFIG = {
  handlerName: 'recordStockInfo',
  minuteReplayHandlerName: 'recordMinuteReplayCandles',
  afterCloseMinuteReplayHandlerName: 'recordTodayMinuteReplayCandlesAfterClose',
  minuteBackfillHandlerName: 'continueMinuteReplayBackfill',
  gasRealtimeHandlerName: 'collectGasRealtimeSnapshots',
  aiValuationHandlerName: 'recalculateAiValuationsAtOpen',
  defaultIntervalDays: 1,
  minIntervalDays: 1,
  maxIntervalDays: 5,
  hour: 15,
  nearMinute: 20,
  timezone: 'Asia/Taipei'
};

function recordStockInfo() {
  recordIntradayQuotes();
  recordLatestDailyCandles();
}

function installRecordTrigger() {
  installRecordTriggerEveryNDays_(TRIGGER_CONFIG.defaultIntervalDays);
}

function installRecordTriggerEvery1Day() {
  installRecordTriggerEveryNDays_(1);
}

function installRecordTriggerEvery2Days() {
  installRecordTriggerEveryNDays_(2);
}

function installRecordTriggerEvery3Days() {
  installRecordTriggerEveryNDays_(3);
}

function installRecordTriggerEvery4Days() {
  installRecordTriggerEveryNDays_(4);
}

function installRecordTriggerEvery5Days() {
  installRecordTriggerEveryNDays_(5);
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
