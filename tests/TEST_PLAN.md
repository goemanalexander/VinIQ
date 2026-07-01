# VinIQ Regression Test Plan

All images are scanned via the Bottle Scan flow (`/scan/bottle`) unless the category column specifies otherwise.
Expected OCR results are defined in `expected-results.json`.

---

## Test images

| # | Image | Category | Expected behaviour | Status |
|---|-------|----------|--------------------|--------|
| 1 | `images/bottle/001-zenato-ripassa-front.jpg` | bottle | OCR reads producer as **Zenato**, wine as **Ripassa Valpolicella Ripasso Superiore**, country **Italy**. No vintage visible → vintage shown as estimated. No alcohol on front label → shown as "Not visible". Style/aromatics/terroir sections marked Estimated. | 🔲 Pending |
| 2 | `images/back-label/002-zenato-ripassa-back.jpg` | back-label | OCR reads producer **Zenato**, wine **Ripassa Valpolicella Ripasso Superiore**, alcohol **14%**, country **Italy**. No vintage on back label → shown as estimated. Region inferred as Veneto from appellation. Style sections marked Estimated. | 🔲 Pending |
| 3 | `images/bottle/003-chateau-cantemerle-2019-front.jpg` | bottle | OCR reads producer **Château Cantemerle**, wine **Château Cantemerle**, vintage **2019**, region **Haut-Médoc**, country **France**, classification **Grand Cru Classé en 1855**. High-confidence read. Style sections still marked Estimated. | 🔲 Pending |
| 4 | `images/bottle/004-moet-chandon-brut-imperial-front.jpg` | bottle | OCR reads producer **Moët & Chandon**, wine **Brut Impérial**, region **Champagne**, country **France**, alcohol **12.5%**. No vintage (NV Champagne) → vintage shown as estimated. Style sections marked Estimated. | 🔲 Pending |

---

## Status legend

| Symbol | Meaning |
|--------|---------|
| 🔲 Pending | Not yet run against current build |
| ✅ Pass | OCR output matches expected-results.json |
| ⚠️ Partial | Some fields correct, at least one high-confidence field wrong or missing |
| ❌ Fail | Critical field (producer, wine name, vintage) incorrect or hallucinated |

---

## How to run a manual test

1. Open the app at `/scan/bottle`.
2. Upload the test image using **Choose Photo**.
3. Compare the result page fields against `expected-results.json` for that image ID.
4. Update the Status column above.
