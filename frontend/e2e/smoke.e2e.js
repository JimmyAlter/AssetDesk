import { test, expect } from '@playwright/test'

const signIn = async (page, role) => {
  await page.goto('/')
  await page.getByRole('button', { name: new RegExp(`^${role}`) }).click()
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
}

test('an admin can create, assign and resolve a ticket', async ({ page }) => {
  await signIn(page, 'Admin')
  await expect(page.locator('.sidebar-foot__name')).toHaveText('Operations Admin')

  // Regression: creating a ticket used to fail with 400 because the
  // Authorization header replaced Content-Type.
  await page.locator('.topbar').getByRole('button', { name: 'New ticket' }).click()
  await page.getByPlaceholder('Brief summary of the issue').fill('E2E: projector offline')
  await page.getByRole('button', { name: 'Create ticket' }).click()
  await expect(page.locator('.modal-form')).toHaveCount(0)

  await page.getByRole('button', { name: 'Tickets' }).click()
  await page.locator('.row--button', { hasText: 'E2E: projector offline' }).click()
  await page.locator('.field select').selectOption({ label: 'Field Technician · Field Tech' })
  await expect(page.locator('.detail-list')).toContainText('Field Technician')

  const actions = page.locator('.ticket-detail__actions')
  await actions.getByRole('button', { name: 'Start work' }).click()
  await actions.getByRole('button', { name: 'Resolve' }).click()
  await expect(page.locator('.detail-list')).toContainText('Resolved')
  await expect(actions.getByRole('button', { name: 'Reopen' })).toBeVisible()
})

test('a field tech sees only their tickets and no people directory', async ({ page }) => {
  await signIn(page, 'Field Tech')
  await expect(page.getByRole('button', { name: 'Workforce' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Tickets' }).click()
  await expect(page.locator('.row--button', { hasText: 'Slow boot times on laptops' })).toHaveCount(0)
  await expect(page.locator('.row--button', { hasText: 'VPN disconnects after sleep' })).toBeVisible()
})

test('on a phone the user can see their role and sign out', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await signIn(page, 'Support Lead')

  await expect(page.locator('.sidebar-foot')).toBeHidden()
  const noHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(noHorizontalScroll).toBe(true)
  for (const label of ['Overview', 'Tickets', 'Assets', 'Workforce']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible()
  }
  // Nav stays on one row.
  const tops = await page.locator('.nav-item').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top))
  expect(new Set(tops).size).toBe(1)

  // The role is visible as text, not only in a tooltip.
  const rolePill = page.locator('.sidebar-compact__role')
  await expect(rolePill).toBeVisible()
  expect(await rolePill.innerText()).toBe('Lead')
  await expect(page.locator('.sidebar-compact .sidebar-avatar')).toHaveText('SD')

  // On a tablet the full role name fits.
  await page.setViewportSize({ width: 768, height: 1024 })
  expect(await rolePill.innerText()).toBe('Support Lead')
  await page.setViewportSize({ width: 375, height: 812 })

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})
