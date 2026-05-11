import { MarketDataRow } from '../types'

export const toMonthKey = (date: string): string => date.substring(0, 7)

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
