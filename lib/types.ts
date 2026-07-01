// Core data model for VinIQ — a personal AI wine advisor.

import type { ProvenanceMap } from './provenance';

export type WineColor = 'red' | 'white' | 'rosé' | 'sparkling';

export type RecommendedAction = 'BUY' | 'CONSIDER' | 'SKIP';

export type Badge =
  | 'alexanders_choice'
  | 'best_value'
  | 'great_buy'
  | 'ageing_candidate'
  | 'ready_to_drink'
  | 'best_wine'
  | 'best_price_quality'
  | 'budget_choice';

export const BADGE_LABEL: Record<Badge, string> = {
  alexanders_choice: "🦊 Alexander's Choice",
  best_value: '💰 Best Value',
  great_buy: '🔥 Great Buy',
  ageing_candidate: '⏳ Ageing Candidate',
  ready_to_drink: '🍷 Ready To Drink',
  best_wine: '🍷 Best Wine',
  best_price_quality: '💎 Best Price Quality',
  budget_choice: '💰 Budget Choice',
};

/** Structure / body profile, 1–10 scale, matching Alexander's taste profile axes */
export interface StructureProfile {
  body: number;
  acidity: number;
  tannin: number;
  sweetness: number;
  alcohol: number;
}

/** Section 1 — General Information */
export interface GeneralInfo {
  producer: string;
  wineName: string;
  vintage: number;
  country: string;
  region: string;
  appellation: string;
  grapes: string[];
  alcohol: number;
  price?: number;
  imageUrl?: string;
}

/** Section 2 — Style */
export interface StyleInfo {
  color: WineColor;
  styleSummary: string;
  styleTags: string[];
  isEstimated?: boolean;
}

/** Section 3 — Aromatic Profile */
export interface AromaticProfile {
  primaryAromas: string[];
  secondaryAromas: string[];
  tertiaryAromas: string[];
  description: string;
  isEstimated?: boolean;
}

/** Section 4 — Structure */
export interface StructureSection {
  profile: StructureProfile;
  description: string;
  isEstimated?: boolean;
}

/** Section 5 — Terroir */
export interface TerroirInfo {
  soil: string;
  climate: string;
  winemaking: string;
  description: string;
  isEstimated?: boolean;
}

/** Section 6 — Drinking Window */
export interface DrinkingWindow {
  from: number;
  to: number;
  peakFrom: number;
  peakTo: number;
  status: 'too_young' | 'ready' | 'peak' | 'past_peak';
  isEstimated?: boolean;
}

/** Section 7 — Decanting */
export interface DecantingInfo {
  shouldDecant: boolean;
  decantMinutes: number;
  servingTempC: [number, number];
  glassType: string;
  isEstimated?: boolean;
}

/** Section 8 — Food Pairing */
export interface FoodPairing {
  dishes: string[];
  notes: string;
  isEstimated?: boolean;
}

/** Section 9 — Personal Score */
export interface PersonalScore {
  matchPercent: number;
  badges: Badge[];
  reasoning: string;
}

/** Section 10 — Cellar Advice */
export interface CellarAdvice {
  action: RecommendedAction;
  ageingPotentialYears: number;
  suggestion: string;
}

/** Metadata attached when a KC is generated from image analysis */
export interface ScanMetadata {
  ocrText: string;
  confidence: 'high' | 'medium' | 'low';
  promotionPrice?: number;
  originalPrice?: number;
  discountPercent?: number;
  /** true when vintage was not visible on the label and was assumed */
  vintageEstimated?: boolean;
}

/** Full "Koopjeschecker" analysis — used for bottles & promotions */
export interface Koopjeschecker {
  id: string;
  general: GeneralInfo;
  style: StyleInfo;
  aromatics: AromaticProfile;
  structure: StructureSection;
  terroir: TerroirInfo;
  drinkingWindow: DrinkingWindow;
  decanting: DecantingInfo;
  foodPairing: FoodPairing;
  personalScore: PersonalScore;
  cellarAdvice: CellarAdvice;
  recommendedAction: RecommendedAction;
  scanMetadata?: ScanMetadata; // Only present on image-scanned KCs
  /** Where each displayed fact came from — see lib/provenance.ts */
  provenance?: ProvenanceMap;
}

/** A wine line on a scanned wine list */
export interface WineListEntry {
  id: string;
  producer: string;
  wineName: string;
  vintage: number;
  region: string;
  price: number;
  matchPercent: number;
  badges: Badge[];
  koopjeschecker: Koopjeschecker;
}

export interface WineListResult {
  id: string;
  restaurantHint?: string;
  ocrText?: string;           // Raw text extracted from the image (shown on result page for verification)
  entries: WineListEntry[];
  alexandersChoiceId: string;
  budgetChoiceId: string;
  bestWineId: string;
  bestPriceQualityId: string;
}

/** One line in the purchase ledger */
export interface PurchaseEntry {
  id: string;
  quantity: number;
  pricePerBottle: number;
  date: string;       // YYYY-MM-DD
  retailer?: string;
}

/** A bottle physically owned in the cellar */
export interface CellarWine {
  id: string;
  producer: string;
  wineName: string;
  vintage: number;
  quantity: number;
  purchasePrice: number;   // weighted average across all purchases
  personalRating: number;  // 0-10, 0 = not rated
  notes: string;
  koopjeschecker: Koopjeschecker;
  addedAt: string;         // ISO date
  purchases?: PurchaseEntry[];  // ledger; absent on wines imported before Sprint 5
  /** Provenance for cellar-level facts (purchasePrice, personalRating) — see lib/provenance.ts */
  provenance?: ProvenanceMap;
}

export interface TasteProfile {
  body: number;
  acidity: number;
  tannin: number;
  sweetness: number;
  favouriteRegions: string[];
  favouriteStyles: string[];
}

export interface ActionItem {
  type: 'peak' | 'past_peak' | 'drink_soon' | 'gap';
  message: string;
  wineId?: string;
}

/** Feedback on a recommendation */
export interface FeedbackEntry {
  id: string;
  kcId: string;
  verdict: 'thumbs_up' | 'thumbs_down';
  context: 'bottle' | 'promotion' | 'wine_list';
  producer: string;
  wineName: string;
  timestamp: string;
}

/** AI-generated taste profile (read-only, derived from behaviour) */
export interface AiTasteProfile {
  avgBody: number;
  avgAcidity: number;
  avgTannin: number;
  avgSweetness: number;
  topRegions: string[];
  topStyles: string[];
  insights: string[]; // Human-readable sentences
  basedOnBottles: number;
  lastUpdated: string;
}
