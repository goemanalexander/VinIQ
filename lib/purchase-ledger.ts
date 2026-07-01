/**
 * Purchase Ledger — Sprint 5
 *
 * Isolated module for recording bottle purchases.
 * Handles both new wines and top-ups on existing cellar entries.
 * No UI imports — pure data logic.
 *
 * Public API:
 *   recordPurchase(kc, input, cellar) → CellarWine[]
 */

import type { CellarWine, Koopjeschecker, PurchaseEntry } from './types';
import { genId } from './utils';

export interface PurchaseInput {
  quantity: number;
  pricePerBottle: number;
  date: string;       // YYYY-MM-DD
  retailer?: string;
}

/** Finds an existing cellar entry for this KoopjesChecker (producer + wineName + vintage). */
export function findExistingCellarEntry(
  kc: Koopjeschecker,
  cellar: CellarWine[]
): CellarWine | undefined {
  return cellar.find(
    (w) =>
      w.koopjeschecker.general.producer === kc.general.producer &&
      w.koopjeschecker.general.wineName === kc.general.wineName &&
      w.koopjeschecker.general.vintage === kc.general.vintage
  );
}

/**
 * Records a purchase, mutating the cellar immutably.
 *
 * - If the wine is already in the cellar: increments quantity,
 *   recalculates the weighted-average purchase price, appends to purchases[].
 * - If the wine is new: creates a fresh CellarWine entry with purchases[].
 *
 * Returns a new cellar array (does not save to storage — caller must call saveCellar).
 */
export function recordPurchase(
  kc: Koopjeschecker,
  input: PurchaseInput,
  cellar: CellarWine[]
): CellarWine[] {
  const entry: PurchaseEntry = {
    id: genId('purchase'),
    quantity: input.quantity,
    pricePerBottle: input.pricePerBottle,
    date: input.date,
    retailer: input.retailer || undefined,
  };

  const existingIdx = cellar.findIndex(
    (w) =>
      w.koopjeschecker.general.producer === kc.general.producer &&
      w.koopjeschecker.general.wineName === kc.general.wineName &&
      w.koopjeschecker.general.vintage === kc.general.vintage
  );

  if (existingIdx >= 0) {
    const wine = cellar[existingIdx];
    const prevTotal = wine.purchasePrice * wine.quantity;
    const newQty = wine.quantity + input.quantity;
    const newAvgPrice =
      input.pricePerBottle > 0
        ? (prevTotal + input.pricePerBottle * input.quantity) / newQty
        : wine.purchasePrice;

    const updated: CellarWine = {
      ...wine,
      quantity: newQty,
      purchasePrice: Math.round(newAvgPrice * 100) / 100,
      purchases: [...(wine.purchases ?? []), entry],
      provenance: { ...wine.provenance, purchasePrice: { source: 'purchase_history' } },
    };
    return cellar.map((w, i) => (i === existingIdx ? updated : w));
  }

  // New wine
  const newWine: CellarWine = {
    id: genId('cellar'),
    producer: kc.general.producer,
    wineName: kc.general.wineName,
    vintage: kc.general.vintage,
    quantity: input.quantity,
    purchasePrice: input.pricePerBottle,
    personalRating: 0,
    notes: '',
    koopjeschecker: kc,
    addedAt: new Date().toISOString(),
    purchases: [entry],
    provenance: { purchasePrice: { source: 'purchase_history' } },
  };
  return [newWine, ...cellar];
}
