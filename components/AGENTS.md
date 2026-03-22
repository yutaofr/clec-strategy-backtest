# Components Directory

## OVERVIEW

Distinct UI domain providing interactive configuration panels and performance visualization dashboards for backtesting.

## STRUCTURE

- `ConfigPanel.tsx`: Primary interface for managing investment profiles and strategy parameters.
- `ResultsDashboard.tsx`: Comprehensive data visualization using Recharts for CAGR, Max Drawdown, and equity curves.
- `MathModelModal.tsx`: Educational overlay explaining the mathematical logic behind simulation steps.
- `FinancialReportModal.tsx`: Detailed data grid view for monthly simulation logs and report export.

## WHERE TO LOOK

- **Modify Input Forms**: Update `ConfigPanel.tsx` for new strategy settings or asset parameters.
- **Update Visualizations**: Edit `ResultsDashboard.tsx` to add new charts or modify existing Recharts configurations.
- **UI Styling**: Apply Tailwind CSS classes directly within component files.
- **Icons**: Use `lucide-react` library; refer to existing imports in `ConfigPanel.tsx`.

## CONVENTIONS

- **Functional Components**: All components must use `export const ComponentName: React.FC<Props> = ...`.
- **Hooks**: Prefer standard React hooks (`useState`, `useEffect`) and custom `useTranslation` for i18n.
- **Localization**: Never hardcode UI strings; register and use keys via `services/i18n.tsx`.
- **Props**: Define clear interfaces for all component props immediately before the component definition.

## ANTI-PATTERNS

- **Monolithic Components**: Do not exceed 500 lines; extract sub-components (e.g., `MetricCard`) within the same file or a sub-folder.
- **Business Logic**: Never implement financial calculations in components; use `services/financeMath.ts` or `services/simulationEngine.ts`.
- **Direct Style Objects**: Avoid `style={{...}}` unless for dynamic values (e.g., chart colors); use Tailwind classes.
- **State Propagations**: Avoid deep prop drilling; use state lifting or consider context if necessary for global UI state.
