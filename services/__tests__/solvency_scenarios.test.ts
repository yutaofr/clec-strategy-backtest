import { describe, it, expect } from 'vitest'
import { runBacktest } from '../simulationEngine'
import { MARKET_DATA } from '../../constants'
import { getStrategyByType } from '../strategies'
import { Profile } from '../../types'

const SOLVENCY_PROFILES: Profile[] = [
  {
    id: '2',
    name: '台灣433聰明再平衡 質押借款利息3%，最多每年借款2.5% total assets LTV 60% 成功',
    color: '#ea580c',
    strategyType: 'SMART',
    config: {
      initialCapital: 1000000,
      contributionAmount: 0,
      contributionIntervalMonths: 1,
      yearlyContributionMonth: 12,
      qqqWeight: 40,
      qldWeight: 30,
      contributionQqqWeight: 0,
      contributionQldWeight: 0,
      cashYieldAnnual: 3.5,
      leverage: {
        enabled: true,
        interestRate: 3,
        qqqPledgeRatio: 0.6,
        qldPledgeRatio: 0.6,
        cashPledgeRatio: 0.6,
        maxLtv: 60,
        withdrawType: 'FIXED',
        withdrawValue: 25000,
        inflationRate: 0,
        interestType: 'CAPITALIZED',
        ltvBasis: 'TOTAL_ASSETS',
      },
    },
  },
  {
    id: '3n492d5zo',
    name: '美國433聰明再平衡 質押借款利息6.5%，collateral Value LTV 80%最多每年借款1.9%成功',
    color: '#2563eb',
    strategyType: 'SMART',
    config: {
      initialCapital: 1000000,
      contributionAmount: 0,
      contributionIntervalMonths: 1,
      yearlyContributionMonth: 12,
      qqqWeight: 40,
      qldWeight: 30,
      contributionQqqWeight: 0,
      contributionQldWeight: 0,
      cashYieldAnnual: 3.5,
      leverage: {
        enabled: true,
        interestRate: 6.5,
        qqqPledgeRatio: 0.7,
        qldPledgeRatio: 0,
        cashPledgeRatio: 0.95,
        maxLtv: 80,
        withdrawType: 'FIXED',
        withdrawValue: 19000,
        inflationRate: 0,
        interestType: 'CAPITALIZED',
        ltvBasis: 'COLLATERAL',
      },
    },
  },
  {
    id: 'oklrsz25f',
    name: '台灣433聰明再平衡 質押借款利息3%，最多每年借款2.6% total assets LTV 60% 失敗',
    color: '#475569',
    strategyType: 'SMART',
    config: {
      initialCapital: 1000000,
      contributionAmount: 0,
      contributionIntervalMonths: 1,
      yearlyContributionMonth: 12,
      qqqWeight: 40,
      qldWeight: 30,
      contributionQqqWeight: 0,
      contributionQldWeight: 0,
      cashYieldAnnual: 3.5,
      leverage: {
        enabled: true,
        interestRate: 3,
        qqqPledgeRatio: 0.6,
        qldPledgeRatio: 0.6,
        cashPledgeRatio: 0.6,
        maxLtv: 60,
        withdrawType: 'FIXED',
        withdrawValue: 26000,
        inflationRate: 0,
        interestType: 'CAPITALIZED',
        ltvBasis: 'TOTAL_ASSETS',
      },
    },
  },
  {
    id: '6qrqgep01',
    name: '美國433聰明再平衡 質押借款利息6.5%，collateral Value LTV 80%最多每年借款2.2%失敗',
    color: '#475569',
    strategyType: 'SMART',
    config: {
      initialCapital: 1000000,
      contributionAmount: 0,
      contributionIntervalMonths: 1,
      yearlyContributionMonth: 12,
      qqqWeight: 40,
      qldWeight: 30,
      contributionQqqWeight: 0,
      contributionQldWeight: 0,
      cashYieldAnnual: 3.5,
      leverage: {
        enabled: true,
        interestRate: 6.5,
        qqqPledgeRatio: 0.7,
        qldPledgeRatio: 0,
        cashPledgeRatio: 0.95,
        maxLtv: 80,
        withdrawType: 'FIXED',
        withdrawValue: 22000,
        inflationRate: 0,
        interestType: 'CAPITALIZED',
        ltvBasis: 'COLLATERAL',
      },
    },
  },
  {
    id: 'hmky3xsko',
    name: '80 20 每月花2250年花2.7% 年度再平衡最後資產高過原始資產一百萬 成功',
    color: '#9333ea',
    strategyType: 'REBALANCE',
    config: {
      initialCapital: 1000000,
      contributionAmount: -2250,
      contributionIntervalMonths: 1,
      yearlyContributionMonth: 12,
      qqqWeight: 80,
      qldWeight: 0,
      contributionQqqWeight: 0,
      contributionQldWeight: 0,
      cashYieldAnnual: 3.5,
      leverage: {
        enabled: false,
        interestRate: 5,
        qqqPledgeRatio: 0.7,
        qldPledgeRatio: 0,
        cashPledgeRatio: 0.95,
        maxLtv: 100,
        withdrawType: 'PERCENT',
        withdrawValue: 2,
        inflationRate: 0,
        interestType: 'CAPITALIZED',
        ltvBasis: 'TOTAL_ASSETS',
      },
    },
  },
  {
    id: 'j6nutxp60',
    name: '80 20 每年花費 2.8% （月花2333)年度再平衡到目前資產低於原始資產一百萬 失敗',
    color: '#0891b2',
    strategyType: 'REBALANCE',
    config: {
      initialCapital: 1000000,
      contributionAmount: -2333,
      contributionIntervalMonths: 1,
      yearlyContributionMonth: 12,
      qqqWeight: 80,
      qldWeight: 0,
      contributionQqqWeight: 0,
      contributionQldWeight: 0,
      cashYieldAnnual: 3.5,
      leverage: {
        enabled: false,
        interestRate: 5,
        qqqPledgeRatio: 0.7,
        qldPledgeRatio: 0,
        cashPledgeRatio: 0.95,
        maxLtv: 100,
        withdrawType: 'PERCENT',
        withdrawValue: 2,
        inflationRate: 0,
        interestType: 'CAPITALIZED',
        ltvBasis: 'TOTAL_ASSETS',
      },
    },
  },
]

describe('Standardized Solvency Backtests', () => {
  SOLVENCY_PROFILES.forEach((profile) => {
    it(`[${profile.id}] ${profile.name}`, () => {
      const strategy = getStrategyByType(profile.strategyType)
      const result = runBacktest(MARKET_DATA, strategy, profile.config, profile.name)

      const shouldBankrupt = profile.id === 'oklrsz25f' || profile.id === '6qrqgep01'

      if (shouldBankrupt) {
        expect(result.isBankrupt).toBe(true)
        expect(result.bankruptcyDate).toBeTruthy()
      } else {
        expect(result.isBankrupt).toBe(false)
      }

      // Additional checks for specific IDs if needed
      if (profile.id === '2' || profile.id === '3n492d5zo') {
        expect(result.metrics.finalBalance).toBeGreaterThan(0)
      }

      if (profile.id === 'j6nutxp60') {
        // Prompts says this one is "FAIL" but doesn't explicitly link to "solvency/liquidation"
        // unlike the other two. It's failure relative to initial capital.
        expect(result.metrics.finalBalance).toBeLessThan(1000000)
      }
    })
  })
})
