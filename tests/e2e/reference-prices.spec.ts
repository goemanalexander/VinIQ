import { test, expect } from '@playwright/test';
import { makeInitialCellar } from '../../lib/initial-cellar';
import { appendReferencePrices, safePriceSourceUrl, type ResearchedPrice } from '../../lib/reference-prices';
import type { CellarSnapshot } from '../../lib/storage';

const checkedAt = '2026-11-14T21:30:00.000Z';
const fixture: ResearchedPrice = {
  wineId: 'seed-wine-bennati', vintage: 2021, bottleSizeML: 750,
  valuePerBottle: 25, source: 'Voorbeeldwinkel', sourceUrl: 'https://example.com/wine/2021',
  availability: 'listed',
};

test('reference-price import appends only valuations and ledger events and is repeat-safe', () => {
  const source: CellarSnapshot = makeInitialCellar();
  source.wines[0].notes = 'Synthetic personal note';
  source.valuations.push({ id: 'previous', wineId: fixture.wineId, valuePerBottle: 22, source: 'Old source', updatedAt: '2026-01-01T00:00:00Z' });
  const before = structuredClone(source);
  const next = appendReferencePrices(source, [fixture], checkedAt);
  expect(source).toEqual(before);
  for (const key of ['wines', 'bottles', 'acquisitions'] as const) expect(next[key]).toEqual(source[key]);
  expect(next.valuations.slice(0, source.valuations.length)).toEqual(source.valuations);
  expect(next.events.slice(0, source.events.length)).toEqual(source.events);
  expect(next.valuations.at(-1)).toMatchObject({ wineId: fixture.wineId, valuePerBottle: 25,
    source: fixture.source, sourceUrl: fixture.sourceUrl, referenceType: 'retail', updatedAt: checkedAt });
  expect(next.events.at(-1)?.type).toBe('market_value_updated');
  expect(appendReferencePrices(next, [fixture], checkedAt)).toEqual(next);
  expect(() => appendReferencePrices(next, [{ ...fixture, valuePerBottle: 99 }], checkedAt)).toThrow('Bestaande prijsimport wijkt af');
  expect(appendReferencePrices(next, [fixture], '2026-11-15T10:00:00Z').valuations).toHaveLength(3);
});

test('wrong vintage, bottle size, unsafe URL and invalid amount reject the whole batch', () => {
  const source: CellarSnapshot = makeInitialCellar();
  const original = structuredClone(source);
  const wrong = [
    { ...fixture, vintage: 2022 }, { ...fixture, bottleSizeML: 1500 },
    { ...fixture, sourceUrl: 'javascript:alert(1)' }, { ...fixture, valuePerBottle: NaN },
    { ...fixture, valuePerBottle: 0 }, { ...fixture, source: '' },
  ];
  for (const price of wrong) expect(() => appendReferencePrices(source, [price], checkedAt)).toThrow();
  expect(() => appendReferencePrices(source, [fixture, fixture], checkedAt)).toThrow('Dubbele wijn');
  expect(() => appendReferencePrices(source, [fixture], 'invalid')).toThrow('Ongeldige opzoekdatum');
  source.bottles = source.bottles.filter(b => b.wineId !== fixture.wineId);
  expect(() => appendReferencePrices(source, [fixture], checkedAt)).toThrow('geen voorraad');
  source.bottles = original.bottles;
  expect(source).toEqual(original);
  expect(safePriceSourceUrl('javascript:alert(1)')).toBeNull();
  expect(safePriceSourceUrl(undefined)).toBeNull();
});

test('price, source, checked date and unavailable offer appear without tasting notes and stay hidden in guest view', async ({ page }) => {
  const snapshot = appendReferencePrices(makeInitialCellar(), [{ ...fixture, availability: 'out_of_stock' }], checkedAt);
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: null }));
  await page.addInitScript(data => {
    if (!localStorage.getItem('viniq-cellar-v1')) localStorage.setItem('viniq-cellar-v1', JSON.stringify(data));
  }, snapshot);
  await page.goto('/kelder/wijn/seed-wine-bennati');
  const sourceLink = page.getByRole('link', { name: 'Voorbeeldwinkel', exact: true });
  await expect(sourceLink).toHaveAttribute('href', fixture.sourceUrl);
  await expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.getByText('25,00', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Opgezocht op 14/11/2026')).toBeVisible();
  await expect(page.getByText('Laatst getoonde prijs; uitverkocht bij de bron.')).toBeVisible();
  await expect(page.getByText('Winkelprijs als indicatie', { exact: false })).toBeVisible();
  await page.reload();
  await expect(sourceLink).toBeVisible();
  await expect(page.getByText('19,10', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Gastweergave inschakelen' }).click();
  await expect(sourceLink).toHaveCount(0);
  await expect(page.getByText('Opgezocht op', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Gastweergave uitschakelen' }).click();
  await page.goto('/');
  await expect(page.getByText('6 van 34 flessen gewaardeerd')).toBeVisible();
  await page.goto('/kelder/wijn/seed-wine-marufa');
  await expect(page.getByText('Onbekend', { exact: true })).toBeVisible();
  await expect(page.getByText('Prijsbron:', { exact: false })).toHaveCount(0);
});
