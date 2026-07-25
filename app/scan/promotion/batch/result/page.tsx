'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ShoppingBag, Check, Pencil } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import PurchaseDialog from '@/components/PurchaseDialog';
import { getPromoBatchResult, savePromoBatchResult, getCellar, getFeedback } from '@/lib/storage';
import { buildBatchCandidates, bestPicks } from '@/lib/promo-batch';
import type { BatchAnalysisResult, BatchCandidate, NormalisedOffer } from '@/lib/promo-batch';
import { generateAiProfile } from '@/lib/profile-ai';

// ---------------------------------------------------------------------------
// Small display helpers
// ---------------------------------------------------------------------------

function euros(v: number | null): string {
  return v === null ? '—' : `€${v.toFixed(2)}`;
}

const VERDICT_BADGE: Record<string, { label: string; cls: string }> = {
  strong_buy: { label: 'Strong Buy', cls: 'bg-gold-500 text-navy-950' },
  buy:        { label: 'Buy', cls: 'bg-gold-500/20 text-gold-300 border border-gold-500/40' },
  consider:   { label: 'Consider', cls: 'bg-navy-700 text-cream-200 border border-navy-600' },
  skip:       { label: 'Skip', cls: 'bg-navy-800 text-cream-300/60 border border-navy-600' },
  avoid:      { label: 'Avoid', cls: 'bg-burgundy-900/50 text-burgundy-300 border border-burgundy-600/40' },
};

const CONFIDENCE_TEXT: Record<string, string> = {
  high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence',
};

function offerTitle(offer: NormalisedOffer): string {
  const name = [offer.producer, offer.wineName].filter(Boolean).join(' — ') || 'Unidentified wine';
  return offer.vintage ? `${name} · ${offer.vintage}` : name;
}

function priceLine(offer: NormalisedOffer): string {
  const parts: string[] = [];
  if (offer.priceBasis === 'package' && offer.packagePrice !== null && offer.totalBottles) {
    parts.push(`Package ${euros(offer.packagePrice)} · ${offer.totalBottles} bottles`);
    parts.push(`effective ${euros(offer.effectivePricePerBottle)}/btl`);
  } else if (offer.priceBasis === 'free-bottles' && offer.totalBottles && offer.freeBottles) {
    parts.push(`${offer.totalBottles - offer.freeBottles}+${offer.freeBottles} free at ${euros(offer.unitPrice)}/btl`);
    parts.push(`effective ${euros(offer.effectivePricePerBottle)}/btl`);
  } else if (offer.effectivePricePerBottle !== null) {
    parts.push(`${euros(offer.effectivePricePerBottle)}/btl`);
    if (offer.originalPrice !== null) parts.push(`was ${euros(offer.originalPrice)}`);
  } else {
    parts.push('Price unclear');
  }
  return parts.join(' · ');
}

// ---------------------------------------------------------------------------
// Review / correction form (in-memory only — never auto-saved to the cellar)
// ---------------------------------------------------------------------------

function ReviewForm({ offer, onApply }: { offer: NormalisedOffer; onApply: (o: NormalisedOffer) => void }) {
  const [name, setName] = useState(offer.wineName);
  const [vintage, setVintage] = useState(offer.vintage ? String(offer.vintage) : '');
  const [price, setPrice] = useState(offer.effectivePricePerBottle !== null ? String(offer.effectivePricePerBottle) : '');
  const [bottles, setBottles] = useState(offer.totalBottles ? String(offer.totalBottles) : '');

  const inputCls =
    'w-full rounded-xl border border-gold-500/15 bg-navy-950/60 px-3 py-2 text-sm text-cream-100 placeholder:text-cream-300/25 focus:border-gold-500/35 focus:outline-none';

  function apply() {
    const parsedPrice = parseFloat(price.replace(',', '.'));
    const parsedVintage = parseInt(vintage, 10);
    const parsedBottles = parseInt(bottles, 10);
    const cleanName = name.replace(/\s+/g, ' ').trim();
    const effective = isFinite(parsedPrice) && parsedPrice > 0 ? Math.round(parsedPrice * 100) / 100 : null;

    onApply({
      ...offer,
      wineName: cleanName,
      vintage: isFinite(parsedVintage) && parsedVintage > 1900 && parsedVintage < 2100 ? parsedVintage : null,
      effectivePricePerBottle: effective,
      unitPrice: effective,
      packagePrice: null,
      priceBasis: effective !== null ? 'unit' : 'unknown',
      totalBottles: isFinite(parsedBottles) && parsedBottles > 0 ? parsedBottles : null,
      // The user has confirmed these fields by hand
      identificationConfidence: cleanName ? 'high' : 'low',
      priceConfidence: effective !== null ? 'high' : 'low',
      needsReview: !cleanName,
      reviewReasons: cleanName ? [] : ['Wine could not be identified on the page.'],
      warnings: offer.warnings,
    });
  }

  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-gold-500/15 bg-navy-950/40 p-3">
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-widest text-cream-300/45">Wine name</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Producer / wine name" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-cream-300/45">Vintage</label>
          <input className={inputCls} inputMode="numeric" value={vintage} onChange={(e) => setVintage(e.target.value)} placeholder="—" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-cream-300/45">€ / bottle</label>
          <input className={inputCls} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="—" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-cream-300/45">Bottles</label>
          <input className={inputCls} inputMode="numeric" value={bottles} onChange={(e) => setBottles(e.target.value)} placeholder="—" />
        </div>
      </div>
      <button
        onClick={apply}
        className="w-full rounded-full border border-gold-500/40 py-2 text-xs font-semibold text-gold-300 active:bg-gold-500/10"
      >
        Apply corrections & re-advise
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidate card
// ---------------------------------------------------------------------------

function CandidateCard({
  candidate, rank, thumbnail, onBuy, onCorrect, justBought,
}: {
  candidate: BatchCandidate;
  rank: number | null;
  thumbnail: string | undefined;
  onBuy: (c: BatchCandidate) => void;
  onCorrect: (offerId: string, offer: NormalisedOffer) => void;
  justBought: boolean;
}) {
  const [reviewing, setReviewing] = useState(false);
  const { offer, advice } = candidate;
  const badge = advice ? VERDICT_BADGE[advice.verdict] : null;

  return (
    <Card className={candidate.group === 'review' ? 'border border-navy-600' : ''}>
      <div className="flex items-start gap-3">
        {thumbnail ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={thumbnail} alt={`Page ${offer.sourceImages[0] + 1}`} className="h-14 w-14 shrink-0 rounded-lg border border-gold-500/15 object-cover" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-navy-600 text-[10px] text-cream-300/40">
            p. {offer.sourceImages.map((i) => i + 1).join(',')}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-cream-100">
            {rank !== null && <span className="mr-1.5 text-gold-400">{rank}.</span>}
            {offerTitle(offer)}
          </p>
          <p className="mt-0.5 text-xs text-cream-300/60">{priceLine(offer)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {badge && advice && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                {badge.label} · {advice.decisionScore}/100
              </span>
            )}
            {!advice && (
              <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-[11px] font-medium text-gold-300">
                Needs review
              </span>
            )}
            {advice && advice.recommendedQuantity > 0 && (
              <span className="text-[11px] text-cream-300/60">
                {advice.recommendedQuantity} bottle{advice.recommendedQuantity !== 1 ? 's' : ''}
              </span>
            )}
            {advice && <span className="text-[10px] text-cream-300/40">{CONFIDENCE_TEXT[advice.confidence]}</span>}
          </div>
        </div>
      </div>

      {/* Reasons */}
      {advice && (
        <div className="mt-2.5 space-y-1">
          {advice.reasoning.slice(0, 3).map((r, i) => (
            <p key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-cream-300/70">
              <span className="shrink-0 text-gold-400/50">·</span>{r}
            </p>
          ))}
        </div>
      )}
      {!advice && offer.reviewReasons.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {offer.reviewReasons.map((r, i) => (
            <p key={i} className="flex items-start gap-1.5 text-xs text-cream-300/65">
              <span className="shrink-0 text-gold-400/60">?</span>{r}
            </p>
          ))}
        </div>
      )}

      {/* Warnings (incl. cellar stock via advisor) */}
      {(advice?.warnings.length || offer.warnings.length) ? (
        <div className="mt-2 space-y-0.5">
          {[...(advice?.warnings ?? []), ...offer.warnings].slice(0, 3).map((w, i) => (
            <p key={i} className="text-[11px] text-gold-400/70">⚠ {w}</p>
          ))}
        </div>
      ) : null}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        {advice && candidate.kc && (
          <button
            onClick={() => onBuy(candidate)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gold-500 py-2 text-xs font-semibold text-navy-950 active:bg-gold-400"
          >
            {justBought ? <><Check size={13} /> Purchase Recorded</> : <><ShoppingBag size={13} /> I Bought This</>}
          </button>
        )}
        <button
          onClick={() => setReviewing((r) => !r)}
          className={`flex items-center justify-center gap-1.5 rounded-full border border-navy-600 px-4 py-2 text-xs text-cream-300/60 active:bg-navy-700 ${!advice ? 'flex-1' : ''}`}
        >
          <Pencil size={12} />
          {reviewing ? 'Close' : 'Review'}
        </button>
      </div>

      {reviewing && (
        <ReviewForm
          offer={offer}
          onApply={(o) => { setReviewing(false); onCorrect(offer.id, o); }}
        />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// The top 5 already appear in the "Best picks from this promotion" hero.
// This section holds the remaining buy-worthy wines, so it's labelled as
// clearly secondary — calling 17+ wines "Best buys" would over-claim.
const GROUP_SECTIONS: { key: 'best' | 'consider' | 'skip' | 'review'; title: string; icon: string }[] = [
  { key: 'best', title: 'Other good matches', icon: '🔥' },
  { key: 'consider', title: 'Worth considering', icon: '🤔' },
  { key: 'skip', title: 'Skip', icon: '➖' },
  { key: 'review', title: 'Needs review', icon: '🔍' },
];

export default function PromotionBatchResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<BatchAnalysisResult | null>(null);
  const [buying, setBuying] = useState<BatchCandidate | null>(null);
  const [boughtIds, setBoughtIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = getPromoBatchResult();
    if (!stored) { router.replace('/scan/promotion/batch'); return; }
    setResult(stored);
  }, [router]);

  function handleCorrect(offerId: string, corrected: NormalisedOffer) {
    if (!result) return;
    const aiProfile = generateAiProfile(getCellar(), getFeedback());
    const ideal = {
      body: aiProfile.avgBody, acidity: aiProfile.avgAcidity,
      tannin: aiProfile.avgTannin, sweetness: aiProfile.avgSweetness,
    };
    const offers = result.candidates.map((c) => (c.offer.id === offerId ? corrected : c.offer));
    const updated: BatchAnalysisResult = {
      ...result,
      candidates: buildBatchCandidates(offers, getCellar(), ideal),
    };
    setResult(updated);
    savePromoBatchResult(updated);
  }

  function handleSaved() {
    if (buying) setBoughtIds((s) => new Set(s).add(buying.offer.id));
    setBuying(null);
  }

  if (!result) return null;

  const picks = bestPicks(result.candidates);
  const pickIds = new Set(picks.map((p) => p.offer.id));

  // Package quantity prefill only when the deal itself is confident
  const buyingDefaultQty =
    buying?.offer.totalBottles && buying.offer.priceConfidence === 'high'
      ? buying.offer.totalBottles
      : buying?.advice && buying.advice.recommendedQuantity > 0
      ? buying.advice.recommendedQuantity
      : 1;

  return (
    <>
      <PageHeader backHref="/scan/promotion/batch" title="Promotion Advisor" />
      <div className="px-5 pb-8 pt-4 space-y-7">

        {/* Failed pages notice */}
        {result.failedImages.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-gold-500/25 bg-gold-500/5 px-4 py-3 text-xs text-gold-300/90">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <p>
              {result.failedImages.length} of {result.imageCount} page{result.imageCount !== 1 ? 's' : ''} could not be
              read (page {result.failedImages.map((f) => f.index + 1).join(', ')}). Results below cover the readable pages only.
            </p>
          </div>
        )}

        {/* Best picks hero */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h2 className="font-display text-lg text-cream-100">Best picks from this promotion</h2>
          </div>
          {picks.length > 0 ? (
            <div className="space-y-3">
              {picks.map((c, i) => (
                <CandidateCard
                  key={c.offer.id}
                  candidate={c}
                  rank={i + 1}
                  thumbnail={result.thumbnails[c.offer.sourceImages[0]]}
                  onBuy={setBuying}
                  onCorrect={handleCorrect}
                  justBought={boughtIds.has(c.offer.id)}
                />
              ))}
            </div>
          ) : (
            <Card className="py-5 text-center text-sm text-cream-300/60">
              {result.candidates.some((c) => c.group === 'review')
                ? 'No confident recommendations yet — the detected offers need a manual check first (see below).'
                : 'None of the detected offers are a good match for your taste and cellar right now.'}
            </Card>
          )}
        </section>

        {/* Remaining groups (excluding wines already shown in the hero list) */}
        {GROUP_SECTIONS.map(({ key, title, icon }) => {
          const items = result.candidates.filter((c) => c.group === key && !pickIds.has(c.offer.id));
          if (items.length === 0) return null;
          return (
            <section key={key}>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <h3 className="font-display text-sm font-medium uppercase tracking-wide text-gold-400/80">{title}</h3>
              </div>
              <div className="space-y-3">
                {items.map((c) => (
                  <CandidateCard
                    key={c.offer.id}
                    candidate={c}
                    rank={null}
                    thumbnail={result.thumbnails[c.offer.sourceImages[0]]}
                    onBuy={setBuying}
                    onCorrect={handleCorrect}
                    justBought={boughtIds.has(c.offer.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Purchase — always explicit, never automatic */}
      {buying?.kc && (
        <PurchaseDialog
          kc={buying.kc}
          open={true}
          retailer={buying.offer.retailer ?? result.retailer ?? undefined}
          defaultQuantity={buyingDefaultQty}
          onClose={() => setBuying(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
