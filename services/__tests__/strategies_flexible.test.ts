import { describe, it, expect } from 'vitest';
import { strategyFlexible1, strategyFlexible2 } from '../strategies';
import { AssetConfig, PortfolioState, MarketDataRow } from '../../types';

describe('Flexible Rebalancing Strategies', () => {
  const baseConfig: AssetConfig = {
    initialCapital: 100000,
    contributionAmount: 0,
    contributionIntervalMonths: 1,
    yearlyContributionMonth: 12,
    qqqWeight: 50,
    qldWeight: 30,
    contributionQqqWeight: 50,
    contributionQldWeight: 50,
    cashYieldAnnual: 0,
    annualExpenseAmount: 2000, // Fixed amount ($2000/yr)
    cashCoverageYears: 15,
    leverage: { enabled: false } as any
  };

  // Target Cash = 2000 * 15 = 30,000 (Fixed Target)

  const mockMarketData: MarketDataRow = {
    date: '2023-12-31',
    qqq: 100,
    qld: 100
  };

  const createInitialState = (cash: number, qqqShares: number, qldShares: number, startQLDVal: number): PortfolioState => ({
    date: '2023-12-01',
    shares: { QQQ: qqqShares, QLD: qldShares },
    cashBalance: cash,
    debtBalance: 0,
    accruedInterest: 0,
    totalValue: (qqqShares * 100) + (qldShares * 100) + cash,
    strategyMemory: {
        startQLDVal: startQLDVal,
        yearInflow: 0,
        currentYear: 2023
    },
    ltv: 0,
    beta: 1,
    events: []
  });

  describe('Strategy Flexible 1 (Defensive)', () => {
    it('Low Cash (< Target) + Bull Market: Should sell 1/3 QLD Profit to Cash', () => {
      // Setup: Cash 10k (Needs 30k). QLD Profit = 20k (Start 10k, Current 30k)
      // Current QLD Value = 300 shares * 100 = 30k.
      // Start QLD Val = 10k. Profit = 20k.
      // Expect Sell: 20k / 3 = 6666.67 to Cash.
      
      const state = createInitialState(10000, 500, 300, 10000); 
      // Total Val = 50k + 30k + 10k = 90k. 
      // Target Cash = 2000 * 15 = 30k.
      // Cash 10k < 30k -> Inadequate.
      
      const newState = strategyFlexible1(state, mockMarketData, baseConfig, 12); // Month 12 (Dec) triggers rebalance

      expect(newState.shares.QLD).toBeLessThan(300);
      expect(newState.cashBalance).toBeGreaterThan(10000);
      
      const profit = 20000;
      const expectedSell = profit / 3;
      expect(newState.cashBalance).toBeCloseTo(10000 + expectedSell, 1);
      expect(newState.strategyMemory.lastAction).toContain('Defensive: Harvest Cash');
    });

    it('Low Cash (< Target) + Bear Market: Should sell 2% Total Value (QQQ) -> Buy QLD', () => {
      // Setup: Cash 10k. QLD Loss.
      // QLD Start 40k. Current 30k. Profit -10k.
      // Total Value 90k.
      // Expect Sell QQQ: 90k * 0.02 = 1800.
      
      const state = createInitialState(10000, 500, 300, 40000);
      const newState = strategyFlexible1(state, mockMarketData, baseConfig, 12);

      expect(newState.shares.QQQ).toBeLessThan(500); // Sold QQQ
      expect(newState.shares.QLD).toBeGreaterThan(300); // Bought QLD
      expect(newState.strategyMemory.lastAction).toContain('Defensive: Rebalance QQQ->QLD');
      
      const sharesSold = 1800 / 100; // 18
      expect(newState.shares.QQQ).toBeCloseTo(500 - sharesSold, 1);
    });
    
    it('Adequate Cash (> Target) + Bull Market: Should behave like Smart (Profit -> Cash)', () => {
         // Setup: Cash 50k (Target ~27k). Adequate.
         // Profit 20k.
         // Smart Logic: Sell 1/3 Profit -> Cash.
         
         const state = createInitialState(50000, 500, 300, 10000);
         // Total = 50k + 30k + 50k = 130k. 
         // Target Cash = 2000 * 15 = 30k.
         // 50k > 30k. Adequate.
         
         const newState = strategyFlexible1(state, mockMarketData, baseConfig, 12);
         
         // In Smart Rebalance (and Flex 1 Adequate), profit goes to cash.
         // Wait, Smart strategy: "Profit > 0: Sell 1/3 of Profit -> Cash"
         // So Flex 1 Adequate is SAME as Flex 1 Inadequate Bull?
         // YES, both sell to cash. But the log message might differ if I implemented it that way.
         // My implementation: `lastAction = 'Adequate: Smart Profit ...'`
         
         expect(newState.strategyMemory.lastAction).toContain('Adequate: Smart Profit');
         expect(newState.cashBalance).toBeGreaterThan(50000);
    });
  });

  describe('Strategy Flexible 2 (Aggressive)', () => {
    it('Low Cash: Should behave like Flex 1 (Defensive)', () => {
        // Cash 10k (Low). Profit 20k.
        // Expect: Sell to Cash (NOT QQQ).
        const state = createInitialState(10000, 500, 300, 10000);
        const newState = strategyFlexible2(state, mockMarketData, baseConfig, 12);
        
        expect(newState.strategyMemory.lastAction).toContain('Defensive: Harvest Cash');
        expect(newState.shares.QQQ).toBe(500); // QQQ unchanged
        expect(newState.cashBalance).toBeGreaterThan(10000);
    });

    it('Adequate Cash + Bull Market: Should Sell 1/3 Profit -> Buy QQQ', () => {
        // Cash 50k (Adequate). Profit 20k.
        // Expect: Sell QLD -> Buy QQQ. Cash Unchanged.
        const state = createInitialState(50000, 500, 300, 10000);
        const newState = strategyFlexible2(state, mockMarketData, baseConfig, 12);
        
        expect(newState.strategyMemory.lastAction).toContain('Aggressive: Profit to QQQ');
        expect(newState.shares.QLD).toBeLessThan(300);
        expect(newState.shares.QQQ).toBeGreaterThan(500);
        expect(newState.cashBalance).toBe(50000); // Cash should rely on logic not touching it
    });

    it('Adequate Cash + Bear Market: Should behave like Smart (Buy Dip)', () => {
        // Cash 50k. QLD Loss (Profit < 0).
        // Expect: Buy Dip with Cash.
        // QLD Start 40k. Current 30k. Profit -10k.
        
        const state = createInitialState(50000, 500, 300, 40000);
        const newState = strategyFlexible2(state, mockMarketData, baseConfig, 12);
        
        expect(newState.strategyMemory.lastAction).toContain('Aggressive: Buy Dip');
        expect(newState.shares.QLD).toBeGreaterThan(300); // Bought dip
        expect(newState.cashBalance).toBeLessThan(50000); // Used cash
    });
  });

  describe('Sanity Checks & Boundaries', () => {
    it('Should never result in negative shares or cash even with extreme values', () => {
      // Extreme Setup: Very low shares/cash, force sell logic
      // Cash 0. Profit > 0 (Force sell QLD -> Cash). But if we force a massive sell?
      // Logic handles percentages/fixed logic, so normally fine.
      // Let's test "Sell logic when we have ALMOST NO shares"
      
      const state = createInitialState(0, 0.0001, 0.0001, 0); // Practically empty
      const newState = strategyFlexible1(state, mockMarketData, baseConfig, 12);
      
      expect(newState.shares.QQQ).toBeGreaterThanOrEqual(0);
      expect(newState.shares.QLD).toBeGreaterThanOrEqual(0);
      expect(newState.cashBalance).toBeGreaterThanOrEqual(0);
    });
  });
});
