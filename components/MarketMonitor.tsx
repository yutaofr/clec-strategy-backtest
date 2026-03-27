import React, { useState } from 'react'
import { RefreshCw, AlertCircle, Maximize2 } from 'lucide-react'
import { useTranslation } from '../services/i18n'

export const MarketMonitor: React.FC = () => {
  const { t } = useTranslation()
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
