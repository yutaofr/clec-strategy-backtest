# CLEC Strategy Backtest - Agent Guidelines

## Commands

**CRITICAL**: All compiling, testing, and building MUST run in Docker containers for consistency.

### Docker Commands (Required)

```bash
docker compose up app          # Development server
docker compose run test        # Testing (unit + E2E)
docker compose run lint        # Linting and format checking
docker compose up prod-test    # Production build
docker compose -f docker-compose.e2e.yml up e2e  # E2E tests (Bun pre-installed)
```

### Direct bun Commands (Local dev only)

```bash
bun run dev          # Start Vite dev server
bun run build        # Production build (tsc + vite build)
bun run test         # Run all unit tests (Vitest)
bun run lint         # ESLint check
bun run format       # Format with Prettier
```

### Testing

```bash
bun run vitest run financeMath.test
bun run playwright test calculation.spec.ts
```

---

## Code Style Guidelines

### TypeScript Configuration

- **Strict mode** enabled (no implicit any, strict null checks)
- ES2020 target, ESNext module resolution
- JSX runtime: `react-jsx` (no React import required)

### Formatting (Prettier)

- **No semicolons**
- **Single quotes** for strings
- **Trailing commas** everywhere
- **Line width**: 100 characters
- **Indentation**: 2 spaces

### Import Patterns

```typescript
import React, { useState } from 'react'
import { AssetConfig } from '../types'
import { calculateCAGR } from './financeMath'
```

### Naming Conventions

- **Variables/functions**: `camelCase`
- **Components**: `PascalCase` (export const NameComponent)
- **Interfaces/Types**: `PascalCase` (e.g., `AssetConfig`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_ASSET_CONFIG`)
- **Files**: `camelCase.ts` for services, `PascalCase.tsx` for components

### Type Annotations

- Explicit types for function parameters and return values
- Prefer interfaces for object shapes, type aliases for unions/literals
- No `any` usage (ESLint warns, prefer `unknown` with proper checks)

### React Patterns

- Functional components with hooks
- Use `React.FC<Props>` for typed components
- Props interfaces defined inline or before component
- Event handlers: `handleClick`, `handleChange`

### Testing

- Unit tests in `services/__tests__/` with `.test.ts` suffix
- E2E tests in `e2e/` with `.spec.ts` suffix
- Use `describe`/`it`/`expect` from `vitest`
- Test helpers: `createBaseConfig()`, `generateMarketData()` for setup

### Code Organization

**Deviation from Standard**: Project places source files at root instead of `/src/` directory (common in older setups).

```
./
├── services/              # Core business logic
│   ├── simulationEngine.ts
│   ├── strategies.ts
│   ├── financeMath.ts
│   └── __tests__/         # Unit tests (.test.ts)
├── components/            # React UI components
│   ├── ConfigPanel.tsx
│   └── ResultsDashboard.tsx
├── e2e/                   # End-to-end tests (.spec.ts)
├── data/                  # Historical market data (JSON)
├── docs/                  # Documentation and raw scripts
├── types.ts              # Shared TypeScript interfaces
├── constants.ts          # Global configuration
├── index.tsx             # React app entry
├── App.tsx               # Root component
└── AGENTS.md             # This file
```

## WHERE TO LOOK

| Task                        | Location                     | Notes                                                                     |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------------- |
| Add new investment strategy | services/strategies.ts       | Implement `StrategyFunction` interface, update `StrategyType` in types.ts |
| Add UI component            | components/                  | PascalCase naming, functional with hooks                                  |
| Add unit test               | services/**tests**/          | Use Vitest, `.test.ts` suffix, helper functions like `createBaseConfig()` |
| Add E2E test                | e2e/                         | Use Playwright, `.spec.ts` suffix                                         |
| Update internationalization | services/i18n.tsx            | Register strings for all supported languages                              |
| Modify simulation logic     | services/simulationEngine.ts | Core monthly iteration loop                                               |
| Add financial metric        | services/financeMath.ts      | Pure functions for CAGR, IRR, etc.                                        |

### Numeric Precision

- Financial calculations: Use `toFixed()` for display, preserve full precision internally
- Percentages stored as decimal (0.5 for 50%), multiply by 100 for display
- Currency: Store as number, format with Intl.NumberFormat for display

### Strategy Implementation

- All strategies implement `StrategyFunction` signature
- Pure functions: input state, market data, config → output state
- Use `strategyMemory` in `PortfolioState` for multi-step strategies
- Preserve immutability: spread operator for state updates

### Date Handling

- Dates stored as ISO strings (`YYYY-MM-DD`)
- Use `substring(5, 7)` to extract month (1-12)
- Market data assumes monthly snapshots

---

## Quick Reference

### Adding a new test file

```bash
touch services/__tests__/newFeature.test.ts
# Add imports and tests
import { describe, it, expect } from 'vitest'
import { yourFunction } from '../yourModule'
```

### Adding a new strategy

1. Define function in `services/strategies.ts`
2. Add to `StrategyType` union in `types.ts`
3. Export from `strategies.ts`
4. Add tests in `services/__tests__/strategies.test.ts`

### Adding a new component

1. Create `components/NewFeature.tsx`
2. Define Props interface
3. Export as `export const NewFeature: React.FC<Props> = ({ ... }) => { ... }`
4. Add E2E test in `e2e/`

---

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** run `bun install`, `bun run build`, `vitest`, etc. directly - **ALWAYS** use Docker containers (`docker compose run ...`)
- **NO** global installs (`npx`, `pip install -U`, `gem install`) on host
- **NO** hardcoded UI strings - **ALWAYS** register in `services/i18n.tsx` for i18n support
- **NO** precision loss in financial calculations - preserve full precision internally
- **NO** direct state mutation in strategies - use spread operator for immutability
- **NEVER** host execution for builds/tests - Docker mandatory for consistency

## Key Constraints

- **No `any` types** - use proper TypeScript typing
- **No semicolons** - Prettier enforces
- **Strict mode** - no implicit any, null checks required
- **Type safety** - all code must pass TypeScript compilation
- **Test coverage** - unit tests for all business logic
