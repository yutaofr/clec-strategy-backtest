import { test, expect } from '@playwright/test'

test.describe('Benchmark Integration', () => {
  test('should include QQQ and QLD benchmarks in results', async ({ page }) => {
    await page.goto('/')

    // Switch to English for consistent text assertions if needed
    await page.locator('button:has-text("EN")').last().click()

    // Run Simulation
    await page.locator('button:has-text("Run Comparison")').last().click()

    // Wait for results
    await expect(page.locator('.recharts-surface').first()).toBeVisible()

    // Check for Benchmark Names in the UI (Legend or Cards)
    await expect(page.getByText('Benchmark: QQQ').first()).toBeVisible()
    await expect(page.getByText('Benchmark: QLD').first()).toBeVisible()
  })
})
