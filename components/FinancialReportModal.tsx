import React, { useState } from 'react'
import { SimulationResult } from '../types'
import { MARKET_DATA } from '../constants'
import { useTranslation } from '../services/i18n'
import { X, FileText, PieChart } from 'lucide-react'

interface FinancialReportModalProps {
  result: SimulationResult
  onClose: () => void
}

export const FinancialReportModal: React.FC<FinancialReportModalProps> = ({ result, onClose }) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'JOURNAL' | 'BALANCE'>('BALANCE')

  // Helper to format currency
  const fmt = (num: number) =>
    `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  const fmtDec = (num: number) =>
    `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Filter history for Balance Sheet (Every 6 months: June & Dec)
  const balanceSheetHistory = result.history.filter((_, idx) => {
    const month = parseInt(result.history[idx].date.substring(5, 7))
    return month === 6 || month === 12 || idx === result.history.length - 1
  })

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: result.color }}></span>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{t('reportTitle')}</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                {result.strategyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('BALANCE')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'BALANCE' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
          >
            <PieChart className="w-4 h-4" /> {t('tabBalanceSheet')}
          </button>
          <button
            onClick={() => setActiveTab('JOURNAL')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'JOURNAL' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
          >
            <FileText className="w-4 h-4" /> {t('tabJournal')}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50 p-4">
          {activeTab === 'BALANCE' && (
            <div className="space-y-6">
              {balanceSheetHistory.map((state) => {
                const qqqVal =
                  state.shares.QQQ * (MARKET_DATA.find((m) => m.date === state.date)?.qqqClose || 0)
                const qldVal =
                  state.shares.QLD * (MARKET_DATA.find((m) => m.date === state.date)?.qldClose || 0)
                const totalAssets = qqqVal + qldVal + state.cashBalance

                return (
                  <div
                    key={state.date}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                  >
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                      <span className="font-bold text-slate-700 font-mono">{state.date}</span>
                      <div className="text-xs font-bold text-slate-500 flex gap-4">
                        <span>
                          {t('marginLtv')}:{' '}
                          <span className={`${state.ltv > 60 ? 'text-red-600' : 'text-green-600'}`}>
                            {state.ltv.toFixed(1)}%
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                      {/* Assets Side */}
                      <div className="p-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 border-b pb-1">
                          {t('assets')}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">
                              QQQ ({state.shares.QQQ.toFixed(1)} {t('shares')})
                            </span>
                            <span className="font-mono font-medium">{fmt(qqqVal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">
                              QLD ({state.shares.QLD.toFixed(1)} {t('shares')})
                            </span>
                            <span className="font-mono font-medium">{fmt(qldVal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">{t('cash')}</span>
                            <span className="font-mono font-medium text-green-600">
                              {fmt(state.cashBalance)}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-slate-100 font-bold mt-2">
                            <span>{t('totalAssets')}</span>
                            <span>{fmt(totalAssets)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Liabilities & Equity Side */}
                      <div className="p-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 border-b pb-1">
                          {t('liabilities')}
                        </h4>
                        <div className="space-y-2 text-sm h-full flex flex-col">
                          <div className="flex justify-between">
                            <span className="text-slate-600">{t('totalDebt')}</span>
                            <span className="font-mono font-medium text-red-600">
                              {fmt(state.debtBalance)}
                            </span>
                          </div>

                          <div className="mt-auto pt-4">
                            <div className="flex justify-between items-end p-3 bg-blue-50 rounded-lg border border-blue-100">
                              <span className="font-bold text-blue-800">{t('equity')}</span>
                              <span className="font-mono font-bold text-blue-900 text-lg">
                                {fmt(state.totalValue)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'JOURNAL' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 w-32">{t('date')}</th>
                    <th className="px-4 py-3 text-right w-32">{t('cash')}</th>
                    <th className="px-4 py-3 text-right w-32">{t('totalDebt')}</th>
                    <th className="px-4 py-3">{t('event')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.history.map((state, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono text-slate-600 align-top">{state.date}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-700 align-top">
                        {fmt(state.cashBalance)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-600 align-top">
                        {state.debtBalance > 0 ? fmt(state.debtBalance) : '-'}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          {state.events && state.events.length > 0 ? (
                            state.events.map((evt, eIdx) => (
                              <div key={eIdx} className="flex items-start gap-2 text-xs">
                                {evt.type === 'TRADE' && (
                                  <span className="bg-slate-100 text-slate-600 px-1.5 rounded font-bold text-[10px] min-w-[40px] text-center">
                                    TRADE
                                  </span>
                                )}
                                {evt.type === 'INTEREST_INC' && (
                                  <span className="bg-green-100 text-green-700 px-1.5 rounded font-bold text-[10px] min-w-[40px] text-center">
                                    YIELD
                                  </span>
                                )}
                                {evt.type === 'INTEREST_EXP' && (
                                  <span className="bg-orange-100 text-orange-700 px-1.5 rounded font-bold text-[10px] min-w-[40px] text-center">
                                    INT
                                  </span>
                                )}
                                {evt.type === 'DEBT_INC' && (
                                  <span className="bg-red-100 text-red-700 px-1.5 rounded font-bold text-[10px] min-w-[40px] text-center">
                                    DEBT
                                  </span>
                                )}
                                {evt.type === 'DEPOSIT' && (
                                  <span className="bg-blue-100 text-blue-700 px-1.5 rounded font-bold text-[10px] min-w-[40px] text-center">
                                    DEP
                                  </span>
                                )}
                                {evt.type === 'WITHDRAW' && (
                                  <span className="bg-purple-100 text-purple-700 px-1.5 rounded font-bold text-[10px] min-w-[40px] text-center">
                                    W/D
                                  </span>
                                )}
                                {evt.type === 'INFO' && (
                                  <span className="bg-red-600 text-white px-1.5 rounded font-bold text-[10px] min-w-[40px] text-center">
                                    ALERT
                                  </span>
                                )}

                                <span className="text-slate-700">
                                  {evt.description}
                                  {evt.amount !== undefined && Math.abs(evt.amount) > 0.01 && (
                                    <span
                                      className={`font-mono ml-1 font-bold ${evt.amount > 0 ? 'text-green-600' : 'text-red-500'}`}
                                    >
                                      {evt.amount > 0 ? '+' : ''}
                                      {fmtDec(evt.amount)}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-300 italic text-xs">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
