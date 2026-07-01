/**
 * Cellar Intelligence — Sprint 8
 *
 * Pure deterministic analysis of the cellar. No LLM calls, no UI imports,
 * no storage access — takes a CellarWine[] and returns a structured
 * CellarIntelligence report for the cellar page to render.
 *
 * Public API:
 *   getCellarIntelligence(cellar) → CellarIntelligence
 */

import type { CellarWine } from './types';
import { deriveWindowStatus, estimateCellarValue } from './utils';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WindowBucket {
  bottles: number;                    // total bottles in this bucket
  wines: { id: string; label: string }[]; // top entries, most urgent first
}

export interface DrinkingWindowInsight {
  drinkSoon: WindowBucket;  // past peak, or window closes within a year
  atPeak: WindowBucket;
  tooYoung: WindowBucket;
}

export interface DistributionEntry {
  name: string;
  bottles: number;
  percent: number; // of total bottles, rounded
}

export interface BalanceInsight {
  countries: DistributionEntry[];
  regions: DistributionEntry[];
  grapes: DistributionEntry[];   // empty when no wine has grape data
  styles: DistributionEntry[];
}

export interface PurchaseInsight {
  totalBottles: number;
  uniqueWines: number;
  totalValue: number;      // purchase-price based; 0 when no prices known
  avgBottleValue: number;  // over bottles WITH a known price
  estimatedValue: number;  // maturity/rating-adjusted estimate
}

export interface CellarIntelligence {
  drinkingWindow: DrinkingWindowInsight;
  balance: BalanceInsight;
  gaps: string[];
  purchase: PurchaseInsight;
  tasteSummary: string;
}

// ---------------------------------------------------------------------------
// Style detection — name/region keywords, same vocabulary as the sommelier
// ---------------------------------------------------------------------------

const STYLE_RULES: { style: string; test: (name: string, region: string) => boolean }[] = [
  { style: 'Amarone',        test: (n) => n.includes('amarone') },
  { style: 'Ripasso',        test: (n) => n.includes('ripasso') },
  { style: 'Brunello',       test: (n) => n.includes('brunello') },
  { style: 'Barolo',         test: (n) => n.includes('barolo') || n.includes('barbaresco') },
  { style: 'Primitivo',      test: (n) => n.includes('primitivo') || n.includes('zinfandel') },
  { style: 'Rioja',          test: (n, r) => n.includes('rioja') || r.includes('rioja') },
  { style: 'Southern Rhône', test: (n, r) => n.includes('châteauneuf') || n.includes('chateauneuf') || n.includes('gigondas') || r.includes('rhône') || r.includes('rhone') },
  { style: 'Bordeaux',       test: (n, r) => n.includes('bordeaux') || r.includes('bordeaux') || r.includes('médoc') || r.includes('medoc') },
];

function detectStyle(wine: CellarWine): string {
  const name = `${wine.producer} ${wine.wineName}`.toLowerCase();
  const region = wine.koopjeschecker.general.region.toLowerCase();
  for (const rule of STYLE_RULES) {
    if (rule.test(name, region)) return rule.style;
  }
  const color = wine.koopjeschecker.style.color;
  if (color === 'sparkling') return 'Sparkling';
  if (color === 'white') return 'White wine';
  if (color === 'rosé') return 'Rosé';
  return 'Other red';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function topEntries(counts: Map<string, number>, totalBottles: number, limit: number): DistributionEntry[] {
  return [...counts.entries()]
    .filter(([name]) => name && name !== 'Unknown')
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, bottles]) => ({
      name,
      bottles,
      percent: Math.round((bottles / totalBottles) * 100),
    }));
}

function wineLabel(w: CellarWine): string {
  return `${w.producer} ${w.wineName}${w.vintage > 0 ? ` ${w.vintage}` : ''}`.trim();
}

function bucket(wines: CellarWine[], limit = 3): WindowBucket {
  return {
    bottles: wines.reduce((s, w) => s + w.quantity, 0),
    wines: wines.slice(0, limit).map((w) => ({ id: w.id, label: wineLabel(w) })),
  };
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildDrinkingWindow(cellar: CellarWine[]): DrinkingWindowInsight {
  const currentYear = new Date().getFullYear();
  const drinkSoon: CellarWine[] = [];
  const atPeak: CellarWine[] = [];
  const tooYoung: CellarWine[] = [];

  for (const w of cellar) {
    const dw = w.koopjeschecker.drinkingWindow;
    const status = deriveWindowStatus(dw);
    if (status === 'past_peak' || dw.to - currentYear <= 1) drinkSoon.push(w);
    else if (status === 'peak') atPeak.push(w);
    else if (status === 'too_young') tooYoung.push(w);
  }

  // Most urgent first: earliest closing window
  drinkSoon.sort((a, b) => a.koopjeschecker.drinkingWindow.to - b.koopjeschecker.drinkingWindow.to);

  return {
    drinkSoon: bucket(drinkSoon),
    atPeak: bucket(atPeak),
    tooYoung: bucket(tooYoung),
  };
}

function buildBalance(cellar: CellarWine[], totalBottles: number): BalanceInsight {
  const countries = new Map<string, number>();
  const regions = new Map<string, number>();
  const grapes = new Map<string, number>();
  const styles = new Map<string, number>();

  for (const w of cellar) {
    const g = w.koopjeschecker.general;
    countries.set(g.country, (countries.get(g.country) ?? 0) + w.quantity);
    regions.set(g.region, (regions.get(g.region) ?? 0) + w.quantity);
    for (const grape of g.grapes) {
      grapes.set(grape, (grapes.get(grape) ?? 0) + w.quantity);
    }
    const style = detectStyle(w);
    styles.set(style, (styles.get(style) ?? 0) + w.quantity);
  }

  return {
    countries: topEntries(countries, totalBottles, 3),
    regions: topEntries(regions, totalBottles, 3),
    grapes: topEntries(grapes, totalBottles, 3),
    styles: topEntries(styles, totalBottles, 4),
  };
}

function buildGaps(cellar: CellarWine[], balance: BalanceInsight, totalBottles: number): string[] {
  const gaps: string[] = [];

  const styleNames = new Set(cellar.map(detectStyle));
  const bordeauxBottles = cellar
    .filter((w) => detectStyle(w) === 'Bordeaux')
    .reduce((s, w) => s + w.quantity, 0);

  if (!styleNames.has('Sparkling')) {
    gaps.push('No sparkling wines — nothing on hand for celebrations.');
  }
  if (bordeauxBottles === 0) {
    gaps.push('No Bordeaux in the cellar.');
  } else if (bordeauxBottles / totalBottles < 0.05) {
    gaps.push('Very few Bordeaux wines.');
  }

  const whites = cellar.filter((w) => w.koopjeschecker.style.color === 'white');
  if (whites.length === 0) {
    gaps.push('No white wines — limited options for fish or aperitifs.');
  } else {
    const matureWhites = whites.filter((w) =>
      ['ready', 'peak'].includes(deriveWindowStatus(w.koopjeschecker.drinkingWindow))
    );
    if (matureWhites.length === 0) {
      gaps.push('No mature white wines ready to drink.');
    }
  }

  const italyBottles = cellar
    .filter((w) => w.koopjeschecker.general.country.toLowerCase() === 'italy')
    .reduce((s, w) => s + w.quantity, 0);
  if (italyBottles / totalBottles > 0.7 && totalBottles >= 5) {
    gaps.push('Limited diversity outside Italy — over 70% of the cellar is Italian.');
  }

  const topRegion = balance.regions[0];
  if (topRegion && topRegion.percent > 50 && totalBottles >= 5) {
    gaps.push(`${topRegion.name} dominates with ${topRegion.percent}% of all bottles.`);
  }

  return gaps;
}

function buildPurchase(cellar: CellarWine[], totalBottles: number): PurchaseInsight {
  const priced = cellar.filter((w) => w.purchasePrice > 0);
  const pricedBottles = priced.reduce((s, w) => s + w.quantity, 0);
  const totalValue = priced.reduce((s, w) => s + w.purchasePrice * w.quantity, 0);
  const estimatedValue = cellar.reduce((s, w) => {
    const status = deriveWindowStatus(w.koopjeschecker.drinkingWindow);
    return s + estimateCellarValue(w.purchasePrice, status, w.personalRating) * w.quantity;
  }, 0);

  return {
    totalBottles,
    uniqueWines: cellar.length,
    totalValue: Math.round(totalValue * 100) / 100,
    avgBottleValue: pricedBottles > 0 ? Math.round((totalValue / pricedBottles) * 100) / 100 : 0,
    estimatedValue: Math.round(estimatedValue * 100) / 100,
  };
}

function buildTasteSummary(cellar: CellarWine[], balance: BalanceInsight, totalBottles: number): string {
  // Quantity-weighted structural averages
  let body = 0, acidity = 0, tannin = 0, sweetness = 0;
  for (const w of cellar) {
    const p = w.koopjeschecker.structure.profile;
    body += p.body * w.quantity;
    acidity += p.acidity * w.quantity;
    tannin += p.tannin * w.quantity;
    sweetness += p.sweetness * w.quantity;
  }
  body /= totalBottles; acidity /= totalBottles; tannin /= totalBottles; sweetness /= totalBottles;

  const bodyWord = body >= 7.5 ? 'rich, full-bodied' : body >= 6 ? 'medium- to full-bodied' : 'lighter-styled';
  const withTraits: string[] = [];
  if (sweetness >= 6.5) withTraits.push('ripe fruit');
  if (tannin <= 5.5) withTraits.push('soft tannins');
  else if (tannin >= 7.5) withTraits.push('firm structure');
  if (acidity <= 4.5) withTraits.push('low acidity');
  const withClause =
    withTraits.length > 1
      ? ` with ${withTraits.slice(0, -1).join(', ')} and ${withTraits[withTraits.length - 1]}`
      : withTraits.length === 1
      ? ` with ${withTraits[0]}`
      : '';

  const redBottles = cellar
    .filter((w) => w.koopjeschecker.style.color === 'red')
    .reduce((s, w) => s + w.quantity, 0);
  const colourWord = redBottles / totalBottles >= 0.8 ? 'red wines' : 'wines';

  const first = `Your cellar reflects a clear preference for ${bodyWord} ${colourWord}${withClause}.`;

  const namedStyles = balance.styles
    .filter((s) => !['Other red', 'White wine', 'Rosé', 'Sparkling'].includes(s.name))
    .slice(0, 3)
    .map((s) => s.name);
  const topCountry = balance.countries[0];

  let second = '';
  if (namedStyles.length >= 2) {
    second = ` ${namedStyles.slice(0, -1).join(', ')} and ${namedStyles[namedStyles.length - 1]} dominate the collection.`;
  } else if (namedStyles.length === 1 && topCountry) {
    second = ` ${namedStyles[0]} leads the collection, anchored in ${topCountry.name}.`;
  } else if (topCountry && topCountry.percent >= 50) {
    second = ` ${topCountry.name} accounts for ${topCountry.percent}% of your bottles.`;
  }

  return first + second;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function getCellarIntelligence(cellar: CellarWine[]): CellarIntelligence {
  const totalBottles = Math.max(1, cellar.reduce((s, w) => s + w.quantity, 0));
  const balance = buildBalance(cellar, totalBottles);

  return {
    drinkingWindow: buildDrinkingWindow(cellar),
    balance,
    gaps: buildGaps(cellar, balance, totalBottles),
    purchase: buildPurchase(cellar, cellar.reduce((s, w) => s + w.quantity, 0)),
    tasteSummary: cellar.length > 0 ? buildTasteSummary(cellar, balance, totalBottles) : '',
  };
}
