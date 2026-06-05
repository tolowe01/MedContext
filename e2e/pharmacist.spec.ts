import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Pharmacist dashboard', () => {
  test('pharmacist lands on the dashboard', async ({ page }) => {
    await login(page, 'pharmacist')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('dashboard shows Flagged and Stable triage sections', async ({ page }) => {
    await login(page, 'pharmacist')
    await expect(page.getByRole('heading', { name: /flagged/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /stable/i })).toBeVisible()
  })

  test('dashboard either lists a patient or shows an empty state', async ({ page }) => {
    await login(page, 'pharmacist')
    const sophie = page.getByRole('link', { name: /sophie/i })
    const empty = page.getByText(/no flagged patients/i)
    await expect(sophie.or(empty).first()).toBeVisible()
  })
})

test.describe('Pharmacist patient detail', () => {
  test('opening a patient shows the Telus medication list and trends', async ({ page }) => {
    await login(page, 'pharmacist')

    const sophie = page.getByRole('link', { name: /sophie/i })

    if ((await sophie.count()) > 0) {
      await sophie.first().click()
      await page.waitForURL(/\/patient\//)

      await expect(page.getByText(/pulled from telus health/i)).toBeVisible()
      await expect(page.getByText(/amlodipine/i)).toBeVisible()
      await expect(page.getByRole('heading', { name: /7-day trends/i })).toBeVisible()
    } else {
      test.skip(true, 'No submitted patient in demo state')
    }
  })
})
