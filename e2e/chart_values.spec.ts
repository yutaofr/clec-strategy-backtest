import { test, expect } from '@playwright/test'

test.describe('Chart Value Formatting', () => {
  test('should display correct formatting when strategy name contains %', async ({ page }) => {
    await page.goto('/')

    // Switch to English
    await page.locator('button:has-text("EN")').last().click()

    // 1. Rename strategy to include "%"
    // Ensure we are in Backtest view
    const backtestBtn = page.getByRole('button', { name: 'Backtest' })
    if (await backtestBtn.isVisible()) {
      await backtestBtn.click()
    }

    // Click on the first profile card
    const firstCard = page.getByTestId('profile-card').first()
    await firstCard.scrollIntoViewIfNeeded()
    await firstCard.click()

    // Fill the name input
    const nameInput = page.locator('#profile-name-input')
    await nameInput.fill('Mix 50%')

    // Click Done
    await page.locator('button:has-text("Done")').last().click()

    // 2. Run Comparison
    await page.locator('button:has-text("Run Comparison")').last().click()

    // 3. Verify Growth Chart (Currency)
    const growthChart = page.locator('#portfolio-growth-chart')
    await growthChart.scrollIntoViewIfNeeded()

    // Hover over the chart to trigger tooltip
    // Use a more central position to ensure we hit a data point
    const growthSurface = growthChart.locator('svg.recharts-surface').first()
    await growthSurface.hover({ position: { x: 300, y: 150 } })

    const growthTooltip = growthChart.locator('.recharts-tooltip-wrapper')
    await expect(growthTooltip).toBeVisible({ timeout: 10000 })

    // Growth chart should show "$" for "Mix 50%"
    // Use filter with hasText for more robust matching in case of nested spans
    const growthRow = growthTooltip
      .locator('.flex.items-center')
      .filter({ hasText: /Mix 50%/ })
      .first()
    const growthValue = growthRow.locator('.font-mono')
    await expect(growthValue).toContainText('$')
    await expect(growthValue).not.toContainText('%')

    // 4. Verify Drawdown Chart (Percent)
    const drawdownChart = page.locator('#drawdown-chart')
    await drawdownChart.scrollIntoViewIfNeeded()
    await drawdownChart
      .locator('svg.recharts-surface')
      .first()
      .hover({ position: { x: 300, y: 100 } })

    const drawdownTooltip = drawdownChart.locator('.recharts-tooltip-wrapper')
    await expect(drawdownTooltip).toBeVisible({ timeout: 10000 })

    const drawdownRow = drawdownTooltip
      .locator('.flex.items-center')
      .filter({ hasText: /Mix 50%/ })
      .first()
    const drawdownValue = drawdownRow.locator('.font-mono')
    await expect(drawdownValue).toContainText('%')

    // 5. Verify Beta Chart (Number)
    const betaChart = page.locator('#beta-chart')
    await betaChart.scrollIntoViewIfNeeded()
    await betaChart
      .locator('svg.recharts-surface')
      .first()
      .hover({ position: { x: 300, y: 100 } })

    const betaTooltip = betaChart.locator('.recharts-tooltip-wrapper')
    await expect(betaTooltip).toBeVisible({ timeout: 10000 })

    const betaRow = betaTooltip
      .locator('.flex.items-center')
      .filter({ hasText: /Mix 50% Beta/ })
      .first()
    const betaValue = betaRow.locator('.font-mono')
    // Beta should be a number, no $ or %
    const betaText = await betaValue.innerText()
    expect(betaText).not.toContain('$')
    expect(betaText).not.toContain('%')
    expect(parseFloat(betaText)).not.toBeNaN()
  })
})
