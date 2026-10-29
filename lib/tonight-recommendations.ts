import type { WineWithCount } from './types';
import { getDrinkWindow, getPersonalDrinkMoment } from './utils';
import { buildTasteProfile, tasteMatch } from './taste-profile';

export type RecommendationMood = 'vol' | 'zacht' | 'fris' | 'alles';
export type TonightChoice = { wine: WineWithCount; reasons: string[]; tasteReason?: string };
export function explainTonight(wines: WineWithCount[], mood: RecommendationMood, year = new Date().getFullYear()): TonightChoice[] {
  const profile = buildTasteProfile(wines);
  return wines.filter(w => w.bottleCount > 0).map(w => {
    const window = getDrinkWindow(w);
    const personal = getPersonalDrinkMoment(w);
    let score = 0;
    const reasons: string[] = [];
    if (window.from && year >= window.from) score += 20;
    if (window.to && year <= window.to) score += 20;
    if (window.from && year < window.from) score -= 40;
    if (window.to && year > window.to) score -= 8;
    if (personal && year >= personal.from && year <= personal.to) { score += 12; reasons.push('Binnen jouw geschatte voorkeursperiode.'); }
    score += Math.min(10, Math.max(0, w.personalRating));
    if (w.personalRating >= 7) reasons.push(`Je gaf deze wijn ${w.personalRating}/10.`);
    const match = tasteMatch(w, profile);
    score += match.points;
    if (match.reason) reasons.push(match.reason);
    const haystack = [w.wineName, w.region, w.appellation, ...w.grapes].join(' ').toLowerCase();
    if (mood === 'vol' && /amarone|ripasso|primitivo|appassimento|monastrell|châteauneuf|brunello|syrah/.test(haystack)) { score += 20; reasons.push('Past bij je keuze voor vol en rijp rood.'); }
    if (mood === 'zacht' && /merlot|grenache|garnacha|rioja|montepulciano|governo|primitivo/.test(haystack)) { score += 20; reasons.push('Past bij je keuze voor zacht en rond.'); }
    if (mood === 'fris' && (w.color === 'white' || w.color === 'rosé' || w.color === 'sparkling')) { score += 20; reasons.push('Wit, rosé of mousserend zoals gevraagd.'); }
    if (mood !== 'fris' && w.color === 'red') score += 5;
    if (window.from && year >= window.from && (!window.to || year <= window.to)) reasons.push(window.estimated ? 'Binnen het geschatte drinkvenster.' : 'Binnen het opgegeven drinkvenster.');
    if (!reasons.length) reasons.push('Een beschikbare fles uit je kelder; weinig persoonlijke proefgegevens.');
    return { wine: w, score, reasons: reasons.slice(0, 3), tasteReason: match.reason };
  }).sort((a, b) => b.score - a.score || a.wine.wineName.localeCompare(b.wine.wineName)).map(({ wine, reasons, tasteReason }) => ({ wine, reasons, tasteReason }));
}

export function recommendTonight(wines: WineWithCount[], mood: RecommendationMood, year = new Date().getFullYear()): WineWithCount[] {
  return explainTonight(wines, mood, year).map(item => item.wine);
}
