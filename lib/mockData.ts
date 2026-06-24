import type { CellarWine, Koopjeschecker, TasteProfile } from './types';

// ---------------------------------------------------------------------------
// A small but realistic database of Koopjeschecker analyses.
// These are reused by the cellar, the mock scan engine and the wine-list demo.
// Tailored to Alexander's profile: full-bodied, ripe fruit, soft tannins,
// lower acidity, ageing potential, bargain-hunting.
// ---------------------------------------------------------------------------

export const KC_AMARONE: Koopjeschecker = {
  id: 'kc-amarone-2017',
  general: {
    producer: "Tenuta Sant'Antonio",
    wineName: 'Amarone della Valpolicella Classico',
    vintage: 2017,
    country: 'Italy',
    region: 'Veneto',
    appellation: 'Amarone della Valpolicella Classico DOCG',
    grapes: ['Corvina', 'Rondinella', 'Corvinone'],
    alcohol: 15.5,
    price: 38,
  },
  style: {
    color: 'red',
    styleSummary: 'Rich, velvety and dried-fruit driven — a powerhouse built for slow evenings.',
    styleTags: ['Full-bodied', 'Dried fruit', 'Velvety tannins', 'High alcohol'],
  },
  aromatics: {
    primaryAromas: ['Raisin', 'Dried fig', 'Black cherry liqueur'],
    secondaryAromas: ['Vanilla', 'Sweet tobacco', 'Leather'],
    tertiaryAromas: ['Balsamic', 'Dried herbs', 'Cocoa'],
    description:
      'A dense nose of raisined fruit and fig, layered with sweet tobacco and a touch of balsamic vinegar that lifts the richness.',
  },
  structure: {
    profile: { body: 9, acidity: 4, tannin: 6, sweetness: 3, alcohol: 9 },
    description:
      'Full and weighty on the palate with silky, well-integrated tannins. The appassimento process concentrates the fruit into something almost liqueur-like, balanced by a warm, lingering finish.',
  },
  terroir: {
    soil: 'Volcanic and calcareous hillsides of the Classico zone',
    climate: 'Moderated by nearby Lake Garda, giving long, dry autumns',
    winemaking: 'Grapes dried on bamboo racks for ~110 days before fermentation (appassimento)',
    description:
      'The Classico hills around Negrar and Marano provide the best-ventilated lofts for drying grapes, concentrating sugars and flavour without losing freshness entirely.',
  },
  drinkingWindow: { from: 2021, to: 2032, peakFrom: 2025, peakTo: 2029, status: 'peak' },
  decanting: { shouldDecant: true, decantMinutes: 60, servingTempC: [16, 18], glassType: 'Large Bordeaux glass' },
  foodPairing: {
    dishes: ['Braised short ribs', 'Aged pecorino', 'Wild boar stew', 'Dark chocolate'],
    notes: 'Match its intensity — slow-cooked red meat and aged hard cheeses are the classic local pairing.',
  },
  personalScore: {
    matchPercent: 96,
    badges: ['alexanders_choice', 'ready_to_drink'],
    reasoning:
      "Hits everything you look for: full body, ripe-to-raisined fruit, soft tannins and noticeably low acidity. Currently sitting right in its peak drinking window.",
  },
  cellarAdvice: {
    action: 'BUY',
    ageingPotentialYears: 8,
    suggestion: 'Drinking beautifully now — no rush, but no real upside to holding much longer either.',
  },
  recommendedAction: 'BUY',
};

export const KC_BRUNELLO: Koopjeschecker = {
  id: 'kc-brunello-2018',
  general: {
    producer: 'Podere Le Ripi',
    wineName: 'Brunello di Montalcino',
    vintage: 2018,
    country: 'Italy',
    region: 'Tuscany',
    appellation: 'Brunello di Montalcino DOCG',
    grapes: ['Sangiovese'],
    alcohol: 14.5,
    price: 55,
  },
  style: {
    color: 'red',
    styleSummary: 'Structured and elegant Sangiovese with bright fruit and firm backbone.',
    styleTags: ['Full-bodied', 'Firm tannins', 'Bright cherry', 'Earthy'],
  },
  aromatics: {
    primaryAromas: ['Cherry', 'Red plum', 'Violet'],
    secondaryAromas: ['Cedar', 'Leather', 'Tobacco leaf'],
    tertiaryAromas: ['Forest floor', 'Dried rose', 'Balsamic'],
    description:
      'Bright red cherry and violet up front, giving way to cedar and leather from extended ageing in large Slavonian oak botti.',
  },
  structure: {
    profile: { body: 8, acidity: 6, tannin: 7, sweetness: 2, alcohol: 8 },
    description:
      'Powerful but refined — the tannins are firm and will soften further with time. Acidity is a touch higher than your usual sweet spot, which keeps it lively at the table.',
  },
  terroir: {
    soil: 'Galestro and clay-rich hillsides around Montalcino',
    climate: 'Warm, continental with strong diurnal swings',
    winemaking: 'Minimum 2 years in large oak botti, 4 months in bottle before release',
    description:
      'Montalcino sits slightly inland and higher than Chianti, giving Sangiovese here more concentration and structure — built for the long haul.',
  },
  drinkingWindow: { from: 2024, to: 2040, peakFrom: 2029, peakTo: 2036, status: 'too_young' },
  decanting: { shouldDecant: true, decantMinutes: 90, servingTempC: [17, 19], glassType: 'Large Burgundy glass' },
  foodPairing: {
    dishes: ['Wild boar ragù', 'Bistecca alla Fiorentina', 'Aged Pecorino Toscano'],
    notes: 'Needs rich, slow-cooked or grilled meat to meet its structure halfway.',
  },
  personalScore: {
    matchPercent: 88,
    badges: ['ageing_candidate', 'best_wine'],
    reasoning:
      'Excellent quality and full-bodied like you love, though the tannin and acidity are a notch above your usual preference — a few more years in the cellar will round it out nicely.',
  },
  cellarAdvice: {
    action: 'BUY',
    ageingPotentialYears: 15,
    suggestion: 'A genuine long-term holder. Tuck it away for 4–5 years before opening.',
  },
  recommendedAction: 'BUY',
};

export const KC_PRIMITIVO: Koopjeschecker = {
  id: 'kc-primitivo-2019',
  general: {
    producer: 'I Pastini',
    wineName: 'Primitivo di Manduria Riserva',
    vintage: 2019,
    country: 'Italy',
    region: 'Puglia',
    appellation: 'Primitivo di Manduria DOC Riserva',
    grapes: ['Primitivo'],
    alcohol: 15,
    price: 18,
  },
  style: {
    color: 'red',
    styleSummary: 'Jammy, sun-soaked and generous — everything turned up to full volume.',
    styleTags: ['Full-bodied', 'Jammy fruit', 'Soft tannins', 'Low acidity'],
  },
  aromatics: {
    primaryAromas: ['Blackberry jam', 'Black cherry', 'Fig'],
    secondaryAromas: ['Vanilla', 'Cocoa', 'Sweet baking spice'],
    tertiaryAromas: ['Leather'],
    description:
      'A generous, jammy nose of blackberry and fig with cocoa and warm spice from gentle oak ageing — pure southern Italian sunshine.',
  },
  structure: {
    profile: { body: 8, acidity: 3, tannin: 4, sweetness: 4, alcohol: 8 },
    description:
      'Plush and round with very soft tannins and noticeably low acidity — drinks almost like dessert wine but finishes dry. Effortless and immediately satisfying.',
  },
  terroir: {
    soil: 'Red clay over limestone bedrock',
    climate: 'Hot Mediterranean climate near the Ionian coast',
    winemaking: 'Partial air-drying of grapes, 8 months in oak',
    description:
      "Puglia's heat pushes sugars (and alcohol) high while keeping acidity naturally low — exactly the profile that suits your palate.",
  },
  drinkingWindow: { from: 2021, to: 2026, peakFrom: 2022, peakTo: 2025, status: 'peak' },
  decanting: { shouldDecant: true, decantMinutes: 30, servingTempC: [16, 18], glassType: 'Standard red wine glass' },
  foodPairing: {
    dishes: ['BBQ ribs', 'Tomato-based pasta', 'Aged Gouda'],
    notes: 'Loves smoky, sweet barbecue sauces — the wine\'s own sweetness mirrors them.',
  },
  personalScore: {
    matchPercent: 92,
    badges: ['great_buy', 'best_value', 'ready_to_drink'],
    reasoning:
      'Textbook match for your taste — full body, jammy ripe fruit, soft tannins, low acidity — and at this price it punches well above its weight.',
  },
  cellarAdvice: {
    action: 'BUY',
    ageingPotentialYears: 4,
    suggestion: 'Drink within the next 2–3 years while the fruit is still vibrant. Stock up — this is a bargain.',
  },
  recommendedAction: 'BUY',
};

export const KC_RIOJA: Koopjeschecker = {
  id: 'kc-rioja-2016',
  general: {
    producer: 'La Rioja Alta, S.A.',
    wineName: 'Viña Ardanza Reserva',
    vintage: 2016,
    country: 'Spain',
    region: 'Rioja Alta',
    appellation: 'Rioja DOCa Reserva',
    grapes: ['Tempranillo', 'Garnacha'],
    alcohol: 14,
    price: 28,
  },
  style: {
    color: 'red',
    styleSummary: 'Classic American-oak-aged Rioja — silky, fragrant and effortlessly elegant.',
    styleTags: ['Medium-full body', 'Vanilla oak', 'Silky tannins', 'Red fruit'],
  },
  aromatics: {
    primaryAromas: ['Red cherry', 'Strawberry', 'Plum'],
    secondaryAromas: ['Vanilla', 'Coconut', 'Dill'],
    tertiaryAromas: ['Tobacco', 'Leather', 'Dried herbs'],
    description:
      'Sweet red fruit wrapped in classic American oak — vanilla, coconut and dill — with savoury tobacco notes from bottle age.',
  },
  structure: {
    profile: { body: 7, acidity: 5, tannin: 5, sweetness: 3, alcohol: 7 },
    description:
      'Silky and approachable with fully resolved, soft tannins. A touch lighter than your usual Amarone-style pours, but the oak-driven richness fills the gap.',
  },
  terroir: {
    soil: 'Clay-limestone soils of Rioja Alta',
    climate: 'Continental with Atlantic influence — cooler than southern Spain',
    winemaking: 'Extended ageing in American oak barrels, classic Reserva style',
    description:
      'Rioja Alta sits higher and cooler than Rioja Baja, retaining freshness while the long American-oak regime adds the signature vanilla sweetness.',
  },
  drinkingWindow: { from: 2021, to: 2031, peakFrom: 2023, peakTo: 2029, status: 'peak' },
  decanting: { shouldDecant: true, decantMinutes: 45, servingTempC: [16, 18], glassType: 'Bordeaux glass' },
  foodPairing: {
    dishes: ['Roast lamb', 'Chorizo', 'Manchego'],
    notes: 'A natural with anything off the Spanish grill.',
  },
  personalScore: {
    matchPercent: 90,
    badges: ['best_price_quality', 'ready_to_drink'],
    reasoning:
      'Soft tannins and low-to-moderate acidity sit right in your comfort zone, and the price-to-quality ratio here is exceptional for a Reserva of this pedigree.',
  },
  cellarAdvice: {
    action: 'BUY',
    ageingPotentialYears: 8,
    suggestion: 'Drinking very well now, with room to hold a few more years if you prefer more leather and less fruit.',
  },
  recommendedAction: 'BUY',
};

export const KC_CHATEAUNEUF: Koopjeschecker = {
  id: 'kc-cdp-2019',
  general: {
    producer: 'Domaine de la Janasse',
    wineName: 'Châteauneuf-du-Pape',
    vintage: 2019,
    country: 'France',
    region: 'Southern Rhône',
    appellation: 'Châteauneuf-du-Pape AOC',
    grapes: ['Grenache', 'Syrah', 'Mourvèdre'],
    alcohol: 14.5,
    price: 42,
  },
  style: {
    color: 'red',
    styleSummary: 'Warm, garrigue-spiced and generously fruited — southern Rhône at its most expressive.',
    styleTags: ['Full-bodied', 'Garrigue spice', 'Velvety', 'Sun-ripened fruit'],
  },
  aromatics: {
    primaryAromas: ['Raspberry', 'Black cherry', 'Plum'],
    secondaryAromas: ['Garrigue herbs', 'Black pepper', 'Liquorice'],
    tertiaryAromas: ['Leather', 'Truffle'],
    description:
      'A heady mix of sun-ripened red and black fruit, wild herbs and black pepper, with a savoury, almost truffled undertone.',
  },
  structure: {
    profile: { body: 9, acidity: 4, tannin: 5, sweetness: 3, alcohol: 8 },
    description:
      'Broad and velvety, with ripe tannins and a warm, spicy finish. Grenache-led blends like this rarely show aggressive acidity or tannin — built for pleasure.',
  },
  terroir: {
    soil: 'Galets roulés (large rolled stones) over clay and sand',
    climate: 'Mediterranean, with the Mistral wind keeping vines healthy',
    winemaking: 'Co-fermented field blend, aged in a mix of old oak and concrete',
    description:
      'The famous rolled stones store heat and reflect it back onto the low-trained vines, pushing ripeness to its limit — a hallmark of the appellation.',
  },
  drinkingWindow: { from: 2023, to: 2035, peakFrom: 2027, peakTo: 2033, status: 'too_young' },
  decanting: { shouldDecant: true, decantMinutes: 60, servingTempC: [16, 18], glassType: 'Large Burgundy glass' },
  foodPairing: {
    dishes: ['Lamb tagine', 'Duck breast', 'Mature Comté'],
    notes: 'Spiced, slow-cooked dishes echo the garrigue character beautifully.',
  },
  personalScore: {
    matchPercent: 95,
    badges: ['ageing_candidate', 'great_buy'],
    reasoning:
      'Grenache-dominant blends are about as close to your ideal profile as it gets — full-bodied, soft-tannined, low-acid and built to age gracefully.',
  },
  cellarAdvice: {
    action: 'BUY',
    ageingPotentialYears: 12,
    suggestion: 'Still a little tight — give it 3–4 years and it will reward you generously.',
  },
  recommendedAction: 'BUY',
};

export const KC_RIPASSO: Koopjeschecker = {
  id: 'kc-ripasso-2020',
  general: {
    producer: 'Zenato',
    wineName: 'Valpolicella Ripasso Superiore',
    vintage: 2020,
    country: 'Italy',
    region: 'Veneto',
    appellation: 'Valpolicella Ripasso DOC Superiore',
    grapes: ['Corvina', 'Rondinella', 'Corvinone'],
    alcohol: 13.5,
    price: 16,
  },
  style: {
    color: 'red',
    styleSummary: "Amarone's approachable little brother — dried-fruit richness without the heaviness.",
    styleTags: ['Medium-full body', 'Dried cherry', 'Smooth tannins', 'Approachable'],
  },
  aromatics: {
    primaryAromas: ['Cherry', 'Red plum'],
    secondaryAromas: ['Dried fig', 'Baking spice'],
    tertiaryAromas: ['Subtle leather'],
    description:
      'Dried cherry and fig with a gentle layer of baking spice — a softer echo of Amarone at a fraction of the price.',
  },
  structure: {
    profile: { body: 7, acidity: 5, tannin: 5, sweetness: 3, alcohol: 6 },
    description:
      'Smooth and medium-full bodied, re-fermented on Amarone skins for extra depth without the raisined intensity. Easy-drinking but with real character.',
  },
  terroir: {
    soil: 'Same Classico hillsides as Amarone',
    climate: 'Lake Garda-moderated',
    winemaking: 'Re-passed (ripasso) over leftover Amarone skins and lees',
    description: 'A clever use of Amarone pomace gives this everyday wine genuine depth and a touch of dried-fruit richness.',
  },
  drinkingWindow: { from: 2021, to: 2026, peakFrom: 2022, peakTo: 2025, status: 'peak' },
  decanting: { shouldDecant: true, decantMinutes: 30, servingTempC: [16, 17], glassType: 'Standard red wine glass' },
  foodPairing: {
    dishes: ['Pizza', 'Salumi board', 'Pasta al ragù'],
    notes: 'An easy weeknight partner for almost anything tomato or cured-meat based.',
  },
  personalScore: {
    matchPercent: 84,
    badges: ['best_value', 'ready_to_drink'],
    reasoning:
      'Good fit for your full-bodied, soft-tannin preference, though a touch lighter and fresher than your favourites — a reliable everyday bottle.',
  },
  cellarAdvice: {
    action: 'CONSIDER',
    ageingPotentialYears: 3,
    suggestion: 'Solid value for drinking now; not one to age further.',
  },
  recommendedAction: 'CONSIDER',
};

/** Same wine, older vintage — used to demonstrate a "past peak" cellar bottle. */
export const KC_RIPASSO_OLD: Koopjeschecker = {
  ...KC_RIPASSO,
  id: 'kc-ripasso-2017',
  general: { ...KC_RIPASSO.general, vintage: 2017, price: 15 },
  drinkingWindow: { from: 2018, to: 2023, peakFrom: 2019, peakTo: 2022, status: 'past_peak' },
  personalScore: {
    ...KC_RIPASSO.personalScore,
    matchPercent: 70,
    badges: [],
    reasoning: 'Was a lovely everyday glass, but this vintage has now drifted past its best — the fruit will be fading.',
  },
  cellarAdvice: {
    action: 'CONSIDER',
    ageingPotentialYears: 0,
    suggestion: 'Past its peak — open soon before the fruit fades further.',
  },
  recommendedAction: 'CONSIDER',
};

export const KC_BAROLO: Koopjeschecker = {
  id: 'kc-barolo-2017',
  general: {
    producer: 'Pio Cesare',
    wineName: 'Barolo',
    vintage: 2017,
    country: 'Italy',
    region: 'Piedmont',
    appellation: 'Barolo DOCG',
    grapes: ['Nebbiolo'],
    alcohol: 14,
    price: 48,
  },
  style: {
    color: 'red',
    styleSummary: 'The "King of Wines" — powerful, structured and built for the very long term.',
    styleTags: ['Full-bodied', 'High tannin', 'High acidity', 'Tar & roses'],
  },
  aromatics: {
    primaryAromas: ['Cherry', 'Rose'],
    secondaryAromas: ['Tar', 'Leather'],
    tertiaryAromas: ['White truffle', 'Dried herbs'],
    description: 'Classic tar-and-roses Nebbiolo nose, with savoury truffle notes emerging with air.',
  },
  structure: {
    profile: { body: 8, acidity: 8, tannin: 9, sweetness: 1, alcohol: 7 },
    description:
      'Powerful and grippy — high acidity and very firm, drying tannins dominate right now. This is a wine that needs a decade or more to soften.',
  },
  terroir: {
    soil: 'Calcareous clay marl of the Barolo zone',
    climate: 'Continental, with significant fog influence ("nebbia")',
    winemaking: 'Long maceration, extended ageing in large Slavonian oak botti',
    description: 'Nebbiolo from these clay-marl soils produces some of the most age-worthy wines in the world.',
  },
  drinkingWindow: { from: 2026, to: 2045, peakFrom: 2032, peakTo: 2042, status: 'too_young' },
  decanting: { shouldDecant: true, decantMinutes: 120, servingTempC: [17, 18], glassType: 'Large Burgundy glass' },
  foodPairing: {
    dishes: ['White truffle risotto', 'Braised beef cheeks', 'Aged Castelmagno'],
    notes: 'Needs rich, fatty dishes to stand up to the tannin and acid.',
  },
  personalScore: {
    matchPercent: 58,
    badges: [],
    reasoning:
      'A genuinely great wine, but the high acidity and very firm tannins sit well outside your usual preference for soft, low-acid styles — this is more of a collector\'s wine than a weeknight pour.',
  },
  cellarAdvice: {
    action: 'CONSIDER',
    ageingPotentialYears: 18,
    suggestion: 'Exceptional long-term ageing potential, but only worth buying if you\'re happy to wait a decade — otherwise it may not suit your palate even then.',
  },
  recommendedAction: 'CONSIDER',
};

export const KC_CHAMPAGNE: Koopjeschecker = {
  id: 'kc-champagne-2019',
  general: {
    producer: 'Pierre Gimonnet & Fils',
    wineName: 'Brut Blanc de Blancs 1er Cru',
    vintage: 2019,
    country: 'France',
    region: 'Champagne',
    appellation: 'Champagne AOC 1er Cru',
    grapes: ['Chardonnay'],
    alcohol: 12,
    price: 32,
  },
  style: {
    color: 'sparkling',
    styleSummary: 'Crisp, mineral Blanc de Blancs — precise and refreshing.',
    styleTags: ['Light-bodied', 'Crisp', 'Citrus', 'Mineral'],
  },
  aromatics: {
    primaryAromas: ['Lemon', 'Green apple'],
    secondaryAromas: ['Brioche', 'Toasted almond'],
    tertiaryAromas: ['Chalk'],
    description: 'Bright citrus and green apple with a fine brioche note from time on the lees, finishing chalky and dry.',
  },
  structure: {
    profile: { body: 3, acidity: 9, tannin: 1, sweetness: 2, alcohol: 4 },
    description:
      'Light, taut and high-acid by design — exactly the opposite of your usual full-bodied, low-acid preference, though that\'s precisely what makes it refreshing.',
  },
  terroir: {
    soil: 'Pure chalk of the Côte des Blancs',
    climate: 'Cool, marginal climate ideal for high-acid base wines',
    winemaking: 'Traditional method, extended lees ageing',
    description: 'Chardonnay from pure chalk soils gives the precision and minerality this style is famous for.',
  },
  drinkingWindow: { from: 2022, to: 2028, peakFrom: 2023, peakTo: 2026, status: 'ready' },
  decanting: { shouldDecant: false, decantMinutes: 0, servingTempC: [8, 10], glassType: 'Tulip glass' },
  foodPairing: {
    dishes: ['Oysters', 'Sushi', 'Fresh goat cheese'],
    notes: 'Best as an aperitif or with light, briny food — not a match for your usual hearty pairings.',
  },
  personalScore: {
    matchPercent: 45,
    badges: [],
    reasoning:
      'Lovely, well-made Champagne, but light body and high acidity are the opposite of what you usually reach for — more of an occasion wine than a cellar staple.',
  },
  cellarAdvice: {
    action: 'SKIP',
    ageingPotentialYears: 4,
    suggestion: 'Enjoy it for a special aperitif occasion, but it won\'t scratch your usual itch — no need to stock up.',
  },
  recommendedAction: 'SKIP',
};

/** All Koopjeschecker entries, used as the pool for the mock scanning engine. */
export const ALL_KOOPJESCHECKERS: Koopjeschecker[] = [
  KC_AMARONE,
  KC_BRUNELLO,
  KC_PRIMITIVO,
  KC_RIOJA,
  KC_CHATEAUNEUF,
  KC_RIPASSO,
  KC_RIPASSO_OLD,
  KC_BAROLO,
  KC_CHAMPAGNE,
];

// ---------------------------------------------------------------------------
// Default cellar — seeded on first run.
// Composition deliberately skews Italian (Amarone, Brunello, Primitivo, two
// Ripassos, Barolo) with one Rioja and one Châteauneuf-du-Pape, so the
// "Cellar Gaps" sommelier note about Southern Rhône feels true.
// ---------------------------------------------------------------------------

export const DEFAULT_CELLAR: CellarWine[] = [];

// ---------------------------------------------------------------------------
// Default taste profile
// ---------------------------------------------------------------------------

export const DEFAULT_PROFILE: TasteProfile = {
  body: 9,
  acidity: 3,
  tannin: 6,
  sweetness: 7,
  favouriteRegions: ['Veneto', 'Tuscany', 'Puglia', 'Rioja', 'Southern Rhône'],
  favouriteStyles: ['Amarone', 'Brunello', 'Primitivo', 'Rioja Reserva', 'Southern Rhône blends'],
};
