import { test, expect } from '@playwright/test';

test('dashboard loads on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('Fles toevoegen').first()).toBeVisible();
});

test('rack displays 24 slots', async ({ page }) => {
  await page.goto('/kelder/rek');
  await expect(page.getByText('Leeg', { exact: true })).toBeVisible();
  await expect(page.getByText('23/24 bezet')).toBeVisible();
});

test('seeded cellar shows 33 bottles and 14 wines', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('33', { exact: true })).toBeVisible();
  await expect(page.getByText('14', { exact: true })).toBeVisible();
});
