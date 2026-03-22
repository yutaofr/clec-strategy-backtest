# Services - Core Logic Domain

## OVERVIEW

Core business logic, simulation engine, investment strategies, and financial computation services.

## STRUCTURE

- `simulationEngine.ts`: Central monthly simulation loop, state transitions, and risk management logic.
- `strategies.ts`: Implementations of `StrategyFunction` for various asset allocation and rebalancing rules.
- `financeMath.ts`: High-precision financial metrics (CAGR, IRR, Sharpe Ratio, drawdown) as pure functions.
- `reportService.ts`: PDF report orchestration using `jsPDF` and `html2canvas`.
- `i18n.tsx`: Global localization service for multi-language support.
- `fontData.ts`: Static binary font data for PDF document generation.
- `__tests__/`: Comprehensive unit test suite for all business logic components.

## WHERE TO LOOK

| Component              | Responsibility        |
| ---------------------- | --------------------- |
| **Simulation Loop**    | `simulationEngine.ts` |
| **Asset Rebalancing**  | `strategies.ts`       |
| **Financial Formulae** | `financeMath.ts`      |
| **PDF Generation**     | `reportService.ts`    |
| **Localization**       | `i18n.tsx`            |

## CONVENTIONS

- **Functional Purity**: Strategy and math functions must be side-effect free and deterministic.
- **State Immutability**: All portfolio state updates must use object spreading; never mutate in-place.
- **Precision**: Store decimals (0.1 = 10%) internally; multiply by 100 ONLY for UI display.
- **Test-First**: New business logic MUST have a corresponding `.test.ts` in `__tests__/`.

## ANTI-PATTERNS

- **Implicit State**: Avoid global or module-level state; pass all dependencies via parameters.
- **Direct UI Logic**: Business logic must not depend on React components or browser-specific APIs.
- **Precision Loss**: Never use `toFixed()` or `Math.round()` in intermediate calculations.
