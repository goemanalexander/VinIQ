import { makeInitialCellar } from './initial-cellar';
import type { CellarSnapshot } from './storage';
import type { Bottle, BottleEvent } from './types';

export const OFFICIAL_INVENTORY_CORRECTION = 'official-inventory-20261114';

const sameLocation = (a: Bottle['location'], b: Bottle['location']) =>
  a.type === 'rack' && b.type === 'rack' ? a.row === b.row && a.col === b.col :
    a.type === 'outside' && b.type === 'outside' && a.label === b.label;

/** Explicit one-time reconciliation. Never called automatically by startup or sync.
 * Keep wine IDs, personal metadata, acquisitions, valuations and old events intact.
 * Surplus bottles leave stock through correction events, never fabricated consumption.
 * The caller must back up and compare-and-swap the source revision and payload.
 */
export function correctOfficialInventory(source: CellarSnapshot, timestamp: string): CellarSnapshot {
  if (!Number.isFinite(Date.parse(timestamp))) throw new Error('Ongeldige correctiedatum');
  if (source.events.some(e => e.id.startsWith(OFFICIAL_INVENTORY_CORRECTION + ':'))) {
    return structuredClone(source); // Re-running cannot restore bottles drunk after correction.
  }
  const next = structuredClone(source);
  const official = makeInitialCellar();
  const events: BottleEvent[] = [];
  const bottles: Bottle[] = [];
  const consumed = new Set<string>();
  const correctionNote = 'Officiële voorraadopname 14 november 2026; voorraadcorrectie, geen aankoop of verbruik';
  function record(bottle: Bottle, from?: Bottle['location'], to?: Bottle['location']) {
    events.push({ id: `${OFFICIAL_INVENTORY_CORRECTION}:${bottle.id}`, wineId: bottle.wineId,
      bottleId: bottle.id, type: 'inventory_correction', timestamp, note: correctionNote,
      ...(from ? { fromLocation: from } : {}), ...(to ? { toLocation: to } : {}) });
  }
  for (const targetWine of official.wines) {
    const existing = next.wines.find(w => w.id === targetWine.id);
    if (existing && (existing.vintage !== targetWine.vintage || existing.bottleSizeML !== targetWine.bottleSizeML)) {
      throw new Error('Wijnidentiteit gewijzigd: ' + targetWine.id);
    }
    // Only identity/display fields and confirmed current purchase price are corrected.
    // Preserve notes, ratings, photos, drink windows, grapes and original creation date.
    if (existing) Object.assign(existing, {
      producer: targetWine.producer, wineName: targetWine.wineName,
      country: targetWine.country, region: targetWine.region, color: targetWine.color,
      avgPurchasePrice: targetWine.avgPurchasePrice,
    });
    else next.wines.push({ ...targetWine, addedAt: timestamp });

    const targets = official.bottles.filter(b => b.wineId === targetWine.id);
    const available = source.bottles.filter(b => b.wineId === targetWine.id);
    const assigned = new Map<string, Bottle>();
    // First keep exact physical locations, before allocating any bottles to new slots.
    for (const target of targets) {
      const match = available.find(b => !consumed.has(b.id) && sameLocation(b.location, target.location));
      if (match) { assigned.set(target.id, match); consumed.add(match.id); }
    }
    let newAcquisitionId: string | undefined;
    const missing = Math.max(0, targets.length - available.length);
    if (missing) {
      newAcquisitionId = `${OFFICIAL_INVENTORY_CORRECTION}:acq:${targetWine.id}`;
      if (source.acquisitions.some(a => a.id === newAcquisitionId)) throw new Error('Correctie-ID bestaat al');
      next.acquisitions.push({ id: newAcquisitionId, wineId: targetWine.id,
        type: official.acquisitions.find(a => a.wineId === targetWine.id)!.type,
        quantity: missing, pricePerBottle: targetWine.avgPurchasePrice,
        date: '', createdAt: timestamp });
    }
    for (const target of targets) {
      const old = assigned.get(target.id) ?? available.find(b => !consumed.has(b.id));
      if (old) {
        consumed.add(old.id);
        bottles.push({ ...old, location: target.location });
        if (!sameLocation(old.location, target.location)) record(old, old.location, target.location);
      } else {
        const id = `${OFFICIAL_INVENTORY_CORRECTION}:bottle:${target.id}`;
        if (source.bottles.some(b => b.id === id)) throw new Error('Correctie-ID bestaat al');
        const added = { ...target, id, acquisitionId: newAcquisitionId!, addedAt: timestamp };
        bottles.push(added);
        record(added, undefined, target.location);
      }
    }
  }
  for (const surplus of source.bottles.filter(b => !consumed.has(b.id))) {
    // Retain the entire removed record in the immutable ledger for audit/rollback.
    record(surplus, surplus.location);
    events[events.length - 1].note += '\nOorspronkelijk flesrecord: ' + JSON.stringify(surplus);
  }
  // Mark even a stock-identical correction: later consumption must never be reset.
  if (!events.length) record(bottles[0], bottles[0].location, bottles[0].location);
  next.bottles = bottles;
  next.events.push(...events);
  return next;
}
