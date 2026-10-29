import type { WineWithCount } from './types';

/** Derive a taste profile from saved tasting notes, without storing a second source of truth. */
export type TasteProfile = {
  tastings: number;
  distinctWines: number;
  confidence: 'start' | 'growing' | 'established';
  likedColors: string[];
  likedTextures: string[];
  likedAcidity: string[];
  likedStyles: string[];
};

const STYLE_RULES: Array<[string, RegExp]> = [
  ['Amarone', /amarone/i],
  ['Ripasso', /ripasso/i],
  ['Primitivo', /primitivo/i],
  ['Appassimento', /appassimento/i],
  ['Governo', /governo/i],
  ['Rioja / Reserva', /rioja|gran reserva/i],
  ['Montepulciano', /montepulciano/i],
  ['Brunello', /brunello/i],
  ['Grenache', /grenache|garnacha/i],
  ['Monastrell', /monastrell/i],
];

export function wineStyles(wine: Pick<WineWithCount, 'wineName' | 'appellation' | 'region' | 'grapes'>): string[] {
  const text = [wine.wineName, wine.appellation, wine.region, ...(wine.grapes ?? [])].join(' ');
  return STYLE_RULES.filter(([, re]) => re.test(text)).map(([label]) => label);
}

export type Tasting = { wineId: string; score: number; color?: string; texture?: string; acidity?: string; repurchase?: string };

export function extractTastings(wine: Pick<WineWithCount, 'id' | 'notes'>): Tasting[] {
  const chunks = (wine.notes ?? '').split(/(?=Proefnotitie\s+\d{1,2}\/\d{1,2}\/\d{4}\s*·)/);
  return chunks.flatMap(chunk => {
    const header = chunk.match(/^Proefnotitie\s+\d{1,2}\/\d{1,2}\/\d{4}\s*·\s*(\d{1,2})\/10/m);
    if (!header) return [];
    const value = (prefix: string) => chunk.split('\n').find(line => line.startsWith(prefix))?.slice(prefix.length).trim();
    return [{
      wineId: wine.id,
      score: Number(header[1]),
      color: value('Welke kleur geef je de smaak?'),
      texture: value('Hoe voelt hij in je mond?'),
      acidity: value('Hoe zuur smaakt hij?'),
      repurchase: value('Zou je hem opnieuw kopen?'),
    }];
  });
}

function topValues(values: string[], minCount = 1): string[] {
  const counts = new Map<string, number>();
  for (const value of values) if (value && value !== 'Weet ik niet' && value !== 'Anders / weet ik niet') {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].filter(([, n]) => n >= minCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'nl'))
    .slice(0, 3).map(([name]) => name);
}

export function buildTasteProfile(wines: WineWithCount[]): TasteProfile {
  const tastings = wines.flatMap(extractTastings);
  // Only positive, scored tastings count towards preferred sensations and styles.
  const liked = tastings.filter(t => t.score >= 7 && t.repurchase !== 'Nee');
  const likedWineIds = new Set(liked.map(t => t.wineId));
  const likedWines = wines.filter(w => likedWineIds.has(w.id));
  const distinctWines = new Set(tastings.map(t => t.wineId)).size;
  return {
    tastings: tastings.length,
    distinctWines,
    confidence: distinctWines >= 8 ? 'established' : distinctWines >= 3 ? 'growing' : 'start',
    likedColors: topValues(liked.map(t => t.color ?? '')),
    likedTextures: topValues(liked.map(t => t.texture ?? '')),
    likedAcidity: topValues(liked.map(t => t.acidity ?? '')),
    likedStyles: topValues(likedWines.flatMap(wineStyles)),
  };
}

/** A modest preference bonus: no claim of a statistical prediction from sparse data. */
export function tasteMatch(wine: WineWithCount, profile: TasteProfile): { points: number; reason?: string } {
  if (profile.confidence === 'start') return { points: 0 };
  const matching = wineStyles(wine).filter(style => profile.likedStyles.includes(style));
  if (!matching.length) return { points: 0 };
  return { points: profile.confidence === 'established' ? 12 : 7,
    reason: `Je gaf eerder een goede score aan ${matching[0]}.` };
}
