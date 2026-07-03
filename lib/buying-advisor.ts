/**
 * Buying Advisor — Sprint 9
 *
 * Turns a scan result into a personal buying decision: should Alexander buy
 * this wine, is the price right for him, and how many bottles make sense.
 *
 * Fully deterministic — no LLM, no storage access, no UI imports. Takes the
 * Koopjeschecker produced by a scan plus the current cellar, and returns a
 * structured BuyingAdvice. Never invents market prices: when price data is
 * missing the advisor lowers its confidence and says so instead of guessing.
 *
 * Public API:
 *   getBuyingAdvice(kc, cellar) → BuyingAdvice
 */

import type { CellarWine, Koopjeschecker } from './types';
import { deriveWindowStatus } from './utils';
import { findExistingCellarEntry } from './purchase-ledger';
import { detectStyle } from './cellar-intelligence';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type BuyingVerdict = 'strong_buy' | 'buy' | 'consider' | 'skip' | 'avoid';
export type BuyingConfidence = 'high' | 'medium' | 'low';
export type RecommendedQuantity = 0 | 1 | 2 | 3 | 6 | 12;

export interface CellarContext {
  ownedBottles: number;
  avgPurchasePrice: number; // 0 when unknown
}

export interface BuyingAdvice {
  decisionScore: number;            // 0–100
  verdict: BuyingVerdict;
  recommendedQuantity: RecommendedQuantity;
  headline: string;
  reasoning: string[];              // 3–5 bullets
  warnings: string[];
  cellarContext: CellarContext | null; // null when this wine is not in the cellar
  priceContext: string;             // how the price was judged (or why it couldn't be)
  confidence: BuyingConfidence;
}

// ---------------------------------------------------------------------------
// Factor scorers — each 0–100, weighted into the decision score
// ---------------------------------------------------------------------------

const WEIGHTS = { match: 0.55, price: 0.2, window: 0.15, balance: 0.1 } as const;

interface PriceAssessment {
  score: number;
  context: string;
  known: boolean;
  /** true when price is clearly excellent vs the user's OWN history */
  excellent: boolean;
}

function assessPrice(
  kc: Koopjeschecker,
  cellar: CellarWine[],
  existing: CellarWine | undefined
): PriceAssessment {
  const price = kc.scanMetadata?.promotionPrice ?? kc.general.price ?? 0;

  if (price <= 0) {
    return {
      score: 50,
      context: 'No price was detected on this scan, so value could not be judged.',
      known: false,
      excellent: false,
    };
  }

  // Best signal: Alexander's own purchase history for this exact wine
  if (existing && existing.purchasePrice > 0) {
    const diff = price - existing.purchasePrice;
    const pct = diff / existing.purchasePrice;
    if (pct <= -0.08) {
      return {
        score: 95,
        context: `€${price} is well below the €${existing.purchasePrice.toFixed(2)} you paid on average for this wine.`,
        known: true,
        excellent: true,
      };
    }
    if (pct <= -0.02) {
      return {
        score: 80,
        context: `€${price} is slightly below your average of €${existing.purchasePrice.toFixed(2)} for this wine.`,
        known: true,
        excellent: false,
      };
    }
    if (pct <= 0.05) {
      return {
        score: 60,
        context: `€${price} is in line with the €${existing.purchasePrice.toFixed(2)} you usually pay for this wine.`,
        known: true,
        excellent: false,
      };
    }
    return {
      score: 35,
      context: `€${price} is above the €${existing.purchasePrice.toFixed(2)} you usually pay for this wine.`,
      known: true,
      excellent: false,
    };
  }

  // Second signal: average bottle price across the cellar
  const priced = cellar.filter((w) => w.purchasePrice > 0);
  const pricedBottles = priced.reduce((s, w) => s + w.quantity, 0);
  if (pricedBottles > 0) {
    const cellarAvg = priced.reduce((s, w) => s + w.purchasePrice * w.quantity, 0) / pricedBottles;
    if (price <= cellarAvg * 0.8) {
      return {
        score: 72,
        context: `€${price} is below your typical bottle spend of €${cellarAvg.toFixed(2)}.`,
        known: true,
        excellent: false,
      };
    }
    if (price <= cellarAvg * 1.4) {
      return {
        score: 62,
        context: `€${price} is around your typical bottle spend of €${cellarAvg.toFixed(2)}.`,
        known: true,
        excellent: false,
      };
    }
    return {
      score: 50,
      context: `€${price} is above your typical bottle spend of €${cellarAvg.toFixed(2)} — a premium purchase.`,
      known: true,
      excellent: false,
    };
  }

  // Price known but nothing personal to compare against
  return {
    score: 60,
    context: `€${price} detected — no purchase history yet to compare it against.`,
    known: true,
    excellent: false,
  };
}

function assessWindow(kc: Koopjeschecker): { score: number; note: string } {
  const status = deriveWindowStatus(kc.drinkingWindow);
  const dw = kc.drinkingWindow;
  const cellarWorthy = kc.cellarAdvice.ageingPotentialYears >= 12;

  switch (status) {
    case 'peak':
      return { score: 90, note: `Currently at its peak (${dw.peakFrom}–${dw.peakTo}) — drinkable straight away.` };
    case 'ready':
      return { score: 78, note: `Ready to drink now, with its peak around ${dw.peakFrom}–${dw.peakTo}.` };
    case 'too_young':
      return cellarWorthy
        ? { score: 65, note: `Too young now, but a genuine cellaring wine (${kc.cellarAdvice.ageingPotentialYears}+ years of potential).` }
        : { score: 35, note: `Too young to drink before ${dw.from}, without standout ageing potential.` };
    case 'past_peak':
      return { score: 20, note: `Past its drinking window (closed ${dw.to}) — buying now means racing the decline.` };
  }
}

function assessBalance(
  kc: Koopjeschecker,
  cellar: CellarWine[],
  matchPercent: number
): { score: number; note: string | null } {
  if (cellar.length === 0) return { score: 60, note: null };

  const totalBottles = Math.max(1, cellar.reduce((s, w) => s + w.quantity, 0));

  // Style/country concentration — probe with a synthetic CellarWine wrapper
  const probe: CellarWine = {
    id: 'probe', producer: kc.general.producer, wineName: kc.general.wineName,
    vintage: kc.general.vintage, quantity: 0, purchasePrice: 0, personalRating: 0,
    notes: '', koopjeschecker: kc, addedAt: '',
  };
  const style = detectStyle(probe);
  const styleBottles = cellar
    .filter((w) => detectStyle(w) === style)
    .reduce((s, w) => s + w.quantity, 0);
  const country = kc.general.country;
  const countryBottles = country !== 'Unknown'
    ? cellar.filter((w) => w.koopjeschecker.general.country === country).reduce((s, w) => s + w.quantity, 0)
    : 0;

  const styleShare = styleBottles / totalBottles;

  if (styleBottles === 0) {
    const countryNew = country !== 'Unknown' && countryBottles === 0;
    return {
      score: 75,
      note: countryNew
        ? `Adds something new — you have no ${style} and nothing from ${country} yet.`
        : `Adds diversity — your cellar has no ${style} yet.`,
    };
  }
  if (styleShare > 0.5) {
    // Don't over-penalise a wine that strongly matches his taste
    return {
      score: matchPercent >= 85 ? 55 : 45,
      note: `Your cellar is already concentrated in ${style} (${Math.round(styleShare * 100)}% of bottles).`,
    };
  }
  return { score: 60, note: null };
}

// ---------------------------------------------------------------------------
// Verdict, quantity, confidence
// ---------------------------------------------------------------------------

function deriveVerdict(
  score: number,
  matchPercent: number,
  pastPeak: boolean,
  priceKnown: boolean,
  lowConfidenceScan: boolean,
  owned: number,
  priceExcellent: boolean
): BuyingVerdict {
  // Hard floor: a wine that clearly misses his palate is never a buy, whatever the deal
  if (matchPercent < 40) return score >= 30 ? 'skip' : 'avoid';
  let verdict: BuyingVerdict =
    score >= 85 ? 'strong_buy' : score >= 70 ? 'buy' : score >= 50 ? 'consider' : score >= 30 ? 'skip' : 'avoid';
  // Past-peak wines are at best a considered single-bottle punt
  if (pastPeak && (verdict === 'strong_buy' || verdict === 'buy')) verdict = 'consider';
  // Never a Strong Buy without price data or on a shaky label read — the data
  // doesn't support that level of certainty, whatever the score says
  if (verdict === 'strong_buy' && (!priceKnown || lowConfidenceScan)) verdict = 'buy';
  // The verdict judges the BUYING decision, not just the wine: with deep stock
  // of the same wine, buying more is rarely the right call however good it is.
  // 12+: cap at consider — unless the price clearly beats his own history,
  // which justifies a top-up (buy), but never a strong buy.
  if (owned >= 12 && (verdict === 'strong_buy' || verdict === 'buy')) {
    verdict = priceExcellent ? 'buy' : 'consider';
  } else if (owned >= 6 && verdict === 'strong_buy') {
    verdict = 'buy';
  }
  return verdict;
}

function deriveQuantity(
  verdict: BuyingVerdict,
  owned: number,
  price: PriceAssessment,
  matchPercent: number,
  pastPeak: boolean
): RecommendedQuantity {
  if (verdict === 'skip' || verdict === 'avoid') return 0;
  if (pastPeak) return verdict === 'consider' ? 1 : 0;
  if (verdict === 'consider') return 1;

  // 12+ owned: usually stop, max a top-up bottle even on a great deal
  if (owned >= 12) return 1;
  // 6+ owned: only add meaningfully when price/match are very strong
  // (verdict is already capped at 'buy' by deriveVerdict at this stock level)
  if (owned >= 6) return price.excellent || matchPercent >= 90 ? 2 : 1;

  if (verdict === 'buy') return owned >= 3 ? 2 : 3;

  // strong_buy
  if (!price.known) return 3; // never recommend a case without price data
  if (price.excellent && matchPercent >= 90 && owned <= 2) return 12;
  return 6;
}

function deriveConfidence(
  kc: Koopjeschecker,
  price: PriceAssessment,
  cellarEmpty: boolean
): BuyingConfidence {
  const scan = kc.scanMetadata?.confidence;
  if (scan === 'low') return 'low';
  if (scan === 'medium' || !price.known || cellarEmpty || kc.scanMetadata?.vintageEstimated) return 'medium';
  return 'high';
}

const HEADLINES: Record<BuyingVerdict, string> = {
  strong_buy: 'An excellent buy for your cellar',
  buy: 'A good buy',
  consider: 'Worth considering',
  skip: 'You can pass on this one',
  avoid: 'Not one for your cellar',
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function getBuyingAdvice(kc: Koopjeschecker, cellar: CellarWine[]): BuyingAdvice {
  const matchPercent = kc.personalScore.matchPercent;
  const existing = findExistingCellarEntry(kc, cellar);
  const owned = existing?.quantity ?? 0;
  const status = deriveWindowStatus(kc.drinkingWindow);
  const pastPeak = status === 'past_peak';

  const price = assessPrice(kc, cellar, existing);
  const window = assessWindow(kc);
  const balance = assessBalance(kc, cellar, matchPercent);

  const decisionScore = Math.round(
    matchPercent * WEIGHTS.match +
    price.score * WEIGHTS.price +
    window.score * WEIGHTS.window +
    balance.score * WEIGHTS.balance
  );

  const verdict = deriveVerdict(
    decisionScore,
    matchPercent,
    pastPeak,
    price.known,
    kc.scanMetadata?.confidence === 'low',
    owned,
    price.excellent
  );
  const recommendedQuantity = deriveQuantity(verdict, owned, price, matchPercent, pastPeak);
  const confidence = deriveConfidence(kc, price, cellar.length === 0);

  // ── Reasoning bullets (3–5) ───────────────────────────────────────────────
  const reasoning: string[] = [];
  if (matchPercent >= 85) reasoning.push(`Excellent match for your taste profile (${matchPercent}%).`);
  else if (matchPercent >= 65) reasoning.push(`Good fit for your taste profile (${matchPercent}%).`);
  else if (matchPercent >= 40) reasoning.push(`Only a moderate match for your taste profile (${matchPercent}%).`);
  else reasoning.push(`Poor match for your taste profile (${matchPercent}%) — the deciding factor.`);

  reasoning.push(price.context);
  reasoning.push(window.note);
  if (balance.note) reasoning.push(balance.note);
  if (owned > 0) {
    reasoning.push(`You currently own ${owned} bottle${owned !== 1 ? 's' : ''} of this wine.`);
  } else if (cellar.length > 0) {
    reasoning.push('You own no bottles of this wine yet.');
  }
  if (recommendedQuantity === 12) {
    reasoning.push('A case makes sense here: the price beats your own buying history, the match is outstanding, and your stock is low.');
  }

  // ── Warnings ──────────────────────────────────────────────────────────────
  const warnings: string[] = [];
  const profile = kc.structure.profile;
  if (profile.acidity >= 8) warnings.push('High acidity — historically less suited to your palate.');
  const age = kc.general.vintage > 0 ? new Date().getFullYear() - kc.general.vintage : null;
  if (profile.tannin >= 8 && age !== null && age <= 3) warnings.push('Firm tannins on a young wine — expect austerity if opened soon.');
  if (owned >= 6) warnings.push(`Already well stocked: ${owned} bottles of this wine in the cellar.`);
  if (!price.known) warnings.push('Price unknown — the advice ignores value entirely.');
  if (status === 'too_young') warnings.push(`Not drinkable before ${kc.drinkingWindow.from}.`);
  if (pastPeak) warnings.push('Past its drinking window — drink immediately if bought.');
  if (kc.scanMetadata?.confidence === 'low') warnings.push('Low-confidence label read — details may be imprecise.');
  if (matchPercent < 50) warnings.push('Style falls outside your known preferences.');
  if (cellar.length === 0) warnings.push('Your cellar is empty — this advice is based mostly on your taste profile and the scan itself.');

  return {
    decisionScore,
    verdict,
    recommendedQuantity,
    headline: HEADLINES[verdict],
    reasoning: reasoning.slice(0, 5),
    warnings,
    cellarContext: existing
      ? { ownedBottles: existing.quantity, avgPurchasePrice: existing.purchasePrice }
      : null,
    priceContext: price.context,
    confidence,
  };
}
