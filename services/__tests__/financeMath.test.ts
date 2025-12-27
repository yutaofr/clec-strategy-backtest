import { describe, it, expect } from 'vitest';
import {
  calculateCAGR,
  calculateMaxDrawdown,
  calculateSharpeRatio,
  calculateIRR,
  calculateRealValue,
  calculateMaxRecoveryTime
} from '../financeMath';
import { PortfolioState } from '../../types';

describe('financeMath', () => {
  describe('calculateCAGR', () => {
    it('should calculate CAGR correctly', () => {
      // 100 -> 200 in 1 year = 100%
      expect(calculateCAGR(100, 200, 1)).toBeCloseTo(100);
      // 100 -> 121 in 2 years = 10%
      expect(calculateCAGR(100, 121, 2)).toBeCloseTo(10);
      // 100 -> 50 in 1 year = -50%
      expect(calculateCAGR(100, 50, 1)).toBeCloseTo(-50);
    });

    it('should return 0 if start value or years is 0', () => {
      expect(calculateCAGR(0, 100, 1)).toBe(0);
      expect(calculateCAGR(100, 200, 0)).toBe(0);
    });
  });

  describe('calculateMaxDrawdown', () => {
    it('should calculate max drawdown correctly', () => {
      const history = [
        { totalValue: 100 },
        { totalValue: 120 }, // Peak
        { totalValue: 60 },  // Drawdown 50%
        { totalValue: 80 },
        { totalValue: 130 },
      ] as PortfolioState[];

      expect(calculateMaxDrawdown(history)).toBeCloseTo(50);
    });

    it('should return 0 for monotonic increase', () => {
      const history = [
        { totalValue: 100 },
        { totalValue: 110 },
        { totalValue: 120 },
      ] as PortfolioState[];
      expect(calculateMaxDrawdown(history)).toBe(0);
    });
  });

  describe('calculateSharpeRatio', () => {
    it('should calculate Sharpe Ratio correctly', () => {
      // Simple case: Constant return
      // 100 -> 110 (10%) -> 121 (10%)
      // Mean = 10%, StdDev = 0 -> Infinity technically, but function handles 0 variance
      const history = [
        { totalValue: 100 },
        { totalValue: 110 },
        { totalValue: 121 },
      ] as PortfolioState[];

      // In implementation: if stdDevMonthly === 0 return 0
      expect(calculateSharpeRatio(history)).toBe(0);

      const historyVolatile = [
        { totalValue: 100 },
        { totalValue: 110 }, // +10%
        { totalValue: 99 },  // -10%
      ] as PortfolioState[];
      // Returns: 0.1, -0.1. Avg = 0. StdDev > 0. Sharpe should be 0 (if RiskFree=0)
      expect(calculateSharpeRatio(historyVolatile)).toBeCloseTo(0);
    });
  });

  describe('calculateIRR', () => {
    it('should calculate IRR correctly for simple growth', () => {
      // Invest 100, wait 1 year (12 months), get 110. (10% growth)
      const irr = calculateIRR(100, 0, 12, 110, 12);
      expect(irr).toBeCloseTo(10);
    });
    
    it('should handle regular contributions', () => {
       // Invest 0 initial, contribute 10/mo for 12 mo (120 total), end with 120. IRR ~ 0
       // 11 contributions of 10 (Months 1..11) = 110 total invested.
       // Final Value = 110. Yields 0%.
       const irr = calculateIRR(0, 10, 1, 110, 12);
       expect(irr).toBeCloseTo(0, 1);
    });
  });

  describe('calculateRealValue', () => {
    it('should adjust for inflation', () => {
      // 100, 10% inflation, 1 year -> 100 / 1.1 = 90.909
      expect(calculateRealValue(100, 10, 1)).toBeCloseTo(90.909);
    });
  });

  describe('calculateMaxRecoveryTime', () => {
    it('should return correct months', () => {
      const history = [
        { totalValue: 100 }, // Peak
        { totalValue: 90 },  // 1
        { totalValue: 95 },  // 2
        { totalValue: 101 }, // Recovered
      ] as PortfolioState[];
      expect(calculateMaxRecoveryTime(history)).toBe(2);
    });
  });
});
