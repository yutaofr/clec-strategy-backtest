// Domain Models

export interface MarketDataRow {
  date: string; // ISO YYYY-MM-DD
  qqq: number;
  qld: number;
}

export interface LeverageConfig {
  enabled: boolean;
  interestRate: number; // Annual interest rate for the loan
  // Pledge Ratios (0.0 - 1.0)
  qqqPledgeRatio: number; // e.g., 0.70
  qldPledgeRatio: number; // e.g., 0.10 (New: Allow QLD as collateral)
  cashPledgeRatio: number; // e.g., 0.95
  maxLtv: number; // User's safety stop (Liquidation usually happens at 100% of Pledged Collateral)
  withdrawType: 'PERCENT' | 'FIXED';
  withdrawValue: number; // Percentage (e.g. 2.0) or Fixed Amount
}

export interface AssetConfig {
  initialCapital: number;
  contributionAmount: number; // Amount per period
  contributionIntervalMonths: number; // 1 = Monthly, 3 = Quarterly, 12 = Yearly
  
  // Initial / Target Portfolio Allocation
  qqqWeight: number; // 0-100
  qldWeight: number; // 0-100
  
  // Recurring Contribution Allocation
  contributionQqqWeight: number; // 0-100
  contributionQldWeight: number; // 0-100

  // Cash weight is derived: 100 - QQQ - QLD
  cashYieldAnnual: number; // Percentage, e.g., 4.0

  // Stock Pledging
  leverage: LeverageConfig;
}

export type StrategyType = 'LUMP_SUM' | 'DCA' | 'REBALANCE' | 'SMART';

export interface Profile {
  id: string;
  name: string;
  color: string;
  strategyType: StrategyType;
  config: AssetConfig;
}

export interface PortfolioState {
  date: string;
  shares: {
    QQQ: number;
    QLD: number;
  };
  cashBalance: number;
  debtBalance: number; // New: Track margin loan balance
  totalValue: number; // Net Equity (Assets - Debt)
  
  // Metadata for complex strategies (e.g., Smart Adjust)
  strategyMemory: Record<string, any>;
  ltv: number; // Loan to Value ratio for this step
}

export interface SimulationResult {
  strategyName: string;
  color: string; // Added to carry profile color to charts
  isLeveraged: boolean; // Flag to indicate if leverage was enabled
  history: PortfolioState[];
  isBankrupt: boolean;
  bankruptcyDate: string | null;
  metrics: {
    finalBalance: number;
    cagr: number;
    maxDrawdown: number;
    sharpeRatio: number;
    irr: number;
  };
}

// Function Protocol for Strategies
export type StrategyFunction = (
  currentState: PortfolioState,
  marketData: MarketDataRow,
  config: AssetConfig,
  monthIndex: number
) => PortfolioState;