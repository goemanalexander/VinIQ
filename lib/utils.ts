import type { DrinkWindowStatus } from './types';

/** Generates a reasonably unique id without external deps. */
export function genId(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 9);
  const time = Date.now().toString(36).slice(-5);
  return `${prefix}-${time}${rand}`;
}

export function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyExact(value: number | undefined): string {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Derive drinking window status from current year. */
export function deriveDrinkWindowStatus(
  drinkFrom?: number,
  drinkTo?: number,
  year = new Date().getFullYear()
): DrinkWindowStatus {
  if (!drinkFrom && !drinkTo) return 'unknown';
  if (drinkFrom && year < drinkFrom) return 'too_young';
  if (drinkTo && year > drinkTo) return 'past_peak';
  return 'ready';
}

export const DRINK_WINDOW_LABEL: Record<DrinkWindowStatus, string> = {
  too_young: 'Te jong — nog wachten',
  ready: 'Drinkklaar',
  peak: 'Op zijn best — nu drinken',
  past_peak: 'Voorbij hoogtepunt — snel drinken',
  unknown: 'Drinkvenster onbekend',
};

export const DRINK_WINDOW_COLOR: Record<DrinkWindowStatus, string> = {
  too_young: 'text-blue-400',
  ready: 'text-green-400',
  peak: 'text-gold-400',
  past_peak: 'text-burgundy-400',
  unknown: 'text-cream-300/40',
};

/** Estimate market value per bottle based on appellation + age.
 *  Used as a fallback when no MarketValuation record exists. */
export function estimateMarketValue(wine: {
  appellation: string;
  region: string;
  grapes: string[];
  vintage: number | null;
  avgPurchasePrice: number;
}): number {
  const app = wine.appellation.toLowerCase();
  const region = wine.region.toLowerCase();
  const grapes = wine.grapes.map(g => g.toLowerCase()).join(' ');
  const vintage = wine.vintage ?? 2020;
  const age = new Date().getFullYear() - vintage;

  let range: [number, number];

  if (app.includes('brunello di montalcino')) range = [45, 90];
  else if (app.includes('barolo') || app.includes('barbaresco')) range = [35, 75];
  else if (app.includes('amarone')) range = [22, 50];
  else if (app.includes('châteauneuf') || app.includes('chateauneuf')) range = [25, 55];
  else if (app.includes('primitivo di manduria')) range = [10, 22];
  else if (app.includes('gran reserva') || (app.includes('rioja') && app.includes('reserva'))) range = [15, 35];
  else if (app.includes('reserva') && region.includes('rioja')) range = [10, 20];
  else if (app.includes('ripasso')) range = [12, 25];
  else if (app.includes('valpolicella')) range = [8, 16];
  else if (app.includes('chianti classico') && app.includes('gran selezione')) range = [25, 50];
  else if (app.includes('chianti classico') && app.includes('riserva')) range = [15, 28];
  else if (app.includes('chianti classico')) range = [10, 18];
  else if (app.includes('bolgheri')) range = [18, 45];
  else if (grapes.includes('primitivo') || region.includes('puglia')) range = [7, 15];
  else if (grapes.includes('sangiovese') || region.includes('toscane')) range = [8, 18];
  else if (region.includes('rhône') || region.includes('cévennes')) range = [8, 16];
  else if (region.includes('spanje') || app.includes('cariñena')) range = [8, 18];
  else range = [8, 18];

  const mid = (range[0] + range[1]) / 2;
  const ageFactor = Math.min(1.35, 1 + age * 0.015);
  return Math.round(mid * ageFactor);
}

/** Format a rack position as a readable label, e.g. "A3" */
export function formatRackPosition(row: string, col: number): string {
  return `${row}${col}`;
}

/** Format a bottle location as a Dutch label */
export function formatLocation(location: { type: string; row?: string; col?: number; label?: string }): string {
  if (location.type === 'rack' && location.row && location.col) {
    return `Rek ${location.row}${location.col}`;
  }
  if (location.type === 'outside') {
    return location.label ? `Buiten rek — ${location.label}` : 'Buiten rek';
  }
  return 'Onbekend';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function weightedAvgPrice(acquisitions: Array<{ quantity: number; pricePerBottle: number }>): number {
  const totalQty = acquisitions.reduce((s, a) => s + a.quantity, 0);
  if (totalQty === 0) return 0;
  const totalCents = acquisitions.reduce((s, a) => s + Math.round(a.pricePerBottle * 100) * a.quantity, 0);
  return Math.round(totalCents / totalQty) / 100;
}
