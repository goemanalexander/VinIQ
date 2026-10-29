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
  await expect(page.locator('span').getByText('Rek C5', { exact: true })).toBeVisible();
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
  await page.reload();
  await expect(page.getByText('9,75', { exact: false }).first()).toBeVisible();
});

test('guest view hides prices, totals, backups and edit actions across pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Aankoopwaarde')).toBeVisible();
  await page.getByRole('button', { name: 'Gastweergave inschakelen' }).click();
  await expect(page.getByText('Aankoopwaarde')).toHaveCount(0);
  await expect(page.getByText('Marktwaarde')).toHaveCount(0);
  await page.goto('/kelder');
  await expect(page.getByRole('button', { name: 'Download back-up van mijn kelder (JSON)' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Nieuwe wijn toevoegen' })).toHaveCount(0);
  await expect(page.getByText('€/fl.', { exact: false })).toHaveCount(0);
  await page.goto('/kelder/wijn/seed-wine-bennati');
  await expect(page.getByText('Waarde van je voorraad')).toHaveCount(0);
  await expect(page.getByText('Aankoop/fl.')).toHaveCount(0);
  await expect(page.getByText('Voorraad beheren')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Gastweergave uitschakelen' })).toBeVisible();
  await page.getByRole('button', { name: 'Gastweergave uitschakelen' }).click();
  await expect(page.getByText('Waarde van je voorraad')).toBeVisible();
});

test('indicative drinking window can be manually edited and survives reload', async ({ page }) => {
  await page.goto('/kelder');
  await page.goto('/kelder/wijn/seed-wine-bennati');
  await expect(page.getByText('indicatie', { exact: false }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Aanpassen' }).click();
  await expect(page.getByText('Stijlindicatie:', { exact: false })).toBeVisible();
  await page.getByLabel('Drinken vanaf').fill('2028');
  await page.getByLabel('Drinken tot').fill('2038');
  await page.getByRole('button', { name: 'Drinkvenster opslaan' }).click();
  await expect(page.getByText('2028–2038', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText('2028–2038', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Aanpassen' }).click();
  await page.getByLabel('Drinken vanaf').fill('2039');
  await page.getByLabel('Drinken tot').fill('2030');
  await page.getByRole('button', { name: 'Drinkvenster opslaan' }).click();
  await expect(page.getByText('Ongeldig drinkvenster')).toBeVisible();
});

test('compact guest toggle hides prices and remains usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Gastweergave inschakelen' });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText('Gastweergave');
  const width = await toggle.evaluate(el => el.getBoundingClientRect().width);
  expect(width).toBeLessThan(180);
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Gastweergave uitschakelen' })).toHaveText('Gast aan');
  await expect(page.getByText('Aankoopwaarde')).toHaveCount(0);
});

test('personal drinking recommendation is separate from general window and respects overrides', async ({ page }) => {
  await page.goto('/kelder/wijn/seed-wine-bennati');
  await expect(page.getByText('Voor jouw smaak:', { exact: false })).toBeVisible();
  await expect(page.getByText('Persoonlijke inschatting binnen het drinkvenster, geen garantie.')).toBeVisible();
  await expect(page.getByText('indicatie', { exact: false }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Aanpassen' }).click();
  await page.getByLabel('Drinken vanaf').fill('2030');
  await page.getByLabel('Drinken tot').fill('2032');
  await page.getByRole('button', { name: 'Drinkvenster opslaan' }).click();
  await expect(page.getByText('2030–2032', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Voor jouw smaak: 2031')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Voor jouw smaak: 2031')).toBeVisible();
});

test('bottle picker shows readable locations without internal IDs', async ({ page }) => {
  await page.goto('/kelder/wijn/seed-wine-bennati');
  const picker = page.locator('select').first();
  await expect(picker).toBeVisible();
  const options = await picker.locator('option').allTextContents();
  expect(options.length).toBeGreaterThan(1);
  expect(options.some(s => s.startsWith('Rek '))).toBeTruthy();
  expect(options.some(s => /Buiten rek · fles [12]/.test(s))).toBeTruthy();
  expect(options.every(s => !/ · [a-z0-9-]{5}$/.test(s))).toBeTruthy();
});

test('five tasting questions save rating and append tasting history', async ({ page }) => {
  await page.goto('/kelder/wijn/seed-wine-bennati');
  await page.getByRole('link', { name: 'Vijf proefvragen beantwoorden' }).click();
  for (let i = 0; i < 5; i++) await page.locator(`#taste-${i}`).selectOption({ index: 1 });
  await page.getByLabel('Mijn score (1–10)').fill('9');
  await page.getByLabel('Extra opmerkingen (optioneel)').fill('Heerlijke wijn');
  await page.getByRole('button', { name: 'Proefnotitie bewaren' }).click();
  await expect(page.getByText('Heerlijke wijn', { exact: false })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('viniq-cellar-v1')?.includes('Heerlijke wijn'))).toBe(true);
  await page.reload();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('viniq-cellar-v1')?.includes('Heerlijke wijn'))).toBe(true);
  await expect(page.getByText('Heerlijke wijn', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Vijf proefvragen beantwoorden' }).click();
  for (let i = 0; i < 5; i++) await page.locator(`#taste-${i}`).selectOption({ index: 2 });
  await page.getByRole('button', { name: 'Proefnotitie bewaren' }).click();
  await expect(page.getByText('Heerlijke wijn', { exact: false })).toBeVisible();
});

test('evening recommendations filter own cellar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Wat drinken we vanavond/ }).click();
  await expect(page).toHaveURL(/kelder\/vanavond/);
  await expect(page.getByText('Suggestie 1')).toBeVisible();
  await page.getByLabel('Waar heb je zin in?').selectOption('fris');
  await expect(page.getByText('Suggestie 1')).toBeVisible();
});

test('label upload saves resized image and survives reload', async ({ page }) => {
  await page.goto('/kelder/wijn/seed-wine-bennati');
  await page.locator('input[type=file][accept="image/*"]').setInputFiles('tests/images/bottle/001-zenato-ripassa-front.jpg');
  await expect(page.getByAltText('Etiket van de wijn')).toBeVisible();
  await page.reload();
  await expect(page.getByAltText('Etiket van de wijn')).toBeVisible();
});

test('only Rek is active on the rack screen', async ({ page }) => {
  await page.goto('/kelder/rek');
  const nav = page.getByRole('navigation', { name: 'Navigatie' });
  const rack = nav.getByRole('link', { name: 'Rek' });
  const cellar = nav.getByRole('link', { name: 'Mijn Kelder' });
  await expect(rack.locator('span.h-0\\.5')).toHaveCount(1);
  await expect(cellar.locator('span.h-0\\.5')).toHaveCount(0);
  await cellar.click();
  await expect(cellar.locator('span.h-0\\.5')).toHaveCount(1);
  await expect(rack.locator('span.h-0\\.5')).toHaveCount(0);
});
