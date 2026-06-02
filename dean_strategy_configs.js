const DEAN_AUTOSTOCK_CONFIG = {
  risk: {
    id: 'dean_risk',
    dryRun: true,
    maxOrderValueTwd: 50000,
    maxDailyOrderValueTwd: 200000,
    maxQuantity: 1000,
    maxLiveQuantityLots: 1,
    allowMarketOrder: false,
    allowMargin: false,
    validateInBacktest: false
  },
  strategies: [
    {
      id: 'dean_ai_rotation',
      name: 'AISpeculativeRotationStrategy',
      enabled: true,
      type: 'ai_rotation',
      entry: {
        minSymbolScore: 0.65,
        minThemeScore: 0.45,
        minBookImbalance: 0.65,
        maxSpreadPct: 1.0,
        minTradeVolume: 1,
        openDelayMinutes: 3,
        maxConcurrentPositions: 5,
        cooldownSeconds: 30,
        maxDailyEntriesPerSymbol: 3
      },
      scoreWeights: {
        bookImbalance: 0.45,
        microPriceAboveMidpoint: 0.2,
        spreadTight: 0.15,
        aboveShortVwap: 0.1,
        hasRecentVolume: 0.1
      },
      valuation: {
        requireAiValuation: true,
        minConfidence: 6,
        minUpsidePct: 4,
        minRatingRank: 2,
        scoreBonus: 0.25,
        strongHoldConfidence: 7,
        strongHoldUpsidePct: 8
      },
      theme: {
        breadthScoreThreshold: 0.6,
        maxBreadthBonus: 0.15
      },
      exit: {
        takeProfitPct: 3.0,
        stopLossPct: 0.3,
        maxHoldingSeconds: 3600,
        forceExitTime: '13:25',
        nearLimitUpHoldPct: 8.5,
        imbalanceReversalAfterSeconds: 300,
        imbalanceReversalBelow: 0.35
      },
      risk: {
        paperQuantityLots: 1,
        lotSize: 1000,
        feeRatePct: 0.1425,
        taxRatePct: 0.3,
        slippagePct: 0.05
      }
    },
    {
      id: 'dean_theme_stock',
      name: 'ThemeStockStrategy',
      enabled: true,
      type: 'theme_stock',
      entry: {
        supportTolerancePct: 0.8,
        volumeMultiplier: 1.5,
        minBookImbalance: 0.55,
        openDelayMinutes: 3,
        maxConcurrentPositions: 3,
        maxDailyEntriesPerSymbol: 2,
        minRewardRisk: 1.5,
        defaultTargetPct: 3.0
      },
      levels: {
        defaultSupportLookbackBars: 30,
        defaultResistanceLookbackBars: 60
      },
      valuation: {
        requireAiValuation: true,
        minConfidence: 6,
        minUpsidePct: 5,
        minRatingRank: 2,
        strongHoldConfidence: 7,
        strongHoldUpsidePct: 8
      },
      exit: {
        supportBreakPct: 1.5,
        forceExitTime: '13:20',
        nearLimitUpHoldPct: 8.5,
        imbalanceProfitExitBelow: 0.25
      },
      risk: {
        budgetTwd: 500000,
        lotSize: 1000,
        feeRatePct: 0.1425,
        taxRatePct: 0.3,
        slippagePct: 0.05
      }
    },
    {
      id: 'dean_limit_up',
      name: 'LimitUpStrategy',
      enabled: true,
      type: 'limit_up',
      entry: {
        minDailyChangePct: 2.0,
        maxDailyChangePct: 9.9,
        volumeMultiplier: 1.5,
        minBookImbalance: 0.55,
        openDelayMinutes: 3,
        maxConcurrentPositions: 5,
        maxDailyEntriesPerSymbol: 1
      },
      valuation: {
        requireAiValuation: true,
        minConfidence: 6,
        minUpsidePct: 5,
        minRatingRank: 2,
        strongHoldConfidence: 7,
        strongHoldUpsidePct: 8
      },
      exit: {
        takeProfitDailyChangePct: 9.9,
        stopLossDailyChangePct: -2.0,
        forceExitTime: '13:20',
        holdNearLimitUp: true
      },
      risk: {
        budgetTwd: 500000,
        lotSize: 1000,
        feeRatePct: 0.1425,
        taxRatePct: 0.3,
        slippagePct: 0.05
      }
    },
    {
      id: 'dean_limit_up_swing',
      name: 'LimitUpSwingStrategy',
      enabled: true,
      type: 'limit_up_swing',
      candidate: {
        day1CloseChangePct: 9.7
      },
      entry: {
        nextDayOpenWindowMinutes: 15,
        maxOpenDropPct: 2.0,
        minBookImbalance: 0.5,
        budgetTwd: 500000,
        requireFundamental: false
      },
      exit: {
        maxDaysFromLimitUp: 3,
        day3OpenExit: true,
        momentumBreakOpenDropPct: 1.5,
        trailingStopPct: 3.0,
        entryDayStopPct: 2.0,
        forceExitTime: '13:20'
      },
      risk: {
        lotSize: 1000,
        feeRatePct: 0.1425,
        taxRatePct: 0.3,
        slippagePct: 0.05
      }
    },
    {
      id: 'dean_fundamental_momentum',
      name: 'FundamentalMomentumStrategy',
      enabled: true,
      type: 'fundamental_momentum',
      entry: {
        entryTolerancePct: 1.5,
        directionLookbackBars: 15,
        volumeMultiplier: 1.2,
        minBookImbalance: 0.52,
        minRemainingUpsidePct: 8.0,
        minConfidence: 5,
        openDelayMinutes: 5,
        maxDailyEntriesPerSymbol: 1
      },
      confidenceTable: [
        { min: 9, maxHoldingDays: 90, stopLossPct: 8.0, positionRatio: 1.0 },
        { min: 7, maxHoldingDays: 60, stopLossPct: 5.0, positionRatio: 0.8 },
        { min: 5, maxHoldingDays: 30, stopLossPct: 3.0, positionRatio: 0.6 },
        { min: 1, maxHoldingDays: 14, stopLossPct: 2.0, positionRatio: 0.4 }
      ],
      valuation: {
        defaultConfidence: 7,
        defaultEntryPriceSource: 'first_close',
        defaultTargetUpsidePct: 12.0,
        preferAiValuation: true
      },
      risk: {
        baseBudgetTwd: 500000,
        lotSize: 1000,
        feeRatePct: 0.1425,
        taxRatePct: 0.3,
        slippagePct: 0.05
      }
    },
    {
      id: 'dean_taiwan_bull',
      name: 'TaiwanBullStrategy',
      enabled: true,
      type: 'taiwan_bull',
      capitalTwd: 2000000,
      core: {
        strategyRef: 'dean_fundamental_momentum',
        capitalRatio: 0.6,
        minConfidence: 7,
        maxConcurrentPositions: 4
      },
      tactical: {
        strategyRef: 'dean_limit_up_swing',
        capitalRatio: 0.4,
        budgetPerTradeTwd: 500000,
        maxConcurrentPositions: 2,
        maxHoldingDays: 3
      },
      conflict: {
        skipTacticalIfCoreHeld: true
      }
    }
  ]
};

function getDeanAutoStockStrategies_() {
  return JSON.parse(JSON.stringify(DEAN_AUTOSTOCK_CONFIG.strategies.filter(strategy => strategy.enabled)));
}

function getDeanAutoStockStrategy_(strategyId) {
  const strategies = getDeanAutoStockStrategies_();
  return strategies.filter(strategy => strategy.id === strategyId)[0] || null;
}

function getDeanCommonRiskConfig_() {
  return JSON.parse(JSON.stringify(DEAN_AUTOSTOCK_CONFIG.risk));
}
