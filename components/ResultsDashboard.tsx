
import React, { useState } from 'react';
import { SimulationResult } from '../types';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, BarChart, Bar } from 'recharts';
import { TrendingUp, Percent, Activity, Trophy, AlertTriangle, Scale, HelpCircle, Zap, ShieldAlert, Calendar, Clock, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useTranslation } from '../services/i18n';
import { MathModelModal } from './MathModelModal';

interface ResultsDashboardProps {
  results: SimulationResult[];
}

const MetricCard: React.FC<{
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  winnerName: string;
  winnerColor: string;
  highlight?: boolean
}> = ({ title, value, subValue, icon, winnerName, winnerColor, highlight }) => (
  <div className={`p-5 rounded-xl border shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}>
    <div>
      <div className="flex justify-between items-start mb-2">
        <div className="text-sm font-medium text-slate-500">{title}</div>
        <div className={`p-2 rounded-lg ${highlight ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      {subValue && <div className="text-xs text-slate-400 mb-2">{subValue}</div>}
    </div>

    <div className={`flex items-center gap-2 text-xs font-medium p-2 rounded-lg border ${highlight ? 'bg-white/60 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
      <Trophy className="w-3 h-3 text-yellow-500" />
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: winnerColor }}></span>
      <span className="text-slate-700 truncate" title={winnerName}>{winnerName}</span>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs">
        <p className="font-bold text-slate-700 mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 mb-1" style={{ color: p.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
            <span>{p.name}:</span>
            <span className="font-mono font-bold">
              {typeof p.value === 'number' && (p.name.includes('%') || p.name.includes('LTV') || p.name.includes('Beta'))
                ? `${Number(p.value).toFixed(2)}${p.name.includes('Beta') ? '' : '%'}`
                : `$${Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ results }) => {
  const { t } = useTranslation();
  const [showMath, setShowMath] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SimulationResult['metrics'] | 'strategyName', direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: keyof SimulationResult['metrics'] | 'strategyName') => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  if (results.length === 0) return null;

  // Filter out bankrupt strategies for "Winning" logic to avoid skewing unless all are bankrupt
  const activeResults = results.filter(r => !r.isBankrupt);
  const safeResults = activeResults.length > 0 ? activeResults : results;



  // Prepare Chart Data (Growth)
  const chartData = results[0].history.map((_, idx) => {
    const row: any = { date: results[0].history[idx].date };
    results.forEach(res => {
      // If history stops early (due to bankruptcy optimization), use 0 or last val
      const val = res.history[idx]?.totalValue ?? 0;
      row[res.strategyName] = val;
    });
    return row;
  });

  // Prepare Drawdown Data
  const drawdownData = results[0].history.map((h) => ({ date: h.date }));
  results.forEach(res => {
    let peak = -Infinity;
    res.history.forEach((h, idx) => {
      if (h.totalValue > peak) peak = h.totalValue;
      const dd = peak === 0 ? 0 : ((h.totalValue - peak) / peak) * 100;
      (drawdownData[idx] as any)[res.strategyName] = dd;
    });
  });

  // Prepare LTV Data (Only for leveraged profiles)
  const leveragedProfiles = results.filter(r => r.isLeveraged);
  let ltvData: any[] = [];
  if (leveragedProfiles.length > 0) {
    ltvData = results[0].history.map((h) => ({ date: h.date }));
    leveragedProfiles.forEach(res => {
      res.history.forEach((h, idx) => {
        (ltvData[idx] as any)[res.strategyName] = h.ltv;
      });
    });
  }

  // Prepare Beta Data
  const betaData = results[0].history.map((h) => ({ date: h.date }));
  results.forEach(res => {
    res.history.forEach((h, idx) => {
      (betaData[idx] as any)[res.strategyName] = h.beta;
    });
  });

  // Prepare Cash Data for ALL profiles that have cash usage
  const cashCharts = results.map(res => {
    const data = res.history.map(h => ({
      date: h.date,
      cashPct: h.totalValue > 0 ? (h.cashBalance / h.totalValue) * 100 : 0,
      equityPct: h.totalValue > 0 ? 100 - ((h.cashBalance / h.totalValue) * 100) : 0,
      cashAmount: h.cashBalance
    }));
    // Only show if there is ever significant cash (>0.5%)
    const maxCash = Math.max(...data.map(d => d.cashPct));
    return { res, data, hasCash: maxCash > 0.5 };
  }).filter(item => item.hasCash);

  // Calculate winners for each primary metric (using safeResults to prefer non-bankrupt)
  const bestBalance = [...safeResults].sort((a, b) => b.metrics.finalBalance - a.metrics.finalBalance)[0];
  const bestIRR = [...safeResults].sort((a, b) => b.metrics.irr - a.metrics.irr)[0];
  const bestDrawdown = [...safeResults].sort((a, b) => a.metrics.maxDrawdown - b.metrics.maxDrawdown)[0]; // Lowest is best
  const bestSharpe = [...safeResults].sort((a, b) => b.metrics.sharpeRatio - a.metrics.sharpeRatio)[0];
  const bestRecoveryMonths = [...safeResults].sort((a, b) => a.metrics.maxRecoveryMonths - b.metrics.maxRecoveryMonths)[0]; // Lowest is best
  const bestWorstYear = [...safeResults].sort((a, b) => b.metrics.worstYearReturn - a.metrics.worstYearReturn)[0]; // Highest is best
  const bestPainIndex = [...safeResults].sort((a, b) => a.metrics.painIndex - b.metrics.painIndex)[0]; // Lowest is best
  const bestCalmar = [...safeResults].sort((a, b) => b.metrics.calmarRatio - a.metrics.calmarRatio)[0];

  const bankruptStrategies = results.filter(r => r.isBankrupt);

  const sortedResults = React.useMemo(() => {
    if (!sortConfig) return results;
    return [...results].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortConfig.key === 'strategyName') {
        aVal = a.strategyName;
        bVal = b.strategyName;
      } else {
        aVal = a.metrics[sortConfig.key];
        bVal = b.metrics[sortConfig.key];
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [results, sortConfig]);

  const SortIcon = ({ column }: { column: keyof SimulationResult['metrics'] | 'strategyName' }) => {
    if (!sortConfig || sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 text-blue-600" /> : <ChevronDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  return (
    <div className="space-y-8">

      {showMath && <MathModelModal onClose={() => setShowMath(false)} />}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('bestBalance')}
          value={`$${Math.round(bestBalance.metrics.finalBalance).toLocaleString()}`}
          icon={<TrendingUp className="w-5 h-5" />}
          winnerName={bestBalance.strategyName}
          winnerColor={bestBalance.color}
          highlight
        />
        <MetricCard
          title={t('bestIrr')}
          value={`${bestIRR.metrics.irr.toFixed(2)}%`}
          icon={<Zap className="w-5 h-5" />}
          winnerName={bestIRR.strategyName}
          winnerColor={bestIRR.color}
          highlight
        />
        <MetricCard
          title={t('lowestDrawdown')}
          value={`${bestDrawdown.metrics.maxDrawdown.toFixed(2)}%`}
          icon={<ShieldAlert className="w-5 h-5" />}
          winnerName={bestDrawdown.strategyName}
          winnerColor={bestDrawdown.color}
        />
        <MetricCard
          title={t('bestSharpe')}
          value={bestSharpe.metrics.sharpeRatio.toFixed(2)}
          icon={<Activity className="w-5 h-5" />}
          winnerName={bestSharpe.strategyName}
          winnerColor={bestSharpe.color}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title={t('maxRecoveryTime')}
          value={`${bestRecoveryMonths.metrics.maxRecoveryMonths} ${t('recoveryMonths')}`}
          icon={<Clock className="w-5 h-5" />}
          winnerName={bestRecoveryMonths.strategyName}
          winnerColor={bestRecoveryMonths.color}
        />
        <MetricCard
          title={t('worstYear')}
          value={`${bestWorstYear.metrics.worstYearReturn.toFixed(2)}%`}
          icon={<Calendar className="w-5 h-5" />}
          winnerName={bestWorstYear.strategyName}
          winnerColor={bestWorstYear.color}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title={t('painIndex')}
          value={`${bestPainIndex.metrics.painIndex.toFixed(2)}`}
          icon={<Percent className="w-5 h-5" />}
          winnerName={bestPainIndex.strategyName}
          winnerColor={bestPainIndex.color}
          highlight
        />
        <MetricCard
          title={t('calmarRatio')}
          value={`${bestCalmar.metrics.calmarRatio.toFixed(2)}`}
          icon={<Scale className="w-5 h-5" />}
          winnerName={bestCalmar.strategyName}
          winnerColor={bestCalmar.color}
        />
      </div>

      {bankruptStrategies.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="text-red-600 w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-bold text-sm">{t('bankruptcyAlert')}</h3>
            <p className="text-red-700 text-xs mt-1">
              {t('bankruptcyDesc')}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {bankruptStrategies.map(s => (
                <span key={s.strategyName} className="inline-flex items-center gap-1 bg-white border border-red-200 text-red-700 px-2 py-1 rounded text-xs font-bold">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                  {s.strategyName} ({s.bankruptcyDate})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{t('portfolioGrowth')}</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(val) => val.substring(0, 4)} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(val) => `$${val / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {results.map((res) => (
                <Line
                  key={res.strategyName}
                  type="monotone"
                  dataKey={res.strategyName}
                  stroke={res.color}
                  strokeWidth={2.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Annual Returns Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{t('worstYear')}</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={(() => {
                const yearMap: { [year: string]: any } = {};
                results.forEach(res => {
                  const annuals = res.history.reduce((acc: any, h, idx) => {
                    const year = h.date.substring(0, 4);
                    if (!acc[year]) acc[year] = { start: idx > 0 ? res.history[idx - 1].totalValue : h.totalValue, end: h.totalValue };
                    else acc[year].end = h.totalValue;
                    return acc;
                  }, {});
                  Object.entries(annuals).forEach(([year, val]: [string, any]) => {
                    if (!yearMap[year]) yearMap[year] = { year };
                    yearMap[year][res.strategyName] = val.start === 0 ? 0 : ((val.end - val.start) / val.start) * 100;
                  });
                });
                return Object.values(yearMap).sort((a, b) => a.year.localeCompare(b.year));
              })()}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {results.map((res) => (
                <Bar
                  key={res.strategyName}
                  dataKey={res.strategyName}
                  fill={res.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Drawdown Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{t('historicalDrawdown')}</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={drawdownData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(val) => val.substring(0, 4)} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {results.map((res) => (
                <Line
                  key={res.strategyName}
                  type="monotone"
                  dataKey={res.strategyName}
                  stroke={res.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Beta Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-bold text-slate-800">{t('betaChartTitle')}</h3>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-bold border border-blue-200 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Risk
          </span>
        </div>
        <p className="text-sm text-slate-500 mb-4">{t('betaChartDesc')}</p>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={betaData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(val) => val.substring(0, 4)} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {results.map((res) => (
                <Line
                  key={res.strategyName}
                  type="monotone"
                  dataKey={res.strategyName}
                  stroke={res.color}
                  strokeWidth={2}
                  dot={false}
                  name={`${res.strategyName} Beta`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LTV Chart - Only visible if leverage is used */}
      {leveragedProfiles.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-slate-800">{t('ltvChartTitle')}</h3>
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-bold border border-yellow-200 flex items-center gap-1">
              <Scale className="w-3 h-3" /> Leveraged
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-4">{t('ltvChartDesc')}</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ltvData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(val) => val.substring(0, 4)} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" unit="%" domain={[0, 'auto']} allowDataOverflow={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {leveragedProfiles.map((res) => (
                  <Line
                    key={res.strategyName}
                    type="monotone"
                    dataKey={res.strategyName}
                    stroke={res.color}
                    strokeWidth={2}
                    dot={false}
                    name={`${res.strategyName} LTV`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Cash Exposure Grid */}
      {cashCharts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="md:col-span-2 lg:col-span-3">
            <h3 className="text-lg font-bold text-slate-800">{t('cashAllocationAnalysis')}</h3>
            <p className="text-sm text-slate-500">{t('cashAnalysisDesc')}</p>
          </div>
          {cashCharts.map(({ res, data }) => (
            <div key={res.strategyName} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: res.color }}></span>
                <h4 className="font-bold text-sm text-slate-700">{res.strategyName}</h4>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.substring(0, 4)} stroke="#cbd5e1" minTickGap={50} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#cbd5e1" unit="%" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="#047857" tickFormatter={(val) => `$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area yAxisId="left" type="monotone" dataKey="equityPct" stackId="1" stroke={res.color} fill={res.color} fillOpacity={0.6} name={t('equityPct')} />
                    <Area yAxisId="left" type="monotone" dataKey="cashPct" stackId="1" stroke="#16a34a" fill="#10b981" fillOpacity={0.5} name={t('cashPct')} />
                    <Line yAxisId="right" type="monotone" dataKey="cashAmount" stroke="#047857" strokeWidth={2} dot={false} name={t('cashAmount')} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <h3 className="font-bold text-slate-800">{t('perfComparison')}</h3>
          <button
            onClick={() => setShowMath(true)}
            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded-full transition-colors"
            title={t('math_title')}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-3 cursor-pointer group select-none" onClick={() => handleSort('strategyName')}>
                  <div className="flex items-center">
                    {t('col_strategy')}
                    <SortIcon column="strategyName" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer group select-none" onClick={() => handleSort('finalBalance')}>
                  <div className="flex items-center justify-end">
                    {t('col_balance')}
                    <SortIcon column="finalBalance" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer group select-none" onClick={() => handleSort('cagr')}>
                  <div className="flex items-center justify-end">
                    {t('col_cagr')}
                    <SortIcon column="cagr" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer group select-none" onClick={() => handleSort('irr')}>
                  <div className="flex items-center justify-end">
                    {t('col_irr')}
                    <SortIcon column="irr" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer group select-none" onClick={() => handleSort('maxDrawdown')}>
                  <div className="flex items-center justify-end">
                    {t('col_maxDD')}
                    <SortIcon column="maxDrawdown" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer group select-none" onClick={() => handleSort('sharpeRatio')}>
                  <div className="flex items-center justify-end">
                    {t('col_sharpe')}
                    <SortIcon column="sharpeRatio" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer group select-none" onClick={() => handleSort('calmarRatio')}>
                  <div className="flex items-center justify-end">
                    {t('col_calmar')}
                    <SortIcon column="calmarRatio" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer group select-none" onClick={() => handleSort('painIndex')}>
                  <div className="flex items-center justify-end">
                    {t('col_pain')}
                    <SortIcon column="painIndex" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((res) => (
                <tr key={res.strategyName} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${res.isBankrupt ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: res.color }}></span>
                    {res.strategyName}
                    {res.isBankrupt && (
                      <span title="Bankrupt">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">${Math.round(res.metrics.finalBalance).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{res.metrics.cagr.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-blue-600 font-medium">{res.metrics.irr.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-red-500">{res.metrics.maxDrawdown.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-slate-600">{res.metrics.sharpeRatio.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-orange-600 font-medium">{res.metrics.calmarRatio.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-purple-600 font-medium">{res.metrics.painIndex.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
