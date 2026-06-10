import { MarketDataRow } from '../types'

export const toMonthKey = (date: string): string => date.substring(0, 7)

export interface BacktestWindowState {
  startMonth: string
  endMonth: string
  isCustom: boolean
}

interface ResolveBacktestWindowOptions {
  savedStartMonth: string | null
  savedEndMonth: string | null
  hasExplicitWindow: boolean
  savedLastMarketDate: string | null
  minMarketMonth: string
  maxMarketMonth: string
}

export const filterMarketDataByMonthWindow = (
  marketData: MarketDataRow[],
  startMonth: string,
  endMonth: string,
): MarketDataRow[] => {
  if (marketData.length === 0) return []

  const normalizedStart = startMonth || toMonthKey(marketData[0].date)
  const normalizedEnd = endMonth || toMonthKey(marketData[marketData.length - 1].date)

  if (normalizedStart > normalizedEnd) return []

  return marketData.filter((row) => {
    const month = toMonthKey(row.date)
    return month >= normalizedStart && month <= normalizedEnd
  })
}

export const resolveBacktestWindow = ({
  savedStartMonth,
  savedEndMonth,
  hasExplicitWindow,
  savedLastMarketDate,
  minMarketMonth,
  maxMarketMonth,
}: ResolveBacktestWindowOptions): BacktestWindowState => {
  const defaultWindow = {
    startMonth: minMarketMonth,
    endMonth: maxMarketMonth,
    isCustom: false,
  }

  if (!savedStartMonth || !savedEndMonth) return defaultWindow

  if (
    savedStartMonth < minMarketMonth ||
    savedStartMonth > maxMarketMonth ||
    savedEndMonth < minMarketMonth ||
    savedEndMonth > maxMarketMonth ||
    savedStartMonth > savedEndMonth
  ) {
    return defaultWindow
  }

  if (hasExplicitWindow) {
    return { startMonth: savedStartMonth, endMonth: savedEndMonth, isCustom: true }
  }

  const savedLastMarketMonth = savedLastMarketDate ? toMonthKey(savedLastMarketDate) : null

  if (savedEndMonth === savedLastMarketMonth) {
    return {
      startMonth: savedStartMonth,
      endMonth: maxMarketMonth,
      isCustom: savedStartMonth !== minMarketMonth,
    }
  }

  return { startMonth: savedStartMonth, endMonth: savedEndMonth, isCustom: true }
}
