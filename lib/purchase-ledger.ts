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

/**
 * Converts euros to integer cents. Weighted-average math is done in cents
 * throughout recordPurchase() to avoid binary floating-point error landing
 * exactly on a .5 rounding boundary (e.g. (45 + 77.85) / 6 is mathematically
 * 20.475, but 122.85 / 6 in IEEE 754 doubles evaluates to
 * 20.474999999999998, which rounds down instead of up).
 */
function toCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * All retailer names used across the purchase history, deduplicated
 * case-insensitively (first-seen casing of the most recent use wins),
 * most recently used first. Feeds the retailer suggestions in the
 * purchase dialog — deliberately not a retailer database.
 */
export function getKnownRetailers(cellar: CellarWine[]): string[] {
  const byKey = new Map<string, { name: string; lastUsed: string }>();
  for (const w of cellar) {
    for (const p of w.purchases ?? []) {
      const raw = p.retailer?.trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const current = byKey.get(key);
      if (!current || p.date > current.lastUsed) {
        byKey.set(key, { name: raw, lastUsed: p.date });
      }
    }
  }
  return [...byKey.values()]
    .sort((a, b) => b.lastUsed.localeCompare(a.lastUsed))
    .map((v) => v.name);
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
    const newQty = wine.quantity + input.quantity;
    // Round exactly once, in integer-cents space, then convert back to euros.
    // Rounding twice (once here, once again in euros) is what reintroduces
    // the floating-point boundary error this function exists to avoid.
    const newAvgPrice =
      input.pricePerBottle > 0
        ? Math.round(
            (toCents(wine.purchasePrice) * wine.quantity + toCents(input.pricePerBottle) * input.quantity) / newQty
          ) / 100
        : wine.purchasePrice;

    const updated: CellarWine = {
      ...wine,
      quantity: newQty,
      purchasePrice: newAvgPrice,
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
