/**
 * VinIQ — Bottle & Promotion KC Generator
 * Takes wine data extracted from a real photo (via Claude Vision) and produces
 * a complete, personalised Koopjeschecker. No random/mock wines.
 */

import type { Koopjeschecker, Badge, RecommendedAction, ScanMetadata } from './types';
import {
  inferStructure, calculateAlexanderMatch, buildKcForDetectedWine, COLD_START_IDEAL,
  type DetectedWine, type Structure,
} from './wine-intel';

// ---------------------------------------------------------------------------
// Confidence assessment
// ---------------------------------------------------------------------------

export function assessConfidence(wine: DetectedWine): 'high' | 'medium' | 'low' {
  let score = 0;
  if (wine.producer) score++;
  if (wine.wineName && wine.wineName.length > 2) score++;
  if (wine.vintage) score++;
  if (wine.grapes.length > 0) score++;
  if (wine.region) score++;

  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Bottle scan
// ---------------------------------------------------------------------------

function ageingBadges(kc: Koopjeschecker): Badge[] {
  const badges: Badge[] = [];
  if (kc.drinkingWindow.status === 'ready' || kc.drinkingWindow.status === 'peak') {
    badges.push('ready_to_drink');
  }
  if (kc.cellarAdvice.ageingPotentialYears >= 10) {
    badges.push('ageing_candidate');
  }
  return badges;
}

function bottleReasoning(
  wine: DetectedWine,
  structure: ReturnType<typeof inferStructure>,
  matchScore: number,
  confidence: string,
  positiveTags: string[],
  negativeTags: string[]
): string {
  const name = wine.producer ? `${wine.producer} ${wine.wineName}` : wine.wineName;
  const grapeStr = wine.grapes.length > 0 ? wine.grapes.join('/') : null;

  const traits: string[] = [];
  if (structure.body >= 8) traits.push('full body');
  else if (structure.body <= 4) traits.push('a lighter body than your usual preference');
  if (structure.acidity <= 4) traits.push('low acidity, matching your palate');
  else if (structure.acidity >= 7) traits.push('higher acidity than you typically prefer');
  if (structure.tannin <= 4) traits.push('soft, approachable tannins');
  else if (structure.tannin >= 8) traits.push('firm, structured tannins');
  if (structure.sweetness >= 7) traits.push('ripe, generous fruit');

  const traitText = traits.length > 0 ? `Shows ${traits.join(', ')}.` : '';
  const grapeText = grapeStr ? `Made from ${grapeStr}. ` : '';

  let verdict: string;
  if (matchScore >= 85) verdict = `${name} is an excellent match for your taste profile.`;
  else if (matchScore >= 65) verdict = `${name} is a reasonably good fit for your preferences.`;
  else verdict = `${name} diverges from your usual preference for full-bodied, low-acid reds.`;

  const tagText = positiveTags.length > 0 ? ` ${positiveTags[0]}.` : '';
  const penaltyText = negativeTags.length > 0 ? ` Note: ${negativeTags[0]}.` : '';

  const confidenceNote =
    confidence === 'low'
      ? ' Note: the label was difficult to read clearly — this analysis is based on limited information and may be imprecise.'
      : confidence === 'medium'
      ? ' Some label details were unclear, so parts of this analysis are estimated.'
      : '';

  return `${verdict} ${grapeText}${traitText}${tagText}${penaltyText}${confidenceNote}`;
}

export function buildBottleKc(wine: DetectedWine, ocrText: string, ideal: Structure = COLD_START_IDEAL): Koopjeschecker {
  const vintageEstimated = wine.vintage === null;
  const vintage = wine.vintage ?? new Date().getFullYear() - 3;
  const structure = inferStructure(wine);
  const { score: matchScore, positiveTags, negativeTags } = calculateAlexanderMatch(wine, structure, ideal, wine.vintage);
  const confidence = assessConfidence(wine);
  const kc = buildKcForDetectedWine(wine, vintage);

  const badges = ageingBadges(kc);
  const recommendedAction: RecommendedAction = matchScore >= 75 ? 'BUY' : matchScore >= 50 ? 'CONSIDER' : 'SKIP';

  const scanMetadata: ScanMetadata = { ocrText, confidence, vintageEstimated };

  return {
    ...kc,
    personalScore: {
      ...kc.personalScore,
      matchPercent: matchScore,
      badges,
      reasoning: bottleReasoning(wine, structure, matchScore, confidence, positiveTags, negativeTags),
    },
    recommendedAction,
    scanMetadata,
  };
}

// ---------------------------------------------------------------------------
// Promotion scan
// ---------------------------------------------------------------------------

export interface DetectedPromotion extends DetectedWine {
  promotionPrice: number | null;
  originalPrice: number | null;
}

export interface PromotionScores {
  matchScore: number;
  qualityScore: number;
  valueScore: number;
  discountPercent: number | null;
  verdict: RecommendedAction;
}

function calculateQualityScore(kc: Koopjeschecker, structure: ReturnType<typeof inferStructure>): number {
  // Objective quality proxy — independent of Alexander's personal taste.
  // Rewards ageing potential, structural balance, and elevated classification.
  let score = 55;
  score += Math.min(kc.cellarAdvice.ageingPotentialYears, 20) * 1.3;

  const isElevated = /riserva|reserva|gran reserva|grand cru|premier cru/i.test(
    `${kc.general.wineName} ${kc.cellarAdvice.suggestion}`
  );
  if (isElevated) score += 8;

  // Structural balance bonus: extreme values in any direction read as "simpler" wines
  const extremity =
    Math.abs(structure.body - 6) + Math.abs(structure.acidity - 6) + Math.abs(structure.tannin - 5);
  score += Math.max(0, 10 - extremity);

  return Math.round(Math.max(20, Math.min(98, score)));
}

function calculateValueScore(
  promotionPrice: number | null,
  originalPrice: number | null,
  qualityScore: number
): { valueScore: number; discountPercent: number | null } {
  if (promotionPrice === null) {
    return { valueScore: 50, discountPercent: null };
  }

  if (originalPrice === null || originalPrice <= promotionPrice) {
    // No real discount detected — value judged on price-to-quality only
    const priceQualityRatio = qualityScore / Math.max(promotionPrice, 5);
    const valueScore = Math.round(Math.max(20, Math.min(85, priceQualityRatio * 6)));
    return { valueScore, discountPercent: null };
  }

  const discountPercent = Math.round(((originalPrice - promotionPrice) / originalPrice) * 100);
  const valueScore = Math.round(Math.max(20, Math.min(98, discountPercent * 1.4 + qualityScore * 0.2)));
  return { valueScore, discountPercent };
}

function computeVerdict(matchScore: number, qualityScore: number, valueScore: number): RecommendedAction {
  const composite = matchScore * 0.5 + qualityScore * 0.2 + valueScore * 0.3;
  if (matchScore < 35) return 'SKIP'; // Hard floor — bad personal fit overrides a good deal
  if (composite >= 70) return 'BUY';
  if (composite >= 50) return 'CONSIDER';
  return 'SKIP';
}

function promotionReasoning(
  wine: DetectedPromotion,
  structure: ReturnType<typeof inferStructure>,
  scores: PromotionScores,
  confidence: string,
  positiveTags: string[],
  negativeTags: string[]
): string {
  const name = wine.producer ? `${wine.producer} ${wine.wineName}` : wine.wineName;
  const grapeStr = wine.grapes.length > 0 ? wine.grapes.join('/') : null;

  const traits: string[] = [];
  if (structure.body >= 8) traits.push('full body');
  else if (structure.body <= 4) traits.push('lighter body');
  if (structure.acidity <= 4) traits.push('low acidity');
  else if (structure.acidity >= 7) traits.push('higher acidity');
  if (structure.tannin <= 4) traits.push('soft tannins');
  if (structure.sweetness >= 7) traits.push('ripe fruit');
  const traitText = traits.length > 0 ? ` Shows ${traits.join(', ')}.` : '';

  let dealText = '';
  if (scores.discountPercent !== null) {
    dealText =
      scores.discountPercent >= 25
        ? ` At ${scores.discountPercent}% off, this is a genuinely strong discount.`
        : scores.discountPercent >= 10
        ? ` The ${scores.discountPercent}% discount is moderate.`
        : ` The discount (${scores.discountPercent}%) is fairly small.`;
  } else if (wine.promotionPrice !== null) {
    dealText = ' No original price was visible, so the discount could not be verified — judged on price-to-quality alone.';
  }

  const verdictText =
    scores.verdict === 'BUY'
      ? `Recommended buy — ${name} matches your taste and the price is justified.`
      : scores.verdict === 'CONSIDER'
      ? `Worth considering, but not a standout — ${name} is a reasonable but not exceptional choice at this price.`
      : scores.matchScore < 35
      ? `Skip — ${name} does not match your taste profile, regardless of the discount.`
      : `Skip — the price doesn't justify the quality on offer here.`;

  const tagText = positiveTags.length > 0 ? ` ${positiveTags[0]}.` : '';
  const penaltyText = negativeTags.length > 0 ? ` Note: ${negativeTags[0]}.` : '';

  const confidenceNote =
    confidence === 'low'
      ? ' Note: label details were hard to read — treat this analysis as a rough estimate.'
      : '';

  return `${verdictText}${grapeStr ? ` Made from ${grapeStr}.` : ''}${traitText}${tagText}${penaltyText}${dealText}${confidenceNote}`;
}

export function buildPromotionKc(wine: DetectedPromotion, ocrText: string, ideal: Structure = COLD_START_IDEAL): Koopjeschecker {
  const vintageEstimated = wine.vintage === null;
  const vintage = wine.vintage ?? new Date().getFullYear() - 3;
  const structure = inferStructure(wine);
  const { score: matchScore, positiveTags, negativeTags } = calculateAlexanderMatch(wine, structure, ideal, wine.vintage);
  const confidence = assessConfidence(wine);

  const priceForKc = wine.promotionPrice ?? wine.price;
  const kc = buildKcForDetectedWine({ ...wine, price: priceForKc }, vintage);

  const qualityScore = calculateQualityScore(kc, structure);
  const { valueScore, discountPercent } = calculateValueScore(wine.promotionPrice, wine.originalPrice, qualityScore);
  const verdict = computeVerdict(matchScore, qualityScore, valueScore);

  const scores: PromotionScores = { matchScore, qualityScore, valueScore, discountPercent, verdict };

  const badges = ageingBadges(kc);
  if (discountPercent !== null && discountPercent >= 25) badges.push('great_buy');
  if (discountPercent !== null && discountPercent >= 15 && matchScore >= 60) badges.push('best_value');

  const scanMetadata: ScanMetadata = {
    ocrText,
    confidence,
    promotionPrice: wine.promotionPrice ?? undefined,
    originalPrice: wine.originalPrice ?? undefined,
    discountPercent: discountPercent ?? undefined,
    vintageEstimated,
  };

  const dealSuggestion =
    discountPercent !== null
      ? `Promotion: €${wine.promotionPrice} (was €${wine.originalPrice}, ${discountPercent}% off). Quality score ${qualityScore}/100, value score ${valueScore}/100.`
      : `Promotion price: €${wine.promotionPrice ?? '—'}. Original price not detected — value score is estimated from price-to-quality only.`;

  return {
    ...kc,
    personalScore: {
      ...kc.personalScore,
      matchPercent: matchScore,
      badges: [...new Set(badges)],
      reasoning: promotionReasoning(wine, structure, scores, confidence, positiveTags, negativeTags),
    },
    cellarAdvice: {
      ...kc.cellarAdvice,
      suggestion: dealSuggestion,
    },
    recommendedAction: verdict,
    scanMetadata,
  };
}
