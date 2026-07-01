'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Check, Tag, ChevronDown } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import MatchStars from '@/components/MatchStars';
import { BadgeRow } from '@/components/BadgeChip';
import KoopjesChecker from '@/components/KoopjesChecker';
import ScanDebugBlock from '@/components/ScanDebugBlock';
import FeedbackBar from '@/components/FeedbackBar';
import PurchaseDialog from '@/components/PurchaseDialog';
import { getPromotionResult } from '@/lib/storage';
import type { Koopjeschecker } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const ACTION_CONFIG = {
  BUY: {
    emoji: '🔥',
    label: 'Buy This',
    bg: 'bg-gradient-to-r from-burgundy-800 to-burgundy-700',
    text: 'text-cream-100',
    border: 'border-burgundy-500/40',
  },
  CONSIDER: {
    emoji: '⚠️',
    label: 'Consider',
    bg: 'bg-navy-800',
    text: 'text-gold-300',
    border: 'border-gold-500/30',
  },
  SKIP: {
    emoji: '❌',
    label: 'Skip This',
    bg: 'bg-navy-900',
    text: 'text-cream-300/70',
    border: 'border-navy-600',
  },
};

function QuickFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gold-500/10 last:border-0">
      <span className="text-xs text-cream-300/50 shrink-0">{label}</span>
      <span className="text-xs text-cream-100 text-right">{value}</span>
    </div>
  );
}

export default function ScanPromotionResultPage() {
  const router = useRouter();
  const [kc, setKc] = useState<Koopjeschecker | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [kcOpen, setKcOpen] = useState(false);

  useEffect(() => {
    const result = getPromotionResult();
    if (!result) { router.replace('/scan/promotion'); return; }
    setKc(result);
  }, [router]);

  function handleSaved() {
    setDialogOpen(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  }

  if (!kc) return null;

  const cfg = ACTION_CONFIG[kc.recommendedAction];
  const dw = kc.drinkingWindow;

  return (
    <>
      <PageHeader backHref="/scan/promotion" title="Promotion Result" />
      <div className="pb-8 pt-4">

        {/* 1. Verdict banner */}
        <div className="mx-5 mb-5">
          <div className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{cfg.emoji}</span>
              <span className={`font-display text-2xl font-semibold ${cfg.text}`}>{cfg.label}</span>
            </div>
            <MatchStars percent={kc.personalScore.matchPercent} size="md" />
          </div>
        </div>

        {/* Low confidence warning */}
        {kc.scanMetadata?.confidence === 'low' && (
          <div className="mx-5 mb-5 flex items-start gap-2 rounded-xl border border-burgundy-600/40 bg-burgundy-900/20 px-4 py-3 text-sm text-burgundy-300">
            <span className="mt-0.5">⚠️</span>
            <p>Low confidence read — the label or price tag was hard to read clearly. Treat this analysis as approximate.</p>
          </div>
        )}

        {/* Debug block */}
        {kc.scanMetadata && (
          <div className="mx-5">
            <ScanDebugBlock meta={kc.scanMetadata} />
          </div>
        )}

        {/* 2. Wine identity */}
        <div className="mx-5 mb-5">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg text-cream-100">{kc.general.producer}</p>
                <p className="text-base text-gold-300">{kc.general.wineName}</p>
                <p className="mt-0.5 text-sm text-cream-300/60">
                  {kc.general.vintage > 0 ? kc.general.vintage : 'Unknown vintage'}
                  {kc.scanMetadata?.vintageEstimated ? ' (est.)' : ''}
                  {' · '}
                  {kc.general.region}
                </p>
              </div>
              {kc.general.price != null && (
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Tag size={13} className="text-gold-400" />
                    <span className="font-display text-2xl text-gold-300">
                      {formatCurrency(kc.general.price)}
                    </span>
                  </div>
                  <span className="text-xs text-cream-300/40">promo price</span>
                </div>
              )}
            </div>
            <BadgeRow badges={kc.personalScore.badges} className="mt-3" />
          </Card>
        </div>

        {/* 3. Why? */}
        <div className="mx-5 mb-5">
          <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-gold-400/80">Why?</h3>
          <Card edge>
            <p className="text-sm leading-relaxed text-cream-300/80">{kc.personalScore.reasoning}</p>
            {kc.cellarAdvice.suggestion && (
              <p className="mt-2 text-sm leading-relaxed text-cream-300/60 italic">
                {kc.cellarAdvice.suggestion}
              </p>
            )}
          </Card>
        </div>

        {/* 4. Quick Facts */}
        <div className="mx-5 mb-5">
          <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-gold-400/80">Quick Facts</h3>
          <Card>
            {kc.scanMetadata?.discountPercent != null && (
              <QuickFact label="Discount" value={`${kc.scanMetadata.discountPercent}% off (was €${kc.scanMetadata.originalPrice})`} />
            )}
            <QuickFact label="Grapes" value={kc.general.grapes.length > 0 ? kc.general.grapes.join(', ') : 'Not visible'} />
            <QuickFact label="Alcohol" value={kc.general.alcohol > 0 ? `${kc.general.alcohol}%` : 'Not visible'} />
            <QuickFact label="Drink window" value={`${dw.from}–${dw.to}${dw.isEstimated ? ' (est.)' : ''}`} />
            <QuickFact label="Peak" value={`${dw.peakFrom}–${dw.peakTo}${dw.isEstimated ? ' (est.)' : ''}`} />
            <QuickFact
              label="Decanting"
              value={`${kc.decanting.shouldDecant ? `${kc.decanting.decantMinutes} min · ` : 'No · '}${kc.decanting.servingTempC[0]}–${kc.decanting.servingTempC[1]}°C${kc.decanting.isEstimated ? ' (est.)' : ''}`}
            />
            <QuickFact label="Food" value={`${kc.foodPairing.dishes.slice(0, 3).join(', ')}${kc.foodPairing.isEstimated ? ' (est.)' : ''}`} />
            <QuickFact
              label="Ageing potential"
              value={`${kc.cellarAdvice.ageingPotentialYears} year${kc.cellarAdvice.ageingPotentialYears !== 1 ? 's' : ''}`}
            />
          </Card>
        </div>

        {/* 5. Full Koopjeschecker (collapsible) */}
        <div className="mx-5 mb-5">
          <button
            onClick={() => setKcOpen((o) => !o)}
            className="mb-3 flex w-full items-center justify-between"
          >
            <h3 className="font-display text-sm uppercase tracking-wide text-gold-400/80">
              Full Koopjeschecker
            </h3>
            <ChevronDown
              size={16}
              className={`text-gold-400/60 transition-transform ${kcOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {kcOpen && <KoopjesChecker data={kc} />}
        </div>

        {/* 6. Feedback */}
        <div className="mx-5 mb-5">
          <FeedbackBar
            kcId={kc.id}
            producer={kc.general.producer}
            wineName={kc.general.wineName}
            context="promotion"
          />
        </div>

        {/* 7. I Bought This */}
        <div className="mx-5">
          <button
            onClick={() => setDialogOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 py-3.5 text-sm font-semibold text-navy-950 transition-colors active:bg-gold-400"
          >
            {justSaved ? <><Check size={16} /> Purchase Recorded</> : <><ShoppingBag size={16} /> I Bought This</>}
          </button>
        </div>
      </div>

      {kc && (
        <PurchaseDialog
          kc={kc}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
