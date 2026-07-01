'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import MatchStars from '@/components/MatchStars';
import { getCellar } from '@/lib/storage';
import { getSommelierInsights } from '@/lib/sommelier';
import type { WineRecommendation } from '@/lib/sommelier';
import { getPersonalisedRecommendations } from '@/lib/recommendation-engine';
import type { PersonalisedRecommendation, RecommendationResult } from '@/lib/recommendation-engine';

// ---------------------------------------------------------------------------
// Existing recommendation card (cellar-based, no context)
// ---------------------------------------------------------------------------

function RecommendationCard({ rec, index }: { rec: WineRecommendation; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const kc = rec.wine.koopjeschecker;

  const urgencyStyle = {
    urgent: 'border-burgundy-600/40 bg-burgundy-900/20',
    now: 'border-gold-500/30',
    soon: 'border-navy-600',
  }[rec.urgency];

  const urgencyBadge = {
    urgent: { text: '⚠️ Open immediately', cls: 'text-burgundy-300 bg-burgundy-900/40' },
    now: { text: '🍷 Perfect to open tonight', cls: 'text-gold-300 bg-gold-500/10' },
    soon: { text: '⏳ Drink within the year', cls: 'text-cream-300/70 bg-navy-700/50' },
  }[rec.urgency];

  return (
    <Card edge={rec.urgency === 'urgent'} className={`overflow-hidden border ${urgencyStyle}`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start gap-3 text-left"
      >
        <MatchStars percent={kc.personalScore.matchPercent} size="sm" showLabel={false} className="pt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base text-cream-100">
            {rec.wine.producer} — {rec.wine.wineName}
          </p>
          <p className="text-xs text-cream-300/60">{rec.wine.vintage} · {kc.general.region}</p>
          <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${urgencyBadge.cls}`}>
            {urgencyBadge.text}
          </span>
        </div>
        <span className="text-xs text-cream-300/40 shrink-0 mt-0.5">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gold-500/10 pt-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gold-400/80">Why this bottle?</p>
            <p className="text-sm leading-relaxed text-cream-300/80">{rec.reasoning}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gold-400/80">Serving</p>
            <p className="text-sm text-cream-300/75">{rec.decantingAdvice}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gold-400/80">Food pairing</p>
            <p className="text-sm text-cream-300/75">{rec.foodSuggestion}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gold-400/80">What to expect</p>
            <p className="text-sm text-cream-300/75">{rec.expectedExperience}</p>
          </div>
          <Link href={`/cellar/${rec.wine.id}`} className="flex items-center justify-end gap-1 text-xs text-gold-400">
            Full Koopjeschecker <ChevronRight size={13} />
          </Link>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Personalised recommendation card (context-aware, new engine)
// ---------------------------------------------------------------------------

function PersonalisedCard({ rec, index }: { rec: PersonalisedRecommendation; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const kc = rec.wine.koopjeschecker;

  const urgencyStyle = {
    urgent: 'border-burgundy-600/40 bg-burgundy-900/20',
    now: 'border-gold-500/30',
    soon: 'border-navy-600',
    hold: 'border-navy-700/60',
  }[rec.urgency];

  const urgencyBadge = {
    urgent: { text: '⚠️ Open immediately',        cls: 'text-burgundy-300 bg-burgundy-900/40' },
    now:    { text: '🍷 Perfect to open tonight',  cls: 'text-gold-300 bg-gold-500/10' },
    soon:   { text: '⏳ Ready — drink within the year', cls: 'text-cream-300/70 bg-navy-700/50' },
    hold:   { text: '🕰 Hold — too young',          cls: 'text-cream-300/50 bg-navy-800/50' },
  }[rec.urgency];

  const confidenceBadge = {
    high:   { text: 'High confidence',   cls: 'text-green-400/80' },
    medium: { text: 'Medium confidence', cls: 'text-gold-400/70' },
    low:    { text: 'Low confidence',    cls: 'text-cream-300/45' },
  }[rec.confidence];

  return (
    <Card edge={rec.urgency === 'urgent'} className={`overflow-hidden border ${urgencyStyle}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start gap-3 text-left"
      >
        {/* Score ring */}
        <div className="shrink-0 pt-0.5">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-gold-500/40">
            <span className="font-display text-sm font-semibold text-gold-300">{rec.compositeScore}</span>
          </div>
          <p className="mt-0.5 text-center text-[9px] text-cream-300/40">score</p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-base leading-snug text-cream-100">
            {rec.wine.producer} — {rec.wine.wineName}
          </p>
          <p className="text-xs text-cream-300/60">
            {rec.wine.vintage ?? 'NV'} · {kc.general.region}
          </p>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${urgencyBadge.cls}`}>
              {urgencyBadge.text}
            </span>
            <span className={`text-[10px] ${confidenceBadge.cls}`}>{confidenceBadge.text}</span>
          </div>
        </div>
        <span className="text-xs text-cream-300/40 shrink-0 mt-0.5">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gold-500/10 pt-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gold-400/80">Why this bottle?</p>
            <p className="text-sm leading-relaxed text-cream-300/80">{rec.whyThisBottle}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gold-400/80">Why now?</p>
            <p className="text-sm leading-relaxed text-cream-300/80">{rec.whyNow}</p>
          </div>
          {rec.foodMatch && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gold-400/80">Food match</p>
              <p className="text-sm text-cream-300/75">{rec.foodMatch}</p>
            </div>
          )}
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gold-400/80">What to expect</p>
            <p className="text-sm text-cream-300/75">{rec.expectedExperience}</p>
          </div>
          {rec.warnings.length > 0 && (
            <div className="rounded-lg border border-gold-500/20 bg-gold-500/5 px-3 py-2 space-y-1">
              {rec.warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-gold-400/80">⚠ {w}</p>
              ))}
            </div>
          )}
          <Link href={`/cellar/${rec.wine.id}`} className="flex items-center justify-end gap-1 text-xs text-gold-400">
            Full Koopjeschecker <ChevronRight size={13} />
          </Link>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Buy-instead section
// ---------------------------------------------------------------------------

function BuyInstead({ result }: { result: RecommendationResult }) {
  if (!result.buyInstead) return null;
  return (
    <Card className="space-y-3">
      <p className="text-sm text-cream-300/70">{result.buyInstead.reason}</p>
      {result.buyInstead.suggestions.map((s, i) => (
        <p key={i} className="flex items-start gap-2 text-sm text-cream-300/80">
          <span className="text-gold-400 shrink-0">→</span> {s}
        </p>
      ))}
      <Link href="/scan">
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-dashed border-gold-500/20 px-3 py-2 text-sm text-gold-400">
          <span>📸</span> Scan a bottle in the store first
        </div>
      </Link>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page — wraps everything in Suspense so useSearchParams works
// ---------------------------------------------------------------------------

function SommelierContent() {
  const params = useSearchParams();
  const food     = params.get('food')     ?? undefined;
  const occasion = params.get('occasion') ?? undefined;
  const budgetRaw = params.get('budget');
  const budget   = budgetRaw ? Number(budgetRaw) : undefined;

  const hasContext = !!(food || occasion || budget);

  const [insights, setInsights]           = useState<ReturnType<typeof getSommelierInsights> | null>(null);
  const [personalised, setPersonalised]   = useState<RecommendationResult | null>(null);

  useEffect(() => {
    const cellar = getCellar();
    setInsights(getSommelierInsights(cellar));
    if (hasContext) {
      setPersonalised(getPersonalisedRecommendations(cellar, { food, occasion, budget }));
    }
  }, [hasContext, food, occasion, budget]);

  if (!insights) return null;

  const { drinkTonight, buyNext, attention, cellarAnalysis } = insights;
  const isEmpty = drinkTonight.length === 0 && attention.length === 0;

  // Context banner text
  const contextParts = [food, occasion, budget ? `Budget: €${budget}` : null].filter(Boolean) as string[];

  return (
    <>
      <PageHeader title="Your Sommelier" />
      <div className="px-5 pb-8 pt-4 space-y-8">

        {/* Context banner */}
        {hasContext && (
          <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 px-4 py-3">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-gold-400/60">
              Personalising for
            </p>
            <p className="text-sm text-cream-200">{contextParts.join(' · ')}</p>
          </div>
        )}

        {/* ── Personalised recommendations (new engine) ── */}
        {hasContext && personalised && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">✨</span>
              <h2 className="font-display text-lg text-cream-100">My recommendation for tonight</h2>
            </div>

            {personalised.emptyState ? (
              <BuyInstead result={personalised} />
            ) : (
              <div className="space-y-3">
                {personalised.recommendations.map((rec, i) => (
                  <PersonalisedCard key={rec.wine.id} rec={rec} index={i} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Open Tonight (existing cellar engine) ── */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl">🍷</span>
            <h2 className="font-display text-lg text-cream-100">
              {hasContext ? 'Your cellar tonight' : 'What should I open tonight?'}
            </h2>
          </div>
          {drinkTonight.length > 0 ? (
            <div className="space-y-3">
              {drinkTonight.map((rec, i) => (
                <RecommendationCard key={rec.wine.id} rec={rec} index={i} />
              ))}
            </div>
          ) : (
            <Card className="py-5 text-center text-sm text-cream-300/60">
              {isEmpty
                ? 'Your cellar is empty — add wines to get personalised recommendations.'
                : 'No wines are urgently ready right now. Check the cellar for bottles approaching their window.'}
            </Card>
          )}
        </section>

        {/* Attention */}
        {attention.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <h2 className="font-display text-lg text-cream-100">Wines requiring attention</h2>
            </div>
            <div className="space-y-3">
              {attention.map((rec, i) => (
                <RecommendationCard key={rec.wine.id} rec={rec} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Buy Next */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h2 className="font-display text-lg text-cream-100">What should I buy next?</h2>
          </div>
          <div className="space-y-2.5">
            {buyNext.map((tip, i) => (
              <Card key={i} className="flex gap-3 py-3">
                <span className="text-lg shrink-0">📍</span>
                <p className="text-sm leading-relaxed text-cream-300/80">{tip}</p>
              </Card>
            ))}
            <Link href="/scan">
              <Card className="flex items-center justify-center gap-2 border-dashed py-3 text-sm text-gold-400">
                <span>📸</span> Scan a bottle or promotion
              </Card>
            </Link>
          </div>
        </section>

        {/* Cellar Insight */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl">🏰</span>
            <h2 className="font-display text-lg text-cream-100">Cellar insight</h2>
          </div>

          {cellarAnalysis.strengths.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold-400/80">Strengths</p>
              <Card edge className="space-y-2">
                {cellarAnalysis.strengths.map((s, i) => (
                  <p key={i} className="flex items-start gap-2 text-sm text-cream-300/80">
                    <span className="text-green-400 shrink-0">✓</span> {s}
                  </p>
                ))}
              </Card>
            </div>
          )}

          {cellarAnalysis.weaknesses.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold-400/80">Weaknesses</p>
              <Card className="space-y-2">
                {cellarAnalysis.weaknesses.map((w, i) => (
                  <p key={i} className="flex items-start gap-2 text-sm text-cream-300/80">
                    <span className="text-gold-400 shrink-0">!</span> {w}
                  </p>
                ))}
              </Card>
            </div>
          )}

          {(cellarAnalysis.missingRegions.length > 0 || cellarAnalysis.missingStyles.length > 0) && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold-400/80">Missing from your cellar</p>
              <Card className="flex flex-wrap gap-2">
                {cellarAnalysis.missingRegions.map((r) => (
                  <span key={r} className="rounded-full border border-navy-600 px-2.5 py-1 text-xs text-cream-300/60">{r}</span>
                ))}
                {cellarAnalysis.missingStyles.map((s) => (
                  <span key={s} className="rounded-full border border-gold-500/20 px-2.5 py-1 text-xs text-cream-300/50">{s}</span>
                ))}
              </Card>
            </div>
          )}
        </section>

        {isEmpty && !hasContext && (
          <Card className="py-10 text-center">
            <p className="font-display text-3xl">🍾</p>
            <p className="mt-3 font-display text-base text-cream-100">Your cellar is empty</p>
            <p className="mt-1 text-sm text-cream-300/60 mb-4">
              Import your collection or scan a bottle to get personalised sommelier advice.
            </p>
            <div className="flex flex-col gap-2 items-center">
              <Link href="/cellar/import" className="inline-block rounded-full bg-gold-500 px-6 py-2 text-sm font-medium text-navy-950">
                Import Cellar
              </Link>
              <Link href="/scan" className="text-sm text-gold-400">
                Or scan a bottle
              </Link>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

export default function SommelierPage() {
  return (
    <Suspense fallback={null}>
      <SommelierContent />
    </Suspense>
  );
}
