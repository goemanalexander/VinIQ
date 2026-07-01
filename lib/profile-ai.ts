/**
 * VinIQ AI Taste Profile Engine
 * Derives Alexander's taste profile from cellar contents, ratings, and feedback.
 * No manual input needed — the profile learns from behaviour.
 */

import type { AiTasteProfile, CellarWine, FeedbackEntry } from './types';

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function topN<T extends string>(counts: Map<T, number>, n: number): T[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function weightForWine(wine: CellarWine, feedback: FeedbackEntry[]): number {
  let weight = wine.quantity;
  if (wine.personalRating >= 9) weight *= 1.5;
  else if (wine.personalRating >= 7) weight *= 1.2;
  else if (wine.personalRating > 0 && wine.personalRating < 5) weight *= 0.6;
  const fb = feedback.find((f) => f.kcId === wine.koopjeschecker.id);
  if (fb?.verdict === 'thumbs_up') weight *= 1.3;
  if (fb?.verdict === 'thumbs_down') weight *= 0.4;
  return weight;
}

function describeAxis(label: string, value: number, lowWord: string, highWord: string): string | null {
  if (value >= 7.5) return `${highWord} ${label.toLowerCase()}`;
  if (value <= 3.5) return `${lowWord} ${label.toLowerCase()}`;
  return null; // mid — not distinctive enough to mention
}

export function generateAiProfile(
  cellar: CellarWine[],
  feedback: FeedbackEntry[]
): AiTasteProfile {
  const wines = cellar.filter((w) => w.koopjeschecker);

  if (wines.length === 0) {
    return {
      avgBody: 8,
      avgAcidity: 3,
      avgTannin: 6,
      avgSweetness: 6,
      topRegions: ['Veneto', 'Tuscany', 'Puglia'],
      topStyles: ['Amarone', 'Brunello', 'Primitivo'],
      insights: [
        "Add wines to your cellar and VinIQ will build your taste profile automatically.",
        "Rate your wines and give feedback on recommendations to help VinIQ learn faster.",
      ],
      basedOnBottles: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Weighted structure averages
  const bodies: number[] = [];
  const acidities: number[] = [];
  const tannins: number[] = [];
  const sweetnesses: number[] = [];
  const regionCounts = new Map<string, number>();
  const styleCounts = new Map<string, number>();

  for (const wine of wines) {
    const w = weightForWine(wine, feedback);
    const p = wine.koopjeschecker.structure.profile;
    for (let i = 0; i < w; i++) {
      bodies.push(p.body);
      acidities.push(p.acidity);
      tannins.push(p.tannin);
      sweetnesses.push(p.sweetness);
    }
    const region = wine.koopjeschecker.general.region;
    regionCounts.set(region, (regionCounts.get(region) ?? 0) + w);

    // Derive style from wine name / region heuristics
    const name = wine.wineName.toLowerCase();
    if (name.includes('amarone')) styleCounts.set('Amarone', (styleCounts.get('Amarone') ?? 0) + w);
    else if (name.includes('brunello')) styleCounts.set('Brunello', (styleCounts.get('Brunello') ?? 0) + w);
    else if (name.includes('primitivo')) styleCounts.set('Primitivo', (styleCounts.get('Primitivo') ?? 0) + w);
    else if (name.includes('rioja') || region === 'Rioja Alta') styleCounts.set('Rioja Reserva', (styleCounts.get('Rioja Reserva') ?? 0) + w);
    else if (region === 'Southern Rhône' || name.includes('châteauneuf') || name.includes('chateauneuf')) styleCounts.set('Southern Rhône blends', (styleCounts.get('Southern Rhône blends') ?? 0) + w);
    else if (name.includes('ripasso')) styleCounts.set('Ripasso', (styleCounts.get('Ripasso') ?? 0) + w);
    else if (name.includes('barolo')) styleCounts.set('Barolo', (styleCounts.get('Barolo') ?? 0) + w);
    else if (region === 'Champagne') styleCounts.set('Champagne', (styleCounts.get('Champagne') ?? 0) + w);
    else styleCounts.set(wine.wineName, (styleCounts.get(wine.wineName) ?? 0) + w);
  }

  const avgBody = Math.round(avg(bodies) * 10) / 10;
  const avgAcidity = Math.round(avg(acidities) * 10) / 10;
  const avgTannin = Math.round(avg(tannins) * 10) / 10;
  const avgSweetness = Math.round(avg(sweetnesses) * 10) / 10;
  const topRegions = topN(regionCounts, 5);
  const topStyles = topN(styleCounts, 5);

  // Generate insights
  const insights: string[] = [];
  const totalBottles = wines.reduce((s, w) => s + w.quantity, 0);

  // Style insight
  if (topStyles.length >= 3) {
    insights.push(
      `You consistently prefer ${topStyles.slice(0, -1).join(', ')} and ${topStyles[topStyles.length - 1]}.`
    );
  } else if (topStyles.length > 0) {
    insights.push(`Your go-to style is ${topStyles.join(' and ')}.`);
  }

  // Structure insight
  const structureTraits: string[] = [];
  const bodyDesc = describeAxis('body', avgBody, 'light', 'full');
  const acidDesc = describeAxis('acidity', avgAcidity, 'lower', 'higher');
  const tanninDesc = describeAxis('tannin', avgTannin, 'softer', 'firmer');
  const sweetnessDesc = describeAxis('sweetness', avgSweetness, 'drier', 'richer');
  if (bodyDesc) structureTraits.push(bodyDesc);
  if (acidDesc) structureTraits.push(acidDesc);
  if (tanninDesc) structureTraits.push(tanninDesc);
  if (sweetnessDesc) structureTraits.push(sweetnessDesc);
  if (structureTraits.length > 0) {
    insights.push(`You prefer ${structureTraits.join(', ')}.`);
  }

  // Region insight
  if (topRegions.length > 0) {
    const regionList = topRegions.slice(0, 3).join(', ');
    insights.push(`Your cellar is dominated by wines from ${regionList}.`);
  }

  // Feedback insight
  const thumbsUp = feedback.filter((f) => f.verdict === 'thumbs_up').length;
  const thumbsDown = feedback.filter((f) => f.verdict === 'thumbs_down').length;
  if (thumbsUp + thumbsDown >= 3) {
    insights.push(
      `Based on your feedback: ${thumbsUp} recommendation${thumbsUp !== 1 ? 's' : ''} confirmed, ${thumbsDown} rejected.`
    );
  }

  // Rating insight
  const ratedWines = wines.filter((w) => w.personalRating > 0);
  if (ratedWines.length >= 3) {
    const avgRating = avg(ratedWines.map((w) => w.personalRating));
    insights.push(`Your average personal rating is ${avgRating.toFixed(1)}/10 across ${ratedWines.length} rated wines.`);
  }

  if (insights.length === 0) {
    insights.push('Keep scanning and rating wines — VinIQ will refine your profile over time.');
  }

  return {
    avgBody,
    avgAcidity,
    avgTannin,
    avgSweetness,
    topRegions,
    topStyles,
    insights,
    basedOnBottles: totalBottles,
    lastUpdated: new Date().toISOString(),
  };
}
