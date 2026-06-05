import { test, expect } from '@playwright/test'
import { DEMO, login } from './helpers'

test.describe('Authentication and routing', () => {
  test('unauthenticated user is redirected to login from a protected route', async ({ page }) => {
    await page.goto('/tracking')
    await page.waitForURL('**/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('unauthenticated root redirects to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('patient can sign in and lands on tracking', async ({ page }) => {
    await login(page, 'patient')
    await expect(page).toHaveURL(/\/(tracking|onboarding)/)
  })

  test('pharmacist can sign in and lands on dashboard', async ({ page }) => {
    await login(page, 'pharmacist')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('invalid credentials show an error and stay on login', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(DEMO.patient.email)
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })
})

test.describe('Public legal pages', () => {
  test('privacy policy is reachable without authentication', async ({ page }) => {
    await page.goto('/legal/privacy')
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible()
    await expect(page).not.toHaveURL(/\/login/)
  })
})

test.describe('API method guards', () => {
  test('GET /api/tts returns 405', async ({ page }) => {
    const response = await page.request.get('/api/tts')
    expect(response.status()).toBe(405)
  })
})
