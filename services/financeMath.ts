import { PortfolioState, CommissionConfig } from '../types'

/**
 * Calculates Compound Annual Growth Rate
 */
export const calculateCAGR = (startVal: number, endVal: number, years: number): number => {
  if (startVal === 0 || years === 0) return 0
  return (Math.pow(endVal / startVal, 1 / years) - 1) * 100
}

/**
 * Calculates Maximum Drawdown from a history of total values
 */
export const calculateMaxDrawdown = (history: PortfolioState[]): number => {
  let peak = -Infinity
  let maxDrawdown = 0

  for (const state of history) {
    if (state.totalValue > peak) {
      peak = state.totalValue
    }
    const drawdown = (peak - state.totalValue) / peak
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  }

  return maxDrawdown * 100 // Return as percentage
}

/**
 * Calculates Sharpe Ratio
 * Assuming risk-free rate is roughly captured by the cash yield or simplified to 0 for comparison
 */
export const calculateSharpeRatio = (
  history: PortfolioState[],
  annualRiskFreeRate: number = 0,
): number => {
  if (history.length < 2) return 0

  const returns: number[] = []
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].totalValue
    const curr = history[i].totalValue
    returns.push((curr - prev) / prev)
  }

  // Calculate average monthly return
  const avgMonthlyReturn = returns.reduce((a, b) => a + b, 0) / returns.length

  // Calculate standard deviation of monthly returns
  const variance =
    returns.reduce((sum, val) => sum + Math.pow(val - avgMonthlyReturn, 2), 0) / returns.length
  const stdDevMonthly = Math.sqrt(variance)

  if (stdDevMonthly === 0) return 0

  // Annualize
  const annualizedReturn = avgMonthlyReturn * 12
  const annualizedVol = stdDevMonthly * Math.sqrt(12)

  return (annualizedReturn - annualRiskFreeRate / 100) / annualizedVol
}

/**
 * Newton-Raphson implementation for XIRR/IRR.
 * Handles sparse cash flows based on contribution interval.
 */
export const calculateIRR = (
  initialInvestment: number,
  contributionAmount: number,
  contributionInterval: number,
  finalValue: number,
  totalMonths: number,
): number => {
  // Cash flows:
  // T=0: -Initial
  // T=N*Interval: -Contribution (if T > 0 and T < totalMonths)
  // T=totalMonths: +FinalValue

  // Initial guess: 10% annual
  let rate = 0.1 / 12
  const maxIterations = 50
  const tolerance = 1e-7

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0
    let d_npv = 0 // Derivative of NPV

    // T=0
    npv += -initialInvestment
    d_npv += 0

    // Iterate through all months to place cashflows correctly
    for (let t = 1; t <= totalMonths; t++) {
      let cashFlow = 0

      // Add final value at the end
      if (t === totalMonths) {
        cashFlow += finalValue
      }

      // Add contribution if it matches interval
      // Note: Strategy applies contribution if (index % interval === 0) where index 0 is start.
      // Usually index 0 = Initial. index 1...
      // If Interval=1 (Monthly): Index 1, 2, 3... are contributions.
      // If Interval=3 (Qtly): Index 3, 6, 9... are contributions.
      if (t < totalMonths && t % contributionInterval === 0) {
        cashFlow -= contributionAmount
      }

      if (cashFlow !== 0) {
        const disc = Math.pow(1 + rate, t)
        // Derivative of (1+r)^-t is -t * (1+r)^(-t-1)
        const termVal = cashFlow / disc
        const termDeriv = cashFlow * -t * Math.pow(1 + rate, -t - 1)

        npv += termVal
        d_npv += termDeriv
      }
    }

    if (Math.abs(d_npv) < 1e-10) break // Avoid division by zero

    const newRate = rate - npv / d_npv
    if (Math.abs(newRate - rate) < tolerance) {
      rate = newRate
      break
    }
    rate = newRate
  }

  // Annualize
  return (Math.pow(1 + rate, 12) - 1) * 100
}

/**
 * Calculates Recovery Time (in months)
 * Returns the maximum duration the portfolio spent below its previous peak
 */
export const calculateMaxRecoveryTime = (history: PortfolioState[]): number => {
  let peak = -Infinity
  let maxRecovery = 0
  let currentUnderperformingMonths = 0

  for (const state of history) {
    if (state.totalValue >= peak) {
      peak = state.totalValue
      if (currentUnderperformingMonths > maxRecovery) {
        maxRecovery = currentUnderperformingMonths
      }
      currentUnderperformingMonths = 0
    } else {
      currentUnderperformingMonths++
    }
  }

  // Check if still in recovery at the end
  return Math.max(maxRecovery, currentUnderperformingMonths)
}

/**
 * Calculates returns grouped by year
 */
export const calculateAnnualReturns = (
  history: PortfolioState[],
): { year: string; return: number }[] => {
  if (history.length === 0) return []

  const annualData: { [year: string]: { start: number; end: number } } = {}

  history.forEach((state, index) => {
    const year = state.date.substring(0, 4)
    if (!annualData[year]) {
      // Find start value (last month of previous year or first month of this year)
      const prevVal = index > 0 ? history[index - 1].totalValue : state.totalValue
      annualData[year] = { start: prevVal, end: state.totalValue }
    } else {
      annualData[year].end = state.totalValue
    }
  })

  return Object.entries(annualData).map(([year, data]) => ({
    year,
    return: data.start === 0 ? 0 : ((data.end - data.start) / data.start) * 100,
  }))
}

/**
 * Calculates inflation-adjusted value
 */
export const calculateRealValue = (
  nominalValue: number,
  annualInflation: number,
  years: number,
) => {
  return nominalValue / Math.pow(1 + annualInflation / 100, years)
}

export const calculateUlcerIndex = (history: PortfolioState[]): number => {
  if (history.length === 0) return 0

  let peak = 0
  let sumSquaredDrawdowns = 0

  history.forEach((state) => {
    if (state.totalValue > peak) {
      peak = state.totalValue
    }

    if (peak > 0) {
      const drawdownPct = ((peak - state.totalValue) / peak) * 100
      sumSquaredDrawdowns += drawdownPct * drawdownPct
    }
  })

  return Math.sqrt(sumSquaredDrawdowns / history.length)
}

/**
 * Calculates trading commission based on trade value and configuration
 */
export const calculateCommission = (tradeValue: number, config: CommissionConfig): number => {
  if (!config.enabled) return 0

  const absValue = Math.abs(tradeValue)
  return absValue * ((config.percent || 0) / 100)
}
