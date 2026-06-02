const BACKTEST_STRATEGIES = [
  {
    id: 'opening_range_breakout',
    name: 'Opening Range Breakout',
    enabled: true,
    description: 'Buy when price breaks the first 5-minute high with volume confirmation.',
    entry: {
      type: 'opening_range_breakout',
      rangeMinutes: 5,
      startTime: '09:05',
      endTime: '11:00',
      breakoutBufferPct: 0.15,
      volumeLookback: 5,
      volumeMultiplier: 1.5
    },
    exit: {
      stopLossPct: 1.2,
      takeProfitPct: 2.4,
      maxHoldingMinutes: 120,
      forceExitTime: '13:20'
    },
    risk: {
      capitalPerTrade: 100000,
      feeRatePct: 0.1425,
      taxRatePct: 0.3,
      slippagePct: 0.05
    }
  },
  {
    id: 'vwap_momentum',
    name: 'VWAP Momentum',
    enabled: true,
    description: 'Buy when close reclaims VWAP with stronger-than-recent volume.',
    entry: {
      type: 'vwap_momentum',
      startTime: '09:10',
      endTime: '12:30',
      volumeLookback: 8,
      volumeMultiplier: 1.3,
      minPriceAboveVwapPct: 0.05
    },
    exit: {
      stopLossPct: 1.0,
      takeProfitPct: 2.0,
      trailingStopPct: 0.9,
      maxHoldingMinutes: 150,
      forceExitTime: '13:20'
    },
    risk: {
      capitalPerTrade: 100000,
      feeRatePct: 0.1425,
      taxRatePct: 0.3,
      slippagePct: 0.05
    }
  },
  {
    id: 'dip_reversal',
    name: 'Intraday Dip Reversal',
    enabled: true,
    description: 'Buy rebound after an intraday dip from the morning high.',
    entry: {
      type: 'dip_reversal',
      startTime: '09:20',
      endTime: '12:45',
      dipFromHighPct: 1.4,
      reboundPct: 0.4,
      volumeLookback: 10,
      volumeMultiplier: 1.1
    },
    exit: {
      stopLossPct: 0.9,
      takeProfitPct: 1.6,
      maxHoldingMinutes: 90,
      forceExitTime: '13:20'
    },
    risk: {
      capitalPerTrade: 100000,
      feeRatePct: 0.1425,
      taxRatePct: 0.3,
      slippagePct: 0.05
    }
  }
];

function getBacktestStrategies_() {
  return JSON.parse(JSON.stringify(BACKTEST_STRATEGIES.filter(strategy => strategy.enabled)));
}
