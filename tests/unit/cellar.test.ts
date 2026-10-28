import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Wine } from '../../lib/types';
import { deriveDrinkWindowStatus, weightedAvgPrice } from '../../lib/utils';
import { validateAcquisition, validateLocation, validateWine } from '../../lib/validation';

const sampleWine: Omit<Wine, 'id' | 'addedAt'> = {
  producer: 'Testproducent', wineName: 'Uitsluitend testwijn', vintage: 2020,
  country: 'België', region: 'Testregio', appellation: '', color: 'red',
  grapes: [], bottleSizeML: 750, personalRating: 0, avgPurchasePrice: 0,
};

describe('validation and calculations', () => {
  it('accepts a complete wine, including a non-vintage wine', () => {
    expect(validateWine(sampleWine).valid).toBe(true);
    expect(validateWine({ ...sampleWine, vintage: null }).valid).toBe(true);
  });

  it('rejects missing identity, negative prices and reversed drinking windows', () => {
    const result = validateWine({ producer: ' ', wineName: '', vintage: 1799,
      avgPurchasePrice: -1, personalRating: 11, drinkFrom: 2030, drinkTo: 2029 });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(6);
  });

  it('validates purchase essentials without modifying input', () => {
    const input = Object.freeze({ wineId: 'test', quantity: 2, pricePerBottle: 12, date: '2026-01-01' });
    expect(validateAcquisition(input)).toEqual({ valid: true, errors: [] });
    expect(validateAcquisition({ quantity: 0, pricePerBottle: -1, date: '01/01/2026' }).errors).toHaveLength(4);
    expect(input.quantity).toBe(2);
  });

  it('accepts the rack boundaries and outside storage, rejects missing positions', () => {
    expect(validateLocation({ type: 'rack', row: 'A', col: 1 }).valid).toBe(true);
    expect(validateLocation({ type: 'rack', row: 'D', col: 6 }).valid).toBe(true);
    expect(validateLocation({ type: 'outside', label: 'Testdoos' }).valid).toBe(true);
    expect(validateLocation({ type: 'rack' }).errors).toHaveLength(2);
    expect(validateLocation({}).valid).toBe(false);
  });

  it.each([
    [undefined, undefined, 'unknown'], [2027, 2030, 'too_young'],
    [2020, 2025, 'past_peak'], [2026, 2026, 'ready'],
    [2020, undefined, 'ready'], [undefined, 2026, 'ready'],
  ] as const)('derives drinking status for %s–%s', (from, to, expected) => {
    expect(deriveDrinkWindowStatus(from, to, 2026)).toBe(expected);
  });

  it('weights prices by physical bottle quantity and rounds cents', () => {
    expect(weightedAvgPrice([])).toBe(0);
    expect(weightedAvgPrice([{ quantity: 2, pricePerBottle: 10.01 }, { quantity: 1, pricePerBottle: 20 }])).toBe(13.34);
  });
});

describe('cellar data integrity in an isolated in-memory module', () => {
  beforeEach(() => vi.resetModules());

  it('starts empty for each test, with the expected rack capacity', async () => {
    const store = await import('../../lib/storage');
    expect(await store.getCellarSummary()).toEqual({ totalBottles: 0, uniqueWines: 0,
      bottlesInRack: 0, bottlesOutsideRack: 0, rackCapacity: 24,
      purchaseValue: 0, marketValue: 0, valueDifference: 0 });
  });

  it('records purchases and gifts without changing another wine', async () => {
    const store = await import('../../lib/storage');
    const { recordAcquisition } = await import('../../lib/purchase-ledger');
    const wine = await store.insertWine(sampleWine);
    const otherWine = await store.insertWine({ ...sampleWine, wineName: 'Andere testwijn' });
    const purchase = { quantity: 2, pricePerBottle: 10, date: '2026-01-01',
      type: 'purchased' as const, defaultLocation: { type: 'outside' as const, label: 'Testdoos' } };
    await recordAcquisition(wine, purchase);
    await recordAcquisition(wine, { ...purchase, quantity: 1, pricePerBottle: 16 });
    await recordAcquisition(wine, { ...purchase, quantity: 1, pricePerBottle: 0, type: 'gift' });

    const bottles = await store.getBottles(wine.id);
    expect(bottles).toHaveLength(4);
    expect(new Set(bottles.map(b => b.id)).size).toBe(4);
    const acquisitions = await store.getAcquisitions(wine.id);
    expect(acquisitions).toHaveLength(3);
    for (const bottle of bottles) {
      expect(acquisitions.some(a => a.id === bottle.acquisitionId)).toBe(true);
    }
    expect((await store.getWine(wine.id))?.avgPurchasePrice).toBe(12);
    expect(await store.getWine(otherWine.id)).toEqual(otherWine);
    expect(await store.getBottleCount(otherWine.id)).toBe(0);
    expect((await store.getEvents(wine.id)).map(e => e.type).sort()).toEqual(['purchased', 'purchased', 'received_gift']);
    expect(await store.getCellarSummary()).toMatchObject({ totalBottles: 4, uniqueWines: 1,
      bottlesInRack: 0, bottlesOutsideRack: 4, purchaseValue: 48, marketValue: 48 });
  });

  it('moves and removes only the selected bottle while preserving history', async () => {
    const store = await import('../../lib/storage');
    const { recordAcquisition } = await import('../../lib/purchase-ledger');
    const wine = await store.insertWine(sampleWine);
    await recordAcquisition(wine, { quantity: 2, pricePerBottle: 10, date: '2026-01-01',
      type: 'purchased', defaultLocation: { type: 'outside' } });
    const [first, second] = await store.getBottles(wine.id);
    const history = await store.getEvents(wine.id);
    await store.updateBottle(first.id, { location: { type: 'rack', row: 'D', col: 6 } });
    expect((await store.getRackGrid()).D[6]?.id).toBe(first.id);
    expect(await store.getCellarSummary()).toMatchObject({ bottlesInRack: 1, bottlesOutsideRack: 1 });
    await store.deleteBottle(first.id);
    expect(await store.getBottle(first.id)).toBeNull();
    expect(await store.getBottle(second.id)).toEqual(second);
    expect(await store.getBottleCount(wine.id)).toBe(1);
    expect(await store.getEvents(wine.id)).toEqual(history);
    expect(await store.getAcquisitions(wine.id)).toHaveLength(1);
  });
});
