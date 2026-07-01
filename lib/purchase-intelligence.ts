/**
 * Purchase Intelligence — Sprint 6
 *
 * Pure analysis module: given the updated CellarWine (after recordPurchase)
 * and the price paid this time, produces a PurchaseInsight for display.
 *
 * No storage calls, no UI imports — can be extended or replaced independently.
 *
 * Classification compares currentPrice against the weighted-average of all
 * PRIOR purchases (i.e. purchases.slice(0, -1)), so the current purchase
 * never inflates its own score.
 *
 * Public API:
 *   analysePurchase(updatedWine, currentPrice) → PurchaseInsight
 */

import type { CellarWine } from './types';

export type PurchaseClassification =
  | 'excellent'    // ≥ 8% below historical avg
  | 'good'         // 2–8% below historical avg
  | 'fair'         // within ±5% of historical avg (slightly above is still fair)
  | 'expensive'    // > 5% above historical avg
  | 'first'        // no prior purchases to compare against
  | 'insufficient'; // price data unavailable

export interface PurchaseInsight {
  classification: PurchaseClassification;
  label: string;              // "Excellent purchase", "First purchase recorded.", …
  emoji: string;              // 🟢 / 🔴 / ℹ️

  totalBottles: number;
  currentPrice: number;
  averagePurchasePrice: number; // weighted avg of ALL prior purchases (pre-this-one)

  // null when classification is 'first' or 'insufficient'
  priceDifference: number | null;  // absolute €-diff (always positive)
  priceIsBelow: boolean | null;    // true = below avg (good), false = above (bad)
}

const THRESHOLDS = {
  excellent: -0.08,  // ≤ −8 %
  good:      -0.02,  // ≤ −2 %
  fair:       0.05,  // ≤ +5 %
  // > +5 % → expensive
} as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Analyses the purchase just recorded.
 *
 * @param updatedWine  CellarWine returned by recordPurchase() — includes the new
 *                     purchase entry already appended to purchases[].
 * @param currentPrice Price per bottle paid this time (0 = not entered).
 */
export function analysePurchase(
  updatedWine: CellarWine,
  currentPrice: number
): PurchaseInsight {
  const purchases = updatedWine.purchases ?? [];
  const totalBottles = updatedWine.quantity;

  // ── First purchase ever ───────────────────────────────────────────────────
  if (purchases.length <= 1) {
    return {
      classification: 'first',
      label: 'First purchase recorded.',
      emoji: 'ℹ️',
      totalBottles,
      currentPrice,
      averagePurchasePrice: currentPrice,
      priceDifference: null,
      priceIsBelow: null,
    };
  }

  // ── No price entered ──────────────────────────────────────────────────────
  if (currentPrice <= 0) {
    return {
      classification: 'insufficient',
      label: 'Not enough purchase history yet.',
      emoji: 'ℹ️',
      totalBottles,
      currentPrice: 0,
      averagePurchasePrice: updatedWine.purchasePrice,
      priceDifference: null,
      priceIsBelow: null,
    };
  }

  // ── Historical average (all purchases EXCEPT the one just recorded) ───────
  const history = purchases.slice(0, -1);
  const histQty   = history.reduce((s, p) => s + p.quantity, 0);
  const histValue = history.reduce((s, p) => s + p.quantity * p.pricePerBottle, 0);

  if (histQty === 0 || histValue === 0) {
    // Prior purchases had no price data
    return {
      classification: 'insufficient',
      label: 'Not enough purchase history yet.',
      emoji: 'ℹ️',
      totalBottles,
      currentPrice,
      averagePurchasePrice: currentPrice,
      priceDifference: null,
      priceIsBelow: null,
    };
  }

  const histAvg = histValue / histQty;
  const rawDiff = currentPrice - histAvg;
  const pct     = rawDiff / histAvg;

  let classification: PurchaseClassification;
  let label: string;

  if (pct <= THRESHOLDS.excellent) {
    classification = 'excellent';
    label = 'Excellent purchase';
  } else if (pct <= THRESHOLDS.good) {
    classification = 'good';
    label = 'Good purchase';
  } else if (pct <= THRESHOLDS.fair) {
    classification = 'fair';
    label = 'Fair purchase';
  } else {
    classification = 'expensive';
    label = 'Expensive purchase';
  }

  const priceIsBelow = rawDiff < 0;

  return {
    classification,
    label,
    emoji: priceIsBelow ? '🟢' : '🔴',
    totalBottles,
    currentPrice: round2(currentPrice),
    averagePurchasePrice: round2(histAvg),
    priceDifference: round2(Math.abs(rawDiff)),
    priceIsBelow,
  };
}
