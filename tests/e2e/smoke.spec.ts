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

test('new purchased wine is added with decimal price and survives reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Fles toevoegen' }).first().click();
  await expect(page).toHaveURL(/\/kelder\/toevoegen/);
  await page.getByLabel('Producent *').fill('Testdomein');
  await page.getByLabel('Naam van de wijn *').fill('Reserve Test');
  await page.getByLabel('Jaargang (leeg = N.V.)').fill('2021');
  await page.getByLabel('Land').fill('Italië');
  await page.getByLabel('Aantal flessen *').fill('2');
  const price = page.getByLabel('Aankoopprijs per fles (€) *');
  await expect(price).toHaveAttribute('inputmode', 'decimal');
  await price.fill('12,95');
  await page.getByRole('button', { name: 'Wijn en flessen toevoegen' }).click();
  await expect(page).toHaveURL(/\/kelder\/wijn\/wine-/);
  await expect(page.getByText('×2').first()).toBeVisible();
  await expect(page.getByText('12,95', { exact: false }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('Reserve Test').first()).toBeVisible();
  await expect(page.getByText('×2').first()).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('35', { exact: true })).toBeVisible();
  await expect(page.getByText('15', { exact: true })).toBeVisible();
});

test('gift adds two bottles, occupies only one rack slot and records history', async ({ page }) => {
  await page.goto('/kelder/toevoegen');
  await page.getByLabel('Producent *').fill('Geschenk Domein');
  await page.getByLabel('Naam van de wijn *').fill('Cadeau Cuvée');
  await page.getByLabel('Aantal flessen *').fill('2');
  await page.getByLabel('Cadeau gekregen').check();
  await expect(page.getByLabel('Aankoopprijs per fles (€) *')).toHaveCount(0);
  await page.getByLabel('Positie eerste fles').selectOption('C5');
  await page.getByRole('button', { name: 'Wijn en flessen toevoegen' }).click();
  await expect(page.getByText('×2').first()).toBeVisible();
  await expect(page.getByText('C5', { exact: true })).toBeVisible();
  await expect(page.getByText('Buiten rek', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Geschenk', { exact: true }).first()).toBeVisible();
  await page.goto('/kelder/rek');
  await expect(page.getByText('24/24 bezet')).toBeVisible();
  await page.goto('/kelder/geschiedenis');
  await expect(page.getByText('Cadeau Cuvée').first()).toBeVisible();
});

test('existing wine price uses decimal keypad and accepts comma', async ({ page }) => {
  await page.goto('/kelder');
  await page.locator('a[href^="/kelder/wijn/"]').first().click();
  const price = page.getByPlaceholder('Aankoopprijs per fles (€)');
  await expect(price).toHaveAttribute('inputmode', 'decimal');
  await price.fill('9,75');
  await page.getByRole('button', { name: '+ Fles toevoegen' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('9,75', { exact: false }).first()).toBeVisible();
});
