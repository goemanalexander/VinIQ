# Changelog

All notable changes to VinIQ are documented in this file.

## v0.5.0 — Multi-Image Promotion Advisor

### New
- Scan a whole promotion folder: upload up to 6 pages in one go
- One ranked shortlist of the best buys, powered by the existing Buying Advisor
- Package-deal understanding (4+2 free, case prices) with an explicit effective price per bottle
- Conservative cross-page duplicate detection
- Uncertain offers land in "Needs review" with manual correction instead of a forced verdict
- One unreadable page no longer discards the rest of the batch

### Improved
- Image optimisation extracted into a shared helper used by both scan flows

## v0.4.2 — Purchase Flow Polish

### Improved
- Retailer suggestions in the purchase dialog, based on previously used retailers (deduplicated, manual entry preserved)
- Post-purchase confirmation now states the updated bottle count and average purchase price
- Repeat purchases show lowest / highest / average price ever paid for the wine
- Live indication whether the entered price is above, below, or in line with your usual price

## v0.4.1 — Buying Advisor Calibration

### Improved
- Buying Advisor is stricter when scanned price is above Alexander's own purchase history
- Recommended quantity now better matches the verdict
- Buying Advisor is better aligned with Purchase Intelligence
- Added clearer warnings for expensive repeat purchases

## v0.4.0 — Buying Advisor

### New
- Added deterministic Buying Advisor for scan results
- Added personal buy/skip verdicts
- Added recommended purchase quantity
- Added cellar-aware buying context

### Improved
- Scan results now help decide whether and how much to buy

## v0.3.2 — Scan Loading Improvements

### Improved
- Premium stepped loading screen while a scan is analysed (label reading → identification → provenance check → personal analysis), with image preview.
- Calm reassurance message when analysis takes longer than 8 seconds.
- Client-side image downscaling before upload — large photos now upload much faster without hurting label readability.
- Scans can no longer hang indefinitely: requests time out with a clear retry message.

## v0.3.1 — App Version Display

### Improved
- Added visible app version information to the Profile page.

## v0.3 — Cellar Intelligence

### New
- Cellar Intelligence section
- Drinking window insights
- Collection balance
- Collection gaps
- Purchase/value insights
- Personal taste summary

### Improved
- Cellar page now acts more like an advisor
- Old duplicate statistics card removed
- Mobile-optimised purchase dialog (numeric keyboards, auto-select, decimal comma support, double-tap protection)

## v0.2

### New
- Trusted Data
- Purchase Ledger
- Purchase Intelligence
- Personal Sommelier
- Recommendation Engine
- Validation Layer
- Provenance

### Improved
- No invented wine facts
- Better recommendation quality
- Better purchase flow

### Fixed
- Data consistency issues
- Validation false positives
