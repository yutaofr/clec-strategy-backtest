import React, { useState } from 'react'
import { RefreshCw, AlertCircle, Maximize2 } from 'lucide-react'
import { useTranslation } from '../services/i18n'

export const MarketMonitor: React.FC = () => {
  const { t, language } = useTranslation()
  const [isLoading, setIsLoading] = useState(true)
  const [key, setKey] = useState(0) // Used to force iframe reload

  const MONITOR_URL = 'https://qqq-buyer-monitor.vercel.app/'

  const handleRefresh = () => {
    setIsLoading(true)
    setKey((prev) => prev + 1)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-bold text-slate-700">
            {t('liveMonitorTitle') || 'QQQ Market Monitor'}
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 font-mono">
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href={MONITOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500 transition-colors"
            title="Open in new tab"
          >
            <Maximize2 className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Experimental / Disclaimer Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-4 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-amber-900 text-sm leading-relaxed">
          <div className="font-black text-xs uppercase tracking-widest text-amber-700 mb-1">
            EXPERIMENTAL / DISCLAIMER
          </div>
          {language === 'zh-CN' || language === 'zh-TW' ? (
            <>
              <p className="font-bold underline decoration-amber-300 decoration-2 underline-offset-2">
                【实验性质声明】此功能属于开发者个人的学习与研究，并非成熟的金融产品。
              </p>
              <p className="mt-2 font-bold text-amber-800">
                ⚠️ 请注意，本功能与 CLEC (Nasdaq-100/QQQ Strategy)
                项目本身并无任何关联。不推荐将其作为投资建议，请勿依赖此数据辅助真实的投资决策。
              </p>
            </>
          ) : (
            <>
              <p className="font-bold underline decoration-amber-300 decoration-2 underline-offset-2">
                [Experimental Disclaimer] This feature is for developer's personal learning and
                research only.
              </p>
              <p className="mt-2 font-bold text-amber-800">
                ⚠️ This feature is NOT affiliated with the core CLEC project. It is NOT recommended
                to treat this as investment advice. Use at your own risk.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Main Content (Iframe) */}
      <div className="relative flex-1 w-full bg-[#0a0a0a]">
        {' '}
        {/* Matching the monitor's likely dark theme */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white z-10">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium animate-pulse">
              {t('connectingMonitor') || 'Connecting to secure signal...'}
            </p>
          </div>
        )}
        <iframe
          key={key}
          src={MONITOR_URL}
          className="w-full h-full border-none"
          onLoad={() => setIsLoading(false)}
          title="QQQ Buyer Monitor"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>

      {/* Footer / Context */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400 flex items-center gap-2">
        <AlertCircle className="w-3 h-3" />
        <span>
          {t('monitorDisclaimer') ||
            'Real-time signals provided by QQQ-Buyer-Monitor. For execution reference only.'}
        </span>
      </div>
    </div>
  )
}
