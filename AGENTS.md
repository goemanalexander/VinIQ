# VinIQ agent instructions

## Product scope
VinIQ is a mobile-first personal wine cellar manager. Keep the existing Next.js/TypeScript application and its core model (Wine, Bottle, Acquisition, MarketValuation, BottleEvent, RackLocation). Do not introduce Buying Advisor, OCR, deal scanning, or sommelier features unless explicitly requested.

## Data safety
- Never run tests against production user data or production database credentials.
- Treat Bottle records as the source of truth for stock quantity.
- Preserve the immutable bottle-event history.
- A rack position is unique: 4 rows (A-D), 6 columns (1-6).
- Never delete or reset the user's real cellar to make a test pass.
- Changes to persistence require an explicit migration/backup plan and an isolated test environment.

## Development workflow
1. Work on a feature branch; do not push feature code straight to main.
2. Make the smallest complete implementation that satisfies the request.
3. Run type checking, lint, production build and browser tests.
4. If a check fails, diagnose and fix it before requesting review.
5. Open a pull request describing changes, risks, test evidence and any preview URL.
6. Do not merge or deploy data migrations without verifying rollback and data safety.

## Current limitations
The GitHub baseline uses an in-memory storage placeholder, not durable persistence. Existing browser smoke tests only validate initial rendering; they do not yet test bottle CRUD or persistence. Do not claim these are covered.
