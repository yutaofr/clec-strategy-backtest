import { test, expect } from '@playwright/test'

test.describe('Market Monitor Warning', () => {
  test('should show warning initially and allow user to dismiss it', async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Switch to Market Monitor view
    // The button has the text from t('liveMonitor'), which is 'Market' in English
    const monitorTab = page.locator('button', { hasText: 'Market' }).last()
    await monitorTab.click()

    // Check if the warning is visible
    // We can look for the "EXPERIMENTAL / DISCLAIMER" text
    const warning = page.locator('text=EXPERIMENTAL / DISCLAIMER')
    await expect(warning).toBeVisible()

    // Find the close button (the X icon inside the banner)
    const closeButton = page.locator('button[title="Dismiss Warning"]')
    await closeButton.click()

    // The warning should be gone
    await expect(warning).not.toBeVisible()

    // Reload the page and verify it stays gone (persistence in localStorage)
    await page.reload()

    // Need to switch back to monitor view after reload if it defaults to backtest
    const monitorTab2 = page.locator('button', { hasText: 'Market' }).last()
    await monitorTab2.click()

    await expect(warning).not.toBeVisible()
  })
})
