/**
 * VinIQ Recommendation Engine — Sprint 4
 *
 * Pure deterministic scoring logic. No LLM calls, no UI imports.
 * All sub-scorers are isolated so the entire scoring layer can be replaced
 * by an AI engine in a later sprint without touching the UI.
 *
 * Public API:
 *   getPersonalisedRecommendations(cellar, context) → RecommendationResult
 */

import type { CellarWine } from './types';
import { deriveWindowStatus } from './utils';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RecommendationContext {
  food?: string;
  occasion?: string;
  budget?: number;
}

export type Confidence = 'high' | 'medium' | 'low';
export type Urgency   = 'urgent' | 'now' | 'soon' | 'hold';

export interface PersonalisedRecommendation {
  wine:              CellarWine;
  compositeScore:    number;       // 0–100
  urgency:           Urgency;
  confidence:        Confidence;
  whyThisBottle:     string;
  whyNow:            string;
  expectedExperience:string;
  foodMatch:         string | null;  // null when no food context
  warnings:          string[];
}

export interface BuyInsteadSuggestion {
  reason:      string;
  suggestions: string[];
}

export interface RecommendationResult {
  recommendations: PersonalisedRecommendation[];
  emptyState:      'no_cellar' | 'no_match' | null;
  buyInstead:      BuyInsteadSuggestion | null;
}

// ---------------------------------------------------------------------------
// Sub-scorers — each returns 0–100, independent and replaceable
// ---------------------------------------------------------------------------

function scoreWindow(wine: CellarWine): number {
  const status = deriveWindowStatus(wine.koopjeschecker.drinkingWindow);
  switch (status) {
    case 'peak':      return 100;
    case 'ready':     return 75;
    case 'past_peak': return 60;   // urgent but still worth opening
    case 'too_young': return 20;
    default:          return 50;
  }
}

function scoreMatch(wine: CellarWine): number {
  return wine.koopjeschecker.personalScore.matchPercent;
}

/** Tokenises text into lowercase words (3+ chars), stripping punctuation. */
function tokenise(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3)
  );
}

/**
 * Food scorer — 0–100.
 * Combines direct keyword overlap with broad food-category → wine-style affinity.
 * Returns 50 (neutral) when no food context.
 */
function scoreFood(wine: CellarWine, food: string | undefined): number {
  if (!food || !food.trim()) return 50;

  const kc = wine.koopjeschecker;
  const foodLower = food.toLowerCase();
  const foodTokens = tokenise(food);

  // Build pairing text from all available label data
  const pairingText = [
    ...kc.foodPairing.dishes,
    kc.foodPairing.notes,
    ...kc.style.styleTags,
    kc.style.styleSummary,
  ].join(' ');
  const pairingTokens = tokenise(pairingText);

  // Direct keyword overlap score
  const overlap = [...foodTokens].filter((w) => pairingTokens.has(w)).length;
  const directScore = Math.min(70, overlap * 25);

  // Category affinity bonuses based on broad food type
  const p = kc.structure.profile;
  const styleLower = (kc.style.styleSummary + ' ' + kc.style.styleTags.join(' ')).toLowerCase();
  let bonus = 0;

  if (/steak|beef|lamb|pork|ribs|burger|venison|wild boar|meat/.test(foodLower)) {
    // Red meat → full body + structured tannins
    if (p.body >= 8 && p.tannin >= 5) bonus = 35;
    else if (p.body >= 7) bonus = 20;
  }
  if (/bbq|barbecue|grill|grilled|smoked|smoky/.test(foodLower)) {
    // BBQ → full body + ripe sweet fruit
    if (p.body >= 8 && p.sweetness >= 6) bonus = 40;
    else if (p.body >= 7) bonus = 20;
    else if (kc.style.color !== 'red') bonus = -15;
  }
  if (/pasta|lasagna|lasagne|pizza|risotto|rag[uù]|tomato/.test(foodLower)) {
    // Italian food → Italian grapes are ideal
    if (/sangiovese|primitivo|montepulciano|corvina|ripasso|valpolicella/i.test(
        kc.general.grapes.join(' ') + ' ' + styleLower)) {
      bonus = Math.max(bonus, 35);
    } else if (p.acidity >= 5 && p.body >= 6) bonus = Math.max(bonus, 15);
  }
  if (/cheese|fromage/.test(foodLower)) {
    // Cheese → medium body, moderate tannins
    if (p.body >= 6 && p.tannin <= 7) bonus = Math.max(bonus, 25);
  }
  if (/fish|salmon|tuna|seafood|oyster|prawn|shrimp|lobster/.test(foodLower)) {
    // Fish → whites or sparkling; penalise full-bodied reds
    if (kc.style.color === 'white' || kc.style.color === 'sparkling') bonus = Math.max(bonus, 45);
    else if (p.body <= 5) bonus = Math.max(bonus, 15);
    else bonus = Math.min(bonus, -20);
  }
  if (/chocolate|dessert|cake/.test(foodLower)) {
    if (p.sweetness >= 8) bonus = Math.max(bonus, 30);
    else if (p.sweetness >= 6) bonus = Math.max(bonus, 15);
  }
  if (/aperitif|starter|antipasti|bruschetta/.test(foodLower)) {
    if (kc.style.color === 'sparkling') bonus = Math.max(bonus, 40);
    else if (kc.style.color === 'white') bonus = Math.max(bonus, 20);
    else if (p.body >= 8) bonus = Math.min(bonus, -10);
  }

  return Math.max(0, Math.min(100, directScore + bonus));
}

/**
 * Occasion scorer — 0–100.
 * Returns 50 (neutral) when no occasion.
 */
function scoreOccasion(wine: CellarWine, occasion: string | undefined): number {
  if (!occasion) return 50;

  const kc = wine.koopjeschecker;
  const p = kc.structure.profile;
  const match = kc.personalScore.matchPercent;
  const nameLower = (kc.general.wineName + ' ' + kc.general.producer).toLowerCase();
  const ageing = kc.cellarAdvice.ageingPotentialYears;

  switch (occasion) {
    case 'Weeknight':
      // Accessible, everyday wines; avoid opening prestige bottles
      if (p.body <= 7 && ageing <= 8) return 85;
      if (ageing >= 15 && (nameLower.includes('brunello') || nameLower.includes('barolo'))) return 25;
      return 60;

    case 'Friends':
      // Crowd-pleasing; ripe, fruit-forward, not austere
      if (p.body >= 7 && p.sweetness >= 6 && p.tannin <= 7) return 85;
      if (p.body >= 6 && p.acidity <= 6) return 70;
      return 50;

    case 'Celebration':
      // Pull out the best; sparkling is the obvious opener
      if (kc.style.color === 'sparkling') return 95;
      if (match >= 85 && ageing >= 10) return 90;
      if (nameLower.includes('amarone') || nameLower.includes('brunello')) return 85;
      if (match >= 70) return 70;
      return 50;

    case 'BBQ':
      // Full body, ripe fruit, soft tannins — Primitivo / Grenache ideal
      if (p.body >= 8 && p.sweetness >= 7 && p.tannin <= 6) return 95;
      if (p.body >= 7 && p.sweetness >= 6) return 75;
      if (kc.style.color === 'white' || kc.style.color === 'sparkling') return 25;
      return 55;

    case 'Date Night':
      // Premium and memorable
      if (match >= 85 && ageing >= 12) return 95;
      if (nameLower.includes('amarone') || nameLower.includes('brunello')) return 90;
      if (match >= 75) return 80;
      return 55;

    default:
      return 50;
  }
}

/**
 * Budget scorer — 100 if within budget or unknown, scales down if over.
 */
function scoreBudget(wine: CellarWine, budget: number | undefined): number {
  if (!budget) return 100;
  const price = wine.purchasePrice || wine.koopjeschecker.general.price || 0;
  if (price === 0) return 80; // price unknown — neutral, don't penalise
  if (price <= budget) return 100;
  const overage = (price - budget) / budget;
  return Math.max(0, Math.round(100 - overage * 80));
}

// ---------------------------------------------------------------------------
// Composite weights — the single place to rebalance scoring priorities
// ---------------------------------------------------------------------------

const WEIGHTS = {
  window:   0.30,
  match:    0.35,
  food:     0.20,
  occasion: 0.10,
  budget:   0.05,
} as const;

function getCompositeScore(
  wine: CellarWine,
  ctx: RecommendationContext
): { total: number; fScore: number; oScore: number } {
  const wScore = scoreWindow(wine);
  const mScore = scoreMatch(wine);
  const fScore = scoreFood(wine, ctx.food);
  const oScore = scoreOccasion(wine, ctx.occasion);
  const bScore = scoreBudget(wine, ctx.budget);
  const total = Math.round(
    wScore * WEIGHTS.window +
    mScore * WEIGHTS.match +
    fScore * WEIGHTS.food +
    oScore * WEIGHTS.occasion +
    bScore * WEIGHTS.budget
  );
  return { total, fScore, oScore };
}

// ---------------------------------------------------------------------------
// Explanation builders — human-readable text from structured data
// ---------------------------------------------------------------------------

function describeStructure(wine: CellarWine): string {
  const p = wine.koopjeschecker.structure.profile;
  const parts: string[] = [];
  if (p.body >= 8)       parts.push('full body');
  else if (p.body >= 6)  parts.push('medium-full body');
  if (p.acidity <= 4)    parts.push('low acidity');
  if (p.tannin <= 5)     parts.push('soft tannins');
  else if (p.tannin >= 8) parts.push('firm tannins');
  if (p.sweetness >= 7)  parts.push('ripe fruit');
  return parts.join(', ') || 'expressive character';
}

function buildWhyThisBottle(
  wine: CellarWine,
  ctx: RecommendationContext,
  fScore: number,
  oScore: number
): string {
  const kc = wine.koopjeschecker;
  const match = kc.personalScore.matchPercent;
  const parts: string[] = [];

  // Personal match
  if (match >= 85) {
    parts.push(`Excellent personal match (${match}%) — hits your preference for ${describeStructure(wine)}.`);
  } else if (match >= 65) {
    parts.push(`Good personal fit (${match}%) with your taste for full-bodied, fruit-driven wines.`);
  } else {
    parts.push(`Moderate personal match (${match}%).`);
  }

  // Food context
  if (ctx.food) {
    const dishes = kc.foodPairing.dishes.slice(0, 2).join(' and ');
    if (fScore >= 65) {
      parts.push(`Pairs well with ${ctx.food}${dishes ? ` — classic matches: ${dishes}` : ''}.`);
    } else if (fScore >= 40) {
      parts.push(`A reasonable companion for ${ctx.food}, though not its ideal pairing.`);
    }
  }

  // Occasion
  if (ctx.occasion && oScore >= 75) {
    parts.push(`Well suited to a ${ctx.occasion.toLowerCase()} setting.`);
  }

  return parts.join(' ') || kc.personalScore.reasoning;
}

function buildWhyNow(wine: CellarWine): string {
  const kc = wine.koopjeschecker;
  const dw = kc.drinkingWindow;
  const status = deriveWindowStatus(dw);
  const currentYear = new Date().getFullYear();

  switch (status) {
    case 'past_peak':
      return `Past its drinking window (closed ${dw.to}) — complexity is declining each month. Open without delay.`;
    case 'peak':
      return `${currentYear} sits inside its peak window (${dw.peakFrom}–${dw.peakTo}). The wine is fully evolved and showing at its best.`;
    case 'ready': {
      const hasReachedPeak = dw.peakFrom <= currentYear;
      return hasReachedPeak
        ? `Approaching the tail of its peak window (${dw.peakFrom}–${dw.peakTo}). Ready to drink tonight.`
        : `Drinking well now — will reach peak around ${dw.peakFrom} if you prefer to wait.`;
    }
    case 'too_young':
      return `Technically before its window (opens ${dw.from}). Likely to be tight — decant generously if you open it tonight.`;
  }
}

function buildExpectedExperience(wine: CellarWine): string {
  const kc = wine.koopjeschecker;
  const aromas = kc.aromatics.primaryAromas.slice(0, 3).join(', ');
  const base = kc.structure.description || kc.style.styleSummary;
  return aromas ? `${base} Expect aromas of ${aromas.toLowerCase()}.` : base;
}

function buildFoodMatch(wine: CellarWine, food: string | undefined, fScore: number): string | null {
  if (!food) return null;
  const dishes = wine.koopjeschecker.foodPairing.dishes.slice(0, 3).join(', ');
  if (fScore >= 65) return `Good match for ${food}. Typical pairings: ${dishes}.`;
  if (fScore >= 40) return `Reasonable with ${food}, though not the ideal pairing. Best suited to ${dishes}.`;
  return `Less ideal with ${food} — this wine is better suited to ${dishes}.`;
}

function buildWarnings(wine: CellarWine, ctx: RecommendationContext, fScore: number): string[] {
  const kc = wine.koopjeschecker;
  const status = deriveWindowStatus(kc.drinkingWindow);
  const warnings: string[] = [];

  if (status === 'too_young') {
    warnings.push(`Best after ${kc.drinkingWindow.from}. Decant for ${(kc.decanting.decantMinutes || 30) + 30} min if opening tonight.`);
  }
  if (status === 'past_peak') {
    warnings.push(`Past peak since ${kc.drinkingWindow.to}. Do not delay further.`);
  }
  if (kc.drinkingWindow.isEstimated) {
    warnings.push('Drinking window is estimated — vintage or style may be approximate.');
  }
  if (kc.foodPairing.isEstimated && ctx.food) {
    warnings.push('Food pairing is estimated from style template, not this wine\'s specific label.');
  }
  if (ctx.budget) {
    const price = wine.purchasePrice || kc.general.price || 0;
    if (price > 0 && price > ctx.budget) {
      warnings.push(`Purchase price €${price} exceeds your budget of €${ctx.budget}.`);
    }
  }
  if (ctx.food && fScore < 40) {
    warnings.push(`Not an ideal pairing for "${ctx.food}" — consider a different style.`);
  }

  return warnings;
}

function deriveConfidence(wine: CellarWine, score: number): Confidence {
  const scanConf = wine.koopjeschecker.scanMetadata?.confidence;
  const status = deriveWindowStatus(wine.koopjeschecker.drinkingWindow);
  if (scanConf === 'low') return 'low';
  if (score >= 70 && status !== 'too_young' && scanConf !== 'medium') return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

function deriveUrgency(wine: CellarWine): Urgency {
  switch (deriveWindowStatus(wine.koopjeschecker.drinkingWindow)) {
    case 'past_peak': return 'urgent';
    case 'peak':      return 'now';
    case 'ready':     return 'soon';
    case 'too_young': return 'hold';
  }
}

// ---------------------------------------------------------------------------
// Buy-instead suggestions — shown when cellar is empty or no bottle fits
// ---------------------------------------------------------------------------

function buildBuyInstead(
  ctx: RecommendationContext,
  reason: 'no_cellar' | 'no_match'
): BuyInsteadSuggestion {
  const food = ctx.food?.toLowerCase() ?? '';
  const occasion = ctx.occasion ?? '';
  const suggestions: string[] = [];

  if (reason === 'no_cellar') {
    suggestions.push('Scan a bottle you already own to build your cellar.');
    suggestions.push('Import your existing collection via the Import Cellar feature.');
    suggestions.push('Add a bottle manually from the Cellar tab.');
  } else {
    // Contextual suggestions
    if (/steak|beef|lamb|ribs|meat/.test(food) || occasion === 'BBQ') {
      suggestions.push('A Primitivo di Manduria — full body, ripe fruit, perfect for grilled and roasted meat.');
      suggestions.push('An Amarone della Valpolicella — powerful match for rich meat dishes.');
    }
    if (/pasta|lasagna|pizza|tomato/.test(food)) {
      suggestions.push('A Valpolicella Ripasso — ideal everyday Italian red for pasta and tomato dishes.');
    }
    if (/fish|seafood|oyster/.test(food)) {
      suggestions.push('A Chablis Premier Cru or Sancerre — mineral and precise, classic with seafood.');
    }
    if (/cheese|platter/.test(food)) {
      suggestions.push('A Rioja Reserva — versatile with a wide range of cheeses.');
    }
    if (occasion === 'Celebration') {
      suggestions.push('A Champagne or premium Crémant to mark the moment.');
      suggestions.push('A Brunello di Montalcino if the celebration calls for a great red.');
    }
    if (occasion === 'Date Night') {
      suggestions.push('An Amarone della Valpolicella — unforgettable and impressive.');
    }
    if (suggestions.length === 0) {
      suggestions.push('Look for an Amarone, Brunello, or Châteauneuf — your proven preferences.');
      suggestions.push('Scan a bottle in the store to check its Koopjeschecker before buying.');
    }
  }

  const reasonText = reason === 'no_cellar'
    ? 'Your cellar is empty. Here\'s how to get started:'
    : 'No bottle in your cellar is a strong match for this context. Consider buying:';

  return { reason: reasonText, suggestions: suggestions.slice(0, 3) };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function getPersonalisedRecommendations(
  cellar: CellarWine[],
  ctx: RecommendationContext
): RecommendationResult {
  const available = cellar.filter((w) => w.quantity > 0);

  if (available.length === 0) {
    return {
      recommendations: [],
      emptyState: 'no_cellar',
      buyInstead: buildBuyInstead(ctx, 'no_cellar'),
    };
  }

  // Score every bottle
  const scored = available.map((wine) => {
    const { total, fScore, oScore } = getCompositeScore(wine, ctx);
    return { wine, total, fScore, oScore };
  });

  // Sort descending; break ties by window urgency
  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return scoreWindow(b.wine) - scoreWindow(a.wine);
  });

  const top3 = scored.slice(0, 3);
  const MIN_USEFUL_SCORE = 30;

  if (top3.every((s) => s.total < MIN_USEFUL_SCORE)) {
    return {
      recommendations: [],
      emptyState: 'no_match',
      buyInstead: buildBuyInstead(ctx, 'no_match'),
    };
  }

  const recommendations = top3.map(({ wine, total, fScore, oScore }): PersonalisedRecommendation => ({
    wine,
    compositeScore:     total,
    urgency:            deriveUrgency(wine),
    confidence:         deriveConfidence(wine, total),
    whyThisBottle:      buildWhyThisBottle(wine, ctx, fScore, oScore),
    whyNow:             buildWhyNow(wine),
    expectedExperience: buildExpectedExperience(wine),
    foodMatch:          buildFoodMatch(wine, ctx.food, fScore),
    warnings:           buildWarnings(wine, ctx, fScore),
  }));

  return { recommendations, emptyState: null, buyInstead: null };
}
