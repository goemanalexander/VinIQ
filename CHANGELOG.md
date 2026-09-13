# Changelog

## v1.0.0-alpha.1 — Cellar Foundation Cleanup

VinIQ has been reset to **Cellar Management Only**.

### Removed
- AI sommelier
- Promotion scanner (single + batch)
- Wine-list OCR scanner
- Buying Advisor
- Recommendation Engine
- Koopjeschecker
- Claude/Vision API routes
- Cellar Intelligence (AI-generated insights)
- Personal taste profile (AI-derived)
- Scan UI and loading overlays
- Feedback system
- Provenance tracking
- All AI/OCR lib modules (~3,500 lines deleted)

### Added
- New canonical data model: Wine · Bottle · Acquisition · MarketValuation · BottleEvent
- Bottle is the single source of truth for quantity — no independent wine.quantity
- Location model: rack positions (A1–D6) and outside-rack with optional label
- Bottle size support: 375 / 500 / 750 / 1500 ml
- Dutch UI route structure: /kelder, /kelder/rek, /kelder/wijn/[id]
- Async storage API (in-memory placeholder — Supabase follows in Phase 2)
- Dutch utility labels for drink window status and locations
- Market value estimation by appellation

### Stack
Next.js 14 / TypeScript / Tailwind CSS / Vercel
Persistence: in-memory (Phase 1) → Supabase (Phase 2)

---

## Previous versions (archived)

v0.5.0 — Multi-Image Promotion Advisor (removed)
v0.4.x — Buying Advisor (removed)
v0.3.x — Cellar Intelligence (removed)
v0.2.x — Sommelier, Recommendation Engine (removed)
