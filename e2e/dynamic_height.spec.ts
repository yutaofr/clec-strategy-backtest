import { test, expect } from '@playwright/test'

test.describe('Dynamic Chart Height', () => {
  test('should increase chart height when more than 5 profiles are added', async ({ page }) => {
    await page.goto('/')

    // 1. Switch to English to ensure consistent selectors
    await page.locator('button:has-text("EN")').last().click()

    // 2. Clear out any results and make sure we are on the profiles list
    // (Initial state has 2 profiles)

    const getChartHeight = async () => {
      // Find the chart container div child of #portfolio-growth-chart
      // Since h3 is not a div, the first div child is the one with the dynamic height
      const chartContainer = page.locator('#portfolio-growth-chart > div').last()
      await expect(chartContainer).toBeVisible({ timeout: 10000 })
      // Wait for 'Calculating' overlay to disappear
      await expect(page.locator('text=Calculating...')).not.toBeVisible({ timeout: 15000 })
      const box = await chartContainer.boundingBox()
      return box?.height || 0
    }

    // 3. Ensure Benchmarks is checked to match the logic of 8 results (6 profiles + 2 benchmarks)
    const benchmarkToggle = page.getByText('Show Benchmarks (QQQ & QLD)')
    const isChecked = await page.locator('input[type="checkbox"]').last().isChecked()
    if (!isChecked) {
      await benchmarkToggle.scrollIntoViewIfNeeded()
      await benchmarkToggle.click()
    }

    const runBtn = page.getByRole('button', { name: 'Run Comparison' })
    await runBtn.scrollIntoViewIfNeeded()
    await runBtn.click()

    // 4. Record base height (with 2 profiles)
    const baseHeight = await getChartHeight()
    console.log(`Base height with 2 profiles: ${baseHeight}px`)
    expect(baseHeight).toBe(400) // calculateChartHeight(400) with 2 profiles should be 400

    // 5. Add more profiles (up to 6)
    // We already have 2. Copy 4 more times.
    for (let i = 0; i < 4; i++) {
      await page.getByTitle('Copy Profile').first().click()
      await page.locator('button:has-text("Done")').last().click()
    }

    // 6. Run simulation again to update charts
    await page.locator('button:has-text("Run Comparison")').last().click()

    // 7. Check new height
    // 6 user profiles + 2 benchmarks = 8 results
    // threshold=5, multiplier=20 -> 400 + (8-5)*20 = 460
    const newHeight = await getChartHeight()
    console.log(`New height with 8 results (6 profiles + 2 benchmarks): ${newHeight}px`)
    expect(newHeight).toBe(460)

    // 8. One more profile for good measure (7 profiles + 2 benchmarks = 9 results)
    await page.getByTitle('Copy Profile').first().click()
    await page.locator('button:has-text("Done")').last().click()
    await page.locator('button:has-text("Run Comparison")').last().click()

    const finalHeight = await getChartHeight()
    console.log(`Final height with 9 results: ${finalHeight}px`)
    expect(finalHeight).toBe(480)
  })
})
