import type { BuyingAdvice, BuyingVerdict } from '@/lib/buying-advisor';
import { formatCurrency } from '@/lib/utils';
import Card from './Card';

const VERDICT_STYLE: Record<
  BuyingVerdict,
  { label: string; emoji: string; badgeCls: string; cardCls: string }
> = {
  strong_buy: { label: 'Strong Buy', emoji: '🔥', badgeCls: 'bg-gold-500 text-navy-950', cardCls: 'border-gold-500/40' },
  buy:        { label: 'Buy',        emoji: '👍', badgeCls: 'bg-gold-500/20 text-gold-300 border border-gold-500/40', cardCls: 'border-gold-500/25' },
  consider:   { label: 'Consider',   emoji: '🤔', badgeCls: 'bg-navy-700 text-cream-200 border border-navy-600', cardCls: 'border-navy-600' },
  skip:       { label: 'Skip',       emoji: '➖', badgeCls: 'bg-navy-800 text-cream-300/60 border border-navy-600', cardCls: 'border-navy-700' },
  avoid:      { label: 'Avoid',      emoji: '❌', badgeCls: 'bg-burgundy-900/50 text-burgundy-300 border border-burgundy-600/40', cardCls: 'border-burgundy-600/40' },
};

const CONFIDENCE_LABEL = {
  high: { text: 'High confidence', cls: 'text-green-400/80' },
  medium: { text: 'Medium confidence', cls: 'text-gold-400/70' },
  low: { text: 'Low confidence', cls: 'text-cream-300/45' },
} as const;

export default function BuyingAdvisorCard({ advice }: { advice: BuyingAdvice }) {
  const v = VERDICT_STYLE[advice.verdict];
  const conf = CONFIDENCE_LABEL[advice.confidence];

  return (
    <Card className={`border ${v.cardCls}`}>
      {/* Verdict row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${v.badgeCls}`}>
            <span>{v.emoji}</span>
            {v.label} · {advice.decisionScore}/100
          </span>
          <p className="mt-2 font-display text-base text-cream-100">{advice.headline}</p>
          <p className={`mt-0.5 text-[10px] ${conf.cls}`}>{conf.text}</p>
        </div>
        {advice.recommendedQuantity > 0 && (
          <div className="shrink-0 rounded-xl border border-gold-500/20 bg-navy-950/50 px-3 py-2 text-center">
            <p className="font-display text-2xl leading-none text-gold-300">{advice.recommendedQuantity}</p>
            <p className="mt-1 text-[9px] uppercase tracking-wide text-cream-300/45">
              {advice.recommendedQuantity === 1 ? 'bottle' : 'bottles'}
            </p>
          </div>
        )}
      </div>

      {/* Reasoning */}
      <div className="mt-4 space-y-1.5 border-t border-gold-500/10 pt-3">
        {advice.reasoning.map((r, i) => (
          <p key={i} className="flex items-start gap-2 text-sm leading-relaxed text-cream-300/80">
            <span className="shrink-0 text-gold-400/60">·</span>
            {r}
          </p>
        ))}
      </div>

      {/* Cellar context */}
      {advice.cellarContext && (
        <div className="mt-3 rounded-xl border border-gold-500/15 bg-gold-500/5 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gold-400/60">
            Already in your cellar
          </p>
          <p className="mt-0.5 text-sm text-cream-200">
            {advice.cellarContext.ownedBottles} bottle{advice.cellarContext.ownedBottles !== 1 ? 's' : ''}
            {advice.cellarContext.avgPurchasePrice > 0 &&
              ` · avg ${formatCurrency(advice.cellarContext.avgPurchasePrice)} / btl`}
          </p>
        </div>
      )}

      {/* Warnings */}
      {advice.warnings.length > 0 && (
        <div className="mt-3 space-y-1 rounded-xl border border-gold-500/15 bg-navy-950/40 px-3 py-2">
          {advice.warnings.map((w, i) => (
            <p key={i} className="text-[11px] leading-relaxed text-gold-400/75">⚠ {w}</p>
          ))}
        </div>
      )}
    </Card>
  );
}
