<div align="center">

# 📈 CLEC Strategy Backtest

**A High-Performance Investment Simulation & Strategic Risk Analysis Platform**

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## 🚀 Overview

**CLEC Strategy Backtest** is a sophisticated financial tool designed for serious investors to simulate, analyze, and optimize investment strategies using historical market data (specifically focusing on QQQ/QLD assets). It goes beyond simple calculators by modeling complex scenarios including leverage, margin calls, interest accrual, and inflation-adjusted living expenses.

## ✨ Key Features

### 🛠 Powerful Simulation Engine

- **Multi-Asset Allocation**: Mix and match QQQ (Nasdaq-100) and QLD (2x Leveraged Nasdaq-100).
- **Advanced Leverage Modeling**:
  - Interactive LTV (Loan-to-Value) tracking.
  - Automatic margin call/liquidation triggers when safety limits are breached.
  - Capitalized interest for unpaid loan balances.
- **Dynamic Cash Management**: Supports interest-bearing cash reserves and flexible contribution intervals.

### 🧠 Investment Strategies

**Note**: All strategies support configurable DCA (Monthly/Quarterly/Yearly) with custom asset allocation for initial capital and ongoing contributions.

- **No Rebalance** (Buy & Hold): Simple strategy that maintains initial allocation. Monthly/quarterly/yearly contributions follow configured contribution weights without rebalancing.

- **Yearly Rebalancing**: Standard DCA with automatic portfolio rebalancing to target weights every January. Maintains target asset allocation over time.

- **Smart Adjust**: Dynamic strategy that tracks QLD performance annually.
  - **Bull Market (QLD Profit > 0)**: Sell 1/3 of profits to increase cash reserves.
  - **Bear Market (QLD Profit ≤ 0)**: Deploy up to 2% of portfolio value to buy QLD on dips using available cash.

- **Flexible Rebalancing - Defensive (Type 1)**: Cash-buffer focused strategy with 15-year expense target (configurable).
  - **Cash Inadequate (< Target)**:
    - Bull: Harvest 1/3 of QLD profits to cash
    - Bear: Rebalance 2% from QQQ to QLD (leveraging bear market exposure)
  - **Cash Adequate (≥ Target)**: Apply Smart Rebalance logic (harvest profits or buy dips with cash)

- **Flexible Rebalancing - Aggressive (Type 2)**: Growth-focused variant for investors with adequate cash reserves.
  - **Cash Inadequate (< Target)**: Same defensive behavior as Type 1
  - **Cash Adequate (≥ Target)**:
    - Bull: Reinvest 1/3 of QLD profits into QQQ (not cash) to compound gains
    - Bear: Smart dip buying with cash (same as Type 1)

### 📊 Professional Analytics & Reporting

- **In-depth Metrics**: CAGR, IRR, Sharpe Ratio, Ulcer Index (Pain Index), Max Drawdown, and Calmar Ratio.
- **AI-Readable PDF Reports**: Generate comprehensive PDF summaries with charts and tables optimized for both humans and AI analysis.
- **Real-time Visualization**: Interactive charts powered by Recharts for equity curves and risk metrics.

### 🌐 Global & Versatile

- **i18n Ready**: Fully localized interface support.
- **Cross-Platform**: Built with Capacitor for seamless transition to mobile platforms (Android/iOS).

---

## 🛠 Tech Stack

- **Frontend**: React 18 with Vite
- **Language**: TypeScript (Strict Typing)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **PDF Generation**: jsPDF + jspdf-autotable + html2canvas
- **Mobile**: Capacitor
- **Deployment**: Docker & Docker Compose

---

## 📸 Screenshots

### Profiles Section

![Profiles Section](docs/screenshots/profiles-section.png)

Manage and compare multiple investment strategies side-by-side. Each profile can be customized with:

- Different asset allocation strategies
- Leverage and risk settings
- Contribution schedules

### Add Profile Form

![Add Profile Form](docs/screenshots/add-profile-form.png)

Configure individual strategy parameters including:

- Initial capital and contribution amounts
- Asset allocation weights (QQQ/QLD/Cash)
- Leverage settings (interest rates, LTV limits, collateral ratios)
- Strategy selection (5 strategies available)

### Results Dashboard

![Results Dashboard](docs/screenshots/results-dashboard.png)

View comprehensive performance metrics:

- CAGR, IRR, Sharpe Ratio, Max Drawdown
- Calmar Ratio, Ulcer Index, Recovery Time
- Interactive comparison charts

## 💻 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- Docker (Optional, for containerized deployment)

### Local Development

1. **Clone & Install**:
   ```bash
   bun install
   ```
2. **Launch**:
   ```bash
   bun run dev
   ```

### Docker Deployment

```bash
docker-compose up -d
```

### Mobile Sync (Capacitor)

```bash
bun run mobile:sync
```

---

## 🔄 Simulation Flow

The simulation engine follows a systematic monthly iteration process:

### Flow Diagram

![Simulation Flow](docs/simulation-flow.svg)

**Note**: The SVG includes two sections:

- **Top**: 5 Investment Strategies with their core logic explained
- **Bottom**: Simulation process flow with animated elements

#### Strategy Breakdown:

1. **No Rebalance** (Green): Simple buy-and-hold approach. Maintain initial allocation, DCA follows contribution weights only.

2. **Yearly Rebalancing** (Blue): Annual reset to target allocation in January. Maintains desired asset mix over time.

3. **Smart Adjust** (Purple): Dynamic strategy. Bull markets: Sell 1/3 profit to cash. Bear markets: Buy 2% dip with available cash.

4. **Flexible Defensive** (Orange): Cash-buffer focused. Maintain 15-year cash reserve. Defensive when insufficient (harvest profits or rebalance to QLD). Smart mode when adequate.

5. **Flexible Aggressive** (Red): Growth-oriented. Same defensive when cash low. Bull: Reinvest profits into QQQ (not cash) to compound gains.

### Key Process Steps

1. **Initialization**: Set up portfolio with zero positions (QQQ: 0, QLD: 0, Cash: 0, Debt: 0)

2. **Monthly Banking**:
   - Accrue cash interest (based on `cashYieldAnnual`)
   - Calculate debt interest based on selected mode:
     - **MONTHLY**: Pay from cash, capitalize shortfall
     - **MATURITY**: Accrue only (no cash flow)
     - **CAPITALIZED**: Add to debt principal (compound interest)

3. **Strategy Execution**: Apply selected strategy function (No Rebalance, Yearly Rebalance, Smart Adjust, Flexible 1/2)

4. **Leverage Management**:
   - Calculate effective collateral (using pledge ratios)
   - Check LTV (Loan-to-Value) against `maxLtv` threshold
   - Trigger margin call/liquidation if safety limits breached

5. **Risk Metrics**: Calculate performance indicators (CAGR, IRR, Sharpe Ratio, Max Drawdown, etc.)

## 📂 Project Structure

- `components/`: Modular UI components (ResultsDashboard, ConfigPanel, etc.)
- `services/`: Core logic (simulationEngine, financeMath, strategyDefinitions)
- `docs/`: Evolution path and documentation.
- `constants.ts`: Global configuration and initial data sets.
- `types.ts`: Shared TypeScript interfaces.

---

<div align="center">
Made with ❤️ for Strategic Investors
</div>
