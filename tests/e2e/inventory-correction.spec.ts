import { test, expect } from '@playwright/test';
import { makeInitialCellar } from '../../lib/initial-cellar';
import { correctOfficialInventory, OFFICIAL_INVENTORY_CORRECTION } from '../../lib/inventory-correction';
import type { CellarSnapshot } from '../../lib/storage';

const timestamp = '2026-11-14T21:15:00.000Z';
function priorCellar(): CellarSnapshot {
  const seed: CellarSnapshot = makeInitialCellar();
  seed.wines = seed.wines.filter(w => w.id !== 'seed-wine-cdp');
  seed.bottles = seed.bottles.filter(b => b.wineId !== 'seed-wine-cdp');
  seed.acquisitions = seed.acquisitions.filter(a => a.wineId !== 'seed-wine-cdp');
  seed.events = seed.events.filter(e => e.wineId !== 'seed-wine-cdp');
  seed.wines[0].notes = 'Proefnotitie 12/11/2026 · 9/10\nZacht en boterig';
  seed.wines[0].personalRating = 9;
  seed.wines[0].drinkFrom = 2028;
  seed.wines[0].drinkTo = 2036;
  seed.wines[0].imageUrl = 'data:image/png;base64,TEST';
  seed.valuations.push({ id: 'val-test', wineId: seed.wines[0].id, valuePerBottle: 25, updatedAt: timestamp });
  seed.wines.push({ ...seed.wines[0], id: 'old-wine', producer: 'Masso Antico', wineName: 'Primitivo Salento' });
  seed.acquisitions.push({ ...seed.acquisitions[0], id: 'old-acq', wineId: 'old-wine' });
  for (const [i, wineId] of ['old-wine', 'seed-wine-bufalo-nero', 'seed-wine-ritardatario'].entries()) {
    seed.bottles.push({ ...seed.bottles.find(b => b.wineId === (wineId === 'old-wine' ? 'seed-wine-bennati' : wineId))!,
      id: 'surplus-' + i, wineId, acquisitionId: wineId === 'old-wine' ? 'old-acq' : 'seed-acq-' + wineId.slice(10), location: { type: 'outside' } });
    seed.events.push({ id: 'past-event-' + i, wineId, type: 'received_gift', bottleId: 'surplus-' + i, timestamp });
  }
  const bennati = seed.bottles.find(b => b.id === 'seed-bottle-bennati-5')!;
  bennati.location = { type: 'outside' };
  return seed;
}

test('correction preserves personal data and ledger while reconciling every official position', () => {
  const source = priorCellar();
  const before = structuredClone(source);
  const next = correctOfficialInventory(source, timestamp);
  expect(source).toEqual(before);
  expect(next.bottles).toHaveLength(34);
  expect(next.bottles.filter(b => b.location.type === 'rack')).toHaveLength(24);
  expect(next.bottles.filter(b => b.location.type === 'outside' && b.location.label === 'doos naast rek')).toHaveLength(10);
  const wineIds = new Set(next.bottles.map(b => b.wineId));
  expect(wineIds.size).toBe(14);
  expect(next.wines).toHaveLength(15); // Zero-stock historical wine is retained.
  expect(next.wines.find(w => w.id === 'old-wine')).toEqual(source.wines.find(w => w.id === 'old-wine'));
  for (const old of source.wines) {
    const wine = next.wines.find(w => w.id === old.id)!;
    for (const field of ['notes', 'personalRating', 'imageUrl', 'drinkFrom', 'drinkTo', 'addedAt'] as const) expect(wine[field]).toEqual(old[field]);
  }
  expect(next.events.slice(0, source.events.length)).toEqual(source.events);
  expect(next.acquisitions.slice(0, source.acquisitions.length)).toEqual(source.acquisitions);
  expect(next.valuations).toEqual(source.valuations);
  const locationKey = (b: CellarSnapshot['bottles'][number]) => JSON.stringify([b.wineId, b.location]);
  expect(next.bottles.map(locationKey).sort()).toEqual(makeInitialCellar().bottles.map(locationKey).sort());
  expect(next.events.slice(source.events.length).every(e => e.type === 'inventory_correction')).toBe(true);
  for (const removed of source.bottles.filter(b => !next.bottles.some(n => n.id === b.id))) {
    expect(next.events.some(e => e.bottleId === removed.id && e.note?.includes(JSON.stringify(removed)))).toBe(true);
  }
  expect(next.acquisitions.filter(a => a.id.startsWith(OFFICIAL_INVENTORY_CORRECTION)).every(a => a.date === '')).toBe(true);
  expect(next.wines.reduce((sum, w) => sum + w.avgPurchasePrice * next.bottles.filter(b => b.wineId === w.id).length, 0)).toBeCloseTo(362.76);
  const exact = source.bottles.find(b => b.id === 'seed-bottle-bennati-0')!;
  expect(next.bottles.find(b => b.id === exact.id)).toEqual(exact);
});

test('correction cannot re-add a bottle consumed later, including an initially correct cellar', () => {
  for (const source of [priorCellar(), makeInitialCellar()]) {
    const next = correctOfficialInventory(source, timestamp);
    expect(correctOfficialInventory(next, timestamp)).toEqual(next);
    next.bottles.pop();
    expect(correctOfficialInventory(next, timestamp)).toEqual(next);
    expect(next.bottles).toHaveLength(33);
  }
});

test('unexpected identity and invalid timestamps fail without mutation', () => {
  const source = priorCellar();
  source.wines[0].vintage = 1999;
  const original = structuredClone(source);
  expect(() => correctOfficialInventory(source, timestamp)).toThrow('Wijnidentiteit gewijzigd');
  expect(() => correctOfficialInventory(source, 'invalid')).toThrow('Ongeldige correctiedatum');
  expect(source).toEqual(original);
});

test('corrected snapshot renders and syncs to a second browser without losing tasting history', async ({ browser }) => {
  const corrected = correctOfficialInventory(priorCellar(), timestamp);
  const context = await browser.newContext();
  try {
    await context.route('**/api/auth/get-session', route => route.fulfill({ json: { user: { id: 'test-user', email: 'test@example.com' } } }));
    await context.route('**/api/cellar', route => {
      expect(route.request().method()).toBe('GET'); // Fresh clients must load, never overwrite.
      return route.fulfill({ json: { owner_id: 'test-user', revision: 4, payload: corrected, updated_at: timestamp } });
    });
    const page = await context.newPage();
    await page.goto('/kelder');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('viniq-cloud-state') || '{}').revision)).toBe(4);
    await page.reload();
    const loaded = await page.evaluate(() => JSON.parse(localStorage.getItem('viniq-cellar-v1')!));
    expect(loaded).toEqual(corrected);
    await page.goto('/kelder/wijn/seed-wine-bennati');
    await expect(page.getByText('Zacht en boterig', { exact: false }).first()).toBeVisible();
    await page.goto('/kelder/rek');
    await expect(page.getByText('24/24 bezet')).toBeVisible();
    await page.goto('/');
    await expect(page.getByText('34', { exact: true })).toBeVisible();
    await expect(page.getByText('14', { exact: true })).toBeVisible();
  } finally { await context.close(); }
});
