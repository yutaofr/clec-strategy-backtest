import { describe, expect, it } from 'vitest'
import { MarketDataRow } from '../../types'
import { filterMarketDataByMonthWindow, toMonthKey } from '../marketDataWindow'

const row = (date: string): MarketDataRow => ({
  date,
  qqqClose: 100,
  qldClose: 100,
  qqqLow: 100,
  qldLow: 100,
})

describe('marketDataWindow', () => {
  const marketData = [row('2020-01-01'), row('2020-02-01'), row('2020-03-01'), row('2020-04-01')]

  it('extracts YYYY-MM month keys from ISO dates', () => {
    expect(toMonthKey('2020-03-01')).toBe('2020-03')
  })

  it('filters market data inclusively by month', () => {
    const filtered = filterMarketDataByMonthWindow(marketData, '2020-02', '2020-03')

    expect(filtered.map((item) => item.date)).toEqual(['2020-02-01', '2020-03-01'])
  })

  it('returns no rows when the selected window is invalid', () => {
    expect(filterMarketDataByMonthWindow(marketData, '2020-04', '2020-02')).toEqual([])
  })
})
