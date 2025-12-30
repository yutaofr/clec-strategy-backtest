import { test, expect } from '@playwright/test'

test.describe('Chart Y-Axis Optimization', () => {
  test('should have a tight Y-axis domain for portfolio growth chart', async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.text().startsWith('DEBUG:')) {
        console.log(`BROWSER ${msg.type()}: ${msg.text()}`)
      }
    })
    await page.goto('/')

    // 1. Run Comparison
    await page.locator('button:has-text("Run Comparison")').last().click()

    // 2. Identify Growth Chart and wait for it to be visible
    const growthChart = page.locator('#portfolio-growth-chart')
    await expect(growthChart).toBeVisible({ timeout: 15000 })
    await growthChart.scrollIntoViewIfNeeded()

    // 3. Get the maximum value from the tooltip by hovering near the end
    const chartSvg = growthChart.locator('svg.recharts-surface').first()
    await expect(chartSvg).toBeVisible({ timeout: 10000 })
    const box = await chartSvg.boundingBox()
    if (!box) throw new Error('Could not find growth chart bounding box')

    // Hover near the right edge to get the latest value (usually the peak in this test)
    await chartSvg.hover({ position: { x: box.width - 20, y: box.height / 2 } })

    const tooltip = growthChart.locator('.recharts-tooltip-wrapper')
    await expect(tooltip).toBeVisible({ timeout: 5000 })

    const globalMax =
      (await page.evaluate(
        () => (window as unknown as { __CHART_GLOBAL_MAX: number }).__CHART_GLOBAL_MAX,
      )) || 0
    console.log(`DEBUG: Global Max Value from Window: ${globalMax}`)

    // 4. Extract and parse Y-axis ticks
    const ticks = growthChart.locator('.recharts-cartesian-axis-tick-value')
    await expect(ticks.first()).toBeVisible({ timeout: 10000 })

    const tickElements = await ticks.all()
    const tickTexts: string[] = []
    for (const tick of tickElements) {
      const text = await tick.textContent()
      if (text) tickTexts.push(text)
    }
    console.log(`DEBUG: All Tick Texts: ${JSON.stringify(tickTexts)}`)

    const tickValues = tickTexts
      .map((t) => {
        const cleaned = t.replace(/[$,]/g, '').toLowerCase()
        const num = parseFloat(cleaned.replace(/[^\d.]/g, ''))
        if (cleaned.includes('k')) return num * 1000
        if (cleaned.includes('m')) return num * 1000000
        return num
      })
      .filter((v) => !isNaN(v))

    const maxTick = tickValues.length > 0 ? Math.max(...tickValues) : -1
    console.log(`DEBUG: Max Axis Tick: ${maxTick}`)

    // 5. Core Assertion: maxTick should be within 15% of globalMax
    expect(maxTick).toBeGreaterThan(0)
    expect(maxTick).toBeLessThan(globalMax * 1.15)
    expect(maxTick).toBeGreaterThanOrEqual(globalMax * 0.95) // Should not be lower than the peak data
  })
})
