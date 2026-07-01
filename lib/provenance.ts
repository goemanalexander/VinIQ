/**
 * Knowledge Provenance — Sprint 7
 *
 * Pure types + display metadata for "where did this fact come from".
 * No business logic lives here — builders (wine-intel.ts, purchase-ledger.ts)
 * populate a ProvenanceMap, and UI components (ProvenanceBadge) read
 * PROVENANCE_META to render the right icon/label. Keeping this file free of
 * logic means new sources or fields can be added without touching the
 * builders or the validation engine.
 */

export type ProvenanceSource =
  | 'ocr'               // read directly from a scanned label
  | 'knowledge_base'    // generic but accurate knowledge about this wine style
  | 'inferred'          // computed from other known facts (grapes, vintage, region)
  | 'user'              // entered by hand by the user
  | 'purchase_history';   // derived from the user's own recorded purchases

export interface FieldProvenance {
  source: ProvenanceSource;
  /** Optional short qualifier shown in the tooltip, e.g. "from appellation" */
  detail?: string;
}

export const PROVENANCE_META: Record<ProvenanceSource, { icon: string; label: string }> = {
  ocr:              { icon: '✔',  label: 'Read from label' },
  knowledge_base:   { icon: '📚', label: 'Knowledge Base' },
  inferred:         { icon: '≈',  label: 'Inferred' },
  user:             { icon: '👤', label: 'User supplied' },
  purchase_history: { icon: '💰', label: 'Purchase history' },
};

/** Every field VinIQ displays that can carry a provenance tag */
export type ProvenanceField =
  | 'producer' | 'wineName' | 'vintage' | 'country' | 'region' | 'appellation' | 'grapes' | 'alcohol' | 'price'
  | 'style' | 'aromatics' | 'structure' | 'terroir' | 'drinkingWindow' | 'foodPairing'
  | 'purchasePrice' | 'personalRating';

export type ProvenanceMap = Partial<Record<ProvenanceField, FieldProvenance>>;

/** Tooltip text for a badge — label, plus the optional detail qualifier */
export function provenanceTooltip(p?: FieldProvenance): string | undefined {
  if (!p) return undefined;
  const meta = PROVENANCE_META[p.source];
  return p.detail ? `${meta.label} — ${p.detail}` : meta.label;
}
