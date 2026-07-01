import type { Koopjeschecker } from '@/lib/types';
import type { FieldProvenance } from '@/lib/provenance';
import { PROVENANCE_META } from '@/lib/provenance';
import { WINDOW_STATUS_LABEL, deriveWindowStatus, formatCurrency } from '@/lib/utils';
import ExpandableSection from './ExpandableSection';
import StructureBars from './StructureBars';
import MatchStars from './MatchStars';
import { BadgeRow } from './BadgeChip';
import ActionBanner from './ActionBanner';
import ProvenanceBadge from './ProvenanceBadge';

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-cream-300/15 bg-navy-700/50 px-2.5 py-1 text-xs text-cream-200">
      {children}
    </span>
  );
}

function TagGroup({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-cream-300/50">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Tag key={item}>{item}</Tag>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value, provenance }: { label: string; value: React.ReactNode; provenance?: FieldProvenance }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="text-cream-300/60">
        {label}
        <ProvenanceBadge provenance={provenance} />
      </span>
      <span className="text-right font-medium text-cream-100">{value}</span>
    </div>
  );
}

/** Provenance-aware estimate notice — distinguishes static style knowledge from computed inference. */
function EstimatedNotice({ provenance }: { provenance?: FieldProvenance }) {
  const meta = provenance ? PROVENANCE_META[provenance.source] : null;
  const sourceLabel = meta
    ? provenance?.detail
      ? `${meta.icon} ${meta.label} — ${provenance.detail}`
      : `${meta.icon} ${meta.label}`
    : 'Estimated';
  return (
    <p className="mb-3 rounded-lg border border-gold-500/20 bg-gold-500/5 px-3 py-1.5 text-[11px] text-gold-400/70 italic">
      {sourceLabel} — generic style profile, not specific to this wine&apos;s label.
    </p>
  );
}

export default function KoopjesChecker({ data, defaultOpenFirst = false }: { data: Koopjeschecker; defaultOpenFirst?: boolean }) {
  const dw = data.drinkingWindow;
  const status = deriveWindowStatus(dw);
  const totalSpan = Math.max(dw.to - dw.from, 1);
  const peakStartPct = ((dw.peakFrom - dw.from) / totalSpan) * 100;
  const peakWidthPct = ((dw.peakTo - dw.peakFrom) / totalSpan) * 100;
  const currentYear = new Date().getFullYear();
  const nowPct = Math.min(100, Math.max(0, ((currentYear - dw.from) / totalSpan) * 100));

  return (
    <div className="space-y-3">
      {/* 1 — General Information */}
      <ExpandableSection number={1} title="General Information" icon="🏷️" defaultOpen={defaultOpenFirst}>
        <div className="space-y-1">
          <InfoRow label="Producer" value={data.general.producer || 'Unknown'} provenance={data.provenance?.producer} />
          <InfoRow label="Wine" value={data.general.wineName} provenance={data.provenance?.wineName} />
          <InfoRow label="Vintage" value={data.general.vintage > 0 ? data.general.vintage : 'Not visible'} provenance={data.provenance?.vintage} />
          <InfoRow label="Appellation" value={data.general.appellation || 'Not visible'} provenance={data.provenance?.appellation} />
          <InfoRow label="Region" value={`${data.general.region}, ${data.general.country}`} provenance={data.provenance?.region} />
          <InfoRow label="Grapes" value={data.general.grapes.length > 0 ? data.general.grapes.join(', ') : 'Not visible'} provenance={data.provenance?.grapes} />
          <InfoRow label="Alcohol" value={data.general.alcohol > 0 ? `${data.general.alcohol}%` : 'Not visible'} provenance={data.provenance?.alcohol} />
          {data.general.price !== undefined && <InfoRow label="Price" value={formatCurrency(data.general.price)} provenance={data.provenance?.price} />}
        </div>
      </ExpandableSection>

      {/* 2 — Style */}
      <ExpandableSection number={2} title="Style" icon="🍷">
        {data.style.isEstimated && <EstimatedNotice provenance={data.provenance?.style} />}
        <p className="mb-3 text-sm leading-relaxed text-cream-200">{data.style.styleSummary}</p>
        <TagGroup label="Style tags" items={data.style.styleTags} />
      </ExpandableSection>

      {/* 3 — Aromatic Profile */}
      <ExpandableSection number={3} title="Aromatic Profile" icon="👃">
        {data.aromatics.isEstimated && <EstimatedNotice provenance={data.provenance?.aromatics} />}
        <p className="mb-3 text-sm leading-relaxed text-cream-200">{data.aromatics.description}</p>
        <div className="space-y-3">
          <TagGroup label="Primary aromas" items={data.aromatics.primaryAromas} />
          <TagGroup label="Secondary aromas" items={data.aromatics.secondaryAromas} />
          <TagGroup label="Tertiary aromas" items={data.aromatics.tertiaryAromas} />
        </div>
      </ExpandableSection>

      {/* 4 — Structure */}
      <ExpandableSection number={4} title="Structure" icon="⚖️">
        {data.structure.isEstimated && <EstimatedNotice provenance={data.provenance?.structure} />}
        <p className="mb-4 text-sm leading-relaxed text-cream-200">{data.structure.description}</p>
        <StructureBars profile={data.structure.profile} />
      </ExpandableSection>

      {/* 5 — Terroir */}
      <ExpandableSection number={5} title="Terroir" icon="⛰️">
        {data.terroir.isEstimated && <EstimatedNotice provenance={data.provenance?.terroir} />}
        <p className="mb-3 text-sm leading-relaxed text-cream-200">{data.terroir.description}</p>
        <div className="space-y-1">
          <InfoRow label="Soil" value={data.terroir.soil} />
          <InfoRow label="Climate" value={data.terroir.climate} />
          <InfoRow label="Winemaking" value={data.terroir.winemaking} />
        </div>
      </ExpandableSection>

      {/* 6 — Drinking Window */}
      <ExpandableSection number={6} title="Drinking Window" icon="⏳">
        {data.drinkingWindow.isEstimated && <EstimatedNotice provenance={data.provenance?.drinkingWindow} />}
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium text-cream-100">{WINDOW_STATUS_LABEL[status]}</span>
          <span className="text-cream-300/60">
            {dw.from}–{dw.to}
          </span>
        </div>
        <div className="relative mb-2 h-2 w-full overflow-hidden rounded-full bg-navy-700/80">
          <div
            className="absolute h-full rounded-full bg-gold-500/40"
            style={{ left: `${peakStartPct}%`, width: `${peakWidthPct}%` }}
          />
          <div className="absolute h-full w-0.5 bg-gold-300" style={{ left: `${nowPct}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-cream-300/50">
          <span>{dw.from}</span>
          <span className="text-gold-400">Peak {dw.peakFrom}–{dw.peakTo}</span>
          <span>{dw.to}</span>
        </div>
      </ExpandableSection>

      {/* 7 — Decanting */}
      <ExpandableSection number={7} title="Decanting" icon="🫙">
        {data.decanting.isEstimated && <EstimatedNotice provenance={{ source: 'knowledge_base' }} />}
        <div className="space-y-1">
          <InfoRow label="Decant" value={data.decanting.shouldDecant ? `Yes — ${data.decanting.decantMinutes} min` : 'Not necessary'} />
          <InfoRow label="Serving temperature" value={`${data.decanting.servingTempC[0]}–${data.decanting.servingTempC[1]}°C`} />
          <InfoRow label="Glass" value={data.decanting.glassType} />
        </div>
      </ExpandableSection>

      {/* 8 — Food Pairing */}
      <ExpandableSection number={8} title="Food Pairing" icon="🍽️">
        {data.foodPairing.isEstimated && <EstimatedNotice provenance={data.provenance?.foodPairing} />}
        <TagGroup label="Pairs well with" items={data.foodPairing.dishes} />
        <p className="mt-3 text-sm leading-relaxed text-cream-200">{data.foodPairing.notes}</p>
      </ExpandableSection>

      {/* 9 — Personal Score */}
      <ExpandableSection number={9} title="Personal Score" icon="❤️" defaultOpen>
        <div className="mb-3 flex items-center gap-4">
          <MatchStars percent={data.personalScore.matchPercent} size="md" />
          <BadgeRow badges={data.personalScore.badges} />
        </div>
        <p className="text-sm leading-relaxed text-cream-200">{data.personalScore.reasoning}</p>
      </ExpandableSection>

      {/* 10 — Cellar Advice */}
      <ExpandableSection number={10} title="Cellar Advice" icon="🗄️" defaultOpen>
        <ActionBanner action={data.cellarAdvice.action} className="mb-3 !py-3 !text-lg" />
        <InfoRow label="Ageing potential" value={`${data.cellarAdvice.ageingPotentialYears} years`} />
        <p className="mt-2 text-sm leading-relaxed text-cream-200">{data.cellarAdvice.suggestion}</p>
      </ExpandableSection>
    </div>
  );
}
