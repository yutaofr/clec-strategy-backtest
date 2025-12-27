import { describe, it, expect } from 'vitest';
import { runBacktest } from '../simulationEngine';
import { AssetConfig, MarketDataRow } from '../../types';
import { strategyNoRebalance, strategyRebalance, strategySmart } from '../strategies';

const createBaseConfig = (): AssetConfig => ({
  initialCapital: 10000,
  contributionAmount: 1000,
  contributionIntervalMonths: 1,
  yearlyContributionMonth: 12,
  qqqWeight: 60,
  qldWeight: 40,
  contributionQqqWeight: 60,
  contributionQldWeight: 40,
  cashYieldAnnual: 0, // Set to 0 for simpler math in most tests
  leverage: {
    enabled: false,
    interestRate: 0,
    qqqPledgeRatio: 0.7,
    qldPledgeRatio: 0.0,
    cashPledgeRatio: 0.95,
    maxLtv: 1, // 100%
    withdrawType: 'PERCENT',
    withdrawValue: 0,
    inflationRate: 0,
    interestType: 'CAPITALIZED',
    ltvBasis: 'TOTAL_ASSETS'
  }
});

const generateMarketData = (months: number, qqqPrice: number = 100, qldPrice: number = 100): MarketDataRow[] => {
  const data: MarketDataRow[] = [];
  for (let i = 0; i < months; i++) {
    const year = 2020 + Math.floor(i / 12);
    const month = (i % 12) + 1;
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
    data.push({
      date: dateStr,
      qqq: qqqPrice,
      qld: qldPrice
    });
  }
  return data;
};

describe('simulationEngine - Comprehensive Matrix', () => {

  describe('DCA Patterns', () => {
    it('should handle positive DCA', () => {
      const config = createBaseConfig();
      config.initialCapital = 1000;
      config.contributionAmount = 100;
      const data = generateMarketData(3); 
      const result = runBacktest(data, strategyNoRebalance, config, 'Test');
      expect(result.history[2].totalValue).toBe(1200);
    });

    it('should handle negative DCA', () => {
      const config = createBaseConfig();
      config.initialCapital = 1000;
      config.contributionAmount = -100;
      const data = generateMarketData(3);
      const result = runBacktest(data, strategyNoRebalance, config, 'Test');
      expect(result.history[2].totalValue).toBe(800);
    });

    it('should respect spacing', () => {
      const config = createBaseConfig();
      config.initialCapital = 1000;
      config.contributionAmount = 100;
      config.contributionIntervalMonths = 12; // Yearly
      config.yearlyContributionMonth = 1; // January
      
      const data = generateMarketData(13); 
      const result = runBacktest(data, strategyNoRebalance, config, 'Test');
      // Jan 0: Capital 1000.
      // Index 1..11: No DCA.
      // Index 12 (Jan next year): +100. Total 1100.
      expect(result.history[11].totalValue).toBe(1000);
      expect(result.history[12].totalValue).toBe(1100);
    });
  });

  describe('Leverage & Withdrawal', () => {
    it('should borrow fixed amount with inflation', () => {
      const config = createBaseConfig();
      config.contributionAmount = 0;
      config.leverage = {
        enabled: true,
        withdrawType: 'FIXED',
        withdrawValue: 1000,
        interestRate: 0,
        inflationRate: 100,
        qqqPledgeRatio: 0.7,
        qldPledgeRatio: 0,
        cashPledgeRatio: 0.95,
        maxLtv: 10,
        interestType: 'CAPITALIZED',
        ltvBasis: 'TOTAL_ASSETS'
      };
      
      const data = generateMarketData(24);
      const result = runBacktest(data, strategyNoRebalance, config, 'Test');
      
      expect(result.history[0].debtBalance).toBe(1000);
      expect(result.history[12].debtBalance).toBe(3000);
    });

    it('should borrow percent of assets', () => {
      const config = createBaseConfig();
      config.initialCapital = 10000;
      config.contributionAmount = 0;
      config.leverage = {
        enabled: true,
        withdrawType: 'PERCENT',
        withdrawValue: 10,
        interestRate: 0,
        inflationRate: 0,
        qqqPledgeRatio: 0.7,
        qldPledgeRatio: 0,
        cashPledgeRatio: 0.95,
        maxLtv: 10,
        interestType: 'CAPITALIZED',
        ltvBasis: 'TOTAL_ASSETS'
      };
      
      const data = generateMarketData(1);
      const result = runBacktest(data, strategyNoRebalance, config, 'Test');
      expect(result.history[0].debtBalance).toBe(1000);
    });
  });

  describe('LTV Basis', () => {
    it('should use TOTAL_ASSETS correctly', () => {
      const config = createBaseConfig();
      config.initialCapital = 10000;
      config.leverage = {
          enabled: true,
          ltvBasis: 'TOTAL_ASSETS',
          withdrawValue: 2000,
          withdrawType: 'FIXED',
          interestRate: 0,
          inflationRate: 0,
          qqqPledgeRatio: 0.7,
          qldPledgeRatio: 0,
          cashPledgeRatio: 0.95,
          maxLtv: 10,
          interestType: 'CAPITALIZED'
      };
      const data = generateMarketData(1);
      const result = runBacktest(data, strategyNoRebalance, config, 'Test');
      // Assets 10000, Debt 2000 => 20%
      expect(result.history[0].ltv).toBe(20);
    });

    it('should use COLLATERAL correctly', () => {
       const config = createBaseConfig();
       config.initialCapital = 10000;
       config.qqqWeight = 100; config.qldWeight = 0;
       config.leverage = {
           enabled: true,
           ltvBasis: 'COLLATERAL',
           withdrawValue: 2000,
           withdrawType: 'FIXED',
           qqqPledgeRatio: 0.5,
           qldPledgeRatio: 0,
           cashPledgeRatio: 0.95,
           interestRate: 0,
           inflationRate: 0,
           maxLtv: 10,
           interestType: 'CAPITALIZED'
       };
       const data = generateMarketData(1);
       const result = runBacktest(data, strategyNoRebalance, config, 'Test');
       // Val QQQ = 10000. Collateral = 5000. 
       // Debt = 2000. LTV = 40%
       expect(result.history[0].ltv).toBe(40);
    });
  });

  describe('Bankruptcy', () => {
    it('should trigger bankruptcy when LTV > maxLtv', () => {
       const config = createBaseConfig();
       config.initialCapital = 10000;
       config.leverage = {
           enabled: true,
           maxLtv: 30, // 30%
           withdrawValue: 4000, // 4000 / 10000 = 40% LTV
           withdrawType: 'FIXED',
           interestRate: 0,
           inflationRate: 0,
           qqqPledgeRatio: 0.7,
           qldPledgeRatio: 0,
           cashPledgeRatio: 0.95,
           interestType: 'CAPITALIZED',
           ltvBasis: 'TOTAL_ASSETS'
       };
       const data = generateMarketData(1);
       const result = runBacktest(data, strategyNoRebalance, config, 'Test');
       expect(result.isBankrupt).toBe(true);
       expect(result.metrics.finalBalance).toBe(0);
    });
  });

  describe('Interest Modes', () => {

    it('MATURITY (Simple)', () => {
      const config = createBaseConfig();
      config.contributionAmount = 0;
      config.leverage = {
        enabled: true,
        interestRate: 120,
        interestType: 'MATURITY',
        withdrawType: 'FIXED',
        withdrawValue: 1000,
        qqqPledgeRatio: 0.7,
        qldPledgeRatio: 0,
        cashPledgeRatio: 0.95,
        maxLtv: 10,
        inflationRate: 0,
        ltvBasis: 'TOTAL_ASSETS'
      };
      
      const data = generateMarketData(3);
      const result = runBacktest(data, strategyNoRebalance, config, 'Test');
      expect(result.history[1].accruedInterest).toBeGreaterThan(1);
      expect(result.history[1].debtBalance).toBe(1000);
    });

    it('CAPITALIZED (Compound)', () => {
      const config = createBaseConfig();
      config.contributionAmount = 0;
      config.leverage = {
        enabled: true,
        interestRate: 120,
        interestType: 'CAPITALIZED',
        withdrawType: 'FIXED',
        withdrawValue: 1000,
        qqqPledgeRatio: 0.7,
        qldPledgeRatio: 0,
        cashPledgeRatio: 0.95,
        maxLtv: 10,
        inflationRate: 0,
        ltvBasis: 'TOTAL_ASSETS'
      };
      
      const data = generateMarketData(3);
      const result = runBacktest(data, strategyNoRebalance, config, 'Test');
      expect(result.history[1].debtBalance).toBeGreaterThan(1000);
    });

    it('MONTHLY (Pay from cash)', () => {
      const config = createBaseConfig();
      config.initialCapital = 10000;
      config.contributionAmount = 0;
      config.qqqWeight = 0; config.qldWeight = 0;
      config.leverage = {
        enabled: true,
        interestRate: 120,
        interestType: 'MONTHLY',
        withdrawType: 'FIXED',
        withdrawValue: 1000,
        qqqPledgeRatio: 0.7,
        qldPledgeRatio: 0,
        cashPledgeRatio: 0.95,
        maxLtv: 10,
        inflationRate: 0,
        ltvBasis: 'TOTAL_ASSETS'
      };
      
      const data = generateMarketData(3);
      const result = runBacktest(data, strategyNoRebalance, config, 'Test');
      expect(result.history[1].cashBalance).toBeLessThan(10000);
    });
  });

  describe('Strategies', () => {
    it('Yearly Rebalance', () => {
      const config = createBaseConfig();
      const data = generateMarketData(14);
      data[1].qqq = 200; // Skew
      const result = runBacktest(data, strategyRebalance, config, 'Test');
      const state = result.history[12];
      const qqqVal = state.shares.QQQ * 100;
      const qldVal = state.shares.QLD * 100;
      expect(qqqVal/(qqqVal+qldVal)).toBeCloseTo(0.6, 2);
    });

    it('Smart Adjust', () => {
      const config = createBaseConfig();
      config.initialCapital = 10000;
      const data = generateMarketData(13);
      data[11].qld = 200; // Profit target
      const result = runBacktest(data, strategySmart, config, 'Test');
      expect(result.history[11].strategyMemory.lastAction).toMatch(/Sold Profit/);
    });
  });
});
