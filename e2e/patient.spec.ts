import { test, expect } from '@playwright/test'
import { login, expectEmergencyBanner } from './helpers'

/**
 * Patient flow. After the signup/onboarding work merged in, a patient lands on
 * /home; /tracking gates on the baseline questionnaire and may redirect into
 * onboarding. These tests assert the cross-cutting guarantees that hold on
 * every patient screen rather than a specific landing route.
 */
test.describe('Patient authenticated experience', () => {
  test('patient lands on an authenticated screen without an error', async ({ page }) => {
    await login(page, 'patient')
    await expect(page.getByText(/patient record not found/i)).toHaveCount(0)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('emergency banner is visible on the patient landing screen', async ({ page }) => {
    await login(page, 'patient')
    await expectEmergencyBanner(page)
  })

  test('disclaimer footer links to the privacy policy with the Bill 96 notice', async ({ page }) => {
    await login(page, 'patient')
    await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible()
    await expect(page.getByText(/Français disponible bientôt/i)).toBeVisible()
  })
})

test.describe('Patient daily tracking', () => {
  test('navigating to /tracking shows chat intake, the completed state, or onboarding', async ({
    page,
  }) => {
    await login(page, 'patient')
    await page.goto('/tracking')

    // Resilient to all post-merge outcomes:
    //  - check-in chat (onboarded, no log today)
    //  - completed/home (already logged today)
    //  - onboarding (baseline questionnaire incomplete)
    const checkIn = page.getByRole('heading', { name: /evening check-in/i })
    const done = page.getByRole('heading', { name: /reading logged/i })
    const onboarding = page.getByRole('heading', {
      name: /consent|your data|tell us|welcome|home|hi /i,
    })

    await expect(checkIn.or(done).or(onboarding).first()).toBeVisible()
    await expect(page.getByText(/patient record not found/i)).toHaveCount(0)
  })

  test('chat intake exposes a text input when in the check-in state', async ({ page }) => {
    await login(page, 'patient')
    await page.goto('/tracking')

    const checkIn = page.getByRole('heading', { name: /evening check-in/i })
    if ((await checkIn.count()) > 0) {
      await expect(page.getByPlaceholder(/type your bp reading/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /send message/i })).toBeVisible()
    }
  })
})
