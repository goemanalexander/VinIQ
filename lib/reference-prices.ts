import type { CellarSnapshot } from './storage';
import type { MarketValuation } from './types';

export type ResearchedPrice = {
  wineId: string;
  vintage: number | null;
  bottleSizeML: number;
  valuePerBottle: number;
  source: string;
  sourceUrl: string;
  availability: 'listed' | 'out_of_stock';
  priceNote?: string;
};

export function safePriceSourceUrl(value?: string): string | null {
  try {
    const url = new URL(value || '');
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

/** Explicit maintenance import; no scraping, startup seeding or background repricing.
 * Validate the whole batch before appending valuations and immutable ledger events.
 * Caller backs up and compare-and-swaps the exact source payload and revision.
 */
export function appendReferencePrices(source: CellarSnapshot, prices: ResearchedPrice[], checkedAt: string): CellarSnapshot {
  if (!Number.isFinite(Date.parse(checkedAt))) throw new Error('Ongeldige opzoekdatum');
  const seen = new Set<string>();
  const pending: MarketValuation[] = [];
  for (const price of prices) {
    if (seen.has(price.wineId)) throw new Error('Dubbele wijn in prijsimport');
    seen.add(price.wineId);
    const wine = source.wines.find(w => w.id === price.wineId);
    if (!wine || wine.vintage !== price.vintage || wine.bottleSizeML !== price.bottleSizeML) {
      throw new Error('Prijs komt niet overeen met wijn, jaargang of flesmaat');
    }
    if (!source.bottles.some(b => b.wineId === wine.id)) throw new Error('Wijn heeft geen voorraad');
    if (!Number.isFinite(price.valuePerBottle) || price.valuePerBottle <= 0 || !price.source.trim() ||
        !safePriceSourceUrl(price.sourceUrl) || !['listed', 'out_of_stock'].includes(price.availability)) {
      throw new Error('Ongeldige prijs of prijsbron');
    }
    const id = `reference-price:${checkedAt}:${wine.id}`;
    const valuation: MarketValuation = {
      id, wineId: wine.id, valuePerBottle: price.valuePerBottle, source: price.source,
      sourceUrl: price.sourceUrl, referenceType: 'retail', availability: price.availability,
      ...(price.priceNote ? { priceNote: price.priceNote } : {}), updatedAt: checkedAt,
    };
    const existing = source.valuations.find(v => v.id === id);
    if (existing) {
      if (existing.valuePerBottle !== valuation.valuePerBottle || existing.sourceUrl !== valuation.sourceUrl ||
          existing.source !== valuation.source || existing.availability !== valuation.availability ||
          existing.priceNote !== valuation.priceNote || existing.referenceType !== valuation.referenceType ||
          !source.events.some(e => e.id === id && e.type === 'market_value_updated' && e.wineId === wine.id)) {
        throw new Error('Bestaande prijsimport wijkt af');
      }
      continue;
    }
    if (source.events.some(e => e.id === id)) throw new Error('Prijsgebeurtenis bestaat al');
    pending.push(valuation);
  }
  const next = structuredClone(source);
  next.valuations.push(...pending);
  next.events.push(...pending.map(v => ({ id: v.id, wineId: v.wineId, type: 'market_value_updated' as const,
    note: `Referentieprijs ${v.valuePerBottle.toFixed(2)} EUR per fles · ${v.source}${v.availability === 'out_of_stock' ? ' · uitverkocht bij bron' : ''}`,
    timestamp: checkedAt })));
  return next;
}
