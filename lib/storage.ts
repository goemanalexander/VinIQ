/**
 * VinIQ v1 — Storage layer
 * Phase 1: In-memory placeholder. Supabase implemented in Phase 2.
 * All functions are async so the API signature won't change when Supabase is added.
 */

import type {
  Wine,
  Bottle,
  Acquisition,
  MarketValuation,
  BottleEvent,
  WineWithCount,
  CellarSummary,
  DrinkWindowStatus,
  RackGrid,
  RackRow,
  RackCol,
} from './types';
import { genId } from './utils';
import { makeInitialCellar } from './initial-cellar';
import { deriveDrinkWindowStatus } from './utils';

// ─── IN-MEMORY STORE (Phase 1 placeholder) ──────────────────────────────────

let _wines: Wine[] = [];
let _bottles: Bottle[] = [];
let _acquisitions: Acquisition[] = [];
let _valuations: MarketValuation[] = [];
let _events: BottleEvent[] = [];

// Browser-local persistence. Initial inventory is installed once per browser.
// This is not a cloud database and does not synchronise between devices.
const STORAGE_KEY = 'viniq-cellar-v1';
let loaded = false;
function ensureLoaded() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const snapshot = raw ? JSON.parse(raw) : makeInitialCellar();
    _wines = snapshot.wines ?? [];
    _bottles = snapshot.bottles ?? [];
    _acquisitions = snapshot.acquisitions ?? [];
    _valuations = snapshot.valuations ?? [];
    _events = snapshot.events ?? [];
    if (!raw) save();
  } catch (error) {
    // Do not overwrite an unreadable existing snapshot.
    loaded = false;
    throw new Error('VinIQ kan de lokale wijnkelder niet lezen. Gegevens zijn niet overschreven.', { cause: error });
  }
}
function save() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    wines:_wines,bottles:_bottles,acquisitions:_acquisitions,valuations:_valuations,events:_events,
  }));
}

// ─── WINES ──────────────────────────────────────────────────────────────────

export async function getWines(): Promise<Wine[]> {
  ensureLoaded();
  return [..._wines];
}

export async function getWine(id: string): Promise<Wine | null> {
  ensureLoaded();
  return _wines.find(w => w.id === id) ?? null;
}

export async function insertWine(wine: Omit<Wine, 'id' | 'addedAt'>): Promise<Wine> {
  ensureLoaded();
  const record: Wine = { ...wine, id: genId('wine'), addedAt: new Date().toISOString() };
  _wines = [record, ..._wines];
  save();
  return record;
}

export async function updateWine(id: string, updates: Partial<Wine>): Promise<void> {
  ensureLoaded();
  _wines = _wines.map(w => w.id === id ? { ...w, ...updates } : w);
  save();
}

export async function deleteWine(id: string): Promise<void> {
  ensureLoaded();
  _wines = _wines.filter(w => w.id !== id);
  _bottles = _bottles.filter(b => b.wineId !== id);
  _acquisitions = _acquisitions.filter(a => a.wineId !== id);
  _valuations = _valuations.filter(v => v.wineId !== id);
  save();
}

// ─── BOTTLES ────────────────────────────────────────────────────────────────

export async function getBottles(wineId?: string): Promise<Bottle[]> {
  ensureLoaded();
  if (wineId) return _bottles.filter(b => b.wineId === wineId);
  return [..._bottles];
}

export async function getBottle(id: string): Promise<Bottle | null> {
  ensureLoaded();
  return _bottles.find(b => b.id === id) ?? null;
}

export async function insertBottle(bottle: Omit<Bottle, 'id' | 'addedAt'>): Promise<Bottle> {
  ensureLoaded();
  const record: Bottle = { ...bottle, id: genId('bottle'), addedAt: new Date().toISOString() };
  _bottles = [record, ..._bottles];
  save();
  return record;
}

export async function updateBottle(id: string, updates: Partial<Bottle>): Promise<void> {
  ensureLoaded();
  _bottles = _bottles.map(b => b.id === id ? { ...b, ...updates } : b);
  save();
}

export async function deleteBottle(id: string): Promise<void> {
  ensureLoaded();
  _bottles = _bottles.filter(b => b.id !== id);
  save();
}

export async function getBottleCount(wineId: string): Promise<number> {
  ensureLoaded();
  return _bottles.filter(b => b.wineId === wineId).length;
}

// ─── ACQUISITIONS ────────────────────────────────────────────────────────────

export async function getAcquisitions(wineId?: string): Promise<Acquisition[]> {
  ensureLoaded();
  if (wineId) return _acquisitions.filter(a => a.wineId === wineId);
  return [..._acquisitions];
}

export async function insertAcquisition(acq: Omit<Acquisition, 'id' | 'createdAt'>): Promise<Acquisition> {
  ensureLoaded();
  const record: Acquisition = { ...acq, id: genId('acq'), createdAt: new Date().toISOString() };
  _acquisitions = [record, ..._acquisitions];
  save();
  return record;
}

// ─── MARKET VALUATIONS ───────────────────────────────────────────────────────

export async function getLatestValuation(wineId: string): Promise<MarketValuation | null> {
  ensureLoaded();
  const vals = _valuations
    .filter(v => v.wineId === wineId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return vals[0] ?? null;
}

export async function insertValuation(val: Omit<MarketValuation, 'id' | 'updatedAt'>): Promise<MarketValuation> {
  ensureLoaded();
  const record: MarketValuation = { ...val, id: genId('val'), updatedAt: new Date().toISOString() };
  _valuations = [record, ..._valuations];
  save();
  return record;
}

// ─── EVENTS ─────────────────────────────────────────────────────────────────

export async function getEvents(wineId?: string): Promise<BottleEvent[]> {
  ensureLoaded();
  const events = wineId ? _events.filter(e => e.wineId === wineId) : [..._events];
  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function insertEvent(event: Omit<BottleEvent, 'id' | 'timestamp'>): Promise<BottleEvent> {
  ensureLoaded();
  const record: BottleEvent = { ...event, id: genId('evt'), timestamp: new Date().toISOString() };
  _events = [record, ..._events];
  save();
  return record;
}

// ─── DERIVED / COMPOSED ─────────────────────────────────────────────────────

export async function getWineWithCount(id: string): Promise<WineWithCount | null> {
  ensureLoaded();
  const wine = await getWine(id);
  if (!wine) return null;
  const count = await getBottleCount(id);
  const valuation = await getLatestValuation(id);
  return {
    ...wine,
    bottleCount: count,
    latestMarketValue: valuation?.valuePerBottle,
    drinkWindowStatus: deriveDrinkWindowStatus(wine.drinkFrom, wine.drinkTo),
  };
}

export async function getAllWinesWithCount(): Promise<WineWithCount[]> {
  ensureLoaded();
  const wines = await getWines();
  return Promise.all(wines.map(w => getWineWithCount(w.id) as Promise<WineWithCount>));
}

export async function getCellarSummary(): Promise<CellarSummary> {
  ensureLoaded();
  const wines = await getAllWinesWithCount();
  const bottles = await getBottles();

  const bottlesInRack = bottles.filter(b => b.location.type === 'rack').length;
  const bottlesOutside = bottles.filter(b => b.location.type === 'outside').length;

  const purchaseValue = wines.reduce((sum, w) => sum + w.avgPurchasePrice * w.bottleCount, 0);
  const marketValue = wines.reduce((sum, w) => {
    const val = w.latestMarketValue ?? w.avgPurchasePrice;
    return sum + val * w.bottleCount;
  }, 0);

  return {
    totalBottles: bottles.length,
    uniqueWines: wines.filter(w => w.bottleCount > 0).length,
    bottlesInRack,
    bottlesOutsideRack: bottlesOutside,
    rackCapacity: 24,
    purchaseValue,
    marketValue,
    valueDifference: marketValue - purchaseValue,
  };
}

export async function getRackGrid(): Promise<RackGrid> {
  ensureLoaded();
  const bottles = await getBottles();
  const rackBottles = bottles.filter(b => b.location.type === 'rack');

  const grid: Partial<RackGrid> = {};
  const rows: RackRow[] = ['A', 'B', 'C', 'D'];

  for (const row of rows) {
    (grid as Record<RackRow, unknown>)[row] = {};
  }

  for (const bottle of rackBottles) {
    const loc = bottle.location as { type: 'rack'; row: RackRow; col: RackCol };
    const wine = _wines.find(w => w.id === bottle.wineId);
    if (wine) {
      (grid[loc.row] as Record<RackCol, unknown>)[loc.col] = { ...bottle, wine };
    }
  }

  return grid as RackGrid;
}

// ─── KNOWN RETAILERS ─────────────────────────────────────────────────────────

export async function getKnownRetailers(): Promise<string[]> {
  ensureLoaded();
  const seen = new Map<string, { name: string; lastUsed: string }>();
  for (const acq of _acquisitions) {
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
