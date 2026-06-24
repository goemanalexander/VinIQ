import type { DrinkingWindow, RecommendedAction } from './types';

/** Generates a reasonably unique id without external deps. */
export function genId(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 9);
  const time = Date.now().toString(36).slice(-5);
  return `${prefix}-${time}${rand}`;
}

export function formatCurrency(value: number | undefined): string {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Combines class names AND derives drinking-window status from current year. */
export function deriveWindowStatus(window: Omit<DrinkingWindow, 'status'>, year = new Date().getFullYear()): DrinkingWindow['status'] {
  if (year < window.from) return 'too_young';
  if (year > window.to) return 'past_peak';
  if (year >= window.peakFrom && year <= window.peakTo) return 'peak';
  return 'ready';
}

export const ACTION_STYLES: Record<RecommendedAction, { label: string; bg: string; text: string; border: string }> = {
  BUY: {
    label: '🔥 BUY',
    bg: 'bg-gradient-to-r from-burgundy-700 to-burgundy-600',
    text: 'text-cream-100',
    border: 'border-gold-500/40',
  },
  CONSIDER: {
    label: '⚠ CONSIDER',
    bg: 'bg-gradient-to-r from-navy-700 to-navy-600',
    text: 'text-gold-300',
    border: 'border-gold-500/30',
  },
  SKIP: {
    label: '❌ SKIP',
    bg: 'bg-navy-800',
    text: 'text-cream-300',
    border: 'border-navy-600',
  },
};

export const WINDOW_STATUS_LABEL: Record<DrinkingWindow['status'], string> = {
  too_young: 'Too young — let it rest',
  ready: 'Ready to drink',
  peak: 'At peak — drink now',
  past_peak: 'Past peak — drink soon',
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Convert internal matchPercent to star rating (1–5) */
export function percentToStars(percent: number): { stars: number; label: string } {
  if (percent >= 90) return { stars: 5, label: 'Exceptional Match' };
  if (percent >= 75) return { stars: 4, label: 'Strong Match' };
  if (percent >= 60) return { stars: 3, label: 'Good Match' };
  if (percent >= 45) return { stars: 2, label: 'Fair Match' };
  return { stars: 1, label: 'Weak Match' };
}

/** Estimate value of a cellar wine based on window status and rating */
export function estimateCellarValue(purchasePrice: number, status: string, personalRating: number): number {
  if (purchasePrice <= 0) return 0;
  const multipliers: Record<string, number> = {
    too_young: 1.25,
    ready: 1.10,
    peak: 1.15,
    past_peak: 0.75,
  };
  const base = multipliers[status] ?? 1.0;
  const ratingBonus = personalRating >= 9 ? 1.15 : personalRating >= 7 ? 1.05 : 1.0;
  return Math.round(purchasePrice * base * ratingBonus);
}
