import { useState, useEffect, useCallback } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { ConfigPanel } from './components/ConfigPanel'
import { ResultsDashboard } from './components/ResultsDashboard'
import { FinancialReportModal } from './components/FinancialReportModal'
import { MARKET_DATA } from './constants'
import { runBacktest } from './services/simulationEngine'
import { getStrategyByType } from './services/strategies'
import { AssetConfig, Profile, SimulationResult } from './types'
import {
  LayoutDashboard,
  Settings2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
} from 'lucide-react'
import { LanguageProvider, useTranslation, Language } from './services/i18n'

const DEFAULT_CONFIG_A: AssetConfig = {
  initialCapital: 1000000,
  contributionAmount: 5000, // Adjusted relative to 1M capital
  contributionIntervalMonths: 1,
  yearlyContributionMonth: 12, // Default to December
  qqqWeight: 50,
  qldWeight: 40,
  // Conservative DCA: Just buy QQQ
  contributionQqqWeight: 100,
  contributionQldWeight: 0,
  cashYieldAnnual: 2.0,
  leverage: {
    enabled: false,
    interestRate: 5.0,
    qqqPledgeRatio: 0.7,
    qldPledgeRatio: 0.0,
    cashPledgeRatio: 0.95,
    maxLtv: 100, // Default 100% of PLEDGED value (Broker Limit)
    withdrawType: 'PERCENT',
    withdrawValue: 2.0,
    inflationRate: 0.0,
    interestType: 'CAPITALIZED',
    ltvBasis: 'TOTAL_ASSETS',
  },
  annualExpenseAmount: 30000,
  cashCoverageYears: 15,
}

const DEFAULT_CONFIG_B: AssetConfig = {
  initialCapital: 1000000,
  contributionAmount: 5000,
  contributionIntervalMonths: 1,
  yearlyContributionMonth: 12, // Default to December
  qqqWeight: 10,
  qldWeight: 80,
  // Aggressive DCA: Match the portfolio weights
  contributionQqqWeight: 10,
  contributionQldWeight: 80,
  cashYieldAnnual: 2.0,
  leverage: {
    enabled: false,
    interestRate: 5.0,
    qqqPledgeRatio: 0.7,
    qldPledgeRatio: 0.0,
    cashPledgeRatio: 0.95,
    maxLtv: 100,
    withdrawType: 'PERCENT',
    withdrawValue: 2.0,
    inflationRate: 0.0,
    interestType: 'CAPITALIZED',
    ltvBasis: 'TOTAL_ASSETS',
  },
  annualExpenseAmount: 30000,
  cashCoverageYears: 15,
}

const INITIAL_PROFILES: Profile[] = [
  {
    id: '1',
    name: 'Conservative',
    color: '#2563eb', // Blue
    strategyType: 'NO_REBALANCE',
    config: DEFAULT_CONFIG_A,
  },
  {
    id: '2',
    name: 'Aggressive',
    color: '#ea580c', // Orange (High contrast)
    strategyType: 'SMART',
    config: DEFAULT_CONFIG_B,
  },
]

const MainApp = () => {
  const { t, language, setLanguage } = useTranslation()
  const [profiles, setProfiles] = useState<Profile[]>(INITIAL_PROFILES)
  const [results, setResults] = useState<SimulationResult[]>([])
  const [isCalculated, setIsCalculated] = useState(false)
  const [showQQQBenchmark, setShowQQQBenchmark] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  // Reporting Modal State
  const [reportResult, setReportResult] = useState<SimulationResult | null>(null)

  // Sidebar state
  const [isSidebarOpen, setSidebarOpen] = useState(true)

  // Auto-collapse on small screens initially
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [])

  const handleRunSimulation = useCallback(() => {
    setIsCalculating(true)

    // Using setTimeout to allow UI to render the "Calculating" state before heavy CPU task
    setTimeout(() => {
      const newResults = []

      // 1. Run Strategy Backtests
      profiles.forEach((profile) => {
        const strategyFunc = getStrategyByType(profile.strategyType)
        newResults.push(
          runBacktest(MARKET_DATA, strategyFunc, profile.config, profile.name, profile.color),
        )
      })

      // 2. Add Benchmarks (based on the first profile's capital/contribution settings)
      if (profiles.length > 0 && showQQQBenchmark) {
        const baseConfig = profiles[0].config

        // Benchmark: QQQ (Nasdaq 100)
        const qqqConfig: AssetConfig = {
          ...baseConfig,
          qqqWeight: 100,
          qldWeight: 0,
          contributionQqqWeight: 100,
          contributionQldWeight: 0,
          leverage: {
            ...baseConfig.leverage,
            enabled: false, // Benchmarks are unleveraged
          },
        }

        // Run Benchmarks (Only QQQ)
        newResults.push(
          runBacktest(
            MARKET_DATA,
            getStrategyByType('NO_REBALANCE'),
            qqqConfig,
            'Benchmark: QQQ',
            '#64748b',
          ), // Slate-500
        )
      }

      setResults(newResults)
      setIsCalculated(true)
      setIsCalculating(false)

      // Auto close on mobile only
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      }
    }, 100) // Small delay to yield to UI thread
  }, [profiles, showQQQBenchmark])

  useEffect(() => {
    handleRunSimulation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleViewDetails = (profileId: string) => {
    if (!isCalculated) return
    // We need to map the profile ID to the result index.
    // Since results map 1:1 to profiles array order:
    const index = profiles.findIndex((p) => p.id === profileId)
    if (index >= 0 && results[index]) {
      setReportResult(results[index])
    }
  }

  const LangButton = ({ code, label }: { code: Language; label: string }) => (
    <button
      onClick={() => setLanguage(code)}
      className={`text-xs px-2 py-1 rounded transition-colors font-medium ${language === code ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-900 relative overflow-x-hidden">
      {/* Financial Report Modal */}
      {reportResult && (
        <FinancialReportModal result={reportResult} onClose={() => setReportResult(null)} />
      )}

      {/* Mobile/Tablet Portrait Header (< 1024px) */}
      <div className="lg:hidden bg-white p-4 border-b border-slate-200 sticky top-0 z-40 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" />
            <h1 className="font-bold text-lg">{t('appTitle')}</h1>
          </div>

          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${isSidebarOpen ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600'}`}
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
            <span className="text-sm font-medium">{isSidebarOpen ? t('done') : t('profiles')}</span>
          </button>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400 font-medium">
            {isCalculated ? `${t('comparingPerformance')} ${results.length}` : ''}
          </span>
          <div className="flex gap-1">
            <LangButton code="en" label="EN" />
            <LangButton code="fr" label="FR" />
            <LangButton code="zh-CN" label="简" />
            <LangButton code="zh-TW" label="繁" />
          </div>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Calculating Overlay */}
      {isCalculating && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-[100] flex flex-col items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <Activity className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-800 text-lg">{t('calculating')}</h3>
              <p className="text-sm text-slate-400 mt-1">{t('calculationDesc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Container */}
      <aside
        className={`
            fixed inset-y-0 left-0 z-50 
            bg-slate-50 border-r border-slate-200 
            flex flex-col flex-shrink-0
            transition-all duration-300 ease-in-out
            shadow-2xl lg:shadow-none
            
            /* Mobile Logic: slide in/out */
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            w-80
            
            /* Desktop Logic: Sticky, variable width, reset fixed positioning */
            lg:translate-x-0 lg:static lg:inset-auto lg:h-screen lg:sticky lg:top-0
            ${isSidebarOpen ? 'lg:w-80 xl:w-96 lg:border-r' : 'lg:w-0 lg:border-none lg:overflow-hidden'}
          `}
      >
        {/* Sidebar Header (Fixed within sidebar) */}
        <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-4">
          <div className="hidden lg:flex justify-between items-center">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="text-blue-600 w-6 h-6" />
              <h1 className="font-bold text-xl tracking-tight text-slate-800">{t('appTitle')}</h1>
            </div>

            {/* Desktop Collapse Button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500 transition-colors"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          <div className="hidden lg:flex gap-1">
            <LangButton code="en" label="English" />
            <LangButton code="fr" label="Français" />
            <LangButton code="zh-CN" label="简体中文" />
            <LangButton code="zh-TW" label="繁體中文" />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-8">
          {/* Wrapper to ensure width stability during transitions */}
          <div className="min-w-[18rem]">
            <ConfigPanel
              profiles={profiles}
              onProfilesChange={setProfiles}
              onRun={handleRunSimulation}
              onViewDetails={handleViewDetails}
              hasResults={isCalculated}
              showBenchmark={showQQQBenchmark}
              onShowBenchmarkChange={setShowQQQBenchmark}
            />

            <div className="mt-8 px-2 text-xs text-slate-400 leading-relaxed hidden lg:block">
              <p>{t('dataRange')}: 2000 - 2025</p>
              <p className="mt-2">{t('appDesc')}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 lg:p-8 relative">
        {/* Desktop Expand Button (Floating) */}
        <div
          className={`fixed top-6 left-6 z-30 transition-opacity duration-300 ${!isSidebarOpen && window.innerWidth >= 1024 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden lg:flex bg-white p-2.5 rounded-lg shadow-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all"
            title="Open Sidebar"
          >
            <PanelLeftOpen className="w-6 h-6" />
          </button>
        </div>

        {isCalculated ? (
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            <div className="mb-6 hidden lg:block">
              <h2 className="text-2xl font-bold text-slate-800">{t('simulationResults')}</h2>
              <p className="text-slate-500">
                {t('comparingPerformance')} {results.length} {t('profiles')}.
              </p>
            </div>
            <ResultsDashboard results={results} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            {t('runComparison')}
          </div>
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
      <Analytics />
    </LanguageProvider>
  )
}
