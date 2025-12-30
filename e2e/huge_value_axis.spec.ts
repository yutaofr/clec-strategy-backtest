import { test, expect } from '@playwright/test'

test.describe('Charts Y-Axis Clean Ticks Verification', () => {
  test('should show reasonable ticks for all charts including high capital and leverage', async ({
    page,
  }) => {
    await page.goto('/')

    // 1. Click the first profile card to edit
    await page.locator('.group.relative.p-4.rounded-xl.border').first().click()

    // 2. Set Initial Capital to 100,000,000
    const capInput = page.locator('input[type="number"]').first()
    await capInput.fill('100000000')

    // 3. Enable Leverage
    const leverageCheck = page.locator('input[type="checkbox"]').first()
    if (!(await leverageCheck.isChecked())) {
      await leverageCheck.check({ force: true })
    }

    // 4. Click Done
    const doneS = 'button:has-text("Done"), button:has-text("完成"), button:has-text("Terminé")'
    const doneBtn = page.locator(doneS).filter({ visible: true }).first()
    await doneBtn.scrollIntoViewIfNeeded()
    await doneBtn.click()

    // 5. Run Comparison
    const runS =
      'button:has-text("Run Comparison"), button:has-text("執行分析"), button:has-text("执行分析")'
    const runBtn = page.locator(runS).filter({ visible: true }).last()
    await runBtn.scrollIntoViewIfNeeded()
    await runBtn.click()

    // 6. Verify all charts
    const charts = [
      { id: '#portfolio-growth-chart', name: 'Portfolio Growth' },
      { id: '#drawdown-chart', name: 'Historical Drawdown' },
      { id: '#beta-chart', name: 'Portfolio Beta' },
      { id: '#ltv-chart', name: 'LTV Tracking' },
    ]

    for (const chart of charts) {
      console.log(`Checking chart: ${chart.name}`)
      const chartLoc = page.locator(chart.id)
      await expect(chartLoc).toBeVisible({ timeout: 15000 })

      const ticks = chartLoc.locator('.recharts-cartesian-axis-tick-value')
      await expect(ticks.first()).toBeVisible({ timeout: 10000 })

      await page.waitForTimeout(1000)

      const count = await ticks.count()
      console.log(`DEBUG: ${chart.name} Tick count = ${count}`)

      // Total ticks (X + Y). If bug exists, count > 500.
      expect(count).toBeLessThan(70)
      expect(count).toBeGreaterThan(5)
    }
  })
})
