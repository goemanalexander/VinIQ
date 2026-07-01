import type { ActionItem, CellarWine } from './types';
import { deriveWindowStatus } from './utils';

// ---------------------------------------------------------------------------
// Cellar Summary
// ---------------------------------------------------------------------------

export interface CellarSummary {
  bottles: number;
  uniqueWines: number;
  averageRating: number;
  readyToDrink: number;
}

export function getCellarSummary(cellar: CellarWine[]): CellarSummary {
  const bottles = cellar.reduce((sum, w) => sum + w.quantity, 0);
  const rated = cellar.filter((w) => w.personalRating > 0);
  const averageRating = rated.length
    ? rated.reduce((sum, w) => sum + w.personalRating, 0) / rated.length
    : 0;
  const readyToDrink = cellar
    .filter((w) => {
      const status = deriveWindowStatus(w.koopjeschecker.drinkingWindow);
      return status === 'peak' || status === 'ready';
    })
    .reduce((sum, w) => sum + w.quantity, 0);

  return {
    bottles,
    uniqueWines: cellar.length,
    averageRating: Math.round(averageRating * 10) / 10,
    readyToDrink,
  };
}

// ---------------------------------------------------------------------------
// Action items (homepage badges)
// ---------------------------------------------------------------------------

export function getActionItems(cellar: CellarWine[]): ActionItem[] {
  const items: ActionItem[] = [];
  const peakWines = cellar.filter((w) => deriveWindowStatus(w.koopjeschecker.drinkingWindow) === 'peak');
  const pastPeakWines = cellar.filter((w) => deriveWindowStatus(w.koopjeschecker.drinkingWindow) === 'past_peak');

  if (pastPeakWines.length > 0) {
    items.push({
      type: 'past_peak',
      message: `${pastPeakWines.length} wine${pastPeakWines.length !== 1 ? 's' : ''} past peak — drink soon`,
      wineId: pastPeakWines[0].id,
    });
  }
  if (peakWines.length > 0) {
    items.push({
      type: 'peak',
      message: `${peakWines.length} wine${peakWines.length !== 1 ? 's' : ''} at peak — ideal to open now`,
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Rich wine recommendation — the core of the personal sommelier
// ---------------------------------------------------------------------------

export interface WineRecommendation {
  wine: CellarWine;
  urgency: 'urgent' | 'now' | 'soon';
  headline: string;
  reasoning: string;        // Full paragraph — why this bottle, why now
  decantingAdvice: string;
  foodSuggestion: string;
  expectedExperience: string;
}

function buildRecommendation(wine: CellarWine, urgency: 'urgent' | 'now' | 'soon'): WineRecommendation {
  const kc = wine.koopjeschecker;
  const status = deriveWindowStatus(kc.drinkingWindow);
  const currentYear = new Date().getFullYear();

  // -- Headline --
  const headlineMap: Record<string, string> = {
    past_peak: 'Open tonight — past peak, don\'t wait',
    peak: 'Open tonight — at perfect maturity',
    ready: 'Ready to drink now',
    too_young: 'Approaching its window',
  };
  const headline = headlineMap[status] ?? 'Ready to drink';

  // -- Why this bottle --
  const structureDesc: string[] = [];
  const p = kc.structure.profile;
  if (p.body >= 7) structureDesc.push('full body');
  else if (p.body <= 4) structureDesc.push('elegant, lighter body');
  if (p.acidity <= 4) structureDesc.push('low acidity');
  else if (p.acidity >= 7) structureDesc.push('refreshing acidity');
  if (p.tannin <= 4) structureDesc.push('soft tannins');
  else if (p.tannin >= 7) structureDesc.push('structured tannins');
  if (p.sweetness >= 6) structureDesc.push('ripe fruit');

  const aromas = kc.aromatics.primaryAromas.slice(0, 3).join(', ');

  // Window context
  let windowContext = '';
  if (status === 'past_peak') {
    windowContext = `This bottle passed its drinking window in ${kc.drinkingWindow.to} and is losing complexity each month it sits in the cellar.`;
  } else if (status === 'peak') {
    windowContext = `${currentYear} falls inside its peak window (${kc.drinkingWindow.peakFrom}–${kc.drinkingWindow.peakTo}), meaning the wine is fully evolved and showing at its best right now.`;
  } else if (status === 'ready') {
    const yearsLeft = kc.drinkingWindow.peakFrom - currentYear;
    windowContext = `It is drinking well now${yearsLeft > 0 ? ` and will reach peak maturity around ${kc.drinkingWindow.peakFrom}` : ''}.`;
  }

  const reasoning = [
    `Open this ${kc.general.wineName} (${wine.vintage}) tonight.`,
    windowContext,
    structureDesc.length > 0
      ? `The wine delivers ${structureDesc.join(', ')} — matching your preference for expressive, full-bodied reds with ripe fruit character.`
      : kc.structure.description,
    aromas ? `Expect aromas of ${aromas}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  // -- Decanting --
  const decantingAdvice = kc.decanting.shouldDecant
    ? `Decant for ${kc.decanting.decantMinutes} minutes in a ${kc.decanting.glassType}. Serve at ${kc.decanting.servingTempC[0]}–${kc.decanting.servingTempC[1]}°C.`
    : `No decanting needed. Serve in a ${kc.decanting.glassType} at ${kc.decanting.servingTempC[0]}–${kc.decanting.servingTempC[1]}°C.`;

  // -- Food --
  const dishes = kc.foodPairing.dishes.slice(0, 3).join(', ');
  const foodSuggestion = dishes
    ? `Pairs well with ${dishes}.${kc.foodPairing.notes ? ' ' + kc.foodPairing.notes : ''}`
    : kc.foodPairing.notes || 'Versatile with hearty dishes.';

  // -- Expected experience --
  const expectedExperience = kc.structure.description || `A ${kc.style.styleSummary.toLowerCase()} showing ${kc.aromatics.description.toLowerCase()}.`;

  return {
    wine,
    urgency,
    headline,
    reasoning,
    decantingAdvice,
    foodSuggestion,
    expectedExperience,
  };
}

// ---------------------------------------------------------------------------
// Cellar analysis — strengths, weaknesses, gaps, purchase suggestions
// ---------------------------------------------------------------------------

export interface CellarAnalysis {
  strengths: string[];
  weaknesses: string[];
  missingRegions: string[];
  missingStyles: string[];
  purchaseSuggestions: string[];
}

export function getCellarAnalysis(cellar: CellarWine[]): CellarAnalysis {
  if (cellar.length === 0) {
    return {
      strengths: [],
      weaknesses: [],
      missingRegions: [],
      missingStyles: [],
      purchaseSuggestions: [
        'Start with a few bottles you know you love — scan them with VinIQ to build your cellar.',
        'Import your existing collection using the Import Cellar feature.',
      ],
    };
  }

  const totalBottles = cellar.reduce((s, w) => s + w.quantity, 0) || 1;

  // Region distribution
  const regionCounts = new Map<string, number>();
  const styleCounts = new Map<string, number>();
  for (const w of cellar) {
    const r = w.koopjeschecker.general.region;
    regionCounts.set(r, (regionCounts.get(r) ?? 0) + w.quantity);

    // Detect style
    const name = w.wineName.toLowerCase();
    let style = 'Other red';
    if (name.includes('amarone')) style = 'Amarone';
    else if (name.includes('brunello')) style = 'Brunello';
    else if (name.includes('primitivo')) style = 'Primitivo';
    else if (name.includes('ripasso')) style = 'Ripasso';
    else if (name.includes('barolo')) style = 'Barolo';
    else if (name.includes('rioja') || r === 'Rioja Alta' || r === 'Rioja') style = 'Rioja';
    else if (r === 'Southern Rhône' || name.includes('châteauneuf') || name.includes('chateauneuf')) style = 'Southern Rhône';
    else if (r === 'Champagne') style = 'Champagne';
    else if (w.koopjeschecker.style.color === 'white') style = 'White wine';
    styleCounts.set(style, (styleCounts.get(style) ?? 0) + w.quantity);
  }

  const sortedRegions = [...regionCounts.entries()].sort((a, b) => b[1] - a[1]);
  const sortedStyles = [...styleCounts.entries()].sort((a, b) => b[1] - a[1]);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missingRegions: string[] = [];
  const missingStyles: string[] = [];
  const purchaseSuggestions: string[] = [];

  // Strengths — well-represented regions / styles
  const topRegion = sortedRegions[0];
  if (topRegion && topRegion[1] / totalBottles >= 0.3) {
    strengths.push(`Strong ${topRegion[0]} selection (${topRegion[1]} bottles, ${Math.round((topRegion[1] / totalBottles) * 100)}% of cellar).`);
  }
  const topStyle = sortedStyles[0];
  if (topStyle && topStyle[1] / totalBottles >= 0.25) {
    strengths.push(`Good depth in ${topStyle[0]} — you have multiple vintages to compare.`);
  }
  const peakWines = cellar.filter((w) => ['peak', 'ready'].includes(deriveWindowStatus(w.koopjeschecker.drinkingWindow)));
  if (peakWines.length > 0) {
    strengths.push(`${peakWines.reduce((s, w) => s + w.quantity, 0)} bottle${peakWines.length > 1 ? 's' : ''} ready to drink right now.`);
  }
  const longAgers = cellar.filter((w) => w.koopjeschecker.cellarAdvice.ageingPotentialYears >= 12);
  if (longAgers.length > 0) {
    strengths.push(`${longAgers.reduce((s, w) => s + w.quantity, 0)} long-ageing bottle${longAgers.length > 1 ? 's' : ''} for the back of the cellar.`);
  }

  // Weaknesses
  if (topRegion && topRegion[1] / totalBottles > 0.6) {
    weaknesses.push(`Over 60% of your cellar is from ${topRegion[0]} — consider diversifying.`);
  }
  const tooYoung = cellar.filter((w) => deriveWindowStatus(w.koopjeschecker.drinkingWindow) === 'too_young');
  if (tooYoung.length > cellar.length * 0.5) {
    weaknesses.push(`More than half your wines are too young to drink — you may lack ready bottles for near-term drinking.`);
  }
  const pastPeak = cellar.filter((w) => deriveWindowStatus(w.koopjeschecker.drinkingWindow) === 'past_peak');
  if (pastPeak.length > 0) {
    weaknesses.push(`${pastPeak.length} wine${pastPeak.length > 1 ? 's are' : ' is'} past peak and should be opened soon.`);
  }

  // Missing regions (Alexander's typical preferences)
  const targetRegions = ['Veneto', 'Tuscany', 'Southern Rhône', 'Rioja Alta', 'Puglia', 'Piedmont'];
  for (const region of targetRegions) {
    if (!regionCounts.has(region) || (regionCounts.get(region) ?? 0) === 0) {
      missingRegions.push(region);
    }
  }

  // Missing styles
  const targetStyles = ['Amarone', 'Brunello', 'Primitivo', 'Rioja', 'Southern Rhône', 'Champagne'];
  for (const style of targetStyles) {
    if (!styleCounts.has(style)) {
      missingStyles.push(style);
    }
  }

  // Purchase suggestions
  if (missingRegions.includes('Southern Rhône')) {
    purchaseSuggestions.push('Add a Châteauneuf-du-Pape or Gigondas — your cellar has almost no Southern Rhône.');
  }
  if (!styleCounts.has('Champagne') || (styleCounts.get('Champagne') ?? 0) === 0) {
    purchaseSuggestions.push('Keep a bottle of Champagne on hand — even with a preference for reds, it\'s worth having one for occasions.');
  }
  if (longAgers.length === 0) {
    purchaseSuggestions.push('Consider a Barolo, Brunello Riserva, or Châteauneuf for long-term cellaring (10+ years).');
  }
  if (tooYoung.length > peakWines.length) {
    purchaseSuggestions.push('Buy a few bottles ready to drink now — your cellar skews young.');
  }
  if (purchaseSuggestions.length === 0) {
    purchaseSuggestions.push('Your cellar looks well-balanced. Focus on deepening your best-performing regions.');
  }

  return { strengths, weaknesses, missingRegions, missingStyles, purchaseSuggestions };
}

// ---------------------------------------------------------------------------
// Main sommelier insights
// ---------------------------------------------------------------------------

export interface SommelierInsights {
  drinkTonight: WineRecommendation[];
  buyNext: string[];
  attention: WineRecommendation[];
  cellarAnalysis: CellarAnalysis;
}

export function getSommelierInsights(cellar: CellarWine[]): SommelierInsights {
  const withStatus = cellar.map((w) => ({
    wine: w,
    status: deriveWindowStatus(w.koopjeschecker.drinkingWindow),
  }));

  const pastPeak = withStatus.filter((x) => x.status === 'past_peak').map((x) => x.wine);
  const peak = withStatus.filter((x) => x.status === 'peak').map((x) => x.wine);
  const ready = withStatus.filter((x) => x.status === 'ready').map((x) => x.wine);

  // Drink tonight: past-peak first (urgent), then peak wines by match score
  const tonightPool = [
    ...pastPeak,
    ...[...peak].sort((a, b) => b.koopjeschecker.personalScore.matchPercent - a.koopjeschecker.personalScore.matchPercent),
    ...[...ready].sort((a, b) => b.koopjeschecker.personalScore.matchPercent - a.koopjeschecker.personalScore.matchPercent),
  ];

  const drinkTonight = tonightPool.slice(0, 3).map((wine) => {
    const status = deriveWindowStatus(wine.koopjeschecker.drinkingWindow);
    const urgency = status === 'past_peak' ? 'urgent' : status === 'peak' ? 'now' : 'soon';
    return buildRecommendation(wine, urgency);
  });

  // Attention: past-peak wines not already in drinkTonight
  const tonightIds = new Set(drinkTonight.map((r) => r.wine.id));
  const attentionWines = pastPeak.filter((w) => !tonightIds.has(w.id));
  const currentYear = new Date().getFullYear();
  const drinkSoonWines = withStatus
    .filter((x) => x.status !== 'past_peak' && x.wine.koopjeschecker.drinkingWindow.to - currentYear <= 1)
    .map((x) => x.wine)
    .filter((w) => !tonightIds.has(w.id));

  const attention = [...attentionWines, ...drinkSoonWines]
    .slice(0, 3)
    .map((wine) => buildRecommendation(wine, 'urgent'));

  // Buy next — from cellar analysis gaps
  const analysis = getCellarAnalysis(cellar);
  const buyNext = analysis.purchaseSuggestions;

  return {
    drinkTonight,
    buyNext,
    attention,
    cellarAnalysis: analysis,
  };
}

// Keep for backwards compatibility with homepage
export function getSommelierInsightsLegacy(cellar: CellarWine[]) {
  const withStatus = cellar.map((w) => ({ wine: w, status: deriveWindowStatus(w.koopjeschecker.drinkingWindow) }));
  const pastPeak = withStatus.filter((x) => x.status === 'past_peak').map((x) => x.wine);
  const peak = withStatus.filter((x) => x.status === 'peak').map((x) => x.wine);
  const gaps = getCellarAnalysis(cellar).purchaseSuggestions;
  const currentYear = new Date().getFullYear();
  const drinkSoon = withStatus
    .filter((x) => x.status !== 'past_peak' && x.wine.koopjeschecker.drinkingWindow.to - currentYear <= 1)
    .map((x) => x.wine);
  return { drinkTonight: pastPeak.length > 0 ? pastPeak : peak.slice(0, 1), drinkSoon, peakWindow: peak, gaps };
}
