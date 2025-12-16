
import { AssetConfig, MarketDataRow, PortfolioState, SimulationResult, StrategyFunction, FinancialEvent } from "../types";
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
    ltv: 0,
    events: []
  };

  const monthlyCashYieldRate = Math.pow(1 + config.cashYieldAnnual / 100, 1 / 12) - 1;
  
  // Debt settings
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
    const monthEvents: FinancialEvent[] = [];

    if (isBankrupt) {
      history.push({
        ...currentState,
        date: dataRow.date,
        totalValue: 0,
        shares: { ...currentState.shares },
        ltv: 0,
        events: [{ type: 'INFO', description: 'Account Bankrupt' }]
      });
      continue;
    }

    // 1. Banking Logic: Interest Accrual & Debt Service
    if (index > 0) {
      // Step A: Accrue Interest on Cash
      const interestEarned = currentState.cashBalance * monthlyCashYieldRate;
      if (interestEarned > 0.01) {
          currentState.cashBalance += interestEarned;
          monthEvents.push({ 
              type: 'INTEREST_INC', 
              amount: interestEarned, 
              description: `Cash Interest (+${(config.cashYieldAnnual / 12).toFixed(2)}%)` 
          });
      }

      // Step B: Calculate Interest Due on Debt
      let interestDue = 0;
      if (leverage.enabled && currentState.debtBalance > 0) {
         interestDue = currentState.debtBalance * monthlyLoanRate;
      }

      // Step C: Service the Debt
      if (interestDue > 0) {
          if (currentState.cashBalance >= interestDue) {
              // Scenario: Liquidity Sufficient
              currentState.cashBalance -= interestDue;
              monthEvents.push({ 
                  type: 'INTEREST_EXP', 
                  amount: -interestDue, 
                  description: `Loan Interest Paid by Cash` 
              });
          } else {
              // Scenario: Liquidity Crunch
              const paidByCash = currentState.cashBalance;
              const shortfall = interestDue - currentState.cashBalance;
              
              if (paidByCash > 0) {
                  monthEvents.push({ 
                      type: 'INTEREST_EXP', 
                      amount: -paidByCash, 
                      description: `Loan Interest Paid by Cash (Partial)` 
                  });
              }
              
              currentState.cashBalance = 0;
              currentState.debtBalance += shortfall;
              monthEvents.push({ 
                  type: 'DEBT_INC', 
                  amount: shortfall, 
                  description: `Unpaid Interest Capitalized to Debt` 
              });
          }
      }
    }

    // 2. Execute Investment Strategy
    // Capture "Deposits" implicitly by checking if cash increased mysteriously before trading?
    // Actually, strategies usually add cash then buy.
    // Let's rely on diffing shares/cash after strategy execution.
    
    // Snapshot before strategy
    const cashBeforeStrat = currentState.cashBalance;
    const sharesBeforeStrat = { ...currentState.shares };

    currentState = strategyFunc(currentState, dataRow, config, index);

    // Detect Trades
    const qqqDiff = currentState.shares.QQQ - sharesBeforeStrat.QQQ;
    const qldDiff = currentState.shares.QLD - sharesBeforeStrat.QLD;
    
    // Estimate cost based on current price
    if (Math.abs(qqqDiff) > 0.001) {
        const cost = qqqDiff * dataRow.qqq;
        monthEvents.push({
            type: 'TRADE',
            amount: -cost,
            description: `${qqqDiff > 0 ? 'Buy' : 'Sell'} ${Math.abs(qqqDiff).toFixed(2)} QQQ @ ${dataRow.qqq.toFixed(2)}`
        });
    }
    if (Math.abs(qldDiff) > 0.001) {
        const cost = qldDiff * dataRow.qld;
        monthEvents.push({
            type: 'TRADE',
            amount: -cost,
            description: `${qldDiff > 0 ? 'Buy' : 'Sell'} ${Math.abs(qldDiff).toFixed(2)} QLD @ ${dataRow.qld.toFixed(2)}`
        });
    }
    
    // Detect DCA Deposit (Approximation: If we bought shares but cash didn't drop by full amount, or cash increased)
    // Net flow = (Cash_End - Cash_Start) + Cost_Of_Buys
    // If Net flow > 0, that's external deposit.
    const netTradeCost = (qqqDiff * dataRow.qqq) + (qldDiff * dataRow.qld);
    const impliedCashFlow = (currentState.cashBalance - cashBeforeStrat) + netTradeCost;
    
    // Small epsilon for float errors
    if (impliedCashFlow > 1.0) {
        monthEvents.push({
            type: 'DEPOSIT',
            amount: impliedCashFlow,
            description: 'Recurring Contribution / Deposit'
        });
    }

    // 3. Leverage / Pledging Logic (Borrowing & Risk Check)
    if (leverage.enabled) {
       const currentMonth = parseInt(dataRow.date.substring(5, 7)) - 1;
       
       const qqqValue = currentState.shares.QQQ * dataRow.qqq;
       const qldValue = currentState.shares.QLD * dataRow.qld;
       const cashValue = currentState.cashBalance;
       const totalAssetValue = qqqValue + qldValue + cashValue;
       
       const effectiveCollateral = 
          (qqqValue * leverage.qqqPledgeRatio) + 
          (cashValue * leverage.cashPledgeRatio) +
          (qldValue * leverage.qldPledgeRatio);

       // Withdrawal Logic: Trigger on the very first month (Index 0) OR every January
       // Previously: if (currentMonth === 0 && index > 0 && effectiveCollateral > 0)
       const isWithdrawalTiming = index === 0 || currentMonth === 0;

       if (isWithdrawalTiming && effectiveCollateral > 0) {
           let borrowAmount = 0;
           if (leverage.withdrawType === 'PERCENT') {
               borrowAmount = totalAssetValue * (leverage.withdrawValue / 100);
           } else {
               borrowAmount = leverage.withdrawValue;
           }
           
           if (borrowAmount > 0) {
               currentState.debtBalance += borrowAmount;
               monthEvents.push({
                   type: 'WITHDRAW',
                   amount: -borrowAmount,
                   description: index === 0 ? `Initial Loan Withdrawal` : `Annual Living Expense Withdrawal`
               });
               monthEvents.push({
                   type: 'DEBT_INC',
                   amount: borrowAmount,
                   description: `Borrowing increased for withdrawal`
               });
           }
       }

       // Solvency Check
       if (effectiveCollateral > 0) {
          currentState.ltv = (currentState.debtBalance / effectiveCollateral) * 100;
       } else {
          currentState.ltv = currentState.debtBalance > 0 ? 9999 : 0;
       }

       if (currentState.ltv > leverage.maxLtv) {
          isBankrupt = true;
          bankruptcyDate = dataRow.date;
          currentState.totalValue = 0;
          monthEvents.push({
              type: 'INFO',
              description: `!!! MARGIN CALL / LIQUIDATION (LTV: ${currentState.ltv.toFixed(1)}%) !!!`
          });
       }
    }

    // 4. Update Net Value
    if (!isBankrupt) {
        const assets = 
            (currentState.shares.QQQ * dataRow.qqq) +
            (currentState.shares.QLD * dataRow.qld) +
            currentState.cashBalance;
        currentState.totalValue = Math.max(0, assets - currentState.debtBalance);
    }

    // 5. Record History
    history.push({
      ...currentState,
      shares: { ...currentState.shares },
      strategyMemory: { ...currentState.strategyMemory },
      events: monthEvents // Store the logs
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
    isLeveraged: config.leverage.enabled,
    history,
    isBankrupt,
    bankruptcyDate,
    metrics
  };
};
