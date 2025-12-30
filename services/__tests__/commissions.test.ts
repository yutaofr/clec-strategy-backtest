import { describe, it, expect } from 'vitest'
import { calculateCommission } from '../financeMath'
import { CommissionConfig } from '../../types'

describe('calculateCommission', () => {
  const baseConfig: CommissionConfig = {
    enabled: true,
    percent: 1.0, // 1%
  }

  it('should return 0 if disabled', () => {
    const config = { ...baseConfig, enabled: false }
    expect(calculateCommission(1000, config)).toBe(0)
  })

  it('should calculate percentage fee correctly', () => {
    // 1000 * 1% = 10.0
    expect(calculateCommission(1000, baseConfig)).toBeCloseTo(10.0)
  })

  it('should handle zero trade value', () => {
    expect(calculateCommission(0, baseConfig)).toBeCloseTo(0)
  })

  it('should handle negative trade value (sell) using absolute value', () => {
    // -1000 -> abs(1000) * 1% = 10.0
    expect(calculateCommission(-1000, baseConfig)).toBeCloseTo(10.0)
  })
})
