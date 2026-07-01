import type { FieldProvenance } from '@/lib/provenance';
import { PROVENANCE_META, provenanceTooltip } from '@/lib/provenance';

/**
 * A single small icon indicating where a displayed fact came from.
 * Deliberately minimal — icon only, full label lives in the native
 * `title` tooltip — so it reads as a quiet trust signal, not clutter.
 */
export default function ProvenanceBadge({ provenance }: { provenance?: FieldProvenance }) {
  if (!provenance) return null;
  const meta = PROVENANCE_META[provenance.source];
  return (
    <span
      title={provenanceTooltip(provenance)}
      className="ml-1.5 inline-block cursor-help text-[11px] leading-none opacity-60"
      aria-label={meta.label}
    >
      {meta.icon}
    </span>
  );
}
