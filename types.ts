// Domain Models

export interface MarketDataRow {
  date: string // ISO YYYY-MM-DD
  qqq: number
  qld: number
}

export interface CommissionConfig {
  enabled?: boolean
  percent?: number // Commission as percentage of trade value (e.g., 0.03 for 0.03%)
}

export interface LeverageConfig {
  enabled: boolean
  interestRate: number // Annual interest rate for the loan
  // Pledge Ratios (0.0 - 1.0)
  qqqPledgeRatio: number // e.g., 0.70
  qldPledgeRatio: number // e.g., 0.10 (New: Allow QLD as collateral)
  cashPledgeRatio: number // e.g., 0.95
  maxLtv: number // User's safety stop (Liquidation usually happens at 100% of Pledged Collateral)
  withdrawType: 'PERCENT' | 'FIXED'
  withdrawValue: number // Percentage (e.g. 2.0) or Fixed Amount
  inflationRate: number // Annual inflation rate for FIXED withdrawals
  interestType: 'MONTHLY' | 'MATURITY' | 'CAPITALIZED' // NEW: Interest payment mode
  ltvBasis: 'TOTAL_ASSETS' | 'COLLATERAL' // NEW: LTV Calculation Basis
}

export interface AssetConfig {
  initialCapital: number
  contributionAmount: number // Amount per period
  contributionIntervalMonths: number // 1 = Monthly, 3 = Quarterly, 12 = Yearly
  yearlyContributionMonth: number // 1-12, which month for yearly contributions (default 12 = December)

  // Initial / Target Portfolio Allocation
  qqqWeight: number // 0-100
  qldWeight: number // 0-100

  // Recurring Contribution Allocation
  contributionQqqWeight: number // 0-100
  contributionQldWeight: number // 0-100

  // Cash weight is derived: 100 - QQQ - QLD
  cashYieldAnnual: number // Percentage, e.g., 4.0

  // Flexible Rebalancing Config
  annualExpenseAmount?: number // Annual living expense amount (default 2% of initial capital)
  cashCoverageYears?: number // Target years of expenses in cash (default 15)

  // Stock Pledging
  leverage: LeverageConfig

  // Trading Commissions
  commissions?: CommissionConfig
}

export type StrategyType = 'NO_REBALANCE' | 'REBALANCE' | 'SMART' | 'FLEXIBLE_1' | 'FLEXIBLE_2'

export interface Profile {
  id: string
  name: string
  color: string
  strategyType: StrategyType
  config: AssetConfig
}

export interface FinancialEvent {
  type: 'INTEREST_INC' | 'INTEREST_EXP' | 'DEBT_INC' | 'TRADE' | 'DEPOSIT' | 'WITHDRAW' | 'INFO'
  amount?: number
  description: string
}

export interface PortfolioState {
  date: string
  shares: {
    QQQ: number
    QLD: number
  }
  cashBalance: number
  debtBalance: number // New: Track margin loan balance
  accruedInterest: number // New: Simple interest accrued but not yet paid (for MATURITY mode)
  totalValue: number // Net Equity (Assets - Debt)

  // Metadata for complex strategies (e.g., Smart Adjust)
  strategyMemory: Record<string, unknown>
  ltv: number // Loan to Value ratio for this step
  beta: number // Portfolio Beta relative to QQQ

  // New: Detailed logs for accounting reports
  events: FinancialEvent[]
}

export interface SimulationResult {
  strategyName: string
  color: string // Added to carry profile color to charts
  isLeveraged: boolean // Flag to indicate if leverage was enabled
  history: PortfolioState[]
  isBankrupt: boolean
  bankruptcyDate: string | null
  metrics: {
    finalBalance: number
    cagr: number
    maxDrawdown: number
    sharpeRatio: number
    irr: number
    realFinalBalance: number
    worstYearReturn: number
    maxRecoveryMonths: number
    calmarRatio: number
    painIndex: number
    inflationRate: number
  }
}

// Function Protocol for Strategies
export type StrategyFunction = (
  currentState: PortfolioState,
  marketData: MarketDataRow,
  config: AssetConfig,
  monthIndex: number,
) => PortfolioState
