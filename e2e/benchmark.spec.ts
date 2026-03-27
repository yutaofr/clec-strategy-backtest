import { test, expect } from '@playwright/test'

test.describe('Benchmark Integration', () => {
  test('should include QQQ and QLD benchmarks in results', async ({ page }) => {
    await page.goto('/')

    // Switch to English for consistent text assertions if needed
    await page.locator('button:has-text("EN")').last().click()

    // Ensure we are in Backtest view
    const backtestBtn = page.getByRole('button', { name: 'Backtest' })
    if (await backtestBtn.isVisible()) {
      await backtestBtn.click()
    }

    // Enable Benchmarks explicitly
    const benchmarkToggle = page.getByText('Show Benchmarks (QQQ & QLD)')
    await benchmarkToggle.scrollIntoViewIfNeeded()
    await benchmarkToggle.click()

    // Run Simulation (using a more specific locator and ensuring it's in view)
    const runBtn = page.getByRole('button', { name: 'Run Comparison' })
    await runBtn.scrollIntoViewIfNeeded()
    await runBtn.click()

    // Wait for results
    await expect(page.locator('.recharts-surface').first()).toBeVisible({ timeout: 15000 })

    // Check for Benchmark Names in the UI (Legend or Cards)
    await expect(page.getByText('Benchmark: QQQ').first()).toBeVisible()
    await expect(page.getByText('Benchmark: QLD').first()).toBeVisible()
  })
})
