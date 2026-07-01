/**
 * VinIQ Wine Intelligence
 * Infers wine structure from grapes, region, and name.
 * Calculates Alexander's match score — a hybrid of structural fit (body,
 * acidity, tannin, sweetness vs. his actual cellar-derived taste profile)
 * plus named-style affinity bonuses/penalties reflecting his real tasting
 * history (Amarone, Ripasso, Primitivo, Brunello, Montepulciano, Grenache
 * blends, Rioja Reserva/Gran Reserva, Southern Rhône — all favoured;
 * Sauvignon Blanc, lean/mineral whites, austere young reds — penalised).
 * Builds KoopjesCheckers for arbitrary detected wines.
 */

import type { Koopjeschecker, WineListEntry, WineListResult, Badge } from './types';
import {
  KC_AMARONE, KC_BRUNELLO, KC_PRIMITIVO, KC_RIOJA,
  KC_CHATEAUNEUF, KC_RIPASSO, KC_BAROLO, KC_CHAMPAGNE,
} from './mockData';
import { genId } from './utils';
import type { ProvenanceMap } from './provenance';
import { validateGeneralInfo, sanitizeGeneralInfo } from './validation';

// ---------------------------------------------------------------------------
// Detected wine (from OCR)
// ---------------------------------------------------------------------------

export interface DetectedWine {
  producer: string | null;
  wineName: string;
  grapes: string[];
  vintage: number | null;
  price: number | null;
  region: string | null;
  // Extra fields extracted from full bottle labels
  alcohol?: number | null;
  classification?: string | null;  // e.g. "Riserva", "Gran Reserva", "DOC"
  country?: string | null;
  appellation?: string | null;
  labelNotes?: string | null;      // Tasting notes visible on label
}

// ---------------------------------------------------------------------------
// Structure estimation
// ---------------------------------------------------------------------------

export interface Structure { body: number; acidity: number; tannin: number; sweetness: number }

/** Per-grape structure estimates (1–10 scale) */
const GRAPE_PROFILES: Record<string, Structure> = {
  // Italian reds
  'corvina':           { body: 9, acidity: 5, tannin: 6, sweetness: 8 },
  'amarone':           { body: 10, acidity: 4, tannin: 7, sweetness: 8 },
  'sangiovese':        { body: 8, acidity: 7, tannin: 7, sweetness: 4 },
  'nebbiolo':          { body: 9, acidity: 8, tannin: 9, sweetness: 3 },
  'primitivo':         { body: 9, acidity: 4, tannin: 5, sweetness: 8 },
  'montepulciano':     { body: 8, acidity: 5, tannin: 6, sweetness: 6 },
  'barbera':           { body: 7, acidity: 8, tannin: 5, sweetness: 5 },
  'dolcetto':          { body: 7, acidity: 5, tannin: 6, sweetness: 5 },
  'aglianico':         { body: 9, acidity: 7, tannin: 8, sweetness: 4 },
  'nero d\'avola':     { body: 9, acidity: 5, tannin: 6, sweetness: 7 },
  // Spanish
  'tempranillo':       { body: 8, acidity: 5, tannin: 7, sweetness: 6 },
  'garnacha':          { body: 7, acidity: 4, tannin: 4, sweetness: 8 },
  'monastrell':        { body: 9, acidity: 5, tannin: 7, sweetness: 6 },
  // French reds
  'grenache':          { body: 7, acidity: 4, tannin: 4, sweetness: 8 },
  'syrah':             { body: 9, acidity: 5, tannin: 7, sweetness: 6 },
  'shiraz':            { body: 9, acidity: 4, tannin: 6, sweetness: 7 },
  'mourvèdre':         { body: 9, acidity: 5, tannin: 8, sweetness: 5 },
  'mouvedre':          { body: 9, acidity: 5, tannin: 8, sweetness: 5 },
  'merlot':            { body: 7, acidity: 5, tannin: 5, sweetness: 7 },
  'cabernet sauvignon':{ body: 9, acidity: 6, tannin: 8, sweetness: 5 },
  'cabernet franc':    { body: 7, acidity: 6, tannin: 6, sweetness: 5 },
  'pinot noir':        { body: 5, acidity: 6, tannin: 3, sweetness: 5 },
  'gamay':             { body: 4, acidity: 6, tannin: 3, sweetness: 5 },
  'carignan':          { body: 8, acidity: 6, tannin: 7, sweetness: 5 },
  'cinsault':          { body: 5, acidity: 5, tannin: 3, sweetness: 6 },
  // International reds
  'malbec':            { body: 9, acidity: 4, tannin: 6, sweetness: 7 },
  'zinfandel':         { body: 8, acidity: 4, tannin: 5, sweetness: 7 },
  'touriga nacional':  { body: 9, acidity: 6, tannin: 8, sweetness: 5 },
  'pinotage':          { body: 8, acidity: 5, tannin: 6, sweetness: 6 },
  // Whites
  'sauvignon blanc':   { body: 3, acidity: 9, tannin: 1, sweetness: 2 },
  'chardonnay':        { body: 6, acidity: 6, tannin: 1, sweetness: 5 },
  'riesling':          { body: 3, acidity: 9, tannin: 1, sweetness: 6 },
  'pinot grigio':      { body: 3, acidity: 7, tannin: 1, sweetness: 3 },
  'pinot gris':        { body: 4, acidity: 6, tannin: 1, sweetness: 5 },
  'viognier':          { body: 6, acidity: 4, tannin: 1, sweetness: 7 },
  'gewurztraminer':    { body: 5, acidity: 4, tannin: 1, sweetness: 8 },
  'muscat':            { body: 4, acidity: 5, tannin: 1, sweetness: 9 },
  'torrontés':         { body: 4, acidity: 5, tannin: 1, sweetness: 7 },
  'albariño':          { body: 3, acidity: 8, tannin: 1, sweetness: 3 },
  'verdejo':           { body: 4, acidity: 7, tannin: 1, sweetness: 3 },
  'grüner veltliner':  { body: 4, acidity: 8, tannin: 1, sweetness: 3 },
  // Sparkling
  'pinot meunier':     { body: 5, acidity: 7, tannin: 2, sweetness: 5 },
  'champagne':         { body: 3, acidity: 8, tannin: 1, sweetness: 4 },
};

/** Common aliases / synonyms that should resolve to a GRAPE_PROFILES key */
const GRAPE_ALIASES: Record<string, string> = {
  'sauvignon': 'sauvignon blanc',        // bare "Sauvignon" on a list almost always means Sauvignon Blanc
  'garnacha tinta': 'garnacha',
  'grenache noir': 'grenache',
  'syrah/shiraz': 'syrah',
  'shiraz/syrah': 'shiraz',
  'pinot nero': 'pinot noir',
  'spätburgunder': 'pinot noir',
  'mourvedre': 'mourvèdre',
  'monastrell/mourvèdre': 'monastrell',
  'sangiovese grosso': 'sangiovese',
  'brunello': 'sangiovese',              // Brunello clone of Sangiovese, in case "grapes" lists it literally
  'zinfandel/primitivo': 'primitivo',
  'cab sauvignon': 'cabernet sauvignon',
  'cab franc': 'cabernet franc',
  'gruner veltliner': 'grüner veltliner',
  'albarino': 'albariño',
  'torrontes': 'torrontés',
};

/** Per-region fallback structure (when grapes not specified) */
const REGION_PROFILES: Record<string, Structure> = {
  'veneto':            { body: 9, acidity: 4, tannin: 6, sweetness: 8 },
  'tuscany':           { body: 8, acidity: 7, tannin: 7, sweetness: 4 },
  'toscana':           { body: 8, acidity: 7, tannin: 7, sweetness: 4 },
  'puglia':            { body: 9, acidity: 4, tannin: 5, sweetness: 8 },
  'piedmont':          { body: 9, acidity: 8, tannin: 9, sweetness: 3 },
  'piemonte':          { body: 9, acidity: 8, tannin: 9, sweetness: 3 },
  'abruzzo':           { body: 8, acidity: 5, tannin: 6, sweetness: 6 },
  'sicily':            { body: 9, acidity: 5, tannin: 6, sweetness: 7 },
  'sicilia':           { body: 9, acidity: 5, tannin: 6, sweetness: 7 },
  'rioja':             { body: 8, acidity: 5, tannin: 7, sweetness: 6 },
  'ribera del duero':  { body: 9, acidity: 5, tannin: 8, sweetness: 5 },
  'priorat':           { body: 9, acidity: 6, tannin: 8, sweetness: 6 },
  'southern rhône':    { body: 8, acidity: 4, tannin: 6, sweetness: 7 },
  'rhône':             { body: 8, acidity: 5, tannin: 6, sweetness: 6 },
  'châteauneuf':       { body: 9, acidity: 4, tannin: 6, sweetness: 7 },
  'bordeaux':          { body: 8, acidity: 6, tannin: 8, sweetness: 5 },
  'burgundy':          { body: 5, acidity: 6, tannin: 4, sweetness: 5 },
  'beaujolais':        { body: 4, acidity: 6, tannin: 3, sweetness: 5 },
  'champagne':         { body: 3, acidity: 8, tannin: 1, sweetness: 4 },
  'alsace':            { body: 5, acidity: 7, tannin: 1, sweetness: 6 },
  'loire':             { body: 3, acidity: 9, tannin: 1, sweetness: 3 },
  'napa valley':       { body: 9, acidity: 5, tannin: 7, sweetness: 6 },
  'sonoma':            { body: 7, acidity: 5, tannin: 5, sweetness: 6 },
  'mendoza':           { body: 9, acidity: 4, tannin: 6, sweetness: 7 },
  'barossa valley':    { body: 9, acidity: 4, tannin: 6, sweetness: 7 },
  'marlborough':       { body: 3, acidity: 9, tannin: 1, sweetness: 2 },
  'douro':             { body: 9, acidity: 6, tannin: 8, sweetness: 5 },
};

/** Conservative fallback structures by colour — used only when no grape/region/name match is found */
const WHITE_DEFAULT: Structure = { body: 4, acidity: 7, tannin: 1, sweetness: 4 };
const ROSE_DEFAULT: Structure = { body: 4, acidity: 6, tannin: 2, sweetness: 4 };
const SPARKLING_DEFAULT: Structure = { body: 3, acidity: 8, tannin: 1, sweetness: 4 };
const RED_DEFAULT: Structure = { body: 7, acidity: 5, tannin: 6, sweetness: 6 };

const WHITE_GRAPE_KEYWORDS = [
  'sauvignon blanc', 'sauvignon', 'chardonnay', 'riesling', 'pinot grigio', 'pinot gris',
  'viognier', 'gewurztraminer', 'gewürztraminer', 'muscat', 'torrontés', 'torrontes',
  'albariño', 'albarino', 'verdejo', 'grüner veltliner', 'gruner veltliner', 'chenin blanc',
  'sémillon', 'semillon', 'vermentino', 'fiano', 'grillo', 'garganega', 'trebbiano',
  'pinot blanc', 'marsanne', 'roussanne', 'godello', 'assyrtiko',
];
const ROSE_KEYWORDS = ['rosé', 'rose', 'rosato', 'rosado'];
const SPARKLING_KEYWORDS = [
  'champagne', 'crémant', 'cremant', 'cava', 'prosecco', 'spumante', 'sekt', 'franciacorta',
];

function normalizeGrapeKey(raw: string): string {
  const key = raw.toLowerCase().trim();
  return GRAPE_ALIASES[key] ?? key;
}

function lookupGrape(grape: string): Structure | null {
  const key = normalizeGrapeKey(grape);
  if (GRAPE_PROFILES[key]) return GRAPE_PROFILES[key];
  // Fuzzy partial match — handles cases like "Montepulciano d'Abruzzo" passed as a grape
  for (const [g, s] of Object.entries(GRAPE_PROFILES)) {
    if (key.includes(g) || g.includes(key)) return s;
  }
  return null;
}

function lookupRegion(region: string): Structure | null {
  const key = region.toLowerCase().trim();
  for (const [r, s] of Object.entries(REGION_PROFILES)) {
    if (key.includes(r) || r.includes(key)) return s;
  }
  return null;
}

/** Detects wine colour/category from grapes + name + region text, for safer fallback defaults */
export function detectColor(wine: DetectedWine): 'red' | 'white' | 'rose' | 'sparkling' {
  const text = `${wine.producer ?? ''} ${wine.wineName} ${wine.grapes.join(' ')} ${wine.region ?? ''} ${wine.appellation ?? ''}`.toLowerCase();

  if (SPARKLING_KEYWORDS.some((k) => text.includes(k))) return 'sparkling';
  if (ROSE_KEYWORDS.some((k) => text.includes(k))) return 'rose';

  const grapeText = wine.grapes.map((g) => g.toLowerCase()).join(' ');
  if (WHITE_GRAPE_KEYWORDS.some((k) => grapeText.includes(k) || text.includes(k))) return 'white';

  return 'red'; // Default assumption — most wine lists/cellars skew red for this profile
}

export function inferStructure(wine: DetectedWine): Structure {
  const grapeProfiles = wine.grapes
    .map((g) => lookupGrape(g))
    .filter((p): p is Structure => p !== null);

  if (grapeProfiles.length > 0) {
    const avg = grapeProfiles.reduce(
      (acc, p) => ({
        body: acc.body + p.body / grapeProfiles.length,
        acidity: acc.acidity + p.acidity / grapeProfiles.length,
        tannin: acc.tannin + p.tannin / grapeProfiles.length,
        sweetness: acc.sweetness + p.sweetness / grapeProfiles.length,
      }),
      { body: 0, acidity: 0, tannin: 0, sweetness: 0 }
    );
    return {
      body: Math.round(avg.body * 10) / 10,
      acidity: Math.round(avg.acidity * 10) / 10,
      tannin: Math.round(avg.tannin * 10) / 10,
      sweetness: Math.round(avg.sweetness * 10) / 10,
    };
  }

  if (wine.region) {
    const r = lookupRegion(wine.region);
    if (r) return r;
  }

  // Check wine name for known styles
  const name = `${wine.producer ?? ''} ${wine.wineName}`.toLowerCase();
  if (name.includes('amarone')) return GRAPE_PROFILES['amarone'];
  if (name.includes('barolo') || name.includes('barbaresco')) return GRAPE_PROFILES['nebbiolo'];
  if (name.includes('vino nobile')) return GRAPE_PROFILES['sangiovese'];
  if (name.includes('brunello') || name.includes('chianti')) return GRAPE_PROFILES['sangiovese'];
  if (name.includes('montepulciano')) return GRAPE_PROFILES['montepulciano'];
  if (name.includes('rioja')) return REGION_PROFILES['rioja'];

  // Colour-aware fallback — NEVER default an unrecognised white/rosé/sparkling to a flattering red profile
  const color = detectColor(wine);
  if (color === 'white') return WHITE_DEFAULT;
  if (color === 'rose') return ROSE_DEFAULT;
  if (color === 'sparkling') return SPARKLING_DEFAULT;

  return RED_DEFAULT;
}

// ---------------------------------------------------------------------------
// Alexander's match score — structural fit + named-style affinity
// ---------------------------------------------------------------------------

/** Cold-start ideal — used only when no cellar-derived profile is available. Matches profile-ai.ts defaults. */
export const COLD_START_IDEAL: Structure = { body: 8, acidity: 3, tannin: 6, sweetness: 6 };

/** Importance weights — acidity matters most (Alexander is acid-averse), then body */
const WEIGHTS = { body: 1.6, acidity: 2.2, tannin: 1.0, sweetness: 0.7 };

/** Pure structural distance score, 5–95 range (room left for bonuses/penalties to push to 0/100) */
function structuralScore(structure: Structure, ideal: Structure): number {
  let totalDiff = 0;
  let maxDiff = 0;
  for (const key of ['body', 'acidity', 'tannin', 'sweetness'] as const) {
    const diff = Math.abs(structure[key] - ideal[key]);
    totalDiff += diff * WEIGHTS[key];
    maxDiff += 9 * WEIGHTS[key];
  }
  const ratio = 1 - totalDiff / maxDiff;
  return Math.max(5, Math.min(95, ratio * 100));
}

/** @deprecated use calculateAlexanderMatch — kept for any leftover direct callers */
export function calculateMatchScore(structure: Structure, ideal: Structure = COLD_START_IDEAL): number {
  return Math.round(structuralScore(structure, ideal));
}

export interface StyleAdjustment {
  bonus: number;
  penalty: number;
  positiveTags: string[];
  negativeTags: string[];
}

/**
 * Named-style affinity — reflects Alexander's real cellar & tasting history,
 * not just generic structural distance. A Brunello with slightly higher
 * acidity than his structural ideal should still rank highly because it's
 * one of his proven favourite styles.
 */
export function calculateStyleAdjustment(wine: DetectedWine, structure: Structure, vintage: number | null): StyleAdjustment {
  const text = `${wine.producer ?? ''} ${wine.wineName} ${wine.grapes.join(' ')} ${wine.region ?? ''} ${wine.appellation ?? ''} ${wine.classification ?? ''} ${wine.labelNotes ?? ''}`.toLowerCase();
  const grapeText = wine.grapes.map((g) => g.toLowerCase()).join(' ');

  let bonus = 0;
  let penalty = 0;
  const positiveTags: string[] = [];
  const negativeTags: string[] = [];

  const isVinoNobile = text.includes('vino nobile');

  // ---- Favoured styles (bonuses) ----
  if (text.includes('amarone')) {
    bonus += 14;
    positiveTags.push('Amarone — one of your signature styles');
  }
  if (text.includes('ripasso')) {
    bonus += 9;
    positiveTags.push('Ripasso — appassimento-style favourite');
  }
  if (/recioto|passito|appassimento/.test(text)) {
    bonus += 9;
    positiveTags.push('appassimento (dried-grape) style');
  }
  if (text.includes('primitivo') || grapeText.includes('primitivo') || text.includes('zinfandel')) {
    bonus += 8;
    positiveTags.push('Primitivo — ripe, full-bodied favourite');
  }
  if (text.includes('brunello')) {
    bonus += 10;
    positiveTags.push('Brunello di Montalcino — proven favourite');
  }
  if (!isVinoNobile && (text.includes('montepulciano') || grapeText.includes('montepulciano'))) {
    bonus += 8;
    positiveTags.push('Montepulciano — soft, fruit-forward style you favour');
  }
  const isGrenacheBlend =
    grapeText.includes('grenache') || grapeText.includes('garnacha') ||
    (text.includes('gsm')) ||
    (grapeText.includes('syrah') && grapeText.includes('mourv'));
  if (isGrenacheBlend) {
    bonus += 8;
    positiveTags.push('Grenache-based blend — matches your warm, fruit-driven preference');
  }
  const isReserva = (wine.classification ?? '').toLowerCase().includes('reserva') || /reserva|gran reserva/.test(text);
  if (text.includes('rioja') && isReserva) {
    bonus += 10;
    positiveTags.push('Rioja Reserva/Gran Reserva — a proven favourite');
  } else if (text.includes('rioja')) {
    bonus += 3;
    positiveTags.push('Rioja');
  }
  const isSouthernRhone =
    text.includes('châteauneuf') || text.includes('chateauneuf') || text.includes('gigondas') ||
    text.includes('vacqueyras') || text.includes('lirac') || text.includes('cairanne') ||
    text.includes('vinsobres') || text.includes('southern rhône') || text.includes('southern rhone');
  if (isSouthernRhone) {
    bonus += 10;
    positiveTags.push('Southern Rhône — a proven favourite region');
  }

  // ---- Penalised styles ----
  const isSauvignonBlanc = grapeText.includes('sauvignon') && !grapeText.includes('cabernet sauvignon');
  if (isSauvignonBlanc || text.includes('sauvignon blanc')) {
    penalty += 16;
    negativeTags.push('Sauvignon Blanc rarely suits your palate');
  }
  if (structure.acidity >= 8) {
    penalty += 8;
    negativeTags.push('high acidity — less than ideal for you');
  }
  const leanMineralKeywords = ['chablis', 'sancerre', 'muscadet', 'vinho verde', 'mineral', 'flinty', 'steely', 'crisp and zesty'];
  if (leanMineralKeywords.some((k) => text.includes(k))) {
    penalty += 8;
    negativeTags.push('lean, mineral style — not your usual preference');
  }
  const age = vintage ? new Date().getFullYear() - vintage : null;
  if (structure.tannin >= 7 && age !== null && age <= 3) {
    penalty += 8;
    negativeTags.push('young and still quite tannic/austere');
  }

  // Cap totals so no single wine swings wildly off the structural baseline
  bonus = Math.min(bonus, 20);
  penalty = Math.min(penalty, 22);

  return { bonus, penalty, positiveTags, negativeTags };
}

export interface AlexanderMatchResult {
  score: number;
  positiveTags: string[];
  negativeTags: string[];
}

/** The full Alexander Match score (0–100): structural fit + style affinity bonuses/penalties */
export function calculateAlexanderMatch(
  wine: DetectedWine,
  structure: Structure,
  ideal: Structure = COLD_START_IDEAL,
  vintage: number | null = wine.vintage
): AlexanderMatchResult {
  const base = structuralScore(structure, ideal);
  const { bonus, penalty, positiveTags, negativeTags } = calculateStyleAdjustment(wine, structure, vintage);
  const score = Math.round(Math.max(0, Math.min(100, base + bonus - penalty)));
  return { score, positiveTags, negativeTags };
}

// ---------------------------------------------------------------------------
// KC template selection and KoopjesChecker generation
// ---------------------------------------------------------------------------

type StyleKey = 'amarone' | 'brunello' | 'primitivo' | 'rioja' | 'chateauneuf' | 'ripasso' | 'barolo' | 'champagne' | 'generic';

const STYLE_KC: Record<StyleKey, Koopjeschecker> = {
  amarone: KC_AMARONE,
  brunello: KC_BRUNELLO,
  primitivo: KC_PRIMITIVO,
  rioja: KC_RIOJA,
  chateauneuf: KC_CHATEAUNEUF,
  ripasso: KC_RIPASSO,
  barolo: KC_BAROLO,
  champagne: KC_CHAMPAGNE,
  generic: KC_PRIMITIVO,
};

function pickStyleKey(wine: DetectedWine): StyleKey {
  const text = `${wine.producer ?? ''} ${wine.wineName} ${wine.grapes.join(' ')} ${wine.region ?? ''}`.toLowerCase();

  if (text.includes('amarone')) return 'amarone';
  if (text.includes('brunello')) return 'brunello';
  if (text.includes('barolo') || text.includes('barbaresco') || text.includes('nebbiolo')) return 'barolo';
  if (text.includes('ripasso')) return 'ripasso';
  if (text.includes('primitivo') || text.includes('zinfandel')) return 'primitivo';
  if (text.includes('rioja') || text.includes('tempranillo') || text.includes('ribera')) return 'rioja';
  if (text.includes('châteauneuf') || text.includes('chateauneuf') || text.includes('gigondas') ||
      text.includes('southern rhône') || (text.includes('grenache') && !text.includes('blanc'))) return 'chateauneuf';
  if (text.includes('champagne') || text.includes('crémant') || text.includes('cremant') || text.includes('cava') || text.includes('prosecco')) return 'champagne';

  const color = detectColor(wine);
  if (color === 'white' || color === 'sparkling') return 'champagne';

  return 'generic';
}

// ---------------------------------------------------------------------------
// Vintage-relative ageing profiles
// All offsets are years AFTER the vintage. Never touch absolute years.
// ---------------------------------------------------------------------------

interface AgeingProfile {
  drinkFrom: number;      // min years after vintage before drinking
  drinkTo: number;        // years after vintage when wine starts declining
  peakFrom: number;       // years after vintage when peak window opens
  peakTo: number;         // years after vintage when peak window closes
  ageingPotential: number; // headline ageing potential (years from vintage)
}

const AGEING_PROFILES: Record<StyleKey, AgeingProfile> = {
  amarone:     { drinkFrom: 3,  drinkTo: 20, peakFrom: 7,  peakTo: 15, ageingPotential: 20 },
  brunello:    { drinkFrom: 5,  drinkTo: 20, peakFrom: 8,  peakTo: 16, ageingPotential: 20 },
  barolo:      { drinkFrom: 5,  drinkTo: 20, peakFrom: 8,  peakTo: 16, ageingPotential: 20 },
  ripasso:     { drinkFrom: 2,  drinkTo: 9,  peakFrom: 3,  peakTo: 7,  ageingPotential: 9  },
  primitivo:   { drinkFrom: 1,  drinkTo: 7,  peakFrom: 2,  peakTo: 5,  ageingPotential: 7  },
  rioja:       { drinkFrom: 2,  drinkTo: 12, peakFrom: 4,  peakTo: 9,  ageingPotential: 12 },
  chateauneuf: { drinkFrom: 3,  drinkTo: 15, peakFrom: 5,  peakTo: 12, ageingPotential: 15 },
  champagne:   { drinkFrom: 0,  drinkTo: 5,  peakFrom: 1,  peakTo: 3,  ageingPotential: 5  },
  generic:     { drinkFrom: 1,  drinkTo: 6,  peakFrom: 2,  peakTo: 4,  ageingPotential: 6  },
};

/** Riserva / Gran Reserva wines need more time — extend peak and potential */
const RISERVA_BONUS: Partial<AgeingProfile> = {
  drinkFrom: 2, drinkTo: 4, peakFrom: 2, peakTo: 4, ageingPotential: 4,
};

function computeDrinkingWindow(
  vintage: number,
  styleKey: StyleKey,
  isRiserva: boolean
): { from: number; to: number; peakFrom: number; peakTo: number; status: 'too_young' | 'ready' | 'peak' | 'past_peak' } {
  const base = AGEING_PROFILES[styleKey];
  const bonus = isRiserva ? RISERVA_BONUS : {};

  const from     = vintage + base.drinkFrom    + (bonus.drinkFrom    ?? 0);
  const to       = vintage + base.drinkTo      + (bonus.drinkTo      ?? 0);
  const peakFrom = vintage + base.peakFrom     + (bonus.peakFrom     ?? 0);
  const peakTo   = vintage + base.peakTo       + (bonus.peakTo       ?? 0);

  // Sanity: from must be >= vintage + 1, nothing can precede the vintage
  const safeFrom     = Math.max(from,     vintage + 1);
  const safeTo       = Math.max(to,       safeFrom + 1);
  const safePeakFrom = Math.max(peakFrom, safeFrom);
  const safePeakTo   = Math.max(peakTo,   safePeakFrom + 1);

  const year = new Date().getFullYear();
  let status: 'too_young' | 'ready' | 'peak' | 'past_peak';
  if (year < safeFrom)     status = 'too_young';
  else if (year > safeTo)  status = 'past_peak';
  else if (year >= safePeakFrom && year <= safePeakTo) status = 'peak';
  else                     status = 'ready';

  return { from: safeFrom, to: safeTo, peakFrom: safePeakFrom, peakTo: safePeakTo, status };
}

export function buildKcForDetectedWine(wine: DetectedWine, vintage: number): Koopjeschecker {
  const styleKey = pickStyleKey(wine);
  const template = STYLE_KC[styleKey];
  const structure = inferStructure(wine);

  const isRiserva =
    (wine.classification ?? '').toLowerCase().includes('riserva') ||
    (wine.classification ?? '').toLowerCase().includes('gran reserva') ||
    (wine.wineName ?? '').toLowerCase().includes('riserva');

  // Compute window directly from vintage — NEVER shift absolute template years
  const drinkingWindow = computeDrinkingWindow(vintage, styleKey, isRiserva);
  const base = AGEING_PROFILES[styleKey];
  const riservaBonus = isRiserva ? (RISERVA_BONUS.ageingPotential ?? 0) : 0;
  const ageingPotentialYears = base.ageingPotential + riservaBonus;

  const estimatedNote = 'Estimated from style and region (no producer-specific ageing data available).';

  const generalDraft = {
    producer: wine.producer ?? 'Unknown',
    wineName: wine.wineName,
    vintage,
    country: wine.country ?? 'Unknown',
    region: wine.region ?? wine.appellation ?? 'Unknown',
    appellation: wine.appellation ?? '',
    grapes: wine.grapes, // empty array means not visible on label — never fill from template
    price: wine.price ?? undefined,
    alcohol: wine.alcohol ?? 0, // 0 means not visible on label
  };

  // Sprint 7 — reject impossible region/appellation/country/style combinations
  // before this data ever reaches the UI. See lib/validation.ts for the rules
  // and the rationale for keeping the appellation over a conflicting region.
  const validation = validateGeneralInfo(generalDraft, template.style.color);
  const general = sanitizeGeneralInfo(generalDraft, validation);

  const provenance: ProvenanceMap = {};
  if (general.producer !== 'Unknown') provenance.producer = { source: 'ocr' };
  if (general.wineName) provenance.wineName = { source: 'ocr' };
  if (wine.vintage !== null) provenance.vintage = { source: 'ocr' };
  if (general.country !== 'Unknown') provenance.country = { source: 'ocr' };
  if (general.region !== 'Unknown') provenance.region = { source: 'ocr' };
  if (general.appellation) provenance.appellation = { source: 'ocr' };
  if (general.grapes.length > 0) provenance.grapes = { source: 'ocr' };
  if (general.alcohol > 0) provenance.alcohol = { source: 'ocr' };
  if (general.price !== undefined) provenance.price = { source: 'ocr' };
  provenance.style = { source: 'knowledge_base' };
  provenance.aromatics = { source: 'knowledge_base' };
  provenance.terroir = { source: 'knowledge_base' };
  provenance.foodPairing = { source: 'knowledge_base' };
  provenance.structure = {
    source: 'inferred',
    detail: wine.grapes.length > 0 ? 'from grapes' : wine.region ? 'from region' : 'default profile',
  };
  provenance.drinkingWindow = { source: 'inferred', detail: 'from vintage + style' };

  return {
    ...template,
    id: genId('kc'),
    general,
    provenance,
    style: { ...template.style, isEstimated: true },
    aromatics: { ...template.aromatics, isEstimated: true },
    structure: {
      ...template.structure,
      profile: {
        body: structure.body,
        acidity: structure.acidity,
        tannin: structure.tannin,
        sweetness: structure.sweetness,
        alcohol: wine.alcohol ?? template.structure.profile.alcohol,
      },
      isEstimated: true,
    },
    terroir: { ...template.terroir, isEstimated: true },
    drinkingWindow: { ...drinkingWindow, isEstimated: true },
    decanting: { ...template.decanting, isEstimated: true },
    foodPairing: { ...template.foodPairing, isEstimated: true },
    cellarAdvice: {
      ...template.cellarAdvice,
      ageingPotentialYears,
      suggestion: estimatedNote,
    },
  };
}

// ---------------------------------------------------------------------------
// WineListEntry builder
// ---------------------------------------------------------------------------

function assignBadges(matchScore: number, price: number | null, styleKey: StyleKey): Badge[] {
  const badges: Badge[] = [];
  if (matchScore >= 85) badges.push('alexanders_choice');
  if (price !== null && price <= 25) badges.push('best_value');
  if (styleKey === 'amarone' || styleKey === 'brunello') badges.push('best_wine');
  if (matchScore >= 80 && price !== null && price >= 20 && price <= 40) badges.push('best_price_quality');
  if (styleKey !== 'champagne' && styleKey !== 'generic') badges.push('ready_to_drink');
  return [...new Set(badges)];
}

function getRecommendedAction(matchScore: number): 'BUY' | 'CONSIDER' | 'SKIP' {
  if (matchScore >= 75) return 'BUY';
  if (matchScore >= 50) return 'CONSIDER';
  return 'SKIP';
}

export function buildWineListEntry(wine: DetectedWine, ideal: Structure = COLD_START_IDEAL): WineListEntry {
  const vintage = wine.vintage ?? (new Date().getFullYear() - 3);
  const structure = inferStructure(wine);
  const { score: matchScore, positiveTags, negativeTags } = calculateAlexanderMatch(wine, structure, ideal, wine.vintage);
  const styleKey = pickStyleKey(wine);
  const kc = buildKcForDetectedWine(wine, vintage);
  const badges = assignBadges(matchScore, wine.price, styleKey);
  const action = getRecommendedAction(matchScore);

  kc.personalScore = {
    ...kc.personalScore,
    matchPercent: matchScore,
    badges,
    reasoning: generateReasoning(wine, structure, matchScore, positiveTags, negativeTags),
  };
  kc.recommendedAction = action;

  return {
    id: genId('entry'),
    producer: wine.producer ?? '',
    wineName: wine.wineName,
    vintage,
    region: wine.region ?? kc.general.region,
    price: wine.price ?? kc.general.price ?? 0,
    matchPercent: matchScore,
    badges,
    koopjeschecker: kc,
  };
}

function generateReasoning(
  wine: DetectedWine,
  structure: Structure,
  matchScore: number,
  positiveTags: string[],
  negativeTags: string[]
): string {
  const name = wine.producer ? `${wine.producer} ${wine.wineName}` : wine.wineName;
  const grapeStr = wine.grapes.length > 0 ? wine.grapes.join('/') : null;

  const traits: string[] = [];
  if (structure.body >= 8) traits.push('full body');
  else if (structure.body <= 4) traits.push('lighter body — less than ideal');
  if (structure.acidity <= 4) traits.push('low acidity matching your preference');
  else if (structure.acidity >= 7) traits.push('high acidity which is less ideal for your palate');
  if (structure.tannin <= 4) traits.push('soft tannins');
  else if (structure.tannin >= 8) traits.push('firm tannins — more structured than your usual preference');
  if (structure.sweetness >= 7) traits.push('ripe, generous fruit');

  const reason = traits.length > 0 ? `Shows ${traits.join(', ')}.` : '';
  const grapeText = grapeStr ? `Made from ${grapeStr}. ` : '';

  let verdict: string;
  if (matchScore >= 85) verdict = `${name} is an excellent match for your profile.`;
  else if (matchScore >= 65) verdict = `${name} is a decent fit.`;
  else verdict = `${name} does not closely match your preference for full-bodied, low-acid reds.`;

  const tagText = positiveTags.length > 0 ? ` ${positiveTags[0]}.` : '';
  const penaltyText = negativeTags.length > 0 ? ` Note: ${negativeTags[0]}.` : '';

  return `${verdict} ${grapeText}${reason}${tagText}${penaltyText}`;
}

// ---------------------------------------------------------------------------
// Wine list result builder
// ---------------------------------------------------------------------------

export function buildWineListResult(
  wines: DetectedWine[],
  ocrText: string,
  ideal: Structure = COLD_START_IDEAL
): WineListResult {
  const entries = wines.map((w) => buildWineListEntry(w, ideal));

  if (entries.length === 0) {
    return {
      id: genId('wl'),
      ocrText,
      entries: [],
      alexandersChoiceId: '',
      budgetChoiceId: '',
      bestWineId: '',
      bestPriceQualityId: '',
    };
  }

  const byMatch = [...entries].sort((a, b) => b.matchPercent - a.matchPercent);
  const alexandersChoiceId = byMatch[0].id;

  const priced = entries.filter((e) => e.price > 0);
  const budgetChoiceId =
    [...priced].sort((a, b) => a.price - b.price)[0]?.id ?? entries[0].id;

  const bestWineId =
    [...priced].sort((a, b) => b.price - a.price)[0]?.id ?? entries[0].id;

  const bestPriceQualityId =
    priced.length > 0
      ? [...priced].sort((a, b) => b.matchPercent / b.price - a.matchPercent / a.price)[0].id
      : alexandersChoiceId;

  return {
    id: genId('wl'),
    ocrText,
    entries,
    alexandersChoiceId,
    budgetChoiceId,
    bestWineId,
    bestPriceQualityId,
  };
}
