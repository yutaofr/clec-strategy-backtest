import { AssetConfig, PortfolioState, StrategyFunction, StrategyType } from "../types";

interface CashAdequacyResult {
  isAdequate: boolean;
  shortfall: number;
  targetCash: number;
}

const getAssetAllocation = (config: AssetConfig) => {
  const cashWeight = Math.max(0, 100 - config.qqqWeight - config.qldWeight);
  return {
    qqq: config.qqqWeight / 100,
    qld: config.qldWeight / 100,
    cash: cashWeight / 100
  };
};

const getContributionAllocation = (config: AssetConfig) => {
  const cashWeight = Math.max(0, 100 - config.contributionQqqWeight - config.contributionQldWeight);
  return {
    qqq: config.contributionQqqWeight / 100,
    qld: config.contributionQldWeight / 100,
    cash: cashWeight / 100
  };
};

/**
 * Strategy: No Rebalancing (Buy & Hold + DCA)
 * T=0: Buy based on PORTFOLIO weights (Initial Capital).
 * T>0: Buy using contribution amount based on CONTRIBUTION weights.
 * No yearly rebalancing is performed.
 */
export const strategyNoRebalance: StrategyFunction = (state, marketData, config, monthIndex) => {
  const isFirstMonth = monthIndex === 0;
  const newState = { ...state, date: marketData.date };

  if (isFirstMonth) {
    const weights = getAssetAllocation(config);
    newState.shares = {
      QQQ: (config.initialCapital * weights.qqq) / marketData.qqq,
      QLD: (config.initialCapital * weights.qld) / marketData.qld
    };
    newState.cashBalance = config.initialCapital * weights.cash;
  } else {
    // DCA Logic: Check if this month is a contribution month
    const currentMonth = parseInt(marketData.date.substring(5, 7)); // 1-12

    let isContributionMonth = false;
    if (config.contributionIntervalMonths === 12) {
      // Yearly: Check if current calendar month matches yearlyContributionMonth (default December=12)
      isContributionMonth = currentMonth === (config.yearlyContributionMonth || 12);
    } else {
      // Monthly/Quarterly: Use modulo logic
      isContributionMonth = monthIndex % config.contributionIntervalMonths === 0;
    }

    if (isContributionMonth) {
      const contribWeights = getContributionAllocation(config);

      const qqqBuy = config.contributionAmount * contribWeights.qqq;
      const qldBuy = config.contributionAmount * contribWeights.qld;
      const cashAdd = config.contributionAmount * contribWeights.cash;

      newState.shares.QQQ += qqqBuy / marketData.qqq;
      newState.shares.QLD += qldBuy / marketData.qld;
      newState.cashBalance += cashAdd;
    }
  }

  newState.totalValue =
    (newState.shares.QQQ * marketData.qqq) +
    (newState.shares.QLD * marketData.qld) +
    newState.cashBalance;

  return newState;
};

/**
 * Strategy: Yearly Rebalancing
 * Standard DCA (using contrib weights), but rebalances to PORTFOLIO weights in January.
 */
export const strategyRebalance: StrategyFunction = (state, marketData, config, monthIndex) => {
  const isFirstMonth = monthIndex === 0;
  let newState = strategyNoRebalance(state, marketData, config, monthIndex); // Apply base logic first

  const currentMonth = parseInt(marketData.date.substring(5, 7)) - 1;

  // Rebalance in January (Month 0) - but not the very first month of simulation
  if (currentMonth === 0 && !isFirstMonth) {
    const totalVal = newState.totalValue;
    const targetWeights = getAssetAllocation(config); // Rebalance to TARGET portfolio

    // Reset shares to target weights
    newState.shares.QQQ = (totalVal * targetWeights.qqq) / marketData.qqq;
    newState.shares.QLD = (totalVal * targetWeights.qld) / marketData.qld;
    newState.cashBalance = totalVal * targetWeights.cash;
  }

  return newState;
};

/**
 * Strategy: Smart Adjust
 * Complex logic using strategyMemory: harvests profits in bull markets and buys dips.
 */
export const strategySmart: StrategyFunction = (state, marketData, config, monthIndex) => {
  const isFirstMonth = monthIndex === 0;

  // 1. Initialize or copy memory
  const memory = { ...(state.strategyMemory || {}) };
  const currentYear = parseInt(marketData.date.substring(0, 4));
  const currentMonth = parseInt(marketData.date.substring(5, 7)) - 1;

  // 2. Handle Year Transition / Init
  if (isFirstMonth || memory.currentYear !== currentYear) {
    memory.currentYear = currentYear;
    memory.yearInflow = 0;

    if (!isFirstMonth) {
      memory.startQLDVal = state.shares.QLD * marketData.qld;
    }
  }

  // 3. Apply Base Logic (No Rebalance)
  let newState = strategyNoRebalance(state, marketData, config, monthIndex);

  // If this was the first month, set the tracking var now that shares are bought
  if (isFirstMonth) {
    memory.startQLDVal = newState.shares.QLD * marketData.qld;
  }

  // Track inflow into QLD specifically for the logic "QLD Profit"
  const contribWeights = getContributionAllocation(config);
  // Check if we actually contributed this month
  const isContributionMonth = !isFirstMonth && (monthIndex % config.contributionIntervalMonths === 0);
  const qldContribution = isContributionMonth ? (config.contributionAmount * contribWeights.qld) : 0;

  memory.yearInflow = (memory.yearInflow || 0) + qldContribution;

  // 4. End of Year Check (December)
  if (currentMonth === 11) {
    const currentQLDVal = newState.shares.QLD * marketData.qld;
    // Profit = EndingValue - (StartingValue + Costs)
    const profit = currentQLDVal - (memory.startQLDVal + memory.yearInflow);

    if (profit > 0) {
      // Rule: Sell 1/3 of Profit -> Cash
      const sellAmount = profit / 3;
      const sharesToSell = sellAmount / marketData.qld;

      newState.shares.QLD = Math.max(0, newState.shares.QLD - sharesToSell);
      newState.cashBalance += sellAmount;

      memory.lastAction = `Sold Profit ${sellAmount.toFixed(2)}`;
    } else {
      // Rule: Buy 2% of Total Portfolio Value using Cash
      const buyAmount = newState.totalValue * 0.02;

      // Can only buy if we have cash
      const actualBuyAmount = Math.min(buyAmount, newState.cashBalance);

      if (actualBuyAmount > 0) {
        const sharesToBuy = actualBuyAmount / marketData.qld;
        newState.shares.QLD += sharesToBuy;
        newState.shares.QLD += sharesToBuy;
        newState.cashBalance = Math.max(0, newState.cashBalance - actualBuyAmount);
        memory.lastAction = `Bought Dip ${actualBuyAmount.toFixed(2)}`;
      }
    }
  }

  newState.totalValue =
    (newState.shares.QQQ * marketData.qqq) +
    (newState.shares.QLD * marketData.qld) +
    newState.cashBalance;

  newState.strategyMemory = memory;
  return newState;
};

const checkCashAdequacy = (state: PortfolioState, config: AssetConfig): CashAdequacyResult => {
  // Use configured annual expense amount, or default to 2% of initial capital if not set
  const annualExpense = config.annualExpenseAmount ?? (config.initialCapital * 0.02);
  const coverageYears = config.cashCoverageYears ?? 15;
  const targetCash = annualExpense * coverageYears;
  
  return {
    isAdequate: state.cashBalance >= targetCash,
    shortfall: Math.max(0, targetCash - state.cashBalance),
    targetCash
  };
};

/**
 * Strategy: Flexible Rebalancing - Defensive (Type 1)
 * Priority: Maintain 15 years of cash buffer.
 * If Cash < Target:
 *  - Bull (QLD Profit > 0): Sell 1/3 Profit -> Cash.
 *  - Bear (QLD Profit <= 0): Sell 2% Total Value from QQQ -> Buy QLD.
 * If Cash >= Target:
 *  - Switch to Smart Rebalance logic (Sell QLD Profit -> Cash / Buy Dip).
 */
export const strategyFlexible1: StrategyFunction = (state, marketData, config, monthIndex) => {
  const isFirstMonth = monthIndex === 0;
  const memory = { ...(state.strategyMemory || {}) };
  const currentYear = parseInt(marketData.date.substring(0, 4));
  const currentMonth = parseInt(marketData.date.substring(5, 7)) - 1;

  // Init Memory Logic same as Smart Strategy
  if (isFirstMonth || memory.currentYear !== currentYear) {
    memory.currentYear = currentYear;
    memory.yearInflow = 0;
    if (!isFirstMonth) {
      memory.startQLDVal = state.shares.QLD * marketData.qld;
    }
  }

  // Apply Base Logic
  let newState = strategyNoRebalance(state, marketData, config, monthIndex);

  if (isFirstMonth) {
    memory.startQLDVal = newState.shares.QLD * marketData.qld;
  }

  // Track Inflow
  const contribWeights = getContributionAllocation(config);
  const isContributionMonth = !isFirstMonth && (monthIndex % config.contributionIntervalMonths === 0);
  const qldContribution = isContributionMonth ? (config.contributionAmount * contribWeights.qld) : 0;
  memory.yearInflow = (memory.yearInflow || 0) + qldContribution;

  // End of Year Logic
  if (currentMonth === 11) {
    const { isAdequate } = checkCashAdequacy(newState, config);
    const currentQLDVal = newState.shares.QLD * marketData.qld;
    const profit = currentQLDVal - (memory.startQLDVal + memory.yearInflow);

    if (!isAdequate) {
      // Defensive Mode
      if (profit > 0) {
        // Bull: Sell 1/3 QLD Profit -> Cash
        const sellAmount = profit / 3;
        const sharesToSell = sellAmount / marketData.qld;
        newState.shares.QLD = Math.max(0, newState.shares.QLD - sharesToSell);
        newState.cashBalance += sellAmount;
        memory.lastAction = `Defensive: Harvest Cash ${sellAmount.toFixed(0)}`;
      } else {
        // Bear: Sell 2% Total Value (QQQ) -> Buy QLD
        const transferAmount = newState.totalValue * 0.02;
        const qqqVal = newState.shares.QQQ * marketData.qqq;
        
        // Cap at available QQQ
        const actualTransfer = Math.min(transferAmount, qqqVal);
        
        if (actualTransfer > 0) {
          const qqqSharesToSell = actualTransfer / marketData.qqq;
          const qldSharesToBuy = actualTransfer / marketData.qld;
          
          newState.shares.QQQ = Math.max(0, newState.shares.QQQ - qqqSharesToSell);
          newState.shares.QLD += qldSharesToBuy;
          memory.lastAction = `Defensive: Rebalance QQQ->QLD ${actualTransfer.toFixed(0)}`;
        }
      }
    } else {
      // Cash Adequate -> Smart Rebalance Logic
      // Note: "Smart" normally sells profit to Cash or buys dip with Cash.
      // Since we have adequate cash, this is fine.
      if (profit > 0) {
        const sellAmount = profit / 3;
        const sharesToSell = sellAmount / marketData.qld;
        newState.shares.QLD = Math.max(0, newState.shares.QLD - sharesToSell);
        newState.cashBalance += sellAmount;
        memory.lastAction = `Adequate: Smart Profit ${sellAmount.toFixed(0)}`;
      } else {
        const buyAmount = newState.totalValue * 0.02;
        const actualBuyAmount = Math.min(buyAmount, newState.cashBalance);
        if (actualBuyAmount > 0) {
          const sharesToBuy = actualBuyAmount / marketData.qld;
          newState.shares.QLD += sharesToBuy;
          newState.cashBalance = Math.max(0, newState.cashBalance - actualBuyAmount);
          memory.lastAction = `Adequate: Smart Dip ${actualBuyAmount.toFixed(0)}`;
        }
      }
    }
  }

  // Recalculate Totals
  newState.totalValue =
    (newState.shares.QQQ * marketData.qqq) +
    (newState.shares.QLD * marketData.qld) +
    newState.cashBalance;

  newState.strategyMemory = memory;
  return newState;
};

/**
 * Strategy: Flexible Rebalancing - Aggressive (Type 2)
 * Priority: Maintain 15 years of cash buffer.
 * If Cash < Target:
 *  - Fallback to Flexible Type 1 (Defensive) behavior.
 * If Cash >= Target:
 *  - Bull (QLD Profit > 0): Sell 1/3 Profit -> Buy QQQ (NOT Cash).
 *  - Bear (QLD Profit <= 0): Smart Rebalance (Buy QLD Dip with Cash).
 */
export const strategyFlexible2: StrategyFunction = (state, marketData, config, monthIndex) => {
  const isFirstMonth = monthIndex === 0;
  const memory = { ...(state.strategyMemory || {}) };
  const currentYear = parseInt(marketData.date.substring(0, 4));
  const currentMonth = parseInt(marketData.date.substring(5, 7)) - 1;

  if (isFirstMonth || memory.currentYear !== currentYear) {
    memory.currentYear = currentYear;
    memory.yearInflow = 0;
    if (!isFirstMonth) {
      memory.startQLDVal = state.shares.QLD * marketData.qld;
    }
  }

  let newState = strategyNoRebalance(state, marketData, config, monthIndex);

  if (isFirstMonth) {
    memory.startQLDVal = newState.shares.QLD * marketData.qld;
  }

  const contribWeights = getContributionAllocation(config);
  const isContributionMonth = !isFirstMonth && (monthIndex % config.contributionIntervalMonths === 0);
  const qldContribution = isContributionMonth ? (config.contributionAmount * contribWeights.qld) : 0;
  memory.yearInflow = (memory.yearInflow || 0) + qldContribution;

  if (currentMonth === 11) {
    const { isAdequate } = checkCashAdequacy(newState, config);
    const currentQLDVal = newState.shares.QLD * marketData.qld;
    const profit = currentQLDVal - (memory.startQLDVal + memory.yearInflow);

    if (!isAdequate) {
      // Fallback to Defensive (Same as Flex 1)
      if (profit > 0) {
        const sellAmount = profit / 3;
        const sharesToSell = sellAmount / marketData.qld;
        newState.shares.QLD -= sharesToSell;
        newState.cashBalance += sellAmount;
        memory.lastAction = `Defensive: Harvest Cash ${sellAmount.toFixed(0)}`;
      } else {
        const transferAmount = newState.totalValue * 0.02;
        const qqqVal = newState.shares.QQQ * marketData.qqq;
        const actualTransfer = Math.min(transferAmount, qqqVal);
        
        if (actualTransfer > 0) {
          const qqqSharesToSell = actualTransfer / marketData.qqq;
          const qldSharesToBuy = actualTransfer / marketData.qld;
          newState.shares.QQQ = Math.max(0, newState.shares.QQQ - qqqSharesToSell);
          newState.shares.QLD += qldSharesToBuy;
          memory.lastAction = `Defensive: Rebalance QQQ->QLD ${actualTransfer.toFixed(0)}`;
        }
      }
    } else {
      // Aggressive Mode
      if (profit > 0) {
        // Bull: Sell 1/3 Profit -> Buy QQQ
        const sellAmount = profit / 3;
        const sharesToSell = sellAmount / marketData.qld;
        const sharesToBuyQQQ = sellAmount / marketData.qqq;

        newState.shares.QLD -= sharesToSell;
        newState.shares.QQQ += sharesToBuyQQQ;
        // Cash remains unchanged
        memory.lastAction = `Aggressive: Profit to QQQ ${sellAmount.toFixed(0)}`;
      } else {
        // Bear: Smart Rebalance (Buy Dip with Cash)
        const buyAmount = newState.totalValue * 0.02;
        const actualBuyAmount = Math.min(buyAmount, newState.cashBalance);
        if (actualBuyAmount > 0) {
          const sharesToBuy = actualBuyAmount / marketData.qld;
          newState.shares.QLD += sharesToBuy;
          newState.cashBalance = Math.max(0, newState.cashBalance - actualBuyAmount);
          memory.lastAction = `Aggressive: Buy Dip ${actualBuyAmount.toFixed(0)}`;
        }
      }
    }
  }

  newState.totalValue =
    (newState.shares.QQQ * marketData.qqq) +
    (newState.shares.QLD * marketData.qld) +
    newState.cashBalance;

  newState.strategyMemory = memory;
  return newState;
};

export const getStrategyByType = (type: StrategyType): StrategyFunction => {
  switch (type) {
    case 'NO_REBALANCE': return strategyNoRebalance;
    case 'REBALANCE': return strategyRebalance;
    case 'SMART': return strategySmart;
    case 'FLEXIBLE_1': return strategyFlexible1;
    case 'FLEXIBLE_2': return strategyFlexible2;
    default: return strategyNoRebalance;
  }
};