import { AssetConfig, MarketDataRow, PortfolioState, SimulationResult, StrategyFunction } from "../types";
import { calculateCAGR, calculateIRR, calculateMaxDrawdown, calculateSharpeRatio } from "./financeMath";

export const runBacktest = (
  marketData: MarketDataRow[],
  strategyFunc: StrategyFunction,
  config: AssetConfig,
  strategyName: string,
  color: string = "#000000"
): SimulationResult => {
  const history: PortfolioState[] = [];
  
  // Initial empty state
  let currentState: PortfolioState = {
    date: marketData[0].date,
    shares: { QQQ: 0, QLD: 0 },
    cashBalance: 0,
    debtBalance: 0,
    totalValue: 0,
    strategyMemory: {},
    ltv: 0
  };

  const monthlyCashYieldRate = Math.pow(1 + config.cashYieldAnnual / 100, 1 / 12) - 1;
  
  // Debt settings
  // Default ratios: QQQ 0.7, QLD 0.0, Cash 0.95 if not defined.
  const leverage = {
      ...config.leverage,
      qqqPledgeRatio: config.leverage?.qqqPledgeRatio ?? 0.7,
      qldPledgeRatio: config.leverage?.qldPledgeRatio ?? 0.0,
      cashPledgeRatio: config.leverage?.cashPledgeRatio ?? 0.95
  };
  
  const monthlyLoanRate = leverage.enabled ? Math.pow(1 + leverage.interestRate / 100, 1 / 12) - 1 : 0;
  
  let isBankrupt = false;
  let bankruptcyDate: string | null = null;

  for (let index = 0; index < marketData.length; index++) {
    const dataRow = marketData[index];

    if (isBankrupt) {
      // If bankrupt, portfolio stays at 0
      history.push({
        ...currentState,
        date: dataRow.date,
        totalValue: 0,
        shares: { ...currentState.shares },
        ltv: 0 // Irrelevant once bankrupt
      });
      continue;
    }

    // 1. Banking Logic: Interest Accrual
    if (index > 0) {
      // Interest on Cash Savings (Asset grows)
      currentState.cashBalance *= (1 + monthlyCashYieldRate);
      
      // Interest on Debt (Liability grows)
      if (leverage.enabled && currentState.debtBalance > 0) {
         currentState.debtBalance *= (1 + monthlyLoanRate);
      }
    }

    // 2. Execute Investment Strategy (Trading / Rebalancing)
    // This updates shares and cashBalance based on strategy (DCA, Rebalance, etc.)
    currentState = strategyFunc(currentState, dataRow, config, index);

    // 3. Leverage / Pledging Logic (Borrowing & Risk Check)
    if (leverage.enabled) {
       const currentMonth = parseInt(dataRow.date.substring(5, 7)) - 1;
       
       // Calculate Asset Values
       const qqqValue = currentState.shares.QQQ * dataRow.qqq;
       const qldValue = currentState.shares.QLD * dataRow.qld;
       const cashValue = currentState.cashBalance;
       
       // STRATEGY: Total Asset Withdrawal Base
       // "Annual Cash Out" is calculated based on TOTAL Net Worth/Assets (including QLD), 
       // representing the user's lifestyle cost relative to their wealth.
       const totalAssetValue = qqqValue + qldValue + cashValue;
       
       // RISK MANAGEMENT: Collateral Calculation
       // Effective Collateral = Sum of (AssetValue * PledgeRatio)
       // Now includes QLD if qldPledgeRatio > 0
       const effectiveCollateral = 
          (qqqValue * leverage.qqqPledgeRatio) + 
          (cashValue * leverage.cashPledgeRatio) +
          (qldValue * leverage.qldPledgeRatio);

       // Annual Withdrawal Logic (in January)
       // We only withdraw if we are not already underwater on collateral
       if (currentMonth === 0 && index > 0 && effectiveCollateral > 0) {
           let borrowAmount = 0;
           
           if (leverage.withdrawType === 'PERCENT') {
               // Withdraw % of TOTAL Portfolio Assets
               borrowAmount = totalAssetValue * (leverage.withdrawValue / 100);
           } else {
               borrowAmount = leverage.withdrawValue;
           }
           
           // CRITICAL LOGIC CONFIRMATION:
           // 1. Debt INCREASES by borrowAmount.
           // 2. Cash DOES NOT INCREASE. The money is withdrawn from the broker to a personal bank account and spent.
           // Result: Net Equity decreases by borrowAmount.
           currentState.debtBalance += borrowAmount;
       }

       // Solvency / Bankruptcy Check
       // LTV = Debt / EffectiveCollateral.
       // If Debt > EffectiveCollateral, the broker liquidates (LTV > 100% of Pledged Value).
       if (effectiveCollateral > 0) {
          currentState.ltv = (currentState.debtBalance / effectiveCollateral) * 100;
       } else {
          // If debt exists but no collateral (e.g. 100% QLD and ratio is 0), instant bankruptcy
          currentState.ltv = currentState.debtBalance > 0 ? 9999 : 0;
       }

       // Trigger Bankruptcy if Debt exceeds the safety limit (maxLtv) of the Collateral
       // Example: maxLtv is 100%. If Debt > Collateral Value, game over.
       if (currentState.ltv > leverage.maxLtv) {
          isBankrupt = true;
          bankruptcyDate = dataRow.date;
          // Zero out value to represent total liquidation
          currentState.totalValue = 0;
       }
    }

    // 4. Update Net Value
    if (!isBankrupt) {
        // Total Assets
        const assets = 
            (currentState.shares.QQQ * dataRow.qqq) +
            (currentState.shares.QLD * dataRow.qld) +
            currentState.cashBalance;
        
        // Net Equity = Assets - Debt
        currentState.totalValue = Math.max(0, assets - currentState.debtBalance);
    }

    // 5. Record History
    history.push({
      ...currentState,
      shares: { ...currentState.shares },
      strategyMemory: { ...currentState.strategyMemory }
    });
  }

  // Calculate Metrics
  const years = marketData.length / 12;
  const finalState = history[history.length - 1];
  const initialInv = config.initialCapital;
  
  const metrics = {
    finalBalance: finalState.totalValue,
    cagr: isBankrupt ? -100 : calculateCAGR(initialInv, finalState.totalValue, years),
    maxDrawdown: calculateMaxDrawdown(history),
    sharpeRatio: calculateSharpeRatio(history, config.cashYieldAnnual),
    irr: isBankrupt ? -100 : calculateIRR(
      initialInv, 
      config.contributionAmount, 
      config.contributionIntervalMonths, 
      finalState.totalValue, 
      marketData.length
    )
  };

  return {
    strategyName,
    color,
    history,
    isBankrupt,
    bankruptcyDate,
    metrics
  };
};