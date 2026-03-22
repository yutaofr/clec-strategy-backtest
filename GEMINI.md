# 📈 CLEC Strategy Backtest - Project Context

## Project Overview

**CLEC Strategy Backtest** is a high-performance investment simulation and strategic risk analysis platform. It allows users to simulate and analyze complex investment strategies using historical market data (specifically Nasdaq-100/QQQ and 2x Leveraged Nasdaq-100/QLD).

The project models sophisticated scenarios including:

- **Multi-Asset Allocation**: Mix and match QQQ, QLD, and Cash.
- **Advanced Leverage**: LTV tracking, margin calls, and liquidation triggers.
- **Dynamic Cash Management**: Interest-bearing cash reserves and flexible contribution intervals.
- **Investment Strategies**: Five core strategies from simple Buy & Hold to complex flexible rebalancing.
- **Professional Analytics**: CAGR, IRR, Sharpe Ratio, Ulcer Index, Max Drawdown, and Calmar Ratio.

### Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS.
- **Data Visualization**: Recharts.
- **Reporting**: jsPDF, html2canvas (PDF generation).
- **Testing**: Vitest (Unit), Playwright (E2E).
- **Environment**: Docker, Bun (Package Manager).

---

## 🏗 Building and Running

Following the project's security and system integrity mandates, **all compilation, testing, and dependency installation must be performed using Docker**. Do not run `bun install` or `npm install` directly on the host.

### Commands

- **Install Dependencies**:
  ```bash
  docker-compose run --rm test bun install
  ```
- **Development**:
  ```bash
  docker-compose up app
  ```
- **Run Unit Tests (Vitest)**:
  ```bash
  docker-compose run --rm test
  ```
- **Run Linting & Formatting Check**:
  ```bash
  docker-compose run --rm lint
  ```
- **Build for Production**:
  ```bash
  docker-compose build app
  ```

---

## 📂 Project Structure

- `components/`: React UI components (Dashboard, Config Panel, Modals).
- `services/`: Core logic and simulation engine.
  - `simulationEngine.ts`: The main backtest execution loop.
  - `strategies.ts`: Implementation of the 5 investment strategies.
  - `financeMath.ts`: Financial calculation utilities.
  - `reportService.ts`: PDF report generation logic.
- `data/`: Historical market data (`qqq-history.json`, `qld-history.json`).
- `docs/`: Technical documentation, requirements, and screenshots.
- `e2e/`: Playwright end-to-end test suites.
- `types.ts`: Global TypeScript interfaces and domain models.
- `constants.ts`: Default configuration and market data initialization.

---

## 🛠 Development Conventions

### Simulation Protocol

The `simulationEngine.ts` follows a monthly iteration flow:

1. **Banking**: Accrue cash interest and service debt (Monthly/Maturity/Capitalized).
2. **Strategy**: Execute selected `StrategyFunction` (defined in `strategies.ts`).
3. **Leverage**: Calculate LTV and check for margin calls/liquidation using LOW prices for conservative valuation.
4. **Metrics**: Record state and calculate performance indicators.

### Coding Style & Standards

- **TypeScript**: Strict mode enabled. No `any` usage (use `unknown` if necessary). Explicit types for function parameters and return values.
- **Formatting (Prettier)**:
  - **No semicolons**
  - **Single quotes** for strings
  - **Trailing commas** everywhere
  - **2-space indentation**
  - **100-character line width**
- **Naming**:
  - `camelCase` for variables/functions.
  - `PascalCase` for React components and Interfaces/Types.
  - `UPPER_SNAKE_CASE` for constants.
  - `camelCase.ts` for services, `PascalCase.tsx` for components.
- **React Patterns**: Functional components with hooks. Use `React.FC<Props>` for typed components. No hardcoded UI strings (use `services/i18n.tsx`).
- **Financial Calculations**: Preserve full precision internally; use `toFixed()` only for display. Store percentages as decimals (0.5 for 50%).
- **Surgical Updates**: When modifying the simulation engine, ensure all 5 strategies are considered and tested for regressions.
- **Testing**: Unit tests in `services/__tests__/` must cover core math and strategy logic. E2E tests in `e2e/` cover UI behavior and integrated calculations.
- **Docker First**: Always verify changes by running tests inside the provided Docker containers.

---

## 🎯 Verification Checklist

Before completing any task, ensure:

- [ ] Code compiles successfully via `docker-compose build`.
- [ ] Unit tests pass via `docker-compose run --rm test`.
- [ ] Linting passes via `docker-compose run --rm lint`.
- [ ] UI changes are verified (if applicable).
