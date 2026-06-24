// Core data model for VinIQ — a personal AI wine advisor.

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
}

/** Section 3 — Aromatic Profile */
export interface AromaticProfile {
  primaryAromas: string[];
  secondaryAromas: string[];
  tertiaryAromas: string[];
  description: string;
}

/** Section 4 — Structure */
export interface StructureSection {
  profile: StructureProfile;
  description: string;
}

/** Section 5 — Terroir */
export interface TerroirInfo {
  soil: string;
  climate: string;
  winemaking: string;
  description: string;
}

/** Section 6 — Drinking Window */
export interface DrinkingWindow {
  from: number;
  to: number;
  peakFrom: number;
  peakTo: number;
  status: 'too_young' | 'ready' | 'peak' | 'past_peak';
}

/** Section 7 — Decanting */
export interface DecantingInfo {
  shouldDecant: boolean;
  decantMinutes: number;
  servingTempC: [number, number];
  glassType: string;
}

/** Section 8 — Food Pairing */
export interface FoodPairing {
  dishes: string[];
  notes: string;
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

/** A bottle physically owned in the cellar */
export interface CellarWine {
  id: string;
  producer: string;
  wineName: string;
  vintage: number;
  quantity: number;
  purchasePrice: number;
  personalRating: number; // 0-10, 0 = not rated
  notes: string;
  koopjeschecker: Koopjeschecker;
  addedAt: string; // ISO date
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
