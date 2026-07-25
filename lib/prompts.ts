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

export const PROMOTION_BATCH_OCR_PROMPT = `You are analysing ONE page of a wine promotion folder or supermarket display. The page may contain MULTIPLE wine offers. Extract EVERY distinct wine offer you can see.

For each offer, extract only what is clearly printed:
- wineName: the wine name or appellation (or null if not legible)
- producer: the winery/producer name (or null)
- vintage: the year as a number (or null — never guess)
- country: country of origin (or null)
- region: region or appellation (or null)
- color: "red", "white", "rosé" or "sparkling" (or null if unclear)
- grapes: array of grape varieties if printed — empty array if not shown
- classification: quality classification like "Riserva", "DOC" (or null)
- ratingOrMedal: a rating score or medal ONLY if clearly printed, e.g. "Gold medal", "92 pts" (or null)
- unitPrice: the current price for ONE bottle as a number (or null)
- originalPrice: a crossed-out/"was" price for one bottle (or null)
- packagePrice: a price that clearly applies to a MULTI-BOTTLE package or case (or null)
- packageBottleCount: how many bottles that package price covers (or null)
- paidBottleCount: for "X+Y free" style offers, the number of bottles paid for (or null)
- freeBottleCount: for "X+Y free" style offers, the number of free bottles (or null)
- identificationConfidence: "high" | "medium" | "low" — how sure you are which wine this is
- priceConfidence: "high" | "medium" | "low" — how sure you are what the price structure is
- warnings: array of short notes about anything ambiguous (e.g. "price may apply per case", "mixed package, wines not individually priced")

Critical price rules:
- NEVER put a package/case price in unitPrice. If a price says "per 6 bottles", it is packagePrice with packageBottleCount 6.
- For "4+2 gratis" style offers: paidBottleCount 4, freeBottleCount 2, unitPrice = the per-bottle price if shown.
- If it is unclear whether a price is per bottle or per package, set priceConfidence to "low" and add a warning.
- For mixed packages (different wines sold together for one price), report the package as ONE offer with the package name, packagePrice, packageBottleCount, identificationConfidence "low", and a warning.
- Never invent vintages, regions, grapes, ratings or prices that are not printed.

Also extract:
- retailer: the shop/chain name if visible anywhere on the page (or null)

Return ONLY valid JSON — no explanation, no markdown:
{
  "ocrText": "all text you can read on the page verbatim, including all prices",
  "retailer": "string or null",
  "offers": [
    {
      "wineName": "string or null",
      "producer": "string or null",
      "vintage": 2021,
      "country": "string or null",
      "region": "string or null",
      "color": "red",
      "grapes": [],
      "classification": "string or null",
      "ratingOrMedal": "string or null",
      "unitPrice": 8.99,
      "originalPrice": 11.99,
      "packagePrice": null,
      "packageBottleCount": null,
      "paidBottleCount": null,
      "freeBottleCount": null,
      "identificationConfidence": "high",
      "priceConfidence": "high",
      "warnings": []
    }
  ]
}

If the page is unreadable or contains no wine offers, return {"ocrText": "...", "retailer": null, "offers": []}.`;
