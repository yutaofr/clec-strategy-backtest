# E2E Testing Guidelines

## OVERVIEW

Playwright-based end-to-end tests for verifying user interaction flows, simulation accuracy, and chart rendering.

## STRUCTURE

- `*.spec.ts`: Test files covering specific features, user flows, or regression scenarios.
- `benchmark.spec.ts`: Performance and complex calculation verification.
- `chart_*.spec.ts`: Specialized tests for Recharts axis, values, and scaling.
- `sanity.spec.ts`: High-level app availability and core i18n check.

## WHERE TO LOOK

- **Simulation Logic**: `calculation.spec.ts` (Profile creation, editing, and running comparison).
- **Visualization**: `charts.spec.ts` (Ensuring Recharts surfaces and legends render correctly).
- **Responsive Layout**: `dynamic_height.spec.ts` (UI adaptation to container sizes).
- **Strategy Management**: `strategy_copy.spec.ts` (Duplicating and modifying investment profiles with i18n support).

## CONVENTIONS

- **i18n Handling**: Most tests start by clicking "EN" to guarantee selector stability. Some tests specifically target other languages (e.g., `button:has-text("简")`) to verify localization.
- **Robust Selectors**:
  - Use `page.locator('...').last()` for elements duplicated across desktop/mobile views.
  - Prefer `page.getByText()`, `page.getByLabel()`, and `page.getByTitle()` for semantic accessibility-based selection.
- **Simulation Lifecycle**: Always trigger "Run Comparison" and verify `.recharts-surface` visibility before asserting on calculated metrics.
- **Form Interaction**: Commit profile changes by clicking "Done" after filling inputs. Use `toHaveValue()` to verify input state.

## ANTI-PATTERNS

- **Fixed Delays**: Never use `page.waitForTimeout()`; rely on Playwright's built-in assertion polling and auto-waiting.
- **Direct State Access**: Do not attempt to read React state or underlying data; verify behavior through the DOM.
- **Overlapping Tests**: Keep `.spec.ts` files focused on a single domain to avoid long-running, fragile test suites.
- **Implicit Language**: Don't assume the app starts in a specific language; explicitly set it if the test depends on text content.
