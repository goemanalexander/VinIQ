import type { WineWithCount } from './types';
import { getDrinkWindow, getPersonalDrinkMoment } from './utils';

export type RecommendationMood = 'vol' | 'zacht' | 'fris' | 'alles';
export function recommendTonight(wines: WineWithCount[], mood: RecommendationMood, year = new Date().getFullYear()): WineWithCount[] {
  return wines.filter(w => w.bottleCount > 0).map(w => {
    const window = getDrinkWindow(w);
    const personal = getPersonalDrinkMoment(w);
    let score = 0;
    if (window.from && year >= window.from) score += 20;
    if (window.to && year <= window.to) score += 20;
    if (window.from && year < window.from) score -= 40;
    if (window.to && year > window.to) score -= 8;
    if (personal && year >= personal.from && year <= personal.to) score += 12;
    score += Math.min(10, Math.max(0, w.personalRating));
    const haystack = [w.wineName, w.region, w.appellation, ...w.grapes].join(' ').toLowerCase();
    if (mood === 'vol' && /amarone|ripasso|primitivo|appassimento|monastrell|châteauneuf|brunello|syrah/.test(haystack)) score += 20;
    if (mood === 'zacht' && /merlot|grenache|garnacha|rioja|montepulciano|governo|primitivo/.test(haystack)) score += 20;
    if (mood === 'fris' && (w.color === 'white' || w.color === 'rosé' || w.color === 'sparkling')) score += 20;
    if (mood !== 'fris' && w.color === 'red') score += 5;
    return { wine: w, score };
  }).sort((a, b) => b.score - a.score || a.wine.wineName.localeCompare(b.wine.wineName)).map(x => x.wine);
}
