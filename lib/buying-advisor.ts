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
import { classifyPriceVsAverage } from './purchase-intelligence';

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
  /**
   * How far the scanned price sits above the user's own average for this
   * exact wine (0.2 = 20% above). null when there is no own history to
   * compare against or no scanned price. Drives the price-over-history caps.
   */
  pctAboveOwn: number | null;
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
      pctAboveOwn: null,
    };
  }

  // Best signal: Alexander's own purchase history for this exact wine.
  // Classification is shared with Purchase Intelligence so the pre-purchase
  // advice and the post-purchase verdict can never contradict each other.
  if (existing && existing.purchasePrice > 0) {
    const avg = existing.purchasePrice;
    const pct = (price - avg) / avg;
    const cls = classifyPriceVsAverage(price, avg);
    const pctAboveOwn = pct > 0 ? pct : null;

    switch (cls) {
      case 'excellent':
        return {
          score: 95,
          context: `€${price} is well below the €${avg.toFixed(2)} you paid on average for this wine.`,
          known: true, excellent: true, pctAboveOwn,
        };
      case 'good':
        return {
          score: 80,
          context: `€${price} is slightly below your average of €${avg.toFixed(2)} for this wine.`,
          known: true, excellent: false, pctAboveOwn,
        };
      case 'fair':
        return {
          score: 60,
          context: `€${price} is in line with the €${avg.toFixed(2)} you usually pay for this wine.`,
          known: true, excellent: false, pctAboveOwn,
        };
      case 'expensive': {
        // Graded: the further above his own history, the harder the penalty
        const score = pct > 0.3 ? 5 : pct > 0.2 ? 15 : pct > 0.1 ? 25 : 35;
        const context =
          pct > 0.3
            ? `€${price} is well above the €${avg.toFixed(2)} you usually pay for this wine.`
            : `€${price} is above the €${avg.toFixed(2)} you usually pay for this wine.`;
        return { score, context, known: true, excellent: false, pctAboveOwn };
      }
    }
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
        pctAboveOwn: null,
      };
    }
    if (price <= cellarAvg * 1.4) {
      return {
        score: 62,
        context: `€${price} is around your typical bottle spend of €${cellarAvg.toFixed(2)}.`,
        known: true,
        excellent: false,
        pctAboveOwn: null,
      };
    }
    return {
      score: 50,
      context: `€${price} is above your typical bottle spend of €${cellarAvg.toFixed(2)} — a premium purchase.`,
      known: true,
      excellent: false,
      pctAboveOwn: null,
    };
  }

  // Price known but nothing personal to compare against
  return {
    score: 60,
    context: `€${price} detected — no purchase history yet to compare it against.`,
    known: true,
    excellent: false,
    pctAboveOwn: null,
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

/** Verdict order, worst → best, for applying caps. */
const VERDICT_ORDER: BuyingVerdict[] = ['avoid', 'skip', 'consider', 'buy', 'strong_buy'];

function capVerdict(verdict: BuyingVerdict, cap: BuyingVerdict): BuyingVerdict {
  return VERDICT_ORDER.indexOf(verdict) > VERDICT_ORDER.indexOf(cap) ? cap : verdict;
}

function deriveVerdict(
  score: number,
  matchPercent: number,
  pastPeak: boolean,
  price: PriceAssessment,
  lowConfidenceScan: boolean,
  owned: number
): BuyingVerdict {
  // Hard floor: a wine that clearly misses his palate is never a buy, whatever the deal
  if (matchPercent < 40) return score >= 30 ? 'skip' : 'avoid';
  let verdict: BuyingVerdict =
    score >= 85 ? 'strong_buy' : score >= 70 ? 'buy' : score >= 50 ? 'consider' : score >= 30 ? 'skip' : 'avoid';

  // Past-peak wines are at best a considered single-bottle punt
  if (pastPeak) verdict = capVerdict(verdict, 'consider');

  // Never a Strong Buy without price data or on a shaky label read — the data
  // doesn't support that level of certainty, whatever the score says
  if (!price.known || lowConfidenceScan) verdict = capVerdict(verdict, 'buy');

  // Price-over-own-history caps (aligned with Purchase Intelligence: anything
  // >5% above his own average is an "expensive" purchase the moment it's made,
  // so the advisor must not talk him into it beforehand).
  const pctOver = price.pctAboveOwn ?? 0;
  if (pctOver > 0.3) verdict = capVerdict(verdict, 'skip');
  else if (pctOver > 0.2) verdict = capVerdict(verdict, 'consider');
  else if (pctOver > 0.05) verdict = capVerdict(verdict, 'buy');

  // The verdict judges the BUYING decision, not just the wine: with deep stock
  // of the same wine, buying more is rarely the right call however good it is.
  // 12+: cap at consider — unless the price clearly beats his own history,
  // which justifies a top-up (buy), but never a strong buy.
  if (owned >= 12) verdict = capVerdict(verdict, price.excellent ? 'buy' : 'consider');
  else if (owned >= 6) verdict = capVerdict(verdict, 'buy');

  return verdict;
}

function deriveQuantity(
  verdict: BuyingVerdict,
  owned: number,
  price: PriceAssessment,
  matchPercent: number,
  pastPeak: boolean,
  confidence: BuyingConfidence
): RecommendedQuantity {
  const pctOver = price.pctAboveOwn ?? 0;

  // >30% above his own price: a token bottle at most, and only for a wine he loves
  if (pctOver > 0.3) return matchPercent >= 85 ? 1 : 0;

  if (verdict === 'skip' || verdict === 'avoid') return 0;
  if (pastPeak) return verdict === 'consider' ? 1 : 0;
  if (verdict === 'consider') return 1;

  // An "expensive" price vs his own history (Purchase Intelligence terms):
  // never stock up at a price he'd regret the moment it hits the ledger
  if (pctOver > 0.05) return 1;

  // 12+ owned: usually stop, max a top-up bottle even on a great deal
  if (owned >= 12) return 1;
  // 6+ owned: only add meaningfully when price/match are very strong
  // (verdict is already capped at 'buy' by deriveVerdict at this stock level)
  if (owned >= 6) return price.excellent || matchPercent >= 90 ? 2 : 1;

  if (verdict === 'buy') return owned >= 3 ? 2 : 3;

  // strong_buy
  if (!price.known) return 3; // never recommend a case without price data
  // A full case only in the exceptional alignment: outstanding match, a price
  // that clearly beats his own history, low stock, and high-confidence data
  if (price.excellent && matchPercent >= 90 && owned <= 2 && confidence === 'high') return 12;
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
    price,
    kc.scanMetadata?.confidence === 'low',
    owned
  );
  const confidence = deriveConfidence(kc, price, cellar.length === 0);
  const recommendedQuantity = deriveQuantity(verdict, owned, price, matchPercent, pastPeak, confidence);
  const pctOver = price.pctAboveOwn ?? 0;

  // ── Reasoning bullets (3–5) ───────────────────────────────────────────────
  const reasoning: string[] = [];
  if (matchPercent >= 85) reasoning.push(`Excellent match for your taste profile (${matchPercent}%).`);
  else if (matchPercent >= 65) reasoning.push(`Good fit for your taste profile (${matchPercent}%).`);
  else if (matchPercent >= 40) reasoning.push(`Only a moderate match for your taste profile (${matchPercent}%).`);
  else reasoning.push(`Poor match for your taste profile (${matchPercent}%) — the deciding factor.`);

  reasoning.push(price.context);
  if (matchPercent >= 85 && pctOver > 0.1) {
    reasoning.push('Good taste match, but not a strong buying moment — wait for a better price.');
  }
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
  if (pctOver > 0.3) {
    warnings.push(`Well above what you usually pay for this wine (${Math.round(pctOver * 100)}% higher) — this is not the moment to buy.`);
  } else if (pctOver > 0.1) {
    warnings.push('This is above what you usually pay for this wine.');
  }
  if (owned > 0 && pctOver > 0.05 && pctOver <= 0.3) {
    warnings.push(`You already own ${owned} bottle${owned !== 1 ? 's' : ''}, and this price is not especially attractive.`);
  }
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
