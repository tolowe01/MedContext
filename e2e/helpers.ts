import { Page, expect } from '@playwright/test'

export const DEMO = {
  patient: { email: 'patient@demo', password: 'demo1234' },
  pharmacist: { email: 'pharmacist@demo', password: 'demo1234' },
} as const

/**
 * Logs in via the real login form and waits for the role-based redirect.
 * Patient -> /tracking (or /onboarding/*), Pharmacist -> /dashboard.
 * Each test gets an isolated browser context, so sessions never collide.
 */
export async function login(
  page: Page,
  role: 'patient' | 'pharmacist'
): Promise<void> {
  const creds = DEMO[role]
  await page.goto('/login')
  await page.getByLabel('Email').fill(creds.email)
  await page.getByLabel('Password').fill(creds.password)
  await page.getByRole('button', { name: /sign in/i }).click()

  if (role === 'pharmacist') {
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
  } else {
    await page.waitForURL(/\/(tracking|onboarding)/, { timeout: 15_000 })
  }
}

/** Assert the persistent emergency banner is visible (every patient screen). */
export async function expectEmergencyBanner(page: Page): Promise<void> {
  await expect(page.getByText(/medical emergency/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /call 911/i })).toBeVisible()
}
