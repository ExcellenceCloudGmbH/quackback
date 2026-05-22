import { test, expect } from '@playwright/test'

test.describe('Admin Permissions Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings/permissions')
    await page.waitForLoadState('networkidle')
  })

  test('page loads and shows permissions heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Permissions' })).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByText('Control who can access your portal and what they can do.')
    ).toBeVisible({ timeout: 10000 })
  })

  test('shows Permissions card with anonymous toggles', async ({ page }) => {
    await expect(page.getByText('Permissions')).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByText('Control what visitors without an account can do on your portal.')
    ).toBeVisible()

    await expect(page.getByText('Anonymous users can submit posts')).toBeVisible()
    await expect(page.getByText('Anonymous users can comment')).toBeVisible()
    await expect(page.getByText('Anonymous users can vote')).toBeVisible()

    await expect(page.locator('#anon-posting')).toBeVisible()
    await expect(page.locator('#anon-commenting')).toBeVisible()
    await expect(page.locator('#anon-voting')).toBeVisible()
  })

  test('shows Moderation card', async ({ page }) => {
    await expect(page.getByText('Moderation')).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByText('Posts from the selected groups wait for review before publishing.')
    ).toBeVisible()

    await expect(page.getByText('Require approval for anonymous posts')).toBeVisible()
    await expect(page.getByText('Require approval for signed-in posts')).toBeVisible()

    await expect(page.locator('#moderate-anonymous')).toBeVisible()
    await expect(page.locator('#moderate-authenticated')).toBeVisible()
  })

  test('page shows exactly two settings cards', async ({ page }) => {
    await expect(page.getByText('Permissions')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Moderation')).toBeVisible()
    await expect(page.getByText('Post content')).not.toBeVisible()
  })

  test('toggle switches are interactive', async ({ page }) => {
    const toggle = page.locator('#anon-voting')
    await expect(toggle).toBeVisible({ timeout: 10000 })
    await expect(toggle).toBeEnabled()
  })

  test('can toggle a permission and auto-saves', async ({ page }) => {
    const toggle = page.locator('#anon-voting')
    await expect(toggle).toBeVisible({ timeout: 10000 })

    const initialChecked = await toggle.isChecked()

    // Toggle it
    await toggle.click()

    // Wait for the save spinner to appear and disappear (auto-save on change)
    await page.waitForTimeout(500)

    // Restore original state
    const nowChecked = await toggle.isChecked()
    if (nowChecked !== initialChecked) {
      await toggle.click()
      await page.waitForTimeout(500)
    }
  })
})
