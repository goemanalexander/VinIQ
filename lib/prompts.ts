/**
 * VinIQ — Vision prompts
 * Shared between API routes. Plain strings, no browser/server-specific deps.
 */

export const WINE_LIST_OCR_PROMPT = `You are analysing a photo of a restaurant wine list. Extract EVERY wine you can see in the image.

For each wine, extract:
- producer: the winery/producer name (or null if not shown)
- wineName: the wine name, appellation, or label text
- grapes: array of grape varieties (e.g. ["Grenache", "Merlot", "Syrah"]) — empty array if not shown
- vintage: the year as a number (or null if not shown)
- price: price as a number without currency symbol (or null if not shown)
- region: region or appellation (or null if not shown)

Return ONLY valid JSON — no explanation, no markdown, no preamble:
{
  "ocrText": "all the text you can read in the image verbatim",
  "wines": [
    {
      "producer": "string or null",
      "wineName": "string",
      "grapes": ["grape1", "grape2"],
      "vintage": 2019,
      "price": 32.50,
      "region": "string or null"
    }
  ]
}

Include ALL wines visible — even if only the name is legible. If a line is clearly a wine but details are illegible, include it with wineName set to whatever text you can read and nulls for the rest.`;

export const BOTTLE_OCR_PROMPT = `You are analysing a photo of a single wine bottle label. Extract everything visible on the label.

Extract:
- producer: the winery/producer name (or null if not legible)
- wineName: the wine name, cuvée, or appellation shown on the label
- grapes: array of grape varieties if listed (e.g. ["Sangiovese"]) — empty array if not shown
- vintage: the year as a number (or null if not visible)
- region: the region or appellation (or null if not shown)
- country: the country of origin (or null if not shown)
- classification: any quality classification visible, e.g. "Riserva", "Gran Reserva", "DOCG", "Grand Cru" (or null)
- alcohol: alcohol percentage as a number, e.g. 14.5 (or null if not visible)
- price: a price if visible on a tag/sticker in the photo (or null)
- labelNotes: any tasting notes or descriptive text printed on the back label (or null)

Return ONLY valid JSON — no explanation, no markdown:
{
  "ocrText": "all text you can read on the label verbatim",
  "wine": {
    "producer": "string or null",
    "wineName": "string",
    "grapes": ["grape1"],
    "vintage": 2019,
    "region": "string or null",
    "country": "string or null",
    "classification": "string or null",
    "alcohol": 14.5,
    "price": null,
    "labelNotes": "string or null"
  }
}

If the label is partially obscured or blurry, still extract what you can read and leave the rest null. Never invent information that isn't visible.`;

export const PROMOTION_OCR_PROMPT = `You are analysing a photo of a wine promotion — typically a shelf tag, price sticker, or supermarket display showing a discounted wine.

Extract:
- producer: the winery/producer name (or null if not legible)
- wineName: the wine name or appellation (or null/empty if not legible)
- grapes: array of grape varieties if shown — empty array if not shown
- vintage: the year as a number (or null if not visible)
- region: the region or appellation (or null if not shown)
- country: the country of origin (or null if not shown)
- classification: any quality classification visible, e.g. "Riserva" (or null)
- promotionPrice: the current/discounted price as a number (or null if not visible)
- originalPrice: the original/crossed-out price as a number, if shown (or null — many tags only show the new price)
- alcohol: alcohol percentage if visible (or null)

Return ONLY valid JSON — no explanation, no markdown:
{
  "ocrText": "all text you can read in the image verbatim, including prices",
  "wine": {
    "producer": "string or null",
    "wineName": "string",
    "grapes": [],
    "vintage": 2020,
    "region": "string or null",
    "country": "string or null",
    "classification": "string or null",
    "promotionPrice": 12.99,
    "originalPrice": 18.99,
    "alcohol": null
  }
}

Look carefully for a crossed-out or smaller "was" price near the main price — that's the originalPrice. If you only see one price, set originalPrice to null. Never invent a discount that isn't shown.`;
