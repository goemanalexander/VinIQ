/**
 * VinIQ v1 — Cellar Management Only
 * Core data model. Bottle is the canonical source of truth for quantity.
 * Wine never stores an independent quantity field.
 */

// ─── LOCATION ──────────────────────────────────────────────────────────────

export type RackRow = 'A' | 'B' | 'C' | 'D';   // A = top, D = bottom
export type RackCol = 1 | 2 | 3 | 4 | 5 | 6;

export interface RackLocation {
  type: 'rack';
  row: RackRow;
  col: RackCol;
}

export interface OutsideLocation {
  type: 'outside';
  label?: string;   // e.g. "doos", "kast", "garage", "tijdelijk"
}

export type BottleLocation = RackLocation | OutsideLocation;

// ─── BOTTLE SIZE ────────────────────────────────────────────────────────────

export type BottleSizeML = 375 | 500 | 750 | 1500;
// 375 = halve fles, 500 = demi, 750 = standaard, 1500 = magnum

// ─── WINE ───────────────────────────────────────────────────────────────────
// Identity and metadata only. NO quantity field — bottle count is derived
// from the bottles table (COUNT WHERE wine_id = X).

export type WineColor = 'red' | 'white' | 'rosé' | 'sparkling' | 'other';

export interface Wine {
  id: string;

  // Identity
  producer: string;
  wineName: string;
  vintage: number | null;           // null = N.V.
  country: string;
  region: string;
  appellation: string;
  color: WineColor;
  grapes: string[];
  bottleSizeML: BottleSizeML;       // default 750

  // Optional
  imageUrl?: string;
  notes?: string;
  personalRating: number;           // 0–10, 0 = not yet rated
  drinkFrom?: number;               // year
  drinkTo?: number;                 // year

  // Purchase price — weighted average across all acquisitions
  // Stored for display performance; recalculated after every acquisition
  avgPurchasePrice: number;

  // Meta
  addedAt: string;                  // ISO timestamp
}

// ─── BOTTLE ─────────────────────────────────────────────────────────────────
// One row per physical bottle. This is the canonical source of truth.
// A wine's bottle count = COUNT(bottles WHERE wine_id = X).

export interface Bottle {
  id: string;
  wineId: string;
  acquisitionId: string;            // which acquisition batch this bottle belongs to
  location: BottleLocation;
  addedAt: string;                  // ISO timestamp
}

// ─── ACQUISITION ────────────────────────────────────────────────────────────
// One record per purchase or gift batch (may cover multiple bottles).

export interface Acquisition {
  id: string;
  wineId: string;
  type: 'purchased' | 'gift';
  quantity: number;                 // number of bottles in this batch
  pricePerBottle: number;           // 0 for gifts
  date: string;                     // YYYY-MM-DD
  retailer?: string;
  createdAt: string;                // ISO timestamp
}

// ─── MARKET VALUATION ───────────────────────────────────────────────────────
// History is preserved. Most recent per wine = active valuation.

export interface MarketValuation {
  id: string;
  wineId: string;
  valuePerBottle: number;
  source?: string;                  // e.g. "Wine-Searcher", "schatting"
  updatedAt: string;                // ISO timestamp
}

// ─── BOTTLE EVENT ───────────────────────────────────────────────────────────
// Immutable ledger. Never delete entries.

export type BottleEventType =
  | 'purchased'
  | 'received_gift'
  | 'drank'
  | 'gifted_away'
  | 'moved'
  | 'inventory_correction'
  | 'market_value_updated';

export interface BottleEvent {
  id: string;
  wineId: string;
  bottleId?: string;                // which specific bottle (not for market_value_updated)
  type: BottleEventType;
  fromLocation?: BottleLocation;
  toLocation?: BottleLocation;
  note?: string;
  timestamp: string;                // ISO timestamp
}

// ─── DERIVED / VIEW TYPES ───────────────────────────────────────────────────
// These are computed at runtime, never stored.

export interface WineWithCount extends Wine {
  bottleCount: number;              // COUNT(bottles WHERE wine_id = id)
  latestMarketValue?: number;       // most recent MarketValuation.valuePerBottle
  drinkWindowStatus: DrinkWindowStatus;
}

export type DrinkWindowStatus = 'too_young' | 'ready' | 'peak' | 'past_peak' | 'unknown';

export interface CellarSummary {
  totalBottles: number;
  uniqueWines: number;
  bottlesInRack: number;
  bottlesOutsideRack: number;
  rackCapacity: number;             // 24 (4 rows × 6 cols)
  purchaseValue: number;            // SUM(avgPurchasePrice × bottleCount)
  marketValue: number;              // SUM(latestMarketValue × bottleCount)
  valueDifference: number;          // marketValue - purchaseValue
}

// ─── RACK GRID ──────────────────────────────────────────────────────────────

export type RackGrid = {
  [row in RackRow]: {
    [col in RackCol]?: Bottle & { wine: Wine };
  };
};
