/**
 * Multi-Image Promotion Advisor — Sprint 10
 *
 * Deterministic orchestration for batch promotion analysis:
 *   1. parseBatchResponses()   — strict-JSON parsing of the per-image OCR output
 *   2. normaliseOffers()       — cleanup, price parsing, effective price-per-bottle,
 *                                conservative cross-image dedupe, needs-review flags
 *   3. buildBatchCandidates()  — runs the EXISTING promotion KC builder and Buying
 *                                Advisor per sufficiently-identified offer
 *   4. groupCandidates()       — ranked result groups for the UI
 *
 * No UI imports. No LLM calls (the vision call happens in the API route).
 * Buying Advisor thresholds are reused, never duplicated.
 */

import type { Koopjeschecker } from './types';
import type { CellarWine } from './types';
import { buildPromotionKc, type DetectedPromotion } from './kc-generator';
import { getBuyingAdvice, type BuyingAdvice } from './buying-advisor';
import type { Structure } from './wine-intel';
import { parseJsonResponse, type BatchImageResult } from './client-api';
import { genId } from './utils';

// ---------------------------------------------------------------------------
// Raw per-image OCR shape (mirrors PROMOTION_BATCH_OCR_PROMPT)
// ---------------------------------------------------------------------------

export type OfferConfidence = 'high' | 'medium' | 'low';

interface RawOffer {
  wineName?: string | null;
  producer?: string | null;
  vintage?: number | null;
  country?: string | null;
  region?: string | null;
  color?: string | null;
  grapes?: string[] | null;
  classification?: string | null;
  ratingOrMedal?: string | null;
  unitPrice?: number | null;
  originalPrice?: number | null;
  packagePrice?: number | null;
  packageBottleCount?: number | null;
  paidBottleCount?: number | null;
  freeBottleCount?: number | null;
  identificationConfidence?: OfferConfidence;
  priceConfidence?: OfferConfidence;
  warnings?: string[] | null;
}

interface RawPageResponse {
  ocrText?: string;
  retailer?: string | null;
  offers?: RawOffer[];
}

export interface ParsedPage {
  imageIndex: number;
  retailer: string | null;
  offers: RawOffer[];
  /** Transport or parse failure for this page — page contributed nothing. */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Normalised offer
// ---------------------------------------------------------------------------

export type PriceBasis = 'unit' | 'package' | 'free-bottles' | 'unknown';

export interface NormalisedOffer {
  id: string;
  sourceImages: number[]; // 0-based image indices this offer was seen on
  wineName: string;       // '' when not identified
  producer: string | null;
  vintage: number | null;
  country: string | null;
  region: string | null;
  color: string | null;
  grapes: string[];
  classification: string | null;
  ratingOrMedal: string | null;
  retailer: string | null;

  unitPrice: number | null;
  originalPrice: number | null;
  packagePrice: number | null;
  totalBottles: number | null;  // bottles covered by the deal (paid + free)
  freeBottles: number | null;
  effectivePricePerBottle: number | null;
  priceBasis: PriceBasis;

  identificationConfidence: OfferConfidence;
  priceConfidence: OfferConfidence;
  warnings: string[];
  needsReview: boolean;
  reviewReasons: string[];
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export function parseBatchResponses(results: BatchImageResult[]): ParsedPage[] {
  return results.map((r) => {
    if (r.error) return { imageIndex: r.index, retailer: null, offers: [], error: r.error };
    const parsed = parseJsonResponse<RawPageResponse>(r.text ?? '');
    if (!parsed || !Array.isArray(parsed.offers)) {
      return { imageIndex: r.index, retailer: null, offers: [], error: 'Could not read this page — the response was not usable.' };
    }
    return {
      imageIndex: r.index,
      retailer: typeof parsed.retailer === 'string' ? parsed.retailer.trim() || null : null,
      offers: parsed.offers,
      error: null,
    };
  });
}

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

function cleanText(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  return t.length > 0 ? t : null;
}

function cleanPrice(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v) && v > 0) return Math.round(v * 100) / 100;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.').replace(/[^\d.]/g, ''));
    if (isFinite(n) && n > 0) return Math.round(n * 100) / 100;
  }
  return null;
}

function cleanCount(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 60) return v;
  return null;
}

function cleanConfidence(v: unknown): OfferConfidence {
  return v === 'high' || v === 'medium' || v === 'low' ? v : 'low';
}

/** Cents-safe effective price-per-bottle. Never guesses: unknown stays null. */
export function computeEffectivePrice(offer: {
  unitPrice: number | null;
  packagePrice: number | null;
  packageBottleCount: number | null;
  paidBottleCount: number | null;
  freeBottleCount: number | null;
}): { effective: number | null; basis: PriceBasis; totalBottles: number | null; freeBottles: number | null; ambiguous: string | null } {
  const { unitPrice, packagePrice, packageBottleCount, paidBottleCount, freeBottleCount } = offer;

  // Explicit package price
  if (packagePrice !== null) {
    const total = packageBottleCount ?? (paidBottleCount !== null ? paidBottleCount + (freeBottleCount ?? 0) : null);
    if (total !== null && total > 0) {
      return {
        effective: Math.round((packagePrice * 100) / total) / 100,
        basis: 'package',
        totalBottles: total,
        freeBottles: freeBottleCount,
        ambiguous: null,
      };
    }
    return {
      effective: null,
      basis: 'unknown',
      totalBottles: null,
      freeBottles: freeBottleCount,
      ambiguous: 'A package price is shown but the number of bottles it covers is unclear.',
    };
  }

  // "X + Y free" on a per-bottle price
  if (freeBottleCount !== null && freeBottleCount > 0) {
    if (unitPrice !== null && paidBottleCount !== null && paidBottleCount > 0) {
      const total = paidBottleCount + freeBottleCount;
      return {
        effective: Math.round((unitPrice * 100 * paidBottleCount) / total) / 100,
        basis: 'free-bottles',
        totalBottles: total,
        freeBottles: freeBottleCount,
        ambiguous: null,
      };
    }
    return {
      effective: unitPrice, // per-bottle price is still real; the deal just can't be computed
      basis: unitPrice !== null ? 'unit' : 'unknown',
      totalBottles: null,
      freeBottles: freeBottleCount,
      ambiguous: 'Free-bottle deal detected but the paid quantity or bottle price is unclear.',
    };
  }

  if (unitPrice !== null) {
    return { effective: unitPrice, basis: 'unit', totalBottles: null, freeBottles: null, ambiguous: null };
  }

  return { effective: null, basis: 'unknown', totalBottles: null, freeBottles: null, ambiguous: null };
}

function normaliseOne(raw: RawOffer, imageIndex: number, pageRetailer: string | null): NormalisedOffer {
  const wineName = cleanText(raw.wineName) ?? '';
  const unitPrice = cleanPrice(raw.unitPrice);
  const originalPrice = cleanPrice(raw.originalPrice);
  const packagePrice = cleanPrice(raw.packagePrice);
  const packageBottleCount = cleanCount(raw.packageBottleCount);
  const paidBottleCount = cleanCount(raw.paidBottleCount);
  const freeBottleCount = cleanCount(raw.freeBottleCount);

  const identificationConfidence = cleanConfidence(raw.identificationConfidence);
  let priceConfidence = cleanConfidence(raw.priceConfidence);
  const warnings = (Array.isArray(raw.warnings) ? raw.warnings : [])
    .map((w) => cleanText(w))
    .filter((w): w is string => !!w);

  const priced = computeEffectivePrice({ unitPrice, packagePrice, packageBottleCount, paidBottleCount, freeBottleCount });
  if (priced.ambiguous) {
    warnings.push(priced.ambiguous);
    priceConfidence = 'low';
  }

  const reviewReasons: string[] = [];
  if (!wineName) reviewReasons.push('Wine could not be identified on the page.');
  if (identificationConfidence === 'low' && wineName) reviewReasons.push('Low confidence in which wine this is.');
  if (priced.ambiguous) reviewReasons.push('Price basis needs to be checked by hand.');
  // A package (mixed case, "op kist", bundle) whose per-bottle price the model
  // wasn't fully sure about is exactly the "uncertain price basis" the product
  // spec says must go to review — never a confident buy off an inferred bottle
  // count or a case of individually-unpriced wines.
  if (priced.basis === 'package' && priceConfidence !== 'high') {
    reviewReasons.push('Package deal — confirm the bottle count and per-bottle price before buying.');
  }

  return {
    id: genId('offer'),
    sourceImages: [imageIndex],
    wineName,
    producer: cleanText(raw.producer),
    vintage: typeof raw.vintage === 'number' && raw.vintage > 1900 && raw.vintage < 2100 ? raw.vintage : null,
    country: cleanText(raw.country),
    region: cleanText(raw.region),
    color: cleanText(raw.color),
    grapes: (Array.isArray(raw.grapes) ? raw.grapes : []).map((g) => cleanText(g)).filter((g): g is string => !!g),
    classification: cleanText(raw.classification),
    ratingOrMedal: cleanText(raw.ratingOrMedal),
    retailer: pageRetailer,
    unitPrice,
    originalPrice,
    packagePrice,
    totalBottles: priced.totalBottles,
    freeBottles: priced.freeBottles,
    effectivePricePerBottle: priced.effective,
    priceBasis: priced.basis,
    identificationConfidence,
    priceConfidence,
    warnings,
    needsReview: reviewReasons.length > 0,
    reviewReasons,
  };
}

// ---------------------------------------------------------------------------
// Conservative cross-image dedupe
// ---------------------------------------------------------------------------

function identityKey(o: NormalisedOffer): string | null {
  // Only offers with BOTH a producer and a wine name are eligible for merging;
  // name similarity alone is never enough.
  if (!o.producer || !o.wineName) return null;
  return `${o.producer.toLowerCase()}|${o.wineName.toLowerCase()}`;
}

function vintagesCompatible(a: number | null, b: number | null): boolean {
  return a === null || b === null || a === b;
}

export function dedupeOffers(offers: NormalisedOffer[]): NormalisedOffer[] {
  const result: NormalisedOffer[] = [];

  for (const offer of offers) {
    const key = identityKey(offer);
    const existing = key
      ? result.find((r) => identityKey(r) === key && vintagesCompatible(r.vintage, offer.vintage))
      : undefined;

    if (!existing) {
      result.push(offer);
      continue;
    }

    // Merge into the existing entry: union sources, keep the better-identified data
    existing.sourceImages = [...new Set([...existing.sourceImages, ...offer.sourceImages])].sort();
    existing.vintage = existing.vintage ?? offer.vintage;
    existing.country = existing.country ?? offer.country;
    existing.region = existing.region ?? offer.region;
    existing.color = existing.color ?? offer.color;
    existing.grapes = existing.grapes.length > 0 ? existing.grapes : offer.grapes;
    existing.classification = existing.classification ?? offer.classification;
    existing.ratingOrMedal = existing.ratingOrMedal ?? offer.ratingOrMedal;

    // Conflicting prices across pages: keep the better-confidence one, flag the conflict
    const bothPriced = existing.effectivePricePerBottle !== null && offer.effectivePricePerBottle !== null;
    if (bothPriced && existing.effectivePricePerBottle !== offer.effectivePricePerBottle) {
      existing.warnings.push(
        `Seen on multiple pages with different prices (€${existing.effectivePricePerBottle} vs €${offer.effectivePricePerBottle}) — check which applies.`
      );
      existing.priceConfidence = 'low';
      existing.needsReview = true;
      existing.reviewReasons.push('Conflicting prices across pages.');
    } else if (existing.effectivePricePerBottle === null && offer.effectivePricePerBottle !== null) {
      existing.unitPrice = offer.unitPrice;
      existing.originalPrice = offer.originalPrice;
      existing.packagePrice = offer.packagePrice;
      existing.totalBottles = offer.totalBottles;
      existing.freeBottles = offer.freeBottles;
      existing.effectivePricePerBottle = offer.effectivePricePerBottle;
      existing.priceBasis = offer.priceBasis;
      existing.priceConfidence = offer.priceConfidence;
    }
    existing.warnings = [...new Set([...existing.warnings, ...offer.warnings])];
  }

  return result;
}

export function normaliseOffers(pages: ParsedPage[]): NormalisedOffer[] {
  const flat: NormalisedOffer[] = [];
  for (const page of pages) {
    for (const raw of page.offers) {
      flat.push(normaliseOne(raw, page.imageIndex, page.retailer));
    }
  }
  return dedupeOffers(flat);
}

// ---------------------------------------------------------------------------
// Candidates: existing KC builder + existing Buying Advisor per offer
// ---------------------------------------------------------------------------

export type CandidateGroup = 'best' | 'consider' | 'skip' | 'review';

export interface BatchCandidate {
  offer: NormalisedOffer;
  kc: Koopjeschecker | null;      // null when the offer needs review
  advice: BuyingAdvice | null;    // null when the offer needs review
  group: CandidateGroup;
}

export interface BatchAnalysisResult {
  id: string;
  createdAt: string;
  imageCount: number;
  thumbnails: string[];           // small data URLs, one per uploaded image
  retailer: string | null;        // most common page-level retailer
  candidates: BatchCandidate[];
  failedImages: { index: number; error: string }[];
}

export function buildCandidate(
  offer: NormalisedOffer,
  cellar: CellarWine[],
  ideal: Structure
): BatchCandidate {
  if (offer.needsReview) {
    return { offer, kc: null, advice: null, group: 'review' };
  }

  // Price passed to the advisor only when it is trustworthy — an uncertain
  // price must never produce a strong recommendation (the advisor treats a
  // missing price conservatively by design).
  const trustedPrice = offer.priceConfidence !== 'low' ? offer.effectivePricePerBottle : null;

  const wine: DetectedPromotion = {
    producer: offer.producer,
    wineName: offer.wineName,
    grapes: offer.grapes,
    vintage: offer.vintage,
    price: trustedPrice,
    region: offer.region,
    country: offer.country,
    appellation: null,
    classification: offer.classification,
    alcohol: null,
    labelNotes: null,
    promotionPrice: trustedPrice,
    originalPrice: offer.priceConfidence !== 'low' ? offer.originalPrice : null,
  };

  const kc = buildPromotionKc(wine, '', ideal);
  const advice = getBuyingAdvice(kc, cellar);

  const group: CandidateGroup =
    advice.verdict === 'strong_buy' || advice.verdict === 'buy'
      ? 'best'
      : advice.verdict === 'consider'
      ? 'consider'
      : 'skip';

  return { offer, kc, advice, group };
}

const VERDICT_RANK: Record<string, number> = { strong_buy: 4, buy: 3, consider: 2, skip: 1, avoid: 0 };

export function buildBatchCandidates(
  offers: NormalisedOffer[],
  cellar: CellarWine[],
  ideal: Structure
): BatchCandidate[] {
  const candidates = offers.map((o) => buildCandidate(o, cellar, ideal));
  candidates.sort((a, b) => {
    if (!a.advice && !b.advice) return 0;
    if (!a.advice) return 1;
    if (!b.advice) return -1;
    const rank = VERDICT_RANK[b.advice.verdict] - VERDICT_RANK[a.advice.verdict];
    if (rank !== 0) return rank;
    return b.advice.decisionScore - a.advice.decisionScore;
  });
  return candidates;
}

/** The top-of-page shortlist: strongest 1–5 candidates that earned a real verdict. */
export function bestPicks(candidates: BatchCandidate[], limit = 5): BatchCandidate[] {
  return candidates
    .filter((c) => c.advice !== null && (c.group === 'best' || c.group === 'consider'))
    .slice(0, limit);
}

/** Most common page-level retailer across successfully parsed pages. */
export function dominantRetailer(pages: ParsedPage[]): string | null {
  const counts = new Map<string, number>();
  for (const p of pages) {
    if (p.retailer) counts.set(p.retailer, (counts.get(p.retailer) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) { best = name; bestCount = count; }
  }
  return best;
}
