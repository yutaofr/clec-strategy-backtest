import { AssetConfig, StrategyFunction, StrategyType } from "../types";

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
  // This already uses contribution weights for the inflow
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

      newState.shares.QLD -= sharesToSell;
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
        newState.cashBalance -= actualBuyAmount;
        memory.lastAction = `Bought Dip ${actualBuyAmount.toFixed(2)}`;
      }
    }
  }

  // Update total value after potential swaps
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
    default: return strategyNoRebalance;
  }
};