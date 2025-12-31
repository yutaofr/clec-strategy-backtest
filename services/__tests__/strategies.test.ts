import { describe, it, expect } from 'vitest'
import { strategyNoRebalance, strategyRebalance, strategySmart } from '../strategies'
import { AssetConfig, MarketDataRow, PortfolioState } from '../../types'

const mockConfig: AssetConfig = {
  initialCapital: 10000,
  contributionAmount: 1000,
  contributionIntervalMonths: 1, // Monthly
  yearlyContributionMonth: 12,
  qqqWeight: 60,
  qldWeight: 40,
  contributionQqqWeight: 50,
  contributionQldWeight: 50, // Different from initial for testing
  cashYieldAnnual: 4,
  leverage: {
    enabled: false,
    interestRate: 0,
    qqqPledgeRatio: 0.7,
    qldPledgeRatio: 0,
    cashPledgeRatio: 0.95,
    maxLtv: 2,
    withdrawType: 'PERCENT',
    withdrawValue: 0,
    inflationRate: 0,
    interestType: 'CAPITALIZED',
    ltvBasis: 'TOTAL_ASSETS',
  },
}

const mockMarketData: MarketDataRow = {
  date: '2020-01-01',
  qqqClose: 100,
  qldClose: 50,
  qqqLow: 100,
  qldLow: 50,
}

const mockState: PortfolioState = {
  date: '2019-12-01',
  shares: { QQQ: 0, QLD: 0 },
  cashBalance: 0,
  debtBalance: 0,
  accruedInterest: 0,
  totalValue: 0,
  strategyMemory: {},
  ltv: 0,
  beta: 0,
  events: [],
}

describe('Strategies', () => {
  describe('strategyNoRebalance', () => {
    it('should allocate initial capital correctly on month 0', () => {
      const newState = strategyNoRebalance(mockState, mockMarketData, mockConfig, 0)

      // Initial: 10000. QQQ=60% (6000), QLD=40% (4000). Prices: QQQ=100, QLD=50.
      expect(newState.shares.QQQ).toBe(60) // 6000 / 100
      expect(newState.shares.QLD).toBe(80) // 4000 / 50
      expect(newState.cashBalance).toBe(0)
    })

    it('should perform DCA on subsequent months', () => {
      // Setup state with some shares
      const state = { ...mockState, shares: { QQQ: 10, QLD: 10 }, cashBalance: 0 }
      const nextMonthData = { ...mockMarketData, date: '2020-02-01' } // Month 1

      const newState = strategyNoRebalance(state, nextMonthData, mockConfig, 1)

      // Contribution: 1000. Weights: 50/50.
      // Buy QQQ: 500 / 100 = 5 shares.
      // Buy QLD: 500 / 50 = 10 shares.
      expect(newState.shares.QQQ).toBe(15) // 10 + 5
      expect(newState.shares.QLD).toBe(20) // 10 + 10
    })
  })

  describe('strategyRebalance', () => {
    it('should rebalance to target weights in January', () => {
      // Month 12 => January of next year usually (if start is Jan).
      // Let's say we are at month 12, date 2021-01-01.
      const janData = { ...mockMarketData, date: '2021-01-01' }

      // Setup skewed portfolio
      // Target: 60/40.
      // Current Value: 10000. IF QQQ=100, QLD=50.
      // Let's have all in QQQ. QQQ=100 shares ($10000). QLD=0.
      const state = {
        ...mockState,
        shares: { QQQ: 100, QLD: 0 },
        totalValue: 10000,
      }

      // Month index 12 (not 0, so NOT first month)
      const newState = strategyRebalance(state, janData, mockConfig, 12)

      // Total Value 10000 + Contribution 1000 = 11000 roughly?
      // Wait, strategyRebalance calls strategyNoRebalance first which adds contribution.
      // Contribution: 1000. 50/50. QQQ+5 ($500), QLD+10 ($500).
      // Pre-rebalance holdings: QQQ=105, QLD=10. Value: 10500 + 500 = 11000.
      // Target Rebalance: 60% QQQ, 40% QLD of 11000.
      // QQQ: 6600 -> 66 shares.
      // QLD: 4400 -> 88 shares.

      expect(newState.shares.QQQ).toBeCloseTo(66)
      expect(newState.shares.QLD).toBeCloseTo(88)
    })

    it('should NOT rebalance in non-January months', () => {
      const febData = { ...mockMarketData, date: '2021-02-01' }
      const state = { ...mockState, shares: { QQQ: 100, QLD: 0 } }

      // Call rebalance
      const newState = strategyRebalance(state, febData, mockConfig, 13)

      // Should only do DCA.
      // DCA: +5 QQQ, +10 QLD.
      // Result: 105 QQQ, 10 QLD.
      expect(newState.shares.QQQ).toBe(105)
      expect(newState.shares.QLD).toBe(10)
    })
  })

  describe('strategySmart', () => {
    it('initializes memory correctly', () => {
      const newState = strategySmart(mockState, mockMarketData, mockConfig, 0)
      expect(newState.strategyMemory.currentYear).toBe(2020)
      expect(newState.strategyMemory.startQLDVal).toBeDefined()
    })

    // More complex tests for profit taking/dip buying could be added here
    // simulating a December check.
  })
})
