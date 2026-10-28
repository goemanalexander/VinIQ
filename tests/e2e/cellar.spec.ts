import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context, page }) => {
  // Fresh nonpersistent browser context per test; no user profiles or saved login.
  // Block all external requests, including any future API/database destination.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === 'http://127.0.0.1:3100'
      ? route.continue() : route.abort('blockedbyclient');
  });
  page.on('pageerror', error => { throw error; });
});

test('empty cellar renders, searches and navigates to the rack', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Flessen', { exact: true })).toBeVisible();
  await expect(page.getByText('0/24', { exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Navigatie' }).getByRole('link', { name: 'Mijn Kelder' }).click();
  await expect(page).toHaveURL('/kelder');
  await expect(page.getByRole('heading', { name: 'Mijn Kelder' })).toBeVisible();
  await page.getByPlaceholder('Zoek producent, regio, jaargang…').fill('Uitsluitend testwijn');
  await expect(page.getByRole('button', { name: /Fles toevoegen/ })).toBeDisabled();
  await page.getByRole('navigation').getByRole('link', { name: 'Rek', exact: true }).click();
  await expect(page).toHaveURL('/kelder/rek');
  await expect(page.getByText('0/24 bezet', { exact: true })).toBeVisible();
  await expect(page.getByText('Leeg', { exact: true })).toBeVisible();
});

test('import remains explicitly unavailable and cannot upload cellar data', async ({ page }) => {
  await page.goto('/kelder/importeren');
  await expect(page.getByRole('heading', { name: 'Importeren' })).toBeVisible();
  await expect(page.getByText('Binnenkort beschikbaar', { exact: true })).toBeVisible();
  await expect(page.getByText('Er worden nu geen gegevens geïmporteerd.', { exact: false })).toBeVisible();
  await expect(page.locator('input[type=file]')).toHaveCount(0);
});

test('unknown wine redirects safely to the cellar', async ({ page }) => {
  await page.goto('/kelder/wijn/nonexistent-test-wine');
  await expect(page).toHaveURL('/kelder');
  await expect(page.getByRole('heading', { name: 'Mijn Kelder' })).toBeVisible();
});
