/**
 * Purchase Ledger — VinIQ v1
 * Records bottle acquisitions and recalculates weighted average purchase price.
 * No AI or Koopjeschecker dependency.
 */

import type { Wine, Acquisition, Bottle, BottleLocation } from './types';
import { genId, weightedAvgPrice } from './utils';
import { insertAcquisition, insertBottle, insertEvent, updateWine, getAcquisitions } from './storage';

export interface PurchaseInput {
  quantity: number;
  pricePerBottle: number;
  date: string;                 // YYYY-MM-DD
  retailer?: string;
  type: 'purchased' | 'gift';
  defaultLocation: BottleLocation;
}

/**
 * Records a purchase or gift, creates Bottle records and a BottleEvent.
 * Recalculates and persists the weighted average purchase price on Wine.
 */
export async function recordAcquisition(wine: Wine, input: PurchaseInput): Promise<void> {
  // 1. Insert acquisition record
  const acquisition = await insertAcquisition({
    wineId: wine.id,
    type: input.type,
    quantity: input.quantity,
    pricePerBottle: input.pricePerBottle,
    date: input.date,
    retailer: input.retailer,
  });

  // 2. Create one Bottle record per physical bottle
  const bottleIds: string[] = [];
  for (let i = 0; i < input.quantity; i++) {
    const bottle = await insertBottle({
      wineId: wine.id,
      acquisitionId: acquisition.id,
      location: input.defaultLocation,
    });
    bottleIds.push(bottle.id);
  }

  // 3. Recalculate weighted average purchase price
  const allAcquisitions = await getAcquisitions(wine.id);
  const paidAcquisitions = allAcquisitions.filter(a => a.pricePerBottle > 0);
  const newAvg = weightedAvgPrice(paidAcquisitions);
  await updateWine(wine.id, { avgPurchasePrice: newAvg });

  // 4. Insert event
  await insertEvent({
    wineId: wine.id,
    type: input.type === 'gift' ? 'received_gift' : 'purchased',
    note: [
      `${input.quantity} fles${input.quantity !== 1 ? 'sen' : ''}`,
      input.pricePerBottle > 0 ? `€${input.pricePerBottle}/fl.` : 'geschenk',
      input.retailer ?? '',
    ].filter(Boolean).join(' · '),
  });
}

/** All retailer names used, most recent first. */
export async function getKnownRetailers(acquisitions: Acquisition[]): Promise<string[]> {
  const seen = new Map<string, { name: string; lastUsed: string }>();
  for (const acq of acquisitions) {
    const raw = acq.retailer?.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    const current = seen.get(key);
    if (!current || acq.date > current.lastUsed) {
      seen.set(key, { name: raw, lastUsed: acq.date });
    }
  }
  return [...seen.values()]
    .sort((a, b) => b.lastUsed.localeCompare(a.lastUsed))
    .map(v => v.name);
}
