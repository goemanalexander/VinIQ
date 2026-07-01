'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Check, ChevronDown } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import MatchStars from '@/components/MatchStars';
import { BadgeRow } from '@/components/BadgeChip';
import KoopjesChecker from '@/components/KoopjesChecker';
import FeedbackBar from '@/components/FeedbackBar';
import PurchaseDialog from '@/components/PurchaseDialog';
import { getWineListResult } from '@/lib/storage';
import type { Koopjeschecker } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

function QuickFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gold-500/10 last:border-0">
      <span className="text-xs text-cream-300/50 shrink-0">{label}</span>
      <span className="text-xs text-cream-100 text-right">{value}</span>
    </div>
  );
}

export default function WineDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [kc, setKc] = useState<Koopjeschecker | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [kcOpen, setKcOpen] = useState(false);
  const backHref = '/scan/wine-list/result';

  useEffect(() => {
    const listResult = getWineListResult();
    if (listResult) {
      const entry = listResult.entries.find((e) => e.id === params.id);
      if (entry) {
        setKc(entry.koopjeschecker);
        return;
      }
    }
    router.replace('/scan/wine-list/result');
  }, [params.id, router]);

  function handleSaved() {
    setDialogOpen(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  }

  if (!kc) return null;
  const dw = kc.drinkingWindow;

  return (
    <>
      <PageHeader backHref={backHref} title="Koopjeschecker" />
      <div className="pb-8 pt-4">
        {/* Identity + stars */}
        <div className="mx-5 mb-5">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg text-cream-100">{kc.general.producer}</p>
                <p className="text-base text-gold-300">{kc.general.wineName}</p>
                <p className="mt-0.5 text-sm text-cream-300/60">{kc.general.vintage} · {kc.general.region}</p>
                {kc.general.price != null && (
                  <p className="mt-1.5 font-display text-xl text-gold-300">{formatCurrency(kc.general.price)}</p>
                )}
              </div>
              <MatchStars percent={kc.personalScore.matchPercent} size="md" />
            </div>
            <BadgeRow badges={kc.personalScore.badges} className="mt-3" />
          </Card>
        </div>

        {/* Why? */}
        <div className="mx-5 mb-5">
          <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-gold-400/80">Why?</h3>
          <Card edge>
            <p className="text-sm leading-relaxed text-cream-300/80">{kc.personalScore.reasoning}</p>
          </Card>
        </div>

        {/* Quick Facts */}
        <div className="mx-5 mb-5">
          <h3 className="mb-2 font-display text-sm uppercase tracking-wide text-gold-400/80">Quick Facts</h3>
          <Card>
            <QuickFact label="Grapes" value={kc.general.grapes.join(', ')} />
            <QuickFact label="Alcohol" value={`${kc.general.alcohol}%`} />
            <QuickFact label="Drink window" value={`${dw.from}–${dw.to}`} />
            <QuickFact label="Peak" value={`${dw.peakFrom}–${dw.peakTo}`} />
            <QuickFact label="Decanting" value={kc.decanting.shouldDecant ? `${kc.decanting.decantMinutes} min` : 'No decanting needed'} />
            <QuickFact label="Food" value={kc.foodPairing.dishes.slice(0, 3).join(', ')} />
          </Card>
        </div>

        {/* Full KC collapsible */}
        <div className="mx-5 mb-5">
          <button onClick={() => setKcOpen((o) => !o)} className="mb-3 flex w-full items-center justify-between">
            <h3 className="font-display text-sm uppercase tracking-wide text-gold-400/80">Full Koopjeschecker</h3>
            <ChevronDown size={16} className={`text-gold-400/60 transition-transform ${kcOpen ? 'rotate-180' : ''}`} />
          </button>
          {kcOpen && <KoopjesChecker data={kc} />}
        </div>

        {/* Feedback */}
        <div className="mx-5 mb-5">
          <FeedbackBar kcId={kc.id} producer={kc.general.producer} wineName={kc.general.wineName} context="wine_list" />
        </div>

        {/* I Bought This */}
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
