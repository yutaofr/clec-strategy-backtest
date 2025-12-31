import { describe, it, expect } from 'vitest'
import { runBacktest } from '../simulationEngine'
import { AssetConfig, MarketDataRow } from '../../types'
import { strategyNoRebalance } from '../strategies'

const createBaseConfig = (): AssetConfig => ({
  initialCapital: 10000,
  contributionAmount: 0,
  contributionIntervalMonths: 1,
  yearlyContributionMonth: 12,
  qqqWeight: 0,
  qldWeight: 0,
  contributionQqqWeight: 0,
  contributionQldWeight: 0,
  cashYieldAnnual: 0,
  leverage: {
    enabled: false,
    interestRate: 0,
    qqqPledgeRatio: 0.7,
    qldPledgeRatio: 0.0,
    cashPledgeRatio: 0.95,
    maxLtv: 1,
    withdrawType: 'PERCENT',
    withdrawValue: 0,
    inflationRate: 0,
    interestType: 'CAPITALIZED',
    ltvBasis: 'TOTAL_ASSETS',
  },
})

const generateMarketData = (months: number): MarketDataRow[] => {
  const data: MarketDataRow[] = []
  for (let i = 0; i < months; i++) {
    data.push({
      date: `2020-${(i + 1).toString().padStart(2, '0')}-01`,
      qqqClose: 100,
      qqqLow: 100,
      qldClose: 100,
      qldLow: 100,
    })
  }
  return data
}

describe('Negative Cash Bankruptcy', () => {
  it('should trigger bankruptcy when cash balance becomes negative', () => {
    const config = createBaseConfig()
    config.initialCapital = 1000
    config.contributionAmount = -2000 // Withdraw more than available cash
    config.contributionIntervalMonths = 1

    const data = generateMarketData(2)
    const result = runBacktest(data, strategyNoRebalance, config, 'Test')

    expect(result.isBankrupt).toBe(true)
    expect(result.bankruptcyDate).toBe('2020-02-01')
    expect(result.metrics.finalBalance).toBe(0)
    expect(
      result.history[1].events.some((e) =>
        e.description.includes('BANKRUPTCY: Negative Cash Balance'),
      ),
    ).toBe(true)
  })

  it('should NOT trigger bankruptcy when cash balance is exactly zero', () => {
    const config = createBaseConfig()
    config.initialCapital = 1000
    config.contributionAmount = -1000 // Withdraw exactly available cash
    config.contributionIntervalMonths = 1

    const data = generateMarketData(2)
    const result = runBacktest(data, strategyNoRebalance, config, 'Test')

    expect(result.isBankrupt).toBe(false)
    expect(result.history[1].cashBalance).toBe(0)
  })
})
