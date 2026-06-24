'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tag, ChevronDown, Eye } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import MatchStars from '@/components/MatchStars';
import { BadgeRow } from '@/components/BadgeChip';
import { getWineListResult } from '@/lib/storage';
import type { WineListResult, WineListEntry } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { percentToStars } from '@/lib/utils';

const PICKS = [
  { key: 'alexanders_choice', emoji: '🦊', label: "Alexander's Choice", desc: 'Best match for your personal taste' },
  { key: 'budget_choice',      emoji: '💰', label: 'Best Value',          desc: 'Best QPR at the lower end of the list' },
  { key: 'best_wine',          emoji: '🍷', label: 'Best Wine',           desc: 'Highest quality on the list' },
  { key: 'best_price_quality', emoji: '💎', label: 'Best Price/Quality',  desc: 'Strongest match per euro spent' },
] as const;

const ID_MAP = {
  alexanders_choice: 'alexandersChoiceId',
  budget_choice: 'budgetChoiceId',
  best_wine: 'bestWineId',
  best_price_quality: 'bestPriceQualityId',
} as const;

function PickCard({ entry, pick }: { entry: WineListEntry; pick: typeof PICKS[number] }) {
  return (
    <Link href={`/wine/${entry.id}?from=wine-list`}>
      <Card edge className="transition-transform active:scale-[0.98]">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{pick.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-400">{pick.label}</p>
            <p className="mt-0.5 font-display text-base text-cream-100">
              {entry.producer ? `${entry.producer} — ` : ''}{entry.wineName}
            </p>
            <p className="text-xs text-cream-300/60">
              {entry.vintage > 0 ? `${entry.vintage} · ` : ''}{entry.region || ''}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {entry.price > 0 && (
                  <>
                    <Tag size={12} className="text-gold-400" />
                    <span className="font-display text-lg text-gold-300">{formatCurrency(entry.price)}</span>
                  </>
                )}
              </div>
              <MatchStars percent={entry.matchPercent} size="sm" showLabel={false} />
            </div>
            <BadgeRow badges={entry.badges} className="mt-2" />
            <p className="mt-1 text-xs italic text-cream-300/40">{pick.desc} · Tap for full analysis</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function OcrBlock({ ocrText }: { ocrText: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-navy-600 px-4 py-2.5"
      >
        <div className="flex items-center gap-2 text-xs text-cream-300/50">
          <Eye size={13} />
          What VinIQ detected from the image
        </div>
        <ChevronDown size={13} className={`text-cream-300/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-navy-600 bg-navy-800/60 px-4 py-3">
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-cream-300/60">
            {ocrText || '(no text extracted)'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function WineListResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<WineListResult | null>(null);

  useEffect(() => {
    const r = getWineListResult();
    if (!r) { router.replace('/scan/wine-list'); return; }
    setResult(r);
  }, [router]);

  if (!result) return null;

  if (result.entries.length === 0) {
    return (
      <>
        <PageHeader backHref="/scan/wine-list" title="Wine List Analysis" />
        <div className="px-5 pt-4">
          {result.ocrText && <OcrBlock ocrText={result.ocrText} />}
          <Card className="py-8 text-center">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-display text-base text-cream-100">No wines detected</p>
            <p className="mt-1 text-sm text-cream-300/60">
              VinIQ couldn't extract any wines from the image. Try a clearer photo with better
              lighting, or ensure the wine list text is legible.
            </p>
          </Card>
        </div>
      </>
    );
  }

  const seen = new Set<string>();
  const picks = PICKS.map((pick) => {
    const id = result[ID_MAP[pick.key]];
    const entry = result.entries.find((e) => e.id === id);
    if (!entry || seen.has(entry.id)) return null;
    seen.add(entry.id);
    return { pick, entry };
  }).filter((p): p is { pick: typeof PICKS[number]; entry: WineListEntry } => p !== null);

  const others = result.entries.filter((e) => !seen.has(e.id));

  return (
    <>
      <PageHeader backHref="/scan/wine-list" title="Wine List Analysis" />
      <div className="px-5 pb-8 pt-4">

        <p className="mb-5 text-sm text-cream-300/60">
          VinIQ found <strong className="text-cream-200">{result.entries.length}</strong> wine
          {result.entries.length !== 1 ? 's' : ''} on this list. Tap any pick for the full
          Koopjeschecker.
        </p>

        {/* OCR verification block */}
        {result.ocrText && <OcrBlock ocrText={result.ocrText} />}

        {/* Top picks */}
        <div className="space-y-4 mb-8">
          {picks.map(({ pick, entry }) => (
            <PickCard key={pick.key} pick={pick} entry={entry} />
          ))}
        </div>

        {/* All other wines on the list */}
        {others.length > 0 && (
          <div>
            <h3 className="mb-3 font-display text-base text-cream-200">
              All wines on this list ({result.entries.length})
            </h3>
            <Card className="divide-y divide-gold-500/10 p-1">
              {result.entries.map((entry) => {
                const { stars } = percentToStars(entry.matchPercent);
                return (
                  <Link
                    key={entry.id}
                    href={`/wine/${entry.id}?from=wine-list`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-cream-100/[0.04]"
                  >
                    <span className="text-sm text-gold-400">
                      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-cream-100">
                        {entry.producer ? `${entry.producer} — ` : ''}{entry.wineName}
                        {entry.vintage > 0 ? ` ${entry.vintage}` : ''}
                      </p>
                      <p className="text-xs text-cream-300/50">
                        {entry.region || ''}
                        {entry.price > 0 ? ` · ${formatCurrency(entry.price)}` : ''}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
