import { test, expect } from '@playwright/test'
import { login, expectEmergencyBanner } from './helpers'

test.describe('Patient daily tracking', () => {
  test('patient lands on a valid tracking or onboarding screen (not an error)', async ({
    page,
  }) => {
    await login(page, 'patient')

    await expect(page.getByText('Patient record not found')).toHaveCount(0)
    await expect(page).toHaveURL(/(tracking|onboarding)/)
  })

  test('emergency banner is visible on the tracking screen', async ({ page }) => {
    await login(page, 'patient')
    await page.goto('/tracking')

    await expectEmergencyBanner(page)
  })

  test('tracking shows either the chat intake or the completed state', async ({
    page,
  }) => {
    await login(page, 'patient')
    await page.goto('/tracking')

    const checkIn = page.getByRole('heading', { name: /evening check-in/i })
    const done = page.getByRole('heading', { name: /reading logged/i })

    await expect(checkIn.or(done)).toBeVisible()
  })

  test('chat intake exposes a text input as the primary path (if in check-in state)', async ({
    page,
  }) => {
    await login(page, 'patient')
    await page.goto('/tracking')

    const checkIn = page.getByRole('heading', { name: /evening check-in/i })

    if ((await checkIn.count()) > 0) {
      await expect(
        page.getByPlaceholder(/type your bp reading/i),
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /send message/i }),
      ).toBeVisible()
    }
  })
})

test.describe('Patient progress and disclaimers', () => {
  test('progress screen renders without error', async ({ page }) => {
    await login(page, 'patient')
    await page.goto('/progress')

    await expect(page.getByText('Patient record not found')).toHaveCount(0)
    await expectEmergencyBanner(page)
  })

  test('disclaimer footer links to the privacy policy', async ({ page }) => {
    await login(page, 'patient')
    await page.goto('/tracking')

    await expect(
      page.getByRole('link', { name: /privacy policy/i }),
    ).toBeVisible()
    await expect(
      page.getByText(/Français disponible bientôt/i),
    ).toBeVisible()
  })
})
